import { NextRequest, NextResponse } from 'next/server'
import { getMockRosters } from '@/lib/mock-roster'

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

  let rosters: unknown[] = []
  try {
    const { prisma } = await import('@/lib/prisma')
    rosters = await prisma.roster.findMany({
      where,
      include: {
        department: true,
        slots: {
          include: { employee: true },
          orderBy: [{ date: 'asc' }, { employee: { name: 'asc' } }],
        },
      },
    })
  } catch { /* DB unavailable */ }

  // Fall back to mock rota data when DB has no results
  if (rosters.length === 0) {
    let mockRosters = getMockRosters(month, year)
    if (departmentId) {
      mockRosters = mockRosters.filter(r => r.departmentId === departmentId)
    }
    return NextResponse.json(mockRosters)
  }

  return NextResponse.json(rosters)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { departmentId, month, year, createdBy } = body

  if (!departmentId || !month || !year || !createdBy) {
    return NextResponse.json({ error: 'departmentId, month, year, createdBy required' }, { status: 400 })
  }

  const { prisma } = await import('@/lib/prisma')

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
