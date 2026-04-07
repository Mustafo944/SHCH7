'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import type { DU46Entry, SHU2Entry, JournalType } from '@/types'
import { X, Plus, Trash2, BookOpen, CheckCircle2, Send, Download } from 'lucide-react'
import { TORT_HAFTALIK_REJA_FLAT, TORT_HAFTALIK_REJA } from '@/lib/reja-data'
import { ChevronLeft } from 'lucide-react'

const EMPTY_DU46 = (): DU46Entry => ({
  nomber: '',
  oyKun1: '', soatMinut1: '', kamchilik: '',
  oyKun2: '', soatMinut2: '', xabarUsuli: '',
  oyKun3: '', soatMinut3: '', dspImzo: '',
  oyKun4: '', soatMinut4: '', bartarafInfo: '',
  // Ustun 3
  kamchilikBajarildi: false, kamchilikBajarildiAt: '', kamchilikImzo: '',
  kamchilikBBTasdiqladi: false, kamchilikBBTasdiqladiAt: '', kamchilikBBImzo: '', kamchilikBBVaqt: '',
  // Ustun 12
  bartarafBajarildi: false, bartarafBajarildiAt: '', bartarafImzo: '',
  bartarafBBTasdiqladi: false, bartarafBBTasdiqladiAt: '', bartarafBBImzo: '', bartarafBBVaqt: '',
  // Umumiy
  yuborildi: false,
})

const EMPTY_SHU2 = (): SHU2Entry => ({
  nomber: '',
  sana: '', yozuv: '', imzo: '',
  tasdiqlandi: false,
  tasdiqlaganImzo: '',
  yuborildi: false,
  dispetcherQabulQildi: false,
})

// ===== Jurnal tanlash modal =====
export function JournalSelectModal({
  onSelect,
  onClose,
}: {
  onSelect: (type: JournalType) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white/10 bg-[#06111f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
          <div>
            <h3 className="text-xl font-black text-white">Ish Jurnallari</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30">Jurnalni tanlang</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/5 p-3 text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="grid gap-4 p-8">
          <button
            onClick={() => onSelect('du46')}
            className="group flex items-center gap-5 rounded-[24px] border border-white/5 bg-gradient-to-br from-cyan-500/10 to-transparent p-6 text-left transition-all hover:border-cyan-500/30 hover:scale-[1.02]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
              <BookOpen size={28} />
            </div>
            <div>
              <h4 className="text-lg font-black text-white">DU-46</h4>
              <p className="mt-1 text-xs text-white/40">Ko&apos;rik, tekshiruvlar tahlili va nosozliklar jurnali</p>
            </div>
          </button>
          <button
            onClick={() => onSelect('shu2')}
            className="group flex items-center gap-5 rounded-[24px] border border-white/5 bg-gradient-to-br from-amber-500/10 to-transparent p-6 text-left transition-all hover:border-amber-500/30 hover:scale-[1.02]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
              <BookOpen size={28} />
            </div>
            <div>
              <h4 className="text-lg font-black text-white">ShU-2</h4>
              <p className="mt-1 text-xs text-white/40">SMB va aloqa obyektlarida bajarilgan ishlar jurnali</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== DU-46 Vazifa tanlash modal =====
function TaskSelectModal({
  onSelect,
  onClose,
}: {
  onSelect: (text: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [selectedBolim, setSelectedBolim] = useState<number | null>(null)
  const rejaData = TORT_HAFTALIK_REJA
  const rejaFlat = TORT_HAFTALIK_REJA_FLAT

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#06111f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-black text-white">Vazifa tanlash</h3>
          <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-white/40 hover:text-white"><X size={20} /></button>
        </div>
        <div className="border-b border-white/10 px-6 py-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Vazifa qidirish..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-cyan-500/50"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {selectedBolim === null && !search ? (
            <div className="grid gap-2">
              {rejaData.map((b, idx) => (
                <button key={idx} onClick={() => setSelectedBolim(idx)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/3 p-4 text-left hover:border-cyan-500/30 hover:bg-cyan-500/5">
                  <span className="font-bold text-white/90">{b.bolim}</span>
                  <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/40">{b.ishlar.length} ta ish</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedBolim !== null && (
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <button onClick={() => { setSelectedBolim(null); setSearch('') }}
                    className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-white/50 hover:text-white">
                    <ChevronLeft size={14} /> Ortga
                  </button>
                  <span className="text-xs font-bold text-cyan-400 truncate max-w-[200px] text-right">
                    {rejaData[selectedBolim].bolim}
                  </span>
                </div>
              )}
              {(selectedBolim !== null
                ? rejaFlat.filter(t => t.bolim === rejaData[selectedBolim].bolim)
                : rejaFlat
              ).filter(t =>
                t.ish.toLowerCase().includes(search.toLowerCase()) ||
                t.davriylik.toLowerCase().includes(search.toLowerCase())
              ).map((task, ti) => (
                <button key={ti} onClick={() => {
                  const text = `[${task.manba}${task.raqam ? ` ${task.raqam}` : ''}] ${task.ish}\nDavriyligi: ${task.davriylik}\nBajaruvchi: ${task.bajaruvchi}`
                  onSelect(text)
                }}
                  className="w-full rounded-xl border border-white/5 bg-white/3 p-3 text-left hover:border-cyan-500/30 hover:bg-cyan-500/5">
                  <p className="text-xs font-bold text-white/80">{task.ish}</p>
                  <div className="mt-1 flex gap-3">
                    <span className="text-[10px] text-cyan-400">{task.bolim}</span>
                    <span className="text-[10px] text-white/30">{task.davriylik}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== DU-46 Worker ko'rinishi =====
export function DU46JournalView({
  stationId,
  stationName,
  userName,
  userRole,
  onClose,
}: {
  stationId: string
  stationName: string
  userName: string
  userRole: 'worker' | 'bekat_boshlighi' | 'dispatcher'
  onClose: () => void
}) {
  const [entries, setEntries] = useState<DU46Entry[]>([EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46()])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [taskModalIdx, setTaskModalIdx] = useState<number | null>(null)

  // Sana holati
  const today = new Date()
  const selectedDay = String(today.getDate()).padStart(2, '0')
  const selectedMonth = String(today.getMonth() + 1).padStart(2, '0')
  const selectedYear = String(today.getFullYear())

  // Yuklab olish funksiyasi (PDF)
  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const dateStr = `${selectedDay}.${selectedMonth}.${selectedYear}`
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // Sarlavha
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`DU-46 Jurnali - ${stationName}`, 14, 15)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Sana: ${dateStr}`, 14, 22)

    // Jadval
    const tableColumn = [
      '№',
      'Oy va kun',
      'Soat va daqiqa',
      'Kamchilik bayoni',
      'Oy/kun (xabar)',
      'Soat (xabar)',
      'Xabar usuli',
      'Oy/kun (kelish)',
      'Soat (kelish)',
      'Kelgan imzo',
      'Oy/kun (bartaraf)',
      'Soat (bartaraf)',
      'Bartaraf tafsiloti',
      'Bajardi',
      'Tasdiqladi'
    ]

    const tableRows = entries
      .filter(e => e.kamchilik || e.bartarafInfo || e.oyKun1 || e.soatMinut1)
      .map((e, i) => {
        // Bajardi - kim bajargani
        let bajardi = ''
        if (e.bartarafBajarildi && e.bartarafImzo) {
          bajardi = e.bartarafImzo
        } else if (e.bartarafInfo) {
          bajardi = '-'
        }

        // Tasdiqladi - kim tasdiqlagani
        let tasdiqladi = ''
        if (e.bartarafBBTasdiqladi && e.bartarafBBImzo) {
          tasdiqladi = e.bartarafBBImzo
        } else if (e.bartarafInfo) {
          tasdiqladi = '-'
        }

        return [
          e.nomber || String(i + 1),
          e.oyKun1 || '',
          e.soatMinut1 || '',
          e.kamchilik || '',
          e.oyKun2 || '',
          e.soatMinut2 || '',
          e.xabarUsuli || '',
          e.oyKun3 || '',
          e.soatMinut3 || '',
          e.dspImzo || '',
          e.oyKun4 || '',
          e.soatMinut4 || '',
          e.bartarafInfo || '',
          bajardi,
          tasdiqladi
        ]
      })

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: {
        fontSize: 6,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [8, 23, 40],
        textColor: [255, 255, 255],
        fontSize: 5.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 15 },
        3: { cellWidth: 40 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 15 },
        6: { halign: 'center', cellWidth: 18 },
        7: { halign: 'center', cellWidth: 15 },
        8: { halign: 'center', cellWidth: 15 },
        9: { cellWidth: 20 },
        10: { halign: 'center', cellWidth: 15 },
        11: { halign: 'center', cellWidth: 15 },
        12: { cellWidth: 35 },
        13: { halign: 'center', cellWidth: 20 },
        14: { halign: 'center', cellWidth: 20 }
      }
    })

    doc.save(`DU-46_${stationName}_${dateStr.replace(/\./g, '-')}.pdf`)
  }

  const loadJournalData = useCallback(async () => {
    try {
      console.log('📖 Journal yuklanmoqda:', { stationId, journalType: 'du46' })
      const j = await getJournal(stationId, 'du46')
      console.log('✅ Journal topildi:', j ? `${j.entries.length} yozuvlar` : 'Yangi jurnal')
      if (j && j.entries.length > 0) {
        const loadedEntries = j.entries as DU46Entry[]
        const allSubmitted = loadedEntries.every(e => e.yuborildi)
        if (allSubmitted) {
          setEntries([...loadedEntries, EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46()])
        } else {
          setEntries(loadedEntries)
        }
      }
    } catch (err) {
      console.error('❌ Journal yuklash xatosi:', err)
    } finally {
      setLoading(false)
    }
  }, [stationId])

  useEffect(() => {
    loadJournalData()

    // ─── Realtime Subscription ───────────────
    // Bu qism stansiya jurnali o'zgarganda (ishchi yozsa yoki BB tasdiqlasa)
    // dispetcher yoki boshqalarning ekranida jonli aks etishini ta'minlaydi.
    const channel = supabase
      .channel(`journal_${stationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'station_journals',
          filter: `station_id=eq.${stationId}`
        },
        (payload) => {
          console.log('🚀 Realtime o\'zgarish (Journal):', payload)
          // O'zgarish bo'lganda ma'lumotlarni qayta yuklash
          loadJournalData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [stationId, loadJournalData])

  const update = (i: number, field: keyof DU46Entry, val: string) => {
    let finalVal = val;
    // 1, 2, 4, 5, 7, 8, 10, 11 ustunlar (sana va vaqt kiritiladigan joylar) uchun faqat raqam va maxsus belgilarga ruxsat beramiz.
    const numberAndDateFields: (keyof DU46Entry)[] = [
      'oyKun1', 'soatMinut1', 'oyKun2', 'soatMinut2',
      'oyKun3', 'soatMinut3', 'oyKun4', 'soatMinut4',
      'kamchilikBBVaqt', 'bartarafBBVaqt'
    ];
    if (numberAndDateFields.includes(field)) {
      finalVal = val.replace(/[^\d.,:\- ]/g, '');
    }

    const n = [...entries]
    n[i] = { ...n[i], [field]: finalVal }
    setEntries(n)
  }

  const addRow = () => setEntries([...entries, EMPTY_DU46()])
  const removeRow = () => {
    if (entries.length <= 1) return
    const last = entries[entries.length - 1]
    // Faqat ustun 3 va 12 tekshiriladi — nomber ahamiyatsiz
    const hasData = last.kamchilik || last.bartarafInfo
    if (hasData || last.yuborildi) return
    setEntries(entries.slice(0, -1))
  }

  // ===== USTUN 3 (Kamchilik) handlerlari =====
  const handleKamchilikBajarildi = async (i: number) => {
    const prev = [...entries]
    try {
      console.log('✓ Kamchilik Bajarildi bosildi:', { i, userName })
      const updated = [...entries]
      updated[i] = {
        ...updated[i],
        kamchilikBajarildi: true,
        kamchilikBajarildiAt: new Date().toISOString(),
        kamchilikImzo: userName,
      }
      setEntries(updated)
      await upsertJournal(stationId, 'du46', updated, userName)
      setMsg('Boshlandi belgilandi ✓')
      setTimeout(() => setMsg(null), 2000)
    } catch (err) {
      console.error('❌ Kamchilik Bajarildi xatosi:', err)
      setEntries(prev)
      setMsg(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setMsg(null), 3000)
    }
  }

  const handleKamchilikBBTasdiqladi = async (i: number) => {
    const vaqt = entries[i].kamchilikBBVaqt
    if (!vaqt) {
      setMsg('Tasdiqlash vaqtini kiriting!')
      setTimeout(() => setMsg(null), 3000)
      return
    }
    const prev = [...entries]
    try {
      console.log('✓ Kamchilik BB Tasdiqladi bosildi:', { i, userName, vaqt })
      const updated = [...entries]
      updated[i] = {
        ...updated[i],
        kamchilikBBTasdiqladi: true,
        kamchilikBBTasdiqladiAt: new Date().toISOString(),
        kamchilikBBImzo: userName,
        kamchilikBBVaqt: vaqt,
      }
      setEntries(updated)
      await upsertJournal(stationId, 'du46', updated, userName)
      setMsg('Tasdiqlandi ✓')
      setTimeout(() => setMsg(null), 2000)
    } catch (err) {
      console.error('❌ Kamchilik Tasdiqlash xatosi:', err)
      setEntries(prev)
      setMsg(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setMsg(null), 3000)
    }
  }

  // ===== USTUN 12 (BartarafInfo) handlerlari =====
  const handleBartarafBajarildi = async (i: number) => {
    const prev = [...entries]
    try {
      console.log('✓ Bartaraf Bajarildi bosildi:', { i, userName })
      const updated = [...entries]
      updated[i] = {
        ...updated[i],
        bartarafBajarildi: true,
        bartarafBajarildiAt: new Date().toISOString(),
        bartarafImzo: userName,
      }
      setEntries(updated)
      await upsertJournal(stationId, 'du46', updated, userName)
      setMsg('Bajarildi belgilandi ✓')
      setTimeout(() => setMsg(null), 2000)
    } catch (err) {
      console.error('❌ Bartaraf Bajarildi xatosi:', err)
      setEntries(prev)
      setMsg(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setMsg(null), 3000)
    }
  }

  const handleBartarafBBTasdiqladi = async (i: number) => {
    const vaqt = entries[i].bartarafBBVaqt
    if (!vaqt) {
      setMsg('Tasdiqlash vaqtini kiriting!')
      setTimeout(() => setMsg(null), 3000)
      return
    }
    const prev = [...entries]
    try {
      console.log('✓ Bartaraf BB Tasdiqladi bosildi:', { i, userName, vaqt })
      const updated = [...entries]
      updated[i] = {
        ...updated[i],
        bartarafBBTasdiqladi: true,
        bartarafBBTasdiqladiAt: new Date().toISOString(),
        bartarafBBImzo: userName,
        bartarafBBVaqt: vaqt,
      }
      setEntries(updated)
      await upsertJournal(stationId, 'du46', updated, userName)
      setMsg('Tasdiqlandi ✓')
      setTimeout(() => setMsg(null), 2000)
    } catch (err) {
      console.error('❌ Bartaraf Tasdiqlash xatosi:', err)
      setEntries(prev)
      setMsg(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setMsg(null), 3000)
    }
  }

  const handleSubmit = async () => {
    // Faqat yangi (yuborilmagan) qatorlarni tekshirish
    const newEntries = entries.filter(e => (e.kamchilik || e.bartarafInfo) && !e.yuborildi)
    if (newEntries.length === 0) {
      setMsg('Yangi yozuv yo\'q!')
      setTimeout(() => setMsg(null), 3000)
      return
    }

    for (const e of newEntries) {
      // Kamchilik bo'limi tekshiruvi
      if (e.kamchilik) {
        if (!e.oyKun1 || !e.soatMinut1) {
          setMsg('Kamchilik yozuvidan oldingi oy/kun va soat/daqiqa to\'ldirilishi kerak!')
          setTimeout(() => setMsg(null), 3000)
          return
        }
        if (!e.kamchilikBajarildi || !e.kamchilikBBTasdiqladi) {
          setMsg('Kamchilik yozuvi "Boshlandi" va "BB Tasdiqladi" qilinishi shart!')
          setTimeout(() => setMsg(null), 3500)
          return
        }
      }
      // Bartaraf bo'limi tekshiruvi
      if (e.bartarafInfo) {
        if (!e.oyKun4 || !e.soatMinut4) {
          setMsg('Nosozlik tafsilotidan oldingi oy/kun va soat/daqiqa to\'ldirilishi kerak!')
          setTimeout(() => setMsg(null), 3000)
          return
        }
        if (!e.kamchilikBBTasdiqladi) {
          setMsg('12-ustunni yuborishdan oldin 3-ustun (kamchilik) BB tasdiqlashi shart!')
          setTimeout(() => setMsg(null), 3500)
          return
        }
        if (!e.bartarafBajarildi || !e.bartarafBBTasdiqladi) {
          setMsg('Nosozlik yozuvi "Bajarildi" va "BB Tasdiqladi" qilinishi shart!')
          setTimeout(() => setMsg(null), 3500)
          return
        }
      }
    }

    try {
      console.log('📝 Yuborishdan oldin:', { stationId, entries: newEntries.length, userName })
      // Faqat yangi qatorlarga yuborildi belgisini qo'yish, eskimarni o'zgartirmaslik
      const updated = entries.map(e => {
        if ((e.kamchilik || e.bartarafInfo) && !e.yuborildi) {
          return { ...e, yuborildi: true }
        }
        return e
      })
      await upsertJournal(stationId, 'du46', updated, userName)
      setEntries(updated)
      setMsg('Dispetcherga yuborildi ✓')
      setTimeout(() => setMsg(null), 2000)
    } catch (err: unknown) {
      console.error('❌ DU-46 yuborish xatosi:', err)
      setMsg(err instanceof Error ? err.message : 'Xatolik')
    }
  }

  // Yuborish tugmasi: yangi (yuborilmagan) qatorlar uchun tekshiruv
  const hasAnyEntry = entries.some(e => e.kamchilik || e.bartarafInfo)
  const hasUnsubmittedEntries = entries.some(e => (e.kamchilik || e.bartarafInfo) && !e.yuborildi)
  const hasSomeSubmitted = entries.some(e => e.yuborildi)

  if (loading) return <div className="flex h-64 items-center justify-center text-white/20">Yuklanmoqda...</div>

  const isWorker = userRole === 'worker'
  const isBB = userRole === 'bekat_boshlighi'
  const isDispatcher = userRole === 'dispatcher'

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#06111f]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#06111f]/90 px-4 py-4 backdrop-blur-xl sm:px-8">
        <div>
          <h2 className="text-lg font-black text-white">DU-46 Jurnali</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{stationName}</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className={`text-xs font-bold ${msg.includes('!') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</span>}
          <button onClick={onClose} className="rounded-xl border border-white/10 p-2.5 text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* ===== SANA VA YUKLASH ===== */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white/40">Sana:</span>
            <div className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/80">
              {selectedDay}.{selectedMonth}.{selectedYear}
            </div>
          </div>
          <button onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition">
            <Download size={14} /> Yuklab olish
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table style={{ minWidth: '1400px' }} className="w-full border-collapse text-[11px] text-white/80">
            <thead className="bg-[#0b1728] text-[10px] font-bold text-white/70">
              <tr>
                <th rowSpan={2} className="w-[3%] border-r border-b border-white/10 p-2 text-center">№</th>
                <th rowSpan={2} className="w-[5%] border-r border-b border-white/10 p-2 text-center">Oy va<br />kun</th>
                <th rowSpan={2} className="w-[5%] border-r border-b border-white/10 p-2 text-center">Soat va<br />daqiqa</th>
                <th rowSpan={2} className="w-[18%] border-r border-b border-white/10 p-2 text-center">Ko&apos;rik, tekshiruvlar tahlili,<br />topilgan kamchiliklar bayoni</th>
                <th colSpan={3} className="border-r border-b border-white/10 p-2 text-center">Tegishli xodimga<br />xabar berilgan vaqt</th>
                <th colSpan={3} className="border-r border-b border-white/10 p-2 text-center">Tegishli xodimning nosozlik va buzilishlarni<br />bartaraf etishga kelgan vaqti</th>
                <th colSpan={3} className="border-b border-white/10 p-2 text-center">Aniqlangan nosozliklar va buzilishlarni bartaraf qilganligi vaqti<br />va xodimning imzosi</th>
              </tr>
              <tr className="bg-[#0b1728]/60">
                <th className="w-[5%] border-r border-b border-white/10 p-2 text-center text-cyan-300">Oy/kun</th>
                <th className="w-[5%] border-r border-b border-white/10 p-2 text-center text-cyan-300">Soat va daqiqa</th>
                <th className="w-[7%] border-r border-b border-white/10 p-2 text-center text-cyan-300">Xabar berish<br />usuli</th>
                <th className="w-[5%] border-r border-b border-white/10 p-2 text-center text-cyan-300">Oy/kun</th>
                <th className="w-[5%] border-r border-b border-white/10 p-2 text-center text-cyan-300">Soat va daqiqa</th>
                <th className="w-[7%] border-r border-b border-white/10 p-2 text-center text-cyan-300">Bartaraf etishga kelgan<br />xodimning imzosi</th>
                <th className="w-[5%] border-r border-b border-white/10 p-2 text-center text-cyan-300">Oy/kun</th>
                <th className="w-[5%] border-r border-b border-white/10 p-2 text-center text-cyan-300">Soat va daqiqa</th>
                <th className="w-[15%] border-b border-white/10 p-2 text-center text-cyan-300">Nosozliklar va buzilishlarning tafsiloti</th>
              </tr>
              <tr className="bg-[#0b1728]/30">
                {['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((n, i) => (
                  <th key={i} className="border-r border-b border-white/10 p-1 text-center text-[9px] text-white/30 last:border-r-0">{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="border-b border-white/10 hover:bg-[#0b1728]/50">
                  {/* № — faqat ishchi o'zgartira oladi */}
                  <td className="border-r border-white/10 p-1 text-center">
                    <input
                      value={e.nomber}
                      onChange={ev => {
                        const n = [...entries]
                        n[i] = { ...n[i], nomber: ev.target.value }
                        setEntries(n)
                      }}
                      readOnly={!isWorker || !!e.yuborildi}
                      placeholder={String(i + 1)}
                      className="w-full rounded bg-transparent text-center font-bold text-cyan-400/50 outline-none focus:bg-[#0b1728]"
                    />
                  </td>
                  {/* Ustun 1: Oy va kun */}
                  <td className="border-r border-white/10 p-0.5">
                    <input value={e.oyKun1 || ''} onChange={ev => update(i, 'oyKun1', ev.target.value)} readOnly={!isWorker || !!e.yuborildi || !!e.kamchilikBBTasdiqladi}
                      className="w-full rounded bg-transparent px-1.5 py-2 text-center text-[11px] outline-none focus:bg-[#0b1728]" />
                  </td>
                  {/* Ustun 2: Soat va daqiqa */}
                  <td className="border-r border-white/10 p-0.5 align-top relative">
                    <div className="pb-[85px]">
                      {/* Ishchi vaqti — eng tepada */}
                      <input value={e.soatMinut1 || ''} onChange={ev => update(i, 'soatMinut1', ev.target.value)} readOnly={!isWorker || !!e.yuborildi || !!e.kamchilikBBTasdiqladi}
                        className={`w-full rounded px-1.5 py-2 text-center text-[11px] font-bold outline-none ${e.kamchilikBajarildi
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-transparent focus:bg-[#0b1728]'
                          }`} />
                    </div>

                    {/* BB vaqti — pastda (Tasdiqladi bilan bir urovenda) */}
                    {e.kamchilik && e.kamchilikBajarildi && (
                      <div className="absolute bottom-1.5 left-0 right-0 px-1 flex flex-col items-center justify-end">
                        {!e.kamchilikBBTasdiqladi && isBB && !e.yuborildi ? (
                          <input
                            type="text"
                            placeholder="Vaqt"
                            value={e.kamchilikBBVaqt || ''}
                            onChange={ev => update(i, 'kamchilikBBVaqt', ev.target.value)}
                            className="w-full rounded border border-amber-500/20 bg-amber-500/5 px-1.5 py-1.5 text-center text-[10px] text-amber-300 outline-none focus:border-amber-400"
                          />
                        ) : e.kamchilikBBTasdiqladi && e.kamchilikBBVaqt ? (
                          <div className="w-full rounded bg-amber-500/10 px-1.5 py-1.5 text-center text-[10px] font-bold text-amber-400 border border-amber-500/20">
                            {e.kamchilikBBVaqt}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                  {/* Ustun 3: Kamchilik — ishchi yozadi + Bajarildi, BB tasdiqlaydi */}
                  <td className="border-r border-white/10 p-0.5 align-top relative">
                    <div className="pb-[85px]">
                      {/* Matn — eng tepada */}
                      <textarea value={e.kamchilik || ''} onChange={ev => update(i, 'kamchilik', ev.target.value)}
                        readOnly={!isWorker || !!e.yuborildi || !!e.kamchilikBBTasdiqladi}
                        rows={3}
                        spellCheck={false}
                        lang="uz"
                        className="w-full resize-y rounded bg-transparent px-2 py-1 text-[11px] outline-none focus:bg-[#0b1728]"
                      />
                    </div>

                    {/* Badgelar va Tugmalar — pastda */}
                    <div className="absolute bottom-1.5 left-0 right-0 px-1 flex flex-col items-center gap-1.5">
                      {/* Ishchi: Boshlandi tugmasi */}
                      {e.kamchilik && isWorker && !e.kamchilikBajarildi && !e.yuborildi && (
                        <button onClick={() => handleKamchilikBajarildi(i)}
                          disabled={!e.oyKun1 || !e.soatMinut1}
                          className={`rounded px-3 py-1 text-[10px] font-bold transition border ${(!e.oyKun1 || !e.soatMinut1) ? 'bg-slate-500/10 text-slate-400 border-slate-500/20 cursor-not-allowed opacity-50' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white border-cyan-500/20'}`}>
                          ▶ Boshlandi
                        </button>
                      )}
                      {e.kamchilikBajarildi && (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] font-bold text-emerald-400/60 uppercase">Boshladi:</span>
                          <div className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={10} /> {e.kamchilikImzo}
                          </div>
                        </div>
                      )}

                      {/* BB: Tasdiqlash */}
                      {e.kamchilik && !e.kamchilikBBTasdiqladi && isBB && !e.yuborildi && (
                        <button onClick={() => handleKamchilikBBTasdiqladi(i)}
                          disabled={!e.kamchilikBajarildi}
                          className={`rounded px-3 py-1 text-[10px] font-bold transition border ${!e.kamchilikBajarildi ? 'bg-slate-500/10 text-slate-400 border-slate-500/20 cursor-not-allowed opacity-50' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-900 border-amber-500/20'}`}>
                          ✓ Tasdiqlash
                        </button>
                      )}
                      {e.kamchilikBBTasdiqladi && (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] font-bold text-amber-400/60 uppercase">Tasdiqladi:</span>
                          <div className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                            <CheckCircle2 size={10} /> {e.kamchilikBBImzo}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  {/* Ustunlar 4-9 */}
                  {(['oyKun2', 'soatMinut2', 'xabarUsuli', 'oyKun3', 'soatMinut3', 'dspImzo'] as (keyof DU46Entry)[]).map((field, fi) => (
                    <td key={fi} className="border-r border-white/10 p-0.5">
                      <input value={e[field] as string || ''} onChange={ev => update(i, field, ev.target.value)} readOnly={!isWorker || !!e.yuborildi}
                        className="w-full rounded bg-transparent px-1.5 py-2 text-center text-[11px] outline-none focus:bg-[#0b1728]" />
                    </td>
                  ))}
                  {/* Ustunlar 10-11 */}
                  <td className="border-r border-white/10 p-0.5">
                    <input value={e.oyKun4 as string || ''} onChange={ev => update(i, 'oyKun4', ev.target.value)} readOnly={!isWorker || !!e.yuborildi || !!e.bartarafBBTasdiqladi}
                      className="w-full rounded bg-transparent px-1.5 py-2 text-center text-[11px] outline-none focus:bg-[#0b1728]" />
                  </td>
                  <td className="border-r border-white/10 p-0.5 align-top relative">
                    <div className="pb-[85px]">
                      {/* Ishchi vaqti — eng tepada */}
                      <input value={e.soatMinut4 as string || ''} onChange={ev => update(i, 'soatMinut4', ev.target.value)} readOnly={!isWorker || !!e.yuborildi || !!e.bartarafBBTasdiqladi}
                        className={`w-full rounded px-1.5 py-2 text-center text-[11px] font-bold outline-none ${e.bartarafBajarildi
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-transparent focus:bg-[#0b1728]'
                          }`} />
                    </div>

                    {/* BB vaqti — pastda (Tasdiqladi bilan bir urovenda) */}
                    {e.bartarafInfo && e.bartarafBajarildi && e.kamchilikBBTasdiqladi && (
                      <div className="absolute bottom-1.5 left-0 right-0 px-1 flex flex-col items-center justify-end">
                        {!e.bartarafBBTasdiqladi && isBB && !e.yuborildi ? (
                          <input
                            type="text"
                            placeholder="Vaqt"
                            value={e.bartarafBBVaqt || ''}
                            onChange={ev => update(i, 'bartarafBBVaqt', ev.target.value)}
                            className="w-full rounded border border-amber-500/20 bg-amber-500/5 px-1.5 py-1.5 text-center text-[10px] text-amber-300 outline-none focus:border-amber-400"
                          />
                        ) : e.bartarafBBTasdiqladi && e.bartarafBBVaqt ? (
                          <div className="w-full rounded bg-amber-500/10 px-1.5 py-1.5 text-center text-[10px] font-bold text-amber-400 border border-amber-500/20">
                            {e.bartarafBBVaqt}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                  {/* Ustun 12: bartarafInfo — BB 3-ustunda tasdiqlamaguncha ishchi yozolmaydi */}
                  <td className="p-0.5 align-top relative">
                    <div className="pb-[85px]">
                      {/* Matn — eng tepada */}
                      <textarea value={e.bartarafInfo || ''} onChange={ev => update(i, 'bartarafInfo', ev.target.value)}
                        readOnly={!isWorker || !!e.yuborildi || !!e.bartarafBBTasdiqladi || !e.kamchilikBBTasdiqladi}
                        rows={3}
                        spellCheck={false}
                        lang="uz"
                        className={`w-full resize-y rounded px-2 py-1 text-[11px] outline-none ${!e.kamchilikBBTasdiqladi && !e.bartarafInfo ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed' : 'bg-transparent focus:bg-[#0b1728]'}`}
                        placeholder={!e.kamchilikBBTasdiqladi ? '3-ustun tasdiqlanishi kerak...' : ''}
                      />
                    </div>

                    {/* Badgelar va Tugmalar — pastda */}
                    <div className="absolute bottom-1.5 left-0 right-0 px-1 flex flex-col items-center gap-1.5">
                      {/* Ishchi: Bajarildi tugmasi */}
                      {e.bartarafInfo && isWorker && !e.bartarafBajarildi && !e.yuborildi && (
                        <button onClick={() => handleBartarafBajarildi(i)}
                          disabled={!e.oyKun4 || !e.soatMinut4 || !e.kamchilikBajarildi}
                          className={`rounded px-3 py-1 text-[10px] font-bold transition border ${(!e.oyKun4 || !e.soatMinut4 || !e.kamchilikBajarildi) ? 'bg-slate-500/10 text-slate-400 border-slate-500/20 cursor-not-allowed opacity-50' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white border-cyan-500/20'}`}>
                          ✓ Bajarildi
                        </button>
                      )}
                      {e.bartarafBajarildi && (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] font-bold text-emerald-400/60 uppercase">Bajardi:</span>
                          <div className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={10} /> {e.bartarafImzo}
                          </div>
                        </div>
                      )}

                      {/* BB: Tasdiqlash */}
                      {e.bartarafInfo && !e.bartarafBBTasdiqladi && isBB && !e.yuborildi && (
                        <div className="flex flex-col items-center gap-1">
                          <button onClick={() => handleBartarafBBTasdiqladi(i)}
                            disabled={!e.bartarafBajarildi || !e.kamchilikBBTasdiqladi}
                            className={`rounded px-3 py-1 text-[10px] font-bold transition border ${(!e.bartarafBajarildi || !e.kamchilikBBTasdiqladi) ? 'bg-slate-500/10 text-slate-400 border-slate-500/20 cursor-not-allowed opacity-50' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-900 border-amber-500/20'}`}>
                            ✓ Tasdiqlash
                          </button>
                          {!e.kamchilikBBTasdiqladi && (
                            <span className="text-[8px] text-red-400/60 text-center leading-tight px-1 mt-1">
                              3-ustun BB tasdiqlamagan
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tasdiqladi */}
                      {e.bartarafBBTasdiqladi && (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] font-bold text-amber-400/60 uppercase">Tasdiqladi:</span>
                          <div className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                            <CheckCircle2 size={10} /> {e.bartarafBBImzo}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== QATOR QO'SHISH/O'CHIRISH ===== */}
        {isWorker && (() => {
          const last = entries[entries.length - 1]
          // Faqat ustun 3 (kamchilik) va ustun 12 (bartarafInfo) — qolganlar ahamiyatsiz
          const lastHasData = last.kamchilik || last.bartarafInfo
          const canRemove = entries.length > 1 && !lastHasData
          return (
            <div className="mt-4 flex items-center gap-3">
              <button onClick={addRow} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/60 hover:bg-white/10">
                <Plus size={14} /> Qator qo&apos;shish
              </button>
              <button onClick={removeRow} disabled={!canRemove}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${canRemove
                  ? 'border-white/10 bg-white/5 text-white/40 hover:text-red-400'
                  : 'border-white/5 bg-white/2 text-white/10 cursor-not-allowed'
                  }`}>
                <Trash2 size={14} /> Qator o&apos;chirish
              </button>
            </div>
          )
        })()}

        {/* ===== YUBORISH TUGMASI ===== */}
        {isWorker && (
          <div className="mt-6 flex justify-end">
            <button onClick={handleSubmit}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 font-black text-white shadow-xl shadow-cyan-500/20 transition hover:scale-[1.02] active:scale-95">
              <Send size={20} />
              Dispetcherga yuborish
            </button>
          </div>
        )}

        {/* ===== DISPETCHER QABUL QILISH ===== */}
        {isDispatcher && hasSomeSubmitted && !entries.filter(e => e.yuborildi).every(e => e.dispetcherQabulQildi) && (
          <div className="mt-6 flex justify-end">
            <button onClick={async () => {
              const prev = [...entries]
              try {
                const updated = entries.map(e => ({ ...e, dispetcherQabulQildi: true }))
                setEntries(updated)
                await upsertJournal(stationId, 'du46', updated, userName)
                setMsg('Qabul qilindi ✓')
                setTimeout(() => setMsg(null), 2000)
              } catch (err) {
                console.error('❌ DU-46 Qabul qilish xatosi:', err)
                setEntries(prev)
                setMsg(err instanceof Error ? err.message : 'Xatolik')
                setTimeout(() => setMsg(null), 3000)
              }
            }}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 font-black text-white shadow-xl shadow-emerald-500/20 transition hover:scale-[1.02] active:scale-95">
              <CheckCircle2 size={20} />
              Qabul qilish
            </button>
          </div>
        )}

      </div>

      {/* Vazifa tanlash modal */}
      {taskModalIdx !== null && (
        <TaskSelectModal
          onSelect={(text) => {
            update(taskModalIdx as number, 'kamchilik', text)
            setTaskModalIdx(null)
          }}
          onClose={() => setTaskModalIdx(null)}
        />
      )}
    </div>
  )
}

// ===== SHU-2 jurnal ko'rinishi =====
export function SHU2JournalView({
  stationId,
  stationName,
  userName,
  userRole,
  onClose,
}: {
  stationId: string
  stationName: string
  userName: string
  userRole: 'worker' | 'bekat_boshlighi' | 'dispatcher'
  onClose: () => void
}) {
  const [entries, setEntries] = useState<SHU2Entry[]>(Array.from({ length: 7 }, (_, i) => ({ ...EMPTY_SHU2(), nomber: String(i + 1) })))
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const isWorker = userRole === 'worker'
  const isDispatcher = userRole === 'dispatcher'

  useEffect(() => {
    getJournal(stationId, 'shu2').then(j => {
      if (j && j.entries.length > 0) setEntries(j.entries as SHU2Entry[])
    }).finally(() => setLoading(false))
  }, [stationId])

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

  // Ishchi qatorni tasdiqlaydi
  const handleTasdiqlash = async (i: number) => {
    const prev = [...entries]
    try {
      const updated = [...entries]
      updated[i] = {
        ...updated[i],
        tasdiqlandi: true,
        tasdiqlaganImzo: userName,
        imzo: userName,
      }
      setEntries(updated)
      await upsertJournal(stationId, 'shu2', updated, userName)
      setMsg('Tasdiqlandi ✓')
      setTimeout(() => setMsg(null), 2000)
    } catch (err) {
      console.error('❌ SHU-2 Tasdiqlash xatosi:', err)
      setEntries(prev)
      setMsg(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setMsg(null), 3000)
    }
  }

  // Ishchi dispetcherga yuboradi
  const handleYuborish = async () => {
    try {
      const updated = entries.map(e => ({ ...e, yuborildi: true }))
      await upsertJournal(stationId, 'shu2', updated, userName)
      setEntries(updated)
      setShowConfirmModal(false)
      setMsg('Dispetcherga yuborildi ✓')
      setTimeout(() => { setMsg(null) }, 2000)
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Xatolik')
    }
  }

  const onYuborishClick = () => {
    // Faqat matnli qatorlarni olamiz
    const validEntries = entries.filter(e => e.sana?.trim() || e.yozuv?.trim())

    // Agar birorta ham yozuv bo'lmasa, yuborishga hojat yo'q
    if (validEntries.length === 0) return

    // Yangi (hali yuborilmagan) yozuv bormi tekshiramiz
    const hasNewContent = validEntries.some(e => !e.yuborildi)

    if (!hasNewContent) {
      // Hamma yozilgan yozuvlar allaqachon yuborilgan bo'lsa modalni chiqaramiz
      setShowConfirmModal(true)
    } else {
      // Yangi yozuv bo'lsa to'g'ridan-to'g'ri yuboramiz
      handleYuborish()
    }
  }

  // Dispetcher qabul qiladi
  const handleQabulQilish = async () => {
    const prev = [...entries]
    try {
      // Faqat yuborilgan qatorlarni qabul qilingan deb belgilaymiz
      const updated = entries.map(e => e.yuborildi ? { ...e, dispetcherQabulQildi: true } : e)
      setEntries(updated)
      await upsertJournal(stationId, 'shu2', updated, userName)
      setMsg('Qabul qilindi ✓')
      setTimeout(() => setMsg(null), 2000)
    } catch (err) {
      console.error('❌ SHU-2 Qabul qilish xatosi:', err)
      setEntries(prev)
      setMsg(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setMsg(null), 3000)
    }
  }

  // PDF yuklab olish
  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const today = new Date()
    const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Forma ShU-2', doc.internal.pageSize.getWidth() - 14, 15, { align: 'right' })

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
      head: [tableColumn],
      body: tableRows,
      startY: 38,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [8, 23, 40], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 25 },
        2: { cellWidth: 120 },
        3: { halign: 'center', cellWidth: 30 },
      }
    })

    doc.save(`SHU-2_${stationName}_${dateStr.replace(/\./g, '-')}.pdf`)
  }

  const validEntries = entries.filter(e => e.sana?.trim() || e.yozuv?.trim())
  const hasAnyEntry = validEntries.length > 0
  const alreadySubmitted = entries.some(e => e.yuborildi)
  // Barcha YUBORILGAN yozuvlar qabul qilinganmi?
  const allSubmittedAccepted = validEntries.length > 0 && validEntries.every(e => e.yuborildi ? e.dispetcherQabulQildi : true)
  // Birorta yuborilganu lekin qabul qilinmagani bormi?
  const hasPending = validEntries.some(e => e.yuborildi && !e.dispetcherQabulQildi)

  if (loading) return <div className="flex h-64 items-center justify-center text-white/20">Yuklanmoqda...</div>

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#06111f]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#06111f]/90 px-4 py-4 backdrop-blur-xl sm:px-8">
        <div>
          <h2 className="text-lg font-black text-white">ShU-2 Jurnali</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{stationName} · SMB va aloqa obyektlari</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className={`text-xs font-bold ${msg.includes('!') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</span>}
          <button onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition">
            <Download size={14} /> PDF
          </button>
          <button onClick={onClose} className="rounded-xl border border-white/10 p-2.5 text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="shrink-0 px-4 pt-6 sm:px-8">
        <p className="text-right text-xs font-black text-white/40">Forma ShU-2</p>
        <h3 className="mt-1 text-center text-sm font-black uppercase tracking-widest text-white/60">
          SMB va aloqa obyektlarida bajarilgan ishlarni hisobga olish jurnali
        </h3>
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full border-collapse text-[12px] text-white/80">
            <thead className="bg-[#0b1728] text-[11px] font-bold text-white/70">
              <tr>
                <th className="w-[6%] border-r border-b border-white/10 p-3 text-center">№</th>
                <th className="w-[14%] border-r border-b border-white/10 p-3 text-center">Sana</th>
                <th className="w-[60%] border-r border-b border-white/10 p-3 text-center">Navbatchilikdagi yozuv va bajarilgan ishlar nomi</th>
                <th className="w-[20%] border-b border-white/10 p-3 text-center">Imzo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const isLocked = !!e.tasdiqlandi
                return (
                  <tr key={i} className={`border-b border-white/10 hover:bg-[#0b1728]/50 ${isLocked ? 'bg-emerald-500/5' : ''}`}>
                    <td className="border-r border-white/10 p-1 text-center">
                      <input
                        value={e.nomber || ''}
                        onChange={ev => update(i, 'nomber', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        placeholder={String(i + 1)}
                        className="w-full rounded bg-transparent text-center font-bold text-cyan-400/50 outline-none focus:bg-[#0b1728]"
                      />
                    </td>
                    <td className="border-r border-white/10 p-0.5">
                      <input value={e.sana} onChange={ev => update(i, 'sana', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        placeholder="kk.oo.yyyy"
                        className={`w-full rounded bg-transparent px-3 py-3 text-center text-[12px] outline-none focus:bg-[#0b1728] placeholder-white/10 ${isLocked ? 'opacity-60' : ''}`} />
                    </td>
                    <td className="border-r border-white/10 p-0.5">
                      <textarea value={e.yozuv} onChange={ev => update(i, 'yozuv', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        spellCheck={false}
                        lang="uz"
                        className={`min-h-[60px] w-full resize-none rounded bg-transparent px-3 py-2 text-[12px] outline-none focus:bg-[#0b1728] ${isLocked ? 'opacity-60' : ''}`} />
                    </td>
                    <td className="p-1">
                      <div className="flex flex-col items-center gap-1">
                        {isLocked ? (
                          <div className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={12} /> {e.tasdiqlaganImzo || e.imzo}
                          </div>
                        ) : isWorker ? (
                          <button onClick={() => handleTasdiqlash(i)}
                            disabled={!(e.sana?.trim() && e.yozuv?.trim())}
                            className={`rounded px-4 py-2 text-[10px] font-bold transition border ${e.sana?.trim() && e.yozuv?.trim() ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white border-cyan-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/10 cursor-not-allowed'}`}>
                            ✓ Tasdiqlash
                          </button>
                        ) : (
                          <span className="text-[10px] text-white/20">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Qator qo'shish/o'chirish */}
        {isWorker && (
          <div className="mt-4 flex items-center gap-3">
            <button onClick={addRow} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/60 hover:bg-white/10">
              <Plus size={14} /> Qator qo&apos;shish
            </button>
            <button onClick={removeRow} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/40 hover:text-red-400">
              <Trash2 size={14} /> Qator o&apos;chirish
            </button>
          </div>
        )}

        {/* Ishchi: Yuborish */}
        {isWorker && hasAnyEntry && (
          <div className="mt-6 flex justify-end">
            <button onClick={onYuborishClick}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 font-black text-white shadow-xl shadow-cyan-500/20 transition hover:scale-[1.02] active:scale-95">
              <Send size={20} />
              Dispetcherga yuborish
            </button>
          </div>
        )}

        {/* Dispetcher: Qabul qilish */}
        {isDispatcher && hasAnyEntry && entries.some(e => e.yuborildi && !e.dispetcherQabulQildi) && (
          <div className="mt-6 flex justify-end">
            <button onClick={handleQabulQilish}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 font-black text-white shadow-xl shadow-emerald-500/20 transition hover:scale-[1.02] active:scale-95">
              <CheckCircle2 size={20} />
              Qabul qilish
            </button>
          </div>
        )}

        {/* Status */}
        {isWorker && hasAnyEntry && hasPending && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/10 py-3 text-sm font-bold text-amber-400 border border-amber-500/20">
            <Send size={18} /> Dispetcherga yuborilgan — javob kutilmoqda
          </div>
        )}
        {hasAnyEntry && !hasPending && validEntries.every(e => e.dispetcherQabulQildi) && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 py-3 text-sm font-bold text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={18} /> Barcha yozuvlar dispetcher tomonidan qabul qilingan
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[32px] border border-white/10 bg-[#06111f] p-6 shadow-2xl">
            <h3 className="text-xl font-black text-white text-center mb-4">Qayta yuborish</h3>
            <p className="text-sm text-white/50 text-center mb-8">Bu jurnal ma&apos;lumotlari oldin yuborilgan. Yana qayta yuborilsinmi?</p>
            <div className="flex gap-4">
              <button
                onClick={handleYuborish}
                className="flex-1 rounded-xl bg-cyan-500 py-3 font-bold text-slate-900 shadow-xl shadow-cyan-500/20 hover:scale-105 transition"
              >Ha, yuborilsin</button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl bg-white/5 py-3 font-bold text-white hover:bg-white/10 transition"
              >Bekor qilish</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}