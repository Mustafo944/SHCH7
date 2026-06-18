import { supabase } from './supabase';
import type { User, WorkReport, StationSchema, ReportEntry, GrafikTuri, StationJournal, JournalType, DU46Entry, SHU2Entry, ALSNEntry, YerlatgichEntry, AlsnKodEntry, MpsFriksionEntry, Incident } from '@/types';

// Stations
import { getStations, getStation } from './store';
import { safeStorage } from './utils/storage';
export { getStations, getStation };

// DB SELECT konstantalari (takrorlanishni kamaytirish)
const USER_COLUMNS = 'id, login, full_name, role, position, station_ids, phone, created_at' as const;

const WORK_REPORT_COLUMNS = 'id, worker_id, worker_name, worker_phone, station_id, station_name, week_label, month, year, entries, submitted_at, confirmed_at, confirmed_by, rejected_at, rejected_by' as const;

const INCIDENT_COLUMNS = 'id, month, content, created_at, created_by_name' as const;

const SCHEMA_COLUMNS = 'id, station_id, file_name, file_path, schema_type, uploaded_at, uploaded_by' as const;

const JOURNAL_COLUMNS = 'id, station_id, journal_type, entries, updated_at, updated_by' as const;

// Local DB row types
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
  rejected_at: string | null;
  rejected_by: string | null;
}

interface DbIncidentRow {
  id: string;
  month: string;
  content: string;
  created_at: string;
  created_by_name: string;
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

// Auth

export async function signIn(login: string, password: string): Promise<User | null> {
  const email = `${login}@shch-buxoro.local`;

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) return null;

  const user = await getUserProfileById(authData.user.id);

  if (user && typeof document !== 'undefined') {
    document.cookie = `user-role=${user.role}; path=/; max-age=86400; SameSite=Lax; Secure`;
    safeStorage.setItem('user-profile', JSON.stringify(user));
  }

  return user;
}

async function getUserProfileById(userId: string): Promise<User | null> {
  const { data: profile } = await supabase
    .from('users')
    .select(USER_COLUMNS)
    .eq('id', userId)
    .single();

  if (!profile) return null;

  return mapDbUserToUser(profile as DbUserRow);
}

export async function signOut(): Promise<void> {
  if (typeof document !== 'undefined') {
    // Custom cookie va localStorage ni tozalash
    document.cookie = 'user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
    safeStorage.removeItem('user-profile');

    // Supabase SSR ning BARCHA auth cookielarini majburan tozalash
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
      }
    });

    // Supabase localStorage kalitlarini ham tozalash
    safeStorage.clearMatching('sb-');
  }
  await supabase.auth.signOut();
}

export async function getCachedSession(): Promise<User | null> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) return null;

    // Local storage dan o'qish (Tezlik uchun)
    if (typeof window !== 'undefined') {
      const cached = safeStorage.getItem('user-profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Validatsiya: zarur maydonlar mavjudligini tekshirish
          if (parsed.id === session.user.id && parsed.role && parsed.fullName && parsed.position) {
            return parsed;
          }
        } catch (e) {
          safeStorage.removeItem('user-profile');
        }
      }
    }

    const profile = await getUserProfileById(session.user.id);
    if (profile && typeof window !== 'undefined') {
      safeStorage.setItem('user-profile', JSON.stringify(profile));
    }

    return profile;
  } catch (err) {
    console.error('getCachedSession error:', err);
    return null;
  }
}

export async function getCurrentSession(): Promise<User | null> {
  let user = null;
  let error = null;

  try {
    const res = await supabase.auth.getUser();
    user = res.data.user;
    error = res.error;
  } catch (err) {
    console.warn('Supabase auth.getUser() lock error:', err);
    return null;
  }

  if (error || !user) return null;

  return getUserProfileById(user.id);
}

// Users

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
    .select(USER_COLUMNS)
    .neq('role', 'dispatcher')
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as DbUserRow[]).map(mapDbUserToUser);
}

type WorkerPayload = Omit<User, 'id' | 'createdAt'> & { password?: string };

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

// Work Reports

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
    rejectedAt: row.rejected_at || null,
    rejectedBy: row.rejected_by || null,
  };
}

export async function getAllReports(): Promise<WorkReport[]> {
  const { data, error } = await supabase
    .from('work_reports')
    .select(WORK_REPORT_COLUMNS)
    .neq('week_label', 'Draft Oylik Reja')
    .order('submitted_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbWorkReportRow[]).map(mapDbReport);
}

export async function getReportsByWorker(workerId: string): Promise<WorkReport[]> {
  const { data, error } = await supabase
    .from('work_reports')
    .select(WORK_REPORT_COLUMNS)
    .eq('worker_id', workerId)
    .order('month', { ascending: false });

  if (error || !data) return [];
  return (data as DbWorkReportRow[]).map(mapDbReport);
}

export async function getReportsByStation(stationId: string): Promise<WorkReport[]> {
  const { data, error } = await supabase
    .from('work_reports')
    .select(WORK_REPORT_COLUMNS)
    .eq('station_id', stationId)
    .neq('week_label', 'Draft Oylik Reja')
    .order('month', { ascending: false });

  if (error || !data) return [];
  return (data as DbWorkReportRow[]).map(mapDbReport);
}

export async function getReportsByStations(stationIds: string[]): Promise<WorkReport[]> {
  if (!stationIds || stationIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('work_reports')
    .select(WORK_REPORT_COLUMNS)
    .in('station_id', stationIds)
    // Removed the 'Draft Oylik Reja' filter so that draft reports can also be seen and edited by authorized users (e.g., Katta Elektromexanik) before submission.
    .order('month', { ascending: false });

  if (error || !data) return [];
  return (data as DbWorkReportRow[]).map(mapDbReport);
}



export async function getReportByWorkerAndMonth(workerId: string, month: string): Promise<WorkReport | null> {
  const { data, error } = await supabase
    .from('work_reports')
    .select(WORK_REPORT_COLUMNS)
    .eq('worker_id', workerId)
    .eq('month', month)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbReport(data as DbWorkReportRow);
}

export async function upsertReport(
  report: Omit<WorkReport, 'id' | 'submittedAt' | 'confirmedAt' | 'confirmedBy' | 'rejectedAt' | 'rejectedBy'> & { id?: string }
): Promise<WorkReport> {
  const payload: Record<string, unknown> = {
    worker_id: report.workerId,
    worker_name: report.workerName,
    worker_phone: report.workerPhone,
    station_id: report.stationId,
    station_name: report.stationName,
    week_label: report.weekLabel,
    month: report.month, // Removing suffix hack, using actual month
    year: report.year,
    entries: report.entries,
    submitted_at: new Date().toISOString(),
  };
  if (report.id) payload.id = report.id;

  const { data, error } = await supabase
    .from('work_reports')
    .upsert(
      payload,
      { onConflict: report.id ? 'id' : 'worker_id,month,station_id' }
    )
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Upsert failed');
  return mapDbReport(data as DbWorkReportRow);
}

export async function confirmReport(reportId: string, dispatcherName: string): Promise<WorkReport | null> {
  const { data, error } = await supabase
    .from('work_reports')
    .update({
      confirmed_at: new Date().toISOString(),
      confirmed_by: dispatcherName,
      // Qabul qilinganda rad etish ma'lumotlarini tozalaymiz
      rejected_at: null,
      rejected_by: null,
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error || !data) return null;
  return mapDbReport(data as DbWorkReportRow);
}

/** Aloqa dispetcheri oylik ish rejani rad etadi.
 * Katta elektromexanik qayta yuborishi kerak bo'ladi.
 */
export async function rejectReport(reportId: string, dispatcherName: string): Promise<WorkReport | null> {
  const { data, error } = await supabase
    .from('work_reports')
    .update({
      // Tasdiqni olib tashlaymiz
      confirmed_at: null,
      confirmed_by: null,
      // Rad etish ma'lumotlarini yozamiz
      rejected_at: new Date().toISOString(),
      rejected_by: dispatcherName,
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error || !data) return null;
  return mapDbReport(data as DbWorkReportRow);
}

export async function updateReportEntryInProgress(
  reportId: string,
  entryIndex: number,
  taskType: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy'
): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('work_reports')
    .select('entries')
    .eq('id', reportId)
    .single();

  if (fetchError || !current) {
    console.error('Report not found for inProgress update:', fetchError);
    return;
  }

  const entries = [...(current.entries as ReportEntry[])];
  const entry = entries[entryIndex];
  if (!entry) return;

  const typeKeyMap: Record<string, keyof ReportEntry> = {
    haftalik: 'inProgressHaftalik',
    yillik: 'inProgressYillik',
    yangi: 'inProgressYangi',
    kmo: 'inProgressKmo',
    majburiy: 'inProgressMajburiy'
  };

  const key = typeKeyMap[taskType];
  if (key) {
    (entry as any)[key] = true;
  }

  await supabase
    .from('work_reports')
    .update({ entries })
    .eq('id', reportId);
}

export async function markReportEntryDoneFromJournal(
  reportId: string,
  entryIndex: number,
  taskType: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy',
  workerName: string
): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('work_reports')
    .select('entries, worker_name')
    .eq('id', reportId)
    .single();

  if (fetchError || !current) {
    console.error('Report not found for done update:', fetchError);
    return;
  }

  const entries = [...(current.entries as ReportEntry[])];
  const entry = entries[entryIndex];
  if (!entry) return;

  const typeKeyMap: Record<string, keyof ReportEntry> = {
    haftalik: 'doneHaftalik',
    yillik: 'doneYillik',
    yangi: 'doneYangi',
    kmo: 'doneKmo',
    majburiy: 'doneMajburiy'
  };

  const inProgressKeyMap: Record<string, keyof ReportEntry> = {
    haftalik: 'inProgressHaftalik',
    yillik: 'inProgressYillik',
    yangi: 'inProgressYangi',
    kmo: 'inProgressKmo',
    majburiy: 'inProgressMajburiy'
  };

  const key = typeKeyMap[taskType];
  const inProgKey = inProgressKeyMap[taskType];

  if (key) {
    (entry as any)[key] = true;
    (entry as any)[inProgKey] = false; // "Bajarildi" bo'lsa "Jarayonda" olib tashlanadi
  }

  // Set the overall "Bajarildi" flag if we are checking
  entry.bajarilganSana = new Date().toISOString();
  // workerName parametridan kelgan ism aslida Navbatchi/BB ni ismi,
  // ShN ni ismi esa report.worker_name dan olinadi
  entry.bajarildiShn = current.worker_name || 'ShN';
  entry.bajarildiImzo = current.worker_name || 'ShN';
  entry.adImzosi = workerName;

  await supabase
    .from('work_reports')
    .update({ entries })
    .eq('id', reportId);
}

export async function confirmReportEntry(
  reportId: string,
  entryIndex: number
): Promise<WorkReport> {
  const { data: current, error: fetchError } = await supabase
    .from('work_reports')
    .select('entries')
    .eq('id', reportId)
    .single();

  if (fetchError || !current) {
    throw new Error(fetchError?.message || 'Report not found');
  }

  const entries = [...(current.entries as ReportEntry[])];
  const entry = entries[entryIndex];
  if (!entry) {
    throw new Error('Entry not found');
  }

  const hasMeaning =
    entry.haftalikJadval || entry.yillikJadval || entry.yangiIshlar || entry.kmoBartaraf || entry.majburiyOzgarish;

  if (hasMeaning) {
    entries[entryIndex] = { ...entry, adImzosi: `✅ Tasdiqlandi: Aloqa dispetcheri` };
  }

  const { data, error } = await supabase
    .from('work_reports')
    .update({ entries })
    .eq('id', reportId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Update failed');
  }
  return mapDbReport(data as DbWorkReportRow);
}

// Worker har kuni "Bajarildi" bosganida entries ni yangilaydi (confirmed_at o'zgarmaydi)
export async function updateReportEntries(
  reportId: string,
  entries: ReportEntry[]
): Promise<WorkReport> {
  const { data, error } = await supabase
    .from('work_reports')
    .update({ entries })
    .eq('id', reportId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Update failed');
  return mapDbReport(data as DbWorkReportRow);
}

export async function getStationPendingCount(): Promise<Record<string, number>> {
  // Optimizatsiya: entries massivini yuklamaymiz — faqat station_id va id olamiz
  // confirmed_at IS NULL filtri serverda ishlaydi, client'da faqat hisoblaymiz
  const { data, error } = await supabase
    .from('work_reports')
    .select('station_id, id')
    .is('confirmed_at', null)
    .neq('week_label', 'Draft Oylik Reja');

  if (error || !data) return {};

  const counts: Record<string, number> = {};

  for (const r of data as Array<{ station_id: string; id: string }>) {
    counts[r.station_id] = (counts[r.station_id] || 0) + 1;
  }

  return counts;
}

// Incidents

export async function getIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select(INCIDENT_COLUMNS)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbIncidentRow[]).map(row => ({
    id: row.id,
    month: row.month,
    content: row.content,
    createdAt: row.created_at,
    createdByName: row.created_by_name,
  }));
}

export async function getIncidentsByMonth(month: string): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select(INCIDENT_COLUMNS)
    .eq('month', month)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbIncidentRow[]).map(row => ({
    id: row.id,
    month: row.month,
    content: row.content,
    createdAt: row.created_at,
    createdByName: row.created_by_name,
  }));
}

export async function addIncident(month: string, content: string, createdByName: string): Promise<Incident> {
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      month,
      content,
      created_by_name: createdByName,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Insert failed');
  const row = data as DbIncidentRow;
  return {
    id: row.id,
    month: row.month,
    content: row.content,
    createdAt: row.created_at,
    createdByName: row.created_by_name,
  };
}

export async function deleteIncident(id: string): Promise<void> {
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function getUnreadIncidentsCount(workerId: string): Promise<number> {
  // First get all incidents
  const { data: incidents, error: incidentsError } = await supabase
    .from('incidents')
    .select('id');

  if (incidentsError || !incidents) return 0;

  // Get read incidents for this worker
  const { data: reads, error: readsError } = await supabase
    .from('incident_reads')
    .select('incident_id')
    .eq('worker_id', workerId);

  if (readsError || !reads) return incidents.length;

  const readIds = new Set(reads.map(r => r.incident_id));
  return incidents.filter(i => !readIds.has(i.id)).length;
}

export async function getReadIncidentIds(workerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('incident_reads')
    .select('incident_id')
    .eq('worker_id', workerId);

  if (error || !data) return [];
  return data.map(r => r.incident_id);
}

export async function markIncidentAsRead(incidentId: string, workerId: string): Promise<void> {
  const { error } = await supabase
    .from('incident_reads')
    .insert({
      incident_id: incidentId,
      worker_id: workerId,
    });

  // Ignore unique constraint error if already read
  if (error && error.code !== '23505') {
    throw new Error(error.message);
  }
}

// Station Schemas

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
    .select(SCHEMA_COLUMNS)
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
    .upload(filePath, file, {
      upsert: false,
      cacheControl: '31536000'
    });

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

    const { error: storageError } = await supabase.storage
      .from('sxemalar')
      .remove([storagePath]);

    if (storageError) {
      throw new Error(storageError.message);
    }
  }

  const { error } = await supabase
    .from('station_schemas')
    .delete()
    .eq('id', schemaId);

  if (error) throw new Error(error.message);
}

export async function renameSchemaFile(schemaId: string, newFileName: string): Promise<void> {
  const { error } = await supabase
    .from('station_schemas')
    .update({ file_name: newFileName })
    .eq('id', schemaId);
  if (error) throw new Error(error.message);
}

// Global Graphics
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

export async function deleteGlobalGraphicFile(schemaId: string) {
  return deleteSchema(GLOBAL_GRAPHICS_STATION_ID, schemaId)
}

// Kutubxona (Library Books)
export const LIBRARY_BOOKS_STATION_ID = 'global_library_books'

export async function getLibraryBooks() {
  return getSchemasByStation(LIBRARY_BOOKS_STATION_ID)
}

export async function uploadLibraryBook(file: File, bookTitle: string, uploadedBy: string = 'System') {
  // Haqiqiy fayl kengaytmasini (extension) olamiz (masalan 'pdf', 'png')
  const originalExt = file.name.split('.').pop() || 'pdf'

  // Nomi ichida nuqta bo'lmasa, kengaytmani qo'shamiz. Aks holda Supabase xato beradi (Invalid Key)
  const finalFileName = bookTitle.includes('.') ? bookTitle : `${bookTitle}.${originalExt}`

  const newFile = new File([file], finalFileName, { type: file.type })
  return uploadSchemaFile(LIBRARY_BOOKS_STATION_ID, newFile, 'book', uploadedBy)
}

export async function renameLibraryBook(bookId: string, newTitle: string) {
  return renameSchemaFile(bookId, newTitle)
}

export async function deleteLibraryBook(bookId: string) {
  return deleteSchema(LIBRARY_BOOKS_STATION_ID, bookId)
}

// ========== ISH JURNALLARI (DU-46, SHU-2) ==========

interface DbJournalRow {
  id: string
  station_id: string
  journal_type: string
  entries: DU46Entry[] | SHU2Entry[] | ALSNEntry[] | YerlatgichEntry[] | AlsnKodEntry[] | MpsFriksionEntry[]
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
    .select(JOURNAL_COLUMNS)
    .eq('station_id', stationId)
    .eq('journal_type', journalType)
    .maybeSingle() // Bug #14 fix: .single() o'rniga .maybeSingle() ishlatamiz
    // .single() hech narsa topilmasa ham xato beradi (PGRST116).
    // .maybeSingle() esa hech narsa topilmasa null qaytaradi, xato bermaydi.

  if (error) {
    console.error('getJournal xatosi:', error.message)
    return null
  }
  if (!data) return null
  return mapDbJournal(data as DbJournalRow)
}


// ── PENDING JOURNAL COUNTS CACHE ──────────────────────────────────────
// Takroriy so'rovlarni oldini olish uchun 5 soniyalik kesh
const _pendingJournalCache = new Map<string, { data: { du46: number; shu2: number }; ts: number }>()
const PENDING_CACHE_TTL = 5000 // 5 soniya

export async function getPendingJournalCounts(
  stationId: string,
  role: string,
  position?: string
): Promise<{ du46: number; shu2: number }> {
  const cacheKey = `${stationId}_${role}_${position || ''}`
  const cached = _pendingJournalCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < PENDING_CACHE_TTL) {
    return cached.data
  }

  try {
    const { data, error } = await supabase
      .from('station_journals')
      .select('journal_type, entries')
      .eq('station_id', stationId)
      .in('journal_type', ['du46', 'shu2'])

    let du46 = 0
    let shu2 = 0

    if (data && !error) {
      for (const row of data) {
        if (row.journal_type === 'du46') {
          const ents = (row.entries || []) as DU46Entry[]
          let count = 0

          const getCreator = (e: DU46Entry) => e.createdByRole || 'worker'

          const getNextRole = (e: DU46Entry, col: 3 | 12): string | null => {
            const isBoshlandi = col === 3 ? e.kamchilikBajarildi : e.bartarafBajarildi
            if (!isBoshlandi) return null
            const chain = e.approvalChain || []
            const approvals = col === 3 ? (e.approvalsCol3 || []) : (e.approvalsCol12 || [])
            
            if (col === 3) {
              if (approvals.length < chain.length) return chain[approvals.length]
              const creator = getCreator(e)
              if (creator === 'bekat_boshlighi') return null
              if (!e.kamchilikBBTasdiqladi) return 'DSP'
              return null
            } else {
              const creatorRole = getCreator(e)
              const col3Participants = new Set<string>()
              
              if (creatorRole !== 'bekat_boshlighi') {
                col3Participants.add(creatorRole)
              }
              chain.forEach(r => col3Participants.add(r))

              const writerRole = e.bartarafByRole || getCreator(e)
              const requiredChainFor12 = Array.from(col3Participants).filter(r => r !== writerRole)
              
              const nextRequiredRole = requiredChainFor12.find(r => !approvals.some(a => {
                if (r === 'worker' && ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik'].includes(a.role)) return true
                return a.role === r
              }))
              
              if (nextRequiredRole) return nextRequiredRole
              if (!e.bartarafBBTasdiqladi) return 'DSP'
              return null
            }
          }

          for (const e of ents) {
            if (e.yuborildi) continue

            const next3 = getNextRole(e, 3)
            const next12 = getNextRole(e, 12)
            const userRoleToCheck = position || role

            let isMyTurn = false

            if (userRoleToCheck === 'bekat_navbatchisi') {
              if (next3 === 'DSP' || next12 === 'DSP') isMyTurn = true
            } else {
              // Har qanday tasdiqlash zanjiridagi ishchi uchun (navbat kutilmaydi):
              const checkCol = (col: 3 | 12) => {
                const isBoshlandi = col === 3 ? e.kamchilikBajarildi : e.bartarafBajarildi
                if (!isBoshlandi) return false
                
                const chain = e.approvalChain || []
                const approvals = col === 3 ? (e.approvalsCol3 || []) : (e.approvalsCol12 || [])
                
                let isParticipant = false
                if (col === 3) {
                  isParticipant = chain.includes(userRoleToCheck) || (userRoleToCheck === 'katta_elektromexanik' && chain.includes('worker'))
                } else {
                  const creatorRole = getCreator(e)
                  const col3Participants = new Set<string>()
                  if (creatorRole !== 'bekat_boshlighi') col3Participants.add(creatorRole)
                  chain.forEach(r => col3Participants.add(r))
                  
                  const writerRole = e.bartarafByRole || getCreator(e)
                  col3Participants.delete(writerRole)
                  
                  if (col3Participants.has(userRoleToCheck) || (['elektromexanik', 'elektromontyor', 'katta_elektromexanik'].includes(userRoleToCheck) && col3Participants.has('worker'))) {
                    isParticipant = true
                  }
                }

                // Agar ro'yxatda bo'lsa va hali tasdiqlamagan bo'lsa:
                if (isParticipant) {
                  if (!approvals.some(a => {
                    if (userRoleToCheck === a.role) return true
                    if (['elektromexanik', 'elektromontyor', 'katta_elektromexanik'].includes(userRoleToCheck) && a.role === 'worker') return true
                    if (['elektromexanik', 'elektromontyor', 'katta_elektromexanik'].includes(a.role) && userRoleToCheck === 'worker') return true
                    return false
                  })) return true
                }
                return false
              }

              if (checkCol(3) || checkCol(12)) isMyTurn = true
            }

            if (isMyTurn) count++
          }
          du46 = count
        } else if (row.journal_type === 'shu2') {
          // SHU-2: worker dispetcher qabul qilganini kutadi
          const ents = (row.entries || []) as SHU2Entry[]
          if (['worker', 'elektromexanik', 'elektromontyor'].includes(role)) {
            // Worker uchun: yuborilgan lekin dispetcher qabul qilmagan qatorlar
            const pending = ents.filter(e => e.yuborildi && !e.dispetcherQabulQildi).length
            shu2 += pending
          }
          // bekat_boshlighi uchun SHU-2 da kutish yo'q
        }
      }
    }
    const result = { du46, shu2 }
    _pendingJournalCache.set(cacheKey, { data: result, ts: Date.now() })
    return result
  } catch (err) {
    return { du46: 0, shu2: 0 }
  }
}

export async function upsertJournal(
  stationId: string,
  journalType: JournalType,
  entries: DU46Entry[] | SHU2Entry[] | ALSNEntry[] | YerlatgichEntry[] | AlsnKodEntry[] | MpsFriksionEntry[],
  updatedBy: string
): Promise<StationJournal> {
  const { serverUpsertJournal } = await import('@/app/actions/journal-actions')
  
  const data = await serverUpsertJournal(
    stationId, 
    journalType, 
    entries as unknown as Record<string, unknown>[], 
    updatedBy
  )

  return mapDbJournal(data as DbJournalRow)
}

// Barcha jurnallarni olish (dispetcher uchun)
export async function getAllJournals(): Promise<StationJournal[]> {
  const { data, error } = await supabase
    .from('station_journals')
    .select(JOURNAL_COLUMNS)
    .order('updated_at', { ascending: false })

  if (error) {
    return []
  }

  return (data || []).map((row: DbJournalRow) => mapDbJournal(row))
}

// ── DISPETCHER UCHUN YENGIL FUNKSIYALAR ──────────────────────────────

/** Faqat DU-46 va SHU-2 pending countlarini qaytaradi (entries matnisiz) */
export async function getDispatcherJournalSummary(): Promise<Record<string, { du46: number; shu2: number }>> {
  const { data, error } = await supabase
    .from('station_journals')
    .select('station_id, journal_type, entries')
    .in('journal_type', ['du46', 'shu2'])

  if (error) {
    return {}
  }

  const summary: Record<string, { du46: number; shu2: number }> = {}

  for (const row of data || []) {
    const sid = row.station_id as string
    if (!summary[sid]) summary[sid] = { du46: 0, shu2: 0 }

    const entries = (row.entries || []) as Array<{ yuborildi?: boolean; dispetcherQabulQildi?: boolean }>
    const pendingCount = entries.filter(e => e.yuborildi && !e.dispetcherQabulQildi).length

    if (row.journal_type === 'du46') {
      summary[sid].du46 += pendingCount
    } else {
      summary[sid].shu2 += pendingCount
    }
  }

  return summary
}

/** Bekat bo'yicha jurnallarni olish (arxiv lazy load uchun) */
export async function getJournalsByStationId(stationId: string): Promise<StationJournal[]> {
  const { data, error } = await supabase
    .from('station_journals')
    .select(JOURNAL_COLUMNS)
    .eq('station_id', stationId)
    .order('updated_at', { ascending: false })

  if (error) {
    return []
  }

  return (data || []).map((row: DbJournalRow) => mapDbJournal(row))
}
