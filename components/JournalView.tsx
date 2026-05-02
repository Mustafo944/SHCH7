/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import type { DU46Entry, SHU2Entry, JournalType } from '@/types'
import { X, Plus, Trash2, BookOpen, CheckCircle2, Send, Download, ChevronLeft } from 'lucide-react'
import { TORT_HAFTALIK_REJA_FLAT, TORT_HAFTALIK_REJA } from '@/lib/reja-data'
import { MONTHS } from '@/lib/constants'

function getCurrentJournalMonth(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

function getJournalMonthLabel(month: string): string {
  const [year, rawMonth] = month.split('-')
  const monthIndex = Number(rawMonth) - 1
  return `${MONTHS[monthIndex] || rawMonth} ${year}`
}

export function getJournalMonthKey(monthIndex: number, year = new Date().getFullYear()): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// HELPERS: Sana va vaqtni avto-formatlash
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

/**
 * Sana formatlash: faqat raqamlar kiritiladi, `-` avtomatik qo'yiladi.
 * Masalan: 17042026 в†’ 17-04-2026
 */
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

/**
 * Vaqt formatlash: faqat raqamlar kiritiladi, `:` avtomatik qo'yiladi.
 * Masalan: 1405 в†’ 14:05
 */
function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// EMPTY ENTRY FACTORIES
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

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

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// JURNAL TANLASH MODAL
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-[40px] bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Ish Jurnallari</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Jurnalni tanlang</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={24} />
          </button>
        </div>
        <div className="grid gap-4 p-8">
          <button
            onClick={() => onSelect('du46')}
            className="group relative flex items-center gap-5 rounded-[28px] border border-slate-200 bg-white p-6 text-left transition-all hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 active:scale-95"
          >
            {du46Count > 0 && (
              <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white shadow-lg shadow-red-500/30">
                {du46Count > 9 ? '9+' : du46Count}
              </div>
            )}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-all group-hover:bg-white border border-transparent group-hover:border-purple-100 shadow-sm">
              <BookOpen size={28} />
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
            className="group relative flex items-center gap-5 rounded-[28px] border border-slate-200 bg-white p-6 text-left transition-all hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 active:scale-95"
          >
            {shu2Count > 0 && (
              <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white shadow-lg shadow-red-500/30">
                {shu2Count > 9 ? '9+' : shu2Count}
              </div>
            )}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-all group-hover:bg-white border border-transparent group-hover:border-amber-100 shadow-sm">
              <BookOpen size={28} />
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
        </div>
      </div>
    </div>
  )
}

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// DU-46 VAZIFA TANLASH MODAL
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

export function JournalMonthSelectModal({
  journalType,
  onSelect,
  onClose,
  year = new Date().getFullYear(),
}: {
  journalType: JournalType
  onSelect: (month: string, monthIndex: number) => void
  onClose: () => void
  year?: number
}) {
  const currentMonth = new Date().getMonth()

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {journalType === 'du46' ? 'DU-46' : 'SHU-2'} oyini tanlang
            </h3>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{year} yil</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={24} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-8 sm:grid-cols-3 md:grid-cols-4">
          {MONTHS.map((monthName, index) => {
            const isCurrent = index === currentMonth
            const currentYear = new Date().getFullYear()
            const isFuture = year > currentYear || (year === currentYear && index > currentMonth)
            return (
              <button
                key={monthName}
                onClick={() => !isFuture && onSelect(getJournalMonthKey(index, year), index)}
                disabled={isFuture}
                className={`group flex flex-col rounded-2xl border p-5 text-left shadow-sm transition-all ${isFuture
                    ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-50'
                    : isCurrent
                      ? 'border-purple-300 bg-purple-50 text-slate-900 shadow-purple-500/10 active:scale-[0.98]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50/50 active:scale-[0.98]'
                  }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={`mt-3 text-sm font-black uppercase tracking-tight ${isFuture ? 'text-slate-300' : 'group-hover:text-purple-600'}`}>
                  {monthName}
                </span>
                {isFuture && (
                  <span className="mt-1 text-[9px] font-bold text-red-300">Hali kelmagan</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

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

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------
// DU-46 INPUT KOMPONENTLARI
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

/** Sana inputi: faqat raqam kiritadi, dd-mm-yyyy formatda ko'rsatadi */
function DateInput({ value, onChange, readOnly, placeholder = 'kk-oo-yyyy' }: {
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
function TimeInput({ value, onChange, readOnly, className: extraClass = '', placeholder = 'ss:dd' }: {
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

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------
// DU-46 JURNAL KO'RINISHI
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------

export function DU46JournalView({
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
  const [entries, setEntries] = useState<DU46Entry[]>([EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46()])
  const [allEntries, setAllEntries] = useState<DU46Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [taskModalIdx, setTaskModalIdx] = useState<number | null>(null)

  // Bugungi sana va tanlangan oy
  const today = new Date()
  const selectedDay = String(today.getDate()).padStart(2, '0')
  const [jYear, jMonth] = (journalMonth || '').split('-')
  const selectedYear = jYear || String(today.getFullYear())
  const selectedMonth = jMonth || String(today.getMonth() + 1).padStart(2, '0')
  const journalMonthLabel = getJournalMonthLabel(journalMonth)

  // --- Rollar --------------------------------------------------------------------
  const isWorker = ['worker', 'elektromexanik', 'elektromontyor'].includes(userRole)
  const isBB = ['bekat_boshlighi', 'bekat_navbatchisi'].includes(userRole)
  const isDispatcher = userRole === 'dispatcher'
  const isEditor = isWorker || isBB // Yozish mumkin bo'lgan rollar

  // --- Joriy oy tekshiruvi --------------------------------------------------------
  // Eski oyga yangi yozuv kiritish mumkin emas (faqat tasdiqlanmagan
  // mavjud yozuvlarni tasdiqlash / bajarish mumkin)
  const isCurrentMonth = journalMonth === getCurrentJournalMonth()

  // --- Xabar ko'rsatish ------------------------------------------------------------
  const showMsg = (text: string, duration = 2000) => {
    setMsg(text)
    setTimeout(() => setMsg(null), duration)
  }

  // --- Ma'lumotlarni yuklash -------------------------------------------------------
  const loadJournalData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const j = await getJournal(stationId, 'du46')
      if (j && j.entries.length > 0) {
        const loadedAllEntries = j.entries as DU46Entry[]
        setAllEntries(loadedAllEntries)
        
        // Faqat tanlangan oydagi yozuvlarni ajratamiz (agar journalMonth mavjud bo'lmasa, hammasi null/undefined deb olinadi va default oyga tushadi)
        const monthEntries = loadedAllEntries.filter(e => e.journalMonth === journalMonth || (!e.journalMonth && journalMonth === getCurrentJournalMonth()))
        
        if (monthEntries.length > 0) {
          const allSubmitted = monthEntries.every(e => e.yuborildi)
          if (allSubmitted) {
            setEntries([...monthEntries, EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46()])
          } else {
            setEntries(monthEntries)
          }
        } else {
          setEntries([EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46()])
        }
      } else {
        setAllEntries([])
        setEntries([EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46(), EMPTY_DU46()])
      }
    } catch (err) {
      console.error('Journal yuklash xatosi:', err)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [stationId, journalMonth])

  useEffect(() => {
    loadJournalData(false)

    const channel = supabase
      .channel(`journal_du46_${userRole}_${stationId}_${journalMonth}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'station_journals', filter: `station_id=eq.${stationId}` },
        () => loadJournalData(true)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [stationId, userRole, journalMonth, loadJournalData])

  // --- Yordamchi: qaysi rol yaratgan -----------------------------------------------
  /** Qator kim tomonidan yaratilgan bo'lsa, shu rolni qaytaradi. Agar belgilanmagan bo'lsa default `worker` */
  const getCreator = (e: DU46Entry): 'worker' | 'bekat_boshlighi' => e.createdByRole || 'worker'

  /** Joriy foydalanuvchi qatorni yaratgani (yozuvchi)mi? */
  const isCreator = (e: DU46Entry): boolean => {
    const creator = getCreator(e)
    return (creator === 'worker' && isWorker) || (creator === 'bekat_boshlighi' && isBB)
  }

  /** Joriy foydalanuvchi tasdiqlash (confirmer) rolimi? */
  const isConfirmer = (e: DU46Entry): boolean => {
    const creator = getCreator(e)
    return (creator === 'worker' && isBB) || (creator === 'bekat_boshlighi' && isWorker)
  }

  // --- Input yangilash -------------------------------------------------------------
  const update = (i: number, field: keyof DU46Entry, val: string) => {
    const n = [...entries]
    n[i] = { ...n[i], [field]: val }

    // Agar birinchi marta yozuvchi ma'lumot kiritayotgan bo'lsa, createdByRole ni belgilaymiz
    if (!n[i].createdByRole && (field === 'kamchilik' || field === 'oyKun1' || field === 'soatMinut1')) {
      if (isWorker) n[i].createdByRole = 'worker'
      if (isBB) n[i].createdByRole = 'bekat_boshlighi'
    }

    setEntries(n)
  }

  // --- Qator boshqaruvi ------------------------------------------------------------
  // Eski oyda yangi qator qo'shish mumkin emas
  const addRow = () => { if (isCurrentMonth) setEntries([...entries, EMPTY_DU46()]) }

  const removeRow = () => {
    if (entries.length <= 1) return
    const last = entries[entries.length - 1]
    if (last.kamchilik || last.bartarafInfo || last.yuborildi) return
    setEntries(entries.slice(0, -1))
  }

  // --- Saqlash (optimistik) --------------------------------------------------------
  const saveEntries = async (updated: DU46Entry[], prev: DU46Entry[]) => {
    setEntries(updated)
    
    // Tanlangan oydagi ma'lumotlarni umumiy ro'yxatga qo'shamiz
    const updatedWithMonth = updated.map(e => ({ ...e, journalMonth }))
    const otherMonths = allEntries.filter(e => e.journalMonth !== journalMonth && !( !e.journalMonth && journalMonth === getCurrentJournalMonth() ))
    const newAllEntries = [...otherMonths, ...updatedWithMonth]
    setAllEntries(newAllEntries)

    try {
      await upsertJournal(stationId, 'du46', newAllEntries, userName)
    } catch (err) {
      console.error('Saqlash xatosi:', err)
      setEntries(prev)
      setAllEntries(allEntries) // roll back
      showMsg(err instanceof Error ? err.message : 'Xatolik', 3000)
      throw err
    }
  }

  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // USTUN 3: BOSHLANDI + TASDIQLASH
  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------

  /** Yozuvchi "Boshlandi" tugmasini bosadi */
  const handleKamchilikBoshlandi = async (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    updated[i] = {
      ...updated[i],
      kamchilikBajarildi: true,
      kamchilikBajarildiAt: new Date().toISOString(),
      kamchilikImzo: userName,
    }
    try {
      await saveEntries(updated, prev)
      showMsg('Boshlandi belgilandi!')
      onAccepted?.() // worker action completed
    } catch { /* saveEntries ichida xato ko'rsatiladi */ }
  }

  /** Tasdiqlash rolni bosadi — vaqt avtomatik qo'yiladi */
  const handleKamchilikTasdiqlash = async (i: number) => {
    const now = new Date()
    const autoVaqt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const prev = [...entries]
    const updated = [...entries]
    updated[i] = {
      ...updated[i],
      kamchilikBBTasdiqladi: true,
      kamchilikBBTasdiqladiAt: now.toISOString(),
      kamchilikBBImzo: userName,
      kamchilikBBVaqt: autoVaqt,
    }
    try {
      await saveEntries(updated, prev)
      showMsg('Tasdiqlandi!')
    } catch { /* */ }
  }

  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // USTUN 12: BAJARILDI + TASDIQLASH
  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------

  /** Yozuvchi "Bajarildi" bosadi */
  const handleBartarafBajarildi = async (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    updated[i] = {
      ...updated[i],
      bartarafBajarildi: true,
      bartarafBajarildiAt: new Date().toISOString(),
      bartarafImzo: userName,
    }
    try {
      await saveEntries(updated, prev)
      showMsg('Bajarildi belgilandi!')
      onAccepted?.() // worker action completed
    } catch { /* */ }
  }

  /** Tasdiqlash rolni bosadi — vaqt avtomatik qo'yiladi */
  const handleBartarafTasdiqlash = async (i: number) => {
    const now = new Date()
    const autoVaqt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const prev = [...entries]
    const updated = [...entries]
    updated[i] = {
      ...updated[i],
      bartarafBBTasdiqladi: true,
      bartarafBBTasdiqladiAt: now.toISOString(),
      bartarafBBImzo: userName,
      bartarafBBVaqt: autoVaqt,
    }
    try {
      await saveEntries(updated, prev)
      showMsg('Tasdiqlandi!')
    } catch { /* */ }
  }

  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // DISPETCHERGA YUBORISH / QABUL QILISH
  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------

  const handleDispetchergaYuborish = async () => {
    const prev = [...entries]
    const updated = entries.map(e => {
      if (!e.yuborildi && (e.kamchilik || e.bartarafInfo) && e.kamchilikBBTasdiqladi && e.bartarafBBTasdiqladi) {
        return { ...e, yuborildi: true, dispetcherQabulQildi: false }
      }
      return e
    })
    try {
      await saveEntries(updated, prev)
      showMsg('Yuborildi!')
    } catch { /* */ }
  }

  const handleDispetcherQabulQilish = async () => {
    const prev = [...entries]
    const updated = entries.map(e =>
      e.yuborildi && !e.dispetcherQabulQildi
        ? { ...e, dispetcherQabulQildi: true, dispetcherImzo: userName }
        : e
    )
    try {
      await saveEntries(updated, prev)
      showMsg('Qabul qilindi!')
      onAccepted?.()  // parent ni xabar ber
    } catch { /* */ }
  }

  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // PDF YUKLAB OLISH
  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------

  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const dateStr = `${selectedDay}.${selectedMonth}.${selectedYear}`
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`DU-46 Jurnali - ${stationName}`, 14, 15)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Sana: ${dateStr}`, 14, 22)

    const tableColumn = ['№', 'Oy va kun', 'Soat va daqiqa', 'Kamchilik bayoni', 'Oy/kun (xabar)', 'Soat (xabar)', 'Xabar usuli', 'Oy/kun (kelish)', 'Soat (kelish)', 'Kelgan imzo', 'Oy/kun (bartaraf)', 'Soat (bartaraf)', 'Bartaraf tafsiloti', 'Bajardi', 'Tasdiqladi']
    const tableRows = entries
      .filter(e => e.kamchilik || e.bartarafInfo || e.oyKun1 || e.soatMinut1)
      .map((e, i) => [
        e.nomber || String(i + 1),
        e.oyKun1 || '', e.soatMinut1 || '', e.kamchilik || '',
        e.oyKun2 || '', e.soatMinut2 || '', e.xabarUsuli || '',
        e.oyKun3 || '', e.soatMinut3 || '', e.dspImzo || '',
        e.oyKun4 || '', e.soatMinut4 || '', e.bartarafInfo || '',
        e.bartarafBajarildi ? e.bartarafImzo : '-',
        e.bartarafBBTasdiqladi ? e.bartarafBBImzo : '-',
      ])

    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: 28, theme: 'grid',
      styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [8, 23, 40], textColor: [255, 255, 255], fontSize: 5.5, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: { 0: { halign: 'center', cellWidth: 8 } },
    })

    doc.save(`DU-46_${stationName}_${dateStr.replace(/\./g, '-')}.pdf`)
  }

  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // COMPUTED VALUES
  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------

  const hasAnyEntry = entries.some(e => e.kamchilik || e.bartarafInfo)
  const tasdiqlanganCount = entries.filter(e => !e.yuborildi && (e.kamchilik || e.bartarafInfo) && e.kamchilikBBTasdiqladi && e.bartarafBBTasdiqladi).length
  const kutilayotganCount = entries.filter(e => e.yuborildi && !e.dispetcherQabulQildi).length

  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------------------------------------------------------------------------------------------------

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-300 font-bold uppercase tracking-widest">Yuklanmoqda...</div>

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50">
      {/* — Header ————————————————————————————————————————————————————————————————————— */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-8 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">DU-46 Jurnali</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stationName} · {journalMonthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {!isCurrentMonth && !isDispatcher && (
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
              Faqat ko&apos;rish (o&apos;tgan oy)
            </span>
          )}
          {msg && <span className={`text-xs font-bold px-3 py-1 rounded-full border ${msg.includes('!') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{msg}</span>}
        </div>
      </div>

      {/* в”Ђв”Ђ Content в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Orqaga */}
        <button onClick={onClose} className="mb-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]">
          <ChevronLeft size={18} />
          <span>Orqaga</span>
        </button>

        {/* Sana va Yuklab olish */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Sana:</span>
            <div className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200">
              {selectedDay}.{selectedMonth}.{selectedYear}
            </div>
          </div>
          <button onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
            <Download size={14} /> Yuklab olish
          </button>
        </div>

        {/* в”Ђв”Ђ Jadval в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <table style={{ minWidth: '1400px' }} className="w-full border-collapse text-[11px] text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-tight text-slate-500 border-b-2 border-slate-200">
              <tr>
                <th rowSpan={2} className="w-[3%] border-r border-b border-slate-200 p-3 text-center">в„–</th>
                <th rowSpan={2} className="w-[5%] border-r border-b border-slate-200 p-3 text-center">Oy va<br />kun</th>
                <th rowSpan={2} className="w-[5%] border-r border-b border-slate-200 p-3 text-center">Soat va<br />daqiqa</th>
                <th rowSpan={2} className="w-[18%] border-r border-b border-slate-200 p-3 text-center">Ko&apos;rik, tekshiruvlar tahlili,<br />topilgan kamchiliklar bayoni</th>
                <th colSpan={3} className="border-r border-b border-slate-200 p-3 text-center bg-purple-50/30">Tegishli xodimga<br />xabar berilgan vaqt</th>
                <th colSpan={3} className="border-r border-b border-slate-200 p-3 text-center bg-purple-50/30">Tegishli xodimning nosozlik va buzilishlarni<br />bartaraf etishga kelgan vaqti</th>
                <th colSpan={3} className="border-b border-slate-200 p-3 text-center bg-amber-50/20">Aniqlangan nosozliklar va buzilishlarni bartaraf qilganligi vaqti<br />va xodimning imzosi</th>
              </tr>
              <tr className="bg-slate-100/50">
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Oy/kun</th>
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Soat va daqiqa</th>
                <th className="w-[7%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Xabar berish<br />usuli</th>
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Oy/kun</th>
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Soat va daqiqa</th>
                <th className="w-[7%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Bartaraf etishga kelgan<br />xodimning imzosi</th>
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-amber-600 font-black">Oy/kun</th>
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-amber-600 font-black">Soat va daqiqa</th>
                <th className="w-[15%] border-b border-slate-200 p-3 text-center text-amber-600 font-black">Nosozliklar va buzilishlarning tafsiloti</th>
              </tr>
              <tr className="bg-slate-50">
                {['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((n, i) => (
                  <th key={i} className="border-r border-b border-slate-200 p-2 text-center text-[9px] font-black text-slate-400 last:border-r-0 bg-slate-50">{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const iAmCreator = isCreator(e)
                const iAmConfirmer = isConfirmer(e)

                // Yozish ruxsati: yaratuvchi yoki hali hech kim yozmagan
                // + FAQAT joriy oy uchun yangi yozuv kiritish mumkin
                const hasNoCreator = !e.createdByRole && !e.kamchilik && !e.oyKun1 && !e.soatMinut1
                const canWriteCol3 = isCurrentMonth && !e.yuborildi && !e.kamchilikBBTasdiqladi && (iAmCreator || hasNoCreator) && !isDispatcher

                // Ustun 12 (Bartaraf): faqat elektromexanik (worker) yoza oladi
                // O'tgan oyda ham tasdiqlash va bajarish mumkin (bajarilmagan ishlar uchun)
                const canWriteCol12 = !e.yuborildi && !e.bartarafBBTasdiqladi && e.kamchilikBBTasdiqladi && !isDispatcher && isWorker

                // 4-9 ustunlar (oraliq): yaratuvchi yoza oladi (faqat joriy oy)
                const canWriteMiddle = isCurrentMonth && !e.yuborildi && !isDispatcher && (iAmCreator || hasNoCreator)

                return (
                  <tr key={i} className="border-b border-slate-200 hover:bg-blue-50/50 transition-colors animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    {/* в”Ђв”Ђ в„– в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
                    <td className="border-r border-slate-200 p-1 text-center bg-slate-50/30">
                      <input
                        value={e.nomber}
                        onChange={ev => {
                          const n = [...entries]
                          n[i] = { ...n[i], nomber: ev.target.value }
                          setEntries(n)
                        }}
                        readOnly={isDispatcher || !!e.yuborildi}
                        placeholder={String(i + 1)}
                        className="w-full rounded bg-transparent text-center font-black text-slate-400 outline-none focus:bg-white transition-all focus:text-purple-600"
                      />
                    </td>

                    {/* в”Ђв”Ђ Ustun 1: Oy va kun в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
                    <td className="border-r border-slate-200 p-0.5">
                      <DateInput
                        value={e.oyKun1 || ''}
                        onChange={val => update(i, 'oyKun1', val)}
                        readOnly={!canWriteCol3}
                      />
                    </td>

                    {/* в”Ђв”Ђ Ustun 2: Soat va daqiqa в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
                    <td className="border-r border-slate-200 p-0.5 align-top relative bg-purple-50/10">
                      <div className="pb-[85px]">
                        <TimeInput
                          value={e.soatMinut1 || ''}
                          onChange={val => update(i, 'soatMinut1', val)}
                          readOnly={!canWriteCol3}
                          className={e.kamchilikBajarildi ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-transparent focus:bg-white focus:shadow-inner'}
                        />
                      </div>

                      {/* Tasdiqlash vaqti (pastda) вЂ” avtomatik qo'yiladi */}
                      {e.kamchilik && e.kamchilikBajarildi && (
                        <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center justify-end">
                          {e.kamchilikBBTasdiqladi && e.kamchilikBBVaqt ? (
                            <div className="w-full rounded-xl bg-amber-100 px-2 py-2 text-center text-[10px] font-black text-amber-700 border border-amber-200 shadow-sm">
                              {e.kamchilikBBVaqt}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>

                    {/* в”Ђв”Ђ Ustun 3: Kamchilik bayoni в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
                    <td className="border-r border-slate-200 p-0.5 align-top relative min-w-[200px]">
                      <div className="pb-[85px]">
                        {isDispatcher ? (
                          <div className="w-full rounded px-3 py-2 text-[11px] font-medium text-slate-700 bg-white min-h-[60px]">
                            {e.kamchilik || <span className="text-slate-300">вЂ”</span>}
                          </div>
                        ) : (
                          <div className="relative group/text">
                            <textarea
                              value={e.kamchilik || ''}
                              onChange={ev => update(i, 'kamchilik', ev.target.value)}
                              readOnly={!canWriteCol3}
                              rows={3}
                              spellCheck={false}
                              lang="uz"
                              className="w-full resize-y rounded bg-transparent px-3 py-2 text-[11px] font-medium text-slate-700 outline-none transition-all focus:bg-white focus:shadow-inner"
                            />
                            {canWriteCol3 && (
                              <button onClick={() => setTaskModalIdx(i)} className="absolute top-1 right-1 p-1.5 rounded-lg bg-purple-50 text-purple-600 opacity-0 group-hover/text:opacity-100 transition-all hover:bg-purple-600 hover:text-white shadow-sm border border-purple-100">
                                <Plus size={10} strokeWidth={3} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* в”Ђв”Ђ Boshlandi / Tasdiqlash tugmalari в”Ђв”Ђв”Ђв”Ђ */}
                      <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1.5">
                        {/* Yozuvchi: Boshlandi tugmasi */}
                        {e.kamchilik && iAmCreator && !e.kamchilikBajarildi && !e.yuborildi && (
                          <button
                            onClick={() => handleKamchilikBoshlandi(i)}
                            disabled={!e.oyKun1 || !e.soatMinut1}
                            className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${(!e.oyKun1 || !e.soatMinut1) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'btn-gradient'}`}
                          >
                            в–¶ Boshlandi
                          </button>
                        )}

                        {/* Boshlandi badge */}
                        {e.kamchilikBajarildi && (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Boshladi:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.kamchilikImzo}</span>
                            </div>
                          </div>
                        )}

                        {/* Tasdiqlash tugmasi (ikkinchi rol uchun) */}
                        {e.kamchilik && !e.kamchilikBBTasdiqladi && iAmConfirmer && !e.yuborildi && (
                          <button
                            onClick={() => handleKamchilikTasdiqlash(i)}
                            disabled={!e.kamchilikBajarildi}
                            className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${!e.kamchilikBajarildi ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 border-transparent'}`}
                          >
                            Tasdiqlash
                          </button>
                        )}

                        {/* Tasdiqlandi badge */}
                        {e.kamchilikBBTasdiqladi && (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tasdiqladi:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 border border-amber-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.kamchilikBBImzo}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* в”Ђв”Ђ Ustunlar 4-9 (oraliq) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
                    {(['oyKun2', 'soatMinut2', 'xabarUsuli', 'oyKun3', 'soatMinut3', 'dspImzo'] as (keyof DU46Entry)[]).map((field, fi) => (
                      <td key={fi} className="border-r border-slate-200 p-0.5 bg-purple-50/5">
                        {(field === 'oyKun2' || field === 'oyKun3') ? (
                          <DateInput
                            value={(e[field] as string) || ''}
                            onChange={val => update(i, field, val)}
                            readOnly={!canWriteMiddle}
                          />
                        ) : (field === 'soatMinut2' || field === 'soatMinut3') ? (
                          <TimeInput
                            value={(e[field] as string) || ''}
                            onChange={val => update(i, field, val)}
                            readOnly={!canWriteMiddle}
                            className="bg-transparent focus:bg-white focus:shadow-inner"
                          />
                        ) : (
                          <input
                            value={(e[field] as string) || ''}
                            onChange={ev => update(i, field, ev.target.value)}
                            readOnly={!canWriteMiddle}
                            className="w-full rounded bg-transparent px-1.5 py-3 text-center text-[11px] outline-none transition-all focus:bg-white focus:shadow-inner"
                          />
                        )}
                      </td>
                    ))}

                    {/* в”Ђв”Ђ Ustun 10: Oy/kun в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
                    <td className="border-r border-slate-200 p-0.5">
                      <DateInput
                        value={e.oyKun4 || ''}
                        onChange={val => update(i, 'oyKun4', val)}
                        readOnly={!canWriteCol12}
                      />
                    </td>

                    {/* в”Ђв”Ђ Ustun 11: Soat va daqiqa в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
                    <td className="border-r border-slate-200 p-0.5 align-top relative bg-amber-50/5">
                      <div className="pb-[85px]">
                        <TimeInput
                          value={e.soatMinut4 || ''}
                          onChange={val => update(i, 'soatMinut4', val)}
                          readOnly={!canWriteCol12}
                          className={e.bartarafBajarildi ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-transparent focus:bg-white focus:shadow-inner'}
                        />
                      </div>

                      {/* Tasdiqlash vaqti (pastda) вЂ” avtomatik qo'yiladi */}
                      {e.bartarafInfo && e.bartarafBajarildi && e.kamchilikBBTasdiqladi && (
                        <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center justify-end">
                          {e.bartarafBBTasdiqladi && e.bartarafBBVaqt ? (
                            <div className="w-full rounded-xl bg-amber-100 px-2 py-2 text-center text-[10px] font-black text-amber-700 border border-amber-200 shadow-sm">
                              {e.bartarafBBVaqt}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>

                    {/* в”Ђв”Ђ Ustun 12: Bartaraf tafsiloti в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
                    <td className="p-0.5 align-top relative bg-amber-50/5 min-w-[200px]">
                      <div className="pb-[85px]">
                        {isDispatcher ? (
                          <div className="w-full rounded px-3 py-2 text-[11px] font-medium text-slate-700 bg-white min-h-[60px]">
                            {e.bartarafInfo || <span className="text-slate-300">вЂ”</span>}
                          </div>
                        ) : (
                          <textarea
                            value={e.bartarafInfo || ''}
                            onChange={ev => update(i, 'bartarafInfo', ev.target.value)}
                            readOnly={!canWriteCol12}
                            rows={3}
                            spellCheck={false}
                            lang="uz"
                            className={`w-full resize-y rounded px-3 py-2 text-[11px] font-medium outline-none transition-all ${
                              !canWriteCol12 && !e.bartarafInfo
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : canWriteCol12
                                  ? 'bg-transparent focus:bg-white focus:shadow-inner text-slate-700'
                                  : 'bg-transparent text-slate-700 cursor-not-allowed'
                            }`}
                            placeholder={!e.kamchilikBBTasdiqladi ? '3-ustun tasdiqlanishi kerak...' : ''}
                          />
                        )}
                      </div>

                      {/* в”Ђв”Ђ Bajarildi / Tasdiqlash tugmalari в”Ђв”Ђ */}
                      <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1.5">
                        {/* Elektromexanik: Bajarildi tugmasi */}
                        {e.bartarafInfo && isWorker && !e.bartarafBajarildi && !e.yuborildi && (
                          <button
                            onClick={() => handleBartarafBajarildi(i)}
                            disabled={!e.oyKun4 || !e.soatMinut4 || !e.kamchilikBajarildi}
                            className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${(!e.oyKun4 || !e.soatMinut4 || !e.kamchilikBajarildi) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'btn-gradient'}`}
                          >
                            Bajarildi
                          </button>
                        )}

                        {/* Bajarildi badge */}
                        {e.bartarafBajarildi && (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bajardi:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.bartarafImzo}</span>
                            </div>
                          </div>
                        )}

                        {/* Bekat Boshlig'i: Tasdiqlash tugmasi (doimo) */}
                        {e.bartarafInfo && !e.bartarafBBTasdiqladi && isBB && !e.yuborildi && (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <button
                              onClick={() => handleBartarafTasdiqlash(i)}
                              disabled={!e.bartarafBajarildi || !e.kamchilikBBTasdiqladi}
                              className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${(!e.bartarafBajarildi || !e.kamchilikBBTasdiqladi) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 border-transparent'}`}
                            >
                              Tasdiqlash
                            </button>
                            {!e.kamchilikBBTasdiqladi && (
                              <span className="text-[8px] font-black text-red-400 text-center leading-tight px-1 mt-1 uppercase tracking-tighter">
                                3-ustun tasdiqlanmagan
                              </span>
                            )}
                          </div>
                        )}

                        {/* Tasdiqlandi badge */}
                        {e.bartarafBBTasdiqladi && (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tasdiqladi:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 border border-amber-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.bartarafBBImzo}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ——— Qator qo'shish / o'chirish ————————————————— */}
        {isEditor && (() => {
          const last = entries[entries.length - 1]
          const lastHasData = last.kamchilik || last.bartarafInfo
          const canRemove = entries.length > 1 && !lastHasData
          return (
            <div className="mt-6 flex items-center gap-3">
              <button onClick={addRow} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95">
                <Plus size={14} strokeWidth={3} /> <span className="uppercase tracking-widest">Qator qo&apos;shish</span>
              </button>
              <button onClick={removeRow} disabled={!canRemove}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition-all shadow-sm active:scale-95 ${canRemove
                  ? 'border-slate-200 bg-white text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50'
                  : 'border-slate-100 bg-slate-50/50 text-slate-300 cursor-not-allowed'
                }`}>
                <Trash2 size={14} strokeWidth={3} /> <span className="uppercase tracking-widest">Qator o&apos;chirish</span>
              </button>
            </div>
          )
        })()}

        {/* ——— Yuborish (ishchi yoki BB) —————————————————————————— */}
        {isEditor && hasAnyEntry && (
          <>
            {/* Kutilayotgan status */}
            {kutilayotganCount > 0 && (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-purple-50 py-4 text-sm font-black text-purple-600 border border-purple-100 uppercase tracking-widest shadow-sm">
                <Send size={18} strokeWidth={2.5} /> {kutilayotganCount} ta tasdiq kutilmoqda
              </div>
            )}
            {/* Barcha qabul qilingan */}
            {entries.some(e => e.yuborildi) && kutilayotganCount === 0 && (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-4 text-sm font-black text-emerald-600 border border-emerald-100 uppercase tracking-widest shadow-sm">
                <CheckCircle2 size={18} strokeWidth={2.5} /> Barcha yozuvlar dispetcher tomonidan qabul qilingan
              </div>
            )}
            {/* Yuborish tugmasi */}
            {tasdiqlanganCount > 0 && (
              <div className="mt-8 flex items-center justify-end gap-4">
                <span className="text-sm font-medium text-slate-500">
                  {tasdiqlanganCount} ta {tasdiqlanganCount === 1 ? 'yozuv' : 'yozuvlar'} tasdiqlangan
                </span>
                <button
                  onClick={handleDispetchergaYuborish}
                  className="flex items-center gap-3 rounded-xl bg-purple-600 px-8 py-4 font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:bg-purple-700 hover:scale-[1.02] active:scale-95"
                >
                  <Send size={20} strokeWidth={2.5} />
                  <span>Dispetcherga yuborish</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ——— Dispetcher: Qabul qilish ———————————————————————————— */}
        {isDispatcher && hasAnyEntry && entries.some(e => e.yuborildi && !e.dispetcherQabulQildi) && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleDispetcherQabulQilish}
              className="flex items-center gap-3 rounded-xl bg-emerald-600 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:scale-[1.02] active:scale-95"
            >
              <CheckCircle2 size={20} strokeWidth={2.5} />
              <span>Qabul qilish</span>
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

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// SHU-2 JURNAL KO'RINISHI (O'ZGARISHSIZ)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

export function SHU2JournalView({
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
  const [entries, setEntries] = useState<SHU2Entry[]>(Array.from({ length: 7 }, (_, i) => ({ ...EMPTY_SHU2(), nomber: String(i + 1) })))
  const [allEntries, setAllEntries] = useState<SHU2Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const isWorker = ['worker', 'elektromexanik', 'elektromontyor'].includes(userRole)
  const isDispatcher = userRole === 'dispatcher'

  const loadJournalData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const j = await getJournal(stationId, 'shu2')
      if (j && j.entries.length > 0) {
        const loadedAllEntries = j.entries as SHU2Entry[]
        setAllEntries(loadedAllEntries)
        
        const monthEntries = loadedAllEntries.filter(e => e.journalMonth === journalMonth || (!e.journalMonth && journalMonth === getCurrentJournalMonth()))
        
        if (monthEntries.length > 0) {
          setEntries(monthEntries)
        } else {
          setEntries(Array.from({ length: 7 }, (_, i) => ({ ...EMPTY_SHU2(), nomber: String(i + 1) })))
        }
      } else {
        setAllEntries([])
        setEntries(Array.from({ length: 7 }, (_, i) => ({ ...EMPTY_SHU2(), nomber: String(i + 1) })))
      }
    } catch (err) {
      console.error('❌ SHU-2 journal yuklash xatosi:', err)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [stationId, journalMonth])

  useEffect(() => {
    loadJournalData(false)

    const channel = supabase
      .channel(`journal_shu2_${userRole}_${stationId}_${journalMonth}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'station_journals', filter: `station_id=eq.${stationId}` },
        () => loadJournalData(true)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [stationId, userRole, journalMonth, loadJournalData])

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
      await upsertJournal(stationId, 'shu2', updated, userName)
      setMsg('Tasdiqlandi!')
      onAccepted?.() // worker action completed
      setTimeout(() => setMsg(null), 2000)
    } catch (err) {
      console.error('❌ SHU-2 Tasdiqlash xatosi:', err)
      setEntries(prev)
      setMsg(err instanceof Error ? err.message : 'Xatolik')
      setTimeout(() => setMsg(null), 3000)
    }
  }

  // Yuborish va Qabul qilish funksiyalari (SHU-2 uchun) o'chirildi, chunki Bajarildi tugmasi hammasini qiladi

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

    const tableColumn = ['в„–', 'Sana', 'Navbatchilikdagi yozuv va bajarilgan ishlar nomi', 'Imzo']
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
          <table className="w-full border-collapse text-[12px] text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-tight text-slate-500 border-b-2 border-slate-200">
              <tr>
                <th className="w-[6%] border-r border-b border-slate-200 p-4 text-center">в„–</th>
                <th className="w-[14%] border-r border-b border-slate-200 p-4 text-center">Sana</th>
                <th className="w-[60%] border-r border-b border-slate-200 p-4 text-center text-left">Navbatchilikdagi yozuv va bajarilgan ishlar nomi</th>
                <th className="w-[20%] border-b border-slate-200 p-4 text-center">Imzo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const dispHidesRow = isDispatcher && !e.yuborildi
                const displaySana = dispHidesRow ? '' : (e.sana || '')
                const displayYozuv = dispHidesRow ? '' : (e.yozuv || '')
                const isLocked = dispHidesRow ? false : !!e.tasdiqlandi

                return (
                  <tr key={i} className={`border-b border-slate-200 hover:bg-blue-50/50 transition-colors animate-fade-up ${isLocked ? 'bg-emerald-50/30' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="border-r border-slate-200 p-1 text-center bg-slate-50/30">
                      <input
                        value={e.nomber || ''}
                        onChange={ev => update(i, 'nomber', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        placeholder={String(i + 1)}
                        className="w-full rounded bg-transparent text-center font-black text-slate-400 outline-none transition-all focus:bg-white focus:text-purple-600"
                      />
                    </td>
                    <td className="border-r border-slate-200 p-0.5">
                      <DateInput
                        value={displaySana}
                        onChange={val => update(i, 'sana', val)}
                        readOnly={!isWorker || isLocked}
                        placeholder="kk-oo-yyyy"
                      />
                    </td>
                    <td className="border-r border-slate-200 p-0.5">
                      <textarea value={displayYozuv} onChange={ev => update(i, 'yozuv', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        spellCheck={false}
                        lang="uz"
                        className={`min-h-[70px] w-full resize-none rounded bg-white px-3 py-3 text-[12px] font-medium outline-none transition-colors focus:shadow-inner ${isLocked ? 'text-slate-400' : 'text-slate-900'}`} />
                    </td>
                    <td className="p-1">
                      <div className="flex flex-col items-center gap-1">
                        {isLocked ? (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bajardi:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-1.5 text-[10px] font-bold text-purple-600 border border-purple-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={10} strokeWidth={3} /> <span className="truncate">{e.tasdiqlaganImzo || e.imzo}</span>
                            </div>
                          </div>
                        ) : isWorker ? (
                          <button onClick={() => handleTasdiqlash(i)}
                            disabled={!(e.sana?.trim() && e.yozuv?.trim())}
                            className={`w-full rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${e.sana?.trim() && e.yozuv?.trim() ? 'btn-gradient' : 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed'}`}>
                            Bajarildi
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-slate-200">вЂ”</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {isWorker && (
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


