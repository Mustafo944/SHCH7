'use client'

import Image from 'next/image'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSessionGuard, useRealtimeSubscription, useToast, useNotificationSound } from '@/lib/hooks'
import { ToastContainer } from '@/components/ToastContainer'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import { getStation } from '@/lib/store'
import dynamic from 'next/dynamic'
import { JournalMonthSelectModal } from '@/components/JournalView'

const DU46JournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.DU46JournalView), { ssr: false })
import { BigActionCard } from '@/components/worker/WorkerComponents'
import { getPendingJournalCounts } from '@/lib/supabase-db'
import {
  LogOut,
  BookOpen,
  AlertCircle,
  Volume2,
  VolumeX
} from 'lucide-react'

export default function YulUstasiPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard(['yul_ustasi'])
  const toast = useToast()

  const [view, setView] = useState<'home' | 'monthSelect' | 'journal'>('home')
  const [selectedJournalMonth, setSelectedJournalMonth] = useState<string>('')
  const [pendingCounts, setPendingCounts] = useState({ du46: 0, shu2: 0 })
  const { isMuted, setIsMuted } = useNotificationSound(pendingCounts.du46)
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)

  // Yo'l ustasiga faqat 1 ta bekat biriktiriladi — uni avtomatik olamiz
  const stationId = useMemo(() => {
    return session?.stationIds?.[0] || ''
  }, [session])

  const stationName = useMemo(() => {
    if (!stationId) return ''
    return getStation(stationId)?.name || ''
  }, [stationId])

  const loadPendingCounts = useCallback(async (sid: string, role: string, position?: string) => {
    try {
      const counts = await getPendingJournalCounts(sid, role, position)
      setPendingCounts(counts)
    } catch {
      toast.error('Pending counts yuklashda xatolik')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!stationId || !session?.role) return
    loadPendingCounts(stationId, session.role, session.position)
  }, [stationId, session, loadPendingCounts])

  // Realtime: jurnal yangilanganda pending countni qayta olish
  useRealtimeSubscription(
    stationId && session?.role
      ? [{
        channelName: `yul_ustasi_journals_${stationId}`,
        table: 'station_journals',
        filter: `station_id=eq.${stationId}`,
        onEvent: () => loadPendingCounts(stationId, session!.role, session!.position),
      }]
      : [],
    !!stationId && !!session?.role
  )

  if (sessionLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
    </div>
  )

  // Bekat biriktirilmagan holat
  if (!stationId) return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <AuroraMeshBackground />
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white p-16 text-center shadow-sm max-w-md">
          <div className="mb-6 rounded-full bg-amber-50 p-6">
            <AlertCircle size={48} className="text-amber-500" />
          </div>
          <h3 className="text-xl font-black text-slate-800">Hech qanday bekat biriktirilmagan</h3>
          <p className="mt-2 text-slate-500">Dispetcher bilan bog&apos;laning va bekatlaringizni so&apos;rang</p>
          <button
            onClick={() => setIsSignOutModalOpen(true)}
            className="mt-8 flex items-center gap-2 rounded-xl bg-rose-50 px-6 py-3 font-bold text-rose-600 transition-all hover:bg-rose-100 active:scale-95 border border-rose-200"
          >
            <LogOut size={20} />
            <span>Tizimdan chiqish</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-indigo-500/10">
      <AuroraMeshBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* App Header */}
        <header className="sticky top-0 z-50 bg-transparent pt-3 px-4 sm:px-6 mx-auto w-full max-w-[1600px] print:hidden">
          <div className="flex items-center justify-between bg-white/60 backdrop-blur-2xl px-3 sm:px-5 py-2 sm:py-3 rounded-[24px] sm:rounded-[32px] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-[16px] bg-white/80 p-2 shadow-sm border border-white/80">
                <Image src="/uty-logo.png" alt="UTY" fill className="object-contain p-2 drop-shadow-sm" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-[15px] sm:text-[18px] font-black uppercase tracking-tight text-slate-900 leading-none">SMART SHCH</h1>
                <p className="text-[8px] sm:text-[9.5px] font-black text-purple-600 truncate uppercase tracking-widest mt-1 drop-shadow-sm">SMART CONTROL TIZIMI</p>
                <p className="text-[10px] font-black text-slate-400 truncate uppercase tracking-tight mt-0.5 sm:hidden">{session?.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/60 border border-white/60 shadow-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                <span className="text-[11px] font-black text-slate-700 tracking-widest uppercase">{session?.fullName || 'Yo\'l Ustasi'}</span>
              </div>
              <button onClick={() => setIsMuted(!isMuted)} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-500 hover:bg-slate-50 hover:text-purple-600 transition-all shadow-sm active:scale-95">
                {isMuted ? <VolumeX size={20} strokeWidth={2.5} /> : <Volume2 size={20} strokeWidth={2.5} />}
              </button>
              <button onClick={() => setIsSignOutModalOpen(true)} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-purple-100/50 bg-purple-50/50 text-purple-600 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 hover:scale-105 active:scale-95 transition-all shadow-sm group">
                <LogOut size={20} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-8">
          {view === 'monthSelect' && (
            <JournalMonthSelectModal
              journalType="du46"
              onSelect={(monthKey) => {
                setSelectedJournalMonth(monthKey)
                setView('journal')
              }}
              onClose={() => setView('home')}
            />
          )}

          {view === 'journal' && (
            <DU46JournalView
              stationId={stationId}
              stationName={stationName}
              userName={session?.fullName || ''}
              userRole={session?.position || 'yul_ustasi'}
              journalMonth={selectedJournalMonth}
              onClose={() => setView('home')}
            />
          )}

          {view === 'home' && (
            <div className="space-y-6 animate-fade-up">
              {/* Station info */}
              <div className="rounded-[24px] bg-white/50 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
                <h2 className="text-2xl font-black text-slate-900">{stationName}</h2>
                <p className="mt-1 text-xs text-slate-500 uppercase tracking-widest">
                  Yo&apos;l Ustasi Boshqaruvi
                </p>
              </div>

              {/* Faqat DU-46 tugmasi */}
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
                <div className="col-span-full sm:col-span-2 lg:col-span-2">
                  <BigActionCard
                    title="DU-46 Jurnali"
                    desc="Ko'rik, tekshiruvlar tahlili va nosozliklar jurnali."
                    icon={<BookOpen size={24} strokeWidth={2} />}
                    color="purple"
                    onClick={() => setView('monthSelect')}
                    badge={pendingCounts.du46}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* SIGN OUT MODAL */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-8 text-center shadow-2xl animate-fade-up">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-rose-50 shadow-inner">
              <LogOut size={32} className="text-rose-500" strokeWidth={2.5} />
            </div>
            <h3 className="mb-2 text-2xl font-black text-slate-900 tracking-tight">Tizimdan chiqish</h3>
            <p className="mb-8 text-sm font-medium text-slate-500">Haqiqatan ham tizimdan chiqmoqchimisiz?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsSignOutModalOpen(false)}
                className="flex-1 rounded-2xl bg-slate-100 py-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 active:bg-slate-300"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 rounded-2xl bg-rose-500 py-4 text-sm font-bold text-white shadow-lg shadow-rose-500/30 transition-all hover:bg-rose-600 active:scale-95"
              >
                Ha, chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
