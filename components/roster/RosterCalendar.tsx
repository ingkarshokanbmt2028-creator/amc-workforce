'use client'

import { useState, useMemo } from 'react'
import { ShiftCell } from './ShiftCell'
import { ShiftModal } from './ShiftModal'
import { SHIFT_HOURS } from '@/lib/shifts'

interface Employee {
  id: string
  name: string
  expectedMonthlyHours: number
}

interface RosterSlot {
  id: string
  employeeId: string
  date: string
  shiftType: string
  isEmergency: boolean
}

interface RosterCalendarProps {
  rosterId: string
  employees: Employee[]
  slots: RosterSlot[]
  month: number
  year: number
  onSlotChange: (employeeId: string, date: string, shiftType: string) => Promise<void>
}

export function RosterCalendar({
  rosterId,
  employees,
  slots,
  month,
  year,
  onSlotChange,
}: RosterCalendarProps) {
  const [modal, setModal] = useState<{
    employeeId: string
    employeeName: string
    date: string
    currentShift: string | null
  } | null>(null)

  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Build lookup: employeeId → date string → slot
  const slotMap = useMemo(() => {
    const map = new Map<string, Map<string, RosterSlot>>()
    for (const slot of slots) {
      const dateKey = slot.date.slice(0, 10)
      if (!map.has(slot.employeeId)) map.set(slot.employeeId, new Map())
      map.get(slot.employeeId)!.set(dateKey, slot)
    }
    return map
  }, [slots])

  function getDateKey(day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function totalHours(employeeId: string): number {
    const byDate = slotMap.get(employeeId)
    if (!byDate) return 0
    return Array.from(byDate.values()).reduce(
      (sum, slot) => sum + (SHIFT_HOURS[slot.shiftType] ?? 0),
      0,
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="text-xs border-collapse min-w-max">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 bg-muted/50 z-10 px-3 py-2 text-left font-semibold min-w-[180px]">
                Employee
              </th>
              {days.map((d) => {
                const dow = new Date(year, month - 1, d).getDay()
                const isWeekend = dow === 0 || dow === 6
                return (
                  <th
                    key={d}
                    className={`px-1 py-2 text-center font-semibold min-w-[36px] ${isWeekend ? 'bg-slate-100 text-slate-500' : ''}`}
                  >
                    {d}
                  </th>
                )
              })}
              <th className="px-3 py-2 text-center font-semibold min-w-[64px]">Hrs</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const hours = totalHours(emp.id)
              const isOT = hours > emp.expectedMonthlyHours
              return (
                <tr
                  key={emp.id}
                  className={`border-t border-border hover:bg-muted/30 ${isOT ? 'bg-orange-50' : ''}`}
                >
                  <td className="sticky left-0 z-10 bg-white px-3 py-1 font-medium truncate max-w-[180px]">
                    {isOT && (
                      <span className="mr-1 text-orange-500 font-bold" title="Overtime">⚠</span>
                    )}
                    {emp.name}
                  </td>
                  {days.map((d) => {
                    const dateKey = getDateKey(d)
                    const slot = slotMap.get(emp.id)?.get(dateKey)
                    return (
                      <td key={d} className="px-0.5 py-0.5">
                        <ShiftCell
                          shiftType={slot?.shiftType ?? null}
                          isEmergency={slot?.isEmergency}
                          onClick={() =>
                            setModal({
                              employeeId: emp.id,
                              employeeName: emp.name,
                              date: dateKey,
                              currentShift: slot?.shiftType ?? null,
                            })
                          }
                        />
                      </td>
                    )
                  })}
                  <td
                    className={`px-3 py-1 text-center font-semibold ${isOT ? 'text-orange-600' : ''}`}
                  >
                    {hours}
                    {isOT && <span className="text-orange-400 ml-0.5">!</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <ShiftModal
          open
          employeeName={modal.employeeName}
          date={modal.date}
          currentShift={modal.currentShift}
          onClose={() => setModal(null)}
          onSave={(shiftType) => onSlotChange(modal.employeeId, modal.date, shiftType)}
        />
      )}
    </>
  )
}
