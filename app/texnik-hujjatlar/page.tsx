/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useCallback, useMemo } from 'react'
import useSWR, { mutate, preload } from 'swr'
import { useSessionGuard, useToast, useHardwareBack } from '@/lib/hooks'
import { ToastContainer } from '@/components/ToastContainer'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import { AppSidebar, type SidebarNavItem } from '@/components/AppSidebar'
import { getTdmsSchedulesAdmin } from '@/lib/tdms-actions'
import { ConfirmModal } from '@/components/ConfirmModal'
import {
  getTdmsDocuments,
  getTdmsAudits,
  addTdmsDocument,
  deleteTdmsDocument,
  addTdmsAudit,
  addTdmsSchedule,
  completeTdmsSchedule,
  deleteTdmsSchedule,
  getTdmsPages,
  addTdmsPage,
  uploadTdmsPageFile,
  replaceTdmsPage,
  deleteTdmsPage,
  getTdmsPageVersions,
  deleteTdmsPageVersion,
  getTdmsPageChecks,
  getTdmsPageChecksByPage,
  checkTdmsPage,
  uncheckTdmsPage,
  getTdmsStations,
  addTdmsStation,
  deleteTdmsStation,
  updateTdmsStation,
  getTdmsMismatchReports,
  type TdmsDocument,
  type TdmsAudit,
  type TdmsSchedule,
  type TdmsPage,
  type TdmsPageVersion,
  type TdmsPageCheck,
  type TdmsStation,
} from '@/lib/tdms-db'
import {
  Home,
  FileText,
  CalendarCheck,
  BarChart2,
  Menu,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  X,
  Shield,
  ArrowLeft,
  Eye,
  History,
  RefreshCw,
  Layers,
  ChevronRight,
  AlertTriangle,
  Lock,
  ChevronDown,
  Check,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts'

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
]

const AUDIT_TYPE_LABELS: Record<string, string> = {
  cat1: 'Bekat qurilmalarining sxemaga mosligi',
  cat2: 'Bekat sxemalarining distansiya sxemalariga mosligi',
  cat3: 'Bekat TTD va distansiya sxemalari',
  cat4: 'BMTU UK TTD va distansiya sxemalari',
}

const getCategoryColor = (type: string, completed: boolean) => {
  if (completed) {
    switch (type) {
      case 'cat1': return 'bg-blue-400 text-white'
      case 'cat2': return 'bg-red-400 text-white'
      case 'cat3': return 'bg-purple-400 text-white'
      case 'cat4': return 'bg-orange-400 text-white'
      default: return 'bg-emerald-400 text-white'
    }
  }
  switch (type) {
    case 'cat1': return 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer shadow-sm'
    case 'cat2': return 'bg-red-500 text-white hover:bg-red-600 cursor-pointer shadow-sm'
    case 'cat3': return 'bg-purple-500 text-white hover:bg-purple-600 cursor-pointer shadow-sm'
    case 'cat4': return 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer shadow-sm'
    default: return 'bg-slate-500 text-white shadow-sm'
  }
}


const AUDIT_TYPE_COLORS: Record<string, string> = {
  cat1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cat2: 'bg-red-100 text-red-700 border-red-200',
  cat3: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cat4: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

type Tab = 'dashboard' | 'hujjatlar' | 'grafik' | 'tekshiruvlar'

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function TexnikHujjatlarPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard('texnik_hujjatlar')
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)

  // Modal states
  const [showAddDocModal, setShowAddDocModal] = useState(false)
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false)
  const [activeScheduleMenu, setActiveScheduleMenu] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('')
  const [scheduleYear, setScheduleYear] = useState(new Date().getFullYear())

  // Varaqlar (Pages) states
  const [selectedDocument, setSelectedDocument] = useState<TdmsDocument | null>(null)
  const [selectedPage, setSelectedPage] = useState<TdmsPage | null>(null)
  const [showAddPageModal, setShowAddPageModal] = useState(false)
  const [activeRole, setActiveRole] = useState<'texnik_hujjatlar' | 'elektromexanik'>('texnik_hujjatlar')

  // Bekatlar boshqaruvi (faqat texnik hujjatlar uchun — boshqa sahifalarga ta'sir qilmaydi)
  const { data: tdmsStations = [], mutate: mutateTdmsStations } = useSWR(
    session ? 'tdms_stations' : null,
    getTdmsStations
  )
  const [showAddStationModal, setShowAddStationModal] = useState(false)
  const [editStation, setEditStation] = useState<TdmsStation | null>(null)
  const [deleteConfirmStation, setDeleteConfirmStation] = useState<TdmsStation | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ id: string, type: 'document' | 'schedule' } | null>(null)

  // tdmsStations ni stations sifatida ishlatamiz (id va name bilan)
  const stations = tdmsStations.map(s => ({ id: s.id, name: s.name }))

  // ─── Data Fetching ───────────────────────────────────────────────────────
  const { data: documents = [], mutate: mutateDocs } = useSWR(
    session ? 'tdms_documents' : null,
    getTdmsDocuments
  )

  const { data: audits = [], mutate: mutateAudits } = useSWR(
    session ? 'tdms_audits' : null,
    getTdmsAudits
  )

  const { data: schedules = [], mutate: mutateSchedules } = useSWR(
    session ? `tdms_schedules_${scheduleYear}` : null,
    () => getTdmsSchedulesAdmin(scheduleYear)
  )

  // Mos kelmaydigan varaqlar (elektromexanik izohlari bilan)
  const { data: mismatchReports = [] } = useSWR(
    session ? 'tdms_mismatch_reports' : null,
    getTdmsMismatchReports
  )

  // Kategoriyani tanlash uchun state (Option A bo'yicha 4 ta toifa)
  const [scheduleCategory, setScheduleCategory] = useState<'cat1' | 'cat2' | 'cat3' | 'cat4'>('cat1')

  // ─── Hardware Back ───────────────────────────────────────────────────────
  const isSubViewActive = showAddDocModal || showAddScheduleModal || isSignOutModalOpen || isMobileSidebarOpen || !!selectedPage || !!selectedDocument || showAddPageModal
  const handleHardwareBack = useCallback(() => {
    if (isMobileSidebarOpen) setIsMobileSidebarOpen(false)
    else if (isSignOutModalOpen) setIsSignOutModalOpen(false)
    else if (selectedPage) setSelectedPage(null)
    else if (showAddPageModal) setShowAddPageModal(false)
    else if (selectedDocument) setSelectedDocument(null)
    else if (showAddDocModal) setShowAddDocModal(false)
    else if (showAddScheduleModal) setShowAddScheduleModal(false)
  }, [isMobileSidebarOpen, isSignOutModalOpen, showAddDocModal, showAddScheduleModal, selectedDocument, selectedPage, showAddPageModal])
  useHardwareBack(isSubViewActive, handleHardwareBack)

  // ─── Dashboard Aggregations ──────────────────────────────────────────────
  const dashboardStats = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()

    // Har bir bekat uchun oxirgi yillik va 3 yillik tekshiruv sanasini topish
    const stationStatus = stations.map(station => {
      const stationAudits = audits.filter(a => a.station_id === station.id)
      const stationDocs = documents.filter(d => d.station_id === station.id)

      // Oxirgi cat1 tekshiruv
      const lastYearly = stationAudits
        .filter(a => a.audit_type === 'cat1')
        .sort((a, b) => new Date(b.audited_at).getTime() - new Date(a.audited_at).getTime())[0]

      // Oxirgi cat2 tekshiruv
      const last3Year = stationAudits
        .filter(a => a.audit_type === 'cat2')
        .sort((a, b) => new Date(b.audited_at).getTime() - new Date(a.audited_at).getTime())[0]

      // Status hisoblash
      let status: 'green' | 'yellow' | 'red' = 'red'

      if (lastYearly) {
        const lastDate = new Date(lastYearly.audited_at)
        const diffMonths = (currentYear - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth())
        if (diffMonths <= 10) status = 'green'
        else if (diffMonths <= 12) status = 'yellow'
        else status = 'red'
      }

      return {
        station,
        lastYearly,
        last3Year,
        docCount: stationDocs.length,
        status,
      }
    })

    const greenCount = stationStatus.filter(s => s.status === 'green').length
    const yellowCount = stationStatus.filter(s => s.status === 'yellow').length
    const redCount = stationStatus.filter(s => s.status === 'red').length

    // Joriy yil tekshiruvlari
    const currentYearSchedules = schedules.filter(s => s.year === currentYear)
    const completedSchedules = currentYearSchedules.filter(s => s.completed)
    const pendingSchedules = currentYearSchedules.filter(s => !s.completed && s.month <= now.getMonth() + 1)

    // ─── CHARTS DATA PREPARATION ───
    const pieData = [
      { name: 'Yaxshi', value: greenCount, color: '#10b981' },
      { name: 'Muddati yaqin', value: yellowCount, color: '#f59e0b' },
      { name: 'Muddati o\'tgan', value: redCount, color: '#ef4444' }
    ].filter(d => d.value > 0)

    const categoryMap = new Map<string, number>()
    documents.forEach(d => {
      const cat = d.category || 'Boshqa'
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
    })
    const barData = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, Hujjatlar: count }))
      .sort((a, b) => b.Hujjatlar - a.Hujjatlar)

    const areaData = MONTHS_UZ.map((m, i) => {
      const monthSchedules = currentYearSchedules.filter(s => s.month === i + 1)
      const completed = monthSchedules.filter(s => s.completed).length
      const pending = monthSchedules.filter(s => !s.completed).length
      return { month: m.slice(0, 3), Bajarilgan: completed, Kutilayotgan: pending }
    })

    // Joriy oy ishlari
    const currentMonth = now.getMonth() + 1
    const currentMonthSchedules = currentYearSchedules.filter(s => s.month === currentMonth)
    const tasksByCategory = {
      cat1: currentMonthSchedules.filter(s => s.audit_type === 'cat1'),
      cat2: currentMonthSchedules.filter(s => s.audit_type === 'cat2'),
      cat3: currentMonthSchedules.filter(s => s.audit_type === 'cat3'),
      cat4: currentMonthSchedules.filter(s => s.audit_type === 'cat4'),
    }

    // Actionable Metrics
    const overdueTasks = currentYearSchedules.filter(s => s.month < currentMonth && !s.completed).length
    const currentMonthRemaining = currentYearSchedules.filter(s => s.month === currentMonth && !s.completed).length
    const yearlyProgress = currentYearSchedules.length > 0 
      ? Math.round((completedSchedules.length / currentYearSchedules.length) * 100)
      : 0
    const problematicStationIds = new Set(currentYearSchedules.filter(s => s.month < currentMonth && !s.completed).map(s => s.station_id))

    return {
      stationStatus,
      greenCount,
      yellowCount,
      redCount,
      totalDocs: documents.length,
      totalAudits: audits.length,
      completedSchedules: completedSchedules.length,
      pendingSchedules: pendingSchedules.length,
      totalSchedules: currentYearSchedules.length,
      overdueTasks,
      currentMonthRemaining,
      yearlyProgress,
      problematicStationsCount: problematicStationIds.size,
      pieData,
      barData,
      areaData,
      tasksByCategory,
      currentMonthName: MONTHS_UZ[currentMonth - 1]
    }
  }, [stations, audits, documents, schedules])

  // ─── Filtered Documents ──────────────────────────────────────────────────
  const filteredDocs = useMemo(() => {
    let filtered = documents
    if (selectedStationFilter) {
      const selectedStationName = stations.find(s => s.id === selectedStationFilter)?.name
      if (selectedStationName) {
        filtered = filtered.filter(d => 
          d.station_id === selectedStationFilter || 
          d.station_name.toLowerCase() === selectedStationName.toLowerCase()
        )
      } else {
        filtered = filtered.filter(d => d.station_id === selectedStationFilter)
      }
    } else if (!searchQuery.trim()) {
      // Bekat tanlanmagan va qidiruv yo'q — hech narsa ko'rsatmaslik
      return []
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.station_name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [documents, selectedStationFilter, searchQuery, stations])

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleAddDocument = async (doc: Omit<TdmsDocument, 'id' | 'created_at'>) => {
    try {
      await addTdmsDocument(doc)
      mutateDocs()
      setShowAddDocModal(false)
      toast.success("Hujjat muvaffaqiyatli qo'shildi!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  }

  const confirmDeleteDocument = async (id: string) => {
    try {
      await deleteTdmsDocument(id)
      mutateDocs()
      toast.success("Hujjat o'chirildi")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  }

  const handleDeleteDocument = (id: string) => {
    setConfirmAction({ id, type: 'document' })
  }

  const handleAddSchedule = async (schedule: Omit<TdmsSchedule, 'id' | 'created_at' | 'completed' | 'completed_audit_id'>) => {
    try {
      await addTdmsSchedule(schedule)
      mutateSchedules()
      setShowAddScheduleModal(false)
      toast.success("Grafik qo'shildi!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  }

  const confirmDeleteSchedule = async (id: string) => {
    try {
      await deleteTdmsSchedule(id)
      mutateSchedules()
      toast.success("Grafik o'chirildi")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  }

  const handleDeleteSchedule = (id: string) => {
    setConfirmAction({ id, type: 'schedule' })
  }

  const handleCompleteAudit = async (stationId: string, stationName: string, auditType: TdmsAudit['audit_type'], scheduleId?: string) => {
    if (!session) return
    try {
      const audit = await addTdmsAudit({
        document_id: '', // Umumiy bekat audit
        station_id: stationId,
        station_name: stationName,
        audit_type: auditType,
        auditor_name: session.fullName,
        auditor_role: 'texnik_hujjatlar',
        note: '',
        audited_at: new Date().toISOString(),
      })

      if (scheduleId) {
        await completeTdmsSchedule(scheduleId, audit.id)
        mutateSchedules()
      }

      mutateAudits()
      toast.success(`${AUDIT_TYPE_LABELS[auditType]} muvaffaqiyatli tasdiqlandi!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  }

  // ─── Loading / No Session ────────────────────────────────────────────────
  if (!session || sessionLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
    </div>
  )

  // ─── Sidebar Items ───────────────────────────────────────────────────────
  const sidebarItems: SidebarNavItem[] = [
    { key: 'dashboard', label: 'Boshqaruv paneli', icon: Home, active: tab === 'dashboard', onClick: () => setTab('dashboard') },
    { key: 'hujjatlar', label: 'Bekatlar sxemasi', icon: FileText, active: tab === 'hujjatlar', onClick: () => setTab('hujjatlar') },
    { key: 'grafik', label: 'Tekshiruv grafigi', icon: CalendarCheck, active: tab === 'grafik', onClick: () => setTab('grafik') },
    { key: 'tekshiruvlar', label: 'Tekshiruvlar tarixi', icon: BarChart2, active: tab === 'tekshiruvlar', onClick: () => setTab('tekshiruvlar') },
  ]

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-teal-500/10 font-sans">
      <AuroraMeshBackground />

      <AppSidebar
        items={sidebarItems}
        onSignOut={() => setIsSignOutModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isDesktopSidebarCollapsed}
        onToggleCollapse={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
        userName={session?.fullName}
        userRole={activeRole === 'texnik_hujjatlar' ? "Texnik hujjatlar muhandisi" : "Katta elektromexanik"}
        userPhotoUrl={session?.photoUrl}
      />

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-transparent pt-3 px-4 sm:px-6 mx-auto w-full max-w-[1600px]">
          <div className="flex w-full items-center justify-between bg-white/[0.25] backdrop-blur-3xl px-3 sm:px-5 py-2 sm:py-3 rounded-[32px] sm:rounded-[40px] shadow-sm border border-white/50">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={() => setIsMobileSidebarOpen(true)} className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white/20 backdrop-blur-md p-2 shadow-sm border border-white/30 text-slate-600 hover:bg-slate-50 transition-all active:scale-95">
                <Menu size={20} />
              </button>
              <div className="hidden sm:flex relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center bg-white rounded-full shadow-sm">
                <img src="/uty-logo.png" alt="UTY" className="w-full h-full object-contain p-2 drop-shadow-sm" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-[15px] sm:text-[18px] font-black uppercase tracking-tight text-slate-900 leading-none">SMART SHCH</h1>
                <p className="text-[8px] sm:text-[9.5px] font-black text-teal-600 truncate uppercase tracking-widest mt-1 drop-shadow-sm">TEXNIK HUJJATLAR BOSHQARUVI</p>
                <p className="text-[10px] font-black text-slate-400 truncate uppercase tracking-tight mt-0.5 sm:hidden">{session?.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setActiveRole(r => r === 'texnik_hujjatlar' ? 'elektromexanik' : 'texnik_hujjatlar')}
                className="hidden sm:flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-sm hover:bg-white/80 transition-colors cursor-pointer"
                title="Rolni o'zgartirish (Test uchun)"
              >
                <div className={`h-2 w-2 animate-pulse rounded-full shadow-[0_0_8px_rgba(20,184,166,0.6)] ${activeRole === 'texnik_hujjatlar' ? 'bg-teal-400' : 'bg-amber-400'}`}></div>
                <span className="text-[11px] font-black text-slate-700 tracking-widest uppercase">
                  {activeRole === 'texnik_hujjatlar' ? 'Texnik muhandis' : 'Elektromexanik (ShN)'}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-6 mx-auto w-full max-w-[1600px]">
          {/* ═══ DASHBOARD ═══ */}
          {tab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Statistika kartochkalar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<FileText size={20} />} label="Jami hujjatlar" value={dashboardStats.totalDocs} color="teal" />
                <StatCard icon={<Shield size={20} />} label="Jami tekshiruvlar" value={dashboardStats.totalAudits} color="blue" />
                <StatCard icon={<CheckCircle2 size={20} />} label="Bajarilgan (bu yil)" value={dashboardStats.completedSchedules} color="emerald" />
                <StatCard icon={<Clock size={20} />} label="Kutilayotgan" value={dashboardStats.pendingSchedules} color="amber" />
              </div>

              {/* Joriy oydagi ishlar */}
              <div className="premium-card relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <CalendarCheck size={120} />
                </div>
                <div className="relative p-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <span className="bg-teal-50 text-teal-600 p-1.5 rounded-lg">
                          <CalendarCheck size={20} />
                        </span>
                        Joriy oy rejalari
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                        {dashboardStats.currentMonthName} oyi uchun belgilangan vazifalar ro'yxati
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {(['cat1', 'cat2', 'cat3', 'cat4'] as const).map(cat => {
                      const tasks = dashboardStats.tasksByCategory[cat]
                      if (tasks.length === 0) return null
                      
                      const colorMap = {
                        cat1: 'from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-200/50',
                        cat2: 'from-red-500/10 to-red-500/5 text-red-600 border-red-200/50',
                        cat3: 'from-purple-500/10 to-purple-500/5 text-purple-600 border-purple-200/50',
                        cat4: 'from-orange-500/10 to-orange-500/5 text-orange-600 border-orange-200/50',
                      }
                      
                      const iconColorMap = {
                        cat1: 'text-blue-500 bg-blue-100',
                        cat2: 'text-red-500 bg-red-100',
                        cat3: 'text-purple-500 bg-purple-100',
                        cat4: 'text-orange-500 bg-orange-100',
                      }

                      return (
                        <div key={cat} className={`rounded-[20px] bg-gradient-to-b ${colorMap[cat]} border p-4 shadow-sm backdrop-blur-sm relative overflow-hidden group`}>
                          <div className="flex gap-3 mb-4 items-start relative z-10">
                            <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${iconColorMap[cat]} shadow-sm`}>
                              <Layers size={16} />
                            </div>
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 leading-tight pt-1">
                              {AUDIT_TYPE_LABELS[cat]}
                            </h3>
                          </div>
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar relative z-10">
                            {tasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between gap-3 bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-all">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                  <span className="text-[12px] font-black text-slate-700 leading-snug break-words whitespace-normal">{task.station_name}</span>
                                </div>
                                {task.completed ? (
                                  <span className="shrink-0 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                    <CheckCircle2 size={10} /> Bajarildi
                                  </span>
                                ) : (
                                  <span className="shrink-0 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                                    Kutilmoqda
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    {Object.values(dashboardStats.tasksByCategory).every(arr => arr.length === 0) && (
                      <div className="col-span-full py-16 text-center flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
                          <CheckCircle2 size={24} className="text-slate-300" />
                        </div>
                        <h3 className="text-base font-black text-slate-600">Bu oy uchun ishlar rejalashtirilmagan</h3>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Grafikga yangi ish qo'shish orqali reja shakllantiring</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mos kelmaydigan sxemalar (Elektromexanik izohlari) */}
              {mismatchReports.length > 0 && (
                <div className="premium-card relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <AlertTriangle size={120} />
                  </div>
                  <div className="relative p-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 border-b border-red-100 pb-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          <span className="bg-red-50 text-red-500 p-1.5 rounded-lg">
                            <AlertTriangle size={20} />
                          </span>
                          Mos kelmaydigan sxemalar
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                          Katta elektromexanik tomonidan belgilangan muammolar
                        </p>
                      </div>
                      <span className="shrink-0 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {mismatchReports.length} ta topilma
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {mismatchReports.map(report => (
                        <div
                          key={report.checkId}
                          className="group flex flex-col gap-2 bg-red-50/60 border border-red-200/60 rounded-2xl p-4 hover:shadow-md hover:border-red-300 transition-all cursor-pointer"
                          onClick={() => {
                            // Bekat sxemasi bo'limiga o'tish va tegishli hujjatni tanlash
                            const doc = documents.find(d => d.id === report.documentId)
                            if (doc) {
                              setSelectedStationFilter(doc.station_id)
                              setSelectedDocument(doc)
                              setTab('hujjatlar')
                            }
                          }}
                        >
                          {/* Sarlavha: bekat + hujjat nomi */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="shrink-0 w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-500 shadow-sm">
                                <AlertTriangle size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-sm font-black text-slate-800">{report.stationName}</span>
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white text-red-500 border border-red-200 shrink-0">
                                    {report.pageName}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">
                                  {report.documentName}
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={18} className="shrink-0 text-slate-300 group-hover:text-red-400 transition-colors mt-2" />
                          </div>

                          {/* Izoh (comment) */}
                          {report.comment && (
                            <div className="ml-[46px] bg-white/80 rounded-xl px-3 py-2 border border-red-100">
                              <p className="text-xs text-red-700 font-medium leading-relaxed">💬 {report.comment}</p>
                            </div>
                          )}

                          {/* Meta: kim va qachon */}
                          <div className="ml-[46px] flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span>{report.checkedBy}</span>
                            {report.checkedRole && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span>{report.checkedRole}</span>
                              </>
                            )}
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>{new Date(report.checkedAt).toLocaleDateString('uz')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bekatlar holati (List) */}
              <div className="premium-card p-6">
                <h2 className="text-lg font-black text-slate-900 mb-1">Bekatlar tafsiloti</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Yillik tekshiruv va hujjatlar asosida</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {dashboardStats.stationStatus.map(({ station, status, docCount, lastYearly }) => (
                      <div
                        key={station.id}
                        className={`rounded-2xl p-4 border transition-all hover:shadow-md cursor-pointer ${status === 'green' ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300' :
                            status === 'yellow' ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300' :
                              'bg-red-50/50 border-red-200 hover:border-red-300'
                          }`}
                        onClick={() => { setTab('hujjatlar'); setSelectedStationFilter(station.id) }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-3 w-3 rounded-full shrink-0 ${status === 'green' ? 'bg-emerald-500' :
                              status === 'yellow' ? 'bg-amber-500 animate-pulse' :
                                'bg-red-500 animate-pulse'
                            }`} />
                          <span className="text-sm font-black text-slate-800 truncate">{station.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          {docCount > 0 ? `${docCount} ta hujjat` : 'Hujjat yo\'q'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                          {lastYearly ? `Oxirgi: ${new Date(lastYearly.audited_at).toLocaleDateString('uz')}` : 'Tekshirilmagan'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
          )}

          {/* ═══ HUJJATLAR ═══ */}
          {tab === 'hujjatlar' && !selectedDocument && (
            <div className="space-y-4 animate-fade-in">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Hujjat qidirish..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                    />
                  </div>
                  <CustomSelect
                    value={selectedStationFilter}
                    onChange={setSelectedStationFilter}
                    placeholder="Bekat tanlang..."
                    options={stations.map(s => ({ label: s.name, value: s.id }))}
                  />
                </div>
                <button
                  onClick={() => setShowAddDocModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-black hover:bg-teal-700 transition-all active:scale-95 shadow-lg shadow-teal-200"
                >
                  <Plus size={16} /> Hujjat qo&apos;shish
                </button>
              </div>

              {/* Documents Grid */}
              {filteredDocs.length === 0 ? (
                <div className="premium-card p-12 text-center">
                  <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-black text-slate-600 mb-2">
                    {!selectedStationFilter && !searchQuery.trim() ? 'Bekatni tanlang' : 'Hujjat topilmadi'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {!selectedStationFilter && !searchQuery.trim() 
                      ? 'Hujjatlarni ko\'rish uchun yuqoridagi ro\'yxatdan bekatni tanlang yoki qidiring' 
                      : 'Bunday hujjat mavjud emas'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {/* Group by station */}
                  {(() => {
                    const grouped = new Map<string, TdmsDocument[]>()
                    filteredDocs.forEach(d => {
                      const key = d.station_name
                      if (!grouped.has(key)) grouped.set(key, [])
                      grouped.get(key)!.push(d)
                    })
                    return Array.from(grouped.entries()).map(([stationName, docs]) => (
                      <div key={stationName} className="premium-card overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{stationName}</h3>
                          <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">{docs.length} ta hujjat</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {docs.map(doc => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-4 px-5 py-3 hover:bg-teal-50/30 transition-colors group cursor-pointer"
                              onClick={() => setSelectedDocument(doc)}
                              onMouseEnter={() => {
                                preload(`tdms_pages_${doc.id}`, () => getTdmsPages(doc.id))
                                preload(`tdms_page_checks_${doc.id}`, () => getTdmsPageChecks(doc.id))
                              }}
                            >
                              <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                                <Layers size={18} className="text-teal-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  <span className="text-sm font-bold text-slate-800">{doc.name}</span>
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100 shrink-0">{doc.category}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                  Yuklagan: {doc.uploaded_by} • {new Date(doc.updated_at).toLocaleDateString('uz')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {activeRole === 'texnik_hujjatlar' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id) }}
                                    className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                    title="O'chirish"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                <ChevronRight size={18} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ═══ VARAQLAR (PAGES) SUB-VIEW ═══ */}
          {tab === 'hujjatlar' && selectedDocument && (
            <DocumentPagesView
              document={selectedDocument}
              userName={session.fullName}
              userRole={activeRole}
              onBack={() => setSelectedDocument(null)}
              onPageClick={(page) => setSelectedPage(page)}
              showAddPageModal={showAddPageModal}
              setShowAddPageModal={setShowAddPageModal}
              toast={toast}
            />
          )}

          {/* ═══ GRAFIK ═══ */}
          {tab === 'grafik' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-black text-slate-900 w-full sm:w-auto">Tekshiruv grafigi</h2>
                  <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 px-1 w-fit">
                    <button
                      onClick={() => setScheduleYear(y => y - 1)}
                      className="px-3 py-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      ←
                    </button>
                    <span className="px-3 py-1.5 text-sm font-black text-slate-800">{scheduleYear}</span>
                    <button
                      onClick={() => setScheduleYear(y => y + 1)}
                      className="px-3 py-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      →
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setShowAddScheduleModal(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-teal-600 text-white text-[11px] sm:text-sm font-black hover:bg-teal-700 transition-all active:scale-95 shadow-lg shadow-teal-200"
                  >
                    <Plus size={16} /> Grafik qo&apos;shish
                  </button>
                  <button
                    onClick={() => setShowAddStationModal(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-slate-700 text-white text-[11px] sm:text-sm font-black hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                  >
                    <Plus size={16} /> Bekat qo&apos;shish
                  </button>
                </div>
              </div>

              {/* Toifalar bo'yicha ranglar jadvali (Legend) */}
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4 mb-4 px-2">
                {(['cat1', 'cat2', 'cat3', 'cat4'] as const).map(cat => (
                  <div key={cat} className="flex items-start sm:items-center gap-2">
                    <div className={`w-3 h-3 mt-0.5 sm:mt-0 rounded-sm shrink-0 ${cat === 'cat1' ? 'bg-blue-500' : cat === 'cat2' ? 'bg-red-500' : cat === 'cat3' ? 'bg-purple-500' : 'bg-orange-500'}`}></div>
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest leading-tight flex-1">{AUDIT_TYPE_LABELS[cat]}</span>
                  </div>
                ))}
              </div>

              {/* Oylar bo'yicha jadval */}
              <div className="premium-card overflow-hidden">
                <div className="overflow-auto max-h-[75vh] min-h-[600px]">
                  <table className="w-full text-sm border-collapse border border-slate-200">
                    <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                      <tr>
                        <th className="sticky left-0 top-0 z-30 bg-slate-50 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-48 border border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">Bekat / Oraliq</th>
                        {MONTHS_UZ.map((m, i) => (
                          <th key={i} className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-tight text-slate-400 min-w-[60px] border border-slate-200">{m.slice(0, 3)}</th>
                        ))}
                        <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 w-12 border border-slate-200"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tdmsStations.map(tdmsStation => {
                        const station = { id: tdmsStation.id, name: tdmsStation.name }
                        const stationSchedules = schedules.filter(s => s.station_id === station.id)
                        const isInterval = tdmsStation.type === 'oraliq'
                        
                        return (
                          <tr key={station.id} className={`hover:bg-slate-50/50 group/row ${isInterval ? 'bg-slate-50/30' : ''}`}>
                            <td className={`sticky left-0 z-10 bg-white px-4 py-2.5 text-xs font-bold border border-slate-200 shadow-[1px_0_0_0_#e2e8f0] ${isInterval ? 'text-slate-500 pl-8 bg-slate-50/80' : 'text-slate-800'}`}>
                              <div className="flex items-center gap-1">
                                {isInterval && <span className="text-slate-300 mr-1">↳</span>}
                                {station.name}
                              </div>
                            </td>
                            {MONTHS_UZ.map((_, monthIdx) => {
                              const monthSchedules = stationSchedules.filter(s => s.month === monthIdx + 1)
                              const gridClass = monthSchedules.length > 2 ? 'grid-cols-2 grid-rows-2' : monthSchedules.length === 2 ? 'grid-cols-1 grid-rows-2' : 'grid-cols-1 grid-rows-1'
                              
                              return (
                                <td key={monthIdx} className="p-0 text-center border border-slate-200 relative h-10 min-w-[60px] align-top bg-slate-50">
                                  {monthSchedules.length > 0 ? (
                                    <div className={`w-full h-full grid gap-[1px] bg-slate-200 ${gridClass}`}>
                                      {monthSchedules.map(cellSchedule => (
                                        <div key={cellSchedule.id} className="relative w-full h-full bg-white group/item">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setActiveScheduleMenu(activeScheduleMenu === cellSchedule.id ? null : cellSchedule.id)
                                            }}
                                            className={`flex items-center justify-center w-full h-full text-[10px] font-black transition-all ${getCategoryColor(cellSchedule.audit_type, cellSchedule.completed)}`}
                                            title={`${AUDIT_TYPE_LABELS[cellSchedule.audit_type]}${cellSchedule.completed ? ' ✓ Bajarilgan' : ''}`}
                                          >
                                            {cellSchedule.completed ? '✓' : ''}
                                          </button>
                                          
                                          {activeScheduleMenu === cellSchedule.id && (
                                            <>
                                              <div className="fixed inset-0 z-40" onClick={() => setActiveScheduleMenu(null)} />
                                              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveScheduleMenu(null) }}>
                                                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xs overflow-hidden animate-fade-up" onClick={e => e.stopPropagation()}>
                                                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Amalni tanlang</h4>
                                                    <button onClick={() => setActiveScheduleMenu(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                                                      <X size={14} />
                                                    </button>
                                                  </div>
                                                  <div className="p-2 flex flex-col gap-1">
                                                    {!cellSchedule.completed && (
                                                      <button 
                                                        onClick={() => {
                                                          handleCompleteAudit(station.id, station.name, cellSchedule.audit_type, cellSchedule.id)
                                                          setActiveScheduleMenu(null)
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-xs font-black text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-3"
                                                      >
                                                        <CheckCircle2 size={16} /> Bajarildi deb belgilash
                                                      </button>
                                                    )}
                                                    {activeRole === 'texnik_hujjatlar' && (
                                                      <button 
                                                        onClick={() => {
                                                          handleDeleteSchedule(cellSchedule.id)
                                                          setActiveScheduleMenu(null)
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
                                                      >
                                                        <Trash2 size={16} /> Grafikdan o'chirish
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="absolute inset-0 text-slate-200 flex items-center justify-center w-full h-full pointer-events-none bg-slate-50">·</span>
                                  )}
                                </td>
                              )
                            })}
                            {/* O'chirish va O'zgartirish */}
                            <td className="px-1 py-1.5 text-center whitespace-nowrap border border-slate-200">
                              {activeRole === 'texnik_hujjatlar' && (
                                <div className="flex items-center justify-center gap-1 opacity-40 group-hover/row:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setEditStation(tdmsStation)}
                                    className="p-1 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                    title="O'zgartirish"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmStation(tdmsStation)}
                                    className="p-1 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="O'chirish"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TEKSHIRUVLAR TARIXI ═══ */}
          {tab === 'tekshiruvlar' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-black text-slate-900">Tekshiruvlar tarixi</h2>

              {audits.length === 0 ? (
                <div className="premium-card p-12 text-center">
                  <Shield size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-black text-slate-600 mb-2">Hali tekshiruvlar yo&apos;q</h3>
                  <p className="text-sm text-slate-400">Grafik orqali yoki bekat hujjatlaridan tekshiruvni tasdiqlang</p>
                </div>
              ) : (
                <div className="premium-card overflow-hidden divide-y divide-slate-100">
                  {audits.map(audit => (
                    <div key={audit.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${AUDIT_TYPE_COLORS[audit.audit_type]}`}>
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{audit.station_name}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${AUDIT_TYPE_COLORS[audit.audit_type]}`}>
                            {AUDIT_TYPE_LABELS[audit.audit_type]}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Tasdiqladi: {audit.auditor_name} • {new Date(audit.audited_at).toLocaleDateString('uz')} {new Date(audit.audited_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {audit.note && <p className="text-[10px] text-slate-500 mt-0.5 italic">{audit.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ═══ ADD DOCUMENT MODAL ═══ */}
      {showAddDocModal && (
        <AddDocumentModal
          stations={stations}
          userName={session.fullName}
          onSave={handleAddDocument}
          onClose={() => setShowAddDocModal(false)}
        />
      )}

      {/* ═══ ADD SCHEDULE MODAL ═══ */}
      {showAddScheduleModal && (
        <AddScheduleModal
          stations={stations}
          year={scheduleYear}
          onSave={handleAddSchedule}
          onClose={() => setShowAddScheduleModal(false)}
        />
      )}

      {/* ═══ PAGE DETAIL MODAL ═══ */}
      {selectedPage && (
        <PageDetailModal
          page={selectedPage}
          userName={session.fullName}
          userRole={activeRole}
          onClose={() => setSelectedPage(null)}
          onDelete={async (id) => {
            try {
              await deleteTdmsPage(id)
              mutate(`tdms_pages_${selectedPage.document_id}`)
              toast.success("Varaq o'chirildi")
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
            }
          }}
          toast={toast}
        />
      )}

      {/* ═══ SIGN OUT MODAL ═══ */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full animate-fade-up">
            <h3 className="text-lg font-black text-slate-900 mb-2">Tizimdan chiqish</h3>
            <p className="text-sm text-slate-500 mb-6">Rostdan ham tizimdan chiqmoqchimisiz?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsSignOutModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors">Bekor qilish</button>
              <button onClick={handleSignOut} className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors">Chiqish</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD STATION MODAL ═══ */}
      {showAddStationModal && (
        <AddStationModal
          tdmsStations={tdmsStations}
          onSave={async (name, type, afterSortOrder) => {
            try {
              await addTdmsStation(name, type, afterSortOrder)
              mutateTdmsStations()
              setShowAddStationModal(false)
              toast.success(`"${name}" muvaffaqiyatli qo'shildi!`)
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
            }
          }}
          onClose={() => setShowAddStationModal(false)}
        />
      )}

      {/* ═══ EDIT STATION MODAL ═══ */}
      {editStation && (
        <EditStationModal
          station={editStation}
          onSave={async (id: string, name: string, type: 'bekat' | 'oraliq') => {
            try {
              await updateTdmsStation(id, name, type)
              mutateTdmsStations()
              setEditStation(null)
              toast.success(`"${name}" muvaffaqiyatli o'zgartirildi!`)
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
            }
          }}
          onClose={() => setEditStation(null)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteConfirmStation}
        title="O'chirishni tasdiqlang"
        message={`"${deleteConfirmStation?.name}" ni o'chirmoqchimisiz? Bunga biriktirilgan barcha grafiklar ham o'chib ketadi! Bu amalni qaytarib bo'lmaydi.`}
        confirmText="Ha, o'chirish"
        onConfirm={async () => {
          if (!deleteConfirmStation) return
          try {
            await deleteTdmsStation(deleteConfirmStation.id)
            mutateTdmsStations()
            mutateSchedules()
            setDeleteConfirmStation(null)
            toast.success(`"${deleteConfirmStation?.name}" o'chirildi!`)
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
          }
        }}
        onCancel={() => setDeleteConfirmStation(null)}
      />

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.type === 'document' ? "Hujjatni o'chirish" : "Grafikni o'chirish"}
        message={confirmAction?.type === 'document' 
          ? "Rostdan ham ushbu hujjatni o'chirmoqchimisiz?" 
          : "Rostdan ham ushbu grafikni o'chirmoqchimisiz?"}
        onConfirm={() => {
          if (confirmAction?.type === 'document') confirmDeleteDocument(confirmAction.id)
          if (confirmAction?.type === 'schedule') confirmDeleteSchedule(confirmAction.id)
          setConfirmAction(null)
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-white/60 backdrop-blur-3xl border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around px-1 py-2">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                item.onClick?.()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className={`flex flex-col items-center justify-center w-full h-14 rounded-2xl transition-all active:scale-95 ${
                item.active ? 'text-teal-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className={`mb-1 p-1.5 rounded-xl ${item.active ? 'bg-teal-100/80 shadow-sm' : 'bg-transparent'}`}>
                <item.icon size={22} strokeWidth={item.active ? 2.5 : 2} className="transition-transform" />
              </div>
              <span className={`text-[9px] sm:text-[10px] font-bold truncate max-w-full px-1 text-center leading-tight ${item.active ? 'text-teal-700' : 'text-slate-600'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  const colorClasses: Record<string, string> = {
    teal: 'bg-teal-50 border-teal-100 text-teal-600',
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    red: 'bg-red-50 border-red-100 text-red-600',
    rose: 'bg-rose-50 border-rose-100 text-rose-600',
  }
  return (
    <div className="premium-card p-3 sm:p-5">
      <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center border mb-2 sm:mb-3 [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="text-xl sm:text-2xl font-black text-slate-900">{value}</div>
      <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-tight">{label}</div>
    </div>
  )
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Tanlang...'
}: {
  value: string
  onChange: (val: string) => void
  options: { label: string, value: string }[]
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedLabel = options.find(o => o.value === value)?.label || ''
  
  return (
    <div className="relative z-30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full sm:w-64 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
      >
        <span className={`truncate ${selectedLabel ? 'text-slate-700' : 'text-slate-400'}`}>{selectedLabel || placeholder}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-64 overflow-y-auto animate-fade-in origin-top">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={`flex items-center justify-between w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                  value === opt.value 
                    ? 'bg-teal-50 text-teal-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check size={16} className="text-teal-600 shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AddDocumentModal({ stations, userName, onSave, onClose }: {
  stations: { id: string; name: string }[]
  userName: string
  onSave: (doc: Omit<TdmsDocument, 'id' | 'created_at'>) => void
  onClose: () => void
}) {
  const [stationId, setStationId] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const station = stations.find(s => s.id === stationId)
    if (!station || !name.trim()) return

    onSave({
      station_id: stationId,
      station_name: station.name,
      name: name.trim(),
      drive_url: '-',
      version: 'V1',
      category: category.trim(),
      updated_at: new Date().toISOString(),
      uploaded_by: userName,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-900">Yangi hujjat to&apos;plamini (papkasi) yaratish</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Bekat</label>
            <select
              value={stationId}
              onChange={e => setStationId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            >
              <option value="">Bekatni tanlang</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Hujjat nomi (To'plam nomi)</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Masalan: EChK sxemalari"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Toifasi (Ixtiyoriy)</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Masalan: EChK, SP, AB (yozish shart emas)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3.5 rounded-xl bg-teal-600 text-white text-sm font-black hover:bg-teal-700 transition-all active:scale-[0.98] shadow-lg shadow-teal-200 mt-4"
          >
            Hujjatni qo&apos;shish
          </button>
        </form>
      </div>
    </div>
  )
}

function AddScheduleModal({ stations, year, onSave, onClose }: {
  stations: { id: string; name: string }[]
  year: number
  onSave: (schedule: Omit<TdmsSchedule, 'id' | 'created_at' | 'completed' | 'completed_audit_id'>) => void
  onClose: () => void
}) {
  const [stationId, setStationId] = useState('')
  const [month, setMonth] = useState(1)
  const [auditType, setAuditType] = useState<'cat1' | 'cat2' | 'cat3' | 'cat4'>('cat1')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const item = stations.find(s => s.id === stationId)
    if (!item) return

    onSave({
      station_id: stationId,
      station_name: item.name,
      year,
      month,
      audit_type: auditType,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-900">Grafik qo&apos;shish — {year}</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Bekat / Oraliq</label>
            <select
              value={stationId}
              onChange={e => setStationId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            >
              <option value="">Tanlang</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Oy</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            >
              {MONTHS_UZ.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tekshiruv turi</label>
            <div className="flex flex-col gap-2">
              {(['cat1', 'cat2', 'cat3', 'cat4'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAuditType(type)}
                  className={`rounded-xl py-3 px-3 text-xs font-bold border transition-all text-left ${auditType === type
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                      : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  {AUDIT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3.5 rounded-xl bg-teal-600 text-white text-sm font-black hover:bg-teal-700 transition-all active:scale-[0.98] shadow-lg shadow-teal-200 mt-4"
          >
            Grafikga qo&apos;shish
          </button>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD STATION MODAL — Bekat yoki oraliq qo'shish
// ═══════════════════════════════════════════════════════════════════════════════

function AddStationModal({ tdmsStations, onSave, onClose }: {
  tdmsStations: TdmsStation[]
  onSave: (name: string, type: 'bekat' | 'oraliq', afterSortOrder?: number) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'bekat' | 'oraliq'>('bekat')
  const [position, setPosition] = useState<'end' | 'after'>('end')
  const [afterStationId, setAfterStationId] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (position === 'after' && afterStationId) {
      const afterStation = tdmsStations.find(s => s.id === afterStationId)
      if (afterStation) {
        onSave(name.trim(), type, afterStation.sort_order)
      }
    } else {
      onSave(name.trim(), type)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-900">Yangi bekat / oraliq qo&apos;shish</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nomi</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Masalan: st. Buxoro-1 yoki per. Malikobod - Qiziltepa"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Turi</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('bekat')}
                className={`rounded-xl py-3 px-3 text-xs font-bold border transition-all ${type === 'bekat'
                  ? 'bg-teal-50 border-teal-400 text-teal-700 shadow-sm'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                }`}
              >
                🏢 Bekat
              </button>
              <button
                type="button"
                onClick={() => setType('oraliq')}
                className={`rounded-xl py-3 px-3 text-xs font-bold border transition-all ${type === 'oraliq'
                  ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                }`}
              >
                ↳ Bekat oralig&apos;i
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Qayerga qo&apos;shish</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setPosition('end')}
                className={`rounded-xl py-3 px-3 text-xs font-bold border transition-all ${position === 'end'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Oxiriga
              </button>
              <button
                type="button"
                onClick={() => setPosition('after')}
                className={`rounded-xl py-3 px-3 text-xs font-bold border transition-all ${position === 'after'
                  ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                }`}
              >
                ... dan keyin
              </button>
            </div>
            {position === 'after' && (
              <select
                value={afterStationId}
                onChange={e => setAfterStationId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              >
                <option value="">Qaysi qatordan keyin?</option>
                {tdmsStations.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.type === 'oraliq' ? `↳ ${s.name}` : s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3.5 rounded-xl bg-slate-700 text-white text-sm font-black hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200 mt-4"
          >
            Qo&apos;shish
          </button>
        </form>
      </div>
    </div>
  )
}

function EditStationModal({ station, onSave, onClose }: {
  station: TdmsStation
  onSave: (id: string, name: string, type: 'bekat' | 'oraliq') => void
  onClose: () => void
}) {
  const [name, setName] = useState(station.name)
  const [type, setType] = useState<'bekat' | 'oraliq'>(station.type as 'bekat' | 'oraliq')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave(station.id, name.trim(), type)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-900">Bekat / oraliqni o&apos;zgartirish</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nomi</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Turi</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('bekat')}
                className={`rounded-xl py-3 px-3 text-xs font-bold border transition-all ${type === 'bekat'
                  ? 'bg-teal-50 border-teal-400 text-teal-700 shadow-sm'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                }`}
              >
                🏢 Bekat
              </button>
              <button
                type="button"
                onClick={() => setType('oraliq')}
                className={`rounded-xl py-3 px-3 text-xs font-bold border transition-all ${type === 'oraliq'
                  ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                }`}
              >
                ↳ Bekat oralig&apos;i
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3.5 rounded-xl bg-teal-600 text-white text-sm font-black hover:bg-teal-700 transition-all active:scale-[0.98] shadow-lg shadow-teal-200 mt-4"
          >
            Saqlash
          </button>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT PAGES VIEW — Varaqlar ro'yxati (sub-view)
// ═══════════════════════════════════════════════════════════════════════════════

function DocumentPagesView({ document, userName, userRole, onBack, onPageClick, showAddPageModal, setShowAddPageModal, toast }: {
  document: TdmsDocument
  userName: string
  userRole: string
  onBack: () => void
  onPageClick: (page: TdmsPage) => void
  showAddPageModal: boolean
  setShowAddPageModal: (v: boolean) => void
  toast: { success: (m: string) => void; error: (m: string) => void }
}) {
  const { data: pages = [], mutate: mutatePages } = useSWR(
    `tdms_pages_${document.id}`,
    () => getTdmsPages(document.id)
  )

  const { data: allChecks = [], mutate: mutateChecks } = useSWR(
    `tdms_page_checks_${document.id}`,
    () => getTdmsPageChecks(document.id)
  )

  // Har bir varaq uchun barcha tekshiruvlarni xaritalash
  const pageChecksMap = useMemo(() => {
    const map = new Map<string, typeof allChecks>()
    allChecks.forEach(c => {
      if (!map.has(c.page_id)) map.set(c.page_id, [])
      map.get(c.page_id)!.push(c)
    })
    return map
  }, [allChecks])

  // Umumiy statistika (faqat to'liq tasdiqlanganlarini hisoblashimiz ham mumkin)
  const totalPages = pages.length
  const checkedPages = pages.filter(p => (pageChecksMap.get(p.id) || []).length > 0).length
  const progressPercent = totalPages > 0 ? Math.round((checkedPages / totalPages) * 100) : 0

  const handleAddPage = async (page: Omit<TdmsPage, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await addTdmsPage(page)
      mutatePages()
      setShowAddPageModal(false)
      toast.success("Varaq muvaffaqiyatli qo'shildi!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  }

  const handleDeletePage = async (id: string) => {
    try {
      await deleteTdmsPage(id)
      mutatePages()
      mutateChecks()
      toast.success("Varaq o'chirildi")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black text-slate-900 truncate">{document.name}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{document.station_name} • {document.category}</p>
        </div>
        <button
          onClick={() => setShowAddPageModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-black hover:bg-teal-700 transition-all active:scale-95 shadow-lg shadow-teal-200"
        >
          <Plus size={16} /> Varaq qo&apos;shish
        </button>
      </div>

      {/* Progress Bar */}
      <div className="premium-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-slate-700">Tekshiruv jarayoni</span>
          <span className="text-xs font-black text-teal-600">{checkedPages}/{totalPages} varaq ({progressPercent}%)</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: progressPercent === 100
                ? 'linear-gradient(90deg, #10b981, #059669)'
                : progressPercent >= 50
                  ? 'linear-gradient(90deg, #14b8a6, #0d9488)'
                  : 'linear-gradient(90deg, #f59e0b, #d97706)',
            }}
          />
        </div>
      </div>

      {/* Pages Grid */}
      {pages.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Layers size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-600 mb-2">Hali varaqlar yo&apos;q</h3>
          <p className="text-sm text-slate-400">Varaq qo&apos;shish uchun yuqoridagi tugmani bosing</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {pages.map(page => {
            const pageChecks = pageChecksMap.get(page.id) || []
            const hasAnyCheck = pageChecks.length > 0
            const hasMismatch = pageChecks.some(c => c.status === 'mismatch')
            const allMatch = hasAnyCheck && !hasMismatch
            
            let ringClass = 'hover:ring-2 hover:ring-teal-400'
            if (hasMismatch) ringClass = 'ring-2 ring-red-400'
            else if (allMatch) ringClass = 'ring-2 ring-emerald-400'

            return (
              <div
                key={page.id}
                onClick={() => onPageClick(page)}
                className={`relative premium-card cursor-pointer overflow-hidden transition-all hover:-translate-y-1 active:scale-[0.98] group flex flex-col ${ringClass}`}
              >
                {/* Status icon */}
                {hasAnyCheck && (
                  <div className="absolute top-2 left-2 z-30 bg-white/90 backdrop-blur-sm rounded-full shadow-md p-0.5">
                    {hasMismatch ? <AlertTriangle size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-emerald-500" />}
                  </div>
                )}

                {/* Thumbnail Preview Area */}
                <div className="w-full aspect-video bg-slate-50 relative pointer-events-none overflow-hidden flex items-center justify-center">
                  {page.drive_url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img 
                      src={page.drive_url} 
                      alt={`Varaq ${page.page_number}`} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <iframe 
                      src={`${page.drive_url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} 
                      className="w-full h-full border-0 absolute inset-0"
                      tabIndex={-1}
                    />
                  )}
                  {/* Dark gradient overlay at bottom for text visibility */}
                  <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                  
                  {/* Bottom overlay info */}
                  <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center gap-2">
                    <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-teal-500 text-white text-sm font-black shadow-lg">
                      {page.page_number}
                    </div>
                    <div className="flex flex-col">
                      {page.version.toLowerCase() !== 'v1' && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white border border-white/20 w-max mb-0.5">
                          {page.version}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-white/90 truncate max-w-[100px]">
                        {page.name || `Varaq ${page.page_number}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Area */}
                <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">Holati:</span>
                  {(() => {
                    if (hasMismatch) return (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                        ❌ Mos kelmaydi
                      </span>
                    )
                    if (allMatch) return (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                        ✅ Tekshirilgan
                      </span>
                    )
                    return (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        Kutilmoqda
                      </span>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Page Modal */}
      {showAddPageModal && (
        <AddPageModal
          documentId={document.id}
          existingPageNumbers={pages.map(p => p.page_number)}
          userName={userName}
          onSave={handleAddPage}
          onClose={() => setShowAddPageModal(false)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE DETAIL MODAL — Varaq tafsiloti (PDF ko'rish + Tekshirish + Versiyalar)
// ═══════════════════════════════════════════════════════════════════════════════

function PageDetailModal({ page, userName, userRole, onClose, onDelete, toast }: {
  page: TdmsPage
  userName: string
  userRole: string
  onClose: () => void
  onDelete: (id: string) => void
  toast: { success: (m: string) => void; error: (m: string) => void }
}) {
  const [showReplaceForm, setShowReplaceForm] = useState(false)
  const [replaceFile, setReplaceFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(page)
  const [viewingVersion, setViewingVersion] = useState<TdmsPageVersion | null>(null)
  const [deleteVersionConfirm, setDeleteVersionConfirm] = useState<string | null>(null)

  // Tekshiruvlar
  const { data: checks = [], mutate: mutateChecks } = useSWR(
    `tdms_page_checks_detail_${currentPage.id}`,
    () => getTdmsPageChecksByPage(currentPage.id)
  )

  // Versiyalar
  const { data: versions = [], mutate: mutateVersions } = useSWR(
    `tdms_page_versions_${currentPage.id}`,
    () => getTdmsPageVersions(currentPage.id)
  )

  const [showMismatchForm, setShowMismatchForm] = useState(false)
  const [showCheckOptions, setShowCheckOptions] = useState(false)
  const [mismatchComment, setMismatchComment] = useState('')

  const isCheckedByMe = checks.some(c => c.checked_by === userName)
  const myCheck = checks.find(c => c.checked_by === userName)

  const handleCheck = async (status: 'matches' | 'mismatch') => {
    try {
      if (status === 'mismatch' && !mismatchComment.trim()) {
        toast.error("Iltimos, izoh yozing!")
        return
      }
      const roleName = userRole === 'elektromexanik' ? 'Katta elektromexanik' : 'Texnik hujjatlar muhandisi'
      await checkTdmsPage(currentPage.id, userName, roleName, 'general', status, status === 'mismatch' ? mismatchComment : undefined)
      mutateChecks()
      setShowMismatchForm(false)
      setMismatchComment('')
      toast.success(status === 'mismatch' ? "Izoh yuborildi!" : "Tasdiqlandi! ✅")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  }

  const handleUncheck = async () => {
    try {
      await uncheckTdmsPage(currentPage.id, userName)
      mutateChecks()
      toast.success("Tekshiruv bekor qilindi")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  }

  const handleReplace = async () => {
    if (!replaceFile) return

    setIsSubmitting(true)
    try {
      const publicUrl = await uploadTdmsPageFile(currentPage.document_id, currentPage.page_number, replaceFile)
      const updated = await replaceTdmsPage(currentPage.id, publicUrl, userName)
      setCurrentPage(updated)
      mutateVersions()
      mutateChecks()
      setShowReplaceForm(false)
      setReplaceFile(null)
      toast.success(`Varaq yangilandi — ${updated.version}!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
    } finally {
      setIsSubmitting(false)
    }
  }

  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const handleDelete = () => {
    setShowConfirmDelete(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full animate-fade-up max-h-[95vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black ${isCheckedByMe
                  ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-2 border-slate-200'
                }`}>
                {currentPage.page_number}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{currentPage.name || `Varaq ${currentPage.page_number}`}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {currentPage.version.toLowerCase() !== 'v1' ? `${currentPage.version} • ` : ''}Yuklagan: {currentPage.uploaded_by}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userRole === 'Texnik hujjatlar muhandisi' && (
                <button 
                  onClick={handleDelete}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2 text-xs font-black"
                  title="Varaqni o'chirish"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">O'chirish</span>
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* PDF Ochish */}
        <div className="px-6 py-4">
          <div className="relative w-full h-[50vh] rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50 mb-3 group">
            {currentPage.drive_url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img 
                src={currentPage.drive_url} 
                alt="Sxema" 
                className="w-full h-full object-contain"
              />
            ) : (
              <iframe 
                src={`${currentPage.drive_url}#toolbar=0`} 
                className="w-full h-full"
                title="Sxema"
              />
            )}
            
            {/* Ochiq tabda ochish (kattalashtirish) tugmasi */}
            <a
              href={currentPage.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-4 right-4 p-3 rounded-xl bg-black/50 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 flex items-center gap-2 text-xs font-black shadow-lg"
            >
              <ExternalLink size={16} />
              Kattalashtirish
            </a>
          </div>
        </div>

        {/* ═══ TEKSHIRISH ═══ */}
        <div className="px-6 pb-4">
          {!showCheckOptions && !showMismatchForm ? (
            <button
              onClick={() => setShowCheckOptions(true)}
              className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black text-sm hover:from-teal-600 hover:to-emerald-600 transition-all active:scale-[0.98] shadow-lg shadow-teal-200"
            >
              <CheckCircle2 size={22} />
              Tekshirish
            </button>
          ) : !showMismatchForm ? (
            <div className="space-y-3 animate-fade-in">
              <div className="flex gap-3">
                <button
                  onClick={() => { handleCheck('matches'); setShowCheckOptions(false) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-black hover:bg-emerald-100 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 size={20} />
                  Mos keladi ✅
                </button>
                <button
                  onClick={() => setShowMismatchForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-black hover:bg-red-100 transition-all active:scale-[0.98]"
                >
                  <AlertTriangle size={20} />
                  Mos kelmaydi ❌
                </button>
              </div>
              <button
                onClick={() => setShowCheckOptions(false)}
                className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                Bekor qilish
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 space-y-3 animate-fade-in">
              <label className="block text-xs font-black text-red-700">Izoh yozing — nima mos kelmaydi?</label>
              <textarea
                value={mismatchComment}
                onChange={(e) => setMismatchComment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-red-200 bg-white text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none resize-none"
                rows={3}
                placeholder="Masalan: 5-rele sxemada bor, lekin bekatda yo'q..."
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowMismatchForm(false); setShowCheckOptions(false); setMismatchComment('') }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={() => { handleCheck('mismatch'); setShowCheckOptions(false) }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
                >
                  Yuborish
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tekshirganlar ro'yxati */}
        {checks.length > 0 && (
          <div className="px-6 pb-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tekshiruvlar tarixi</h4>
            <div className="space-y-2">
              {checks.map(c => {
                const isMismatch = c.status === 'mismatch'
                return (
                  <div key={c.id} className={`flex flex-col px-4 py-3 rounded-xl border ${isMismatch ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isMismatch ? <AlertTriangle size={16} className="text-red-500" /> : <CheckCircle2 size={16} className="text-emerald-500" />}
                        <span className="text-xs font-black text-slate-800">{c.checked_by}</span>
                        {c.checked_role && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white shadow-sm text-slate-500 border border-slate-200">{c.checked_role}</span>}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{new Date(c.checked_at).toLocaleDateString('uz')}</span>
                    </div>
                    
                    <div className="mt-1.5 flex flex-wrap items-start gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${isMismatch ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {isMismatch ? '❌ Mos kelmaydi' : '✅ Mos keladi'}
                      </span>
                      {c.comment && (
                        <p className="text-xs text-red-700 font-medium">💬 {c.comment}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══ VARAQNI ALMASHTIRISH ═══ */}
        <div className="px-6 pb-4">
          {!showReplaceForm ? (
            <button
              onClick={() => setShowReplaceForm(true)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-all"
            >
              <RefreshCw size={16} />
              Varaqni almashtirish (yangi versiya)
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-700 uppercase">Yangi faylni yuklang</h4>
                <button onClick={() => setShowReplaceForm(false)} className="text-amber-400 hover:text-amber-600">
                  <X size={16} />
                </button>
              </div>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={e => setReplaceFile(e.target.files?.[0] || null)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 rounded-xl border border-amber-200 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 transition-all disabled:opacity-50"
              />
              <button
                onClick={handleReplace}
                disabled={isSubmitting || !replaceFile}
                className="w-full px-4 py-3 rounded-xl bg-amber-500 text-white text-sm font-black hover:bg-amber-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  `Almashtirib ${currentPage.version} → V${parseInt(currentPage.version.replace('V', '') || '1', 10) + 1} qilish`
                )}
              </button>
              <p className="text-[10px] text-amber-600 font-bold">⚠️ Eski sxema o&apos;chirilmaydi, versiyalar tarixida saqlanadi</p>
            </div>
          )}
        </div>

        {/* ═══ VERSIYALAR TARIXI ═══ */}
        {versions.length > 0 && (
          <div className="px-6 pb-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <History size={14} />
              Versiyalar tarixi ({versions.length} ta eski versiya)
            </h4>
            <div className="space-y-2">
              {versions.map(v => (
                <div key={v.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 group hover:bg-slate-100 transition-colors">
                  <button
                    onClick={() => setViewingVersion(v)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600 shrink-0">{v.version}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-600">Yuklagan: {v.uploaded_by}</p>
                      <p className="text-[10px] text-slate-400 font-bold">Almashtirilgan: {new Date(v.replaced_at).toLocaleDateString('uz')}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setViewingVersion(v)}
                      className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                      title="Ko'rish"
                    >
                      <Eye size={16} />
                    </button>
                    {userRole === 'texnik_hujjatlar' && (
                      <button
                        onClick={() => setDeleteVersionConfirm(v.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eski versiyani ko'rish modali */}
        {viewingVersion && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewingVersion(null)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto animate-fade-up" onClick={e => e.stopPropagation()}>
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{currentPage.name || `Varaq ${currentPage.page_number}`}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Eski versiya: {viewingVersion.version} • Yuklagan: {viewingVersion.uploaded_by} • {new Date(viewingVersion.replaced_at).toLocaleDateString('uz')}
                  </p>
                </div>
                <button onClick={() => setViewingVersion(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 py-4">
                <div className="relative w-full h-[60vh] rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50 group">
                  {viewingVersion.drive_url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={viewingVersion.drive_url} alt="Eski sxema" className="w-full h-full object-contain" />
                  ) : (
                    <iframe src={`${viewingVersion.drive_url}#toolbar=0`} className="w-full h-full" title="Eski sxema" />
                  )}
                  <a
                    href={viewingVersion.drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-4 right-4 p-3 rounded-xl bg-black/50 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 flex items-center gap-2 text-xs font-black shadow-lg"
                  >
                    <ExternalLink size={16} />
                    Kattalashtirish
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Versiyani o'chirish tasdiqlash modali */}
        <ConfirmModal
          isOpen={!!deleteVersionConfirm}
          title="Eski versiyani o'chirish"
          message="Rostdan ham ushbu eski versiyani o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi."
          onConfirm={async () => {
            if (!deleteVersionConfirm) return
            try {
              await deleteTdmsPageVersion(deleteVersionConfirm)
              mutateVersions()
              setDeleteVersionConfirm(null)
              toast.success("Eski versiya o'chirildi")
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi")
            }
          }}
          onCancel={() => setDeleteVersionConfirm(null)}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD PAGE MODAL — Yangi varaq qo'shish
// ═══════════════════════════════════════════════════════════════════════════════

function AddPageModal({ documentId, existingPageNumbers, userName, onSave, onClose }: {
  documentId: string
  existingPageNumbers: number[]
  userName: string
  onSave: (page: Omit<TdmsPage, 'id' | 'created_at' | 'updated_at'>) => void
  onClose: () => void
}) {
  const nextPageNumber = existingPageNumbers.length > 0
    ? Math.max(...existingPageNumbers) + 1
    : 1

  const [pageNumber, setPageNumber] = useState(nextPageNumber)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    try {
      const publicUrl = await uploadTdmsPageFile(documentId, pageNumber, file)
      
      onSave({
        document_id: documentId,
        page_number: pageNumber,
        name: name.trim(),
        drive_url: publicUrl,
        version: 'V1',
        uploaded_by: userName,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fayl yuklashda xatolik yuz berdi")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-900">Yangi varaq qo&apos;shish</h3>
          <button onClick={onClose} disabled={isUploading} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Varaq raqami</label>
              <input
                type="number"
                value={pageNumber}
                onChange={e => setPageNumber(Number(e.target.value))}
                min={1}
                required
                disabled={isUploading}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Varaq nomi (ixtiyoriy)</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Masalan: Umumiy sxema"
                disabled={isUploading}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none disabled:bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Chizma fayli (PDF yoki Rasm)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
              required
              disabled={isUploading}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isUploading || !file}
            className="w-full px-6 py-3.5 rounded-xl bg-teal-600 text-white text-sm font-black hover:bg-teal-700 transition-all active:scale-[0.98] shadow-lg shadow-teal-200 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Yuklanmoqda...
              </>
            ) : (
              "Varaqni qo'shish"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
