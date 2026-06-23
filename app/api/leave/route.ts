import { NextResponse } from 'next/server'
import employeesData from '@/lib/employees-data.json'
import leaveData from '@/lib/leave-data.json'

// Map raw DB/JSON department names → display names
const DEPT_DISPLAY: Record<string, string> = {
  'MEDICINE':            'Medicine',
  'NURSING & MIDWIFERY': 'Nursing & Midwifery',
  'ALLIED HEALTH':       'Allied Health',
  'ADMIN':               'Administration',
  'AUXILIARY':           'Auxiliary',
  'PHARMACY':            'Pharmacy',
  'IMAGING':             'Imaging',
  'SPECIALIST':          'Specialist',
  'EMERGENCY':           'Emergency',
  'HDU-ICU':             'HDU/ICU',
  'LABORATORY':          'Laboratory',
  'MAINTENANCE':         'Maintenance',
  'THEATRE':             'Theatre',
  'WARD':                'Ward',
  // In case DB already has proper display names
  'Administration':      'Administration',
  'Medicine':            'Medicine',
  'Nursing & Midwifery': 'Nursing & Midwifery',
  'Allied Health':       'Allied Health',
  'Auxiliary':           'Auxiliary',
  'Pharmacy':            'Pharmacy',
  'Imaging':             'Imaging',
  'Specialist':          'Specialist',
  'Emergency':           'Emergency',
  'Laboratory':          'Laboratory',
  'Maintenance':         'Maintenance',
  'Theatre':             'Theatre',
  'Ward':                'Ward',
}

// ── Fuzzy name matching ───────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/,/g, ' ')         // "PONJIN, JOSEPH" → "PONJIN  JOSEPH"
    .replace(/\(.*?\)/g, ' ')   // remove "(JNR)" etc.
    .replace(/[-]/g, ' ')       // "OPOKU-AKOTO" → "OPOKU AKOTO"
    .replace(/\s+/g, ' ')       // collapse multiple spaces
    .trim()
}

function getTokens(name: string): string[] {
  // Filter out very short tokens and common noise words
  return normalizeName(name).split(' ').filter(t => t.length > 1)
}

function matchScore(empName: string, leaveName: string): number {
  const empTokens  = new Set(getTokens(empName))
  const leaveTokens = getTokens(leaveName)
  if (empTokens.size === 0 || leaveTokens.length === 0) return 0

  const common = leaveTokens.filter(t => empTokens.has(t))
  if (common.length === 0) return 0

  // Jaccard-like score: intersect / union  — penalises partial matches
  const union = new Set([...empTokens, ...leaveTokens]).size
  return common.length / union
}

// Manual overrides for names that differ too much for fuzzy matching
// Key = DB employee name (UPPER), Value = leave-data fullName (UPPER)
const MANUAL_MATCHES: Record<string, string> = {
  'EMMANUEL LOUIS INTERFUL (JNR)': 'EMMANUEL LOUIS JNR NTERFUL',
  'JAHEL DODOO':                    'JAHEL DODO',
  'AKUA FREMPONG ASAMOAH':          'AKUA ASAMOAH-FREMPONG',
  'AKOSUA ANANE-DARKO':             'AKOSUA ANANE DARKO',
  'THERESA DEDE TISEI':             'THERESA DEDE TUTU', // possible Excel name discrepancy
}

// Build fast lookup by normalised name
const leaveByFullName = new Map(leaveData.map(l => [l.fullName.toUpperCase().trim(), l]))

// Build a fuzzy lookup: for each leave entry, pre-build normalised tokens
const leaveEntries = leaveData.map(l => ({
  ...l,
  _tokens: new Set(getTokens(l.fullName)),
}))

function findLeave(empName: string) {
  const upper = empName.toUpperCase().trim()

  // 1. Manual override
  const manualKey = MANUAL_MATCHES[upper]
  if (manualKey) {
    const found = leaveByFullName.get(manualKey)
    if (found) return found
  }

  // 2. Fuzzy match
  let best: (typeof leaveEntries[0]) | null = null
  let bestScore = 0

  for (const entry of leaveEntries) {
    const score = matchScore(empName, entry.fullName)
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  // Accept if at least 45% token overlap (catches edge cases like middle-name differences)
  return bestScore >= 0.45 ? best : null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(v: unknown, def = 0): number {
  return typeof v === 'number' && isFinite(v) ? v : def
}

function buildRow(
  idx: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emp: any,
  deptName: string,
  deptCode: string,
  confirmationStatus: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lb: any | null,
  json: (typeof leaveData[0]) | null,
) {
  const annualEntitlement   = lb ? toNum(lb.annualEntitlement)   : toNum(json?.annualEntitlement)
  const annualCarryForward  = lb ? toNum(lb.openingBalance)      : toNum(json?.annualCarryForward)
  const annualTaken         = lb ? toNum(lb.daysTaken)           : toNum(json?.annualTaken)
  const annualRemaining     = lb ? toNum(lb.daysRemaining)       : toNum(json?.annualRemaining)
  const holidayCarryForward = lb ? toNum(lb.holidayCarryForward) : toNum(json?.holidayCarryForward)
  const sickEntitlement     = lb ? toNum(lb.sickEntitlement, 12) : toNum(json?.sickEntitlement, 12)
  const rawSickTaken        = lb ? toNum(lb.sickTaken)           : toNum(json?.sickTaken)
  // Cap sick taken at entitlement (guards against Excel data-entry errors)
  const sickTaken           = Math.min(rawSickTaken, sickEntitlement)
  const sickRemaining       = Math.max(0, sickEntitlement - sickTaken)

  return {
    idx,
    id:                  emp.id ?? emp.staffId,
    staffId:             emp.staffId ?? '',
    name:                emp.name ?? '',
    position:            emp.position ?? '',
    department:          DEPT_DISPLAY[deptName] ?? deptName,
    departmentCode:      deptCode,
    confirmationStatus,
    annualEntitlement,
    annualCarryForward,
    annualTaken,
    annualRemaining,
    holidayCarryForward,
    sickEntitlement,
    sickTaken,
    sickRemaining,
  }
}

function buildStats(employees: ReturnType<typeof buildRow>[]) {
  const total       = employees.length
  const confirmed   = employees.filter(e => e.confirmationStatus === 'CONFIRMED').length
  const onProbation = total - confirmed
  const sickYTD     = employees.reduce((s, e) => s + e.sickTaken, 0)
  const sickAffected = employees.filter(e => e.sickTaken > 0).length
  const carryForward = Math.round(
    employees.reduce((s, e) => s + e.annualCarryForward + e.holidayCarryForward, 0),
  )
  return { total, confirmed, onProbation, sickYTD, sickAffected, carryForward, pendingApprovals: 0 }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  // ── Try DB first ────────────────────────────────────────────────────────────
  try {
    const { prisma } = await import('@/lib/prisma')

    const employees = await prisma.employee.findMany({
      where:   { status: 'ACTIVE' },
      include: {
        department:    true,
        leaveBalances: { where: { fiscalYear: '2025-2026' } },
      },
      orderBy: [
        { department: { name: 'asc' } },
        { name: 'asc' },
      ],
    })

    if (employees.length > 0) {
      const result = employees.map((emp, idx) => {
        const lb   = emp.leaveBalances[0] ?? null
        const json = lb ? null : findLeave(emp.name)

        const deptName = emp.department?.name ?? ''
        const deptCode = emp.department?.code ?? ''
        const status   = String(
          (emp as unknown as Record<string, unknown>).confirmationStatus ?? 'CONFIRMED',
        )
        return buildRow(idx + 1, emp, deptName, deptCode, status, lb, json)
      })

      return NextResponse.json({ employees: result, stats: buildStats(result) })
    }
  } catch {
    // DB unavailable — fall through to JSON
  }

  // ── JSON fallback ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const empList = (employeesData as any[]).slice().sort((a, b) => {
    const da = (a.department?.name ?? '').localeCompare(b.department?.name ?? '')
    return da !== 0 ? da : (a.name ?? '').localeCompare(b.name ?? '')
  })

  const result = empList.map((emp, idx) => {
    const json     = findLeave(emp.name ?? '')
    const deptName = emp.department?.name ?? ''
    const deptCode = emp.department?.code ?? emp.departmentId ?? ''
    return buildRow(idx + 1, emp, deptName, deptCode, 'CONFIRMED', null, json)
  })

  return NextResponse.json({ employees: result, stats: buildStats(result) })
}
