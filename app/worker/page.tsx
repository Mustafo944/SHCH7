'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  getStation,
} from '@/lib/store'
import {
  getCurrentSession,
  getReportsByWorker,
  getPremiyasByWorker,
  upsertReport,
  upsertPremiyaReport,
  getSchemasByStation,
  getGlobalGraphics,
  signOut,
  getPendingJournalCounts
} from '@/lib/supabase-db'
import type { User, WorkReport, ReportEntry, PremiyaReport, PremiyaEntry, StationSchema, JournalType } from '@/types'
import { MONTHS } from '@/lib/constants'
import { JournalSelectModal, DU46JournalView, SHU2JournalView } from '@/components/JournalView'
import { YILLIK_REJA, TORT_HAFTALIK_REJA, YILLIK_REJA_FLAT, TORT_HAFTALIK_REJA_FLAT, type ParsedTaskItem } from '@/lib/reja-data'
import {
  LayoutDashboard,
  FileText,
  Award,
  Map as MapIcon,
  ChevronLeft,
  LogOut,
  Plus,
  Trash2,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  BookOpen
} from 'lucide-react'

const TOTAL_ROWS = 14
const PREMIYA_ROWS = 12

export default function WorkerPage() {
  const router = useRouter()
  const [session, setSessionState] = useState<User | null>(null)
  const [view, setView] = useState<'home' | 'selectStation' | 'selectMonth' | 'selectPlanType' | 'journal' | 'viewReport' | 'premiyaForm' | 'viewPremiya' | 'sxemalar' | 'grafiklar' | 'journalSelect' | 'du46' | 'shu2'>('home')

  const [reports, setReports] = useState<WorkReport[]>([])
  const [premiyaReports, setPremiyaReports] = useState<PremiyaReport[]>([])
  const [activeStationId, setActiveStationId] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null)
  const [selectedPremiya, setSelectedPremiya] = useState<PremiyaReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingCounts, setPendingCounts] = useState({ du46: 0, shu2: 0 })

  const loadPendingCounts = useCallback(async (sid: string, role: string) => {
    try {
      const counts = await getPendingJournalCounts(sid, role)
      setPendingCounts(counts)
    } catch {}
  }, [])

  const loadWorkReports = useCallback(async (userId: string) => {
    try {
      const r = await getReportsByWorker(userId)
      setReports(r)
    } catch (e) { console.error('Error fetching work reports', e) }
  }, [])

  const loadPremiyaReports = useCallback(async (userId: string) => {
    try {
      const p = await getPremiyasByWorker(userId)
      setPremiyaReports(p)
    } catch (e) { console.error('Error fetching premiya reports', e) }
  }, [])

  const refreshData = useCallback(async (userId: string) => {
    setLoading(true)
    await Promise.all([
      loadWorkReports(userId),
      loadPremiyaReports(userId)
    ])
    setLoading(false)
  }, [loadWorkReports, loadPremiyaReports])

  useEffect(() => {
    async function init() {
      const u = await getCurrentSession()   // Supabase bilan tekshiradi
      if (!u || u.role === 'dispatcher') {
        router.replace('/')
        return
      }
      if (u.role === 'bekat_boshlighi') {
        router.replace('/bekat-boshlighi')
        return
      }
      setSessionState(u)
      refreshData(u.id) // background loading

      const stationsList = u.stationIds || []
      if (stationsList.length > 1) setView('selectStation')
      else if (stationsList.length === 1) setActiveStationId(stationsList[0])
    }
    init()
  }, [router, refreshData])

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
  }, [activeStationId, session?.role, loadPendingCounts])

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

  if (!session) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" /></div>

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
              <button onClick={async () => { await signOut(); router.push('/') }} className="rounded-xl border border-red-200/60 bg-red-50/80 p-2 text-red-500 hover:bg-red-100 transition-all shadow-sm"><LogOut size={20} /></button>
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
                <p className="mt-1 text-sm font-bold text-sky-600 uppercase tracking-widest">{session?.role === 'bekat_boshlighi' ? "Bekat Boshlig'i" : "Katta Elektromexanik"}</p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100 shadow-inner"><p className="text-[10px] font-black uppercase text-slate-400">Hisobotlar</p><p className="text-2xl font-black text-slate-900">{reports.length}</p></div>
                  <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100 shadow-inner"><p className="text-[10px] font-black uppercase text-slate-400">Tasdiqlangan</p><p className="text-2xl font-black text-emerald-600">{reports.filter(r => r.confirmedAt).length}</p></div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <BigActionCard
                  title="Hisobot To'ldirish"
                  desc="Oylik ish reja va bajarilgan ishlarni kiriting."
                  icon={<FileText size={32} />}
                  onClick={() => setView('selectMonth')}
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
              stationId={activeStationId}
              stationName={stationName}
              month={selectedMonth}
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
              <HeaderCard title="Hisobot Ko'rinishi" subtitle={`${selectedReport.month} · ${stationName}`} status={selectedReport.confirmedAt || selectedReport.entries.every(e => !e.haftalikJadval && !e.yillikJadval && !e.yangiIshlar && !e.kmoBartaraf && !e.majburiyOzgarish || e.adImzosi) ? 'tasdiqlandi' : 'kutilmoqda'} />
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
                              <span className="inline-block whitespace-pre-wrap rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600 border border-emerald-100">{e.adImzosi}</span>
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
              <HeaderCard title="Premiya Ro'yxati" subtitle={`${selectedPremiya.month} · ${stationName}`} status={selectedPremiya.confirmedAt ? 'tasdiqlandi' : 'kutilmoqda'} color="amber" />
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
              onSelect={(type) => setView(type === 'du46' ? 'du46' : 'shu2')}
              onClose={() => setView('home')}
              du46Count={pendingCounts.du46}
              shu2Count={pendingCounts.shu2}
            />
          )}
          {view === 'du46' && (
            <DU46JournalView
              stationId={activeStationId}
              stationName={stationName}
              userName={session?.fullName || ''}
              userRole="worker"
              onClose={() => setView('home')}
            />
          )}
          {view === 'shu2' && (
            <SHU2JournalView
              stationId={activeStationId}
              stationName={stationName}
              userName={session?.fullName || ''}
              userRole="worker"
              onClose={() => setView('home')}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function BigActionCard({ title, desc, icon, onClick, color = 'cyan', badge = 0 }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void, color?: 'cyan' | 'amber' | 'blue', badge?: number }) {
  const colorMap: Record<string, string> = {
    cyan: 'hover:border-sky-300 hover:shadow-sky-100/50 text-sky-600',
    amber: 'hover:border-amber-300 hover:shadow-amber-100/50 text-amber-600',
    blue: 'hover:border-blue-300 hover:shadow-blue-100/50 text-blue-600',
  }
  return (
    <button onClick={onClick} className={`premium-card group relative flex flex-col items-start p-8 bg-gradient-to-br from-white to-slate-50/50 transition-all hover:scale-[1.02] active:scale-[0.98] text-left animate-fade-up ${colorMap[color]}`}>
      {badge > 0 && (
        <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white shadow-lg shadow-red-500/30 animate-bounce">
          {badge > 9 ? '9+' : badge}
        </div>
      )}
      <div className={`rounded-2xl bg-slate-50 p-4 mb-6 group-hover:scale-110 group-hover:bg-white border border-slate-100 transition-all shadow-sm ${color === 'cyan' ? 'text-sky-600' : color === 'amber' ? 'text-amber-600' : 'text-blue-600'}`}>{icon}</div>
      <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
    </button>
  )
}

function HeaderCard({ title, subtitle, status, color = 'cyan' }: { title: string, subtitle: string, status: string, color?: string }) {
  const statusColors: Record<string, string> = {
    tasdiqlandi: 'badge-success',
    kutilmoqda: 'badge-warning',
    yangi: 'badge-info',
    "ko'rish": 'badge-info',
  }
  return (
    <div className="glass-card rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
        </div>
        <div className={`badge ${statusColors[status]}`}>{status}</div>
      </div>
    </div>
  )
}

function JournalForm({ session, stationId, stationName, month, onSubmit, onCancel }: { session: User, stationId: string, stationName: string, month: number, onSubmit: () => void, onCancel: () => void }) {
  const [entries, setEntries] = useState<ReportEntry[]>(Array.from({ length: TOTAL_ROWS }, (_, i) => ({
    ragat: String(i + 1), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: '', bajarildiImzo: '', adImzosi: ''
  })))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'4-haftalik' | 'yillik'>('4-haftalik')
  const [modalIdx, setModalIdx] = useState(0)
  const [modalSearch, setModalSearch] = useState('')
  const [selectedBolim, setSelectedBolim] = useState<number | null>(null)
  const monthStr = `${new Date().getFullYear()}-${String(month + 1).padStart(2, '0')}`

  useEffect(() => {
    getReportsByWorker(session.id).then(reports => {
      const draft = reports.find(r => r.month === monthStr)
      if (draft) setEntries(draft.entries)
    })
  }, [session.id, monthStr])

  const addRow = () => {
    setEntries([...entries, {
      ragat: String(entries.length + 1), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: '', bajarildiImzo: '', adImzosi: ''
    }])
  }
  const removeRow = () => {
    if (entries.length <= 1) return
    const last = entries[entries.length - 1]
    // Tasdiqlangan qatorni o'chirib bo'lmaydi
    if (last.adImzosi) return
    setEntries(entries.slice(0, -1))
  }
  const openSelectModal = (idx: number, type: '4-haftalik' | 'yillik') => {
    setModalIdx(idx)
    setModalType(type)
    setModalSearch('')
    setSelectedBolim(null)   // ← bo'lim tanlanmagan holda ochiladi
    setModalOpen(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const updatedEntries = entries.map(e => {
        const hasData = e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish;
        return {
          ...e,
          bajarildiShn: hasData ? (e.bajarildiShn || session.fullName) : '',
          bajarildiImzo: hasData ? (e.bajarildiImzo || session.fullName) : ''
        }
      })
      await upsertReport({
        workerId: session.id, workerName: session.fullName, workerPhone: session.phone || '', stationId, stationName, entries: updatedEntries, month: monthStr, year: String(new Date().getFullYear()), weekLabel: 'Oylik Reja'
      })
      onSubmit()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setFormError(null), 3000)
    } finally { setSubmitting(false) }
  }

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`Oylik Reja - ${stationName}`, 14, 15)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${MONTHS[month]} · ${session.fullName}`, 14, 22)

    const cols = ['№', '4-haftalik jadval', 'Yillik jadval', 'Yangi ishlar', 'KMO bartaraf', "Majburiy o'zgartirish", 'Shn', 'Imzo', 'AD']
    const rows = entries
      .filter(e => e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish)
      .map(e => [
        e.ragat, e.haftalikJadval || '', e.yillikJadval || '',
        e.yangiIshlar || '', e.kmoBartaraf || '', e.majburiyOzgarish || '',
        e.bajarildiShn || '', e.bajarildiImzo || '', e.adImzosi || 'Kutilmoqda'
      ])

    autoTable(doc, {
      head: [cols], body: rows, startY: 28, theme: 'grid',
      styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [8, 23, 40], textColor: [255, 255, 255], fontSize: 5.5, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: { 0: { halign: 'center', cellWidth: 8 } }
    })
    doc.save(`Oylik-Reja_${stationName}_${MONTHS[month]}.pdf`)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Jurnal To'ldirish" subtitle={`${MONTHS[month]} · ${stationName}`} status="yangi" />
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm relative shadow-sm">
        <div className="sm:hidden absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 z-10 rounded-bl-lg font-bold">
          O&apos;ngga suring →
        </div>
        <div className="overflow-x-auto overflow-y-hidden">
          <table style={{ minWidth: "1200px" }} className="w-full border-collapse text-left text-[11px] text-slate-700">
            <thead className="border-b-2 border-sky-500/30 bg-slate-50 font-bold text-slate-600">
              <tr>
                <th rowSpan={2} className="w-10 border-r border-slate-200 p-2 text-center">№</th>
                <th rowSpan={2} className="w-[18%] border-r border-slate-200 p-2 text-center">
                  4-haftalik jadval
                  <br />
                  <span className="text-[9px] font-normal text-slate-400">(oynada tanlash)</span>
                </th>
                <th rowSpan={2} className="w-[18%] border-r border-slate-200 p-2 text-center">
                  Yillik jadval bo&apos;yicha
                  <br />
                  <span className="text-[9px] font-normal text-slate-400">(oynada tanlash)</span>
                </th>
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
              {entries.map((e, i) => (
                <tr key={i} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="border-r border-slate-100 p-1 align-top">
                    <input
                      value={e.ragat}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].ragat = ev.target.value; setEntries(n) }}
                      className={`w-full rounded bg-transparent text-center font-bold text-sky-600 outline-none focus:bg-white ${e.adImzosi ? 'opacity-40' : ''}`}
                    />
                  </td>
                  <td className="relative border-r border-slate-100 p-1 align-top">
                    <textarea
                      value={e.haftalikJadval}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].haftalikJadval = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border bg-slate-50 px-2 py-1.5 text-[11px] outline-none focus:border-sky-500/50 shadow-inner ${e.adImzosi ? 'opacity-60 cursor-not-allowed border-transparent' : 'border-slate-100'}`}
                    />
                    {!e.adImzosi && (
                      <button
                        onClick={() => openSelectModal(i, '4-haftalik')}
                        className="absolute bottom-2 right-2 rounded bg-sky-100 p-1 text-sky-600 shadow-sm transition hover:bg-sky-600 hover:text-white"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    )}
                  </td>
                  <td className="relative border-r border-slate-100 p-1 align-top">
                    <textarea
                      value={e.yillikJadval}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].yillikJadval = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border bg-slate-50 px-2 py-1.5 text-[11px] outline-none focus:border-sky-500/50 shadow-inner ${e.adImzosi ? 'opacity-60 cursor-not-allowed border-transparent' : 'border-slate-100'}`}
                    />
                    {!e.adImzosi && (
                      <button
                        onClick={() => openSelectModal(i, 'yillik')}
                        className="absolute bottom-2 right-2 rounded bg-sky-100 p-1 text-sky-600 shadow-sm transition hover:bg-sky-600 hover:text-white"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    )}
                  </td>
                  <td className="border-r border-slate-100 p-1 align-top">
                    <textarea
                      value={e.yangiIshlar}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].yangiIshlar = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-sky-500/50 ${e.adImzosi ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="border-r border-slate-100 p-1 align-top">
                    <textarea
                      value={e.kmoBartaraf}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].kmoBartaraf = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-sky-500/50 ${e.adImzosi ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="border-r border-slate-100 p-1 align-top">
                    <textarea
                      value={e.majburiyOzgarish}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].majburiyOzgarish = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-sky-500/50 ${e.adImzosi ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="border-r border-slate-100 p-2 text-center align-middle font-medium text-sky-600">
                    {e.bajarildiShn}
                  </td>
                  <td className="border-r border-slate-100 p-2 text-center align-middle italic text-slate-400">
                    {e.bajarildiImzo}
                  </td>
                  <td className="p-2 text-center align-middle">
                    {e.adImzosi ? (
                      <span className="inline-block whitespace-pre-wrap rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600 border border-emerald-100">{e.adImzosi}</span>
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">Kutilmoqda...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200/60 bg-slate-50/50 p-4">
          <button
            onClick={addRow}
            className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-slate-100"
          >
            <Plus size={14} />
            Qator qo&apos;shish
          </button>
          <button
            onClick={removeRow}
            className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-400 backdrop-blur-sm transition hover:border-red-200 hover:text-red-500"
          >
            <X size={14} />
            Qator o&apos;chirish
          </button>
        </div>
      </div>
      {formError && (
        <div className="rounded-2xl border border-red-200/60 bg-red-50/80 p-4 text-center text-sm font-bold text-red-600 backdrop-blur-sm">{formError}</div>
      )}
      <div className="flex gap-4">
        <button onClick={handleDownloadPDF}
          className="rounded-2xl border border-slate-200/60 bg-white/80 px-6 py-5 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition flex items-center gap-2 shadow-sm backdrop-blur-sm">
          <Download size={18} /> PDF
        </button>
        <button onClick={handleSubmit} disabled={submitting} className="btn-gradient flex-1 py-5 font-black uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all">{submitting ? 'Yuborilmoqda...' : 'Yuborish'}</button>
        <button onClick={onCancel} className="rounded-2xl bg-white/80 border border-slate-200/60 px-10 font-bold text-slate-400 hover:text-slate-900 transition shadow-sm backdrop-blur-sm">Bekor qilish</button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center bg-slate-900/40 p-4 pt-[10vh] backdrop-blur-md transition-all">
          <div className="relative flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200/60 px-8 py-5 bg-slate-50/80">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {modalType === '4-haftalik' ? '4-haftalik jadval' : 'Yillik jadval'} — vazifa tanlash
              </h3>
              <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200/60 bg-white p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={20} /></button>
            </div>
            <div className="border-b border-slate-100 px-8 py-4 bg-white">
              <input
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                placeholder="Vazifa qidirish..."
                className="input-premium"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50/30">
              {selectedBolim === null && !modalSearch ? (
                <div className="grid grid-cols-1 gap-3">
                  {(modalType === 'yillik' ? YILLIK_REJA : TORT_HAFTALIK_REJA).map((b, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedBolim(idx)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 p-5 text-left backdrop-blur-sm transition-all hover:border-sky-300 hover:shadow-md hover:bg-sky-50/30 group"
                    >
                      <span className="font-bold text-slate-700 group-hover:text-sky-600 transition-colors uppercase tracking-tight text-sm">{b.bolim}</span>
                      <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 border border-slate-200/60">{b.ishlar.length} ta ish</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedBolim !== null && (
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <button onClick={() => { setSelectedBolim(null); setModalSearch(''); }} className="flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700">
                        <ChevronLeft size={14} /> Ortga ro&apos;yxatga
                      </button>
                      <span className="text-xs font-bold text-sky-600 truncate max-w-[200px] text-right">
                        {(modalType === 'yillik' ? YILLIK_REJA : TORT_HAFTALIK_REJA)[selectedBolim].bolim}
                      </span>
                    </div>
                  )}
                  {(selectedBolim !== null
                    ? (modalType === 'yillik' ? YILLIK_REJA_FLAT : TORT_HAFTALIK_REJA_FLAT).filter(t => t.bolim === (modalType === 'yillik' ? YILLIK_REJA : TORT_HAFTALIK_REJA)[selectedBolim].bolim)
                    : (modalType === 'yillik' ? YILLIK_REJA_FLAT : TORT_HAFTALIK_REJA_FLAT)
                  )
                    .filter((task: ParsedTaskItem) =>
                      task.ish.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      task.davriylik.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      task.bajaruvchi.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      task.manba.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      task.raqam.toLowerCase().includes(modalSearch.toLowerCase())
                    )
                    .map((task: ParsedTaskItem, ti: number) => (
                      <button
                        key={ti}
                        onClick={() => {
                          const n = [...entries]

                          const text =
                            `[${task.manba}${task.raqam ? ` ${task.raqam}` : ''}] ${task.ish}\n` +
                            `Davriyligi: ${task.davriylik}\n` +
                            `Bajaruvchi: ${task.bajaruvchi}`

                          if (modalType === '4-haftalik') {
                            n[modalIdx].haftalikJadval = text
                          } else {
                            n[modalIdx].yillikJadval = text
                          }

                          setEntries(n)
                          setModalOpen(false)
                          setSelectedBolim(null)
                        }}
                        className="w-full rounded-xl border border-slate-200/60 bg-white/80 p-3 text-left backdrop-blur-sm transition-all hover:border-sky-300 hover:shadow-md hover:bg-sky-50/30 group"
                      >
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <p className="text-[10px] text-sky-600">
                            📌 {task.bolim}
                          </p>
                          <p className="text-[10px] text-amber-600/70">
                            📄 {task.manba} {task.raqam}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            🕐 {task.davriylik}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            👤 {task.bajaruvchi}
                          </p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs font-bold text-slate-700 group-hover:text-slate-900">
                          {task.ish}
                        </p>
                        {task.jurnal && (
                          <div className="mt-2 inline-block rounded-md bg-sky-50/80 px-2 py-1 text-[9px] uppercase tracking-widest text-sky-600 border border-sky-100/60">
                            Jurnal: {task.jurnal}
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PremiyaForm({ session, stationId, stationName, month, onSubmit, onCancel }: { session: User, stationId: string, stationName: string, month: number, onSubmit: () => void, onCancel: () => void }) {
  const [entries, setEntries] = useState<PremiyaEntry[]>(Array.from({ length: PREMIYA_ROWS }, () => ({ ish: '', lavozim: '', tabelNomeri: '', foiz: '', eslatma: '' })))
  const [submitting, setSubmitting] = useState(false)
  const [premiyaError, setPremiyaError] = useState<string | null>(null)
  const monthStr = `${new Date().getFullYear()}-${String(month + 1).padStart(2, '0')}`

  useEffect(() => {
    getPremiyasByWorker(session.id).then(reps => {
      const draft = reps.find(r => r.month === monthStr)
      if (draft) setEntries(draft.entries)
    })
  }, [session.id, monthStr])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      if (entries.every(e => !e.ish && !e.lavozim)) {
        throw new Error("Kamida bitta qatorni to'ldiring");
      }
      await upsertPremiyaReport({ workerId: session.id, workerName: session.fullName, stationId, stationName, sex: stationName, month: monthStr, year: String(new Date().getFullYear()), entries })
      onSubmit()
    } catch (err: unknown) {
      setPremiyaError(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setPremiyaError(null), 3000)
    } finally { setSubmitting(false) }
  }

  const addRow = () => setEntries([...entries, { ish: '', lavozim: '', tabelNomeri: '', foiz: '', eslatma: '' }])
  const removeRow = () => {
    if (entries.length <= 1) return
    setEntries(entries.slice(0, -1))
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Premiya To'ldirish" subtitle={`${MONTHS[month]} · ${stationName}`} status="yangi" color="amber" />
      <div className="flex gap-2">
        <button onClick={addRow} className="rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 backdrop-blur-sm transition-all shadow-sm">+ Qator qo'shish</button>
        <button onClick={removeRow} className="rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 hover:border-red-100 backdrop-blur-sm transition-all shadow-sm">- Qator o'chirish</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <table className="w-full text-left text-[11px] min-w-[800px]">
          <thead className="text-[10px] font-black uppercase text-slate-400 bg-slate-50/80">
            <tr><th className="p-4 text-center w-12">№</th><th className="p-4">I.SH.</th><th className="p-4">Lavozimi</th><th className="p-4 text-center">Tabel №</th><th className="p-4 text-center">Rag'bat. %</th><th className="p-4">Eslatma</th></tr>
          </thead>
          <tbody className="bg-white/50">
            {entries.map((e, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                <td className="p-1 text-center text-slate-400 font-bold text-[11px]">{i + 1}</td>
                <td className="p-1"><input value={e.ish} onChange={val => { const n = [...entries]; n[i].ish = val.target.value; setEntries(n) }} className="input-premium" /></td>
                <td className="p-1"><input value={e.lavozim} onChange={val => { const n = [...entries]; n[i].lavozim = val.target.value; setEntries(n) }} className="input-premium" /></td>
                <td className="p-1"><input value={e.tabelNomeri} onChange={val => { const n = [...entries]; n[i].tabelNomeri = val.target.value; setEntries(n) }} className="input-premium text-center" /></td>
                <td className="p-1"><input value={e.foiz} onChange={val => { const n = [...entries]; n[i].foiz = val.target.value; setEntries(n) }} className="input-premium text-center font-black text-amber-600" /></td>
                <td className="p-1"><input value={e.eslatma} onChange={val => { const n = [...entries]; n[i].eslatma = val.target.value; setEntries(n) }} className="input-premium" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {premiyaError && (
        <div className="rounded-2xl border border-red-200/60 bg-red-50/80 p-4 text-center text-sm font-bold text-red-600 backdrop-blur-sm">{premiyaError}</div>
      )}
      <div className="flex gap-4">
        <button onClick={handleSubmit} disabled={submitting} className="btn-gradient flex-1 py-5 font-black uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>{submitting ? 'Yuborilmoqda...' : 'Ro\'yxatni Saqlash'}</button>
        <button onClick={onCancel} className="rounded-2xl bg-white/80 border border-slate-200/60 px-10 font-bold text-slate-400 hover:text-slate-900 backdrop-blur-sm transition-all shadow-sm">Bekor qilish</button>
      </div>
    </div>
  )
}
function WorkerGraphicsView() {
  const [items, setItems] = useState<StationSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    getGlobalGraphics()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  const yillik = items.find(item => item.schemaType === 'yillik_ish_reja_grafiki')
  const haftalik = items.find(item => item.schemaType === 'haftalik_ish_reja_grafiki')

  function GrafikCard({
    title,
    file,
  }: {
    title: string
    file?: StationSchema
  }) {
    return (
      <div className="premium-card group relative overflow-hidden rounded-2xl bg-white/80 p-6 backdrop-blur-sm transition-all hover:border-sky-300 hover:shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition-all group-hover:scale-110 group-hover:bg-white border border-slate-100 shadow-sm">
          <Download size={24} />
        </div>

        <h4 className="font-black text-slate-900 tracking-tight">{title}</h4>
        <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {file ? file.fileName : 'Fayl joylanmagan'}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-2">
          <button
            onClick={() => file && setPreview(file.filePath)}
            disabled={!file}
            className="rounded-xl bg-slate-50/80 border border-slate-100 py-3 text-[10px] font-black uppercase text-slate-500 hover:bg-sky-600 hover:text-white backdrop-blur-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95"
          >
            Ko'rish
          </button>
          <a
            href={file?.filePath || '#'}
            download
            target="_blank"
            rel="noreferrer"
            className={`flex items-center justify-center rounded-xl border border-slate-100 py-3 text-[10px] font-black uppercase backdrop-blur-sm transition-all shadow-sm active:scale-95 ${file ? 'bg-slate-50/80 text-slate-500 hover:bg-slate-900 hover:text-white' : 'pointer-events-none opacity-40 text-slate-300 bg-slate-50/80'
              }`}
          >
            Yuklash
          </a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200/60 bg-white/80 backdrop-blur-sm text-slate-300 font-bold uppercase tracking-widest">
        Yuklanmoqda...
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Grafiklar" subtitle="Umumiy ish reja grafiklari" status="ko'rish" color="blue" />

      <div className="grid gap-4 sm:grid-cols-2">
        <GrafikCard title="Yillik ish reja grafigi" file={yillik} />
        <GrafikCard title="4-haftalik ish reja grafigi" file={haftalik} />
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md transition-all">
          <div className="h-full w-full overflow-hidden rounded-none border border-slate-200/60 bg-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-3 bg-slate-50/80">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Grafik ko'rish</h3>
              <div className="flex items-center gap-3">
                <a
                  href={preview}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-gradient rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  Yuklab olish
                </a>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-xl border border-slate-200/60 bg-white/80 p-2 text-slate-400 hover:text-slate-900 backdrop-blur-sm transition-all shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <iframe src={preview} className="h-[calc(100%-64px)] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}
function WorkerSchemasView({ stationId, stationName }: { stationId: string, stationName: string }) {
  const [schemas, setSchemasState] = useState<StationSchema[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (stationId) getSchemasByStation(stationId).then(setSchemasState)
    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [stationId])

  // Firefox uchun blob URL orqali ko'rsatish
  const handlePreview = async (filePath: string) => {
    try {
      // Agar oldin blob URL bo'lsa, tozalash
      if (blobUrl) URL.revokeObjectURL(blobUrl)

      const response = await fetch(filePath)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      setPreview(url)
    } catch (err) {
      console.error('PDF yuklash xatosi:', err)
      // Fallback: to'g'ridan-to'g'ri URL
      setPreview(filePath)
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Bekat Sxemalari" subtitle={stationName} status="ko'rish" color="blue" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {schemas.map(s => (
          <div key={s.id} className="premium-card group relative overflow-hidden rounded-2xl bg-white/80 p-8 backdrop-blur-sm transition-all hover:border-sky-300 hover:shadow-xl">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition-all group-hover:scale-110 group-hover:bg-white border border-slate-100 shadow-sm"><MapIcon size={28} /></div>
            <h4 className="text-lg font-black text-slate-900 tracking-tight">{s.schemaType}</h4>
            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.fileName}</p>
            <div className="mt-8 flex gap-3">
              <button onClick={() => handlePreview(s.filePath)} className="flex-1 rounded-2xl bg-slate-50/80 border border-slate-200/60 py-4 text-xs font-black uppercase text-slate-600 hover:bg-sky-600 hover:text-white backdrop-blur-sm transition-all active:scale-95 shadow-sm">Ko'rish</button>
              <a href={s.filePath} download className="rounded-2xl bg-slate-50/80 border border-slate-200/60 p-4 text-slate-400 hover:bg-slate-900 hover:text-white backdrop-blur-sm transition-all shadow-sm active:scale-95"><Download size={20} /></a>
            </div>
          </div>
        ))}
        {schemas.length === 0 && <div className="col-span-full py-24 text-center text-slate-300 font-black uppercase tracking-[0.3em] bg-white/80 backdrop-blur-sm rounded-2xl border border-dashed border-slate-200/60">Hali sxemalar yuklanmagan</div>}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md transition-all">
          <div className="h-full w-full overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200/60 px-8 py-4 bg-slate-50/80">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Sxema Ko'rish</h3>
              <button onClick={() => { setPreview(null); if (blobUrl) URL.revokeObjectURL(blobUrl) }} className="rounded-xl border border-slate-200/60 bg-white/80 p-2 text-slate-400 hover:text-slate-900 backdrop-blur-sm transition-all shadow-sm"><X size={24} /></button>
            </div>
            <iframe src={preview} className="h-[calc(100%-80px)] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}