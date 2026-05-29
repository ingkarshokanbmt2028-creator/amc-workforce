import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const HR_EMAIL = process.env.HR_EMAIL ?? 'hr@accramedical.com'
const RESEND_API_KEY = process.env.RESEND_API_KEY

export async function POST(req: NextRequest) {
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const { date } = await req.json()
  const targetDate = date ? new Date(date + 'T00:00:00.000Z') : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')
  const dateStr = targetDate.toISOString().slice(0, 10)

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, department: { select: { name: true } }, position: true },
  })

  const attendance = await prisma.attendance.findMany({
    where: { date: targetDate },
    select: { employeeId: true, clockIn: true, status: true },
  })

  const clockedInIds = new Set(attendance.filter(a => a.clockIn).map(a => a.employeeId))
  const absent = employees.filter(e => !clockedInIds.has(e.id))
  const present = employees.length - absent.length

  const dayLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const rows = absent.map(e =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${e.name}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280">${(e as any).department?.name ?? '—'}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280">${e.position ?? '—'}</td></tr>`
  ).join('')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
      <div style="background:#0f1117;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:#f59e0b;margin:0;font-size:20px">AMC Hospital — Daily Absence Alert</h1>
        <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:13px">${dayLabel}</p>
      </div>
      <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#374151;font-size:14px">
          <strong style="color:#dc2626">${absent.length} employees</strong> have not clocked in today.
          <span style="color:#6b7280"> ${present} of ${employees.length} are present.</span>
        </p>
        ${absent.length === 0 ? '<p style="color:#16a34a;font-weight:600">All staff have clocked in today.</p>' : `
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Name</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Department</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Position</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`}
        <p style="color:#9ca3af;font-size:11px;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:12px">Automated notification from AMC Workforce. Do not reply.</p>
      </div>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'AMC Workforce <onboarding@resend.dev>',
      to: [HR_EMAIL],
      subject: `[AMC] ${absent.length} absent today — ${dayLabel}`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Resend error: ${err}` }, { status: 500 })
  }

  return NextResponse.json({ sent: true, absent: absent.length, present, total: employees.length })
}
