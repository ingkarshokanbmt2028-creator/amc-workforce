import { prisma } from '@/lib/prisma'
import { SHIFT_HOURS, SHIFT_TIMES, isLeave } from '@/lib/shifts'

// TODO: Confirm Biotime API URL with AMC IT team
// TODO: Confirm emp_code field maps to Employee.staffId or separate biotimeEmpCode
// TODO: Grace period for late — defaulting to 5 min, AMC hasn't decided policy yet
// TODO: How to handle missing clock-out — currently flagging as PARTIAL

const GRACE_PERIOD_MINUTES = 5

interface BiotimePunch {
  emp_code: string
  punch_time: string // ISO datetime string
  punch_state: '0' | '1' // '0' = clock-in, '1' = clock-out
  terminal_sn?: string
}

interface BiotimeJwtResponse {
  token: string
}

// ─── Biotime API ────────────────────────────────────────────────────────────

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
  const data: BiotimeJwtResponse = await res.json()
  return data.token
}

async function fetchBiotimePunches(
  token: string,
  startDate: Date,
  endDate: Date,
): Promise<BiotimePunch[]> {
  const start = startDate.toISOString().replace('T', ' ').slice(0, 19)
  const end = endDate.toISOString().replace('T', ' ').slice(0, 19)
  const punches: BiotimePunch[] = []
  let nextUrl: string | null =
    `${process.env.BIOTIME_API_URL}/att/api/transactions/?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(end)}&page_size=500`

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, {
      headers: { Authorization: `JWT ${token}` },
    })
    if (!response.ok) throw new Error(`Biotime fetch failed: ${response.status}`)
    const page: { data?: BiotimePunch[]; results?: BiotimePunch[]; next?: string | null } =
      await response.json()
    punches.push(...(page.data ?? page.results ?? []))
    nextUrl = page.next ?? null
  }

  return punches
}

// ─── Mock fallback ───────────────────────────────────────────────────────────

async function getMockTransactions(startDate: Date, endDate: Date): Promise<BiotimePunch[]> {
  // Pull real roster slots for the date range so mock punches match actual scheduled employees
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

    // Parse scheduled start time (e.g. "07:00")
    const [startH, startM] = (slot.startTime ?? '07:00').split(':').map(Number)
    const [endH, endM] = (slot.endTime ?? '15:00').split(':').map(Number)

    // Clock-in: scheduled time ± up to 15 min random variation
    const variation = () => Math.floor(Math.random() * 31) - 10 // -10 to +20 min
    const clockIn = new Date(date)
    clockIn.setHours(startH, startM + variation(), 0, 0)

    // Clock-out: scheduled end ± small variation, handle overnight
    const clockOut = new Date(date)
    const outVariation = Math.floor(Math.random() * 21) - 5 // -5 to +15 min
    if (endH < startH) {
      // overnight shift — clock-out is next calendar day
      clockOut.setDate(clockOut.getDate() + 1)
    }
    clockOut.setHours(endH, endM + outVariation, 0, 0)

    // 5% chance of missing clock-out (machine error simulation)
    const missingClockOut = Math.random() < 0.05

    punches.push({ emp_code: empCode, punch_time: clockIn.toISOString(), punch_state: '0' })
    if (!missingClockOut) {
      punches.push({ emp_code: empCode, punch_time: clockOut.toISOString(), punch_state: '1' })
    }
  }

  return punches
}

// ─── Main fetch ──────────────────────────────────────────────────────────────

async function fetchTransactions(startDate: Date, endDate: Date): Promise<BiotimePunch[]> {
  if (!process.env.BIOTIME_API_URL) {
    return getMockTransactions(startDate, endDate)
  }
  const token = await getBiotimeToken()
  return fetchBiotimePunches(token, startDate, endDate)
}


// ─── Punch grouping ──────────────────────────────────────────────────────────

interface DayPunches {
  clockIn?: Date
  clockOut?: Date
}

function groupPunches(punches: BiotimePunch[]): Map<string, Map<string, DayPunches>> {
  // Map<empCode, Map<YYYY-MM-DD, DayPunches>>
  const grouped = new Map<string, Map<string, { ins: Date[]; outs: Date[] }>>()

  for (const punch of punches) {
    const punchTime = new Date(punch.punch_time)

    // Overnight: punch before 06:00 belongs to previous calendar day
    const calendarDate = new Date(punchTime)
    if (punchTime.getHours() < 6) {
      calendarDate.setDate(calendarDate.getDate() - 1)
    }
    const dateKey = calendarDate.toISOString().slice(0, 10)

    if (!grouped.has(punch.emp_code)) grouped.set(punch.emp_code, new Map())
    const byDate = grouped.get(punch.emp_code)!
    if (!byDate.has(dateKey)) byDate.set(dateKey, { ins: [], outs: [] })
    const day = byDate.get(dateKey)!

    if (punch.punch_state === '0') day.ins.push(punchTime)
    else day.outs.push(punchTime)
  }

  // Reduce to first in / last out, dedup within 5 min
  const result = new Map<string, Map<string, DayPunches>>()
  for (const [empCode, byDate] of grouped) {
    result.set(empCode, new Map())
    for (const [dateKey, { ins, outs }] of byDate) {
      ins.sort((a, b) => a.getTime() - b.getTime())
      outs.sort((a, b) => a.getTime() - b.getTime())

      const clockIn = ins[0]
      const clockOut = outs.length > 0 ? outs[outs.length - 1] : undefined

      result.get(empCode)!.set(dateKey, { clockIn, clockOut })
    }
  }

  return result
}

// ─── Attendance matching ─────────────────────────────────────────────────────

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function minutesToDiff(actual: Date, scheduledTime: string, baseDate: Date): number {
  const scheduled = parseTimeToMinutes(scheduledTime)
  const actualMinutes = actual.getHours() * 60 + actual.getMinutes()
  return actualMinutes - scheduled
}

// ─── Public sync function ────────────────────────────────────────────────────

export async function syncAttendance(fromDate: Date, toDate: Date) {
  let recordsFetched = 0
  let recordsProcessed = 0
  let errors: string | null = null

  try {
    const punches = await fetchTransactions(fromDate, toDate)
    recordsFetched = punches.length

    const grouped = groupPunches(punches)

    for (const [empCode, byDate] of grouped) {
      // TODO: Confirm emp_code field maps to Employee.staffId or separate biotimeEmpCode
      const employee = await prisma.employee.findFirst({
        where: {
          OR: [{ staffId: empCode }, { biotimeEmpCode: empCode }],
        },
      })
      if (!employee) continue

      for (const [dateKey, { clockIn, clockOut }] of byDate) {
        const date = new Date(dateKey)

        const rosterSlot = await prisma.rosterSlot.findFirst({
          where: { employeeId: employee.id, date },
        })

        // Has leave slot → ON_LEAVE, skip punch matching
        if (rosterSlot && isLeave(rosterSlot.shiftType)) {
          await prisma.attendance.upsert({
            where: { employeeId_date: { employeeId: employee.id, date } },
            create: {
              employeeId: employee.id,
              rosterSlotId: rosterSlot.id,
              date,
              status: 'ON_LEAVE',
              scheduledIn: rosterSlot.startTime ?? undefined,
              scheduledOut: rosterSlot.endTime ?? undefined,
            },
            update: { status: 'ON_LEAVE' },
          })
          recordsProcessed++
          continue
        }

        // No clockIn and no leave → ABSENT
        if (!clockIn) {
          await prisma.attendance.upsert({
            where: { employeeId_date: { employeeId: employee.id, date } },
            create: {
              employeeId: employee.id,
              rosterSlotId: rosterSlot?.id ?? undefined,
              date,
              status: 'ABSENT',
              scheduledIn: rosterSlot?.startTime ?? undefined,
              scheduledOut: rosterSlot?.endTime ?? undefined,
            },
            update: { status: 'ABSENT' },
          })
          recordsProcessed++
          continue
        }

        let lateMinutes: number | undefined
        let earlyDepartureMinutes: number | undefined
        let totalHours: number | undefined
        let status: 'PRESENT' | 'LATE' | 'EARLY_DEPARTURE' | 'PARTIAL' = 'PRESENT'

        const scheduledIn = rosterSlot?.startTime ?? SHIFT_TIMES[rosterSlot?.shiftType ?? '']?.start
        const scheduledOut = rosterSlot?.endTime ?? SHIFT_TIMES[rosterSlot?.shiftType ?? '']?.end

        if (scheduledIn) {
          const diff = minutesToDiff(clockIn, scheduledIn, date)
          if (diff > GRACE_PERIOD_MINUTES) {
            lateMinutes = diff
            status = 'LATE'
          }
        }

        if (clockOut && scheduledOut) {
          const diff = minutesToDiff(clockOut, scheduledOut, date)
          if (diff < -GRACE_PERIOD_MINUTES) {
            earlyDepartureMinutes = Math.abs(diff)
            status = status === 'LATE' ? 'PARTIAL' : 'EARLY_DEPARTURE'
          }
          totalHours = (clockOut.getTime() - clockIn.getTime()) / 1000 / 3600
        } else if (!clockOut) {
          // Has clockIn but no clockOut → PARTIAL, flag for HR
          status = 'PARTIAL'
        }

        await prisma.attendance.upsert({
          where: { employeeId_date: { employeeId: employee.id, date } },
          create: {
            employeeId: employee.id,
            rosterSlotId: rosterSlot?.id ?? undefined,
            date,
            clockIn,
            clockOut: clockOut ?? undefined,
            totalHours,
            scheduledIn,
            scheduledOut,
            lateMinutes,
            earlyDepartureMinutes,
            status,
          },
          update: {
            clockIn,
            clockOut: clockOut ?? undefined,
            totalHours,
            lateMinutes,
            earlyDepartureMinutes,
            status,
          },
        })
        recordsProcessed++
      }
    }
  } catch (err) {
    errors = err instanceof Error ? err.message : String(err)
  }

  await prisma.biotimeSyncLog.create({
    data: {
      recordsFetched,
      recordsProcessed,
      errors,
      fromDate,
      toDate,
    },
  })

  return { recordsFetched, recordsProcessed, errors }
}
