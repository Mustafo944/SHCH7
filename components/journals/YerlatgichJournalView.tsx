/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import type { YerlatgichEntry } from '@/types'
import { Plus, Trash2, Download, X } from 'lucide-react'
import { getCurrentJournalMonth, isMonthInPast } from './helpers'
import { DateInput, TimeInput } from './JournalSelectModal'

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

const EMPTY_YERLATGICH = (): YerlatgichEntry => ({
  sana: '', kuchlanishNomi: '', olchanganQiymat: '', imzo: '',
  sana2: '', olchanganQiymat2: '', imzo2: '',
  bajarildi: false, bajarildiAt: '',
})

export function YerlatgichJournalView({
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
  const [entries, setEntries] = useState<YerlatgichEntry[]>(Array.from({ length: 5 }, EMPTY_YERLATGICH))
  const [allEntries, setAllEntries] = useState<YerlatgichEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isWorker = ['worker', 'elektromexanik', 'elektromontyor'].includes(userRole)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const doc = await getJournal(stationId, 'yerlatgich')
        if (doc && doc.entries?.length) {
          const parsed = doc.entries as YerlatgichEntry[]
          setAllEntries(parsed)
          const currentMonthData = parsed.filter(e => e.journalMonth === journalMonth)
          if (currentMonthData.length > 0) {
            setEntries(currentMonthData)
          } else {
            setEntries(Array.from({ length: 5 }, EMPTY_YERLATGICH))
          }
        } else {
          setAllEntries([])
          setEntries(Array.from({ length: 5 }, EMPTY_YERLATGICH))
        }
      } catch (err) {
        console.error('Yerlatgich journal yuklash xatosi:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [stationId, journalMonth])

  async function handleSave(newEntries: YerlatgichEntry[], isSilent = false) {
    if (!isWorker) return
    if (!isSilent) setSaving(true)
    try {
      const merged = allEntries.filter(e => e.journalMonth !== journalMonth)
      const toSave = newEntries.map(e => ({ ...e, journalMonth }))
      const finalEntries = [...merged, ...toSave]
      setAllEntries(finalEntries)

      await upsertJournal(stationId, 'yerlatgich', finalEntries as any, userName)
      if (!isSilent) {
        setMsg('Saqlandi! ✅')
        setTimeout(() => setMsg(null), 2000)
      }
    } catch (e: any) {
      console.warn('Yerlatgich save error:', e?.message)
    } finally {
      if (!isSilent) setSaving(false)
    }
  }

  const updateEntry = (idx: number, field: keyof YerlatgichEntry, val: any) => {
    if (!isWorker) return
    const n = [...entries]
    const row = { ...n[idx] }
    
    if ((field === 'sana' || field === 'kuchlanishNomi' || field === 'olchanganQiymat') && row.imzo) return
    if ((field === 'sana2' || field === 'olchanganQiymat2') && row.imzo2) return

    ;(row as any)[field] = val
    n[idx] = row
    setEntries(n)
    handleSave(n, true)
  }

  const handleBajarildi = (idx: number, isRightSide: boolean) => {
    if (!isWorker) return
    const n = [...entries]
    const row = { ...n[idx] }
    if (isRightSide) {
      row.imzo2 = userName
    } else {
      row.imzo = userName
    }
    row.bajarildi = true
    row.bajarildiAt = new Date().toISOString()
    n[idx] = row
    setEntries(n)
    handleSave(n, true).then(() => {
      if (onAccepted) onAccepted()
    })
  }

  const addRow = () => {
    if (!isWorker) return
    const n = [...entries, EMPTY_YERLATGICH()]
    setEntries(n)
  }

  const removeRow = () => {
    if (!isWorker) return
    if (entries.length <= 1) return
    const last = entries[entries.length - 1]
    if (last.imzo || last.imzo2) return // Imzolangan qatorni o'chirmaslik
    const n = entries.slice(0, -1)
    setEntries(n)
    handleSave(n, true)
  }

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF('p', 'mm', 'a4')

    const tableData = entries.map(e => [
      e.sana || '',
      e.kuchlanishNomi || '',
      e.olchanganQiymat || '',
      e.imzo || '',
      e.sana2 || '',
      e.olchanganQiymat2 || '',
      e.imzo2 || ''
    ])

    doc.setFontSize(14)
    doc.text(`Yerlatgich xabarlagichi yordamida montaj izolyatsiya qarshiligini o'lchash (NSH-01 17.1.8)`, 105, 15, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Bekat: ${stationName} | Oy: ${journalMonth}`, 14, 25)

    autoTable(doc, {
      startY: 30,
      head: [[
        'Sana',
        'Kuchlanish nomi',
        'O\'lchangan qiymat',
        'Imzo',
        'Sana',
        'O\'lchangan qiymat',
        'Imzo'
      ]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle' },
      theme: 'grid',
    })

    doc.save(`Yerlatgich_${stationName}_${journalMonth}.pdf`)
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6">
      <div className="flex h-[95vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-[24px] bg-slate-50 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur px-6 py-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Yerlatgich xabarlagichi jurnali</h2>
            <p className="text-sm font-medium text-slate-500 mt-0.5">{stationName} • {journalMonth}</p>
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
             <h3 className="font-bold text-lg">Texnologik jarayon №53. 17.1.8</h3>
             <h4 className="font-bold text-md">Yerlatgich xabarlagichi yordamida montaj izolyatsiya qarshiligini o&apos;lchash (NSH-01 17.1.8)</h4>
             <p className="text-sm">Bajarilish muddati: Xaftasiga bir marotaba yoki xar navbatchilik boshlanishida.</p>
          </div>
          
          <table className="w-full border-collapse bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-xl">
            <thead>
              <tr className="bg-slate-50 text-[10px] sm:text-xs font-black uppercase text-slate-500 border-b border-slate-200">
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Sana</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Kuchlanish nomi</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">O&apos;lchangan qiymat</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Imzo (ShN ShNM)</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Sana</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">O&apos;lchangan qiymat</th>
                <th className="p-2 sm:p-3 text-center">Imzo (ShN ShNM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {entries.map((e, i) => {
                const leftDisabled = !isWorker || isMonthInPast(journalMonth) || !!e.imzo
                const rightDisabled = !isWorker || isMonthInPast(journalMonth) || !!e.imzo2
                const inputClass = "w-full border-0 bg-transparent p-2 text-center focus:ring-2 focus:ring-inset focus:ring-purple-500 disabled:opacity-70 disabled:bg-slate-50 transition-all font-medium text-slate-700"
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="border-r border-slate-100 p-0 text-center w-[120px]">
                      <LocalInput className={inputClass} value={e.sana} onChange={(val: string) => updateEntry(i, 'sana', val)} readOnly={leftDisabled} placeholder="Sana" />
                    </td>
                    <td className="border-r border-slate-100 p-0 text-center">
                      <LocalInput className={inputClass} value={e.kuchlanishNomi} onChange={(val: string) => updateEntry(i, 'kuchlanishNomi', val)} readOnly={leftDisabled} />
                    </td>
                    <td className="border-r border-slate-100 p-0 text-center w-[150px]">
                      <LocalInput className={inputClass} value={e.olchanganQiymat} onChange={(val: string) => updateEntry(i, 'olchanganQiymat', val)} readOnly={leftDisabled} />
                    </td>
                    <td className="border-r border-slate-100 p-0 text-center w-[150px]">
                      {e.imzo ? (
                        <div className="p-2 text-xs font-black text-emerald-600 bg-emerald-50 rounded mx-1">{e.imzo}</div>
                      ) : isWorker && !isMonthInPast(journalMonth) ? (
                        <button 
                          onClick={() => handleBajarildi(i, false)} 
                          disabled={!e.sana || !e.kuchlanishNomi || !e.olchanganQiymat}
                          className={`w-full h-full min-h-[36px] bg-slate-50 text-[10px] font-bold transition-colors ${(!e.sana || !e.kuchlanishNomi || !e.olchanganQiymat) ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                        >
                          Bajarildi
                        </button>
                      ) : null}
                    </td>
                    <td className="border-r border-slate-100 p-0 text-center w-[120px] bg-slate-50/50">
                      <LocalInput className={inputClass} value={e.sana2} onChange={(val: string) => updateEntry(i, 'sana2', val)} readOnly={rightDisabled} placeholder="Sana" />
                    </td>
                    <td className="border-r border-slate-100 p-0 text-center w-[150px] bg-slate-50/50">
                      <LocalInput className={inputClass} value={e.olchanganQiymat2} onChange={(val: string) => updateEntry(i, 'olchanganQiymat2', val)} readOnly={rightDisabled} />
                    </td>
                    <td className="p-0 text-center w-[150px]">
                      {e.imzo2 ? (
                        <div className="p-2 text-xs font-black text-emerald-600 bg-emerald-50 rounded mx-1">{e.imzo2}</div>
                      ) : isWorker && !isMonthInPast(journalMonth) ? (
                        <button 
                          onClick={() => handleBajarildi(i, true)} 
                          disabled={!e.sana2 || !e.olchanganQiymat2}
                          className={`w-full h-full min-h-[36px] bg-slate-50 text-[10px] font-bold transition-colors ${(!e.sana2 || !e.olchanganQiymat2) ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
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
