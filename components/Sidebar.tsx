'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, ROLE_LABELS } from '@/lib/auth'
import {
  LogOut, Home, CalendarDays, Clock, CheckSquare,
  BarChart3, Download, BookOpen, Settings,
  PanelLeftClose, PanelLeftOpen, TrendingUp, AlertTriangle, Timer,
} from 'lucide-react'
import { useState } from 'react'

// ── Nav structure ─────────────────────────────────────────────────────────────

const NAV_DAILY = [
  { href: '/',           label: 'Home',        Icon: Home,        exact: true  },
  { href: '/attendance', label: 'Attendance',  Icon: Clock,       exact: false },
  { href: '/roster',     label: 'Duty Roster', Icon: CalendarDays, exact: false },
]

const NAV_METRICS = [
  { href: '/attendance/compliance',  label: 'Shift Adherence', Icon: CheckSquare  },
  { href: '/metrics/absenteeism',    label: 'Absenteeism',     Icon: AlertTriangle },
  { href: '/metrics/punctuality',    label: 'Punctuality',     Icon: TrendingUp   },
  { href: '/metrics/overtime',       label: 'Overtime',        Icon: Timer        },
]

const NAV_TOOLS = [
  { href: '/report',    label: 'CEO Report',   Icon: Download  },
  { href: '/quick-ask', label: 'Quick AI Ask', Icon: BarChart3 },
  { href: '/resources', label: 'Compliance',   Icon: BookOpen  },
  { href: '/settings',  label: 'Settings',     Icon: Settings  },
]

// ── Nav item ─────────────────────────────────────────────────────────────────

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
      className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors
        ${active
          ? 'bg-[hsl(215_27%_26%)] text-[hsl(220_22%_92%)] font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r before:bg-[#DCAA05]'
          : 'text-[hsl(220_18%_86%/0.65)] hover:text-[hsl(220_18%_86%)] hover:bg-[hsl(215_27%_26%/0.6)]'
        }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.16em] uppercase text-[hsl(220_18%_86%/0.4)] px-3 mb-2 mt-6 font-medium font-display">
      {children}
    </p>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

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

  const initials = user?.email
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : 'AM'

  return (
    <aside
      className="flex-shrink-0 flex flex-col h-screen sticky top-0 border-r transition-all duration-200"
      style={{
        width: collapsed ? '56px' : '220px',
        background: 'hsl(215 30% 19%)',
        borderColor: 'hsl(215 22% 28%)',
      }}
    >
      {/* ── Header: logo + collapse toggle ── */}
      <div
        className="flex items-start justify-between border-b px-3 py-5"
        style={{ borderColor: 'hsl(215 22% 28%)' }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <Link href="/">
              <Image src="/amc-sun.png" alt="AMC" width={36} height={36} className="object-contain" />
            </Link>
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="p-1.5 rounded-md text-[hsl(220_18%_86%/0.45)] hover:text-[hsl(220_18%_86%)] hover:bg-[hsl(215_27%_26%/0.6)] transition-colors"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Link href="/">
              <Image src="/amc-logo.png" alt="Accra Medical Centre" width={130} height={48} className="object-contain object-left" />
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="mt-1 p-1.5 rounded-md text-[hsl(220_18%_86%/0.45)] hover:text-[hsl(220_18%_86%)] hover:bg-[hsl(215_27%_26%/0.6)] transition-colors shrink-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {!collapsed && (
        <p className="text-[10px] tracking-[0.16em] uppercase text-[hsl(220_18%_86%/0.4)] px-4 pt-3 font-medium font-display">
          Workforce
        </p>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 pt-2 pb-4 overflow-y-auto space-y-0.5">

        {/* Daily */}
        {!collapsed && <SectionLabel>Daily</SectionLabel>}
        {NAV_DAILY.map(n => (
          <NavItem key={n.href} {...n} path={path} collapsed={collapsed} />
        ))}

        {/* Metrics */}
        {!collapsed && <SectionLabel>Metrics</SectionLabel>}
        {NAV_METRICS.map(n => (
          <NavItem key={n.label} href={n.href} label={n.label} Icon={n.Icon} path={path} collapsed={collapsed} />
        ))}

        {/* Tools */}
        {!collapsed && <SectionLabel>Tools</SectionLabel>}
        {NAV_TOOLS.map(n => (
          <NavItem key={n.href} {...n} path={path} collapsed={collapsed} />
        ))}
      </nav>

      {/* ── Footer ── */}
      <div
        className="p-3 border-t"
        style={{ borderColor: 'hsl(215 22% 28%)' }}
      >
        {!collapsed ? (
          <div>
            <div className="px-2 py-2">
              <p className="text-[12px] font-medium text-[hsl(220_18%_86%)] truncate leading-tight">
                {user?.email ?? '—'}
              </p>
              {role && (
                <p className="text-[10px] text-[hsl(220_18%_86%/0.5)] mt-0.5 tracking-[0.08em] uppercase font-display">
                  {ROLE_LABELS[role] ?? role}
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-[12px] text-[hsl(220_18%_86%/0.65)] hover:text-[hsl(220_18%_86%)] hover:bg-[hsl(215_27%_26%/0.6)] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="w-full flex items-center justify-center p-2 rounded-md text-[hsl(220_18%_86%/0.65)] hover:text-[hsl(220_18%_86%)] hover:bg-[hsl(215_27%_26%/0.6)] transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
