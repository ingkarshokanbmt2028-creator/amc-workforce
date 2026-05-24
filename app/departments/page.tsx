'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Users, Search, ChevronDown } from 'lucide-react'

interface Employee {
  id: string
  name: string
  staffId: string
  position: string
  location: string
  departmentId: string
}

interface Department {
  id: string
  name: string
  code: string
}

interface AttRecord {
  employeeId: string
  status: string
  clockIn?: string | null
  clockOut?: string | null
  totalHours?: number
  lateMinutes?: number
}

function deptMetrics(
  empIds: string[],
  recByEmp: Map<string, AttRecord>,
  rosteredIds: Set<string>,
) {
  const withRecord  = empIds.filter(id => recByEmp.has(id))
  const clockedIn   = withRecord.filter(id => recByEmp.get(id)?.clockIn)
  const onTime      = clockedIn.filter(id => recByEmp.get(id)?.status !== 'LATE')
  const overtime    = clockedIn.filter(id => (recByEmp.get(id)?.totalHours ?? 0) > 9)
  const rostered    = empIds.filter(id => rosteredIds.has(id))
  const adhered     = rostered.filter(id => recByEmp.get(id)?.clockIn)
  const absent      = withRecord.filter(id => recByEmp.get(id)?.status === 'ABSENT' || !recByEmp.get(id)?.clockIn)

  const punctuality    = clockedIn.length > 0   ? Math.round((onTime.length / clockedIn.length) * 100) : null
  const overtimeRate   = clockedIn.length > 0   ? Math.round((overtime.length / clockedIn.length) * 100) : null
  const shiftAdherence = rostered.length > 0    ? Math.round((adhered.length / rostered.length) * 100) : null
  const absenteeism    = withRecord.length > 0  ? Math.round((absent.length / withRecord.length) * 100) : null

  return { punctuality, overtimeRate, shiftAdherence, absenteeism }
}

const METRIC_CONFIG = [
  {
    key: 'punctuality' as const,
    label: 'Punctuality rate',
    description: 'On-time clock-ins as a share of all clock-ins',
    explanation: 'Counts a clock-in as punctual if it happened before or at the scheduled shift start. Late arrivals are present, but not punctual.',
    target: 90,
    higherIsBetter: true,
  },
  {
    key: 'overtimeRate' as const,
    label: 'Overtime rate',
    description: 'Share of staff working more than 9 hours in a shift',
    explanation: 'Counts any employee clocked in for more than 9 hours as overtime. High overtime may indicate understaffing or scheduling gaps.',
    target: 20,
    higherIsBetter: false,
  },
  {
    key: 'shiftAdherence' as const,
    label: 'Shift adherence',
    description: 'Rostered staff who actually clocked in, as a share of all rostered staff',
    explanation: 'Measures how many scheduled employees showed up. A low adherence rate often signals no-shows or roster gaps.',
    target: 95,
    higherIsBetter: true,
  },
  {
    key: 'absenteeism' as const,
    label: 'Absenteeism rate',
    description: 'Share of staff who were absent or did not clock in today',
    explanation: 'Counts staff with no clock-in or an ABSENT status as absent. A high absenteeism rate may indicate scheduling, wellbeing, or management issues.',
    target: 10,
    higherIsBetter: false,
  },
]

function MetricBlock({
  label, description, explanation, value, target, higherIsBetter,
}: {
  label: string; description: string; explanation: string
  value: number | null; target: number; higherIsBetter: boolean
}) {
  const atTarget = value === null ? null : higherIsBetter ? value >= target : value <= target
  const statusLabel  = atTarget === null ? null : atTarget ? 'On target' : 'Below target'
  const statusColor  = atTarget === null ? '' : atTarget ? 'text-green-500' : 'text-red-500'
  const numberColor  = atTarget === null
    ? 'text-foreground'
    : atTarget ? 'text-green-500' : 'text-red-600'

  return (
    <div className="py-8 border-b border-foreground/10 last:border-0">
      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40 mb-2">Metrics</p>
      <h2 className="text-3xl font-black text-foreground tracking-tight">{label}</h2>
      <p className="text-sm text-foreground/50 mt-1">{description}</p>

      <div className="mt-6 flex items-end gap-4">
        {value !== null ? (
          <>
            <div className="flex items-end gap-1 leading-none">
              <span className={`text-8xl font-black leading-none tracking-tighter ${numberColor}`}>{value}</span>
              <span className="text-4xl font-bold text-foreground/30 mb-2">%</span>
            </div>
            {statusLabel && (
              <div className="mb-3 flex items-center gap-1.5 text-xs">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${atTarget ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
                <span className="text-foreground/30">· Target {higherIsBetter ? '≥' : '≤'}{target}%</span>
              </div>
            )}
          </>
        ) : (
          <span className="text-2xl font-bold text-foreground/20">No data</span>
        )}
      </div>

      <p className="mt-4 text-sm text-foreground/40 max-w-xl leading-relaxed">{explanation}</p>
    </div>
  )
}

function DepartmentsPageInner() {
  const searchParams = useSearchParams()
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<AttRecord[]>([])
  const [rosteredIds, setRosteredIds] = useState<Set<string>>(new Set())
  const [activeDept, setActiveDept] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', staffId: '', departmentId: '', position: '', employeeType: 'PERMANENT', location: 'ACCRA', expectedMonthlyHours: '180' })
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const month = parseInt(today.slice(5, 7))
  const year  = parseInt(today.slice(0, 4))

  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
      fetch(`/api/attendance?date=${today}`).then(r => r.json()),
      fetch(`/api/roster?month=${month}&year=${year}`).then(r => r.ok ? r.json() : []),
    ]).then(([depts, emps, attData, rosters]) => {
      setDepartments(depts)
      setEmployees(emps)
      setAttendance(attData.attendance ?? [])

      const ids = new Set<string>()
      for (const roster of (rosters as { slots: { employeeId: string; date: string }[] }[])) {
        for (const slot of roster.slots) {
          if (slot.date.slice(0, 10) === today) ids.add(slot.employeeId)
        }
      }
      setRosteredIds(ids)
      setLoading(false)
    })
  }, [today, month, year])

  // Sync active dept from URL param
  useEffect(() => {
    const deptParam = searchParams.get('dept')
    if (deptParam) {
      setActiveDept(deptParam)
    } else {
      setActiveDept('ALL')
    }
  }, [searchParams])

  const recByEmp = useMemo(() => new Map(attendance.map(r => [r.employeeId, r])), [attendance])

  const filtered = employees.filter(e => {
    const matchDept = activeDept === 'ALL' || e.departmentId === activeDept
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.staffId?.toLowerCase().includes(search.toLowerCase()) ||
      e.position?.toLowerCase().includes(search.toLowerCase())
    return matchDept && matchSearch
  })

  // Group by department for ALL view
  const grouped = departments.map(d => ({
    dept: d,
    members: filtered.filter(e => e.departmentId === d.id),
  })).filter(g => g.members.length > 0)

  const toggleExpand = (id: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const activeDeptObj = departments.find(d => d.id === activeDept)

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!addForm.name || !addForm.staffId || !addForm.departmentId || !addForm.position) {
      setAddError('Name, Staff ID, Department, and Position are required.')
      return
    }
    setAddLoading(true)
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    setAddLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setAddError(data.error ?? 'Failed to create employee')
      return
    }
    const newEmp = await res.json()
    setEmployees(prev => [...prev, newEmp].sort((a, b) => a.name.localeCompare(b.name)))
    setShowAddModal(false)
    setAddForm({ name: '', staffId: '', departmentId: '', position: '', employeeType: 'PERMANENT', location: 'ACCRA', expectedMonthlyHours: '180' })
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Departments</h1>
          <p className="text-sm text-foreground/50 mt-1">
            {loading ? 'Loading...' : `${employees.length} staff across ${departments.length} departments`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-foreground/15 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-foreground/10 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Add Employee</h2>
              <button onClick={() => setShowAddModal(false)} className="text-foreground/40 hover:text-foreground/70 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="px-6 py-5 space-y-4">
              {addError && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{addError}</p>}
              {[
                { key: 'name',     label: 'Full Name',  placeholder: 'e.g. Kofi Mensah' },
                { key: 'staffId',  label: 'Staff ID',   placeholder: 'e.g. AMC-0042' },
                { key: 'position', label: 'Position',   placeholder: 'e.g. Radiographer' },
                { key: 'location', label: 'Location',   placeholder: 'ACCRA' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">{f.label}</label>
                  <input
                    value={addForm[f.key as keyof typeof addForm]}
                    onChange={ev => setAddForm(p => ({ ...p, [f.key]: ev.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-foreground/15 bg-background text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Department</label>
                <select
                  value={addForm.departmentId}
                  onChange={ev => setAddForm(p => ({ ...p, departmentId: ev.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-foreground/15 bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                >
                  <option value="">Select department…</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Employee Type</label>
                <select
                  value={addForm.employeeType}
                  onChange={ev => setAddForm(p => ({ ...p, employeeType: ev.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-foreground/15 bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                >
                  <option value="PERMANENT">Permanent</option>
                  <option value="LOCUM">Locum</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Expected Monthly Hours</label>
                <input
                  type="number"
                  value={addForm.expectedMonthlyHours}
                  onChange={ev => setAddForm(p => ({ ...p, expectedMonthlyHours: ev.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-foreground/15 bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-foreground/15 text-sm text-foreground/60 hover:text-foreground hover:border-foreground/25 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
                >
                  {addLoading ? 'Adding…' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, staff ID, or position..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-foreground/12 text-sm text-foreground placeholder:text-foreground/30 outline-none focus:ring-1 focus:ring-amber-500/50"
        />
      </div>

      {/* Department dropdown */}
      <select
        value={activeDept}
        onChange={e => setActiveDept(e.target.value)}
        className="rounded-lg border border-foreground/15 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 min-w-[220px]"
      >
        <option value="ALL">All Departments · {employees.length}</option>
        {departments.map(d => {
          const count = employees.filter(e => e.departmentId === d.id).length
          return <option key={d.id} value={d.id}>{d.name} · {count}</option>
        })}
      </select>

      {/* Metrics section */}
      {!loading && (() => {
        const scopeIds = activeDept === 'ALL'
          ? employees.map(e => e.id)
          : employees.filter(e => e.departmentId === activeDept).map(e => e.id)
        const m = deptMetrics(scopeIds, recByEmp, rosteredIds)
        return (
          <div className="rounded-xl border border-foreground/10 bg-card px-6 pb-2">
            {METRIC_CONFIG.map(cfg => (
              <MetricBlock
                key={cfg.key}
                label={cfg.label}
                description={cfg.description}
                explanation={cfg.explanation}
                value={m[cfg.key]}
                target={cfg.target}
                higherIsBetter={cfg.higherIsBetter}
              />
            ))}
          </div>
        )
      })()}

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-foreground/40 text-sm">Loading employees...</div>
      ) : activeDept === 'ALL' ? (
        /* Grouped accordion view */
        <div className="space-y-3">
          {grouped.map(({ dept, members }) => {
            const isOpen = expandedDepts.has(dept.id)
            const m = deptMetrics(members.map(e => e.id), recByEmp, rosteredIds)
            return (
              <div key={dept.id} className="rounded-xl border border-foreground/10 bg-card overflow-hidden">
                <button
                  onClick={() => toggleExpand(dept.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{dept.name}</p>
                      <p className="text-xs text-foreground/50">{members.length} staff</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mr-1">
                    {m.punctuality !== null && (
                      <div className="text-center">
                        <p className="text-[9px] text-foreground/40 uppercase tracking-wide">Punctuality</p>
                        <p className={`text-sm font-black ${m.punctuality >= 90 ? 'text-green-500' : 'text-red-500'}`}>{m.punctuality}%</p>
                      </div>
                    )}
                    {m.overtimeRate !== null && (
                      <div className="text-center">
                        <p className="text-[9px] text-foreground/40 uppercase tracking-wide">Overtime</p>
                        <p className={`text-sm font-black ${m.overtimeRate <= 20 ? 'text-green-500' : 'text-red-500'}`}>{m.overtimeRate}%</p>
                      </div>
                    )}
                    {m.shiftAdherence !== null && (
                      <div className="text-center">
                        <p className="text-[9px] text-foreground/40 uppercase tracking-wide">Adherence</p>
                        <p className={`text-sm font-black ${m.shiftAdherence >= 95 ? 'text-green-500' : 'text-red-500'}`}>{m.shiftAdherence}%</p>
                      </div>
                    )}
                    {m.absenteeism !== null && (
                      <div className="text-center">
                        <p className="text-[9px] text-foreground/40 uppercase tracking-wide">Absent</p>
                        <p className={`text-sm font-black ${m.absenteeism <= 10 ? 'text-green-500' : 'text-red-500'}`}>{m.absenteeism}%</p>
                      </div>
                    )}
                    <ChevronDown className={`h-4 w-4 text-foreground/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-foreground/8">
                    <EmployeeTable employees={members} />
                  </div>
                )}
              </div>
            )
          })}
          {grouped.length === 0 && (
            <p className="text-center py-16 text-foreground/40 text-sm">No employees found</p>
          )}
        </div>
      ) : (
        /* Single department flat view */
        <div className="rounded-xl border border-foreground/10 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-foreground/8 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{activeDeptObj?.name}</p>
              <p className="text-xs text-foreground/50">{filtered.length} staff</p>
            </div>
          </div>
          <EmployeeTable employees={filtered} />
          {filtered.length === 0 && (
            <p className="text-center py-10 text-foreground/40 text-sm">No employees found</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function DepartmentsPage() {
  return (
    <Suspense>
      <DepartmentsPageInner />
    </Suspense>
  )
}

function EmployeeTable({ employees }: { employees: Employee[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-foreground/8">
          <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">Name</th>
          <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">Staff ID</th>
          <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">Position</th>
          <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">Location</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((e, i) => (
          <tr key={e.id} className={`border-b border-foreground/6 hover:bg-foreground/5 ${i % 2 === 0 ? '' : 'bg-foreground/[0.02]'}`}>
            <td className="px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                  {e.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span className="font-medium text-foreground/80">{e.name}</span>
              </div>
            </td>
            <td className="px-5 py-3 text-foreground/55 font-mono text-xs">{e.staffId ?? '—'}</td>
            <td className="px-5 py-3 text-foreground/55">{e.position ?? '—'}</td>
            <td className="px-5 py-3 text-foreground/55">{e.location ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
