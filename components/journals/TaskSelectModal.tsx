'use client'

import { useState } from 'react'
import { X, ChevronLeft, Calendar, CalendarRange } from 'lucide-react'
import { YILLIK_REJA, YILLIK_REJA_FLAT, TORT_HAFTALIK_REJA, TORT_HAFTALIK_REJA_FLAT } from '@/lib/reja-data'

// ═══════════════════════════════════════════════════════════════════════════════
// DU-46 VAZIFA TANLASH MODAL
// Alohida faylda turadi, chunki reja-data (katta JSON) faqat shu modalga kerak —
// JournalSelectModal bilan bitta faylda tursa, JSON barcha sahifalar bundle'iga kiradi.
//
// Avval faqat "4-haftalik" ro'yxati bor edi. Endi "oylik ish reja" (JournalForm.tsx)
// dagi kabi, avval 4-haftalik/Yillik tanlanadi. Tanlangandan keyin qatorga faqat ish
// MAZMUNI qo'yiladi — "[NSH...]/Davriyligi/Bajaruvchi" qatorlari DU-46 katakchasini
// bandlab, ishchiga keraksiz bo'lgani uchun qo'shilmaydi.
// ═══════════════════════════════════════════════════════════════════════════════

type RejaTuri = '4-haftalik' | 'yillik'

export function TaskSelectModal({
  onSelect,
  onClose,
}: {
  onSelect: (text: string) => void
  onClose: () => void
}) {
  const [rejaTuri, setRejaTuri] = useState<RejaTuri | null>(null)
  const [search, setSearch] = useState('')
  const [selectedBolim, setSelectedBolim] = useState<number | null>(null)

  const rejaData = rejaTuri === 'yillik' ? YILLIK_REJA : TORT_HAFTALIK_REJA
  const rejaFlat = rejaTuri === 'yillik' ? YILLIK_REJA_FLAT : TORT_HAFTALIK_REJA_FLAT

  const goBack = () => {
    if (selectedBolim !== null) {
      setSelectedBolim(null)
      setSearch('')
    } else {
      setRejaTuri(null)
      setSearch('')
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-md">
      <div className="flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-5 bg-slate-50">
          <div className="flex items-center gap-3">
            {rejaTuri !== null && (
              <button onClick={goBack} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                <ChevronLeft size={18} />
              </button>
            )}
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {rejaTuri === null ? 'Vazifa tanlash' : rejaTuri === 'yillik' ? 'Yillik ishlar' : '4-haftalik ishlar'}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={20} /></button>
        </div>

        {rejaTuri === null ? (
          // ── 1-qadam: 4-haftalik yoki Yillik tanlash ──────────────────────────
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 bg-slate-50/30">
            <button
              onClick={() => setRejaTuri('4-haftalik')}
              className="flex w-full max-w-sm items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-purple-300 hover:shadow-md hover:bg-purple-50/30 group"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Calendar size={22} />
              </div>
              <div>
                <p className="font-black text-slate-900">4-haftalik ishlar</p>
                <p className="text-xs font-bold text-slate-400">Haftalik jadval bo&apos;yicha vazifalar</p>
              </div>
            </button>
            <button
              onClick={() => setRejaTuri('yillik')}
              className="flex w-full max-w-sm items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-purple-300 hover:shadow-md hover:bg-purple-50/30 group"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <CalendarRange size={22} />
              </div>
              <div>
                <p className="font-black text-slate-900">Yillik ishlar</p>
                <p className="text-xs font-bold text-slate-400">Yillik jadval bo&apos;yicha vazifalar</p>
              </div>
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-100 px-8 py-4 bg-white">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Vazifa qidirish..."
                className="input-premium w-full"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/30 custom-scrollbar">
              {selectedBolim === null && !search ? (
                <div className="grid gap-3">
                  {rejaData.map((b, idx) => (
                    <button key={idx} onClick={() => setSelectedBolim(idx)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-purple-300 hover:shadow-md hover:bg-purple-50/30 group">
                      <span className="font-bold text-slate-700 group-hover:text-purple-600 transition-colors uppercase tracking-tight text-sm">{b.bolim}</span>
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 border border-slate-200">{b.ishlar.length} ta ish</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedBolim !== null && (
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 bg-white/50 p-2 rounded-xl">
                      <button onClick={() => { setSelectedBolim(null); setSearch('') }}
                        className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all shadow-sm">
                        <ChevronLeft size={14} /> Ortga
                      </button>
                      <span className="text-xs font-black text-purple-600 uppercase tracking-tight truncate max-w-[200px] text-right">
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
                    <button key={ti} onClick={() => onSelect(task.ish)}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-purple-300 hover:shadow-md hover:bg-purple-50 group">
                      <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 leading-snug">{task.ish}</p>
                      <div className="mt-3 flex gap-4">
                        <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-purple-400" /> {task.bolim}</span>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-slate-300" /> {task.davriylik}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
