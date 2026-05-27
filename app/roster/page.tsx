'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { SHIFT_LABELS } from '@/lib/shifts'
import { ShiftModal } from '@/components/roster/ShiftModal'
import { EmployeeDetailSheet } from '@/components/roster/EmployeeDetailSheet'
import { Pencil, Plus, Download, Wifi } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Department { id: string; name: string; code: string }
interface Employee {
  id: string; staffId: string; name: string; departmentId: string
  expectedMonthlyHours: number; employeeType: string; position: string
  location?: string; status: string; department?: { name: string; code: string }
}
interface RosterSlot {
  id: string; employeeId: string; date: string; shiftType: string; isEmergency: boolean
  employee?: { name: string; expectedMonthlyHours: number; departmentId: string }
}
interface Roster { id: string; status: string; departmentId: string; slots: RosterSlot[] }

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DOW_LETTER = ['S','M','T','W','T','F','S'] // 0=Sun

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function addMonths(y: number, m: number, delta: number): { year: number; month: number } {
  let newM = m + delta
  let newY = y
  while (newM > 12) { newM -= 12; newY++ }
  while (newM < 1)  { newM += 12; newY-- }
  return { year: newY, month: newM }
}

function monthDays(year: number, month: number): Date[] {
  const n = new Date(year, month, 0).getDate()
  return Array.from({ length: n }, (_, i) => new Date(year, month - 1, i + 1))
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function RosterPage() {
  const now = new Date()

  // Selected month
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [selYear,  setSelYear]  = useState(now.getFullYear())

  // 3-month navigation window — starts so selected month is first
  const [winStart, setWinStart] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  // View mode
  const [byDept, setByDept] = useState(true)
  const [editMode, setEditMode] = useState(false)

  const [departments, setDepartments]   = useState<Department[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [rosters, setRosters]           = useState<Roster[]>([])
  const [loading, setLoading]           = useState(false)
  const [activeDeptId, setActiveDeptId] = useState<string>('')
  const [search, setSearch]             = useState('')
  const [publishing, setPublishing]     = useState(false)

  // Modal state
  const [modal, setModal] = useState<{
    rosterId: string; slotId?: string; employeeId: string
    employeeName: string; date: string; currentShift: string | null; deptCode?: string
  } | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; name: string } | null>(null)
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null)

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]).then(([depts, emps]: [Department[], Employee[]]) => {
      setDepartments(depts)
      setAllEmployees(emps)
      if (depts.length > 0 && !activeDeptId) {
        setActiveDeptId(depts[0].id)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchRosters = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/roster?month=${selMonth}&year=${selYear}`)
      if (res.ok) setRosters(await res.json())
    } finally {
      setLoading(false)
    }
  }, [selMonth, selYear])

  useEffect(() => { fetchRosters() }, [fetchRosters])

  // Auto-set first dept when departments load
  useEffect(() => {
    if (departments.length > 0 && !activeDeptId) {
      setActiveDeptId(departments[0].id)
    }
  }, [departments, activeDeptId])

  // ── Slot lookup ───────────────────────────────────────────────────────────
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

  const deptById = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments])

  const countByDept = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of allEmployees) m.set(e.departmentId, (m.get(e.departmentId) ?? 0) + 1)
    return m
  }, [allEmployees])

  // Employees for selected dept (roster view)
  const rosterEmployees = useMemo(() => {
    let emps = byDept
      ? allEmployees.filter(e => e.departmentId === activeDeptId)
      : allEmployees
    if (search.trim()) {
      const q = search.toLowerCase()
      emps = emps.filter(e => e.name.toLowerCase().includes(q) || e.staffId.toLowerCase().includes(q))
    }
    return emps.sort((a, b) => {
      if (a.employeeType === 'LOCUM' && b.employeeType !== 'LOCUM') return 1
      if (a.employeeType !== 'LOCUM' && b.employeeType === 'LOCUM') return -1
      return a.name.localeCompare(b.name)
    })
  }, [allEmployees, activeDeptId, byDept, search])

  // Group by dept (for all-depts view)
  const empsByDept = useMemo(() => {
    const groups = new Map<string, Employee[]>()
    for (const e of rosterEmployees) {
      if (!groups.has(e.departmentId)) groups.set(e.departmentId, [])
      groups.get(e.departmentId)!.push(e)
    }
    return groups
  }, [rosterEmployees])

  const days = useMemo(() => monthDays(selYear, selMonth), [selYear, selMonth])

  // ── 3-month window ────────────────────────────────────────────────────────
  const windowMonths = useMemo(() => [
    winStart,
    addMonths(winStart.year, winStart.month, 1),
    addMonths(winStart.year, winStart.month, 2),
  ], [winStart])

  function selectMonth(y: number, m: number) {
    setSelYear(y)
    setSelMonth(m)
  }

  function shiftWindow(delta: number) {
    setWinStart(prev => addMonths(prev.year, prev.month, delta))
  }

  // ── Slot actions ──────────────────────────────────────────────────────────
  async function handleSlotClick(
    rosterId: string, slotId: string | undefined,
    employeeId: string, employeeName: string,
    date: string, currentShift: string | null, deptCode?: string
  ) {
    if (!editMode) return
    setModal({ rosterId, slotId, employeeId, employeeName, date, currentShift, deptCode })
  }

  async function handleShiftSave(shiftType: string) {
    if (!modal) return
    const slot = slotMap.get(modal.employeeId)?.get(modal.date)
    const emp  = allEmployees.find(e => e.id === modal.employeeId)
    if (!emp) return

    let roster = rosters.find(r => r.departmentId === emp.departmentId)
    if (!roster) {
      const res = await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: emp.departmentId, month: selMonth, year: selYear, createdBy: 'admin' }),
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

  async function handleRemoveEmployee(id: string) {
    await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    setAllEmployees(prev => prev.filter(e => e.id !== id))
    setRemoveConfirm(null)
  }

  function handleExport() {
    const csv = [
      ['Employee', 'StaffID', 'Dept', 'Date', 'Shift'],
      ...rosterEmployees.flatMap(e =>
        days.map(d => {
          const dateKey = isoDate(selYear, selMonth, d.getDate())
          const slot = slotMap.get(e.id)?.get(dateKey)
          return [e.name, e.staffId, deptById.get(e.departmentId)?.code ?? '', dateKey, slot?.shiftType ?? '']
        })
      ),
    ].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv,' + encodeURIComponent(csv)
    a.download = `roster_${selMonth}_${selYear}.csv`
    a.click()
  }

  // Which depts to render in the table
  const tableGroups: { deptId: string; emps: Employee[] }[] = byDept
    ? (activeDeptId && rosterEmployees.length > 0 ? [{ deptId: activeDeptId, emps: rosterEmployees }] : [])
    : Array.from(empsByDept.entries()).map(([deptId, emps]) => ({ deptId, emps }))

  const monthsWithRosters = useMemo(() => {
    return new Set(rosters.map(r => `${selYear}-${selMonth}`))
  }, [rosters, selYear, selMonth])

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-0 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40 mb-1.5">
            Duty Roster
          </p>
          <h1 className="text-[2.25rem] font-black text-foreground tracking-tight leading-none">
            Schedules
          </h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-foreground/45">
            <Wifi className="w-3.5 h-3.5 text-green-500" />
            <span>BioTime connected</span>
            <span>·</span>
            <span>{rosters.length} rosters</span>
            <span>·</span>
            <span>{departments.length} departments</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setEditMode(e => !e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all ${
              editMode
                ? 'bg-foreground text-background border-foreground'
                : 'border-foreground/15 text-foreground/70 hover:bg-foreground/[0.04]'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-foreground/15 text-[13px] font-medium text-foreground/70 hover:bg-foreground/[0.04] transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Month
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-foreground/15 text-[13px] font-medium text-foreground/70 hover:bg-foreground/[0.04] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* ── Month navigation ── */}
      <div className="px-8 pt-6 flex items-center gap-3">
        <button
          onClick={() => shiftWindow(-1)}
          className="w-7 h-7 flex items-center justify-center rounded text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.06] transition-colors text-sm font-bold"
        >
          ‹
        </button>

        <div className="flex items-center gap-2">
          {windowMonths.map(({ year: y, month: m }) => {
            const isSelected = y === selYear && m === selMonth
            return (
              <button
                key={`${y}-${m}`}
                onClick={() => selectMonth(y, m)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-foreground text-background'
                    : 'text-foreground/50 hover:text-foreground/80'
                }`}
              >
                {MONTHS[m - 1]} {y}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => shiftWindow(1)}
          className="w-7 h-7 flex items-center justify-center rounded text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.06] transition-colors text-sm font-bold"
        >
          ›
        </button>
      </div>

      {/* ── By dept / All depts toggle ── */}
      <div className="px-8 pt-4">
        <div className="flex items-center gap-0.5 bg-card border border-foreground/[0.08] rounded-lg p-0.5 w-fit">
          <button
            onClick={() => setByDept(true)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
              byDept ? 'bg-foreground text-background' : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            By department
          </button>
          <button
            onClick={() => setByDept(false)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
              !byDept ? 'bg-foreground text-background' : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            All departments
          </button>
        </div>
      </div>

      {/* ── Dept tabs (shown only in byDept mode) ── */}
      {byDept && (
        <div className="px-8 pt-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {departments.map(dept => {
              const isActive = dept.id === activeDeptId
              const hasDraft = rosters.some(r => r.departmentId === dept.id && r.status === 'DRAFT')
              const count = countByDept.get(dept.id) ?? 0
              return (
                <button
                  key={dept.id}
                  onClick={() => setActiveDeptId(dept.id)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                    isActive
                      ? 'bg-foreground text-background'
                      : 'text-foreground/50 hover:text-foreground hover:bg-foreground/[0.06]'
                  }`}
                >
                  {dept.name}
                  <span className={`text-[11px] ${isActive ? 'text-background/60' : 'text-foreground/35'}`}>
                    {count}
                  </span>
                  {!isActive && hasDraft && (
                    <span className={`text-[10px] ${isActive ? 'text-background/50' : 'text-foreground/40'}`}>↓</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <div className="px-8 pt-4 flex items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="pl-9 pr-4 py-2 rounded-lg border border-foreground/[0.1] bg-card text-[13px] text-foreground placeholder:text-foreground/35 focus:outline-none focus:ring-1 focus:ring-foreground/20 w-56"
          />
        </div>
        <span className="text-[13px] text-foreground/40">
          {rosterEmployees.length} staff
        </span>
      </div>

      {/* ── Roster grid ── */}
      <div className="px-8 pt-4 pb-12 space-y-5">
        {loading ? (
          <div className="py-20 text-center text-foreground/35 text-sm">Loading…</div>
        ) : tableGroups.length === 0 ? (
          <div className="py-20 text-center text-foreground/35 text-sm bg-card border border-foreground/[0.08] rounded-xl">
            No employees found
          </div>
        ) : (
          tableGroups.map(({ deptId, emps }) => {
            const dept   = deptById.get(deptId)
            const roster = rosters.find(r => r.departmentId === deptId)

            return (
              <div key={deptId} className="bg-card border border-foreground/[0.08] rounded-xl overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-foreground">{dept?.name ?? deptId}</span>
                    <span className="text-[12px] text-foreground/40">
                      {MONTHS[selMonth - 1]} {selYear} · {days.length} days
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {roster && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        roster.status === 'PUBLISHED' ? 'bg-green-100 text-green-700'
                        : roster.status === 'LOCKED'   ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {roster.status}
                      </span>
                    )}
                    {editMode && roster?.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(deptId)}
                        disabled={publishing}
                        className="px-3 py-1 rounded text-[11px] font-semibold bg-foreground text-background hover:opacity-80 transition-opacity"
                      >
                        Publish
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="border-collapse" style={{ minWidth: `${180 + days.length * 34}px` }}>
                    <thead>
                      <tr>
                        {/* Sticky staff column header */}
                        <th
                          className="sticky left-0 z-10 bg-card px-4 py-2 text-left text-[10px] font-bold tracking-wider uppercase text-foreground/40 border-r border-foreground/[0.06]"
                          style={{ minWidth: 180, width: 180 }}
                        >
                          Staff
                        </th>
                        {days.map(d => {
                          const dow   = d.getDay()
                          const isWkd = dow === 0 || dow === 6
                          const isToday = d.toDateString() === new Date().toDateString()
                          return (
                            <th
                              key={d.getDate()}
                              className={`py-2 text-center border-r border-foreground/[0.04] last:border-0 ${
                                isWkd    ? 'bg-foreground/[0.02]'   : ''
                              } ${isToday ? 'bg-blue-50/60' : ''}`}
                              style={{ minWidth: 32, width: 32, maxWidth: 32 }}
                            >
                              <div className={`text-[9px] font-semibold ${isWkd ? 'text-foreground/30' : 'text-foreground/40'} ${isToday ? 'text-blue-500' : ''}`}>
                                {DOW_LETTER[dow]}
                              </div>
                              <div className={`text-[10px] font-bold ${isWkd ? 'text-foreground/30' : 'text-foreground/60'} ${isToday ? 'text-blue-600' : ''}`}>
                                {d.getDate()}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {emps.map(emp => (
                        <tr
                          key={emp.id}
                          className={`border-t border-foreground/[0.05] hover:bg-foreground/[0.015] ${
                            emp.employeeType === 'LOCUM' ? 'bg-blue-500/[0.02]' : ''
                          }`}
                        >
                          {/* Sticky name column */}
                          <td
                            className="sticky left-0 z-10 bg-card border-r border-foreground/[0.06] px-3 py-2 group/row"
                            style={{ minWidth: 180, width: 180 }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                style={{ background: '#2B3649', color: '#C8D0DC' }}
                              >
                                {emp.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                              </div>
                              <button
                                onClick={() => setDetailEmployee({ ...emp, department: deptById.get(emp.departmentId) })}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p className="text-[11px] font-bold text-foreground truncate uppercase tracking-wide">
                                  {emp.name}
                                </p>
                                <p className="text-[10px] text-foreground/35 truncate">{emp.staffId}</p>
                              </button>
                              {editMode && (
                                <button
                                  onClick={() => setRemoveConfirm({ id: emp.id, name: emp.name })}
                                  className="opacity-0 group-hover/row:opacity-100 p-1 rounded hover:bg-red-500/10 text-foreground/25 hover:text-red-500 transition-all flex-shrink-0"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Day cells */}
                          {days.map(d => {
                            const dateKey = isoDate(selYear, selMonth, d.getDate())
                            const slot    = slotMap.get(emp.id)?.get(dateKey)
                            const dow     = d.getDay()
                            const isWkd   = dow === 0 || dow === 6
                            const isToday = d.toDateString() === new Date().toDateString()
                            const label   = slot ? (SHIFT_LABELS[slot.shiftType] ?? slot.shiftType) : ''

                            return (
                              <td
                                key={dateKey}
                                className={`border-r border-foreground/[0.04] last:border-0 text-center p-0 ${
                                  isWkd   ? 'bg-foreground/[0.015]' : ''
                                } ${isToday ? 'bg-blue-50/40' : ''}`}
                                style={{ minWidth: 32, width: 32, maxWidth: 32 }}
                              >
                                <button
                                  onClick={() => handleSlotClick(
                                    roster?.id ?? '', slot?.id,
                                    emp.id, emp.name, dateKey,
                                    slot?.shiftType ?? null,
                                    deptById.get(emp.departmentId)?.code
                                  )}
                                  disabled={!editMode}
                                  className={`w-full h-8 flex items-center justify-center text-[10px] font-bold transition-all ${
                                    label
                                      ? 'text-foreground/70 hover:bg-foreground/[0.05]'
                                      : 'text-foreground/15 hover:text-foreground/30 hover:bg-foreground/[0.03]'
                                  } ${editMode ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                  {label || ''}
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
          })
        )}
      </div>

      {/* ── Remove confirm ── */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-foreground/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <p className="font-semibold text-foreground mb-1">Remove Employee?</p>
            <p className="text-sm text-foreground/50 mb-5">
              <span className="text-foreground font-medium">{removeConfirm.name}</span> will be set to inactive.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-foreground/10 text-sm text-foreground/60 hover:bg-foreground/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveEmployee(removeConfirm.id)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm font-semibold text-red-500 hover:bg-red-500/20 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shift modal ── */}
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

      {/* ── Employee detail ── */}
      <EmployeeDetailSheet
        employee={detailEmployee}
        month={selMonth}
        year={selYear}
        onClose={() => setDetailEmployee(null)}
        onAttendanceOverride={fetchRosters}
      />
    </div>
  )
}
