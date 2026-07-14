/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Download, X, CheckCircle2, Clock, Plus, ChevronLeft, ChevronRight, ArrowRight, AlertTriangle, LayoutGrid, List, Calendar, Loader2 } from 'lucide-react'
import { upsertReport, updateReportEntries, getStationEquipments, updateEquipmentScanHistory } from '@/lib/supabase-db'
import type { User, WorkReport, ReportEntry, TaskQRMapping } from '@/types'
import { YILLIK_REJA, TORT_HAFTALIK_REJA, YILLIK_REJA_FLAT, TORT_HAFTALIK_REJA_FLAT, taskDisplayKey, type ParsedTaskItem } from '@/lib/reja-data'
import { MONTHS } from '@/lib/constants'
import { MemoizedJournalRow } from './MemoizedJournalRow'
import { HeaderCard } from './BigActionCard'
import { TaskCompletionModal } from './WorkerTasksModal'

const TOTAL_ROWS = 14

/* ═══════════════════════════════════════════════════════════════════════
   JournalForm — oylik ish reja formasi (eng og'ir komponent)

   Auto-save tuzatilgan:
   - visibilitychange event bilan sahifa yopilishida saqlash
   - beforeunload event bilan browser yopilishida saqlash
   ═══════════════════════════════════════════════════════════════════════ */

function TaskSelectionModal({
  modalOpen,
  modalType,
  onClose,
  onSelect,
  taskMappings
}: {
  modalOpen: boolean;
  modalType: '4-haftalik' | 'yillik';
  onClose: () => void;
  onSelect: (task: ParsedTaskItem, text: string) => void;
  taskMappings: TaskQRMapping[];
}) {
  const [modalSearch, setModalSearch] = useState('');
  const [selectedBolim, setSelectedBolim] = useState<number | null>(null);

  useEffect(() => {
    if (modalOpen) {
      setModalSearch('');
      setSelectedBolim(null);
    }
  }, [modalOpen]);

  if (!modalOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 p-4 transition-all">
      <div className="relative flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200/60 px-8 py-5 bg-slate-50/80">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            {modalType === '4-haftalik' ? '4-haftalik jadval' : 'Yillik jadval'} — vazifa tanlash
          </h3>
          <button onClick={onClose} className="rounded-xl border border-slate-200/60 bg-white p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={20} /></button>
        </div>
        <div className="border-b border-slate-100 px-8 py-4 bg-white">
          <input value={modalSearch} onChange={e => setModalSearch(e.target.value)} placeholder="Vazifa qidirish..." className="input-premium" />
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50/30">
          {selectedBolim === null && !modalSearch ? (
            <div className="grid grid-cols-1 gap-3">
              {(modalType === 'yillik' ? YILLIK_REJA : TORT_HAFTALIK_REJA).map((b, idx) => (
                <button key={idx} onClick={() => setSelectedBolim(idx)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 p-5 text-left backdrop-blur-sm transition-all hover:border-purple-300 hover:shadow-md hover:bg-purple-50/30 group">
                  <span className="font-bold text-slate-700 group-hover:text-purple-600 transition-colors uppercase tracking-tight text-sm">{b.bolim}</span>
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
                  <span className="text-xs font-bold text-purple-600 truncate max-w-[200px] text-right">
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
                .slice(0, 100)
                .map((task: ParsedTaskItem, ti: number) => (
                  (() => {
                    const hasQR = taskMappings.some(m => m.taskNsh === taskDisplayKey(task.manba, task.raqam));
                    return (
                      <button
                        key={ti}
                        onClick={() => {
                          const text =
                            `[${taskDisplayKey(task.manba, task.raqam)}] ${task.ish}\n` +
                            `Davriyligi: ${task.davriylik}\n` +
                            `Bajaruvchi: ${task.bajaruvchi}` +
                            (task.jurnal ? `\nJurnal: ${task.jurnal}` : '');
                          onSelect(task, text);
                        }}
                        className={`w-full rounded-xl border p-3 text-left backdrop-blur-sm transition-all hover:border-purple-300 hover:shadow-md hover:bg-purple-50/30 group ${hasQR ? 'border-purple-300 bg-purple-50/40' : 'border-slate-200/60 bg-white/80'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <p className="text-[10px] text-purple-600"><span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400 mr-0.5" /> {task.bolim}</p>
                            <p className="text-[10px] text-amber-600/70"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 mr-0.5" /> {task.manba} {task.raqam}</p>
                            <p className="text-[10px] text-slate-400"><Clock size={10} className="inline mr-0.5" /> {task.davriylik}</p>
                            <p className="text-[10px] text-slate-400"><span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 mr-0.5" /> {task.bajaruvchi}</p>
                          </div>
                          {hasQR && (
                            <div className="shrink-0 flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-purple-200">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                              QR
                            </div>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs font-bold text-slate-700 group-hover:text-slate-900">{task.ish}</p>
                        {task.jurnal && (
                          <div className="mt-2 inline-block rounded-md bg-purple-50/80 px-2 py-1 text-[9px] uppercase tracking-widest text-purple-600 border border-purple-100/60">
                            Jurnal: {task.jurnal}
                          </div>
                        )}
                      </button>
                    );
                  })()
                ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function JournalForm({ session, stationId, stationName, month, reports, reportsLoaded = true, onSubmit, onCancel, onReportUpdated, initialDay }: { session: User, stationId: string, stationName: string, month: number, reports: WorkReport[], reportsLoaded?: boolean, onSubmit: () => void, onCancel: () => void, onReportUpdated?: (reportId: string, entries: ReportEntry[]) => void, initialDay?: number }) {
  const [entries, setEntries] = useState<ReportEntry[]>(Array.from({ length: TOTAL_ROWS }, (_, i) => ({
    ragat: String(i + 1), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: '', bajarildiImzo: '', adImzosi: ''
  })))
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'4-haftalik' | 'yillik'>('4-haftalik')
  const [modalIdx, setModalIdx] = useState(0)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isRejected, setIsRejected] = useState(false)
  const [rejectedBy, setRejectedBy] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [completionIdx, setCompletionIdx] = useState<number | null>(null)
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null)
  const monthStr = `${new Date().getFullYear()}-${String(month + 1).padStart(2, '0')}`
  const draftReport = useMemo(() => reports.find(r => r.month === monthStr && r.stationId === stationId), [reports, monthStr, stationId])
  const canEditPlan = session.position === 'katta_elektromexanik'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [selectedDay, setSelectedDay] = useState<number>(initialDay || new Date().getDate() || 1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  // Serverda reja boshqa joyda (masalan boshqa tab/qurilmada) allaqachon o'zgargan bo'lsa —
  // ustidan yozib yubormaymiz, o'rniga foydalanuvchidan sahifani yangilashni so'raymiz.
  const [saveConflict, setSaveConflict] = useState(false)
  // Optimistik lock uchun "oxirgi ko'rgan submitted_at" — draftReport.submittedAt'dan farqli,
  // bu HAR BIR muvaffaqiyatli saqlashdan keyin yangilanadi (draftReport esa faqat sahifa
  // to'liq qayta yuklanganda yangilanadi), aks holda o'zimizning ketma-ket avto-saqlashlarimiz
  // bir-birini "ziddiyat" deb noto'g'ri belgilab qo'yar edi.
  const [knownSubmittedAt, setKnownSubmittedAt] = useState<string | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Bekat uskunalari — oldindan yuklanadi (QR tekshirish uchun)
  const [stationEq, setStationEq] = useState<any>(null)
  useEffect(() => {
    getStationEquipments(stationId).then((data) => {
      if (data) setStationEq(data)
    }).catch(console.error)
  }, [stationId])
  const stationTaskMappings: TaskQRMapping[] = useMemo(() => stationEq?.taskMappings || [], [stationEq])

  useEffect(() => {
    const draft = draftReport
    if (draft) {
      if (!hasUnsavedChanges) {
        setEntries(draft.entries)
        setKnownSubmittedAt(draft.submittedAt)
      }
      setIsConfirmed(!!draft.confirmedAt)
      setIsRejected(!!draft.rejectedAt)
      setRejectedBy(draft.rejectedBy || null)
      setReportId(draft.id)
    } else {
      if (!hasUnsavedChanges) {
        setEntries(Array.from({ length: TOTAL_ROWS }, (_, i) => ({
          ragat: String(i + 1), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: '', bajarildiImzo: '', adImzosi: ''
        })))
      }
      setIsConfirmed(false)
      setIsRejected(false)
      setRejectedBy(null)
      setReportId(null)
    }
  }, [draftReport, hasUnsavedChanges])

  const addRow = () => {
    setEntries([...entries, {
      ragat: String(entries.length + 1), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: '', bajarildiImzo: '', adImzosi: ''
    }])
  }
  const removeRow = () => {
    if (entries.length <= 1) return
    const last = entries[entries.length - 1]
    if (last.adImzosi) return
    setEntries(entries.slice(0, -1))
  }

  // Navbatdan tashqari ish qo'shish
  const [navbatdanTashqariModalDay, setNavbatdanTashqariModalDay] = useState<number | null>(null)
  const [navbatdanTashqariModalIndex, setNavbatdanTashqariModalIndex] = useState<number | null>(null)
  const [navbatdanTashqariText, setNavbatdanTashqariText] = useState('')

  const addNavbatdanTashqari = async (day: number | null, text: string) => {
    if (!text.trim() || !reportId) return

    // Bu funksiya nafaqat lokal holatga, balki serverdan qayta o'qilgan ENG SO'NGGI
    // massivga ham qo'llanadi (pastda updateReportEntries ichida) — shu bilan boshqa
    // joyda parallel kiritilgan o'zgarishlar ustidan yozib yuborilmaydi.
    const applyChange = (current: ReportEntry[]): ReportEntry[] => {
      const newEntries = [...current]
      if (navbatdanTashqariModalIndex !== null) {
        newEntries[navbatdanTashqariModalIndex] = { ...newEntries[navbatdanTashqariModalIndex], yangiIshlar: text }
      } else if (day !== null) {
        const existingIdx = newEntries.findIndex(e => parseInt(e.ragat) === day)
        if (existingIdx !== -1 && !newEntries[existingIdx].yangiIshlar) {
          newEntries[existingIdx] = { ...newEntries[existingIdx], yangiIshlar: text, isNavbatdanTashqari: true }
        } else {
          newEntries.push({
            ragat: String(day),
            haftalikJadval: '', yillikJadval: '',
            yangiIshlar: text,
            kmoBartaraf: '', majburiyOzgarish: '',
            bajarildiShn: '', bajarildiImzo: '', adImzosi: '',
            isNavbatdanTashqari: true,
          })
        }
      }
      return newEntries
    }

    setEntries(prev => applyChange(prev)) // darhol ekranda ko'rsatish uchun
    setNavbatdanTashqariModalDay(null)
    setNavbatdanTashqariModalIndex(null)
    setNavbatdanTashqariText('')

    try {
      const updated = await updateReportEntries(reportId, applyChange)
      setEntries(updated.entries) // serverdagi haqiqiy holat bilan sinxronlaymiz
      setFormMessage({ type: 'success', text: 'Navbatdan tashqari ish qo\'shildi!' })
      setTimeout(() => setFormMessage(null), 3000)
    } catch {
      setFormMessage({ type: 'error', text: 'Saqlashda xatolik' })
      setTimeout(() => setFormMessage(null), 3000)
    }
  }

  const openSelectModal = useCallback((idx: number, type: '4-haftalik' | 'yillik') => {
    setModalIdx(idx)
    setModalType(type)
    setModalOpen(true)
  }, [])

  const openNavbatdanTashqariModal = useCallback((idx: number) => {
    const day = parseInt(entries[idx].ragat);
    if (!isNaN(day)) {
      setNavbatdanTashqariModalDay(day);
      setNavbatdanTashqariModalIndex(idx);
    }
  }, [entries])

  const handleDeleteNavbatdanTashqari = useCallback((idx: number) => {
    setDeleteConfirmIdx(idx);
  }, [])

  const executeDeleteNavbatdanTashqari = useCallback(() => {
    if (deleteConfirmIdx === null) return;
    const idx = deleteConfirmIdx;

    setHasUnsavedChanges(true)
    setEntries(prev => {
      const newEntries = [...prev]
      const entry = newEntries[idx]

      if (!entry.haftalikJadval && !entry.yillikJadval && !entry.kmoBartaraf && !entry.majburiyOzgarish) {
        newEntries.splice(idx, 1)
      } else {
        newEntries[idx] = { ...entry, yangiIshlar: '', isNavbatdanTashqari: false }
      }
      return newEntries
    })
    setDeleteConfirmIdx(null);
  }, [deleteConfirmIdx])

  const updateEntry = useCallback((index: number, field: keyof ReportEntry, value: string) => {
    setHasUnsavedChanges(true)
    setEntries(prev => {
      const n = [...prev]
      n[index] = { ...n[index], [field]: value }
      return n
    })
  }, [])

  // ── Auto-save: ref bilan eng oxirgi ma'lumotlarni saqlash ──────────
  const latestData = useRef({ entries, hasUnsavedChanges, reportId, draftReport, knownSubmittedAt, session, stationId, stationName, monthStr });
  useEffect(() => {
    latestData.current = { entries, hasUnsavedChanges, reportId, draftReport, knownSubmittedAt, session, stationId, stationName, monthStr };
  }, [entries, hasUnsavedChanges, reportId, draftReport, knownSubmittedAt, session, stationId, stationName, monthStr]);

  // ── Auto-save: flush funksiyasi ────────────────────────────────────
  const flushSave = useCallback(async () => {
    const data = latestData.current;
    if (!data.hasUnsavedChanges || saveConflict) return;
    try {
      const result = await upsertReport({
        id: data.reportId || undefined,
        workerId: data.draftReport?.workerId || data.session.id,
        workerName: data.draftReport?.workerName || data.session.fullName,
        workerPhone: data.draftReport?.workerPhone || data.session.phone || '',
        stationId: data.stationId,
        stationName: data.stationName,
        entries: data.entries,
        month: data.monthStr,
        year: String(new Date().getFullYear()),
        weekLabel: 'Draft Oylik Reja'
      }, undefined, data.knownSubmittedAt);
      setKnownSubmittedAt(result.submittedAt);
      if (!data.reportId) setReportId(result.id);
    } catch (e) {
      console.error('Auto-save failed:', e);
      if (e instanceof Error && e.message.startsWith('CONFLICT')) setSaveConflict(true);
    }
  }, [saveConflict]);

  // ── visibilitychange va beforeunload bilan sahifa yopilishida saqlash ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave();
      }
    };
    const handleBeforeUnload = () => {
      flushSave();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Unmount da ham saqlash
      flushSave();
    };
  }, [flushSave]);

  // ── Debounced auto-save (1.5 sek) ─────────────────────────────────
  useEffect(() => {
    if (!hasUnsavedChanges || submitting || saveConflict) return;
    const timeoutId = setTimeout(async () => {
      try {
        const result = await upsertReport({
          id: reportId || undefined,
          workerId: draftReport?.workerId || session.id,
          workerName: draftReport?.workerName || session.fullName,
          workerPhone: draftReport?.workerPhone || session.phone || '',
          stationId,
          stationName,
          entries,
          month: monthStr,
          year: String(new Date().getFullYear()),
          weekLabel: 'Draft Oylik Reja'
        }, undefined, knownSubmittedAt);
        setKnownSubmittedAt(result.submittedAt);
        if (!reportId) setReportId(result.id);
      } catch (e) {
        console.error('Auto-save failed:', e);
        if (e instanceof Error && e.message.startsWith('CONFLICT')) setSaveConflict(true);
      }
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [entries, hasUnsavedChanges, submitting, saveConflict, reportId, draftReport, knownSubmittedAt, session, stationId, stationName, monthStr]);

  async function handleSubmit() {
    setSubmitting(true)
    setFormMessage(null)
    let lastErr: unknown
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await upsertReport({
          id: reportId || undefined,
          workerId: draftReport?.workerId || session.id,
          workerName: draftReport?.workerName || session.fullName,
          workerPhone: draftReport?.workerPhone || session.phone || '',
          stationId,
          stationName,
          entries,
          month: monthStr,
          year: String(new Date().getFullYear()),
          weekLabel: 'Draft Oylik Reja'
        }, true, knownSubmittedAt) // ← Yuborish: dispetcherga tasdiqlash uchun ko'rinadi
        setFormMessage({ type: 'success', text: 'Muvaffaqiyatli yuborildi!' })
        setTimeout(() => setFormMessage(null), 3000)
        setHasUnsavedChanges(false)
        setSubmitting(false)
        onSubmit()
        return
      } catch (err: unknown) {
        lastErr = err
        // Ziddiyat bo'lsa qayta urinish foydasiz — eskirgan holat bilan urinaveramiz, shuning uchun darhol to'xtaymiz
        if (err instanceof Error && err.message.startsWith('CONFLICT')) { setSaveConflict(true); break }
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }
    const msg = lastErr instanceof Error ? lastErr.message : 'Xatolik'
    setFormMessage({ type: 'error', text: msg.includes('fetch') ? 'Internet bilan muammo. Qayta urinildi, ammo muvaffaqiyatsiz. Iltimos sahifani yangilang.' : msg.replace('CONFLICT: ', '') })
    setTimeout(() => setFormMessage(null), 5000)
    setSubmitting(false)
  }

  const handleBajarishClick = useCallback((idx: number) => {
    const currentDate = new Date()
    const currentActualMonth = currentDate.getMonth()

    if (month > currentActualMonth) {
      setHeaderError(`Hali ${MONTHS[month]} oyi boshlanmadi`)
      setTimeout(() => setHeaderError(null), 3000)
      return
    }
    setCompletionIdx(idx)
  }, [month])

  const confirmBajarildi = async (idx: number, taskType?: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy') => {
    if (!reportId) return
    const oldEntries = entries.map(e => ({ ...e }))
    const planOwnerName = draftReport?.workerName || session.fullName;

    // Serverdan qayta o'qilgan ENG SO'NGGI massivga qo'llanadi (updateReportEntries ichida) —
    // shu bilan boshqa joyda parallel kiritilgan o'zgarishlar ustidan yozib yuborilmaydi.
    const applyChange = (current: ReportEntry[]): ReportEntry[] => {
      const newEntries = [...current]
      const entry = { ...newEntries[idx] }

      if (taskType === 'haftalik') entry.doneHaftalik = true
      if (taskType === 'yillik') entry.doneYillik = true
      if (taskType === 'yangi') entry.doneYangi = true
      if (taskType === 'kmo') entry.doneKmo = true
      if (taskType === 'majburiy') entry.doneMajburiy = true

      const ragatNum = parseInt(entry.ragat)
      if (!isNaN(ragatNum)) {
        const ragatDate = new Date(new Date().getFullYear(), month, ragatNum)
        if (Date.now() > ragatDate.getTime() + 5 * 24 * 60 * 60 * 1000) {
          if (taskType === 'haftalik') entry.completedAfterMissedDateHaftalik = new Date().toISOString()
          if (taskType === 'yillik') entry.completedAfterMissedDateYillik = new Date().toISOString()
          if (taskType === 'yangi') entry.completedAfterMissedDateYangi = new Date().toISOString()
          if (taskType === 'kmo') entry.completedAfterMissedDateKmo = new Date().toISOString()
          if (taskType === 'majburiy') entry.completedAfterMissedDateMajburiy = new Date().toISOString()
        }
      }

      entry.bajarildiShn = planOwnerName
      entry.bajarildiImzo = planOwnerName
      entry.adImzosi = planOwnerName

      newEntries[idx] = entry
      return newEntries
    }

    // Skanerlar ro'yxati shu foydalanuvchining lokal holatidan olinadi (server-fetch'dan oldin
    // shu sessiyada QR skanerlangan bo'lishi mumkin) — shuning uchun lokal entry'dan o'qiymiz
    const localEntry = applyChange(entries)[idx]

    setEntries(applyChange(entries)) // darhol ekranda ko'rsatish uchun
    setCompletionIdx(null)

    setSubmitting(true)
    try {
      const updated = await updateReportEntries(reportId, applyChange)
      setEntries(updated.entries) // serverdagi haqiqiy holat bilan sinxronlaymiz

      let scansToUpdate: any[] = [];
      if (taskType) {
        const field = `scans${taskType.charAt(0).toUpperCase() + taskType.slice(1)}` as keyof ReportEntry;
        const scans = localEntry[field];
        if (scans && Array.isArray(scans)) {
          scansToUpdate = scans.filter(s => typeof s !== 'string');
        }
      }

      if (scansToUpdate.length > 0) {
        await updateEquipmentScanHistory(stationId, scansToUpdate, planOwnerName).catch(console.error);
      }

      setFormMessage({ type: 'success', text: 'Muvaffaqiyatli saqlandi!' })
      setTimeout(() => setFormMessage(null), 3000)

      if (onReportUpdated) {
        onReportUpdated(reportId, updated.entries)
      }
    } catch (err: unknown) {
      setEntries(oldEntries)
      const msg = err instanceof Error ? err.message : 'Xatolik'
      setFormMessage({ type: 'error', text: msg.includes('Failed to fetch') ? 'Internet bilan aloqa yo\'q. Iltimos tekshirib qayta yuboring.' : msg })
      setTimeout(() => setFormMessage(null), 3000)
    } finally {
      setSubmitting(false)
    }
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

  // Serverdagi haqiqiy reja hali kelmasdan turib tahrirlash/avto-saqlashni boshlamaslik uchun —
  // aks holda mavjud, to'liq reja bo'sh (hali yuklanmagan) lokal holat bilan almashtirilib qolishi mumkin.
  if (!reportsLoaded) {
    return (
      <div className="space-y-6">
        <HeaderCard title="Jurnal To'ldirish" subtitle={`${MONTHS[month]} · ${stationName}`} onClose={onCancel} />
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      </div>
    )
  }

  if (!canEditPlan && !draftReport) {
    return (
      <div className="space-y-6">
        <HeaderCard title="Jurnal To'ldirish" subtitle={`${MONTHS[month]} · ${stationName}`} onClose={onCancel} />
        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-12 text-center shadow-sm backdrop-blur-sm">
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Oylik ish reja hali tuzilmagan</h3>
          <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">Ushbu bekat va oy uchun oylik ish reja Katta elektromexanik tomonidan hali tizimga kiritilmagan. Iltimos kuting.</p>
          <button onClick={onCancel} className="rounded-2xl bg-white border border-slate-200/60 px-10 py-3 font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm backdrop-blur-sm">Orqaga qaytish</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <HeaderCard
        title="Jurnal To'ldirish"
        subtitle={`${MONTHS[month]} · ${stationName}`}
        status={headerError || ""}
        statusColor={headerError ? "error" : "default"}
        onClose={onCancel}
      />
      {saveConflict && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertTriangle size={20} className="shrink-0" />
          <span>Bu reja boshqa joyda allaqachon o&apos;zgargan — o&apos;zgarishlaringiz saqlanmayapti. Iltimos sahifani yangilang (F5) va qaytadan kiriting.</span>
        </div>
      )}
      {/* View Mode Toggler */}
      <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-md p-1 rounded-2xl shadow-sm border border-slate-200/60 w-fit mx-auto sm:mx-0 mt-2 mb-1">
        <button
          onClick={() => setViewMode('cards')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'cards' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <LayoutGrid size={14} /> Kunlik
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <List size={14} /> To&apos;liq jadval
        </button>
      </div>

      {viewMode === 'cards' && (
        <div className="mt-2">
          <div className="flex items-center justify-between bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-1.5 shadow-sm max-w-[240px] mx-auto mb-5">
            <button
              onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
              className="p-2.5 bg-white hover:bg-purple-50 text-slate-500 hover:text-purple-600 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent shadow-sm border border-slate-100"
              disabled={selectedDay === 1}
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex-1 flex items-center justify-center gap-1.5 font-black text-slate-800 text-base hover:text-purple-600 transition-colors"
            >
              <Calendar size={16} className="text-purple-500" />
              {selectedDay} - {MONTHS[month]}
            </button>

            <button
              onClick={() => setSelectedDay(Math.min(new Date(new Date().getFullYear(), month + 1, 0).getDate(), selectedDay + 1))}
              className="p-2.5 bg-white hover:bg-purple-50 text-slate-500 hover:text-purple-600 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent shadow-sm border border-slate-100"
              disabled={selectedDay === new Date(new Date().getFullYear(), month + 1, 0).getDate()}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {isCalendarOpen && (
            <div className="grid grid-cols-7 gap-2 p-4 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/60 shadow-lg max-w-xs mx-auto mb-6 animate-scale-in">
              {Array.from({ length: new Date(new Date().getFullYear(), month + 1, 0).getDate() }, (_, i) => i + 1).map(day => (
                <button
                  key={day}
                  onClick={() => { setSelectedDay(day); setIsCalendarOpen(false); }}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all ${selectedDay === day ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 scale-105' : 'bg-slate-50/80 text-slate-600 hover:bg-purple-100 hover:text-purple-700 border border-slate-100'}`}
                >
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-60">KUN</span>
                  <span className="text-sm font-black">{day}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {(() => {
              const dayTasks: { title: string, content: string, done: boolean, type: string, isLate: boolean, originalIndex: number, isNavbatdanTashqari?: boolean }[] = [];
              entries.forEach((e, originalIndex) => {
                if (parseInt(e.ragat) === selectedDay) {
                  if (e.haftalikJadval) dayTasks.push({ title: '4-haftalik jadval', content: e.haftalikJadval, done: !!e.doneHaftalik, type: 'haftalik', isLate: !!e.completedAfterMissedDateHaftalik, originalIndex, isNavbatdanTashqari: !!e.isNavbatdanTashqari });
                  if (e.yillikJadval) dayTasks.push({ title: 'Yillik jadval', content: e.yillikJadval, done: !!e.doneYillik, type: 'yillik', isLate: !!e.completedAfterMissedDateYillik, originalIndex, isNavbatdanTashqari: !!e.isNavbatdanTashqari });
                  if (e.yangiIshlar) dayTasks.push({ title: 'Yangi ishlar', content: e.yangiIshlar, done: !!e.doneYangi, type: 'yangi', isLate: !!e.completedAfterMissedDateYangi, originalIndex, isNavbatdanTashqari: !!e.isNavbatdanTashqari });
                  if (e.kmoBartaraf) dayTasks.push({ title: 'KMO bartaraf', content: e.kmoBartaraf, done: !!e.doneKmo, type: 'kmo', isLate: !!e.completedAfterMissedDateKmo, originalIndex, isNavbatdanTashqari: !!e.isNavbatdanTashqari });
                  if (e.majburiyOzgarish) dayTasks.push({ title: 'Majburiy o\'zgartirish', content: e.majburiyOzgarish, done: !!e.doneMajburiy, type: 'majburiy', isLate: !!e.completedAfterMissedDateMajburiy, originalIndex, isNavbatdanTashqari: !!e.isNavbatdanTashqari });
                }
              });

              if (dayTasks.length === 0) {
                return (
                  <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center animate-fade-up">
                    <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <h4 className="text-lg font-black text-slate-500">Ushbu kun uchun reja kiritilmagan</h4>
                  </div>
                );
              }

              return dayTasks.map((t, idx) => (
                <div key={idx} className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] max-w-[400px] group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-purple-200 hover:shadow-md flex flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <span className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${t.isNavbatdanTashqari ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>{t.isNavbatdanTashqari ? '⚡ Navbatdan tashqari' : t.title}</span>
                    <div className="flex items-center gap-2">
                      {t.done ? (
                        <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold border ${t.isLate ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          <CheckCircle2 size={12} /> Bajarildi
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 border border-slate-200">
                          <Clock size={12} /> Kutilmoqda
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="flex-1 whitespace-pre-wrap text-[13px] font-bold text-slate-700 leading-relaxed text-center">{t.content}</p>

                  {isConfirmed && !t.done && (
                    <button
                      onClick={() => handleBajarishClick(t.originalIndex)}
                      disabled={submitting}
                      className="mt-6 w-full rounded-xl bg-purple-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-purple-500/20 transition-all hover:bg-purple-600 active:scale-95 disabled:opacity-50"
                    >
                      Bajarish
                    </button>
                  )}
                </div>
              ));
            })()}

            {isConfirmed && (
              <button
                onClick={() => { setNavbatdanTashqariModalDay(selectedDay); setNavbatdanTashqariText(''); }}
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 px-6 py-4 text-sm font-black text-amber-600 uppercase tracking-widest transition-all hover:border-amber-400 hover:bg-amber-100/50 active:scale-[0.99] group"
              >
                <Plus size={18} strokeWidth={3} className="transition-transform group-hover:rotate-90" />
                Navbatdan tashqari ish qo&apos;shish
              </button>
            )}
          </div>
        </div>
      )}

      {/* Rad qilingan reja banneri */}
      {isRejected && canEditPlan && (
        <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm mt-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-red-700 mb-0.5">Oylik ish reja rad qilindi!</p>
            <p className="text-xs text-red-600 leading-relaxed">
              {rejectedBy ? <><span className="font-bold">{rejectedBy}</span> tomonidan rad etildi. </> : ''}
              Rejani tahrirlang va qaytadan yuboring.
            </p>
          </div>
        </div>
      )}

      {viewMode === 'table' && (
        <div className="mb-6 mt-6 overflow-hidden rounded-2xl border border-slate-200/60 bg-white relative shadow-sm">
          <div className="sm:hidden absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-2 py-1 z-10 rounded-bl-lg font-bold">
            O&apos;ngga suring →
          </div>
          <div className="overflow-x-auto overflow-y-hidden">
            <table style={{ minWidth: "1200px" }} className="w-full table-fixed border-collapse text-left text-[11px] text-slate-700">
              <thead className="border-b-2 border-purple-500/30 bg-slate-50 font-bold text-slate-600">
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
                  <th className="border-r border-t border-slate-200 p-2 text-center font-bold text-purple-600">Shn</th>
                  <th className="border-r border-t border-slate-200 p-2 text-center font-bold text-purple-600">Imzo</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <MemoizedJournalRow
                    key={i}
                    e={e}
                    i={i}
                    isConfirmed={isConfirmed}
                    canEditPlan={canEditPlan}
                    updateEntry={updateEntry}
                    openSelectModal={openSelectModal}
                    openNavbatdanTashqariModal={openNavbatdanTashqariModal}
                    handleDeleteNavbatdanTashqari={handleDeleteNavbatdanTashqari}
                    handleBajarishClick={handleBajarishClick}
                    submitting={submitting}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {(!isConfirmed && canEditPlan) && (
            <div className="flex items-center gap-3 border-t border-slate-200/60 bg-slate-50/50 p-4">
              <button onClick={addRow} className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-slate-100">
                <Plus size={14} /> Qator qo&apos;shish
              </button>
              <button onClick={removeRow} className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-400 backdrop-blur-sm transition hover:border-red-200 hover:text-red-500">
                <X size={14} /> Qator o&apos;chirish
              </button>
            </div>
          )}
          {isConfirmed && (
            <div className="flex items-center justify-center border-t border-slate-200/60 bg-slate-50/50 p-4">
              <button
                onClick={() => { setNavbatdanTashqariModalDay(new Date().getDate()); setNavbatdanTashqariText(''); }}
                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 px-6 py-2.5 text-xs font-black text-amber-600 uppercase tracking-widest shadow-sm backdrop-blur-sm transition hover:border-amber-400 hover:bg-amber-100/50 active:scale-95"
              >
                <Plus size={14} strokeWidth={3} />
                Navbatdan tashqari ish qo&apos;shish
              </button>
            </div>
          )}
        </div>
      )}
      {formMessage && (
        <div className={`rounded-2xl border p-4 text-center text-sm font-bold backdrop-blur-sm ${formMessage.type === 'success' ? 'border-emerald-200/60 bg-emerald-50/80 text-emerald-600' : 'border-red-200/60 bg-red-50/80 text-red-600'}`}>{formMessage.text}</div>
      )}
      <div className="flex gap-2 sm:gap-4 items-stretch justify-center max-w-2xl mx-auto">
        <button onClick={handleDownloadPDF}
          className={`rounded-xl sm:rounded-2xl border border-slate-200/60 bg-white/80 px-4 sm:px-6 py-2.5 sm:py-5 text-[12px] sm:text-base font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm backdrop-blur-sm whitespace-nowrap ${(!isConfirmed && canEditPlan) ? 'min-w-[70px]' : 'flex-1'}`}>
          <Download className="w-3.5 h-3.5 sm:w-6 sm:h-6" /> <span className="hidden sm:inline">Yuklab olish</span><span className="sm:hidden">Yuklash</span>
        </button>
        {(!isConfirmed && canEditPlan) && (
          <button onClick={handleSubmit} disabled={submitting} className="btn-gradient flex-1 py-2.5 sm:py-5 text-[13px] sm:text-lg font-black uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all">{submitting ? 'Kut...' : 'YUBORISH'}</button>
        )}
      </div>

      <TaskSelectionModal
        modalOpen={modalOpen}
        modalType={modalType}
        onClose={() => setModalOpen(false)}
        taskMappings={stationTaskMappings}
        onSelect={(task, text) => {
          const newEntries = [...entries]
          const row = { ...newEntries[modalIdx] }

          if (row.isNavbatdanTashqari) {
            row.yangiIshlar = text
            if (task.jurnal) row.jurnalYangi = task.jurnal
          } else if (modalType === '4-haftalik') {
            row.haftalikJadval = text
            if (task.jurnal) row.jurnalHaftalik = task.jurnal
          } else {
            row.yillikJadval = text
            if (task.jurnal) row.jurnalYillik = task.jurnal
          }

          newEntries[modalIdx] = row
          setEntries(newEntries)
          setHasUnsavedChanges(true)

          setTimeout(() => {
            setModalOpen(false)
          }, 10)
        }}
      />

      {completionIdx !== null && reportId !== null && (
        <TaskCompletionModal
          entry={entries[completionIdx]}
          entryIndex={completionIdx}
          reportId={reportId}
          session={session}
          stationId={stationId}
          stationName={stationName}
          journalMonth={monthStr}
          onComplete={(taskType) => confirmBajarildi(completionIdx, taskType)}
          onScanProgress={(newScans, taskType) => {
            const newEntries = [...entries];
            const e = { ...newEntries[completionIdx] };
            const field = `scans${taskType.charAt(0).toUpperCase() + taskType.slice(1)}` as keyof ReportEntry;
            (e as any)[field] = newScans;
            newEntries[completionIdx] = e;
            setEntries(newEntries);
            setHasUnsavedChanges(true);
          }}
          onJournalVisited={(taskType, journalName) => {
            const newEntries = [...entries];
            const e = { ...newEntries[completionIdx] };
            const field = `visitedJournals${taskType.charAt(0).toUpperCase() + taskType.slice(1)}` as keyof ReportEntry;
            const current = ((e as any)[field] as string[] | undefined) || [];
            if (!current.includes(journalName)) {
              (e as any)[field] = [...current, journalName];
              newEntries[completionIdx] = e;
              setEntries(newEntries);
              setHasUnsavedChanges(true);
            }
          }}
          onClose={() => setCompletionIdx(null)}
          preloadedStationEq={stationEq}
        />
      )}

      {navbatdanTashqariModalDay !== null && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 p-4 transition-all">
          <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 bg-slate-50/80">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Navbatdan tashqari ish qo&apos;shish</h3>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{navbatdanTashqariModalDay}-{MONTHS[month]} uchun</p>
              </div>
              <button onClick={() => setNavbatdanTashqariModalDay(null)} className="rounded-xl border border-slate-200/60 bg-white p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Tasdiqlangan grafiklardan tanlash</label>
                <button
                  onClick={() => {
                    let targetIdx = navbatdanTashqariModalIndex;
                    if (targetIdx === null) {
                      targetIdx = entries.length;
                      setEntries(prev => [...prev, { ragat: String(navbatdanTashqariModalDay), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: '', bajarildiImzo: '', adImzosi: '', isNavbatdanTashqari: true }]);
                    }
                    setNavbatdanTashqariModalDay(null);
                    setNavbatdanTashqariModalIndex(null);
                    const finalIdx = targetIdx;
                    setTimeout(() => openSelectModal(finalIdx, '4-haftalik'), 0);
                  }}
                  className="w-full flex items-center justify-between rounded-2xl border border-purple-200 bg-purple-50 p-4 transition-all hover:border-purple-300 hover:bg-purple-100 active:scale-[0.98] group"
                >
                  <span className="font-bold text-purple-700">4-haftalik jadvaldan tanlash</span>
                  <ArrowRight size={16} className="text-purple-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => {
                    let targetIdx = navbatdanTashqariModalIndex;
                    if (targetIdx === null) {
                      targetIdx = entries.length;
                      setEntries(prev => [...prev, { ragat: String(navbatdanTashqariModalDay), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: '', bajarildiImzo: '', adImzosi: '', isNavbatdanTashqari: true }]);
                    }
                    setNavbatdanTashqariModalDay(null);
                    setNavbatdanTashqariModalIndex(null);
                    const finalIdx = targetIdx;
                    setTimeout(() => openSelectModal(finalIdx, 'yillik'), 0);
                  }}
                  className="w-full flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 p-4 transition-all hover:border-blue-300 hover:bg-blue-100 active:scale-[0.98] group"
                >
                  <span className="font-bold text-blue-700">Yillik jadvaldan tanlash</span>
                  <ArrowRight size={16} className="text-blue-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] font-black uppercase text-slate-400">Yoki qo&apos;lda kiritish</span></div>
              </div>

              <div>
                <textarea value={navbatdanTashqariText} onChange={e => setNavbatdanTashqariText(e.target.value)} placeholder="Yangi ishni kiriting..." rows={3} className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 resize-none" />
                <button onClick={() => addNavbatdanTashqari(navbatdanTashqariModalDay, navbatdanTashqariText)} disabled={!navbatdanTashqariText.trim()} className="mt-3 w-full rounded-2xl bg-amber-500 px-4 py-4 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100">
                  Qo&apos;shish va Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {deleteConfirmIdx !== null && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 p-4 transition-all">
          <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-red-200/60 bg-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-red-100 bg-red-50/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-500"><AlertTriangle size={20} strokeWidth={2.5} /></div>
                <h3 className="text-base font-black text-red-900 tracking-tight">O&apos;chirishni tasdiqlash</h3>
              </div>
              <button onClick={() => setDeleteConfirmIdx(null)} className="rounded-xl border border-red-200/60 bg-white p-2 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"><X size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-slate-700 text-center leading-relaxed mb-6">Haqiqatan ham ushbu navbatdan tashqari ishni butunlay o&apos;chirmoqchimisiz?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmIdx(null)} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]">
                  Bekor qilish
                </button>
                <button onClick={executeDeleteNavbatdanTashqari} className="flex-1 rounded-2xl bg-red-500 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-red-500/20 transition-all hover:bg-red-600 active:scale-[0.98]">
                  O&apos;chirish
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  )
}
