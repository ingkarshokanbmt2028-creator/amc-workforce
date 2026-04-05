import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { publishedBy } = body

  const roster = await prisma.roster.findUnique({ where: { id } })
  if (!roster) return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
  if (roster.status === 'LOCKED') {
    return NextResponse.json({ error: 'Roster is locked and cannot be changed' }, { status: 400 })
  }

  const updated = await prisma.roster.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      publishedBy: publishedBy ?? 'system',
    },
  })

  await prisma.auditLog.create({
    data: {
      action: 'ROSTER_PUBLISHED',
      entityType: 'Roster',
      entityId: id,
      oldValue: { status: roster.status },
      newValue: { status: 'PUBLISHED' },
      userId: publishedBy,
    },
  })

  return NextResponse.json(updated)
}
