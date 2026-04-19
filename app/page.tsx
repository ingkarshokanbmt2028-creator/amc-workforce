'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth, ROLE_LABELS } from '@/lib/auth'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, role } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [deptStats, setDeptStats] = useState<DeptStat[]>([])
  const [overtime, setOvertime] = useState<OvertimeRecord[]>([])
  const [dateStr, setDateStr] = useState('')
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [deductions, setDeductions] = useState(0)

  useEffect(() => {
    const ds = new Date().toISOString().slice(0, 10)
    setDateStr(ds)
    const m = new Date().getMonth() + 1
    const y = new Date().getFullYear()

    Promise.all([
      fetch('/api/employees').then(r => r.json()),
      fetch('/api/departments').then(r => r.json()),
      fetch(`/api/attendance?date=${ds}`).then(r => r.json()),
      fetch(`/api/attendance?month=${m}&year=${y}&limit=200`).then(r => r.json()),
    ]).then(([emps, depts, todayAtt, monthAtt]) => {
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

      // Build overtime records — totalHours > 9 counts as overtime
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

      // Build 7-day attendance trend from month records
      const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      const today = new Date()
      const trend: TrendPoint[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const ds = d.toISOString().slice(0, 10)
        const dayRecs = monthRecs.filter((a: any) => {
          const rd = typeof a.date === 'string' ? a.date.slice(0, 10) : new Date(a.date).toISOString().slice(0, 10)
          return rd === ds
        })
        trend.push({
          day: DAY_LABELS[d.getDay()],
          present: dayRecs.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length,
          absent: dayRecs.filter((a: any) => a.status === 'ABSENT').length,
          leave: dayRecs.filter((a: any) => a.status === 'ON_LEAVE').length,
        })
      }
      setTrendData(trend)

      // Estimate deductions: absent days × avg daily rate (GH₵ 80 placeholder)
      const absentCount = monthRecs.filter((a: any) => a.status === 'ABSENT').length
      setDeductions(absentCount * 80)
    })
  }, [])

  const statCards = [
    { label: 'Total Staff',    value: stats?.totalStaff ?? '—',    color: 'bg-blue-500/10 text-blue-300',    icon: '👥' },
    { label: 'Departments',    value: stats?.departments ?? '—',    color: 'bg-purple-500/10 text-purple-300', icon: '🏥' },
    { label: 'Present Today',  value: stats?.presentToday ?? '—',  color: 'bg-green-500/10 text-green-300',  icon: '✅' },
    { label: 'On Leave',       value: stats?.onLeaveToday ?? '—',  color: 'bg-amber-500/10 text-amber-300',  icon: '🌴' },
    { label: 'Absent',         value: stats?.absentToday ?? '—',   color: 'bg-red-500/10 text-red-300',      icon: '❌' },
    { label: 'Overtime Today', value: stats?.overtimeToday ?? '—', color: 'bg-orange-500/10 text-orange-300', icon: '⏰' },
    { label: 'Deductions GH₵', value: stats ? `₵${deductions.toLocaleString()}` : '—', color: 'bg-rose-500/10 text-rose-300', icon: '💸' },
  ]

  const narrative = stats && deptStats.length > 0 ? buildNarrative(stats, deptStats, dateStr) : ''

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
            {role ? ROLE_LABELS[role] ?? role : 'Staff'}
          </p>
          <h1 className="text-3xl font-bold mt-1 text-white">
            {greeting()}, {user?.email?.split('@')[0] ?? 'Admin'}
          </h1>
          <p className="text-sm text-white/40 mt-1">{today()}</p>
        </div>
        <div className="flex items-center gap-2">
          <OvertimeBell overtime={overtime} />
          <Link
            href="/report"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CEO Report
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            Sync Attendance
          </Link>
        </div>
      </div>

      {/* Narrative summary */}
      {narrative && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-2">Today at a Glance</p>
          <p className="text-sm text-white/70 leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color} border border-current/10`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs font-medium opacity-70 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row — 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-day attendance trend */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white mb-4 text-sm">7-Day Attendance Trend</h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLeave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                  itemStyle={{ color: 'rgba(255,255,255,0.7)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                <Area type="monotone" dataKey="present" stroke="#f59e0b" strokeWidth={2} fill="url(#gPresent)" name="Present" />
                <Area type="monotone" dataKey="absent"  stroke="#ef4444" strokeWidth={1.5} fill="url(#gAbsent)" name="Absent" />
                <Area type="monotone" dataKey="leave"   stroke="#3b82f6" strokeWidth={1.5} fill="url(#gLeave)"  name="On Leave" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-white/20 text-sm">No attendance data yet</div>
          )}
        </div>

        {/* Attendance status pie */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white mb-4 text-sm">Today&apos;s Status</h2>
          {stats ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Present',  value: stats.presentToday,  color: '#22c55e' },
                      { name: 'Absent',   value: stats.absentToday,   color: '#ef4444' },
                      { name: 'On Leave', value: stats.onLeaveToday,  color: '#3b82f6' },
                      { name: 'Late',     value: stats.lateToday,     color: '#f59e0b' },
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {[
                      { name: 'Present',  value: stats.presentToday,  color: '#22c55e' },
                      { name: 'Absent',   value: stats.absentToday,   color: '#ef4444' },
                      { name: 'On Leave', value: stats.onLeaveToday,  color: '#3b82f6' },
                      { name: 'Late',     value: stats.lateToday,     color: '#f59e0b' },
                    ].filter(d => d.value > 0).map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {[
                  { label: 'Present',  value: stats.presentToday,  color: '#22c55e' },
                  { label: 'Absent',   value: stats.absentToday,   color: '#ef4444' },
                  { label: 'On Leave', value: stats.onLeaveToday,  color: '#3b82f6' },
                  { label: 'Late',     value: stats.lateToday,     color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[11px] text-white/40">{s.label}</span>
                    <span className="text-[11px] font-bold ml-auto" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-white/20 text-sm">Loading…</div>
          )}
        </div>
      </div>

      {/* Department bar chart */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white mb-4 text-sm">Staff Count by Department</h2>
        {deptStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={deptStats} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="code" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                itemStyle={{ color: 'rgba(255,255,255,0.7)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
              <Bar dataKey="total"   fill="#f59e0b" fillOpacity={0.7} radius={[3,3,0,0]} name="Total" />
              <Bar dataKey="present" fill="#22c55e" fillOpacity={0.8} radius={[3,3,0,0]} name="Present" />
              <Bar dataKey="absent"  fill="#ef4444" fillOpacity={0.7} radius={[3,3,0,0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-white/20 text-sm">No department data yet</div>
        )}
      </div>

      {/* Department overview */}
      <div className="rounded-xl border border-white/[0.06] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Department Attendance Today</h2>
          <Link href="/roster" className="text-xs text-white/40 hover:text-white/70 transition-colors">View Roster →</Link>
        </div>
        {deptStats.length === 0 ? (
          <p className="text-sm text-white/30">No attendance data yet — click Sync Attendance to load today's data.</p>
        ) : (
          <div className="space-y-2.5">
            {deptStats.map((d) => {
              const pct = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0
              const color = pct >= 85 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444'
              return (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="w-32 text-xs font-medium text-right text-white/40 truncate">{d.name}</span>
                  <div className="flex-1 h-5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="w-10 text-xs font-bold text-right" style={{ color }}>{pct}%</span>
                  <span className="w-16 text-[10px] text-white/30 text-right">{d.present}/{d.total} in</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { href: '/roster',     label: 'Duty Roster',  desc: 'Manage shifts',          icon: '📅', color: 'border-amber-500/20 hover:bg-amber-500/5' },
          { href: '/attendance', label: 'Attendance',   desc: 'Clock-in / out',          icon: '🕐', color: 'border-green-500/20 hover:bg-green-500/5' },
          { href: '/schedule',   label: 'Schedule',     desc: 'Roster vs actual',        icon: '📋', color: 'border-sky-500/20 hover:bg-sky-500/5' },
          { href: '/report',     label: 'CEO Report',   desc: 'Monthly performance',     icon: '📊', color: 'border-purple-500/20 hover:bg-purple-500/5' },
          { href: '/departments',label: 'Departments',  desc: 'View all staff',          icon: '🏥', color: 'border-blue-500/20 hover:bg-blue-500/5' },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-xl border ${l.color} bg-white/[0.02] p-4 flex flex-col gap-2 transition-all`}
          >
            <span className="text-2xl">{l.icon}</span>
            <span className="font-semibold text-white text-sm">{l.label}</span>
            <span className="text-xs text-white/40">{l.desc}</span>
          </Link>
        ))}
      </div>

      {/* Department cards */}
      {deptStats.length > 0 && (
        <div>
          <h2 className="font-semibold text-white text-sm mb-3">Departments</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {deptStats.map((d) => {
              const pct   = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0
              const color = pct >= 85 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444'
              const bgCol = pct >= 85 ? 'border-green-500/20' : pct >= 70 ? 'border-amber-500/20' : 'border-red-500/20'
              return (
                <Link
                  key={d.id}
                  href={`/departments?dept=${d.id}`}
                  className={`rounded-xl border ${bgCol} bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black text-white/50">
                      {d.code}
                    </div>
                    <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate">{d.name}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">{d.total} staff</p>
                  <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
