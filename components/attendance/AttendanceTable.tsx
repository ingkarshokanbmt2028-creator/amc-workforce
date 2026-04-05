'use client'

import { useState } from 'react'
import { StatusBadge } from './StatusBadge'
import { OverrideModal } from './OverrideModal'

interface Department { id: string; name: string; code: string }
interface Employee { id: string; name: string; department: Department }
interface AttendanceRecord {
  id: string
  employee: Employee
  date: string
  clockIn: string | null
  clockOut: string | null
  totalHours: number | null
  scheduledIn: string | null
  scheduledOut: string | null
  lateMinutes: number | null
  status: string
  isManualOverride: boolean
}

interface AttendanceTableProps {
  records: AttendanceRecord[]
  onOverride: (id: string, status: string, reason: string) => Promise<void>
}

function fmt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function AttendanceTable({ records, onOverride }: AttendanceTableProps) {
  const [selected, setSelected] = useState<AttendanceRecord | null>(null)

  return (
    <>
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Dept</th>
              <th className="px-4 py-3 text-center font-semibold">Sched In</th>
              <th className="px-4 py-3 text-center font-semibold">Clock In</th>
              <th className="px-4 py-3 text-center font-semibold">Clock Out</th>
              <th className="px-4 py-3 text-center font-semibold">Hours</th>
              <th className="px-4 py-3 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  No attendance records for this date.
                </td>
              </tr>
            )}
            {records.map((rec) => (
              <tr
                key={rec.id}
                className="border-t border-border hover:bg-muted/30 cursor-pointer"
                onClick={() => setSelected(rec)}
              >
                <td className="px-4 py-3 font-medium">
                  {rec.employee.name}
                  {rec.isManualOverride && (
                    <span className="ml-1 text-xs text-muted-foreground">(override)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {rec.employee.department?.code ?? '—'}
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {rec.scheduledIn ?? '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={rec.lateMinutes ? 'text-amber-600 font-medium' : ''}>
                    {fmt(rec.clockIn)}
                  </span>
                  {rec.lateMinutes ? (
                    <span className="ml-1 text-xs text-amber-500">+{rec.lateMinutes}m</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-center">{fmt(rec.clockOut)}</td>
                <td className="px-4 py-3 text-center">
                  {rec.totalHours != null ? rec.totalHours.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={rec.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <OverrideModal
          open
          record={selected}
          onClose={() => setSelected(null)}
          onSave={(status, reason) => onOverride(selected.id, status, reason)}
        />
      )}
    </>
  )
}
