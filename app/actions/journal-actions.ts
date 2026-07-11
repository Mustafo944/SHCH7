'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─────────────────────────────────────────────────────────────────────
// TIPLAR
// ─────────────────────────────────────────────────────────────────────

type JournalEntry = Record<string, unknown> & { _id?: string }

export interface SaveJournalResult {
  id: string
  station_id: string
  journal_type: string
  entries: JournalEntry[]
  updated_at: string
  updated_by: string
  /** Konflikt bo'lib, server yozuvlari bilan birlashtirildi */
  merged: boolean
}

// ─────────────────────────────────────────────────────────────────────
// KONSTANTALAR
// ─────────────────────────────────────────────────────────────────────

/** Jurnal yozishga ruxsat etilgan rollar (mehnat_muhofazasi jurnal yozmaydi) */
const JOURNAL_WRITE_ROLES = new Set([
  'dispatcher',
  'worker',
  'elektromexanik',
  'elektromontyor',
  'katta_elektromexanik',
  'bekat_boshlighi',
  'bekat_navbatchisi',
  'yul_ustasi',
  'ech_xodimi',
])

const ALLOWED_JOURNAL_TYPES = new Set([
  'du46', 'shu2', 'alsn', 'yerlatgich', 'alsnKod', 'mpsFriksion', 'dgaNazorat', 'boshqa',
])

/** Konflikt bo'lganda necha marta qayta urinish */
const MAX_RETRIES = 3

// ─────────────────────────────────────────────────────────────────────
// YORDAMCHI FUNKSIYALAR
// ─────────────────────────────────────────────────────────────────────

/**
 * Cookie'dagi Supabase sessiya orqali foydalanuvchini aniqlaydi va
 * uning ushbu bekat jurnalini yozish huquqini tekshiradi.
 * Muvaffaqiyatsiz bo'lsa — xato tashlaydi (action bajarilmaydi).
 */
async function assertJournalWriteAccess(stationId: string): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Avtorizatsiya talab etiladi. Qaytadan tizimga kiring.')
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('role, station_ids')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Foydalanuvchi profili topilmadi.')
  }

  if (!JOURNAL_WRITE_ROLES.has(profile.role)) {
    throw new Error('Sizning rolingizda jurnal yozish huquqi yo\'q.')
  }

  // Dispatcher barcha bekatlarga kiradi; qolganlar faqat o'z bekatlariga
  if (profile.role !== 'dispatcher') {
    const stationIds: string[] = profile.station_ids || []
    if (!stationIds.includes(stationId)) {
      throw new Error('Bu bekat jurnaliga kirish huquqingiz yo\'q.')
    }
  }
}

/**
 * Har bir yozuvga barqaror `_id` (UUID) beradi.
 * `_id` bo'lmagan yozuvlar (eski ma'lumot yoki yangi qo'shilgan qator)
 * shu yerda ID oladi — keyingi saqlashlarda merge aniq ishlaydi.
 */
function ensureEntryIds(entries: JournalEntry[]): JournalEntry[] {
  return entries.map(e => (e._id ? e : { ...e, _id: randomUUID() }))
}

/**
 * Konflikt merge: lokal (foydalanuvchi ko'rib turgan) yozuvlar asos,
 * serverda paydo bo'lgan YANGI yozuvlar (boshqa xodim qo'shgani) oxiriga qo'shiladi.
 *
 * Qoidalar:
 *  - Bir xil `_id` bo'lsa — lokal versiya g'olib (foydalanuvchi tahriri saqlanadi).
 *  - Serverda bor, lokalda yo'q `_id` — server yozuvi qo'shiladi (yo'qolmaydi).
 *  - `_id`siz server yozuvlari (bir martalik o'tish davri) — JSON taqqoslash
 *    orqali dublikat bo'lmasa qo'shiladi.
 */
function mergeEntries(
  serverEntries: JournalEntry[],
  localEntries: JournalEntry[]
): JournalEntry[] {
  const localIds = new Set(
    localEntries.map(e => e._id).filter((id): id is string => Boolean(id))
  )

  // _id'siz lokal yozuvlarni JSON ko'rinishida eslab qolamiz (dublikat tekshiruvi uchun)
  const localIdlessJson = new Set(
    localEntries
      .filter(e => !e._id)
      .map(e => JSON.stringify(e))
  )

  const merged: JournalEntry[] = [...localEntries]

  for (const serverEntry of serverEntries) {
    if (serverEntry._id) {
      if (!localIds.has(serverEntry._id)) {
        // Boshqa xodim qo'shgan yangi yozuv — saqlab qolamiz
        merged.push(serverEntry)
      }
      // localIds ichida bo'lsa — lokal versiya allaqachon merged ichida, o'tkazamiz
    } else {
      // O'tish davri: _id'siz eski server yozuvi
      const { _id: _ignored, ...rest } = serverEntry
      if (!localIdlessJson.has(JSON.stringify(rest)) && !localIdlessJson.has(JSON.stringify(serverEntry))) {
        merged.push(serverEntry)
      }
    }
  }

  return merged
}

// ─────────────────────────────────────────────────────────────────────
// ASOSIY SERVER ACTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Jurnalni xavfsiz saqlash:
 *  1. Auth + rol + bekat huquqi tekshiruvi
 *  2. Optimistic locking: `updated_at` mos kelsagina yangilanadi
 *  3. Konflikt bo'lsa — server yozuvlari bilan merge qilib qayta urinish (3 marta)
 *
 * @param baseUpdatedAt — mijoz jurnalni oxirgi yuklaganda ko'rgan `updated_at`.
 *                        `null` bo'lsa "qator hali yo'q" deb qabul qilinadi.
 */
export async function serverSaveJournal(
  stationId: string,
  journalType: string,
  rawEntries: Record<string, unknown>[],
  updatedBy: string,
  baseUpdatedAt: string | null
): Promise<SaveJournalResult> {
  // ── 1. Kirish parametrlarini tekshirish ──
  if (!stationId || typeof stationId !== 'string') {
    throw new Error('stationId noto\'g\'ri.')
  }
  if (!ALLOWED_JOURNAL_TYPES.has(journalType)) {
    throw new Error(`Noma'lum jurnal turi: ${journalType}`)
  }
  if (!Array.isArray(rawEntries)) {
    throw new Error('entries massiv bo\'lishi kerak.')
  }

  // ── 2. Avtorizatsiya (eng muhim qism!) ──
  await assertJournalWriteAccess(stationId)

  // ── 3. Yozuvlarga barqaror ID berish ──
  let entries = ensureEntryIds(rawEntries as JournalEntry[])
  let expectedUpdatedAt = baseUpdatedAt
  let merged = false

  // ── 4. Optimistic locking bilan saqlash (retry loop) ──
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const nowIso = new Date().toISOString()

    if (expectedUpdatedAt === null) {
      // Qator hali mavjud emas deb hisoblaymiz — INSERT
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('station_journals')
        .insert({
          station_id: stationId,
          journal_type: journalType,
          entries,
          updated_by: updatedBy,
          updated_at: nowIso,
        })
        .select('id, station_id, journal_type, entries, updated_at, updated_by')
        .single()

      if (!insertError && inserted) {
        return { ...inserted, entries: inserted.entries as JournalEntry[], merged }
      }

      // 23505 = unique violation: qator biz bilmagan holda allaqachon yaratilgan.
      // Konflikt sifatida davom etamiz (pastda serverdan o'qib merge qilamiz).
      if (insertError && insertError.code !== '23505') {
        throw new Error(insertError.message || 'Jurnalni yaratishda xatolik.')
      }
    } else {
      // Qator bor — SHARTLI update: faqat updated_at o'zgarmagan bo'lsa
      const { data: updatedRow, error: updateError } = await supabaseAdmin
        .from('station_journals')
        .update({
          entries,
          updated_by: updatedBy,
          updated_at: nowIso,
        })
        .eq('station_id', stationId)
        .eq('journal_type', journalType)
        .eq('updated_at', expectedUpdatedAt)
        .select('id, station_id, journal_type, entries, updated_at, updated_by')
        .maybeSingle()

      if (updateError) {
        throw new Error(updateError.message || 'Jurnalni saqlashda xatolik.')
      }

      if (updatedRow) {
        // Muvaffaqiyat — hech kim oraliqda o'zgartirmagan
        return { ...updatedRow, entries: updatedRow.entries as JournalEntry[], merged }
      }
      // updatedRow === null → KONFLIKT: boshqa xodim oraliqda saqlagan
    }

    // ── 5. Konflikt: serverning hozirgi holatini olib, merge qilamiz ──
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('station_journals')
      .select('entries, updated_at')
      .eq('station_id', stationId)
      .eq('journal_type', journalType)
      .maybeSingle()

    if (fetchError) {
      throw new Error(fetchError.message || 'Jurnalni qayta o\'qishda xatolik.')
    }

    if (current) {
      entries = ensureEntryIds(
        mergeEntries(current.entries as JournalEntry[], entries)
      )
      expectedUpdatedAt = current.updated_at
      merged = true
    } else {
      // Qator o'chirilgan bo'lsa — keyingi urinishda INSERT qilamiz
      expectedUpdatedAt = null
    }

    // Kichik kutish — parallel saqlashlar tarqalishi uchun
    if (attempt < MAX_RETRIES - 1) {
      await new Promise(r => setTimeout(r, 120 * (attempt + 1)))
    }
  }

  throw new Error(
    'Jurnal band: boshqa xodimlar bir vaqtda saqlamoqda. Bir necha soniyadan so\'ng qayta urinib ko\'ring.'
  )
}
