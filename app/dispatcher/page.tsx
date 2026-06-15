/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'

import {
  getStations,
} from '@/lib/store'
import {
  getWorkers,
  addWorker,
  updateWorker,
  deleteWorker,
  getAllReports,
  getIncidents,
  getReadIncidentIds,
  confirmReport,
  confirmReportEntry,
  getGlobalGraphics,
  uploadGlobalGraphicFile,
  deleteGlobalGraphicFile,
  getDispatcherJournalSummary,
  getPendingJournalCounts,
} from '@/lib/supabase-db'
import { useSessionGuard, useToast, useRealtimeSubscription, useHardwareBack } from '@/lib/hooks'
import { ToastContainer } from '@/components/ToastContainer'
import type { User, Role, JournalType, ReportEntry } from '@/types'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import { JournalSelectModal, JournalMonthSelectModal } from '@/components/JournalView'
import dynamic from 'next/dynamic'

// Heavy components are lazy loaded to improve initial load speed
const DU46JournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.DU46JournalView), { ssr: false })
const SHU2JournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.SHU2JournalView), { ssr: false })
const ALSNJournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.ALSNJournalView), { ssr: false })
const YerlatgichJournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.YerlatgichJournalView), { ssr: false })
const AlsnKodJournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.AlsnKodJournalView), { ssr: false })
const MpsFriksionJournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.MpsFriksionJournalView), { ssr: false })
import {
  LogOut,
  Plus,
  Users,
  MapPin,
  FileText,
  CheckCircle2,
  Download,
  Menu,
  BookOpen,
  Map as MapIcon,
  AlertTriangle
} from 'lucide-react'

import { StatCard, TabButton, BigActionCard, WorkerForm, ReportList, SchemasView, ArchiveView, DownloadCard, WorkersModal, TodayTasksModal } from './components'
import { LibraryView } from '@/components/library/LibraryView'
import IncidentsView from '@/components/worker/IncidentsView'

type Tab = 'bekatlar' | 'arxiv' | 'grafiklar' | 'baxtsiz_hodisalar' | 'kutubxona'

type _WorkerEditData = {
  fullName: string
  login: string
  password?: string
  phone: string
  role: Role
  stationIds: string[]
}

export default function DispatcherPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard('dispatcher')
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('bekatlar')

  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [selectedReportType, setSelectedReportType] = useState<'oylik' | 'baxtsiz_hodisa' | 'sxemalar' | 'jurnallar' | null>(null)
  const [showMobileStations, setShowMobileStations] = useState(false)
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [showWorkersModal, setShowWorkersModal] = useState(false)
  const [activeJournalType, setActiveJournalType] = useState<JournalType | null>(null)
  const [activeJournalMonth, setActiveJournalMonth] = useState<string>('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [todayModal, setTodayModal] = useState<'bugunReja' | 'qolibKetgan' | 'sababliBajarilmagan' | null>(null)

  const isSubViewActive = selectedStation !== null || showAddWorker || showWorkersModal || activeJournalType !== null || todayModal !== null || selectedReportType !== null;
  const handleHardwareBack = useCallback(() => {
    if (activeJournalType !== null) {
      setActiveJournalType(null)
    } else if (todayModal !== null) {
      setTodayModal(null)
    } else if (showWorkersModal) {
      setShowWorkersModal(false)
    } else if (showAddWorker) {
      setShowAddWorker(false)
    } else if (selectedReportType !== null) {
      setSelectedReportType(null)
    } else if (selectedStation !== null) {
      setSelectedStation(null)
    }
  }, [activeJournalType, todayModal, showWorkersModal, showAddWorker, selectedReportType, selectedStation])

  useHardwareBack(isSubViewActive, handleHardwareBack)

  const [form, setForm] = useState<{
    fullName: string;
    login: string;
    password?: string;
    phone: string;
    role: Exclude<Role, 'dispatcher'>;
    stationIds: string[];
  }>({
    fullName: '',
    login: '',
    password: '',
    phone: '',
    role: 'worker',
    stationIds: [],
  })
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null)
  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const stations = getStations()

  const { data: workers = [], mutate: mutateWorkers } = useSWR(session ? 'dispatcher_workers' : null, async () => {
    const w = await getWorkers()
    return w.filter(user => user.role !== 'dispatcher')
  })
  const { data: allReports = [], mutate: mutateReports } = useSWR(session ? 'dispatcher_reports' : null, getAllReports)
  const { data: allIncidents = [], mutate: mutateIncidents } = useSWR(session ? 'dispatcher_incidents' : null, getIncidents)
  const { data: globalGraphics = [], mutate: mutateGraphics } = useSWR(session ? 'dispatcher_graphics' : null, getGlobalGraphics)
  const { data: journalSummary = {}, mutate: mutateJournalSummary } = useSWR(session ? 'dispatcher_journals' : null, getDispatcherJournalSummary)

  const { data: readIncidentIdsData, mutate: mutateReadIds } = useSWR(
    session ? `dispatcher_read_incidents_${session.login}` : null,
    () => getReadIncidentIds(session!.id)
  )
  const readIncidentIds = useMemo(() => new Set(readIncidentIdsData || []), [readIncidentIdsData])

  const refreshData = useCallback(() => {
    mutateWorkers()
    mutateReports()
    mutateIncidents()
    mutateGraphics()
    mutateJournalSummary()
    mutateReadIds()
  }, [mutateWorkers, mutateReports, mutateIncidents, mutateGraphics, mutateJournalSummary, mutateReadIds])

  const realtimeConfigs = useMemo(() => {
    if (!session) return []
    return [
      {
        channelName: 'dispatcher_work_reports',
        table: 'work_reports',
        onEvent: () => mutateReports()
      },
      {
        channelName: 'dispatcher_incidents',
        table: 'incidents',
        onEvent: () => mutateIncidents()
      },
      {
        channelName: 'dispatcher_journals',
        table: 'station_journals',
        onEvent: () => mutateJournalSummary()
      }
    ]
  }, [session, mutateReports, mutateIncidents, mutateJournalSummary])

  useRealtimeSubscription(realtimeConfigs, realtimeConfigs.length > 0)

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



  // Jurnal pending hisobi (yengil summary'dan)
  const du46PendingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.entries(journalSummary).forEach(([sid, s]) => {
      if (s.du46 > 0) counts[sid] = s.du46
    })
    return counts
  }, [journalSummary])

  const shu2PendingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.entries(journalSummary).forEach(([sid, s]) => {
      if (s.shu2 > 0) counts[sid] = s.shu2
    })
    return counts
  }, [journalSummary])

  const journalPendingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.entries(journalSummary).forEach(([sid, s]) => {
      const total = s.du46 + s.shu2
      if (total > 0) counts[sid] = total
    })
    return counts
  }, [journalSummary])

  const _totalPending = useMemo(() => {
    return Object.values(pendingCounts).reduce((a, b) => a + b, 0) +
      Object.values(journalPendingCounts).reduce((a, b) => a + b, 0)
  }, [pendingCounts, journalPendingCounts])

  // в”Ђв”Ђв”Ђ BUGUNGI KUNLIK BAJARILGAN / BAJARILMAGAN ISHLAR в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const today = new Date()
  const todayDay = today.getDate()
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const prevMonthIdx = today.getMonth() === 0 ? 11 : today.getMonth() - 1
  const prevMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
  const prevMonthStr = `${prevMonthYear}-${String(prevMonthIdx + 1).padStart(2, '0')}`

  const { todayReja, allQolibKetgan, allSababliBajarilmagan } = useMemo(() => {
    type TaskObj = {
      reportId: string
      stationId: string
      stationName: string
      workerName: string
      entry: ReportEntry
      month: string
      taskText: string
      type: string
      reason?: string | null
      completedDate?: string | null
    }
    const reja: TaskObj[] = []
    const qolib: TaskObj[] = []
    const sababli: TaskObj[] = []

    allReports
      .filter(r => r.month === currentMonthStr || r.month === prevMonthStr)
      .forEach(r => {
        const isCurrentMonth = r.month === currentMonthStr
        r.entries.forEach(e => {
          const taskDay = parseInt((e.ragat || '').trim(), 10)
          if (isNaN(taskDay)) return

          // Har bir ustunni alohida tekshiramiz
          const columns = [
            { text: e.haftalikJadval, done: !!e.doneHaftalik, type: 'haftalik', reason: e.missedReasonHaftalik, comp: e.completedAfterMissedDateHaftalik },
            { text: e.yillikJadval, done: !!e.doneYillik, type: 'yillik', reason: e.missedReasonYillik, comp: e.completedAfterMissedDateYillik },
            { text: e.yangiIshlar, done: !!e.doneYangi, type: 'yangi', reason: e.missedReasonYangi, comp: e.completedAfterMissedDateYangi },
            { text: e.kmoBartaraf, done: !!e.doneKmo, type: 'kmo', reason: e.missedReasonKmo, comp: e.completedAfterMissedDateKmo },
            { text: e.majburiyOzgarish, done: !!e.doneMajburiy, type: 'majburiy', reason: e.missedReasonMajburiy, comp: e.completedAfterMissedDateMajburiy }
          ]

          columns.forEach(col => {
            if (!col.text) return

            const taskObj = {
              reportId: r.id,
              stationId: r.stationId,
              stationName: r.stationName,
              workerName: r.workerName,
              entry: e,
              month: r.month,
              taskText: col.text,
              type: col.type,
              reason: col.reason,
              completedDate: col.comp
            }

            if (isCurrentMonth) {
              if (taskDay === todayDay) {
                reja.push(taskObj)
              }
              if (taskDay < todayDay && !col.done) {
                if (col.reason) sababli.push(taskObj)
                else qolib.push(taskObj)
              }
            } else {
              if (!col.done) {
                if (col.reason) sababli.push(taskObj)
                else qolib.push(taskObj)
              }
            }
          })
        })
      })

    return { todayReja: reja, allQolibKetgan: qolib, allSababliBajarilmagan: sababli }
  }, [allReports, currentMonthStr, prevMonthStr, todayDay])

  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName || !form.login || (!editingWorkerId && !form.password)) {
      setFormMsg({ type: 'err', text: "Ism, login va parol majburiy" })
      return
    }
    if (form.stationIds.length === 0 && form.role !== 'mehnat_muhofazasi') {
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
          position: form.role === 'worker' ? 'katta_elektromexanik' : form.role,
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
          position: form.role === 'worker' ? 'katta_elektromexanik' : form.role,
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
      console.error('Tasdiqlash xatosi:', err)
      setFormMsg({
        type: 'err',
        text: err instanceof Error ? err.message : "Xatolik yuz berdi"
      })
      setTimeout(() => setFormMsg(null), 3000)
    }
  }

  if (!session || sessionLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-indigo-500/10">
      <AuroraMeshBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* App Header */}
        <header className="sticky top-0 z-50 bg-transparent pt-3 px-4 sm:px-6 mx-auto w-full max-w-[1600px] print:hidden">
          <div className="flex items-center justify-between bg-white/40 backdrop-blur-3xl px-3 sm:px-5 py-2 sm:py-3 rounded-[24px] sm:rounded-[32px] border border-white/60 shadow-[0_8px_30px_rgba(31,38,135,0.06)] relative overflow-hidden">
            {/* Header reflection */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-60 z-20"></div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-[16px] bg-white/80 p-2 shadow-sm border border-white/80">
                <img src="/uty-logo.png" alt="UTY" className="h-full w-full object-contain drop-shadow-sm" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-[15px] sm:text-[18px] font-black uppercase tracking-tight text-slate-900 leading-none">SMART SHCH</h1>
                <p className="text-[8px] sm:text-[9.5px] font-black text-purple-600 truncate uppercase tracking-widest mt-1 drop-shadow-sm">SMART CONTROL TIZIMI</p>
                <p className="text-[10px] font-black text-slate-400 truncate uppercase tracking-tight mt-0.5 sm:hidden">Aloqa dispetcheri</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/60 border border-white/60 shadow-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                <span className="text-[11px] font-black text-slate-700 tracking-widest uppercase">Aloqa dispetcheri</span>
              </div>

              <button
                onClick={handleSignOut}
                className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-purple-100/50 bg-purple-50/50 text-purple-600 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 hover:scale-105 active:scale-95 transition-all shadow-sm group"
              >
                <LogOut size={20} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-8">


          {/* Dashboard Stats */}
          <div className="mb-6 rounded-[24px] bg-white/50 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 animate-fade-up">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatCard icon={<MapPin />} label="BEKATLAR RO'YXATI" value={stations.length} color="purple" />
              <StatCard
                icon={<Users />}
                label="ISHCHILAR RO'YXATI"
                value={workers.length}
                onClick={() => setShowWorkersModal(true)}
                clickable
                color="blue"
              />
              <StatCard
                icon={<CheckCircle2 />}
                label="BUGUNGI ISHLAR RO'YXATI"
                value={todayReja.length}
                onClick={() => setTodayModal('bugunReja')}
                clickable
                color="blue"
              />
              <StatCard
                icon={<AlertTriangle />}
                label="Bajarilmagan ishlar"
                value={allQolibKetgan.length}
                onClick={() => setTodayModal('qolibKetgan')}
                clickable
                color="red"
              />
              <StatCard
                icon={<BookOpen />}
                label="Sababli bajarilmagan"
                value={allSababliBajarilmagan.length}
                onClick={() => setTodayModal('sababliBajarilmagan')}
                clickable
                color="amber"
              />
            </div>
          </div>

          {/* Navigation Tabs and Add Worker */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
            <button
              onClick={() => setShowAddWorker(!showAddWorker)}
              className="sm:order-2 btn-gradient flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white shadow-lg shadow-purple-500/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-95"
            >
              <Plus size={20} />
              <span>Xodim qo&apos;shish</span>
            </button>

            <div className="sm:order-1 flex gap-1 overflow-x-auto hide-scrollbar rounded-[20px] bg-white/50 backdrop-blur-xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 max-w-full">
              <TabButton active={tab === 'bekatlar'} onClick={() => setTab('bekatlar')} label="Bekatlar" icon={<MapPin size={16} className="sm:w-[18px] sm:h-[18px]" />} />
              <TabButton active={tab === 'arxiv'} onClick={() => setTab('arxiv')} label="Arxiv" icon={<FileText size={16} className="sm:w-[18px] sm:h-[18px]" />} />
              <TabButton active={tab === 'grafiklar'} onClick={() => setTab('grafiklar')} label="Grafiklar" icon={<Download size={16} className="sm:w-[18px] sm:h-[18px]" />} />
              <TabButton active={tab === 'baxtsiz_hodisalar'} onClick={() => setTab('baxtsiz_hodisalar')} label="Baxtsiz Hodisalar" icon={<AlertTriangle size={16} className="sm:w-[18px] sm:h-[18px]" />} />
              <TabButton active={tab === 'kutubxona'} onClick={() => setTab('kutubxona')} label="Kutubxona" icon={<BookOpen size={16} className="sm:w-[18px] sm:h-[18px]" />} />
            </div>
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
                setFormMsg={setFormMsg}
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
                      const count = (pendingCounts[st.id] || 0) + (journalPendingCounts[st.id] || 0)
                      const isSelected = selectedStation === st.id
                      return (
                        <button
                          key={st.id}
                          onClick={() => { setSelectedStation(st.id); setSelectedReportType(null); setShowMobileStations(false) }}
                          className={`relative flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${isSelected
                            ? 'border-purple-300 bg-white shadow-lg shadow-purple-500/10 text-slate-900 ring-1 ring-purple-300/40'
                            : 'border-white/40 bg-white/60 backdrop-blur-sm text-slate-400 hover:border-purple-200 hover:bg-white hover:text-slate-600 hover:shadow-sm'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 shrink-0 rounded-full transition-all ${isSelected ? 'bg-purple-500 shadow-[0_0_8px_rgba(124,58,237,0.4)]' : 'bg-slate-200'}`} />
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
                          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-purple-500/70">
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
                        {selectedReportType === 'jurnallar' && activeJournalType === 'boshqa' && !activeJournalMonth && (
                          <div className="space-y-6 animate-fade-up">
                            <div className="premium-card p-6">
                              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-4">Boshqa jurnallar</h3>
                              <div className="grid gap-4">
                                <button
                                  onClick={() => { setActiveJournalType('alsn' as JournalType); }}
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
                                  onClick={() => { setActiveJournalType('yerlatgich' as JournalType); }}
                                  className="group relative flex items-center gap-5 rounded-[28px] border border-slate-200 bg-white p-6 text-left transition-all hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 active:scale-95"
                                >
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-all group-hover:bg-white border border-transparent group-hover:border-emerald-100 shadow-sm">
                                    <BookOpen size={28} />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Yerlatgich xabarlagichi</h4>
                                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">Yerlatgich xabarlagichi yordamida montaj izolyatsiya qarshiligini o&apos;lchash jurnali (NSH-01 17.1.8)</p>
                                  </div>
                                </button>
                                <button
                                  onClick={() => { setActiveJournalType('alsnKod' as JournalType); }}
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
                                  onClick={() => { setActiveJournalType('mpsFriksion' as JournalType); }}
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
                              <div className="text-center mt-6">
                                <button onClick={() => setActiveJournalType(null)} className="rounded-2xl bg-white border border-slate-200/60 px-10 py-3 font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm">Orqaga</button>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedReportType === 'jurnallar' && activeJournalType && activeJournalType !== 'boshqa' && !activeJournalMonth && (
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
                            onAccepted={mutateJournalSummary}
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
                            onAccepted={mutateJournalSummary}
                          />
                        )}
                        {selectedReportType === 'jurnallar' && activeJournalType === 'alsn' && activeJournalMonth && (
                          <ALSNJournalView
                            stationId={selectedStation}
                            stationName={stations.find(s => s.id === selectedStation)?.name || ''}
                            userName={session?.fullName || ''}
                            userRole="dispatcher"
                            journalMonth={activeJournalMonth}
                            onClose={() => { setActiveJournalMonth(''); setActiveJournalType(null); setSelectedReportType(null) }}
                          />
                        )}
                        {selectedReportType === 'jurnallar' && activeJournalType === 'yerlatgich' && activeJournalMonth && (
                          <YerlatgichJournalView
                            stationId={selectedStation}
                            stationName={stations.find(s => s.id === selectedStation)?.name || ''}
                            userName={session?.fullName || ''}
                            userRole="dispatcher"
                            journalMonth={activeJournalMonth}
                            onClose={() => { setActiveJournalMonth(''); setActiveJournalType(null); setSelectedReportType(null) }}
                          />
                        )}
                        {selectedReportType === 'jurnallar' && activeJournalType === 'alsnKod' && activeJournalMonth && (
                          <AlsnKodJournalView
                            stationId={selectedStation}
                            stationName={stations.find(s => s.id === selectedStation)?.name || ''}
                            userName={session?.fullName || ''}
                            userRole="dispatcher"
                            journalMonth={activeJournalMonth}
                            onClose={() => { setActiveJournalMonth(''); setActiveJournalType(null); setSelectedReportType(null) }}
                          />
                        )}
                        {selectedReportType === 'jurnallar' && activeJournalType === 'mpsFriksion' && activeJournalMonth && (
                          <MpsFriksionJournalView
                            stationId={selectedStation}
                            stationName={stations.find(s => s.id === selectedStation)?.name || ''}
                            userName={session?.fullName || ''}
                            userRole="dispatcher"
                            journalMonth={activeJournalMonth}
                            onClose={() => { setActiveJournalMonth(''); setActiveJournalType(null); setSelectedReportType(null) }}
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

            {tab === 'baxtsiz_hodisalar' && (
              <IncidentsView
                incidents={allIncidents}
                readIds={readIncidentIds}
                workerId={session?.id || ''}
                onRead={async () => { mutateReadIds() }}
              />
            )}
            {tab === 'kutubxona' && (
              <div className="animate-fade-up">
                <LibraryView userName={session?.fullName || ''} userRole={session?.role || ''} />
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
              role: (['worker', 'bekat_boshlighi', 'elektromexanik', 'elektromontyor', 'bekat_navbatchisi', 'yul_ustasi', 'ech_xodimi'].includes(w.role) ? w.role : 'worker') as typeof form.role,
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
      {/* в”Ђв”Ђв”Ђ BUGUNGI ISHLAR MODAL в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      {todayModal && (
        <TodayTasksModal
          type={todayModal}
          tasks={todayModal === 'bugunReja' ? todayReja : todayModal === 'qolibKetgan' ? allQolibKetgan : allSababliBajarilmagan}
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

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
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

