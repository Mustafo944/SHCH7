'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  getStations,
  getStation,
} from '@/lib/store'
import { DU46JournalView } from '@/components/JournalView'
import {
  getCurrentSession,
  signOut
} from '@/lib/supabase-db'
import type { User } from '@/types'
import {
  LogOut,
  MapPin,
  BookOpen,
  AlertCircle
} from 'lucide-react'

export default function BekatBoshlighiPage() {
  const router = useRouter()
  const [session, setSessionState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [showJournal, setShowJournal] = useState(false)

  const allStations = getStations()

  // Bekat boshlig'i faqat o'ziga biriktirilgan bekatlarni ko'radi
  const myStations = useMemo(() => {
    if (!session || !session.stationIds || session.stationIds.length === 0) return []
    return allStations.filter(s => session.stationIds.includes(s.id))
  }, [session, allStations])

  useEffect(() => {
    async function init() {
      const u = await getCurrentSession()
      if (!u || u.role !== 'bekat_boshlighi') {
        router.replace('/')
        return
      }
      setSessionState(u)
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#06111f]">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500" />
    </div>
  )

  const stationName = selectedStation ? getStation(selectedStation)?.name : null

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06111f] text-white selection:bg-cyan-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.15),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.12),_transparent_40%),linear-gradient(135deg,_#06111f_0%,_#08172a_45%,_#020817_100%)]" />
      <div className="absolute -left-32 top-0 h-[600px] w-[600px] rounded-full bg-cyan-400/5 blur-[120px]" />
      <div className="absolute -right-32 bottom-0 h-[600px] w-[600px] rounded-full bg-blue-600/5 blur-[120px]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06111f]/60 backdrop-blur-2xl print:hidden">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-25 blur transition group-hover:opacity-50"></div>
                <div className="relative flex h-14 w-14 items-center justify-center">
                  <img src="/uty-logo.png" alt="UTY" className="h-14 w-14 object-contain filter drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter text-white">SHCH BUXORO</h1>
                <p className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-widest">Bekat Boshlig'i Paneli</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 sm:flex">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                <span className="text-sm font-medium text-white/70">{session?.fullName}</span>
              </div>

              <button
                onClick={async () => { await signOut(); router.push('/') }}
                className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 transition-all hover:bg-red-500/20 active:scale-95"
              >
                <LogOut className="h-5 w-5 text-red-400 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-8">
          {!selectedStation ? (
            /* Station Selection */
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-black text-white sm:text-3xl">Bekatni tanlang</h2>
                <p className="mt-2 text-white/40">O'zingizga biriktirilgan bekatni tanlang</p>
              </div>

              {myStations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[32px] border border-white/5 bg-white/5 p-16 text-center backdrop-blur-sm">
                  <div className="mb-6 rounded-full bg-amber-500/10 p-6">
                    <AlertCircle size={48} className="text-amber-400" />
                  </div>
                  <h3 className="text-xl font-black text-white/80">Hech qanday bekat biriktirilmagan</h3>
                  <p className="mt-2 text-white/40">Dispetcher bilan bog'laning va bekatlaringizni so'rang</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {myStations.map(st => (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStation(st.id)}
                      className="group relative flex flex-col items-center overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-md transition-all hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="mb-4 rounded-2xl bg-white/5 p-4 group-hover:bg-cyan-500/10 transition-colors">
                        <MapPin size={32} className="text-white/40 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <span className="text-lg font-black text-white">{st.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : showJournal ? (
            /* DU-46 Journal */
            <DU46JournalView
              stationId={selectedStation}
              stationName={stationName || ''}
              userName={session?.fullName || ''}
              userRole="bekat_boshlighi"
              onClose={() => setShowJournal(false)}
            />
          ) : (
            /* DU-46 Tugmasi */
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedStation(null)}
                  className="rounded-xl bg-white/5 p-3 text-white/40 hover:text-white transition"
                >
                  <MapPin size={24} />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-white">{stationName}</h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest">Bekat Boshlig'i Boshqaruvi</p>
                </div>
              </div>

              {/* Faqat DU-46 tugmasi */}
              <div className="flex justify-center py-12">
                <button
                  onClick={() => setShowJournal(true)}
                  className="group flex flex-col items-center rounded-[32px] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-transparent p-12 backdrop-blur-md transition-all hover:border-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="mb-6 rounded-2xl bg-cyan-500/10 p-6 group-hover:bg-cyan-500/20 transition-colors">
                    <BookOpen size={48} className="text-cyan-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white">DU-46 Jurnali</h3>
                  <p className="mt-2 text-sm text-white/40">Ko'rik, tekshiruvlar tahlili va nosozliklar jurnali</p>
                  <p className="mt-1 text-xs text-cyan-400/60">Tasdiqlash uchun oching</p>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
