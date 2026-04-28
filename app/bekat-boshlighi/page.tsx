/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  getStations,
  getStation,
} from '@/lib/store'
import { DU46JournalView, JournalMonthSelectModal } from '@/components/JournalView'
import {
  getCurrentSession,
  signOut,
  getPendingJournalCounts
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
  const [showMonthSelect, setShowMonthSelect] = useState(false)
  const [selectedJournalMonth, setSelectedJournalMonth] = useState<string>('')
  const [pendingCounts, setPendingCounts] = useState({ du46: 0, shu2: 0 })

  const loadPendingCounts = useCallback(async (sid: string, role: string) => {
    try {
      const counts = await getPendingJournalCounts(sid, role)
      setPendingCounts(counts)
    } catch (err) {
      console.error('Error fetching pending counts', err)
    }
  }, [])

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

  useEffect(() => {
    if (!selectedStation || !session?.role) return
    loadPendingCounts(selectedStation, session.role)

    const journalChannel = supabase
      .channel(`bb_journals_${selectedStation}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'station_journals', filter: `station_id=eq.${selectedStation}` }, () => {
        loadPendingCounts(selectedStation, session!.role)
      })
      .subscribe()

    return () => { supabase.removeChannel(journalChannel) }
  }, [selectedStation, session, loadPendingCounts])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
    </div>
  )

  const stationName = selectedStation ? getStation(selectedStation)?.name : null

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 text-slate-900 selection:bg-blue-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.06),_transparent_40%)]" />
      <div className="absolute -left-32 top-0 h-[600px] w-[600px] rounded-full bg-blue-200/10 blur-[120px]" />
      <div className="absolute -right-32 bottom-0 h-[600px] w-[600px] rounded-full bg-sky-200/10 blur-[120px]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200/60">
                  <img src="/uty-logo.png" alt="UTY" className="h-full w-full object-contain" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900">SHCH BUXORO</h1>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Bekat Boshlig&apos;i Paneli</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:flex">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"></div>
                <span className="text-sm font-medium text-slate-600">{session?.fullName}</span>
              </div>

              <button
                onClick={async () => { await signOut(); router.push('/') }}
                className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 transition-all hover:bg-red-100 hover:shadow-sm active:scale-95"
              >
                <LogOut className="h-5 w-5 text-red-500 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-8">
          {!selectedStation ? (
            /* Station Selection */
            <div className="space-y-8 animate-fade-up">
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">Bekatni tanlang</h2>
                <p className="mt-2 text-slate-500">O&apos;zingizga biriktirilgan bekatni tanlang</p>
              </div>

              {myStations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white p-16 text-center shadow-sm">
                  <div className="mb-6 rounded-full bg-amber-50 p-6">
                    <AlertCircle size={48} className="text-amber-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">Hech qanday bekat biriktirilmagan</h3>
                  <p className="mt-2 text-slate-500">Dispetcher bilan bog&apos;laning va bekatlaringizni so&apos;rang</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {myStations.map(st => (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStation(st.id)}
                      className="group relative flex flex-col items-center overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm backdrop-blur-md transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] animate-scale-in"
                    >
                      <div className="mb-4 rounded-2xl bg-blue-50 p-4 group-hover:bg-blue-100 transition-colors">
                        <MapPin size={32} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <span className="text-lg font-black text-slate-900">{st.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : showMonthSelect ? (
            <JournalMonthSelectModal
              journalType="du46"
              onSelect={(monthKey) => {
                setSelectedJournalMonth(monthKey)
                setShowMonthSelect(false)
                setShowJournal(true)
              }}
              onClose={() => setShowMonthSelect(false)}
            />
          ) : showJournal ? (
            /* DU-46 Journal */
            <DU46JournalView
              stationId={selectedStation}
              stationName={stationName || ''}
              userName={session?.fullName || ''}
              userRole="bekat_boshlighi"
              journalMonth={selectedJournalMonth}
              onClose={() => setShowJournal(false)}
            />
          ) : (
            /* DU-46 Tugmasi */
            <div className="space-y-6 animate-fade-up">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedStation(null)}
                  className="rounded-xl bg-white p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shadow-sm ring-1 ring-slate-200"
                >
                  <MapPin size={24} />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{stationName}</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Bekat Boshlig&apos;i Boshqaruvi</p>
                </div>
              </div>

              {/* Faqat DU-46 tugmasi */}
              <div className="flex justify-center py-12">
                <button
                  onClick={() => setShowMonthSelect(true)}
                  className="group relative flex flex-col items-center rounded-[32px] border border-slate-200 bg-white p-12 shadow-sm backdrop-blur-md transition-all hover:border-blue-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  {pendingCounts.du46 > 0 && (
                    <div className="absolute -top-4 -right-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-lg font-black text-white shadow-xl shadow-red-500/40 animate-bounce">
                      +{pendingCounts.du46}
                    </div>
                  )}
                  <div className="mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 p-6 group-hover:from-blue-600 group-hover:to-sky-600 transition-colors shadow-lg">
                    <BookOpen size={48} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">DU-46 Jurnali</h3>
                  <p className="mt-2 text-sm text-slate-500">Ko&apos;rik, tekshiruvlar tahlili va nosozliklar jurnali</p>
                  <p className="mt-1 text-xs text-blue-500">Tasdiqlash uchun oching</p>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
