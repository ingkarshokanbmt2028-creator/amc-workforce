import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))
  const departmentId = searchParams.get('departmentId')

  if (!month || !year) {
    return NextResponse.json({ error: 'month and year are required' }, { status: 400 })
  }

  const where = {
    month,
    year,
    ...(departmentId ? { departmentId } : {}),
  }

  const rosters = await prisma.roster.findMany({
    where,
    include: {
      department: true,
      slots: {
        include: { employee: true },
        orderBy: [{ date: 'asc' }, { employee: { name: 'asc' } }],
      },
    },
  })

  return NextResponse.json(rosters)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { departmentId, month, year, createdBy } = body

  if (!departmentId || !month || !year || !createdBy) {
    return NextResponse.json({ error: 'departmentId, month, year, createdBy required' }, { status: 400 })
  }

  const existing = await prisma.roster.findUnique({
    where: { departmentId_month_year: { departmentId, month, year } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Roster already exists for this period' }, { status: 409 })
  }

  const roster = await prisma.roster.create({
    data: { departmentId, month, year, createdBy },
    include: { department: true },
  })

  return NextResponse.json(roster, { status: 201 })
}
