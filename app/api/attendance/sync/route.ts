import { NextRequest, NextResponse } from 'next/server'
import { syncAttendance } from '@/services/biotime.service'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - (body.days ?? 30))

  const result = await syncAttendance(fromDate, toDate)

  if (result.errors) {
    return NextResponse.json({ ...result, ok: false }, { status: 500 })
  }

  return NextResponse.json({ ...result, ok: true })
}
