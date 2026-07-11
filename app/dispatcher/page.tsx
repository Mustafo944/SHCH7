/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'

import {
  getStations,
} from '@/lib/store'
import { safeStorage } from '@/lib/utils/storage'
import {
  getWorkers,
  addWorker,
  updateWorker,
  deleteWorker,
  getReportsByMonths,
  getIncidents,
  getReadIncidentIds,
  confirmReport,
  confirmReportEntry,
  rejectReport,
  getGlobalGraphics,
  uploadGlobalGraphicFile,
  deleteGlobalGraphicFile,
  getDispatcherJournalSummary,
  mapDbReport,
  type DbWorkReportRow
} from '@/lib/supabase-db'
import { useSessionGuard, useToast, useRealtimeSubscription, useHardwareBack } from '@/lib/hooks'
import { ToastContainer } from '@/components/ToastContainer'
import type { User, Role, JournalType, ReportEntry, WorkReport } from '@/types'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import { JournalSelectModal, JournalMonthSelectModal } from '@/components/journals/JournalSelectModal'
import dynamic from 'next/dynamic'

// Heavy components are lazy loaded to improve initial load speed
const DU46JournalView = dynamic(() => import('@/components/journals/DU46JournalView').then(mod => mod.DU46JournalView), { ssr: false })
const SHU2JournalView = dynamic(() => import('@/components/journals/SHU2JournalView').then(mod => mod.SHU2JournalView), { ssr: false })
const ALSNJournalView = dynamic(() => import('@/components/journals/ALSNJournalView').then(mod => mod.ALSNJournalView), { ssr: false })
const YerlatgichJournalView = dynamic(() => import('@/components/journals/YerlatgichJournalView').then(mod => mod.YerlatgichJournalView), { ssr: false })
const AlsnKodJournalView = dynamic(() => import('@/components/journals/AlsnKodJournalView').then(mod => mod.AlsnKodJournalView), { ssr: false })
const MpsFriksionJournalView = dynamic(() => import('@/components/journals/MpsFriksionJournalView').then(mod => mod.MpsFriksionJournalView), { ssr: false })
const DgaNazoratJournalView = dynamic(() => import('@/components/journals/DgaNazoratJournalView').then(mod => mod.DgaNazoratJournalView), { ssr: false })
import {
  LogOut,
  Plus,
  Users,
  MapPin,
  FileText,
  CheckCircle2,
  Menu,
  BookOpen,
  Map as MapIcon,
  AlertTriangle,
  Home,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Server,
  Loader2
} from 'lucide-react'

import { StatCard, BigActionCard, WorkerForm, ReportList, SchemasView, ArchiveView, DownloadCard, WorkersModal, TodayTasksModal } from './components'
import { LibraryView } from '@/components/library/LibraryView'
import IncidentsView from '@/components/worker/IncidentsView'
const StationEquipmentsModal = dynamic(() => import('@/components/StationEquipmentsModal').then(mod => mod.StationEquipmentsModal), { ssr: false })

type Tab = 'bekatlar' | 'arxiv' | 'grafiklar' | 'baxtsiz_hodisalar' | 'kutubxona'

export default function DispatcherPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard('dispatcher')
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('bekatlar')

  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [selectedReportType, setSelectedReportType] = useState<'oylik' | 'baxtsiz_hodisa' | 'sxemalar' | 'jurnallar' | 'qurilmalar' | null>(null)
  const [showMobileStations, setShowMobileStations] = useState(false)
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [showWorkersModal, setShowWorkersModal] = useState(false)
  const [activeJournalType, setActiveJournalType] = useState<JournalType | null>(null)
  const [activeJournalMonth, setActiveJournalMonth] = useState<string>('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeletingWorker, setIsDeletingWorker] = useState(false)
  const [deleteWorkerError, setDeleteWorkerError] = useState<string | null>(null)
  const [todayModal, setTodayModal] = useState<'bugunReja' | 'qolibKetgan' | 'sababliBajarilmagan' | null>(null)
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)

  const isSubViewActive = selectedStation !== null || showAddWorker || showWorkersModal || activeJournalType !== null || todayModal !== null || selectedReportType !== null || isSignOutModalOpen || isMobileSidebarOpen;
  const handleHardwareBack = useCallback(() => {
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false)
    } else if (isSignOutModalOpen) {
      setIsSignOutModalOpen(false)
    } else if (activeJournalType !== null) {
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
  }, [isMobileSidebarOpen, activeJournalType, todayModal, showWorkersModal, showAddWorker, selectedReportType, selectedStation, isSignOutModalOpen])

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

  // Kesh topilmasa `undefined` qaytariladi (default qiymat emas!) — aks holda
  // SWRProvider'dagi revalidateIfStale:false sozlamasi bu bo'sh massivni "haqiqiy
  // ma'lumot" deb hisoblab, birinchi (keshsiz) ochilishda serverdan hech qachon
  // yangi ma'lumot so'ramay qo'yadi.
  const getFallback = (key: string, def: any) => {
    if (typeof window !== 'undefined') {
      const cached = safeStorage.getItem(key)
      if (cached) { try { return JSON.parse(cached) } catch { /* ignore */ } }
    }
    return undefined
  }

  const { data: workers = [], mutate: mutateWorkers } = useSWR(session ? 'dispatcher_workers' : null, async () => {
    const w = await getWorkers()
    return w.filter(user => user.role !== 'dispatcher')
  }, {
    fallbackData: getFallback('dispatcher_workers_cache', []),
    onSuccess: (data) => safeStorage.setItemDebounced('dispatcher_workers_cache', JSON.stringify(data))
  })
  
  // Dashboard faqat joriy + o'tgan oy hisobotlarini ishlatadi (pastdagi
  // aggregatsiyalar shu ikki oy bo'yicha filtrlanadi). Butun bazani tortish
  // o'rniga faqat shu ikki oyni yuklaymiz — sahifa yillar o'tsa ham tez qoladi.
  // Arxiv o'z ma'lumotini ArchiveView ichida alohida yuklaydi.
  const { data: allReports = [], mutate: mutateReports } = useSWR(
    session ? 'dispatcher_reports_v2' : null,
    () => {
      const now = new Date()
      const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const prevIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      const prev = `${prevYear}-${String(prevIdx + 1).padStart(2, '0')}`
      return getReportsByMonths([cur, prev])
    },
    {
      fallbackData: getFallback('dispatcher_reports_cache_v2', []),
      onSuccess: (data) => safeStorage.setItemDebounced('dispatcher_reports_cache_v2', JSON.stringify(data)),
    }
  )
  
  const { data: allIncidents = [], mutate: mutateIncidents } = useSWR(session ? 'dispatcher_incidents' : null, getIncidents, {
    fallbackData: getFallback('dispatcher_incidents_cache', []),
    onSuccess: (data) => safeStorage.setItemDebounced('dispatcher_incidents_cache', JSON.stringify(data))
  })
  
  const { data: globalGraphics = [], mutate: mutateGraphics } = useSWR(session ? 'dispatcher_graphics' : null, getGlobalGraphics, {
    fallbackData: getFallback('dispatcher_graphics_cache', []),
    onSuccess: (data) => safeStorage.setItemDebounced('dispatcher_graphics_cache', JSON.stringify(data))
  })
  
  const { data: journalSummary = {}, mutate: mutateJournalSummary } = useSWR(session ? 'dispatcher_journals' : null, getDispatcherJournalSummary, {
    fallbackData: getFallback('dispatcher_journals_cache', {}),
    onSuccess: (data) => safeStorage.setItemDebounced('dispatcher_journals_cache', JSON.stringify(data))
  })

  const { data: readIncidentIdsData, mutate: mutateReadIds } = useSWR(
    session ? `dispatcher_read_incidents_${session.login}` : null,
    () => getReadIncidentIds(session!.id),
    {
      fallbackData: getFallback(`dispatcher_read_incidents_cache_${session?.id}`, []),
      onSuccess: (data) => safeStorage.setItemDebounced(`dispatcher_read_incidents_cache_${session?.id}`, JSON.stringify(data))
    }
  )
  const readIncidentIds = useMemo(() => new Set(readIncidentIdsData || []), [readIncidentIdsData])

  const refreshData = useCallback(() => {
    mutateWorkers()
    mutateReports()
    mutateIncidents()
    mutateJournalSummary()
    mutateReadIds()
    // mutateGraphics() — grafik kamdan-kam o'zgaradi, faqat upload/delete da chaqiriladi
  }, [mutateWorkers, mutateReports, mutateIncidents, mutateJournalSummary, mutateReadIds])

  const realtimeConfigs = useMemo(() => {
    if (!session) return []
    return [
      {
        channelName: 'dispatcher_work_reports',
        table: 'work_reports',
        onEvent: (payload: any) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
            mutateReports((prev: WorkReport[] | undefined) => {
              if (!prev) return prev;
              const idx = prev.findIndex(r => r.id === payload.new.id)
              if (idx > -1) {
                const newReports = [...prev]
                const oldReport = newReports[idx]
                // Merge the existing DB row properties with the payload
                const mergedRow: any = {
                  id: oldReport.id,
                  worker_id: oldReport.workerId,
                  worker_name: oldReport.workerName,
                  worker_phone: oldReport.workerPhone,
                  station_id: oldReport.stationId,
                  station_name: oldReport.stationName,
                  week_label: oldReport.weekLabel,
                  month: oldReport.month,
                  year: oldReport.year,
                  entries: oldReport.entries,
                  submitted_at: oldReport.submittedAt,
                  confirmed_at: oldReport.confirmedAt,
                  confirmed_by: oldReport.confirmedBy,
                  rejected_at: oldReport.rejectedAt,
                  rejected_by: oldReport.rejectedBy,
                  ...payload.new
                }
                newReports[idx] = mapDbReport(mergedRow as DbWorkReportRow)
                return newReports
              }
              // Yangi qator — faqat "Yuborish" bosilgan (is_submitted=true) rejalarni qo'shamiz.
              // Avtosaqlangan draft uchun ham realtime hodisa keladi, lekin dispetcherga
              // ko'rinmasligi kerak — Yuborish bosilmaguncha bu yerga tushmasligi shart.
              if (!payload.new.is_submitted) return prev
              return [mapDbReport(payload.new as DbWorkReportRow), ...prev]
            }, { revalidate: false })
          } else if (payload.eventType === 'DELETE') {
            mutateReports((prev: WorkReport[] | undefined) => {
              if (!prev) return []
              return prev.filter(r => r.id !== payload.old.id)
            }, { revalidate: false })
          } else {
            mutateReports()
          }
        }
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

  // Calculated pending counts — faqat oylik reja tasdiqlashi kutilayotganlarni hisoblaydi
  // Tasdiqlangan rejadagi kunlik ishlar qayta tasdiqlanmaydi
  const pendingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allReports.forEach(r => {
      const isPending = !r.confirmedAt && !r.rejectedAt && r.entries.some(e =>
        e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish
      )
      if (isPending) {
        counts[r.stationId] = (counts[r.stationId] || 0) + 1
      }
    })
    return counts
  }, [allReports])



  // Jurnal pending hisobi — 4 ta useMemo o'rniga 1 ta konsolidatsiya
  const { du46PendingCounts, shu2PendingCounts, journalPendingCounts, _totalPending } = useMemo(() => {
    const du46: Record<string, number> = {}
    const shu2: Record<string, number> = {}
    const journal: Record<string, number> = {}

    Object.entries(journalSummary).forEach(([sid, s]) => {
      if (s.du46 > 0) du46[sid] = s.du46
      if (s.shu2 > 0) shu2[sid] = s.shu2
      const total = s.du46 + s.shu2
      if (total > 0) journal[sid] = total
    })

    const totalPending = Object.values(pendingCounts).reduce((a, b) => a + b, 0) +
      Object.values(journal).reduce((a, b) => a + b, 0)

    return { du46PendingCounts: du46, shu2PendingCounts: shu2, journalPendingCounts: journal, _totalPending: totalPending }
  }, [journalSummary, pendingCounts])

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
      done?: boolean
    }
    const reja: TaskObj[] = []
    const qolib: TaskObj[] = []
    const sababli: TaskObj[] = []

    allReports
      .filter(r => r.month === currentMonthStr || r.month === prevMonthStr)
      // Faqat dispetcher qabul qilgan rejalar bugungi ishlarga tushadi
      .filter(r => !!r.confirmedAt)
      .forEach(r => {
        const isCurrentMonth = r.month === currentMonthStr
        r.entries.forEach(e => {
          const taskDay = parseInt((e.ragat || '').trim(), 10)
          if (isNaN(taskDay)) return

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
              completedDate: col.comp,
              done: col.done
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
    setDeleteWorkerError(null)
    setDeleteConfirmId(workerId)
  }

  async function confirmDeleteWorker() {
    if (!deleteConfirmId || isDeletingWorker) return
    setIsDeletingWorker(true)
    setDeleteWorkerError(null)
    try {
      await deleteWorker(deleteConfirmId)
      refreshData()
      setDeleteConfirmId(null)
    } catch (err: unknown) {
      setDeleteWorkerError(err instanceof Error ? err.message : "Xatolik yuz berdi")
    } finally {
      setIsDeletingWorker(false)
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

  async function handleRejectReport(reportId: string) {
    if (!session) return
    try {
      const res = await rejectReport(reportId, session.fullName)
      if (!res) throw new Error('Rad etishda xatolik (DB xatosi yoki ruxsat yo\'q)')
      refreshData()
      toast.info('Oylik reja rad qilindi. Katta elektromexanik qayta yuborishi kerak.')
    } catch (err: unknown) {
      console.error(err);
      toast.error('Xatolik yuz berdi')
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
    <div className="relative flex h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-blue-500/10 font-sans">
      <AuroraMeshBackground />
      
      {/* Mobile Sidebar Backdrop & Close Button */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsMobileSidebarOpen(false)} 
        />
      )}

      {/* Left Sidebar (Desktop & Mobile Drawer) */}
      <aside className={`bg-white/40 backdrop-blur-3xl border-r border-white/40 flex flex-col shrink-0 shadow-2xl lg:shadow-sm z-50 lg:z-20 fixed lg:relative inset-y-0 left-0 transform transition-all duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isDesktopSidebarCollapsed ? 'w-[260px] lg:w-[88px]' : 'w-[260px]'}`}>
        
        {/* Mobile Close Button (attached to right edge of menu) */}
        <button 
          onClick={() => setIsMobileSidebarOpen(false)} 
          className={`lg:hidden absolute top-1/2 -translate-y-1/2 -right-5 h-10 w-10 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-blue-600 transition-all z-[60] duration-300 ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Desktop Collapse Button */}
        <button 
          onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)} 
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-5 h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-blue-600 transition-all z-[60]"
        >
          {isDesktopSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <div className="shrink-0">
          {/* Logo */}
          <div className={`flex items-center ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0 p-6 gap-3' : 'gap-4 p-6'} mb-2 transition-all duration-300 relative`}>
            <div className="flex h-14 w-14 items-center justify-center shrink-0">
              <img src="/uty-logo.png" alt="UTY" className="h-full w-full object-contain" />
            </div>
            <div className={`flex flex-col justify-center overflow-hidden transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-[140px] opacity-100'}`}>
              <h1 className="text-[15px] font-black uppercase tracking-tight text-[#0050a0] leading-none whitespace-nowrap">O‘ZBEKISTON</h1>
              <h1 className="text-[15px] font-black uppercase tracking-tight text-[#0050a0] leading-none whitespace-nowrap mt-0.5">TEMIR YO‘LLARI</h1>
              <p className="text-[9px] font-bold text-slate-500 tracking-[0.15em] mt-1.5 uppercase whitespace-nowrap">SMART CONTROL TIZIMI</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 px-4 pb-2 mt-2">
            <button onClick={() => { setSelectedStation(null); setTab('bekatlar'); setShowAddWorker(false); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${!selectedStation && tab === 'bekatlar' && !showAddWorker ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <Home size={18} className="shrink-0" /> 
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Bosh sahifa</span>
            </button>
            <button onClick={() => { setTab('arxiv'); setShowAddWorker(false); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${tab === 'arxiv' && !showAddWorker ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <FileText size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Arxiv</span>
            </button>
            <button onClick={() => { setTab('grafiklar'); setShowAddWorker(false); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${tab === 'grafiklar' && !showAddWorker ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <BarChart2 size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Grafiklar</span>
            </button>
            <button onClick={() => { setTab('baxtsiz_hodisalar'); setShowAddWorker(false); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${tab === 'baxtsiz_hodisalar' && !showAddWorker ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <AlertTriangle size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Baxtsiz hodisalar</span>
            </button>
            <button onClick={() => { setTab('kutubxona'); setShowAddWorker(false); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${tab === 'kutubxona' && !showAddWorker ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <BookOpen size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Kutubxona</span>
            </button>
            <button onClick={() => { setShowAddWorker(true); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${showAddWorker ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <Plus size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Xodim qo'shish</span>
            </button>
            <button onClick={() => { setIsMobileSidebarOpen(false); setIsSignOutModalOpen(true); }} className={`mt-auto flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden text-rose-600 hover:bg-rose-50 ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <LogOut size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Chiqish</span>
            </button>
          </nav>

        {/* Train Image & User Block */}
        <div className={`relative shrink-0 w-full transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:h-auto lg:bg-white/40 lg:border-t lg:border-white/60' : 'h-[220px]'}`}>
           {/* Image Background */}
           <div className={`absolute inset-0 pointer-events-none overflow-hidden ${isDesktopSidebarCollapsed ? 'lg:hidden' : ''}`}>
             <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/80 to-transparent z-10" />
             <img
               src="/afrosiyob.webp"
               loading="lazy"
               decoding="async"
               onError={(e) => e.currentTarget.src='/1.png'}
               alt="Afrosiyob"
               className="w-full h-full object-cover object-[80%_center] opacity-100"
             />
             <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/90 to-transparent z-10" />
           </div>

           {/* Floating User Card */}
           <div className={`relative z-20 h-full flex flex-col justify-end px-4 pb-4 ${isDesktopSidebarCollapsed ? 'lg:p-3 lg:justify-center' : ''}`}>
             
             <div className="relative w-full mx-auto max-w-[230px]">
               <div className={`flex items-center rounded-2xl backdrop-blur-md border shadow-lg bg-white/40 border-white/50 transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:p-2 lg:justify-center' : 'p-3 gap-3'}`}>
                 <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
                   <div className="h-full w-full bg-gradient-to-br from-blue-100/80 to-blue-50/80 flex items-center justify-center text-blue-700 font-bold shadow-inner">
                       A
                   </div>
                 </div>
                 <div className={`flex-1 min-w-0 transition-all duration-300 overflow-hidden ${isDesktopSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'opacity-100 w-auto'}`}>
                   <p className="truncate text-sm font-bold text-slate-900">{session?.fullName || 'Foydalanuvchi'}</p>
                   <p className="truncate text-[11px] font-bold text-slate-600">Aloqa dispetcheri</p>
                 </div>
               </div>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-transparent pt-3 px-4 sm:px-6 mx-auto w-full max-w-[1600px] print:hidden">
          <div className="flex w-full items-center justify-between bg-white/[0.25] backdrop-blur-3xl px-3 sm:px-5 py-2 sm:py-3 rounded-[32px] sm:rounded-[40px] shadow-sm border border-white/50">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={() => setIsMobileSidebarOpen(true)} className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white/20 backdrop-blur-md p-2 shadow-sm border border-white/30 text-slate-600 hover:bg-slate-50 transition-all active:scale-95">
                <Menu size={20} />
              </button>
              {/* UTY Logo */}
              <div className="hidden sm:flex relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center bg-white rounded-full shadow-sm">
                <img src="/uty-logo.png" alt="UTY" className="w-full h-full object-contain p-2 drop-shadow-sm" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-[15px] sm:text-[18px] font-black uppercase tracking-tight text-slate-900 leading-none">SMART SHCH</h1>
                <p className="text-[8px] sm:text-[9.5px] font-black text-purple-600 truncate uppercase tracking-widest mt-1 drop-shadow-sm">DISPETCHER BOSHQARUVI</p>
                <p className="text-[10px] font-black text-slate-400 truncate uppercase tracking-tight mt-0.5 sm:hidden">{session?.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                <span className="text-[11px] font-black text-slate-700 tracking-widest uppercase">Aloqa dispetcheri</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pt-4 sm:pt-8 px-4 lg:px-8 pb-8 custom-scrollbar">
          {/* Dashboard Stats */}
          {tab === 'bekatlar' && !showAddWorker && (
            <div className="mb-8 animate-fade-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <StatCard icon={<MapPin />} label="BEKATLAR RO'YXATI" value={stations.length} color="blue" />
              <StatCard
                icon={<Users />}
                label="ISHCHILAR RO'YXATI"
                value={workers.length}
                onClick={() => setShowWorkersModal(true)}
                clickable
                color="emerald"
              />
              <StatCard
                icon={<CheckCircle2 />}
                label="BUGUNGI ISHLAR"
                value={todayReja.length}
                subtext={
                  todayReja.filter(t => t.done).length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black tracking-widest text-emerald-600 uppercase border border-emerald-100">
                      <CheckCircle2 size={10} strokeWidth={3} />
                      {todayReja.filter(t => t.done).length} TA BAJARILDI
                    </span>
                  ) : null
                }
                onClick={() => setTodayModal('bugunReja')}
                clickable
                color="blue"
              />
              <StatCard
                icon={<AlertTriangle />}
                label="BAJARILMAGAN ISHLAR"
                value={allQolibKetgan.length}
                onClick={() => setTodayModal('qolibKetgan')}
                clickable
                color="red"
              />
              <StatCard
                icon={<BookOpen />}
                label="SABABLI BAJARILMAGAN"
                value={allSababliBajarilmagan.length}
                onClick={() => setTodayModal('sababliBajarilmagan')}
                clickable
                color="emerald"
              />
            </div>
          </div>
          )}

          {/* Navigation Tabs removed as requested */}

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
          {!showAddWorker && (
            <div className="min-h-[400px]">
            {tab === 'bekatlar' && (
              <div className="grid gap-8 lg:grid-cols-[300px_1fr] animate-fade-up">
                {/* Station Selection Sidebar */}
                <div className="bg-white/[0.25] backdrop-blur-3xl rounded-[32px] shadow-sm border border-white/50 flex flex-col h-full max-h-[800px] overflow-hidden">
                  <div className="flex items-center justify-between p-6 shrink-0">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Bekatlar ro'yxati</h3>
                    <button onClick={() => setShowMobileStations(!showMobileStations)} className="lg:hidden text-sky-600">
                      <Menu size={20} />
                    </button>
                  </div>

                  <div
                    className={`flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar ${showMobileStations ? 'block' : 'hidden lg:flex flex-col'}`}
                  >
                    {stations.map(st => {
                      const count = (pendingCounts[st.id] || 0) + (journalPendingCounts[st.id] || 0)
                      const isSelected = selectedStation === st.id
                      return (
                        <button
                          key={st.id}
                          onClick={() => { setSelectedStation(st.id); setSelectedReportType(null); setShowMobileStations(false) }}
                          className={`relative flex w-full items-center justify-between rounded-[24px] p-3 sm:p-4 text-left transition-all duration-200 border ${isSelected
                            ? 'bg-white shadow-md text-blue-700 border-white ring-4 ring-blue-500/10'
                            : 'bg-white/20 border-white/40 text-slate-700 hover:bg-white/40 hover:shadow-sm'
                            }`}
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`flex items-center justify-center h-10 w-10 rounded-full shrink-0 ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-emerald-50 text-emerald-500'}`}>
                              <MapPin size={20} strokeWidth={2.5} />
                            </div>
                            <span className="font-black text-base">{st.name}</span>
                          </div>
                          {count > 0 && (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">{count}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Report Content */}
                <div className="min-w-0 flex-1">
                  {!selectedStation ? (
                    <div className="bg-white/[0.25] backdrop-blur-3xl rounded-[32px] shadow-sm border border-white/50 flex flex-col h-full min-h-[500px]">
                      <div className="p-6">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">TIZIM HOLATI</h3>
                      </div>
                      <div className="flex-1 flex flex-col sm:flex-row relative">
                        <div className="flex-1 p-8 flex items-center justify-center relative overflow-hidden bg-transparent">
                          <div className="relative z-10 text-center flex flex-col items-center">
                            <div className="mb-4 text-slate-400">
                              <MapIcon size={120} strokeWidth={1} />
                            </div>
                            <h2 className="text-xl font-black text-slate-500 tracking-tight uppercase">Bekatni tanlang</h2>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-white/40 backdrop-blur-3xl rounded-[24px] shadow-sm border border-white/40 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6">
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
                            reports={allReports.filter(r => r.stationId === selectedStation && !r.rejectedAt)}
                            onConfirm={handleConfirmReport}
                            onConfirmRow={handleConfirmEntry}
                            onReject={handleRejectReport}
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
                            <div className="bg-white/40 backdrop-blur-3xl rounded-[24px] shadow-sm border border-white/40 p-6">
                              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-4">Boshqa jurnallar</h3>
                              <div className="grid gap-4">
                                <button
                                  onClick={() => { setActiveJournalType('alsn' as JournalType); }}
                                  className="group relative flex items-center gap-5 rounded-[28px] border border-white/40 bg-white/40 p-6 text-left transition-all hover:border-blue-300 hover:bg-white/60 hover:shadow-sm active:scale-95"
                                >
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all border border-transparent shadow-sm">
                                    <BookOpen size={28} />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Poezd radioaloqasi va ALSN</h4>
                                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">Poezd radioaloqasi va ALSN ni tekshirish jurnali</p>
                                  </div>
                                </button>
                                <button
                                  onClick={() => { setActiveJournalType('yerlatgich' as JournalType); }}
                                  className="group relative flex items-center gap-5 rounded-[28px] border border-white/40 bg-white/40 p-6 text-left transition-all hover:border-emerald-300 hover:bg-white/60 hover:shadow-sm active:scale-95"
                                >
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-all border border-transparent shadow-sm">
                                    <BookOpen size={28} />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Yerlatgich xabarlagichi</h4>
                                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">Yerlatgich xabarlagichi yordamida montaj izolyatsiya qarshiligini o&apos;lchash jurnali (NSH-01 17.1.8)</p>
                                  </div>
                                </button>
                                <button
                                  onClick={() => { setActiveJournalType('alsnKod' as JournalType); }}
                                  className="group relative flex items-center gap-5 rounded-[28px] border border-white/40 bg-white/40 p-6 text-left transition-all hover:border-blue-300 hover:bg-white/60 hover:shadow-sm active:scale-95"
                                >
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all border border-transparent shadow-sm">
                                    <BookOpen size={28} />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">ALSN kodlarini o'lchash</h4>
                                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">ALSN kodlarini to'g'rilash va tok kuchini o'lchash jurnali (NSH-01 10.4)</p>
                                  </div>
                                </button>
                                <button
                                  onClick={() => { setActiveJournalType('mpsFriksion' as JournalType); }}
                                  className="group relative flex items-center gap-5 rounded-[28px] border border-white/40 bg-white/40 p-6 text-left transition-all hover:border-violet-300 hover:bg-white/60 hover:shadow-sm active:scale-95"
                                >
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition-all border border-transparent shadow-sm">
                                    <BookOpen size={28} />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">MPS elektrodvigatellarni friksion tokini o&apos;lchash</h4>
                                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">MPS turidagi elektrodvigatellarni friksion tokini o&apos;lchash jurnali (NSH-01 9.1.4)</p>
                                  </div>
                                </button>
                                <button
                                  onClick={() => { setActiveJournalType('dgaNazorat' as JournalType); }}
                                  className="group relative flex items-center gap-5 rounded-[28px] border border-slate-200 bg-white p-6 text-left transition-all hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 active:scale-95"
                                >
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-all group-hover:bg-white border border-transparent group-hover:border-amber-100 shadow-sm">
                                    <BookOpen size={28} />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Dizel generatorlari (DGA)</h4>
                                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">Dizel generatorlarini ishlashini nazorat qilish jurnali (NSH-01 18.3.1)</p>
                                  </div>
                                </button>
                              </div>
                              <div className="text-center mt-6">
                                <button onClick={() => setActiveJournalType(null)} className="rounded-2xl bg-white border border-slate-200 px-10 py-3 font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm">Orqaga</button>
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
                            onAccepted={() => mutateJournalSummary()}
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
                            onAccepted={() => mutateJournalSummary()}
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
                        {selectedReportType === 'jurnallar' && activeJournalType === 'dgaNazorat' && activeJournalMonth && (
                          <DgaNazoratJournalView
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
                            <BigActionCard
                              title="Qurilmalar"
                              desc="Bekatdagi strelkalar va svetoforlar ro'yxatini ko'rish va chop etish."
                              icon={<Server size={32} />}
                              onClick={() => setSelectedReportType('qurilmalar')}
                              color="purple"
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
                onConfirm={handleConfirmReport}
                onConfirmEntry={handleConfirmEntry}
                onReject={handleRejectReport}
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
                    mutateGraphics()
                  }}
                  onDelete={async (id) => {
                    await deleteGlobalGraphicFile(id)
                    mutateGraphics()
                  }}
                />
                <DownloadCard
                  title="4 haftalik ish grafiki"
                  desc="TSNG bo'yicha tsiklik ishlar taqsimoti."
                  existingFile={globalGraphics.find(g => g.schemaType === 'haftalik_ish_reja_grafiki')}
                  onUpload={async (file) => {
                    await uploadGlobalGraphicFile(file, 'haftalik_ish_reja_grafiki', session?.fullName || '')
                    mutateGraphics()
                  }}
                  onDelete={async (id) => {
                    await deleteGlobalGraphicFile(id)
                    mutateGraphics()
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
          )}
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

      {selectedReportType === 'qurilmalar' && selectedStation && (
        <StationEquipmentsModal
          stationId={selectedStation}
          stationName={stations.find(s => s.id === selectedStation)?.name || ''}
          canEdit={false} // Dispetcher uskunalar ro'yxatini tahrirlamaydi
          isDispatcher // QR Chop etish faqat shu rolga ko'rinadi
          userName={session?.fullName || 'Dispetcher'}
          onClose={() => setSelectedReportType(null)}
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
            {deleteWorkerError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">{deleteWorkerError}</div>
            )}
            <div className="mt-8 flex justify-end gap-3">
              <button disabled={isDeletingWorker} onClick={() => setDeleteConfirmId(null)} className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">Bekor qilish</button>
              <button disabled={isDeletingWorker} onClick={confirmDeleteWorker} className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                {isDeletingWorker ? <Loader2 size={16} className="animate-spin" /> : null}
                {isDeletingWorker ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

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

