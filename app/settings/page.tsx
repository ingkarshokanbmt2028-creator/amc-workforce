'use client'

import { useState } from 'react'
import { Sun, Moon, Monitor, LayoutGrid, Layout, Shield, Bell } from 'lucide-react'
import { useAuth, ROLE_LABELS } from '@/lib/auth'

export default function SettingsPage() {
  const { user, role } = useAuth()
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [compactMode, setCompactMode] = useState(false)
  const [notifications, setNotifications] = useState(true)

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark'  as const, label: 'Dark',  icon: Moon },
    { value: 'system'as const, label: 'System',icon: Monitor },
  ]

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-foreground/50 mt-1">Customize your experience</p>
      </div>

      {/* Account */}
      <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider">Account</h2>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center text-lg font-bold text-amber-400">
            {user?.email?.slice(0, 2).toUpperCase() ?? 'AM'}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{user?.email ?? '—'}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className="h-3 w-3 text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">{role ? ROLE_LABELS[role] ?? role : 'No role assigned'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider">Appearance</h2>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button key={t.value} onClick={() => setTheme(t.value)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                theme === t.value
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-foreground/10 hover:border-foreground/20'
              }`}>
              <t.icon className={`h-5 w-5 ${theme === t.value ? 'text-amber-400' : 'text-foreground/50'}`} />
              <span className={`text-sm font-medium ${theme === t.value ? 'text-foreground' : 'text-foreground/50'}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider">Layout</h2>
        {[
          { id: 'compact', icon: LayoutGrid, label: 'Compact mode', sub: 'Reduce spacing and padding', value: compactMode, set: setCompactMode },
          { id: 'notifs',  icon: Bell,       label: 'Overtime notifications', sub: 'Show bell alerts for overtime', value: notifications, set: setNotifications },
        ].map(item => (
          <div key={item.id} className="flex items-center justify-between py-1 border-t border-foreground/6 first:border-0">
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4 text-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-foreground/40">{item.sub}</p>
              </div>
            </div>
            <button onClick={() => item.set(!item.value)}
              className={`relative h-6 w-11 rounded-full transition-colors ${item.value ? 'bg-amber-500' : 'bg-foreground/10'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* About */}
      <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-1">
        <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-3">About</h2>
        <p className="text-sm text-foreground">Accra Medical Centre — Workforce Management System</p>
        <p className="text-xs text-foreground/40">Version 1.0.0 · Built with Next.js 16 + Prisma</p>
      </div>
    </div>
  )
}
