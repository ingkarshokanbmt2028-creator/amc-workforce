'use client'

import { STATUS_HEAT } from './StatusBadge'

interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  status: string
  employee: { name: string; department: { code: string } }
}

interface WeeklyHeatmapProps {
  records: AttendanceRecord[]
  startDate: string
}

export function WeeklyHeatmap({ records, startDate }: WeeklyHeatmapProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })

  // Group by employee
  const byEmployee = new Map<string, { name: string; dept: string; byDate: Map<string, string> }>()
  for (const rec of records) {
    if (!byEmployee.has(rec.employeeId)) {
      byEmployee.set(rec.employeeId, {
        name: rec.employee.name,
        dept: rec.employee.department?.code ?? '',
        byDate: new Map(),
      })
    }
    byEmployee.get(rec.employeeId)!.byDate.set(rec.date.slice(0, 10), rec.status)
  }

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-semibold min-w-[180px]">Employee</th>
            <th className="px-2 py-2 text-center font-semibold min-w-[32px]">Dept</th>
            {days.map((d) => (
              <th key={d.toISOString()} className="px-1 py-2 text-center font-semibold min-w-[64px]">
                <div>{DOW[d.getDay()]}</div>
                <div className="text-muted-foreground font-normal">{d.getDate()}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {byEmployee.size === 0 && (
            <tr>
              <td colSpan={9} className="py-10 text-center text-muted-foreground">
                No data for this week.
              </td>
            </tr>
          )}
          {Array.from(byEmployee.entries()).map(([empId, { name, dept, byDate }]) => (
            <tr key={empId} className="border-t border-border hover:bg-muted/20">
              <td className="px-4 py-2 font-medium truncate max-w-[180px]">{name}</td>
              <td className="px-2 py-2 text-center text-muted-foreground">{dept}</td>
              {days.map((d) => {
                const key = d.toISOString().slice(0, 10)
                const status = byDate.get(key)
                return (
                  <td key={key} className="px-1 py-1 text-center">
                    <div
                      className={`rounded h-7 flex items-center justify-center text-xs font-semibold ${status ? STATUS_HEAT[status] ?? 'bg-slate-100' : 'bg-slate-50 text-slate-300'}`}
                      title={status ?? 'No data'}
                    >
                      {status ? status.charAt(0) : '·'}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
