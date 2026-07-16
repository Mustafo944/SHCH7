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

const EMPTY_COUNTS: RelayStatusCounts = { soz: 0, nosoz: 0, muddatiKelgan: 0 }

// Bekat nomi bo'yicha (ID sxemalari ikki loyihada boshqacha bo'lgani uchun)
// o'sha bekatdagi relelarni holatiga ko'ra sanab qaytaradi:
// soz = muddati uzoq (yashil), muddatiKelgan = 30 kun ichida (sariq), nosoz = muddati o'tgan (qizil)
export async function getRelayStatusCounts(stationName: string): Promise<RelayStatusCounts> {
  if (!releSupabase || !stationName) return EMPTY_COUNTS

  const normalize = (s: string) => s.trim().toLowerCase()

  const { data: stations } = await releSupabase.from('stations').select('id, name')
  const match = stations?.find((s) => normalize(s.name) === normalize(stationName))
  if (!match) return EMPTY_COUNTS

  const { data: relays } = await releSupabase
    .from('relays')
    .select('next_check')
    .eq('station_id', match.id)

  if (!relays) return EMPTY_COUNTS

  return relays.reduce((acc, r) => {
    const status = getRelayStatus(r.next_check)
    if (status === 'red') acc.nosoz++
    else if (status === 'yellow') acc.muddatiKelgan++
    else acc.soz++
    return acc
  }, { ...EMPTY_COUNTS })
}
