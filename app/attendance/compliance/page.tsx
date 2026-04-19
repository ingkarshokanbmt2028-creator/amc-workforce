'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ComplianceRow, ComplianceStatus } from '@/app/api/attendance/compliance/route'

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const STATUS_META: Record<ComplianceStatus, { label: string; short: string; bg: string; text: string; border: string }> = {
  COMPLIANT:      { label: 'Compliant',       short: '✓',  bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20' },
  LATE:           { label: 'Late',             short: 'L',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20' },
  NO_SHOW:        { label: 'No Show',          short: '✗',  bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20'   },
  OFF_DAY:        { label: 'Off Day',          short: 'O',  bg: 'bg-white/5',       text: 'text-white/30',   border: 'border-white/5'      },
  ON_LEAVE:       { label: 'On Leave',         short: 'AL', bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20'  },
  LEAVE_CONFLICT: { label: 'Leave Conflict',   short: '!',  bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20'},
  UNSCHEDULED:    { label: 'Unscheduled',      short: 'U',  bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20'},
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

interface EmployeeSummary {
  employeeId: string
  employeeName: string
  staffId: string
  department: string
  departmentId: string
  totalWorking: number
  compliant: number
  late: number
  noShow: number
  onLeave: number
  offDays: number
  complianceRate: number
  totalLateMinutes: number
  totalVarianceHours: number
  rows: ComplianceRow[]
}

function buildSummaries(rows: ComplianceRow[]): EmployeeSummary[] {
  const map = new Map<string, EmployeeSummary>()

  for (const r of rows) {
    if (!map.has(r.employeeId)) {
      map.set(r.employeeId, {
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        staffId: r.staffId,
        department: r.department,
        departmentId: r.departmentId,
        totalWorking: 0, compliant: 0, late: 0, noShow: 0, onLeave: 0, offDays: 0,
        complianceRate: 0, totalLateMinutes: 0, totalVarianceHours: 0,
        rows: [],
      })
    }
    const s = map.get(r.employeeId)!
    s.rows.push(r)
    if (r.compliance === 'COMPLIANT') { s.compliant++; s.totalWorking++ }
    else if (r.compliance === 'LATE')  { s.late++;      s.totalWorking++; s.totalLateMinutes += r.lateMinutes }
    else if (r.compliance === 'NO_SHOW') { s.noShow++;  s.totalWorking++ }
    else if (r.compliance === 'ON_LEAVE') s.onLeave++
    else if (r.compliance === 'OFF_DAY')  s.offDays++
    s.totalVarianceHours += r.varianceHours
  }

  for (const s of map.values()) {
    s.complianceRate = s.totalWorking > 0
      ? Math.round(((s.compliant + s.late) / s.totalWorking) * 100)
      : 100
    s.totalVarianceHours = Math.round(s.totalVarianceHours * 10) / 10
  }

  return Array.from(map.values()).sort((a, b) => a.complianceRate - b.complianceRate)
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ComplianceStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.bg} ${m.text} ${m.border}`}>
      {m.label}
    </span>
  )
}

// ── Compliance Rate Bar ───────────────────────────────────────────────────────

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 90 ? '#22c55e' : rate >= 75 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-9 text-right" style={{ color }}>{rate}%</span>
    </div>
  )
}

// ── Day Breakdown Table ───────────────────────────────────────────────────────

function DayBreakdown({ summary }: { summary: EmployeeSummary }) {
  const sortedRows = [...summary.rows].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="mt-3 rounded-xl border border-white/[0.06] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-white/[0.03] border-b border-white/[0.06]">
            <th className="px-4 py-2 text-left font-semibold text-white/40">Date</th>
            <th className="px-3 py-2 text-left font-semibold text-white/40">Rostered</th>
            <th className="px-3 py-2 text-left font-semibold text-white/40">Scheduled</th>
            <th className="px-3 py-2 text-left font-semibold text-white/40">Clock In</th>
            <th className="px-3 py-2 text-left font-semibold text-white/40">Clock Out</th>
            <th className="px-3 py-2 text-right font-semibold text-white/40">Hrs</th>
            <th className="px-3 py-2 text-right font-semibold text-white/40">Late</th>
            <th className="px-3 py-2 text-left font-semibold text-white/40">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r, i) => {
            const m = STATUS_META[r.compliance]
            const isOff = r.compliance === 'OFF_DAY' || r.compliance === 'ON_LEAVE'
            return (
              <tr
                key={`${r.date}-${i}`}
                className={`border-t border-white/[0.04] ${isOff ? 'opacity-40' : ''} ${
                  r.compliance === 'NO_SHOW' ? 'bg-red-500/[0.04]' :
                  r.compliance === 'LATE'    ? 'bg-amber-500/[0.04]' : ''
                }`}
              >
                <td className="px-4 py-2 font-medium text-white/70">{fmtDate(r.date)}</td>
                <td className="px-3 py-2">
                  {r.rosterShift ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/60">
                      {r.rosterShift.replace(/_/g, ' ')}
                    </span>
                  ) : <span className="text-white/20">—</span>}
                </td>
                <td className="px-3 py-2 font-mono text-white/50">
                  {r.scheduledStart && r.scheduledEnd
                    ? `${r.scheduledStart}–${r.scheduledEnd}`
                    : '—'}
                </td>
                <td className={`px-3 py-2 font-mono ${r.clockIn ? (r.lateMinutes > 0 ? 'text-amber-400' : 'text-green-400') : 'text-red-400/60'}`}>
                  {fmtTime(r.clockIn)}
                </td>
                <td className={`px-3 py-2 font-mono ${r.clockOut ? 'text-white/50' : r.clockIn ? 'text-amber-400/60' : 'text-white/20'}`}>
                  {fmtTime(r.clockOut)}
                </td>
                <td className="px-3 py-2 text-right text-white/50">
                  {r.actualHours > 0 ? `${r.actualHours.toFixed(1)}h` : '—'}
                </td>
                <td className={`px-3 py-2 text-right ${r.lateMinutes > 0 ? 'text-amber-400 font-semibold' : 'text-white/20'}`}>
                  {r.lateMinutes > 0 ? `+${r.lateMinutes}m` : '—'}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.compliance} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Employee Card ─────────────────────────────────────────────────────────────

function EmployeeCard({ summary, expanded, onToggle }: {
  summary: EmployeeSummary
  expanded: boolean
  onToggle: () => void
}) {
  const rateColor = summary.complianceRate >= 90 ? 'text-green-400' : summary.complianceRate >= 75 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className={`rounded-xl border transition-all ${
      expanded ? 'border-white/10 bg-white/[0.03]' : 'border-white/[0.06] hover:border-white/[0.09] hover:bg-white/[0.02]'
    }`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-4 text-left"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60 flex-shrink-0">
          {summary.employeeName.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>

        {/* Name + dept */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{summary.employeeName}</p>
          <p className="text-xs text-white/40 truncate">{summary.staffId} · {summary.department}</p>
        </div>

        {/* Compliance rate */}
        <div className="hidden md:block w-36">
          <RateBar rate={summary.complianceRate} />
        </div>

        {/* Mini stats */}
        <div className="hidden lg:flex items-center gap-5 flex-shrink-0">
          <div className="text-center">
            <p className="text-xs font-bold text-white/70">{summary.totalWorking}</p>
            <p className="text-[10px] text-white/30">Rostered</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-green-400">{summary.compliant}</p>
            <p className="text-[10px] text-white/30">On Time</p>
          </div>
          <div className="text-center">
            <p className={`text-xs font-bold ${summary.late > 0 ? 'text-amber-400' : 'text-white/20'}`}>{summary.late}</p>
            <p className="text-[10px] text-white/30">Late</p>
          </div>
          <div className="text-center">
            <p className={`text-xs font-bold ${summary.noShow > 0 ? 'text-red-400' : 'text-white/20'}`}>{summary.noShow}</p>
            <p className="text-[10px] text-white/30">No Show</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-white/30">{summary.onLeave}</p>
            <p className="text-[10px] text-white/30">Leave</p>
          </div>
          {summary.totalLateMinutes > 0 && (
            <div className="text-center">
              <p className="text-xs font-bold text-amber-400">{summary.totalLateMinutes}m</p>
              <p className="text-[10px] text-white/30">Total Late</p>
            </div>
          )}
        </div>

        {/* Expand chevron */}
        <svg
          className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <DayBreakdown summary={summary} />
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

interface Department { id: string; name: string; code: string }

export default function CompliancePage() {
  const now = new Date()
  const [month, setMonth]     = useState(now.getMonth() + 1)
  const [year, setYear]       = useState(now.getFullYear())
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [search, setSearch]   = useState('')
  const [rows, setRows]       = useState<ComplianceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [sortBy, setSortBy]   = useState<'rate_asc' | 'rate_desc' | 'name' | 'noshows'>('rate_asc')
  const [notifying, setNotifying] = useState(false)

  async function handleNotifyHR() {
    setNotifying(true)
    try {
      const res = await fetch('/api/notify/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      })
      const json = await res.json()
      if (res.ok) alert(`Email sent to HR: ${json.message}`)
      else alert(`Failed: ${json.error}`)
    } catch { alert('Failed to send notification') }
    finally { setNotifying(false) }
  }

  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(setDepartments)
  }, [])

  const fetchCompliance = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) })
      if (deptFilter !== 'all') params.set('departmentId', deptFilter)
      const res = await fetch(`/api/attendance/compliance?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [month, year, deptFilter])

  useEffect(() => { fetchCompliance() }, [fetchCompliance])

  const summaries = useMemo(() => buildSummaries(rows), [rows])

  // Overall stats
  const overall = useMemo(() => {
    const working = rows.filter(r => r.compliance !== 'OFF_DAY' && r.compliance !== 'ON_LEAVE')
    const compliant = working.filter(r => r.compliance === 'COMPLIANT' || r.compliance === 'LATE').length
    const noShow  = working.filter(r => r.compliance === 'NO_SHOW').length
    const late    = working.filter(r => r.compliance === 'LATE').length
    const onLeave = rows.filter(r => r.compliance === 'ON_LEAVE').length
    const rate    = working.length > 0 ? Math.round((compliant / working.length) * 100) : 0
    return { working: working.length, compliant, noShow, late, onLeave, rate }
  }, [rows])

  const filtered = useMemo(() => {
    let list = summaries
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.employeeName.toLowerCase().includes(q) || s.staffId.toLowerCase().includes(q))
    }
    switch (sortBy) {
      case 'rate_desc': return [...list].sort((a, b) => b.complianceRate - a.complianceRate)
      case 'name':      return [...list].sort((a, b) => a.employeeName.localeCompare(b.employeeName))
      case 'noshows':   return [...list].sort((a, b) => b.noShow - a.noShow)
      default:          return list // rate_asc already sorted that way by buildSummaries
    }
  }, [summaries, search, sortBy])

  const rateColor = overall.rate >= 90 ? 'text-green-400' : overall.rate >= 75 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shift Adherence</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Compare each employee's actual attendance against what the rota required
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNotifyHR}
            disabled={notifying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifying ? 'Sending…' : 'Notify HR'}
          </button>
          <button
            onClick={fetchCompliance}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Month + Year selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                m === month
                  ? 'bg-white text-black'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              }`}
            >
              {MONTHS[m-1].slice(0, 3)}
            </button>
          ))}
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white focus:outline-none"
        >
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Department filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDeptFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            deptFilter === 'all' ? 'bg-white text-black border-white' : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
          }`}
        >
          All Departments
        </button>
        {departments.map(d => (
          <button
            key={d.id}
            onClick={() => setDeptFilter(d.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              deptFilter === d.id ? 'bg-white text-black border-white' : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Summary stat cards */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Compliance Rate', value: `${overall.rate}%`, color: rateColor, bg: 'bg-white/[0.03]', border: 'border-white/[0.06]', icon: '📊' },
            { label: 'Rostered Days',   value: overall.working,    color: 'text-white/70', bg: 'bg-white/[0.03]', border: 'border-white/[0.06]', icon: '📅' },
            { label: 'On Time',         value: overall.compliant,  color: 'text-green-400', bg: 'bg-green-500/5',  border: 'border-green-500/10', icon: '✅' },
            { label: 'Late',            value: overall.late,       color: 'text-amber-400', bg: 'bg-amber-500/5',  border: 'border-amber-500/10', icon: '⏱' },
            { label: 'No Shows',        value: overall.noShow,     color: 'text-red-400',   bg: 'bg-red-500/5',    border: 'border-red-500/10',   icon: '❌' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-white/30 mr-1">Legend:</span>
        {(Object.entries(STATUS_META) as [ComplianceStatus, typeof STATUS_META[ComplianceStatus]][]).map(([k, v]) => (
          <span key={k} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${v.bg} ${v.text} ${v.border}`}>
            {v.label}
          </span>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
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
        <div className="flex items-center gap-1">
          {([
            ['rate_asc',  'Worst first'],
            ['rate_desc', 'Best first'],
            ['name',      'Name'],
            ['noshows',   'Most no-shows'],
          ] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setSortBy(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                sortBy === v ? 'bg-white/10 text-white border-white/20' : 'border-white/[0.06] text-white/40 hover:text-white/70'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Employee count */}
      {!loading && (
        <p className="text-xs text-white/30">{filtered.length} employee{filtered.length !== 1 ? 's' : ''} · {MONTHS[month-1]} {year}</p>
      )}

      {/* Employee list */}
      {loading ? (
        <div className="py-20 text-center text-white/30">
          <svg className="w-8 h-8 animate-spin mx-auto mb-3 text-white/20" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading compliance data…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white/40">No roster or attendance data for this period</p>
          <p className="text-xs text-white/20 mt-1">Publish a roster and sync attendance to see compliance</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-white/30 text-sm">No employees match your search</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <EmployeeCard
              key={s.employeeId}
              summary={s}
              expanded={expandedId === s.employeeId}
              onToggle={() => setExpandedId(expandedId === s.employeeId ? null : s.employeeId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
