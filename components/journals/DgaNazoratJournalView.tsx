'use client'

import React, { useState, useEffect, useRef } from 'react'
import { User, DgaNazoratEntry } from '@/types'
import { X, Plus, Trash2, Download } from 'lucide-react'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import { getCurrentJournalMonth, isMonthInPast } from './helpers'

// Local input component to avoid losing focus
function LocalInput({ value, onChange, className, readOnly, placeholder }: { value: string, onChange: (v: string) => void, className: string, readOnly?: boolean, placeholder?: string }) {
  const [localVal, setLocalVal] = useState(value)
  useEffect(() => { setLocalVal(value) }, [value])
  return (
    <input 
      type="text" 
      value={localVal} 
      onChange={e => setLocalVal(e.target.value)} 
      onBlur={() => { if (localVal !== value) onChange(localVal) }} 
      className={className} 
      readOnly={readOnly}
      placeholder={placeholder}
    />
  )
}

function LocalSelect({ value, onChange, className, readOnly }: { value: string, onChange: (v: string) => void, className: string, readOnly?: boolean }) {
  const [localVal, setLocalVal] = useState(value)
  useEffect(() => { setLocalVal(value) }, [value])
  return (
    <select
      value={localVal}
      onChange={(e) => {
        setLocalVal(e.target.value)
        onChange(e.target.value)
      }}
      className={className}
      disabled={readOnly}
    >
      <option value="">Tanlang</option>
      <option value="Rejali">Rejali</option>
      <option value="Rejadan tashqari">Rejadan tashqari</option>
    </select>
  )
}

const EMPTY_ENTRY = (): DgaNazoratEntry => ({
  sana: '', rejali: '', ishlaganVaqt: '', yoqilgiSarfi: '', yoqilgiIstemoli: '', imzo: '',
  bajarildi: false, bajarildiAt: ''
})

export function DgaNazoratJournalView({
  stationId,
  stationName,
  userName,
  userRole,
  journalMonth = getCurrentJournalMonth(),
  onClose,
  onAccepted
}: {
  stationId: string
  stationName: string
  userName: string
  userRole: string
  journalMonth?: string
  onClose: () => void
  onAccepted?: () => void
}) {
  const [entries, setEntries] = useState<DgaNazoratEntry[]>(Array.from({ length: 5 }, EMPTY_ENTRY))
  const [allEntries, setAllEntries] = useState<DgaNazoratEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)

  const isWorker = ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik'].includes(userRole)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const doc = await getJournal(stationId, 'dgaNazorat')
        if (doc && doc.entries?.length) {
          const parsed = doc.entries as DgaNazoratEntry[]
          setAllEntries(parsed)
          const currentMonthData = parsed.filter(e => e.journalMonth === journalMonth)
          if (currentMonthData.length > 0) {
            setEntries(currentMonthData)
          } else {
            setEntries(Array.from({ length: 5 }, EMPTY_ENTRY))
          }
        } else {
          setAllEntries([])
          setEntries(Array.from({ length: 5 }, EMPTY_ENTRY))
        }
      } catch (err) {
        console.error('DGA journal yuklash xatosi:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [stationId, journalMonth])

  async function handleSave(newEntries: DgaNazoratEntry[], isSilent = false) {
    if (!isWorker) return
    if (!isSilent) setSaving(true)
    try {
      const merged = allEntries.filter(e => e.journalMonth !== journalMonth)
      const toSave = newEntries.map(e => ({ ...e, journalMonth }))
      const finalEntries = [...merged, ...toSave]
      setAllEntries(finalEntries)

      await upsertJournal(stationId, 'dgaNazorat', finalEntries as any, userName)
      if (!isSilent) {
        setMsg('Saqlandi! ✅')
        setTimeout(() => setMsg(''), 2000)
      }
    } catch (e: any) {
      console.warn('DGA save error:', e?.message)
    } finally {
      if (!isSilent) setSaving(false)
    }
  }

  const updateEntry = (index: number, field: keyof DgaNazoratEntry, value: string) => {
    if (!isWorker) return
    const newEntries = [...entries]
    const row = { ...newEntries[index] }
    if (row.imzo) return // Imzolangan bo'lsa o'zgartirib bo'lmaydi
    ;(row as any)[field] = value
    newEntries[index] = row
    setEntries(newEntries)
    handleSave(newEntries, true)
  }

  const handleBajarildi = (index: number) => {
    if (!isWorker) return
    const newEntries = [...entries]
    const row = { ...newEntries[index] }
    row.bajarildi = true
    row.bajarildiAt = new Date().toISOString()
    row.imzo = userName
    newEntries[index] = row
    setEntries(newEntries)
    if (onAccepted) onAccepted()
    handleSave(newEntries, true)
  }

  const addRow = () => {
    if (!isWorker) return
    const newEntries = [...entries, EMPTY_ENTRY()]
    setEntries(newEntries)
  }

  const removeRow = () => {
    if (!isWorker) return
    if (entries.length <= 1) return
    const last = entries[entries.length - 1]
    if (last.imzo) return
    const newEntries = entries.slice(0, -1)
    setEntries(newEntries)
    handleSave(newEntries, true)
  }

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF('p', 'mm', 'a4')
    doc.setFontSize(14)
    doc.text(`Dizel generatorlarini ishlashini nazorat qilish jurnali (NSH-01 18.3.1)`, 105, 15, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Bekat: ${stationName} | Oy: ${journalMonth}`, 14, 25)

    const tableData = entries.map(e => [
      e.sana,
      e.rejali,
      e.ishlaganVaqt,
      e.yoqilgiSarfi,
      e.yoqilgiIstemoli,
      e.imzo
    ])

    autoTable(doc, {
      startY: 30,
      head: [['Kun', 'Rejali / Rejadan tashqari', 'DGA ishlagan vaqti', "Diz Yoqilg'i Sarfi (M.S)", "Yonilg'i istemoli L", 'Imzo']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle' },
      theme: 'grid'
    })
    doc.save(`DgaNazorat_${stationName}_${journalMonth}.pdf`)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-6xl rounded-3xl bg-white p-8 shadow-2xl flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600 mb-4"></div>
          <p className="text-slate-500 font-medium">Jurnal yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 p-2 sm:p-6 backdrop-blur-sm transition-all duration-300">
      <div className="flex h-[95vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-[24px] bg-slate-50 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur px-6 py-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">DGA ishlashini nazorat qilish jurnali</h2>
            <p className="text-sm font-medium text-slate-500 mt-0.5">{stationName} · {journalMonth}</p>
          </div>
          <div className="flex items-center gap-3">
            {msg && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg animate-fade-in">{msg}</span>}
            {saving && <span className="text-xs font-bold text-slate-400 flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" /> Saqlanmoqda...</span>}
            <button onClick={exportPDF} className="flex items-center gap-2 rounded-xl bg-purple-50 text-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-100 transition-colors">
              <Download size={16} /> PDF
            </button>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 relative">
          <div className="mb-4 text-center">
             <h3 className="font-bold text-lg">Texnologik jarayon №68 NSH-01 18.3.1</h3>
             <h4 className="font-bold text-md">Dizel generatorlarini ishlashini nazorat qilish jurnali</h4>
             <p className="text-sm">Bajarilish muddati: 4 xaftada bir marotaba.</p>
          </div>
          
          <table className="w-full border-collapse bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-xl">
            <thead>
              <tr className="bg-slate-50 text-[10px] sm:text-xs font-black text-slate-500 border-b border-slate-200">
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Kun</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Rejali /<br/>Rejadan tashqari</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">DGA<br/>Ishlagan vaqti</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Diz Yoqilg&apos;i<br/>Sarfi (M.S)</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Yonilg&apos;i<br/>istemoli L</th>
                <th className="p-2 sm:p-3 text-center">Imzo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {entries.map((e, i) => {
                const disabled = !isWorker || isMonthInPast(journalMonth) || !!e.imzo
                const inputClass = "w-full border-0 bg-transparent p-2 text-center focus:ring-2 focus:ring-inset focus:ring-purple-500 disabled:opacity-70 disabled:bg-slate-50 transition-all font-medium text-slate-700"
                const selectClass = "w-full border-0 bg-transparent p-2 text-center focus:ring-2 focus:ring-inset focus:ring-purple-500 disabled:opacity-70 disabled:bg-slate-50 transition-all font-medium text-slate-700 text-xs sm:text-sm"
                
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="border-r border-slate-100 p-0 text-center w-[100px]">
                      <LocalInput className={inputClass} value={e.sana} onChange={(val: string) => updateEntry(i, 'sana', val)} readOnly={disabled} placeholder="Sana" />
                    </td>
                    <td className="border-r border-slate-100 p-0 text-center w-[160px]">
                      <LocalSelect className={selectClass} value={e.rejali} onChange={(val: string) => updateEntry(i, 'rejali', val)} readOnly={disabled} />
                    </td>
                    <td className="border-r border-slate-100 p-0 text-center w-[140px]">
                      <LocalInput className={inputClass} value={e.ishlaganVaqt} onChange={(val: string) => updateEntry(i, 'ishlaganVaqt', val)} readOnly={disabled} placeholder="Masalan: 2 soat" />
                    </td>
                    <td className="border-r border-slate-100 p-0 text-center w-[140px]">
                      <LocalInput className={inputClass} value={e.yoqilgiSarfi} onChange={(val: string) => updateEntry(i, 'yoqilgiSarfi', val)} readOnly={disabled} placeholder="M.S" />
                    </td>
                    <td className="border-r border-slate-100 p-0 text-center w-[140px]">
                      <LocalInput className={inputClass} value={e.yoqilgiIstemoli} onChange={(val: string) => updateEntry(i, 'yoqilgiIstemoli', val)} readOnly={disabled} placeholder="Litr" />
                    </td>
                    <td className="p-0 text-center w-[120px]">
                      {e.imzo ? (
                        <div className="p-2 text-xs font-black text-emerald-600 bg-emerald-50 rounded mx-1">{e.imzo}</div>
                      ) : isWorker && !isMonthInPast(journalMonth) ? (
                        <button 
                          onClick={() => handleBajarildi(i)} 
                          disabled={!e.sana || !e.rejali || !e.ishlaganVaqt || !e.yoqilgiSarfi || !e.yoqilgiIstemoli}
                          className={`w-full h-full min-h-[44px] bg-slate-50 text-[10px] font-bold transition-colors ${(!e.sana || !e.rejali || !e.ishlaganVaqt || !e.yoqilgiSarfi || !e.yoqilgiIstemoli) ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
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

        {isWorker && (
          <div className="border-t border-slate-200/60 bg-white/80 px-6 py-4 backdrop-blur flex items-center justify-between">
            <div className="flex gap-3">
              <button onClick={addRow} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95">
                <Plus size={14} strokeWidth={3} /> <span className="uppercase tracking-widest hidden sm:inline">Qator qo&apos;shish</span>
              </button>
              <button onClick={removeRow} className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/50 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm active:scale-95">
                <Trash2 size={14} strokeWidth={3} /> <span className="uppercase tracking-widest hidden sm:inline">Qator o&apos;chirish</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
