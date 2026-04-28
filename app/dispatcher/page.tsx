'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  getStations,
} from '@/lib/store'
import {
  getCurrentSession,
  getWorkers,
  addWorker,
  updateWorker,
  deleteWorker,
  getAllReports,
  getPremiyaReports,
  confirmReport,
  confirmReportEntry,
  confirmPremiyaReport,
  getSchemasByStation,
  uploadSchemaFile,
  deleteSchema,
  getGlobalGraphics,
  uploadGlobalGraphicFile,
  deleteGlobalGraphicFile,
  getAllJournals,
  signOut
} from '@/lib/supabase-db'
import type { User, WorkReport, PremiyaReport, StationSchema, JournalType, ReportEntry, StationJournal, DU46Entry, SHU2Entry } from '@/types'
import { MONTHS } from '@/lib/constants'
import { JournalSelectModal, JournalMonthSelectModal, DU46JournalView, SHU2JournalView } from '@/components/JournalView'
import {
  LogOut,
  Plus,
  Users,
  MapPin,
  FileText,
  Award,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Clock,
  X,
  Edit,
  Trash2,
  Download,
  Eye,
  Menu,
  BookOpen,
  Map as MapIcon,
  AlertTriangle
} from 'lucide-react'

type Tab = 'bekatlar' | 'arxiv' | 'grafiklar'

interface WorkerEditData {
  fullName: string
  login: string
  password?: string
  phone: string
  role: 'worker' | 'bekat_boshlighi'
  stationIds: string[]
}

export default function DispatcherPage() {
  const router = useRouter()
  const [session, setSessionState] = useState<User | null>(null)
  const [tab, setTab] = useState<Tab>('bekatlar')

  // Real data from Supabase
  const [workers, setWorkers] = useState<User[]>([])
  const [allReports, setAllReports] = useState<WorkReport[]>([])
  const [allPremiyaReports, setAllPremiyaReports] = useState<PremiyaReport[]>([])
  const [globalGraphics, setGlobalGraphics] = useState<StationSchema[]>([])
  const [allJournals, setAllJournals] = useState<StationJournal[]>([])

  const [loading, setLoading] = useState(true)
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [selectedReportType, setSelectedReportType] = useState<'oylik' | 'premiya' | 'sxemalar' | 'jurnallar' | null>(null)
  const [showMobileStations, setShowMobileStations] = useState(false)
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [showWorkersModal, setShowWorkersModal] = useState(false)
  const [activeJournalType, setActiveJournalType] = useState<JournalType | null>(null)
  const [activeJournalMonth, setActiveJournalMonth] = useState<string>('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [todayModal, setTodayModal] = useState<'bajarilgan' | 'bajarilmagan' | null>(null)

  const [form, setForm] = useState({
    fullName: '',
    login: '',
    password: '',
    phone: '',
    role: 'worker' as 'worker' | 'bekat_boshlighi',
    stationIds: [] as string[],
  })
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null)
  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const stations = getStations()

  const loadWorkers = useCallback(async () => {
    try {
      const w = await getWorkers()
      setWorkers(w.filter(user => user.role !== 'dispatcher'))
    } catch (e) { console.error('Error fetching workers', e) }
  }, [])

  const loadWorkReports = useCallback(async () => {
    try {
      const r = await getAllReports()
      setAllReports(r)
    } catch (e) { console.error('Error fetching work reports', e) }
  }, [])

  const loadPremiyaReports = useCallback(async () => {
    try {
      const p = await getPremiyaReports()
      setAllPremiyaReports(p)
    } catch (e) { console.error('Error fetching premiya reports', e) }
  }, [])

  const loadGraphics = useCallback(async () => {
    try {
      const g = await getGlobalGraphics()
      setGlobalGraphics(g)
    } catch (e) { console.error('Error fetching graphics', e) }
  }, [])

  const loadJournals = useCallback(async () => {
    try {
      const j = await getAllJournals()
      setAllJournals(j)
    } catch (e) { console.error('Error fetching journals', e) }
  }, [])

  const refreshData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      loadWorkers(),
      loadWorkReports(),
      loadPremiyaReports(),
      loadGraphics(),
      loadJournals()
    ])
    setLoading(false)
  }, [loadWorkers, loadWorkReports, loadPremiyaReports, loadGraphics, loadJournals])

  useEffect(() => {
    async function init() {
      const u = await getCurrentSession()   // Supabase bilan tekshiradi
      if (!u || u.role !== 'dispatcher') {
        router.replace('/')
        return
      }
      setSessionState(u)
      refreshData() // background process, removes TTI block
    }
    init()
  }, [router, refreshData])

  useEffect(() => {
    // ─── Realtime Subscriptions ───────────────
    const workReportsChannel = supabase
      .channel('dispatcher_work_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_reports' }, () => {
        console.log('🚀 Realtime: Yangi hisobot!')
        loadWorkReports()
      })
      .subscribe((status) => {
        console.log('📡 work_reports kanal:', status)
      })

    const premiyaReportsChannel = supabase
      .channel('dispatcher_premiya_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'premiya_reports' }, () => {
        console.log('🚀 Realtime: Yangi premiya!')
        loadPremiyaReports()
      })
      .subscribe((status) => {
        console.log('📡 premiya_reports kanal:', status)
      })

    const journalsChannel = supabase
      .channel('dispatcher_journals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'station_journals' }, (payload) => {
        console.log('🚀 Realtime: Jurnal yangilandi!', payload.eventType)
        loadJournals()
      })
      .subscribe((status) => {
        console.log('📡 station_journals kanal:', status)
      })

    return () => {
      supabase.removeChannel(workReportsChannel)
      supabase.removeChannel(premiyaReportsChannel)
      supabase.removeChannel(journalsChannel)
    }
  }, [loadWorkReports, loadPremiyaReports, loadJournals])

  // Calculated pending counts
  const pendingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allReports.forEach(r => {
      const isPending = !r.confirmedAt && r.entries.some(e =>
        (e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish) && !e.adImzosi
      )
      if (isPending) {
        counts[r.stationId] = (counts[r.stationId] || 0) + 1
      }
    })
    return counts
  }, [allReports])

  const premiyaPendingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allPremiyaReports.forEach(r => {
      if (!r.confirmedAt) {
        counts[r.stationId] = (counts[r.stationId] || 0) + 1
      }
    })
    return counts
  }, [allPremiyaReports])

  // Jurnal pending hisobi: yuborilgan lekin qabul qilinmagan qatorlar (DU-46 va SHU-2 alohida)
  const du46PendingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allJournals.filter(j => j.journalType === 'du46').forEach(j => {
      const entries = j.entries as DU46Entry[]
      const pendingCount = entries.filter(e => e.yuborildi && !e.dispetcherQabulQildi).length
      if (pendingCount > 0) {
        counts[j.stationId] = (counts[j.stationId] || 0) + pendingCount
      }
    })
    return counts
  }, [allJournals])

  const shu2PendingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allJournals.filter(j => j.journalType === 'shu2').forEach(j => {
      const entries = j.entries as SHU2Entry[]
      const pendingCount = entries.filter(e => e.yuborildi && !e.dispetcherQabulQildi).length
      if (pendingCount > 0) {
        counts[j.stationId] = (counts[j.stationId] || 0) + pendingCount
      }
    })
    return counts
  }, [allJournals])

  const journalPendingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.keys(du46PendingCounts).forEach(sid => {
      counts[sid] = (counts[sid] || 0) + (du46PendingCounts[sid] || 0)
    })
    Object.keys(shu2PendingCounts).forEach(sid => {
      counts[sid] = (counts[sid] || 0) + (shu2PendingCounts[sid] || 0)
    })
    return counts
  }, [du46PendingCounts, shu2PendingCounts])

  const totalPending = useMemo(() => {
    return Object.values(pendingCounts).reduce((a, b) => a + b, 0) +
      Object.values(premiyaPendingCounts).reduce((a, b) => a + b, 0) +
      Object.values(journalPendingCounts).reduce((a, b) => a + b, 0)
  }, [pendingCounts, premiyaPendingCounts, journalPendingCounts])

  // ─── BUGUNGI KUNLIK BAJARILGAN / BAJARILMAGAN ISHLAR ───────────────
  const todayStr = String(new Date().getDate())
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const todayTasks = useMemo(() => {
    const result: {
      stationId: string
      stationName: string
      workerName: string
      entry: ReportEntry
      bajarilgan: boolean
      month: string
    }[] = []

    allReports
      .filter(r => r.month === currentMonthStr)
      .forEach(r => {
        r.entries.forEach(e => {
          const hasContent = e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish
          const taskDay = parseInt(e.ragat.trim(), 10)
          const todayDay = parseInt(todayStr, 10)
          const isPastOrToday = !isNaN(taskDay) && taskDay <= todayDay
          const bajarilgan = !!(e.bajarildiShn && e.bajarildiImzo)

          if (hasContent && isPastOrToday) {
            if (taskDay === todayDay || !bajarilgan) {
              result.push({
                stationId: r.stationId,
                stationName: r.stationName,
                workerName: r.workerName,
                entry: e,
                bajarilgan,
                month: r.month,
              })
            }
          }
        })
      })

    return result
  }, [allReports, todayStr, currentMonthStr])

  const todayBajarilgan = todayTasks.filter(t => t.bajarilgan)
  const todayBajarilmagan = todayTasks.filter(t => !t.bajarilgan)

  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName || !form.login || (!editingWorkerId && !form.password)) {
      setFormMsg({ type: 'err', text: "Ism, login va parol majburiy" })
      return
    }
    if (form.stationIds.length === 0) {
      setFormMsg({ type: 'err', text: "Kamida bitta bekat tanlang" })
      return
    }

    try {
      if (editingWorkerId) {
        await updateWorker(editingWorkerId, {
          fullName: form.fullName,
          login: form.login,
          phone: form.phone,
          ...(form.password ? { password: form.password } : {}),
          role: form.role,
          position: form.role === 'worker' ? 'katta_elektromexanik' : 'bekat_boshlighi',
          stationIds: form.stationIds
        })
        setFormMsg({ type: 'ok', text: "Muvaffaqiyatli yangilandi" })
      } else {
        await addWorker({
          fullName: form.fullName,
          login: form.login,
          password: form.password,
          phone: form.phone,
          role: form.role,
          position: form.role === 'worker' ? 'katta_elektromexanik' : 'bekat_boshlighi',
          stationIds: form.stationIds
        })
        setFormMsg({ type: 'ok', text: "Yangi ishchi qo'shildi" })
      }
      setForm({ fullName: '', login: '', password: '', phone: '', role: 'worker', stationIds: [] })
      setEditingWorkerId(null)
      refreshData()
      setTimeout(() => setFormMsg(null), 3000)
    } catch (err: unknown) {
      setFormMsg({
        type: 'err',
        text: err instanceof Error ? err.message : "Xatolik yuz berdi"
      })
    }
  }

  async function handleDeleteWorker(workerId: string) {
    setDeleteConfirmId(workerId)
  }

  async function confirmDeleteWorker() {
    if (!deleteConfirmId) return
    try {
      await deleteWorker(deleteConfirmId)
      refreshData()
    } catch (err: unknown) {
      setFormMsg({
        type: 'err',
        text: err instanceof Error ? err.message : "Xatolik yuz berdi"
      })
    } finally {
      setDeleteConfirmId(null)
    }
  }

  async function handleConfirmReport(reportId: string) {
    if (!session) return
    try {
      await confirmReport(reportId, session.fullName)
      refreshData()
    } catch (err: unknown) {
      setFormMsg({
        type: 'err',
        text: err instanceof Error ? err.message : "Xatolik yuz berdi"
      })
    }
  }

  async function handleConfirmEntry(reportId: string, entryIndex: number) {
    if (!session) return
    try {
      await confirmReportEntry(reportId, entryIndex)
      setFormMsg({ type: 'ok', text: '✅ Tasdiqlandi!' })
      setTimeout(() => setFormMsg(null), 2000)
      refreshData()
    } catch (err: unknown) {
      console.error('❌ Tasdiqlash xatosi:', err)
      setFormMsg({
        type: 'err',
        text: err instanceof Error ? err.message : "Xatolik yuz berdi"
      })
      setTimeout(() => setFormMsg(null), 3000)
    }
  }

  async function handleConfirmPremiya(reportId: string) {
    if (!session) return
    try {
      await confirmPremiyaReport(reportId, session.fullName)
      refreshData()
    } catch (err: unknown) {
      setFormMsg({
        type: 'err',
        text: err instanceof Error ? err.message : "Xatolik yuz berdi"
      })
    }
  }

  if (!session) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 text-slate-900 selection:bg-sky-500/10">
      {/* Subtle Decorative Elements */}
      <div className="absolute -left-32 top-0 h-[600px] w-[600px] rounded-full bg-sky-200/15 blur-[120px]" />
      <div className="absolute -right-32 bottom-0 h-[600px] w-[600px] rounded-full bg-blue-200/15 blur-[120px]" />
      <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/10 blur-[100px]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header - Glass Card Effect */}
        <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 p-2 shadow-sm ring-1 ring-slate-200/60">
                  <img src="/uty-logo.png" alt="UTY" className="h-full w-full object-contain" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-black uppercase tracking-tighter bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">SMART SHCH</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 rounded-2xl border border-white/40 bg-white/50 backdrop-blur-sm px-4 py-2 sm:flex shadow-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                <span className="text-sm font-medium text-slate-600">Aloqa dispetcheri</span>
              </div>

              <button
                onClick={async () => { await signOut(); router.push('/') }}
                className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-red-100/60 bg-red-50/50 backdrop-blur-sm transition-all duration-200 hover:bg-red-100 hover:shadow-md active:scale-95"
              >
                <LogOut className="h-5 w-5 text-red-500 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-8">
          {/* Dashboard Stats */}
          <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4 animate-fade-up">
            <StatCard icon={<MapPin className="text-cyan-400" />} label="Bekatlar" value={stations.length} />
            <StatCard
              icon={<Users className="text-blue-400" />}
              label="Ishchilar"
              value={workers.length}
              onClick={() => setShowWorkersModal(true)}
              clickable
            />
            <StatCard
              icon={<CheckCircle2 className="text-emerald-400" />}
              label="Bugun bajarilgan"
              value={todayBajarilgan.length}
              onClick={() => setTodayModal('bajarilgan')}
              clickable
              color="emerald"
            />
            <StatCard
              icon={<AlertTriangle className="text-red-400" />}
              label="Bugun bajarilmagan"
              value={todayBajarilmagan.length}
              active={todayBajarilmagan.length > 0}
              onClick={() => setTodayModal('bajarilmagan')}
              clickable
              color="red"
            />
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
            <div className="flex gap-1 rounded-full bg-white/60 backdrop-blur-sm p-1.5 shadow-sm border border-white/40">
              <TabButton active={tab === 'bekatlar'} onClick={() => setTab('bekatlar')} label="Bekatlar" icon={<MapPin size={18} />} />
              <TabButton active={tab === 'arxiv'} onClick={() => setTab('arxiv')} label="Arxiv" icon={<FileText size={18} />} />
              <TabButton active={tab === 'grafiklar'} onClick={() => setTab('grafiklar')} label="Grafiklar" icon={<Download size={18} />} />
            </div>

            <button
              onClick={() => setShowAddWorker(!showAddWorker)}
              className="btn-gradient flex items-center justify-center gap-2 rounded-full px-6 py-4 font-bold text-white shadow-lg shadow-sky-500/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-95"
            >
              <Plus size={20} />
              <span>Xodim qo'shish</span>
            </button>
          </div>

          {showAddWorker && (
            <div className="mb-10 animate-scale-in">
              <WorkerForm
                onSubmit={handleAddWorker}
                onCancel={() => { setShowAddWorker(false); setEditingWorkerId(null); setForm({ fullName: '', login: '', password: '', phone: '', role: 'worker', stationIds: [] }) }}
                form={form}
                setForm={setForm}
                isEdit={!!editingWorkerId}
                stations={stations}
                message={formMsg}
              />
            </div>
          )}

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {tab === 'bekatlar' && (
              <div className="grid gap-8 lg:grid-cols-[300px_1fr] animate-fade-up">
                {/* Station Selection Sidebar */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bekatni tanlang</h3>
                    <button onClick={() => setShowMobileStations(!showMobileStations)} className="lg:hidden text-sky-600">
                      <Menu size={20} />
                    </button>
                  </div>

                  <div
                    className={`
    flex flex-col
    overflow-y-auto
    h-full
    max-h-[calc(100vh-220px)]
    pr-2
    space-y-3
    ${showMobileStations ? 'block' : 'hidden lg:flex'}
  `}
                  >
                    {stations.map(st => {
                      const count = (pendingCounts[st.id] || 0) + (premiyaPendingCounts[st.id] || 0) + (journalPendingCounts[st.id] || 0)
                      const isSelected = selectedStation === st.id
                      return (
                        <button
                          key={st.id}
                          onClick={() => { setSelectedStation(st.id); setSelectedReportType(null); setShowMobileStations(false) }}
                          className={`relative flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${isSelected
                            ? 'border-sky-400/50 bg-white shadow-lg shadow-sky-500/10 text-slate-900 ring-1 ring-sky-400/20'
                            : 'border-white/40 bg-white/60 backdrop-blur-sm text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-600 hover:shadow-sm'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 shrink-0 rounded-full transition-all ${isSelected ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]' : 'bg-slate-200'}`} />
                            <span className="font-bold">{st.name}</span>
                          </div>
                          {count > 0 && (
                            <span className="badge-danger flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black">{count}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Report Content */}
                <div className="min-w-0 flex-1">
                  {!selectedStation ? (
                    <div className="premium-card flex h-full flex-col items-center justify-center p-12 text-center">
                      <div className="mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 p-8 text-slate-300 shadow-inner">
                        <MapPin size={48} />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900">Bekat tanlanmagan</h2>
                      <p className="mt-2 max-w-sm text-slate-500">Ish jarayonini nazorat qilish uchun ro'yxatdan bekatni tanlang.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="premium-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900">{stations.find(s => s.id === selectedStation)?.name}</h2>
                          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-sky-600/70">
                            <Users size={12} />
                            <span>{workers.filter(w => w.stationIds.includes(selectedStation)).length} ta xodim biriktirilgan</span>
                          </div>
                        </div>
                      </div>

                      <div className="min-h-[400px]">
                        {selectedReportType === 'oylik' && (
                          <ReportList
                            reports={allReports.filter(r => r.stationId === selectedStation)}
                            onConfirm={handleConfirmReport}
                            onConfirmRow={handleConfirmEntry}
                          />
                        )}
                        {selectedReportType === 'premiya' && (
                          <PremiyaList
                            reports={allPremiyaReports.filter(r => r.stationId === selectedStation)}
                            onConfirm={handleConfirmPremiya}
                          />
                        )}
                        {selectedReportType === 'sxemalar' && (
                          <SchemasView key={selectedStation} stationId={selectedStation} userName={session?.fullName || ''} />
                        )}
                        {selectedReportType === 'jurnallar' && !activeJournalType && (
                          <JournalSelectModal
                            onSelect={(type) => setActiveJournalType(type)}
                            onClose={() => setSelectedReportType(null)}
                            du46Count={du46PendingCounts[selectedStation || ''] || 0}
                            shu2Count={shu2PendingCounts[selectedStation || ''] || 0}
                          />
                        )}
                        {selectedReportType === 'jurnallar' && activeJournalType && !activeJournalMonth && (
                          <JournalMonthSelectModal
                            journalType={activeJournalType}
                            onSelect={(monthKey) => setActiveJournalMonth(monthKey)}
                            onClose={() => setActiveJournalType(null)}
                          />
                        )}
                        {selectedReportType === 'jurnallar' && activeJournalType === 'du46' && activeJournalMonth && (
                          <DU46JournalView
                            stationId={selectedStation}
                            stationName={stations.find(s => s.id === selectedStation)?.name || ''}
                            userName={session?.fullName || ''}
                            userRole="dispatcher"
                            journalMonth={activeJournalMonth}
                            onClose={() => { setActiveJournalMonth(''); setActiveJournalType(null); setSelectedReportType(null) }}
                            onAccepted={loadJournals}
                          />
                        )}
                        {selectedReportType === 'jurnallar' && activeJournalType === 'shu2' && activeJournalMonth && (
                          <SHU2JournalView
                            stationId={selectedStation}
                            stationName={stations.find(s => s.id === selectedStation)?.name || ''}
                            userName={session?.fullName || ''}
                            userRole="dispatcher"
                            journalMonth={activeJournalMonth}
                            onClose={() => { setActiveJournalMonth(''); setActiveJournalType(null); setSelectedReportType(null) }}
                            onAccepted={loadJournals}
                          />
                        )}
                        {!selectedReportType && (
                          <div className="grid gap-6 sm:grid-cols-2">
                            <BigActionCard
                              title="Oylik Ish Reja"
                              desc="Xodimlarning bir oylik bajarilgan ishlari va grafiklarini tekshiring."
                              icon={<FileText size={32} />}
                              onClick={() => setSelectedReportType('oylik')}
                              count={pendingCounts[selectedStation]}
                            />
                            <BigActionCard
                              title="Premiya Ro'yxati"
                              desc="Rag'batlantirish ballarini tasdiqlang va KPI ko'rsatkichlarini ko'ring."
                              icon={<Award size={32} />}
                              onClick={() => setSelectedReportType('premiya')}
                              count={premiyaPendingCounts[selectedStation]}
                              color="amber"
                            />
                            <BigActionCard
                              title="Ish Jurnallari"
                              desc="DU-46 va ShU-2 jurnallarini ko'rish va tahrirlash."
                              icon={<BookOpen size={32} />}
                              onClick={() => setSelectedReportType('jurnallar')}
                              count={(du46PendingCounts[selectedStation || ''] || 0) + (shu2PendingCounts[selectedStation || ''] || 0)}
                              color="emerald"
                            />
                            <BigActionCard
                              title="Bekat Sxemalari"
                              desc="Bir ipli va ikki ipli sxemalarni ko'rish."
                              icon={<MapIcon size={32} />}
                              onClick={() => setSelectedReportType('sxemalar')}
                              color="blue"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'arxiv' && (
              <ArchiveView
                stations={stations}
                allReports={allReports}
                allJournals={allJournals}
                onConfirm={handleConfirmReport}
                onConfirmEntry={handleConfirmEntry}
              />
            )}

            {tab === 'grafiklar' && (
              <div className="grid gap-8 sm:grid-cols-2">
                <DownloadCard
                  title="Yillik ish grafiki"
                  desc="2026-yil uchun tasdiqlangan barcha ishlar grafigi."
                  existingFile={globalGraphics.find(g => g.schemaType === 'yillik_ish_reja_grafiki')}
                  onUpload={async (file) => {
                    await uploadGlobalGraphicFile(file, 'yillik_ish_reja_grafiki', session?.fullName || '')
                    refreshData()
                  }}
                  onDelete={async (id) => {
                    await deleteGlobalGraphicFile(id)
                    refreshData()
                  }}
                />
                <DownloadCard
                  title="4 haftalik ish grafiki"
                  desc="TSNG bo'yicha tsiklik ishlar taqsimoti."
                  existingFile={globalGraphics.find(g => g.schemaType === 'haftalik_ish_reja_grafiki')}
                  onUpload={async (file) => {
                    await uploadGlobalGraphicFile(file, 'haftalik_ish_reja_grafiki', session?.fullName || '')
                    refreshData()
                  }}
                  onDelete={async (id) => {
                    await deleteGlobalGraphicFile(id)
                    refreshData()
                  }}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {showWorkersModal && (
        <WorkersModal
          workers={workers}
          onClose={() => setShowWorkersModal(false)}
          onEdit={(w: User) => {
            setEditingWorkerId(w.id)
            setForm({
              fullName: w.fullName,
              login: w.login,
              password: '',
              phone: w.phone || '',
              role: w.role === 'bekat_boshlighi' ? 'bekat_boshlighi' : 'worker',
              stationIds: w.stationIds || []
            })
            setShowAddWorker(true)
            setShowWorkersModal(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onDelete={handleDeleteWorker}
        />
      )}

      {/* O'chirish tasdiqlash modali */}
      {/* ─── BUGUNGI ISHLAR MODAL ──────────────────────────────── */}
      {todayModal && (
        <TodayTasksModal
          type={todayModal}
          tasks={todayModal === 'bajarilgan' ? todayBajarilgan : todayBajarilmagan}
          onClose={() => setTodayModal(null)}
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="premium-card w-full max-w-md p-8 animate-scale-in">
            <h3 className="text-lg font-black text-slate-900">Ishchini o&apos;chirish</h3>
            <p className="mt-2 text-sm text-slate-500">Haqiqatdan ham ishchini o&apos;chirishni xohlaysizmi? Bu amalni qaytarib bo&apos;lmaydi.</p>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Bekor qilish</button>
              <button onClick={confirmDeleteWorker} className="rounded-xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all">O&apos;chirish</button>
            </div>
          </div>
        </div>
      )}


      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        @media print {
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function StatCard({ icon, label, value, active, clickable, onClick, color }: {
  icon: React.ReactNode,
  label: string,
  value: string | number,
  active?: boolean,
  clickable?: boolean,
  onClick?: () => void,
  color?: 'emerald' | 'red' | 'amber'
}) {
  const dotColor = color === 'emerald' ? 'bg-emerald-500' : color === 'red' ? 'bg-red-500' : 'bg-amber-500'
  const hoverBg = color === 'emerald' ? 'group-hover:bg-emerald-50' : color === 'red' ? 'group-hover:bg-red-50' : 'group-hover:bg-sky-50'
  const numColor = active && color === 'emerald' ? 'text-emerald-600' : active && color === 'red' ? 'text-red-600' : 'text-slate-900'

  return (
    <div
      onClick={onClick}
      className={`premium-card group relative overflow-hidden p-6 transition-all duration-300 ${clickable ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className={`rounded-2xl bg-slate-50/80 p-3 transition-all duration-300 group-hover:scale-110 ${hoverBg}`}>
          {icon}
        </div>
        {active && <div className={`h-2.5 w-2.5 rounded-full ${dotColor} shadow-[0_0_8px_2px_rgba(16,185,129,0.25)] animate-ping`} />}
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className={`text-3xl font-black transition-colors ${numColor}`}>{value}</p>
      </div>
      {clickable && (
        <div className="absolute bottom-3 right-4 text-[9px] font-black uppercase tracking-widest text-slate-300 group-hover:text-slate-500 transition-colors">
          Tafsilot →
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all duration-200 ${active
        ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg shadow-slate-900/20'
        : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function ReportTypeBtn({ active, icon, label, onClick, count, color = 'cyan' }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void, count?: number, color?: 'cyan' | 'amber' | 'blue' }) {
  const colorMap: Record<string, string> = {
    cyan: 'border-sky-200 text-sky-600 bg-sky-50 hover:bg-sky-100',
    amber: 'border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100',
    blue: 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100',
  }
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold transition-all duration-200 active:scale-95 ${active ? colorMap[color] : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
        }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && <span className="badge-danger absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black">{count}</span>}
    </button>
  )
}

function BigActionCard({ title, desc, icon, onClick, count, color = 'cyan' }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void, count?: number, color?: 'cyan' | 'amber' | 'blue' | 'emerald' }) {
  const colorMap: Record<string, string> = {
    cyan: 'from-sky-50 shadow-sky-500/5 hover:border-sky-300 text-sky-600 bg-white',
    amber: 'from-amber-50 shadow-amber-500/5 hover:border-amber-300 text-amber-600 bg-white',
    blue: 'from-blue-50 shadow-blue-500/5 hover:border-blue-300 text-blue-600 bg-white',
    emerald: 'from-emerald-50 shadow-emerald-500/5 hover:border-emerald-300 text-emerald-600 bg-white',
  }
  return (
    <button
      onClick={onClick}
      className={`premium-card group relative flex flex-col items-center justify-center p-10 bg-gradient-to-br to-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] text-center ${colorMap[color]}`}
    >
      {count !== undefined && count > 0 && (
        <div className="absolute -top-4 -right-4 flex h-10 w-10 animate-bounce items-center justify-center rounded-full bg-red-500 text-lg font-black text-white shadow-xl shadow-red-500/40 z-10">
          +{count}
        </div>
      )}
      <div className="rounded-2xl bg-slate-50/80 p-5 mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-white inline-flex shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{desc}</p>
    </button>
  )
}

// ===== HISOBOT KARTASI =====

function WorkerForm({ onSubmit, onCancel, form, setForm, isEdit, stations, message }: {
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  form: { fullName: string; login: string; password: string; phone: string; role: 'worker' | 'bekat_boshlighi'; stationIds: string[] }
  setForm: (form: { fullName: string; login: string; password: string; phone: string; role: 'worker' | 'bekat_boshlighi'; stationIds: string[] }) => void
  isEdit: boolean
  stations: { id: string; name: string }[]
  message: { type: 'ok' | 'err'; text: string } | null
}) {
  return (
    <form onSubmit={onSubmit} className="premium-card p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{isEdit ? 'Xodimni tahrirlash' : 'Yangi xodim qo\'shish'}</h2>
          <p className="text-sm text-slate-500">Tizimga kirish uchun login va bekatlarni biriktiring.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="F.I.SH" value={form.fullName} onChange={(val) => setForm({ ...form, fullName: val })} placeholder="Masalan: Azizov Aziz" />
            <FormGroup label="Login" value={form.login} onChange={(val) => setForm({ ...form, login: val })} placeholder="azizov123" />
            <FormGroup label="Parol" value={form.password} onChange={(val) => setForm({ ...form, password: val })} placeholder="••••••••" type="password" />
            <FormGroup label="Telefon" value={form.phone} onChange={(val) => setForm({ ...form, phone: val })} placeholder="+99890..." />
          </div>

          <div>
            <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">Lavozimi</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, role: 'worker' })} className={`flex-1 rounded-xl py-4 text-xs font-bold border transition-all duration-200 ${form.role === 'worker' ? 'bg-sky-50 border-sky-400 text-sky-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>Katta Elektromexanik</button>
              <button type="button" onClick={() => setForm({ ...form, role: 'bekat_boshlighi' })} className={`flex-1 rounded-xl py-4 text-xs font-bold border transition-all duration-200 ${form.role === 'bekat_boshlighi' ? 'bg-amber-50 border-amber-400 text-amber-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>Bekat Boshlig'i</button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50/80 p-6 border border-slate-100">
          <label className="mb-4 block text-[10px] font-black uppercase tracking-widest text-slate-400">Bekatlarni biriktirish ({form.stationIds.length})</label>
          <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {stations.map((s: any) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  const exists = form.stationIds.includes(s.id)
                  if (exists) setForm({ ...form, stationIds: form.stationIds.filter((id: string) => id !== s.id) })
                  else setForm({ ...form, stationIds: [...form.stationIds, s.id] })
                }}
                className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold border transition-all duration-200 ${form.stationIds.includes(s.id) ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-200/50'}`}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${form.stationIds.includes(s.id) ? 'bg-sky-500' : 'bg-slate-200'}`} />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {message && (
        <div className={`mt-8 rounded-xl p-4 text-center text-sm font-bold ${message.type === 'ok' ? 'badge-success' : 'badge-danger'}`}>
          {message.text}
        </div>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <button type="submit" className="btn-gradient rounded-xl px-10 py-4 text-sm font-black text-white shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-95">
          {isEdit ? 'Yangilash' : 'Xodimni qo\'shish'}
        </button>
      </div>
    </form>
  )
}

function FormGroup({ label, value, onChange, placeholder, type = 'text' }: { label: string, value: string, onChange: (val: string) => void, placeholder: string, type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-500/50 focus:bg-white"
      />
    </div>
  )
}

function ReportList({ reports, onConfirm, onConfirmRow }: {
  reports: WorkReport[]
  onConfirm: (reportId: string) => void
  onConfirmRow: (reportId: string, idx: number) => void
}) {
  if (reports.length === 0) return <EmptyState label="Hisobotlar yo'q" />
  return (
    <div className="space-y-4">
      {reports.slice().sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map((r) => (
        <ReportCard key={r.id} report={r} onConfirm={() => onConfirm(r.id)} onConfirmRow={(idx: number) => onConfirmRow(r.id, idx)} />
      ))}
    </div>
  )
}

/** NSH ma'lumotini entry matnidan parse qiladi */
function parseNshFromEntry(entry: ReportEntry): string {
  // haftalikJadval va yillikJAdval ichidan [NSH-01 7.1] formatidagi textni ajratish
  const text = entry.haftalikJadval || entry.yillikJadval || ''
  const match = text.match(/^\[([^\]]+)\]/)
  if (match) return match[1]
  // Agar formatlangan bo'lmasa, qisqartirib qaytarish
  if (text.length > 40) return text.slice(0, 40) + '...'
  return text || 'Boshqa'
}

function ReportCard({ report, onConfirm, onConfirmRow }: {
  report: WorkReport
  onConfirm: () => void
  onConfirmRow: (idx: number) => void
}) {
  const [expanded, setExpanded] = useState(false);

  const isPlanPending = !report.confirmedAt;
  const isAccepted = !!report.confirmedAt;
  const pendingDailyCount = (report.entries || []).filter(e => e.bajarildiShn && !e.adImzosi).length;

  return (
    <div className={`premium-card overflow-hidden transition-all duration-300 ${expanded ? 'shadow-xl ring-1 ring-sky-400/20' : 'hover:bg-white/80 shadow-sm'}`}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex cursor-pointer items-center justify-between p-6"
      >
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ${isPlanPending
              ? 'bg-amber-50 text-amber-600'
              : pendingDailyCount > 0
                ? 'bg-sky-50 text-sky-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}>
            {isPlanPending ? <Clock size={24} /> : pendingDailyCount > 0 ? <FileText size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">{report.workerName}</h3>
            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {report.month ? (() => { const [y, m] = report.month.split('-'); const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']; return `${months[parseInt(m, 10) - 1]} ${y}`; })() : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isPlanPending && <span className="badge-warning badge rounded-lg px-3 py-1 text-[10px] font-black">REJA KUTILMOQDA</span>}
          {isAccepted && pendingDailyCount > 0 && (
            <span className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-1 text-[10px] font-black text-sky-600">
              {pendingDailyCount} ta tasdiqlash
            </span>
          )}
          {isAccepted && pendingDailyCount === 0 && (
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-black text-emerald-600">✓ QABUL QILINGAN</span>
          )}
          <ChevronRight className={`text-slate-300 transition-transform duration-200 ${expanded ? 'rotate-90 text-sky-500' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-6 pt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">Ishchi: <span className="font-bold text-slate-600">{report.workerName}</span></span>
            <div className="flex gap-2">
              {isPlanPending && (
                <button
                  onClick={(e) => { e.stopPropagation(); onConfirm() }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
                >
                  <CheckCircle2 size={14} />
                  Rejani Qabul Qilish
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  const entriesHtml = (report.entries || [])
                    .filter((e: any) => e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish)
                    .map((e: any) => `
                      <tr>
                        <td style="text-align:center">${e.ragat || ''}</td>
                        <td>${e.haftalikJadval || ''}</td>
                        <td>${e.yillikJadval || ''}</td>
                        <td>${e.yangiIshlar || ''}</td>
                        <td>${e.kmoBartaraf || ''}</td>
                        <td>${e.majburiyOzgarish || ''}</td>
                        <td style="text-align:center">${e.bajarildiShn || ''}</td>
                        <td style="text-align:center">${e.bajarildiImzo || ''}</td>
                        <td style="text-align:center">${e.adImzosi || 'Kutilmoqda'}</td>
                      </tr>
                    `).join('');

                  printWindow.document.write(`
                    <html>
                    <head>
                      <title>${report.workerName} — ${report.month}</title>
                      <style>
                        body { font-family: sans-serif; font-size: 11px; color: #000; margin: 20px; }
                        h2 { font-size: 14px; margin-bottom: 4px; }
                        p { margin: 2px 0 12px; color: #555; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 10px; }
                        thead th { background: #f0f0f0; font-weight: bold; text-align: center; }
                        tr:nth-child(even) { background: #fafafa; }
                      </style>
                    </head>
                    <body>
                      <h2>${report.workerName}</h2>
                      <p>Bekat: ${report.stationName} &nbsp;|&nbsp; Oy: ${report.month}</p>
                      <table>
                        <thead>
                          <tr>
                            <th rowspan="2">№</th>
                            <th rowspan="2">4-haftalik jadval</th>
                            <th rowspan="2">Yillik jadval bo'yicha</th>
                            <th rowspan="2">Yangi ishlar ro'yxati</th>
                            <th rowspan="2">O'tkazilgan KMO va bartaraf etilgan kamchiliklar</th>
                            <th rowspan="2">Rejaga kiritilgan majburiy o'zgartirishlar</th>
                            <th colspan="2">Bajarilgan ishlar</th>
                            <th rowspan="2">AD imzosi</th>
                          </tr>
                          <tr>
                            <th>Shn</th>
                            <th>Imzo</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${entriesHtml}
                        </tbody>
                      </table>
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-sky-600 hover:border-sky-200 transition-all shadow-sm"
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 relative">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[11px] text-slate-700 min-w-[800px]">
                <thead className="border-b-2 border-sky-500/50 bg-slate-100 font-bold text-slate-600">
                  <tr>
                    <th rowSpan={2} className="w-8 border-r border-slate-200 p-2 text-center text-[10px]">№</th>
                    <th rowSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">4-haftalik jadval</th>
                    <th rowSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">Yillik jadval</th>
                    <th rowSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">Yangi ishlar</th>
                    <th rowSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">KMO bartaraf</th>
                    <th rowSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">Majburiy o'zgarish</th>
                    <th colSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">Bajarilgan</th>
                    <th rowSpan={2} className="bg-amber-50 p-2 text-center text-[10px] text-amber-700">AD imzo</th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="border-r border-t border-slate-200 p-2 text-center text-[10px]">Shn</th>
                    <th className="border-r border-t border-slate-200 p-2 text-center text-[10px]">Imzo</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.entries || []).filter(e => e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish).map((e, idx) => {
                    const originalIndex = report.entries.findIndex(item => item === e);
                    return (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-white transition-colors">
                        <td className="border-r border-slate-200 p-2 text-center font-bold text-slate-400">{e.ragat}</td>
                        <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap">{e.haftalikJadval || '—'}</td>
                        <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap">{e.yillikJadval || '—'}</td>
                        <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap">{e.yangiIshlar || '—'}</td>
                        <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap">{e.kmoBartaraf || '—'}</td>
                        <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap">{e.majburiyOzgarish || '—'}</td>
                        <td className="border-r border-slate-200 p-2 text-center align-middle text-[10px] font-medium text-sky-600">{e.bajarildiShn || '—'}</td>
                        <td className="border-r border-slate-200 p-2 text-center align-middle text-[10px] italic text-slate-500">{e.bajarildiImzo || '—'}</td>
                        <td className="p-2 text-center align-middle">
                          {e.adImzosi ? (
                            <div className="flex items-center justify-center gap-1 rounded-lg bg-emerald-50 py-1.5 border border-emerald-100 text-emerald-600">
                              <CheckCircle2 size={10} />
                              <span className="text-[9px] font-bold">✅ {e.adImzosi}</span>
                            </div>
                          ) : (
                            <div className="text-[9px] italic text-slate-300">Kutilmoqda...</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PremiyaList({ reports, onConfirm }: {
  reports: PremiyaReport[]
  onConfirm: (reportId: string) => void
}) {
  if (reports.length === 0) return <EmptyState label="Premiya ro'yxatlari yo'q" />
  return (
    <div className="space-y-4">
      {reports.map((r) => (
        <PremiyaCard key={r.id} report={r} onConfirm={() => onConfirm(r.id)} />
      ))}
    </div>
  )
}

function PremiyaCard({ report, onConfirm }: {
  report: PremiyaReport
  onConfirm: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isPending = !report.confirmedAt

  return (
    <div className={`premium-card overflow-hidden transition-all duration-300 ${expanded ? 'shadow-xl ring-1 ring-amber-400/20' : 'hover:bg-white/80 shadow-sm'}`}>
      <div onClick={() => setExpanded(!expanded)} className="flex cursor-pointer items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ${isPending ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <Award size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">{report.workerName} В· Premiya</h3>
            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{report.month}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isPending && <span className="badge-warning badge rounded-lg px-3 py-1 text-[10px] font-black">QABUL QILINMAGAN</span>}
          <ChevronRight className={`text-slate-300 transition-transform duration-200 ${expanded ? 'rotate-90 text-amber-500' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-6 pt-2">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">{isPending ? 'Ro\'yxatni tekshirib tasdiqlang.' : `Tasdiqlangan: ${report.confirmedAt}`}</span>
            <div className="flex gap-2">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const { jsPDF } = await import('jspdf')
                  const { default: autoTable } = await import('jspdf-autotable')
                  const doc = new jsPDF()
                  doc.setFontSize(14)
                  doc.text(`Premiya Ro'yxati - ${report.stationName}`, 14, 15)
                  doc.setFontSize(10)
                  doc.text(`Sana: ${report.month}`, 14, 22)
                  const tableColumn = ['№', 'I.SH.', 'Lavozimi', 'Tabel №', "Rag'bat. %", 'Eslatma']
                  const tableRows = report.entries.filter((en: any) => en.ish || en.lavozim || en.foiz).map((en: any, idx: number) => [String(idx + 1), en.ish, en.lavozim, en.tabelNomeri, en.foiz ? en.foiz + '%' : '', en.eslatma])
                  autoTable(doc, { head: [tableColumn], body: tableRows, startY: 30, styles: { font: 'helvetica', fontSize: 8 }, headStyles: { fillColor: [245, 158, 11] } })
                  doc.save(`Premiya_${report.stationName}_${report.month}.pdf`)
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Download size={14} />
                Yuklab olish
              </button>
              {isPending && (
                <button
                  onClick={(e) => { e.stopPropagation(); onConfirm() }}
                  className="rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-amber-500/20 active:scale-95 transition-all hover:bg-amber-600"
                >
                  Ro'yxatni Qabul Qilish
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-4 text-center w-12">№</th>
                  <th className="p-4">I.SH.</th>
                  <th className="p-4">Lavozimi</th>
                  <th className="p-4 text-center">Tabel №</th>
                  <th className="p-4 text-center">Rag&apos;bat. %</th>
                  <th className="p-4">Eslatma</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {report.entries.map((e, idx: number) => (
                  <tr key={idx} className="border-b border-slate-200 last:border-0 hover:bg-white transition-colors">
                    <td className="p-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-4 font-bold">{e.ish}</td>
                    <td className="p-4 text-slate-500">{e.lavozim}</td>
                    <td className="p-4 text-center text-slate-500">{e.tabelNomeri}</td>
                    <td className="p-4 text-center font-black text-amber-600">{e.foiz}%</td>
                    <td className="p-4 text-slate-500">{e.eslatma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SchemasView({ stationId, userName }: { stationId: string, userName: string }) {
  const [schemas, setSchemasState] = useState<StationSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [schemaMsg, setSchemaMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSchemasByStation(stationId)
      setSchemasState(data)
    } finally {
      setLoading(false)
    }
  }, [stationId])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName || !newFile) return
    setUploading(true)
    try {
      await uploadSchemaFile(stationId, newFile, newName, userName)
      setNewName(''); setNewFile(null); setShowForm(false)
      load()
    } catch (err: unknown) {
      setSchemaMsg({ type: 'err', text: err instanceof Error ? err.message : 'Xatolik' })
      setTimeout(() => setSchemaMsg(null), 3000)
    } finally {
      setUploading(false)
    }
  }

  const [deleteSchemaConfirmId, setDeleteSchemaConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleteSchemaConfirmId(id)
  }

  async function confirmSchemaDelete() {
    if (!deleteSchemaConfirmId) return
    await deleteSchema(stationId, deleteSchemaConfirmId)
    setDeleteSchemaConfirmId(null)
    load()
  }

  if (loading) return <div className="p-8 text-center text-slate-300">Yuklanmoqda...</div>

  return (
    <div className="space-y-6">
      {schemaMsg && (
        <div className={`rounded-xl p-4 text-center text-sm font-bold ${schemaMsg.type === 'ok' ? 'badge-success' : 'badge-danger'}`}>
          {schemaMsg.text}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Bekat xaritalari</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-white/60 backdrop-blur-sm border border-white/40 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-sm transition-all duration-200">
          <Plus size={16} />
          {showForm ? 'Bekor qilish' : 'Sxema yuklash'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="premium-card grid items-end gap-6 p-6 sm:grid-cols-[1fr_1fr_auto]">
          <FormGroup label="Sxema nomi" value={newName} onChange={setNewName} placeholder="Bir ipli sxema" />
          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Fayl (PDF)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setNewFile(e.target.files?.[0] || null)} className="w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-xs file:font-bold file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
          </div>
          <button disabled={uploading} type="submit" className="btn-gradient rounded-xl px-8 py-4 text-xs font-black text-white shadow-lg shadow-sky-500/20 transition-all duration-200 disabled:opacity-50">
            {uploading ? 'Yuklanmoqda...' : 'SAQLASH'}
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {schemas.map(s => (
          <div key={s.id} className="premium-card flex items-center justify-between p-5 transition-all duration-200 hover:shadow-md group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition-transform duration-200 group-hover:scale-110"><MapPin size={24} /></div>
              <div>
                <h4 className="text-sm font-black text-slate-900">{s.schemaType}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.fileName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview(s.filePath)} className="rounded-xl bg-slate-50 p-2.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-all duration-200 shadow-sm"><Eye size={18} /></button>
              <button onClick={() => handleDelete(s.id)} className="rounded-xl bg-red-50 p-2.5 text-red-500 hover:text-red-700 hover:bg-red-100 transition-all duration-200 shadow-sm"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {schemas.length === 0 && <div className="col-span-full py-12 text-center text-slate-300">Hali sxemalar yuklanmagan.</div>}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="premium-card h-full w-full max-w-6xl overflow-hidden p-0 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 px-8 py-4">
              <h3 className="text-lg font-black text-slate-900">Sxema: {schemas.find(s => s.filePath === preview)?.schemaType}</h3>
              <button onClick={() => setPreview(null)} className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            </div>
            <iframe src={preview} className="h-[calc(100%-80px)] w-full" />
          </div>
        </div>
      )}

      {/* Sxema o'chirish tasdiqlash modali */}
      {deleteSchemaConfirmId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="premium-card w-full max-w-md p-8 animate-scale-in">
            <h3 className="text-lg font-black text-slate-900">Sxemani o'chirish</h3>
            <p className="mt-2 text-sm text-slate-500">Haqiqatdan ham sxemani o'chirishni xohlaysizmi?</p>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setDeleteSchemaConfirmId(null)} className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Bekor qilish</button>
              <button onClick={confirmSchemaDelete} className="btn-gradient rounded-xl px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20">O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ArchiveView({ stations, allReports, allJournals, onConfirm, onConfirmEntry }: {
  stations: { id: string; name: string }[]
  allReports: WorkReport[]
  allJournals: StationJournal[]
  onConfirm: (reportId: string) => void
  onConfirmEntry: (reportId: string, idx: number) => void
}) {
  const [selStation, setSelStation] = useState<string | null>(null)
  const [selYear, setSelYear] = useState('2026')
  const [selMonth, setSelMonth] = useState<number | null>(null)
  const [archiveTab, setArchiveTab] = useState<'hisobot' | 'du46' | 'shu2'>('hisobot')
  const [viewJournal, setViewJournal] = useState<StationJournal | null>(null)

  const archiveReports = selStation && selMonth !== null
    ? allReports.filter((r) => r.stationId === selStation && r.month === `${selYear}-${String(selMonth + 1).padStart(2, '0')}`)
    : []

  const du46Archive = selStation && selMonth !== null
    ? allJournals.filter(j => j.stationId === selStation && j.journalType === 'du46' && j.updatedAt.startsWith(`${selYear}-${String(selMonth + 1).padStart(2, '0')}`))
    : []

  const shu2Archive = selStation && selMonth !== null
    ? allJournals.filter(j => j.stationId === selStation && j.journalType === 'shu2' && j.updatedAt.startsWith(`${selYear}-${String(selMonth + 1).padStart(2, '0')}`))
    : []

  const selStationName = stations.find((s: any) => s.id === selStation)?.name || ''

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[300px_1fr] animate-fade-up">
        {/* Chap: Bekatlar */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Arxiv Bekatlari</h3>
          <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {stations.map((st) => (
              <button key={st.id} onClick={() => { setSelStation(st.id); setArchiveTab('hisobot') }} className={`premium-card p-4 text-left transition-all duration-200 ${selStation === st.id ? 'bg-amber-50 ring-1 ring-amber-400/30 text-slate-900 shadow-md' : 'hover:bg-white/80 text-slate-500'}`}>
                <span className="font-bold">{st.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* O'ng: Kontent */}
        <div className="min-w-0 space-y-6">
          {selStation ? (
            <>
              {/* Yil va oy tanlash */}
              <div className="premium-card p-6">
                <h2 className="text-2xl font-black text-slate-900">{selStationName} Arxiv</h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  {Array.from({ length: Math.max(3, new Date().getFullYear() - 2026 + 3) }, (_, i) => 2026 + i).map(y => (
                    <button key={y} onClick={() => setSelYear(y.toString())} className={`rounded-xl px-6 py-2 text-xs font-black transition-all duration-200 ${selYear === y.toString() ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{y} yil</button>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {MONTHS.map((m, i) => {
                    const hasReport = allReports.some((r) => r.stationId === selStation && r.month === `${selYear}-${String(i + 1).padStart(2, '0')}`)
                    const hasDU46 = allJournals.some(j => j.stationId === selStation && j.journalType === 'du46' && j.updatedAt.startsWith(`${selYear}-${String(i + 1).padStart(2, '0')}`))
                    const hasSHU2 = allJournals.some(j => j.stationId === selStation && j.journalType === 'shu2' && j.updatedAt.startsWith(`${selYear}-${String(i + 1).padStart(2, '0')}`))
                    const hasAny = hasReport || hasDU46 || hasSHU2
                    return (
                      <button key={i} onClick={() => setSelMonth(i)} className={`rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${selMonth === i ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xl' : hasAny ? 'bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100' : 'bg-slate-50 border border-slate-100 text-slate-300 hover:bg-slate-100'}`}>{m}</button>
                    )
                  })}
                </div>
              </div>

              {/* Arxiv tab-lar: Hisobotlar | DU-46 | SHU-2 */}
              {selMonth !== null && (
                <>
                  <div className="flex gap-1 rounded-full bg-white/60 backdrop-blur-sm p-1.5 shadow-sm border border-white/40 w-fit">
                    <button onClick={() => setArchiveTab('hisobot')} className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${archiveTab === 'hisobot' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>
                      <span className="flex items-center gap-2"><FileText size={14} /> Hisobotlar</span>
                    </button>
                    <button onClick={() => setArchiveTab('du46')} className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${archiveTab === 'du46' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>
                      <span className="flex items-center gap-2"><BookOpen size={14} /> DU-46</span>
                    </button>
                    <button onClick={() => setArchiveTab('shu2')} className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${archiveTab === 'shu2' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>
                      <span className="flex items-center gap-2"><BookOpen size={14} /> SHU-2</span>
                    </button>
                  </div>

                  {/* Hisobotlar */}
                  {archiveTab === 'hisobot' && (
                    <div className="space-y-4">
                      {archiveReports.length === 0
                        ? <div className="premium-card flex h-48 items-center justify-center text-slate-300 text-sm font-black uppercase tracking-widest">Bu oy uchun hisobot yo'q</div>
                        : archiveReports.map((r) => (
                          <ReportCard key={r.id} report={r} onConfirm={() => onConfirm(r.id)} onConfirmRow={(idx: number) => onConfirmEntry(r.id, idx)} />
                        ))
                      }
                    </div>
                  )}

                  {/* DU-46 Arxiv */}
                  {archiveTab === 'du46' && (
                    <div className="space-y-4">
                      {du46Archive.length === 0
                        ? <div className="premium-card flex h-48 items-center justify-center text-slate-300 text-sm font-black uppercase tracking-widest">Bu oy uchun DU-46 jurnali yo'q</div>
                        : du46Archive.map((j) => (
                          <button
                            key={j.id}
                            onClick={() => setViewJournal(j)}
                            className="w-full text-left premium-card p-6 hover:ring-2 hover:ring-sky-400/30 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-black text-slate-900">DU-46 Jurnali</h4>
                                <p className="text-xs text-slate-400">{selStationName} В· {j.updatedBy}</p>
                              </div>
                              <span className="text-sm font-bold text-sky-600 group-hover:translate-x-1 transition-transform">Ko'rish →</span>
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  )}

                  {/* SHU-2 Arxiv */}
                  {archiveTab === 'shu2' && (
                    <div className="space-y-4">
                      {shu2Archive.length === 0
                        ? <div className="premium-card flex h-48 items-center justify-center text-slate-300 text-sm font-black uppercase tracking-widest">Bu oy uchun SHU-2 jurnali yo'q</div>
                        : shu2Archive.map((j) => (
                          <button
                            key={j.id}
                            onClick={() => setViewJournal(j)}
                            className="w-full text-left premium-card p-6 hover:ring-2 hover:ring-amber-400/30 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-black text-slate-900">SHU-2 Jurnali</h4>
                                <p className="text-xs text-slate-400">{selStationName} В· {j.updatedBy}</p>
                              </div>
                              <span className="text-sm font-bold text-amber-600 group-hover:translate-x-1 transition-transform">Ko'rish →</span>
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </>
              )}

              {selMonth === null && (
                <div className="premium-card flex h-64 items-center justify-center text-slate-300 text-sm font-black uppercase tracking-widest">Oyni tanlang</div>
              )}
            </>
          ) : (
            <div className="premium-card flex h-96 items-center justify-center text-slate-300 text-sm font-black uppercase tracking-widest">Bekat tanlang</div>
          )}
        </div>
      </div>

      {/* Journal View Modal — ishchi sahifasidagi kabi to'liq ko'rinish */}
      {viewJournal && (
        <div className="fixed inset-0 z-[500] bg-slate-50">
          {viewJournal.journalType === 'du46' ? (
            <DU46JournalView
              stationId={viewJournal.stationId}
              stationName={selStationName}
              userName="Dispetcher"
              userRole="dispatcher"
              onClose={() => setViewJournal(null)}
            />
          ) : (
            <SHU2JournalView
              stationId={viewJournal.stationId}
              stationName={selStationName}
              userName="Dispetcher"
              userRole="dispatcher"
              onClose={() => setViewJournal(null)}
            />
          )}
        </div>
      )}
    </>
  )
}

// Journal Archive Card komponenti - to'liq ko'rinish + PDF yuklab olish
function JournalArchiveCard({ journal, type, stationName }: {
  journal: StationJournal
  type: 'du46' | 'shu2'
  stationName: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const entries = journal.entries as (DU46Entry | SHU2Entry)[]
  const updatedDate = new Date(journal.updatedAt)
  const dateStr = `${String(updatedDate.getDate()).padStart(2, '0')}.${String(updatedDate.getMonth() + 1).padStart(2, '0')}.${updatedDate.getFullYear()}`

  const du46Entries = entries as DU46Entry[]
  const shu2Entries = entries as SHU2Entry[]

  const qabulCount = entries.filter(e => (e as any).dispetcherQabulQildi).length
  const yuborildiCount = entries.filter(e => (e as any).yuborildi).length
  const filteredEntries = entries.filter(e => type === 'du46' ? (e as DU46Entry).kamchilik || (e as DU46Entry).bartarafInfo : (e as SHU2Entry).yozuv)

  // PDF yuklab olish
  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: type === 'du46' ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`${type === 'du46' ? 'DU-46' : 'SHU-2'} Jurnali - ${stationName}`, 14, 15)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Sana: ${dateStr}`, 14, 22)
      doc.text(`Yangilangan: ${journal.updatedBy}`, 14, 28)

      if (type === 'du46') {
        const tableColumn = ['№', 'Oy/kun', 'Soat', 'Kamchilik', 'Xabar usuli', 'Bartaraf info', 'Holat']
        const tableRows = du46Entries
          .filter(e => e.kamchilik || e.bartarafInfo)
          .map((e, i) => [
            e.nomber || String(i + 1),
            e.oyKun1 || '',
            e.soatMinut1 || '',
            e.kamchilik || '',
            e.xabarUsuli || '',
            e.bartarafInfo || '',
            (e as DU46Entry).dispetcherQabulQildi ? 'Qabul' : (e as DU46Entry).yuborildi ? 'Kutilmoqda' : 'Yangi'
          ])

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 34,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], fontSize: 7, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [240, 248, 255] },
        })
      } else {
        const tableColumn = ['№', 'Sana', 'Yozuv', 'Imzo', 'Holat']
        const tableRows = shu2Entries
          .filter(e => e.yozuv)
          .map((e, i) => [
            e.nomber || String(i + 1),
            e.sana || '',
            e.yozuv || '',
            (e as SHU2Entry).tasdiqlandi ? ((e as SHU2Entry).tasdiqlaganImzo || (e as SHU2Entry).imzo) : '',
            (e as SHU2Entry).dispetcherQabulQildi ? 'Qabul' : (e as SHU2Entry).yuborildi ? 'Kutilmoqda' : 'Yangi'
          ])

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 34,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [245, 158, 11], fontSize: 7, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [255, 251, 235] },
        })
      }

      doc.save(`${type.toUpperCase()}_${stationName}_${dateStr.replace(/\./g, '-')}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="premium-card overflow-hidden">
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 ${type === 'du46' ? 'bg-sky-50/50' : 'bg-amber-50/50'}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${type === 'du46' ? 'bg-sky-100 text-sky-600' : 'bg-amber-100 text-amber-600'}`}>
            <BookOpen size={20} />
          </div>
          <div>
            <h4 className="font-black text-slate-900 tracking-tight">{type === 'du46' ? 'DU-46' : 'SHU-2'} Jurnali</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stationName} В· {dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yangilangan</p>
            <p className="text-xs font-bold text-slate-600">{journal.updatedBy}</p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 ${type === 'du46' ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
          >
            <Download size={14} /> {downloading ? '...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-6 py-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-sky-400" />
          <span className="text-xs font-bold text-slate-500">Jami yozuvlar: <span className="text-slate-900">{filteredEntries.length}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-bold text-slate-500">Qabul: <span className="text-slate-900">{qabulCount}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-xs font-bold text-slate-500">Yuborildi: <span className="text-slate-900">{yuborildiCount}</span></span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-xs font-bold text-sky-600 hover:text-sky-700 uppercase tracking-widest transition-colors"
        >
          {expanded ? 'Yig\'ish ▲' : `Kengaytish (${filteredEntries.length}) ▼`}
        </button>
      </div>

      {/* Full content when expanded - oylik hisobot kabi to'liq jadval */}
      {expanded && (
        <div className="overflow-x-auto">
          {type === 'du46' ? (
            <table className="w-full text-[10px]" style={{ minWidth: '1000px' }}>
              <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-200">
                <tr>
                  <th className="p-2.5 text-center border-r border-slate-100">№</th>
                  <th className="p-2.5 text-center border-r border-slate-100">Oy/kun</th>
                  <th className="p-2.5 text-center border-r border-slate-100">Soat</th>
                  <th className="p-2.5 text-left border-r border-slate-100">Kamchilik</th>
                  <th className="p-2.5 text-center border-r border-slate-100">Xabar usuli</th>
                  <th className="p-2.5 text-left border-r border-slate-100">Bartaraf info</th>
                  <th className="p-2.5 text-center">Holat</th>
                </tr>
              </thead>
              <tbody>
                {du46Entries.filter(e => e.kamchilik || e.bartarafInfo).map((e, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-50">{e.nomber || i + 1}</td>
                    <td className="p-2.5 text-center text-slate-600 border-r border-slate-50">{e.oyKun1 || '—'}</td>
                    <td className="p-2.5 text-center text-slate-600 border-r border-slate-50">{e.soatMinut1 || '—'}</td>
                    <td className="p-2.5 text-slate-700 border-r border-slate-50 max-w-[250px] whitespace-pre-wrap">{e.kamchilik || '—'}</td>
                    <td className="p-2.5 text-center text-slate-600 border-r border-slate-50">{e.xabarUsuli || '—'}</td>
                    <td className="p-2.5 text-slate-700 max-w-[250px] whitespace-pre-wrap">{e.bartarafInfo || '—'}</td>
                    <td className="p-2.5 text-center">
                      {(e as DU46Entry).dispetcherQabulQildi
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-600 border border-emerald-100">✓ Qabul</span>
                        : (e as DU46Entry).yuborildi
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-600 border border-amber-100">⏳ Kutilmoqda</span>
                          : <span className="text-[8px] font-bold text-slate-300">Yangi</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-[10px]" style={{ minWidth: '800px' }}>
              <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-200">
                <tr>
                  <th className="p-2.5 text-center border-r border-slate-100">№</th>
                  <th className="p-2.5 text-center border-r border-slate-100">Sana</th>
                  <th className="p-2.5 text-left border-r border-slate-100">Yozuv</th>
                  <th className="p-2.5 text-center border-r border-slate-100">Imzo</th>
                  <th className="p-2.5 text-center">Holat</th>
                </tr>
              </thead>
              <tbody>
                {shu2Entries.filter(e => e.yozuv).map((e, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-50">{e.nomber || i + 1}</td>
                    <td className="p-2.5 text-center text-slate-600 border-r border-slate-50">{e.sana || '—'}</td>
                    <td className="p-2.5 text-slate-700 border-r border-slate-50 max-w-[400px] whitespace-pre-wrap">{e.yozuv || '—'}</td>
                    <td className="p-2.5 text-center text-slate-500 border-r border-slate-50">{(e as SHU2Entry).tasdiqlandi ? ((e as SHU2Entry).tasdiqlaganImzo || (e as SHU2Entry).imzo) : '—'}</td>
                    <td className="p-2.5 text-center">
                      {(e as SHU2Entry).dispetcherQabulQildi
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-600 border border-emerald-100">✓ Qabul</span>
                        : (e as SHU2Entry).yuborildi
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-600 border border-amber-100">⏳ Kutilmoqda</span>
                          : <span className="text-[8px] font-bold text-slate-300">Yangi</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filteredEntries.length === 0 && (
            <div className="py-12 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Bu oyda ma'lumot yo'q</div>
          )}
        </div>
      )}

      {/* Collapsed state */}
      {!expanded && (
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-slate-400">To'liq ko'rish uchun <span className="font-bold text-sky-600">"Kengaytish"</span> tugmasini bosing</p>
        </div>
      )}
    </div>
  )
}

function DownloadCard({ title, desc, existingFile, onUpload, onDelete }: {
  title: string
  desc: string
  existingFile?: StationSchema
  onUpload: (file: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [dlMsg, setDlMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setDlMsg({ type: 'err', text: 'Faqat PDF fayllarni yuklash mumkin' })
      setTimeout(() => setDlMsg(null), 3000)
      return
    }

    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (err: unknown) {
      setDlMsg({ type: 'err', text: err instanceof Error ? err.message : 'Xatolik' })
      setTimeout(() => setDlMsg(null), 3000)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="premium-card group relative overflow-hidden p-8 transition-all duration-300 hover:scale-[1.02]">
      <div className="mb-6 rounded-2xl bg-slate-50/80 p-4 w-fit transition-transform duration-300 group-hover:scale-110">
        <Download className="text-cyan-400" size={32} />
      </div>
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{desc}</p>

      {dlMsg && (
        <div className={`mt-4 rounded-xl p-3 text-center text-xs font-bold ${dlMsg.type === 'ok' ? 'badge-success' : 'badge-danger'}`}>
          {dlMsg.text}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {existingFile ? (
          <>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-400">
              <span className="truncate max-w-[150px]">{existingFile.fileName}</span>
              <button
                onClick={() => onDelete(existingFile.id)}
                className="text-red-500 hover:text-red-600 transition-colors"
              >
                O'chirish
              </button>
            </div>
            <button
              onClick={() => window.open(existingFile.filePath, '_blank')}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:scale-105"
            >
              <Eye size={18} />
              Hujjatni Ko'rish
            </button>
          </>
        ) : (
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className={`flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isUploading ? 'Yuklanmoqda...' : 'Hujjatni Yuklash'}
            </div>
          </label>
        )}
      </div>
    </div>
  )
}

function WorkersModal({ workers, onClose, onEdit, onDelete }: {
  workers: User[]
  onClose: () => void
  onEdit: (w: User) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
      <div className="premium-card h-[80vh] w-full max-w-4xl overflow-hidden p-0 animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900">Ishchilar bazasi</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Jami: {workers.length} ta xodim</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-3 text-slate-400 hover:text-slate-900 transition-all duration-200 shadow-sm"><X size={24} /></button>
        </div>

        <div className="h-[calc(80vh-100px)] overflow-y-auto p-8 custom-scrollbar bg-white">
          <div className="grid gap-4">
            {workers.map((w) => (
              <div key={w.id} className="premium-card flex items-center justify-between p-6 transition-all duration-200 hover:shadow-md group">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-black text-white shadow-lg shadow-sky-500/20 transition-transform duration-200 group-hover:scale-110">{w.fullName.charAt(0)}</div>
                  <div>
                    <h4 className="font-black text-slate-900">{w.fullName}</h4>
                    <p className="text-xs font-bold text-slate-500 tracking-tight">{w.login} В· {w.phone || 'Tel kiritilmagan'} В· {w.role === 'worker' ? 'Mexanik' : 'Boshliq'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(w)} className="rounded-xl bg-slate-50 p-3 text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all duration-200 border border-transparent hover:border-sky-100 shadow-sm"><Edit size={20} /></button>
                  <button onClick={() => onDelete(w.id)} className="rounded-xl bg-red-50 p-3 text-red-500 hover:text-red-700 hover:bg-red-100 transition-all duration-200 border border-transparent hover:border-red-100 shadow-sm"><Trash2 size={20} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="premium-card flex h-48 items-center justify-center text-slate-300 text-xs font-black uppercase tracking-widest">{label}</div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUGUNGI ISHLAR MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function TodayTasksModal({ type, tasks, onClose }: {
  type: 'bajarilgan' | 'bajarilmagan'
  tasks: { stationId: string; stationName: string; workerName: string; entry: ReportEntry; bajarilgan: boolean; month: string }[]
  onClose: () => void
}) {
  const isBajarilgan = type === 'bajarilgan'
  const [expandedStation, setExpandedStation] = useState<string | null>(null)

  // Bekatlar bo'yicha guruhlab olish
  const grouped = useMemo(() => {
    const map: Record<string, { stationName: string; workerName: string; items: typeof tasks }> = {}
    tasks.forEach(t => {
      if (!map[t.stationId]) map[t.stationId] = { stationName: t.stationName, workerName: t.workerName, items: [] }
      map[t.stationId].items.push(t)
    })
    return map
  }, [tasks])

  const stationEntries = Object.entries(grouped)

  const todayDate = new Date()
  const todayFormatted = `${String(todayDate.getDate()).padStart(2, '0')}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${todayDate.getFullYear()}`

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl animate-scale-in">
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-6 sm:px-8 py-5 sm:py-6 ${isBajarilgan
            ? 'border-emerald-100 bg-emerald-50/50'
            : 'border-red-100 bg-red-50/50'
          }`}>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {isBajarilgan ? 'Bugun bajarilgan ishlar' : 'Bugun bajarilmagan ishlar'}
            </h3>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {todayFormatted} · {tasks.length} ta ish · {stationEntries.length} ta bekat
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-2.5 sm:p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
          {tasks.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isBajarilgan ? 'bg-emerald-50 text-emerald-400' : 'bg-slate-100 text-slate-300'
                  }`}>
                  {isBajarilgan ? <CheckCircle2 size={32} /> : <Clock size={32} />}
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  {isBajarilgan ? 'Bugun hali bajarilgan ish yo\'q' : 'Barcha ishlar bajarilgan!'}
                </p>
              </div>
            </div>
          ) : expandedStation === null ? (
            /* ─── 1-BOSQICH: BEKATLAR RO'YXATI ─── */
            <div className="p-4 sm:p-6 space-y-2">
              {stationEntries.map(([stationId, { stationName, workerName, items }]) => (
                <button
                  key={stationId}
                  onClick={() => setExpandedStation(stationId)}
                  className={`w-full flex items-center justify-between rounded-2xl border p-4 sm:p-5 transition-all hover:shadow-md active:scale-[0.98] group ${
                    isBajarilgan
                      ? 'border-emerald-100 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                      : 'border-red-100 bg-white hover:border-red-300 hover:bg-red-50/30'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl text-sm sm:text-base font-black shadow-sm ${
                      isBajarilgan
                        ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                        : 'bg-red-100 text-red-600 border border-red-200'
                    }`}>
                      +{items.length}
                    </div>
                    <div className="text-left min-w-0">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">{stationName}</h4>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 truncate">{workerName}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            /* ─── 2-BOSQICH: TANLANGAN BEKATNING ISHLARI ─── */
            <div>
              {/* Orqaga tugma */}
              <div className={`sticky top-0 z-10 flex items-center gap-3 border-b px-4 sm:px-6 py-3 ${
                isBajarilgan ? 'border-emerald-100 bg-emerald-50/80' : 'border-red-100 bg-red-50/80'
              } backdrop-blur-sm`}>
                <button
                  onClick={() => setExpandedStation(null)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/80 border border-slate-200/60 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Bekatlar</span>
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                    isBajarilgan ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {grouped[expandedStation]?.items.length}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-900 truncate">{grouped[expandedStation]?.stationName}</h4>
                    <p className="text-[9px] font-bold text-slate-400 truncate">{grouped[expandedStation]?.workerName}</p>
                  </div>
                </div>
              </div>

              {/* Ishlar ro'yxati */}
              <div className="p-3 sm:p-5 space-y-2.5">
                {grouped[expandedStation]?.items.map((task, ti) => {
                  const text = task.entry.haftalikJadval || task.entry.yillikJadval || task.entry.yangiIshlar || task.entry.kmoBartaraf || task.entry.majburiyOzgarish || ''
                  let dateFormatted = task.entry.ragat
                  if (task.entry.ragat && task.month && task.month.includes('-')) {
                    const [yyyy, mm] = task.month.split('-')
                    dateFormatted = `${String(task.entry.ragat.trim()).padStart(2, '0')}.${mm}.${yyyy}`
                  }

                  return (
                    <div key={ti} className={`rounded-xl border p-3 sm:p-4 transition-colors ${
                      isBajarilgan ? 'border-emerald-100 bg-white hover:bg-emerald-50/20' : 'border-red-100 bg-white hover:bg-red-50/20'
                    }`}>
                      {/* Mobilda: sana tepada kichik, mazmun pastda katta */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wide border ${
                          isBajarilgan
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {isBajarilgan ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {isBajarilgan ? dateFormatted : `${dateFormatted} gacha`}
                        </span>
                        {isBajarilgan && task.entry.bajarildiShn && (
                          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-500 truncate">
                            ✓ {task.entry.bajarildiShn}
                          </span>
                        )}
                      </div>
                      {/* Ish mazmuni — mobilda kattaroq */}
                      <p className="text-xs sm:text-[13px] font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</p>
                      {!isBajarilgan && (
                        <p className="mt-2 flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-red-400">
                          <Clock size={10} /> Muddati o'tgan — bajarilmagan
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

