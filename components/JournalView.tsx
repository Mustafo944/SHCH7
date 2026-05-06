/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import type { DU46Entry, SHU2Entry, ALSNEntry, YerlatgichEntry, AlsnKodEntry, MpsFriksionEntry, JournalType } from '@/types'
import { X, Plus, Trash2, BookOpen, CheckCircle2, Send, Download, ChevronLeft } from 'lucide-react'
import { TORT_HAFTALIK_REJA_FLAT, TORT_HAFTALIK_REJA } from '@/lib/reja-data'
import { MONTHS } from '@/lib/constants'

function getCurrentJournalMonth(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

function isMonthInPast(month: string): boolean {
  return month < getCurrentJournalMonth()
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

// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
// DU-46 VAZIFA TANLASH MODAL
// в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

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

                    {/* — Ustun 2: Soat va daqiqa ———————————————————————————————————— */}
                    <td className="border-r border-slate-200 p-0.5 align-top relative bg-purple-50/10">
                      <div className="pb-[85px]">
                        <TimeInput
                          value={e.soatMinut1 || ''}
                          onChange={val => update(i, 'soatMinut1', val)}
                          readOnly={!canWriteCol3}
                          className={e.kamchilikBajarildi ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-transparent focus:bg-white focus:shadow-inner'}
                        />
                      </div>

                      {/* Tasdiqlash vaqti (pastda) — avtomatik qo'yiladi */}
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

                    {/* — Ustun 3: Kamchilik bayoni —————————————————————————————————— */}
                    <td className="border-r border-slate-200 p-0.5 align-top relative min-w-[200px]">
                      <div className="pb-[85px]">
                        {isDispatcher ? (
                          <div className="w-full rounded px-3 py-2 text-[11px] font-medium text-slate-700 bg-white min-h-[60px]">
                            {e.kamchilik || <span className="text-slate-300">—</span>}
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

                      {/* — Boshlandi / Tasdiqlash tugmalari —————————————————————————— */}
                      <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1.5">
                        {/* Yozuvchi: Boshlandi tugmasi */}
                        {e.kamchilik && iAmCreator && !e.kamchilikBajarildi && !e.yuborildi && !isMonthInPast(journalMonth) && (
                          <button
                            onClick={() => handleKamchilikBoshlandi(i)}
                            disabled={!e.oyKun1 || !e.soatMinut1}
                            className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${(!e.oyKun1 || !e.soatMinut1) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'btn-gradient'}`}
                          >
                            ▶ Boshlandi
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
                        {e.kamchilik && !e.kamchilikBBTasdiqladi && iAmConfirmer && !e.yuborildi && !isMonthInPast(journalMonth) && (
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

                    {/* — Ustunlar 4-9 (oraliq) ————————————————————————————————————— */}
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

                    {/* — Ustun 10: Oy/kun ——————————————————————————————————————————— */}
                    <td className="border-r border-slate-200 p-0.5">
                      <DateInput
                        value={e.oyKun4 || ''}
                        onChange={val => update(i, 'oyKun4', val)}
                        readOnly={!canWriteCol12}
                      />
                    </td>

                    {/* — Ustun 11: Soat va daqiqa —————————————————————————————————— */}
                    <td className="border-r border-slate-200 p-0.5 align-top relative bg-amber-50/5">
                      <div className="pb-[85px]">
                        <TimeInput
                          value={e.soatMinut4 || ''}
                          onChange={val => update(i, 'soatMinut4', val)}
                          readOnly={!canWriteCol12}
                          className={e.bartarafBajarildi ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-transparent focus:bg-white focus:shadow-inner'}
                        />
                      </div>

                      {/* Tasdiqlash vaqti (pastda) — avtomatik qo'yiladi */}
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

                    {/* — Ustun 12: Bartaraf tafsiloti ————————————————————————————— */}
                    <td className="p-0.5 align-top relative bg-amber-50/5 min-w-[200px]">
                      <div className="pb-[85px]">
                        {isDispatcher ? (
                          <div className="w-full rounded px-3 py-2 text-[11px] font-medium text-slate-700 bg-white min-h-[60px]">
                            {e.bartarafInfo || <span className="text-slate-300">—</span>}
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

                      {/* — Bajarildi / Tasdiqlash tugmalari ———————————————————— */}
                      <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1.5">
                        {/* Elektromexanik: Bajarildi tugmasi */}
                        {e.bartarafInfo && isWorker && !e.bartarafBajarildi && !e.yuborildi && !isMonthInPast(journalMonth) && (
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
                        {e.bartarafInfo && !e.bartarafBBTasdiqladi && isBB && !e.yuborildi && !isMonthInPast(journalMonth) && (
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
          const canRemove = entries.length > 1 && !lastHasData && !isMonthInPast(journalMonth)
          return (
            <div className="mt-6 flex items-center gap-3">
              {!isMonthInPast(journalMonth) && (
                <button onClick={addRow} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95">
                  <Plus size={14} strokeWidth={3} /> <span className="uppercase tracking-widest">Qator qo&apos;shish</span>
                </button>
              )}
              {!isMonthInPast(journalMonth) && (
                <button onClick={removeRow} disabled={!canRemove}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition-all shadow-sm active:scale-95 ${canRemove
                    ? 'border-slate-200 bg-white text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50'
                    : 'border-slate-100 bg-slate-50/50 text-slate-300 cursor-not-allowed'
                  }`}>
                  <Trash2 size={14} strokeWidth={3} /> <span className="uppercase tracking-widest">Qator o&apos;chirish</span>
                </button>
              )}
            </div>
          )
        })()}

        {/* ——— Yuborish (ishchi yoki BB) —————————————————————————— */}
        {isEditor && hasAnyEntry && !isMonthInPast(journalMonth) && (
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
          <table className="w-full border-collapse text-[12px] text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-tight text-slate-500 border-b-2 border-slate-200">
              <tr>
                <th className="w-[6%] border-r border-b border-slate-200 p-4 text-center">№</th>
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
                const isLocked = dispHidesRow ? false : (!!e.tasdiqlandi || isMonthInPast(journalMonth))

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
                          <span className="text-[10px] font-black text-slate-200">—</span>
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

// ═══════════════════════════════════════════════════════════════════════════════════════
// POEZD RADIOALOQASI VA ALSN NI TEKSHIRISH JURNALI
// ═══════════════════════════════════════════════════════════════════════════════════════

const EMPTY_ALSN = (): ALSNEntry => ({
  nomber: '',
  sana: '', tekshirilganVaqt: '', poezdRaqami: '', teplovozRaqami: '',
  mashinistFamiliyasi: '', rps: '', alsn: '', svetoforKorinishi: '',
  poezdOtganYol: '', imzo: '',
  bajarildi: false, bajarildiAt: '',
})

export function ALSNJournalView({
  stationId,
  stationName,
  userName,
  userRole,
  journalMonth = getCurrentJournalMonth(),
  onClose,
}: {
  stationId: string
  stationName: string
  userName: string
  userRole: string
  journalMonth?: string
  onClose: () => void
}) {
  const [entries, setEntries] = useState<ALSNEntry[]>(Array.from({ length: 5 }, (_, i) => ({ ...EMPTY_ALSN(), nomber: String(i + 1) })))
  const [allEntries, setAllEntries] = useState<ALSNEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const isWorker = ['worker', 'elektromexanik', 'elektromontyor'].includes(userRole)

  const journalMonthLabel = getJournalMonthLabel(journalMonth)

  const showMsg = (text: string, duration = 2000) => {
    setMsg(text)
    setTimeout(() => setMsg(null), duration)
  }

  const loadJournalData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const j = await getJournal(stationId, 'alsn')
      if (j && j.entries.length > 0) {
        const loadedAllEntries = j.entries as ALSNEntry[]
        setAllEntries(loadedAllEntries)

        const monthEntries = loadedAllEntries.filter(e => e.journalMonth === journalMonth || (!e.journalMonth && journalMonth === getCurrentJournalMonth()))

        if (monthEntries.length > 0) {
          setEntries(monthEntries)
        } else {
          setEntries(Array.from({ length: 5 }, (_, i) => ({ ...EMPTY_ALSN(), nomber: String(i + 1) })))
        }
      } else {
        setAllEntries([])
        setEntries(Array.from({ length: 5 }, (_, i) => ({ ...EMPTY_ALSN(), nomber: String(i + 1) })))
      }
    } catch (err) {
      console.error('ALSN journal yuklash xatosi:', err)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [stationId, journalMonth])

  useEffect(() => {
    loadJournalData(false)

    const channel = supabase
      .channel(`journal_alsn_${userRole}_${stationId}_${journalMonth}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'station_journals', filter: `station_id=eq.${stationId}` },
        () => loadJournalData(true)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [stationId, userRole, journalMonth, loadJournalData])

  const update = (i: number, field: keyof ALSNEntry, val: string) => {
    const n = [...entries]
    n[i] = { ...n[i], [field]: val }
    setEntries(n)
  }

  const addRow = () => setEntries([...entries, { ...EMPTY_ALSN(), nomber: String(entries.length + 1) }])
  const removeRow = () => {
    if (entries.length <= 1) return
    const last = entries[entries.length - 1]
    if (last.bajarildi || last.sana || last.poezdRaqami) return
    setEntries(entries.slice(0, -1))
  }

  const saveEntries = async (updated: ALSNEntry[], prev: ALSNEntry[]) => {
    setEntries(updated)

    const updatedWithMonth = updated.map(e => ({ ...e, journalMonth }))
    const otherMonths = allEntries.filter(e => e.journalMonth !== journalMonth && !(!e.journalMonth && journalMonth === getCurrentJournalMonth()))
    const newAllEntries = [...otherMonths, ...updatedWithMonth]
    setAllEntries(newAllEntries)

    try {
      await upsertJournal(stationId, 'alsn', newAllEntries, userName)
    } catch (err) {
      console.error('Saqlash xatosi:', err)
      setEntries(prev)
      setAllEntries(allEntries)
      showMsg(err instanceof Error ? err.message : 'Xatolik', 3000)
      throw err
    }
  }

  const handleBajarildi = async (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    updated[i] = {
      ...updated[i],
      bajarildi: true,
      bajarildiAt: new Date().toISOString(),
      imzo: userName,
    }
    try {
      await saveEntries(updated, prev)
      showMsg('Bajarildi!')
    } catch { /* saveEntries ichida xato ko'rsatiladi */ }
  }

  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const todayDate = new Date()
    const [dlYear, dlMonth] = (journalMonth || '').split('-')
    const pdfYear = dlYear || String(todayDate.getFullYear())
    const pdfMonth = dlMonth || String(todayDate.getMonth() + 1).padStart(2, '0')
    const pdfDay = String(todayDate.getDate()).padStart(2, '0')
    const pdfDateStr = `${pdfDay}.${pdfMonth}.${pdfYear}`

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Poezd radioaloqasi va ALSN ni tekshirish', 14, 15)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Bajarilish muddati: xar kuni bir marotaba "juft va toq" poezdlar bilan.', 14, 22)
    doc.text(`${stationName} - ${pdfDateStr}`, 14, 29)

    const tableColumn = ['No', 'Sana', 'Teksh. vaqt', 'Poezd raqami', 'Teplovoz raqami', 'Mashinist Familiyasi', 'RPS', 'ALSN', 'Svetofor', 'Poezd yoli', 'Imzo']
    const tableRows = entries
      .filter(e => e.sana || e.poezdRaqami || e.mashinistFamiliyasi)
      .map((e, i) => [
        e.nomber || String(i + 1),
        e.sana || '', e.tekshirilganVaqt || '', e.poezdRaqami || '', e.teplovozRaqami || '',
        e.mashinistFamiliyasi || '', e.rps || '', e.alsn || '', e.svetoforKorinishi || '',
        e.poezdOtganYol || '', e.bajarildi ? e.imzo : '',
      ])

    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: 34, theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [8, 23, 40], textColor: [255, 255, 255], fontSize: 6.5, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: { 0: { halign: 'center', cellWidth: 8 } },
    })

    doc.save(`ALSN_${stationName}_${pdfDateStr.replace(/\./g, '-')}.pdf`)
  }

  const todayDate = new Date()
  const [jYear, jMonthStr] = (journalMonth || '').split('-')
  const selectedYear = jYear || String(todayDate.getFullYear())
  const selectedMonth = jMonthStr || String(todayDate.getMonth() + 1).padStart(2, '0')
  const selectedDay = String(todayDate.getDate()).padStart(2, '0')
  const dateStr = `${selectedDay}.${selectedMonth}.${selectedYear}`

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-300 font-bold uppercase tracking-widest">Yuklanmoqda...</div>

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-8 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Poezd radioaloqasi va ALSN</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stationName} · {journalMonthLabel}</p>
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

        {/* Sarlavha */}
        <div className="mb-4 rounded-2xl border border-blue-200/60 bg-blue-50/50 p-4 shadow-sm">
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-tight">Poezd radioaloqasi va ALSN ni tekshirish</h3>
          <p className="text-xs text-blue-600 mt-1">Bajarilish muddati: xar kuni bir marotaba &quot;juft va toq&quot; poezdlar bilan.</p>
        </div>

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

        {/* Jadval */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <table style={{ minWidth: '1200px' }} className="w-full border-collapse text-[11px] text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-tight text-slate-500 border-b-2 border-slate-200">
              <tr>
                <th className="w-[3%] border-r border-b border-slate-200 p-3 text-center">№</th>
                <th className="w-[8%] border-r border-b border-slate-200 p-3 text-center">Sana</th>
                <th className="w-[8%] border-r border-b border-slate-200 p-3 text-center">Tekshirilgan<br />vaqt</th>
                <th className="w-[8%] border-r border-b border-slate-200 p-3 text-center">Poezd<br />Raqami</th>
                <th className="w-[8%] border-r border-b border-slate-200 p-3 text-center">Teplovoz<br />raqami</th>
                <th className="w-[14%] border-r border-b border-slate-200 p-3 text-center">Mashinist<br />Familiyasi</th>
                <th className="w-[7%] border-r border-b border-slate-200 p-3 text-center">RPS</th>
                <th className="w-[7%] border-r border-b border-slate-200 p-3 text-center">ALSN</th>
                <th className="w-[12%] border-r border-b border-slate-200 p-3 text-center">Svetofor<br />Ko&apos;rinishi</th>
                <th className="w-[10%] border-r border-b border-slate-200 p-3 text-center">Poezd o&apos;tgan<br />yo&apos;l</th>
                <th className="w-[15%] border-b border-slate-200 p-3 text-center">Imzo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const isLocked = !!e.bajarildi || isMonthInPast(journalMonth)

                return (
                  <tr key={i} className={`border-b border-slate-200 hover:bg-blue-50/50 transition-colors animate-fade-up ${isLocked ? 'bg-emerald-50/30' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                    {/* № */}
                    <td className="border-r border-slate-200 p-1 text-center bg-slate-50/30">
                      <input
                        value={e.nomber || ''}
                        onChange={ev => update(i, 'nomber', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        placeholder={String(i + 1)}
                        className="w-full rounded bg-transparent text-center font-black text-slate-400 outline-none transition-all focus:bg-white focus:text-purple-600"
                      />
                    </td>
                    {/* Sana */}
                    <td className="border-r border-slate-200 p-0.5">
                      <DateInput
                        value={e.sana || ''}
                        onChange={val => update(i, 'sana', val)}
                        readOnly={!isWorker || isLocked}
                      />
                    </td>
                    {/* Tekshirilgan vaqt */}
                    <td className="border-r border-slate-200 p-0.5">
                      <TimeInput
                        value={e.tekshirilganVaqt || ''}
                        onChange={val => update(i, 'tekshirilganVaqt', val)}
                        readOnly={!isWorker || isLocked}
                        className="bg-transparent"
                      />
                    </td>
                    {/* Poezd Raqami */}
                    <td className="border-r border-slate-200 p-0.5">
                      <input
                        value={e.poezdRaqami || ''}
                        onChange={ev => update(i, 'poezdRaqami', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* Teplovoz raqami */}
                    <td className="border-r border-slate-200 p-0.5">
                      <input
                        value={e.teplovozRaqami || ''}
                        onChange={ev => update(i, 'teplovozRaqami', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* Mashinist Familiyasi */}
                    <td className="border-r border-slate-200 p-0.5">
                      <input
                        value={e.mashinistFamiliyasi || ''}
                        onChange={ev => update(i, 'mashinistFamiliyasi', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* RPS */}
                    <td className="border-r border-slate-200 p-0.5">
                      <input
                        value={e.rps || ''}
                        onChange={ev => update(i, 'rps', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* ALSN */}
                    <td className="border-r border-slate-200 p-0.5">
                      <input
                        value={e.alsn || ''}
                        onChange={ev => update(i, 'alsn', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* Svetofor Ko'rinishi */}
                    <td className="border-r border-slate-200 p-0.5">
                      <input
                        value={e.svetoforKorinishi || ''}
                        onChange={ev => update(i, 'svetoforKorinishi', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* Poezd o'tgan yo'l */}
                    <td className="border-r border-slate-200 p-0.5">
                      <input
                        value={e.poezdOtganYol || ''}
                        onChange={ev => update(i, 'poezdOtganYol', ev.target.value)}
                        readOnly={!isWorker || isLocked}
                        className={`w-full rounded bg-transparent px-2 py-3 text-center text-[11px] font-bold outline-none transition-all focus:bg-white ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}
                      />
                    </td>
                    {/* Imzo */}
                    <td className="p-1">
                      <div className="flex flex-col items-center gap-1">
                        {e.bajarildi && (
                          <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border-2 border-emerald-500 bg-emerald-500 text-white`}>
                            <CheckCircle2 size={16} strokeWidth={3} />
                          </div>
                        )}
                        {!e.bajarildi && isWorker && !isMonthInPast(journalMonth) && (
                          <button onClick={() => handleBajarildi(i)}
                            disabled={!e.poezdRaqami || !e.sana || !!e.bajarildi}
                            className={`w-[80px] rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-all border shadow-sm ${(!e.poezdRaqami || !e.sana) ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                            Bajarildi
                          </button>
                        )}
                        {!e.bajarildi && (!isWorker || isMonthInPast(journalMonth)) && (
                          <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border-2 border-slate-200 bg-slate-50`}></div>
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

// ===== ALSN KODLARINI TO'G'RILASH VA TOK KUCHINI O'LCHASH JURNALI (NSH-01 10.4) =====
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const isWorker = userRole === 'worker'

  useEffect(() => {
    setLoading(true)
    getJournal(stationId, 'alsnKod').then(doc => {
      if (doc?.entries?.length) {
        const filtered = (doc.entries as AlsnKodEntry[]).filter(
          e => !e.journalMonth || e.journalMonth === journalMonth
        )
        if (filtered.length > 0) setEntries(filtered)
        else setEntries(Array.from({ length: 5 }, EMPTY_ALSN_KOD))
      }
    }).finally(() => setLoading(false))
  }, [stationId, journalMonth])

  const handleSave = async (data: AlsnKodEntry[]) => {
    setSaving(true)
    try {
      const toSave = data.map(e => ({ ...e, journalMonth }))
      await upsertJournal(stationId, 'alsnKod', toSave as any, userName)
      setMsg('Saqlandi!')
      setTimeout(() => setMsg(null), 2000)
    } catch (e: any) {
      setMsg(`Xato: ${e.message}`)
    } finally {
      setSaving(false)
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
    handleSave(n)
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
    handleSave(n).then(() => { if (onAccepted) onAccepted() })
  }

  const addRow = () => { if (!isWorker) return; const n = [...entries, EMPTY_ALSN_KOD()]; setEntries(n); handleSave(n) }
  const removeRow = () => { if (!isWorker || entries.length <= 1) return; const n = entries.slice(0, -1); setEntries(n); handleSave(n) }

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
                    <td className="border-r border-slate-100 p-0 w-[110px]"><input type="text" className={ic} value={e.sana} onChange={ev => updateEntry(i, 'sana', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0"><input type="text" className={ic} value={e.rzNomi} onChange={ev => updateEntry(i, 'rzNomi', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[120px]"><input type="text" className={ic} value={e.rzUzunligi} onChange={ev => updateEntry(i, 'rzUzunligi', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[120px]"><input type="text" className={ic} value={e.juftYonalish} onChange={ev => updateEntry(i, 'juftYonalish', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[120px]"><input type="text" className={ic} value={e.toqYonalish} onChange={ev => updateEntry(i, 'toqYonalish', ev.target.value)} disabled={dis} /></td>
                    <td className="border-r border-slate-100 p-0 w-[150px]"><input type="text" className={ic} value={e.izox} onChange={ev => updateEntry(i, 'izox', ev.target.value)} disabled={dis} /></td>
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

// ===== MPS TURIDAGI ELEKTRODVIGATELLARNI FRIKSION TOKINI O'LCHASH JURNALI (NSH-01 9.1.4) =====
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const isWorker = userRole === 'worker'

  useEffect(() => {
    setLoading(true)
    getJournal(stationId, 'mpsFriksion').then(doc => {
      if (doc?.entries?.length) {
        const filtered = (doc.entries as MpsFriksionEntry[]).filter(
          e => !e.journalMonth || e.journalMonth === journalMonth
        )
        if (filtered.length > 0) setEntries(filtered)
        else setEntries(Array.from({ length: 5 }, EMPTY_MPS_FRIKSION))
      }
    }).finally(() => setLoading(false))
  }, [stationId, journalMonth])

  const handleSave = async (data: MpsFriksionEntry[]) => {
    setSaving(true)
    try {
      const toSave = data.map(e => ({ ...e, journalMonth }))
      await upsertJournal(stationId, 'mpsFriksion', toSave as any, userName)
      setMsg('Saqlandi!')
      setTimeout(() => setMsg(null), 2000)
    } catch (e: any) {
      setMsg(`Xato: ${e.message}`)
    } finally {
      setSaving(false)
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
    handleSave(n)
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
    handleSave(n).then(() => { if (onAccepted) onAccepted() })
  }

  const addRow = () => { if (!isWorker) return; const n = [...entries, EMPTY_MPS_FRIKSION()]; setEntries(n); handleSave(n) }
  const removeRow = () => { if (!isWorker || entries.length <= 1) return; const n = entries.slice(0, -1); setEntries(n); handleSave(n) }

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
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur px-6 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">MPS elektrodvigatellarni friksion tokini o&apos;lchash</h2>
            <p className="text-sm text-slate-500 mt-0.5">{stationName} • {journalMonth} • NSH-01 9.1.4</p>
          </div>
          <div className="flex items-center gap-3">
            {msg && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">{msg}</span>}
            {saving && <span className="text-xs font-bold text-slate-400 flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" /> Saqlanmoqda...</span>}
            <button onClick={exportPDF} className="flex items-center gap-2 rounded-xl bg-purple-50 text-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-100 transition-colors"><Download size={16} /> PDF</button>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors"><X size={24} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 text-center">
            <h3 className="font-bold text-lg">Texnologik jarayon №20. 9.1.4</h3>
            <h4 className="font-bold">MSP turidagi elektrodvigatellarni friksion tokini o&apos;lchash</h4>
            <p className="text-sm text-slate-500">Bajarilish muddati: 3 oyda bir marotaba yoki el. o&apos;tkazgich, friksion baraban va dvigatellar almashtirilganda.</p>
          </div>
          <table className="w-full border-collapse bg-white shadow-sm ring-1 ring-slate-200 rounded-xl">
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
// ═══════════════════════════════════════════════════════════════════════════════════════
// YERLATGICH XABARLAGICHI JURNALI
// ═══════════════════════════════════════════════════════════════════════════════════════

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

  const isWorker = userRole === 'worker'

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('station_journals')
        .select('entries')
        .eq('station_id', stationId)
        .eq('journal_type', 'yerlatgich')
        .single()

      if (data && data.entries) {
        const parsed = (data.entries as unknown as YerlatgichEntry[]) || []
        setAllEntries(parsed)
        const currentMonthData = parsed.filter(e => e.journalMonth === journalMonth)
        if (currentMonthData.length > 0) {
          setEntries(currentMonthData)
        } else {
          setEntries(Array.from({ length: 5 }, EMPTY_YERLATGICH))
        }
      }
      setLoading(false)
    }
    load()
  }, [stationId, journalMonth])

  async function handleSave(newEntries: YerlatgichEntry[]) {
    if (!isWorker) return
    setSaving(true)
    try {
      const merged = allEntries.filter(e => e.journalMonth !== journalMonth)
      const toSave = newEntries.map(e => ({ ...e, journalMonth }))
      const finalEntries = [...merged, ...toSave]
      setAllEntries(finalEntries)

      await upsertJournal(stationId, 'yerlatgich', finalEntries as any, userName)
      setMsg('Saqlandi!')
      setTimeout(() => setMsg(null), 2000)
    } catch (e: any) {
      setMsg(`Xato: ${e.message}`)
    } finally {
      setSaving(false)
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
    handleSave(n)
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
    handleSave(n).then(() => {
      if (onAccepted) onAccepted()
    })
  }

  const addRow = () => {
    if (!isWorker) return
    const n = [...entries, EMPTY_YERLATGICH()]
    setEntries(n)
    handleSave(n)
  }

  const removeRow = () => {
    if (!isWorker) return
    if (entries.length <= 1) return
    const n = entries.slice(0, -1)
    setEntries(n)
    handleSave(n)
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
             <h4 className="font-bold text-md">Yerlatgich xabarlagichi yordamida montaj izolyatsiya qarshiligini o'lchash (NSH-01 17.1.8)</h4>
             <p className="text-sm">Bajarilish muddati: Xaftasiga bir marotaba yoki xar navbatchilik boshlanishida.</p>
          </div>
          
          <table className="w-full border-collapse bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-xl">
            <thead>
              <tr className="bg-slate-50 text-[10px] sm:text-xs font-black uppercase text-slate-500 border-b border-slate-200">
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Sana</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Kuchlanish nomi</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">O'lchangan qiymat</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Imzo (ShN ShNM)</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">Sana</th>
                <th className="border-r border-slate-200 p-2 sm:p-3 text-center">O'lchangan qiymat</th>
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
                    <td className="border-r border-slate-100 p-0 w-[100px]">
                      <input type="text" className={inputClass} value={e.sana} onChange={ev => updateEntry(i, 'sana', ev.target.value)} disabled={leftDisabled} placeholder="Sana" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="text" className={inputClass} value={e.kuchlanishNomi} onChange={ev => updateEntry(i, 'kuchlanishNomi', ev.target.value)} disabled={leftDisabled} />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="text" className={inputClass} value={e.olchanganQiymat} onChange={ev => updateEntry(i, 'olchanganQiymat', ev.target.value)} disabled={leftDisabled} />
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
                    <td className="border-r border-slate-100 p-0 w-[100px]">
                      <input type="text" className={inputClass} value={e.sana2} onChange={ev => updateEntry(i, 'sana2', ev.target.value)} disabled={rightDisabled} placeholder="Sana" />
                    </td>
                    <td className="border-r border-slate-100 p-0">
                      <input type="text" className={inputClass} value={e.olchanganQiymat2} onChange={ev => updateEntry(i, 'olchanganQiymat2', ev.target.value)} disabled={rightDisabled} />
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
