import { NextResponse } from 'next/server'
import employeesData from '@/lib/employees-data.json'
import leaveData from '@/lib/leave-data.json'

// Map raw DB/JSON department names → display names shown in the UI
const DEPT_DISPLAY: Record<string, string> = {
  'MEDICINE':           'Medicine',
  'NURSING & MIDWIFERY':'Nursing & Midwifery',
  'ALLIED HEALTH':      'Allied Health',
  'ADMIN':              'Administration',
  'AUXILIARY':          'Auxiliary',
  'PHARMACY':           'Pharmacy',
  'IMAGING':            'Imaging',
  'SPECIALIST':         'Specialist',
  'EMERGENCY':          'Emergency',
  'HDU-ICU':            'HDU/ICU',
  'LABORATORY':         'Laboratory',
  'MAINTENANCE':        'Maintenance',
  'THEATRE':            'Theatre',
  'WARD':               'Ward',
  // In case DB already has proper names
  'Administration':     'Administration',
  'Medicine':           'Medicine',
  'Nursing & Midwifery':'Nursing & Midwifery',
  'Allied Health':      'Allied Health',
  'Auxiliary':          'Auxiliary',
  'Pharmacy':           'Pharmacy',
  'Imaging':            'Imaging',
  'Specialist':         'Specialist',
  'Emergency':          'Emergency',
  'Laboratory':         'Laboratory',
  'Maintenance':        'Maintenance',
  'Theatre':            'Theatre',
  'Ward':               'Ward',
}

function toNum(v: unknown, def = 0): number {
  return typeof v === 'number' ? v : def
}

export async function GET() {
  // Build leave balance lookup by normalised employee name
  const leaveMap = new Map<string, typeof leaveData[0]>()
  for (const l of leaveData) {
    leaveMap.set(l.fullName.toUpperCase().trim(), l)
  }

  // ── Try DB first ──────────────────────────────────────────────────────────
  try {
    const { prisma } = await import('@/lib/prisma')

    const employees = await prisma.employee.findMany({
      where:   { status: 'ACTIVE' },
      include: {
        department:   true,
        leaveBalances: { where: { fiscalYear: '2025-2026' } },
      },
      orderBy: [
        { department: { name: 'asc' } },
        { name: 'asc' },
      ],
    })

    if (employees.length > 0) {
      const result = employees.map((emp, idx) => {
        const lb    = emp.leaveBalances[0]
        const json  = leaveMap.get(emp.name.toUpperCase().trim())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lbAny = lb as any

        const deptName = emp.department?.name ?? ''
        return {
          idx:                 idx + 1,
          id:                  emp.id,
          staffId:             emp.staffId,
          name:                emp.name,
          position:            emp.position,
          department:          DEPT_DISPLAY[deptName] ?? deptName,
          departmentCode:      emp.department?.code ?? '',
          confirmationStatus:  String((emp as unknown as Record<string, unknown>).confirmationStatus ?? 'CONFIRMED'),
          annualEntitlement:   lb ? lb.annualEntitlement   : toNum(json?.annualEntitlement),
          annualCarryForward:  lb ? lb.openingBalance       : toNum(json?.annualCarryForward),
          annualTaken:         lb ? lb.daysTaken            : toNum(json?.annualTaken),
          annualRemaining:     lb ? lb.daysRemaining        : toNum(json?.annualRemaining),
          holidayCarryForward: lb ? toNum(lbAny?.holidayCarryForward) : toNum(json?.holidayCarryForward),
          sickEntitlement:     lb ? toNum(lbAny?.sickEntitlement, 12) : toNum(json?.sickEntitlement, 12),
          sickTaken:           lb ? toNum(lbAny?.sickTaken)           : toNum(json?.sickTaken),
          sickRemaining:       lb ? toNum(lbAny?.sickRemaining, 12)   : toNum(json?.sickRemaining, 12),
        }
      })

      const stats = buildStats(result)
      return NextResponse.json({ employees: result, stats })
    }
  } catch {
    // DB unavailable — fall through to JSON
  }

  // ── JSON fallback ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const empList = employeesData as any[]

  const result = empList
    .sort((a, b) => {
      const da = (a.department?.name ?? '').localeCompare(b.department?.name ?? '')
      return da !== 0 ? da : (a.name ?? '').localeCompare(b.name ?? '')
    })
    .map((emp, idx) => {
      const json = leaveMap.get((emp.name ?? '').toUpperCase().trim())
      const deptName = emp.department?.name ?? ''
      return {
        idx:                 idx + 1,
        id:                  emp.id ?? emp.staffId,
        staffId:             emp.staffId ?? '',
        name:                emp.name ?? '',
        position:            emp.position ?? '',
        department:          DEPT_DISPLAY[deptName] ?? deptName,
        departmentCode:      emp.department?.code ?? emp.departmentId ?? '',
        confirmationStatus:  'CONFIRMED',
        annualEntitlement:   toNum(json?.annualEntitlement),
        annualCarryForward:  toNum(json?.annualCarryForward),
        annualTaken:         toNum(json?.annualTaken),
        annualRemaining:     toNum(json?.annualRemaining),
        holidayCarryForward: toNum(json?.holidayCarryForward),
        sickEntitlement:     toNum(json?.sickEntitlement, 12),
        sickTaken:           toNum(json?.sickTaken),
        sickRemaining:       toNum(json?.sickRemaining, 12),
      }
    })

  const stats = buildStats(result)
  return NextResponse.json({ employees: result, stats })
}

function buildStats(employees: ReturnType<typeof buildRow>[]) {
  const total      = employees.length
  const confirmed  = employees.filter(e => e.confirmationStatus === 'CONFIRMED').length
  const onProbation = total - confirmed
  const sickYTD    = employees.reduce((s, e) => s + e.sickTaken, 0)
  const sickAffected = employees.filter(e => e.sickTaken > 0).length
  const carryForward = employees.reduce(
    (s, e) => s + e.annualCarryForward + e.holidayCarryForward, 0,
  )
  return { total, confirmed, onProbation, sickYTD, sickAffected, carryForward, pendingApprovals: 0 }
}

// Trick TypeScript into knowing the shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRow(e: any) { return e as {
  idx: number; id: string; staffId: string; name: string; position: string
  department: string; departmentCode: string; confirmationStatus: string
  annualEntitlement: number; annualCarryForward: number; annualTaken: number
  annualRemaining: number; holidayCarryForward: number
  sickEntitlement: number; sickTaken: number; sickRemaining: number
}}
void buildRow
