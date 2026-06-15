/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import type { AlsnKodEntry } from '@/types'
import { Plus, Trash2, Download, X } from 'lucide-react'
import { getCurrentJournalMonth, isMonthInPast } from './helpers'

const LocalInput = ({ value, onChange, readOnly, className, placeholder }: any) => {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])
  return (
    <input
      type="text"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== value) onChange(val) }}
      disabled={readOnly}
      className={className}
      placeholder={placeholder}
    />
  )
}

const EMPTY_ALSN_KOD = (): AlsnKodEntry => ({
  sana: '', rzNomi: '', rzUzunligi: '', juftYonalish: '',
  toqYonalish: '', izox: '', imzo: '',
  bajarildi: false, bajarildiAt: '',
})

export function AlsnKodJournalView({
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
  const [entries, setEntries] = useState<AlsnKodEntry[]>(Array.from({ length: 5 }, EMPTY_ALSN_KOD))
  const [allEntries, setAllEntries] = useState<AlsnKodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const isWorker = ['worker', 'elektromexanik', 'elektromontyor'].includes(userRole)

  useEffect(() => {
    setLoading(true)
    getJournal(stationId, 'alsnKod').then(doc => {
      if (doc?.entries?.length) {
        const parsed = doc.entries as AlsnKodEntry[]
        setAllEntries(parsed)
        const filtered = parsed.filter(e => e.journalMonth === journalMonth)
        if (filtered.length > 0) setEntries(filtered)
        else setEntries(Array.from({ length: 5 }, EMPTY_ALSN_KOD))
      } else {
        setAllEntries([])
        setEntries(Array.from({ length: 5 }, EMPTY_ALSN_KOD))
      }
    }).finally(() => setLoading(false))
  }, [stationId, journalMonth])

  const handleSave = async (data: AlsnKodEntry[], isSilent = false) => {
    if (!isSilent) setSaving(true)
    try {
      const merged = allEntries.filter(e => e.journalMonth !== journalMonth)
      const toSave = data.map(e => ({ ...e, journalMonth }))
      const finalEntries = [...merged, ...toSave]
      setAllEntries(finalEntries)

      await upsertJournal(stationId, 'alsnKod', finalEntries as any, userName)
      if (!isSilent) {
        setMsg('Saqlandi! ✅')
        setTimeout(() => setMsg(null), 2000)
      }
    } catch (e: any) {
      console.warn('AlsnKod save error:', e?.message)
    } finally {
      if (!isSilent) setSaving(false)
    }
  }

  const updateEntry = (idx: number, field: keyof AlsnKodEntry, val: any) => {
    if (!isWorker) return
    const n = [...entries]
    const row = { ...n[idx] }
    if (row.imzo && field !== 'imzo') return
    ;(row as any)[field] = val
    n[idx] = row
    setEntries(n)
    if ((window as any).alsnSaveTimeout) clearTimeout((window as any).alsnSaveTimeout)
    ;(window as any).alsnSaveTimeout = setTimeout(() => handleSave(n, true), 1500)
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
    handleSave(n, true).then(() => { if (onAccepted) onAccepted() })
  }

  const addRow = () => { if (!isWorker) return; const n = [...entries, EMPTY_ALSN_KOD()]; setEntries(n); }
  const removeRow = () => { if (!isWorker || entries.length <= 1) return; const last = entries[entries.length - 1]; if (last.imzo) return; const n = entries.slice(0, -1); setEntries(n); handleSave(n, true); }

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(13)
    doc.text(`ALSN kodlarini o'lchash - ${stationName} - ${journalMonth}`, 14, 15)
    autoTable(doc, {
      startY: 22,
      head: [['Sana', 'R/Z nomi', 'R/Z uzunligi', 'Juft yo\'nalish (A)', 'Toq Yo\'nalish (A)', 'Izox', 'Imzo']],
      body: entries.map(e => [e.sana, e.rzNomi, e.rzUzunligi, e.juftYonalish, e.toqYonalish, e.izox, e.imzo]),
      styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', halign: 'center' },
      theme: 'grid',
    })
    doc.save(`AlsnKod_${stationName}_${journalMonth}.pdf`)
  }

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="rounded-3xl bg-white p-10 shadow-2xl flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-slate-500 font-medium">Yuklanmoqda...</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="flex h-[95vh] w-full max-w-[1300px] flex-col overflow-hidden rounded-[24px] bg-slate-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur px-6 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">ALSN kodlarini o&apos;lchash</h2>
            <p className="text-sm text-slate-500 mt-0.5">{stationName} • {journalMonth} • NSH-01 10.4</p>
          </div>
          <div className="flex items-center gap-3">
            {msg && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">{msg}</span>}
            {saving && <span className="text-xs font-bold text-slate-400 flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" /> Saqlanmoqda...</span>}
            <button onClick={exportPDF} className="flex items-center gap-2 rounded-xl bg-blue-50 text-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-100 transition-colors"><Download size={16} /> PDF</button>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors"><X size={24} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 text-center">
            <h3 className="font-bold text-lg">Texnologik jarayon №33. 10.4</h3>
            <h4 className="font-bold">ALSN kodlarini o&apos;lchash</h4>
            <p className="text-sm text-slate-500">Bajarilish muddati: 3 oyda bir marotaba.</p>
          </div>
          <table className="w-full border-collapse bg-white shadow-sm ring-1 ring-slate-200 rounded-xl">
            <thead>
              <tr className="bg-blue-50 text-[10px] font-black uppercase text-blue-700 border-b border-slate-200">
                <th className="border-r border-slate-200 p-3 text-center">Sana</th>
                <th className="border-r border-slate-200 p-3 text-center">R/Z nomi</th>
                <th className="border-r border-slate-200 p-3 text-center">R/Z uzunligi</th>
                <th className="border-r border-slate-200 p-3 text-center">Juft yo&apos;nalish (A)</th>
                <th className="border-r border-slate-200 p-3 text-center">Toq Yo&apos;nalish (A)</th>
                <th className="border-r border-slate-200 p-3 text-center">Izox</th>
                <th className="p-3 text-center">Imzo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {entries.map((e, i) => {
                const isPast = isMonthInPast(journalMonth)
                const dis = !isWorker || isPast || !!e.imzo
                const ic = "w-full border-0 bg-transparent p-2 text-center focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-50 transition-all font-medium text-slate-700"
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="border-r border-slate-100 p-0 w-[110px]"><LocalInput className={ic} value={e.sana} onChange={(val: string) => updateEntry(i, 'sana', val)} readOnly={dis} /></td>
                    <td className="border-r border-slate-100 p-0"><LocalInput className={ic} value={e.rzNomi} onChange={(val: string) => updateEntry(i, 'rzNomi', val)} readOnly={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[120px]"><LocalInput className={ic} value={e.rzUzunligi} onChange={(val: string) => updateEntry(i, 'rzUzunligi', val)} readOnly={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[120px]"><LocalInput className={ic} value={e.juftYonalish} onChange={(val: string) => updateEntry(i, 'juftYonalish', val)} readOnly={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[120px]"><LocalInput className={ic} value={e.toqYonalish} onChange={(val: string) => updateEntry(i, 'toqYonalish', val)} readOnly={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[150px]"><LocalInput className={ic} value={e.izox} onChange={(val: string) => updateEntry(i, 'izox', val)} readOnly={dis} /></td>
                    <td className="p-0 text-center w-[150px]">
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
