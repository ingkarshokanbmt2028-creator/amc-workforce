'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { SHIFT_COLORS, SHIFT_LABELS, SHIFT_TIMES, SHIFT_HOURS } from '@/lib/shifts'
import { ShiftModal } from '@/components/roster/ShiftModal'
import { EmployeeDetailSheet } from '@/components/roster/EmployeeDetailSheet'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Department { id: string; name: string; code: string }
interface Employee { id: string; staffId: string; name: string; departmentId: string; expectedMonthlyHours: number; employeeType: string; position: string; location?: string; status: string; department?: { name: string; code: string } }
interface RosterSlot {
  id: string; employeeId: string; date: string; shiftType: string; isEmergency: boolean
  employee?: { name: string; expectedMonthlyHours: number; departmentId: string }
}
interface Roster { id: string; status: string; departmentId: string; slots: RosterSlot[] }

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW_LABELS = ['MON','TUE','WED','THU','FRI','SAT','SUN']

const LEGEND_SHIFTS = ['MORNING','AFTERNOON','NIGHT','DAY','LATE','PM_SHIFT','ON_CALL','OFF','ANNUAL_LEAVE','MATERNITY_LEAVE','SICK_LEAVE']

function fmt12(t?: string) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getWeeksInMonth(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const weeks: { label: string; start: number; end: number }[] = []
  let start = 1
  while (start <= daysInMonth) {
    const end = Math.min(start + 6, daysInMonth)
    const s = new Date(year, month - 1, start)
    const e = new Date(year, month - 1, end)
    const fmt = (d: Date) => `${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}`
    weeks.push({ label: `W${weeks.length + 1}`, start, end })
    start = end + 1
  }
  return weeks
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

// ── Shift Legend ───────────────────────────────────────────────────────────────

function ShiftLegend() {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shift Structure</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
        {LEGEND_SHIFTS.map((s) => {
          const times = SHIFT_TIMES[s]
          const hours = SHIFT_HOURS[s]
          const color = SHIFT_COLORS[s] ?? 'bg-slate-100 text-slate-600'
          return (
            <div key={s} className={`rounded-lg px-3 py-2 ${color}`}>
              <p className="font-bold text-xs">{SHIFT_LABELS[s]} — {s.replace(/_/g,' ')}</p>
              {times
                ? <p className="text-xs opacity-80 mt-0.5">{fmt12(times.start)} – {fmt12(times.end)}</p>
                : <p className="text-xs opacity-60 mt-0.5">—</p>}
              {hours !== undefined && hours > 0 && (
                <p className="text-xs font-semibold mt-0.5">{hours} hrs</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function RosterPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [weekIdx, setWeekIdx] = useState(0)

  const [departments, setDepartments] = useState<Department[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [activeDeptId, setActiveDeptId] = useState<string | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  // Rosters for all depts in this month
  const [rosters, setRosters] = useState<Roster[]>([])
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Modal state
  const [modal, setModal] = useState<{
    rosterId: string; slotId?: string; employeeId: string; employeeName: string; date: string; currentShift: string | null; deptCode?: string
  } | null>(null)

  // Remove employee confirm
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; name: string } | null>(null)
  // Employee detail sheet
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null)

  async function handleRemoveEmployee(id: string) {
    await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    setAllEmployees(prev => prev.filter(e => e.id !== id))
    setRemoveConfirm(null)
  }

  // Weeks for selected month
  const weeks = useMemo(() => getWeeksInMonth(year, month), [year, month])
  const week = weeks[weekIdx] ?? weeks[0]

  // Days in selected week
  const weekDays = useMemo(() => {
    if (!week) return []
    const days: Date[] = []
    for (let d = week.start; d <= week.end; d++) {
      days.push(new Date(year, month - 1, d))
    }
    // Pad to 7 days (Mon–Sun) by reordering so Mon is first
    // Sort: Mon=1..Sun=0 → use getDay(), remap 0→7
    days.sort((a, b) => {
      const da = a.getDay() === 0 ? 7 : a.getDay()
      const db = b.getDay() === 0 ? 7 : b.getDay()
      return da - db
    })
    return days
  }, [week, year, month])

  // Reset week when month changes
  useEffect(() => { setWeekIdx(0) }, [month, year])

  // Load departments + all employees once
  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]).then(([depts, emps]: [Department[], Employee[]]) => {
      setDepartments(depts)
      setAllEmployees(emps)
    })
  }, [])

  // Load rosters for this month
  const fetchRosters = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/roster?month=${month}&year=${year}`)
      if (res.ok) setRosters(await res.json())
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchRosters() }, [fetchRosters])

  // Employee count per dept
  const countByDept = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of allEmployees) {
      m.set(e.departmentId, (m.get(e.departmentId) ?? 0) + 1)
    }
    return m
  }, [allEmployees])

  // Build slot lookup: employeeId → dateKey → slot
  const slotMap = useMemo(() => {
    const map = new Map<string, Map<string, RosterSlot & { rosterId: string }>>()
    for (const roster of rosters) {
      for (const slot of roster.slots) {
        if (!map.has(slot.employeeId)) map.set(slot.employeeId, new Map())
        map.get(slot.employeeId)!.set(slot.date.slice(0, 10), { ...slot, rosterId: roster.id })
      }
    }
    return map
  }, [rosters])

  // Employees to show (filtered by dept + search), LOCUM always at bottom
  const visibleEmployees = useMemo(() => {
    let emps = allEmployees
    if (activeDeptId !== 'ALL') emps = emps.filter(e => e.departmentId === activeDeptId)
    if (search.trim()) {
      const q = search.toLowerCase()
      emps = emps.filter(e => e.name.toLowerCase().includes(q))
    }
    return emps.sort((a, b) => {
      if (a.employeeType === 'LOCUM' && b.employeeType !== 'LOCUM') return 1
      if (a.employeeType !== 'LOCUM' && b.employeeType === 'LOCUM') return -1
      return a.name.localeCompare(b.name)
    })
  }, [allEmployees, activeDeptId, search])

  // Group visible employees by dept (for section headers)
  const employeesByDept = useMemo(() => {
    const groups = new Map<string, Employee[]>()
    for (const e of visibleEmployees) {
      if (!groups.has(e.departmentId)) groups.set(e.departmentId, [])
      groups.get(e.departmentId)!.push(e)
    }
    return groups
  }, [visibleEmployees])

  const deptById = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments])

  async function handleSlotClick(rosterId: string, slotId: string | undefined, employeeId: string, employeeName: string, date: string, currentShift: string | null, deptCode?: string) {
    setModal({ rosterId, slotId, employeeId, employeeName, date, currentShift, deptCode })
  }

  async function handleShiftSave(shiftType: string) {
    if (!modal) return
    const slot = slotMap.get(modal.employeeId)?.get(modal.date)

    // Need a roster for this employee's dept in this month
    const emp = allEmployees.find(e => e.id === modal.employeeId)
    if (!emp) return

    let roster = rosters.find(r => r.departmentId === emp.departmentId)
    if (!roster) {
      // Create roster for this dept
      const res = await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: emp.departmentId, month, year, createdBy: 'admin' }),
      })
      if (!res.ok) return
      roster = await res.json()
    }

    if (slot) {
      await fetch(`/api/roster/slots/${slot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftType, changedBy: 'admin' }),
      })
    } else {
      await fetch('/api/roster/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterId: roster!.id, employeeId: modal.employeeId, date: modal.date, shiftType }),
      })
    }
    setModal(null)
    fetchRosters()
  }

  async function handlePublish(deptId: string) {
    const roster = rosters.find(r => r.departmentId === deptId)
    if (!roster) return
    setPublishing(true)
    await fetch(`/api/roster/${roster.id}/publish`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishedBy: 'admin' }),
    })
    setPublishing(false)
    fetchRosters()
  }

  const weekLabel = week
    ? `${MONTHS[month-1].slice(0,3)} ${week.start}${week.start !== week.end ? ` – ${week.end}` : ''}`
    : ''

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Duty Roster</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {MONTHS[month-1]} {year} · {departments.length} departments · {allEmployees.length} staff
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const csv = [['Employee','Dept','Date','Shift'],...visibleEmployees.flatMap(e =>
                weekDays.map(d => {
                  const key = isoDate(year, month, d.getDate())
                  const slot = slotMap.get(e.id)?.get(key)
                  return [e.name, deptById.get(e.departmentId)?.code ?? '', key, slot?.shiftType ?? '']
                })
              )].map(r => r.join(',')).join('\n')
              const a = document.createElement('a')
              a.href = 'data:text/csv,' + encodeURIComponent(csv)
              a.download = `roster_${month}_${year}.csv`
              a.click()
            }}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Month tabs + Week navigation */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[1,2,3,4,5,6,7,8,9,10,11,12].filter(m => {
            const hasRoster = rosters.some(r => r !== undefined) || true
            return true // show all months; grey out ones with no data later
          }).map(m => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                m === month
                  ? 'bg-foreground text-background'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {MONTHS[m-1].slice(0,3)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekIdx(i => Math.max(0, i - 1))}
            disabled={weekIdx === 0}
            className="w-8 h-8 rounded border border-border flex items-center justify-center text-sm hover:bg-muted disabled:opacity-30"
          >‹</button>
          {weeks.map((w, i) => (
            <button
              key={w.label}
              onClick={() => setWeekIdx(i)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                i === weekIdx ? 'bg-foreground text-background' : 'border border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              {w.label}
            </button>
          ))}
          <button
            onClick={() => setWeekIdx(i => Math.min(weeks.length - 1, i + 1))}
            disabled={weekIdx === weeks.length - 1}
            className="w-8 h-8 rounded border border-border flex items-center justify-center text-sm hover:bg-muted disabled:opacity-30"
          >›</button>
        </div>

        <span className="px-3 py-1.5 rounded-full bg-muted text-sm font-medium">{weekLabel}</span>
      </div>

      {/* Department pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setActiveDeptId('ALL')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            activeDeptId === 'ALL' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'
          }`}
        >
          All Departments
          <span className="opacity-70">{allEmployees.length}</span>
        </button>
        {departments.map(d => (
          <button
            key={d.id}
            onClick={() => setActiveDeptId(d.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeDeptId === d.id ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            {d.name}
            <span className="opacity-70">{countByDept.get(d.id) ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${activeDeptId === 'ALL' ? 'all staff' : (deptById.get(activeDeptId)?.name ?? '')}…`}
            className="pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>
        <span className="text-sm text-muted-foreground">{visibleEmployees.length} employees</span>
      </div>

      {/* Roster grid */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      ) : visibleEmployees.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">No employees match your search.</div>
      ) : (
        <div className="space-y-6">
          {Array.from(employeesByDept.entries()).map(([deptId, emps]) => {
            const dept = deptById.get(deptId)
            const roster = rosters.find(r => r.departmentId === deptId)
            const filteredEmps = search.trim()
              ? emps
              : emps

            return (
              <div key={deptId} className="rounded-xl border border-border overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 rounded-full bg-foreground/30" />
                    <span className="font-semibold">{dept?.name ?? deptId}</span>
                    <span className="text-xs text-muted-foreground">{MONTHS[month-1]} {year}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{weekLabel}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{emps.length} staff</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {roster && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        roster.status === 'PUBLISHED' ? 'bg-green-100 text-green-700'
                        : roster.status === 'LOCKED' ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {roster.status}
                      </span>
                    )}
                    {roster?.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(deptId)}
                        disabled={publishing}
                        className="px-3 py-1 rounded text-xs font-medium bg-foreground text-background hover:opacity-80 transition-opacity"
                      >
                        Publish
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/20">
                        <th className="sticky left-0 bg-[#0f1117] px-4 py-2 text-left font-semibold min-w-[220px] border-r border-border">NAME</th>
                        {weekDays.map(d => {
                          const isToday = d.toDateString() === new Date().toDateString()
                          const dow = DOW_LABELS[(d.getDay() + 6) % 7]
                          return (
                            <th key={d.toISOString()} className={`px-2 py-2 text-center min-w-[80px] ${isToday ? 'bg-blue-50 text-blue-700' : ''}`}>
                              <div className="font-semibold">{dow}</div>
                              <div className={`text-[10px] ${isToday ? 'font-bold' : 'text-muted-foreground font-normal'}`}>{d.getDate()}</div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Separator before LOCUM section */}
                      {filteredEmps.some(e => e.employeeType === 'LOCUM') && (
                        <tr className="border-t border-white/[0.05]">
                          <td colSpan={weekDays.length + 1} className="px-4 py-1.5 bg-blue-500/5">
                            <span className="text-[10px] font-bold tracking-widest text-blue-400/60 uppercase">Locum Staff</span>
                          </td>
                        </tr>
                      )}
                      {filteredEmps.map((emp, idx) => (
                        <tr key={emp.id} className={`border-t border-white/[0.05] hover:bg-white/[0.03] ${emp.employeeType === 'LOCUM' ? 'bg-blue-500/[0.04]' : idx % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                          <td className="sticky left-0 bg-[#0f1117] px-4 py-1.5 border-r border-border min-w-[220px] max-w-[220px] group/row">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/70 flex-shrink-0">
                                {emp.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                              </div>
                              <button
                                className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                                onClick={() => setDetailEmployee({ ...emp, department: deptById.get(emp.departmentId) })}
                              >
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-white truncate">{emp.name}</p>
                                  {emp.employeeType === 'LOCUM' && (
                                    <span className="flex-shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">LOCUM</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-white/40 truncate">{emp.staffId}</p>
                              </button>
                              {/* Remove button — shows on row hover */}
                              <button
                                onClick={() => setRemoveConfirm({ id: emp.id, name: emp.name })}
                                className="opacity-0 group-hover/row:opacity-100 p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
                                title="Remove employee"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          {weekDays.map(d => {
                            const dateKey = isoDate(year, month, d.getDate())
                            const slot = slotMap.get(emp.id)?.get(dateKey)
                            const isToday = d.toDateString() === new Date().toDateString()
                            const colorClass = slot ? (SHIFT_COLORS[slot.shiftType] ?? 'bg-slate-100 text-slate-600') : ''
                            const label = slot ? (SHIFT_LABELS[slot.shiftType] ?? slot.shiftType) : '—'
                            return (
                              <td key={dateKey} className={`px-1 py-1 text-center ${isToday ? 'bg-blue-50/50' : ''}`}>
                                <button
                                  onClick={() => handleSlotClick(
                                    roster?.id ?? '',
                                    slot?.id,
                                    emp.id,
                                    emp.name,
                                    dateKey,
                                    slot?.shiftType ?? null,
                                    deptById.get(emp.departmentId)?.code
                                  )}
                                  className={`w-full min-h-[44px] rounded-lg text-xs font-bold transition-all hover:opacity-80 hover:scale-105 flex flex-col items-center justify-center px-1 ${
                                    slot ? colorClass : 'text-white/20 hover:bg-white/5 hover:text-white/40'
                                  } ${slot?.isEmergency ? 'ring-2 ring-red-500' : ''}`}
                                  title={slot ? `${slot.shiftType}${SHIFT_TIMES[slot.shiftType] ? ` · ${SHIFT_TIMES[slot.shiftType].start}–${SHIFT_TIMES[slot.shiftType].end}` : ''}` : 'Click to assign shift'}
                                >
                                  {slot ? (
                                    <>
                                      <span className="font-black text-sm leading-none">{label}</span>
                                      <span className="text-[9px] opacity-80 leading-none mt-0.5 capitalize">{slot.shiftType.replace(/_/g,' ').toLowerCase()}</span>
                                    </>
                                  ) : (
                                    <span className="text-[10px]">Off</span>
                                  )}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Remove employee confirmation */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Remove Employee?</p>
                <p className="text-sm text-white/50 mt-0.5">This will deactivate their account</p>
              </div>
            </div>
            <p className="text-sm text-white/70 mb-5">
              <span className="text-white font-medium">{removeConfirm.name}</span> will be set to inactive. Their roster history is kept. You can reactivate them from the database later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveEmployee(removeConfirm.id)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-sm font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift modal */}
      {modal && (
        <ShiftModal
          open
          employeeName={modal.employeeName}
          date={modal.date}
          currentShift={modal.currentShift}
          deptCode={modal.deptCode}
          onClose={() => setModal(null)}
          onSave={handleShiftSave}
        />
      )}

      {/* Employee detail sheet */}
      <EmployeeDetailSheet
        employee={detailEmployee}
        month={month}
        year={year}
        onClose={() => setDetailEmployee(null)}
        onAttendanceOverride={fetchRosters}
      />
    </div>
  )
}
