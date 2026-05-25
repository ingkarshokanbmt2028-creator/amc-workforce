'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface Stats {
  employees: number
  records: number
  missedIn: number
  missedOut: number
  departments: { id: string; name: string }[]
}

export default function ReportsExportsPage() {
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year]  = useState(now.getFullYear())
  const [stats, setStats] = useState<Stats | null>(null)
  const [deptFilter, setDeptFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/employees').then(r => r.json()),
      fetch(`/api/attendance?month=${month}&year=${year}&limit=10000`).then(r => r.json()),
      fetch('/api/departments').then(r => r.json()),
    ]).then(([emps, attData, depts]) => {
      const att = attData.attendance ?? []
      const filtered = deptFilter === 'all' ? att : att.filter((a: any) => a.employee?.departmentId === deptFilter)
      setStats({
        employees: (emps as any[]).length,
        records:   filtered.length,
        missedIn:  filtered.filter((a: any) => !a.clockIn).length,
        missedOut: filtered.filter((a: any) => a.clockIn && !a.clockOut).length,
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

  async function handleDownload(type: 'attendance' | 'employees') {
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
          a.clockIn ? new Date(a.clockIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
          a.clockOut ? new Date(a.clockOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
          a.totalHours?.toFixed(1) ?? '',
          a.status ?? '',
          a.lateMinutes ?? '',
        ]),
      ]
      downloadCSV(rows, `attendance-${MONTHS[month-1].toLowerCase()}-${year}.csv`)
    } else {
      const res = await fetch('/api/employees')
      const emps = await res.json()
      const rows = [
        ['Staff ID', 'Name', 'Department', 'Position', 'Type', 'Status', 'Location'],
        ...(emps as any[]).map(e => [e.staffId, e.name, e.department?.name ?? '', e.position, e.employeeType, e.status, e.location ?? '']),
      ]
      downloadCSV(rows, `employees-${year}.csv`)
    }
  }

  const monthLabel = `${MONTHS[month-1]} ${year}`

  return (
    <div className="px-10 pt-10 pb-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40 mb-2">Reports</p>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Reports & Exports</h1>
          <p className="text-sm text-foreground/50 mt-1.5">Download or print attendance and payroll data</p>
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

      {/* Stats */}
      {!loading && stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Employees',     value: stats.employees, color: 'text-foreground' },
            { label: 'Att. Records',  value: stats.records,   color: 'text-foreground' },
            { label: 'Missed Clock-in',  value: stats.missedIn,  color: stats.missedIn > 0 ? 'text-red-500' : 'text-foreground' },
            { label: 'Missed Clock-out', value: stats.missedOut, color: stats.missedOut > 0 ? 'text-amber-600' : 'text-foreground' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-foreground/10 rounded-xl p-5">
              <p className={`text-3xl font-black tracking-tight ${s.color}`}>{s.value}</p>
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
            title: 'Attendance Records',
            desc: `Clock-in/out times, missed punches, overtime status for every shift`,
            sub: `${stats?.records ?? '—'} records · ${monthLabel}`,
            icon: (
              <svg className="w-5 h-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            onDownload: () => handleDownload('attendance'),
          },
          {
            title: 'Employee Directory',
            desc: 'Staff list with codes, departments, positions, and department heads',
            sub: `${stats?.employees ?? '—'} employees · ${monthLabel}`,
            icon: (
              <svg className="w-5 h-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
            onDownload: () => handleDownload('employees'),
          },
        ].map(card => (
          <div key={card.title} className="bg-card border border-foreground/10 rounded-xl p-5 flex items-center gap-4">
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
