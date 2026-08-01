/**
 * Qurilma-lokal "maslahatlar" — login sahifasini tezlashtirish uchun.
 *
 * Bu yerdagi hech narsa XAVFSIZLIK uchun ishlatilmaydi: bular faqat UI'ni
 * oldindan to'g'ri holatga keltirish (qaysi marshrutni oldindan yuklash)
 * uchun. Haqiqiy tekshiruv doim serverda.
 */

import { safeStorage } from '@/lib/utils/storage'

const LAST_ROLE_KEY = 'last-role'

// ─────────────────────────────────────────────────────────────────────────
// Oxirgi rol — login sahifasida marshrutni oldindan yuklash uchun
// ─────────────────────────────────────────────────────────────────────────

export function readLastRole(): string | null {
  return safeStorage.getItem(LAST_ROLE_KEY)
}

export function saveLastRole(role: string): void {
  safeStorage.setItem(LAST_ROLE_KEY, role)
}
