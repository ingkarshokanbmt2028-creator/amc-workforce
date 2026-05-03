'use client'

import { useState, useEffect, useRef } from 'react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface DeptStat {
  id: string; name: string; code: string
  totalStaff: number; locumCount: number
  present: number; absent: number; onLeave: number; late: number
  attendanceRate: number
  punctualityRate: number; absenteeismRate: number; overtimeRate: number
  hoursWorked: number; overtimeHours: number; plannedHours: number
  annualLeaveDays: number; sickLeaveDays: number; maternityLeaveDays: number
  scheduledCount: number
  adheredCount: number
  scheduleAdherenceRate: number
}

interface ReportData {
  month: number; year: number; generatedAt: string; hospital: string
  summary: {
    totalActiveStaff: number; totalDepartments: number; locumStaff: number
    overallAttendanceRate: number
    totalHoursWorked: number; totalOvertimeHours: number
    totalPresent: number; totalAbsent: number; totalOnLeave: number; totalLate: number
    totalAnnualLeaveDays: number; totalSickLeaveDays: number
    topPerformingDept: string; lowestAttendanceDept: string; highestOvertimeDept: string
    overallAdherenceRate: number
    totalScheduled: number
    totalAdhered: number
    lowestAdherenceDept: string
    overallPunctualityRate: number
    overallAbsenteeismRate: number
    overallOvertimeRate: number
    totalLocum: number
    totalPermanent: number
  }
  departments: DeptStat[]
}

function narrative(data: ReportData): string {
  const s = data.summary
  const mon = MONTHS[data.month - 1]
  const yr  = data.year

  const rateDesc = s.overallAttendanceRate >= 90 ? 'strong' : s.overallAttendanceRate >= 75 ? 'satisfactory' : 'below target'
  const overtimePct = s.totalHoursWorked > 0
    ? Math.round((s.totalOvertimeHours / s.totalHoursWorked) * 100)
    : 0

  const punctualityDesc = s.overallPunctualityRate >= 90 ? 'strong' : s.overallPunctualityRate >= 75 ? 'satisfactory' : 'below target'
  const adherenceDesc = s.overallAdherenceRate >= 90 ? 'strong' : s.overallAdherenceRate >= 75 ? 'moderate' : 'below target'

  return `For the month of ${mon} ${yr}, AMC Hospital recorded an overall attendance rate of ${s.overallAttendanceRate}%, which is considered ${rateDesc} against the hospital's 90% benchmark. Out of ${s.totalActiveStaff} active staff members across ${s.totalDepartments} departments, a total of ${s.totalPresent.toLocaleString()} working-day attendances were recorded, with ${s.totalAbsent.toLocaleString()} absences and ${s.totalOnLeave.toLocaleString()} approved leave days. The absenteeism rate for the month stands at ${s.overallAbsenteeismRate}% of all scheduled shifts.

Punctuality across the hospital was ${punctualityDesc}, with ${s.overallPunctualityRate}% of attended shifts recorded without a late arrival. The ${s.topPerformingDept} department achieved the highest attendance rate this month, demonstrating strong staffing discipline. The ${s.lowestAttendanceDept} department recorded the lowest attendance rate and is recommended for review with departmental heads to identify any underlying operational or staffing challenges.

A total of ${s.totalHoursWorked.toLocaleString()} hours were worked across the hospital, inclusive of ${s.totalOvertimeHours.toLocaleString()} overtime hours, representing an overtime rate of ${s.overallOvertimeRate}% of total hours worked. The ${s.highestOvertimeDept} department logged the highest overtime, which may indicate understaffing or increased patient demand — management should assess whether additional permanent or locum staff are required.

Leave utilisation this month comprised ${s.totalAnnualLeaveDays} annual leave days and ${s.totalSickLeaveDays} sick leave days. The hospital currently employs ${s.totalLocum} locum staff and ${s.totalPermanent} permanent staff.

Schedule adherence for ${mon} ${yr} stands at ${s.overallAdherenceRate}%, which is ${adherenceDesc}. Out of ${s.totalScheduled} scheduled working shifts, ${s.totalAdhered} were fulfilled with a recorded clock-in. ${s.lowestAdherenceDept} recorded the lowest schedule adherence this month and is recommended for immediate departmental review.

Management attention is recommended for departments with attendance rates below 80%, absenteeism above 10%, punctuality below 85%, or overtime rates above 15%, as these patterns may indicate staff burnout or structural resource gaps.`
}

export default function ReportPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  async function fetchReport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/report?month=${month}&year=${year}`)
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [month, year])

  function handlePrint() {
    window.print()
  }

  const genDate = data ? new Date(data.generatedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }) : ''
  const s = data?.summary

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #ceo-report { display: block !important; }
          #report-controls { display: none !important; }
          @page { margin: 20mm; size: A4 portrait; }
        }
      `}</style>

      {/* Controls — hidden on print */}
      <div id="report-controls" className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">CEO Monthly Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Generate and download the monthly performance summary</p>
          </div>
          <button
            onClick={handlePrint}
            disabled={!data}
            className="px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download / Print PDF
          </button>
        </div>

        {/* Month / Year selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <button
                key={m}
                onClick={() => setMonth(m)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${m === month ? 'bg-foreground text-background' : 'hover:bg-muted text-muted-foreground'}`}
              >
                {MONTHS[m-1].slice(0,3)}
              </button>
            ))}
          </div>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {loading && <p className="text-sm text-muted-foreground py-8 text-center">Generating report…</p>}
      </div>

      {/* ── Printable Report ── */}
      {data && (
        <div
          id="ceo-report"
          ref={printRef}
          className="max-w-5xl mx-auto px-8 pb-12 space-y-8 text-gray-900 bg-white"
          style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a' }}
        >
          {/* Letterhead */}
          <div className="pt-8 border-b-2 border-gray-800 pb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
                  AMC HOSPITAL
                </h1>
                <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Workforce Management System
                </p>
              </div>
              <div className="text-right text-xs text-gray-500" style={{ fontFamily: 'Arial, sans-serif' }}>
                <p className="font-semibold text-sm text-gray-700">MONTHLY PERFORMANCE REPORT</p>
                <p className="mt-1">{MONTHS[data.month - 1].toUpperCase()} {data.year}</p>
                <p className="mt-1">Generated: {genDate}</p>
                <p className="mt-1 italic">Confidential — For CEO Review</p>
              </div>
            </div>
          </div>

          {/* Summary KPI strip */}
          <div className="grid grid-cols-4 gap-4" style={{ fontFamily: 'Arial, sans-serif' }}>
            {[
              { label: 'Active Staff', value: s!.totalActiveStaff },
              { label: 'Attendance Rate', value: `${s!.overallAttendanceRate}%` },
              { label: 'Punctuality Rate', value: `${s!.overallPunctualityRate}%` },
              { label: 'Absenteeism Rate', value: `${s!.overallAbsenteeismRate}%` },
              { label: 'Shift Adherence', value: `${s!.overallAdherenceRate}%` },
              { label: 'Overtime Rate', value: `${s!.overallOvertimeRate}%` },
              { label: 'Locum Staff', value: s!.totalLocum },
              { label: 'Permanent Staff', value: s!.totalPermanent },
            ].map(k => (
              <div key={k.label} className="border border-gray-200 rounded-lg p-4 text-center bg-gray-50">
                <div className="text-2xl font-bold text-gray-900">{k.value}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Executive Narrative */}
          <div>
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-2" style={{ fontFamily: 'Arial, sans-serif' }}>
              Executive Summary
            </h2>
            <div className="space-y-4">
              {narrative(data).split('\n\n').map((para, i) => (
                <p key={i} className="text-sm leading-relaxed text-gray-700" style={{ textAlign: 'justify' }}>
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-3 gap-4" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Top Performing Dept</p>
              <p className="font-bold text-gray-900 mt-1">{s!.topPerformingDept}</p>
              <p className="text-xs text-green-600 mt-0.5">Highest attendance rate</p>
            </div>
            <div className="border-l-4 border-red-400 pl-4 py-2">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Needs Attention</p>
              <p className="font-bold text-gray-900 mt-1">{s!.lowestAttendanceDept}</p>
              <p className="text-xs text-red-500 mt-0.5">Lowest attendance rate</p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4 py-2">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Highest Overtime</p>
              <p className="font-bold text-gray-900 mt-1">{s!.highestOvertimeDept}</p>
              <p className="text-xs text-amber-600 mt-0.5">Review staffing levels</p>
            </div>
          </div>

          {/* Attendance breakdown */}
          <div style={{ fontFamily: 'Arial, sans-serif' }}>
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-2">Attendance Summary</h2>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Days Present', value: s!.totalPresent, color: '#16a34a' },
                { label: 'Days Absent', value: s!.totalAbsent, color: '#dc2626' },
                { label: 'On Leave', value: s!.totalOnLeave, color: '#d97706' },
                { label: 'Late Arrivals', value: s!.totalLate, color: '#7c3aed' },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <div className="text-xl font-bold" style={{ color: k.color }}>{k.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Annual Leave Days', value: s!.totalAnnualLeaveDays },
                { label: 'Sick Leave Days', value: s!.totalSickLeaveDays },
              ].map(k => (
                <div key={k.label} className="flex justify-between border-b border-gray-100 py-2">
                  <span className="text-sm text-gray-600">{k.label}</span>
                  <span className="text-sm font-semibold">{k.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Department performance table */}
          <div style={{ fontFamily: 'Arial, sans-serif' }}>
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-2">Department Performance</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {['Department','Staff','Locum','Present','Absent','Leave','Late','Att. Rate','Hrs Worked','Overtime','Ann. Leave','Sick Leave'].map(h => (
                    <th key={h} className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.departments
                  .sort((a, b) => b.attendanceRate - a.attendanceRate)
                  .map((d, i) => (
                    <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-2 py-1.5 font-medium">{d.name}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">{d.totalStaff}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">{d.locumCount || '—'}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center text-green-700 font-medium">{d.present}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center text-red-600">{d.absent}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center text-amber-600">{d.onLeave}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">{d.late}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center font-bold" style={{ color: d.attendanceRate >= 90 ? '#16a34a' : d.attendanceRate >= 75 ? '#d97706' : '#dc2626' }}>
                        {d.attendanceRate}%
                      </td>
                      <td className="border border-gray-200 px-2 py-1.5 text-right">{d.hoursWorked.toLocaleString()}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-right">{d.overtimeHours.toLocaleString()}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">{d.annualLeaveDays}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">{d.sickLeaveDays}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Schedule Adherence by Department */}
          <div style={{ fontFamily: 'Arial, sans-serif' }}>
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-2">Schedule Adherence by Department</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {['Department', 'Scheduled Shifts', 'Fulfilled', 'Adherence Rate'].map(h => (
                    <th key={h} className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.departments
                  .sort((a, b) => b.scheduleAdherenceRate - a.scheduleAdherenceRate)
                  .map((d, i) => (
                    <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-2 py-1.5 font-medium">{d.name}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">{d.scheduledCount}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center">{d.adheredCount}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center font-bold" style={{ color: d.scheduleAdherenceRate >= 90 ? '#16a34a' : d.scheduleAdherenceRate >= 75 ? '#d97706' : '#dc2626' }}>
                        {d.scheduleAdherenceRate}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Key Metrics by Department */}
          <div style={{ fontFamily: 'Arial, sans-serif' }}>
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-2">Key Metrics by Department</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {['Department', 'Punctuality Rate', 'Absenteeism Rate', 'Overtime Rate'].map(h => (
                    <th key={h} className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.departments
                  .sort((a, b) => b.punctualityRate - a.punctualityRate)
                  .map((d, i) => (
                    <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-2 py-1.5 font-medium">{d.name}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center font-bold"
                        style={{ color: d.punctualityRate >= 90 ? '#16a34a' : d.punctualityRate >= 75 ? '#d97706' : '#dc2626' }}>
                        {d.punctualityRate}%
                      </td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center font-bold"
                        style={{ color: d.absenteeismRate <= 5 ? '#16a34a' : d.absenteeismRate <= 10 ? '#d97706' : '#dc2626' }}>
                        {d.absenteeismRate}%
                      </td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center font-bold"
                        style={{ color: d.overtimeRate <= 10 ? '#16a34a' : d.overtimeRate <= 20 ? '#d97706' : '#dc2626' }}>
                        {d.overtimeRate}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-300 pt-4 flex justify-between items-center text-xs text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>
            <span>AMC Hospital — Workforce Management System</span>
            <span>Report generated: {genDate}</span>
            <span>CONFIDENTIAL</span>
          </div>
        </div>
      )}
    </>
  )
}
