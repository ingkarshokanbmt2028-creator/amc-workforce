'use client'

import { useState } from 'react'
import { SHIFT_COLORS, SHIFT_LABELS, SHIFT_TIMES, SHIFT_HOURS } from '@/lib/shifts'
import { getAllowedShifts, SHIFT_RULE_LABELS } from '@/lib/shiftRules'

function fmt12(t?: string) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

interface ShiftModalProps {
  open: boolean
  employeeName: string
  date: string
  currentShift: string | null
  deptCode?: string
  onClose: () => void
  onSave: (shiftType: string) => Promise<void>
}

export function ShiftModal({
  open, employeeName, date, currentShift, deptCode, onClose, onSave,
}: ShiftModalProps) {
  const [selected, setSelected] = useState(currentShift ?? '')
  const [saving, setSaving] = useState(false)

  const allowed = getAllowedShifts(deptCode)
  const ruleLabel = deptCode ? SHIFT_RULE_LABELS[deptCode] : null

  const GROUPS = [
    { label: 'Work Shifts', shifts: ['MORNING', 'AFTERNOON', 'DAY', 'PM_SHIFT', 'NIGHT', 'LATE', 'ON_CALL'] },
    { label: 'Leave & Off', shifts: ['OFF', 'ANNUAL_LEAVE', 'MATERNITY_LEAVE', 'SICK_LEAVE'] },
  ]

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    await onSave(selected)
    setSaving(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-white text-base leading-tight">Assign Shift</p>
              <p className="text-xs text-white/40 mt-1">
                <span className="text-white/70 font-medium">{employeeName}</span>
                {' · '}
                {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {ruleLabel && (
            <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-[10px] text-amber-300">{ruleLabel}</span>
            </div>
          )}
        </div>

        {/* Shift grid */}
        <div className="px-5 py-4 space-y-4">
          {GROUPS.map(group => {
            const groupShifts = group.shifts.filter(s => allowed.includes(s))
            if (groupShifts.length === 0) return null
            return (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">{group.label}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {groupShifts.map(shift => {
                    const times = SHIFT_TIMES[shift]
                    const hours = SHIFT_HOURS[shift]
                    const colorCls = SHIFT_COLORS[shift] ?? 'bg-slate-500/20 text-slate-300'
                    const isSelected = selected === shift
                    return (
                      <button
                        key={shift}
                        onClick={() => setSelected(shift)}
                        className={`relative text-left rounded-xl px-3 py-2.5 border transition-all ${
                          isSelected
                            ? 'ring-2 ring-white/30 border-white/20 bg-white/10'
                            : 'border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center w-7 h-6 rounded text-[11px] font-black ${colorCls}`}>
                            {SHIFT_LABELS[shift]}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white leading-tight truncate">{shift.replace(/_/g, ' ')}</p>
                            {times
                              ? <p className="text-[9px] text-white/30 leading-tight">{fmt12(times.start)} – {fmt12(times.end)}</p>
                              : <p className="text-[9px] text-white/30">—</p>
                            }
                          </div>
                        </div>
                        {hours != null && hours > 0 && (
                          <span className="absolute top-1.5 right-2 text-[9px] text-white/30 font-semibold">{hours}h</span>
                        )}
                        {isSelected && (
                          <span className="absolute bottom-1.5 right-2">
                            <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 transition-all"
          >
            {saving ? 'Saving…' : 'Save Shift'}
          </button>
        </div>
      </div>
    </div>
  )
}
