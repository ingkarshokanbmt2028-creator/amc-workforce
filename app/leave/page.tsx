'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, ChevronRight, ChevronDown } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaveEmployee {
  idx: number
  id: string
  staffId: string
  name: string
  position: string
  department: string
  departmentCode: string
  confirmationStatus: string
  annualEntitlement: number
  annualCarryForward: number
  annualTaken: number
  annualRemaining: number
  holidayCarryForward: number
  sickEntitlement: number
  sickTaken: number
  sickRemaining: number
}

interface LeaveStats {
  total: number
  confirmed: number
  onProbation: number
  sickYTD: number
  sickAffected: number
  carryForward: number
  pendingApprovals: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  sub,
  accent,
}: {
  value: number | string
  label: string
  sub: string
  accent?: boolean
}) {
  return (
    <div className="bg-card border border-foreground/[0.08] rounded-xl p-5 flex-1 min-w-0">
      <p
        className={`text-[2.4rem] font-black leading-none tabular-nums tracking-tight ${
          accent ? 'text-amber-500' : 'text-foreground'
        }`}
      >
        {value}
      </p>
      <p className="text-[13px] text-foreground/55 mt-2.5 font-medium">{label}</p>
      <p className="text-[11px] text-foreground/35 mt-0.5">{sub}</p>
    </div>
  )
}

function ConfirmedBadge() {
  return (
    <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-green-100 text-green-700 border border-green-200">
      Confirmed
    </span>
  )
}

function ProbationBadge() {
  return (
    <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
      Probation
    </span>
  )
}

// ── Legend data ───────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  { label: 'Annual leave',        cls: 'bg-[#1E3A5F] text-white' },
  { label: 'Sick leave',          cls: 'bg-green-600 text-white' },
  { label: 'Maternity leave',     cls: 'bg-pink-500 text-white' },
  { label: 'Paternity leave',     cls: 'bg-indigo-500 text-white' },
  { label: 'Study leave',         cls: 'bg-amber-400 text-amber-900' },
  { label: 'Compassionate leave', cls: 'bg-red-500 text-white' },
  { label: 'Casual leave',        cls: 'bg-foreground/20 text-foreground/70' },
]

const STATUS_TYPES = [
  { label: 'Approved',   cls: 'bg-green-100 text-green-700 border border-green-200' },
  { label: 'Pending',    cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  { label: 'Rejected',   cls: 'bg-red-100 text-red-600 border border-red-200' },
  { label: 'Cancelled',  cls: 'bg-foreground/[0.06] text-foreground/50 border border-foreground/10' },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeavePage() {
  const [employees, setEmployees] = useState<LeaveEmployee[]>([])
  const [stats, setStats]         = useState<LeaveStats | null>(null)
  const [loading, setLoading]     = useState(true)

  const [tab, setTab]             = useState<'balances' | 'records'>('balances')
  const [dept, setDept]           = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const [search, setSearch]       = useState('')
  const [showAll, setShowAll]     = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/leave')
      .then(r => r.json())
      .then(data => {
        setEmployees(data.employees ?? [])
        setStats(data.stats ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // ── Derived dept list ─────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of employees) {
      if (!seen.has(e.departmentCode)) seen.set(e.departmentCode, e.department)
    }
    return Array.from(seen.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [employees])

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees.filter(e => {
      if (dept && e.departmentCode !== dept) return false
      if (staffFilter === 'confirmed' && e.confirmationStatus !== 'CONFIRMED') return false
      if (staffFilter === 'probation' && e.confirmationStatus !== 'PROBATION') return false
      if (q) {
        if (
          !e.name.toLowerCase().includes(q) &&
          !e.staffId.toLowerCase().includes(q) &&
          !e.position.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [employees, dept, staffFilter, search])

  const displayed = showAll ? filtered : filtered.slice(0, 10)

  const total      = stats?.total      ?? employees.length
  const onProbation = stats?.onProbation ?? 0
  const confirmed  = stats?.confirmed  ?? total
  const sickYTD    = stats?.sickYTD    ?? 0
  const sickAffected = stats?.sickAffected ?? 0
  const carryForward = stats?.carryForward ?? 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="p-8 max-w-[1400px]">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="mb-7">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40 mb-2">
            HR
          </p>
          <h1 className="text-[2.6rem] font-black text-foreground tracking-tight leading-none">
            Leave Management
          </h1>
          <p className="text-[13px] text-foreground/45 mt-2">
            2026 &middot; {total} employees &middot; {onProbation} on probation
          </p>
        </div>

        {/* ── Stat cards ────────────────────────────────────────────────────── */}
        <div className="flex gap-4 mb-7">
          <StatCard
            value={total}
            label="Total employees"
            sub={`${confirmed} confirmed staff`}
          />
          <StatCard
            value={sickYTD}
            label="Sick days taken YTD"
            sub={`${sickAffected} employees affected`}
            accent
          />
          <StatCard
            value={stats?.pendingApprovals ?? 0}
            label="Pending approvals"
            sub="Annual &amp; study leave"
            accent
          />
          <StatCard
            value={carryForward}
            label="Carry-forward days"
            sub="Accumulated from 2025"
          />
        </div>

        {/* ── Tabs + employee count ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setTab('balances')}
            className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[13px] font-medium transition-colors ${
              tab === 'balances'
                ? 'bg-foreground text-background'
                : 'bg-card border border-foreground/[0.12] text-foreground/65 hover:text-foreground hover:border-foreground/20'
            }`}
          >
            {/* balance / list icon */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
              <rect x="2" y="3" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.8"/>
              <rect x="2" y="7" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.8"/>
              <rect x="2" y="11" width="7" height="1.5" rx="0.75" fill="currentColor" opacity="0.8"/>
            </svg>
            Leave Balances
          </button>

          <button
            onClick={() => setTab('records')}
            className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[13px] font-medium transition-colors ${
              tab === 'records'
                ? 'bg-foreground text-background'
                : 'bg-card border border-foreground/[0.12] text-foreground/65 hover:text-foreground hover:border-foreground/20'
            }`}
          >
            {/* calendar icon */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
              <rect x="2" y="3.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
              <path d="M5 2v3M11 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M2 7h12" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            Leave Records
          </button>

          <span className="ml-1 text-[13px] text-foreground/40">
            {total} employees
          </span>
        </div>

        {/* ── Leave Balances tab ──────────────────────────────────────────────── */}
        {tab === 'balances' && (
          <>
            {/* ── Filters ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-4">
              {/* Search */}
              <div className="relative" style={{ minWidth: 280 }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-foreground/35 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowAll(false) }}
                  placeholder="Search name, code or position..."
                  className="w-full pl-9 pr-4 py-[7px] text-[13px] bg-card border border-foreground/[0.12] rounded-lg focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-foreground/35"
                />
              </div>

              {/* Department */}
              <div className="relative">
                <select
                  value={dept}
                  onChange={e => { setDept(e.target.value); setShowAll(false) }}
                  className="appearance-none pl-3 pr-8 py-[7px] text-[13px] bg-card border border-foreground/[0.12] rounded-lg focus:outline-none cursor-pointer text-foreground/75 hover:border-foreground/20"
                >
                  <option value="">All departments</option>
                  {departments.map(d => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40 pointer-events-none" />
              </div>

              {/* Staff type */}
              <div className="relative">
                <select
                  value={staffFilter}
                  onChange={e => { setStaffFilter(e.target.value); setShowAll(false) }}
                  className="appearance-none pl-3 pr-8 py-[7px] text-[13px] bg-card border border-foreground/[0.12] rounded-lg focus:outline-none cursor-pointer text-foreground/75 hover:border-foreground/20"
                >
                  <option value="">All staff</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="probation">On probation</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40 pointer-events-none" />
              </div>
            </div>

            {/* ── Table ───────────────────────────────────────────────────── */}
            <div className="bg-card border border-foreground/[0.08] rounded-xl overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-[13px] text-foreground/35">Loading…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-foreground/[0.07]">
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold w-10">
                          #
                        </th>
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold">
                          Department
                        </th>
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold">
                          Status
                        </th>
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold text-center whitespace-nowrap">
                          Annual<br />Entitlement
                        </th>
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold text-center whitespace-nowrap">
                          Carry<br />Forward
                        </th>
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold text-center whitespace-nowrap">
                          Annual<br />Taken
                        </th>
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold text-center whitespace-nowrap">
                          Annual<br />Remaining
                        </th>
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold text-center whitespace-nowrap">
                          Sick<br />Entitlement
                        </th>
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold text-center whitespace-nowrap">
                          Sick<br />Taken
                        </th>
                        <th className="px-4 py-3 text-[10px] tracking-[0.13em] uppercase text-foreground/40 font-semibold text-center whitespace-nowrap">
                          Sick<br />Remaining
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-12 text-center text-[13px] text-foreground/35">
                            No employees match your filters.
                          </td>
                        </tr>
                      ) : (
                        displayed.map((emp, i) => (
                          <tr
                            key={emp.id}
                            className={`group hover:bg-foreground/[0.018] transition-colors ${
                              i < displayed.length - 1 ? 'border-b border-foreground/[0.055]' : ''
                            }`}
                          >
                            {/* # */}
                            <td className="px-4 py-4 text-[12px] text-foreground/35 font-medium">
                              {emp.idx}
                            </td>

                            {/* Employee */}
                            <td className="px-4 py-4">
                              <p className="text-[13px] font-semibold text-foreground leading-tight">
                                {toTitleCase(emp.name)}
                              </p>
                              <p className="text-[11px] text-foreground/45 mt-[3px]">
                                {emp.staffId}
                              </p>
                              <p className="text-[11px] text-foreground/35 mt-[1px]">
                                {toTitleCase(emp.position)}
                              </p>
                            </td>

                            {/* Department */}
                            <td className="px-4 py-4 text-[13px] text-foreground/65">
                              {emp.department}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-4">
                              {emp.confirmationStatus === 'PROBATION'
                                ? <ProbationBadge />
                                : <ConfirmedBadge />
                              }
                            </td>

                            {/* Annual Entitlement */}
                            <td className="px-4 py-4 text-[13px] text-center tabular-nums text-foreground/80">
                              {emp.annualEntitlement || 0}
                            </td>

                            {/* Carry Forward */}
                            <td className="px-4 py-4 text-[13px] text-center tabular-nums text-foreground/35">
                              {emp.annualCarryForward > 0 ? emp.annualCarryForward : '—'}
                            </td>

                            {/* Annual Taken */}
                            <td className="px-4 py-4 text-[13px] text-center tabular-nums text-foreground/80">
                              {emp.annualTaken}
                            </td>

                            {/* Annual Remaining */}
                            <td className="px-4 py-4 text-[13px] text-center tabular-nums font-semibold text-foreground">
                              {emp.annualRemaining}
                            </td>

                            {/* Sick Entitlement */}
                            <td className="px-4 py-4 text-[13px] text-center tabular-nums text-foreground/80">
                              {emp.sickEntitlement}
                            </td>

                            {/* Sick Taken */}
                            <td className={`px-4 py-4 text-[13px] text-center tabular-nums font-semibold ${
                              emp.sickTaken > 0 ? 'text-red-500' : 'text-foreground/80'
                            }`}>
                              {emp.sickTaken}
                            </td>

                            {/* Sick Remaining */}
                            <td className={`px-4 py-4 text-[13px] text-center tabular-nums ${
                              emp.sickTaken > 0
                                ? 'font-semibold text-foreground'
                                : 'text-foreground/80'
                            }`}>
                              {emp.sickRemaining}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table footer */}
              {!loading && filtered.length > 0 && (
                <div className="px-4 py-3.5 border-t border-foreground/[0.055] flex items-center justify-between">
                  <p className="text-[12px] text-foreground/40">
                    Showing {displayed.length} of {filtered.length} employees
                  </p>
                  {!showAll && filtered.length > 10 && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="flex items-center gap-0.5 text-[12px] text-foreground/55 hover:text-foreground transition-colors"
                    >
                      See all {filtered.length} employees
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Legend ──────────────────────────────────────────────────── */}
            <div className="mt-6">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-foreground/35 mb-3">
                Legend
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {LEAVE_TYPES.map(t => (
                  <span
                    key={t.label}
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium ${t.cls}`}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_TYPES.map(t => (
                  <span
                    key={t.label}
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium ${t.cls}`}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Leave Records tab ─────────────────────────────────────────────── */}
        {tab === 'records' && (
          <div className="bg-card border border-foreground/[0.08] rounded-xl p-14 text-center">
            <svg
              className="mx-auto mb-4 text-foreground/20"
              width="40" height="40" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
            </svg>
            <p className="text-[14px] font-semibold text-foreground/50 mb-1">No leave records yet</p>
            <p className="text-[12px] text-foreground/35">
              Leave requests will appear here once staff submit their applications.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
