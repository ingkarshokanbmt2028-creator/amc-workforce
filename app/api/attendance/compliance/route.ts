import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SHIFT_TIMES, SHIFT_HOURS } from '@/lib/shifts'

const WORKING_SHIFTS = new Set(['MORNING', 'AFTERNOON', 'DAY', 'PM_SHIFT', 'NIGHT', 'LATE', 'ON_CALL'])
const LEAVE_SHIFTS   = new Set(['ANNUAL_LEAVE', 'SICK_LEAVE', 'MATERNITY_LEAVE'])
const GRACE_MINUTES  = 5

function minutesDiff(actual: Date, scheduled: Date): number {
  return Math.round((actual.getTime() - scheduled.getTime()) / 60000)
}

function parseScheduledTime(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(h, m, 0, 0)
  return d
}

export type ComplianceStatus =
  | 'COMPLIANT'
  | 'LATE'
  | 'NO_SHOW'
  | 'OFF_DAY'
  | 'ON_LEAVE'
  | 'LEAVE_CONFLICT'
  | 'UNSCHEDULED'

export interface ComplianceRow {
  employeeId: string
  employeeName: string
  staffId: string
  department: string
  departmentId: string
  date: string
  rosterShift: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  scheduledHours: number
  clockIn: string | null
  clockOut: string | null
  actualHours: number
  attendanceStatus: string | null
  compliance: ComplianceStatus
  lateMinutes: number
  varianceHours: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month        = Number(searchParams.get('month'))
  const year         = Number(searchParams.get('year'))
  const departmentId = searchParams.get('departmentId') ?? undefined
  const employeeId   = searchParams.get('employeeId') ?? undefined

  if (!month || !year) {
    return NextResponse.json({ error: 'month and year required' }, { status: 400 })
  }

  const startDate = new Date(year, month - 1, 1)
  const endDate   = new Date(year, month, 0)

  try {
    const [rosterSlots, attendanceRecords] = await Promise.all([
      prisma.rosterSlot.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(employeeId   ? { employeeId }                    : {}),
          ...(departmentId ? { employee: { departmentId } }    : {}),
        },
        include: { employee: { include: { department: true } } },
      }),
      prisma.attendance.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(employeeId   ? { employeeId }                    : {}),
          ...(departmentId ? { employee: { departmentId } }    : {}),
        },
        include: { employee: { include: { department: true } } },
      }),
    ])

    // Build lookup: "employeeId:YYYY-MM-DD" → record
    const slotByKey = new Map<string, typeof rosterSlots[0]>()
    for (const s of rosterSlots) {
      const dk = (s.date instanceof Date ? s.date : new Date(s.date)).toISOString().slice(0, 10)
      slotByKey.set(`${s.employeeId}:${dk}`, s)
    }

    const attByKey = new Map<string, typeof attendanceRecords[0]>()
    for (const a of attendanceRecords) {
      const dk = (a.date instanceof Date ? a.date : new Date(a.date)).toISOString().slice(0, 10)
      attByKey.set(`${a.employeeId}:${dk}`, a)
    }

    // Union of all keys
    const allKeys = new Set([...slotByKey.keys(), ...attByKey.keys()])

    const rows: ComplianceRow[] = []

    for (const key of allKeys) {
      const slot = slotByKey.get(key)
      const att  = attByKey.get(key)
      const emp  = slot?.employee ?? att?.employee
      if (!emp) continue

      const dateKey      = key.split(':')[1]
      const shiftType    = slot?.shiftType ?? null
      const times        = shiftType ? (SHIFT_TIMES[shiftType] ?? null) : null
      const scheduledHrs = shiftType ? (SHIFT_HOURS[shiftType] ?? 0)   : 0
      const actualHrs    = att?.totalHours ?? 0

      const clockIn  = att?.clockIn  ? att.clockIn.toISOString()  : null
      const clockOut = att?.clockOut ? att.clockOut.toISOString() : null

      // Late minutes vs scheduled shift start
      let lateMinutes = 0
      if (times && att?.clockIn) {
        const scheduled = parseScheduledTime(dateKey, times.start)
        const actual    = new Date(att.clockIn)
        const diff      = minutesDiff(actual, scheduled)
        if (diff > GRACE_MINUTES) lateMinutes = diff - GRACE_MINUTES
      }

      const isWorking = shiftType ? WORKING_SHIFTS.has(shiftType) : false
      const isLeave   = shiftType ? LEAVE_SHIFTS.has(shiftType)   : false
      const hasClockIn = !!att?.clockIn
      const isAbsent   = !att || att.status === 'ABSENT'

      let compliance: ComplianceStatus
      if (!slot) {
        // Attendance with no roster entry
        compliance = hasClockIn ? 'UNSCHEDULED' : 'UNSCHEDULED'
      } else if (isWorking) {
        if (isAbsent) {
          compliance = 'NO_SHOW'
        } else if (att?.status === 'ON_LEAVE') {
          compliance = 'ON_LEAVE'
        } else if (lateMinutes > 0) {
          compliance = 'LATE'
        } else {
          compliance = 'COMPLIANT'
        }
      } else if (isLeave) {
        compliance = hasClockIn ? 'LEAVE_CONFLICT' : 'ON_LEAVE'
      } else {
        // OFF
        compliance = hasClockIn ? 'UNSCHEDULED' : 'OFF_DAY'
      }

      rows.push({
        employeeId:       emp.id,
        employeeName:     emp.name,
        staffId:          emp.staffId,
        department:       emp.department?.name ?? '—',
        departmentId:     emp.departmentId,
        date:             dateKey,
        rosterShift:      shiftType,
        scheduledStart:   times?.start ?? null,
        scheduledEnd:     times?.end   ?? null,
        scheduledHours:   scheduledHrs,
        clockIn,
        clockOut,
        actualHours:      actualHrs,
        attendanceStatus: att?.status ?? null,
        compliance,
        lateMinutes,
        varianceHours:    Math.round((actualHrs - scheduledHrs) * 10) / 10,
      })
    }

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName))

    return NextResponse.json({ rows })
  } catch (e) {
    console.error('[compliance]', e)
    return NextResponse.json({ error: 'Internal server error', rows: [] }, { status: 500 })
  }
}
