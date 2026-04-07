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
  signOut
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

  const loadWorkReports = useCallback(async (userId: string) => {
    try {
      const r = await getReportsByWorker(userId)
      setReports(r)
    } catch(e) { console.error('Error fetching work reports', e) }
  }, [])

  const loadPremiyaReports = useCallback(async (userId: string) => {
    try {
      const p = await getPremiyasByWorker(userId)
      setPremiyaReports(p)
    } catch(e) { console.error('Error fetching premiya reports', e) }
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

  if (!session) return <div className="flex min-h-screen items-center justify-center bg-[#06111f]"><div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500" /></div>

  const station = activeStationId ? getStation(activeStationId) : null
  const stationName = station?.name || '...'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06111f] text-white selection:bg-cyan-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.1),_transparent_40%),linear-gradient(135deg,_#06111f_0%,_#08172a_45%,_#020817_100%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06111f]/60 backdrop-blur-2xl print:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              {view !== 'home' && view !== 'selectStation' && (
                <button onClick={() => setView('home')} className="rounded-xl bg-white/5 p-2 text-white/40 hover:text-white"><ChevronLeft size={20} /></button>
              )}
              <div className="flex h-10 w-10 items-center justify-center"><img src="/uty-logo.png" alt="UTY" className="h-10 w-10 object-contain filter drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]" /></div>
              <div className="min-w-0">
                <h1 className="text-sm font-black uppercase truncate">{stationName}</h1>
                <p className="text-[10px] font-bold text-white/30 truncate uppercase tracking-widest">{session?.fullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(session?.stationIds?.length || 0) > 1 && view !== 'selectStation' && (
                <button onClick={() => setView('selectStation')} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 text-[10px] font-black text-cyan-400 uppercase tracking-widest">Bekatlar</button>
              )}
              <button onClick={async () => { await signOut(); router.push('/') }} className="rounded-xl bg-red-500/5 p-2 text-red-400/60 hover:text-red-400"><LogOut size={20} /></button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 pb-24">
          {view === 'selectStation' && (
            <div className="grid gap-4 sm:grid-cols-2 pt-10">
              {session?.stationIds?.map(sid => (
                <button key={sid} onClick={() => { setActiveStationId(sid); setView('home') }} className="group flex flex-col items-center p-10 rounded-[32px] border border-white/5 bg-white/3 backdrop-blur-xl transition hover:border-cyan-500/30 hover:scale-[1.02]">
                  <div className="mb-4 text-4xl group-hover:scale-110 transition-transform">📍</div>
                  <span className="text-xl font-black">{getStation(sid)?.name}</span>
                </button>
              ))}
            </div>
          )}

          {view === 'home' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Profile Card */}
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/5 p-8 shadow-2xl">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
                <h2 className="text-3xl font-black text-white">{session?.fullName}</h2>
                <p className="mt-1 text-sm font-bold text-cyan-400/60 uppercase tracking-widest">{session?.role === 'bekat_boshlighi' ? "Bekat Boshlig'i" : "Katta Elektromexanik"}</p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/5 p-4"><p className="text-[10px] font-black uppercase text-white/30">Hisobotlar</p><p className="text-2xl font-black">{reports.length}</p></div>
                  <div className="rounded-2xl bg-white/5 p-4"><p className="text-[10px] font-black uppercase text-white/30">Tasdiqlangan</p><p className="text-2xl font-black text-emerald-400">{reports.filter(r => r.confirmedAt).length}</p></div>
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
                  desc="DU-46 va ShU-2 jurnallarini to'ldirish."
                  icon={<BookOpen size={32} />}
                  color="cyan"
                  onClick={() => setView('journalSelect')}
                />
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-white/20">So'nggi harakatlar</h3>
                <div className="space-y-3">
                  {([...reports, ...premiyaReports] as (WorkReport | PremiyaReport)[]).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).slice(0, 5).map((r) => {
                    const isWorkReport = (item: WorkReport | PremiyaReport): item is WorkReport => 'weekLabel' in item;
                    return (
                      <div key={r.id} onClick={() => {
                        if (isWorkReport(r)) { setSelectedReport(r); setView('viewReport') }
                        else { setSelectedPremiya(r as PremiyaReport); setView('viewPremiya') }
                      }} className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/5 bg-white/3 p-4 hover:bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/30">{isWorkReport(r) ? <FileText size={20} /> : <Award size={20} />}</div>
                          <div><p className="text-sm font-black">{r.month}</p><p className="text-[10px] text-white/30 uppercase">{isWorkReport(r) ? 'Oylik Hisobot' : 'Premiya'}</p></div>
                        </div>
                        <div className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${r.confirmedAt ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{r.confirmedAt ? 'TASDIQLANDI' : 'KUTILMOQDA'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {view === 'selectMonth' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 animate-in fade-in zoom-in-95 duration-300">
              {MONTHS.map((m, i) => {
                const isCurrent = i === new Date().getMonth()
                return (
                  <button key={m} onClick={() => { setSelectedMonth(i); setView('selectPlanType') }} className={`group flex flex-col p-6 rounded-3xl border transition-all ${isCurrent ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/5 bg-white/3 hover:bg-white/5'}`}>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{String(i + 1).padStart(2, '0')}</span>
                    <span className="mt-4 text-lg font-black group-hover:text-cyan-400 transition-colors">{m}</span>
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
            <div className="animate-in fade-in duration-500">
              <HeaderCard title="Hisobot Ko'rinishi" subtitle={`${selectedReport.month} · ${stationName}`} status={selectedReport.confirmedAt ? 'tasdiqlandi' : 'kutilmoqda'} />
              <div className="mt-6 mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 relative">
                <div className="sm:hidden absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 z-10 rounded-bl-lg font-bold">
                  O&apos;ngga suring →
                </div>
                <div className="overflow-x-auto overflow-y-hidden">
                  <table style={{ minWidth: "1200px" }} className="w-full border-collapse text-left text-[11px] text-white/80">
                    <thead className="border-b-2 border-cyan-500/50 bg-gradient-to-b from-[#0b1728] to-[#0b1728] font-bold text-white/70">
                      <tr>
                        <th rowSpan={2} className="w-10 border-r border-white/10 p-2 text-center">№</th>
                        <th rowSpan={2} className="w-[18%] border-r border-white/10 p-2 text-center">4-haftalik jadval</th>
                        <th rowSpan={2} className="w-[18%] border-r border-white/10 p-2 text-center">Yillik jadval bo&apos;yicha</th>
                        <th rowSpan={2} className="w-[14%] border-r border-white/10 p-2">Yangi ishlar ro&apos;yxati</th>
                        <th rowSpan={2} className="w-[14%] border-r border-white/10 p-2">O&apos;tkazilgan KMO va bartaraf etilgan kamchiliklar</th>
                        <th rowSpan={2} className="w-[13%] border-r border-white/10 p-2">Rejaga kiritilgan majburiy o&apos;zgartirishlar</th>
                        <th colSpan={2} className="border-r border-white/10 bg-[#0b1728] p-2 text-center">Bajarilgan ishlar</th>
                        <th rowSpan={2} className="w-[8%] bg-amber-500/10 p-2 text-center">AD imzosi</th>
                      </tr>
                      <tr className="bg-[#0b1728]/30">
                        <th className="border-r border-t border-white/10 p-2 text-center font-bold text-cyan-300">Shn</th>
                        <th className="border-r border-t border-white/10 p-2 text-center font-bold text-cyan-300">Imzo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.entries.map((e, idx) => (
                        <tr key={idx} className="group border-b border-white/10 hover:bg-[#0b1728]">
                          <td className="border-r border-white/10 p-2 text-center font-bold text-cyan-400/50">{e.ragat}</td>
                          <td className="border-r border-white/10 p-3 align-top whitespace-pre-wrap">{e.haftalikJadval || '—'}</td>
                          <td className="border-r border-white/10 p-3 align-top whitespace-pre-wrap">{e.yillikJadval || '—'}</td>
                          <td className="border-r border-white/10 p-3 align-top whitespace-pre-wrap">{e.yangiIshlar || '—'}</td>
                          <td className="border-r border-white/10 p-3 align-top whitespace-pre-wrap">{e.kmoBartaraf || '—'}</td>
                          <td className="border-r border-white/10 p-3 align-top whitespace-pre-wrap">{e.majburiyOzgarish || '—'}</td>
                          <td className="border-r border-white/10 p-2 text-center align-middle font-medium text-cyan-300">{e.bajarildiShn}</td>
                          <td className="border-r border-white/10 p-2 text-center align-middle italic text-cyan-300/80">{e.bajarildiImzo}</td>
                          <td className="p-2 text-center align-middle">
                            {e.adImzosi ? (
                              <span className="inline-block whitespace-pre-wrap rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">{e.adImzosi}</span>
                            ) : (
                              <span className="text-[10px] text-white/40">Kutilmoqda...</span>
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
            <div className="animate-in fade-in duration-500">
              <HeaderCard title="Premiya Ro'yxati" subtitle={`${selectedPremiya.month} · ${stationName}`} status={selectedPremiya.confirmedAt ? 'tasdiqlandi' : 'kutilmoqda'} color="amber" />
              <div className="mt-8 overflow-x-auto rounded-[32px] border border-white/5 bg-white/3 backdrop-blur-xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
                    <tr><th className="p-4 text-center w-12">№</th><th className="p-4">I.SH.</th><th className="p-4">Lavozimi</th><th className="p-4 text-center">Tabel №</th><th className="p-4 text-center">Rag'bat. %</th><th className="p-4">Eslatma</th></tr>
                  </thead>
                  <tbody className="text-white/80">
                    {selectedPremiya.entries.map((e, idx) => (
                      <tr key={idx} className="border-b border-white/2 last:border-0"><td className="p-4 text-center text-white/30 font-bold">{idx + 1}</td><td className="p-4 font-bold">{e.ish}</td><td className="p-4 text-white/40">{e.lavozim}</td><td className="p-4 text-center text-white/50">{e.tabelNomeri}</td><td className="p-4 text-center font-black text-amber-400">{e.foiz}%</td><td className="p-4 text-white/40">{e.eslatma}</td></tr>
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
                  className="w-full sm:w-auto rounded-[24px] bg-white/5 border border-white/10 px-8 py-4 font-bold text-white hover:bg-white/10 transition flex items-center justify-center gap-2"
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

function BigActionCard({ title, desc, icon, onClick, color = 'cyan' }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void, color?: 'cyan' | 'amber' | 'blue' }) {
  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-500/20 shadow-cyan-500/5 hover:border-cyan-500/30 text-cyan-400',
    amber: 'from-amber-500/20 shadow-amber-500/5 hover:border-amber-500/30 text-amber-400',
    blue: 'from-blue-500/20 shadow-blue-500/5 hover:border-blue-500/30 text-blue-400',
  }
  return (
    <button onClick={onClick} className={`group flex flex-col items-start p-8 rounded-[32px] border border-white/5 bg-gradient-to-br to-transparent transition-all hover:scale-[1.02] active:scale-[0.98] text-left ${colorMap[color]}`}>
      <div className="rounded-2xl bg-white/5 p-4 mb-6 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/40 leading-relaxed">{desc}</p>
    </button>
  )
}

function HeaderCard({ title, subtitle, status, color = 'cyan' }: { title: string, subtitle: string, status: string, color?: string }) {
  const statusColors: Record<string, string> = {
    tasdiqlandi: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    kutilmoqda: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    yangi: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    "ko'rish": 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }
  return (
    <div className="flex items-center justify-between rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="text-sm font-bold text-white/30 uppercase tracking-widest">{subtitle}</p>
      </div>
      <div className={`rounded-xl border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${statusColors[status]}`}>{status}</div>
    </div>
  )
}

function JournalForm({ session, stationId, stationName, month, onSubmit, onCancel }: { session: User, stationId: string, stationName: string, month: number, onSubmit: () => void, onCancel: () => void }) {
  const [entries, setEntries] = useState<ReportEntry[]>(Array.from({ length: TOTAL_ROWS }, (_, i) => ({
    ragat: String(i + 1), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: session.fullName, bajarildiImzo: session.fullName, adImzosi: ''
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
      ragat: String(entries.length + 1), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: session.fullName, bajarildiImzo: session.fullName, adImzosi: ''
    }])
  }
  const removeRow = () => {
    if (entries.length > 1) setEntries(entries.slice(0, -1))
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
      await upsertReport({
        workerId: session.id, workerName: session.fullName, workerPhone: session.phone || '', stationId, stationName, entries, month: monthStr, year: String(new Date().getFullYear()), weekLabel: 'Oylik Reja'
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
    <div className="space-y-6">
      <HeaderCard title="Jurnal To'ldirish" subtitle={`${MONTHS[month]} · ${stationName}`} status="yangi" />
      <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 relative">
        <div className="sm:hidden absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 z-10 rounded-bl-lg font-bold">
          O&apos;ngga suring →
        </div>
        <div className="overflow-x-auto overflow-y-hidden">
          <table style={{ minWidth: "1200px" }} className="w-full border-collapse text-left text-[11px] text-white/80">
            <thead className="border-b-2 border-cyan-500/50 bg-gradient-to-b from-[#0b1728] to-[#0b1728] font-bold text-white/70">
              <tr>
                <th rowSpan={2} className="w-10 border-r border-white/10 p-2 text-center">№</th>
                <th rowSpan={2} className="w-[18%] border-r border-white/10 p-2 text-center">
                  4-haftalik jadval
                  <br />
                  <span className="text-[9px] font-normal text-white/40">(oynada tanlash)</span>
                </th>
                <th rowSpan={2} className="w-[18%] border-r border-white/10 p-2 text-center">
                  Yillik jadval bo&apos;yicha
                  <br />
                  <span className="text-[9px] font-normal text-white/40">(oynada tanlash)</span>
                </th>
                <th rowSpan={2} className="w-[14%] border-r border-white/10 p-2">Yangi ishlar ro&apos;yxati</th>
                <th rowSpan={2} className="w-[14%] border-r border-white/10 p-2">O&apos;tkazilgan KMO va bartaraf etilgan kamchiliklar</th>
                <th rowSpan={2} className="w-[13%] border-r border-white/10 p-2">Rejaga kiritilgan majburiy o&apos;zgartirishlar</th>
                <th colSpan={2} className="border-r border-white/10 bg-[#0b1728] p-2 text-center">Bajarilgan ishlar</th>
                <th rowSpan={2} className="w-[8%] bg-amber-500/10 p-2 text-center">AD imzosi</th>
              </tr>
              <tr className="bg-[#0b1728]/30">
                <th className="border-r border-t border-white/10 p-2 text-center font-bold text-cyan-300">Shn</th>
                <th className="border-r border-t border-white/10 p-2 text-center font-bold text-cyan-300">Imzo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="group border-b border-white/10 hover:bg-[#0b1728]">
                  <td className="border-r border-white/10 p-1 align-top">
                    <input
                      value={e.ragat}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].ragat = ev.target.value; setEntries(n) }}
                      className={`w-full rounded bg-transparent text-center font-bold text-cyan-400 outline-none focus:bg-[#0b1728] ${e.adImzosi ? 'opacity-40' : ''}`}
                    />
                  </td>
                  <td className="relative border-r border-white/10 p-1 align-top">
                    <textarea
                      value={e.haftalikJadval}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].haftalikJadval = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border bg-[#0b1728]/50 px-2 py-1.5 text-[11px] outline-none focus:border-cyan-500/50 ${e.adImzosi ? 'opacity-60 cursor-not-allowed border-transparent' : 'border-white/10'}`}
                    />
                    {!e.adImzosi && (
                      <button
                        onClick={() => openSelectModal(i, '4-haftalik')}
                        className="absolute bottom-2 right-2 rounded bg-cyan-500/10 p-1 text-cyan-400 shadow-sm transition hover:bg-cyan-600 hover:text-white"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    )}
                  </td>
                  <td className="relative border-r border-white/10 p-1 align-top">
                    <textarea
                      value={e.yillikJadval}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].yillikJadval = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border bg-[#0b1728]/50 px-2 py-1.5 text-[11px] outline-none focus:border-cyan-500/50 ${e.adImzosi ? 'opacity-60 cursor-not-allowed border-transparent' : 'border-white/10'}`}
                    />
                    {!e.adImzosi && (
                      <button
                        onClick={() => openSelectModal(i, 'yillik')}
                        className="absolute bottom-2 right-2 rounded bg-cyan-500/10 p-1 text-cyan-400 shadow-sm transition hover:bg-cyan-600 hover:text-white"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    )}
                  </td>
                  <td className="border-r border-white/10 p-1 align-top">
                    <textarea
                      value={e.yangiIshlar}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].yangiIshlar = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-cyan-500/50 ${e.adImzosi ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="border-r border-white/10 p-1 align-top">
                    <textarea
                      value={e.kmoBartaraf}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].kmoBartaraf = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-cyan-500/50 ${e.adImzosi ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="border-r border-white/10 p-1 align-top">
                    <textarea
                      value={e.majburiyOzgarish}
                      readOnly={!!e.adImzosi}
                      onChange={(ev) => { const n = [...entries]; n[i].majburiyOzgarish = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-cyan-500/50 ${e.adImzosi ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="border-r border-white/10 p-2 text-center align-middle font-medium text-cyan-300">
                    {e.bajarildiShn}
                  </td>
                  <td className="border-r border-white/10 p-2 text-center align-middle italic text-cyan-300/80">
                    {e.bajarildiImzo}
                  </td>
                  <td className="p-2 text-center align-middle">
                    {e.adImzosi ? (
                      <span className="inline-block whitespace-pre-wrap rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">{e.adImzosi}</span>
                    ) : (
                      <span className="text-[10px] text-white/40">Kutilmoqda...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 border-t border-white/10 bg-[#0b1728]/50 p-4">
          <button
            onClick={addRow}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 shadow-sm transition hover:bg-[#0b1728]/50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            Qator qo&apos;shish
          </button>
          <button
            onClick={removeRow}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/50 transition hover:border-red-500/20 hover:text-red-400"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
            Qator o&apos;chirish
          </button>
        </div>
      </div>
      {formError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-bold text-red-400">{formError}</div>
      )}
      <div className="flex gap-4">
        <button onClick={handleDownloadPDF}
          className="rounded-[24px] border border-white/10 bg-white/5 px-6 py-5 font-bold text-white/60 hover:bg-white/10 hover:text-white transition flex items-center gap-2">
          <Download size={18} /> PDF
        </button>
        <button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-[24px] bg-cyan-500 py-5 font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 active:scale-95 disabled:opacity-50">{submitting ? 'Yuborilmoqda...' : 'Yuborish'}</button>
        <button onClick={onCancel} className="rounded-[24px] bg-white/5 px-10 font-bold text-white/40 hover:text-white">Bekor qilish</button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#06111f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-black text-white">
                {modalType === '4-haftalik' ? '4-haftalik jadval' : 'Yillik jadval'} — vazifa tanlash
              </h3>
              <button onClick={() => setModalOpen(false)} className="rounded-xl border border-white/10 p-2 text-white/40 hover:text-white"><X size={20} /></button>
            </div>
            <div className="border-b border-white/10 px-6 py-3">
              <input
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                placeholder="Vazifa qidirish..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-cyan-500/50"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {selectedBolim === null && !modalSearch ? (
                <div className="grid grid-cols-1 gap-2">
                  {(modalType === 'yillik' ? YILLIK_REJA : TORT_HAFTALIK_REJA).map((b, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedBolim(idx)}
                      className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/3 p-4 text-left transition hover:border-cyan-500/30 hover:bg-cyan-500/5 group"
                    >
                      <span className="font-bold text-white/90 group-hover:text-cyan-400">{b.bolim}</span>
                      <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] uppercase text-white/40">{b.ishlar.length} ta ish</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedBolim !== null && (
                    <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                      <button onClick={() => { setSelectedBolim(null); setModalSearch(''); }} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-white/50 transition hover:bg-white/10 hover:text-white">
                        <ChevronLeft size={14} /> Ortga ro&apos;yxatga
                      </button>
                      <span className="text-xs font-bold text-cyan-400 truncate max-w-[200px] text-right">
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
                        className="w-full rounded-xl border border-white/5 bg-white/3 p-3 text-left transition-all hover:border-cyan-500/30 hover:bg-cyan-500/5 group"
                      >
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <p className="text-[10px] text-cyan-400">
                            📌 {task.bolim}
                          </p>
                          <p className="text-[10px] text-amber-400/70">
                            📄 {task.manba} {task.raqam}
                          </p>
                          <p className="text-[10px] text-white/30">
                            🕐 {task.davriylik}
                          </p>
                          <p className="text-[10px] text-white/30">
                            👤 {task.bajaruvchi}
                          </p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs font-bold text-white/80 group-hover:text-white">
                          {task.ish}
                        </p>
                        {task.jurnal && (
                          <div className="mt-2 inline-block rounded-md bg-white/5 px-2 py-1 text-[9px] uppercase tracking-widest text-cyan-400/70">
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
    const last = entries[entries.length - 1]
    if (last.ish || last.lavozim || last.foiz || last.tabelNomeri || last.eslatma) return
    setEntries(entries.slice(0, -1))
  }

  return (
    <div className="space-y-6">
      <HeaderCard title="Premiya To'ldirish" subtitle={`${MONTHS[month]} · ${stationName}`} status="yangi" color="amber" />
      <div className="flex gap-2">
        <button onClick={addRow} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors">+ Qator qo'shish</button>
        <button onClick={removeRow} disabled={entries.length <= 1 || !!(entries[entries.length - 1].ish || entries[entries.length - 1].lavozim || entries[entries.length - 1].foiz || entries[entries.length - 1].tabelNomeri || entries[entries.length - 1].eslatma)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">- Oxirgi qatorni o'chirish</button>
      </div>
      <div className="overflow-x-auto rounded-[32px] border border-white/10 bg-white/5 p-4">
        <table className="w-full text-left text-[11px] min-w-[800px]">
          <thead className="text-[10px] font-black uppercase text-white/20">
            <tr><th className="p-4 text-center w-12">№</th><th className="p-4">I.SH.</th><th className="p-4">Lavozimi</th><th className="p-4 text-center">Tabel №</th><th className="p-4 text-center">Rag'bat. %</th><th className="p-4">Eslatma</th></tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className="border-b border-white/5 last:border-0">
                <td className="p-1 text-center text-white/30 font-bold text-[11px]">{i + 1}</td>
                <td className="p-1"><input value={e.ish} onChange={val => { const n = [...entries]; n[i].ish = val.target.value; setEntries(n) }} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-amber-500/30 outline-none" /></td>
                <td className="p-1"><input value={e.lavozim} onChange={val => { const n = [...entries]; n[i].lavozim = val.target.value; setEntries(n) }} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-amber-500/30 outline-none" /></td>
                <td className="p-1"><input value={e.tabelNomeri} onChange={val => { const n = [...entries]; n[i].tabelNomeri = val.target.value; setEntries(n) }} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-center text-white focus:border-amber-500/30 outline-none" /></td>
                <td className="p-1"><input value={e.foiz} onChange={val => { const n = [...entries]; n[i].foiz = val.target.value; setEntries(n) }} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-center font-black text-amber-400 focus:border-amber-500/30 outline-none" /></td>
                <td className="p-1"><input value={e.eslatma} onChange={val => { const n = [...entries]; n[i].eslatma = val.target.value; setEntries(n) }} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/60 focus:border-amber-500/30 outline-none" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {premiyaError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-bold text-red-400">{premiyaError}</div>
      )}
      <div className="flex gap-4">
        <button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-[24px] bg-amber-500 py-5 font-black uppercase tracking-widest text-slate-900 shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50">{submitting ? 'Yuborilmoqda...' : 'Ro\'yxatni Saqlash'}</button>
        <button onClick={onCancel} className="rounded-[24px] bg-white/5 px-10 font-bold text-white/40 hover:text-white">Bekor qilish</button>
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
      <div className="group relative overflow-hidden rounded-[28px] border border-white/5 bg-white/3 p-6 transition-all hover:border-blue-500/30 hover:bg-white/5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
          <Download size={24} />
        </div>

        <h4 className="font-black text-white">{title}</h4>
        <p className="mt-1 text-[10px] font-bold text-white/20 uppercase tracking-widest">
          {file ? file.fileName : 'Fayl joylanmagan'}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-2">
          <button
            onClick={() => file && setPreview(file.filePath)}
            disabled={!file}
            className="rounded-xl bg-white/5 py-3 text-[10px] font-black uppercase text-white/60 hover:bg-blue-500 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Ko‘rish
          </button>
          <a
            href={file?.filePath || '#'}
            download
            target="_blank"
            rel="noreferrer"
            className={`flex items-center justify-center rounded-xl bg-white/5 py-3 text-[10px] font-black uppercase transition-all ${file ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'pointer-events-none opacity-40 text-white/30'
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
      <div className="flex h-64 items-center justify-center rounded-[32px] border border-white/5 bg-white/5 text-white/30">
        Yuklanmoqda...
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <HeaderCard title="Grafiklar" subtitle="Umumiy ish reja grafiklari" status="ko'rish" color="blue" />

      <div className="grid gap-4 sm:grid-cols-2">
        <GrafikCard title="Yillik ish reja grafigi" file={yillik} />
        <GrafikCard title="4-haftalik ish reja grafigi" file={haftalik} />
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="h-full w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#06111f]">
            <div className="flex items-center justify-between border-b border-white/10 px-8 py-4">
              <h3 className="text-lg font-black text-white">Grafik ko‘rish</h3>
              <div className="flex items-center gap-3">
                <a
                  href={preview}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
                >
                  Yuklab olish
                </a>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-xl border border-white/10 p-2 text-white/40 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <iframe src={preview} className="h-[calc(100%-80px)] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}
function WorkerSchemasView({ stationId, stationName }: { stationId: string, stationName: string }) {
  const [schemas, setSchemasState] = useState<StationSchema[]>([])
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (stationId) getSchemasByStation(stationId).then(setSchemasState)
  }, [stationId])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <HeaderCard title="Bekat Sxemalari" subtitle={stationName} status="ko'rish" color="blue" />
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {schemas.map(s => (
          <div key={s.id} className="group relative overflow-hidden rounded-[28px] border border-white/5 bg-white/3 p-6 transition-all hover:border-blue-500/30 hover:bg-white/5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform"><MapIcon size={24} /></div>
            <h4 className="font-black text-white">{s.schemaType}</h4>
            <p className="mt-1 text-[10px] font-bold text-white/20 uppercase tracking-widest">{s.fileName}</p>
            <div className="mt-8 flex gap-2">
              <button onClick={() => setPreview(s.filePath)} className="flex-1 rounded-xl bg-white/5 py-3 text-[10px] font-black uppercase text-white/60 hover:bg-blue-500 hover:text-white transition-all">Ko'rish</button>
              <a href={s.filePath} download className="rounded-xl bg-white/5 p-3 text-white/40 hover:text-white"><Download size={16} /></a>
            </div>
          </div>
        ))}
        {schemas.length === 0 && <div className="col-span-full py-20 text-center text-white/20 font-black uppercase tracking-[0.3em]">Hali sxemalar yuklanmagan</div>}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="h-full w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#06111f]">
            <div className="flex items-center justify-between border-b border-white/10 px-8 py-4">
              <h3 className="text-lg font-black text-white">Sxema Ko'rish</h3>
              <button onClick={() => setPreview(null)} className="rounded-xl border border-white/10 p-2 text-white/40 hover:text-white"><X size={24} /></button>
            </div>
            <iframe src={preview} className="h-[calc(100%-80px)] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}