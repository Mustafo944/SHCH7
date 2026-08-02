/**
 * Qurilma-lokal "maslahatlar" — login sahifasini tezlashtirish uchun.
 *
 * Bu yerdagi hech narsa XAVFSIZLIK uchun ishlatilmaydi: bular faqat UI'ni
 * oldindan to'g'ri holatga keltirish (qaysi tugmani ko'rsatish, qaysi
 * marshrutni oldindan yuklash) uchun. Haqiqiy tekshiruv doim serverda.
 */

import { safeStorage } from '@/lib/utils/storage'

const PASSKEY_FLAG_KEY = 'hasPasskeyEnabled'
const LAST_ROLE_KEY = 'last-role'

// ─────────────────────────────────────────────────────────────────────────
// Passkey bayrog'i — barcha komponentlar uchun bitta umumiy manba
//
// `useSyncExternalStore` orqali tarqatiladi, shuning uchun yon paneldagi va
// "Yana" menyusidagi tugmalar bir-biri bilan sinxron qoladi (ilgari har biri
// o'z `useState`iga ega edi va biri o'chirilganda ikkinchisi eskirib qolardi).
// ─────────────────────────────────────────────────────────────────────────

let flagCache: boolean | null = null
const listeners = new Set<() => void>()

export function subscribePasskeyFlag(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPasskeyFlagSnapshot(): boolean {
  if (flagCache === null) {
    flagCache = safeStorage.getItem(PASSKEY_FLAG_KEY) === 'true'
  }
  return flagCache
}

/** SSR paytida doim `false` — gidratatsiya mos kelishi uchun. */
export function getPasskeyFlagServerSnapshot(): boolean {
  return false
}

export function setPasskeyFlag(enabled: boolean): void {
  flagCache = enabled
  if (enabled) safeStorage.setItem(PASSKEY_FLAG_KEY, 'true')
  else safeStorage.removeItem(PASSKEY_FLAG_KEY)
  listeners.forEach((listener) => listener())
}

// ─────────────────────────────────────────────────────────────────────────
// Oxirgi rol — login sahifasida marshrutni oldindan yuklash uchun
// ─────────────────────────────────────────────────────────────────────────

export function readLastRole(): string | null {
  return safeStorage.getItem(LAST_ROLE_KEY)
}

export function saveLastRole(role: string): void {
  safeStorage.setItem(LAST_ROLE_KEY, role)
}
