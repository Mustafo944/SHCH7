/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getCachedSession } from '@/lib/supabase-db'
import { User, Eye, EyeOff, Lock } from 'lucide-react'

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-4">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple-200/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-fuchsia-200/25 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200/20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Full screen loading overlay — FIXED: overflow-hidden on wrapper */}
      {(loading || navigating) && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-white/80 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6 animate-fade-up px-6">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-purple-400/20" />
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

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl backdrop-blur-xl sm:p-10">
          {/* Logo and title */}
          <div className="mb-8 text-center sm:mb-10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
              <img src="/uty-logo.png" alt="UTY" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-3xl">
              SHCH BUXORO
            </h1>
            <p className="mt-2 text-xs font-semibold tracking-widest text-purple-600 uppercase">
              SMART CONTROL TIZIMI
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Login input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Login
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  placeholder="Loginni kiriting"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Parol
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
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
              className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-violet-500 to-purple-500 px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-purple-500/25 transition-all hover:from-purple-700 hover:via-violet-600 hover:to-purple-600 hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>Kirilmoqda...</span>
                </>
              ) : (
                'Kirish'
              )}
            </button>
          </form>
        </div>

        {/* Footer text */}
        <p className="mt-6 text-center text-xs text-slate-500">
          © 2026 SHCH Buxoro. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  )
}
