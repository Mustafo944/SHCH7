/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Download, X, CheckCircle2, Clock, Map as MapIcon, Plus, ChevronLeft, BookOpen, ArrowRight, AlertTriangle, FileText } from 'lucide-react'
import { getGlobalGraphics, getSchemasByStation, upsertReport, updateReportEntries } from '@/lib/supabase-db'
import type { User, WorkReport, ReportEntry, StationSchema } from '@/types'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { YILLIK_REJA, TORT_HAFTALIK_REJA, YILLIK_REJA_FLAT, TORT_HAFTALIK_REJA_FLAT, type ParsedTaskItem } from '@/lib/reja-data'
import { MONTHS } from '@/lib/constants'
import { DU46JournalView, SHU2JournalView, YerlatgichJournalView, AlsnKodJournalView, MpsFriksionJournalView } from '@/components/JournalView'

const LocalTextarea = ({ value, onChange, readOnly, className, rows, spellCheck, lang }: any) => {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])
  return (
    <textarea
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== value) onChange(val) }}
      readOnly={readOnly}
      className={className}
      rows={rows}
      spellCheck={spellCheck}
      lang={lang}
    />
  )
}

const LocalInput = ({ value, onChange, readOnly, className, placeholder }: any) => {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])
  return (
    <input
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== value) onChange(val) }}
      readOnly={readOnly}
      className={className}
      placeholder={placeholder}
    />
  )
}

const TOTAL_ROWS = 14

export function BigActionCard({ title, desc, icon, onClick, color = 'cyan', badge = 0 }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void, color?: 'purple' | 'cyan' | 'amber' | 'blue' | 'sky', badge?: number }) {
  const colorStyles: Record<string, { bg: string, text: string }> = {
    purple: { bg: 'bg-purple-50', text: 'text-indigo-600' },
    cyan: { bg: 'bg-cyan-50', text: 'text-indigo-600' },
    amber: { bg: 'bg-amber-50', text: 'text-indigo-600' },
    blue: { bg: 'bg-blue-50', text: 'text-indigo-600' },
    sky: { bg: 'bg-sky-50', text: 'text-indigo-600' },
  }

  const theme = colorStyles[color] || colorStyles.purple

  return (
    <button 
      onClick={onClick} 
      className="group relative flex flex-col items-start p-6 bg-white/30 backdrop-blur-[40px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.07)] transition-all hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(31,38,135,0.15)] hover:border-white/80 hover:-translate-y-1 active:scale-[0.98] text-left w-full h-full min-h-[140px] overflow-hidden"
    >
      {/* Glossy reflection line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 z-20"></div>

      {badge > 0 && (
        <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[11px] font-black text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] z-30">
          {badge > 9 ? '9+' : badge}
        </div>
      )}

      <div className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/90 to-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white/60 mb-4 transition-transform group-hover:scale-110 group-hover:shadow-[0_8px_24px_rgba(79,70,229,0.2)] ${theme.text} group-hover:text-indigo-700`}>
        {icon}
      </div>

      <h3 className="relative z-10 text-[15px] sm:text-lg font-black text-slate-800 tracking-tight group-hover:text-indigo-900">{title}</h3>
      <p className="relative z-10 mt-1 text-[11px] sm:text-sm text-slate-600 leading-relaxed font-medium line-clamp-2 pr-6">
        {desc}
      </p>

      <div className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/50 text-indigo-400 transition-all group-hover:bg-indigo-500 group-hover:text-white border border-white/60 shadow-sm z-10 shrink-0">
        <ArrowRight size={18} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform duration-300" />
      </div>
    </button>
  )
}

export function HeaderCard({ title, subtitle, status, statusColor }: { title: string, subtitle: string, status?: string, statusColor?: string }) {
  const statusColors: Record<string, string> = {
    tasdiqlandi: 'badge-success',
    kutilmoqda: 'badge-warning',
    yangi: 'badge-info',
    "ko'rish": 'badge-info',
    "error": 'bg-red-100 text-red-600 border-red-200 border shadow-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest'
  }
  return (
    <div className="rounded-[32px] bg-white/30 backdrop-blur-[40px] p-6 sm:p-8 shadow-[0_8px_32px_rgba(31,38,135,0.05)] border border-white/60 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80"></div>
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between relative z-10">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-900 tracking-tight">{title}</h2>
          <p className="mt-1 text-xs sm:text-sm font-black text-indigo-600/80 uppercase tracking-widest">{subtitle}</p>
        </div>
        {status && (
          <div className={`${statusColor && statusColors[statusColor] ? statusColors[statusColor] : statusColors[status.toLowerCase()] || 'badge'}`}>{status}</div>
        )}
      </div>
    </div>
  )
}

const MemoizedJournalRow = React.memo(({ 
  e, 
  i, 
  isConfirmed, 
  canEditPlan, 
  updateEntry, 
  openSelectModal, 
  handleBajarishClick, 
  submitting 
}: {
  e: ReportEntry;
  i: number;
  isConfirmed: boolean;
  canEditPlan: boolean;
  updateEntry: (index: number, field: keyof ReportEntry, value: string) => void;
  openSelectModal: (index: number, type: '4-haftalik' | 'yillik') => void;
  handleBajarishClick: (index: number) => void;
  submitting: boolean;
}) => {
  return (
    <tr className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="border-r border-slate-100 p-1 align-top">
        <LocalInput
          value={e.ragat}
          readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
          onChange={(val: string) => updateEntry(i, 'ragat', val)}
          className={`w-full rounded bg-transparent text-center font-bold text-purple-600 outline-none focus:bg-white ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-40' : ''}`}
        />
      </td>
      <td className="relative border-r border-slate-100 p-1 align-top">
        <div className="relative">
          <LocalTextarea
            value={e.haftalikJadval}
            readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
            onChange={(val: string) => updateEntry(i, 'haftalikJadval', val)}
            className={`min-h-[60px] w-full resize-none rounded border bg-slate-50 px-2 py-1.5 text-[11px] outline-none focus:border-purple-500/50 shadow-inner ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-60 cursor-not-allowed border-transparent' : 'border-slate-100'}`}
          />
          {e.doneHaftalik && (
            <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm ${e.completedAfterMissedDateHaftalik ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Bajarildi">
              <CheckCircle2 size={12} />
            </div>
          )}
        </div>
        {(!e.adImzosi && !isConfirmed && canEditPlan) && (
          <button
            type="button"
            onClick={() => openSelectModal(i, '4-haftalik')}
            className="absolute bottom-2 right-2 rounded bg-purple-100 p-1 text-purple-600 shadow-sm transition hover:bg-purple-600 hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}
      </td>
      <td className="relative border-r border-slate-100 p-1 align-top">
        <div className="relative">
          <LocalTextarea
            value={e.yillikJadval}
            readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
            onChange={(val: string) => updateEntry(i, 'yillikJadval', val)}
            className={`min-h-[60px] w-full resize-none rounded border bg-slate-50 px-2 py-1.5 text-[11px] outline-none focus:border-purple-500/50 shadow-inner ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-60 cursor-not-allowed border-transparent' : 'border-slate-100'}`}
          />
          {e.doneYillik && (
            <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm ${e.completedAfterMissedDateYillik ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Bajarildi">
              <CheckCircle2 size={12} />
            </div>
          )}
        </div>
        {(!e.adImzosi && !isConfirmed && canEditPlan) && (
          <button
            type="button"
            onClick={() => openSelectModal(i, 'yillik')}
            className="absolute bottom-2 right-2 rounded bg-purple-100 p-1 text-purple-600 shadow-sm transition hover:bg-purple-600 hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}
      </td>
      <td className="relative border-r border-slate-100 p-1 align-top">
        <div className="relative h-full">
          <LocalTextarea
            value={e.yangiIshlar}
            readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
            onChange={(val: string) => updateEntry(i, 'yangiIshlar', val)}
            className={`min-h-[60px] w-full h-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-purple-500/50 ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {e.doneYangi && (
            <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm ${e.completedAfterMissedDateYangi ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Bajarildi">
              <CheckCircle2 size={12} />
            </div>
          )}
        </div>
      </td>
      <td className="relative border-r border-slate-100 p-1 align-top">
        <div className="relative h-full">
          <LocalTextarea
            value={e.kmoBartaraf}
            readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
            onChange={(val: string) => updateEntry(i, 'kmoBartaraf', val)}
            className={`min-h-[60px] w-full h-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-purple-500/50 ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {e.doneKmo && (
            <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm ${e.completedAfterMissedDateKmo ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Bajarildi">
              <CheckCircle2 size={12} />
            </div>
          )}
        </div>
      </td>
      <td className="relative border-r border-slate-100 p-1 align-top">
        <div className="relative h-full">
          <LocalTextarea
            value={e.majburiyOzgarish}
            readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
            onChange={(val: string) => updateEntry(i, 'majburiyOzgarish', val)}
            className={`min-h-[60px] w-full h-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-purple-500/50 ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {e.doneMajburiy && (
            <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm ${e.completedAfterMissedDateMajburiy ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Bajarildi">
              <CheckCircle2 size={12} />
            </div>
          )}
        </div>
      </td>
      <td className="border-r border-slate-100 p-2 text-center align-middle font-medium text-purple-600">
        {e.bajarildiShn}
      </td>
      <td className="border-r border-slate-100 p-2 text-center align-middle italic text-slate-400">
        {e.bajarildiImzo}
      </td>
      <td className="p-2 text-center align-middle">
        {(() => {
            const isLate = !!(e.completedAfterMissedDateHaftalik || e.completedAfterMissedDateYillik || e.completedAfterMissedDateYangi || e.completedAfterMissedDateKmo || e.completedAfterMissedDateMajburiy)
            const lateDateStr = e.completedAfterMissedDateHaftalik || e.completedAfterMissedDateYillik || e.completedAfterMissedDateYangi || e.completedAfterMissedDateKmo || e.completedAfterMissedDateMajburiy
            let formattedLateDate = ''
            if (lateDateStr) {
               const d = new Date(lateDateStr)
               formattedLateDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
            }

            if (e.adImzosi) {
              return (
                <div className="flex flex-col items-center gap-1">
                  <span className={`inline-flex items-center gap-1 whitespace-pre-wrap rounded-md px-2 py-1 text-[10px] font-bold border ${isLate ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    <CheckCircle2 size={12} /> {e.adImzosi}
                  </span>
                  {isLate && formattedLateDate && (
                    <span className="text-[9px] font-bold text-orange-500">{formattedLateDate} da bajarildi</span>
                  )}
                </div>
              )
            }

            if (isConfirmed) {
              const hasHaftalik = !!e.haftalikJadval && !e.doneHaftalik
              const hasYillik = !!e.yillikJadval && !e.doneYillik
              const hasYangi = !!e.yangiIshlar && !e.doneYangi
              const hasKmo = !!e.kmoBartaraf && !e.doneKmo
              const hasMajburiy = !!e.majburiyOzgarish && !e.doneMajburiy

              const needsAction = hasHaftalik || hasYillik || hasYangi || hasKmo || hasMajburiy

              if (needsAction) {
                return (
                  <button
                    onClick={() => handleBajarishClick(i)}
                    disabled={submitting}
                    className="rounded-lg bg-purple-500 px-3 py-1.5 text-[10px] font-black text-white shadow-sm hover:bg-purple-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Bajarish
                  </button>
                )
              }
              return null
            }

            return <span className="text-[10px] text-slate-300 italic">Kutilmoqda...</span>
        })()}
      </td>
    </tr>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.e === nextProps.e &&
    prevProps.isConfirmed === nextProps.isConfirmed &&
    prevProps.canEditPlan === nextProps.canEditPlan &&
    prevProps.submitting === nextProps.submitting
  )
})
MemoizedJournalRow.displayName = 'MemoizedJournalRow'

export function JournalForm({ session, stationId, stationName, month, reports, onSubmit, onCancel }: { session: User, stationId: string, stationName: string, month: number, reports: WorkReport[], onSubmit: () => void, onCancel: () => void }) {
  const [entries, setEntries] = useState<ReportEntry[]>(Array.from({ length: TOTAL_ROWS }, (_, i) => ({
    ragat: String(i + 1), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: '', bajarildiImzo: '', adImzosi: ''
  })))
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'4-haftalik' | 'yillik'>('4-haftalik')
  const [modalIdx, setModalIdx] = useState(0)
  const [modalSearch, setModalSearch] = useState('')
  const [selectedBolim, setSelectedBolim] = useState<number | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [reportId, setReportId] = useState<string | null>(null)
  const [completionIdx, setCompletionIdx] = useState<number | null>(null)
  const monthStr = `${new Date().getFullYear()}-${String(month + 1).padStart(2, '0')}`
  const draftReport = useMemo(() => reports.find(r => r.month === monthStr && r.stationId === stationId), [reports, monthStr, stationId])
  const canEditPlan = session.position === 'katta_elektromexanik'

  useEffect(() => {
    const draft = draftReport
    if (draft) {
      setEntries(draft.entries)
      setIsConfirmed(!!draft.confirmedAt)
      setReportId(draft.id)
    } else {
      setEntries(Array.from({ length: TOTAL_ROWS }, (_, i) => ({
        ragat: String(i + 1), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: '', bajarildiImzo: '', adImzosi: ''
      })))
      setIsConfirmed(false)
      setReportId(null)
    }
  }, [draftReport])

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
  
  const openSelectModal = useCallback((idx: number, type: '4-haftalik' | 'yillik') => {
    setModalIdx(idx)
    setModalType(type)
    setModalSearch('')
    setSelectedBolim(null)
    setModalOpen(true)
  }, [])

  const updateEntry = useCallback((index: number, field: keyof ReportEntry, value: string) => {
    setEntries(prev => {
      const n = [...prev]
      n[index] = { ...n[index], [field]: value }
      return n
    })
  }, [])



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
          weekLabel: 'Oylik Reja'
        })
        onSubmit()
        return
      } catch (err: unknown) {
        lastErr = err
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }
    const msg = lastErr instanceof Error ? lastErr.message : 'Xatolik'
    setFormMessage({ type: 'error', text: msg.includes('fetch') ? 'Internet bilan muammo. Qayta urinildi, ammo muvaffaqiyatsiz. Iltimos sahifani yangilang.' : msg })
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
    const newEntries = [...entries]
    const entry = newEntries[idx]

    // Agar taskType berilgan bo'lsa, faqat o'shani bajaramiz
    if (taskType === 'haftalik') entry.doneHaftalik = true
    if (taskType === 'yillik') entry.doneYillik = true
    if (taskType === 'yangi') entry.doneYangi = true
    if (taskType === 'kmo') entry.doneKmo = true
    if (taskType === 'majburiy') entry.doneMajburiy = true

    const ragatNum = parseInt(entry.ragat)
    if (!isNaN(ragatNum)) {
      const ragatDate = new Date(new Date().getFullYear(), month, ragatNum)
      // 5 kundan o'tib ketgan bo'lsa
      if (Date.now() > ragatDate.getTime() + 5 * 24 * 60 * 60 * 1000) {
        if (taskType === 'haftalik') entry.completedAfterMissedDateHaftalik = new Date().toISOString()
        if (taskType === 'yillik') entry.completedAfterMissedDateYillik = new Date().toISOString()
        if (taskType === 'yangi') entry.completedAfterMissedDateYangi = new Date().toISOString()
        if (taskType === 'kmo') entry.completedAfterMissedDateKmo = new Date().toISOString()
        if (taskType === 'majburiy') entry.completedAfterMissedDateMajburiy = new Date().toISOString()
      }
    }

    // Hamma mavjud ishlar bajarilganligini tekshiramiz
    const needsHaftalik = !!entry.haftalikJadval && !entry.doneHaftalik
    const needsYillik = !!entry.yillikJadval && !entry.doneYillik
    const needsYangi = !!entry.yangiIshlar && !entry.doneYangi
    const needsKmo = !!entry.kmoBartaraf && !entry.doneKmo
    const needsMajburiy = !!entry.majburiyOzgarish && !entry.doneMajburiy

    const allDone = !needsHaftalik && !needsYillik && !needsYangi && !needsKmo && !needsMajburiy

    if (allDone) {
      entry.bajarildiShn = session.fullName
      entry.bajarildiImzo = session.fullName
      entry.adImzosi = session.fullName
    }

    setEntries(newEntries)
    setCompletionIdx(null)

    setSubmitting(true)
    try {
      await updateReportEntries(reportId, newEntries)
      setFormMessage({ type: 'success', text: 'Muvaffaqiyatli saqlandi!' })
      setTimeout(() => setFormMessage(null), 3000)
    } catch (err: unknown) {
      // Rollback: eski holatga qaytarish
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
    doc.text(`${MONTHS[month]} В· ${session.fullName}`, 14, 22)

    const cols = ['в„–', '4-haftalik jadval', 'Yillik jadval', 'Yangi ishlar', 'KMO bartaraf', "Majburiy o'zgartirish", 'Shn', 'Imzo', 'AD']
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

  if (!canEditPlan && !draftReport) {
    return (
      <div className="space-y-6 animate-fade-up">
        <HeaderCard title="Jurnal To'ldirish" subtitle={`${MONTHS[month]} · ${stationName}`} />
        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-12 text-center shadow-sm backdrop-blur-sm">
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Oylik ish reja hali tuzilmagan</h3>
          <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">Ushbu bekat va oy uchun oylik ish reja Katta elektromexanik tomonidan hali tizimga kiritilmagan. Iltimos kuting.</p>
          <button onClick={onCancel} className="rounded-2xl bg-white border border-slate-200/60 px-10 py-3 font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm backdrop-blur-sm">Orqaga qaytish</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard 
        title="Jurnal To'ldirish" 
        subtitle={`${MONTHS[month]} · ${stationName}`} 
        status={headerError || ""} 
        statusColor={headerError ? "error" : "default"}
      />
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm relative shadow-sm">
        <div className="sm:hidden absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-2 py-1 z-10 rounded-bl-lg font-bold">
          O'ngga suring →
        </div>
        <div className="overflow-x-auto overflow-y-hidden">
          <table style={{ minWidth: "1200px" }} className="w-full border-collapse text-left text-[11px] text-slate-700">
            <thead className="border-b-2 border-purple-500/30 bg-slate-50 font-bold text-slate-600">
              <tr>
                <th rowSpan={2} className="w-10 border-r border-slate-200 p-2 text-center">№</th>
                <th rowSpan={2} className="w-[18%] border-r border-slate-200 p-2 text-center">
                  4-haftalik jadval
                  <br />
                  <span className="text-[9px] font-normal text-slate-400">(oynada tanlash)</span>
                </th>
                <th rowSpan={2} className="w-[18%] border-r border-slate-200 p-2 text-center">
                  Yillik jadval bo'yicha
                  <br />
                  <span className="text-[9px] font-normal text-slate-400">(oynada tanlash)</span>
                </th>
                <th rowSpan={2} className="w-[14%] border-r border-slate-200 p-2">Yangi ishlar ro'yxati</th>
                <th rowSpan={2} className="w-[14%] border-r border-slate-200 p-2">O'tkazilgan KMO va bartaraf etilgan kamchiliklar</th>
                <th rowSpan={2} className="w-[13%] border-r border-slate-200 p-2">Rejaga kiritilgan majburiy o'zgartirishlar</th>
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
                  handleBajarishClick={handleBajarishClick}
                  submitting={submitting}
                />
              ))}
            </tbody>
          </table>
        </div>
        {(!isConfirmed && canEditPlan) && (
          <div className="flex items-center gap-3 border-t border-slate-200/60 bg-slate-50/50 p-4">
            <button
              onClick={addRow}
              className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-slate-100"
            >
              <Plus size={14} />
              Qator qo'shish
            </button>
            <button
              onClick={removeRow}
              className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-400 backdrop-blur-sm transition hover:border-red-200 hover:text-red-500"
            >
              <X size={14} />
              Qator o'chirish
            </button>
          </div>
        )}
      </div>
      {formMessage && (
        <div className={`rounded-2xl border p-4 text-center text-sm font-bold backdrop-blur-sm ${formMessage.type === 'success' ? 'border-emerald-200/60 bg-emerald-50/80 text-emerald-600' : 'border-red-200/60 bg-red-50/80 text-red-600'}`}>{formMessage.text}</div>
      )}
      <div className="flex gap-2 sm:gap-4 items-stretch">
        <button onClick={handleDownloadPDF}
          className="rounded-xl sm:rounded-2xl border border-slate-200/60 bg-white/80 px-2 sm:px-6 py-2.5 sm:py-5 text-[10px] sm:text-base font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center gap-1 sm:gap-2 shadow-sm backdrop-blur-sm whitespace-nowrap min-w-[70px]">
          <Download className="w-3.5 h-3.5 sm:w-6 sm:h-6" /> <span className="hidden sm:inline">Yuklab olish</span><span className="sm:hidden">Yuklash</span>
        </button>
        {(!isConfirmed && canEditPlan) && (
          <button onClick={handleSubmit} disabled={submitting} className="btn-gradient flex-1 py-2.5 sm:py-5 text-[13px] sm:text-lg font-black uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all">{submitting ? 'Kut...' : 'YUBORISH'}</button>
        )}
        <button onClick={onCancel} className="rounded-xl sm:rounded-2xl bg-white/80 border border-slate-200/60 px-2 sm:px-10 py-2.5 sm:py-5 text-[10px] sm:text-base font-bold text-slate-400 hover:text-slate-900 transition flex items-center justify-center shadow-sm backdrop-blur-sm whitespace-nowrap min-w-[70px]">
          {isConfirmed ? 'Orqaga' : 'Bekor qilish'}
        </button>
      </div>

      {modalOpen && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md transition-all">
          <div className="relative flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200/60 px-8 py-5 bg-slate-50/80">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {modalType === '4-haftalik' ? '4-haftalik jadval' : 'Yillik jadval'} — vazifa tanlash
              </h3>
              <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200/60 bg-white p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={20} /></button>
            </div>
            <div className="border-b border-slate-100 px-8 py-4 bg-white">
              <input
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                placeholder="Vazifa qidirish..."
                className="input-premium"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50/30">
              {selectedBolim === null && !modalSearch ? (
                <div className="grid grid-cols-1 gap-3">
                  {(modalType === 'yillik' ? YILLIK_REJA : TORT_HAFTALIK_REJA).map((b, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedBolim(idx)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 p-5 text-left backdrop-blur-sm transition-all hover:border-purple-300 hover:shadow-md hover:bg-purple-50/30 group"
                    >
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
                        <ChevronLeft size={14} /> Ortga ro'yxatga
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
                    .map((task: ParsedTaskItem, ti: number) => (
                      <button
                        key={ti}
                        onClick={async () => {
                          const text =
                            `[${task.manba}${task.raqam ? ` ${task.raqam}` : ''}] ${task.ish}\n` +
                            `Davriyligi: ${task.davriylik}\n` +
                            `Bajaruvchi: ${task.bajaruvchi}` +
                            (task.jurnal ? `\nJurnal: ${task.jurnal}` : '')

                          const newEntries = [...entries]
                          const row = { ...newEntries[modalIdx] }
                          
                          if (modalType === '4-haftalik') {
                            row.haftalikJadval = text
                            if (task.jurnal) row.jurnalHaftalik = task.jurnal
                          } else {
                            row.yillikJadval = text
                            if (task.jurnal) row.jurnalYillik = task.jurnal
                          }
                          
                          newEntries[modalIdx] = row
                          setEntries(newEntries)

                          // Modal yopilishini ozgina kechiktiramiz (UI qotmasligi uchun)
                          setTimeout(() => {
                            setModalOpen(false)
                            setSelectedBolim(null)
                          }, 10)

                          // Avtomatik saqlash
                          try {
                            await upsertReport({
                              id: reportId || undefined,
                              workerId: draftReport?.workerId || session.id,
                              workerName: draftReport?.workerName || session.fullName,
                              workerPhone: draftReport?.workerPhone || session.phone || '',
                              stationId, 
                              stationName, 
                              entries: newEntries, 
                              month: monthStr, 
                              year: String(new Date().getFullYear()), 
                              weekLabel: 'Draft Oylik Reja'
                            })
                          } catch (e) {
                            console.error('Auto-save failed:', e)
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200/60 bg-white/80 p-3 text-left backdrop-blur-sm transition-all hover:border-purple-300 hover:shadow-md hover:bg-purple-50/30 group"
                      >
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <p className="text-[10px] text-purple-600">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400 mr-0.5" /> {task.bolim}
                          </p>
                          <p className="text-[10px] text-amber-600/70">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 mr-0.5" /> {task.manba} {task.raqam}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            <Clock size={10} className="inline mr-0.5" /> {task.davriylik}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 mr-0.5" /> {task.bajaruvchi}
                          </p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs font-bold text-slate-700 group-hover:text-slate-900">
                          {task.ish}
                        </p>
                        {task.jurnal && (
                          <div className="mt-2 inline-block rounded-md bg-purple-50/80 px-2 py-1 text-[9px] uppercase tracking-widest text-purple-600 border border-purple-100/60">
                            Jurnal: {task.jurnal}
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {completionIdx !== null && entries[completionIdx] && (
        <TaskCompletionModal
          entry={entries[completionIdx]}
          entryIndex={completionIdx}
          session={session}
          stationId={stationId}
          stationName={stationName}
          journalMonth={monthStr}
          onComplete={(taskType) => confirmBajarildi(completionIdx, taskType)}
          onClose={() => setCompletionIdx(null)}
        />
      )}
    </div>
  )
}


function GrafikCard({
  title,
  file,
  onPreview,
}: {
  title: string
  file?: StationSchema
  onPreview: (filePath: string) => void
}) {
  return (
    <div className="group relative overflow-hidden rounded-[32px] bg-white/30 p-6 backdrop-blur-[40px] border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.05)] transition-all hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(31,38,135,0.15)] hover:border-white/80">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 z-20"></div>
      <div className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/90 to-white/50 text-indigo-600 transition-transform duration-300 group-hover:scale-110 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white/60">
        <Download size={24} />
      </div>

      <h4 className="relative z-10 font-black text-slate-800 tracking-tight text-lg group-hover:text-indigo-900">{title}</h4>
      <p className="relative z-10 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        {file ? file.fileName : 'Fayl joylanmagan'}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-2">
        <button
          onClick={() => file && onPreview(file.filePath)}
          disabled={!file}
          className="rounded-xl bg-slate-50/80 border border-slate-100 py-3 text-[10px] font-black uppercase text-slate-500 hover:bg-purple-600 hover:text-white backdrop-blur-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95"
        >
          Ko'rish
        </button>
        <a
          href={file?.filePath || '#'}
          download
          target="_blank"
          rel="noreferrer"
          className={`flex items-center justify-center rounded-xl border border-slate-100 py-3 text-[10px] font-black uppercase backdrop-blur-sm transition-all shadow-sm active:scale-95 ${file ? 'bg-slate-50/80 text-slate-500 hover:bg-slate-900 hover:text-white' : 'pointer-events-none opacity-40 text-slate-300 bg-slate-50/80'
            }`}
        >
          Yuklash
        </a>
      </div>
    </div>
  )
}

export function WorkerGraphicsView() {
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200/60 bg-white/80 backdrop-blur-sm text-slate-300 font-bold uppercase tracking-widest">
        Yuklanmoqda...
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Grafiklar" subtitle="Umumiy ish reja grafiklari" />

      <div className="grid gap-4 sm:grid-cols-2">
        <GrafikCard title="Yillik ish reja grafigi" file={yillik} onPreview={setPreview} />
        <GrafikCard title="4-haftalik ish reja grafigi" file={haftalik} onPreview={setPreview} />
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md transition-all">
          <div className="h-full w-full overflow-hidden rounded-none border border-slate-200/60 bg-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-3 bg-slate-50/80">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Grafik ko'rish</h3>
              <div className="flex items-center gap-3">
                <a
                  href={preview}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-gradient rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  Yuklab olish
                </a>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-xl border border-slate-200/60 bg-white/80 p-2 text-slate-400 hover:text-slate-900 backdrop-blur-sm transition-all shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <iframe src={preview} className="h-[calc(100%-64px)] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}
export function WorkerSchemasView({ stationId, stationName }: { stationId: string, stationName: string }) {
  const [schemas, setSchemasState] = useState<StationSchema[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (stationId) getSchemasByStation(stationId).then(setSchemasState)
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [stationId])

  // Firefox uchun blob URL orqali ko'rsatish
  const handlePreview = async (filePath: string) => {
    try {
      // Agar oldin blob URL bo'lsa, tozalash
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)

      const response = await fetch(filePath)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      setPreview(url)
    } catch {
      // Fallback: to'g'ridan-to'g'ri URL
      setPreview(filePath)
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Bekat Sxemalari" subtitle={stationName} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {schemas.map(s => (
          <div key={s.id} className="group relative overflow-hidden rounded-[32px] bg-white/30 p-8 backdrop-blur-[40px] border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.05)] transition-all hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(31,38,135,0.15)] hover:border-white/80">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 z-20"></div>
            <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white/90 to-white/50 text-indigo-600 transition-transform duration-300 group-hover:scale-110 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white/60"><MapIcon size={28} /></div>
            <h4 className="relative z-10 text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-900">{s.schemaType}</h4>
            <p className="relative z-10 mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{s.fileName}</p>
            <div className="relative z-10 mt-8 flex gap-3">
              <button onClick={() => handlePreview(s.filePath)} className="flex-1 rounded-2xl bg-white/50 border border-white/60 py-4 text-xs font-black uppercase text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 backdrop-blur-md transition-all active:scale-95 shadow-sm">Ko'rish</button>
              <a href={s.filePath} download className="rounded-2xl bg-white/50 border border-white/60 p-4 text-indigo-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 backdrop-blur-md transition-all shadow-sm active:scale-95"><Download size={20} /></a>
            </div>
          </div>
        ))}
        {schemas.length === 0 && <div className="col-span-full py-24 text-center text-slate-300 font-black uppercase tracking-[0.3em] bg-white/80 backdrop-blur-sm rounded-2xl border border-dashed border-slate-200/60">Hali sxemalar yuklanmagan</div>}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md transition-all">
          <div className="h-full w-full overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200/60 px-8 py-4 bg-slate-50/80">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Sxema Ko'rish</h3>
              <button onClick={() => { setPreview(null); if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null } }} className="rounded-xl border border-slate-200/60 bg-white/80 p-2 text-slate-400 hover:text-slate-900 backdrop-blur-sm transition-all shadow-sm"><X size={24} /></button>
            </div>
            <iframe src={preview} className="h-[calc(100%-80px)] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}

type WorkerTaskItem = { reportId: string, entry: ReportEntry, month: string, taskText?: string, type: 'haftalik'|'yillik'|'yangi'|'kmo'|'majburiy', reason?: string, completedDate?: string, done?: boolean }

export function WorkerTasksModal({ type, bugun, qolib, sababli, onClose, onTaskClick, onTasksUpdated, stationName }: {
  type: 'bugunBajarilgan' | 'qolibKetgan' | 'sababliBajarilmagan'
  bugun: WorkerTaskItem[]
  qolib: WorkerTaskItem[]
  sababli: WorkerTaskItem[]
  onClose: () => void
  onTaskClick?: (task: WorkerTaskItem) => void
  onTasksUpdated?: () => void
  stationName?: string
}) {
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
      const { data: report } = await supabase.from('work_reports').select('entries').eq('id', task.reportId).single()
      if (!report) return

      const newEntries = [...report.entries]
      const entryIndex = newEntries.findIndex((e: ReportEntry) => e.ragat === task.entry.ragat)
      if (entryIndex === -1) return

      updateFn(newEntries[entryIndex])

      await supabase.from('work_reports').update({ entries: newEntries }).eq('id', task.reportId)
      onTasksUpdated?.()
    } catch (err) {
      console.error('Update failed:', err)
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
      ;(entry as unknown as Record<string, string>)[field] = promptReason.trim()
      ;(entry as unknown as Record<string, string>)[dateField] = new Date().toISOString()
    })
  }


  const downloadPDF = () => {
    const doc = new jsPDF()
    
    // Roboto shriftini qoshamiz (yoki shunchaki standart shrift ishlatamiz)
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
      
      return [
        i + 1,
        dateFormatted ? String(dateFormatted) : '',
        t.taskText || '',
        t.reason || '',
        status
      ]
    })

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Sana', 'Ish nomi', 'Sabab (Izox)', 'Holati']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [249, 115, 22] }, // Orange-500
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 70 },
        3: { cellWidth: 55 },
        4: { cellWidth: 25 }
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
            <h3 className={`text-xl font-black tracking-tight ${titleColor}`}>
              {title}
            </h3>
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
                <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                  {promptTask?.taskText}
                </p>
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
              <div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  Bu ro'yxatda ishlar yo'q
                </p>
              </div>
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

                // Ranglar turi bo'yicha
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
                    className={`group/item flex flex-col sm:flex-row gap-4 border-b border-slate-100 last:border-0 px-6 py-5 transition-all ${isClickable ? 'cursor-pointer hover:bg-blue-50/30 active:scale-[0.99]' : 'hover:bg-slate-50/50'}`}
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
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-[12px] font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</p>
                        {task.done && type === 'bugunBajarilgan' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 rounded-lg shrink-0">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <span className="text-[10px] font-black uppercase text-emerald-700">Bajarilgan</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Agar sabab bo'lsa */}
                      {task.reason && (
                        <div className="mt-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100/50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-orange-800/50 mb-1">Ko'rsatilgan sabab:</p>
                          <p className="text-[11px] font-semibold text-orange-900 leading-relaxed">{task.reason}</p>
                        </div>
                      )}

                      {/* Agar keyin bajarilgan bo'lsa */}
                      {isCompletedAfter && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 rounded-md">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span className="text-[10px] font-black uppercase text-emerald-700">Kechikib bo'lsa ham bajarildi</span>
                        </div>
                      )}
                    </div>

                    {/* TUGMALAR (ACTIONS) */}
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
                      <div className="flex shrink-0 items-center justify-center pl-2 sm:pl-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-sm group-hover/item:bg-blue-500 group-hover/item:text-white transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
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

// ===== ISHNI BAJARISH MODALI =====
const SUPPORTED_JOURNALS: Record<string, 'du46' | 'shu2' | 'yerlatgich' | 'alsnKod' | 'mpsFriksion'> = {
  'SHU-2': 'shu2',
  'DU-46': 'du46',
  'yerlatgich': 'yerlatgich',
  'alsnKod': 'alsnKod',
  'mpsFriksion': 'mpsFriksion',
}

const JOURNAL_DISPLAY_NAMES: Record<string, string> = {
  'SHU-2': 'SHU-2 jurnali',
  'DU-46': 'DU-46 jurnali',
  'yerlatgich': 'Yerlatgich xabarlagichi jurnali (NSH-01 17.1.8)',
  'alsnKod': 'ALSN kodlarini o\'lchash',
  'mpsFriksion': 'MPS elektrodvigatellarni friksion tokini o\'lchash',
}

function TaskCompletionModal({ entry, entryIndex: _entryIndex, session, stationId, stationName, journalMonth, onComplete, onClose }: {
  entry: ReportEntry
  entryIndex: number
  session: User
  stationId: string
  stationName: string
  journalMonth: string
  onComplete: (taskType: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy') => void
  onClose: () => void
}) {
  const [activeJournal, setActiveJournal] = useState<'du46' | 'shu2' | 'yerlatgich' | 'alsnKod' | 'mpsFriksion' | null>(null)
  const [visitedJournals, setVisitedJournals] = useState<Set<string>>(new Set())
  const [selectedTaskType, setSelectedTaskType] = useState<'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy' | null>(null)

  // Matndan jurnal nomini ajratib olish (eski yozuvlar uchun fallback)
  const extractJurnal = (text: string): string => {
    const match = text.match(/Jurnal:\s*(.+)$/m)
    return match ? match[1].trim() : ''
  }

  // Mavjud va bajarilmagan ish turlarini aniqlash
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
  }, [availableTasks, selectedTaskType])

  const currentTask = useMemo(() => {
    return availableTasks.find(t => t.type === selectedTaskType)
  }, [availableTasks, selectedTaskType])

  const requiredJournals = useMemo(() => {
    if (!currentTask?.journals) return []
    return currentTask.journals.split(',').map(j => j.trim()).filter(Boolean)
  }, [currentTask])

  const supportedRequired = requiredJournals.filter(j => j in SUPPORTED_JOURNALS)
  const unsupportedRequired = requiredJournals.filter(j => !(j in SUPPORTED_JOURNALS))
  const allDone = selectedTaskType && (supportedRequired.length === 0 || supportedRequired.every(j => visitedJournals.has(j)))

  const handleJournalClose = (journalName: string, isDone = false) => {
    if (isDone) {
      setVisitedJournals(prev => new Set(prev).add(journalName))
    }
    setActiveJournal(null)
  }

  // DU-46 yoki SHU-2 to'liq ekran ko'rinishi (portal orqali body'ga render)
  if (activeJournal === 'du46') {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        <DU46JournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole={session.position || 'worker'} journalMonth={journalMonth} onClose={() => handleJournalClose('DU-46', false)} onAccepted={() => handleJournalClose('DU-46', true)} />
      </div>,
      document.body
    )
  }
  if (activeJournal === 'shu2') {
    const todayDate = new Date()
    const dateFormatted = `${String(todayDate.getDate()).padStart(2, '0')}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${todayDate.getFullYear()}`
    const firstLine = currentTask?.text.split('\n')[0] || ''
    const initialData = { text: firstLine, date: dateFormatted }

    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        <SHU2JournalView
          stationId={stationId}
          stationName={stationName}
          userName={session.fullName}
          userRole="worker"
          journalMonth={journalMonth}
          onClose={() => handleJournalClose('SHU-2', false)}
          onAccepted={() => handleJournalClose('SHU-2', true)}
          initialData={initialData}
        />
      </div>,
      document.body
    )
  }
  if (activeJournal === 'yerlatgich') {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        <YerlatgichJournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole="worker" journalMonth={journalMonth} onClose={() => handleJournalClose('yerlatgich', false)} onAccepted={() => handleJournalClose('yerlatgich', true)} />
      </div>,
      document.body
    )
  }
  if (activeJournal === 'alsnKod') {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        <AlsnKodJournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole="worker" journalMonth={journalMonth} onClose={() => handleJournalClose('alsnKod', false)} onAccepted={() => handleJournalClose('alsnKod', true)} />
      </div>,
      document.body
    )
  }
  if (activeJournal === 'mpsFriksion') {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        <MpsFriksionJournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole="worker" journalMonth={journalMonth} onClose={() => handleJournalClose('mpsFriksion', false)} onAccepted={() => handleJournalClose('mpsFriksion', true)} />
      </div>,
      document.body
    )
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
          /* Vazifani tanlash bosqichi */
          <div className="p-8 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Bajariladigan ishni tanlang:</p>
            {availableTasks.map(t => (
              <button
                key={t.type}
                onClick={() => setSelectedTaskType(t.type)}
                className="w-full text-left rounded-2xl border border-slate-200 p-5 hover:border-purple-500 hover:bg-purple-50 transition-all group"
              >
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
          /* Jurnallarni to'ldirish bosqichi */
          <>
            <div className="px-8 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">{currentTask?.label}</span>
                {availableTasks.length > 1 && (
                  <button onClick={() => { setSelectedTaskType(null); setVisitedJournals(new Set()) }} className="text-[10px] font-black text-slate-400 hover:text-purple-600 underline">Ortga</button>
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
                return (
                  <button
                    key={name}
                    onClick={() => setActiveJournal(SUPPORTED_JOURNALS[name])}
                    className={`w-full flex items-center justify-between rounded-2xl border p-5 transition-all active:scale-[0.98] ${isDone
                      ? 'border-emerald-200 bg-emerald-50/80'
                      : 'border-purple-200 bg-purple-50/50 hover:bg-purple-100 hover:border-purple-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'}`}>
                        {isDone ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-black text-slate-900">{JOURNAL_DISPLAY_NAMES[name] || name}</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: isDone ? '#059669' : '#0284c7' }}>
                          {isDone ? 'Yozuv kiritildi' : 'Yozuv kiritish →'}
                        </p>
                      </div>
                    </div>
                    {isDone && <CheckCircle2 size={20} className="text-emerald-500" />}
                  </button>
                )
              })}

              {unsupportedRequired.map(name => (
                <div key={name} className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <BookOpen size={20} />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-black text-slate-700">{JOURNAL_DISPLAY_NAMES[name] || name}</span>
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Yaqin kunlarda</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-[10px] font-black text-amber-600">Yaqinda</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-5 flex gap-3">
              <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all shadow-sm">
                Bekor qilish
              </button>
              <button
                onClick={() => selectedTaskType && onComplete(selectedTaskType)}
                disabled={!allDone}
                className="flex-1 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {allDone ? 'Bajarildi — Saqlash' : 'Avval jurnallarga yozuv kiriting'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
