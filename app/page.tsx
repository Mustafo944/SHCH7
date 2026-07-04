/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getCachedSession } from '@/lib/supabase-db'
import { safeStorage } from '@/lib/utils/storage'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import { User, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react'

function getRoleHome(role: string) {
  if (role === 'dispatcher') return '/dispatcher'
  if (role === 'bekat_boshlighi') return '/bekat-boshlighi'
  if (role === 'bekat_navbatchisi') return '/bekat-navbatchisi'
  if (role === 'yul_ustasi') return '/yul-ustasi'
  if (role === 'ech_xodimi') return '/ech-xodimi'
  if (role === 'mehnat_muhofazasi') return '/mehnat-muhofazasi'
  return '/worker' // worker, elektromexanik, elektromontyor, katta_elektromexanik
}

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Saqlangan loginni yuklash (parol saqlanmaydi)
    try {
      const savedLogin = safeStorage.getItem('remembered-login')
      if (savedLogin) {
        setLogin(savedLogin)
        setRememberMe(true)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    let active = true

    // Tezlashish uchun darhol formani ko'rsatamiz
    setCheckingSession(false)

    // Orqa fonda Supabase sessiyani ham tekshiramiz (cookie bilan qayta kirgan bo'lishi mumkin)
    async function verifySession() {
      const session = await getCachedSession()
      if (!active) return

      if (session) {
        setNavigating(true)
        router.replace(getRoleHome(session.role))
      } else {
        // Sessiya yo'q bo'lsa, qolib ketgan eskirgan cache larni tozalaymiz
        safeStorage.removeItem('user-profile')
      }
    }
    verifySession()

    return () => { active = false }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await signIn(login.trim(), password)

      if (user) {
        // Faqat loginni saqlash (parol saqlanmaydi — xavfsizlik)
        if (rememberMe) {
          safeStorage.setItem('remembered-login', login.trim())
        } else {
          safeStorage.removeItem('remembered-login')
        }
        setNavigating(true)
        router.push(getRoleHome(user.role))
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 animate-pulse">Tizimga kirilmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4">
      {/* Aurora Mesh Background */}
      <AuroraMeshBackground />

      {/* Full screen loading overlay */}
      {(loading || navigating) && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-white/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6 animate-fade-up px-6">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-400/30" />
              <div className="absolute inset-2 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <img src="/uty-logo.png" alt="UTY" className="h-10 w-10 object-contain animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-base sm:text-xl font-black uppercase tracking-wider sm:tracking-widest text-slate-800">Ma&apos;lumotlar tekshirilmoqda</h2>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider sm:tracking-widest animate-pulse">Iltimos kuting...</p>
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
          <div className="hidden md:flex md:w-[45%] relative overflow-hidden rounded-l-[32px] bg-slate-900">
            <img 
              src="/login2.jpg" 
              onError={(e) => e.currentTarget.src='/login.png'}
              alt="Afrosiyob" 
              className="w-full h-full object-cover object-center" 
            />

            {/* Kontenty */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-start p-8 gap-2 pt-12 pointer-events-none">
               <div className="bg-white/30 backdrop-blur-2xl rounded-2xl p-6 shadow-lg border border-white/30 text-center w-full shadow-blue-900/10">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.35em]">O'ZBEKISTON TEMIR YO'LLARI</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-800 uppercase tracking-tight leading-tight">SMART SHCH</h2>
                  <p className="mt-2 text-xs font-bold text-slate-500">Dispetcherlik va Nazorat Tizimi</p>
               </div>
            </div>
          </div>

          {/* ─── O'NG TOMON: Login formasi ─── */}
          <div className="w-full md:w-[55%] p-8 sm:p-10 md:p-12 flex flex-col justify-center">
            {/* Logo and title */}
            <div className="mb-8 text-center sm:mb-10">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24 drop-shadow-md">
                <img src="/uty-logo.png" alt="UTY" className="h-full w-full object-contain" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
                O'ZBEKISTON TEMIR YO'LLARI
              </h1>
              <p className="mt-2 text-[10px] font-black tracking-widest text-blue-600 uppercase">
                SMART SHCH TIZIMI
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
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-blue-600">
                    <User className="h-5 w-5" strokeWidth={3} />
                  </div>
                  <input
                    type="text"
                    required
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="block w-full rounded-2xl border border-white/50 bg-white/50 backdrop-blur-md py-4 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-blue-400 focus:bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
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
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-blue-600">
                    <Lock className="h-5 w-5" strokeWidth={3} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-white/50 bg-white/50 backdrop-blur-md py-4 pl-12 pr-12 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-blue-400 focus:bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
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

              {/* Eslab qolish */}
              <label className="flex items-center justify-end gap-3 cursor-pointer select-none group">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors">Eslab qolish</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-blue-500 peer-focus:ring-4 peer-focus:ring-blue-500/20" />
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                </div>
              </label>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:via-sky-600 hover:to-blue-600 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
