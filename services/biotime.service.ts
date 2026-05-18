import { prisma } from '@/lib/prisma'
import { SHIFT_TIMES, isLeave } from '@/lib/shifts'

const GRACE_PERIOD_MINUTES = 15

interface BiotimePunch {
  emp_code: string
  punch_time: string
  punch_state: '0' | '1'
  terminal_sn?: string
}

interface DayPunches {
  clockIn?: Date
  clockOut?: Date
}

// ─── BioTime API auth + fetch ────────────────────────────────────────────────

async function getBiotimeToken(): Promise<string> {
  const res = await fetch(`${process.env.BIOTIME_API_URL}/jwt-api-token-auth/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.BIOTIME_USERNAME,
      password: process.env.BIOTIME_PASSWORD,
    }),
  })
  if (!res.ok) throw new Error(`Biotime auth failed: ${res.status}`)
  const data: { token: string } = await res.json()
  return data.token
}

async function fetchBiotimePunches(token: string, startDate: Date, endDate: Date): Promise<BiotimePunch[]> {
  const start = startDate.toISOString().replace('T', ' ').slice(0, 19)
  const end   = endDate.toISOString().replace('T', ' ').slice(0, 19)
  const punches: BiotimePunch[] = []
  let nextUrl: string | null =
    `${process.env.BIOTIME_API_URL}/att/api/transactions/?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(end)}&page_size=500`

  while (nextUrl) {
    const response = await fetch(nextUrl, { headers: { Authorization: `JWT ${token}` } })
    if (!response.ok) throw new Error(`Biotime fetch failed: ${response.status}`)
    const page: { data?: BiotimePunch[]; results?: BiotimePunch[]; next?: string | null } = await response.json()
    punches.push(...(page.data ?? page.results ?? []))
    nextUrl = page.next ?? null
  }
  return punches
}

// ─── Mock fallback (used when BIOTIME_API_URL is not set) ───────────────────

async function getMockTransactions(startDate: Date, endDate: Date): Promise<BiotimePunch[]> {
  const slots = await prisma.rosterSlot.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      shiftType: { notIn: ['OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'] },
    },
    include: { employee: { select: { staffId: true } } },
  })

  const punches: BiotimePunch[] = []
  for (const slot of slots) {
    const empCode = slot.employee.staffId
    const date = new Date(slot.date)
    const [startH, startM] = (slot.startTime ?? '07:00').split(':').map(Number)
    const [endH, endM]     = (slot.endTime   ?? '15:00').split(':').map(Number)

    const variation    = () => Math.floor(Math.random() * 31) - 10
    const outVariation = Math.floor(Math.random() * 21) - 5

    const clockIn = new Date(date)
    clockIn.setHours(startH, startM + variation(), 0, 0)

    const clockOut = new Date(date)
    if (endH < startH) clockOut.setDate(clockOut.getDate() + 1)
    clockOut.setHours(endH, endM + outVariation, 0, 0)

    punches.push({ emp_code: empCode, punch_time: clockIn.toISOString(),  punch_state: '0' })
    if (Math.random() >= 0.05) {
      punches.push({ emp_code: empCode, punch_time: clockOut.toISOString(), punch_state: '1' })
    }
  }
  return punches
}

// ─── Group raw punches into per-employee, per-day first-in / last-out ───────

function groupPunches(punches: BiotimePunch[]): Map<string, Map<string, DayPunches>> {
  const raw = new Map<string, Map<string, { ins: Date[]; outs: Date[] }>>()

  for (const punch of punches) {
    const punchTime    = new Date(punch.punch_time)
    const calendarDate = new Date(punchTime)
    if (punchTime.getHours() < 6) calendarDate.setDate(calendarDate.getDate() - 1)
    const dateKey = calendarDate.toISOString().slice(0, 10)

    if (!raw.has(punch.emp_code)) raw.set(punch.emp_code, new Map())
    const byDate = raw.get(punch.emp_code)!
    if (!byDate.has(dateKey)) byDate.set(dateKey, { ins: [], outs: [] })
    const day = byDate.get(dateKey)!
    if (punch.punch_state === '0') day.ins.push(punchTime)
    else day.outs.push(punchTime)
  }

  const result = new Map<string, Map<string, DayPunches>>()
  for (const [empCode, byDate] of raw) {
    result.set(empCode, new Map())
    for (const [dateKey, { ins, outs }] of byDate) {
      ins.sort((a, b) => a.getTime() - b.getTime())
      outs.sort((a, b) => a.getTime() - b.getTime())
      result.get(empCode)!.set(dateKey, {
        clockIn:  ins[0],
        clockOut: outs.length > 0 ? outs[outs.length - 1] : undefined,
      })
    }
  }
  return result
}

// ─── Core: write grouped punches to DB ──────────────────────────────────────

async function processGrouped(grouped: Map<string, Map<string, DayPunches>>): Promise<number> {
  let recordsProcessed = 0

  for (const [empCode, byDate] of grouped) {
    const employee = await prisma.employee.findFirst({
      where: { OR: [{ staffId: empCode }, { biotimeEmpCode: empCode }] },
    })
    if (!employee) continue

    for (const [dateKey, { clockIn, clockOut }] of byDate) {
      const date = new Date(dateKey)
      const rosterSlot = await prisma.rosterSlot.findFirst({ where: { employeeId: employee.id, date } })

      if (rosterSlot && isLeave(rosterSlot.shiftType)) {
        await prisma.attendance.upsert({
          where:  { employeeId_date: { employeeId: employee.id, date } },
          create: { employeeId: employee.id, rosterSlotId: rosterSlot.id, date, status: 'ON_LEAVE', scheduledIn: rosterSlot.startTime ?? undefined, scheduledOut: rosterSlot.endTime ?? undefined },
          update: { status: 'ON_LEAVE' },
        })
        recordsProcessed++
        continue
      }

      if (!clockIn) {
        await prisma.attendance.upsert({
          where:  { employeeId_date: { employeeId: employee.id, date } },
          create: { employeeId: employee.id, rosterSlotId: rosterSlot?.id, date, status: 'ABSENT', scheduledIn: rosterSlot?.startTime ?? undefined, scheduledOut: rosterSlot?.endTime ?? undefined },
          update: { status: 'ABSENT' },
        })
        recordsProcessed++
        continue
      }

      const scheduledIn  = rosterSlot?.startTime ?? SHIFT_TIMES[rosterSlot?.shiftType ?? '']?.start
      const scheduledOut = rosterSlot?.endTime   ?? SHIFT_TIMES[rosterSlot?.shiftType ?? '']?.end

      let status: 'PRESENT' | 'LATE' | 'EARLY_DEPARTURE' | 'PARTIAL' = 'PRESENT'
      let lateMinutes: number | undefined
      let earlyDepartureMinutes: number | undefined
      let totalHours: number | undefined

      if (scheduledIn) {
        const diff = (clockIn.getHours() * 60 + clockIn.getMinutes()) - (parseInt(scheduledIn.split(':')[0]) * 60 + parseInt(scheduledIn.split(':')[1]))
        if (diff > GRACE_PERIOD_MINUTES) { lateMinutes = diff; status = 'LATE' }
      }

      if (clockOut && scheduledOut) {
        const diff = (clockOut.getHours() * 60 + clockOut.getMinutes()) - (parseInt(scheduledOut.split(':')[0]) * 60 + parseInt(scheduledOut.split(':')[1]))
        if (diff < -GRACE_PERIOD_MINUTES) { earlyDepartureMinutes = Math.abs(diff); status = status === 'LATE' ? 'PARTIAL' : 'EARLY_DEPARTURE' }
        totalHours = (clockOut.getTime() - clockIn.getTime()) / 1000 / 3600
      } else if (!clockOut) {
        status = 'PARTIAL'
      }

      await prisma.attendance.upsert({
        where:  { employeeId_date: { employeeId: employee.id, date } },
        create: { employeeId: employee.id, rosterSlotId: rosterSlot?.id, date, clockIn, clockOut: clockOut ?? undefined, totalHours, scheduledIn, scheduledOut, lateMinutes, earlyDepartureMinutes, status },
        update: { clockIn, clockOut: clockOut ?? undefined, totalHours, lateMinutes, earlyDepartureMinutes, status },
      })
      recordsProcessed++
    }
  }

  return recordsProcessed
}

// ─── Public: receive pre-fetched punches from Ghana sync script ──────────────

export async function processPunches(punches: BiotimePunch[], fromDate: Date, toDate: Date) {
  let recordsProcessed = 0
  let errors: string | null = null

  try {
    const grouped = groupPunches(punches)
    recordsProcessed = await processGrouped(grouped)
  } catch (err) {
    errors = err instanceof Error ? err.message : String(err)
  }

  await prisma.biotimeSyncLog.create({ data: { recordsFetched: punches.length, recordsProcessed, errors, fromDate, toDate } })
  await checkAndNotifyHR(toDate)
  return { recordsFetched: punches.length, recordsProcessed, errors }
}

// ─── Public: full sync (Vercel calls BioTime directly) ──────────────────────

export async function syncAttendance(fromDate: Date, toDate: Date) {
  let recordsFetched = 0
  let recordsProcessed = 0
  let errors: string | null = null

  try {
    const punches = process.env.BIOTIME_API_URL
      ? await fetchBiotimePunches(await getBiotimeToken(), fromDate, toDate)
      : await getMockTransactions(fromDate, toDate)

    recordsFetched = punches.length
    const grouped = groupPunches(punches)
    recordsProcessed = await processGrouped(grouped)
  } catch (err) {
    errors = err instanceof Error ? err.message : String(err)
  }

  await prisma.biotimeSyncLog.create({ data: { recordsFetched, recordsProcessed, errors, fromDate, toDate } })
  await checkAndNotifyHR(toDate)
  return { recordsFetched, recordsProcessed, errors }
}

// ─── HR notification after sync ──────────────────────────────────────────────

async function checkAndNotifyHR(asOf: Date) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return

  const month = asOf.getMonth() + 1
  const year  = asOf.getFullYear()
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd   = new Date(year, month, 0)

  try {
    const employees  = await prisma.employee.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, expectedMonthlyHours: true, department: { select: { name: true } } } })
    const attendance = await prisma.attendance.findMany({ where: { date: { gte: monthStart, lte: monthEnd } }, select: { employeeId: true, status: true, lateMinutes: true, earlyDepartureMinutes: true, totalHours: true } })

    const empMap = new Map(employees.map(e => [e.id, e]))
    const flags: { name: string; dept: string; reason: string }[] = []
    const grouped = new Map<string, { lateCount: number; earlyCount: number; absences: number; totalHours: number }>()

    for (const a of attendance) {
      const cur = grouped.get(a.employeeId) ?? { lateCount: 0, earlyCount: 0, absences: 0, totalHours: 0 }
      if ((a.lateMinutes ?? 0) > 0) cur.lateCount++
      if ((a.earlyDepartureMinutes ?? 0) > 0) cur.earlyCount++
      if (a.status === 'ABSENT') cur.absences++
      cur.totalHours += a.totalHours ?? 0
      grouped.set(a.employeeId, cur)
    }

    for (const [empId, data] of grouped) {
      const emp = empMap.get(empId)
      if (!emp) continue
      const name = emp.name
      const dept = (emp as any).department?.name ?? '—'
      if (data.lateCount >= 3)  flags.push({ name, dept, reason: `${data.lateCount} late arrivals this month` })
      if (data.absences > 0)    flags.push({ name, dept, reason: `${data.absences} unapproved absence(s)` })
      if (data.earlyCount >= 3) flags.push({ name, dept, reason: `${data.earlyCount} early departures this month` })
      if (data.totalHours < emp.expectedMonthlyHours * 0.9)
        flags.push({ name, dept, reason: `Only ${Math.round(data.totalHours)}h worked vs ${emp.expectedMonthlyHours}h required` })
    }

    if (flags.length === 0) return

    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const rows = flags.map(f =>
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${f.name}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${f.dept}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#dc2626">${f.reason}</td></tr>`
    ).join('')

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'AMC Workforce <onboarding@resend.dev>',
        to: [process.env.HR_EMAIL ?? 'hr@accramedical.com'],
        subject: `[AMC] HR Attention Required — ${flags.length} staff flagged`,
        html: `<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto"><div style="background:#0f1117;padding:24px 32px;border-radius:8px 8px 0 0"><h1 style="color:#f59e0b;margin:0;font-size:20px">AMC Hospital — HR Notification</h1><p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:13px">${MONTHS[month-1]} ${year}</p></div><div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f9fafb"><th style="padding:8px 12px;text-align:left;color:#6b7280;border-bottom:2px solid #e5e7eb">Name</th><th style="padding:8px 12px;text-align:left;color:#6b7280;border-bottom:2px solid #e5e7eb">Department</th><th style="padding:8px 12px;text-align:left;color:#dc2626;border-bottom:2px solid #e5e7eb">Issue</th></tr></thead><tbody>${rows}</tbody></table></div></div>`,
      }),
    })
  } catch { /* notification failure never breaks sync */ }
}
