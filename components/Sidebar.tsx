'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, ROLE_LABELS } from '@/lib/auth'
import {
  LogOut, Home, CalendarDays, Clock,
  BarChart3, BookOpen, Settings,
  PanelLeftClose, PanelLeftOpen, FileText,
} from 'lucide-react'
import { useState } from 'react'

const NAV_DAILY = [
  { href: '/',           label: 'Home',        Icon: Home,         exact: true  },
  { href: '/attendance', label: 'Attendance',  Icon: Clock,        exact: false },
  { href: '/roster',     label: 'Duty roster', Icon: CalendarDays, exact: false },
]

const NAV_METRICS = [
  { href: '/metrics/punctuality',     label: 'Punctuality rate'  },
  { href: '/metrics/absenteeism',     label: 'Absenteeism rate'  },
  { href: '/metrics/shift-adherence', label: 'Shift adherence'   },
  { href: '/metrics/overtime',        label: 'Overtime rate'     },
]

const NAV_TOOLS = [
  { href: '/report',     label: 'CEO Report', Icon: FileText,  exact: true  },
  { href: '/resources',  label: 'Resources',  Icon: BookOpen,  exact: false },
  { href: '/settings',   label: 'Settings',   Icon: Settings,  exact: false },
]

function NavItem({
  href, label, Icon, path, collapsed, exact = false,
}: {
  href: string; label: string; Icon: React.ComponentType<{ className?: string }>
  path: string; collapsed: boolean; exact?: boolean
}) {
  const active = exact ? path === href : path === href || path.startsWith(href + '/')
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors
        ${active
          ? 'bg-white/10 text-white font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r before:bg-[#DCAA05]'
          : 'text-white/55 hover:text-white/85 hover:bg-white/[0.06]'
        }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 border-t border-white/10" />
  return (
    <p className="text-[10px] tracking-[0.14em] uppercase text-white/30 px-3 mb-1 mt-5 font-semibold">
      {children}
    </p>
  )
}

export function Sidebar() {
  const path   = usePathname()
  const router = useRouter()
  const { user, role, signOut } = useAuth()

  const [collapsed, setCollapsed] = useState(false)

  if (path === '/login') return null

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <aside
      className="flex-shrink-0 flex flex-col h-screen sticky top-0 border-r transition-all duration-200"
      style={{
        width: collapsed ? '52px' : '160px',
        background: 'hsl(215 28% 16%)',
        borderColor: 'hsl(215 22% 22%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b" style={{ borderColor: 'hsl(215 22% 22%)' }}>
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} className="mx-auto text-white/40 hover:text-white/70 transition-colors">
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <>
            <Link href="/">
              <Image src="/amc-logo.png" alt="AMC" width={100} height={36} className="object-contain object-left" />
            </Link>
            <button onClick={() => setCollapsed(true)} className="text-white/40 hover:text-white/70 transition-colors shrink-0">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {!collapsed && (
        <p className="text-[9px] tracking-[0.14em] uppercase text-white/30 px-3 pt-3 font-semibold">Workforce</p>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 pt-1 pb-4 overflow-y-auto space-y-0.5">

        <SectionLabel collapsed={collapsed}>Daily</SectionLabel>
        {NAV_DAILY.map(n => (
          <NavItem key={n.href + n.label} href={n.href} label={n.label} Icon={n.Icon} path={path} collapsed={collapsed} exact={n.exact} />
        ))}

        <SectionLabel collapsed={collapsed}>Metrics</SectionLabel>
        {NAV_METRICS.map(m => (
          <Link
            key={m.href}
            href={m.href}
            title={collapsed ? m.label : undefined}
            className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors
              ${path === m.href
                ? 'bg-white/10 text-white font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r before:bg-[#DCAA05]'
                : 'text-white/55 hover:text-white/85 hover:bg-white/[0.06]'
              }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{m.label}</span>}
          </Link>
        ))}

        <SectionLabel collapsed={collapsed}>Tools</SectionLabel>
        {NAV_TOOLS.map(n => (
          <NavItem key={n.label} href={n.href} label={n.label} Icon={n.Icon} path={path} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t" style={{ borderColor: 'hsl(215 22% 22%)' }}>
        {!collapsed ? (
          <div>
            <div className="px-2 py-1.5">
              <p className="text-[11px] font-medium text-white/80 truncate">{user?.email ?? '—'}</p>
              <p className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">{role ? ROLE_LABELS[role] ?? role : 'Admin'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        ) : (
          <button onClick={handleSignOut} className="w-full flex justify-center p-2 text-white/50 hover:text-white/80 hover:bg-white/[0.06] rounded-md transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
