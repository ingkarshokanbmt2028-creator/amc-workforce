'use client'

import { useEffect, useState, useMemo } from 'react'
import { calcMetrics, AttRecord } from '@/lib/metrics'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

type Period = 'today' | 'week' | 'month'

interface Props {
  metricKey: 'punctuality' | 'overtimeRate' | 'shiftAdherence' | 'absenteeism'
  label: string
  description: string
  explanation: string
  target: number
  higherIsBetter: boolean
  trendLabel: string
}

function getNDaysEndingAt(endDate: string, n: number): string[] {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endDate + 'T12:00:00')
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function getDayLabel(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })
}

interface EmpRow {
  name: string
  department: string
  value: number | null
  detail: string
}

export default function MetricPage({ metricKey, label, description, explanation, target, higherIsBetter, trendLabel }: Props) {
  const [period, setPeriod] = useState<Period>('week')
  const [allAtt, setAllAtt] = useState<AttRecord[]>([])
  const [empIds, setEmpIds] = useState<string[]>([])
  const [rosteredIds, setRostered] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [effectiveToday, setEffectiveToday] = useState('')

  const systemToday = new Date().toISOString().slice(0, 10)
  const month = parseInt(systemToday.slice(5, 7))
  const year  = parseInt(systemToday.slice(0, 4))

  useEffect(() => {
    // Fetch last 90 days so we always catch data regardless of when the last sync was
    const from = new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().slice(0, 10)
    const to = systemToday

    Promise.all([
      fetch('/api/employees').then(r => r.json()),
      fetch(`/api/attendance?from=${from}&to=${to}&limit=10000`).then(r => r.json()),
      fetch(`/api/roster?month=${month}&year=${year}`).then(r => r.ok ? r.json() : []),
    ]).then(([emps, attData, rosters]) => {
      setEmpIds((emps as { id: string }[]).map(e => e.id))

      // Map API response → AttRecord (include employee name + department)
      const rawRecords = (attData.attendance ?? []) as {
        employeeId: string
        date?: string
        status: string
        clockIn?: string | null
        clockOut?: string | null
        totalHours?: number | null
        lateMinutes?: number | null
        employee?: { name?: string; department?: { name?: string } }
      }[]

      const records: AttRecord[] = rawRecords.map(r => ({
        employeeId:     r.employeeId,
        employeeName:   r.employee?.name ?? '',
        departmentName: r.employee?.department?.name ?? '',
        date:           r.date,
        status:         r.status,
        clockIn:        r.clockIn,
        clockOut:       r.clockOut,
        totalHours:     r.totalHours ?? undefined,
        lateMinutes:    r.lateMinutes ?? undefined,
      }))

      setAllAtt(records)

      // Auto-detect the most recent date that actually has records
      const dates = [...new Set(records.map(r => r.date?.slice(0, 10)).filter(Boolean) as string[])]
      dates.sort()
      setEffectiveToday(dates[dates.length - 1] ?? systemToday)

      const ids = new Set<string>()
      for (const roster of (rosters as { slots: { employeeId: string }[] }[])) {
        for (const slot of roster.slots) ids.add(slot.employeeId)
      }
      setRostered(ids)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function metricForDay(date: string) {
    const dayRecs = allAtt.filter(r => r.date?.slice(0, 10) === date)
    const recByEmp = new Map(dayRecs.map(r => [r.employeeId, r]))
    return calcMetrics(empIds, recByEmp, rosteredIds)[metricKey]
  }

  const last7  = useMemo(() => effectiveToday ? getNDaysEndingAt(effectiveToday, 7)  : [], [effectiveToday])
  const last30 = useMemo(() => effectiveToday ? getNDaysEndingAt(effectiveToday, 30) : [], [effectiveToday])

  const activeDays = period === 'month' ? last30 : last7

  const currentValue = useMemo(() => {
    if (loading || !effectiveToday) return null
    if (period === 'today') return metricForDay(effectiveToday)
    const vals = activeDays.map(d => metricForDay(d)).filter(v => v !== null) as number[]
    if (vals.length === 0) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, period, allAtt, empIds, rosteredIds, effectiveToday, activeDays])

  const trendData = useMemo(() => {
    if (loading || !effectiveToday) return []
    return activeDays.map(date => ({
      day: getDayLabel(date),
      value: metricForDay(date) ?? 0,
      target,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allAtt, empIds, rosteredIds, effectiveToday, activeDays, target])

  // Per-employee breakdown for the active period
  const employeeRows = useMemo((): EmpRow[] => {
    if (loading || !effectiveToday) return []
    const days = period === 'today' ? [effectiveToday] : activeDays

    // Group records by employee for the active days
    const empMap = new Map<string, { name: string; dept: string; recs: AttRecord[] }>()
    for (const rec of allAtt) {
      if (!days.includes(rec.date?.slice(0, 10) ?? '')) continue
      if (!empMap.has(rec.employeeId)) {
        empMap.set(rec.employeeId, {
          name: rec.employeeName ?? rec.employeeId,
          dept: rec.departmentName ?? '',
          recs: [],
        })
      }
      empMap.get(rec.employeeId)!.recs.push(rec)
    }

    const rows: EmpRow[] = []
    for (const [, emp] of empMap) {
      const clockedIn = emp.recs.filter(r => r.clockIn)

      if (metricKey === 'punctuality') {
        if (clockedIn.length === 0) continue
        const onTime = clockedIn.filter(r => r.status !== 'LATE').length
        rows.push({
          name: emp.name, department: emp.dept,
          value: Math.round((onTime / clockedIn.length) * 100),
          detail: `${onTime}/${clockedIn.length} on time`,
        })
      } else if (metricKey === 'overtimeRate') {
        if (clockedIn.length === 0) continue
        const otDays = clockedIn.filter(r => (r.totalHours ?? 0) > 9)
        const otHrs  = clockedIn.reduce((s, r) => s + Math.max(0, (r.totalHours ?? 0) - 9), 0)
        rows.push({
          name: emp.name, department: emp.dept,
          value: Math.round((otDays.length / clockedIn.length) * 100),
          detail: otDays.length > 0 ? `${otDays.length} days · ${otHrs.toFixed(1)}h OT` : 'No overtime',
        })
      } else if (metricKey === 'absenteeism') {
        if (emp.recs.length === 0) continue
        const absent = emp.recs.filter(r => r.status === 'ABSENT' || !r.clockIn).length
        rows.push({
          name: emp.name, department: emp.dept,
          value: Math.round((absent / emp.recs.length) * 100),
          detail: `${absent}/${emp.recs.length} days absent`,
        })
      } else if (metricKey === 'shiftAdherence') {
        if (emp.recs.length === 0) continue
        const adhered = emp.recs.filter(r => r.clockIn).length
        rows.push({
          name: emp.name, department: emp.dept,
          value: Math.round((adhered / emp.recs.length) * 100),
          detail: `${adhered}/${emp.recs.length} shifts`,
        })
      }
    }

    // Sort: worst performers first
    rows.sort((a, b) => {
      if (a.value === null) return 1
      if (b.value === null) return -1
      return higherIsBetter ? (a.value - b.value) : (b.value - a.value)
    })

    return rows
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allAtt, effectiveToday, period, activeDays, metricKey, higherIsBetter])

  const atTarget = currentValue === null ? null
    : higherIsBetter ? currentValue >= target : currentValue <= target

  const numberColor = !atTarget && atTarget !== null ? 'text-red-600' : 'text-[hsl(215_35%_18%)]'

  const effectiveDateLabel = effectiveToday
    ? new Date(effectiveToday + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-10 pt-10 pb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40 mb-2">Metrics</p>
          <h1 className="text-4xl font-black text-foreground tracking-tight">{label}</h1>
          <p className="text-sm text-foreground/50 mt-1.5">{description}</p>
        </div>
        <div className="flex items-center gap-1 bg-card border border-foreground/10 rounded-lg p-1 mt-1">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                period === p
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-foreground/50 hover:text-foreground'
              }`}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Big number */}
      <div className="px-10 pb-6">
        {loading ? (
          <p className="text-3xl font-bold text-foreground/20 animate-pulse">Loading…</p>
        ) : currentValue !== null ? (
          <div className="flex items-end gap-2">
            <span className={`text-[9rem] font-black leading-none tracking-tighter ${numberColor}`}>
              {currentValue}
            </span>
            <div className="mb-6 flex items-center gap-2.5">
              <span className="text-5xl font-bold text-foreground/25">%</span>
              <div className="flex items-center gap-1.5 text-sm">
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${atTarget ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`font-semibold ${atTarget ? 'text-green-600' : 'text-red-500'}`}>
                  {atTarget ? 'On target' : 'Below target'}
                </span>
                <span className="text-foreground/35">· Target {higherIsBetter ? '≥' : '≤'}{target}%</span>
                {effectiveToday && effectiveToday !== systemToday && (
                  <span className="text-foreground/35">· Data up to {effectiveDateLabel}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-3xl font-bold text-foreground/20">No data available</p>
        )}
      </div>

      {/* Explanation */}
      <div className="px-10 pb-8 border-b border-foreground/8">
        <p className="text-sm text-foreground/45 leading-relaxed max-w-2xl">{explanation}</p>
      </div>

      {/* Trend chart */}
      <div className="px-10 pt-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40">Trend</p>
          <p className="text-xs text-foreground/35">{period === 'month' ? 'Last 30 days' : 'Last 7 days'}</p>
        </div>

        <div className="bg-card border border-foreground/8 rounded-xl p-6">
          <p className="text-sm font-semibold text-foreground mb-1">{trendLabel}</p>
          <p className="text-xs text-foreground/40 mb-6">Hover the line for daily details.</p>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 15% 88%)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(215 15% 50%)' }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }}
                axisLine={false} tickLine={false} width={36}
              />
              <Tooltip
                formatter={(v) => [`${v}%`]}
                contentStyle={{ background: 'white', border: '1px solid hsl(215 15% 86%)', borderRadius: 8, fontSize: 12 }}
              />
              <ReferenceLine y={target} stroke="hsl(215 15% 70%)" strokeDasharray="4 3" />
              <Line
                type="monotone"
                dataKey="value"
                stroke={atTarget === false ? '#dc2626' : 'hsl(215 35% 25%)'}
                strokeWidth={2}
                dot={{ r: 4, fill: atTarget === false ? '#dc2626' : 'hsl(215 35% 25%)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                name={trendLabel}
              />
              <Legend
                iconType="line"
                formatter={(v) => v === 'value' ? trendLabel : `Target ${target}%`}
                wrapperStyle={{ fontSize: 11, color: 'hsl(215 15% 50%)', paddingTop: 12 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-employee breakdown */}
      {!loading && employeeRows.length > 0 && (
        <div className="px-10 pt-10 pb-12">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40">By Employee</p>
            <p className="text-xs text-foreground/35">{employeeRows.length} employees · worst first</p>
          </div>
          <div className="bg-card border border-foreground/8 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/8">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-foreground/40">Employee</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-foreground/40 hidden md:table-cell">Department</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-foreground/40">Detail</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-foreground/40">Rate</th>
                </tr>
              </thead>
              <tbody>
                {employeeRows.map((row, i) => {
                  const good = row.value !== null && (higherIsBetter ? row.value >= target : row.value <= target)
                  return (
                    <tr key={i} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/[0.02]">
                      <td className="px-5 py-3 font-medium text-foreground">{row.name}</td>
                      <td className="px-5 py-3 text-foreground/50 hidden md:table-cell">{row.department}</td>
                      <td className="px-5 py-3 text-foreground/50">{row.detail}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-bold tabular-nums ${good ? 'text-foreground' : 'text-red-500'}`}>
                          {row.value !== null ? `${row.value}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
