'use client'

import { SHIFT_COLORS, SHIFT_LABELS } from '@/lib/shifts'

interface ShiftCellProps {
  shiftType: string | null
  isEmergency?: boolean
  onClick?: () => void
}

export function ShiftCell({ shiftType, isEmergency, onClick }: ShiftCellProps) {
  const colorClass = shiftType ? (SHIFT_COLORS[shiftType] ?? 'bg-slate-100 text-slate-400') : 'bg-white'
  const label = shiftType ? (SHIFT_LABELS[shiftType] ?? shiftType) : '—'

  return (
    <button
      onClick={onClick}
      className={`
        w-full h-8 rounded text-xs font-semibold transition-opacity hover:opacity-80
        ${colorClass}
        ${isEmergency ? 'ring-2 ring-red-500' : ''}
      `}
      title={shiftType ?? 'Unassigned'}
    >
      {label}
    </button>
  )
}
