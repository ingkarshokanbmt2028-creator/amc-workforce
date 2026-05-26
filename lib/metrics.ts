export interface AttRecord {
  employeeId: string
  employeeName?: string
  departmentName?: string
  date?: string
  status: string
  clockIn?: string | null
  clockOut?: string | null
  totalHours?: number
  lateMinutes?: number
}

export function calcMetrics(
  empIds: string[],
  recByEmp: Map<string, AttRecord>,
  rosteredIds: Set<string>,
) {
  const withRecord  = empIds.filter(id => recByEmp.has(id))
  const clockedIn   = withRecord.filter(id => recByEmp.get(id)?.clockIn)
  const onTime      = clockedIn.filter(id => recByEmp.get(id)?.status !== 'LATE')
  const overtime    = clockedIn.filter(id => (recByEmp.get(id)?.totalHours ?? 0) > 9)
  const absent      = withRecord.filter(id => recByEmp.get(id)?.status === 'ABSENT' || !recByEmp.get(id)?.clockIn)

  // When no roster slots are linked (mock data or no rota published yet),
  // fall back to treating every employee with a record as scheduled.
  const scheduled   = rosteredIds.size > 0 ? empIds.filter(id => rosteredIds.has(id)) : withRecord
  const adhered     = scheduled.filter(id => recByEmp.get(id)?.clockIn)

  return {
    punctuality:    clockedIn.length > 0  ? Math.round((onTime.length   / clockedIn.length)  * 100) : null,
    overtimeRate:   clockedIn.length > 0  ? Math.round((overtime.length  / clockedIn.length)  * 100) : null,
    shiftAdherence: scheduled.length > 0  ? Math.round((adhered.length   / scheduled.length)  * 100) : null,
    absenteeism:    withRecord.length > 0 ? Math.round((absent.length    / withRecord.length)  * 100) : null,
  }
}
