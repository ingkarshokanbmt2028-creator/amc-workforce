import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SHIFT_HOURS, SHIFT_TIMES } from '@/lib/shifts'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rosterId = searchParams.get('rosterId')

  if (!rosterId) return NextResponse.json({ error: 'rosterId required' }, { status: 400 })

  const slots = await prisma.rosterSlot.findMany({
    where: { rosterId },
    include: { employee: true, attendance: true },
    orderBy: [{ date: 'asc' }, { employee: { name: 'asc' } }],
  })

  return NextResponse.json(slots)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { rosterId, employeeId, date, shiftType, notes } = body

  if (!rosterId || !employeeId || !date || !shiftType) {
    return NextResponse.json({ error: 'rosterId, employeeId, date, shiftType required' }, { status: 400 })
  }

  const times = SHIFT_TIMES[shiftType as string]
  const slot = await prisma.rosterSlot.create({
    data: {
      rosterId,
      employeeId,
      date: new Date(date),
      shiftType,
      startTime: times?.start,
      endTime: times?.end,
      plannedHours: SHIFT_HOURS[shiftType as string] ?? 0,
      notes,
    },
    include: { employee: true },
  })

  return NextResponse.json(slot, { status: 201 })
}
