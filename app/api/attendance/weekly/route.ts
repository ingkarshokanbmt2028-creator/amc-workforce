import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  const startDateParam = searchParams.get('startDate')
  const departmentId = searchParams.get('departmentId')

  const startDate = startDateParam ? new Date(startDateParam) : (() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay()) // start of week (Sunday)
    return d
  })()
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  endDate.setHours(23, 59, 59, 999)

  const attendance = await prisma.attendance.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      ...(employeeId ? { employeeId } : {}),
      ...(departmentId ? { employee: { departmentId } } : {}),
    },
    include: {
      employee: { include: { department: true } },
      rosterSlot: true,
    },
    orderBy: [{ employee: { name: 'asc' } }, { date: 'asc' }],
  })

  return NextResponse.json({ attendance, startDate, endDate })
}
