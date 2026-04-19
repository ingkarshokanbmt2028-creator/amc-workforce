import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateParam    = searchParams.get('date')
  const departmentId = searchParams.get('departmentId')
  const monthParam   = searchParams.get('month')
  const yearParam    = searchParams.get('year')
  const limit        = parseInt(searchParams.get('limit') ?? '500')

  try {
    const { prisma } = await import('@/lib/prisma')

    let dateFilter: Record<string, unknown>
    if (monthParam && yearParam) {
      const month = parseInt(monthParam)
      const year  = parseInt(yearParam)
      dateFilter = { date: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0) } }
    } else {
      const date = dateParam ? new Date(dateParam) : new Date()
      date.setHours(0, 0, 0, 0)
      dateFilter = { date }
    }

    const attendance = await prisma.attendance.findMany({
      where: {
        ...dateFilter,
        ...(departmentId ? { employee: { departmentId } } : {}),
      },
      include: {
        employee: { include: { department: true } },
        rosterSlot: true,
      },
      orderBy: { employee: { name: 'asc' } },
      take: limit,
    })

    const lastSync = await prisma.biotimeSyncLog.findFirst({
      orderBy: { syncedAt: 'desc' },
    })

    return NextResponse.json({ attendance, lastSync })
  } catch {
    return NextResponse.json({ attendance: [], lastSync: null })
  }
}
