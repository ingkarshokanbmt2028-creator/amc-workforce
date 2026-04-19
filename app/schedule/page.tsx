'use client'

import { useState, useEffect, useMemo } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Department { id: string; name: string; code: string }
interface Employee {
  id: string; name: string; staffId: string; departmentId: string
  position: string; employeeType: string
}
interface RosterSlot {
  employeeId: string; date: string; shiftType: string
  startTime?: string; endTime?: string; plannedHours?: number
}
interface Roster { departmentId: string; slots: RosterSlot[] }
interface AttRecord {
  employeeId: string; clockIn?: string | null; clockOut?: string | null
  totalHours?: number; lateMinutes?: number; status: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const SHIFT_COLORS: Record<string, string> = {
  MORNING:        'bg-amber-500/15 text-amber-300 border-amber-500/20',
  AFTERNOON:      'bg-orange-500/15 text-orange-300 border-orange-500/20',
  DAY:            'bg-sky-500/15 text-sky-300 border-sky-500/20',
  PM_SHIFT:       'bg-purple-500/15 text-purple-300 border-purple-500/20',
  NIGHT:          'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  LATE:           'bg-rose-500/15 text-rose-300 border-rose-500/20',
  ON_CALL:        'bg-teal-500/15 text-teal-300 border-teal-500/20',
  OFF:            'bg-white/5 text-white/30 border-white/10',
  ANNUAL_LEAVE:   'bg-green-500/15 text-green-300 border-green-500/20',
  MATERNITY_LEAVE:'bg-pink-500/15 text-pink-300 border-pink-500/20',
  SICK_LEAVE:     'bg-red-500/15 text-red-300 border-red-500/20',
}

const SHIFT_LABEL: Record<string, string> = {
  MORNING: 'Morning', AFTERNOON: 'Afternoon', DAY: 'Day', PM_SHIFT: 'PM Shift',
  NIGHT: 'Night', LATE: 'Late', ON_CALL: 'On Call', OFF: 'Off',
  ANNUAL_LEAVE: 'Annual Leave', MATERNITY_LEAVE: 'Maternity', SICK_LEAVE: 'Sick Leave',
}

function fmt12(t?: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

type RowStatus = 'on_time' | 'late' | 'no_show' | 'off' | 'on_leave' | 'no_record' | 'partial'

function rowStatus(slot: RosterSlot | undefined, rec: AttRecord | undefined): RowStatus {
  if (!slot) return 'no_record'
  if (slot.shiftType === 'OFF') return 'off'
  if (slot.shiftType === 'ANNUAL_LEAVE' || slot.shiftType === 'MATERNITY_LEAVE' || slot.shiftType === 'SICK_LEAVE') return 'on_leave'
  if (!rec || (!rec.clockIn && !rec.clockOut)) return 'no_show'
  if (rec.clockIn && !rec.clockOut) return 'partial'
  if (rec.lateMinutes && rec.lateMinutes > 0) return 'late'
  return 'on_time'
}

const STATUS_BADGE: Record<RowStatus, string> = {
  on_time:   'bg-green-500/10 text-green-400 border-green-500/20',
  late:      'bg-amber-500/10 text-amber-300 border-amber-500/20',
  no_show:   'bg-red-500/10 text-red-400 border-red-500/20',
  off:       'bg-white/5 text-white/20 border-white/10',
  on_leave:  'bg-blue-500/10 text-blue-300 border-blue-500/20',
  no_record: 'bg-white/5 text-white/30 border-white/10',
  partial:   'bg-orange-500/10 text-orange-300 border-orange-500/20',
}

const STATUS_LABEL: Record<RowStatus, string> = {
  on_time:   '✓ On Time',
  late:      'Late',
  no_show:   '✗ No Show',
  off:       'Off',
  on_leave:  'On Leave',
  no_record: '— No Record',
  partial:   'Partial',
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const now = new Date()
  const [date, setDate] = useState(now.toISOString().slice(0, 10))
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [rosters, setRosters] = useState<Roster[]>([])
  const [records, setRecords] = useState<AttRecord[]>([])
  const [activeDept, setActiveDept] = useState('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RowStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  const month = parseInt(date.slice(5, 7))
  const year  = parseInt(date.slice(0, 4))

  // Load departments + employees once
  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]).then(([depts, emps]: [Department[], Employee[]]) => {
      setDepartments(depts)
      setEmployees(emps)
    })
  }, [])

  // Load roster + attendance whenever date changes
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/roster?month=${month}&year=${year}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/attendance?date=${date}`).then(r => r.ok ? r.json() : { attendance: [] }),
    ]).then(([rosterData, attData]: [Roster[], { attendance: AttRecord[] }]) => {
      setRosters(rosterData)
      setRecords(attData.attendance ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [date, month, year])

  // Build lookup maps
  const slotByEmp = useMemo(() => {
    const map = new Map<string, RosterSlot>()
    for (const roster of rosters) {
      for (const slot of roster.slots) {
        if (slot.date.slice(0, 10) === date) {
          map.set(slot.employeeId, slot)
        }
      }
    }
    return map
  }, [rosters, date])

  const recByEmp = useMemo(() => new Map(records.map(r => [r.employeeId, r])), [records])

  // Filter employees
  const filtered = useMemo(() => {
    let emps = activeDept === 'all' ? employees : employees.filter(e => e.departmentId === activeDept)

    if (search.trim()) {
      const q = search.toLowerCase()
      emps = emps.filter(e => e.name.toLowerCase().includes(q) || e.staffId.toLowerCase().includes(q))
    }

    if (statusFilter !== 'all') {
      emps = emps.filter(e => rowStatus(slotByEmp.get(e.id), recByEmp.get(e.id)) === statusFilter)
    }

    return emps
  }, [employees, activeDept, search, statusFilter, slotByEmp, recByEmp])

  const deptById = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments])

  // Summary counts
  const summary = useMemo(() => {
    const emps = activeDept === 'all' ? employees : employees.filter(e => e.departmentId === activeDept)
    const counts = { on_time: 0, late: 0, no_show: 0, partial: 0, off: 0, on_leave: 0, no_record: 0 }
    for (const e of emps) {
      const s = rowStatus(slotByEmp.get(e.id), recByEmp.get(e.id))
      counts[s]++
    }
    return counts
  }, [employees, activeDept, slotByEmp, recByEmp])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule Overview</h1>
          <p className="text-sm text-white/40 mt-0.5">Roster vs actual attendance · {date}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {([
          { key: 'on_time',   label: 'On Time',   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
          { key: 'late',      label: 'Late',       color: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
          { key: 'no_show',   label: 'No Show',    color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
          { key: 'partial',   label: 'Partial',    color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { key: 'on_leave',  label: 'On Leave',   color: 'text-blue-300',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
          { key: 'off',       label: 'Off',        color: 'text-white/30',   bg: 'bg-white/5',       border: 'border-white/10'      },
        ] as { key: RowStatus; label: string; color: string; bg: string; border: string }[]).map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(prev => prev === s.key ? 'all' : s.key)}
            className={`rounded-xl border ${s.border} ${s.bg} p-3 text-left transition-all hover:brightness-110 ${statusFilter === s.key ? 'ring-1 ring-white/20' : ''}`}
          >
            <p className="text-xs text-white/40">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{summary[s.key]}</p>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={activeDept}
          onChange={e => setActiveDept(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/20 min-w-[200px]"
        >
          <option value="all">All Departments · {employees.length}</option>
          {departments.map(d => {
            const count = employees.filter(e => e.departmentId === d.id).length
            return <option key={d.id} value={d.id}>{d.name} · {count}</option>
          })}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or staff ID…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>

        {statusFilter !== 'all' && (
          <button
            onClick={() => setStatusFilter('all')}
            className="px-3 py-2 rounded-lg text-xs text-white/50 border border-white/10 hover:text-white/80 transition-colors"
          >
            Clear filter ✕
          </button>
        )}
      </div>

      <p className="text-xs text-white/30">{filtered.length} employees</p>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-white/30 text-sm">Loading…</div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_120px_120px_80px_100px] gap-x-4 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-white/30">
            <span>Employee</span>
            <span>Scheduled Shift</span>
            <span>Clock In</span>
            <span>Clock Out</span>
            <span>Hours</span>
            <span>Status</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-sm">No employees match your filters</div>
            ) : filtered.map(emp => {
              const slot = slotByEmp.get(emp.id)
              const rec  = recByEmp.get(emp.id)
              const st   = rowStatus(slot, rec)
              const dept = deptById.get(emp.departmentId)
              const hours = rec ? Math.max(0, rec.totalHours ?? 0) : 0

              return (
                <div
                  key={emp.id}
                  className="grid grid-cols-[1fr_140px_120px_120px_80px_100px] gap-x-4 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50 flex-shrink-0">
                      {emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{emp.name}</p>
                      <p className="text-xs text-white/30 truncate">{emp.staffId} · {dept?.code ?? emp.departmentId.slice(0, 3)}</p>
                    </div>
                  </div>

                  {/* Scheduled shift */}
                  <div>
                    {slot ? (
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${SHIFT_COLORS[slot.shiftType] ?? 'bg-white/5 text-white/30 border-white/10'}`}>
                          {SHIFT_LABEL[slot.shiftType] ?? slot.shiftType}
                        </span>
                        {slot.startTime && (
                          <p className="text-[10px] text-white/30 mt-0.5">{fmt12(slot.startTime)} – {fmt12(slot.endTime)}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-white/20">Not rostered</span>
                    )}
                  </div>

                  {/* Clock in */}
                  <div>
                    <p className={`text-sm font-mono font-semibold ${rec?.clockIn ? 'text-green-400' : 'text-white/20'}`}>
                      {rec ? fmtTime(rec.clockIn) : '—'}
                    </p>
                    {rec?.lateMinutes && rec.lateMinutes > 0 ? (
                      <p className="text-[10px] text-amber-400/70">{rec.lateMinutes}m late</p>
                    ) : null}
                  </div>

                  {/* Clock out */}
                  <div>
                    <p className={`text-sm font-mono font-semibold ${rec?.clockOut ? 'text-white/60' : rec?.clockIn ? 'text-red-400/60' : 'text-white/20'}`}>
                      {rec ? fmtTime(rec.clockOut) : '—'}
                    </p>
                  </div>

                  {/* Hours */}
                  <div>
                    <p className={`text-sm font-semibold ${hours > 9 ? 'text-violet-400' : hours > 0 ? 'text-white/60' : 'text-white/20'}`}>
                      {hours > 0 ? `${hours.toFixed(1)}h` : '—'}
                    </p>
                    {slot?.plannedHours && hours > 0 ? (
                      <p className="text-[10px] text-white/20">of {slot.plannedHours}h</p>
                    ) : null}
                  </div>

                  {/* Status */}
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_BADGE[st]}`}>
                      {STATUS_LABEL[st]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
