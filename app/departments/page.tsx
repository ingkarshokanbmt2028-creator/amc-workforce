'use client'

import { useEffect, useState, Suspense } from 'react'
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

function DepartmentsPageInner() {
  const searchParams = useSearchParams()
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees]     = useState<Employee[]>([])
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal]   = useState(false)
  const [addForm, setAddForm] = useState({ name: '', staffId: '', departmentId: '', position: '', employeeType: 'PERMANENT', location: 'ACCRA', expectedMonthlyHours: '180' })
  const [addError, setAddError]   = useState('')
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]).then(([depts, emps]) => {
      setDepartments(depts)
      setEmployees(emps)
      setLoading(false)
    })
  }, [])

  // Auto-expand dept from URL param
  useEffect(() => {
    const deptParam = searchParams.get('dept')
    if (deptParam) setExpandedDepts(new Set([deptParam]))
  }, [searchParams])

  const filtered = employees.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.name.toLowerCase().includes(q) ||
      e.staffId?.toLowerCase().includes(q) ||
      e.position?.toLowerCase().includes(q)
  })

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
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Departments</h1>
          <p className="text-sm text-foreground/50 mt-1">
            {loading ? 'Loading…' : `${employees.length} staff across ${departments.length} departments`}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, staff ID, or position…"
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-foreground/12 text-sm text-foreground placeholder:text-foreground/30 outline-none focus:ring-1 focus:ring-amber-500/50"
        />
      </div>

      {/* Department accordion */}
      {loading ? (
        <div className="text-center py-16 text-foreground/40 text-sm">Loading employees…</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ dept, members }) => {
            const isOpen = expandedDepts.has(dept.id)
            return (
              <div key={dept.id} className="rounded-xl border border-foreground/10 bg-card overflow-hidden">
                <button
                  onClick={() => toggleExpand(dept.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-foreground/5 transition-colors"
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
                  <ChevronDown className={`h-4 w-4 text-foreground/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
      )}

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
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-foreground/15 text-sm text-foreground/60 hover:text-foreground hover:border-foreground/25 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors">
                  {addLoading ? 'Adding…' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DepartmentsPage() {
  return <Suspense><DepartmentsPageInner /></Suspense>
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
