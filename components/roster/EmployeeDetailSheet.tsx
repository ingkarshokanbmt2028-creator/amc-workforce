'use client'

import { useState, useEffect } from 'react'
import { SHIFT_COLORS, SHIFT_LABELS, SHIFT_HOURS } from '@/lib/shifts'

interface Employee {
  id: string; name: string; staffId: string
  departmentId: string; department?: { name: string; code: string }
  position: string; employeeType: string; location?: string; status: string
  expectedMonthlyHours?: number
}

interface AttRecord {
  id: string; date: string; status: string
  clockIn?: string | null; clockOut?: string | null
  totalHours?: number; lateMinutes?: number
  isManualOverride?: boolean
}

interface SlotRecord {
  date: string; shiftType: string; plannedHours: number
}

interface Props {
  employee: Employee | null
  month: number; year: number
  onClose: () => void
  onAttendanceOverride?: () => void
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'text-green-400',
  LATE: 'text-amber-400',
  ABSENT: 'text-red-400',
  ON_LEAVE: 'text-blue-400',
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function EmployeeDetailSheet({ employee, month, year, onClose, onAttendanceOverride }: Props) {
  const [attendance, setAttendance] = useState<AttRecord[]>([])
  const [slots, setSlots] = useState<SlotRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [overriding, setOverriding] = useState<string | null>(null) // attendanceId being overridden
  const [overrideStatus, setOverrideStatus] = useState('')

  const MONTHLY_TARGET = employee?.expectedMonthlyHours ?? 180

  useEffect(() => {
    if (!employee) return
    setLoading(true)
    Promise.all([
      fetch(`/api/attendance?month=${month}&year=${year}&limit=500`).then(r => r.json()),
      fetch(`/api/roster?month=${month}&year=${year}`).then(r => r.json()),
    ]).then(([attData, rosterData]) => {
      const allAtt: any[] = attData.attendance ?? []
      const empAtt = allAtt.filter((a: any) => a.employeeId === employee.id)
      setAttendance(empAtt.map((a: any) => ({
        id: a.id,
        date: typeof a.date === 'string' ? a.date.slice(0, 10) : new Date(a.date).toISOString().slice(0, 10),
        status: a.status,
        clockIn: a.clockIn,
        clockOut: a.clockOut,
        totalHours: a.totalHours,
        lateMinutes: a.lateMinutes,
        isManualOverride: a.isManualOverride,
      })))

      const rosters: any[] = Array.isArray(rosterData) ? rosterData : []
      const empSlots: SlotRecord[] = rosters.flatMap((r: any) => r.slots ?? [])
        .filter((s: any) => s.employeeId === employee.id)
        .map((s: any) => ({
          date: typeof s.date === 'string' ? s.date.slice(0, 10) : new Date(s.date).toISOString().slice(0, 10),
          shiftType: s.shiftType,
          plannedHours: s.plannedHours ?? 0,
        }))
      setSlots(empSlots)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [employee, month, year])

  async function handleOverride(attId: string) {
    if (!overrideStatus) return
    await fetch(`/api/attendance/${attId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: overrideStatus, isManualOverride: true, overrideBy: 'admin', overrideReason: 'Manual override by admin' }),
    })
    setAttendance(prev => prev.map(a => a.id === attId ? { ...a, status: overrideStatus, isManualOverride: true } : a))
    setOverriding(null)
    setOverrideStatus('')
    onAttendanceOverride?.()
  }

  if (!employee) return null

  const presentDays   = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
  const absentDays    = attendance.filter(a => a.status === 'ABSENT').length
  const leaveDays     = attendance.filter(a => a.status === 'ON_LEAVE').length
  const lateDays      = attendance.filter(a => a.status === 'LATE').length
  const totalDays     = attendance.length
  const totalHours    = attendance.reduce((s, a) => s + (a.totalHours ?? 0), 0)
  const attRate       = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
  const hoursPercent  = Math.min(100, (totalHours / MONTHLY_TARGET) * 100)

  // Overtime days
  const slotByDate = new Map(slots.map(s => [s.date, s]))
  const overtimeDays = attendance.filter(a => {
    const slot = slotByDate.get(a.date)
    const planned = slot ? slot.plannedHours : 8
    return (a.totalHours ?? 0) > planned
  }).length

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full sm:max-w-md bg-[#0f1117] border-l border-white/[0.06] flex flex-col h-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-5 border-b border-white/[0.06] shrink-0">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-white/70 flex-shrink-0">
            {employee.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-white text-lg leading-tight">{employee.name}</h2>
            <p className="text-sm text-white/50 mt-0.5">{employee.position || 'Staff'} · {employee.department?.name ?? '—'}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/60">{employee.staffId}</span>
              {employee.employeeType === 'LOCUM' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">LOCUM</span>
              )}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${employee.status === 'ACTIVE' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                {employee.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {loading ? (
            <div className="py-16 text-center text-white/30 text-sm">Loading…</div>
          ) : (
            <div className="space-y-6 pt-5">

              {/* Attendance summary */}
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">
                  Attendance · {new Date(year, month - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
                </p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Days',     value: totalDays,   color: 'text-white' },
                    { label: 'Present',  value: presentDays, color: 'text-green-400' },
                    { label: 'Absent',   value: absentDays,  color: absentDays > 0 ? 'text-red-400' : 'text-white/40' },
                    { label: 'Leave',    value: leaveDays,   color: 'text-blue-400' },
                    { label: 'Late',     value: lateDays,    color: lateDays > 0 ? 'text-amber-400' : 'text-white/40' },
                    { label: 'Rate',     value: `${attRate}%`, color: attRate >= 90 ? 'text-green-400' : attRate >= 75 ? 'text-amber-400' : 'text-red-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Hours progress bar */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">Monthly Hours</span>
                    <span className="text-white/40">{totalHours.toFixed(1)}h / {MONTHLY_TARGET}h target</span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${hoursPercent}%`, backgroundColor: hoursPercent >= 100 ? '#22c55e' : hoursPercent >= 75 ? '#f59e0b' : '#ef4444' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-white/30">
                    <span>{hoursPercent >= 100 ? '✓ Target reached' : `${(MONTHLY_TARGET - totalHours).toFixed(1)}h remaining`}</span>
                    {overtimeDays > 0 && <span className="text-amber-400">{overtimeDays} overtime days</span>}
                  </div>
                </div>
              </section>

              {/* Shift schedule */}
              {slots.length > 0 && (
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">Scheduled Shifts</p>
                  <div className="flex flex-wrap gap-1.5">
                    {slots.slice(0, 31).map(s => {
                      const color = SHIFT_COLORS[s.shiftType] ?? 'bg-slate-500/20 text-slate-300'
                      return (
                        <span key={s.date} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${color}`} title={s.date}>
                          {new Date(s.date + 'T12:00:00').getDate()}
                          <span className="opacity-70">{SHIFT_LABELS[s.shiftType] ?? s.shiftType}</span>
                        </span>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Attendance log */}
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">Attendance Log</p>
                {attendance.length === 0 ? (
                  <p className="text-sm text-white/30 py-4 text-center">No attendance records this month</p>
                ) : (
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                          <th className="text-left px-3 py-2 text-white/40 font-semibold">Date</th>
                          <th className="text-left px-3 py-2 text-white/40 font-semibold">In</th>
                          <th className="text-left px-3 py-2 text-white/40 font-semibold">Out</th>
                          <th className="text-right px-3 py-2 text-white/40 font-semibold">Hrs</th>
                          <th className="text-left px-3 py-2 text-white/40 font-semibold">Status</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map(a => (
                          <tr key={a.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                            <td className="px-3 py-2 text-white/60">{fmtDate(a.date)}</td>
                            <td className={`px-3 py-2 font-mono ${a.clockIn ? 'text-green-400/80' : 'text-white/20'}`}>
                              {fmtTime(a.clockIn)}
                            </td>
                            <td className={`px-3 py-2 font-mono ${a.clockOut ? 'text-white/60' : 'text-red-400/60'}`}>
                              {fmtTime(a.clockOut)}
                            </td>
                            <td className="px-3 py-2 text-right text-white/50">
                              {a.totalHours ? `${a.totalHours.toFixed(1)}h` : '—'}
                            </td>
                            <td className="px-3 py-2">
                              {overriding === a.id ? (
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={overrideStatus}
                                    onChange={e => setOverrideStatus(e.target.value)}
                                    className="text-[10px] bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-white focus:outline-none"
                                  >
                                    <option value="">Select…</option>
                                    <option value="PRESENT">PRESENT</option>
                                    <option value="ABSENT">ABSENT</option>
                                    <option value="LATE">LATE</option>
                                    <option value="ON_LEAVE">ON LEAVE</option>
                                  </select>
                                  <button onClick={() => handleOverride(a.id)} disabled={!overrideStatus} className="text-[10px] px-2 py-0.5 rounded bg-white text-black font-bold disabled:opacity-40">✓</button>
                                  <button onClick={() => { setOverriding(null); setOverrideStatus('') }} className="text-[10px] text-white/40 hover:text-white/70">✕</button>
                                </div>
                              ) : (
                                <span className={`font-semibold ${STATUS_COLORS[a.status] ?? 'text-white/40'}`}>
                                  {a.status.replace('_', ' ')}
                                  {a.isManualOverride && <span className="ml-1 text-[9px] text-amber-400/70">edited</span>}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {overriding !== a.id && (
                                <button
                                  onClick={() => { setOverriding(a.id); setOverrideStatus(a.status) }}
                                  className="text-white/20 hover:text-white/60 transition-colors"
                                  title="Override attendance"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
