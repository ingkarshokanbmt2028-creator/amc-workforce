import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/employees/[id] — update fields (e.g. status)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const employee = await prisma.employee.update({
    where: { id },
    data: body,
  })
  return NextResponse.json(employee)
}

// DELETE /api/employees/[id] — soft-delete (set status INACTIVE)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const employee = await prisma.employee.update({
    where: { id },
    data: { status: 'INACTIVE' },
  })
  return NextResponse.json({ ok: true, id: employee.id, status: employee.status })
}
