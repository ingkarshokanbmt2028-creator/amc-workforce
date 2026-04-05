export const SHIFT_CODES: Record<string, string> = {
  M: 'MORNING',
  A: 'AFTERNOON',
  D: 'DAY',
  N: 'NIGHT',
  L: 'LATE',
  P: 'PM_SHIFT',
  O: 'OFF',
  AL: 'ANNUAL_LEAVE',
  ML: 'MATERNITY_LEAVE',
  SL: 'SICK_LEAVE',
  'A/N': 'NIGHT',
  'L/N': 'NIGHT',
  'L/B': 'OFF',
  'LB': 'OFF',
  'N/B': 'NIGHT',       // Night/Break — 12hr night with break
  'W': 'DAY',           // Ward duty
  'F': 'DAY',           // Floating assignment
  'V': 'DAY',           // VIP ward
  'T': 'DAY',           // Training
  'SUSPENSION': 'OFF',  // Disciplinary suspension
  'SUS': 'OFF',
  'PL': 'ANNUAL_LEAVE', // Paternity/Personal leave
}

export const SHIFT_HOURS: Record<string, number> = {
  MORNING: 8,
  AFTERNOON: 8,
  DAY: 8,
  PM_SHIFT: 8,
  NIGHT: 12,
  LATE: 12,
  ON_CALL: 8,
  OFF: 0,
  ANNUAL_LEAVE: 0,
  MATERNITY_LEAVE: 0,
  SICK_LEAVE: 0,
}

export const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
  MORNING: { start: '07:00', end: '15:00' },
  AFTERNOON: { start: '15:00', end: '23:00' },
  DAY: { start: '08:00', end: '16:00' },
  PM_SHIFT: { start: '13:00', end: '21:00' },
  NIGHT: { start: '19:00', end: '07:00' },
  LATE: { start: '20:00', end: '08:00' },
  ON_CALL: { start: '00:00', end: '00:00' },
}

export const SHIFT_COLORS: Record<string, string> = {
  MORNING: 'bg-blue-100 text-blue-800',
  AFTERNOON: 'bg-sky-100 text-sky-800',
  DAY: 'bg-blue-200 text-blue-900',
  NIGHT: 'bg-indigo-700 text-white',
  LATE: 'bg-violet-600 text-white',
  PM_SHIFT: 'bg-cyan-100 text-cyan-800',
  ON_CALL: 'bg-orange-100 text-orange-800',
  OFF: 'bg-slate-100 text-slate-400',
  ANNUAL_LEAVE: 'bg-yellow-100 text-yellow-800',
  MATERNITY_LEAVE: 'bg-pink-100 text-pink-800',
  SICK_LEAVE: 'bg-red-100 text-red-700',
}

export const SHIFT_LABELS: Record<string, string> = {
  MORNING: 'M',
  AFTERNOON: 'A',
  DAY: 'D',
  NIGHT: 'N',
  LATE: 'L',
  PM_SHIFT: 'P',
  ON_CALL: 'OC',
  OFF: 'O',
  ANNUAL_LEAVE: 'AL',
  MATERNITY_LEAVE: 'ML',
  SICK_LEAVE: 'SL',
}

export const LEAVE_TYPES = new Set(['OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'])

export function isLeave(shiftType: string): boolean {
  return LEAVE_TYPES.has(shiftType)
}
