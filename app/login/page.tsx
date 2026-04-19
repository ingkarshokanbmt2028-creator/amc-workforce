'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  Shield, LogIn, UserPlus, Loader2, Eye, EyeOff, Clock, TrendingUp,
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading, signIn, signUp } = useAuth()

  const [tab, setTab] = useState<'login' | 'signup'>('login')

  // Login state
  const [loginEmail,    setLoginEmail]    = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError,    setLoginError]    = useState('')
  const [showLoginPw,   setShowLoginPw]   = useState(false)

  // Signup state
  const [signupEmail,    setSignupEmail]    = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm,  setSignupConfirm]  = useState('')
  const [showSignupPw,   setShowSignupPw]   = useState(false)
  const [showConfirmPw,  setShowConfirmPw]  = useState(false)
  const [signupMsg,      setSignupMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [loading, user, router])

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setSubmitting(true)
    const { error } = await signIn(loginEmail, loginPassword)
    setSubmitting(false)
    if (error) { setLoginError(error.message); return }
    router.replace('/')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (signupPassword !== signupConfirm) {
      setSignupMsg({ text: "Passwords don't match.", ok: false }); return
    }
    setSubmitting(true)
    const { error } = await signUp(signupEmail, signupPassword)
    setSubmitting(false)
    if (error) {
      setSignupMsg({ text: error.message, ok: false })
    } else {
      setSignupMsg({ text: 'Account created. An admin will assign your role before you can sign in.', ok: true })
      setSignupEmail(''); setSignupPassword(''); setSignupConfirm('')
    }
  }

  const pwMatch    = signupConfirm.length > 0 && signupPassword === signupConfirm
  const pwMismatch = signupConfirm.length > 0 && signupPassword !== signupConfirm

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%]  w-[500px] h-[500px] rounded-full bg-amber-500/5  blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-amber-500/3 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-[860px] bg-[#0f1117] border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">

        {/* Left — branding */}
        <div className="lg:w-[42%] bg-[#090c12] p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-amber-500/8 blur-2xl pointer-events-none" />
          <div className="absolute -top-10 -right-10  w-40 h-40 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shrink-0">
              <Shield className="h-5 w-5 text-black" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">AMC</p>
              <p className="text-[11px] text-white/40 mt-0.5">Accra Medical Centre</p>
            </div>
          </div>

          <div className="my-8 space-y-4">
            <h2 className="text-2xl lg:text-3xl font-black text-white leading-tight">
              Attendance<br />Monitoring<br />System
            </h2>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Track staff attendance, manage shift schedules, and generate payroll reports.
            </p>
            <div className="space-y-3 pt-2">
              {[
                { icon: Clock,       label: 'Live clock-in tracking',      sub: 'Real-time fingerprint data' },
                { icon: TrendingUp,  label: 'Automated deduction reports', sub: 'Monthly GH₵ calculations'  },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <f.icon className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white leading-none">{f.label}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-white/20">© {new Date().getFullYear()} Accra Medical Centre</p>
        </div>

        {/* Right — form */}
        <div className="flex-1 p-8 lg:p-10 flex flex-col justify-center">
          <div className="max-w-sm w-full mx-auto space-y-6">

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Welcome back</h1>
              <p className="text-sm text-white/40 mt-1">Sign in to your account to continue</p>
            </div>

            {/* Tab toggle */}
            <div className="flex rounded-lg border border-white/[0.08] p-1 bg-white/[0.02]">
              {(['login', 'signup'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setLoginError(''); setSignupMsg(null) }}
                  className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-all ${
                    tab === t
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {t === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Sign In */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Email address</label>
                  <input
                    type="email" autoComplete="email" autoFocus required
                    value={loginEmail}
                    onChange={e => { setLoginEmail(e.target.value); setLoginError('') }}
                    placeholder="you@accramedical.com"
                    className={`w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-amber-500/50 transition ${loginError ? 'border-red-500/60' : 'border-white/[0.08]'}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input
                      type={showLoginPw ? 'text' : 'password'} autoComplete="current-password" required
                      value={loginPassword}
                      onChange={e => { setLoginPassword(e.target.value); setLoginError('') }}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowLoginPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400 font-medium">{loginError}</p>
                  </div>
                )}

                <button type="submit" disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition disabled:opacity-60">
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                    : <><LogIn className="h-4 w-4" /> Sign In</>}
                </button>

                <p className="text-[11px] text-white/25 text-center">
                  Demo: hr@accramedical.com / password123
                </p>
              </form>
            )}

            {/* Sign Up */}
            {tab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="px-3 py-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20">
                  <p className="text-xs text-amber-300/80 font-medium leading-relaxed">
                    New accounts require role assignment by an admin before access is granted.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Email address</label>
                  <input
                    type="email" autoComplete="email" required
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    placeholder="you@accramedical.com"
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Password <span className="normal-case font-normal text-white/30">(min. 6 chars)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPw ? 'text' : 'password'} required minLength={6}
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50 transition"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowSignupPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showSignupPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'} required
                      value={signupConfirm}
                      onChange={e => setSignupConfirm(e.target.value)}
                      className={`w-full px-3 py-2.5 pr-10 rounded-lg bg-white/[0.04] border text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50 transition ${pwMismatch ? 'border-red-500/60' : pwMatch ? 'border-green-500/40' : 'border-white/[0.08]'}`}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirmPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pwMismatch && <p className="text-[11px] text-red-400">Passwords do not match</p>}
                  {pwMatch    && <p className="text-[11px] text-green-400">Passwords match</p>}
                </div>

                {signupMsg && (
                  <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${
                    signupMsg.ok
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {signupMsg.text}
                  </div>
                )}

                <button type="submit" disabled={submitting || pwMismatch}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition disabled:opacity-60">
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
                    : <><UserPlus className="h-4 w-4" /> Create Account</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
