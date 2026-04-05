import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SHIFT_HOURS } from '@/lib/shifts'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()))

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd   = new Date(year, month, 0)

  const [departments, employees, rosters, attendance] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, staffId: true, departmentId: true, employeeType: true, position: true },
    }),
    prisma.roster.findMany({
      where: { month, year },
      include: {
        slots: { select: { employeeId: true, date: true, shiftType: true, plannedHours: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      select: { employeeId: true, date: true, status: true, totalHours: true, lateMinutes: true },
    }),
  ])

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

    const plannedHours = rosters.find(r => r.departmentId === dept.id)?.slots
      .filter(s => deptEmpIds.has(s.employeeId))
      .reduce((sum, s) => sum + (s.plannedHours ?? 0), 0) ?? 0

    const workingDays = deptAttendance.length
    const attendanceRate = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0

    const deptSlots = allSlots.filter(s => deptEmpIds.has(s.employeeId))
    const annualLeaveDays    = deptSlots.filter(s => s.shiftType === 'ANNUAL_LEAVE').length
    const sickLeaveDays      = deptSlots.filter(s => s.shiftType === 'SICK_LEAVE').length
    const maternityLeaveDays = deptSlots.filter(s => s.shiftType === 'MATERNITY_LEAVE').length

    return {
      id: dept.id, name: dept.name, code: dept.code,
      totalStaff: deptEmps.length,
      locumCount: deptEmps.filter(e => e.employeeType === 'LOCUM').length,
      present, absent, onLeave, late,
      attendanceRate,
      hoursWorked: Math.round(hoursWorked * 10) / 10,
      overtimeHours: Math.round(overtimeHrs * 10) / 10,
      plannedHours,
      annualLeaveDays, sickLeaveDays, maternityLeaveDays,
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
    },
    departments: deptStats,
  })
}
