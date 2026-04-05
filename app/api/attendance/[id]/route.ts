import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/attendance/[id] — manual override of attendance record
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.attendance.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.attendance.update({
    where: { id },
    data: {
      ...(body.status        !== undefined && { status: body.status }),
      ...(body.isManualOverride !== undefined && { isManualOverride: body.isManualOverride }),
      ...(body.overrideBy    !== undefined && { overrideBy: body.overrideBy }),
      ...(body.overrideReason !== undefined && { overrideReason: body.overrideReason }),
      ...(body.notes         !== undefined && { notes: body.notes }),
      ...(body.clockIn       !== undefined && { clockIn: body.clockIn ? new Date(body.clockIn) : null }),
      ...(body.clockOut      !== undefined && { clockOut: body.clockOut ? new Date(body.clockOut) : null }),
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'ATTENDANCE_OVERRIDE',
      entityType: 'Attendance',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: body.status },
      reason: body.overrideReason ?? 'Manual override',
      userId: body.overrideBy ?? 'admin',
    },
  })

  return NextResponse.json(updated)
}
