/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getStation,
} from '@/lib/store'
import {
  getReportsByWorker,
  getPremiyasByWorker,
  getPendingJournalCounts
} from '@/lib/supabase-db'
import { useSessionGuard, useToast } from '@/lib/hooks'
import { ToastContainer } from '@/components/ToastContainer'
import type { WorkReport, ReportEntry, PremiyaReport, JournalType } from '@/types'
import { MONTHS } from '@/lib/constants'
import { JournalSelectModal, JournalMonthSelectModal, DU46JournalView, SHU2JournalView } from '@/components/JournalView'
import { BigActionCard, HeaderCard, JournalForm, WorkerGraphicsView, WorkerSchemasView, PremiyaForm, WorkerTasksModal } from '@/components/worker/WorkerComponents'
import {
  FileText,
  Award,
  Map as MapIcon,
  ChevronLeft,
  LogOut,
  Download,
  BookOpen
} from 'lucide-react'

const _TOTAL_ROWS = 14
const _PREMIYA_ROWS = 12

export default function WorkerPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard(['worker', 'elektromexanik', 'elektromontyor'])
  const toast = useToast()
  const [view, setView] = useState<'home' | 'selectStation' | 'selectMonth' | 'selectPlanType' | 'journal' | 'viewReport' | 'premiyaForm' | 'viewPremiya' | 'sxemalar' | 'grafiklar' | 'journalSelect' | 'journalMonthSelect' | 'du46' | 'shu2' | 'kunlikIshlar'>('home')

  const [reports, setReports] = useState<WorkReport[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [premiyaReports, setPremiyaReports] = useState<PremiyaReport[]>([])
  const [activeStationId, setActiveStationId] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null)
  const [selectedPremiya, setSelectedPremiya] = useState<PremiyaReport | null>(null)
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

  const loadPremiyaReports = useCallback(async (userId: string) => {
    try {
      const p = await getPremiyasByWorker(userId)
      setPremiyaReports(p)
    } catch {
      toast.error('Premiyalarni yuklashda xatolik')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshData = useCallback(async (userId: string) => {
    setLoading(true)
    await Promise.all([
      loadWorkReports(userId),
      loadPremiyaReports(userId)
    ])
    setLoading(false)
  }, [loadWorkReports, loadPremiyaReports])

  const [viewInitialized, setViewInitialized] = useState(false)

  // Sessiya tayyor bo'lganda ma'lumotlarni yuklash
  useEffect(() => {
    if (!session) return
    refreshData(session.id)
    
    if (!viewInitialized) {
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

    const premiyaReportsChannel = supabase
      .channel(`worker_premiya_${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'premiya_reports',
          filter: `worker_id=eq.${session.id}`
        },
        () => {
          console.log('🚀 Realtime: Premiya holati o\'zgardi!')
          loadPremiyaReports(session.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(workReportsChannel)
      supabase.removeChannel(premiyaReportsChannel)
    }
  }, [session?.id, loadWorkReports, loadPremiyaReports])

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

  if (!session || sessionLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" /></div>

  const station = activeStationId ? getStation(activeStationId) : null
  const stationName = station?.name || '...'

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 text-slate-900 selection:bg-sky-500/10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(224,242,254,0.5),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(186,230,253,0.3),_transparent_50%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 p-1.5 shadow-sm ring-1 ring-slate-200/60"><img src="/uty-logo.png" alt="UTY" className="h-full w-full object-contain" /></div>
              <div className="min-w-0">
                <h1 className="text-sm font-black uppercase truncate text-slate-900 tracking-tight">SMART SHCH</h1>
                <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{session?.fullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(session?.stationIds?.length || 0) > 1 && view !== 'selectStation' && (
                <button onClick={() => setView('selectStation')} className="rounded-xl border border-sky-200/60 bg-sky-50/80 px-3 py-1.5 text-[10px] font-black text-sky-600 uppercase tracking-widest shadow-sm hover:bg-sky-100 transition-all">Bekatlar</button>
              )}
              <button onClick={handleSignOut} className="rounded-xl border border-red-200/60 bg-red-50/80 p-2 text-red-500 hover:bg-red-100 transition-all shadow-sm"><LogOut size={20} /></button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 pb-24">
          {/* Back button - shown above page content */}
          {view !== 'home' && view !== 'selectStation' && (
            <button onClick={() => setView('home')} className="mb-4 flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-white hover:text-slate-900 active:scale-[0.98]">
              <ChevronLeft size={18} />
              <span>Orqaga</span>
            </button>
          )}
          {view === 'selectStation' && (
            <div className="grid gap-6 sm:grid-cols-2 pt-10">
              {session?.stationIds?.map(sid => (
                <button key={sid} onClick={() => { setActiveStationId(sid); setView('home') }} className="group flex flex-col items-center p-12 rounded-3xl border border-slate-200/60 bg-white/80 shadow-lg backdrop-blur-sm transition-all hover:border-sky-300 hover:scale-[1.02] hover:shadow-xl active:scale-95 animate-fade-up">
                  <div className="mb-6 text-5xl group-hover:scale-110 transition-transform">📍</div>
                  <span className="text-xl font-black text-slate-900 tracking-tight">{getStation(sid)?.name}</span>
                  <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Bekatni tanlash</p>
                </button>
              ))}
            </div>
          )}

          {view === 'home' && (
            <div className="space-y-8 animate-fade-up">
              {/* Profile Card */}
              <div className="relative overflow-hidden rounded-3xl border border-sky-100/60 bg-white/80 p-8 shadow-xl backdrop-blur-sm">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-200/20 blur-3xl opacity-50" />
                <h2 className="text-3xl font-black text-slate-900">{session?.fullName}</h2>
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-sm font-bold text-sky-600 uppercase tracking-widest">
                    {session?.role === 'bekat_boshlighi' ? "Bekat Boshlig'i" : "Katta Elektromexanik"}
                  </p>
                  {stationName && stationName !== '...' && (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      <div className="flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 border border-slate-200/60 shadow-sm text-xs font-black uppercase tracking-widest text-slate-500">
                        <MapIcon size={14} className="text-slate-400" />
                        {stationName} BEKATI
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div onClick={() => setWorkerModal('bugunBajarilgan')} className="cursor-pointer flex flex-col items-start justify-center rounded-2xl bg-emerald-50/80 p-5 border border-emerald-100 shadow-sm hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Bugun bajarilgan ishlar</p>
                    <p className="text-3xl font-black text-emerald-700">{bugunBajarilgan.length}</p>
                  </div>
                  <div onClick={() => setWorkerModal('qolibKetgan')} className="cursor-pointer flex flex-col items-start justify-center rounded-2xl bg-red-50/80 p-5 border border-red-100 shadow-sm hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Bajarilmagan ishlar</p>
                    <p className="text-3xl font-black text-red-700">{qolibKetgan.length}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <BigActionCard
                  title="Hisobot To'ldirish"
                  desc={missedTasksCount > 0 ? "Sizda bajarilmagan ishlar bor! Ularni tasdiqlang." : "Oylik ish reja va bajarilgan ishlarni kiriting."}
                  icon={<FileText size={32} />}
                  onClick={() => setView('selectMonth')}
                  badge={missedTasksCount}
                />
                <BigActionCard
                  title="Bekat Sxemalari"
                  desc="Bir ipli va ikki ipli sxemalarni ko'rish."
                  icon={<MapIcon size={32} />}
                  color="blue"
                  onClick={() => setView('sxemalar')}
                />
                <BigActionCard
                  title="Grafiklar"
                  desc="Umumiy ish reja grafiklarini ko'rish va yuklab olish."
                  icon={<Download size={32} />}
                  color="amber"
                  onClick={() => setView('grafiklar')}
                />
                <BigActionCard
                  title="Ish Jurnallari"
                  desc="DU-46 va SHU-2 jurnallarini to'ldirish."
                  icon={<BookOpen size={32} />}
                  color="cyan"
                  onClick={() => setView('journalSelect')}
                  badge={pendingCounts.du46 + pendingCounts.shu2}
                />
              </div>
            </div>
          )}

          {view === 'selectMonth' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 animate-fade-up">
              {MONTHS.map((m, i) => {
                const isCurrent = i === new Date().getMonth()
                return (
                  <button key={m} onClick={() => { setSelectedMonth(i); setView('selectPlanType') }} className={`group flex flex-col p-6 rounded-2xl border shadow-sm backdrop-blur-sm transition-all ${isCurrent ? 'border-sky-300 bg-sky-50/80 shadow-sky-500/5' : 'border-slate-200/60 bg-white/80 hover:bg-slate-50 hover:border-slate-300'}`}>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{String(i + 1).padStart(2, '0')}</span>
                    <span className="mt-4 text-lg font-black text-slate-900 group-hover:text-sky-600 transition-colors uppercase tracking-tight">{m}</span>
                  </button>
                )
              })}
            </div>
          )}

          {view === 'selectPlanType' && (
            <div className="grid gap-4 sm:grid-cols-2 pt-10">
              <BigActionCard title="Oylik Reja" desc="Bajarilgan ishlar jurnalini to'ldirish." icon={<FileText size={32} />} onClick={() => setView('journal')} />
              <BigActionCard title="Premiya ro'yxati" desc="KPI ko'rsatkichlari ro'yxati." icon={<Award size={32} />} color="amber" onClick={() => setView('premiyaForm')} />
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

          {view === 'premiyaForm' && selectedMonth !== null && (
            <PremiyaForm
              session={session!}
              stationId={activeStationId}
              stationName={stationName}
              month={selectedMonth}
              onSubmit={() => { refreshData(session!.id); setView('home') }}
              onCancel={() => setView('home')}
            />
          )}

          {view === 'viewReport' && selectedReport && (
            <div className="animate-fade-up">
              <HeaderCard title="Hisobot Ko'rinishi" subtitle={`${selectedReport.month} В· ${stationName}`} status={selectedReport.confirmedAt || selectedReport.entries.every(e => !e.haftalikJadval && !e.yillikJadval && !e.yangiIshlar && !e.kmoBartaraf && !e.majburiyOzgarish || e.adImzosi) ? 'tasdiqlandi' : 'kutilmoqda'} />
              <div className="mt-6 mb-6 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm relative shadow-sm">
                <div className="sm:hidden absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 z-10 rounded-bl-lg font-bold">
                  O&apos;ngga suring →
                </div>
                <div className="overflow-x-auto overflow-y-hidden">
                  <table style={{ minWidth: "1200px" }} className="w-full border-collapse text-left text-[11px] text-slate-700">
                    <thead className="border-b-2 border-sky-500/30 bg-slate-50 font-bold text-slate-600">
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
                        <th className="border-r border-t border-slate-200 p-2 text-center font-bold text-sky-600">Shn</th>
                        <th className="border-r border-t border-slate-200 p-2 text-center font-bold text-sky-600">Imzo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.entries.map((e, idx) => (
                        <tr key={idx} className="group border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="border-r border-slate-100 p-2 text-center font-bold text-sky-600/50">{e.ragat}</td>
                          <td className="border-r border-slate-100 p-3 align-top whitespace-pre-wrap">{e.haftalikJadval || '—'}</td>
                          <td className="border-r border-slate-100 p-3 align-top whitespace-pre-wrap">{e.yillikJadval || '—'}</td>
                          <td className="border-r border-slate-100 p-3 align-top whitespace-pre-wrap">{e.yangiIshlar || '—'}</td>
                          <td className="border-r border-slate-100 p-3 align-top whitespace-pre-wrap">{e.kmoBartaraf || '—'}</td>
                          <td className="border-r border-slate-100 p-3 align-top whitespace-pre-wrap">{e.majburiyOzgarish || '—'}</td>
                          <td className="border-r border-slate-100 p-2 text-center align-middle font-medium text-sky-600">{e.bajarildiShn}</td>
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

          {view === 'viewPremiya' && selectedPremiya && (
            <div className="animate-fade-up">
              <HeaderCard title="Premiya Ro'yxati" subtitle={`${selectedPremiya.month} В· ${stationName}`} status={selectedPremiya.confirmedAt ? 'tasdiqlandi' : 'kutilmoqda'} color="amber" />
              <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr><th className="p-4 text-center w-12">№</th><th className="p-4">I.SH.</th><th className="p-4">Lavozimi</th><th className="p-4 text-center">Tabel №</th><th className="p-4 text-center">Rag'bat. %</th><th className="p-4">Eslatma</th></tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {selectedPremiya.entries.map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"><td className="p-4 text-center text-slate-400 font-bold">{idx + 1}</td><td className="p-4 font-bold">{e.ish}</td><td className="p-4 text-slate-500">{e.lavozim}</td><td className="p-4 text-center text-slate-500">{e.tabelNomeri}</td><td className="p-4 text-center font-black text-amber-600">{e.foiz}%</td><td className="p-4 text-slate-500">{e.eslatma}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6">
                <button
                  onClick={async () => {
                    const { jsPDF } = await import('jspdf')
                    const { default: autoTable } = await import('jspdf-autotable')
                    const doc = new jsPDF()
                    doc.setFontSize(14)
                    doc.text(`Premiya Ro'yxati - ${stationName}`, 14, 15)
                    doc.setFontSize(10)
                    doc.text(`Sana: ${selectedPremiya.month}`, 14, 22)
                    const tableColumn = ['№', 'I.SH.', 'Lavozimi', 'Tabel №', "Rag'bat. %", 'Eslatma']
                    const tableRows = selectedPremiya.entries.filter(e => e.ish || e.lavozim || e.foiz).map((e, idx) => [String(idx + 1), e.ish, e.lavozim, e.tabelNomeri, e.foiz ? e.foiz + '%' : '', e.eslatma])
                    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 30, styles: { font: 'helvetica', fontSize: 8 }, headStyles: { fillColor: [245, 158, 11] } })
                    doc.save(`Premiya_${stationName}_${selectedPremiya.month}.pdf`)
                  }}
                  className="btn-gradient w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  Yuklab olish (PDF)
                </button>
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
                setSelectedJournalType(type === 'du46' ? 'du46' : 'shu2')
                setView('journalMonthSelect')
              }}
              onClose={() => setView('home')}
              du46Count={pendingCounts.du46}
              shu2Count={pendingCounts.shu2}
            />
          )}
          {view === 'journalMonthSelect' && selectedJournalType && (
            <JournalMonthSelectModal
              journalType={selectedJournalType}
              onSelect={(monthKey) => {
                setSelectedJournalMonth(monthKey)
                setView(selectedJournalType)
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
