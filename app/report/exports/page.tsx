'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface Dept { id: string; name: string }

interface Stats {
  employees: number
  records: number
  missedPunches: number
  totalDeductions: number
  departments: Dept[]
}

export default function ReportsExportsPage() {
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year]  = useState(now.getFullYear())
  const [stats, setStats] = useState<Stats | null>(null)
  const [deptFilter, setDeptFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/employees').then(r => r.json()),
      fetch(`/api/attendance?month=${month}&year=${year}&limit=10000`).then(r => r.json()),
      fetch('/api/departments').then(r => r.json()),
    ]).then(([emps, attData, depts]) => {
      const att: any[] = attData.attendance ?? []
      const filtered = deptFilter === 'all' ? att : att.filter((a: any) => a.employee?.departmentId === deptFilter)
      const missedPunches = filtered.filter((a: any) => !a.clockIn || (a.clockIn && !a.clockOut)).length
      // Estimate deductions: late arrivals + missed punches × avg deduction (GH₵ 50/event)
      const deductions = missedPunches * 50 + filtered.filter((a: any) => a.lateMinutes > 0).length * 30
      setStats({
        employees: (emps as any[]).length,
        records: filtered.length,
        missedPunches,
        totalDeductions: deductions,
        departments: (depts as any[]).map((d: any) => ({ id: d.id, name: d.name })),
      })
      setLoading(false)
    })
  }, [month, year, deptFilter])

  function downloadCSV(rows: string[][], filename: string) {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownload(type: 'attendance' | 'employees' | 'deductions') {
    if (type === 'attendance') {
      const res = await fetch(`/api/attendance?month=${month}&year=${year}&limit=10000`)
      const { attendance } = await res.json()
      const rows = [
        ['Staff ID', 'Name', 'Department', 'Date', 'Clock In', 'Clock Out', 'Total Hours', 'Status', 'Late Minutes'],
        ...attendance.map((a: any) => [
          a.employee?.staffId ?? '',
          a.employee?.name ?? '',
          a.employee?.department?.name ?? '',
          a.date?.slice(0, 10) ?? '',
          a.clockIn  ? new Date(a.clockIn).toLocaleTimeString('en-GB',  { hour: '2-digit', minute: '2-digit' }) : '',
          a.clockOut ? new Date(a.clockOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
          a.totalHours?.toFixed(1) ?? '',
          a.status ?? '',
          a.lateMinutes ?? '',
        ]),
      ]
      downloadCSV(rows, `attendance-${MONTHS[month-1].toLowerCase()}-${year}.csv`)
    } else if (type === 'employees') {
      const res = await fetch('/api/employees')
      const emps = await res.json()
      const rows = [
        ['Staff ID', 'Name', 'Department', 'Position', 'Type', 'Status', 'Location'],
        ...(emps as any[]).map(e => [e.staffId, e.name, e.department?.name ?? '', e.position, e.employeeType, e.status, e.location ?? '']),
      ]
      downloadCSV(rows, `employees-${year}.csv`)
    } else {
      // Credit & Deduction report
      const res = await fetch(`/api/attendance?month=${month}&year=${year}&limit=10000`)
      const { attendance } = await res.json()
      const rows = [
        ['Staff ID', 'Name', 'Department', 'Late Minutes', 'Missed Punch', 'Late Deduction (GH₵)', 'Missed Punch Deduction (GH₵)', 'Total Deduction (GH₵)'],
        ...attendance.map((a: any) => {
          const lateDed  = a.lateMinutes > 0 ? 30 : 0
          const missDed  = (!a.clockIn || (a.clockIn && !a.clockOut)) ? 50 : 0
          return [
            a.employee?.staffId ?? '',
            a.employee?.name ?? '',
            a.employee?.department?.name ?? '',
            a.lateMinutes ?? 0,
            (!a.clockIn || (a.clockIn && !a.clockOut)) ? 'Yes' : 'No',
            lateDed,
            missDed,
            lateDed + missDed,
          ]
        }),
      ]
      downloadCSV(rows, `deductions-${MONTHS[month-1].toLowerCase()}-${year}.csv`)
    }
  }

  const monthLabel = `${MONTHS[month-1]} ${year}`

  return (
    <div className="px-10 pt-10 pb-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-foreground/40 hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40 mb-1">Reports</p>
            <h1 className="text-4xl font-black text-foreground tracking-tight">Reports & Exports</h1>
            <p className="text-sm text-foreground/50 mt-1.5">Download or print attendance and payroll data</p>
          </div>
        </div>
        <Link
          href="/report"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-foreground/10 text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-card transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CEO Report
        </Link>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-foreground/50 font-medium">Filter by:</span>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-foreground/15 bg-card text-sm text-foreground focus:outline-none"
        >
          <option value="all">All Departments</option>
          {stats?.departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      {!loading && stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Employees',        value: stats.employees,       color: 'text-foreground',  fmt: (v: number) => v.toString() },
            { label: 'Att. Records',     value: stats.records,         color: 'text-foreground',  fmt: (v: number) => v.toString() },
            { label: 'Missed Punches',   value: stats.missedPunches,   color: stats.missedPunches > 0 ? 'text-red-500' : 'text-foreground', fmt: (v: number) => v.toString() },
            { label: 'Total Deductions', value: stats.totalDeductions, color: stats.totalDeductions > 0 ? 'text-red-500' : 'text-foreground', fmt: (v: number) => `GH₵${v.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="bg-card border border-foreground/10 rounded-xl p-5">
              <p className={`text-3xl font-black tracking-tight ${s.color}`}>{s.fmt(s.value)}</p>
              <p className="text-xs text-foreground/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-foreground/40 mb-6">{monthLabel}</p>

      {/* Report cards */}
      <div className="space-y-3">
        {[
          {
            key: 'attendance',
            title: 'Attendance Records',
            desc: 'Clock-in/out times, missed punches, overtime status for every shift',
            sub: `${stats?.records ?? '—'} records · ${monthLabel}`,
            icon: (
              <svg className="w-5 h-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            onDownload: () => handleDownload('attendance'),
          },
          {
            key: 'deductions',
            title: 'Credit & Deduction Report',
            desc: 'Late arrival and missed punch deductions per employee for payroll',
            sub: `${stats?.missedPunches ?? '—'} events · ${monthLabel}`,
            icon: (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            onDownload: () => handleDownload('deductions'),
          },
          {
            key: 'employees',
            title: 'Employee Directory',
            desc: 'Staff list with codes, departments, positions, and employment type',
            sub: `${stats?.employees ?? '—'} employees · ${monthLabel}`,
            icon: (
              <svg className="w-5 h-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
            onDownload: () => handleDownload('employees'),
          },
        ].map(card => (
          <div key={card.key} className="bg-card border border-foreground/10 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center flex-shrink-0">
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{card.title}</p>
              <p className="text-xs text-foreground/50 mt-0.5">{card.desc}</p>
              <p className="text-xs text-foreground/35 mt-1">{card.sub}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-foreground/10 text-xs font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <button
                onClick={card.onDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-80 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-foreground/30 mt-6">CSV files are UTF-8 encoded and open correctly in Excel, Google Sheets, and Numbers.</p>
    </div>
  )
}
