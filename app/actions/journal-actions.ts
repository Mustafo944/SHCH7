'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'

// Service role bilan server tomonida upsert qilish (RLS ni chetlab o'tish uchun)
export async function serverUpsertJournal(
  stationId: string,
  journalType: string,
  entries: any[],
  updatedBy: string
) {
  const { data, error } = await supabaseAdmin
    .from('station_journals')
    .upsert(
      {
        station_id: stationId,
        journal_type: journalType,
        entries: entries,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'station_id,journal_type' }
    )
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Upsert failed')
  }

  if (!data) {
    throw new Error('Upsert failed - no data returned')
  }

  return data
}
