/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Download, X, CheckCircle2, Clock, Map as MapIcon, Plus, ChevronLeft, BookOpen } from 'lucide-react'
import { getGlobalGraphics, getSchemasByStation, upsertReport, upsertPremiyaReport, getPremiyasByWorker } from '@/lib/supabase-db'
import type { User, WorkReport, ReportEntry, PremiyaEntry, StationSchema } from '@/types'
import { YILLIK_REJA, TORT_HAFTALIK_REJA, YILLIK_REJA_FLAT, TORT_HAFTALIK_REJA_FLAT, type ParsedTaskItem } from '@/lib/reja-data'
import { MONTHS } from '@/lib/constants'
import { DU46JournalView, SHU2JournalView } from '@/components/JournalView'

const TOTAL_ROWS = 14
const PREMIYA_ROWS = 12

export function BigActionCard({ title, desc, icon, onClick, color = 'cyan', badge = 0 }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void, color?: 'cyan' | 'amber' | 'blue', badge?: number }) {
  const colorMap: Record<string, string> = {
    cyan: 'hover:border-sky-300 hover:shadow-sky-100/50 text-sky-600',
    amber: 'hover:border-amber-300 hover:shadow-amber-100/50 text-amber-600',
    blue: 'hover:border-blue-300 hover:shadow-blue-100/50 text-blue-600',
  }
  return (
    <button onClick={onClick} className={`premium-card group relative flex flex-col items-start p-8 bg-gradient-to-br from-white to-slate-50/50 transition-all hover:scale-[1.02] active:scale-[0.98] text-left animate-fade-up ${colorMap[color]}`}>
      {badge > 0 && (
        <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white shadow-lg shadow-red-500/30 animate-bounce">
          {badge > 9 ? '9+' : badge}
        </div>
      )}
      <div className={`rounded-2xl bg-slate-50 p-4 mb-6 group-hover:scale-110 group-hover:bg-white border border-slate-100 transition-all shadow-sm ${color === 'cyan' ? 'text-sky-600' : color === 'amber' ? 'text-amber-600' : 'text-blue-600'}`}>{icon}</div>
      <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
    </button>
  )
}

export function HeaderCard({ title, subtitle, status }: { title: string, subtitle: string, status: string, color?: string }) {
  const statusColors: Record<string, string> = {
    tasdiqlandi: 'badge-success',
    kutilmoqda: 'badge-warning',
    yangi: 'badge-info',
    "ko'rish": 'badge-info',
  }
  return (
    <div className="glass-card rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
        </div>
        <div className={`badge ${statusColors[status]}`}>{status}</div>
      </div>
    </div>
  )
}

export function JournalForm({ session, stationId, stationName, month, reports, onSubmit, onCancel }: { session: User, stationId: string, stationName: string, month: number, reports: WorkReport[], onSubmit: () => void, onCancel: () => void }) {
  const [entries, setEntries] = useState<ReportEntry[]>(Array.from({ length: TOTAL_ROWS }, (_, i) => ({
    ragat: String(i + 1), haftalikJadval: '', yillikJadval: '', yangiIshlar: '', kmoBartaraf: '', majburiyOzgarish: '', bajarildiShn: '', bajarildiImzo: '', adImzosi: ''
  })))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'4-haftalik' | 'yillik'>('4-haftalik')
  const [modalIdx, setModalIdx] = useState(0)
  const [modalSearch, setModalSearch] = useState('')
  const [selectedBolim, setSelectedBolim] = useState<number | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [reportId, setReportId] = useState<string | null>(null)
  const [completionIdx, setCompletionIdx] = useState<number | null>(null)
  const monthStr = `${new Date().getFullYear()}-${String(month + 1).padStart(2, '0')}`

  useEffect(() => {
    const draft = reports.find(r => r.month === monthStr && r.stationId === stationId)
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
  }, [reports, monthStr, stationId])

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
  const openSelectModal = (idx: number, type: '4-haftalik' | 'yillik') => {
    setModalIdx(idx)
    setModalType(type)
    setModalSearch('')
    setSelectedBolim(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await upsertReport({
        workerId: session.id, workerName: session.fullName, workerPhone: session.phone || '', stationId, stationName, entries, month: monthStr, year: String(new Date().getFullYear()), weekLabel: 'Oylik Reja'
      })
      onSubmit()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setFormError(null), 3000)
    } finally { setSubmitting(false) }
  }

  const handleBajarishClick = (idx: number) => {
    setCompletionIdx(idx)
  }

  const confirmBajarildi = async (idx: number, taskType?: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy') => {
    if (!reportId) return
    const newEntries = [...entries]
    const entry = newEntries[idx]

    // Agar taskType berilgan bo'lsa, faqat o'shani bajaramiz
    if (taskType === 'haftalik') entry.doneHaftalik = true
    if (taskType === 'yillik') entry.doneYillik = true
    if (taskType === 'yangi') entry.doneYangi = true
    if (taskType === 'kmo') entry.doneKmo = true
    if (taskType === 'majburiy') entry.doneMajburiy = true

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
      await upsertReport({
        workerId: session.id, workerName: session.fullName, workerPhone: session.phone || '', stationId, stationName, entries: newEntries, month: monthStr, year: String(new Date().getFullYear()), weekLabel: 'Oylik Reja'
      })
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setFormError(null), 3000)
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

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Jurnal To'ldirish" subtitle={`${MONTHS[month]} · ${stationName}`} status="yangi" />
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm relative shadow-sm">
        <div className="sm:hidden absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 z-10 rounded-bl-lg font-bold">
          O&apos;ngga suring →
        </div>
        <div className="overflow-x-auto overflow-y-hidden">
          <table style={{ minWidth: "1200px" }} className="w-full border-collapse text-left text-[11px] text-slate-700">
            <thead className="border-b-2 border-sky-500/30 bg-slate-50 font-bold text-slate-600">
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
                <th className="border-r border-t border-slate-200 p-2 text-center font-bold text-sky-600">Shn</th>
                <th className="border-r border-t border-slate-200 p-2 text-center font-bold text-sky-600">Imzo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="border-r border-slate-100 p-1 align-top">
                    <input
                      value={e.ragat}
                      readOnly={!!e.adImzosi || isConfirmed}
                      onChange={(ev) => { const n = [...entries]; n[i].ragat = ev.target.value; setEntries(n) }}
                      className={`w-full rounded bg-transparent text-center font-bold text-sky-600 outline-none focus:bg-white ${(!!e.adImzosi || isConfirmed) ? 'opacity-40' : ''}`}
                    />
                  </td>
                  <td className="relative border-r border-slate-100 p-1 align-top">
                    <div className="relative">
                      <textarea
                        value={e.haftalikJadval}
                        readOnly={!!e.adImzosi || isConfirmed}
                        onChange={(ev) => { const n = [...entries]; n[i].haftalikJadval = ev.target.value; setEntries(n) }}
                        className={`min-h-[60px] w-full resize-none rounded border bg-slate-50 px-2 py-1.5 text-[11px] outline-none focus:border-sky-500/50 shadow-inner ${(!!e.adImzosi || isConfirmed) ? 'opacity-60 cursor-not-allowed border-transparent' : 'border-slate-100'}`}
                      />
                      {e.doneHaftalik && (
                        <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm" title="Bajarildi">
                          <CheckCircle2 size={12} />
                        </div>
                      )}
                    </div>
                    {(!e.adImzosi && !isConfirmed) && (
                      <button
                        onClick={() => openSelectModal(i, '4-haftalik')}
                        className="absolute bottom-2 right-2 rounded bg-sky-100 p-1 text-sky-600 shadow-sm transition hover:bg-sky-600 hover:text-white"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    )}
                  </td>
                  <td className="relative border-r border-slate-100 p-1 align-top">
                    <div className="relative">
                      <textarea
                        value={e.yillikJadval}
                        readOnly={!!e.adImzosi || isConfirmed}
                        onChange={(ev) => { const n = [...entries]; n[i].yillikJadval = ev.target.value; setEntries(n) }}
                        className={`min-h-[60px] w-full resize-none rounded border bg-slate-50 px-2 py-1.5 text-[11px] outline-none focus:border-sky-500/50 shadow-inner ${(!!e.adImzosi || isConfirmed) ? 'opacity-60 cursor-not-allowed border-transparent' : 'border-slate-100'}`}
                      />
                      {e.doneYillik && (
                        <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm" title="Bajarildi">
                          <CheckCircle2 size={12} />
                        </div>
                      )}
                    </div>
                    {(!e.adImzosi && !isConfirmed) && (
                      <button
                        onClick={() => openSelectModal(i, 'yillik')}
                        className="absolute bottom-2 right-2 rounded bg-sky-100 p-1 text-sky-600 shadow-sm transition hover:bg-sky-600 hover:text-white"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    )}
                  </td>
                  <td className="border-r border-slate-100 p-1 align-top">
                    <textarea
                      value={e.yangiIshlar}
                      readOnly={!!e.adImzosi || isConfirmed}
                      onChange={(ev) => { const n = [...entries]; n[i].yangiIshlar = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-sky-500/50 ${(!!e.adImzosi || isConfirmed) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="border-r border-slate-100 p-1 align-top">
                    <textarea
                      value={e.kmoBartaraf}
                      readOnly={!!e.adImzosi || isConfirmed}
                      onChange={(ev) => { const n = [...entries]; n[i].kmoBartaraf = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-sky-500/50 ${(!!e.adImzosi || isConfirmed) ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="border-r border-slate-100 p-1 align-top">
                    <textarea
                      value={e.majburiyOzgarish}
                      readOnly={!!e.adImzosi || isConfirmed}
                      onChange={(ev) => { const n = [...entries]; n[i].majburiyOzgarish = ev.target.value; setEntries(n) }}
                      className={`min-h-[60px] w-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-sky-500/50 ${(!!e.adImzosi || isConfirmed) ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="border-r border-slate-100 p-2 text-center align-middle font-medium text-sky-600">
                    {e.bajarildiShn}
                  </td>
                  <td className="border-r border-slate-100 p-2 text-center align-middle italic text-slate-400">
                    {e.bajarildiImzo}
                  </td>
                  <td className="p-2 text-center align-middle">
                    {e.adImzosi ? (
                      <span className="inline-block whitespace-pre-wrap rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600 border border-emerald-100">✅ {e.adImzosi}</span>
                    ) : isConfirmed ? (
                      (() => {
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
                              className="rounded-lg bg-sky-500 px-3 py-1.5 text-[10px] font-black text-white shadow-sm hover:bg-sky-600 transition-all active:scale-95 disabled:opacity-50"
                            >
                              Bajarish
                            </button>
                          )
                        }
                        return null
                      })()
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">Kutilmoqda...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isConfirmed && (
          <div className="flex items-center gap-3 border-t border-slate-200/60 bg-slate-50/50 p-4">
            <button
              onClick={addRow}
              className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-slate-100"
            >
              <Plus size={14} />
              Qator qo&apos;shish
            </button>
            <button
              onClick={removeRow}
              className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-400 backdrop-blur-sm transition hover:border-red-200 hover:text-red-500"
            >
              <X size={14} />
              Qator o&apos;chirish
            </button>
          </div>
        )}
      </div>
      {formError && (
        <div className="rounded-2xl border border-red-200/60 bg-red-50/80 p-4 text-center text-sm font-bold text-red-600 backdrop-blur-sm">{formError}</div>
      )}
      <div className="flex gap-4">
        <button onClick={handleDownloadPDF}
          className="rounded-2xl border border-slate-200/60 bg-white/80 px-6 py-5 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition flex items-center gap-2 shadow-sm backdrop-blur-sm">
          <Download size={18} /> PDF
        </button>
        {!isConfirmed && (
          <button onClick={handleSubmit} disabled={submitting} className="btn-gradient flex-1 py-5 font-black uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all">{submitting ? 'Yuborilmoqda...' : 'Yuborish'}</button>
        )}
        <button onClick={onCancel} className="rounded-2xl bg-white/80 border border-slate-200/60 px-10 font-bold text-slate-400 hover:text-slate-900 transition shadow-sm backdrop-blur-sm">
          {isConfirmed ? 'Orqaga' : 'Bekor qilish'}
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center bg-slate-900/40 p-4 pt-[10vh] backdrop-blur-md transition-all">
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
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50/30">
              {selectedBolim === null && !modalSearch ? (
                <div className="grid grid-cols-1 gap-3">
                  {(modalType === 'yillik' ? YILLIK_REJA : TORT_HAFTALIK_REJA).map((b, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedBolim(idx)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 p-5 text-left backdrop-blur-sm transition-all hover:border-sky-300 hover:shadow-md hover:bg-sky-50/30 group"
                    >
                      <span className="font-bold text-slate-700 group-hover:text-sky-600 transition-colors uppercase tracking-tight text-sm">{b.bolim}</span>
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
                      <span className="text-xs font-bold text-sky-600 truncate max-w-[200px] text-right">
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
                        onClick={() => {
                          const n = [...entries]

                          const text =
                            `[${task.manba}${task.raqam ? ` ${task.raqam}` : ''}] ${task.ish}\n` +
                            `Davriyligi: ${task.davriylik}\n` +
                            `Bajaruvchi: ${task.bajaruvchi}` +
                            (task.jurnal ? `\nJurnal: ${task.jurnal}` : '')

                          if (modalType === '4-haftalik') {
                            n[modalIdx].haftalikJadval = text
                            if (task.jurnal) n[modalIdx].jurnalHaftalik = task.jurnal
                          } else {
                            n[modalIdx].yillikJadval = text
                            if (task.jurnal) n[modalIdx].jurnalYillik = task.jurnal
                          }

                          setEntries(n)
                          setModalOpen(false)
                          setSelectedBolim(null)
                        }}
                        className="w-full rounded-xl border border-slate-200/60 bg-white/80 p-3 text-left backdrop-blur-sm transition-all hover:border-sky-300 hover:shadow-md hover:bg-sky-50/30 group"
                      >
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <p className="text-[10px] text-sky-600">
                            📌 {task.bolim}
                          </p>
                          <p className="text-[10px] text-amber-600/70">
                            📄 {task.manba} {task.raqam}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            🕐 {task.davriylik}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            👤 {task.bajaruvchi}
                          </p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs font-bold text-slate-700 group-hover:text-slate-900">
                          {task.ish}
                        </p>
                        {task.jurnal && (
                          <div className="mt-2 inline-block rounded-md bg-sky-50/80 px-2 py-1 text-[9px] uppercase tracking-widest text-sky-600 border border-sky-100/60">
                            Jurnal: {task.jurnal}
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {completionIdx !== null && entries[completionIdx] && (
        <TaskCompletionModal
          entry={entries[completionIdx]}
          entryIndex={completionIdx}
          session={session}
          stationId={stationId}
          stationName={stationName}
          onComplete={(taskType) => confirmBajarildi(completionIdx, taskType)}
          onClose={() => setCompletionIdx(null)}
        />
      )}
    </div>
  )
}

export function PremiyaForm({ session, stationId, stationName, month, onSubmit, onCancel }: { session: User, stationId: string, stationName: string, month: number, onSubmit: () => void, onCancel: () => void }) {
  const [entries, setEntries] = useState<PremiyaEntry[]>(Array.from({ length: PREMIYA_ROWS }, () => ({ ish: '', lavozim: '', tabelNomeri: '', foiz: '', eslatma: '' })))
  const [submitting, setSubmitting] = useState(false)
  const [premiyaError, setPremiyaError] = useState<string | null>(null)
  const monthStr = `${new Date().getFullYear()}-${String(month + 1).padStart(2, '0')}`

  useEffect(() => {
    getPremiyasByWorker(session.id).then(reps => {
      const draft = reps.find(r => r.month === monthStr && r.stationId === stationId)
      if (draft) setEntries(draft.entries)
      else setEntries(Array.from({ length: PREMIYA_ROWS }, () => ({ ish: '', lavozim: '', tabelNomeri: '', foiz: '', eslatma: '' })))
    })
  }, [session.id, monthStr, stationId])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      if (entries.every(e => !e.ish && !e.lavozim)) {
        throw new Error("Kamida bitta qatorni to'ldiring");
      }
      await upsertPremiyaReport({ workerId: session.id, workerName: session.fullName, stationId, stationName, sex: stationName, month: monthStr, year: String(new Date().getFullYear()), entries })
      onSubmit()
    } catch (err: unknown) {
      setPremiyaError(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setPremiyaError(null), 3000)
    } finally { setSubmitting(false) }
  }

  const addRow = () => setEntries([...entries, { ish: '', lavozim: '', tabelNomeri: '', foiz: '', eslatma: '' }])
  const removeRow = () => {
    if (entries.length <= 1) return
    setEntries(entries.slice(0, -1))
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Premiya To'ldirish" subtitle={`${MONTHS[month]} · ${stationName}`} status="yangi" color="amber" />
      <div className="flex gap-2">
        <button onClick={addRow} className="rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 backdrop-blur-sm transition-all shadow-sm">+ Qator qo'shish</button>
        <button onClick={removeRow} className="rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 hover:border-red-100 backdrop-blur-sm transition-all shadow-sm">- Qator o'chirish</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <table className="w-full text-left text-[11px] min-w-[800px]">
          <thead className="text-[10px] font-black uppercase text-slate-400 bg-slate-50/80">
            <tr><th className="p-4 text-center w-12">№</th><th className="p-4">I.SH.</th><th className="p-4">Lavozimi</th><th className="p-4 text-center">Tabel №</th><th className="p-4 text-center">Rag'bat. %</th><th className="p-4">Eslatma</th></tr>
          </thead>
          <tbody className="bg-white/50">
            {entries.map((e, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                <td className="p-1 text-center text-slate-400 font-bold text-[11px]">{i + 1}</td>
                <td className="p-1"><input value={e.ish} onChange={val => { const n = [...entries]; n[i].ish = val.target.value; setEntries(n) }} className="input-premium" /></td>
                <td className="p-1"><input value={e.lavozim} onChange={val => { const n = [...entries]; n[i].lavozim = val.target.value; setEntries(n) }} className="input-premium" /></td>
                <td className="p-1"><input value={e.tabelNomeri} onChange={val => { const n = [...entries]; n[i].tabelNomeri = val.target.value; setEntries(n) }} className="input-premium text-center" /></td>
                <td className="p-1"><input value={e.foiz} onChange={val => { const n = [...entries]; n[i].foiz = val.target.value; setEntries(n) }} className="input-premium text-center font-black text-amber-600" /></td>
                <td className="p-1"><input value={e.eslatma} onChange={val => { const n = [...entries]; n[i].eslatma = val.target.value; setEntries(n) }} className="input-premium" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {premiyaError && (
        <div className="rounded-2xl border border-red-200/60 bg-red-50/80 p-4 text-center text-sm font-bold text-red-600 backdrop-blur-sm">{premiyaError}</div>
      )}
      <div className="flex gap-4">
        <button onClick={handleSubmit} disabled={submitting} className="btn-gradient flex-1 py-5 font-black uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>{submitting ? 'Yuborilmoqda...' : 'Ro\'yxatni Saqlash'}</button>
        <button onClick={onCancel} className="rounded-2xl bg-white/80 border border-slate-200/60 px-10 font-bold text-slate-400 hover:text-slate-900 backdrop-blur-sm transition-all shadow-sm">Bekor qilish</button>
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

  function GrafikCard({
    title,
    file,
  }: {
    title: string
    file?: StationSchema
  }) {
    return (
      <div className="premium-card group relative overflow-hidden rounded-2xl bg-white/80 p-6 backdrop-blur-sm transition-all hover:border-sky-300 hover:shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition-all group-hover:scale-110 group-hover:bg-white border border-slate-100 shadow-sm">
          <Download size={24} />
        </div>

        <h4 className="font-black text-slate-900 tracking-tight">{title}</h4>
        <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {file ? file.fileName : 'Fayl joylanmagan'}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-2">
          <button
            onClick={() => file && setPreview(file.filePath)}
            disabled={!file}
            className="rounded-xl bg-slate-50/80 border border-slate-100 py-3 text-[10px] font-black uppercase text-slate-500 hover:bg-sky-600 hover:text-white backdrop-blur-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95"
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200/60 bg-white/80 backdrop-blur-sm text-slate-300 font-bold uppercase tracking-widest">
        Yuklanmoqda...
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Grafiklar" subtitle="Umumiy ish reja grafiklari" status="ko'rish" color="blue" />

      <div className="grid gap-4 sm:grid-cols-2">
        <GrafikCard title="Yillik ish reja grafigi" file={yillik} />
        <GrafikCard title="4-haftalik ish reja grafigi" file={haftalik} />
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (stationId) getSchemasByStation(stationId).then(setSchemasState)
    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [stationId, blobUrl])

  // Firefox uchun blob URL orqali ko'rsatish
  const handlePreview = async (filePath: string) => {
    try {
      // Agar oldin blob URL bo'lsa, tozalash
      if (blobUrl) URL.revokeObjectURL(blobUrl)

      const response = await fetch(filePath)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      setPreview(url)
    } catch (err) {
      console.error('PDF yuklash xatosi:', err)
      // Fallback: to'g'ridan-to'g'ri URL
      setPreview(filePath)
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Bekat Sxemalari" subtitle={stationName} status="ko'rish" color="blue" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {schemas.map(s => (
          <div key={s.id} className="premium-card group relative overflow-hidden rounded-2xl bg-white/80 p-8 backdrop-blur-sm transition-all hover:border-sky-300 hover:shadow-xl">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition-all group-hover:scale-110 group-hover:bg-white border border-slate-100 shadow-sm"><MapIcon size={28} /></div>
            <h4 className="text-lg font-black text-slate-900 tracking-tight">{s.schemaType}</h4>
            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.fileName}</p>
            <div className="mt-8 flex gap-3">
              <button onClick={() => handlePreview(s.filePath)} className="flex-1 rounded-2xl bg-slate-50/80 border border-slate-200/60 py-4 text-xs font-black uppercase text-slate-600 hover:bg-sky-600 hover:text-white backdrop-blur-sm transition-all active:scale-95 shadow-sm">Ko'rish</button>
              <a href={s.filePath} download className="rounded-2xl bg-slate-50/80 border border-slate-200/60 p-4 text-slate-400 hover:bg-slate-900 hover:text-white backdrop-blur-sm transition-all shadow-sm active:scale-95"><Download size={20} /></a>
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
              <button onClick={() => { setPreview(null); if (blobUrl) URL.revokeObjectURL(blobUrl) }} className="rounded-xl border border-slate-200/60 bg-white/80 p-2 text-slate-400 hover:text-slate-900 backdrop-blur-sm transition-all shadow-sm"><X size={24} /></button>
            </div>
            <iframe src={preview} className="h-[calc(100%-80px)] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}

export function WorkerTasksModal({ type, tasks, onClose }: {
  type: 'bugunBajarilgan' | 'qolibKetgan'
  tasks: { entry: ReportEntry, month: string }[]
  onClose: () => void
}) {
  const isBajarilgan = type === 'bugunBajarilgan'
  const todayDate = new Date()
  const todayFormatted = `${String(todayDate.getDate()).padStart(2, '0')}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${todayDate.getFullYear()}`

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md transition-all">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl animate-scale-in">
        <div className={`flex items-center justify-between border-b px-8 py-6 ${isBajarilgan ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'}`}>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {isBajarilgan ? 'Bugun bajarilgan ishlar ro\'yxati' : 'Bajarilmagan ishlar (Qolib ketganlar)'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Bugungi sana: {todayFormatted} · Jami: {tasks.length} ta
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
          {tasks.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  {isBajarilgan ? 'Bugun hali bajarilgan ish yo\'q' : 'Bajarilmagan ishlar yo\'q'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {tasks.map((task, ti) => {
                const text = task.entry.haftalikJadval || task.entry.yillikJadval || task.entry.yangiIshlar || task.entry.kmoBartaraf || task.entry.majburiyOzgarish || ''
                // Sana hisoblash: month "2026-04", ragat "4" -> "04.04.2026"
                let dateFormatted = task.entry.ragat
                if (task.entry.ragat && task.month && task.month.includes('-')) {
                  const [yyyy, mm] = task.month.split('-')
                  dateFormatted = `${String(task.entry.ragat.trim()).padStart(2, '0')}.${mm}.${yyyy}`
                }

                return (
                  <div key={ti} className="flex items-start gap-4 border-b border-slate-100 last:border-0 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className={`flex flex-col items-center justify-center min-w-[110px] rounded-xl p-3 border shadow-sm ${isBajarilgan ? 'bg-emerald-50/80 border-emerald-100' : 'bg-red-50/80 border-red-100'
                      }`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isBajarilgan ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isBajarilgan ? 'Bajarilgan sana' : 'Bajarilishi kerak edi:'}
                      </span>
                      <span className={`text-sm font-black mt-1 ${isBajarilgan ? 'text-emerald-700' : 'text-red-700'}`}>
                        {dateFormatted}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 border-l border-slate-100 pl-4">
                      <p className="text-[11px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>

                      <div className="mt-3 flex gap-4">
                        {task.entry.bajarildiShn && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600">Elektromexanik: {task.entry.bajarildiShn}</span>
                          </div>
                        )}
                        {!task.entry.bajarildiShn && (
                          <div className="flex items-center gap-1">
                            <X size={12} className="text-red-500" />
                            <span className="text-[10px] font-bold text-red-600">Elektromexanik: Bajarilmagan</span>
                          </div>
                        )}

                        {task.entry.adImzosi ? (
                          <div className="flex items-center gap-1 border-l pl-4 border-emerald-100">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600">Dispetcher: {task.entry.adImzosi}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 border-l pl-4 border-slate-200">
                            <Clock size={12} className="text-amber-500" />
                            <span className="text-[10px] font-bold text-amber-500">Dispetcher kutilyapti</span>
                          </div>
                        )}
                      </div>
                    </div>
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
const SUPPORTED_JOURNALS: Record<string, 'du46' | 'shu2'> = {
  'SHU-2': 'shu2',
  'DU-46': 'du46',
}

function TaskCompletionModal({ entry, entryIndex, session, stationId, stationName, onComplete, onClose }: {
  entry: ReportEntry
  entryIndex: number
  session: User
  stationId: string
  stationName: string
  onComplete: (taskType: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy') => void
  onClose: () => void
}) {
  const [activeJournal, setActiveJournal] = useState<'du46' | 'shu2' | null>(null)
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
        <DU46JournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole="worker" onClose={() => handleJournalClose('DU-46', false)} onAccepted={() => handleJournalClose('DU-46', true)} />
      </div>,
      document.body
    )
  }
  if (activeJournal === 'shu2') {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        <SHU2JournalView stationId={stationId} stationName={stationName} userName={session.fullName} userRole="worker" onClose={() => handleJournalClose('SHU-2', false)} onAccepted={() => handleJournalClose('SHU-2', true)} />
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
                className="w-full text-left rounded-2xl border border-slate-200 p-5 hover:border-sky-500 hover:bg-sky-50 transition-all group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 mb-1 block">{t.label}</span>
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
                 <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">{currentTask?.label}</span>
                 {availableTasks.length > 1 && (
                   <button onClick={() => { setSelectedTaskType(null); setVisitedJournals(new Set()) }} className="text-[10px] font-black text-slate-400 hover:text-sky-600 underline">Ortga</button>
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
                    className={`w-full flex items-center justify-between rounded-2xl border p-5 transition-all active:scale-[0.98] ${
                      isDone
                        ? 'border-emerald-200 bg-emerald-50/80'
                        : 'border-sky-200 bg-sky-50/50 hover:bg-sky-100 hover:border-sky-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-600'}`}>
                        {isDone ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-black text-slate-900">{name}</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: isDone ? '#059669' : '#0284c7' }}>
                          {isDone ? 'Yozuv kiritildi ✓' : 'Yozuv kiritish →'}
                        </p>
                      </div>
                    </div>
                    {isDone && <span className="text-lg">✅</span>}
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
                      <span className="text-sm font-black text-slate-700">{name}</span>
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
                {allDone ? '✅ Bajarildi — Saqlash' : 'Avval jurnallarga yozuv kiriting'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}