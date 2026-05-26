'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface DeptStat {
  id: string; name: string; code: string
  totalStaff: number; present: number; absent: number; late: number
  punctualityRate: number; absenteeismRate: number; overtimeRate: number
  scheduleAdherenceRate: number; scheduledCount: number; adheredCount: number
  hoursWorked: number; overtimeHours: number
}

interface ReportData {
  month: number; year: number; generatedAt: string
  summary: {
    totalActiveStaff: number
    overallPunctualityRate: number
    overallAbsenteeismRate: number
    overallAdherenceRate: number
    overallOvertimeRate: number
    totalPresent: number; totalAbsent: number; totalLate: number
  }
  departments: DeptStat[]
}

function pct(val: number, target: number, higher: boolean) {
  const good = higher ? val >= target : val <= target
  return { good, color: good ? 'text-green-600' : 'text-red-500' }
}

function MetricCard({ label, value, target, higher, targetLabel }: {
  label: string; value: number; target: number; higher: boolean; targetLabel: string
}) {
  const { good, color } = pct(value, target, higher)
  return (
    <div className="bg-card border border-foreground/10 rounded-xl p-5 flex-1">
      <p className="text-xs text-foreground/40 font-medium mb-2">{label}</p>
      <p className={`text-4xl font-black tracking-tight ${color}`}>{value}%</p>
      <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${good ? 'text-green-600' : 'text-red-500'}`}>
        {good ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {good ? 'On target' : 'Below target'} · {targetLabel}
      </p>
    </div>
  )
}

export default function CEOReportPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [data,  setData]  = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/report?month=${month}&year=${year}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [month, year])

  function downloadCSV() {
    if (!data) return
    const rows = [
      ['Department','Staff','Punctuality %','Absenteeism %','Shift Adherence %','Overtime %','Hours Worked','Overtime Hours'],
      ...data.departments.map(d => [
        d.name, d.totalStaff, d.punctualityRate, d.absenteeismRate,
        d.scheduleAdherenceRate, d.overtimeRate,
        d.hoursWorked.toFixed(1), d.overtimeHours.toFixed(1),
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `ceo-report-${MONTHS[month-1].toLowerCase()}-${year}.csv`
    a.click()
  }

  const s = data?.summary
  const monthLabel = `${MONTHS[month-1]} ${year}`

  return (
    <div className="px-10 pt-10 pb-16 max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-foreground/40 hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-foreground tracking-tight">CEO Report</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border border-foreground/15 text-foreground/50 uppercase">Confidential</span>
            </div>
            <p className="text-sm text-foreground/45 mt-1">Full workforce attendance summary for executive review</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCSV}
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-foreground/15 text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-card disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </button>
          <button
            onClick={() => window.print()}
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

      {/* Reporting period */}
      <div className="flex items-center gap-3 mb-8 pb-8 border-b border-foreground/8">
        <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm text-foreground/50 font-medium">Reporting period:</span>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="px-3 py-1.5 rounded-lg border border-foreground/15 bg-card text-sm text-foreground focus:outline-none"
        >
          {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-1.5 rounded-lg border border-foreground/15 bg-card text-sm text-foreground focus:outline-none"
        >
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="px-3 py-1 rounded-lg bg-foreground/8 text-sm font-semibold text-foreground/70">{monthLabel}</span>
      </div>

      {loading && <p className="text-sm text-foreground/40 py-8 text-center">Generating report…</p>}

      {data && s && (
        <>
          {/* Metrics Snapshot */}
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground mb-4">
              <svg className="w-4 h-4 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Metrics Snapshot
            </h2>
            <div className="flex gap-3">
              <MetricCard label="Punctuality Rate"  value={s.overallPunctualityRate}  target={90} higher={true}  targetLabel="Target ≥90%" />
              <MetricCard label="Absenteeism Rate"  value={s.overallAbsenteeismRate}  target={5}  higher={false} targetLabel="Target ≤5%"  />
              <MetricCard label="Shift Adherence"   value={s.overallAdherenceRate}    target={85} higher={true}  targetLabel="Target ≥85%" />
              <MetricCard label="Overtime Rate"     value={s.overallOvertimeRate}     target={15} higher={false} targetLabel="Target ≤15%" />
            </div>
          </section>

          {/* Metrics by department */}
          <div className="bg-card border border-foreground/10 rounded-xl overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/8">
                  <th className="text-left px-5 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Department</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Punctuality Rate</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Absenteeism Rate</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Shift Adherence</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Overtime Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.departments.map((d, i) => (
                  <tr key={d.id} className={`border-t border-foreground/6 ${i % 2 === 0 ? '' : 'bg-foreground/[0.01]'}`}>
                    <td className="px-5 py-3.5 font-medium text-foreground">{d.name}</td>
                    <td className={`px-4 py-3.5 text-center font-bold ${pct(d.punctualityRate, 90, true).color}`}>{d.punctualityRate}%</td>
                    <td className={`px-4 py-3.5 text-center font-bold ${pct(d.absenteeismRate, 5, false).color}`}>{d.absenteeismRate}%</td>
                    <td className={`px-4 py-3.5 text-center font-bold ${pct(d.scheduleAdherenceRate, 85, true).color}`}>{d.scheduleAdherenceRate}%</td>
                    <td className={`px-4 py-3.5 text-center font-bold ${pct(d.overtimeRate, 15, false).color}`}>{d.overtimeRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Department Performance */}
          <section>
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground mb-4">
              <svg className="w-4 h-4 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Department Performance
            </h2>
            <div className="bg-card border border-foreground/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/8">
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Department</th>
                    <th className="text-center px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Staff</th>
                    <th className="text-center px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Records</th>
                    <th className="text-center px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Missed In</th>
                    <th className="text-center px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Missed Out</th>
                    <th className="text-center px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">Punctuality</th>
                    <th className="text-center px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-foreground/40">OT</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.map((d, i) => (
                    <tr key={d.id} className={`border-t border-foreground/6 ${i % 2 === 0 ? '' : 'bg-foreground/[0.01]'}`}>
                      <td className="px-5 py-3.5 font-medium text-foreground">{d.name}</td>
                      <td className="px-4 py-3.5 text-center text-foreground/70">{d.totalStaff}</td>
                      <td className="px-4 py-3.5 text-center text-foreground/70">{d.present + d.absent}</td>
                      <td className={`px-4 py-3.5 text-center font-bold ${d.absent > 0 ? 'text-red-500' : 'text-foreground/40'}`}>{d.absent}</td>
                      <td className={`px-4 py-3.5 text-center font-bold ${d.late > 0 ? 'text-red-500' : 'text-foreground/40'}`}>{d.late}</td>
                      <td className={`px-4 py-3.5 text-center font-bold ${pct(d.punctualityRate, 90, true).color}`}>{d.punctualityRate}%</td>
                      <td className={`px-4 py-3.5 text-center font-bold ${d.overtimeHours > 0 ? 'text-amber-600' : 'text-foreground/40'}`}>
                        {Math.round(d.overtimeHours)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
