import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slotId, newEmployeeId, reason, changedBy } = body

  if (!slotId || !newEmployeeId || !reason) {
    return NextResponse.json({ error: 'slotId, newEmployeeId, reason required' }, { status: 400 })
  }

  const slot = await prisma.rosterSlot.findUnique({
    where: { id: slotId },
    include: { employee: true },
  })
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  const newEmployee = await prisma.employee.findUnique({ where: { id: newEmployeeId } })
  if (!newEmployee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const updated = await prisma.rosterSlot.update({
    where: { id: slotId },
    data: {
      employeeId: newEmployeeId,
      isEmergency: true,
      coveringFor: slot.employeeId,
      changedBy,
      changedAt: new Date(),
      changeReason: reason,
    },
    include: { employee: true },
  })

  await prisma.auditLog.create({
    data: {
      action: 'EMERGENCY_SWAP',
      entityType: 'RosterSlot',
      entityId: slotId,
      oldValue: { employeeId: slot.employeeId, employeeName: slot.employee.name },
      newValue: { employeeId: newEmployeeId, employeeName: newEmployee.name },
      reason,
      userId: changedBy,
    },
  })

  return NextResponse.json(updated)
}
