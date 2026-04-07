import { supabase } from './supabase';
import type { User, WorkReport, PremiyaReport, StationSchema, ReportEntry, GrafikTuri } from '@/types';

// ─── Stations ────────────────────────────────────────────────────────────────
import { getStations, getStation } from './store';
export { getStations, getStation };

// ─── Local DB row types ──────────────────────────────────────────────────────
interface DbUserRow {
  id: string;
  login: string;
  full_name: string;
  role: User['role'];
  position: User['position'];
  station_ids: string[] | null;
  phone: string | null;
  created_at: string;
}

interface DbWorkReportRow {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_phone: string | null;
  station_id: string;
  station_name: string;
  week_label: string;
  month: string;
  year: string;
  entries: ReportEntry[];
  submitted_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
}

interface DbPremiyaRow {
  id: string;
  worker_id: string;
  worker_name: string;
  station_id: string;
  station_name: string;
  month: string;
  year: string;
  sex: string | null;
  entries: PremiyaReport['entries'];
  submitted_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
}

interface DbSchemaRow {
  id: string;
  station_id: string;
  file_name: string;
  file_path: string;
  schema_type: string;
  uploaded_at: string;
  uploaded_by: string | null;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signIn(login: string, password: string): Promise<User | null> {
  const email = `${login}@shch-buxoro.local`;

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('login', login)
    .single();

  if (!profile) return null;

  return mapDbUserToUser(profile as DbUserRow);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentSession(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const login = session.user.email?.replace('@shch-buxoro.local', '') ?? '';

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('login', login)
    .single();

  if (!profile) return null;

  return mapDbUserToUser(profile as DbUserRow);
}

// ─── Users ───────────────────────────────────────────────────────────────────

function mapDbUserToUser(row: DbUserRow): User {
  return {
    id: row.id,
    login: row.login,
    fullName: row.full_name,
    role: row.role,
    position: row.position,
    stationIds: row.station_ids || [],
    phone: row.phone || '',
    createdAt: row.created_at,
  };
}

export async function getWorkers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('role', ['worker', 'bekat_boshlighi'])
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as DbUserRow[]).map(mapDbUserToUser);
}

type WorkerPayload = Omit<User, 'id' | 'createdAt'>;

export async function addWorker(worker: WorkerPayload): Promise<User> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch('/api/admin/create-worker', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(worker),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Create worker failed');
  }

  return mapDbUserToUser(result.data as DbUserRow);
}

export async function updateWorker(
  id: string,
  updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch('/api/admin/update-worker', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ id, ...updates }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Update worker failed');
  }

  return result.data ? mapDbUserToUser(result.data as DbUserRow) : null;
}

export async function deleteWorker(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch('/api/admin/delete-worker', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Delete worker failed');
  }
}

// ─── Work Reports ────────────────────────────────────────────────────────────

function mapDbReport(row: DbWorkReportRow): WorkReport {
  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    workerPhone: row.worker_phone || '',
    stationId: row.station_id,
    stationName: row.station_name,
    weekLabel: row.week_label,
    month: row.month,
    year: row.year,
    entries: row.entries || [],
    submittedAt: row.submitted_at,
    confirmedAt: row.confirmed_at || null,
    confirmedBy: row.confirmed_by || null,
  };
}

export async function getAllReports(): Promise<WorkReport[]> {
  const { data, error } = await supabase
    .from('work_reports')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbWorkReportRow[]).map(mapDbReport);
}

export async function getReportsByWorker(workerId: string): Promise<WorkReport[]> {
  const { data, error } = await supabase
    .from('work_reports')
    .select('*')
    .eq('worker_id', workerId)
    .order('month', { ascending: false });

  if (error || !data) return [];
  return (data as DbWorkReportRow[]).map(mapDbReport);
}

export async function getReportsByStation(stationId: string): Promise<WorkReport[]> {
  const { data, error } = await supabase
    .from('work_reports')
    .select('*')
    .eq('station_id', stationId)
    .order('submitted_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbWorkReportRow[]).map(mapDbReport);
}

export async function getReportByWorkerAndMonth(workerId: string, month: string): Promise<WorkReport | null> {
  const { data, error } = await supabase
    .from('work_reports')
    .select('*')
    .eq('worker_id', workerId)
    .eq('month', month)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbReport(data as DbWorkReportRow);
}

export async function upsertReport(
  report: Omit<WorkReport, 'id' | 'submittedAt' | 'confirmedAt' | 'confirmedBy'>
): Promise<WorkReport> {
  const { data, error } = await supabase
    .from('work_reports')
    .upsert(
      {
        worker_id: report.workerId,
        worker_name: report.workerName,
        worker_phone: report.workerPhone,
        station_id: report.stationId,
        station_name: report.stationName,
        week_label: report.weekLabel,
        month: report.month,
        year: report.year,
        entries: report.entries,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'worker_id,month' }
    )
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Upsert failed');
  return mapDbReport(data as DbWorkReportRow);
}

export async function confirmReport(reportId: string, dispatcherName: string): Promise<WorkReport | null> {
  const { data: current } = await supabase
    .from('work_reports')
    .select('entries')
    .eq('id', reportId)
    .single();

  if (!current) return null;

  const entries = (current.entries as ReportEntry[]).map((e: ReportEntry) => {
    const hasMeaning =
      e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish;

    return hasMeaning ? { ...e, adImzosi: `✅ Tasdiqlandi: Aloqa dispetcheri` } : e;
  });

  const { data, error } = await supabase
    .from('work_reports')
    .update({
      confirmed_at: new Date().toISOString(),
      confirmed_by: dispatcherName,
      entries,
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error || !data) return null;
  return mapDbReport(data as DbWorkReportRow);
}

export async function confirmReportEntry(
  reportId: string,
  entryIndex: number,
  dispatcherName: string
): Promise<WorkReport | null> {
  const { data: current } = await supabase
    .from('work_reports')
    .select('entries')
    .eq('id', reportId)
    .single();

  if (!current) return null;

  const entries = [...(current.entries as ReportEntry[])];
  const entry = entries[entryIndex];
  if (!entry) return null;

  const hasMeaning =
    entry.haftalikJadval || entry.yillikJadval || entry.yangiIshlar || entry.kmoBartaraf || entry.majburiyOzgarish;

  if (hasMeaning) {
    entries[entryIndex] = { ...entry, adImzosi: `✅ Tasdiqlandi: ${dispatcherName}` };
  }

  const { data, error } = await supabase
    .from('work_reports')
    .update({ entries })
    .eq('id', reportId)
    .select()
    .single();

  if (error || !data) return null;
  return mapDbReport(data as DbWorkReportRow);
}

export async function getStationPendingCount(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('work_reports')
    .select('station_id, entries, confirmed_at')
    .is('confirmed_at', null);

  if (error || !data) return {};

  const counts: Record<string, number> = {};

  for (const r of data as Array<{ station_id: string; entries: ReportEntry[] }>) {
    const hasPending = r.entries.some(
      (e: ReportEntry) =>
        (e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish) &&
        !e.adImzosi
    );

    if (hasPending) {
      counts[r.station_id] = (counts[r.station_id] || 0) + 1;
    }
  }

  return counts;
}

// ─── Premiya Reports ─────────────────────────────────────────────────────────

function mapDbPremiya(row: DbPremiyaRow): PremiyaReport {
  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    stationId: row.station_id,
    stationName: row.station_name,
    month: row.month,
    year: row.year,
    sex: row.sex || '',
    entries: row.entries || [],
    submittedAt: row.submitted_at,
    confirmedAt: row.confirmed_at || null,
    confirmedBy: row.confirmed_by || null,
  };
}

export async function getPremiyaReports(): Promise<PremiyaReport[]> {
  const { data, error } = await supabase
    .from('premiya_reports')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbPremiyaRow[]).map(mapDbPremiya);
}

export async function getPremiyasByWorker(workerId: string): Promise<PremiyaReport[]> {
  const { data, error } = await supabase
    .from('premiya_reports')
    .select('*')
    .eq('worker_id', workerId)
    .order('month', { ascending: false });

  if (error || !data) return [];
  return (data as DbPremiyaRow[]).map(mapDbPremiya);
}

export async function getPremiyasByStation(stationId: string): Promise<PremiyaReport[]> {
  const { data, error } = await supabase
    .from('premiya_reports')
    .select('*')
    .eq('station_id', stationId)
    .order('submitted_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbPremiyaRow[]).map(mapDbPremiya);
}

export async function getPremiyaByWorkerAndMonth(workerId: string, month: string): Promise<PremiyaReport | null> {
  const { data, error } = await supabase
    .from('premiya_reports')
    .select('*')
    .eq('worker_id', workerId)
    .eq('month', month)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbPremiya(data as DbPremiyaRow);
}

export async function upsertPremiyaReport(
  report: Omit<PremiyaReport, 'id' | 'submittedAt' | 'confirmedAt' | 'confirmedBy'>
): Promise<PremiyaReport> {
  const { data, error } = await supabase
    .from('premiya_reports')
    .upsert(
      {
        worker_id: report.workerId,
        worker_name: report.workerName,
        station_id: report.stationId,
        station_name: report.stationName,
        month: report.month,
        year: report.year,
        sex: report.sex,
        entries: report.entries,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'worker_id,month' }
    )
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Upsert failed');
  return mapDbPremiya(data as DbPremiyaRow);
}

export async function confirmPremiyaReport(reportId: string, dispatcherName: string): Promise<PremiyaReport | null> {
  const { data, error } = await supabase
    .from('premiya_reports')
    .update({
      confirmed_at: new Date().toISOString(),
      confirmed_by: dispatcherName,
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error || !data) return null;
  return mapDbPremiya(data as DbPremiyaRow);
}

export async function getPendingPremiyaCount(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('premiya_reports')
    .select('station_id')
    .is('confirmed_at', null);

  if (error || !data) return {};

  const counts: Record<string, number> = {};

  for (const r of data as Array<{ station_id: string }>) {
    counts[r.station_id] = (counts[r.station_id] || 0) + 1;
  }

  return counts;
}

// ─── Station Schemas ─────────────────────────────────────────────────────────

function mapDbSchema(row: DbSchemaRow): StationSchema {
  return {
    id: row.id,
    stationId: row.station_id,
    fileName: row.file_name,
    filePath: row.file_path,
    schemaType: row.schema_type,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by || undefined,
  };
}

export async function getSchemasByStation(stationId: string): Promise<StationSchema[]> {
  const { data, error } = await supabase
    .from('station_schemas')
    .select('*')
    .eq('station_id', stationId)
    .order('uploaded_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbSchemaRow[]).map(mapDbSchema);
}

export async function uploadSchemaFile(
  stationId: string,
  file: File,
  schemaType: string,
  uploadedBy: string
): Promise<StationSchema> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${stationId}/${Date.now()}_${schemaType}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('sxemalar')
    .upload(filePath, file, { upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage.from('sxemalar').getPublicUrl(filePath);

  const { data, error } = await supabase
    .from('station_schemas')
    .insert({
      station_id: stationId,
      file_name: file.name,
      file_path: urlData.publicUrl,
      schema_type: schemaType,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Insert failed');
  return mapDbSchema(data as DbSchemaRow);
}

export async function deleteSchema(stationId: string, schemaId: string): Promise<void> {
  const { data } = await supabase
    .from('station_schemas')
    .select('file_path')
    .eq('id', schemaId)
    .single();

  if (data?.file_path) {
    const url = new URL(data.file_path);
    const storagePath = url.pathname.split('/storage/v1/object/public/sxemalar/')[1];

    if (!storagePath) {
      throw new Error('Storage path not found for schema file');
    }

    await supabase.storage.from('sxemalar').remove([storagePath]);
  }

  await supabase
    .from('station_schemas')
    .delete()
    .eq('id', schemaId)
    .eq('station_id', stationId);
}
export const GLOBAL_GRAPHICS_STATION_ID = 'global_graphics'


export async function getGlobalGraphics(): Promise<StationSchema[]> {
  return getSchemasByStation(GLOBAL_GRAPHICS_STATION_ID)
}

export async function uploadGlobalGraphicFile(
  file: File,
  grafikTuri: GrafikTuri,
  uploadedBy: string
): Promise<StationSchema> {
  return uploadSchemaFile(GLOBAL_GRAPHICS_STATION_ID, file, grafikTuri, uploadedBy)
}

export async function deleteGlobalGraphicFile(schemaId: string): Promise<void> {
  return deleteSchema(GLOBAL_GRAPHICS_STATION_ID, schemaId)
}

// ========== ISH JURNALLARI (DU-46, SHU-2) ==========
import type { StationJournal, JournalType, DU46Entry, SHU2Entry } from '@/types'

interface DbJournalRow {
  id: string
  station_id: string
  journal_type: string
  entries: DU46Entry[] | SHU2Entry[]
  updated_at: string
  updated_by: string
}

function mapDbJournal(row: DbJournalRow): StationJournal {
  return {
    id: row.id,
    stationId: row.station_id,
    journalType: row.journal_type as JournalType,
    entries: row.entries,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

export async function getJournal(
  stationId: string,
  journalType: JournalType
): Promise<StationJournal | null> {
  const { data, error } = await supabase
    .from('station_journals')
    .select('*')
    .eq('station_id', stationId)
    .eq('journal_type', journalType)
    .single()

  if (error || !data) return null
  return mapDbJournal(data as DbJournalRow)
}

export async function upsertJournal(
  stationId: string,
  journalType: JournalType,
  entries: DU46Entry[] | SHU2Entry[],
  updatedBy: string
): Promise<StationJournal> {
  console.log('💾 upsertJournal chaqirildi:', { stationId, journalType, entriesCount: entries.length, updatedBy })

  const { data, error } = await supabase
    .from('station_journals')
    .upsert(
      {
        station_id: stationId,
        journal_type: journalType,
        entries: entries as unknown as Record<string, unknown>[],
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'station_id,journal_type' }
    )
    .select()
    .single()

  if (error) {
    console.error('❌ upsertJournal xatosi:', error)
    throw new Error(error?.message ?? 'Upsert failed')
  }

  if (!data) {
    console.error('❌ upsertJournal: data qaytmadi')
    throw new Error('Upsert failed - no data returned')
  }

  console.log('✅ upsertJournal muvaffaqiyatli:', data.id)
  return mapDbJournal(data as DbJournalRow)
}