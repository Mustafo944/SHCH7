/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import type { MpsFriksionEntry } from '@/types'
import { Plus, Trash2, Download, X } from 'lucide-react'
import { getCurrentJournalMonth, isMonthInPast } from './helpers'

const EMPTY_MPS_FRIKSION = (): MpsFriksionEntry => ({
  sana: '', strRaqami: '', normalTokPlus: '', normalTokMinus: '',
  friksionTokPlus: '', friksionTokMinus: '', izox: '', imzo: '',
  bajarildi: false, bajarildiAt: '',
})

export function MpsFriksionJournalView({
  stationId,
  stationName,
  userName,
  userRole,
  journalMonth = getCurrentJournalMonth(),
  onClose,
  onAccepted,
}: {
  stationId: string
  stationName: string
  userName: string
  userRole: string
  journalMonth?: string
  onClose: () => void
  onAccepted?: () => void
}) {
  const [entries, setEntries] = useState<MpsFriksionEntry[]>(Array.from({ length: 5 }, EMPTY_MPS_FRIKSION))
  const [allEntries, setAllEntries] = useState<MpsFriksionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const isWorker = ['worker', 'elektromexanik', 'elektromontyor'].includes(userRole)

  useEffect(() => {
    setLoading(true)
    getJournal(stationId, 'mpsFriksion').then(doc => {
      if (doc?.entries?.length) {
        const parsed = doc.entries as MpsFriksionEntry[]
        setAllEntries(parsed)
        const filtered = parsed.filter(e => e.journalMonth === journalMonth)
        if (filtered.length > 0) setEntries(filtered)
        else setEntries(Array.from({ length: 5 }, EMPTY_MPS_FRIKSION))
      } else {
        setAllEntries([])
        setEntries(Array.from({ length: 5 }, EMPTY_MPS_FRIKSION))
      }
    }).finally(() => setLoading(false))
  }, [stationId, journalMonth])

  const handleSave = async (data: MpsFriksionEntry[], isSilent = false): Promise<boolean> => {
    if (!isSilent) setSaving(true)
    try {
      const merged = allEntries.filter(e => e.journalMonth !== journalMonth)
      const toSave = data.map(e => ({ ...e, journalMonth }))
      const finalEntries = [...merged, ...toSave]
      setAllEntries(finalEntries)

      await upsertJournal(stationId, 'mpsFriksion', finalEntries as any, userName)
      if (!isSilent) {
        setMsg('Saqlandi! ✅')
        setTimeout(() => setMsg(null), 2000)
      }
      return true
    } catch (e: any) {
      // Barcha xatolarni jimgina o'tkazib yuboramiz - foydalanuvchini bezovta qilmaymiz
      console.warn('Journal save error:', e?.message)
      return false
    } finally {
      if (!isSilent) setSaving(false)
    }
  }

  const updateEntry = (idx: number, field: keyof MpsFriksionEntry, val: any) => {
    if (!isWorker) return
    const n = [...entries]
    const row = { ...n[idx] }
    if (row.imzo && field !== 'imzo') return
    ;(row as any)[field] = val
    n[idx] = row
    setEntries(n)
    
    if ((window as any).mpsFriksionSaveTimeout) clearTimeout((window as any).mpsFriksionSaveTimeout)
    ;(window as any).mpsFriksionSaveTimeout = setTimeout(() => handleSave(n, true), 1500)
  }

  const handleBajarildi = (idx: number) => {
    if (!isWorker) return
    const n = [...entries]
    const row = { ...n[idx] }
    row.imzo = userName
    row.bajarildi = true
    row.bajarildiAt = new Date().toISOString()
    n[idx] = row
    setEntries(n)
    // Optimistic UI - avval ko'rsatamiz, keyin saqlaymiz (silent)
    handleSave(n, true).then((success) => { if (success && onAccepted) onAccepted() })
  }

  const addRow = () => { if (!isWorker) return; const n = [...entries, EMPTY_MPS_FRIKSION()]; setEntries(n); }
  const removeRow = () => { if (!isWorker || entries.length <= 1) return; const last = entries[entries.length - 1]; if (last.imzo) return; const n = entries.slice(0, -1); setEntries(n); handleSave(n, true); }

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(13)
    doc.text(`MPS elektrodvigatellarni friksion toki - ${stationName} - ${journalMonth}`, 14, 15)
    autoTable(doc, {
      startY: 22,
      head: [
        [
          { content: 'Sana', rowSpan: 2 },
          { content: 'Str. №', rowSpan: 2 },
          { content: 'Normal o\'tishdagi tok (+:-)', colSpan: 2 },
          { content: 'Friksiyaga ishlaganda tok (+:-)', colSpan: 2 },
          { content: 'Izox', rowSpan: 2 },
          { content: 'Imzo', rowSpan: 2 }
        ],
        ['+', '-', '+', '-']
      ],
      body: entries.map(e => [e.sana, e.strRaqami, e.normalTokPlus, e.normalTokMinus, e.friksionTokPlus, e.friksionTokMinus, e.izox, e.imzo]),
      styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle' },
      theme: 'grid',
    })
    doc.save(`MpsFriksion_${stationName}_${journalMonth}.pdf`)
  }

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="rounded-3xl bg-white p-10 shadow-2xl flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
        <p className="text-slate-500 font-medium">Yuklanmoqda...</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="flex h-[95vh] w-full max-w-[1300px] flex-col overflow-hidden rounded-[24px] bg-slate-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur px-4 sm:px-6 py-4">
          <div className="min-w-0 pr-4">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 truncate">MPS elektrodvigatellarni friksion tokini o&apos;lchash</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">{stationName} • {journalMonth} • NSH-01 9.1.4</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {msg && <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm ${msg.startsWith('Xato') ? 'text-red-600 bg-red-50 border border-red-100' : 'text-emerald-600 bg-emerald-50 border border-emerald-100'}`}>{msg}</span>}
            {saving && <span className="text-xs font-bold text-slate-400 flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" /> <span className="hidden sm:inline">Saqlanmoqda...</span></span>}
            <button onClick={exportPDF} className="flex items-center gap-2 rounded-xl bg-purple-50 text-purple-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold hover:bg-purple-100 transition-colors"><Download size={16} /> <span className="hidden sm:inline">PDF</span></button>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors"><X size={20} className="sm:w-6 sm:h-6" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 text-center">
            <h3 className="font-bold text-lg">Texnologik jarayon №20. 9.1.4</h3>
            <h4 className="font-bold">MSP turidagi elektrodvigatellarni friksion tokini o&apos;lchash</h4>
            <p className="text-sm text-slate-500">Bajarilish muddati: 3 oyda bir marotaba yoki el. o&apos;tkazgich, friksion baraban va dvigatellar almashtirilganda.</p>
          </div>
          <div className="overflow-x-auto pb-4">
            <table className="w-full min-w-[800px] border-collapse bg-white shadow-sm ring-1 ring-slate-200 rounded-xl">
            <thead>
              <tr className="bg-purple-50 text-[10px] font-black uppercase text-purple-700 border-b border-slate-200">
                <th rowSpan={2} className="border-r border-slate-200 p-2 text-center align-middle">Sana</th>
                <th rowSpan={2} className="border-r border-slate-200 p-2 text-center align-middle">Str. №</th>
                <th colSpan={2} className="border-b border-r border-slate-200 p-2 text-center">Normal o&apos;tishdagi tok (+:-)</th>
                <th colSpan={2} className="border-b border-r border-slate-200 p-2 text-center">Friksiyaga ishlaganda tok (+:-)</th>
                <th rowSpan={2} className="border-r border-slate-200 p-2 text-center align-middle">Izox</th>
                <th rowSpan={2} className="p-2 text-center align-middle">Imzo</th>
              </tr>
              <tr className="bg-purple-50 text-[10px] font-black uppercase text-purple-700 border-b border-slate-200">
                <th className="border-r border-slate-200 p-2 text-center text-lg leading-none">+</th>
                <th className="border-r border-slate-200 p-2 text-center text-lg leading-none">-</th>
                <th className="border-r border-slate-200 p-2 text-center text-lg leading-none">+</th>
                <th className="border-r border-slate-200 p-2 text-center text-lg leading-none">-</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {entries.map((e, i) => {
                const isPast = isMonthInPast(journalMonth)
                const dis = !isWorker || isPast || !!e.imzo
                const ic = "w-full border-0 bg-transparent p-2 text-center focus:ring-2 focus:ring-inset focus:ring-purple-500 disabled:opacity-60 disabled:bg-slate-50 transition-all font-medium text-slate-700"
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="border-r border-slate-100 p-0 w-[100px]"><input type="text" className={ic} value={e.sana} onChange={ev => updateEntry(i, 'sana', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[50px]"><input type="text" className={ic} value={e.strRaqami} onChange={ev => updateEntry(i, 'strRaqami', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[100px]"><input type="text" className={ic} value={e.normalTokPlus} onChange={ev => updateEntry(i, 'normalTokPlus', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[100px]"><input type="text" className={ic} value={e.normalTokMinus} onChange={ev => updateEntry(i, 'normalTokMinus', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[100px]"><input type="text" className={ic} value={e.friksionTokPlus} onChange={ev => updateEntry(i, 'friksionTokPlus', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[100px]"><input type="text" className={ic} value={e.friksionTokMinus} onChange={ev => updateEntry(i, 'friksionTokMinus', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[120px]"><input type="text" className={ic} value={e.izox} onChange={ev => updateEntry(i, 'izox', ev.target.value)} disabled={dis} /></td>
                    <td className="p-0 text-center w-[120px]">
                      {e.imzo ? (
                        <div className="p-2 text-xs font-black text-emerald-600 bg-emerald-50 rounded mx-1">{e.imzo}</div>
                      ) : isWorker && !isMonthInPast(journalMonth) ? (
                        <button 
                          onClick={() => handleBajarildi(i)} 
                          disabled={!e.sana}
                          className={`w-full min-h-[36px] bg-slate-50 text-[10px] font-bold transition-colors ${!e.sana ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                        >
                          Bajarildi
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>

        {isWorker && !isMonthInPast(journalMonth) && (
          <div className="border-t border-slate-200/60 bg-white/80 px-6 py-4 flex gap-3">
            <button onClick={addRow} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"><Plus size={14} strokeWidth={3} /><span className="uppercase tracking-widest">Qator qo&apos;shish</span></button>
            <button onClick={removeRow} className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/50 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-all shadow-sm"><Trash2 size={14} strokeWidth={3} /><span className="uppercase tracking-widest">Qator o&apos;chirish</span></button>
          </div>
        )}
      </div>
    </div>
  )
}
