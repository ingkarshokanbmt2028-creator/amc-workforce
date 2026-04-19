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
  const [employees, setEmployees] = useState<Employee[]>([])
  const [activeDept, setActiveDept] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())

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

  // Sync active dept from URL param
  useEffect(() => {
    const deptParam = searchParams.get('dept')
    if (deptParam) {
      setActiveDept(deptParam)
    } else {
      setActiveDept('ALL')
    }
  }, [searchParams])

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">All Departments</h1>
        <p className="text-sm text-white/40 mt-1">
          {loading ? 'Loading...' : `${employees.length} staff across ${departments.length} departments`}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, staff ID, or position..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-amber-500/50"
        />
      </div>

      {/* Department dropdown */}
      <select
        value={activeDept}
        onChange={e => setActiveDept(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/50 min-w-[220px]"
      >
        <option value="ALL">All Departments · {employees.length}</option>
        {departments.map(d => {
          const count = employees.filter(e => e.departmentId === d.id).length
          return <option key={d.id} value={d.id}>{d.name} · {count}</option>
        })}
      </select>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-white/30 text-sm">Loading employees...</div>
      ) : activeDept === 'ALL' ? (
        /* Grouped accordion view */
        <div className="space-y-3">
          {grouped.map(({ dept, members }) => {
            const isOpen = expandedDepts.has(dept.id)
            return (
              <div key={dept.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <button
                  onClick={() => toggleExpand(dept.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">{dept.name}</p>
                      <p className="text-xs text-white/40">{members.length} staff</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-white/[0.04]">
                    <EmployeeTable employees={members} />
                  </div>
                )}
              </div>
            )
          })}
          {grouped.length === 0 && (
            <p className="text-center py-16 text-white/30 text-sm">No employees found</p>
          )}
        </div>
      ) : (
        /* Single department flat view */
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{activeDeptObj?.name}</p>
              <p className="text-xs text-white/40">{filtered.length} staff</p>
            </div>
          </div>
          <EmployeeTable employees={filtered} />
          {filtered.length === 0 && (
            <p className="text-center py-10 text-white/30 text-sm">No employees found</p>
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
        <tr className="border-b border-white/[0.04]">
          <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">Name</th>
          <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">Staff ID</th>
          <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">Position</th>
          <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">Location</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((e, i) => (
          <tr key={e.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
            <td className="px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                  {e.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span className="font-medium text-white/80">{e.name}</span>
              </div>
            </td>
            <td className="px-5 py-3 text-white/50 font-mono text-xs">{e.staffId ?? '—'}</td>
            <td className="px-5 py-3 text-white/50">{e.position ?? '—'}</td>
            <td className="px-5 py-3 text-white/50">{e.location ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
