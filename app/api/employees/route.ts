import { NextRequest, NextResponse } from 'next/server'
import employeesData from '@/lib/employees-data.json'

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

  let employees = employeesData as Record<string, unknown>[]
  if (departmentCode) employees = employees.filter(e => e.departmentId === departmentCode)
  else if (departmentId) employees = employees.filter(e => e.departmentId === departmentId)

  return NextResponse.json(employees)
}
