/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { signIn, signInWithPasskeyFunc } from '@/lib/supabase-db'
import { safeStorage } from '@/lib/utils/storage'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import { User, Eye, EyeOff, Lock, ArrowRight, Fingerprint, X } from 'lucide-react'

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
  const [showPasskeyModal, setShowPasskeyModal] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Agar oldinroq parolni saqlab qo'ygan bo'lsa
    const rememberedLogin = safeStorage.getItem('remembered-login')
    if (rememberedLogin) {
      setLogin(rememberedLogin)
      setRememberMe(true)
    }
    
    // Agar login sahifasiga kirgan bo'lsa (SSR orqali shu yerga keldikmi, demak tizimda emas),
    // eskirgan profile keshni tozalash
    safeStorage.removeItem('user-profile')
  }, [])

  useEffect(() => {
    // Barmoq izi yoqilgan bo'lsa, avtomatik oynani ochish
    const passkeyEnabled = localStorage.getItem('hasPasskeyEnabled')
    if (passkeyEnabled === 'true') {
      setShowPasskeyModal(true)
    }
  }, [])

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

  async function handlePasskeyLogin(retryCount = 0) {
    setLoading(true)
    setError('')
    try {
      const user = await signInWithPasskeyFunc()
      if (user) {
        setNavigating(true)
        router.push(getRoleHome(user.role))
      } else {
        setError("Profil topilmadi (User profile not found)")
      }
    } catch (err: any) {
      console.error(err);
      
      const errMsg = err.message || "";
      const isCancelled = err.name === 'NotAllowedError' || errMsg.includes('cancelled') || errMsg.includes('NotAllowedError');
      const isNonWebAuthn = errMsg.includes('Non-Webauthn related error');

      if (isCancelled) {
        // Foydalanuvchi bekor qildi, xato chiqarmaymiz
        setError('');
      } else if (isNonWebAuthn) {
        if (retryCount === 0) {
          // 1 marta avtomatik qayta urinib ko'ramiz
          setTimeout(() => handlePasskeyLogin(1), 500);
        } else {
          setError("Iltimos, tugmani yana bir marta bosing.");
        }
      } else {
        setError("Xatolik: " + (errMsg || "Passkey orqali ulanishda xatolik yuz berdi"));
      }
    } finally {
      if (retryCount === 0) {
        setLoading(false)
      }
    }
  }


  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4">
      {/* Aurora Mesh Background */}
      <AuroraMeshBackground />

      {/* Avtomatik Passkey Modali */}
      {showPasskeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white/70 backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 p-8 text-center animate-fade-up overflow-hidden">
            {/* Bezli yorug'lik */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-400/30 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-400/30 rounded-full blur-3xl"></div>

            <button 
              onClick={() => setShowPasskeyModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/50 text-slate-500 hover:bg-slate-200 transition-colors active:scale-95 z-10"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            
            <div className="relative z-10 mb-6 flex justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl shadow-blue-500/30 animate-bounce-slow">
                <Fingerprint size={48} className="text-white drop-shadow-md" strokeWidth={1.5} />
              </div>
            </div>
            
            <h3 className="relative z-10 text-xl font-black text-slate-800 tracking-tight mb-2">Tizim sizni taniydi</h3>
            <p className="relative z-10 text-sm font-medium text-slate-500 mb-8 px-2">Barmoq izi orqali xavfsiz va tezkor kirish uchun quyidagi tugmani bosing.</p>
            
            <button
              onClick={() => handlePasskeyLogin()}
              disabled={loading}
              className="relative z-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  <Fingerprint size={20} />
                  <span>Barmoq bilan kirish</span>
                </>
              )}
            </button>
            {error && (
              <p className="relative z-10 mt-4 text-xs font-bold text-red-500 bg-red-50/50 py-2 rounded-xl border border-red-100">{error}</p>
            )}
          </div>
        </div>
      )}

      {/* Full screen loading overlay */}
      {(loading || navigating) && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-white/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6 animate-fade-up px-6">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-400/30" />
              <div className="absolute inset-2 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <Image src="/uty-logo.png" alt="UTY" width={40} height={40} className="h-10 w-10 object-contain animate-pulse" />
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
              src="/login2.webp"
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
          <div className="w-full md:w-[55%] p-6 sm:p-10 md:p-12 flex flex-col justify-center">
            {/* Logo and title */}
            <div className="mb-6 text-center sm:mb-10">
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center sm:h-24 sm:w-24 drop-shadow-md">
                <Image src="/uty-logo.png" alt="UTY" fill priority className="object-contain" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
                O'ZBEKISTON TEMIR YO'LLARI
              </h1>
              <p className="mt-2 text-[10px] font-black tracking-widest text-blue-600 uppercase">
                SMART SHCH TIZIMI
              </p>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="block w-full rounded-2xl border border-white/50 bg-white/50 backdrop-blur-md py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-blue-400 focus:bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
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
                    className="block w-full rounded-2xl border border-white/50 bg-white/50 backdrop-blur-md py-3.5 pl-12 pr-12 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-blue-400 focus:bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
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
                className="relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-500 px-6 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:via-sky-600 hover:to-blue-600 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
            <p className="mt-4 sm:mt-6 text-center text-[10px] text-slate-400 font-medium">
              © 2026 SHCH Buxoro. Barcha huquqlar himoyalangan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
