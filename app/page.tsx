'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

const DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS_ABB = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function formatLate(minutes: number) {
  if (minutes <= 0) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m late`
  if (m === 0) return `${h}h late`
  return `${h}h ${m}m late`
}

interface AbsentEmployee {
  id: string
  name: string
  department: string
  position: string
  scheduledIn: string | null
}

export default function Dashboard() {
  const { user } = useAuth()
  const [absent, setAbsent]     = useState<AbsentEmployee[]>([])
  const [total, setTotal]       = useState(0)
  const [present, setPresent]   = useState(0)
  const [loading, setLoading]   = useState(true)
  const [nowMin, setNowMin]     = useState(0)
  const [dayOffset, setDayOffset] = useState(0)

  const now = new Date()
  const viewDate = new Date(now)
  viewDate.setDate(now.getDate() + dayOffset)
  const isToday = dayOffset === 0
  const dateLabel = `${DAYS_FULL[now.getDay()].toUpperCase()} ${now.getDate()} ${MONTHS_ABB[now.getMonth()].toUpperCase()}`
  const dateDisplay = `${DAYS_FULL[viewDate.getDay()]}, ${viewDate.getDate()} ${MONTHS_ABB[viewDate.getMonth()]}`
  const today = viewDate.toISOString().slice(0, 10)

  useEffect(() => {
    setNowMin(now.getHours() * 60 + now.getMinutes())
    setLoading(true)

    async function load() {
      try {
        const [emps, depts, todayAtt] = await Promise.all([
          fetch('/api/employees').then(r => r.json()),
          fetch('/api/departments').then(r => r.json()),
          fetch(`/api/attendance?date=${today}`).then(r => r.ok ? r.json() : { attendance: [] }),
        ])

        const att: any[] = todayAtt.attendance ?? []
        const deptMap = new Map(depts.map((d: any) => [d.id, d]))
        const clockedInIds = new Set(att.filter((a: any) => a.clockIn).map((a: any) => a.employeeId))
        const presentCount = att.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length

        const activeEmps: any[] = emps.filter((e: any) => e.status !== 'INACTIVE')

        const absentList: AbsentEmployee[] = activeEmps
          .filter((e: any) => !clockedInIds.has(e.id))
          .map((e: any) => {
            const dept = deptMap.get(e.departmentId) as any
            const attRec = att.find((a: any) => a.employeeId === e.id)
            return {
              id: e.id,
              name: e.name,
              department: dept?.name ?? '—',
              position: e.position ?? '—',
              scheduledIn: attRec?.scheduledIn ?? null,
            }
          })
          .sort((a, b) => a.department.localeCompare(b.department))

        setTotal(activeEmps.length)
        setPresent(presentCount)
        setAbsent(absentList)
      } catch { /* silent */ } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, dayOffset])

  const missing = absent.length
  const radius  = 54
  const circ    = 2 * Math.PI * radius
  const missingRate = total > 0 ? missing / total : 0
  const arc     = missingRate * circ

  function getLateMinutes(scheduledIn: string | null) {
    const scheduled = scheduledIn ?? '07:00'
    const [sh, sm] = scheduled.split(':').map(Number)
    return Math.max(0, nowMin - (sh * 60 + sm))
  }

  function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('')
  }

  const AVATAR_COLORS = [
    { bg: '#E8DEC8', fg: '#5C4830' },
    { bg: '#D4E0C8', fg: '#3A5C30' },
    { bg: '#C8D8E8', fg: '#2A4A5C' },
    { bg: '#E8C8D4', fg: '#5C2A3A' },
    { bg: '#E0C8E8', fg: '#4A2A5C' },
    { bg: '#C8E8E0', fg: '#2A5C4A' },
  ]

  function avatarColor(name: string) {
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
    return AVATAR_COLORS[Math.abs(h)]
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Top bar */}
      <div className="px-8 pt-6 pb-0 flex items-center justify-between">
        <p className="text-[14px] text-[#555]">
          {greeting()}, <span className="font-bold text-[#1A1A1A]">{user?.email?.split('@')[0] ?? 'Admin'}</span>.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold tracking-[0.12em] text-[#888]">{dateLabel}</span>
          <Link href="/settings" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors text-[#888]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors text-[#888]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="px-8 pt-8 max-w-3xl">
        <h1 className="text-[2.5rem] font-black text-[#1A1A1A] tracking-tight leading-none">
          Who hasn&apos;t clocked in
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => setDayOffset(d => d - 1)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/8 text-[#888] transition-colors font-bold">‹</button>
          <p className="text-sm text-[#888]">{isToday ? 'Today' : dayOffset === -1 ? 'Yesterday' : dateDisplay} · {dateDisplay}</p>
          <button onClick={() => setDayOffset(d => d + 1)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/8 text-[#888] transition-colors font-bold">›</button>
        </div>

        {/* Circle + stats */}
        <div className="flex items-center gap-8 mt-8">
          {loading ? (
            <div className="w-32 h-32 rounded-full border-[9px] border-black/5 animate-pulse shrink-0" />
          ) : (
            <svg width="128" height="128" viewBox="0 0 128 128" className="shrink-0">
              <circle cx="64" cy="64" r={radius} fill="none" stroke="#E5E2D8" strokeWidth="9" />
              {arc > 0 && (
                <circle
                  cx="64" cy="64" r={radius}
                  fill="none"
                  stroke="#C0392B"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${arc} ${circ}`}
                  transform="rotate(-90 64 64)"
                />
              )}
              <text x="64" y="60" textAnchor="middle" dominantBaseline="middle"
                fontSize="28" fontWeight="800" fill="#1A1A1A">
                {missing}
              </text>
              <text x="64" y="82" textAnchor="middle"
                fontSize="11" fill="#1A1A1A" opacity="0.35">
                {missing}/{total}
              </text>
            </svg>
          )}

          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#888]">Did not clock in</p>
            <p className="text-[1.6rem] font-black text-[#1A1A1A] mt-1 leading-tight">
              {loading ? '…' : `${missing} employees missing`}
            </p>
            <p className="text-sm text-[#666] mt-1">
              <span className="font-semibold text-[#444]">{present}</span> of {total} present
            </p>
          </div>
        </div>

        {/* Missing list */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#888]">
              Missing · {missing} people
            </p>
            <Link href="/attendance" className="text-[12px] text-[#888] hover:text-[#444] transition-colors">
              View all attendance →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-black/5 animate-pulse" />
              ))}
            </div>
          ) : absent.length === 0 ? (
            <div className="py-12 text-center text-[#aaa] text-sm bg-white rounded-xl border border-black/5">
              Everyone has clocked in today
            </div>
          ) : (
            <div className="space-y-2">
              {absent.map(emp => {
                const lateMin = getLateMinutes(emp.scheduledIn)
                const color   = avatarColor(emp.name)
                const scheduledDisplay = emp.scheduledIn
                  ? (() => { const [h,m] = emp.scheduledIn.split(':').map(Number); const ap = h>=12?'PM':'AM'; return `${h%12||12}:${String(m).padStart(2,'0')} ${ap}` })()
                  : '7:00 AM'

                return (
                  <div key={emp.id} className="bg-white rounded-xl border border-black/[0.06] px-4 py-3 flex items-center gap-3 shadow-sm">
                    {/* ABSENT badge */}
                    <span className="text-[10px] font-bold tracking-wide px-2 py-1 rounded border border-red-200 text-red-600 flex-shrink-0 bg-red-50">
                      ABSENT
                    </span>

                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ background: color.bg, color: color.fg }}
                    >
                      {getInitials(emp.name)}
                    </div>

                    {/* Name + dept */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{emp.name}</p>
                      <p className="text-[11px] text-[#888] truncate">{emp.department} · {emp.position}</p>
                    </div>

                    {/* Expected time + late */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#999]">Expected</p>
                      <p className="text-[15px] font-black text-[#C0392B] leading-tight">{scheduledDisplay.split(' ')[0]}</p>
                      {lateMin > 0 && (
                        <p className="text-[10px] text-[#999]">{formatLate(lateMin)}</p>
                      )}
                    </div>

                    {/* View button */}
                    <Link
                      href="/attendance"
                      className="ml-2 px-3 py-1.5 rounded-lg border border-black/10 text-[11px] font-semibold text-[#666] hover:text-[#1A1A1A] hover:border-black/20 transition-colors flex-shrink-0"
                    >
                      VIEW
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
