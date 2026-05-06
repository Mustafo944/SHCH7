/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getCachedSession } from '@/lib/supabase-db'
import { User, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react'

function getRoleHome(role: string) {
  if (role === 'dispatcher') return '/dispatcher'
  if (role === 'bekat_boshlighi' || role === 'bekat_navbatchisi') return '/bekat-boshlighi'
  return '/worker' // worker, elektromexanik, elektromontyor
}

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    let active = true

    async function checkSession() {
      const session = await getCachedSession()
      if (active) {
        if (session) {
          setNavigating(true)
          router.replace(getRoleHome(session.role))
        } else {
          setCheckingSession(false)
        }
      }
    }

    checkSession()

    return () => { active = false }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await signIn(login.trim(), password)

      if (user) {
        setNavigating(true)
        router.push(getRoleHome(user.role))
        // loading ni olib tashlamaymiz, navigating orqali overlay ko'rsatamiz
        return
      } else {
        setError("Login yoki parol noto'g'ri")
      }
    } catch (err) {
      setError("Tizimga ulanishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          <p className="text-sm font-semibold uppercase tracking-widest text-purple-600 animate-pulse">Tizimga kirilmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-violet-100/50 via-purple-50/50 to-fuchsia-100/50 p-4">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple-300/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-fuchsia-300/40 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-300/30 blur-3xl" />
      </div>

      {/* Full screen loading overlay */}
      {(loading || navigating) && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-white/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6 animate-fade-up px-6">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-purple-400/30" />
              <div className="absolute inset-2 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
              <img src="/uty-logo.png" alt="UTY" className="h-10 w-10 object-contain animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-base sm:text-xl font-black uppercase tracking-wider sm:tracking-widest text-slate-800">Ma&apos;lumotlar tekshirilmoqda</h2>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider sm:tracking-widest animate-pulse">Iltimos kuting...</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP: Split layout (chap tomon — illyustratsiya, o'ng tomon — forma)
          MOBILE: Faqat forma ko'rsatiladi
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 w-full max-w-md md:max-w-5xl animate-fade-up">
        <div className="rounded-[32px] border border-white/60 bg-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl overflow-hidden md:flex md:min-h-[560px]">

          {/* ─── CHAP TOMON: Hero illyustratsiya (faqat desktopda) ─── */}
          <div className="hidden md:flex md:w-[45%] relative overflow-hidden rounded-l-[32px]">
            {/* Gradient fon */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-violet-900 to-indigo-950" />
            {/* Glow orblari */}
            <div className="absolute top-[5%] left-[5%] h-56 w-56 rounded-full bg-purple-600/25 blur-[100px]" />
            <div className="absolute bottom-[10%] right-[0%] h-44 w-44 rounded-full bg-fuchsia-600/20 blur-[90px]" />
            <div className="absolute top-[50%] left-[40%] h-32 w-32 rounded-full bg-indigo-500/15 blur-[70px]" />

            {/* Kontenty */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full p-8 gap-6">
              {/* Sarlavha */}
              <div className="text-center">
                <p className="text-[9px] font-black text-purple-400/80 uppercase tracking-[0.35em]">SMART CONTROL TIZIMI</p>
                <h2 className="mt-2 text-[28px] font-black text-white uppercase tracking-tight leading-tight">SHCH BUXORO</h2>
              </div>

              {/* CSS Dashboard Mock */}
              <div className="w-full max-w-[300px]">
                {/* Monitor */}
                <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-5 shadow-2xl shadow-purple-900/50">
                  {/* Top bar */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <div className="h-2 w-2 rounded-full bg-red-400/80" />
                    <div className="h-2 w-2 rounded-full bg-yellow-400/80" />
                    <div className="h-2 w-2 rounded-full bg-green-400/80" />
                    <div className="ml-auto h-1.5 w-12 rounded-full bg-white/10" />
                  </div>
                  {/* Chart area */}
                  <div className="relative h-24 flex items-end gap-[6px] px-1">
                    {/* Chart bars */}
                    <div className="flex-1 rounded-t-md bg-gradient-to-t from-purple-500/60 to-purple-400/80" style={{ height: '45%' }} />
                    <div className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-500/60 to-cyan-400/80" style={{ height: '70%' }} />
                    <div className="flex-1 rounded-t-md bg-gradient-to-t from-purple-500/60 to-purple-400/80" style={{ height: '55%' }} />
                    <div className="flex-1 rounded-t-md bg-gradient-to-t from-fuchsia-500/60 to-fuchsia-400/80" style={{ height: '85%' }} />
                    <div className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-500/60 to-cyan-400/80" style={{ height: '60%' }} />
                    <div className="flex-1 rounded-t-md bg-gradient-to-t from-purple-500/60 to-purple-400/80" style={{ height: '40%' }} />
                    <div className="flex-1 rounded-t-md bg-gradient-to-t from-fuchsia-500/60 to-fuchsia-400/80" style={{ height: '75%' }} />
                    <div className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-500/60 to-cyan-400/80" style={{ height: '50%' }} />
                    {/* Glowing line overlay */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 96" preserveAspectRatio="none">
                      <path d="M0 70 Q40 30, 75 50 T150 25 T225 45 T300 20" fill="none" stroke="rgba(168,85,247,0.5)" strokeWidth="2" />
                      <path d="M0 80 Q50 50, 100 60 T200 35 T300 50" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1.5" />
                    </svg>
                  </div>
                  {/* Mini stats row */}
                  <div className="flex gap-2 mt-4">
                    <div className="flex-1 rounded-lg bg-white/[0.08] p-2.5 text-center">
                      <p className="text-[9px] font-black text-white/70 uppercase tracking-wider">Bekatlar</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-white/[0.08] p-2.5 text-center">
                      <p className="text-[9px] font-black text-white/70 uppercase tracking-wider">Ishchilar</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-white/[0.08] p-2.5 text-center">
                      <p className="text-[9px] font-black text-white/70 uppercase tracking-wider">Topshiriqlar</p>
                    </div>
                  </div>
                </div>

                {/* App icons row */}
                <div className="flex justify-center gap-3 mt-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 shadow-lg shadow-green-500/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg shadow-orange-500/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 shadow-lg shadow-pink-500/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Particle yulduzchalar */}
            <div className="absolute top-[12%] right-[18%] h-1.5 w-1.5 rounded-full bg-white/50" />
            <div className="absolute top-[35%] left-[8%] h-1 w-1 rounded-full bg-white/30" />
            <div className="absolute bottom-[25%] right-[25%] h-1 w-1 rounded-full bg-purple-300/40" />
            <div className="absolute top-[65%] right-[8%] h-1.5 w-1.5 rounded-full bg-cyan-300/30" />
            <div className="absolute bottom-[15%] left-[20%] h-1 w-1 rounded-full bg-white/25" />
            <div className="absolute top-[80%] left-[50%] h-1 w-1 rounded-full bg-fuchsia-300/30" />
          </div>

          {/* ─── O'NG TOMON: Login formasi ─── */}
          <div className="w-full md:w-[55%] p-8 sm:p-10 md:p-12 flex flex-col justify-center">
            {/* Logo and title */}
            <div className="mb-8 text-center sm:mb-10">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24 drop-shadow-md">
                <img src="/uty-logo.png" alt="UTY" className="h-full w-full object-contain" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
                SMART SHCH
              </h1>
              <p className="mt-2 text-[10px] font-black tracking-widest text-purple-600 uppercase">
                SMART CONTROL TIZIMI
              </p>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Login input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Login
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-800">
                    <User className="h-5 w-5" strokeWidth={3} />
                  </div>
                  <input
                    type="text"
                    required
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="block w-full rounded-2xl border border-white/50 bg-white/50 backdrop-blur-md py-4 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-purple-400 focus:bg-white/80 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    placeholder="Loginni kiriting"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Parol
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-800">
                    <Lock className="h-5 w-5" strokeWidth={3} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-white/50 bg-white/50 backdrop-blur-md py-4 pl-12 pr-12 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-purple-400 focus:bg-white/80 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    placeholder="Parolni kiriting"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 animate-fade-up">
                  <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-500 to-purple-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-purple-500/25 transition-all hover:from-purple-700 hover:via-violet-600 hover:to-purple-600 hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    <span>Kirilmoqda...</span>
                  </>
                ) : (
                  <>
                    <span>Kirish</span>
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>

            {/* Footer text */}
            <p className="mt-8 text-center text-xs text-slate-400">
              © 2026 SHCH Buxoro. Barcha huquqlar himoyalangan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
