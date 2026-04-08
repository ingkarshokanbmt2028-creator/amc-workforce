import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

// Actual columns: 0=#, 1=COUNT, 2=NAME, 4=STAFF_ID, 6=DEPARTMENT, 8=LOCATION, 10=POSITION

const DEPT_MAP: Record<string, { id: string; code: string }> = {
  'MEDICINE':           { id: 'MED', code: 'MED' },
  'NURSING & MIDWIFERY':{ id: 'NUR', code: 'NUR' },
  'ALLIED HEALTH':      { id: 'AHT', code: 'AHT' },
  'ADMIN':              { id: 'ADM', code: 'ADM' },
  'AUXILIARY':          { id: 'AUX', code: 'AUX' },
  'PHARMACY':           { id: 'PHM', code: 'PHM' },
  'IMAGING':            { id: 'IMG', code: 'IMG' },
  'SPECIALIST':         { id: 'SPE', code: 'SPE' },
  'EMERGENCY':          { id: 'EMG', code: 'EMG' },
  'HDU-ICU':            { id: 'HDU', code: 'HDU' },
  'LABORATORY':         { id: 'LAB', code: 'LAB' },
  'MAINTENANCE':        { id: 'MNT', code: 'MNT' },
  'THEATRE':            { id: 'THR', code: 'THR' },
  'WARD':               { id: 'WRD', code: 'WRD' },
}

function resolveDept(raw: string) {
  const up = raw.toUpperCase().trim()
  for (const [key, val] of Object.entries(DEPT_MAP)) {
    if (up.includes(key)) return { ...val, name: key }
  }
  return { id: 'ADM', code: 'ADM', name: raw || 'ADMIN' }
}

let cached: Record<string, unknown>[] | null = null

function loadEmployeesFromExcel() {
  if (cached) return cached
  const filePath = path.join(process.cwd(), 'data', 'AMC_EMPLOYEE_LIST_2026.xlsx')
  if (!fs.existsSync(filePath)) return []

  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { defval: '', header: 1 })

  const employees: Record<string, unknown>[] = []
  for (const rawRow of rows) {
    const row = rawRow as string[]
    const name    = String(row[2]  ?? '').trim()
    const staffId = String(row[4]  ?? '').trim()
    const deptRaw = String(row[6]  ?? '').trim()
    const location = String(row[8] ?? 'ACCRA').trim()
    const position = String(row[10] ?? '').trim()

    if (!name || !staffId || name === 'NAME' || staffId === 'STAFF ID') continue
    if (typeof row[0] === 'string' && isNaN(Number(row[0]))) continue

    const dept = resolveDept(deptRaw)
    const empType = position.toLowerCase().includes('locum') ? 'LOCUM'
      : position.toLowerCase().includes('specialist') ? 'SPECIALIST' : 'PERMANENT'

    employees.push({
      id: staffId,
      staffId,
      name,
      position: position || 'Staff',
      employeeType: empType,
      status: 'ACTIVE',
      location: location || 'ACCRA',
      departmentId: dept.id,
      department: { id: dept.id, name: dept.name, code: dept.code },
    })
  }
  cached = employees
  return employees
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const departmentCode = searchParams.get('departmentCode')
  const departmentId   = searchParams.get('departmentId')

  try {
    const { prisma } = await import('@/lib/prisma')
    const where: Record<string, unknown> = { status: 'ACTIVE' }
    if (departmentId) where.departmentId = departmentId
    else if (departmentCode) where.department = { code: departmentCode }
    const employees = await prisma.employee.findMany({
      where, include: { department: true }, orderBy: { name: 'asc' },
    })
    if (employees.length > 0) return NextResponse.json(employees)
  } catch { /* DB not available */ }

  let employees = loadEmployeesFromExcel()
  if (departmentCode) employees = employees.filter(e => e.departmentId === departmentCode)
  else if (departmentId) employees = employees.filter(e => e.departmentId === departmentId)

  return NextResponse.json(employees)
}
