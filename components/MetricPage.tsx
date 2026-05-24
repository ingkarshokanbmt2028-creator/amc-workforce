'use client'

import { useEffect, useState, useMemo } from 'react'
import { calcMetrics, AttRecord } from '@/lib/metrics'

interface Props {
  metricKey: 'punctuality' | 'overtimeRate' | 'shiftAdherence' | 'absenteeism'
  label: string
  description: string
  explanation: string
  target: number
  higherIsBetter: boolean
}

export default function MetricPage({ metricKey, label, description, explanation, target, higherIsBetter }: Props) {
  const [empIds, setEmpIds]       = useState<string[]>([])
  const [attendance, setAtt]      = useState<AttRecord[]>([])
  const [rosteredIds, setRostered] = useState<Set<string>>(new Set())
  const [loading, setLoading]     = useState(true)

  const today = new Date().toISOString().slice(0, 10)
  const month = parseInt(today.slice(5, 7))
  const year  = parseInt(today.slice(0, 4))

  useEffect(() => {
    Promise.all([
      fetch('/api/employees').then(r => r.json()),
      fetch(`/api/attendance?date=${today}`).then(r => r.json()),
      fetch(`/api/roster?month=${month}&year=${year}`).then(r => r.ok ? r.json() : []),
    ]).then(([emps, attData, rosters]) => {
      setEmpIds((emps as { id: string }[]).map(e => e.id))
      setAtt(attData.attendance ?? [])

      const ids = new Set<string>()
      for (const roster of (rosters as { slots: { employeeId: string; date: string }[] }[])) {
        for (const slot of roster.slots) {
          if (slot.date.slice(0, 10) === today) ids.add(slot.employeeId)
        }
      }
      setRostered(ids)
      setLoading(false)
    })
  }, [today, month, year])

  const recByEmp = useMemo(() => new Map(attendance.map(r => [r.employeeId, r])), [attendance])
  const metrics  = useMemo(() => calcMetrics(empIds, recByEmp, rosteredIds), [empIds, recByEmp, rosteredIds])

  const value = metrics[metricKey]
  const atTarget = value === null ? null : higherIsBetter ? value >= target : value <= target
  const numberColor = atTarget === null ? 'text-foreground' : atTarget ? 'text-green-500' : 'text-red-600'
  const statusLabel = atTarget === null ? null : atTarget ? 'On target' : 'Below target'

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-2">
      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40">Metrics</p>
      <h1 className="text-4xl font-black text-foreground tracking-tight">{label}</h1>
      <p className="text-sm text-foreground/50">{description}</p>

      <div className="pt-6 flex items-end gap-4">
        {loading ? (
          <span className="text-2xl font-bold text-foreground/20 animate-pulse">Loading…</span>
        ) : value !== null ? (
          <>
            <div className="flex items-end gap-1 leading-none">
              <span className={`text-[7rem] font-black leading-none tracking-tighter ${numberColor}`}>{value}</span>
              <span className="text-5xl font-bold text-foreground/30 mb-3">%</span>
            </div>
            {statusLabel && (
              <div className="mb-4 flex items-center gap-1.5 text-xs">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${atTarget ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`font-semibold ${atTarget ? 'text-green-500' : 'text-red-500'}`}>{statusLabel}</span>
                <span className="text-foreground/30">· Target {higherIsBetter ? '≥' : '≤'}{target}%</span>
              </div>
            )}
          </>
        ) : (
          <span className="text-3xl font-bold text-foreground/20">No data for today</span>
        )}
      </div>

      <div className="border-t border-foreground/10 pt-6 mt-4">
        <p className="text-sm text-foreground/40 leading-relaxed max-w-lg">{explanation}</p>
      </div>

      <div className="pt-4">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40 mb-1">Date</p>
        <p className="text-sm text-foreground/60">{new Date(today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
  )
}
