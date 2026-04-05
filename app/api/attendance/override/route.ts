import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { attendanceId, status, reason, overrideBy, notes } = body

  if (!attendanceId || !status || !reason) {
    return NextResponse.json({ error: 'attendanceId, status, reason required' }, { status: 400 })
  }

  const existing = await prisma.attendance.findUnique({ where: { id: attendanceId } })
  if (!existing) return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      status,
      isManualOverride: true,
      overrideBy,
      overrideReason: reason,
      notes,
    },
    include: { employee: { include: { department: true } } },
  })

  await prisma.auditLog.create({
    data: {
      action: 'ATTENDANCE_OVERRIDE',
      entityType: 'Attendance',
      entityId: attendanceId,
      oldValue: { status: existing.status },
      newValue: { status },
      reason,
      userId: overrideBy,
    },
  })

  return NextResponse.json(updated)
}
