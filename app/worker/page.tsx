/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getStation,
} from '@/lib/store'
import {
  getReportsByWorker,
  getIncidents,
  getReadIncidentIds,
  getPendingJournalCounts
} from '@/lib/supabase-db'
import { useSessionGuard, useToast } from '@/lib/hooks'
import { ToastContainer } from '@/components/ToastContainer'
import type { WorkReport, ReportEntry, Incident, JournalType } from '@/types'
import { MONTHS } from '@/lib/constants'
import { JournalSelectModal, JournalMonthSelectModal, DU46JournalView, SHU2JournalView, ALSNJournalView, YerlatgichJournalView, AlsnKodJournalView, MpsFriksionJournalView } from '@/components/JournalView'
import { BigActionCard, HeaderCard, JournalForm, WorkerGraphicsView, WorkerSchemasView, WorkerTasksModal } from '@/components/worker/WorkerComponents'
import IncidentsView from '@/components/worker/IncidentsView'
import {
  FileText,
  Map as MapIcon,
  ChevronLeft,
  LogOut,
  Download,
  BookOpen,
  PieChart,
  BarChart3,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'

const _TOTAL_ROWS = 14

export default function WorkerPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard(['worker', 'elektromexanik', 'elektromontyor'])
  const toast = useToast()
  const [view, setView] = useState<'home' | 'selectStation' | 'selectMonth' | 'selectPlanType' | 'journal' | 'viewReport' | 'incidents' | 'sxemalar' | 'grafiklar' | 'journalSelect' | 'journalMonthSelect' | 'du46' | 'shu2' | 'kunlikIshlar' | 'boshqaJurnallar' | 'alsn' | 'alsnMonthSelect' | 'yerlatgich' | 'yerlatgichMonthSelect' | 'alsnKod' | 'alsnKodMonthSelect' | 'mpsFriksion' | 'mpsFriksionMonthSelect'>('home')

  const [reports, setReports] = useState<WorkReport[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [readIncidentIds, setReadIncidentIds] = useState<Set<string>>(new Set())
  const [activeStationId, setActiveStationId] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true)
  const [pendingCounts, setPendingCounts] = useState({ du46: 0, shu2: 0 })
  const [selectedJournalType, setSelectedJournalType] = useState<JournalType | null>(null)
  const [selectedJournalMonth, setSelectedJournalMonth] = useState<string>('')
  const [workerModal, setWorkerModal] = useState<'bugunBajarilgan' | 'qolibKetgan' | null>(null)

  const loadPendingCounts = useCallback(async (sid: string, role: string) => {
    try {
      const counts = await getPendingJournalCounts(sid, role)
      setPendingCounts(counts)
    } catch {
      toast.error('Pending counts yuklashda xatolik')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadWorkReports = useCallback(async (userId: string) => {
    try {
      const r = await getReportsByWorker(userId)
      setReports(r)
    } catch {
      toast.error('Hisobotlarni yuklashda xatolik')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadIncidents = useCallback(async (userId: string) => {
    try {
      const [allInc, readIds] = await Promise.all([
        getIncidents(),
        getReadIncidentIds(userId)
      ])
      setIncidents(allInc)
      setReadIncidentIds(new Set(readIds))
    } catch {
      toast.error('Baxtsiz hodisalarni yuklashda xatolik')
    }
  }, [toast])

  const refreshData = useCallback(async (userId: string) => {
    setLoading(true)
    await Promise.all([
      loadWorkReports(userId),
      loadIncidents(userId)
    ])
    setLoading(false)
  }, [loadWorkReports, loadIncidents])

  const [viewInitialized, setViewInitialized] = useState(false)

  // Sessiya tayyor bo'lganda ma'lumotlarni yuklash
  useEffect(() => {
    if (!session) return

    if (!viewInitialized) {
      refreshData(session.id)
      const stationsList = session.stationIds || []
      if (stationsList.length > 1) setView('selectStation')
      else if (stationsList.length === 1) setActiveStationId(stationsList[0])
      setViewInitialized(true)
    }
  }, [session, refreshData, viewInitialized])

  useEffect(() => {
    if (!activeStationId || !session?.role) return

    loadPendingCounts(activeStationId, session.role)

    const journalChannel = supabase
      .channel(`worker_journals_${activeStationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'station_journals', filter: `station_id=eq.${activeStationId}` }, () => {
        loadPendingCounts(activeStationId, session!.role)
      })
      .subscribe()

    return () => { supabase.removeChannel(journalChannel) }
  }, [activeStationId, session, session?.role, loadPendingCounts])

  useEffect(() => {
    if (!session?.id) return

    // ─── Realtime Subscriptions ───────────────
    const workReportsChannel = supabase
      .channel(`worker_reports_${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_reports',
          filter: `worker_id=eq.${session.id}`
        },
        () => {
          console.log('🚀 Realtime: Hisobot holati o\'zgardi!')
          loadWorkReports(session.id)
        }
      )
      .subscribe()

    const incidentsChannel = supabase
      .channel(`worker_incidents_${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => {
          loadIncidents(session.id)
        }
      )
      .subscribe()

    const incidentReadsChannel = supabase
      .channel(`worker_incident_reads_${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incident_reads', filter: `worker_id=eq.${session.id}` },
        () => {
          loadIncidents(session.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(workReportsChannel)
      supabase.removeChannel(incidentsChannel)
      supabase.removeChannel(incidentReadsChannel)
    }
  }, [session?.id, loadWorkReports, loadIncidents])

  const { bugunBajarilgan, qolibKetgan } = useMemo(() => {
    const bugun: { entry: ReportEntry, month: string }[] = []
    const qolib: { entry: ReportEntry, month: string }[] = []

    const today = new Date()
    const todayDay = today.getDate()
    const currentYear = today.getFullYear()
    const currentMonthIdx = today.getMonth() // 0-based

    // Joriy oy va o'tgan oy string ko'rinishida
    const currentMonthStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`
    const prevMonthIdx = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1
    const prevMonthYear = currentMonthIdx === 0 ? currentYear - 1 : currentYear
    const prevMonthStr = `${prevMonthYear}-${String(prevMonthIdx + 1).padStart(2, '0')}`

    reports.forEach(r => {
      if (!activeStationId || r.stationId !== activeStationId) return
      if (!r.confirmedAt) return // tasdiqlangan hisobotlar

      const isCurrentMonth = r.month === currentMonthStr
      const isPrevMonth = r.month === prevMonthStr

      if (!isCurrentMonth && !isPrevMonth) return

      r.entries.forEach(e => {
        const hasContent = e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish
        if (!hasContent) return

        const taskDay = parseInt((e.ragat || '').trim(), 10)
        if (isNaN(taskDay)) return

        const bajarilgan = !!(e.bajarildiShn)

        if (isCurrentMonth) {
          // Joriy oyda: muddati o'tgan va bajarilmagan
          if (taskDay < todayDay && !bajarilgan) {
            qolib.push({ entry: e, month: r.month })
          }
          // Bugun bajarilgan
          if (taskDay === todayDay && bajarilgan) {
            bugun.push({ entry: e, month: r.month })
          }
        } else if (isPrevMonth) {
          // O'tgan oyda: bajarilmagan barcha ishlar (muddat o'tib ketgan)
          if (!bajarilgan) {
            qolib.push({ entry: e, month: r.month })
          }
        }
      })
    })
    return { bugunBajarilgan: bugun, qolibKetgan: qolib }
  }, [reports, activeStationId])

  const missedTasksCount = qolibKetgan.length

  if (!session || sessionLoading) return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" /></div>

  const station = activeStationId ? getStation(activeStationId) : null
  const stationName = station?.name || '...'

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
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-white p-2 shadow-sm border border-slate-100">
                <img src="/uty-logo.png" alt="UTY" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-[14px] sm:text-[16px] font-black uppercase tracking-tight text-slate-900 leading-none">SMART SHCH</h1>
                <p className="text-[7.5px] sm:text-[8.5px] font-black text-purple-600 truncate uppercase tracking-wide mt-0.5">SMART CONTROL TIZIMI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(session?.stationIds?.length || 0) > 1 && view !== 'selectStation' && (
                <button onClick={() => setView('selectStation')} className="rounded-[14px] bg-white border border-slate-100 px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest shadow-sm hover:border-purple-200 hover:text-purple-600 transition-all">Bekatlar</button>
              )}
              <button onClick={handleSignOut} className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-[14px] border border-purple-100 bg-purple-50 text-purple-600 hover:bg-purple-100 hover:scale-105 active:scale-95 transition-all shadow-sm">
                <LogOut size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-4 pb-10">
          {/* Back button - shown above page content */}
          {view !== 'home' && view !== 'selectStation' && (
            <button onClick={() => setView('home')} className="mb-4 flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2.5 text-sm font-medium text-purple-600 shadow-sm ring-1 ring-purple-100 transition-all hover:bg-purple-50 hover:text-purple-800 active:scale-[0.98]">
              <ChevronLeft size={18} />
              <span>Orqaga</span>
            </button>
          )}
          {view === 'selectStation' && (
            <div className="grid gap-6 sm:grid-cols-2 pt-10">
              {session?.stationIds?.map(sid => (
                <button key={sid} onClick={() => { setActiveStationId(sid); setView('home') }} className="group flex flex-col items-center p-12 rounded-3xl border border-purple-100 bg-white/80 shadow-lg backdrop-blur-sm transition-all hover:border-purple-300 hover:scale-[1.02] hover:shadow-xl active:scale-95 animate-fade-up">
                  <div className="mb-6 text-5xl group-hover:scale-110 transition-transform">📍</div>
                  <span className="text-xl font-black text-slate-900 tracking-tight">{getStation(sid)?.name}</span>
                  <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Bekatni tanlash</p>
                </button>
              ))}
            </div>
          )}

          {view === 'home' && (
            <div className="space-y-4 sm:space-y-4 animate-fade-up">

              {/* Welcome Card */}
              <div className="relative overflow-hidden rounded-[24px] bg-white/50 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 flex items-center justify-between">
                <div className="relative z-10">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                    <span className="text-2xl">👋</span> Xush kelibsiz, {session?.fullName}!
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
                    Bugungi ishlaringizni samarali boshqaring.
                  </p>
                </div>
                {/* Abstract Decorative Elements representing the 3D graphics */}
                <div className="absolute right-0 top-0 h-full w-1/3 hidden sm:flex items-center justify-end pr-6 opacity-80 pointer-events-none">
                  <div className="relative w-28 h-28">
                    <div className="absolute right-10 top-3 w-14 h-14 rounded-2xl bg-purple-100/60 rotate-12 flex items-center justify-center backdrop-blur-md border border-purple-200/50">
                      <FileText size={24} className="text-purple-500" />
                    </div>
                    <div className="absolute right-2 bottom-4 w-10 h-10 rounded-full bg-indigo-100/60 -rotate-12 flex items-center justify-center backdrop-blur-md border border-indigo-200/50">
                      <PieChart size={18} className="text-indigo-500" />
                    </div>
                    <div className="absolute right-20 bottom-1 w-8 h-8 rounded-xl bg-sky-100/60 rotate-45 flex items-center justify-center backdrop-blur-md border border-sky-200/50">
                      <BarChart3 size={16} className="text-sky-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile & Stats Card */}
              <div className="rounded-[24px] bg-white/50 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
                <div className="mb-4">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">{session?.fullName}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-[10px] sm:text-xs font-black text-purple-600 uppercase tracking-widest">
                      {session?.role === 'bekat_boshlighi' ? "Bekat Boshlig'i" : session?.role === 'elektromexanik' ? 'Elektromexanik' : session?.role === 'elektromontyor' ? 'Elektromontyor' : "Katta Elektromexanik"}
                    </span>
                    {stationName && stationName !== '...' && (
                      <>
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 border border-slate-100 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <MapIcon size={12} className="text-slate-400" />
                          {stationName} BEKATI
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Bugun Bajarilgan Ishlar */}
                  <div
                    onClick={() => setWorkerModal('bugunBajarilgan')}
                    className="cursor-pointer group relative overflow-hidden rounded-[20px] bg-emerald-50/50 p-4 sm:p-5 border border-emerald-100/60 transition-all hover:bg-emerald-50 hover:border-emerald-200 hover:shadow-md active:scale-[0.98] flex items-center gap-4"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm border border-emerald-100/50 text-emerald-500 group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={26} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-600">Bugun bajarilgan ishlar</p>
                      <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 mb-0.5">{bugunBajarilgan.length}</p>
                      <p className="text-[10px] sm:text-[11px] font-medium text-emerald-700/70">
                        {bugunBajarilgan.length > 0 ? "Bajarilgan ishlar mavjud" : "Sizda hali bajarilgan ishlar yo'q"}
                      </p>
                    </div>
                  </div>

                  {/* Bajarilmagan Ishlar */}
                  <div
                    onClick={() => setWorkerModal('qolibKetgan')}
                    className="cursor-pointer group relative overflow-hidden rounded-[20px] bg-red-50/50 p-4 sm:p-5 border border-red-100/60 transition-all hover:bg-red-50 hover:border-red-200 hover:shadow-md active:scale-[0.98] flex items-center gap-4"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm border border-red-100/50 text-red-500 group-hover:scale-110 transition-transform">
                      <AlertTriangle size={26} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-red-600">Bajarilmagan ishlar</p>
                      <p className="text-xl sm:text-2xl font-black text-red-600 mt-0.5 mb-0.5">{qolibKetgan.length}</p>
                      <p className="text-[10px] sm:text-[11px] font-medium text-red-700/70">
                        {qolibKetgan.length > 0 ? "Bajarilmagan ishlar mavjud" : "Barcha ishlar o'z vaqtida bajarilgan"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
                <BigActionCard
                  title="Hisobot To'ldirish"
                  desc="Sizda bajarilmagan ishlar bor! Ularni tasdiqlang."
                  icon={<FileText size={24} strokeWidth={2} />}
                  onClick={() => setView('selectMonth')}
                  badge={missedTasksCount}
                  color="purple"
                />
                <BigActionCard
                  title="Bekat Sxemalari"
                  desc="Bir ipli va ikki ipli sxemalarni ko'rish."
                  icon={<MapIcon size={24} strokeWidth={2} />}
                  color="blue"
                  onClick={() => setView('sxemalar')}
                />
                <BigActionCard
                  title="Grafiklar"
                  desc="Umumiy ish reja grafiklarini ko'rish va yuklab olish."
                  icon={<Download size={24} strokeWidth={2} />}
                  color="amber"
                  onClick={() => setView('grafiklar')}
                />
                <BigActionCard
                  title="Ish Jurnallari"
                  desc="DU-46 va SHU-2 jurnallarini to'ldirish."
                  icon={<BookOpen size={24} strokeWidth={2} />}
                  color="sky"
                  onClick={() => setView('journalSelect')}
                  badge={pendingCounts.du46 + pendingCounts.shu2}
                />
                <BigActionCard
                  title="Baxtsiz Hodisalar"
                  desc="Sodir bo'lgan baxtsiz hodisalar bilan tanishing."
                  icon={<AlertTriangle size={24} strokeWidth={2} />}
                  color="amber"
                  onClick={() => setView('incidents')}
                  badge={incidents.filter(i => !readIncidentIds.has(i.id)).length}
                />
              </div>
            </div>
          )}

          {view === 'selectMonth' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 animate-fade-up">
              {MONTHS.map((m, i) => {
                const isCurrent = i === new Date().getMonth()
                return (
                  <button key={m} onClick={() => { setSelectedMonth(i); setView('journal') }} className={`group flex flex-col p-6 rounded-2xl border shadow-sm backdrop-blur-sm transition-all ${isCurrent ? 'border-purple-300 bg-purple-50/80 shadow-purple-500/5' : 'border-slate-200/60 bg-white/80 hover:bg-purple-50/40 hover:border-purple-200'}`}>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{String(i + 1).padStart(2, '0')}</span>
                    <span className="mt-4 text-lg font-black text-slate-900 group-hover:text-purple-600 transition-colors uppercase tracking-tight">{m}</span>
                  </button>
                )
              })}
            </div>
          )}

          {view === 'journal' && selectedMonth !== null && (
            <JournalForm
              session={session!}
              stationId={activeStationId!}
              stationName={stationName!}
              month={selectedMonth}
              reports={reports}
              onSubmit={() => { refreshData(session!.id); setView('home') }}
              onCancel={() => setView('home')}
            />
          )}

          {view === 'incidents' && (
            <div className="animate-fade-up">
              <IncidentsView
                incidents={incidents}
                readIds={readIncidentIds}
                workerId={session!.id}
                onRead={async () => {
                  loadIncidents(session.id)
                }}
              />
            </div>
          )}

          {view === 'viewReport' && selectedReport && (
            <div className="animate-fade-up">
              <HeaderCard title="Hisobot Ko'rinishi" subtitle={`${selectedReport.month} В· ${stationName}`} status={selectedReport.confirmedAt || selectedReport.entries.every(e => !e.haftalikJadval && !e.yillikJadval && !e.yangiIshlar && !e.kmoBartaraf && !e.majburiyOzgarish || e.adImzosi) ? 'tasdiqlandi' : 'kutilmoqda'} />
              <div className="mt-6 mb-6 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm relative shadow-sm">
                <div className="sm:hidden absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-2 py-1 z-10 rounded-bl-lg font-bold">
                  O&apos;ngga suring →
                </div>
                <div className="overflow-x-auto overflow-y-hidden">
                  <table style={{ minWidth: "1200px" }} className="w-full border-collapse text-left text-[11px] text-slate-700">
                    <thead className="border-b-2 border-purple-500/30 bg-slate-50 font-bold text-slate-600">
                      <tr>
                        <th rowSpan={2} className="w-10 border-r border-slate-200 p-2 text-center">№</th>
                        <th rowSpan={2} className="w-[18%] border-r border-slate-200 p-2 text-center">4-haftalik jadval</th>
                        <th rowSpan={2} className="w-[18%] border-r border-slate-200 p-2 text-center">Yillik jadval bo&apos;yicha</th>
                        <th rowSpan={2} className="w-[14%] border-r border-slate-200 p-2">Yangi ishlar ro&apos;yxati</th>
                        <th rowSpan={2} className="w-[14%] border-r border-slate-200 p-2">O&apos;tkazilgan KMO va bartaraf etilgan kamchiliklar</th>
                        <th rowSpan={2} className="w-[13%] border-r border-slate-200 p-2">Rejaga kiritilgan majburiy o&apos;zgartirishlar</th>
                        <th colSpan={2} className="border-r border-slate-200 bg-slate-50 p-2 text-center">Bajarilgan ishlar</th>
                        <th rowSpan={2} className="w-[8%] bg-amber-50 p-2 text-center text-amber-700">AD imzosi</th>
                      </tr>
                      <tr className="bg-slate-100/50">
                        <th className="border-r border-t border-slate-200 p-2 text-center font-bold text-purple-600">Shn</th>
                        <th className="border-r border-t border-slate-200 p-2 text-center font-bold text-purple-600">Imzo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.entries.map((e, idx) => (
                        <tr key={idx} className="group border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="border-r border-slate-100 p-2 text-center font-bold text-purple-600/50">{e.ragat}</td>
                          <td className="border-r border-slate-100 p-3 align-top whitespace-pre-wrap">{e.haftalikJadval || '—'}</td>
                          <td className="border-r border-slate-100 p-3 align-top whitespace-pre-wrap">{e.yillikJadval || '—'}</td>
                          <td className="border-r border-slate-100 p-3 align-top whitespace-pre-wrap">{e.yangiIshlar || '—'}</td>
                          <td className="border-r border-slate-100 p-3 align-top whitespace-pre-wrap">{e.kmoBartaraf || '—'}</td>
                          <td className="border-r border-slate-100 p-3 align-top whitespace-pre-wrap">{e.majburiyOzgarish || '—'}</td>
                          <td className="border-r border-slate-100 p-2 text-center align-middle font-medium text-purple-600">{e.bajarildiShn}</td>
                          <td className="border-r border-slate-100 p-2 text-center align-middle italic text-slate-400">{e.bajarildiImzo}</td>
                          <td className="p-2 text-center align-middle">
                            {e.adImzosi ? (
                              <span className="inline-block whitespace-pre-wrap rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600 border border-emerald-100">✅ {e.adImzosi}</span>
                            ) : (
                              <span className="text-[10px] text-slate-300 italic">Kutilmoqda...</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}



          {view === 'sxemalar' && (
            <WorkerSchemasView stationId={activeStationId} stationName={stationName} />
          )}
          {view === 'grafiklar' && (
            <WorkerGraphicsView />
          )}
          {view === 'journalSelect' && (
            <JournalSelectModal
              onSelect={(type) => {
                setSelectedJournalType(type)
                if (type === 'boshqa') {
                  setView('boshqaJurnallar')
                } else {
                  setView('journalMonthSelect')
                }
              }}
              onClose={() => setView('home')}
              du46Count={pendingCounts.du46}
              shu2Count={pendingCounts.shu2}
            />
          )}
          {view === 'journalMonthSelect' && selectedJournalType && (
            <JournalMonthSelectModal
              journalType={selectedJournalType}
              userRole="worker"
              onSelect={(monthKey) => {
                setSelectedJournalMonth(monthKey)
                if (selectedJournalType === 'du46' || selectedJournalType === 'shu2') {
                  setView(selectedJournalType)
                }
              }}
              onClose={() => setView('journalSelect')}
            />
          )}
          {view === 'du46' && (
            <DU46JournalView
              stationId={activeStationId}
              stationName={stationName}
              userName={session?.fullName || ''}
              userRole="worker"
              journalMonth={selectedJournalMonth}
              onClose={() => {
                setView('home')
                if (activeStationId && session?.role) {
                  loadPendingCounts(activeStationId, session.role)
                }
              }}
            />
          )}
          {view === 'shu2' && (
            <SHU2JournalView
              stationId={activeStationId}
              stationName={stationName}
              userName={session?.fullName || ''}
              userRole="worker"
              journalMonth={selectedJournalMonth}
              onClose={() => {
                setView('home')
                if (activeStationId && session?.role) {
                  loadPendingCounts(activeStationId, session.role)
                }
              }}
              onAccepted={() => {
                if (activeStationId && session?.role) {
                  loadPendingCounts(activeStationId, session.role)
                }
              }}
            />
          )}

          {view === 'boshqaJurnallar' && (
            <div className="space-y-6 animate-fade-up">
              <HeaderCard title="Boshqa jurnallar" subtitle={stationName!} status="ko'rish" color="purple" />
              <div className="grid gap-4 max-w-lg mx-auto">
                <button
                  onClick={() => setView('alsnMonthSelect')}
                  className="group relative flex items-center gap-5 rounded-[28px] border border-slate-200 bg-white p-6 text-left transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 active:scale-95"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-white border border-transparent group-hover:border-blue-100 shadow-sm">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Poezd radioaloqasi va ALSN</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">Poezd radioaloqasi va ALSN ni tekshirish jurnali</p>
                  </div>
                </button>
                <button
                  onClick={() => setView('yerlatgichMonthSelect')}
                  className="group relative flex items-center gap-5 rounded-[28px] border border-slate-200 bg-white p-6 text-left transition-all hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 active:scale-95"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-all group-hover:bg-white border border-transparent group-hover:border-emerald-100 shadow-sm">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Yerlatgich xabarlagichi</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">Yerlatgich xabarlagichi yordamida montaj izolyatsiya qarshiligini o'lchash jurnali (NSH-01 17.1.8)</p>
                  </div>
                </button>
                <button
                  onClick={() => setView('alsnKodMonthSelect')}
                  className="group relative flex items-center gap-5 rounded-[28px] border border-slate-200 bg-white p-6 text-left transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 active:scale-95"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-white border border-transparent group-hover:border-blue-100 shadow-sm">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">ALSN kodlarini o'lchash</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">ALSN kodlarini to'g'rilash va tok kuchini o'lchash jurnali (NSH-01 10.4)</p>
                  </div>
                </button>
                <button
                  onClick={() => setView('mpsFriksionMonthSelect')}
                  className="group relative flex items-center gap-5 rounded-[28px] border border-slate-200 bg-white p-6 text-left transition-all hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/5 active:scale-95"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition-all group-hover:bg-white border border-transparent group-hover:border-violet-100 shadow-sm">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">MPS elektrodvigatellarni friksion tokini o&apos;lchash</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">MPS turidagi elektrodvigatellarni friksion tokini o&apos;lchash jurnali (NSH-01 9.1.4)</p>
                  </div>
                </button>
              </div>
              <div className="text-center mt-4">
                <button onClick={() => setView('journalSelect')} className="rounded-2xl bg-white border border-slate-200/60 px-10 py-3 font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm backdrop-blur-sm">Orqaga</button>
              </div>
            </div>
          )}

          {view === 'alsnMonthSelect' && (
            <JournalMonthSelectModal
              journalType={'alsn'}
              userRole="worker"
              onSelect={(monthKey) => {
                setSelectedJournalMonth(monthKey)
                setView('alsn')
              }}
              onClose={() => setView('boshqaJurnallar')}
            />
          )}

          {view === 'yerlatgichMonthSelect' && (
            <JournalMonthSelectModal
              journalType={'yerlatgich'}
              userRole="worker"
              onSelect={(monthKey) => {
                setSelectedJournalMonth(monthKey)
                setView('yerlatgich')
              }}
              onClose={() => setView('boshqaJurnallar')}
            />
          )}

          {view === 'alsn' && (
            <ALSNJournalView
              stationId={activeStationId}
              stationName={stationName}
              userName={session?.fullName || ''}
              userRole="worker"
              journalMonth={selectedJournalMonth}
              onClose={() => setView('home')}
            />
          )}

          {view === 'yerlatgich' && (
            <YerlatgichJournalView
              stationId={activeStationId}
              stationName={stationName}
              userName={session?.fullName || ''}
              userRole="worker"
              journalMonth={selectedJournalMonth}
              onClose={() => setView('home')}
            />
          )}

          {view === 'alsnKodMonthSelect' && (
            <JournalMonthSelectModal
              journalType={'alsnKod'}
              userRole="worker"
              onSelect={(monthKey) => {
                setSelectedJournalMonth(monthKey)
                setView('alsnKod')
              }}
              onClose={() => setView('boshqaJurnallar')}
            />
          )}

          {view === 'alsnKod' && (
            <AlsnKodJournalView
              stationId={activeStationId}
              stationName={stationName}
              userName={session?.fullName || ''}
              userRole="worker"
              journalMonth={selectedJournalMonth}
              onClose={() => setView('home')}
            />
          )}

          {view === 'mpsFriksionMonthSelect' && (
            <JournalMonthSelectModal
              journalType={'mpsFriksion'}
              userRole="worker"
              onSelect={(monthKey) => {
                setSelectedJournalMonth(monthKey)
                setView('mpsFriksion')
              }}
              onClose={() => setView('boshqaJurnallar')}
            />
          )}

          {view === 'mpsFriksion' && (
            <MpsFriksionJournalView
              stationId={activeStationId}
              stationName={stationName}
              userName={session?.fullName || ''}
              userRole="worker"
              journalMonth={selectedJournalMonth}
              onClose={() => setView('home')}
            />
          )}

          {workerModal && (
            <WorkerTasksModal
              type={workerModal}
              tasks={workerModal === 'bugunBajarilgan' ? bugunBajarilgan : qolibKetgan}
              onClose={() => setWorkerModal(null)}
            />
          )}
        </main>
      </div>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )

}
