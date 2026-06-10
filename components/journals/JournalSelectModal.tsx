/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import type { JournalType } from '@/types'
import { X, BookOpen, ChevronLeft } from 'lucide-react'
import { TORT_HAFTALIK_REJA_FLAT, TORT_HAFTALIK_REJA } from '@/lib/reja-data'
import { MONTHS } from '@/lib/constants'
import { formatDateInput, formatTimeInput } from './helpers'
import { getJournalMonthKey } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// JURNAL TANLASH MODAL
// ═══════════════════════════════════════════════════════════════════════════════

export function JournalSelectModal({
  onSelect,
  onClose,
  du46Count = 0,
  shu2Count = 0,
}: {
  onSelect: (type: JournalType) => void
  onClose: () => void
  du46Count?: number
  shu2Count?: number
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/30 p-3 sm:p-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] sm:rounded-[40px] bg-white shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-8 sm:py-6 bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Ish Jurnallari</h3>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">Jurnalni tanlang</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-2 sm:p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="grid gap-3 sm:gap-4 p-4 sm:p-8 overflow-y-auto hide-scrollbar">
          <button
            onClick={() => onSelect('du46')}
            className="group relative flex items-center gap-4 sm:gap-5 rounded-[20px] sm:rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 text-left transition-all hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 active:scale-95"
          >
            {du46Count > 0 && (
              <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white shadow-lg shadow-red-500/30">
                {du46Count > 9 ? '9+' : du46Count}
              </div>
            )}
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-[16px] sm:rounded-2xl bg-purple-50 text-purple-600 transition-all group-hover:bg-white border border-transparent group-hover:border-purple-100 shadow-sm">
              <BookOpen size={24} className="sm:w-[28px] sm:h-[28px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-slate-900 tracking-tight">DU-46</h4>
                {du46Count > 0 && (
                  <span className="badge badge-danger text-[9px] px-2 py-0.5">+{du46Count}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">Ko&apos;rik, tekshiruvlar tahlili va nosozliklar jurnali</p>
            </div>
          </button>
          <button
            onClick={() => onSelect('shu2')}
            className="group relative flex items-center gap-4 sm:gap-5 rounded-[20px] sm:rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 text-left transition-all hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 active:scale-95"
          >
            {shu2Count > 0 && (
              <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white shadow-lg shadow-red-500/30">
                {shu2Count > 9 ? '9+' : shu2Count}
              </div>
            )}
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-[16px] sm:rounded-2xl bg-amber-50 text-amber-600 transition-all group-hover:bg-white border border-transparent group-hover:border-amber-100 shadow-sm">
              <BookOpen size={24} className="sm:w-[28px] sm:h-[28px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-slate-900 tracking-tight">SHU-2</h4>
                {shu2Count > 0 && (
                  <span className="badge badge-warning text-[9px] px-2 py-0.5">+{shu2Count}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">SMB va aloqa obyektlarida bajarilgan ishlar jurnali</p>
            </div>
          </button>
          <button
            onClick={() => onSelect('boshqa')}
            className="group relative flex items-center gap-4 sm:gap-5 rounded-[20px] sm:rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 text-left transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 active:scale-95"
          >
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-[16px] sm:rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-white border border-transparent group-hover:border-blue-100 shadow-sm">
              <BookOpen size={24} className="sm:w-[28px] sm:h-[28px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-slate-900 tracking-tight">Boshqa jurnallar</h4>
              </div>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">Tez kunda yangi jurnallar ro'yxati qo'shiladi</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// OY TANLASH MODAL
// ═══════════════════════════════════════════════════════════════════════════════

export function JournalMonthSelectModal({
  journalType,
  onSelect,
  onClose,
  year = new Date().getFullYear(),
  userRole,
}: {
  journalType: JournalType
  onSelect: (month: string, monthIndex: number) => void
  onClose: () => void
  year?: number
  userRole?: 'worker' | 'dispatcher'
}) {
  const currentMonth = new Date().getMonth()

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/30 p-3 sm:p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-8 sm:py-6 bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {journalType === 'du46' ? 'DU-46' : journalType === 'shu2' ? 'SHU-2' : 'ALSN'} oyini tanlang
            </h3>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">{year} yil</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-2 sm:p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:p-8 sm:grid-cols-3 md:grid-cols-4 overflow-y-auto hide-scrollbar">
          {MONTHS.map((monthName, index) => {
            const isCurrent = index === currentMonth
            const currentYear = new Date().getFullYear()
            const isFuture = year > currentYear || (year === currentYear && index > currentMonth)
            const isPast = year < currentYear || (year === currentYear && index < currentMonth)
            const isWorker = userRole === 'worker'
            const isDisabled = isFuture
            return (
              <button
                key={monthName}
                onClick={() => !isDisabled && onSelect(getJournalMonthKey(index, year), index)}
                disabled={isDisabled}
                className={`group flex flex-col rounded-2xl border p-5 text-left shadow-sm transition-all ${isDisabled
                    ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-50'
                    : isCurrent
                      ? 'border-purple-300 bg-purple-50 text-slate-900 shadow-purple-500/10 active:scale-[0.98]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50/50 active:scale-[0.98]'
                  }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={`mt-3 text-sm font-black uppercase tracking-tight ${isDisabled ? 'text-slate-300' : 'group-hover:text-purple-600'}`}>
                  {monthName}
                </span>
                {isFuture && (
                  <span className="mt-1 text-[9px] font-bold text-red-300">Hali kelmagan</span>
                )}
                {isPast && (
                  <span className="mt-1 text-[9px] font-bold text-amber-400">Faqat o&apos;qish uchun</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DU-46 VAZIFA TANLASH MODAL
// ═══════════════════════════════════════════════════════════════════════════════

export function TaskSelectModal({
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-md">
      <div className="flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-5 bg-slate-50">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Vazifa tanlash</h3>
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={20} /></button>
        </div>
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
                <button key={ti} onClick={() => {
                  const text = `[${task.manba}${task.raqam ? ` ${task.raqam}` : ''}] ${task.ish}\nDavriyligi: ${task.davriylik}\nBajaruvchi: ${task.bajaruvchi}`
                  onSelect(text)
                }}
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
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT KOMPONENTLARI
// ═══════════════════════════════════════════════════════════════════════════════

/** Sana inputi: faqat raqam kiritadi, dd-mm-yyyy formatda ko'rsatadi */
export function DateInput({ value, onChange, readOnly, placeholder = 'kk-oo-yyyy' }: {
  value: string
  onChange: (val: string) => void
  readOnly: boolean
  placeholder?: string
}) {
  const handleChange = (raw: string) => {
    if (readOnly) return
    onChange(formatDateInput(raw))
  }

  return (
    <input
      value={value}
      onChange={ev => handleChange(ev.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      className="w-full rounded bg-transparent px-1.5 py-3 text-center text-[11px] outline-none transition-all focus:bg-white focus:shadow-inner placeholder:text-slate-300 placeholder:text-[10px]"
    />
  )
}

/** Vaqt inputi: faqat raqam kiritadi, hh:mm formatda ko'rsatadi */
export function TimeInput({ value, onChange, readOnly, className: extraClass = '', placeholder = 'ss:dd' }: {
  value: string
  onChange: (val: string) => void
  readOnly: boolean
  className?: string
  placeholder?: string
}) {
  const handleChange = (raw: string) => {
    if (readOnly) return
    onChange(formatTimeInput(raw))
  }

  return (
    <input
      value={value}
      onChange={ev => handleChange(ev.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`w-full rounded px-1.5 py-3 text-center text-[11px] font-black outline-none transition-all placeholder:text-slate-300 placeholder:text-[10px] placeholder:font-normal ${extraClass}`}
    />
  )
}


