/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
'use client'

import { MONTHS } from '@/lib/constants'

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNAL HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getCurrentJournalMonth(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

// Bug #9 fix: string taqqoslash o'rniga sana asosida to'g'ri taqqoslash
export function isMonthInPast(month: string): boolean {
  const current = getCurrentJournalMonth()
  if (!month || !current) return false
  const [mYear, mMonth] = month.split('-').map(Number)
  const [cYear, cMonth] = current.split('-').map(Number)
  if (isNaN(mYear) || isNaN(mMonth) || isNaN(cYear) || isNaN(cMonth)) return false
  if (mYear !== cYear) return mYear < cYear
  return mMonth < cMonth
}

export function getJournalMonthLabel(month: string): string {
  const [year, rawMonth] = month.split('-')
  const monthIndex = Number(rawMonth) - 1
  return `${MONTHS[monthIndex] || rawMonth} ${year}`
}

export function getJournalMonthKey(monthIndex: number, year = new Date().getFullYear()): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS: Sana va vaqtni avto-formatlash
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sana formatlash: faqat raqamlar kiritiladi, `-` avtomatik qo'yiladi.
 * Masalan: 17042026 → 17-04-2026
 */
export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

/**
 * Vaqt formatlash: faqat raqamlar kiritiladi, `:` avtomatik qo'yiladi.
 * Masalan: 1405 → 14:05
 */
export function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}
