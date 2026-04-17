'use client'

import {
  useState, useEffect, createContext, useContext, ReactNode,
} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppRole = 'hr' | 'department_head' | 'reception' | 'manager' | 'admin' | null

export interface AuthUser {
  id: string
  email: string
  created_at: string
}

interface StoredUser {
  id: string
  email: string
  password: string
  role: AppRole
  created_at: string
}

interface AuthContextType {
  user: AuthUser | null
  role: AppRole
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = { USERS: 'amc_users', SESSION: 'amc_session' } as const

// ─── Seed accounts ────────────────────────────────────────────────────────────

const SEEDS: StoredUser[] = [
  { id: 'seed-1', email: 'hr@accramedical.com',         password: 'password123', role: 'hr',              created_at: new Date().toISOString() },
  { id: 'seed-2', email: 'manager@accramedical.com',    password: 'password123', role: 'manager',         created_at: new Date().toISOString() },
  { id: 'seed-3', email: 'unithead@accramedical.com',   password: 'password123', role: 'department_head', created_at: new Date().toISOString() },
  { id: 'seed-4', email: 'admin@accramedical.com',      password: 'password123', role: 'admin',           created_at: new Date().toISOString() },
  { id: 'seed-5', email: 'reception@accramedical.com',  password: 'password123', role: 'reception',       created_at: new Date().toISOString() },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUsers(): StoredUser[] {
  try {
    const stored: StoredUser[] = JSON.parse(localStorage.getItem(KEYS.USERS) ?? '[]')
    const storedEmails = new Set(stored.map(u => u.email))
    return [...stored, ...SEEDS.filter(s => !storedEmails.has(s.email))]
  } catch { return SEEDS }
}

function saveUsers(users: StoredUser[]) {
  const seedEmails = new Set(SEEDS.map(s => s.email))
  localStorage.setItem(KEYS.USERS, JSON.stringify(users.filter(u => !seedEmails.has(u.email))))
}

function getSession(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem(KEYS.SESSION) ?? 'null') } catch { return null }
}

function saveSession(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user))
    // Set cookie so middleware can read auth state
    document.cookie = `amc_auth=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
  } else {
    localStorage.removeItem(KEYS.SESSION)
    document.cookie = 'amc_auth=; path=/; max-age=0'
  }
}

function uid(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]    = useState<AuthUser | null>(null)
  const [role, setRole]    = useState<AppRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sessionUser = getSession()
    const activeUser = sessionUser ?? { id: SEEDS[3].id, email: SEEDS[3].email, created_at: SEEDS[3].created_at }
    setUser(activeUser)
    const found = getUsers().find(u => u.id === activeUser.id)
    setRole(found?.role ?? 'admin')
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const match = getUsers().find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )
    if (!match) return { error: new Error('Invalid email or password.') }
    const sessionUser: AuthUser = { id: match.id, email: match.email, created_at: match.created_at }
    saveSession(sessionUser)
    setUser(sessionUser)
    setRole(match.role)
    return { error: null }
  }

  const signUp = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const users = getUsers()
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
      return { error: new Error('An account with this email already exists.') }
    if (password.length < 6)
      return { error: new Error('Password must be at least 6 characters.') }
    saveUsers([...users, { id: uid(), email: email.toLowerCase(), password, role: null, created_at: new Date().toISOString() }])
    return { error: null }
  }

  const signOut = async () => {
    saveSession(null)
    setUser(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export const ROLE_LABELS: Record<string, string> = {
  hr: 'HR',
  department_head: 'Unit Head',
  reception: 'Reception',
  manager: 'Manager',
  admin: 'Admin',
}
