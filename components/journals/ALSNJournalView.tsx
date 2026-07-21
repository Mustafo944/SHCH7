/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import type { ALSNEntry } from '@/types'
import { Plus, Trash2, CheckCircle2, Download, ChevronLeft } from 'lucide-react'
import { getCurrentJournalMonth, isMonthInPast, getJournalMonthLabel } from './helpers'
import { DateInput, TimeInput } from './JournalSelectModal'

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

const EMPTY_ALSN = (): ALSNEntry => ({
  nomber: '',
  sana: '', tekshirilganVaqt: '', poezdRaqami: '', teplovozRaqami: '',
  mashinistFamiliyasi: '', rps: '', alsn: '', svetoforKorinishi: '',
  poezdOtganYol: '', imzo: '',
  bajarildi: false, bajarildiAt: '',
})

export function ALSNJournalView({
  stationId,
  stationName,
  userName,
  userRole,
  journalMonth = getCurrentJournalMonth(),
  onClose,
}: {
  stationId: string
  stationName: string
  userName: string
  userRole: string
  journalMonth?: string
  onClose: () => void
}) {
  const [entries, setEntries] = useState<ALSNEntry[]>(Array.from({ length: 5 }, (_, i) => ({ ...EMPTY_ALSN(), nomber: String(i + 1) })))
  const [allEntries, setAllEntries] = useState<ALSNEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const isWorker = ['worker', 'elektromexanik', 'elektromontyor'].includes(userRole)

  const journalMonthLabel = getJournalMonthLabel(journalMonth)

  const showMsg = (text: string, duration = 2000) => {
    setMsg(text)
    setTimeout(() => setMsg(null), duration)
  }

  const loadJournalData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const j = await getJournal(stationId, 'alsn')
      if (j && j.entries.length > 0) {
        const loadedAllEntries = j.entries as ALSNEntry[]
        setAllEntries(loadedAllEntries)

        const monthEntries = loadedAllEntries.filter(e => e.journalMonth === journalMonth)

        if (monthEntries.length > 0) {
          setEntries(monthEntries)
        } else {
          setEntries(Array.from({ length: 5 }, (_, i) => ({ ...EMPTY_ALSN(), nomber: String(i + 1) })))
        }
      } else {
        setAllEntries([])
        setEntries(Array.from({ length: 5 }, (_, i) => ({ ...EMPTY_ALSN(), nomber: String(i + 1) })))
      }
    } catch (err) {
      console.error('ALSN journal yuklash xatosi:', err)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [stationId, journalMonth])

  useEffect(() => {
    loadJournalData(false)
  }, [loadJournalData])

  useRealtimeSubscription(
    stationId && journalMonth
      ? [
          {
            channelName: `journal_alsn_${userRole}_${stationId}_${journalMonth}`,
            table: 'station_journals',
            filter: `station_id=eq.${stationId}`,
            onEvent: () => loadJournalData(true),
          },
        ]
      : [],
    !!stationId && !!journalMonth
  )

  const update = (i: number, field: keyof ALSNEntry, val: string) => {
    const n = [...entries]
    n[i] = { ...n[i], [field]: val }
    setEntries(n)
  }

  const addRow = () => setEntries([...entries, { ...EMPTY_ALSN(), nomber: String(entries.length + 1) }])
  const removeRow = () => {
    if (entries.length <= 1) return
    const last = entries[entries.length - 1]
    if (last.bajarildi || last.sana || last.poezdRaqami) return
    setEntries(entries.slice(0, -1))
  }

  const saveEntries = async (updated: ALSNEntry[], prev: ALSNEntry[]) => {
    setEntries(updated)

    const updatedWithMonth = updated.map(e => ({ ...e, journalMonth }))
    const otherMonths = allEntries.filter(e => e.journalMonth !== journalMonth)
    const newAllEntries = [...otherMonths, ...updatedWithMonth]
    setAllEntries(newAllEntries)

    try {
      await upsertJournal(stationId, 'alsn', newAllEntries, userName)
    } catch (err) {
      console.error('Saqlash xatosi:', err)
      setEntries(prev)
      setAllEntries(allEntries)
      showMsg(err instanceof Error ? err.message : 'Xatolik', 3000)
      throw err
    }
  }

  const handleBajarildi = async (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    updated[i] = {
      ...updated[i],
      bajarildi: true,
      bajarildiAt: new Date().toISOString(),
      imzo: userName,
    }
    try {
      await saveEntries(updated, prev)
      showMsg('Bajarildi!')
    } catch { /* saveEntries ichida xato ko'rsatiladi */ }
  }

  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const todayDate = new Date()
    const [dlYear, dlMonth] = (journalMonth || '').split('-')
    const pdfYear = dlYear || String(todayDate.getFullYear())
    const pdfMonth = dlMonth || String(todayDate.getMonth() + 1).padStart(2, '0')
    const pdfDay = String(todayDate.getDate()).padStart(2, '0')
    const pdfDateStr = `${pdfDay}.${pdfMonth}.${pdfYear}`

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Poezd radioaloqasi va ALSN ni tekshirish', 14, 15)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Bajarilish muddati: xar kuni bir marotaba "juft va toq" poezdlar bilan.', 14, 22)
    doc.text(`${stationName} - ${pdfDateStr}`, 14, 29)

    const tableColumn = ['No', 'Sana', 'Teksh. vaqt', 'Poezd raqami', 'Teplovoz raqami', 'Mashinist Familiyasi', 'RPS', 'ALSN', 'Svetofor', 'Poezd yoli', 'Imzo']
    const tableRows = entries
      .filter(e => e.sana || e.poezdRaqami || e.mashinistFamiliyasi)
      .map((e, i) => [
        e.nomber || String(i + 1),
        e.sana || '', e.tekshirilganVaqt || '', e.poezdRaqami || '', e.teplovozRaqami || '',
        e.mashinistFamiliyasi || '', e.rps || '', e.alsn || '', e.svetoforKorinishi || '',
        e.poezdOtganYol || '', e.bajarildi ? e.imzo : '',
      ])

    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: 34, theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [8, 23, 40], textColor: [255, 255, 255], fontSize: 6.5, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: { 0: { halign: 'center', cellWidth: 8 } },
    })

    doc.save(`ALSN_${stationName}_${pdfDateStr.replace(/\./g, '-')}.pdf`)
  }

  const todayDate = new Date()
  const [jYear, jMonthStr] = (journalMonth || '').split('-')
  const selectedYear = jYear || String(todayDate.getFullYear())
  const selectedMonth = jMonthStr || String(todayDate.getMonth() + 1).padStart(2, '0')
  const selectedDay = String(todayDate.getDate()).padStart(2, '0')
  const dateStr = `${selectedDay}.${selectedMonth}.${selectedYear}`

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-300 font-bold uppercase tracking-widest">Yuklanmoqda...</div>

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="flex items-center justify-center rounded-xl bg-white p-2 text-slate-600 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Poezd radioaloqasi va ALSN</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stationName} · {journalMonthLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className={`text-xs font-bold px-3 py-1 rounded-full border ${msg.includes('!') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{msg}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">

        {/* Sarlavha */}
        <div className="mb-4 rounded-2xl border border-blue-200/60 bg-blue-50/50 p-4 shadow-sm">
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-tight">Poezd radioaloqasi va ALSN ni tekshirish</h3>
          <p className="text-xs text-blue-600 mt-1">Bajarilish muddati: xar kuni bir marotaba &quot;juft va toq&quot; poezdlar bilan.</p>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Sana:</span>
            <div className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200">
              {dateStr}
            </div>
          </div>
          <button onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
            <Download size={14} /> Yuklab olish
          </button>
        </div>

        {/* Jadval */}
        <div className="overflow-x-auto overscroll-x-contain rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <table className="w-full border-collapse text-[11px] text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-tight text-slate-500 border-b-2 border-slate-200">
              <tr>
                <th className="w-[3%] border-r border-b border-slate-200 p-3 text-center">№</th>
                <th className="w-[8%] border-r border-b border-slate-200 p-3 text-center">Sana</th>
                <th className="w-[8%] border-r border-b border-slate-200 p-3 text-center">Tekshirilgan<br />vaqt</th>
                <th className="w-[8%] border-r border-b border-slate-200 p-3 text-center">Poezd<br />Raqami</th>
                <th className="w-[8%] border-r border-b border-slate-200 p-3 text-center">Teplovoz<br />raqami</th>
                <th className="w-[14%] border-r border-b border-slate-200 p-3 text-center">Mashinist<br />Familiyasi</th>
                <th className="w-[7%] border-r border-b border-slate-200 p-3 text-center">RPS</th>
                <th className="w-[7%] border-r border-b border-slate-200 p-3 text-center">ALSN</th>
                <th className="w-[12%] border-r border-b border-slate-200 p-3 text-center">Svetofor<br />Ko&apos;rinishi</th>
                <th className="w-[10%] border-r border-b border-slate-200 p-3 text-center">Poezd o&apos;tgan<br />yo&apos;l</th>
                <th className="w-[15%] border-b border-slate-200 p-3 text-center">Imzo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const isLocked = !!e.bajarildi || isMonthInPast(journalMonth)

                return (
                  <tr key={i} className={`border-b border-slate-200 hover:bg-blue-50/50 transition-colors animate-fade-up ${isLocked ? 'bg-emerald-50/30' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                    {/* № */}
                    <td className="border-r border-slate-200 p-1 text-center bg-slate-50/30">
                      <LocalInput
                        value={e.nomber || ''}
                        onChange={(val: string) => update(i, 'nomber', val)}
                        readOnly={!isWorker || isLocked}
                        placeholder={String(i + 1)}
                        className="w-full rounded bg-transparent text-center font-black text-slate-400 outline-none transition-all focus:bg-white focus:text-purple-600"
                      />
                    </td>
                    {/* Sana */}
                    <td className="border-r border-slate-200 p-0.5">
                      <DateInput
                        value={e.sana || ''}
                        onChange={val => update(i, 'sana', val)}
                        readOnly={!isWorker || isLocked}
                      />
                    </td>
                    {/* Tekshirilgan vaqt */}
                    <td className="border-r border-slate-200 p-0.5">
                      <TimeInput
                        value={e.tekshirilganVaqt || ''}
                        onChange={val => update(i, 'tekshirilganVaqt', val)}
                        readOnly={!isWorker || isLocked}
                        className="bg-transparent"
                      />
                    </td>
                    {/* Poezd Raqami */}
                    <td className="border-r border-slate-200 p-0.5">
                      <LocalInput
                        value={e.poezdRaqami || ''}
                        onChange={(val: string) => update(i, 'poezdRaqami', val)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* Teplovoz raqami */}
                    <td className="border-r border-slate-200 p-0.5">
                      <LocalInput
                        value={e.teplovozRaqami || ''}
                        onChange={(val: string) => update(i, 'teplovozRaqami', val)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* Mashinist Familiyasi */}
                    <td className="border-r border-slate-200 p-0.5">
                      <LocalInput
                        value={e.mashinistFamiliyasi || ''}
                        onChange={(val: string) => update(i, 'mashinistFamiliyasi', val)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* RPS */}
                    <td className="border-r border-slate-200 p-0.5">
                      <LocalInput
                        value={e.rps || ''}
                        onChange={(val: string) => update(i, 'rps', val)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* ALSN */}
                    <td className="border-r border-slate-200 p-0.5">
                      <LocalInput
                        value={e.alsn || ''}
                        onChange={(val: string) => update(i, 'alsn', val)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* Svetofor Ko'rinishi */}
                    <td className="border-r border-slate-200 p-0.5">
                      <LocalInput
                        value={e.svetoforKorinishi || ''}
                        onChange={(val: string) => update(i, 'svetoforKorinishi', val)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* Poezd o'tgan yo'l */}
                    <td className="border-r border-slate-200 p-0.5">
                      <LocalInput
                        value={e.poezdOtganYol || ''}
                        onChange={(val: string) => update(i, 'poezdOtganYol', val)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* Imzo */}
                    <td className="p-1">
                      <div className="flex flex-col items-center gap-1">
                        {e.bajarildi && (
                          <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border-2 border-emerald-500 bg-emerald-500 text-white`}>
                            <CheckCircle2 size={16} strokeWidth={3} />
                          </div>
                        )}
                        {!e.bajarildi && isWorker && !isMonthInPast(journalMonth) && (
                          <button onClick={() => handleBajarildi(i)}
                            disabled={!e.poezdRaqami || !e.sana || !!e.bajarildi}
                            className={`w-[80px] rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-all border shadow-sm ${(!e.poezdRaqami || !e.sana) ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                            Bajarildi
                          </button>
                        )}
                        {!e.bajarildi && (!isWorker || isMonthInPast(journalMonth)) && (
                          <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border-2 border-slate-200 bg-slate-50`}></div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {isWorker && !isMonthInPast(journalMonth) && (
          <div className="mt-6 flex items-center gap-3">
            <button onClick={addRow} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95">
              <Plus size={14} strokeWidth={3} /> <span className="uppercase tracking-widest">Qator qo&apos;shish</span>
            </button>
            <button onClick={removeRow} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm active:scale-95">
              <Trash2 size={14} strokeWidth={3} /> <span className="uppercase tracking-widest">Qator o&apos;chirish</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
