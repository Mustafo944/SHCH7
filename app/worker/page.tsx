/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'

import {
  getStation,
} from '@/lib/store'
import {
  getReportsByStations,
  getIncidents,
  getReadIncidentIds,
  getPendingJournalCounts,
  mapDbReport,
  type DbWorkReportRow
} from '@/lib/supabase-db'
import { safeStorage } from '@/lib/utils/storage'
import { useSessionGuard, useToast, useNotificationSound, useRealtimeSubscription, useHardwareBack } from '@/lib/hooks'
import { ToastContainer } from '@/components/ToastContainer'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import type { WorkReport, ReportEntry, Incident, JournalType } from '@/types'
import { MONTHS } from '@/lib/constants'
import dynamic from 'next/dynamic'
import { JournalSelectModal, JournalMonthSelectModal } from '@/components/JournalView'

const DU46JournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.DU46JournalView), { ssr: false })
const SHU2JournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.SHU2JournalView), { ssr: false })
const ALSNJournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.ALSNJournalView), { ssr: false })
const YerlatgichJournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.YerlatgichJournalView), { ssr: false })
const AlsnKodJournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.AlsnKodJournalView), { ssr: false })
const MpsFriksionJournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.MpsFriksionJournalView), { ssr: false })
const DgaNazoratJournalView = dynamic(() => import('@/components/JournalView').then(mod => mod.DgaNazoratJournalView), { ssr: false })
import { HeaderCard } from '@/components/worker/BigActionCard'
// Og'ir komponentlar haqiqiy code splitting bilan lazy load qilinadi
const JournalForm = dynamic(() => import('@/components/worker/JournalForm').then(mod => mod.JournalForm), { ssr: false, loading: () => <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md"><div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-purple-500" /></div> })
const WorkerGraphicsView = dynamic(() => import('@/components/worker/WorkerGraphicsView').then(mod => mod.WorkerGraphicsView), { ssr: false })
const WorkerSchemasView = dynamic(() => import('@/components/worker/WorkerSchemasView').then(mod => mod.WorkerSchemasView), { ssr: false })
const WorkerTasksModal = dynamic(() => import('@/components/worker/WorkerTasksModal').then(mod => mod.WorkerTasksModal), { ssr: false, loading: () => <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md"><div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-purple-500" /></div> })
import IncidentsView from '@/components/worker/IncidentsView'
import { LibraryView } from '@/components/library/LibraryView'
const StationEquipmentsModal = dynamic(() => import('@/components/StationEquipmentsModal').then(mod => mod.StationEquipmentsModal), { ssr: false, loading: () => <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md"><div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-blue-500" /></div> })
import {
  FileText,
  Map as MapIcon,
  ChevronLeft,
  LogOut,
  BookOpen,
  AlertTriangle,
  Volume2,
  VolumeX,
  CheckCircle2,
  Menu,
  Home,
  ChevronRight,
  BarChart2,
  Library,
  Server
} from 'lucide-react'



export default function WorkerPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard(['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik'])
  const toast = useToast()
  const [view, setView] = useState<'home' | 'selectStation' | 'selectMonth' | 'journal' | 'viewReport' | 'incidents' | 'sxemalar' | 'grafiklar' | 'kutubxona' | 'journalSelect' | 'journalMonthSelect' | 'du46' | 'shu2' | 'boshqaJurnallar' | 'alsn' | 'alsnMonthSelect' | 'yerlatgich' | 'yerlatgichMonthSelect' | 'alsnKod' | 'alsnKodMonthSelect' | 'mpsFriksion' | 'mpsFriksionMonthSelect' | 'dgaNazorat' | 'dgaNazoratMonthSelect' | 'qurilmalar'>('home')

  const [reports, setReports] = useState<WorkReport[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [readIncidentIds, setReadIncidentIds] = useState<Set<string>>(new Set())
  const [activeStationId, setActiveStationId] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedReport, _setSelectedReport] = useState<WorkReport | null>(null)
  const [pendingCounts, setPendingCounts] = useState({ du46: 0, shu2: 0 })
  const { isMuted, setIsMuted } = useNotificationSound(pendingCounts.du46)
  const [selectedJournalType, setSelectedJournalType] = useState<JournalType | null>(null)
  const [selectedJournalMonth, setSelectedJournalMonth] = useState<string>('')
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)
  const [workerModal, setWorkerModal] = useState<'bugunBajarilgan' | 'qolibKetgan' | 'sababliBajarilmagan' | null>(null)
  
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  const isSubViewActive = view !== 'home' || workerModal !== null || selectedJournalType !== null || isSignOutModalOpen || isProfileMenuOpen
  const handleHardwareBack = useCallback(() => {
    if (isSignOutModalOpen) {
      setIsSignOutModalOpen(false)
    } else if (isProfileMenuOpen) {
      setIsProfileMenuOpen(false)
    } else if (selectedJournalType !== null) {
      setSelectedJournalType(null)
    } else if (workerModal !== null) {
      setWorkerModal(null)
    } else if (view !== 'home') {
      setView('home')
    }
  }, [view, workerModal, selectedJournalType, isSignOutModalOpen, isProfileMenuOpen])

  useHardwareBack(isSubViewActive, handleHardwareBack)

  const loadPendingCounts = useCallback(async (sid: string, role: string, position?: string) => {
    if (typeof window !== 'undefined') {
      const cached = safeStorage.getItem(`worker_pending_cache_${sid}_${role}`)
      if (cached) {
        try { setPendingCounts(JSON.parse(cached)) } catch (e) { /* ignore */ }
      }
    }
    try {
      const counts = await getPendingJournalCounts(sid, role, position)
      setPendingCounts(counts)
      if (typeof window !== 'undefined') {
        safeStorage.setItem(`worker_pending_cache_${sid}_${role}`, JSON.stringify(counts))
      }
    } catch {
      toast.error('Pending counts yuklashda xatolik')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadWorkReports = useCallback(async (stationIds: string[]) => {
    try {
      const r = await getReportsByStations(stationIds)
      setReports(r)
      if (typeof window !== 'undefined' && stationIds.length > 0) {
        safeStorage.setItem(`worker_reports_cache_${stationIds.join('_')}`, JSON.stringify(r))
      }
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
      if (typeof window !== 'undefined') {
        safeStorage.setItem(`worker_incidents_cache_${userId}`, JSON.stringify(allInc))
        safeStorage.setItem(`worker_read_inc_cache_${userId}`, JSON.stringify(readIds))
      }
    } catch {
      console.warn('Baxtsiz hodisalarni yuklashda xatolik')
    }
  }, [])

  const refreshData = useCallback(async (userId: string, stationIds: string[]) => {
    // Try to load from cache first
    if (typeof window !== 'undefined') {
      const cachedReps = safeStorage.getItem(`worker_reports_cache_${stationIds.join('_')}`)
      if (cachedReps) {
        try { setReports(JSON.parse(cachedReps)) } catch (e) { /* ignore */ }
      }
      const cachedInc = safeStorage.getItem(`worker_incidents_cache_${userId}`)
      if (cachedInc) {
        try { setIncidents(JSON.parse(cachedInc)) } catch (e) { /* ignore */ }
      }
      const cachedReads = safeStorage.getItem(`worker_read_inc_cache_${userId}`)
      if (cachedReads) {
        try { setReadIncidentIds(new Set(JSON.parse(cachedReads))) } catch (e) { /* ignore */ }
      }
    }
    
    await Promise.all([
      loadWorkReports(stationIds),
      loadIncidents(userId)
    ])
  }, [loadWorkReports, loadIncidents])

  const [viewInitialized, setViewInitialized] = useState(false)

  // Sessiya tayyor bo'lganda ma'lumotlarni yuklash
  useEffect(() => {
    if (!session) return

    if (!viewInitialized) {
      refreshData(session.id, session.stationIds || [])
      const stationsList = session.stationIds || []
      if (stationsList.length > 1) setView('selectStation')
      else if (stationsList.length === 1) setActiveStationId(stationsList[0])
      setViewInitialized(true)
    }
  }, [session, refreshData, viewInitialized])

  useEffect(() => {
    if (activeStationId && session?.role) {
      loadPendingCounts(activeStationId, session.role, session.position)
    }
  }, [activeStationId, session?.role, session?.position, loadPendingCounts])

  const realtimeConfigs = useMemo(() => {
    const configs = []

    if (activeStationId && session?.role) {
      configs.push({
        channelName: `worker_journals_${activeStationId}`,
        table: 'station_journals',
        filter: `station_id=eq.${activeStationId}`,
        onEvent: () => {
          if (activeStationId && session?.role) {
            loadPendingCounts(activeStationId, session.role, session.position)
          }
        }
      })
    }

    if (session?.id) {
      configs.push(
        {
          channelName: `worker_reports_${session.id}`,
          table: 'work_reports',
          // Removed worker_id filter so workers receive updates for reports made by other workers at their stations (like Katta Elektromexanik)
          onEvent: (payload: any) => {
            if (payload.new && Object.keys(payload.new).length > 0) {
              setReports(prev => {
                const idx = prev.findIndex(r => r.id === payload.new.id)
                if (idx > -1) {
                  const newReports = [...prev]
                  const oldReport = newReports[idx]
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
                } else {
                  return [mapDbReport(payload.new as DbWorkReportRow), ...prev]
                }
              })
            } else if (payload.eventType === 'DELETE') {
              setReports(prev => prev.filter(r => r.id !== payload.old.id))
            } else {
              loadWorkReports(session.stationIds || [])
            }
          }
        },
        {
          channelName: `worker_incidents_${session.id}`,
          table: 'incidents',
          onEvent: () => loadIncidents(session.id)
        },
        {
          channelName: `worker_incident_reads_${session.id}`,
          table: 'incident_reads',
          filter: `worker_id=eq.${session.id}`,
          onEvent: () => loadIncidents(session.id)
        }
      )
    }

    return configs
  }, [activeStationId, session?.id, session?.role, session?.position, session?.stationIds, loadPendingCounts, loadWorkReports, loadIncidents])

  useRealtimeSubscription(realtimeConfigs, realtimeConfigs.length > 0)

  const { bugunReja, qolibKetgan, sababliBajarilmagan } = useMemo(() => {
    const bugun: { reportId: string, entry: ReportEntry, month: string, taskText: string, type: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy', done: boolean }[] = []
    const qolib: { reportId: string, entry: ReportEntry, month: string, taskText: string, type: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy' }[] = []
    const sababli: { reportId: string, entry: ReportEntry, month: string, taskText: string, type: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy', reason: string, completedDate?: string }[] = []

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

      // Faqat dispetcher qabul qilgan (va rad etilmagan) rejalar bugungi ishlarga tushadi
      if (!r.confirmedAt || r.rejectedAt) return

      const isCurrentMonth = r.month === currentMonthStr
      const isPrevMonth = r.month === prevMonthStr

      if (!isCurrentMonth && !isPrevMonth) return

      r.entries.forEach(e => {
        const taskDay = parseInt((e.ragat || '').trim(), 10)
        if (isNaN(taskDay)) return

        // Har bir ustunni alohida ish sifatida hisoblash
        const columns: { content: string, done: boolean, type: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy', missedReason?: string, completedAfter?: string }[] = []
        if (e.haftalikJadval) columns.push({ content: e.haftalikJadval, done: !!e.doneHaftalik, type: 'haftalik', missedReason: e.missedReasonHaftalik, completedAfter: e.completedAfterMissedDateHaftalik })
        if (e.yillikJadval) columns.push({ content: e.yillikJadval, done: !!e.doneYillik, type: 'yillik', missedReason: e.missedReasonYillik, completedAfter: e.completedAfterMissedDateYillik })
        if (e.yangiIshlar) columns.push({ content: e.yangiIshlar, done: !!e.doneYangi, type: 'yangi', missedReason: e.missedReasonYangi, completedAfter: e.completedAfterMissedDateYangi })
        if (e.kmoBartaraf) columns.push({ content: e.kmoBartaraf, done: !!e.doneKmo, type: 'kmo', missedReason: e.missedReasonKmo, completedAfter: e.completedAfterMissedDateKmo })
        if (e.majburiyOzgarish) columns.push({ content: e.majburiyOzgarish, done: !!e.doneMajburiy, type: 'majburiy', missedReason: e.missedReasonMajburiy, completedAfter: e.completedAfterMissedDateMajburiy })

        if (columns.length === 0) return

        columns.forEach(col => {
          if (isCurrentMonth) {
            // Bugun bajarilishi kerak (bugungi ishlar)
            if (taskDay === todayDay) {
              bugun.push({ reportId: r.id, entry: e, month: r.month, taskText: col.content, type: col.type, done: col.done })
            }

            // Joriy oyda: muddati o'tgan
            if (taskDay < todayDay) {
              if (!col.done) {
                if (col.missedReason) {
                  sababli.push({ reportId: r.id, entry: e, month: r.month, taskText: col.content, type: col.type, reason: col.missedReason, completedDate: col.completedAfter })
                } else {
                  qolib.push({ reportId: r.id, entry: e, month: r.month, taskText: col.content, type: col.type })
                }
              }
            }
          } else if (isPrevMonth) {
            // O'tgan oyda: bajarilmagan barcha ishlar (muddat o'tib ketgan)
            if (!col.done) {
              if (col.missedReason) {
                sababli.push({ reportId: r.id, entry: e, month: r.month, taskText: col.content, type: col.type, reason: col.missedReason, completedDate: col.completedAfter })
              } else {
                qolib.push({ reportId: r.id, entry: e, month: r.month, taskText: col.content, type: col.type })
              }
            }
          }
        })
      })
    })
    return { bugunReja: bugun, qolibKetgan: qolib, sababliBajarilmagan: sababli }
  }, [reports, activeStationId])

  const _missedTasksCount = qolibKetgan.length

  if (!session || sessionLoading) return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" /></div>

  const station = activeStationId ? getStation(activeStationId) : null
  const stationName = station?.name || '...'

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
      <aside className={`bg-white/40 backdrop-blur-md border-r border-white/40 flex flex-col shrink-0 shadow-2xl lg:shadow-sm z-50 lg:z-20 fixed lg:relative inset-y-0 left-0 transform transition-all duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isDesktopSidebarCollapsed ? 'w-[260px] lg:w-[88px]' : 'w-[260px]'}`}>
        
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
            <button onClick={() => { setView('home'); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${view === 'home' || view === 'selectStation' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <Home size={18} className="shrink-0" /> 
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Bosh sahifa</span>
            </button>
            <button onClick={() => { setView('selectMonth'); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${view === 'selectMonth' || view === 'viewReport' || view === 'journal' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <FileText size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Oylik ish reja</span>
            </button>
            <button onClick={() => { setView('journalSelect'); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${['journalSelect', 'journalMonthSelect', 'du46', 'shu2', 'boshqaJurnallar', 'alsn', 'yerlatgich', 'alsnKod', 'mpsFriksion', 'dgaNazorat'].includes(view) ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <BookOpen size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Ish Jurnallari</span>
            </button>
            <button onClick={() => { setView('sxemalar'); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${view === 'sxemalar' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <MapIcon size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Bekat Sxemalari</span>
            </button>
            <button onClick={() => { setView('grafiklar'); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${view === 'grafiklar' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <BarChart2 size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Grafiklar</span>
            </button>
            <button onClick={() => { setView('incidents'); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${view === 'incidents' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <AlertTriangle size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Baxtsiz hodisalar</span>
            </button>
            <button onClick={() => { setView('kutubxona'); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${view === 'kutubxona' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <Library size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Kutubxona</span>
            </button>
            <button onClick={() => { setView('qurilmalar'); setIsMobileSidebarOpen(false); }} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden ${view === 'qurilmalar' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <Server size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Bekat qurilmalari</span>
            </button>
        </nav>

        {/* Train Image & User Block */}
        <div className={`relative shrink-0 w-full transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:h-[88px] lg:bg-white/40 lg:border-t lg:border-white/60' : 'h-[220px]'}`}>
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
               {/* Dropup Menu */}
               {isProfileMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-30" onClick={() => setIsProfileMenuOpen(false)} />
                   <div className="absolute bottom-full left-0 right-0 mb-2 z-40 bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-1.5 animate-fade-up origin-bottom">
                     <button
                       onClick={() => {
                         setIsProfileMenuOpen(false);
                         setIsSignOutModalOpen(true);
                       }}
                       className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors font-bold text-sm"
                     >
                       <LogOut size={18} />
                       {!isDesktopSidebarCollapsed && <span>Chiqish</span>}
                     </button>
                   </div>
                 </>
               )}

               <button 
                 onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                 className={`flex items-center rounded-2xl backdrop-blur-md border shadow-lg transition-all duration-300 active:scale-95 text-left w-full ${isDesktopSidebarCollapsed ? 'lg:p-2 lg:justify-center' : 'p-3 gap-3'} ${isProfileMenuOpen ? 'bg-white/60 border-blue-300 ring-4 ring-blue-500/20' : 'bg-white/40 border-white/50 hover:bg-white/50'}`}
               >
                 <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
                   <div className="h-full w-full bg-gradient-to-br from-blue-100/80 to-blue-50/80 flex items-center justify-center text-blue-700 font-bold shadow-inner">
                       {session?.fullName?.charAt(0) || 'U'}
                   </div>
                 </div>
                 <div className={`flex-1 min-w-0 transition-all duration-300 overflow-hidden ${isDesktopSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'opacity-100 w-auto'}`}>
                   <p className="truncate text-sm font-bold text-slate-900">{session?.fullName || 'Foydalanuvchi'}</p>
                   <p className="truncate text-[11px] font-bold text-slate-600 uppercase">
                      {session?.role === 'bekat_boshlighi' ? "Bekat Boshlig'i" : session?.role === 'elektromexanik' ? 'Elektromexanik' : session?.role === 'elektromontyor' ? 'Elektromontyor' : "Katta Elektromexanik"}
                   </p>
                 </div>
               </button>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-transparent pt-3 px-4 sm:px-6 mx-auto w-full max-w-[1600px] print:hidden">
          <div className="flex w-full items-center justify-between bg-white/10 backdrop-blur-xl px-3 sm:px-5 py-2 sm:py-3 rounded-[24px] sm:rounded-[32px] border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={() => setIsMobileSidebarOpen(true)} className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white/20 backdrop-blur-md p-2 shadow-sm border border-white/30 text-slate-600 hover:bg-slate-50 transition-all active:scale-95">
                <Menu size={20} />
              </button>
              {/* UTY Logo */}
              <div className="hidden sm:flex relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[16px] bg-white/20 backdrop-blur-md p-2 shadow-sm border border-white/30">
                <Image src="/uty-logo.png" alt="UTY" fill className="object-contain p-2 drop-shadow-sm" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-[15px] sm:text-[18px] font-black uppercase tracking-tight text-slate-900 leading-none">SMART SHCH</h1>
                {(session?.stationIds?.length || 0) > 1 ? (
                  <button
                    onClick={() => setView('selectStation')}
                    className="text-[8px] sm:text-[9.5px] font-black text-purple-600 truncate uppercase tracking-widest mt-1 drop-shadow-sm text-left hover:underline"
                  >
                    {stationName !== '...' ? `${stationName} BEKATI` : 'SMART CONTROL TIZIMI'} · O&apos;zgartirish
                  </button>
                ) : (
                  <p className="text-[8px] sm:text-[9.5px] font-black text-purple-600 truncate uppercase tracking-widest mt-1 drop-shadow-sm">{stationName !== '...' ? `${stationName} BEKATI` : 'SMART CONTROL TIZIMI'}</p>
                )}
                <p className="text-[10px] font-black text-slate-400 truncate uppercase tracking-tight mt-0.5 sm:hidden">{session?.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/20 border border-white/30 shadow-sm backdrop-blur-md">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                <span className="text-[11px] font-black text-slate-700 tracking-widest uppercase">{session?.fullName || 'Elektromexanik'}</span>
              </div>
              <button onClick={() => setIsMuted(!isMuted)} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-500 hover:bg-slate-50 hover:text-purple-600 transition-all shadow-sm active:scale-95">
                {isMuted ? <VolumeX size={20} strokeWidth={2.5} /> : <Volume2 size={20} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pt-4 sm:pt-8 px-4 lg:px-8 pb-8 custom-scrollbar">
          {view === 'selectStation' && (
            <div className="grid gap-6 sm:grid-cols-2 pt-4">
              {session?.stationIds?.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white p-16 text-center shadow-sm">
                  <div className="mb-6 rounded-full bg-amber-50 p-6">
                    <span className="text-4xl">⚠️</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800">Hech qanday bekat biriktirilmagan</h3>
                  <p className="mt-2 text-slate-500">Dispetcher bilan bog&apos;laning va bekatlaringizni so&apos;rang</p>
                </div>
              ) : (
                session?.stationIds?.map(sid => (
                  <button key={sid} onClick={() => { setActiveStationId(sid); setView('home') }} className="group flex flex-col items-center p-12 rounded-3xl border border-purple-100 bg-white/80 shadow-lg backdrop-blur-sm transition-all hover:border-purple-300 hover:scale-[1.02] hover:shadow-xl active:scale-95 animate-fade-up">
                    <div className="mb-6 text-5xl group-hover:scale-110 transition-transform">📍</div>
                    <span className="text-xl font-black text-slate-900 tracking-tight">{getStation(sid)?.name}</span>
                    <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Bekatni tanlash</p>
                  </button>
                ))
              )}
            </div>
          )}

          {view === 'home' && (
            <div className="grid gap-4 lg:grid-cols-3 sm:grid-cols-2 animate-fade-up">
                  {/* Bugun Bajarilishi Kerak Bo'lgan Ishlar */}
                  <div
                    onClick={() => setWorkerModal('bugunBajarilgan')}
                    className="cursor-pointer group relative rounded-3xl bg-white/30 backdrop-blur-md p-6 shadow-sm ring-1 ring-white/20 transition-all hover:bg-white/40 hover:shadow-md hover:ring-white/40 active:scale-95"
                  >
                     <div className="flex items-center gap-4">
                       <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform relative">
                         <FileText size={28} strokeWidth={2.5} />
                         {bugunReja.length > 0 && bugunReja.filter(b => b.done).length === bugunReja.length && (
                           <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white">
                             <CheckCircle2 size={12} className="text-white" />
                           </div>
                         )}
                       </div>
                       <div>
                         <p className="text-xs font-black uppercase tracking-widest text-slate-500">Bugungi ishlar</p>
                         <p className="text-3xl font-black text-slate-900 mt-1">{bugunReja.length}</p>
                       </div>
                     </div>
                     <p className="mt-4 text-sm font-medium text-slate-500">
                        {bugunReja.length > 0 ? `${bugunReja.length} ta reja, ${bugunReja.filter(b => b.done).length} ta bajarildi` : "Bugun uchun ish yo'q"}
                     </p>
                  </div>

                  {/* Bajarilmagan Ishlar */}
                  <div
                    onClick={() => setWorkerModal('qolibKetgan')}
                    className="cursor-pointer group relative rounded-3xl bg-white/30 backdrop-blur-md p-6 shadow-sm ring-1 ring-white/20 transition-all hover:bg-white/40 hover:shadow-md hover:ring-white/40 active:scale-95"
                  >
                     <div className="flex items-center gap-4">
                       <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 group-hover:scale-110 transition-transform">
                         <AlertTriangle size={28} strokeWidth={2.5} />
                       </div>
                       <div>
                         <p className="text-xs font-black uppercase tracking-widest text-slate-500">Bajarilmagan ishlar</p>
                         <p className="text-3xl font-black text-slate-900 mt-1">{qolibKetgan.length}</p>
                       </div>
                     </div>
                     <p className="mt-4 text-sm font-medium text-slate-500">
                        {qolibKetgan.length > 0 ? "Izoxsiz qolib ketgan ishlar" : "Barcha ishlar bajarilgan"}
                     </p>
                  </div>

                  {/* Sababli Bajarilmagan Ishlar */}
                  <div
                    onClick={() => setWorkerModal('sababliBajarilmagan')}
                    className="cursor-pointer group relative rounded-3xl bg-white/30 backdrop-blur-md p-6 shadow-sm ring-1 ring-white/20 transition-all hover:bg-white/40 hover:shadow-md hover:ring-white/40 active:scale-95"
                  >
                     <div className="flex items-center gap-4">
                       <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 group-hover:scale-110 transition-transform">
                         <BookOpen size={28} strokeWidth={2.5} />
                       </div>
                       <div>
                         <p className="text-xs font-black uppercase tracking-widest text-slate-500">Sababli qoldirilgan</p>
                         <p className="text-3xl font-black text-slate-900 mt-1">{sababliBajarilmagan.length}</p>
                       </div>
                     </div>
                     <p className="mt-4 text-sm font-medium text-slate-500">
                        {sababliBajarilmagan.length > 0 ? "Sabab ko'rsatilgan ishlar" : "Bunday ishlar yo'q"}
                     </p>
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
              onSubmit={() => { refreshData(session!.id, session!.stationIds || []); setView('home') }}
              onCancel={() => setView('home')}
              onReportUpdated={(reportId, newEntries) => {
                setReports(prev => prev.map(r => r.id === reportId ? { ...r, entries: newEntries } : r))
              }}
            />
          )}

          <div className={view === 'incidents' ? 'block animate-fade-up' : 'hidden'}>
            <IncidentsView
              incidents={incidents}
              readIds={readIncidentIds}
              workerId={session!.id}
              onRead={async () => {
                loadIncidents(session.id)
              }}
            />
          </div>

          <div className={view === 'kutubxona' ? 'block animate-fade-up' : 'hidden'}>
            <LibraryView userName={session?.fullName || ''} userRole={session?.role || ''} />
          </div>

          {view === 'viewReport' && selectedReport && (
            <div className="animate-fade-up">
              <HeaderCard title="Hisobot Ko'rinishi" subtitle={`${selectedReport.month} · ${stationName}`} status={selectedReport.rejectedAt ? 'rad etilgan' : selectedReport.confirmedAt ? 'tasdiqlandi' : 'kutilmoqda'} />
              <div className="mt-6 mb-6 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm relative shadow-sm">
                <div className="sm:hidden absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-2 py-1 z-10 rounded-bl-lg font-bold">
                  O&apos;ngga suring →
                </div>
                <div className="overflow-x-auto overflow-y-hidden">
                  <table style={{ minWidth: "1200px" }} className="w-full table-fixed border-collapse text-left text-[11px] text-slate-700">
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



          <div className={view === 'sxemalar' ? 'block' : 'hidden'}>
            <WorkerSchemasView stationId={activeStationId} stationName={stationName} />
          </div>
          <div className={view === 'grafiklar' ? 'block' : 'hidden'}>
            <WorkerGraphicsView />
          </div>
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
              userRole={session?.position || 'worker'}
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
              <HeaderCard title="Boshqa jurnallar" subtitle={stationName} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
                <button
                  onClick={() => setView('alsnMonthSelect')}
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/[0.25] backdrop-blur-3xl p-6 text-left transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 active:scale-95"
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
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/[0.25] backdrop-blur-3xl p-6 text-left transition-all hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 active:scale-95"
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
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/[0.25] backdrop-blur-3xl p-6 text-left transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 active:scale-95"
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
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/[0.25] backdrop-blur-3xl p-6 text-left transition-all hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/5 active:scale-95"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition-all group-hover:bg-white border border-transparent group-hover:border-violet-100 shadow-sm">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">MPS elektrodvigatellarni friksion tokini o&apos;lchash</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">MPS turidagi elektrodvigatellarni friksion tokini o&apos;lchash jurnali (NSH-01 9.1.4)</p>
                  </div>
                </button>
                <button
                  onClick={() => setView('dgaNazoratMonthSelect')}
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/[0.25] backdrop-blur-3xl p-6 text-left transition-all hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/5 active:scale-95"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-all group-hover:bg-white border border-transparent group-hover:border-amber-100 shadow-sm">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">DGA ishlashini nazorat qilish</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">Dizel generatorlarini ishlashini nazorat qilish jurnali (NSH-01 18.3.1)</p>
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

          {view === 'dgaNazoratMonthSelect' && (
            <JournalMonthSelectModal
              journalType={'dgaNazorat'}
              userRole="worker"
              onSelect={(monthKey) => {
                setSelectedJournalMonth(monthKey)
                setView('dgaNazorat')
              }}
              onClose={() => setView('boshqaJurnallar')}
            />
          )}

          {view === 'dgaNazorat' && (
            <DgaNazoratJournalView
              stationId={activeStationId}
              stationName={stationName}
              userName={session?.fullName || ''}
              userRole="worker"
              journalMonth={selectedJournalMonth}
              onClose={() => setView('home')}
            />
          )}

          {view === 'qurilmalar' && (
            activeStationId ? (
              <StationEquipmentsModal
                stationId={activeStationId}
                stationName={stationName}
                canEdit={session?.role === 'katta_elektromexanik' || session?.position === 'katta_elektromexanik'}
                userName={session?.fullName || 'Foydalanuvchi'}
                onClose={() => setView('home')}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white p-16 text-center shadow-sm">
                <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Avval bekat tanlang</p>
              </div>
            )
          )}

          {workerModal && (
            <WorkerTasksModal
              type={workerModal}
              bugun={bugunReja}
              qolib={qolibKetgan}
              sababli={sababliBajarilmagan}
              onClose={() => setWorkerModal(null)}
              onTaskClick={(task) => {
                if ((workerModal === 'bugunBajarilgan' || workerModal === 'qolibKetgan' || workerModal === 'sababliBajarilmagan') && task.month) {
                  const mIdx = Number(task.month.split('-')[1]) - 1
                  if (!isNaN(mIdx)) {
                    setSelectedMonth(mIdx)
                    setView('journal')
                    setWorkerModal(null)
                  }
                }
              }}
              onTasksUpdated={() => refreshData(session!.id, session!.stationIds || [])}
              stationName={stationName}
            />
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
