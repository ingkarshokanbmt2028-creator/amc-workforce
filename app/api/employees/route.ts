import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const departmentId = searchParams.get('departmentId')
  const departmentCode = searchParams.get('departmentCode')

  const where: Record<string, unknown> = { status: 'ACTIVE' }

  if (departmentId) {
    where.departmentId = departmentId
  } else if (departmentCode) {
    where.department = { code: departmentCode }
  }

  const employees = await prisma.employee.findMany({
    where,
    include: { department: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(employees)
}
