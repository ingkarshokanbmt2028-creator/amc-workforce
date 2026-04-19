'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, ROLE_LABELS } from '@/lib/auth'
import { LogOut, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Department { id: string; name: string; code: string }

const NAV_TOP = [
  { href: '/', label: 'Home', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { href: '/roster', label: 'Duty Roster', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
  { href: '/attendance', label: 'Attendance', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { href: '/attendance/compliance', label: 'Shift Adherence', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
]

const NAV_BOTTOM = [
  { href: '/report', label: 'CEO Report', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )},
  { href: '/quick-ask', label: 'Quick AI Ask', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )},
  { href: '/resources', label: 'Compliance', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )},
  { href: '/settings', label: 'Settings', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
]

function NavLink({ href, label, icon, path }: { href: string; label: string; icon: React.ReactNode; path: string }) {
  const active = href === '/'
    ? path === '/'
    : path === href || (path.startsWith(href + '/') && href !== '/attendance')
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
      }`}
    >
      <span className={active ? 'text-amber-400' : ''}>{icon}</span>
      {label}
    </Link>
  )
}

export function Sidebar() {
  const path   = usePathname()
  const router = useRouter()
  const { user, role, signOut } = useAuth()

  const [deptOpen, setDeptOpen]       = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])

  // Open dept dropdown automatically when on /departments
  useEffect(() => {
    if (path.startsWith('/departments')) setDeptOpen(true)
  }, [path])

  // Lazy-load departments when dropdown first opens
  useEffect(() => {
    if (deptOpen && departments.length === 0) {
      fetch('/api/departments').then(r => r.json()).then(setDepartments)
    }
  }, [deptOpen, departments.length])

  if (path === '/login') return null

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AM'

  const deptParentActive = path.startsWith('/departments')

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-screen sticky top-0 bg-[#0f1117] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black text-sm">A</div>
        <div>
          <p className="font-bold text-sm text-white leading-none">AMC</p>
          <p className="text-[10px] text-white/40 leading-none mt-0.5">Accra Medical Centre</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

        {/* Top nav items */}
        {NAV_TOP.map(n => <NavLink key={n.href} {...n} path={path} />)}

        {/* Departments — expandable */}
        <div>
          <button
            onClick={() => setDeptOpen(o => !o)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              deptParentActive
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <span className={deptParentActive ? 'text-amber-400' : ''}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <span className="flex-1 text-left">Departments</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform opacity-50 ${deptOpen ? 'rotate-180' : ''}`} />
          </button>

          {deptOpen && (
            <div className="mt-0.5 ml-3 pl-3 border-l border-white/[0.06] space-y-0.5">
              {/* All departments link */}
              <Link
                href="/departments"
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  path === '/departments' && !path.includes('?')
                    ? 'text-amber-400 bg-amber-500/5'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                }`}
              >
                All staff
              </Link>

              {departments.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-white/20">Loading…</p>
              ) : (
                departments.map(d => {
                  const active = path === `/departments` && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dept') === d.id
                  return (
                    <Link
                      key={d.id}
                      href={`/departments?dept=${d.id}`}
                      className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                        active
                          ? 'text-amber-400 bg-amber-500/5'
                          : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="truncate">{d.name}</span>
                      <span className="text-[10px] text-white/20 flex-shrink-0">{d.code}</span>
                    </Link>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Bottom nav items */}
        {NAV_BOTTOM.map(n => <NavLink key={n.href} {...n} path={path} />)}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/[0.06] space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/80 truncate">{user?.email ?? '—'}</p>
            {role && (
              <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 mt-0.5">
                {ROLE_LABELS[role] ?? role}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
