import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SHIFT_HOURS, SHIFT_TIMES } from '@/lib/shifts'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { shiftType, changedBy, changeReason, notes } = body

  const existing = await prisma.rosterSlot.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  const times = SHIFT_TIMES[shiftType as string]
  const updated = await prisma.rosterSlot.update({
    where: { id },
    data: {
      shiftType,
      startTime: times?.start ?? existing.startTime,
      endTime: times?.end ?? existing.endTime,
      plannedHours: SHIFT_HOURS[shiftType as string] ?? 0,
      changedBy,
      changedAt: new Date(),
      changeReason,
      notes,
    },
    include: { employee: true },
  })

  await prisma.auditLog.create({
    data: {
      action: 'ROSTER_CHANGE',
      entityType: 'RosterSlot',
      entityId: id,
      oldValue: { shiftType: existing.shiftType },
      newValue: { shiftType },
      reason: changeReason,
      userId: changedBy,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const existing = await prisma.rosterSlot.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  await prisma.rosterSlot.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
