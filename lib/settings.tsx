'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface SettingsCtx {
  theme: Theme
  compactMode: boolean
  overtimeNotifications: boolean
  setTheme: (t: Theme) => void
  setCompactMode: (v: boolean) => void
  setOvertimeNotifications: (v: boolean) => void
}

const Ctx = createContext<SettingsCtx>({
  theme: 'dark',
  compactMode: false,
  overtimeNotifications: true,
  setTheme: () => {},
  setCompactMode: () => {},
  setOvertimeNotifications: () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, _setTheme]   = useState<Theme>('dark')
  const [compact, _setCompact] = useState(false)
  const [notifs, _setNotifs]   = useState(true)
  const [mounted, setMounted]  = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const t = (localStorage.getItem('amc_theme') as Theme) ?? 'dark'
    const c = localStorage.getItem('amc_compact') === 'true'
    const n = localStorage.getItem('amc_notifs') !== 'false'
    _setTheme(t)
    _setCompact(c)
    _setNotifs(n)
    setMounted(true)
  }, [])

  // Apply theme class to <html>
  useEffect(() => {
    if (!mounted) return
    const html = document.documentElement
    html.classList.remove('dark', 'light')

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.add(prefersDark ? 'dark' : 'light')
    } else {
      html.classList.add(theme)
    }
  }, [theme, mounted])

  // Apply compact class to <html>
  useEffect(() => {
    if (!mounted) return
    document.documentElement.classList.toggle('compact', compact)
  }, [compact, mounted])

  function setTheme(t: Theme) {
    _setTheme(t)
    localStorage.setItem('amc_theme', t)
  }
  function setCompactMode(v: boolean) {
    _setCompact(v)
    localStorage.setItem('amc_compact', String(v))
  }
  function setOvertimeNotifications(v: boolean) {
    _setNotifs(v)
    localStorage.setItem('amc_notifs', String(v))
  }

  return (
    <Ctx.Provider value={{
      theme, compactMode: compact, overtimeNotifications: notifs,
      setTheme, setCompactMode, setOvertimeNotifications,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSettings() {
  return useContext(Ctx)
}
