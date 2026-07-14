import { supabase } from './supabase';
import type { User, WorkReport, StationSchema, ReportEntry, GrafikTuri, StationJournal, JournalType, DU46Entry, SHU2Entry, ALSNEntry, YerlatgichEntry, AlsnKodEntry, MpsFriksionEntry, Incident, IncidentSeverity } from '@/types';

// Stations
import { getStations, getStation } from './store';
import { safeStorage } from './utils/storage';
export { getStations, getStation };

// DB SELECT konstantalari (takrorlanishni kamaytirish)
const USER_COLUMNS = 'id, login, full_name, role, position, station_ids, phone, created_at' as const;

const WORK_REPORT_COLUMNS = 'id, worker_id, worker_name, worker_phone, station_id, station_name, week_label, month, year, entries, submitted_at, confirmed_at, confirmed_by, rejected_at, rejected_by, is_submitted' as const;

const INCIDENT_COLUMNS = 'id, month, content, created_at, created_by_name, severity' as const;

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

export type DbWorkReportRow = {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_phone: string;
  station_id: string;
  station_name: string;
  week_label: string;
  month: string;
  year: string;
  entries: any;
  submitted_at: string;
  confirmed_at?: string;
  confirmed_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  is_submitted?: boolean;
};

interface DbIncidentRow {
  id: string;
  month: string;
  content: string;
  created_at: string;
  created_by_name: string;
  severity: string | null;
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

  if (error) {
    console.error('getWorkers error:', error.message);
    return [];
  }
  if (!data) return [];
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

export function mapDbReport(row: DbWorkReportRow): WorkReport {
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
    entries: (row.entries || []) as ReportEntry[],
    submittedAt: row.submitted_at,
    confirmedAt: row.confirmed_at || null,
    confirmedBy: row.confirmed_by || null,
    rejectedAt: row.rejected_at || null,
    rejectedBy: row.rejected_by || null,
    isSubmitted: row.is_submitted ?? false,
  };
}

/**
 * Berilgan oylar ro'yxati bo'yicha hisobotlar.
 * Dispatcher dashboard faqat joriy + o'tgan oyni ishlatadi —
 * butun bazani tortish o'rniga shu funksiyadan foydalanamiz.
 * @param months — 'YYYY-MM' formatidagi oylar, masalan ['2026-07', '2026-06']
 */
export async function getReportsByMonths(months: string[]): Promise<WorkReport[]> {
  if (!months || months.length === 0) return [];

  const { data, error } = await supabase
    .from('work_reports')
    .select(WORK_REPORT_COLUMNS)
    .in('month', months)
    // Faqat yuborilgan rejalar — draft (avtosaqlangan) rejalar dispetcherga ko'rinmaydi
    .eq('is_submitted', true)
    .order('submitted_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbWorkReportRow[]).map(mapDbReport);
}

/**
 * Bitta bekatning bitta yildagi barcha hisobotlari (arxiv uchun).
 * 'month' ustuni 'YYYY-MM' formatida saqlanadi, shuning uchun
 * yil bo'yicha filtrlash uchun 'YYYY-%' pattern ishlatiladi.
 * Bitta bekat-yil = maksimum ~50 qator — juda yengil so'rov.
 */
export async function getReportsByStationYear(
  stationId: string,
  year: string
): Promise<WorkReport[]> {
  if (!stationId || !year) return [];

  const { data, error } = await supabase
    .from('work_reports')
    .select(WORK_REPORT_COLUMNS)
    .eq('station_id', stationId)
    .like('month', `${year}-%`)
    // Arxiv ham faqat yuborilgan rejalarni ko'rsatadi
    .eq('is_submitted', true)
    .order('month', { ascending: false });

  if (error || !data) return [];
  return (data as DbWorkReportRow[]).map(mapDbReport);
}

/**
 * Bekatlar hisobotlari — faqat berilgan oylar bo'yicha.
 * Draft (is_submitted=false) rejalar ham qaytariladi — Katta Elektromexanik
 * yuborishdan avval ularni ko'rishi/tahrirlashi kerak.
 * Worker sahifasi joriy yil oylari (+o'tgan yil dekabri) bilan chaqiradi —
 * yillar o'tsa ham payload o'smaydi.
 * @param months — 'YYYY-MM' formatidagi oylar ro'yxati
 */
export async function getReportsByStationsAndMonths(
  stationIds: string[],
  months: string[]
): Promise<WorkReport[]> {
  if (!stationIds || stationIds.length === 0 || !months || months.length === 0) return [];

  const { data, error } = await supabase
    .from('work_reports')
    .select(WORK_REPORT_COLUMNS)
    .in('station_id', stationIds)
    .in('month', months)
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
  report: Omit<WorkReport, 'id' | 'submittedAt' | 'confirmedAt' | 'confirmedBy' | 'rejectedAt' | 'rejectedBy' | 'isSubmitted'> & { id?: string },
  isSubmitted?: boolean,
  // Chaqiruvchi oxirgi ko'rgan submitted_at qiymati — agar berilgan bo'lsa va bazadagisidan
  // farq qilsa, demak shu orada boshqa joyda saqlangan; ustidan yozib yubormaymiz.
  expectedSubmittedAt?: string | null
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
    rejected_at: null, // Qayta yuborilganda rad etish statusini tozalash
    rejected_by: null,
  };
  // Faqat "Yuborish" bosilganda is_submitted=true yoziladi.
  // Avtosaqlashda (isSubmitted=undefined) bu ustun payload'ga qo'shilmaydi:
  //  - yangi draft → DB default `false` (dispetcherga ko'rinmaydi)
  //  - allaqachon yuborilgan reja → qiymat o'zgarmasdan saqlanadi (`true` qoladi)
  if (isSubmitted === true) payload.is_submitted = true;

  // Mavjud qatorni topamiz — id bo'yicha (agar chaqiruvchi biladigan bo'lsa) yoki
  // worker+oy+bekat bo'yicha (agar chaqiruvchi hali reportId'ni bilmasa).
  const existingQuery = report.id
    ? supabase.from('work_reports').select('id, submitted_at').eq('id', report.id).maybeSingle()
    : supabase.from('work_reports').select('id, submitted_at')
      .eq('worker_id', report.workerId).eq('month', report.month).eq('station_id', report.stationId).maybeSingle();
  const { data: existing } = await existingQuery;

  if (existing) {
    // Chaqiruvchi reportId'ni bilmagan holda (report.id yo'q) mavjud qator topilgan bo'lsa —
    // demak chaqiruvchi hali haqiqiy rejani hech qachon ko'rmagan (masalan sahifa hali
    // to'liq yuklanmagan). Bunday holatda hech qachon ustidan yozmaymiz.
    if (!report.id) {
      throw new Error('CONFLICT: Bu bekat/oy uchun reja allaqachon mavjud, lekin hali yuklanmagan edi. Sahifani yangilang.');
    }
    if (expectedSubmittedAt !== undefined && expectedSubmittedAt !== null && existing.submitted_at !== expectedSubmittedAt) {
      throw new Error('CONFLICT: Bu reja boshqa joyda allaqachon saqlangan. Sahifani yangilang.');
    }
    const { data, error } = await supabase
      .from('work_reports')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Upsert failed');
    return mapDbReport(data as DbWorkReportRow);
  }

  const { data, error } = await supabase
    .from('work_reports')
    .insert(payload)
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
      // Himoya: tasdiqlangan reja har doim "yuborilgan" hisoblanishi shart —
      // aks holda is_submitted=false qolib ketsa, reja tasdiqlangan bo'lsa ham
      // dispetcher ro'yxatida ko'rinmay qoladi.
      is_submitted: true,
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
      // Rad etilgach reja qayta DRAFT bo'ladi: xodim uni tahrirlab,
      // qaytadan "Yuborish" bosmaguncha dispetcherga ko'rinmaydi.
      is_submitted: false,
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
  taskType: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy',
  value: boolean = true
): Promise<void> {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data: current, error: fetchError } = await supabase
      .from('work_reports')
      .select('entries, submitted_at')
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
      (entry as any)[key] = value;
    }

    // Optimistic locking: faqat submitted_at o'zgarmagan bo'lsa yangilash
    const { data: updated, error: updateError } = await supabase
      .from('work_reports')
      .update({ entries, submitted_at: new Date().toISOString() })
      .eq('id', reportId)
      .eq('submitted_at', current.submitted_at)
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('Update error:', updateError);
      return;
    }

    if (updated) return; // Muvaffaqiyatli yangilandi

    // Agar updated null bo'lsa — boshqa ishchi o'zgartirgan, qayta urinish
    if (attempt < MAX_RETRIES - 1) {
      await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
    }
  }
  console.error('updateReportEntryInProgress: max retries reached for', reportId);
}

export async function markReportEntryDoneFromJournal(
  reportId: string,
  entryIndex: number,
  taskType: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy',
  workerName: string
): Promise<void> {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data: current, error: fetchError } = await supabase
      .from('work_reports')
      .select('entries, worker_name, submitted_at')
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
    // workerName parametridan kelgan ism aslida Navbatchi/BB ni ismi (Jurnalda qoladi),
    // Oylik ish rejada esa (Bajaruvchi va AD imzosi ustunlarida) 
    // doim bajargan elektromexanik (report.worker_name) familiyasi bo'lishi kerak
    entry.bajarildiShn = current.worker_name || 'ShN';
    entry.bajarildiImzo = current.worker_name || 'ShN';
    entry.adImzosi = current.worker_name || 'ShN';

    // Optimistic locking: faqat submitted_at o'zgarmagan bo'lsa yangilash
    const { data: updated, error: updateError } = await supabase
      .from('work_reports')
      .update({ entries, submitted_at: new Date().toISOString() })
      .eq('id', reportId)
      .eq('submitted_at', current.submitted_at)
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('Update error:', updateError);
      return;
    }

    if (updated) return; // Muvaffaqiyatli yangilandi

    // Agar updated null bo'lsa — boshqa ishchi o'zgartirgan, qayta urinish
    if (attempt < MAX_RETRIES - 1) {
      await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
    }
  }
  console.error('markReportEntryDoneFromJournal: max retries reached for', reportId);
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

// Worker har kuni "Bajarildi" bosganida yoki navbatdan tashqari ish qo'shganida entries ni yangilaydi
// (confirmed_at o'zgarmaydi). Chaqiruvchi butun (potentsial eskirgan) massivni emas, balki
// "hozirgi holatni qanday o'zgartirish kerak" funksiyasini beradi — shu bilan har doim
// SERVERDAGI ENG SO'NGGI entries ustida ishlaymiz, boshqa joyda parallel kiritilgan
// o'zgarishlarni (masalan dispetcher tasdig'i yoki boshqa qurilmadagi skaner) yo'qotib qo'ymaymiz.
export async function updateReportEntries(
  reportId: string,
  mutate: (currentEntries: ReportEntry[]) => ReportEntry[]
): Promise<WorkReport> {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data: current, error: fetchError } = await supabase
      .from('work_reports')
      .select('entries, submitted_at')
      .eq('id', reportId)
      .single();

    if (fetchError || !current) {
      throw new Error(fetchError?.message || 'Report not found');
    }

    const entries = mutate([...(current.entries as ReportEntry[])]);

    const { data: updated, error: updateError } = await supabase
      .from('work_reports')
      .update({ entries, submitted_at: new Date().toISOString() })
      .eq('id', reportId)
      .eq('submitted_at', current.submitted_at)
      .select()
      .maybeSingle();

    if (updateError) throw new Error(updateError.message || 'Update failed');
    if (updated) return mapDbReport(updated as DbWorkReportRow);

    // updated === null → boshqa joyda shu orada saqlangan, yangi holat bilan qayta urinamiz
    if (attempt < MAX_RETRIES - 1) await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
  }
  throw new Error('updateReportEntries: bir necha marta urinildi, saqlab bo\'lmadi');
}

// Incidents

function mapDbIncident(row: DbIncidentRow): Incident {
  return {
    id: row.id,
    month: row.month,
    content: row.content,
    createdAt: row.created_at,
    createdByName: row.created_by_name,
    severity: (row.severity as IncidentSeverity | null) ?? null,
  };
}

/**
 * Eng oxirgi hodisalar. Default limit 100 — dispatcher va worker
 * sahifalari uchun yetarli; eskilari getIncidentsByMonth orqali olinadi.
 */
export async function getIncidents(limit = 100): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select(INCIDENT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as DbIncidentRow[]).map(mapDbIncident);
}

export async function getIncidentsByMonth(month: string): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select(INCIDENT_COLUMNS)
    .eq('month', month)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbIncidentRow[]).map(mapDbIncident);
}

export async function addIncident(month: string, content: string, createdByName: string, severity: IncidentSeverity): Promise<Incident> {
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      month,
      content,
      created_by_name: createdByName,
      severity,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Insert failed');
  return mapDbIncident(data as DbIncidentRow);
}

export async function updateIncidentSeverity(id: string, severity: IncidentSeverity): Promise<Incident> {
  const { data, error } = await supabase
    .from('incidents')
    .update({ severity })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Update failed');
  return mapDbIncident(data as DbIncidentRow);
}

export async function deleteIncident(id: string): Promise<void> {
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
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

// ── OPTIMISTIC LOCKING BAZASI ─────────────────────────────────────────
// Har bir jurnal oxirgi marta qachon yuklanganini (updated_at) eslab qolamiz.
// Saqlashda shu qiymat serverga yuboriladi: agar server versiyasi boshqa
// bo'lsa — konflikt aniqlanadi va yozuvlar merge qilinadi (yo'qolmaydi).
const _journalBaseUpdatedAt = new Map<string, string | null>()

function journalKey(stationId: string, journalType: JournalType): string {
  return `${stationId}:${journalType}`
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

  if (!data) {
    // Qator hali yo'q — saqlashda INSERT bo'ladi
    _journalBaseUpdatedAt.set(journalKey(stationId, journalType), null)
    return null
  }

  // Optimistic locking uchun bazani eslab qolamiz
  _journalBaseUpdatedAt.set(journalKey(stationId, journalType), data.updated_at)

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

  // 1-yo'l: RPC — hisob serverda bajariladi, jurnalning to'liq entries massivi
  // klientga tortilmaydi (payload: butun jurnal → 2 ta raqam).
  // RPC hali yaratilmagan bo'lsa (migratsiya ishga tushirilmagan), xato qaytadi
  // va pastdagi eski client-side hisobga o'tamiz — funksionallik buzilmaydi.
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_worker_pending_counts', {
      p_station_id: stationId,
      p_role: role,
      p_position: position || null,
    })
    if (!rpcError && rpcData && rpcData.length > 0) {
      const row = rpcData[0] as { du46_count: number; shu2_count: number }
      const result = { du46: row.du46_count || 0, shu2: row.shu2_count || 0 }
      _pendingJournalCache.set(cacheKey, { data: result, ts: Date.now() })
      return result
    }
  } catch { /* RPC yo'q — fallback davom etadi */ }

  // 2-yo'l (fallback): eski client-side hisob
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
              // Bekat boshlig'i ham bekat navbatchisi tomonidan tasdiqlanadi
              if (!e.kamchilikBBTasdiqladi) return 'DSP'
              return null
            } else {
              const creatorRole = getCreator(e)
              const col3Participants = new Set<string>()

              // Bekat boshlig'i ham zanjirga qo'shiladi
              col3Participants.add(creatorRole)
              chain.forEach(r => col3Participants.add(r))

              const writerRole = e.bartarafByRole || getCreator(e)
              const requiredChainFor12 = Array.from(col3Participants).filter(r => r !== writerRole)

              const nextRequiredRole = requiredChainFor12.find(r => !approvals.some(a => {
                if (r === 'worker' && ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik'].includes(a.role)) return true
                return a.role === r
              }))

              if (nextRequiredRole) return nextRequiredRole
              // Faqat bekat_navbatchisi o'zi Tugadi bossa, qayta tasdiqlamaydi
              const writerRoleVal = e.bartarafByRole || getCreator(e)
              if (writerRoleVal !== 'bekat_navbatchisi' && !e.bartarafBBTasdiqladi) return 'DSP'
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
                  const workerRoles = ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik']
                  if (workerRoles.includes(writerRole)) {
                    workerRoles.forEach(wr => col3Participants.delete(wr))
                  } else {
                    col3Participants.delete(writerRole)
                  }

                  if (col3Participants.has(userRoleToCheck) || (['elektromexanik', 'elektromontyor', 'katta_elektromexanik'].includes(userRoleToCheck) && col3Participants.has('worker'))) {
                    isParticipant = true
                  }
                }

                // Agar ro'yxatda bo'lsa va hali tasdiqlamagan bo'lsa:
                if (isParticipant) {
                  if (!approvals.some(a => {
                    if (userRoleToCheck === a.role) return true
                    const workerRoles = ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik']
                    if (workerRoles.includes(userRoleToCheck) && workerRoles.includes(a.role)) return true
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
  const { serverSaveJournal } = await import('@/app/actions/journal-actions')

  const key = journalKey(stationId, journalType)
  // Jurnal oxirgi yuklanganda ko'rilgan versiya (yo'q bo'lsa null → INSERT)
  const baseUpdatedAt = _journalBaseUpdatedAt.get(key) ?? null

  const result = await serverSaveJournal(
    stationId,
    journalType,
    entries as unknown as Record<string, unknown>[],
    updatedBy,
    baseUpdatedAt
  )

  // Saqlashdan keyin baza yangi versiyaga ko'chadi
  _journalBaseUpdatedAt.set(key, result.updated_at)

  return mapDbJournal({
    id: result.id,
    station_id: result.station_id,
    journal_type: result.journal_type,
    entries: result.entries,
    updated_at: result.updated_at,
    updated_by: result.updated_by,
  } as unknown as DbJournalRow)
}

/**
 * Vazifaga bog'liq barcha qurilmalar skaner qilib bo'lingach, ishchi SHU-2
 * jurnalini hali qo'lda to'ldirmagan bo'lsa — shu funksiya avtomatik
 * to'ldirib, darhol tasdiqlaydi (xuddi ishchi o'zi "Bajarildi" bosgandek).
 * Agar xuddi shu matn+sana bilan yozuv allaqachon bo'lsa (masalan qayta
 * chaqirilib qolsa), dublikat yaratilmaydi.
 */
export async function autoFillShu2Entry(
  stationId: string,
  journalMonth: string,
  taskText: string,
  dateFormatted: string,
  workerName: string
): Promise<void> {
  const journal = await getJournal(stationId, 'shu2');
  const allEntries = ((journal?.entries as SHU2Entry[]) || []);
  const monthEntries = allEntries.filter(e => e.journalMonth === journalMonth);
  const otherMonths = allEntries.filter(e => e.journalMonth !== journalMonth);

  const alreadyExists = monthEntries.some(e => e.sana === dateFormatted && e.yozuv === taskText);
  if (alreadyExists) return;

  const emptyIndex = monthEntries.findIndex(e => !e.sana && !e.yozuv && !e.tasdiqlandi && !e.yuborildi);

  const filledRow: SHU2Entry = {
    nomber: String((emptyIndex !== -1 ? emptyIndex : monthEntries.length) + 1),
    sana: dateFormatted,
    yozuv: taskText,
    imzo: workerName,
    tasdiqlandi: true,
    tasdiqlaganImzo: workerName,
    yuborildi: true,
    dispetcherQabulQildi: true,
    journalMonth,
  };

  const updatedMonthEntries = [...monthEntries];
  if (emptyIndex !== -1) {
    updatedMonthEntries[emptyIndex] = { ...updatedMonthEntries[emptyIndex], ...filledRow };
  } else {
    updatedMonthEntries.push(filledRow);
  }

  await upsertJournal(stationId, 'shu2', [...otherMonths, ...updatedMonthEntries], workerName);
}

// ── DISPETCHER UCHUN YENGIL FUNKSIYALAR ──────────────────────────────

/** Faqat DU-46 va SHU-2 pending countlarini qaytaradi (entries matnisiz) */
export async function getDispatcherJournalSummary(): Promise<Record<string, { du46: number; shu2: number }>> {
  const summary: Record<string, { du46: number; shu2: number }> = {}

  // 1. RPC orqali hisoblash (ma'lumotlar bazasida, network payload ni kamaytirish uchun)
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_dispatcher_journal_summary')

  if (!rpcError && rpcData) {
    for (const row of rpcData as Array<{ station_id: string; journal_type: string; pending_count: number }>) {
      const sid = row.station_id
      if (!summary[sid]) summary[sid] = { du46: 0, shu2: 0 }

      if (row.journal_type === 'du46') {
        summary[sid].du46 += row.pending_count || 0
      } else {
        summary[sid].shu2 += row.pending_count || 0
      }
    }
    return summary
  }

  // 2. Agar RPC topilmasa (hali yaratilmagan bo'lsa), eski usulda client-side hisoblash (Fallback)
  const { data, error } = await supabase
    .from('station_journals')
    .select('station_id, journal_type, entries')
    .in('journal_type', ['du46', 'shu2'])

  if (error) {
    return {}
  }

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
import { EquipmentCategory, StationEquipments, QRScanRecord } from '@/types';
import { buildEquipmentQrValue, stringToUuid } from '@/lib/utils/qr';

// ==========================================
// QR Skaner (Task Scans)
// ==========================================

export interface TaskScan {
  id: string;
  station_id: string;
  task_nsh: string;
  task_date: string; // YYYY-MM-DD
  equipment_id: string;
  equipment_name: string;
  scanned_by: string;
  scanned_at: string;
}

export async function getTaskScans(stationId: string, taskNsh: string, taskDate: string): Promise<TaskScan[]> {
  // `task_date` ustuni bazada haqiqiy `date` turida (vaqt/vaqt mintaqasiz sof sana) —
  // shuning uchun aniq (`.eq`) qidirish ishonchli. `scanned_at` (haqiqiy skaner vaqti)
  // bo'yicha filtrlash XATO edi: `task_date` — yozuv tegishli bo'lgan REJA kuni (masalan,
  // ishchi "Kunlik" ko'rinishida ertangi/o'tgan kunning vazifasini bugun bajarishi mumkin),
  // `scanned_at` esa HAQIQIY skaner vaqti — ular boshqa-boshqa kalendar kuniga tushib qolishi
  // mumkin, natijada baza yozuvi bor bo'lsa ham skaner "topilmagan" bo'lib qolar edi.
  const { data, error } = await supabase
    .from('task_scans')
    .select('*')
    .eq('station_id', stringToUuid(stationId))
    .eq('task_nsh', taskNsh)
    .eq('task_date', taskDate);

  if (error) {
    console.error('getTaskScans error:', error);
    return [];
  }
  return data as TaskScan[];
}

export async function insertTaskScan(scan: Omit<TaskScan, 'id' | 'scanned_at'>): Promise<TaskScan> {
  const { data, error } = await supabase
    .from('task_scans')
    .insert({
      station_id: stringToUuid(scan.station_id),
      task_nsh: scan.task_nsh,
      task_date: scan.task_date,
      equipment_id: scan.equipment_id,
      equipment_name: scan.equipment_name,
      scanned_by: scan.scanned_by,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as TaskScan;
}

// Bekat bo'yicha barcha skaner tarixi (kim, qachon, qaysi vazifa uchun skaner qilgani) — arxiv ko'rinishi uchun
export async function getStationTaskScans(stationId: string, limit = 300): Promise<TaskScan[]> {
  const { data, error } = await supabase
    .from('task_scans')
    .select('id, equipment_name, scanned_at, scanned_by, task_nsh')
    .eq('station_id', stringToUuid(stationId))
    .order('scanned_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getStationTaskScans error:', error);
    return [];
  }
  return data as TaskScan[];
}


function mapEquipmentsRow(stationId: string, row: { entries: unknown; updated_at: string; updated_by: string | null }): StationEquipments {
  const entries = row.entries as any[];
  const taskMappings = entries.find(e => e.type === 'taskMappings')?.items || [];

  let categories: EquipmentCategory[] = [];
  const categoriesEntry = entries.find(e => e.type === 'categories');
  if (categoriesEntry) {
    categories = categoriesEntry.data;
  } else {
    // Migration for older formats
    categories = [
      { id: 'strelkalar', name: "Strelkali o'tkazgichlar", color: 'blue', items: entries.find(e => e.type === 'strelkalar')?.items || [] },
      { id: 'machtali', name: "Machtali svetoforlar", color: 'emerald', items: entries.find(e => e.type === 'machtali')?.items || [] },
      { id: 'pakana', name: "Pakana svetoforlar", color: 'orange', items: entries.find(e => e.type === 'pakana')?.items || [] },
    ];
  }

  return {
    stationId,
    categories,
    taskMappings,
    updatedAt: row.updated_at,
    updatedByName: row.updated_by || 'Tizim'
  };
}

export async function getStationEquipments(stationId: string): Promise<StationEquipments | null> {
  const { data, error } = await supabase
    .from('station_journals')
    .select('entries, updated_at, updated_by')
    .eq('station_id', stationId + '_equipments')
    .eq('journal_type', 'shu2')
    .maybeSingle();

  // MUHIM: fetch XATOSI va "ma'lumot umuman yo'q" ni ajratamiz.
  // Xatoni null qaytarish orqali yashirsak, chaqiruvchi buni "yozuv yo'q"
  // deb qabul qilib, bo'sh nusxani mavjud ma'lumot ustidan saqlab yuborishi
  // mumkin (2026-07-07 hodisasining ildizi). Xato bo'lsa — throw qilamiz.
  if (error) {
    throw new Error(error.message || 'Bekat uskunalarini yuklab bo\'lmadi');
  }
  if (!data) return null; // Haqiqatan hali yaratilmagan — INSERT bo'ladi
  return mapEquipmentsRow(stationId, data);
}

export async function upsertStationEquipments(
  stationId: string,
  categories: EquipmentCategory[],
  taskMappings: any[],
  updatedByName: string,
  expectedUpdatedAt?: string | null
): Promise<StationEquipments> {

  const entries = [
    { type: 'categories', data: categories },
    { type: 'taskMappings', items: taskMappings }
  ];

  const { data: existing } = await supabase
    .from('station_journals')
    .select('id, updated_at')
    .eq('station_id', stationId + '_equipments')
    .eq('journal_type', 'shu2')
    .maybeSingle();

  if (existing) {
    // Optimistik lock: mavjud qatorni yangilash uchun chaqiruvchi uni oxirgi
    // ko'rgan updated_at'ni BERISHI SHART va u bazadagiga MOS kelishi kerak.
    //  - expectedUpdatedAt null/undefined  → qator yuklanmagan (fetch xato bergan
    //    yoki umuman o'qilmagan). Bunday holda saqlash bo'sh nusxani ustidan
    //    yozib yuborishi mumkin — RAD ETAMIZ (2026-07-07 hodisasining ildizi).
    //  - mos kelmasa → biz yuklaganimizdan beri boshqa kimdir saqlagan → RAD.
    if (!expectedUpdatedAt || existing.updated_at !== expectedUpdatedAt) {
      throw new Error('CONFLICT: Bu bekat uskunalari yangilangan yoki to\'liq yuklanmagan. Sahifani yangilab, o\'zgarishingizni qayta kiriting.');
    }

    const { data: resultData, error: resultError } = await supabase
      .from('station_journals')
      .update({ entries, updated_at: new Date().toISOString(), updated_by: updatedByName })
      .eq('id', existing.id)
      .select('entries, updated_at, updated_by')
      .single();

    if (resultError || !resultData) {
      throw new Error(resultError?.message || 'Bekat uskunalarini saqlab bo\'lmadi');
    }
    return mapEquipmentsRow(stationId, resultData);
  }

  const { data: resultData, error: resultError } = await supabase
    .from('station_journals')
    .insert({
      station_id: stationId + '_equipments',
      journal_type: 'shu2',
      entries,
      updated_at: new Date().toISOString(),
      updated_by: updatedByName
    })
    .select('entries, updated_at, updated_by')
    .single();

  if (resultError || !resultData) {
    throw new Error(resultError?.message || 'Bekat uskunalarini saqlab bo\'lmadi');
  }

  return mapEquipmentsRow(stationId, resultData);
}

export async function updateEquipmentScanHistory(
  stationId: string,
  scans: QRScanRecord[],
  updatedByName: string
): Promise<StationEquipments | null> {
  const equipments = await getStationEquipments(stationId);
  if (!equipments) return null;

  let hasChanges = false;
  const newCategories = equipments.categories.map(cat => {
    const newItems = cat.items.map(item => {
      const expectedQr = buildEquipmentQrValue(stationId, item.id);
      const matchScan = scans.find(s => s.equipmentId === expectedQr);
      if (matchScan) {
        hasChanges = true;
        return {
          ...item,
          lastScannedAt: matchScan.scannedAt,
          lastScannedBy: matchScan.scannedBy
        };
      }
      return item;
    });
    return { ...cat, items: newItems };
  });

  if (!hasChanges) return equipments;

  return upsertStationEquipments(stationId, newCategories, equipments.taskMappings || [], updatedByName, equipments.updatedAt);
}
