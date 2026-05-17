/**
 * mock-roster.ts
 * Converts ROTA_DATA (from data/rotaData.ts) into the Roster API response
 * format used by /api/roster when the database is unavailable.
 */

import { ROTA_DATA } from '@/data/rotaData'

// rotaData dept name → local department id/code
const DEPT_NAME_TO_ID: Record<string, string> = {
  'Anaesthesia':  'THR',
  'Emergency':    'EMG',
  'Front Office': 'ADM',
  'HDU/ICU':      'HDU',
  'Imaging':      'IMG',
  'Laboratory':   'LAB',
  'Maintenance':  'MNT',
  'Medicine':     'MED',
  'Pharmacy':     'PHM',
  'Specialist':   'SPE',
  'Theatre':      'THR',
  'Ward':         'WRD',
}

const MONTH_NAME_TO_NUM: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

// rotaData shift code → local shiftType
const SHIFT_CODE_MAP: Record<string, string> = {
  'M':   'MORNING',
  'A':   'AFTERNOON',
  'N':   'NIGHT',
  'D':   'DAY',
  'L':   'ANNUAL_LEAVE',
  'O':   'OFF',
  'AL':  'ANNUAL_LEAVE',
  'ML':  'MATERNITY_LEAVE',
  'PL':  'ANNUAL_LEAVE',
  'T':   'DAY',
  'P':   'DAY',
  'L/B': 'ANNUAL_LEAVE',
  'N/B': 'NIGHT',
  'D/B': 'DAY',
  'W':   'DAY',
  'F':   'OFF',
  'HR':  'OFF',
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export interface MockRosterSlot {
  id: string
  employeeId: string
  date: string
  shiftType: string
  isEmergency: boolean
  employee: { name: string; expectedMonthlyHours: number; departmentId: string }
}

export interface MockRoster {
  id: string
  status: string
  departmentId: string
  month: number
  year: number
  slots: MockRosterSlot[]
}

export function getMockRosters(month: number, year: number): MockRoster[] {
  // rotaData only covers 2026 Jan–Mar
  const monthKey = Object.entries(MONTH_NAME_TO_NUM).find(([, n]) => n === month)?.[0]
  if (!monthKey) return []

  const rosters: MockRoster[] = []

  for (const [deptName, deptData] of Object.entries(ROTA_DATA)) {
    const deptId = DEPT_NAME_TO_ID[deptName]
    if (!deptId) continue

    const staffList = deptData.months[monthKey]
    if (!staffList || staffList.length === 0) continue

    const slots: MockRosterSlot[] = []

    for (const staff of staffList) {
      // Skip legend/section rows (names that are just numbers or very short)
      const cleanName = staff.name.replace(/\s*\(LOCUM\)/i, '').trim()
      if (!cleanName || /^\d+$/.test(cleanName)) continue

      const employeeId = `mock-${cleanName.toLowerCase().replace(/\s+/g, '-')}`
      const isLocum = /LOCUM/i.test(staff.name)

      for (const [dayStr, shiftCode] of Object.entries(staff.schedule)) {
        const day = parseInt(dayStr)
        if (isNaN(day) || day < 1 || day > 31) continue

        const shiftType = SHIFT_CODE_MAP[shiftCode] ?? 'DAY'
        if (shiftType === 'OFF') continue // skip off days for cleaner output

        const dateStr = `${year}-${pad2(month)}-${pad2(day)}`

        slots.push({
          id: `mock-slot-${deptId}-${employeeId}-${dateStr}`,
          employeeId,
          date: dateStr,
          shiftType,
          isEmergency: false,
          employee: {
            name: isLocum ? `${cleanName} (Locum)` : cleanName,
            expectedMonthlyHours: 160,
            departmentId: deptId,
          },
        })
      }
    }

    if (slots.length === 0) continue

    rosters.push({
      id: `mock-roster-${deptId}-${month}-${year}`,
      status: 'PUBLISHED',
      departmentId: deptId,
      month,
      year,
      slots,
    })
  }

  return rosters
}
