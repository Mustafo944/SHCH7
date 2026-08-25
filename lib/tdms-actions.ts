'use server'

import { supabaseAdmin } from './supabase-admin'
import { TdmsSchedule } from './tdms-db'

function mapSchedule(row: any): TdmsSchedule {
  return {
    id: row.id,
    station_id: row.station_id,
    station_name: row.station_name,
    year: row.year,
    month: row.month,
    audit_type: row.audit_type as TdmsSchedule['audit_type'],
    completed: row.completed,
    completed_audit_id: row.completed_audit_id || undefined,
    created_at: row.created_at,
  }
}

export async function getTdmsSchedulesAdmin(year?: number): Promise<TdmsSchedule[]> {
  let query = supabaseAdmin
    .from('tdms_schedules')
    .select('*')
    .order('month', { ascending: true })
    .order('station_name', { ascending: true })

  if (year) {
    query = query.eq('year', year)
  }

  const { data, error } = await query
  if (error) throw new Error(`Grafiklarni yuklashda xato (admin): ${error.message}`)
  return (data || []).map(mapSchedule)
}
