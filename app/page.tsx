'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth, ROLE_LABELS } from '@/lib/auth'
import {
  LineChart, Line, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface Stats {
  totalStaff: number; departments: number
  presentToday: number; onLeaveToday: number; absentToday: number; lateToday: number
  overtimeToday: number
}
interface DeptStat { id: string; name: string; code: string; total: number; present: number; absent: number; onLeave: number }
interface OvertimeRecord { id: string; employeeId: string; employeeName: string; department: string; date: string; hoursWorked: number; overtimeHours: number; status: string }
interface TrendPoint { day: string; present: number; absent: number; leave: number }

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'
}

function today() {
  const d = new Date()
  return `${DAYS[d.getDay()]}, ${MONTHS_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function buildNarrative(stats: Stats, deptStats: DeptStat[], dateStr: string): string {
  if (!stats || deptStats.length === 0) return ''
  const rate = stats.totalStaff > 0 ? Math.round((stats.presentToday / stats.totalStaff) * 100) : 0
  const rateDesc = rate >= 85 ? 'strong' : rate >= 70 ? 'moderate' : 'below target'
  const topDept = [...deptStats].sort((a, b) => (b.present / Math.max(1, b.total)) - (a.present / Math.max(1, a.total)))[0]
  const d = new Date(dateStr + 'T12:00:00')
  const dayName = DAYS[d.getDay()]
  return `Today is ${dayName}. ${stats.presentToday} of ${stats.totalStaff} staff are present — a ${rateDesc} attendance rate of ${rate}%. ${stats.onLeaveToday} ${stats.onLeaveToday === 1 ? 'person is' : 'people are'} on approved leave and ${stats.absentToday} ${stats.absentToday === 1 ? 'absence has' : 'absences have'} been recorded.${topDept ? ` ${topDept.name} is the strongest performing department today with ${topDept.present}/${topDept.total} staff in.` : ''}${stats.overtimeToday > 0 ? ` ${stats.overtimeToday} staff ${stats.overtimeToday === 1 ? 'is working' : 'are working'} overtime today — review pending approvals.` : ''}`
}

// ── Overtime bell (adapted from co-developer pattern, real data) ──────────────

function OvertimeBell({ overtime }: { overtime: OvertimeRecord[] }) {
  const [open, setOpen] = useState(false)
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'denied'>>(() => {
    try { return JSON.parse(localStorage.getItem('amc_ot_decisions') ?? '{}') } catch { return {} }
  })

  function decide(id: string, action: 'approved' | 'denied') {
    const next = { ...decisions, [id]: action }
    setDecisions(next)
    localStorage.setItem('amc_ot_decisions', JSON.stringify(next))
  }

  const pending  = overtime.filter(o => !decisions[o.id])
  const resolved = overtime.filter(o => decisions[o.id])

  return (
    <>
      {/* Bell */}
      <button
        onClick={() => setOpen(true)}
        className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors"
        title="Overtime approvals"
      >
        <svg className={`w-4 h-4 ${pending.length > 0 ? 'text-amber-400' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {pending.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 text-[9px] font-black text-black flex items-center justify-center">
            {pending.length > 9 ? '9+' : pending.length}
          </span>
        )}
      </button>

      {/* Overlay panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="w-96 bg-[#0f1117] border-l border-white/[0.06] flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <p className="font-bold text-white">Overtime Approvals</p>
                <p className="text-xs text-white/40 mt-0.5">{pending.length} pending · click name to review</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {[{ l: pending.length, c: 'text-amber-400' }, { l: resolved.filter(r => decisions[r.id] === 'approved').length, c: 'text-green-400' }, { l: resolved.filter(r => decisions[r.id] === 'denied').length, c: 'text-white/30' }].map((s, i) => (
                    <div key={i} className="text-center min-w-[32px]">
                      <p className={`text-base font-black ${s.c}`}>{s.l}</p>
                      <p className="text-[9px] text-white/30">{['Pending','Approved','Denied'][i]}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/70">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {overtime.length === 0 && (
                <div className="py-16 text-center text-white/30 text-sm">No overtime records this month</div>
              )}
              {pending.length > 0 && (
                <div className="flex gap-2 mb-2">
                  <button onClick={() => pending.forEach(o => decide(o.id, 'approved'))} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20">
                    Approve All
                  </button>
                  <button onClick={() => pending.forEach(o => decide(o.id, 'denied'))} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                    Deny All
                  </button>
                </div>
              )}
              {overtime.map(o => {
                const dec = decisions[o.id]
                return (
                  <div key={o.id} className={`rounded-xl border p-4 space-y-3 ${!dec ? 'border-amber-500/20 bg-amber-500/5' : dec === 'approved' ? 'border-green-500/10 bg-green-500/5 opacity-70' : 'border-white/5 bg-white/[0.02] opacity-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${!dec ? 'bg-amber-500/15 text-amber-400' : dec === 'approved' ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'}`}>
                          {o.employeeName.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{o.employeeName}</p>
                          <p className="text-xs text-white/40 truncate">{o.department}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${!dec ? 'bg-amber-500/15 text-amber-400' : dec === 'approved' ? 'bg-green-500/15 text-green-400' : 'text-white/30'}`}>
                        {dec ? (dec === 'approved' ? '✓ Approved' : '✗ Denied') : 'Pending'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-white/30">Date</p>
                        <p className="text-xs font-semibold text-white">{new Date(o.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-white/30">Total</p>
                        <p className="text-xs font-bold text-amber-400">{o.hoursWorked.toFixed(1)}h</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-white/30">Extra</p>
                        <p className="text-xs font-bold text-amber-400">+{o.overtimeHours.toFixed(1)}h</p>
                      </div>
                    </div>
                    {!dec && (
                      <div className="flex gap-2">
                        <button onClick={() => decide(o.id, 'approved')} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20">
                          Approve
                        </button>
                        <button onClick={() => decide(o.id, 'denied')} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                          Deny
                        </button>
                      </div>
                    )}
                    {dec === 'approved' && (
                      <button onClick={() => decide(o.id, 'denied')} className="w-full py-1.5 rounded-lg text-xs font-semibold border border-amber-500/20 text-amber-400/60 hover:bg-amber-500/10">
                        Revoke Approval
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Circular attendance progress ─────────────────────────────────────────────

function CircularProgress({ present, total }: { present: number; total: number }) {
  const r = 48
  const circ = 2 * Math.PI * r
  const rate = total > 0 ? present / total : 0
  const dash = rate * circ

  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="shrink-0">
      <circle cx="64" cy="64" r={r} fill="none" stroke="hsl(220 15% 90%)" strokeWidth="9" />
      {dash > 0 && (
        <circle
          cx="64" cy="64" r={r}
          fill="none"
          stroke="#DCAA05"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-90 64 64)"
        />
      )}
      <text x="64" y="58" textAnchor="middle" dominantBaseline="middle"
        fontSize="30" fontWeight="700" fill="hsl(215 25% 25%)">
        {present}
      </text>
      <text x="64" y="80" textAnchor="middle"
        fontSize="12" fill="hsl(215 25% 25% / 0.4)">
        {present}/{total}
      </text>
    </svg>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, role } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [deptStats, setDeptStats] = useState<DeptStat[]>([])
  const [overtime, setOvertime] = useState<OvertimeRecord[]>([])
  const [dateStr, setDateStr] = useState('')
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [trendLoading, setTrendLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    async function load() {
      const ds = new Date().toISOString().slice(0, 10)
      setDateStr(ds)
      const m = new Date().getMonth() + 1
      const y = new Date().getFullYear()

      try {
        const [emps, depts, todayAtt, monthAtt] = await Promise.all([
          fetch('/api/employees').then(r => { if (!r.ok) throw new Error('employees'); return r.json() }),
          fetch('/api/departments').then(r => { if (!r.ok) throw new Error('departments'); return r.json() }),
          fetch(`/api/attendance?date=${ds}`).then(r => r.ok ? r.json() : { attendance: [] }),
          fetch(`/api/attendance?month=${m}&year=${y}&limit=200`).then(r => r.ok ? r.json() : { attendance: [] }),
        ])

        const att: any[] = todayAtt.attendance ?? []
        const monthRecs: any[] = monthAtt.attendance ?? []

        setStats({
          totalStaff: emps.length,
          departments: depts.length,
          presentToday: att.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length,
          onLeaveToday: att.filter((a: any) => a.status === 'ON_LEAVE').length,
          absentToday: att.filter((a: any) => a.status === 'ABSENT').length,
          lateToday: att.filter((a: any) => a.status === 'LATE').length,
          overtimeToday: att.filter((a: any) => (a.totalHours ?? 0) > 9).length,
        })

        const deptMap = new Map<string, DeptStat>(depts.map((d: any) => [d.id, { id: d.id, name: d.name, code: d.code, total: 0, present: 0, absent: 0, onLeave: 0 }]))
        for (const e of (emps as any[])) {
          const d = deptMap.get(e.departmentId)
          if (d) d.total++
        }
        for (const a of (att as any[])) {
          const emp = (emps as any[]).find((e: any) => e.id === a.employeeId)
          if (emp) {
            const d = deptMap.get(emp.departmentId)
            if (d) {
              if (a.status === 'PRESENT' || a.status === 'LATE') d.present++
              else if (a.status === 'ABSENT') d.absent++
              else if (a.status === 'ON_LEAVE') d.onLeave++
            }
          }
        }
        setDeptStats(Array.from(deptMap.values()).filter((d: DeptStat) => d.total > 0).sort((a: DeptStat, b: DeptStat) => b.total - a.total))

        const otRecs: OvertimeRecord[] = monthRecs
          .filter((a: any) => (a.totalHours ?? 0) > 9)
          .map((a: any) => {
            const emp = emps.find((e: any) => e.id === a.employeeId)
            const dept = depts.find((d: any) => d.id === emp?.departmentId)
            const totalHrs = a.totalHours ?? 0
            return {
              id: a.id,
              employeeId: a.employeeId,
              employeeName: emp?.name ?? 'Unknown',
              department: dept?.name ?? '—',
              date: typeof a.date === 'string' ? a.date.slice(0, 10) : new Date(a.date).toISOString().slice(0, 10),
              hoursWorked: totalHrs,
              overtimeHours: Math.max(0, totalHrs - 9),
              status: 'pending',
            }
          })
        setOvertime(otRecs)

      } catch {
        setFetchError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Fetch trend data for selected week
  useEffect(() => {
    setTrendLoading(true)
    const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const anchor = new Date()
    anchor.setDate(anchor.getDate() + weekOffset * 7)
    // Start of that week (Monday)
    const dow = anchor.getDay()
    const monday = new Date(anchor)
    monday.setDate(anchor.getDate() - (dow === 0 ? 6 : dow - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const from = monday.toISOString().slice(0, 10)
    const to   = sunday.toISOString().slice(0, 10)

    fetch(`/api/attendance?from=${from}&to=${to}&limit=5000`)
      .then(r => r.ok ? r.json() : { attendance: [] })
      .then(({ attendance: recs }: { attendance: any[] }) => {
        const trend: TrendPoint[] = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday)
          d.setDate(monday.getDate() + i)
          const ds = d.toISOString().slice(0, 10)
          const dayRecs = recs.filter((a: any) => {
            const rd = typeof a.date === 'string' ? a.date.slice(0, 10) : new Date(a.date).toISOString().slice(0, 10)
            return rd === ds
          })
          trend.push({
            day: DAY_LABELS[d.getDay()],
            present: dayRecs.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length,
            absent:  dayRecs.filter((a: any) => a.status === 'ABSENT').length,
            leave:   dayRecs.filter((a: any) => a.status === 'ON_LEAVE').length,
          })
        }
        setTrendData(trend)
        setTrendLoading(false)
      })
      .catch(() => setTrendLoading(false))
  }, [weekOffset])

  const present  = stats?.presentToday ?? 0
  const total    = stats?.totalStaff ?? 0
  const rate     = total > 0 ? Math.round((present / total) * 100) : 0

  const statusHeading = !loading && total === 0
    ? 'No staff data yet.'
    : present === total && total > 0
    ? 'Everyone\'s here.'
    : rate >= 90
    ? 'Attendance on target.'
    : rate >= 70
    ? 'Attendance looking good.'
    : present === 0
    ? 'Awaiting today\'s sync.'
    : 'Attendance below target.'

  const statusSub = !loading && total === 0
    ? 'Import your rota files and run a sync to get started.'
    : `${present} of ${total} expected staff have clocked in today.${stats?.lateToday ? ` ${stats.lateToday} arrived late.` : ''}`

  // Convert trend counts → attendance rate %
  const chartData = trendData.map(t => ({
    day: t.day,
    rate: total > 0 ? Math.round((t.present / total) * 100) : 0,
    target: 90,
  }))

  const avgRate = chartData.length > 0
    ? Math.round(chartData.reduce((s, d) => s + d.rate, 0) / chartData.length)
    : 0

  // Date label for top-right
  const now = new Date()
  const dateLabel = `${DAYS[now.getDay()].toUpperCase()} ${now.getDate()} ${MONTHS_FULL[now.getMonth()].toUpperCase()}`

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-10">

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground/50">
          {greeting()}, <span className="font-medium text-foreground">{user?.email?.split('@')[0] ?? 'Admin'}</span>.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-foreground/40">
            {dateLabel}
          </span>
          <OvertimeBell overtime={overtime} />
          <Link
            href="/report"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-foreground/10 text-xs font-medium text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            CEO Report
          </Link>
          <Link
            href="/attendance"
            className="px-3 py-1.5 rounded-lg bg-[#DCAA05] text-black text-xs font-semibold hover:bg-[#c99a04] transition-colors"
          >
            Sync
          </Link>
        </div>
      </div>

      {/* Main heading */}
      <h1 className="text-4xl font-bold font-display text-foreground tracking-tight">
        Attendance overview
      </h1>

      {/* Error banner */}
      {fetchError && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-red-600">Unable to load dashboard data. Check your connection and refresh.</p>
        </div>
      )}

      {/* Circular progress + status */}
      <div className="flex items-center gap-10">
        {loading ? (
          <div className="w-32 h-32 rounded-full border-[9px] border-foreground/8 animate-pulse shrink-0" />
        ) : (
          <CircularProgress present={present} total={total} />
        )}
        <div>
          <h2 className="text-2xl font-bold text-foreground">{statusHeading}</h2>
          <p className="text-sm text-foreground/50 mt-1 max-w-xs">{statusSub}</p>
          {!loading && total === 0 && (
            <Link href="/attendance" className="inline-block mt-3 px-4 py-2 rounded-lg bg-[#DCAA05] text-black text-xs font-semibold hover:bg-[#c99a04] transition-colors">
              Sync Attendance
            </Link>
          )}
        </div>
      </div>

      {/* This week chart */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-foreground/40">
              {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset(w => w - 1)}
                className="h-6 w-6 rounded flex items-center justify-center text-foreground/30 hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
                disabled={weekOffset === 0}
                className="h-6 w-6 rounded flex items-center justify-center text-foreground/30 hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          {!trendLoading && chartData.length > 0 && (
            <p className="text-sm text-foreground/40">{avgRate}% avg attendance</p>
          )}
        </div>

        <div className="rounded-xl border border-foreground/8 bg-white p-6">
          <p className="font-semibold text-foreground text-sm">Daily attendance rate</p>
          <p className="text-xs text-foreground/40 mt-0.5 mb-5">Percentage of expected staff who clocked in.</p>

          {trendLoading ? (
            <div className="h-56 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-4 border-foreground/5 border-t-foreground/20 animate-spin" />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
                <XAxis dataKey="day" tick={{ fill: 'hsl(215 25% 25% / 0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: 'hsl(215 25% 25% / 0.4)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid hsl(220 15% 88%)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'hsl(215 25% 25%)', fontWeight: 600 }}
                  formatter={(v) => [`${v}%`, 'Attendance rate']}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: 'hsl(215 25% 25% / 0.5)', paddingTop: 16 }}
                  formatter={(value) => value === 'rate' ? 'Attendance rate' : 'Target 90%'}
                />
                <ReferenceLine y={90} stroke="#DCAA05" strokeDasharray="4 4" strokeWidth={1.5} />
                <Line
                  type="monotone" dataKey="rate"
                  stroke="hsl(215 30% 30%)" strokeWidth={2}
                  dot={{ r: 4, fill: 'hsl(215 30% 30%)', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  name="rate"
                />
                <Line
                  type="monotone" dataKey="target"
                  stroke="#DCAA05" strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  name="target"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center gap-2 text-center px-6">
              <p className="text-foreground/25 text-sm">No attendance synced for this period</p>
              {weekOffset === 0 && (
                <Link href="/attendance" className="text-xs text-[#DCAA05] hover:underline">Sync now</Link>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
