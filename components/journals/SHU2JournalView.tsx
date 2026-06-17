/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import type { SHU2Entry } from '@/types'
import { Plus, Trash2, CheckCircle2, Download, ChevronLeft } from 'lucide-react'
import { getCurrentJournalMonth, isMonthInPast } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const LocalTextarea = ({ value, onChange, readOnly, className, rows, spellCheck, lang }: any) => {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])

  useEffect(() => {
    if (val !== value) {
      const timer = setTimeout(() => onChange(val), 50)
      return () => clearTimeout(timer)
    }
  }, [val, value, onChange])

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

  useEffect(() => {
    if (val !== value) {
      const timer = setTimeout(() => onChange(val), 50)
      return () => clearTimeout(timer)
    }
  }, [val, value, onChange])

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

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY ENTRY FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

const EMPTY_SHU2 = (): SHU2Entry => ({
  nomber: '',
  sana: '', yozuv: '', imzo: '',
  tasdiqlandi: false,
  tasdiqlaganImzo: '',
  yuborildi: false,
  dispetcherQabulQildi: false,
})

// ═══════════════════════════════════════════════════════════════════════════════
// SHU-2 JURNAL KO'RINISHI
// ═══════════════════════════════════════════════════════════════════════════════

export function SHU2JournalView({
  stationId,
  stationName,
  userName,
  userRole,
  journalMonth = getCurrentJournalMonth(),
  onClose,
  onAccepted,
  initialData,
}: {
  stationId: string
  stationName: string
  userName: string
  userRole: string
  journalMonth?: string
  onClose: () => void
  onAccepted?: () => void
  initialData?: { text: string; date: string }
}) {
  const [entries, setEntries] = useState<SHU2Entry[]>(Array.from({ length: 7 }, (_, i) => ({ ...EMPTY_SHU2(), nomber: String(i + 1) })))
  const [allEntries, setAllEntries] = useState<SHU2Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [initialDataApplied, setInitialDataApplied] = useState(false)

  const isWorker = ['worker', 'elektromexanik', 'elektromontyor'].includes(userRole)
  const isDispatcher = userRole === 'dispatcher'

  const loadJournalData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const j = await getJournal(stationId, 'shu2')
      if (j && j.entries.length > 0) {
        const loadedAllEntries = j.entries as SHU2Entry[]
        setAllEntries(loadedAllEntries)
        
        const monthEntries = loadedAllEntries.filter(e => e.journalMonth === journalMonth)
        
        if (monthEntries.length > 0) {
          setEntries(prev => {
            const merged = [...monthEntries]
            for (let i = 0; i < Math.max(merged.length, prev.length); i++) {
              const dbRow = merged[i]
              const localRow = prev[i]
              if (!dbRow && localRow) {
                merged.push(localRow)
              } else if (dbRow && localRow) {
                if ((localRow.sana || localRow.yozuv) && !localRow.tasdiqlandi && !dbRow.tasdiqlandi) {
                  merged[i] = localRow
                }
              }
            }
            return merged
          })
        } else {
          setEntries(prev => {
            const hasLocalEdits = prev.some(p => (p.sana || p.yozuv) && !p.tasdiqlandi)
            if (hasLocalEdits && prev.length > 0) return prev
            return Array.from({ length: 7 }, (_, i) => ({ ...EMPTY_SHU2(), nomber: String(i + 1) }))
          })
        }
      } else {
        setAllEntries([])
        setEntries(prev => {
          const hasLocalEdits = prev.some(p => (p.sana || p.yozuv) && !p.tasdiqlandi)
          if (hasLocalEdits && prev.length > 0) return prev
          return Array.from({ length: 7 }, (_, i) => ({ ...EMPTY_SHU2(), nomber: String(i + 1) }))
        })
      }
    } catch (err) {
      console.error('❌ SHU-2 journal yuklash xatosi:', err)
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
            channelName: `journal_shu2_${userRole}_${stationId}_${journalMonth}`,
            table: 'station_journals',
            filter: `station_id=eq.${stationId}`,
            onEvent: () => loadJournalData(true),
          },
        ]
      : [],
    !!stationId && !!journalMonth
  )

  // Apply initialData if present
  useEffect(() => {
    if (initialData && !initialDataApplied && !loading) {
      const firstEmptyIdx = entries.findIndex(e => !e.sana && !e.yozuv && !e.tasdiqlandi && !e.yuborildi)
      if (firstEmptyIdx !== -1) {
        const newEntries = [...entries]
        newEntries[firstEmptyIdx] = {
          ...newEntries[firstEmptyIdx],
          sana: initialData.date,
          yozuv: initialData.text,
        }
        setEntries(newEntries)
      } else {
        const newRow: SHU2Entry = {
          ...EMPTY_SHU2(),
          nomber: String(entries.length + 1),
          sana: initialData.date,
          yozuv: initialData.text
        }
        setEntries([...entries, newRow])
      }
      setInitialDataApplied(true)
      setMsg('Ma\'lumotlar avtomatik to\'ldirildi')
      setTimeout(() => setMsg(null), 3000)
    }
  }, [initialData, initialDataApplied, entries, loading])

  const update = (i: number, field: keyof SHU2Entry, val: string) => {
    const n = [...entries]
    n[i] = { ...n[i], [field]: val }
    setEntries(n)
  }

  const addRow = () => setEntries([...entries, { ...EMPTY_SHU2(), nomber: String(entries.length + 1) }])
  const removeRow = () => {
    if (entries.length <= 1) return
    const last = entries[entries.length - 1]
    if (last.tasdiqlandi || last.sana || last.yozuv) return
    setEntries(entries.slice(0, -1))
  }

  const handleTasdiqlash = async (i: number) => {
    const prev = [...entries]
    try {
      const updated = [...entries]
      updated[i] = {
        ...updated[i],
        tasdiqlandi: true,
        tasdiqlaganImzo: userName,
        imzo: userName,
        yuborildi: true,
        dispetcherQabulQildi: true,
      }
      setEntries(updated)

      const updatedWithMonth = updated.map(e => ({ ...e, journalMonth }))
      const otherMonths = allEntries.filter(e => e.journalMonth !== journalMonth)
      const newAllEntries = [...otherMonths, ...updatedWithMonth]
      setAllEntries(newAllEntries)

      onAccepted?.()
      setMsg('Tasdiqlandi!')
      setTimeout(() => setMsg(null), 2000)

      upsertJournal(stationId, 'shu2', newAllEntries, userName).catch(err => {
        console.error('❌ SHU-2 Tasdiqlash xatosi:', err)
        setEntries(prev)
        setMsg(err instanceof Error ? err.message : 'Xatolik')
        setTimeout(() => setMsg(null), 3000)
      })
    } catch (err) {
      console.error('❌ SHU-2 Local state xatosi:', err)
      setEntries(prev)
    }
  }

  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    
    const todayDate = new Date()
    const [jYear, jMonth] = (journalMonth || '').split('-')
    const selectedYear = jYear || String(todayDate.getFullYear())
    const selectedMonth = jMonth || String(todayDate.getMonth() + 1).padStart(2, '0')
    const selectedDay = String(todayDate.getDate()).padStart(2, '0')
    const dateStr = `${selectedDay}.${selectedMonth}.${selectedYear}`

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Forma SHU-2', doc.internal.pageSize.getWidth() - 14, 15, { align: 'right' })
    doc.setFontSize(14)
    doc.text(stationName, 14, 15)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('SMB va aloqa obyektlarida bajarilgan ishlarni hisobga olish jurnali', 14, 25)
    doc.text(`Sana: ${dateStr}`, 14, 32)

    const tableColumn = ['№', 'Sana', 'Navbatchilikdagi yozuv va bajarilgan ishlar nomi', 'Imzo']
    const tableRows = entries
      .filter(e => e.sana || e.yozuv)
      .map((e, i) => [
        e.nomber || String(i + 1),
        e.sana || '',
        e.yozuv || '',
        e.tasdiqlandi ? (e.tasdiqlaganImzo || e.imzo) : (e.imzo || '')
      ])

    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: 38, theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [8, 23, 40], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 1: { halign: 'center', cellWidth: 25 }, 2: { cellWidth: 120 }, 3: { halign: 'center', cellWidth: 30 } },
    })

    doc.save(`SHU-2_${stationName}_${dateStr.replace(/\./g, '-')}.pdf`)
  }

  const validEntries = entries.filter(e => e.sana?.trim() || e.yozuv?.trim())
  const hasAnyEntry = validEntries.length > 0
  const hasPending = validEntries.some(e => e.yuborildi && !e.dispetcherQabulQildi)

  const todayDate = new Date()
  const [jYear, jMonth] = (journalMonth || '').split('-')
  const selectedYear = jYear || String(todayDate.getFullYear())
  const selectedMonth = jMonth || String(todayDate.getMonth() + 1).padStart(2, '0')
  const selectedDay = String(todayDate.getDate()).padStart(2, '0')
  const dateStr = `${selectedDay}.${selectedMonth}.${selectedYear}`

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-300 font-bold uppercase tracking-widest">Yuklanmoqda...</div>

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-8 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">SHU-2 Jurnali</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stationName}</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className={`text-xs font-bold px-3 py-1 rounded-full border ${msg.includes('!') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{msg}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <button onClick={onClose} className="mb-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]">
          <ChevronLeft size={18} />
          <span>Orqaga</span>
        </button>

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

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <table className="w-full min-w-[700px] border-collapse text-[12px] text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-tight text-slate-500 border-b-2 border-slate-200">
              <tr>
                <th className="w-[4%] border-r border-b border-slate-200 p-4 text-center">№</th>
                <th className="w-[12%] border-r border-b border-slate-200 p-4 text-center">Sana</th>
                <th className="w-[72%] border-r border-b border-slate-200 p-4 text-left">Navbatchilikdagi yozuv va bajarilgan ishlar nomi</th>
                <th className="w-[12%] border-b border-slate-200 p-4 text-center">Imzo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const dispHidesRow = isDispatcher && !e.yuborildi
                const displaySana = dispHidesRow ? '' : (e.sana || '')
                const displayYozuv = dispHidesRow ? '' : (e.yozuv || '')
                const isLocked = dispHidesRow ? false : (!!e.tasdiqlandi || isMonthInPast(journalMonth))

                return (
                  <tr key={i} className={`border-b border-slate-200 hover:bg-blue-50/50 transition-colors animate-fade-up ${isLocked ? 'bg-emerald-50/30' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="border-r border-slate-200 p-2 text-center bg-slate-50/30">
                      <LocalInput
                        value={e.nomber || ''}
                        onChange={(val: string) => update(i, 'nomber', val)}
                        readOnly={isDispatcher || !!e.yuborildi}
                        placeholder={String(i + 1)}
                        className="w-full rounded bg-transparent text-center font-black text-slate-400 outline-none focus:bg-white transition-all focus:text-purple-600"
                      />
                    </td>
                    <td className="border-r border-slate-200 p-2">
                      <LocalInput
                        value={displaySana}
                        onChange={(val: string) => update(i, 'sana', val)}
                        readOnly={isLocked || isDispatcher}
                        className={`w-full rounded bg-transparent px-2 py-2 text-center font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                        placeholder="kk.oo.yyyy"
                      />
                    </td>
                    <td className="border-r border-slate-200 p-2">
                      {isDispatcher ? (
                        <div className="px-2 py-2 min-h-[40px] text-slate-700">{displayYozuv || <span className="text-slate-300">—</span>}</div>
                      ) : (
                        <LocalTextarea
                          value={displayYozuv}
                          onChange={(val: string) => update(i, 'yozuv', val)}
                          readOnly={isLocked}
                          rows={2}
                          spellCheck={false}
                          lang="uz"
                          className={`w-full resize-y rounded bg-transparent px-2 py-2 outline-none transition-all focus:bg-white focus:shadow-inner ${isLocked ? 'text-slate-400' : 'text-slate-700'}`}
                        />
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {e.tasdiqlandi && (
                          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 shadow-sm">
                            <CheckCircle2 size={12} strokeWidth={3} />
                            <span className="truncate">{e.tasdiqlaganImzo || e.imzo}</span>
                          </div>
                        )}
                        {!e.tasdiqlandi && isWorker && !isMonthInPast(journalMonth) && e.yozuv && (
                          <button
                            onClick={() => handleTasdiqlash(i)}
                            disabled={!e.sana || !e.yozuv}
                            className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${(!e.sana || !e.yozuv) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'btn-gradient'}`}
                          >
                            Bajarildi
                          </button>
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
