'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { EmployeeDetailSheet } from '@/components/roster/EmployeeDetailSheet'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Department { id: string; name: string; code: string }
interface Employee {
  id: string; name: string; staffId: string; departmentId: string
  position: string; employeeType: string; status: string
  expectedMonthlyHours?: number; department?: { name: string; code: string }
}
interface AttRecord {
  id: string; employeeId: string; date: string; status: string
  clockIn?: string | null; clockOut?: string | null
  totalHours?: number; lateMinutes?: number; isManualOverride?: boolean
  employee?: { name: string; staffId: string; departmentId: string; department?: { name: string; code: string } }
}

type Filter = 'all' | 'missed_clock_in' | 'missed_clock_out' | 'missed_both' | 'overtime' | 'absent' | 'on_leave'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function lastSyncLabel(lastSync: string | null) {
  if (!lastSync) return 'Never synced'
  const diff = Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000)
  if (diff < 1) return 'Synced just now'
  if (diff < 60) return `Last synced ${diff} min ago`
  return `Last synced ${Math.floor(diff / 60)}h ago`
}

// ── Status badge (Osiyo pattern) ──────────────────────────────────────────────

function AttStatus({ rec }: { rec: AttRecord }) {
  const noIn  = !rec.clockIn
  const noOut = !rec.clockOut
  const isOT  = (rec.totalHours ?? 0) > 9

  if (rec.status === 'ABSENT')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Absent</span>
  if (rec.status === 'ON_LEAVE')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">On Leave</span>
  if (noIn && noOut)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-300 border border-red-500/20">⚠ Missed Both</span>
  if (noIn)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">No Clock-In</span>
  if (noOut)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">No Clock-Out</span>
  if (isOT)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">Overtime</span>
  if (rec.status === 'LATE')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-300 border border-orange-500/20">Late</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">✓ Present</span>
}

// ── Employee row (Osiyo pattern adapted) ─────────────────────────────────────

const SHIFT_BADGE: Record<string, string> = {
  MORNING:        'bg-amber-500/15 text-amber-300',
  AFTERNOON:      'bg-orange-500/15 text-orange-300',
  DAY:            'bg-sky-500/15 text-sky-300',
  PM_SHIFT:       'bg-purple-500/15 text-purple-300',
  NIGHT:          'bg-indigo-500/15 text-indigo-300',
  LATE:           'bg-rose-500/15 text-rose-300',
  ON_CALL:        'bg-teal-500/15 text-teal-300',
  OFF:            'bg-white/5 text-white/30',
  ANNUAL_LEAVE:   'bg-green-500/15 text-green-300',
  MATERNITY_LEAVE:'bg-pink-500/15 text-pink-300',
  SICK_LEAVE:     'bg-red-500/15 text-red-300',
}

const SHIFT_SHORT: Record<string, string> = {
  MORNING: 'MOR', AFTERNOON: 'AFT', DAY: 'DAY', PM_SHIFT: 'PMS',
  NIGHT: 'NGT', LATE: 'LTE', ON_CALL: 'ONC', OFF: 'OFF',
  ANNUAL_LEAVE: 'AL', MATERNITY_LEAVE: 'ML', SICK_LEAVE: 'SL',
}

function EmployeeRow({ emp, rec, scheduledShift, onClick }: { emp: Employee; rec: AttRecord | undefined; scheduledShift?: string; onClick: () => void }) {
  const hours = rec ? Math.max(0, rec.totalHours ?? 0) : 0

  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl border border-white/[0.06] px-4 py-3 flex items-center justify-between gap-4 hover:bg-white/[0.04] hover:border-white/10 transition-all text-left group"
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60 flex-shrink-0 group-hover:bg-white/15 transition-colors">
          {emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{emp.name}</p>
            {emp.employeeType === 'LOCUM' && (
              <span className="flex-shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">LOCUM</span>
            )}
          </div>
          <p className="text-xs text-white/40 truncate">{emp.staffId} · {emp.position || emp.department?.name}</p>
        </div>
      </div>

      {/* Clock in/out + scheduled shift */}
      <div className="hidden md:flex items-center gap-6 flex-shrink-0">
        {scheduledShift && (
          <div className="text-center min-w-[44px]">
            <p className="text-[10px] text-white/30">Roster</p>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${SHIFT_BADGE[scheduledShift] ?? 'bg-white/5 text-white/30'}`}>
              {SHIFT_SHORT[scheduledShift] ?? scheduledShift}
            </span>
          </div>
        )}
        <div className="text-center min-w-[56px]">
          <p className="text-[10px] text-white/30">Clock In</p>
          <p className={`text-xs font-mono font-semibold ${rec?.clockIn ? 'text-green-400' : 'text-white/20'}`}>
            {rec ? fmtTime(rec.clockIn) : '—'}
          </p>
        </div>
        <div className="text-center min-w-[56px]">
          <p className="text-[10px] text-white/30">Clock Out</p>
          <p className={`text-xs font-mono font-semibold ${rec?.clockOut ? 'text-white/60' : rec ? 'text-red-400/60' : 'text-white/20'}`}>
            {rec ? fmtTime(rec.clockOut) : '—'}
          </p>
        </div>
        <div className="text-center min-w-[40px]">
          <p className="text-[10px] text-white/30">Hours</p>
          <p className={`text-xs font-semibold ${hours > 9 ? 'text-violet-400' : hours > 0 ? 'text-white/70' : 'text-white/20'}`}>
            {hours > 0 ? `${hours.toFixed(1)}h` : '—'}
          </p>
        </div>
      </div>

      {/* Status + arrow */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {rec ? <AttStatus rec={rec} /> : <span className="text-[10px] text-white/20">No record</span>}
        <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const now = new Date()
  const [date, setDate] = useState(now.toISOString().slice(0, 10))
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [records, setRecords] = useState<AttRecord[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [activeDept, setActiveDept] = useState<string>('all')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [detailEmp, setDetailEmp] = useState<Employee | null>(null)
  const [visibleCount, setVisibleCount] = useState(20)
  const [rosterSlots, setRosterSlots] = useState<Record<string, string>>({}) // employeeId → shiftType

  const month = parseInt(date.slice(5, 7))
  const year  = parseInt(date.slice(0, 4))

  // Initial load
  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]).then(([depts, emps]: [Department[], Employee[]]) => {
      setDepartments(depts)
      setEmployees(emps)
    })
  }, [])

  const fetchAttendance = useCallback(async () => {
    const res = await fetch(`/api/attendance?date=${date}`)
    if (!res.ok) return
    const data = await res.json()
    setRecords(data.attendance ?? [])
    if (data.lastSync) setLastSync(data.lastSync.syncedAt)
  }, [date])

  useEffect(() => { fetchAttendance() }, [fetchAttendance])

  // Fetch roster slots for the current date to show scheduled shifts
  useEffect(() => {
    fetch(`/api/roster?month=${month}&year=${year}`)
      .then(r => r.ok ? r.json() : [])
      .then((rosters: { slots: { employeeId: string; date: string; shiftType: string }[] }[]) => {
        const map: Record<string, string> = {}
        for (const roster of rosters) {
          for (const slot of roster.slots) {
            if (slot.date.slice(0, 10) === date) {
              map[slot.employeeId] = slot.shiftType
            }
          }
        }
        setRosterSlots(map)
      })
      .catch(() => {})
  }, [date, month, year])

  async function handleSync() {
    setSyncing(true)
    await fetch('/api/attendance/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setSyncing(false)
    fetchAttendance()
  }

  // Record lookup by employeeId
  const recByEmp = useMemo(() => new Map(records.map(r => [r.employeeId, r])), [records])
  const deptById = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments])

  // Stats (Osiyo's StatsCards)
  const stats = useMemo(() => {
    const deptEmps = activeDept === 'all' ? employees : employees.filter(e => e.departmentId === activeDept)
    const deptRecs = deptEmps.map(e => recByEmp.get(e.id)).filter(Boolean) as AttRecord[]
    const missedIn  = deptRecs.filter(r => !r.clockIn && r.status !== 'ON_LEAVE').length
    const missedOut = deptRecs.filter(r => r.clockIn && !r.clockOut).length
    const totalHrs  = deptRecs.reduce((s, r) => s + Math.max(0, r.totalHours ?? 0), 0)
    const avgHrs    = deptRecs.length > 0 ? totalHrs / deptRecs.length : 0
    return { total: deptEmps.length, missedIn, missedOut, avgHrs }
  }, [employees, records, activeDept, recByEmp])

  // Filtered employees
  const filtered = useMemo(() => {
    let emps = activeDept === 'all' ? employees : employees.filter(e => e.departmentId === activeDept)

    if (search.trim()) {
      const q = search.toLowerCase()
      emps = emps.filter(e => e.name.toLowerCase().includes(q) || e.staffId.toLowerCase().includes(q))
    }

    emps = emps.filter(e => {
      const r = recByEmp.get(e.id)
      switch (filter) {
        case 'missed_clock_in':  return r && !r.clockIn && r.status !== 'ON_LEAVE'
        case 'missed_clock_out': return r && r.clockIn && !r.clockOut
        case 'missed_both':      return r && !r.clockIn && !r.clockOut && r.status !== 'ON_LEAVE'
        case 'overtime':         return r && (r.totalHours ?? 0) > 9
        case 'absent':           return r?.status === 'ABSENT' || !r
        case 'on_leave':         return r?.status === 'ON_LEAVE'
        default: return true
      }
    })

    return emps
  }, [employees, activeDept, filter, search, recByEmp])

  const FILTERS: { value: Filter; label: string; color: string }[] = [
    { value: 'all',            label: 'All',            color: '' },
    { value: 'missed_clock_in',label: 'Missed Clock-In',color: 'amber' },
    { value: 'missed_clock_out',label:'Missed Clock-Out',color: 'amber' },
    { value: 'missed_both',    label: 'Missed Both',    color: 'red' },
    { value: 'overtime',       label: 'Overtime',       color: 'violet' },
    { value: 'absent',         label: 'Absent',         color: 'red' },
    { value: 'on_leave',       label: 'On Leave',       color: 'blue' },
  ]

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance</h1>
          <p className="text-sm text-white/40 mt-0.5">{lastSyncLabel(lastSync)}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setVisibleCount(20) }}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Stats cards (Osiyo's StatsCards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Employees', value: stats.total,              icon: '👥', color: 'text-blue-300',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
          { label: 'Missed Clock-In', value: stats.missedIn,           icon: '⚠',  color: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
          { label: 'Missed Clock-Out',value: stats.missedOut,          icon: '🕐', color: 'text-red-300',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
          { label: 'Avg Hours/Day',   value: stats.avgHrs.toFixed(1),  icon: '📈', color: 'text-green-300',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-4 flex items-center gap-3`}>
            <div className={`${s.bg} rounded-lg p-2 text-xl`}>{s.icon}</div>
            <div>
              <p className="text-xs text-white/40 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Department dropdown */}
      <select
        value={activeDept}
        onChange={e => { setActiveDept(e.target.value); setVisibleCount(20) }}
        className="rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/20 min-w-[200px]"
      >
        <option value="all">All Departments · {employees.length}</option>
        {departments.map(d => {
          const count = employees.filter(e => e.departmentId === d.id).length
          if (count === 0) return null
          return <option key={d.id} value={d.id}>{d.name} · {count}</option>
        })}
      </select>

      {/* Attendance filters (Osiyo's AttendanceFilters) */}
      <div className="flex items-center gap-2 flex-wrap">
        <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {FILTERS.map(f => {
          const active = filter === f.value
          const colorMap: Record<string, string> = {
            amber:  active ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'border-white/10 text-white/40 hover:border-amber-500/20 hover:text-amber-300/70',
            red:    active ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'border-white/10 text-white/40 hover:border-red-500/20 hover:text-red-300/70',
            violet: active ? 'bg-violet-500/15 text-violet-300 border-violet-500/30' : 'border-white/10 text-white/40 hover:border-violet-500/20 hover:text-violet-300/70',
            blue:   active ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'border-white/10 text-white/40 hover:border-blue-500/20 hover:text-blue-300/70',
            '':     active ? 'bg-white text-black border-white' : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70',
          }
          return (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setVisibleCount(20) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${colorMap[f.color] ?? colorMap['']}`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
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

      {/* Count */}
      <p className="text-xs text-white/30">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} employees</p>

      {/* Employee list (Osiyo's EmployeeList pattern) */}
      <div className="space-y-2">
        {filtered.slice(0, visibleCount).map(emp => (
          <EmployeeRow
            key={emp.id}
            emp={{ ...emp, department: deptById.get(emp.departmentId) }}
            rec={recByEmp.get(emp.id)}
            scheduledShift={rosterSlots[emp.id]}
            onClick={() => setDetailEmp({ ...emp, department: deptById.get(emp.departmentId) })}
          />
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center">
              <svg className="w-7 h-7 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white/40">No employees match your filters</p>
            <p className="text-xs text-white/20">
              {search ? `No results for "${search}"` : filter !== 'all' ? 'Try changing the filter' : 'No staff in this department'}
            </p>
          </div>
        )}

        {filtered.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(v => v + 20)}
            className="w-full py-3 rounded-xl border border-white/[0.06] text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-all"
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        )}
      </div>

      {/* Employee detail sheet */}
      <EmployeeDetailSheet
        employee={detailEmp}
        month={month}
        year={year}
        onClose={() => setDetailEmp(null)}
        onAttendanceOverride={fetchAttendance}
      />
    </div>
  )
}
