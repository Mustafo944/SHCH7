/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import type { JournalType } from '@/types'
import { X, BookOpen } from 'lucide-react'
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 transition-all">
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] sm:rounded-[40px] bg-white shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-8 sm:py-6 bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Ish Jurnallari</h3>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-400">Jurnalni tanlang</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-2 sm:p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="grid gap-3 sm:gap-4 p-4 sm:p-8 overflow-y-auto hide-scrollbar">
          <button
            onClick={() => onSelect('du46')}
            className="group relative flex items-center gap-4 sm:gap-5 rounded-[20px] sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left transition-all hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 active:scale-95"
          >
            {du46Count > 0 && (
              <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white shadow-lg shadow-red-500/30">
                {du46Count > 9 ? '9+' : du46Count}
              </div>
            )}
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-[16px] sm:rounded-2xl bg-purple-50 text-purple-600 transition-all group-hover:bg-white border border-transparent group-hover:border-purple-100 shadow-sm">
              <BookOpen size={26} className="sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">DU-46</h4>
                {du46Count > 0 && (
                  <span className="badge badge-danger text-[9px] px-2 py-0.5">+{du46Count}</span>
                )}
              </div>
              <p className="mt-1 text-sm font-bold text-slate-500 leading-relaxed">Ko&apos;rik, tekshiruvlar tahlili va nosozliklar jurnali</p>
            </div>
          </button>
          <button
            onClick={() => onSelect('shu2')}
            className="group relative flex items-center gap-4 sm:gap-5 rounded-[20px] sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left transition-all hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 active:scale-95"
          >
            {shu2Count > 0 && (
              <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white shadow-lg shadow-red-500/30">
                {shu2Count > 9 ? '9+' : shu2Count}
              </div>
            )}
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-[16px] sm:rounded-2xl bg-amber-50 text-amber-600 transition-all group-hover:bg-white border border-transparent group-hover:border-amber-100 shadow-sm">
              <BookOpen size={26} className="sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">SHU-2</h4>
                {shu2Count > 0 && (
                  <span className="badge badge-warning text-[9px] px-2 py-0.5">+{shu2Count}</span>
                )}
              </div>
              <p className="mt-1 text-sm font-bold text-slate-500 leading-relaxed">SMB va aloqa obyektlarida bajarilgan ishlar jurnali</p>
            </div>
          </button>
          <button
            onClick={() => onSelect('boshqa')}
            className="group relative flex items-center gap-4 sm:gap-5 rounded-[20px] sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 active:scale-95"
          >
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-[16px] sm:rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-white border border-transparent group-hover:border-blue-100 shadow-sm">
              <BookOpen size={26} className="sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Boshqa jurnallar</h4>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-500 leading-relaxed">Tez kunda yangi jurnallar ro'yxati qo'shiladi</p>
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 transition-all">
      <div className="w-full max-w-2xl overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-8 sm:py-6 bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {journalType === 'du46' ? 'DU-46' : journalType === 'shu2' ? 'SHU-2' : 'ALSN'} oyini tanlang
            </h3>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-400">{year} yil</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-2 sm:p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="grid flex-1 min-h-0 grid-cols-2 gap-3 p-4 sm:p-8 sm:grid-cols-3 md:grid-cols-4 overflow-y-auto hide-scrollbar content-start">
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
                className={`group flex min-h-[108px] flex-col justify-center items-center gap-2 rounded-2xl border p-4 sm:p-5 text-center shadow-sm transition-all ${isDisabled
                    ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
                    : isCurrent
                      ? 'border-purple-300 bg-purple-50 shadow-purple-500/10 active:scale-[0.98]'
                      : 'border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-50/50 active:scale-[0.98]'
                  }`}
              >
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isDisabled ? 'text-slate-300' : 'text-slate-400'}`}>
                    {String(index + 1).padStart(2, '0')}-oy
                  </span>
                  <h4 className={`mt-0.5 text-lg font-black uppercase tracking-tight ${isDisabled
                      ? 'text-slate-300'
                      : isCurrent
                        ? 'text-purple-700'
                        : 'text-slate-800 group-hover:text-purple-600'
                    }`}>
                    {monthName}
                  </h4>
                </div>
                {isFuture && (
                  <span className="shrink-0 w-fit max-w-full truncate rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-red-600">
                    Hali kelmagan
                  </span>
                )}
                {isCurrent && (
                  <span className="shrink-0 w-fit max-w-full truncate rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-purple-600">
                    Joriy oy
                  </span>
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
// INPUT KOMPONENTLARI
// ═══════════════════════════════════════════════════════════════════════════════

/** Sana inputi: faqat raqam kiritadi, dd-mm-yyyy formatda ko'rsatadi */
export function DateInput({ value, onChange, readOnly, placeholder = 'kk-oo-yyyy' }: {
  value: string
  onChange: (val: string) => void
  readOnly: boolean
  placeholder?: string
}) {
  const [val, setVal] = useState(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => setVal(value), [value])

  useEffect(() => {
    if (val !== value) {
      const timer = setTimeout(() => onChangeRef.current(val), 50)
      return () => clearTimeout(timer)
    }
  }, [val, value])

  const handleChange = (raw: string) => {
    if (readOnly) return
    setVal(formatDateInput(raw))
  }

  return (
    <input
      value={val}
      onChange={ev => handleChange(ev.target.value)}
      onBlur={() => { if (val !== value) onChange(val) }}
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
  const [val, setVal] = useState(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => setVal(value), [value])

  useEffect(() => {
    if (val !== value) {
      const timer = setTimeout(() => onChangeRef.current(val), 50)
      return () => clearTimeout(timer)
    }
  }, [val, value])

  const handleChange = (raw: string) => {
    if (readOnly) return
    setVal(formatTimeInput(raw))
  }

  return (
    <input
      value={val}
      onChange={ev => handleChange(ev.target.value)}
      onBlur={() => { if (val !== value) onChange(val) }}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`w-full rounded px-1.5 py-3 text-center text-[11px] font-black outline-none transition-all placeholder:text-slate-300 placeholder:text-[10px] placeholder:font-normal ${extraClass}`}
    />
  )
}


