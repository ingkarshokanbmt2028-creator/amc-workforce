import { NextRequest, NextResponse } from 'next/server'

interface IncomingPunch {
  emp_code: string
  punch_time: string
  punch_state: '0' | '1'
  terminal_sn?: string
}

interface PushPayload {
  punches: IncomingPunch[]
  from_date: string
  to_date: string
  secret: string
}

export async function POST(req: NextRequest) {
  let body: PushPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Simple shared secret auth — set SYNC_SECRET in Vercel env vars
  const expected = process.env.SYNC_SECRET
  if (!expected || body.secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!Array.isArray(body.punches) || body.punches.length === 0) {
    return NextResponse.json({ error: 'No punches provided' }, { status: 400 })
  }

  const { processPunches } = await import('@/services/biotime.service')
  const result = await processPunches(
    body.punches,
    new Date(body.from_date),
    new Date(body.to_date),
  )

  return NextResponse.json({ ok: true, ...result })
}
