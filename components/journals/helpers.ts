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

export function isFutureDate(sanaStr?: string): boolean {
  if (!sanaStr) return false
  const [d, m, y] = sanaStr.split(/[-.]/)
  if (!d || !m || !y) return false
  const rowDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return rowDate > now
}

export function getJournalMonthLabel(month: string): string {
  const [year, rawMonth] = month.split('-')
  const monthIndex = Number(rawMonth) - 1
  return `${MONTHS[monthIndex] || rawMonth} ${year}`
}

export function getJournalMonthKey(monthIndex: number, year = new Date().getFullYear()): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

/**
 * Ro'yxat OXIRIDAGI bo'sh qatorlarni olib tashlaydi (bazaga yozishdan oldin).
 * UI da qulay bo'lishi uchun ko'rsatiladigan bo'sh qatorlar bazaga yozilmasligi
 * kerak — aks holda ular boshqa foydalanuvchilarda ham "haqiqiy" qator bo'lib
 * chiqadi va o'chirilganda qaytib kelaveradi. Faqat OXIRIDAN olib tashlanadi,
 * chunki saqlash mantiqʼi qatorlarni indeks bo'yicha taqqoslaydi — o'rtadan
 * olib tashlash indekslarni surib yuborar edi.
 */
export function trimTrailingEmpty<T>(list: T[], isEmpty: (e: T) => boolean): T[] {
  let end = list.length
  while (end > 0 && isEmpty(list[end - 1])) end--
  return list.slice(0, end)
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME XAVFSIZ BIRLASHTIRISH (barcha "oddiy" jurnal turlari uchun umumiy)
// ═══════════════════════════════════════════════════════════════════════════════

type SessionFlagged = { _isNew?: boolean; _isEdited?: boolean }

/**
 * Qatorda (metama'lumot maydonlaridan tashqari) haqiqiy mazmun bormi?
 * `nomber`/`journalMonth` va `_` bilan boshlanadigan UI bayroqlari hisobga
 * olinmaydi — ular "amalda bo'sh" qatorni ham "to'ldirilgan" ko'rsatib
 * yuborar edi.
 */
function rowHasContent(row: Record<string, unknown>): boolean {
  return Object.entries(row).some(([key, value]) => {
    if (key === 'nomber' || key === 'journalMonth' || key.startsWith('_')) return false
    if (typeof value === 'boolean') return value === true
    if (typeof value === 'string') return value.trim() !== ''
    return value !== null && value !== undefined
  })
}

/**
 * Real-time orqali kelgan server ma'lumotini lokal holat bilan XAVFSIZ
 * birlashtiradi. Buning zarurati: `useRealtimeSubscription` bekatning
 * BARCHA jurnal turlari uchun umumiy (faqat `station_id` bo'yicha
 * filtrlangan) — ya'ni boshqa xodim shu bekatning istalgan jurnalini
 * saqlasa ham, joriy jurnalni ochib turgan xodimda `loadJournalData(true)`
 * ishga tushadi. Agar shu payt xodim hali saqlanmagan qator ustida ishlab
 * turgan bo'lsa (`_isEdited`/`_isNew` bilan belgilangan), server javobi bu
 * qatorni SHART-SHAROITSIZ ustidan yozib, hali saqlanmagan matnni yo'q
 * qilib yubormasligi kerak.
 *
 * Qoidalar:
 *  - Ikkalasida ham bor indekslar uchun: agar lokal qator `_isEdited`/
 *    `_isNew` bilan belgilangan bo'lsa — lokal versiya g'olib (serverning
 *    eskiroq nusxasi bilan yozib qo'yilmaydi). Aks holda — server g'olib
 *    (boshqa xodimning o'zgarishi ko'rinishi uchun).
 *  - Faqat lokalda bor (server hali "ko'rmagan") ortiqcha qatorlar —
 *    bayroqlangan yoki mazmuni bo'lsa saqlanadi, aks holda tashlab
 *    yuboriladi (bo'sh shablon qatorlar takrorlanib ketmasligi uchun).
 */
export function mergeJournalEntries<T extends SessionFlagged>(serverRows: T[], localRows: T[]): T[] {
  const merged = serverRows.map((serverRow, i) => {
    const localRow = localRows[i]
    if (localRow && (localRow._isEdited || localRow._isNew)) {
      return localRow
    }
    return serverRow
  })

  for (let i = merged.length; i < localRows.length; i++) {
    const localRow = localRows[i]
    if (localRow._isEdited || localRow._isNew || rowHasContent(localRow as Record<string, unknown>)) {
      merged.push(localRow)
    }
  }

  return merged
}

/**
 * `_isNew`/`_isEdited` faqat shu sessiyada UI uchun ishlatiladigan
 * vaqtinchalik bayroqlar — bazaga hech qachon yozilmasligi kerak.
 */
export function stripSessionFlags<T extends SessionFlagged>(entry: T): T {
  if (!entry._isNew && !entry._isEdited) return entry
  const copy: T = { ...entry }
  delete copy._isNew
  delete copy._isEdited
  return copy
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
