'use client'

import Image from 'next/image'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSessionGuard, useRealtimeSubscription, useToast } from '@/lib/hooks'
import { ToastContainer } from '@/components/ToastContainer'
import { getStations, getStation } from '@/lib/store'
import { DU46JournalView, JournalMonthSelectModal } from '@/components/JournalView'
import { WorkerSchemasView, BigActionCard } from '@/components/worker/WorkerComponents'
import { getPendingJournalCounts } from '@/lib/supabase-db'
import {
  LogOut,
  MapPin,
  BookOpen,
  AlertCircle,
  Map as MapIcon,
  ChevronLeft
} from 'lucide-react'

export default function YulUstasiPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard(['yul_ustasi'])
  const toast = useToast()

  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [showJournal, setShowJournal] = useState(false)
  const [showMonthSelect, setShowMonthSelect] = useState(false)
  const [showSchemas, setShowSchemas] = useState(false)
  const [selectedJournalMonth, setSelectedJournalMonth] = useState<string>('')
  const [pendingCounts, setPendingCounts] = useState({ du46: 0, shu2: 0 })

  const allStations = getStations()

  const myStations = useMemo(() => {
    if (!session?.stationIds?.length) return []
    return allStations.filter(s => session.stationIds.includes(s.id))
  }, [session, allStations])

  const loadPendingCounts = useCallback(async (sid: string, role: string) => {
    try {
      const counts = await getPendingJournalCounts(sid, role)
      setPendingCounts(counts)
    } catch {
      toast.error('Pending counts yuklashda xatolik')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedStation || !session?.role) return
    loadPendingCounts(selectedStation, session.role)
  }, [selectedStation, session?.role, loadPendingCounts])

  // Realtime: jurnal yangilanganda pending countni qayta olish
  useRealtimeSubscription(
    selectedStation && session?.role
      ? [{
        channelName: `yul_ustasi_journals_${selectedStation}`,
        table: 'station_journals',
        filter: `station_id=eq.${selectedStation}`,
        onEvent: () => loadPendingCounts(selectedStation, session!.role),
      }]
      : [],
    !!selectedStation && !!session?.role
  )

  if (sessionLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
    </div>
  )

  const stationName = selectedStation ? getStation(selectedStation)?.name : null

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50/30 to-fuchsia-50/20 text-slate-900 selection:bg-purple-500/10">
      {/* Background blur orbs to make glassmorphism pop */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-purple-300/20 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-300/20 blur-[100px]" />
      <div className="absolute top-[40%] right-[20%] h-[300px] w-[300px] rounded-full bg-fuchsia-300/20 blur-[100px]" />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.4),_transparent_80%),radial-gradient(ellipse_at_bottom_right,_rgba(255,255,255,0.3),_transparent_80%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* App Header */}
        <header className="sticky top-0 z-50 bg-transparent pt-3 px-4 sm:px-6 mx-auto w-full max-w-7xl print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-white/50 backdrop-blur-xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
                <Image src="/uty-logo.png" alt="UTY" fill className="object-contain p-2" />
              </div>
              <div className="min-w-0 flex flex-col justify-center bg-white/50 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h1 className="text-[14px] sm:text-[16px] font-black uppercase tracking-tight text-slate-900 leading-none">SMART SHCH</h1>
                <p className="text-[7.5px] sm:text-[8.5px] font-black text-purple-600 truncate uppercase tracking-wide mt-0.5">SMART CONTROL TIZIMI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mr-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></div>
                <span className="text-[10px] font-black text-slate-600 tracking-wider uppercase">{session?.fullName}</span>
              </div>
              <button onClick={handleSignOut} className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl text-purple-600 hover:bg-white/70 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <LogOut size={18} strokeWidth={2.5} />
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
                      className="group relative flex flex-col items-center overflow-hidden rounded-[28px] border border-white/60 bg-white/50 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all hover:border-purple-200/50 hover:bg-white/70 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.98] animate-scale-in"
                    >
                      <div className="mb-4 rounded-2xl bg-purple-50 p-4 group-hover:bg-purple-100 transition-colors">
                        <MapPin size={32} className="text-purple-400 group-hover:text-purple-600 transition-colors" />
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
              userRole="yul_ustasi"
              journalMonth={selectedJournalMonth}
              onClose={() => setShowJournal(false)}
            />
          ) : (
            /* DU-46 Tugmasi */
            <div className="space-y-6 animate-fade-up">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (showSchemas) setShowSchemas(false)
                    else setSelectedStation(null)
                  }}
                  className="rounded-xl bg-white p-3 text-purple-400 hover:text-purple-600 hover:bg-purple-50 transition shadow-sm ring-1 ring-purple-100"
                >
                  <MapPin size={24} />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{stationName}</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">
                    Yo'l Ustasi Boshqaruvi
                  </p>
                </div>
              </div>

              {showSchemas ? (
                <div>
                  <button onClick={() => setShowSchemas(false)} className="mb-4 flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2.5 text-sm font-medium text-purple-600 shadow-sm ring-1 ring-purple-100 transition-all hover:bg-purple-50 hover:text-purple-800 active:scale-[0.98]">
                    <ChevronLeft size={18} />
                    <span>Orqaga</span>
                  </button>
                  <WorkerSchemasView stationId={selectedStation} stationName={stationName || ''} />
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
                  <div className="col-span-1 lg:col-span-2">
                    <BigActionCard
                      title="DU-46 Jurnali"
                      desc="Ko'rik, tekshiruvlar tahlili va nosozliklar jurnali. Tasdiqlash uchun oching."
                      icon={<BookOpen size={24} strokeWidth={2} />}
                      color="purple"
                      onClick={() => setShowMonthSelect(true)}
                      badge={pendingCounts.du46}
                    />
                  </div>
                  <div className="col-span-1 lg:col-span-2">
                    <BigActionCard
                      title="Bekat Sxemalari"
                      desc="Bir ipli va ikki ipli sxemalar. Ko'rish uchun oching."
                      icon={<MapIcon size={24} strokeWidth={2} />}
                      color="blue"
                      onClick={() => setShowSchemas(true)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
