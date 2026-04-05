// Shift rules per department — restricts which shifts can be assigned
// Doctors: DAY, NIGHT, LATE, ON_CALL only (no MORNING/AFTERNOON/PM_SHIFT)
// Pharmacy/Admin/Imaging: day-only (MORNING, AFTERNOON, DAY, PM_SHIFT)
// Nursing/Emergency/HDU/Theatre/Ward: all shifts

export const WORK_SHIFTS = ['MORNING', 'AFTERNOON', 'DAY', 'PM_SHIFT', 'NIGHT', 'LATE', 'ON_CALL'] as const
export const LEAVE_SHIFTS = ['OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'] as const
export const ALL_SHIFT_TYPES = [...WORK_SHIFTS, ...LEAVE_SHIFTS] as const

// Shift rules by department code
export const DEPT_ALLOWED_SHIFTS: Record<string, string[]> = {
  MED: ['DAY', 'NIGHT', 'LATE', 'ON_CALL', 'OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'],
  SPE: ['DAY', 'NIGHT', 'LATE', 'ON_CALL', 'OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'],
  PHM: ['MORNING', 'AFTERNOON', 'DAY', 'PM_SHIFT', 'OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'],
  ADM: ['MORNING', 'AFTERNOON', 'DAY', 'PM_SHIFT', 'OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'],
  AHT: ['MORNING', 'AFTERNOON', 'DAY', 'PM_SHIFT', 'OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'],
  IMG: ['MORNING', 'AFTERNOON', 'DAY', 'PM_SHIFT', 'OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'],
  MNT: ['MORNING', 'AFTERNOON', 'DAY', 'PM_SHIFT', 'OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'],
  LAB: ['MORNING', 'AFTERNOON', 'DAY', 'PM_SHIFT', 'OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'],
  // Full rotation depts — all shifts
  NUR: ALL_SHIFT_TYPES as unknown as string[],
  EMG: ALL_SHIFT_TYPES as unknown as string[],
  HDU: ALL_SHIFT_TYPES as unknown as string[],
  THR: ALL_SHIFT_TYPES as unknown as string[],
  WRD: ALL_SHIFT_TYPES as unknown as string[],
  AUX: ALL_SHIFT_TYPES as unknown as string[],
}

export function getAllowedShifts(deptCode?: string): string[] {
  if (!deptCode) return [...ALL_SHIFT_TYPES]
  return DEPT_ALLOWED_SHIFTS[deptCode] ?? [...ALL_SHIFT_TYPES]
}

// Human-readable rule explanation per dept
export const SHIFT_RULE_LABELS: Record<string, string> = {
  MED: 'Doctors: Day, Night, Late, On-Call only',
  SPE: 'Specialists: Day, Night, Late, On-Call only',
  PHM: 'Pharmacy: Day shifts only (M/A/D/P)',
  ADM: 'Admin: Day shifts only (M/A/D/P)',
  AHT: 'Allied Health: Day shifts only',
  IMG: 'Imaging: Day shifts only',
  MNT: 'Maintenance: Day shifts only',
  LAB: 'Laboratory: Day shifts only',
}
