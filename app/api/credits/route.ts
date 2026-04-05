import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/credits?month=4&year=2026&employeeId=...&departmentId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month      = searchParams.get('month')
  const year       = searchParams.get('year')
  const employeeId = searchParams.get('employeeId')
  const departmentId = searchParams.get('departmentId')

  const where: Record<string, unknown> = {}
  if (month) where.month = parseInt(month)
  if (year)  where.year  = parseInt(year)
  if (employeeId) where.employeeId = employeeId
  if (departmentId) where.employee = { departmentId }

  const credits = await prisma.creditBalance.findMany({
    where,
    include: { employee: { include: { department: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  return NextResponse.json(credits)
}

// POST /api/credits — upsert a credit balance record
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { employeeId, month, year, initialCredit, deductions, overtimeCredits, totalHoursWorked, targetHours } = body

  if (!employeeId || !month || !year) {
    return NextResponse.json({ error: 'employeeId, month, year required' }, { status: 400 })
  }

  const finalCredit = (initialCredit ?? 1500) - (deductions ?? 0) + (overtimeCredits ?? 0)

  const record = await prisma.creditBalance.upsert({
    where: { employeeId_month_year: { employeeId, month: parseInt(month), year: parseInt(year) } },
    update: {
      initialCredit:    initialCredit    ?? undefined,
      deductions:       deductions       ?? undefined,
      overtimeCredits:  overtimeCredits  ?? undefined,
      finalCredit,
      totalHoursWorked: totalHoursWorked ?? undefined,
      targetHours:      targetHours      ?? undefined,
    },
    create: {
      employeeId,
      month:            parseInt(month),
      year:             parseInt(year),
      initialCredit:    initialCredit    ?? 1500,
      deductions:       deductions       ?? 0,
      overtimeCredits:  overtimeCredits  ?? 0,
      finalCredit,
      totalHoursWorked: totalHoursWorked ?? 0,
      targetHours:      targetHours      ?? 250,
    },
  })

  return NextResponse.json(record)
}
