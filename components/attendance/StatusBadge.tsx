import { Badge } from '@/components/ui/badge'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PRESENT:          { label: 'Present',        className: 'bg-green-100 text-green-800' },
  LATE:             { label: 'Late',            className: 'bg-amber-100 text-amber-800' },
  ABSENT:           { label: 'Absent',          className: 'bg-red-100 text-red-800' },
  EARLY_DEPARTURE:  { label: 'Early Out',       className: 'bg-orange-100 text-orange-800' },
  PARTIAL:          { label: 'Partial',         className: 'bg-orange-100 text-orange-800' },
  ON_LEAVE:         { label: 'On Leave',        className: 'bg-blue-100 text-blue-800' },
}

// Heatmap cell color for weekly view
export const STATUS_HEAT: Record<string, string> = {
  PRESENT:         'bg-green-200',
  LATE:            'bg-amber-200',
  ABSENT:          'bg-red-300',
  EARLY_DEPARTURE: 'bg-orange-200',
  PARTIAL:         'bg-orange-300',
  ON_LEAVE:        'bg-blue-200',
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
