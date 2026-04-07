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
  signOut
} from '@/lib/supabase-db'
import type { User, WorkReport, PremiyaReport, StationSchema, JournalType, ReportEntry } from '@/types'
import { MONTHS } from '@/lib/constants'
import { JournalSelectModal, DU46JournalView, SHU2JournalView } from '@/components/JournalView'
import {
  LogOut,
  Plus,
  Users,
  MapPin,
  FileText,
  Award,
  ChevronRight,
  CheckCircle2,
  Clock,
  X,
  Edit,
  Trash2,
  Download,
  Eye,
  Menu,
  BookOpen,
  MapIcon
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

  const [loading, setLoading] = useState(true)
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [selectedReportType, setSelectedReportType] = useState<'oylik' | 'premiya' | 'sxemalar' | 'jurnallar' | null>(null)
  const [showMobileStations, setShowMobileStations] = useState(false)
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [showWorkersModal, setShowWorkersModal] = useState(false)
  const [activeJournalType, setActiveJournalType] = useState<JournalType | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

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

  const refreshData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      loadWorkers(),
      loadWorkReports(),
      loadPremiyaReports(),
      loadGraphics()
    ])
    setLoading(false)
  }, [loadWorkers, loadWorkReports, loadPremiyaReports, loadGraphics])

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
      .subscribe()

    const premiyaReportsChannel = supabase
      .channel('dispatcher_premiya_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'premiya_reports' }, () => {
        console.log('🚀 Realtime: Yangi premiya!')
        loadPremiyaReports()
      })
      .subscribe()

    const journalsChannel = supabase
      .channel('dispatcher_journals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'station_journals' }, () => {
        console.log('🚀 Realtime: Jurnal yangilandi!')
        // Dispatchers don't actively rely on journaling on this level apart from possible side-effects. 
        // Component child instances refresh themselves, so no global refresh needed.
      })
      .subscribe()

    return () => {
      supabase.removeChannel(workReportsChannel)
      supabase.removeChannel(premiyaReportsChannel)
      supabase.removeChannel(journalsChannel)
    }
  }, [loadWorkReports, loadPremiyaReports])

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

  const totalPending = useMemo(() => {
    return Object.values(pendingCounts).reduce((a, b) => a + b, 0) +
      Object.values(premiyaPendingCounts).reduce((a, b) => a + b, 0)
  }, [pendingCounts, premiyaPendingCounts])

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
      await confirmReportEntry(reportId, entryIndex, session.fullName)
      refreshData()
    } catch (err: unknown) {
      setFormMsg({
        type: 'err',
        text: err instanceof Error ? err.message : "Xatolik yuz berdi"
      })
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
    <div className="flex min-h-screen items-center justify-center bg-[#06111f]">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500" />
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06111f] text-white selection:bg-cyan-500/30">
      {/* Premium Background */}
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
              <div className="hidden sm:block">
                <h1 className="text-xl font-black uppercase tracking-tighter text-white">SMART SHCH</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 sm:flex">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                <span className="text-sm font-medium text-white/70">Aloqa dispetcheri</span>
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
          {/* Dashboard Stats */}
          <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={<MapPin className="text-cyan-400" />} label="Bekatlar" value={stations.length} />
            <StatCard
              icon={<Users className="text-blue-400" />}
              label="Ishchilar"
              value={workers.length}
              onClick={() => setShowWorkersModal(true)}
              clickable
            />
            <StatCard icon={<Clock className="text-amber-400" />} label="Kutilmoqda" value={totalPending} active={totalPending > 0} />
            <StatCard icon={<CheckCircle2 className="text-emerald-400" />} label="Tasdiqlangan" value={allReports.filter(r => r.confirmedAt).length} />
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-[20px] bg-white/5 p-1.5 backdrop-blur-md border border-white/5">
              <TabButton active={tab === 'bekatlar'} onClick={() => setTab('bekatlar')} label="Bekatlar" icon={<MapPin size={18} />} />
              <TabButton active={tab === 'arxiv'} onClick={() => setTab('arxiv')} label="Arxiv" icon={<FileText size={18} />} />
              <TabButton active={tab === 'grafiklar'} onClick={() => setTab('grafiklar')} label="Grafiklar" icon={<Download size={18} />} />
            </div>

            <button
              onClick={() => setShowAddWorker(!showAddWorker)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 font-bold shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02] active:scale-95"
            >
              <Plus size={20} />
              <span>Xodim qo'shish</span>
            </button>
          </div>

          {showAddWorker && (
            <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
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
              <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
                {/* Station Selection Sidebar */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/30">Bekatni tanlang</h3>
                    <button onClick={() => setShowMobileStations(!showMobileStations)} className="lg:hidden text-cyan-400">
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
                      const count = (pendingCounts[st.id] || 0) + (premiyaPendingCounts[st.id] || 0)
                      const isSelected = selectedStation === st.id
                      return (
                        <button
                          key={st.id}
                          onClick={() => { setSelectedStation(st.id); setSelectedReportType(null); setShowMobileStations(false) }}
                          className={`relative flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${isSelected
                            ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                            : 'border-white/5 bg-white/5 text-white/40 hover:border-white/10 hover:text-white/70'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 shrink-0 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-white/20'}`} />
                            <span className="font-bold">{st.name}</span>
                          </div>
                          {count > 0 && (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-500 text-[10px] font-black">{count}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Report Content */}
                <div className="min-w-0 flex-1">
                  {!selectedStation ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-[32px] border border-white/5 bg-white/5 p-12 text-center backdrop-blur-sm">
                      <div className="mb-6 rounded-full bg-white/5 p-8">
                        <MapPin size={48} className="text-white/20" />
                      </div>
                      <h2 className="text-2xl font-black text-white/80">Bekat tanlanmagan</h2>
                      <p className="mt-2 max-w-sm text-white/40">Ish jarayonini nazorat qilish uchun ro'yxatdan bekatni tanlang.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                        <div>
                          <h2 className="text-2xl font-black text-white">{stations.find(s => s.id === selectedStation)?.name}</h2>
                          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-cyan-400/60">
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
                          />
                        )}
                        {selectedReportType === 'jurnallar' && activeJournalType === 'du46' && (
                          <DU46JournalView
                            stationId={selectedStation}
                            stationName={stations.find(s => s.id === selectedStation)?.name || ''}
                            userName={session?.fullName || ''}
                            userRole="dispatcher"
                            onClose={() => { setActiveJournalType(null); setSelectedReportType(null) }}
                          />
                        )}
                        {selectedReportType === 'jurnallar' && activeJournalType === 'shu2' && (
                          <SHU2JournalView
                            stationId={selectedStation}
                            stationName={stations.find(s => s.id === selectedStation)?.name || ''}
                            userName={session?.fullName || ''}
                            userRole="dispatcher"
                            onClose={() => { setActiveJournalType(null); setSelectedReportType(null) }}
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
          stations={stations}
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
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#06111f] p-8 shadow-2xl">
            <h3 className="text-lg font-black text-white">Ishchini o'chirish</h3>
            <p className="mt-2 text-sm text-white/40">Haqiqatdan ham ishchini o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.</p>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white/60 hover:bg-white/10">Bekor qilish</button>
              <button onClick={confirmDeleteWorker} className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600">O'chirish</button>
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
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        @media print {
          .print\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function StatCard({ icon, label, value, active, clickable, onClick }: {
  icon: React.ReactNode,
  label: string,
  value: string | number,
  active?: boolean,
  clickable?: boolean,
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`relative group overflow-hidden rounded-[28px] border border-white/5 bg-white/5 p-6 backdrop-blur-md transition-all ${clickable ? 'cursor-pointer hover:border-white/20 hover:scale-[1.02]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="rounded-2xl bg-white/5 p-3 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {active && <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />}
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</p>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-[14px] px-6 py-3 text-sm font-bold transition-all ${active
        ? 'bg-white/10 text-white shadow-xl border border-white/10'
        : 'text-white/40 hover:text-white/60'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function ReportTypeBtn({ active, icon, label, onClick, count, color = 'cyan' }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void, count?: number, color?: 'cyan' | 'amber' | 'blue' }) {
  const colorMap: Record<string, string> = {
    cyan: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20',
    amber: 'border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20',
    blue: 'border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20',
  }
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold transition-all active:scale-95 ${active ? colorMap[color] : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
        }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">{count}</span>}
    </button>
  )
}

function BigActionCard({ title, desc, icon, onClick, count, color = 'cyan' }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void, count?: number, color?: 'cyan' | 'amber' | 'blue' | 'emerald' }) {
  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-500/20 shadow-cyan-500/5 hover:border-cyan-500/30 text-cyan-400',
    amber: 'from-amber-500/20 shadow-amber-500/5 hover:border-amber-500/30 text-amber-400',
    blue: 'from-blue-500/20 shadow-blue-500/5 hover:border-blue-500/30 text-blue-400',
    emerald: 'from-emerald-500/20 shadow-emerald-500/5 hover:border-emerald-500/30 text-emerald-400',
  }
  return (
    <button
      onClick={onClick}
      className={`relative group flex flex-col items-start p-8 rounded-[32px] border border-white/5 bg-gradient-to-br to-transparent transition-all hover:scale-[1.02] active:scale-[0.98] text-left ${colorMap[color]}`}
    >
      <div className="rounded-2xl bg-white/5 p-4 mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/40 leading-relaxed">{desc}</p>
      {count !== undefined && count > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-1 text-[10px] font-black text-red-400">
          <Clock size={12} />
          {count} ta kutuvda
        </div>
      )}
    </button>
  )
}

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
    <form onSubmit={onSubmit} className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">{isEdit ? 'Xodimni tahrirlash' : 'Yangi xodim qo\'shish'}</h2>
          <p className="text-sm text-white/40">Tizimga kirish uchun login va bekatlarni biriktiring.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-xl p-2 text-white/30 hover:bg-white/10">
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
            <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-white/30">Lavozimi</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, role: 'worker' })} className={`flex-1 rounded-2xl py-4 text-xs font-bold border transition-all ${form.role === 'worker' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/5 text-white/40'}`}>Katta Elektromexanik</button>
              <button type="button" onClick={() => setForm({ ...form, role: 'bekat_boshlighi' })} className={`flex-1 rounded-2xl py-4 text-xs font-bold border transition-all ${form.role === 'bekat_boshlighi' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/5 text-white/40'}`}>Bekat Boshlig'i</button>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] bg-white/5 p-6 border border-white/5">
          <label className="mb-4 block text-[10px] font-black uppercase tracking-widest text-white/30">Bekatlarni biriktirish ({form.stationIds.length})</label>
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
                className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold border transition-all ${form.stationIds.includes(s.id) ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:border-white/10'}`}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${form.stationIds.includes(s.id) ? 'bg-cyan-400' : 'bg-transparent'}`} />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {message && (
        <div className={`mt-8 rounded-2xl p-4 text-center text-sm font-bold ${message.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.text}
        </div>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <button type="submit" className="rounded-2xl bg-white px-10 py-4 text-sm font-black text-slate-900 shadow-xl transition hover:scale-[1.02] active:scale-95">
          {isEdit ? 'Yangilash' : 'Xodimni qo\'shish'}
        </button>
      </div>
    </form>
  )
}

function FormGroup({ label, value, onChange, placeholder, type = 'text' }: { label: string, value: string, onChange: (val: string) => void, placeholder: string, type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-white/30">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-white placeholder-white/20 outline-none transition focus:border-cyan-500/50 focus:bg-white/10"
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

function ReportCard({ report, onConfirm, onConfirmRow }: {
  report: WorkReport
  onConfirm: () => void
  onConfirmRow: (idx: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isPending = !report.confirmedAt && report.entries.some((e) => (e.haftalikJadval || e.yillikJadval) && !e.adImzosi)

  return (
    <div className={`overflow-hidden rounded-[28px] border border-white/10 bg-white/5 transition-all ${expanded ? 'ring-2 ring-cyan-500/20' : 'hover:bg-white/8'}`}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex cursor-pointer items-center justify-between p-6"
      >
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isPending ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {isPending ? <Clock size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{report.workerName}</h3>
            <p className="mt-1 text-[10px] font-bold text-white/30 uppercase tracking-widest">
              {new Date(report.submittedAt).toLocaleDateString('uz-UZ')} · {report.month}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ChevronRight className={`text-white/20 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-6 pt-2">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-white/40">Ishchi: <span className="font-bold text-white/60">{report.workerName}</span></span>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const printWindow = window.open('', '_blank')
                  if (!printWindow) return
                  printWindow.document.write(`
                    <html><head><title>${report.workerName} — ${report.month}</title>
                    <style>
                      body { font-family: sans-serif; font-size: 11px; color: #000; margin: 20px; }
                      h2 { font-size: 14px; margin-bottom: 4px; }
                      p { margin: 2px 0 12px; color: #555; }
                      table { width: 100%; border-collapse: collapse; }
                      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 10px; }
                      thead th { background: #f0f0f0; font-weight: bold; text-align: center; }
                      tr:nth-child(even) { background: #fafafa; }
                    </style></head><body>
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
                        ${report.entries.filter((e: ReportEntry) => e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish).map((e: ReportEntry) => `
                          <tr>
                            <td style="text-align:center">${e.ragat}</td>
                            <td>${e.haftalikJadval || ''}</td>
                            <td>${e.yillikJadval || ''}</td>
                            <td>${e.yangiIshlar || ''}</td>
                            <td>${e.kmoBartaraf || ''}</td>
                            <td>${e.majburiyOzgarish || ''}</td>
                            <td style="text-align:center">${e.bajarildiShn || ''}</td>
                            <td style="text-align:center">${e.bajarildiImzo || ''}</td>
                            <td style="text-align:center">${e.adImzosi || 'Kutilmoqda'}</td>
                          </tr>`).join('')}
                      </tbody>
                    </table>
                    </body></html>
                  `)
                  printWindow.document.close()
                  printWindow.print()
                }}
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/60 hover:text-white"
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 relative">
            <div className="sm:hidden absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 z-10 rounded-bl-lg font-bold">
              O&apos;ngga suring →
            </div>
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full border-collapse text-left text-[11px] text-white/80">
                <thead className="border-b-2 border-cyan-500/50 bg-[#0b1728] font-bold text-white/70">
                  <tr>
                    <th rowSpan={2} className="w-8 border-r border-white/10 p-1.5 text-center text-[10px]">№</th>
                    <th rowSpan={2} className="w-[16%] border-r border-white/10 p-1.5 text-center text-[10px]">4-haftalik<br /><span className="font-normal text-white/40">jadval</span></th>
                    <th rowSpan={2} className="w-[16%] border-r border-white/10 p-1.5 text-center text-[10px]">Yillik<br /><span className="font-normal text-white/40">jadval</span></th>
                    <th rowSpan={2} className="w-[12%] border-r border-white/10 p-1.5 text-[10px]">Yangi<br /><span className="font-normal text-white/40">ishlar</span></th>
                    <th rowSpan={2} className="w-[12%] border-r border-white/10 p-1.5 text-[10px]">KMO<br /><span className="font-normal text-white/40">bartaraf</span></th>
                    <th rowSpan={2} className="w-[12%] border-r border-white/10 p-1.5 text-[10px]">Majburiy<br /><span className="font-normal text-white/40">o&apos;zgartirish</span></th>
                    <th colSpan={2} className="border-r border-white/10 p-1.5 text-center text-[10px]">Bajarilgan</th>
                    <th rowSpan={2} className="bg-amber-500/10 p-1.5 text-center text-[10px]">AD<br />imzo</th>
                  </tr>
                  <tr className="bg-[#0b1728]/30">
                    <th className="border-r border-t border-white/10 p-1.5 text-center text-[10px] text-cyan-300">Shn</th>
                    <th className="border-r border-t border-white/10 p-1.5 text-center text-[10px] text-cyan-300">Imzo</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entries.filter((e: ReportEntry) => e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish).map((e: ReportEntry, idx: number) => (
                    <tr key={idx} className="group border-b border-white/10 hover:bg-[#0b1728]">
                      <td className="border-r border-white/10 p-1.5 text-center font-bold text-cyan-400/50">{e.ragat}</td>
                      <td className="border-r border-white/10 p-1.5 align-top whitespace-pre-wrap">{e.haftalikJadval || '—'}</td>
                      <td className="border-r border-white/10 p-1.5 align-top whitespace-pre-wrap">{e.yillikJadval || '—'}</td>
                      <td className="border-r border-white/10 p-1.5 align-top whitespace-pre-wrap">{e.yangiIshlar || '—'}</td>
                      <td className="border-r border-white/10 p-1.5 align-top whitespace-pre-wrap">{e.kmoBartaraf || '—'}</td>
                      <td className="border-r border-white/10 p-1.5 align-top whitespace-pre-wrap">{e.majburiyOzgarish || '—'}</td>
                      <td className="border-r border-white/10 p-1.5 text-center align-middle text-[10px] font-medium text-cyan-300">{e.bajarildiShn || '—'}</td>
                      <td className="border-r border-white/10 p-1.5 text-center align-middle text-[10px] italic text-cyan-300/80">{e.bajarildiImzo || '—'}</td>
                      <td className="p-1.5 text-center align-middle">
                        {e.adImzosi ? (
                          <div className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500/10 py-1.5 border border-emerald-500/20 text-emerald-400">
                            <CheckCircle2 size={10} />
                            <span className="text-[9px] font-bold">{e.adImzosi}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onConfirmRow(idx)}
                            className="w-full rounded-lg bg-white/5 py-1.5 text-[9px] font-bold text-white/40 hover:bg-cyan-500 hover:text-white transition-all"
                          >
                            Tasdiqlash
                          </button>
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
    </div>
  )
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
    <div className={`overflow-hidden rounded-[28px] border border-white/10 bg-white/5 transition-all ${expanded ? 'ring-2 ring-amber-500/20' : 'hover:bg-white/8'}`}>
      <div onClick={() => setExpanded(!expanded)} className="flex cursor-pointer items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isPending ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <Award size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{report.workerName} · Premiya</h3>
            <p className="mt-1 text-[10px] font-bold text-white/30 uppercase tracking-widest">{report.month}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isPending && <span className="rounded-lg bg-amber-500/20 px-3 py-1 text-[10px] font-black text-amber-400">KUTUVDA</span>}
          <ChevronRight className={`text-white/20 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-6 pt-2">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-white/40">{isPending ? 'Ro\'yxatni tekshirib tasdiqlang.' : `Tasdiqlangan: ${report.confirmedAt}`}</span>
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
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-white hover:bg-white/10 transition-colors"
              >
                <Download size={14} />
                Yuklab olish
              </button>
              {isPending && (
                <button
                  onClick={(e) => { e.stopPropagation(); onConfirm() }}
                  className="rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-black text-slate-900 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  Ro'yxatni Qabul Qilish
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
                <tr>
                  <th className="p-4 text-center w-12">№</th>
                  <th className="p-4">I.SH.</th>
                  <th className="p-4">Lavozimi</th>
                  <th className="p-4 text-center">Tabel №</th>
                  <th className="p-4 text-center">Rag&apos;bat. %</th>
                  <th className="p-4">Eslatma</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {report.entries.map((e, idx: number) => (
                  <tr key={idx} className="border-b border-white/5 last:border-0">
                    <td className="p-4 text-center text-white/30 font-bold">{idx + 1}</td>
                    <td className="p-4 font-bold">{e.ish}</td>
                    <td className="p-4 text-white/50">{e.lavozim}</td>
                    <td className="p-4 text-center text-white/50">{e.tabelNomeri}</td>
                    <td className="p-4 text-center font-black text-amber-400">{e.foiz}%</td>
                    <td className="p-4 text-white/40">{e.eslatma}</td>
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

  if (loading) return <div className="p-8 text-center text-white/20">Yuklanmoqda...</div>

  return (
    <div className="space-y-6">
      {schemaMsg && (
        <div className={`rounded-2xl p-4 text-center text-sm font-bold ${schemaMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {schemaMsg.text}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/30">Bekat xaritalari</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10">
          <Plus size={16} />
          {showForm ? 'Bekor qilish' : 'Sxema yuklash'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="grid items-end gap-4 rounded-3xl border border-white/5 bg-white/3 p-6 sm:grid-cols-[1fr_1fr_auto]">
          <FormGroup label="Sxema nomi" value={newName} onChange={setNewName} placeholder="Bir ipli sxema" />
          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-white/30">Fayl (PDF)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setNewFile(e.target.files?.[0] || null)} className="w-full text-xs text-white/40 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white" />
          </div>
          <button disabled={uploading} type="submit" className="rounded-2xl bg-cyan-500 px-8 py-4 text-xs font-black text-white hover:opacity-90 disabled:opacity-50">
            {uploading ? 'Yuklanmoqda...' : 'SAQLASH'}
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {schemas.map(s => (
          <div key={s.id} className="flex items-center justify-between rounded-[24px] border border-white/5 bg-white/3 p-5 transition-all hover:border-white/10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400"><MapPin size={24} /></div>
              <div>
                <h4 className="text-sm font-black text-white">{s.schemaType}</h4>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{s.fileName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview(s.filePath)} className="rounded-xl bg-white/5 p-2.5 text-white/60 hover:text-white transition-all"><Eye size={18} /></button>
              <button onClick={() => handleDelete(s.id)} className="rounded-xl bg-red-500/5 p-2.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {schemas.length === 0 && <div className="col-span-full py-12 text-center text-white/20">Hali sxemalar yuklanmagan.</div>}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="h-full w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#06111f]">
            <div className="flex items-center justify-between border-b border-white/10 px-8 py-4">
              <h3 className="text-lg font-black text-white">Sxema: {schemas.find(s => s.filePath === preview)?.schemaType}</h3>
              <button onClick={() => setPreview(null)} className="rounded-xl border border-white/10 p-2 text-white/40 hover:text-white"><X size={24} /></button>
            </div>
            <iframe src={preview} className="h-[calc(100%-80px)] w-full" />
          </div>
        </div>
      )}

      {/* Sxema o'chirish tasdiqlash modali */}
      {deleteSchemaConfirmId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#06111f] p-8 shadow-2xl">
            <h3 className="text-lg font-black text-white">Sxemani o'chirish</h3>
            <p className="mt-2 text-sm text-white/40">Haqiqatdan ham sxemani o'chirishni xohlaysizmi?</p>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setDeleteSchemaConfirmId(null)} className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white/60 hover:bg-white/10">Bekor qilish</button>
              <button onClick={confirmSchemaDelete} className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600">O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ArchiveView({ stations, allReports, onConfirm, onConfirmEntry }: {
  stations: { id: string; name: string }[]
  allReports: WorkReport[]
  onConfirm: (reportId: string) => void
  onConfirmEntry: (reportId: string, idx: number) => void
}) {
  const [selStation, setSelStation] = useState<string | null>(null)
  const [selYear, setSelYear] = useState('2026')
  const [selMonth, setSelMonth] = useState<number | null>(null)

  const archiveReports = selStation && selMonth !== null
    ? allReports.filter((r) => r.stationId === selStation && r.month === `${selYear}-${String(selMonth + 1).padStart(2, '0')}`)
    : []

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/30">Arxiv Bekatlari</h3>
        <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {stations.map((st) => (
            <button key={st.id} onClick={() => setSelStation(st.id)} className={`rounded-2xl border p-4 text-left transition-all ${selStation === st.id ? 'bg-amber-500/10 border-amber-500/50 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'}`}>
              <span className="font-bold">{st.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        {selStation ? (
          <>
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-white">{stations.find((s: any) => s.id === selStation)?.name} Arxiv</h2>
              <div className="mt-6 flex flex-wrap gap-2">
                {Array.from({ length: Math.max(3, new Date().getFullYear() - 2026 + 3) }, (_, i) => 2026 + i).map(y => (
                  <button key={y} onClick={() => setSelYear(y.toString())} className={`rounded-xl px-6 py-2 text-xs font-black ${selYear === y.toString() ? 'bg-white text-slate-900' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>{y} yil</button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {MONTHS.map((m, i) => {
                  const has = allReports.some((r) => r.stationId === selStation && r.month === `${selYear}-${String(i + 1).padStart(2, '0')}`)
                  return (
                    <button key={i} onClick={() => setSelMonth(i)} className={`rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${selMonth === i ? 'bg-amber-500 text-slate-900 shadow-xl' : has ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-white/5 border border-white/5 text-white/20'}`}>{m}</button>
                  )
                })}
              </div>
            </div>

            <div className="min-h-[300px]">
              {selMonth !== null ? (
                <div className="space-y-4">
                  {archiveReports.length === 0 ? <EmptyState label="Archive bo'sh" /> : archiveReports.map((r) => (
                    <ReportCard key={r.id} report={r} onConfirm={() => onConfirm(r.id)} onConfirmRow={(idx: number) => onConfirmEntry(r.id, idx)} />
                  ))}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-[32px] border border-dashed border-white/10 text-white/20 text-sm font-black uppercase tracking-widest">Oyni tanlang</div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-96 items-center justify-center rounded-[32px] border border-dashed border-white/10 text-white/20 text-sm font-black uppercase tracking-widest">Bekat tanlang</div>
        )}
      </div>
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
    <div className="group relative overflow-hidden rounded-[32px] border border-white/5 bg-white/5 p-8 backdrop-blur-xl transition-all hover:scale-[1.02]">
      <div className="mb-6 rounded-2xl bg-white/5 p-4 w-fit group-hover:scale-110 transition-transform">
        <Download className="text-cyan-400" size={32} />
      </div>
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/40">{desc}</p>

      {dlMsg && (
        <div className={`mt-4 rounded-2xl p-3 text-center text-xs font-bold ${dlMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {dlMsg.text}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {existingFile ? (
          <>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-2 text-[10px] font-bold text-white/40">
              <span className="truncate max-w-[150px]">{existingFile.fileName}</span>
              <button
                onClick={() => onDelete(existingFile.id)}
                className="text-red-400 hover:text-red-300"
              >
                O'chirish
              </button>
            </div>
            <button
              onClick={() => window.open(existingFile.filePath, '_blank')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
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
            <div className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 py-4 text-xs font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isUploading ? 'Yuklanmoqda...' : 'Hujjatni Yuklash'}
            </div>
          </label>
        )}
      </div>
    </div>
  )
}

function WorkersModal({ workers, stations, onClose, onEdit, onDelete }: {
  workers: User[]
  stations: { id: string; name: string }[]
  onClose: () => void
  onEdit: (w: User) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="h-[80vh] w-full max-w-4xl overflow-hidden rounded-[40px] border border-white/10 bg-[#06111f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
          <div>
            <h3 className="text-xl font-black text-white">Ishchilar bazasi</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30">Jami: {workers.length} ta xodim</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/5 p-3 text-white/40 hover:text-white"><X size={24} /></button>
        </div>

        <div className="h-[calc(80vh-100px)] overflow-y-auto p-8 custom-scrollbar">
          <div className="grid gap-4">
            {workers.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm hover:border-white/10">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-lg font-black text-white">{w.fullName.charAt(0)}</div>
                  <div>
                    <h4 className="font-black text-white">{w.fullName}</h4>
                    <p className="text-xs font-bold text-white/30 tracking-tight">{w.login} · {w.phone || 'Tel kiritilmagan'} · {w.role === 'worker' ? 'Mexanik' : 'Boshliq'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(w)} className="rounded-xl bg-white/5 p-3 text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"><Edit size={20} /></button>
                  <button onClick={() => onDelete(w.id)} className="rounded-xl bg-red-500/5 p-3 text-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={20} /></button>
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
    <div className="flex h-48 items-center justify-center rounded-[32px] border border-dashed border-white/10 text-white/20 text-xs font-black uppercase tracking-widest">{label}</div>
  )
}