'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { getStationEquipments } from '@/lib/supabase-db'
import type { StationEquipments } from '@/types'

/**
 * Bekat uskunalari (`station_journals` dagi `<stationId>_equipments` qatori) —
 * YAGONA manba.
 *
 * Ilgari bu bir xil qator TO'RTTA joyda mustaqil yuklanardi:
 *   • worker/page.tsx        — bekat pasporti kartochkasi
 *   • JournalForm            — QR bog'lanishlari (taskMappings)
 *   • WorkerTasksModal       — skaner uchun uskunalar ro'yxati
 *   • StationEquipmentsView  — to'liq ko'rinish (yagona SWR ishlatgani)
 *
 * Ishchi bekatni ochib jurnalga kirsa, bitta va o'sha qator 3-4 marta tortilardi.
 * Endi hammasi bitta SWR kalitidan foydalanadi — SWR dedupingi ularni bitta
 * tarmoq so'roviga birlashtiradi va biri saqlaganda qolganlari ham yangilanadi.
 *
 * Shu sababli `preloadedStationEq` propi ham keraksiz bo'lib qoldi: kesh
 * allaqachon to'lgani uchun modal ochilganda ma'lumot DARHOL mavjud bo'ladi.
 *
 * ATAYLAB QAMRAB OLINMAGAN:
 *   • `TodayTasksModal` (dispetcher) — u ixtiyoriy bekat uchun TALAB BO'YICHA,
 *     imperativ tarzda yuklaydi (hook chaqirib bo'lmaydi) va o'zining Promise
 *     keshi bilan allaqachon dedupe qiladi. Dispetcher oqimi ishchi oqimi bilan
 *     kesishmaydi, shuning uchun birlashtirishdan foyda yo'q.
 *   • `updateEquipmentScanHistory` (lib/supabase-db.ts) — ma'lumot qatlami,
 *     React kontekstidan tashqarida ishlaydi.
 */
export function stationEquipmentsKey(stationId: string | null | undefined): string | null {
  return stationId ? `equipments_${stationId}` : null
}

const STATION_EQUIPMENTS_CONFIG: SWRConfiguration<StationEquipments | null> = {
  // Fokus qaytganda qayta yuklamaymiz: StationEquipmentsView'da tahrirlash
  // paytida serverdagi nusxa lokal o'zgarishlarni bosib ketmasligi kerak.
  revalidateOnFocus: false,
  dedupingInterval: 60_000,
}

/**
 * @param stationId — `null`/`undefined` bo'lsa so'rov yuborilmaydi (SWR shartli kalit).
 */
export function useStationEquipments(stationId: string | null | undefined) {
  return useSWR<StationEquipments | null>(
    stationEquipmentsKey(stationId),
    () => getStationEquipments(stationId as string),
    STATION_EQUIPMENTS_CONFIG
  )
}
