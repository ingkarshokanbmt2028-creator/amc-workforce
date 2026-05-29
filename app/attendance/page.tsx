'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { EmployeeDetailSheet } from '@/components/roster/EmployeeDetailSheet'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Department { id: string; name: string; code: string }
interface Employee {
  id: string; name: string; staffId: string; departmentId: string
  position: string; employeeType: string; status: string
  expectedMonthlyHours?: number
  department?: { name: string; code: string }
}
interface AttRecord {
  id: string; employeeId: string; date: string; status: string
  clockIn?: string | null; clockOut?: string | null
  totalHours?: number
}

type AttFilter = 'all' | 'missed_in' | 'missed_out' | 'missed_both' | 'overtime'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ rec }: { rec: AttRecord | undefined }) {
  if (!rec) return null
  if (!rec.clockIn && !rec.clockOut)
    return <span className="text-[11px] px-2 py-0.5 rounded border border-red-300 text-red-600 font-medium whitespace-nowrap">No clock-in</span>
  if (!rec.clockIn)
    return <span className="text-[11px] px-2 py-0.5 rounded border border-red-300 text-red-600 font-medium whitespace-nowrap">No clock-in</span>
  if (!rec.clockOut)
    return <span className="text-[11px] px-2 py-0.5 rounded border border-amber-300 text-amber-700 font-medium whitespace-nowrap">No clock-out</span>
  return <span className="text-[11px] px-2 py-0.5 rounded border border-green-300 text-green-600 font-medium whitespace-nowrap">Present</span>
}

// ── Employee Row ───────────────────────────────────────────────────────────────

function EmployeeRow({
  emp, missedCount, weekHrs, todayRec, onClick,
}: {
  emp: Employee
  missedCount: number
  weekHrs: number
  todayRec: AttRecord | undefined
  onClick: () => void
}) {
  const initials = emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')
  const expectedWeekHrs = Math.round((emp.expectedMonthlyHours ?? 180) / 4)

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-foreground/[0.015] transition-colors text-left group"
    >
      {/* Avatar */}
      <div className="h-9 w-9 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0"
        style={{ background: '#E8DEC8', color: '#5C4830' }}>
        {initials}
      </div>

      {/* Name + position */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-semibold text-foreground">{emp.name}</span>
          {missedCount > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ background: '#FFF3CD', color: '#A0620D', border: '1px solid #F5D27A' }}>
              {missedCount} missed
            </span>
          )}
        </div>
        <p className="text-[11px] text-foreground/40 mt-0.5 truncate">
          {emp.position} · {emp.staffId}
        </p>
      </div>

      {/* Status + week hrs + chevron */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <StatusBadge rec={todayRec} />

        <div className="text-right min-w-[72px]">
          <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-foreground/35">Week HRS</p>
          <p className="text-[13px] font-bold tabular-nums leading-tight">
            <span className={weekHrs > expectedWeekHrs * 1.05 ? 'text-amber-600' : 'text-foreground'}>
              {weekHrs.toFixed(1)}
            </span>
            <span className="text-foreground/30 font-normal text-[11px]"> / {expectedWeekHrs}</span>
          </p>
        </div>

        <ChevronRight className="w-4 h-4 text-foreground/20 group-hover:text-foreground/40 transition-colors" />
      </div>
    </button>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())

  const [departments, setDepartments] = useState<Department[]>([])
  const [employees,   setEmployees]   = useState<Employee[]>([])
  const [records,     setRecords]     = useState<AttRecord[]>([])

  const [activeDept, setActiveDept] = useState<string>('all')
  const [filter,     setFilter]     = useState<AttFilter>('all')
  const [search,     setSearch]     = useState('')
  const [detailEmp,  setDetailEmp]  = useState<Employee | null>(null)

  const daysInMonth = new Date(year, month, 0).getDate()
  const monthStart  = `${year}-${String(month).padStart(2,'0')}-01`
  const monthEnd    = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`

  // ── 7-day window ending today (or last day of selected month) ─────────────
  const windowEnd   = month === now.getMonth() + 1 && year === now.getFullYear()
    ? today
    : monthEnd
  const windowStart7 = (() => {
    const d = new Date(windowEnd + 'T12:00:00')
    d.setDate(d.getDate() - 6)
    return d.toISOString().slice(0, 10)
  })()

  // ── Load departments + employees once ─────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]).then(([depts, emps]: [Department[], Employee[]]) => {
      setDepartments(depts)
      setEmployees(emps)
    })
  }, [])

  // ── Load monthly attendance records ───────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    const res = await fetch(`/api/attendance?from=${monthStart}&to=${monthEnd}&limit=10000`)
    if (!res.ok) return
    const data = await res.json()
    setRecords(data.attendance ?? [])
  }, [monthStart, monthEnd])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // ── Lookups ───────────────────────────────────────────────────────────────
  const deptById = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments])

  const todayRecByEmp = useMemo(() => {
    const m = new Map<string, AttRecord>()
    for (const r of records) {
      if (r.date?.slice(0, 10) === today) m.set(r.employeeId, r)
    }
    return m
  }, [records, today])

  // ── Per-employee stats ─────────────────────────────────────────────────────
  const empStats = useMemo(() => {
    const m = new Map<string, { missedCount: number; weekHrs: number }>()

    for (const emp of employees) {
      const recs = records.filter(r => r.employeeId === emp.id)

      // Missed: past days (before today) with no clock-in and not on leave
      const missedCount = recs.filter(r => {
        const d = r.date?.slice(0, 10) ?? ''
        return d < today && !r.clockIn && r.status !== 'ON_LEAVE'
      }).length

      // Week hrs: last 7 days total hours
      const weekRecs = recs.filter(r => {
        const d = r.date?.slice(0, 10) ?? ''
        return d >= windowStart7 && d <= windowEnd
      })
      const weekHrs = weekRecs.reduce((s, r) => s + Math.max(0, r.totalHours ?? 0), 0)

      m.set(emp.id, { missedCount, weekHrs })
    }
    return m
  }, [employees, records, today, windowStart7, windowEnd])

  // ── Department tab counts ─────────────────────────────────────────────────
  const deptCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of employees) m.set(e.departmentId, (m.get(e.departmentId) ?? 0) + 1)
    return m
  }, [employees])

  const deptTabs = useMemo(() => {
    const seen = new Set<string>()
    const tabs: { id: string; name: string; count: number }[] = []
    for (const e of employees) {
      if (!seen.has(e.departmentId)) {
        seen.add(e.departmentId)
        const dept = deptById.get(e.departmentId)
        if (dept) tabs.push({ id: e.departmentId, name: dept.name, count: deptCounts.get(e.departmentId) ?? 0 })
      }
    }
    return tabs.sort((a, b) => a.name.localeCompare(b.name))
  }, [employees, deptById, deptCounts])

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const deptEmps = useMemo(() =>
    activeDept === 'all' ? employees : employees.filter(e => e.departmentId === activeDept),
    [employees, activeDept])

  const stats = useMemo(() => {
    const totalMissedIn  = deptEmps.reduce((s, e) => s + (empStats.get(e.id)?.missedCount ?? 0), 0)
    const totalMissedOut = records.filter(r => {
      const emp = deptEmps.find(e => e.id === r.employeeId)
      return emp && r.clockIn && !r.clockOut && r.date?.slice(0,10) < today
    }).length
    const weekHrsArr = deptEmps.map(e => empStats.get(e.id)?.weekHrs ?? 0).filter(h => h > 0)
    const avgWeekHrs = weekHrsArr.length > 0
      ? weekHrsArr.reduce((a, b) => a + b, 0) / weekHrsArr.length
      : 0
    return { total: deptEmps.length, missedIn: totalMissedIn, missedOut: totalMissedOut, avgWeekHrs }
  }, [deptEmps, empStats, records, today])

  // ── Filtered employees ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let emps = deptEmps
    if (search.trim()) {
      const q = search.toLowerCase()
      emps = emps.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.staffId.toLowerCase().includes(q) ||
        (e.position ?? '').toLowerCase().includes(q)
      )
    }
    emps = emps.filter(e => {
      const s = empStats.get(e.id) ?? { missedCount: 0, weekHrs: 0 }
      const todayRec = todayRecByEmp.get(e.id)
      switch (filter) {
        case 'missed_in':   return s.missedCount > 0
        case 'missed_out':  return todayRec?.clockIn && !todayRec?.clockOut
        case 'missed_both': return s.missedCount > 0 && (todayRec?.clockIn && !todayRec?.clockOut)
        case 'overtime':    return s.weekHrs > 45
        default: return true
      }
    })
    return emps
  }, [deptEmps, search, filter, empStats, todayRecByEmp])

  const selectedDeptName = activeDept === 'all'
    ? 'All departments'
    : (deptById.get(activeDept)?.name ?? '')

  const FILTERS: { value: AttFilter; label: string }[] = [
    { value: 'all',         label: 'All'        },
    { value: 'missed_in',   label: 'Missed in'  },
    { value: 'missed_out',  label: 'Missed out' },
    { value: 'missed_both', label: 'Missed both'},
    { value: 'overtime',    label: 'Overtime'   },
  ]

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-0 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40 mb-1.5">
            Attendance
          </p>
          <h1 className="text-[2.25rem] font-black text-foreground tracking-tight leading-none">
            {selectedDeptName}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => {
                if (month === 1) { setMonth(12); setYear(y => y - 1) }
                else setMonth(m => m - 1)
              }}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-foreground/[0.06] text-foreground/40 hover:text-foreground/70 transition-colors font-bold text-base"
            >‹</button>
            <span className="text-sm text-foreground/45">{MONTHS[month - 1]} {year} · {deptEmps.length} people</span>
            <button
              onClick={() => {
                if (month === 12) { setMonth(1); setYear(y => y + 1) }
                else setMonth(m => m + 1)
              }}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-foreground/[0.06] text-foreground/40 hover:text-foreground/70 transition-colors font-bold text-base"
            >›</button>
          </div>
        </div>

        {/* Department dropdown */}
        <div className="relative mt-1">
          <select
            value={activeDept}
            onChange={e => setActiveDept(e.target.value)}
            className="appearance-none rounded-lg border border-foreground/[0.12] bg-card px-3 py-2 pr-8 text-[13px] text-foreground focus:outline-none min-w-[180px] cursor-pointer"
          >
            <option value="all">All departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <svg className="absolute right-2.5 top-2.5 w-4 h-4 text-foreground/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="px-8 pt-6 grid grid-cols-4 gap-4">
        {[
          { label: 'Total staff',      value: stats.total,                  red: false },
          { label: 'Missed clock-in',  value: stats.missedIn,               red: true  },
          { label: 'Missed clock-out', value: stats.missedOut,              red: true  },
          { label: 'Avg hours / week', value: stats.avgWeekHrs.toFixed(1),  red: false },
        ].map(s => (
          <div key={s.label} className="bg-card border border-foreground/[0.08] rounded-xl px-5 py-5">
            <p className={`text-[2.25rem] font-black tabular-nums leading-none ${s.red ? 'text-[#BC0705]' : 'text-foreground'}`}>
              {s.value}
            </p>
            <p className="text-[12px] text-foreground/45 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Department tabs ── */}
      <div className="px-8 pt-6">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveDept('all')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
              activeDept === 'all'
                ? 'bg-foreground text-background'
                : 'text-foreground/50 hover:text-foreground hover:bg-foreground/[0.06]'
            }`}
          >
            All
            <span className={`text-[11px] ${activeDept === 'all' ? 'text-background/60' : 'text-foreground/30'}`}>
              {employees.length}
            </span>
          </button>

          {deptTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDept(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                activeDept === tab.id
                  ? 'bg-foreground text-background'
                  : 'text-foreground/50 hover:text-foreground hover:bg-foreground/[0.06]'
              }`}
            >
              {tab.name}
              <span className={`text-[11px] ${activeDept === tab.id ? 'text-background/60' : 'text-foreground/30'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + filter pills ── */}
      <div className="px-8 pt-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-[420px]">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-foreground/35" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code or position..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-foreground/[0.1] bg-card text-[13px] text-foreground placeholder:text-foreground/35 focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        </div>

        <div className="flex items-center gap-0.5 bg-card border border-foreground/[0.08] rounded-lg p-0.5">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                filter === f.value
                  ? 'bg-foreground text-background'
                  : 'text-foreground/50 hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Employee list ── */}
      <div className="px-8 pt-4 pb-12 space-y-2">
        {filtered.map(emp => {
          const s = empStats.get(emp.id) ?? { missedCount: 0, weekHrs: 0 }
          return (
            <div
              key={emp.id}
              className="bg-card border border-foreground/[0.08] rounded-xl overflow-hidden"
            >
              <EmployeeRow
                emp={{ ...emp, department: deptById.get(emp.departmentId) }}
                missedCount={s.missedCount}
                weekHrs={s.weekHrs}
                todayRec={todayRecByEmp.get(emp.id)}
                onClick={() => setDetailEmp({ ...emp, department: deptById.get(emp.departmentId) })}
              />
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="py-16 text-center text-foreground/35 text-sm bg-card border border-foreground/[0.08] rounded-xl">
            No employees match your filters
          </div>
        )}
      </div>

      <EmployeeDetailSheet
        employee={detailEmp}
        month={month}
        year={year}
        onClose={() => setDetailEmp(null)}
        onAttendanceOverride={fetchRecords}
      />
    </div>
  )
}
