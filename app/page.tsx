'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getCurrentSession } from '@/lib/supabase-db'
import { User, Eye, EyeOff, Lock } from 'lucide-react'

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const session = await getCurrentSession()  // Supabase bilan tekshiradi
      if (session) {
        if (session.role === 'dispatcher') router.push('/dispatcher')
        else if (session.role === 'bekat_boshlighi') router.push('/bekat-boshlighi')
        else router.push('/worker')
      }
    }
    checkSession()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await signIn(login.trim(), password)

      if (user) {
        switch (user.role) {
          case 'dispatcher':
            router.push('/dispatcher')
            break
          case 'bekat_boshlighi':
            router.push('/bekat-boshlighi')
            break
          case 'worker':
          default:
            router.push('/worker')
            break
        }
      } else {
        setError("Login yoki parol noto'g'ri")
      }
    } catch (err) {
      setError("Tizimga ulanishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1728] p-4 font-sans text-white">
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-blue-600/20 blur-3xl"></div>

        <div className="relative z-10">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
              <img src="/uty-logo.png" alt="UTY" className="h-24 w-24 object-contain filter drop-shadow-[0_0_16px_rgba(34,211,238,0.4)]" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">SHCH BUXORO</h1>
            <p className="mt-2 text-sm font-medium tracking-widest text-cyan-300/80">SMART CONTROL</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-wider text-white/50">Login</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-white/40 transition-colors group-focus-within:text-cyan-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="block w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-white/20 transition-all focus:border-cyan-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="Loginni kiriting"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-wider text-white/50">Parol</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-white/40 transition-colors group-focus-within:text-cyan-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-12 text-white placeholder-white/20 transition-all focus:border-cyan-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-cyan-500/10"
                    placeholder="Parolni kiriting"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-bold text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 font-black uppercase tracking-widest text-white shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-2">
                {loading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  "Kirish"
                )}
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}