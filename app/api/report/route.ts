import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SHIFT_HOURS, SHIFT_TIMES } from '@/lib/shifts'

const WORKING_SHIFTS_SET = new Set(['MORNING','AFTERNOON','DAY','PM_SHIFT','NIGHT','LATE','ON_CALL'])
const MIN_REST_HOURS = 11

function shiftEndDateTime(date: Date, shiftType: string): Date {
  const times = SHIFT_TIMES[shiftType]
  if (!times) return date
  const [endH, endM] = times.end.split(':').map(Number)
  const [startH] = times.start.split(':').map(Number)
  const d = new Date(date)
  d.setHours(endH, endM, 0, 0)
  if (endH < startH) d.setDate(d.getDate() + 1) // crosses midnight
  return d
}

function shiftStartDateTime(date: Date, shiftType: string): Date {
  const times = SHIFT_TIMES[shiftType]
  if (!times) return date
  const [startH, startM] = times.start.split(':').map(Number)
  const d = new Date(date)
  d.setHours(startH, startM, 0, 0)
  return d
}

function calcRestCompliance(slots: { employeeId: string; date: unknown; shiftType: string }[]) {
  const byEmp = new Map<string, typeof slots>()
  for (const s of slots) {
    if (!WORKING_SHIFTS_SET.has(s.shiftType)) continue
    if (!byEmp.has(s.employeeId)) byEmp.set(s.employeeId, [])
    byEmp.get(s.employeeId)!.push(s)
  }
  let total = 0, compliant = 0
  for (const empSlots of byEmp.values()) {
    empSlots.sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime())
    for (let i = 0; i < empSlots.length - 1; i++) {
      const currEnd   = shiftEndDateTime(new Date(empSlots[i].date as string), empSlots[i].shiftType)
      const nextStart = shiftStartDateTime(new Date(empSlots[i + 1].date as string), empSlots[i + 1].shiftType)
      const gapHours  = (nextStart.getTime() - currEnd.getTime()) / 3_600_000
      if (gapHours >= 0) {
        total++
        if (gapHours >= MIN_REST_HOURS) compliant++
      }
    }
  }
  return { total, compliant, rate: total > 0 ? Math.round((compliant / total) * 100) : 100 }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()))

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd   = new Date(year, month, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let departments: any[] = [], employees: any[] = [], rosters: any[] = [], attendance: any[] = []
  try {
    ;[departments, employees, rosters, attendance] = await Promise.all([
      prisma.department.findMany({ orderBy: { name: 'asc' } }),
      prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true, name: true, staffId: true, departmentId: true,
          employeeType: true, position: true,
          hourlyRate: true, monthlySalary: true,
          licenses: { select: { status: true, expiresAt: true, type: true } },
        },
      }),
      prisma.roster.findMany({
        where: { month, year },
        include: {
          slots: { select: { employeeId: true, date: true, shiftType: true, plannedHours: true } },
        },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: { employeeId: true, date: true, status: true, totalHours: true, lateMinutes: true, clockIn: true },
      }),
    ])
  } catch { /* DB unavailable — return empty report */ }

  const empById = new Map(employees.map(e => [e.id, e]))

  // ── Slot lookup for planned hours ─────────────────────────────────────────
  const allSlots = rosters.flatMap(r => r.slots)
  const slotKey = (empId: string, date: Date) => `${empId}_${date.toISOString().slice(0, 10)}`
  const slotMap = new Map(allSlots.map(s => [slotKey(s.employeeId, s.date as unknown as Date), s]))

  // ── Per-department aggregation ─────────────────────────────────────────────
  const deptStats = departments.map(dept => {
    const deptEmps = employees.filter(e => e.departmentId === dept.id)
    const deptEmpIds = new Set(deptEmps.map(e => e.id))
    const deptAttendance = attendance.filter(a => deptEmpIds.has(a.employeeId))

    const present    = deptAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const absent     = deptAttendance.filter(a => a.status === 'ABSENT').length
    const onLeave    = deptAttendance.filter(a => a.status === 'ON_LEAVE').length
    const late       = deptAttendance.filter(a => (a.lateMinutes ?? 0) > 0).length

    const hoursWorked = deptAttendance.reduce((s, a) => s + Math.max(0, a.totalHours ?? 0), 0)

    // Overtime = hours worked beyond planned shift hours
    const overtimeHrs = deptAttendance.reduce((s, a) => {
      const hours = Math.max(0, a.totalHours ?? 0)
      const slot = slotMap.get(slotKey(a.employeeId, a.date as unknown as Date))
      const planned = slot ? (slot.plannedHours ?? SHIFT_HOURS[slot.shiftType] ?? 8) : 8
      const extra = hours - planned
      return s + (extra > 0 ? extra : 0)
    }, 0)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plannedHours = rosters.find((r: any) => r.departmentId === dept.id)?.slots
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((s: any) => deptEmpIds.has(s.employeeId))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((sum: number, s: any) => sum + (s.plannedHours ?? 0), 0) ?? 0

    const workingDays = deptAttendance.length
    const attendanceRate = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0

    const deptSlots = allSlots.filter(s => deptEmpIds.has(s.employeeId))
    const annualLeaveDays    = deptSlots.filter(s => s.shiftType === 'ANNUAL_LEAVE').length
    const sickLeaveDays      = deptSlots.filter(s => s.shiftType === 'SICK_LEAVE').length
    const maternityLeaveDays = deptSlots.filter(s => s.shiftType === 'MATERNITY_LEAVE').length

    // Schedule adherence: of working shifts rostered, how many had actual clock-in
    const deptSlotsFull = allSlots.filter(s => deptEmpIds.has(s.employeeId) && WORKING_SHIFTS_SET.has(s.shiftType))
    const scheduledCount = deptSlotsFull.length
    const deptAttMap = new Map(deptAttendance.map(a => [`${a.employeeId}_${new Date(a.date as unknown as Date).toISOString().slice(0,10)}`, a]))
    const adheredCount = deptSlotsFull.filter(s => {
      const key = `${s.employeeId}_${new Date(s.date as unknown as Date).toISOString().slice(0,10)}`
      const att = deptAttMap.get(key)
      return att && att.clockIn
    }).length
    const scheduleAdherenceRate = scheduledCount > 0 ? Math.round((adheredCount / scheduledCount) * 100) : 0

    const punctualityRate = present > 0 ? Math.round(((present - late) / present) * 100) : 0
    const absenteeismRate = scheduledCount > 0 ? Math.round((absent / scheduledCount) * 100) : 0
    const overtimeRate = hoursWorked > 0 ? Math.round((overtimeHrs / hoursWorked) * 100) : 0

    const deptRestResult = calcRestCompliance(allSlots.filter(s => deptEmpIds.has(s.employeeId)))
    const restPeriodComplianceRate = deptRestResult.rate

    // License compliance — null when no license data entered yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empsWithLicenses = deptEmps.filter((e: any) => e.licenses.length > 0)
    const licenseComplianceRate = empsWithLicenses.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? Math.round((deptEmps.filter((e: any) => !e.licenses.some((l: any) => l.status === 'EXPIRED')).length / deptEmps.length) * 100)
      : null

    // Cost breakdown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locumCost = deptEmps.filter((e: any) => e.employeeType === 'LOCUM' && e.hourlyRate).reduce((s: number, e: any) => {
      const hrs = deptAttendance.filter(a => a.employeeId === e.id).reduce((h, a) => h + (a.totalHours ?? 0), 0)
      return s + e.hourlyRate * hrs
    }, 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const permanentCost = deptEmps.filter((e: any) => e.employeeType === 'PERMANENT' && e.monthlySalary).reduce((s: number, e: any) => s + e.monthlySalary, 0)

    return {
      id: dept.id, name: dept.name, code: dept.code,
      totalStaff: deptEmps.length,
      locumCount: deptEmps.filter(e => e.employeeType === 'LOCUM').length,
      permanentCount: deptEmps.filter(e => e.employeeType !== 'LOCUM').length,
      present, absent, onLeave, late,
      attendanceRate,
      punctualityRate, absenteeismRate, overtimeRate, restPeriodComplianceRate,
      licenseComplianceRate, locumCost: Math.round(locumCost), permanentCost: Math.round(permanentCost),
      hoursWorked: Math.round(hoursWorked * 10) / 10,
      overtimeHours: Math.round(overtimeHrs * 10) / 10,
      plannedHours,
      annualLeaveDays, sickLeaveDays, maternityLeaveDays,
      scheduledCount, adheredCount, scheduleAdherenceRate,
    }
  }).filter(d => d.totalStaff > 0)

  const totalPresent     = deptStats.reduce((s, d) => s + d.present, 0)
  const totalAbsent      = deptStats.reduce((s, d) => s + d.absent, 0)
  const totalOnLeave     = deptStats.reduce((s, d) => s + d.onLeave, 0)
  const totalLate        = deptStats.reduce((s, d) => s + d.late, 0)
  const totalHours       = deptStats.reduce((s, d) => s + d.hoursWorked, 0)
  const totalOvertime    = deptStats.reduce((s, d) => s + d.overtimeHours, 0)
  const totalAnnualLeave = deptStats.reduce((s, d) => s + d.annualLeaveDays, 0)
  const totalSickLeave   = deptStats.reduce((s, d) => s + d.sickLeaveDays, 0)
  const allRecords       = attendance.length
  const overallRate      = allRecords > 0 ? Math.round((totalPresent / allRecords) * 100) : 0

  const rankedDepts      = [...deptStats].filter(d => d.present + d.absent > 0).sort((a, b) => b.attendanceRate - a.attendanceRate)
  const topDept          = rankedDepts[0]?.name ?? '—'
  const bottomDept       = rankedDepts[rankedDepts.length - 1]?.name ?? '—'
  const topOvertimeDept  = [...deptStats].sort((a, b) => b.overtimeHours - a.overtimeHours)[0]?.name ?? '—'

  const totalScheduled = deptStats.reduce((s, d) => s + d.scheduledCount, 0)
  const totalAdhered   = deptStats.reduce((s, d) => s + d.adheredCount, 0)
  const overallAdherenceRate = totalScheduled > 0 ? Math.round((totalAdhered / totalScheduled) * 100) : 0
  const lowestAdherenceDept = [...deptStats].filter(d => d.scheduledCount > 0).sort((a,b) => a.scheduleAdherenceRate - b.scheduleAdherenceRate)[0]?.name ?? '—'

  const totalPunctual = deptStats.reduce((s, d) => s + (d.present - d.late), 0)
  const overallPunctualityRate = totalPresent > 0 ? Math.round((totalPunctual / totalPresent) * 100) : 0
  const overallAbsenteeismRate = totalScheduled > 0 ? Math.round((totalAbsent / totalScheduled) * 100) : 0
  const overallOvertimeRate = totalHours > 0 ? Math.round((totalOvertime / totalHours) * 100) : 0
  const totalLocum = employees.filter(e => e.employeeType === 'LOCUM').length
  const totalPermanent = employees.length - totalLocum
  const overallRestResult = calcRestCompliance(allSlots)
  const overallRestPeriodComplianceRate = overallRestResult.rate
  const lowestRestDept = [...deptStats].filter(d => d.restPeriodComplianceRate < 100).sort((a, b) => a.restPeriodComplianceRate - b.restPeriodComplianceRate)[0]?.name ?? '—'

  // License compliance overall
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEmpsWithLicenses = employees.filter((e: any) => e.licenses.length > 0)
  const overallLicenseComplianceRate = allEmpsWithLicenses.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? Math.round((employees.filter((e: any) => !e.licenses.some((l: any) => l.status === 'EXPIRED')).length / employees.length) * 100)
    : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lowestLicenseDept = [...deptStats].filter(d => d.licenseComplianceRate !== null && d.licenseComplianceRate! < 100).sort((a, b) => (a.licenseComplianceRate ?? 100) - (b.licenseComplianceRate ?? 100))[0]?.name ?? '—'

  // Locum vs permanent cost ratio
  const totalLocumCost  = deptStats.reduce((s, d) => s + d.locumCost, 0)
  const totalPermanentCost = deptStats.reduce((s, d) => s + d.permanentCost, 0)
  const locumCostRatio = totalPermanentCost > 0
    ? Math.round((totalLocumCost / totalPermanentCost) * 100) / 100
    : null  // null = no salary data entered yet

  return NextResponse.json({
    month, year,
    generatedAt: new Date().toISOString(),
    hospital: 'AMC Hospital',
    summary: {
      totalActiveStaff: employees.length,
      totalDepartments: deptStats.length,
      locumStaff: employees.filter(e => e.employeeType === 'LOCUM').length,
      overallAttendanceRate: overallRate,
      totalHoursWorked: Math.round(totalHours),
      totalOvertimeHours: Math.round(totalOvertime),
      totalPresent, totalAbsent, totalOnLeave, totalLate,
      totalAnnualLeaveDays: totalAnnualLeave,
      totalSickLeaveDays: totalSickLeave,
      topPerformingDept: topDept,
      lowestAttendanceDept: bottomDept,
      highestOvertimeDept: topOvertimeDept,
      overallAdherenceRate,
      totalScheduled,
      totalAdhered,
      lowestAdherenceDept,
      overallPunctualityRate,
      overallAbsenteeismRate,
      overallOvertimeRate,
      overallRestPeriodComplianceRate,
      lowestRestDept,
      overallLicenseComplianceRate,
      lowestLicenseDept,
      totalLocumCost,
      totalPermanentCost,
      locumCostRatio,
      totalLocum,
      totalPermanent,
    },
    departments: deptStats,
  })
}
