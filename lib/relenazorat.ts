import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_RELE_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_RELE_SUPABASE_ANON_KEY

export const RELE_SITE_URL = process.env.NEXT_PUBLIC_RELE_SITE_URL || 'https://relenazorat.vercel.app'

// Boshqa (alohida deploy qilingan) rele-nazorat loyihasining Supabase bazasidan
// faqat o'qish uchun ulanamiz — bu loyihaga hech qanday yozish amalga oshirilmaydi.
const releSupabase = url && anonKey ? createClient(url, anonKey) : null

const EXPIRY_WARNING_DAYS = 30

function getRelayStatus(nextCheck: string | null): 'green' | 'yellow' | 'red' {
  if (!nextCheck) return 'green'
  const target = new Date(nextCheck)
  if (Number.isNaN(target.getTime())) return 'green'
  const diffDays = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'red'
  if (diffDays <= EXPIRY_WARNING_DAYS) return 'yellow'
  return 'green'
}

export type RelayStatusCounts = { soz: number; nosoz: number; muddatiKelgan: number }

export type RelayStatus = 'green' | 'yellow' | 'red'

export interface Relay {
  id: number
  name: string
  num: string | null
  stativ: string | null
  object: string | null
  manzil: string | null
  last_check: string | null
  next_check: string | null
  note: string | null
  status: RelayStatus
}

const EMPTY_COUNTS: RelayStatusCounts = { soz: 0, nosoz: 0, muddatiKelgan: 0 }

const normalize = (s: string) => s.trim().toLowerCase()

// ── KESH ──────────────────────────────────────────────────────────────
// Rele ma'lumotlari kun davomida juda kam o'zgaradi, shuning uchun:
//  - bekat nomi → rele-loyiha station_id moslamasi sessiya davomida bir
//    marta yuklanadi (stations jadvali deyarli o'zgarmaydi);
//  - relelar ro'yxati bekat bo'yicha keshlanadi. Modal ochilganda kesh
//    DARHOL ko'rsatiladi, yangi nusxa esa fonda tortib olinadi
//    (stale-while-revalidate) — foydalanuvchi kutmaydi, ma'lumot esa
//    har ochilishda baribir yangilanadi.

let _stationsPromise: Promise<Map<string, string>> | null = null

const RELAY_CACHE_TTL = 2 * 60 * 1000 // 2 daqiqa
const _relayCache = new Map<string, { data: Relay[]; ts: number }>()

/** stations jadvalini bir marta yuklab, "nom → id" xarita qaytaradi.
 * Xato bo'lsa keyingi chaqiruvda qayta urinadi (promise keshdan olib tashlanadi). */
function loadStationMap(): Promise<Map<string, string>> {
  if (!_stationsPromise) {
    _stationsPromise = (async () => {
      const { data, error } = await releSupabase!.from('stations').select('id, name')
      if (error || !data) {
        _stationsPromise = null
        return new Map()
      }
      return new Map(data.map((s) => [normalize(s.name), String(s.id)]))
    })()
  }
  return _stationsPromise
}

/** Bekat nomi bo'yicha rele loyihasidagi station id'ni topadi (nom orqali,
 * chunki ikki loyihada ID sxemalari boshqacha). Topilmasa null. */
async function resolveReleStationId(stationName: string): Promise<string | null> {
  if (!releSupabase || !stationName) return null
  const map = await loadStationMap()
  return map.get(normalize(stationName)) ?? null
}

async function fetchRelays(stationName: string): Promise<Relay[]> {
  const stationId = await resolveReleStationId(stationName)
  if (!stationId) return []

  const { data: relays } = await releSupabase!
    .from('relays')
    .select('id, name, num, stativ, object, manzil, last_check, next_check, note')
    .eq('station_id', stationId)
    .order('next_check', { ascending: true })

  if (!relays) return []
  const result = relays.map((r) => ({ ...r, status: getRelayStatus(r.next_check) }))
  _relayCache.set(normalize(stationName), { data: result, ts: Date.now() })
  return result
}

/** Keshdagi relelar (eskirgan bo'lsa ham) — modal ochilganda darhol
 * ko'rsatish uchun. Hech qachon tarmoqqa chiqmaydi. */
export function getCachedRelays(stationName: string): Relay[] | null {
  return _relayCache.get(normalize(stationName))?.data ?? null
}

/**
 * Bekatning to'liq relelar ro'yxati (holati hisoblangan holda).
 * SHCH ilovasi ichida ko'rsatish uchun — tashqi rele-nazorat saytiga
 * o'tish va u yerda alohida login qilish SHART EMAS.
 *
 * @param forceRefresh — true bo'lsa kesh muddatidan qat'i nazar serverdan
 *   yangisini oladi (modal fonda yangilash uchun ishlatadi).
 */
export async function getRelaysByStation(stationName: string, forceRefresh = false): Promise<Relay[]> {
  if (!releSupabase || !stationName) return []

  const cached = _relayCache.get(normalize(stationName))
  if (!forceRefresh && cached && Date.now() - cached.ts < RELAY_CACHE_TTL) {
    return cached.data
  }
  return fetchRelays(stationName)
}

// Bekat nomi bo'yicha o'sha bekatdagi relelarni holatiga ko'ra sanab qaytaradi:
// soz = muddati uzoq (yashil), muddatiKelgan = 30 kun ichida (sariq), nosoz = muddati o'tgan (qizil).
// To'liq ro'yxatdan hisoblanadi — shu bilan bosh sahifa kartochkasi ochilganda
// relelar keshga tushadi va modal keyin BIR ZUMDA (tarmoqsiz) ochiladi.
export async function getRelayStatusCounts(stationName: string): Promise<RelayStatusCounts> {
  const relays = await getRelaysByStation(stationName)
  return relays.reduce((acc, r) => {
    if (r.status === 'red') acc.nosoz++
    else if (r.status === 'yellow') acc.muddatiKelgan++
    else acc.soz++
    return acc
  }, { ...EMPTY_COUNTS })
}
