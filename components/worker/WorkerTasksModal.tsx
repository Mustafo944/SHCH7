/* eslint-disable @next/next/no-img-element */
import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, CheckCircle2,
  BookOpen,
  ChevronRight,
  Download,
  AlertTriangle,
  FileText,
  Target
} from 'lucide-react'
import { getStationEquipments, getTaskScans, insertTaskScan, autoFillShu2Entry, type TaskScan } from '@/lib/supabase-db'
import { supabase } from '@/lib/supabase'
import type { User, ReportEntry } from '@/types'
import { useToast } from '@/lib/hooks/useToast'
import dynamic from 'next/dynamic'
import { QRScannerModal } from '../QRScannerModal'
import { buildEquipmentQrValue, stringToUuid, getEntryDateStr } from '@/lib/utils/qr'

// JournalView komponentlari lazy load qilinadi
const DU46JournalView = dynamic(() => import('@/components/journals/DU46JournalView').then(mod => mod.DU46JournalView), { ssr: false })
const SHU2JournalView = dynamic(() => import('@/components/journals/SHU2JournalView').then(mod => mod.SHU2JournalView), { ssr: false })
const YerlatgichJournalView = dynamic(() => import('@/components/journals/YerlatgichJournalView').then(mod => mod.YerlatgichJournalView), { ssr: false })
const AlsnKodJournalView = dynamic(() => import('@/components/journals/AlsnKodJournalView').then(mod => mod.AlsnKodJournalView), { ssr: false })
const MpsFriksionJournalView = dynamic(() => import('@/components/journals/MpsFriksionJournalView').then(mod => mod.MpsFriksionJournalView), { ssr: false })
const DgaNazoratJournalView = dynamic(() => import('@/components/journals/DgaNazoratJournalView').then(mod => mod.DgaNazoratJournalView), { ssr: false })

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

export type WorkerTaskItem = {
  reportId: string
  entry: ReportEntry
  month: string
  taskText?: string
  type: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy'
  reason?: string
  completedDate?: string
  done?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════ */

const SUPPORTED_JOURNALS: Record<string, 'du46' | 'shu2' | 'yerlatgich' | 'alsnKod' | 'mpsFriksion' | 'dgaNazorat'> = {
  'SHU-2': 'shu2',
  'DU-46': 'du46',
  'yerlatgich': 'yerlatgich',
  'alsnKod': 'alsnKod',
  'mpsFriksion': 'mpsFriksion',
  'dgaNazorat': 'dgaNazorat',
}

const JOURNAL_DISPLAY_NAMES: Record<string, string> = {
  'SHU-2': 'SHU-2 jurnali',
  'DU-46': 'DU-46 jurnali',
  'yerlatgich': 'Yerlatgich xabarlagichi jurnali (NSH-01 17.1.8)',
  'alsnKod': 'ALSN kodlarini o\'lchash',
  'mpsFriksion': 'MPS elektrodvigatellarni friksion tokini o\'lchash',
  'dgaNazorat': 'Dizel generatorlari ishlashini nazorat qilish jurnali',
}

/* ═══════════════════════════════════════════════════════════════════════
   WorkerTasksModal — bugungi / bajarilmagan / sababli ishlar modali
   ═══════════════════════════════════════════════════════════════════════ */

export function WorkerTasksModal({ type, bugun, qolib, sababli, onClose, onTaskClick, onTasksUpdated, stationName }: {
  type: 'bugunBajarilgan' | 'qolibKetgan' | 'sababliBajarilmagan'
  bugun: WorkerTaskItem[]
  qolib: WorkerTaskItem[]
  sababli: WorkerTaskItem[]
  onClose: () => void
  onTaskClick?: (task: WorkerTaskItem) => void
  onTasksUpdated?: () => Promise<void> | void
  stationName?: string
}) {
  const toast = useToast()
  const [promptMode, setPromptMode] = useState<boolean>(false)
  const [promptTask, setPromptTask] = useState<WorkerTaskItem | null>(null)
  const [promptReason, setPromptReason] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState<boolean>(false)

  let tasks: WorkerTaskItem[] = []
  let title = ''
  let headerColor = ''
  let titleColor = ''

  if (type === 'bugunBajarilgan') {
    tasks = bugun
    title = 'BUGUNGI ISHLAR RO\'YXATI'
    headerColor = 'bg-blue-50/50 border-blue-100'
    titleColor = 'text-blue-900'
  } else if (type === 'qolibKetgan') {
    tasks = qolib
    title = 'Bajarilmagan ishlar (Izox kutmoqda)'
    headerColor = 'bg-red-50/50 border-red-100'
    titleColor = 'text-red-900'
  } else {
    tasks = sababli
    title = 'Sababli bajarilmagan ishlar (Arxiv)'
    headerColor = 'bg-orange-50/50 border-orange-100'
    titleColor = 'text-orange-900'
  }

  const todayDate = new Date()
  const todayFormatted = `${String(todayDate.getDate()).padStart(2, '0')}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${todayDate.getFullYear()}`

  const updateTaskInDb = async (task: WorkerTaskItem, updateFn: (entry: ReportEntry) => void) => {
    if (!task.reportId) return
    setIsUpdating(true)
    try {
      const { data: report, error: fetchErr } = await supabase.from('work_reports').select('entries').eq('id', task.reportId).single()
      if (fetchErr) throw fetchErr
      if (!report) return

      const newEntries = [...report.entries]
      const entryIndex = newEntries.findIndex((e: ReportEntry) => e.ragat === task.entry.ragat)
      if (entryIndex === -1) {
        toast.error('Topilmadi: ' + task.entry.ragat)
        return
      }

      updateFn(newEntries[entryIndex])

      const { error: updateErr } = await supabase.from('work_reports').update({ entries: newEntries }).eq('id', task.reportId)
      if (updateErr) throw updateErr

      if (onTasksUpdated) {
        await onTasksUpdated()
      }
      toast.success('Sabab saqlandi')
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message)
    } finally {
      setIsUpdating(false)
      setPromptMode(false)
      setPromptTask(null)
      setPromptReason('')
    }
  }

  const handleSaveReason = () => {
    if (!promptReason.trim() || !promptTask) return
    updateTaskInDb(promptTask, (entry) => {
      const field = `missedReason${promptTask.type.charAt(0).toUpperCase() + promptTask.type.slice(1)}` as keyof ReportEntry
      const dateField = `missedReasonDate${promptTask.type.charAt(0).toUpperCase() + promptTask.type.slice(1)}` as keyof ReportEntry
        ; (entry as unknown as Record<string, string>)[field] = promptReason.trim()
        ; (entry as unknown as Record<string, string>)[dateField] = new Date().toISOString()
    })
  }


  const downloadPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()

    doc.setFont("helvetica", "normal")
    doc.setFontSize(14)
    doc.text(`Sababli bajarilmagan ishlar - ${stationName || 'Barcha bekatlar'}`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Sana: ${todayFormatted}`, 14, 28)

    const tableData = tasks.map((t, i) => {
      let dateFormatted = t.entry.ragat
      if (t.entry.ragat && t.month && t.month.includes('-')) {
        const [yyyy, mm] = t.month.split('-')
        dateFormatted = `${String(t.entry.ragat.trim()).padStart(2, '0')}.${mm}.${yyyy}`
      }
      const status = t.completedDate ? 'Bajarilgan ✅' : 'Bajarilmagan ❌'
      return [i + 1, dateFormatted ? String(dateFormatted) : '', t.taskText || '', t.reason || '', status]
    })

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Sana', 'Ish nomi', 'Sabab (Izox)', 'Holati']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [249, 115, 22] },
      columnStyles: {
        0: { cellWidth: 10 }, 1: { cellWidth: 25 }, 2: { cellWidth: 70 },
        3: { cellWidth: 55 }, 4: { cellWidth: 25 }
      }
    })

    doc.save(`Sababli_bajarilmagan_${stationName || 'Barcha'}_${todayDate.getTime()}.pdf`)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md transition-all">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl animate-scale-in">

        {/* HEADER */}
        <div className={`flex items-center justify-between border-b px-8 py-6 ${headerColor}`}>
          <div>
            <h3 className={`text-xl font-black tracking-tight ${titleColor}`}>{title}</h3>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Bugungi sana: {todayFormatted} · Jami: {tasks.length} ta
              </p>
              {type === 'sababliBajarilmagan' && tasks.length > 0 && (
                <button onClick={downloadPDF} className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-md hover:bg-orange-200 transition-colors">
                  <Download size={14} /> Yuklash (PDF)
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
          {promptMode ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="text-red-500" size={28} />
                  <h4 className="text-lg font-black text-slate-800">Ish nega bajarilmadi?</h4>
                </div>
                <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">{promptTask?.taskText}</p>
                <textarea
                  autoFocus
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-red-400 focus:bg-white resize-none"
                  rows={4}
                  placeholder="Sababni yozing (masalan: Ehtiyot qism yo'qligi sababli)..."
                  value={promptReason}
                  onChange={e => setPromptReason(e.target.value)}
                />
                <div className="mt-6 flex justify-end gap-3">
                  <button disabled={isUpdating} onClick={() => { setPromptMode(false); setPromptTask(null); setPromptReason('') }} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                    Bekor qilish
                  </button>
                  <button disabled={isUpdating || !promptReason.trim()} onClick={handleSaveReason} className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 transition-all disabled:opacity-50">
                    {isUpdating ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Bu ro&apos;yxatda ishlar yo&apos;q</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {tasks.map((task, ti) => {
                const text = task.taskText || ''
                let dateFormatted = task.entry.ragat
                if (task.entry.ragat && task.month && task.month.includes('-')) {
                  const [yyyy, mm] = task.month.split('-')
                  dateFormatted = `${String(task.entry.ragat.trim()).padStart(2, '0')}.${mm}.${yyyy}`
                }

                let statusColor = 'text-slate-500'
                let statusBg = 'bg-slate-50 border-slate-200'
                if (type === 'bugunBajarilgan') { statusColor = 'text-blue-600'; statusBg = 'bg-blue-50 border-blue-100' }
                if (type === 'qolibKetgan') { statusColor = 'text-red-600'; statusBg = 'bg-red-50 border-red-100' }
                if (type === 'sababliBajarilmagan') { statusColor = 'text-orange-600'; statusBg = 'bg-orange-50 border-orange-100' }

                const isCompletedAfter = !!task.completedDate
                const isClickable = !!onTaskClick && type === 'bugunBajarilgan'

                return (
                  <div
                    key={ti}
                    className={`group/item flex flex-col sm:flex-row items-center text-center sm:items-start sm:text-left gap-4 border-b border-slate-100 last:border-0 px-6 py-5 transition-all ${isClickable ? 'cursor-pointer hover:bg-blue-50/30 active:scale-[0.99]' : 'hover:bg-slate-50/50'}`}
                    onClick={() => { if (isClickable) onTaskClick(task) }}
                  >
                    {/* SANA */}
                    <div className={`inline-flex flex-col items-center justify-center shrink-0 rounded-2xl p-3 border shadow-sm w-24 h-24 ${isCompletedAfter ? 'bg-emerald-50 border-emerald-100' : statusBg}`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest text-center ${isCompletedAfter ? 'text-emerald-500' : statusColor}`}>
                        {type === 'bugunBajarilgan' ? 'Bugun' : 'Sana'}
                      </span>
                      <span className={`text-sm font-black mt-1 ${isCompletedAfter ? 'text-emerald-700' : statusColor}`}>
                        {dateFormatted}
                      </span>
                    </div>

                    {/* MA'LUMOT */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                        <div>
                          <p className="text-[14px] sm:text-[15px] font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</p>
                          {task.entry.isNavbatdanTashqari && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-md border border-amber-200">
                              <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest">⚡ Navbatdan tashqari</span>
                            </div>
                          )}
                        </div>
                        {task.done && type === 'bugunBajarilgan' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 rounded-lg shrink-0">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <span className="text-[10px] font-black uppercase text-emerald-700">Bajarilgan</span>
                          </div>
                        )}
                      </div>

                      {task.reason && (
                        <div className="mt-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100/50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-orange-800/50 mb-1">Ko&apos;rsatilgan sabab:</p>
                          <p className="text-[11px] font-semibold text-orange-900 leading-relaxed">{task.reason}</p>
                        </div>
                      )}

                      {isCompletedAfter && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 rounded-md">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span className="text-[10px] font-black uppercase text-emerald-700">Kechikib bo&apos;lsa ham bajarildi</span>
                        </div>
                      )}
                    </div>

                    {/* TUGMALAR */}
                    <div className="flex sm:flex-col justify-end sm:justify-start gap-2 shrink-0">
                      {type === 'qolibKetgan' && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPromptTask(task); setPromptMode(true); setPromptReason('') }}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-black uppercase transition-colors"
                          >
                            <FileText size={14} /> Bajarilmaganligi sababi
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (onTaskClick) onTaskClick(task) }}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white shadow-sm shadow-purple-500/20 text-[11px] font-black uppercase transition-colors"
                          >
                            <CheckCircle2 size={14} /> Bajarish
                          </button>
                        </div>
                      )}

                      {type === 'sababliBajarilmagan' && !isCompletedAfter && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); if (onTaskClick) onTaskClick(task) }}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white shadow-sm shadow-purple-500/20 text-[11px] font-black uppercase transition-colors"
                          >
                            <CheckCircle2 size={14} /> Bajarish
                          </button>
                        </div>
                      )}
                    </div>
                    {isClickable && (
                      <div className="flex shrink-0 items-center justify-center pl-2 sm:pl-4 transition-opacity">
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600 transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   TaskCompletionModal — ishni bajarish modali (jurnal bilan bog'langan)
   ═══════════════════════════════════════════════════════════════════════ */

export function TaskCompletionModal({ entry, entryIndex: _entryIndex, reportId, session, stationId, stationName, journalMonth, onComplete, onScanProgress, onJournalVisited, onClose, preloadedStationEq }: {
  entry: ReportEntry
  entryIndex: number
  reportId: string
  session: User
  stationId: string
  stationName: string
  journalMonth: string
  onComplete: (taskType: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy') => void
  onScanProgress?: (scans: any[], taskType: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy') => void
  onJournalVisited?: (taskType: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy', journalName: string) => void
  onClose: () => void
  preloadedStationEq?: any
}) {
  const [activeJournal, setActiveJournal] = useState<'du46' | 'shu2' | 'yerlatgich' | 'alsnKod' | 'mpsFriksion' | 'dgaNazorat' | null>(null)
  const [selectedTaskType, setSelectedTaskType] = useState<'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy' | null>(null)
  const [localProgress, setLocalProgress] = useState<Record<string, boolean>>({})
  const [stationEq, setStationEq] = useState<any>(preloadedStationEq || null)
  const [dbScans, setDbScans] = useState<TaskScan[]>([])
  const [isScanningDb, setIsScanningDb] = useState(false)
  const toast = useToast()

  // Agar tashqaridan berilmagan bo'lsa, o'zi yuklaydi
  useEffect(() => {
    if (preloadedStationEq) {
      setStationEq(preloadedStationEq)
      return
    }
    getStationEquipments(stationId).then((data) => {
      if (data) setStationEq(data)
    })
  }, [stationId, preloadedStationEq])

  const extractJurnal = (text: string): string => {
    const match = text.match(/Jurnal:\s*(.+)$/m)
    return match ? match[1].trim() : ''
  }

  const availableTasks = useMemo(() => {
    const list: { type: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy', label: string, text: string, journals: string }[] = []
    if (entry.haftalikJadval && !entry.doneHaftalik) list.push({ type: 'haftalik', label: '4-haftalik jadval', text: entry.haftalikJadval, journals: entry.jurnalHaftalik || extractJurnal(entry.haftalikJadval) })
    if (entry.yillikJadval && !entry.doneYillik) list.push({ type: 'yillik', label: 'Yillik jadval', text: entry.yillikJadval, journals: entry.jurnalYillik || extractJurnal(entry.yillikJadval) })
    if (entry.yangiIshlar && !entry.doneYangi) list.push({ type: 'yangi', label: 'Yangi ishlar', text: entry.yangiIshlar, journals: entry.jurnalYangi || extractJurnal(entry.yangiIshlar) })
    if (entry.kmoBartaraf && !entry.doneKmo) list.push({ type: 'kmo', label: 'KMO bartaraf', text: entry.kmoBartaraf, journals: entry.jurnalKmo || extractJurnal(entry.kmoBartaraf) })
    if (entry.majburiyOzgarish && !entry.doneMajburiy) list.push({ type: 'majburiy', label: 'Majburiy o\'zgarish', text: entry.majburiyOzgarish, journals: entry.jurnalMajburiy || extractJurnal(entry.majburiyOzgarish) })
    return list
  }, [entry])

  // Agar faqat bitta ish bo'lsa, uni avtomatik tanlaymiz
  useEffect(() => {
    if (availableTasks.length === 1 && !selectedTaskType) {
      setSelectedTaskType(availableTasks[0].type)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTasks.length])

  const currentTask = useMemo(() => availableTasks.find(t => t.type === selectedTaskType), [availableTasks, selectedTaskType])

  const taskTextStr = currentTask?.text || '';
  useEffect(() => {
    if (!selectedTaskType || !stationId || !taskTextStr) return;
    const loadScans = async () => {
      // "[]" (bo'sh qavs) — rasmiy NSH raqami yo'q vazifalar uchun ham to'g'ri kalit hisoblanishi kerak,
      // shuning uchun "+" emas "*" ishlatiladi (aks holda bunday vazifalar "noma'lum" ostida yashiringan bo'lardi)
      const match = taskTextStr.match(/^\[([^\]]*)\]/);
      const taskNshStr = match ? match[1].trim() : 'noma\'lum';
      const taskDateStr = getEntryDateStr(journalMonth, entry.ragat);
      const data = await getTaskScans(stationId, taskNshStr, taskDateStr);
      // Eskirib qolgan (kechikkan) so'rov javobi hozirgina mahalliy qo'shilgan skanerni
      // o'chirib yubormasligi uchun — natijani ustidan yozish o'rniga ID bo'yicha birlashtiramiz.
      setDbScans(prev => {
        const map = new Map(prev.map(s => [s.id, s]));
        data.forEach(s => map.set(s.id, s));
        return Array.from(map.values());
      });
    };
    loadScans();

    // Boshqa ishchining skanini realtime orqali olamiz (5 soniyalik polling o'rniga —
    // tarmoq yuki keskin kamayadi). task_scans jadvaliga faqat INSERT bo'ladi.
    const channel = supabase
      .channel(`task_scans_${stationId}_${selectedTaskType}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_scans',
          filter: `station_id=eq.${stringToUuid(stationId)}`,
        },
        () => loadScans()
      )
      .subscribe();

    // Zaxira yo'l: task_scans hali realtime publication'ga qo'shilmagan bo'lsa
    // (supabase/migrations/add_worker_pending_rpc_and_task_scans_realtime.sql
    // ishga tushirilmagan holat), 30 soniyalik sekin polling baribir ishlaydi.
    const fallbackInterval = setInterval(loadScans, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackInterval);
    };
  }, [selectedTaskType, stationId, taskTextStr, journalMonth, entry.ragat]);

  // To'ldirilgan jurnallar — serverdagi report entry'dan olinadi (localStorage emas),
  // shunda holat qurilma/brauzerdan qat'i nazar bir xil ko'rinadi.
  const visitedJournalsKey = useMemo(() => {
    if (!selectedTaskType) return null
    return `visitedJournals${selectedTaskType.charAt(0).toUpperCase() + selectedTaskType.slice(1)}` as keyof ReportEntry
  }, [selectedTaskType])

  const visitedJournals = useMemo(() => {
    if (!visitedJournalsKey) return new Set<string>()
    return new Set((entry[visitedJournalsKey] as string[] | undefined) || [])
  }, [entry, visitedJournalsKey])

  const requiredJournals = useMemo(() => {
    if (!currentTask?.journals) return []
    return currentTask.journals.split(',').map(j => j.trim()).filter(Boolean)
  }, [currentTask])

  const isInProgress = useMemo(() => {
    if (!selectedTaskType) return false;
    if (localProgress[selectedTaskType]) return true;
    const key = `inProgress${selectedTaskType.charAt(0).toUpperCase() + selectedTaskType.slice(1)}` as keyof ReportEntry;
    return !!entry[key];
  }, [entry, selectedTaskType, localProgress]);

  const supportedRequired = requiredJournals.filter(j => j in SUPPORTED_JOURNALS)
  const unsupportedRequired = requiredJournals.filter(j => !(j in SUPPORTED_JOURNALS))
  const allDone = selectedTaskType && (supportedRequired.length === 0 || supportedRequired.every(j => visitedJournals.has(j)))

  const requiresQR = useMemo(() => {
    if (!selectedTaskType || !stationEq?.taskMappings) return false;
    const match = currentTask?.text.match(/^\[([^\]]*)\]/);
    if (!match) return false;
    const taskNsh = match[1].trim();
    return stationEq.taskMappings.some((tm: any) => tm.taskNsh === taskNsh);
  }, [selectedTaskType, stationEq, currentTask]);

  const targetItems = useMemo(() => {
    if (!selectedTaskType || !stationEq?.taskMappings) return [];
    const match = currentTask?.text.match(/^\[([^\]]*)\]/);
    if (!match) return [];
    const taskNsh = match[1].trim();

    const mapping = stationEq.taskMappings.find((tm: any) => tm.taskNsh === taskNsh);
    if (!mapping) return [];

    // Eski ma'lumotlarda equipmentType bitta string bo'lishi mumkin — ikkalasini ham qo'llab-quvvatlaymiz
    const reqTypes: string[] = Array.isArray(mapping.equipmentType) ? mapping.equipmentType : [mapping.equipmentType].filter(Boolean);
    const categories = stationEq.categories || [];
    return categories
      .filter((c: any) => reqTypes.includes(c.id))
      .flatMap((c: any) => c.items || []);
  }, [selectedTaskType, stationEq, currentTask]);

  const targetScans = targetItems.length;

  const currentScans = useMemo(() => {
    return dbScans.map(s => s.equipment_name);
  }, [dbScans]);

  const [scannerListOpen, setScannerListOpen] = useState(false);
  const [specificScanItem, setSpecificScanItem] = useState<{ id: string, name: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanErrorMsg, setScanErrorMsg] = useState<string | null>(null);

  const handleScanSuccess = async (decodedText: string) => {
    if (!selectedTaskType || isScanningDb) return;
    setIsScanningDb(true);
    setScanErrorMsg(null);
    try {
      const match = currentTask?.text.match(/^\[([^\]]*)\]/);
      const taskNshStr = match ? match[1].trim() : 'noma\'lum';
      const taskDateStr = getEntryDateStr(journalMonth, entry.ragat);

      const newScan = await insertTaskScan({
        station_id: stationId,
        task_nsh: taskNshStr,
        task_date: taskDateStr,
        equipment_id: stringToUuid(decodedText),
        equipment_name: decodedText,
        scanned_by: session?.fullName || 'Ishchi',
      });

      const updatedDbScans = [...dbScans, newScan];
      setDbScans(updatedDbScans);

      const newScansArray = updatedDbScans.map(s => ({
        equipmentId: s.equipment_name,
        scannedAt: s.scanned_at || new Date().toISOString(),
        scannedBy: s.scanned_by
      }));

      if (onScanProgress) onScanProgress(newScansArray, selectedTaskType);

      // Oxirgi qurilma skaner qilindi — agar SHU-2 kerak bo'lsa-yu, ishchi hali
      // uni qo'lda to'ldirmagan bo'lsa, tizim o'zi to'ldirib tasdiqlaydi.
      if (
        updatedDbScans.length >= targetScans &&
        supportedRequired.includes('SHU-2') &&
        !visitedJournals.has('SHU-2')
      ) {
        try {
          const todayDate = new Date();
          const dateFormatted = `${String(todayDate.getDate()).padStart(2, '0')}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${todayDate.getFullYear()}`;
          const firstLine = currentTask?.text.split('\n')[0] || '';
          await autoFillShu2Entry(stationId, journalMonth, firstLine, dateFormatted, session?.fullName || 'Ishchi');
          onJournalVisited?.(selectedTaskType, 'SHU-2');
          toast.success("SHU-2 jurnali avtomatik to'ldirildi");
        } catch (autoErr) {
          console.error('SHU-2 auto-fill error:', autoErr);
        }
      }

    } catch (err: any) {
      console.error('Scan save error:', err);
      const msg = 'Skanerni saqlashda xatolik: ' + (err?.message || 'Nomaʼlum xatolik');
      setScanErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsScanningDb(false);
      setScannerOpen(false);
      setSpecificScanItem(null);
    }
  };

  const handleJournalClose = (journalName: string, isDone = false, isInProgressFlag = false) => {
    if (isDone && selectedTaskType) {
      onJournalVisited?.(selectedTaskType, journalName)
      setLocalProgress(prev => {
        const next = { ...prev }
        delete next[selectedTaskType]
        return next
      })
    }
    if (isInProgressFlag && selectedTaskType) {
      setLocalProgress(prev => ({ ...prev, [selectedTaskType]: true }))
    }
    setActiveJournal(null)
  }

  // Journal portals
  if (activeJournal === 'du46') {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        <DU46JournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole={session.position || 'worker'} journalMonth={journalMonth} onClose={() => handleJournalClose('DU-46', false)} onAccepted={(isDone, isInProg) => handleJournalClose('DU-46', isDone, isInProg)} taskContext={{ reportId, entryIndex: _entryIndex, taskType: selectedTaskType!, taskText: currentTask?.text }} />
      </div>,
      document.body
    )
  }
  if (activeJournal === 'shu2') {
    const todayDate = new Date()
    const dateFormatted = `${String(todayDate.getDate()).padStart(2, '0')}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${todayDate.getFullYear()}`
    const firstLine = currentTask?.text.split('\n')[0] || ''
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        <SHU2JournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole="worker" journalMonth={journalMonth} onClose={() => handleJournalClose('SHU-2', false)} onAccepted={() => handleJournalClose('SHU-2', true)} initialData={{ text: firstLine, date: dateFormatted }} />
      </div>,
      document.body
    )
  }
  if (activeJournal === 'yerlatgich') {
    return createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}><YerlatgichJournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole="worker" journalMonth={journalMonth} onClose={() => handleJournalClose('yerlatgich', false)} onAccepted={() => handleJournalClose('yerlatgich', true)} /></div>, document.body)
  }
  if (activeJournal === 'alsnKod') {
    return createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}><AlsnKodJournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole="worker" journalMonth={journalMonth} onClose={() => handleJournalClose('alsnKod', false)} onAccepted={() => handleJournalClose('alsnKod', true)} /></div>, document.body)
  }
  if (activeJournal === 'mpsFriksion') {
    return createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}><MpsFriksionJournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole="worker" journalMonth={journalMonth} onClose={() => handleJournalClose('mpsFriksion', false)} onAccepted={() => handleJournalClose('mpsFriksion', true)} /></div>, document.body)
  }
  if (activeJournal === 'dgaNazorat') {
    return createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}><DgaNazoratJournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole="worker" journalMonth={journalMonth} onClose={() => handleJournalClose('dgaNazorat', false)} onAccepted={() => handleJournalClose('dgaNazorat', true)} /></div>, document.body)
  }

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(12px)', padding: '16px' }}>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl animate-scale-in overflow-hidden" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Ishni Bajarish</h3>
              <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Sana: {`${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date().getFullYear()}`} · {selectedTaskType ? 'Jurnallarga yozuv kiriting' : 'Ishni tanlang'}
              </p>
            </div>
            <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-slate-900 transition shadow-sm">
              <X size={20} />
            </button>
          </div>
        </div>

        {!selectedTaskType ? (
          <div className="p-8 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Bajariladigan ishni tanlang:</p>
            {availableTasks.map(t => (
              <button key={t.type} onClick={() => setSelectedTaskType(t.type)} className="w-full text-left rounded-2xl border border-slate-200 p-5 hover:border-purple-500 hover:bg-purple-50 transition-all group">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-1 block">{t.label}</span>
                <p className="text-xs font-bold text-slate-700 line-clamp-2 group-hover:text-slate-900">{t.text}</p>
                {t.journals && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <BookOpen size={12} className="text-slate-400" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{t.journals}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="px-8 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">{currentTask?.label}</span>
                {availableTasks.length > 1 && (
                  <button onClick={() => setSelectedTaskType(null)} className="text-[10px] font-black text-slate-400 hover:text-purple-600 underline">Ortga</button>
                )}
              </div>
              <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{currentTask?.text}</p>
            </div>

            <div className="px-8 py-6 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                Kerakli jurnallar ({visitedJournals.size}/{supportedRequired.length})
              </p>

              {supportedRequired.map(name => {
                const isDone = visitedJournals.has(name)
                const isJournalInProgress = name === 'DU-46' ? isInProgress : false

                const showAutoFillHint = name === 'SHU-2' && !isDone && requiresQR

                return (
                  <div key={name}>
                    {showAutoFillHint && (
                      <p className="mb-1.5 px-1 text-[10px] font-bold text-purple-500 leading-snug">
                        💡 Barcha qurilmalarni skaner qilsangiz, SHU-2 jurnali avtomatik to'ldiriladi — qo'lda to'ldirish shart emas.
                      </p>
                    )}
                    <button
                      onClick={() => setActiveJournal(SUPPORTED_JOURNALS[name])}
                      className={`w-full flex items-center justify-between rounded-2xl border p-5 transition-all active:scale-[0.98] ${isDone
                        ? 'border-emerald-200 bg-emerald-50/80'
                        : isJournalInProgress
                          ? 'border-amber-200 bg-amber-50/80'
                          : 'border-purple-200 bg-purple-50/50 hover:bg-purple-100 hover:border-purple-300'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl ${isDone ? 'bg-emerald-100 text-emerald-600' : isJournalInProgress ? 'bg-amber-100 text-amber-500' : 'bg-white text-purple-600 shadow-sm'}`}>
                          {isDone ? <CheckCircle2 size={24} /> : <BookOpen size={24} />}
                        </div>
                        <div className="text-left flex flex-col">
                          <span className="font-black text-slate-900 text-sm sm:text-base">{name} jurnali</span>
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${isDone ? 'text-emerald-500' : isJournalInProgress ? 'text-amber-500' : 'text-purple-600'}`}>
                            {isDone ? 'Bajarildi' : isJournalInProgress ? 'Jarayonda' : 'Bajarish kerak'}
                          </span>
                        </div>
                      </div>
                      <div className="text-slate-300">
                        {isDone ? <CheckCircle2 size={20} className="text-emerald-500" /> : <ChevronRight size={20} />}
                      </div>
                    </button>
                  </div>
                )
              })}

              {unsupportedRequired.map(name => (
                <div key={name} className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><BookOpen size={20} /></div>
                    <div className="text-left">
                      <span className="text-sm font-black text-slate-700">{JOURNAL_DISPLAY_NAMES[name] || name}</span>
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Yaqin kunlarda</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-[10px] font-black text-amber-600">Yaqinda</span>
                </div>
              ))}
            </div>

            {requiresQR && (
              <div className="px-8 pb-4 bg-white">
                <button
                  onClick={() => setScannerListOpen(true)}
                  className="w-full rounded-2xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 p-4 transition-all flex flex-col items-center justify-center gap-1 group shadow-sm hover:shadow-md"
                >
                  <span className="font-black text-purple-700 uppercase tracking-wider text-sm flex items-center gap-2">
                    <Target size={18} /> Qurilmalarni skanerlash oynasi ({currentScans.length}/{targetScans})
                  </span>
                  <p className="text-[10px] text-purple-500 font-bold">
                    {currentScans.length >= targetScans ? "Barcha qurilmalar skanerlandi" : "Vazifani tugatish uchun barcha qurilmalarni skanerlang"}
                  </p>
                </button>
              </div>
            )}

            <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-5 flex gap-3">
              <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all shadow-sm">
                Bekor qilish
              </button>

              <button
                onClick={() => {
                  if (isInProgress) {
                    onClose()
                  } else if (selectedTaskType) {
                    onComplete(selectedTaskType)
                  }
                }}
                disabled={!isInProgress && (!allDone || (requiresQR && currentScans.length < targetScans))}
                className={`flex-1 rounded-xl px-6 py-3 text-sm font-black text-white shadow-lg transition-all active:scale-95 ${isInProgress
                  ? 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600'
                  : ((!allDone || (requiresQR && currentScans.length < targetScans)) ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500' : 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600')
                  }`}
              >
                {isInProgress
                  ? 'Kutish (Yopish)'
                  : (!allDone
                    ? 'Avval jurnallarga yozuv kiriting'
                    : (requiresQR && currentScans.length < targetScans ? 'Avval barcha qurilmalarni skaner qiling' : 'Bajarildi — Saqlash'))}
              </button>
            </div>
          </>
        )}
      </div>

      {scannerListOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(12px)', padding: '16px' }}>
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl animate-scale-in flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <div>
                <h3 className="font-black text-slate-800">Qurilmalar ro'yxati</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Skaner qilingan: {currentScans.length}/{targetScans}</p>
              </div>
              <button onClick={() => setScannerListOpen(false)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-slate-900 transition">
                <X size={20} />
              </button>
            </div>

            {scanErrorMsg && (
              <div className="mx-6 mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>{scanErrorMsg}</span>
              </div>
            )}

            <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/30">
              {targetItems.map((item: any) => {
                const expectedQR = buildEquipmentQrValue(stationId, item.id);
                const scanRecord = dbScans.find((s: any) => s.equipment_name === expectedQR);

                return (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <span className="font-black text-slate-700">{item.name}</span>
                    {scanRecord ? (
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                          <CheckCircle2 size={14} />
                          <span className="text-[10px] font-black uppercase tracking-wider">{scanRecord.scanned_by}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 mt-1">
                          {new Date(scanRecord.scanned_at || Date.now()).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSpecificScanItem(item);
                          setScannerOpen(true);
                        }}
                        className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded-xl text-xs font-black transition active:scale-95 border border-purple-200"
                      >
                        Skanerlash
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {scannerOpen && specificScanItem && (
        <QRScannerModal
          isOpen={scannerOpen}
          onClose={() => { setScannerOpen(false); setSpecificScanItem(null); }}
          onScanSuccess={handleScanSuccess}
          expectedPrefix={buildEquipmentQrValue(stationId, specificScanItem.id)}
          existingScans={currentScans}
          title={`${specificScanItem.name} ni skanerlang`}
        />
      )}
    </div>,
    document.body
  )
}
