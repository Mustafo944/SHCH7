/* ═══════════════════════════════════════════════════════════════════════════════
   TDMS (Texnik Hujjatlarni Boshqarish Tizimi) — Supabase DB funksiyalari
   ═══════════════════════════════════════════════════════════════════════════════ */

import { supabase } from './supabase'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Bitta texnik hujjat (sxema) */
export interface TdmsDocument {
  id: string
  station_id: string
  station_name: string
  /** Hujjat nomi (masalan: "EChK sxemasi", "SP diagrammasi") */
  name: string
  /** Google Drive (yoki boshqa) havola */
  drive_url: string
  /** Hujjat versiyasi (V1, V2 ...) */
  version: string
  /** Hujjat toifasi (masalan: EChK, SP, AB, PONAB) */
  category: string
  /** Oxirgi yangilangan sana */
  updated_at: string
  /** Kim tomonidan yuklangan */
  uploaded_by: string
  created_at: string
}

/** Tekshiruv (Audit) yozuvi */
export interface TdmsAudit {
  id: string
  document_id: string
  station_id: string
  station_name: string
  /** Tekshiruv toifasi (cat1 dan cat4 gacha) */
  audit_type: 'cat1' | 'cat2' | 'cat3' | 'cat4'
  /** Kim tasdiqladi */
  auditor_name: string
  /** Tasdiqlagan odamning lavozimi */
  auditor_role: string
  /** Izoh (ixtiyoriy) */
  note: string
  /** Tekshiruv sanasi */
  audited_at: string
  created_at: string
}

/** Grafik — qaysi bekat qaysi oyda tekshirilishi kerak */
export interface TdmsSchedule {
  id: string
  station_id: string
  station_name: string
  /** Tekshiruv yili (masalan: 2026) */
  year: number
  /** Tekshiruv oyi (1-12) */
  month: number
  /** Tekshiruv toifasi (cat1 dan cat4 gacha) */
  audit_type: 'cat1' | 'cat2' | 'cat3' | 'cat4'
  /** Bajarildi yoki yo'q */
  completed: boolean
  /** Kim bajarganini ko'rsatuvchi audit ID */
  completed_audit_id?: string
  created_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// DB ROW TYPES (Supabase snake_case)
// ═══════════════════════════════════════════════════════════════════════════════

interface DbTdmsDocumentRow {
  id: string
  station_id: string
  station_name: string
  name: string
  drive_url: string
  version: string
  category: string
  updated_at: string
  uploaded_by: string
  created_at: string
}

interface DbTdmsAuditRow {
  id: string
  document_id: string
  station_id: string
  station_name: string
  audit_type: string
  auditor_name: string
  auditor_role: string
  note: string
  audited_at: string
  created_at: string
}

interface DbTdmsScheduleRow {
  id: string
  station_id: string
  station_name: string
  year: number
  month: number
  audit_type: string
  completed: boolean
  completed_audit_id: string | null
  created_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPERS
// ═══════════════════════════════════════════════════════════════════════════════

function mapDocument(row: DbTdmsDocumentRow): TdmsDocument {
  return {
    id: row.id,
    station_id: row.station_id,
    station_name: row.station_name,
    name: row.name,
    drive_url: row.drive_url,
    version: row.version,
    category: row.category,
    updated_at: row.updated_at,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  }
}

function mapAudit(row: DbTdmsAuditRow): TdmsAudit {
  return {
    id: row.id,
    document_id: row.document_id,
    station_id: row.station_id,
    station_name: row.station_name,
    audit_type: row.audit_type as TdmsAudit['audit_type'],
    auditor_name: row.auditor_name,
    auditor_role: row.auditor_role,
    note: row.note || '',
    audited_at: row.audited_at,
    created_at: row.created_at,
  }
}

function mapSchedule(row: DbTdmsScheduleRow): TdmsSchedule {
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

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/** Barcha hujjatlarni olish */
export async function getTdmsDocuments(): Promise<TdmsDocument[]> {
  const { data, error } = await supabase
    .from('tdms_documents')
    .select('*')
    .order('station_name', { ascending: true })
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(`Hujjatlarni yuklashda xato: ${error.message}`)
  return (data || []).map(mapDocument)
}

/** Bekat bo'yicha hujjatlarni olish */
export async function getTdmsDocumentsByStation(stationId: string): Promise<TdmsDocument[]> {
  const { data, error } = await supabase
    .from('tdms_documents')
    .select('*')
    .eq('station_id', stationId)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(`Bekat hujjatlarini yuklashda xato: ${error.message}`)
  return (data || []).map(mapDocument)
}

/** Bekat nomi bo'yicha hujjatlarni olish (ishchi/dispetcher sahifalari uchun) */
export async function getTdmsDocumentsByStationName(stationName: string): Promise<TdmsDocument[]> {
  const { data, error } = await supabase
    .from('tdms_documents')
    .select('*')
    .eq('station_name', stationName)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(`Bekat hujjatlarini yuklashda xato: ${error.message}`)
  return (data || []).map(mapDocument)
}

/** Yangi hujjat qo'shish */
export async function addTdmsDocument(doc: Omit<TdmsDocument, 'id' | 'created_at'>): Promise<TdmsDocument> {
  const { data, error } = await supabase
    .from('tdms_documents')
    .insert({
      station_id: doc.station_id,
      station_name: doc.station_name,
      name: doc.name,
      drive_url: doc.drive_url,
      version: doc.version,
      category: doc.category,
      updated_at: doc.updated_at,
      uploaded_by: doc.uploaded_by,
    })
    .select()
    .single()

  if (error) throw new Error(`Hujjat qo'shishda xato: ${error.message}`)
  return mapDocument(data)
}

/** Hujjatni yangilash */
export async function updateTdmsDocument(id: string, updates: Partial<Pick<TdmsDocument, 'name' | 'drive_url' | 'version' | 'category' | 'updated_at' | 'uploaded_by'>>): Promise<void> {
  const { error } = await supabase
    .from('tdms_documents')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(`Hujjatni yangilashda xato: ${error.message}`)
}

/** Hujjatni o'chirish */
export async function deleteTdmsDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('tdms_documents')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Hujjatni o'chirishda xato: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDITS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/** Barcha tekshiruvlarni olish */
export async function getTdmsAudits(): Promise<TdmsAudit[]> {
  const { data, error } = await supabase
    .from('tdms_audits')
    .select('*')
    .order('audited_at', { ascending: false })

  if (error) throw new Error(`Tekshiruvlarni yuklashda xato: ${error.message}`)
  return (data || []).map(mapAudit)
}

/** Bekat bo'yicha tekshiruvlarni olish */
export async function getTdmsAuditsByStation(stationId: string): Promise<TdmsAudit[]> {
  const { data, error } = await supabase
    .from('tdms_audits')
    .select('*')
    .eq('station_id', stationId)
    .order('audited_at', { ascending: false })

  if (error) throw new Error(`Bekat tekshiruvlarini yuklashda xato: ${error.message}`)
  return (data || []).map(mapAudit)
}

/** Yangi tekshiruv yozuvini qo'shish (Tasdiqlash) */
export async function addTdmsAudit(audit: Omit<TdmsAudit, 'id' | 'created_at'>): Promise<TdmsAudit> {
  const { data, error } = await supabase
    .from('tdms_audits')
    .insert({
      document_id: audit.document_id,
      station_id: audit.station_id,
      station_name: audit.station_name,
      audit_type: audit.audit_type,
      auditor_name: audit.auditor_name,
      auditor_role: audit.auditor_role,
      note: audit.note || '',
      audited_at: audit.audited_at,
    })
    .select()
    .single()

  if (error) throw new Error(`Tekshiruv yozuvini qo'shishda xato: ${error.message}`)
  return mapAudit(data)
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULES CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/** Barcha grafiklarni olish */
export async function getTdmsSchedules(year?: number): Promise<TdmsSchedule[]> {
  let query = supabase
    .from('tdms_schedules')
    .select('*')
    .order('month', { ascending: true })
    .order('station_name', { ascending: true })

  if (year) {
    query = query.eq('year', year)
  }

  const { data, error } = await query
  if (error) throw new Error(`Grafiklarni yuklashda xato: ${error.message}`)
  console.log('getTdmsSchedules RETURN:', data?.length, 'rows'); return (data || []).map(mapSchedule)
}

/** Yangi grafik yozuvi qo'shish */
export async function addTdmsSchedule(schedule: Omit<TdmsSchedule, 'id' | 'created_at' | 'completed' | 'completed_audit_id'>): Promise<TdmsSchedule> {
  const { data, error } = await supabase
    .from('tdms_schedules')
    .insert({
      station_id: schedule.station_id,
      station_name: schedule.station_name,
      year: schedule.year,
      month: schedule.month,
      audit_type: schedule.audit_type,
      completed: false,
    })
    .select()
    .single()

  if (error) throw new Error(`Grafik qo'shishda xato: ${error.message}`)
  return mapSchedule(data)
}

/** Grafik yozuvini "Bajarildi" deb belgilash */
export async function completeTdmsSchedule(scheduleId: string, auditId: string): Promise<void> {
  const { error } = await supabase
    .from('tdms_schedules')
    .update({ completed: true, completed_audit_id: auditId })
    .eq('id', scheduleId)

  if (error) throw new Error(`Grafikni yangilashda xato: ${error.message}`)
}

/** Grafik yozuvini o'chirish */
export async function deleteTdmsSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from('tdms_schedules')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Grafikni o'chirishda xato: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES (VARAQLAR) — Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Bitta varaq (sxemaning bir sahifasi, alohida PDF) */
export interface TdmsPage {
  id: string
  document_id: string
  page_number: number
  name: string
  drive_url: string
  version: string
  uploaded_by: string
  updated_at: string
  created_at: string
}

/** Varaq versiyasi (eski sxema arxivi) */
export interface TdmsPageVersion {
  id: string
  page_id: string
  version: string
  drive_url: string
  uploaded_by: string
  replaced_at: string
}

/** Varaq tekshiruvi (kim qachon tekshirdi) */
export interface TdmsPageCheck {
  id: string
  page_id: string
  checked_by: string
  checked_role: string
  checked_at: string
  check_type: 'shn_yearly' | 'engineer_3_year' | 'general'
  status: 'matches' | 'mismatch' | 'approved'
  comment?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES — DB Row Types
// ═══════════════════════════════════════════════════════════════════════════════

interface DbTdmsPageRow {
  id: string
  document_id: string
  page_number: number
  name: string
  drive_url: string
  version: string
  uploaded_by: string
  updated_at: string
  created_at: string
}

interface DbTdmsPageVersionRow {
  id: string
  page_id: string
  version: string
  drive_url: string
  uploaded_by: string
  replaced_at: string
}

interface DbTdmsPageCheckRow {
  id: string
  page_id: string
  checked_by: string
  checked_role: string
  checked_at: string
  check_type: 'shn_yearly' | 'engineer_3_year' | 'general'
  status: 'matches' | 'mismatch' | 'approved'
  comment?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES — Mappers
// ═══════════════════════════════════════════════════════════════════════════════

function mapPage(row: DbTdmsPageRow): TdmsPage {
  return {
    id: row.id,
    document_id: row.document_id,
    page_number: row.page_number,
    name: row.name || '',
    drive_url: row.drive_url,
    version: row.version,
    uploaded_by: row.uploaded_by,
    updated_at: row.updated_at,
    created_at: row.created_at,
  }
}

function mapPageVersion(row: DbTdmsPageVersionRow): TdmsPageVersion {
  return {
    id: row.id,
    page_id: row.page_id,
    version: row.version,
    drive_url: row.drive_url,
    uploaded_by: row.uploaded_by,
    replaced_at: row.replaced_at,
  }
}

function mapPageCheck(row: DbTdmsPageCheckRow): TdmsPageCheck {
  return {
    id: row.id,
    page_id: row.page_id,
    checked_by: row.checked_by,
    checked_role: row.checked_role || '',
    checked_at: row.checked_at,
    check_type: row.check_type || 'general',
    status: row.status || 'approved',
    comment: row.comment,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/** Bitta sxemaning barcha varaqlari */
export async function getTdmsPages(documentId: string): Promise<TdmsPage[]> {
  const { data, error } = await supabase
    .from('tdms_pages')
    .select('*')
    .eq('document_id', documentId)
    .order('page_number', { ascending: true })

  if (error) throw new Error(`Varaqlarni yuklashda xato: ${error.message}`)
  return (data || []).map(mapPage)
}

export async function uploadTdmsPageFile(documentId: string, pageNumber: number, file: File): Promise<string> {
  // Generate a unique filename: docId_pageNum_timestamp.ext
  const fileExt = file.name.split('.').pop() || 'pdf'
  const fileName = `${documentId}_${pageNumber}_${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('tdms_pages')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    throw new Error("Faylni yuklashda xatolik: " + uploadError.message)
  }

  const { data } = supabase.storage.from('tdms_pages').getPublicUrl(fileName)
  return data.publicUrl
}

/** Yangi varaq qo'shish */
export async function addTdmsPage(page: Omit<TdmsPage, 'id' | 'created_at' | 'updated_at'>): Promise<TdmsPage> {
  const { data, error } = await supabase
    .from('tdms_pages')
    .insert({
      document_id: page.document_id,
      page_number: page.page_number,
      name: page.name,
      drive_url: page.drive_url,
      version: page.version || 'V1',
      uploaded_by: page.uploaded_by,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Varaq qo'shishda xato: ${error.message}`)
  return mapPage(data)
}

/** Varaqni almashtirish (eski versiyani arxivlaydi) */
export async function replaceTdmsPage(
  pageId: string,
  newDriveUrl: string,
  uploadedBy: string
): Promise<TdmsPage> {
  // 1. Eski varaqni olish
  const { data: oldPage, error: fetchErr } = await supabase
    .from('tdms_pages')
    .select('*')
    .eq('id', pageId)
    .single()

  if (fetchErr || !oldPage) throw new Error(`Varaqni topishda xato: ${fetchErr?.message}`)

  // 2. Eski versiyani arxivga saqlash
  const { error: archiveErr } = await supabase
    .from('tdms_page_versions')
    .insert({
      page_id: oldPage.id,
      version: oldPage.version,
      drive_url: oldPage.drive_url,
      uploaded_by: oldPage.uploaded_by,
      replaced_at: new Date().toISOString(),
    })

  if (archiveErr) throw new Error(`Eski versiyani saqlashda xato: ${archiveErr.message}`)

  // 3. Varaqni yangi URL va versiya bilan yangilash
  const currentVersionNum = parseInt(oldPage.version?.replace('V', '') || '1', 10)
  const newVersion = `V${currentVersionNum + 1}`

  const { data: updated, error: updateErr } = await supabase
    .from('tdms_pages')
    .update({
      drive_url: newDriveUrl,
      version: newVersion,
      uploaded_by: uploadedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pageId)
    .select()
    .single()

  if (updateErr) throw new Error(`Varaqni yangilashda xato: ${updateErr.message}`)

  // 4. Bu varaq uchun barcha tekshiruv belgilarini tozalash (yangi versiya — qaytadan tekshirish kerak)
  await supabase
    .from('tdms_page_checks')
    .delete()
    .eq('page_id', pageId)

  return mapPage(updated)
}

/** Varaqni o'chirish */
export async function deleteTdmsPage(id: string): Promise<void> {
  const { error } = await supabase
    .from('tdms_pages')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Varaqni o'chirishda xato: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE VERSIONS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/** Bitta varaqning barcha eski versiyalari */
export async function getTdmsPageVersions(pageId: string): Promise<TdmsPageVersion[]> {
  const { data, error } = await supabase
    .from('tdms_page_versions')
    .select('*')
    .eq('page_id', pageId)
    .order('replaced_at', { ascending: false })

  if (error) throw new Error(`Versiyalarni yuklashda xato: ${error.message}`)
  return (data || []).map(mapPageVersion)
}

/** Eski versiyani o'chirish */
export async function deleteTdmsPageVersion(versionId: string): Promise<void> {
  const { error } = await supabase
    .from('tdms_page_versions')
    .delete()
    .eq('id', versionId)

  if (error) throw new Error(`Versiyani o'chirishda xato: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE CHECKS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/** Bitta sxemaning barcha varaqlari uchun tekshiruv yozuvlari */
export async function getTdmsPageChecks(documentId: string): Promise<TdmsPageCheck[]> {
  // Avval shu documentga tegishli barcha page id larni olamiz
  const { data: pages, error: pagesErr } = await supabase
    .from('tdms_pages')
    .select('id')
    .eq('document_id', documentId)

  if (pagesErr) throw new Error(`Varaqlarni yuklashda xato: ${pagesErr.message}`)
  if (!pages || pages.length === 0) return []

  const pageIds = pages.map(p => p.id)

  const { data, error } = await supabase
    .from('tdms_page_checks')
    .select('*')
    .in('page_id', pageIds)
    .order('checked_at', { ascending: false })

  if (error) throw new Error(`Tekshiruvlarni yuklashda xato: ${error.message}`)
  return (data || []).map(mapPageCheck)
}

/** Bitta varaqning tekshiruvlarini olish */
export async function getTdmsPageChecksByPage(pageId: string): Promise<TdmsPageCheck[]> {
  const { data, error } = await supabase
    .from('tdms_page_checks')
    .select('*')
    .eq('page_id', pageId)
    .order('checked_at', { ascending: false })

  if (error) throw new Error(`Tekshiruvlarni yuklashda xato: ${error.message}`)
  return (data || []).map(mapPageCheck)
}

/** Varaqni tekshirildi deb belgilash */
export async function checkTdmsPage(
  pageId: string,
  checkedBy: string,
  checkedRole: string,
  checkType: 'shn_yearly' | 'engineer_3_year' | 'general' = 'general',
  status: 'matches' | 'mismatch' | 'approved' = 'approved',
  comment?: string
): Promise<TdmsPageCheck> {
  const { data, error } = await supabase
    .from('tdms_page_checks')
    .insert({
      page_id: pageId,
      checked_by: checkedBy,
      checked_role: checkedRole,
      checked_at: new Date().toISOString(),
      check_type: checkType,
      status: status,
      comment: comment
    })
    .select()
    .single()

  if (error) throw new Error(`Tekshiruvni belgilashda xato: ${error.message}`)
  return mapPageCheck(data)
}

/** Tekshiruvni bekor qilish */
export async function uncheckTdmsPage(pageId: string, checkedBy: string): Promise<void> {
  const { error } = await supabase
    .from('tdms_page_checks')
    .delete()
    .eq('page_id', pageId)
    .eq('checked_by', checkedBy)

  if (error) throw new Error(`Tekshiruvni bekor qilishda xato: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MISMATCH REPORTS (Dashboard uchun — mos kelmaydigan varaqlar ro'yxati)
// ═══════════════════════════════════════════════════════════════════════════════

/** Boshqaruv panelida ko'rsatiladigan "mos kelmaydi" hisoboti */
export interface TdmsMismatchReport {
  checkId: string
  pageId: string
  pageName: string
  pageNumber: number
  documentId: string
  documentName: string
  stationName: string
  checkedBy: string
  checkedRole: string
  checkedAt: string
  comment: string
}

/** Barcha "mos kelmaydi" deb belgilangan varaqlarni olib beradi (bekat/hujjat/varaq ma'lumotlari bilan) */
export async function getTdmsMismatchReports(): Promise<TdmsMismatchReport[]> {
  // page_checks → pages → documents zanjiri orqali bitta so'rov
  const { data: checks, error: checksErr } = await supabase
    .from('tdms_page_checks')
    .select('*')
    .eq('status', 'mismatch')
    .order('checked_at', { ascending: false })

  if (checksErr) throw new Error(`Mismatch tekshiruvlarni yuklashda xato: ${checksErr.message}`)
  if (!checks || checks.length === 0) return []

  // Tegishli page va document ma'lumotlarini olish
  const pageIds = Array.from(new Set(checks.map(c => c.page_id)))
  const { data: pages, error: pagesErr } = await supabase
    .from('tdms_pages')
    .select('id, document_id, page_number, name')
    .in('id', pageIds)

  if (pagesErr) throw new Error(`Varaqlarni yuklashda xato: ${pagesErr.message}`)

  const docIds = Array.from(new Set((pages || []).map(p => p.document_id)))
  const { data: docs, error: docsErr } = await supabase
    .from('tdms_documents')
    .select('id, name, station_name')
    .in('id', docIds)

  if (docsErr) throw new Error(`Hujjatlarni yuklashda xato: ${docsErr.message}`)

  // Tez qidiruv uchun Map
  const pageMap = new Map((pages || []).map(p => [p.id, p]))
  const docMap = new Map((docs || []).map(d => [d.id, d]))

  return checks
    .map(c => {
      const page = pageMap.get(c.page_id)
      if (!page) return null
      const doc = docMap.get(page.document_id)
      if (!doc) return null

      return {
        checkId: c.id,
        pageId: c.page_id,
        pageName: page.name || `Varaq ${page.page_number}`,
        pageNumber: page.page_number,
        documentId: page.document_id,
        documentName: doc.name,
        stationName: doc.station_name,
        checkedBy: c.checked_by,
        checkedRole: c.checked_role || '',
        checkedAt: c.checked_at,
        comment: c.comment || '',
      } satisfies TdmsMismatchReport
    })
    .filter((r): r is TdmsMismatchReport => r !== null)
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECENT ACTIVITY (Dashboard uchun — oxirgi o'zgarishlar)
// ═══════════════════════════════════════════════════════════════════════════════

/** Boshqaruv panelida ko'rsatiladigan faoliyat yozuvi */
export interface TdmsActivityItem {
  id: string
  type: 'doc_added' | 'page_checked' | 'page_updated' | 'mismatch_found'
  title: string
  subtitle: string
  actor: string
  timestamp: string
}

/** Oxirgi 20 ta o'zgarishni olish (hujjat qo'shilishi, varaq tekshirilishi, versiya almashinishi) */
export async function getTdmsRecentActivity(): Promise<TdmsActivityItem[]> {
  const items: TdmsActivityItem[] = []

  // 1. Oxirgi qo'shilgan hujjatlar
  const { data: recentDocs } = await supabase
    .from('tdms_documents')
    .select('id, name, station_name, uploaded_by, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  ;(recentDocs || []).forEach(d => {
    items.push({
      id: `doc_${d.id}`,
      type: 'doc_added',
      title: d.name,
      subtitle: d.station_name,
      actor: d.uploaded_by,
      timestamp: d.created_at,
    })
  })

  // 2. Oxirgi tekshiruvlar (matches va mismatch)
  const { data: recentChecks } = await supabase
    .from('tdms_page_checks')
    .select('id, page_id, checked_by, checked_at, status, comment')
    .order('checked_at', { ascending: false })
    .limit(10)

  if (recentChecks && recentChecks.length > 0) {
    const checkPageIds = Array.from(new Set(recentChecks.map(c => c.page_id)))
    const { data: checkPages } = await supabase
      .from('tdms_pages')
      .select('id, document_id, page_number, name')
      .in('id', checkPageIds)

    const cpMap = new Map((checkPages || []).map(p => [p.id, p]))

    const checkDocIds = Array.from(new Set((checkPages || []).map(p => p.document_id)))
    const { data: checkDocs } = await supabase
      .from('tdms_documents')
      .select('id, name, station_name')
      .in('id', checkDocIds)

    const cdMap = new Map((checkDocs || []).map(d => [d.id, d]))

    recentChecks.forEach(c => {
      const page = cpMap.get(c.page_id)
      const doc = page ? cdMap.get(page.document_id) : null
      const isMismatch = c.status === 'mismatch'
      items.push({
        id: `check_${c.id}`,
        type: isMismatch ? 'mismatch_found' : 'page_checked',
        title: isMismatch
          ? `Mos kelmaydi: ${page?.name || `Varaq ${page?.page_number}`}`
          : `Tekshirildi: ${page?.name || `Varaq ${page?.page_number}`}`,
        subtitle: doc ? `${doc.station_name} • ${doc.name}` : '',
        actor: c.checked_by,
        timestamp: c.checked_at,
      })
    })
  }

  // 3. Oxirgi versiya almashtirilganlar
  const { data: recentVersions } = await supabase
    .from('tdms_page_versions')
    .select('id, page_id, version, uploaded_by, replaced_at')
    .order('replaced_at', { ascending: false })
    .limit(10)

  if (recentVersions && recentVersions.length > 0) {
    const vPageIds = Array.from(new Set(recentVersions.map(v => v.page_id)))
    const { data: vPages } = await supabase
      .from('tdms_pages')
      .select('id, document_id, page_number, name')
      .in('id', vPageIds)

    const vpMap = new Map((vPages || []).map(p => [p.id, p]))

    const vDocIds = Array.from(new Set((vPages || []).map(p => p.document_id)))
    const { data: vDocs } = await supabase
      .from('tdms_documents')
      .select('id, name, station_name')
      .in('id', vDocIds)

    const vdMap = new Map((vDocs || []).map(d => [d.id, d]))

    recentVersions.forEach(v => {
      const page = vpMap.get(v.page_id)
      const doc = page ? vdMap.get(page.document_id) : null
      items.push({
        id: `ver_${v.id}`,
        type: 'page_updated',
        title: `Yangilandi: ${page?.name || `Varaq ${page?.page_number}`} → ${v.version}`,
        subtitle: doc ? `${doc.station_name} • ${doc.name}` : '',
        actor: v.uploaded_by,
        timestamp: v.replaced_at,
      })
    })
  }

  // Vaqt bo'yicha saralash va eng oxirgi 100 tasini qaytarish
  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TDMS BEKATLAR (Faqat Texnik Hujjatlar uchun — boshqa sahifalarga ta'sir qilmaydi)
// ═══════════════════════════════════════════════════════════════════════════════

/** Texnik hujjatlar uchun bekat/oraliq */
export interface TdmsStation {
  id: string
  name: string
  /** 'bekat' yoki 'oraliq' */
  type: 'bekat' | 'oraliq'
  /** Jadvalda tartib raqami */
  sort_order: number
  created_at: string
}

/** Barcha TDMS bekatlarini olish (tartib bo'yicha) */
export async function getTdmsStations(): Promise<TdmsStation[]> {
  const { data, error } = await supabase
    .from('tdms_stations')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Bekatlarni yuklashda xato: ${error.message}`)
  return (data || []) as TdmsStation[]
}

/** Yangi bekat/oraliq qo'shish */
export async function addTdmsStation(
  name: string,
  type: 'bekat' | 'oraliq',
  afterSortOrder?: number
): Promise<TdmsStation> {
  // Agar afterSortOrder berilsa, shu tartibdan keyin qo'shish
  let newSortOrder: number

  if (afterSortOrder !== undefined) {
    // Keyingi elementlarni bitta pastga surish
    const { error: shiftError } = await supabase.rpc('tdms_shift_stations', {
      after_order: afterSortOrder
    })
    // RPC mavjud bo'lmasa oddiy usulda
    if (shiftError) {
      // Fallback: barcha sort_order > afterSortOrder larni +1 qilish
      const { data: later } = await supabase
        .from('tdms_stations')
        .select('id, sort_order')
        .gt('sort_order', afterSortOrder)
        .order('sort_order', { ascending: false })

      if (later) {
        for (const item of later) {
          await supabase
            .from('tdms_stations')
            .update({ sort_order: item.sort_order + 1 })
            .eq('id', item.id)
        }
      }
    }
    newSortOrder = afterSortOrder + 1
  } else {
    // Oxiriga qo'shish
    const { data: last } = await supabase
      .from('tdms_stations')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)

    newSortOrder = (last && last.length > 0) ? last[0].sort_order + 1 : 1
  }

  const { data, error } = await supabase
    .from('tdms_stations')
    .insert({ name, type, sort_order: newSortOrder })
    .select()
    .single()

  if (error) throw new Error(`Bekat qo'shishda xato: ${error.message}`)
  return data as TdmsStation
}

/** Bekat/oraliqni o'chirish (va unga biriktirilgan grafiklarni ham) */
export async function deleteTdmsStation(id: string): Promise<void> {
  // Avval bu stansiyaga biriktirilgan grafiklar va hujjatlarni o'chirish
  await supabase.from('tdms_schedules').delete().eq('station_id', id)

  const { error } = await supabase
    .from('tdms_stations')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Bekatni o'chirishda xato: ${error.message}`)
}

/** Bekat/oraliq nomini va turini o'zgartirish */
export async function updateTdmsStation(id: string, name: string, type: 'bekat' | 'oraliq'): Promise<void> {
  const { error } = await supabase
    .from('tdms_stations')
    .update({ name, type })
    .eq('id', id)

  if (error) throw new Error(`Bekatni o'zgartirishda xato: ${error.message}`)
}
