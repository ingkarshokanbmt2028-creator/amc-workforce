'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, ROLE_LABELS } from '@/lib/auth'
import { LogOut } from 'lucide-react'

const NAV = [
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
  { href: '/report', label: 'CEO Report', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )},
]

export function Sidebar() {
  const path   = usePathname()
  const router = useRouter()
  const { user, role, signOut } = useAuth()

  if (path === '/login') return null

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AM'

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
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((n) => {
          const active = n.href === '/' ? path === '/' : path.startsWith(n.href)
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <span className={active ? 'text-amber-400' : ''}>{n.icon}</span>
              {n.label}
            </Link>
          )
        })}
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
