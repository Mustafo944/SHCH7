/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'

import {
  getStation,
} from '@/lib/store'
import {
  getReportsByStationsAndMonths,
  getIncidents,
  getReadIncidentIds,
  getPendingJournalCounts,
  getStationEquipments,
  mapDbReport,
  type DbWorkReportRow
} from '@/lib/supabase-db'
import type { PassportSection } from '@/types'
import { safeStorage } from '@/lib/utils/storage'
import { getRelayStatusCounts, type RelayStatusCounts } from '@/lib/relenazorat'
import { getMonitorStationForName } from '@/lib/monosxema/stations'
import { useSessionGuard, useToast, useNotificationSound, useRealtimeSubscription, useHardwareBack } from '@/lib/hooks'
import { ToastContainer } from '@/components/ToastContainer'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import { AppSidebar, type SidebarNavItem } from '@/components/AppSidebar'
import type { WorkReport, ReportEntry, Incident, JournalType } from '@/types'
import { MONTHS } from '@/lib/constants'
import dynamic from 'next/dynamic'
import { JournalMonthSelectModal } from '@/components/journals/JournalSelectModal'

const DU46JournalView = dynamic(() => import('@/components/journals/DU46JournalView').then(mod => mod.DU46JournalView), { ssr: false })
const SHU2JournalView = dynamic(() => import('@/components/journals/SHU2JournalView').then(mod => mod.SHU2JournalView), { ssr: false })
const ALSNJournalView = dynamic(() => import('@/components/journals/ALSNJournalView').then(mod => mod.ALSNJournalView), { ssr: false })
const YerlatgichJournalView = dynamic(() => import('@/components/journals/YerlatgichJournalView').then(mod => mod.YerlatgichJournalView), { ssr: false })
const AlsnKodJournalView = dynamic(() => import('@/components/journals/AlsnKodJournalView').then(mod => mod.AlsnKodJournalView), { ssr: false })
const MpsFriksionJournalView = dynamic(() => import('@/components/journals/MpsFriksionJournalView').then(mod => mod.MpsFriksionJournalView), { ssr: false })
const DgaNazoratJournalView = dynamic(() => import('@/components/journals/DgaNazoratJournalView').then(mod => mod.DgaNazoratJournalView), { ssr: false })
import { HeaderCard } from '@/components/worker/BigActionCard'
// Og'ir komponentlar haqiqiy code splitting bilan lazy load qilinadi
const JournalForm = dynamic(() => import('@/components/worker/JournalForm').then(mod => mod.JournalForm), { ssr: false, loading: () => <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md"><div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-purple-500" /></div> })
const WorkerGraphicsView = dynamic(() => import('@/components/worker/WorkerGraphicsView').then(mod => mod.WorkerGraphicsView), { ssr: false })
const WorkerSchemasView = dynamic(() => import('@/components/worker/WorkerSchemasView').then(mod => mod.WorkerSchemasView), { ssr: false })
const WorkerTasksModal = dynamic(() => import('@/components/worker/WorkerTasksModal').then(mod => mod.WorkerTasksModal), { ssr: false, loading: () => <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md"><div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-purple-500" /></div> })
import IncidentsView from '@/components/worker/IncidentsView'
import { LibraryView } from '@/components/library/LibraryView'
const StationEquipmentsView = dynamic(() => import('@/components/StationEquipmentsView').then(mod => mod.StationEquipmentsView), { ssr: false, loading: () => <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md"><div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-blue-500" /></div> })
const RelayListModal = dynamic(() => import('@/components/worker/RelayListModal').then(mod => mod.RelayListModal), { ssr: false, loading: () => <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md"><div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-amber-500" /></div> })
const StationScheme = dynamic(() => import('@/components/worker/monosxema/StationScheme').then(mod => mod.StationScheme), { ssr: false })
import {
  FileText,
  Map as MapIcon,
  LogOut,
  BookOpen,
  AlertTriangle,
  Volume2,
  VolumeX,
  CheckCircle2,
  Menu,
  Home,
  BarChart2,
  Library,
  Server,
  Zap,
  ChevronRight,
  Activity,
  X
} from 'lucide-react'

export default function WorkerPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard(['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik'])
  const toast = useToast()
  const [view, setView] = useState<'home' | 'selectStation' | 'selectMonth' | 'journal' | 'viewReport' | 'incidents' | 'sxemalar' | 'grafiklar' | 'kutubxona' | 'journalSelect' | 'journalMonthSelect' | 'du46' | 'shu2' | 'boshqaJurnallar' | 'alsn' | 'alsnMonthSelect' | 'yerlatgich' | 'yerlatgichMonthSelect' | 'alsnKod' | 'alsnKodMonthSelect' | 'mpsFriksion' | 'mpsFriksionMonthSelect' | 'dgaNazorat' | 'dgaNazoratMonthSelect' | 'qurilmalar'>('home')

  const [reports, setReports] = useState<WorkReport[]>([])
  // Haqiqiy (tarmoqdan) hisobotlar hali kelmasdan turib JournalForm tahrirlash/avto-saqlashni
  // boshlab yubormasligi uchun — aks holda eski, to'liq reja bo'sh holat bilan almashtirilib qolishi mumkin.
  const [reportsLoaded, setReportsLoaded] = useState(false)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [readIncidentIds, setReadIncidentIds] = useState<Set<string>>(new Set())
  const [activeStationId, setActiveStationId] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedJournalDay, setSelectedJournalDay] = useState<number | null>(null)
  const [selectedReport, _setSelectedReport] = useState<WorkReport | null>(null)
  const [pendingCounts, setPendingCounts] = useState({ du46: 0, shu2: 0 })
  const [relayCounts, setRelayCounts] = useState<RelayStatusCounts>({ soz: 0, nosoz: 0, muddatiKelgan: 0 })
  const [stationPassport, setStationPassport] = useState<PassportSection[]>([])
  const relayTotal = relayCounts.soz + relayCounts.muddatiKelgan + relayCounts.nosoz
  const relaySafeTotal = relayTotal || 1
  const relaySozPct = (relayCounts.soz / relaySafeTotal) * 100
  const relayWarnPct = (relayCounts.muddatiKelgan / relaySafeTotal) * 100
  const relayBadPct = (relayCounts.nosoz / relaySafeTotal) * 100
  const { isMuted, setIsMuted } = useNotificationSound(pendingCounts.du46)
  const [selectedJournalType, setSelectedJournalType] = useState<JournalType | null>(null)
  const [selectedJournalMonth, setSelectedJournalMonth] = useState<string>('')
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)
  const [workerModal, setWorkerModal] = useState<'bugunBajarilgan' | 'qolibKetgan' | 'sababliBajarilmagan' | null>(null)
  const [relayModalOpen, setRelayModalOpen] = useState(false)
  
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  const isSubViewActive = view !== 'home' || workerModal !== null || selectedJournalType !== null || isSignOutModalOpen || relayModalOpen || isMoreMenuOpen
  const handleHardwareBack = useCallback(() => {
    if (isSignOutModalOpen) {
      setIsSignOutModalOpen(false)
    } else if (isMoreMenuOpen) {
      setIsMoreMenuOpen(false)
    } else if (relayModalOpen) {
      setRelayModalOpen(false)
    } else if (selectedJournalType !== null) {
      setSelectedJournalType(null)
    } else if (workerModal !== null) {
      setWorkerModal(null)
    } else if (view !== 'home') {
      setView('home')
    }
  }, [view, workerModal, selectedJournalType, isSignOutModalOpen, relayModalOpen])

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
      // Faqat kerakli oylar yuklanadi: joriy yilning 12 oyi (JournalForm faqat
      // joriy yil oylarini ochadi) + yanvarda o'tgan yil dekabri ("o'tgan oy"
      // statistikasi uchun). Shu bilan payload yillar o'tsa ham o'smaydi.
      const now = new Date()
      const y = now.getFullYear()
      const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`)
      if (now.getMonth() === 0) months.push(`${y - 1}-12`)

      const r = await getReportsByStationsAndMonths(stationIds, months)
      setReports(r)
      if (typeof window !== 'undefined' && stationIds.length > 0) {
        safeStorage.setItemDebounced(`worker_reports_cache_${stationIds.join('_')}`, JSON.stringify(r))
      }
    } catch {
      toast.error('Hisobotlarni yuklashda xatolik')
    } finally {
      // Tarmoqdan bir marta (muvaffaqiyatli yoki xatolik bilan) javob kelgandan keyingina
      // JournalForm'ga tahrirlashga ruxsat beramiz — keshdan ko'rsatilgan taxminiy holatga ishonib qolmaslik uchun
      setReportsLoaded(true)
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
        safeStorage.setItemDebounced(`worker_incidents_cache_${userId}`, JSON.stringify(allInc))
        safeStorage.setItemDebounced(`worker_read_inc_cache_${userId}`, JSON.stringify(readIds))
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

  useEffect(() => {
    const name = activeStationId ? getStation(activeStationId)?.name : null
    if (!name) { setRelayCounts({ soz: 0, nosoz: 0, muddatiKelgan: 0 }); return }
    let cancelled = false
    getRelayStatusCounts(name).then(counts => { if (!cancelled) setRelayCounts(counts) })
    return () => { cancelled = true }
  }, [activeStationId])

  useEffect(() => {
    if (!activeStationId) { setStationPassport([]); return }
    let cancelled = false
    getStationEquipments(activeStationId)
      .then(data => { if (!cancelled) setStationPassport(data?.passport || []) })
      .catch(() => { if (!cancelled) setStationPassport([]) })
    return () => { cancelled = true }
  }, [activeStationId])

  const passportSectionDeviceCount = useCallback((section: PassportSection) => (
    section.devices.length + section.subSections.reduce((sum, sub) => sum + sub.devices.length, 0)
  ), [])

  const passportTotalDevices = useMemo(() => (
    stationPassport.reduce((sum, section) => sum + passportSectionDeviceCount(section), 0)
  ), [stationPassport, passportSectionDeviceCount])

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
  const monitorStation = getMonitorStationForName(stationName)

  const sidebarItems: SidebarNavItem[] = [
    { key: 'home', label: 'Bosh sahifa', icon: Home, active: view === 'home' || view === 'selectStation', onClick: () => setView('home') },
    { key: 'reja', label: 'Oylik ish reja', icon: FileText, active: ['selectMonth', 'viewReport', 'journal'].includes(view), onClick: () => setView('selectMonth') },
    { key: 'jurnallar', label: 'Ish Jurnallari', icon: BookOpen, active: ['journalSelect', 'journalMonthSelect', 'du46', 'shu2', 'boshqaJurnallar', 'alsn', 'yerlatgich', 'alsnKod', 'mpsFriksion', 'dgaNazorat'].includes(view), onClick: () => setView('journalSelect') },
    { key: 'sxemalar', label: 'Bekat Sxemalari', icon: MapIcon, active: view === 'sxemalar', onClick: () => setView('sxemalar') },
    { key: 'grafiklar', label: 'Grafiklar', icon: BarChart2, active: view === 'grafiklar', onClick: () => setView('grafiklar') },
    { key: 'incidents', label: 'Baxtsiz hodisalar', icon: AlertTriangle, active: view === 'incidents', onClick: () => setView('incidents') },
    { key: 'kutubxona', label: 'Kutubxona', icon: Library, active: view === 'kutubxona', onClick: () => setView('kutubxona') },
    { key: 'qurilmalar', label: 'Bekat qurilmalari', icon: Server, active: view === 'qurilmalar', onClick: () => setView('qurilmalar') },
  ]

  return (
    <div className="relative flex h-dvh overflow-hidden bg-slate-50 text-slate-900 selection:bg-blue-500/10 font-sans">
      <AuroraMeshBackground />

      <div className="hidden lg:block h-full">
        <AppSidebar
          items={sidebarItems}
          onSignOut={() => setIsSignOutModalOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isDesktopSidebarCollapsed}
          onToggleCollapse={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
          userName={session?.fullName}
          userRole={session?.role === 'bekat_boshlighi' ? "Bekat Boshlig'i" : session?.role === 'elektromexanik' ? 'Elektromexanik' : session?.role === 'elektromontyor' ? 'Elektromontyor' : 'Katta Elektromexanik'}
          userPhotoUrl={session?.photoUrl}
        />
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col min-w-0">
        {view !== 'home' && (
          <header className="sticky top-0 z-30 bg-transparent pt-3 px-4 sm:px-6 mx-auto w-full max-w-[1600px] print:hidden">
            <div className="flex w-full items-center justify-between bg-white/10 backdrop-blur-xl px-3 sm:px-5 py-2 sm:py-3 rounded-[24px] sm:rounded-[32px] border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-3 sm:gap-4">
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
        )}

        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${view !== 'home' ? 'pt-2 sm:pt-8 px-3 sm:px-4 lg:px-8' : ''} bg-transparent pb-28 lg:pb-8 custom-scrollbar relative`}>
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
            <div className="animate-fade-up pb-12 w-full lg:max-w-[1200px] xl:max-w-[1400px] lg:mx-auto min-h-screen lg:px-6">
              {/* SLIM HERO SECTION */}
              <div className="relative mx-3 lg:mx-0 mt-3 lg:mt-4 rounded-xl sm:rounded-2xl bg-white/40 backdrop-blur-xl px-3 sm:px-5 py-2 sm:py-2.5 shadow-[0_4px_24px_rgba(31,38,135,0.05)] border border-white/60 flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button 
                    onClick={() => setView('selectStation')}
                    className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-white/50 backdrop-blur-md p-1.5 shadow-sm border border-white/60 hover:bg-white/80 transition-colors active:scale-95"
                  >
                    <Image src="/uty-logo.png" alt="UTY" fill className="object-contain p-1.5 drop-shadow-sm" />
                  </button>
                  <div className="min-w-0 flex flex-col justify-center cursor-pointer" onClick={() => setView('selectStation')}>
                    <h2 className="text-[11px] sm:text-[13px] font-black tracking-wider text-[#0a1128] leading-none uppercase truncate drop-shadow-sm">
                      {stationName !== '...' ? `${stationName} BEKATI` : 'SMART CONTROL'}
                    </h2>
                    <p className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-500 truncate tracking-widest uppercase mt-1 leading-none">
                      {session?.fullName}
                    </p>
                  </div>
                </div>

                <button onClick={() => setIsMuted(!isMuted)} className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 border border-white/80 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                  {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />}
                </button>
              </div>

              {monitorStation && <StationScheme station={monitorStation} />}

              {/* 3 CARDS GRID */}
              <div className="relative z-20 mt-3 lg:mt-5 px-3 sm:px-4 lg:px-0">
                <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-3">
                  {/* Bugungi Ishlar */}
                  <div
                    onClick={() => {
                      const today = new Date()
                      setSelectedJournalDay(today.getDate())
                      setSelectedMonth(today.getMonth())
                      setView('journal')
                    }}
                    className="col-span-2 lg:col-span-1 cursor-pointer group flex flex-col justify-between overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white/60 backdrop-blur-2xl p-3.5 sm:p-5 shadow-[0_8px_32px_rgba(31,38,135,0.07)] transition-all hover:-translate-y-1 hover:shadow-xl border border-white/60"
                  >
                    <div className="flex items-start justify-between mb-3 sm:mb-5">
                      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                        <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-[16px] sm:rounded-[20px] bg-gradient-to-br from-[#4f75ff] to-[#3b5bdb] text-white shadow-[0_4px_15px_rgba(59,130,246,0.3)]">
                          <FileText className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 leading-tight">BUGUNGI ISHLAR</p>
                          <p className="text-[28px] sm:text-[36px] font-black text-[#1e293b] leading-none mt-1">{bugunReja.length}</p>
                        </div>
                      </div>
                      {bugunReja.length > 0 && bugunReja.filter(b => b.done).length === bugunReja.length ? (
                        <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-500 shadow-sm animate-fade-in">
                          <CheckCircle2 className="w-4 h-4 sm:w-4 sm:h-4" strokeWidth={3} />
                        </div>
                      ) : (
                        <ChevronRight size={16} className="text-slate-300 shrink-0 transition-transform group-hover:translate-x-1" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mb-2 truncate">{bugunReja.length > 0 ? `${bugunReja.length} ta reja, ${bugunReja.filter(b => b.done).length} ta bajarildi` : "Bugun uchun ish yo'q"}</p>
                      <div className="h-1 sm:h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-[#4f75ff] transition-all rounded-full" style={{ width: bugunReja.length > 0 ? `${(bugunReja.filter(b => b.done).length / bugunReja.length) * 100}%` : '0%' }} />
                      </div>
                    </div>
                  </div>

                  {/* Bajarilmagan Ishlar */}
                  <div
                    onClick={() => setWorkerModal('qolibKetgan')}
                    className="cursor-pointer group flex flex-col justify-between overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white/60 backdrop-blur-2xl p-3.5 sm:p-5 shadow-[0_8px_32px_rgba(31,38,135,0.07)] transition-all hover:-translate-y-1 hover:shadow-xl border border-white/60"
                  >
                    <div className="flex items-start justify-between mb-3 sm:mb-5">
                      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                        <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-[16px] sm:rounded-[20px] bg-gradient-to-br from-[#ff4b6b] to-[#e63956] text-white shadow-[0_4px_15px_rgba(239,68,68,0.3)]">
                          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 leading-tight">BAJARILMAGAN ISHLAR</p>
                          <p className="text-[28px] sm:text-[36px] font-black text-[#1e293b] leading-none mt-1">{qolibKetgan.length}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate mb-1">{qolibKetgan.length > 0 ? "Muddat o'tgan ishlar bor" : "Barcha ishlar bajarilgan"}</p>
                    </div>
                  </div>

                  {/* Sababli Qoldirilgan */}
                  <div
                    onClick={() => setWorkerModal('sababliBajarilmagan')}
                    className="cursor-pointer group flex flex-col justify-between overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white/60 backdrop-blur-2xl p-3.5 sm:p-5 shadow-[0_8px_32px_rgba(31,38,135,0.07)] transition-all hover:-translate-y-1 hover:shadow-xl border border-white/60"
                  >
                    <div className="flex items-start justify-between mb-3 sm:mb-5">
                      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                        <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-[16px] sm:rounded-[20px] bg-gradient-to-br from-[#ff8c00] to-[#e07b00] text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)]">
                          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 leading-tight">SABABLI QOLDIRILGAN ISHLAR</p>
                          <p className="text-[28px] sm:text-[36px] font-black text-[#1e293b] leading-none mt-1">{sababliBajarilmagan.length}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate mb-1">{sababliBajarilmagan.length > 0 ? "Boshqa kunga o'tkazilgan" : "Bunday ishlar yo'q"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* BIG RELE BLOCK */}
                <div 
                  onClick={() => setRelayModalOpen(true)}
                  className="mx-3 lg:mx-0 mt-4 sm:mt-6 lg:mt-5 cursor-pointer rounded-[32px] bg-gradient-to-br from-indigo-50/90 via-white/80 to-blue-50/90 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(31,38,135,0.07)] relative overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-xl border border-white/80 flex flex-col items-center"
                >
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl" />
                  <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-purple-400/10 blur-3xl" />
                  
                  <div className="w-full text-left relative z-10">
                    <h3 className="text-[10px] sm:text-[12px] font-black uppercase tracking-widest text-slate-500 mb-4 sm:mb-6">RELELAR HOLATI</h3>
                  </div>
                  
                  <div className="flex flex-col w-full items-center relative z-10">
                    {/* Circle Progress */}
                    <div className="relative flex h-[110px] w-[110px] sm:h-[130px] sm:w-[130px] shrink-0 items-center justify-center rounded-full mb-6 sm:mb-8">
                       <svg className="absolute inset-0 h-full w-full -rotate-90 transform drop-shadow-md" viewBox="0 0 100 100">
                         <defs>
                           <linearGradient id="relayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                             <stop offset="0%" stopColor="#8b5cf6" />
                             <stop offset="100%" stopColor="#00f2fe" />
                           </linearGradient>
                         </defs>
                         <circle className="text-indigo-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                         <circle className="text-[#00f2fe]" strokeWidth="8" strokeLinecap="round" stroke="url(#relayGradient)" fill="transparent" r="42" cx="50" cy="50" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - (relaySozPct || 100)/100)}`} />
                       </svg>
                      <div className="text-center">
                        <p className="text-[32px] sm:text-[38px] font-black text-slate-800 leading-none tracking-tight">{relayTotal}</p>
                        <p className="text-[8px] sm:text-[9.5px] font-bold uppercase tracking-widest text-slate-500 mt-1">TA RELE</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex w-full items-center justify-between gap-2 sm:gap-4">
                      <div className="flex-1 rounded-[20px] bg-white p-2.5 sm:p-4 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col items-center justify-center min-h-[64px] sm:min-h-[76px] transition-transform group-hover:scale-[1.02]">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-emerald-500">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                          <p className="text-[16px] sm:text-[20px] font-black text-slate-800">{relayCounts.soz}</p>
                        </div>
                        <p className="text-[7px] sm:text-[8.5px] font-black uppercase tracking-widest text-slate-400">SOZ</p>
                      </div>

                      <div className="flex-1 rounded-[20px] bg-white p-2.5 sm:p-4 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col items-center justify-center min-h-[64px] sm:min-h-[76px] transition-transform group-hover:scale-[1.02] delay-75">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-amber-500">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                          <p className="text-[16px] sm:text-[20px] font-black text-slate-800">{relayCounts.muddatiKelgan}</p>
                        </div>
                        <p className="text-[7px] sm:text-[8.5px] font-black uppercase tracking-widest text-slate-400 text-center leading-tight">MUDDATI<br className="sm:hidden"/> KELGAN</p>
                      </div>

                      <div className="flex-1 rounded-[20px] bg-white p-2.5 sm:p-4 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col items-center justify-center min-h-[64px] sm:min-h-[76px] transition-transform group-hover:scale-[1.02] delay-150">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-rose-500">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                          <p className="text-[16px] sm:text-[20px] font-black text-slate-800">{relayCounts.nosoz}</p>
                        </div>
                        <p className="text-[7px] sm:text-[8.5px] font-black uppercase tracking-widest text-slate-400">NOSOZ</p>
                      </div>
                    </div>
                  </div>
                </div>


                {/* BEKAT MA'LUMOTLARI */}
                <div className="mt-5 sm:mt-8 mb-4 px-1 sm:px-2">
                  <div
                    onClick={() => setView('qurilmalar')}
                    className="cursor-pointer rounded-[24px] sm:rounded-[32px] bg-white/60 backdrop-blur-2xl p-4 sm:p-6 shadow-[0_8px_32px_rgba(31,38,135,0.07)] transition-all hover:-translate-y-1 hover:shadow-xl border border-white/60"
                  >
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-[16px] sm:rounded-[20px] bg-gradient-to-br from-[#26449c] to-[#16225c] text-white shadow-[0_4px_15px_rgba(38,68,156,0.3)]">
                          <Server className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-[14px] sm:text-[18px] font-black uppercase tracking-widest text-[#1e293b]">BEKAT PASPORTI</h3>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 shrink-0" />
                    </div>

                    {stationPassport.length === 0 ? (
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 text-center py-4">Hali bo&apos;lim qo&apos;shilmagan</p>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                        {stationPassport.map(section => (
                          <div key={section.id} className="flex items-center justify-between gap-2 rounded-[20px] bg-white p-3 sm:p-4 border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:border-blue-100 transition-colors">
                            <span className="text-[12px] sm:text-[14px] font-bold text-slate-700 truncate">{section.name}</span>
                            <span className="text-[14px] sm:text-[16px] font-black text-[#26449c] shrink-0">{passportSectionDeviceCount(section)} ta</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
          )}

          {view === 'selectMonth' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 animate-fade-up">
              {MONTHS.map((m, i) => {
                const isCurrent = i === new Date().getMonth()
                return (
                  <button key={m} onClick={() => { setSelectedMonth(i); setSelectedJournalDay(null); setView('journal') }} className={`group flex flex-col p-6 rounded-2xl border shadow-sm backdrop-blur-sm transition-all ${isCurrent ? 'border-purple-300 bg-purple-50/80 shadow-purple-500/5' : 'border-slate-200/60 bg-white/80 hover:bg-purple-50/40 hover:border-purple-200'}`}>
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
              reportsLoaded={reportsLoaded}
              initialDay={selectedJournalDay ?? undefined}
              onSubmit={() => { refreshData(session!.id, session!.stationIds || []); setSelectedJournalDay(null); setView('home') }}
              onCancel={() => { setSelectedJournalDay(null); setView('home') }}
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
            <div className="space-y-6 animate-fade-up">
              <HeaderCard title="Ish Jurnallari" subtitle={stationName} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
                <button
                  onClick={() => { setSelectedJournalType('du46'); setView('journalMonthSelect') }}
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/40 backdrop-blur-md p-6 text-left transition-all hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 active:scale-95"
                >
                  {pendingCounts.du46 > 0 && (
                    <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white shadow-lg shadow-red-500/30">
                      {pendingCounts.du46 > 9 ? '9+' : pendingCounts.du46}
                    </div>
                  )}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-all group-hover:bg-white border border-transparent group-hover:border-purple-100 shadow-sm">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">DU-46</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">Ko&apos;rik, tekshiruvlar tahlili va nosozliklar jurnali</p>
                  </div>
                </button>
                <button
                  onClick={() => { setSelectedJournalType('shu2'); setView('journalMonthSelect') }}
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/40 backdrop-blur-md p-6 text-left transition-all hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 active:scale-95"
                >
                  {pendingCounts.shu2 > 0 && (
                    <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white shadow-lg shadow-red-500/30">
                      {pendingCounts.shu2 > 9 ? '9+' : pendingCounts.shu2}
                    </div>
                  )}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-all group-hover:bg-white border border-transparent group-hover:border-amber-100 shadow-sm">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">SHU-2</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">SMB va aloqa obyektlarida bajarilgan ishlar jurnali</p>
                  </div>
                </button>
                <button
                  onClick={() => { setSelectedJournalType('boshqa'); setView('boshqaJurnallar') }}
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/40 backdrop-blur-md p-6 text-left transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 active:scale-95"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-white border border-transparent group-hover:border-blue-100 shadow-sm">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Boshqa jurnallar</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">Tez kunda yangi jurnallar ro&apos;yxati qo&apos;shiladi</p>
                  </div>
                </button>
              </div>
            </div>
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
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/40 backdrop-blur-md p-6 text-left transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 active:scale-95"
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
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/40 backdrop-blur-md p-6 text-left transition-all hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 active:scale-95"
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
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/40 backdrop-blur-md p-6 text-left transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 active:scale-95"
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
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/40 backdrop-blur-md p-6 text-left transition-all hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/5 active:scale-95"
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
                  className="group relative flex items-center gap-5 rounded-[32px] border border-white/60 bg-white/40 backdrop-blur-md p-6 text-left transition-all hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/5 active:scale-95"
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
              <StationEquipmentsView
                stationId={activeStationId}
                stationName={stationName}
                canEdit={session?.role === 'katta_elektromexanik' || session?.position === 'katta_elektromexanik'}
                canEditTaskMappings={session?.role === 'katta_elektromexanik' || session?.position === 'katta_elektromexanik'}
                userName={session?.fullName || 'Foydalanuvchi'}
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
                    const taskDay = parseInt((task.entry.ragat || '').trim(), 10)
                    setSelectedJournalDay(!isNaN(taskDay) ? taskDay : null)
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

          {relayModalOpen && stationName && (
            <RelayListModal
              stationName={stationName}
              onClose={() => setRelayModalOpen(false)}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-white/60 backdrop-blur-3xl border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-around px-1 py-2">
            {[
              { key: 'home', label: 'Asosiy', icon: Home, active: view === 'home' || view === 'selectStation', onClick: () => { setView('home'); setIsMoreMenuOpen(false); } },
              { key: 'reja', label: 'Ish reja', icon: FileText, active: ['selectMonth', 'viewReport', 'journal'].includes(view), onClick: () => { setView('selectMonth'); setIsMoreMenuOpen(false); } },
              { key: 'jurnallar', label: 'Jurnallar', icon: BookOpen, active: ['journalSelect', 'journalMonthSelect', 'du46', 'shu2', 'boshqaJurnallar', 'alsn', 'yerlatgich', 'alsnKod', 'mpsFriksion', 'dgaNazorat'].includes(view), onClick: () => { setView('journalSelect'); setIsMoreMenuOpen(false); } },
            ].map(item => (
              <button key={item.key} onClick={item.onClick} className={`flex flex-col items-center justify-center w-[76px] h-14 rounded-2xl transition-all active:scale-95 ${item.active ? 'text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <div className={`mb-1 p-1.5 rounded-xl ${item.active ? 'bg-purple-100/80 shadow-sm' : 'bg-white/30'}`}>
                  <item.icon size={22} strokeWidth={item.active ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-bold ${item.active ? 'text-purple-700' : 'text-slate-600'}`}>{item.label}</span>
              </button>
            ))}
            <button onClick={() => setIsMoreMenuOpen(true)} className={`flex flex-col items-center justify-center w-[76px] h-14 rounded-2xl transition-all active:scale-95 ${isMoreMenuOpen ? 'text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <div className={`mb-1 p-1.5 rounded-xl ${isMoreMenuOpen ? 'bg-purple-100/80 shadow-sm' : 'bg-white/30'}`}>
                <Menu size={22} strokeWidth={isMoreMenuOpen ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold ${isMoreMenuOpen ? 'text-purple-700' : 'text-slate-600'}`}>Ko'proq</span>
            </button>
          </div>
        </div>

        {/* More Menu Bottom Sheet */}
        {isMoreMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={() => setIsMoreMenuOpen(false)} />
            <div className="relative w-full bg-white/60 backdrop-blur-3xl rounded-t-[36px] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-fade-up border-t border-white/60 pb-safe">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white font-black text-sm shadow-md shadow-blue-600/25">
                    {session?.photoUrl ? (
                      <img src={session.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      session?.fullName?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight">{session?.fullName || 'Foydalanuvchi'}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {session?.role === 'bekat_boshlighi' ? "Bekat Boshlig'i" : session?.role === 'elektromexanik' ? 'Elektromexanik' : session?.role === 'elektromontyor' ? 'Elektromontyor' : 'Katta Elektromexanik'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsMoreMenuOpen(false)} className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 active:scale-95 transition-all">
                  <X size={16} strokeWidth={3} />
                </button>
              </div>
              <div className="mb-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-3">Qo'shimcha bo'limlar</h3>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[
                  { key: 'sxemalar', label: 'Sxemalar', icon: MapIcon, active: view === 'sxemalar', onClick: () => { setView('sxemalar'); setIsMoreMenuOpen(false); } },
                  { key: 'grafiklar', label: 'Grafiklar', icon: BarChart2, active: view === 'grafiklar', onClick: () => { setView('grafiklar'); setIsMoreMenuOpen(false); } },
                  { key: 'incidents', label: 'Hodisalar', icon: AlertTriangle, active: view === 'incidents', onClick: () => { setView('incidents'); setIsMoreMenuOpen(false); } },
                  { key: 'kutubxona', label: 'Kutubxona', icon: Library, active: view === 'kutubxona', onClick: () => { setView('kutubxona'); setIsMoreMenuOpen(false); } },
                  { key: 'qurilmalar', label: 'Qurilmalar', icon: Server, active: view === 'qurilmalar', onClick: () => { setView('qurilmalar'); setIsMoreMenuOpen(false); } },
                ].map(item => (
                  <button key={item.key} onClick={item.onClick} className="flex flex-col items-center gap-2">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl border ${item.active ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-slate-50 border-slate-100 text-slate-500'} transition-all active:scale-95 shadow-sm`}>
                      <item.icon size={22} strokeWidth={item.active ? 2.5 : 2} />
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-600 text-center leading-tight truncate w-full">{item.label}</span>
                  </button>
                ))}
                
                {/* Chiqish */}
                <button onClick={() => { setIsMoreMenuOpen(false); setIsSignOutModalOpen(true); }} className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl border bg-red-50 border-red-100 text-red-500 transition-all active:scale-95 shadow-sm">
                    <LogOut size={22} strokeWidth={2.5} />
                  </div>
                  <span className="text-[9.5px] font-bold text-red-600 text-center leading-tight truncate w-full">Chiqish</span>
                </button>
              </div>
            </div>
          </div>
        )}
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
