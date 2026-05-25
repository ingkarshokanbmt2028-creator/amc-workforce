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
  trendLabel: string  // e.g. "Daily punctuality rate"
}

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function getDayLabel(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })
}

export default function MetricPage({ metricKey, label, description, explanation, target, higherIsBetter, trendLabel }: Props) {
  const [period, setPeriod] = useState<Period>('week')
  const [allAtt, setAllAtt] = useState<AttRecord[]>([])
  const [empIds, setEmpIds] = useState<string[]>([])
  const [rosteredIds, setRostered] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().slice(0, 10)
  const month = parseInt(today.slice(5, 7))
  const year  = parseInt(today.slice(0, 4))

  useEffect(() => {
    Promise.all([
      fetch('/api/employees').then(r => r.json()),
      fetch(`/api/attendance?month=${month}&year=${year}&limit=5000`).then(r => r.json()),
      fetch(`/api/roster?month=${month}&year=${year}`).then(r => r.ok ? r.json() : []),
    ]).then(([emps, attData, rosters]) => {
      setEmpIds((emps as { id: string }[]).map(e => e.id))
      setAllAtt(attData.attendance ?? [])

      const ids = new Set<string>()
      for (const roster of (rosters as { slots: { employeeId: string; date: string }[] }[])) {
        for (const slot of roster.slots) ids.add(slot.employeeId)
      }
      setRostered(ids)
      setLoading(false)
    })
  }, [month, year])

  // Compute metric for a given day's attendance records
  function metricForDay(date: string) {
    const dayRecs = allAtt.filter(r => r.date?.slice(0, 10) === date)
    const recByEmp = new Map(dayRecs.map(r => [r.employeeId, r]))
    const m = calcMetrics(empIds, recByEmp, rosteredIds)
    return m[metricKey]
  }

  const last7 = useMemo(() => getLast7Days(), [])

  // Current value based on period
  const currentValue = useMemo(() => {
    if (loading) return null
    if (period === 'today') {
      return metricForDay(today)
    }
    // For week/month: average of available days
    const days = period === 'week' ? last7 : last7 // month would need more data
    const vals = days.map(d => metricForDay(d)).filter(v => v !== null) as number[]
    if (vals.length === 0) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, period, allAtt, empIds, rosteredIds, today, last7])

  // Trend data for chart (last 7 days)
  const trendData = useMemo(() => {
    if (loading) return []
    return last7.map(date => ({
      day: getDayLabel(date),
      value: metricForDay(date) ?? 0,
      target,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allAtt, empIds, rosteredIds, last7, target])

  const atTarget = currentValue === null ? null
    : higherIsBetter ? currentValue >= target : currentValue <= target

  const numberColor = currentValue === null ? 'text-[hsl(215_35%_18%)]'
    : atTarget ? 'text-[hsl(215_35%_18%)]' : 'text-red-600'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-10 pt-10 pb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40 mb-2">Metrics</p>
          <h1 className="text-4xl font-black text-foreground tracking-tight">{label}</h1>
          <p className="text-sm text-foreground/50 mt-1.5">{description}</p>
        </div>
        {/* Period toggle */}
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
          <div className="flex items-end gap-3">
            <span className={`text-[7rem] font-black leading-none tracking-tighter ${numberColor}`}>
              {currentValue}
            </span>
            <span className="text-4xl font-bold text-foreground/30 mb-4">%</span>
            <div className="mb-5 flex items-center gap-1.5 text-xs">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${atTarget ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`font-semibold ${atTarget ? 'text-green-600' : 'text-red-500'}`}>
                {atTarget ? 'Above target' : 'Below target'}
              </span>
              <span className="text-foreground/35">· Target {higherIsBetter ? '≥' : '≤'}{target}%</span>
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
          <p className="text-xs text-foreground/35">Last 7 days</p>
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
                formatter={(v: number) => [`${v}%`]}
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
    </div>
  )
}
