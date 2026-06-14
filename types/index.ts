// Rollar
export type Role = "dispatcher" | "worker" | "bekat_boshlighi" | "elektromexanik" | "elektromontyor" | "bekat_navbatchisi" | "yul_ustasi" | "ech_xodimi" | "mehnat_muhofazasi";

export type IncidentStatus = "open" | "resolved" | "read";

// Lavozimlar
export type Position = "katta_elektromexanik" | "bekat_boshlighi" | "dispatcher" | "elektromexanik" | "elektromontyor" | "bekat_navbatchisi" | "yul_ustasi" | "ech_xodimi" | "mehnat_muhofazasi";

// Foydalanuvchi
export interface User {
  id: string;
  login: string;
  fullName: string;
  role: Role;
  position: Position;
  stationIds: string[]; // worker: max 5, bekat_boshlighi: max 3, yul_ustasi/ech_xodimi/others: max 1
  phone: string;
  createdAt: string;
}

export interface Station {
  id: string;
  name: string;
}

export interface ReportEntry {
  ragat: string;
  haftalikJadval: string;
  yillikJadval: string;
  yangiIshlar: string;
  kmoBartaraf: string;
  majburiyOzgarish: string;
  
  // Har bir ustun uchun jurnallar ro'yxati
  jurnalHaftalik?: string;
  jurnalYillik?: string;
  jurnalYangi?: string;
  jurnalKmo?: string;
  jurnalMajburiy?: string;

  // Har bir ustun uchun bajarilganlik holati
  doneHaftalik?: boolean;
  doneYillik?: boolean;
  doneYangi?: boolean;
  doneKmo?: boolean;
  doneMajburiy?: boolean;

  // Har bir ustun uchun bajarilmagan sababi (Izox)
  missedReasonHaftalik?: string;
  missedReasonYillik?: string;
  missedReasonYangi?: string;
  missedReasonKmo?: string;
  missedReasonMajburiy?: string;

  // Izox yozilgan sana
  missedReasonDateHaftalik?: string;
  missedReasonDateYillik?: string;
  missedReasonDateYangi?: string;
  missedReasonDateKmo?: string;
  missedReasonDateMajburiy?: string;

  // Sababli bajarilmagan ish keyinchalik bajarilgan bo'lsa
  completedAfterMissedDateHaftalik?: string;
  completedAfterMissedDateYillik?: string;
  completedAfterMissedDateYangi?: string;
  completedAfterMissedDateKmo?: string;
  completedAfterMissedDateMajburiy?: string;

  bajarildiShn: string;
  bajarildiImzo: string;
  adImzosi: string;
  bajarilganSana?: string;
}

export interface WorkReport {
  id: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
  stationId: string;
  stationName: string;
  weekLabel: string;
  month: string;
  year: string;
  entries: ReportEntry[];
  submittedAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

export interface Incident {
  id: string;
  month: string; // "YYYY-MM"
  content: string;
  createdAt: string;
  createdByName: string;
}

export interface IncidentRead {
  id: string;
  incidentId: string;
  workerId: string;
  readAt: string;
}

export interface StationSchema {
  id: string;
  stationId: string;
  fileName: string;
  filePath: string;
  schemaType: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export type SchemaType = string;

export type GrafikTuri =
  | 'yillik_ish_reja_grafiki'
  | 'haftalik_ish_reja_grafiki'

export interface DU46Entry {
  nomber: string               // № — qator raqami
  oyKun1: string
  soatMinut1: string
  kamchilik: string            // Ustun 3: Kamchilik/matn
  oyKun2: string
  soatMinut2: string
  xabarUsuli: string
  oyKun3: string
  soatMinut3: string
  dspImzo: string
  oyKun4: string
  soatMinut4: string
  bartarafInfo: string         // Ustun 12: Nosozlik tafsiloti

  // ── Ustun 3 (kamchilik) uchun ──
  kamchilikBajarildi: boolean       // Boshlandi belgilandi
  kamchilikBajarildiAt: string
  kamchilikImzo: string             // Boshlandi bosgan ism
  // Elektromexanik tasdiqlash (yo'l ustasi oqimida)
  kamchilikNeedsEM?: boolean        // Elektromexanik kerakmi? (Ha=true, Yo'q=false)
  kamchilikEMTasdiqladi?: boolean   // Elektromexanik tasdiqladi
  kamchilikEMTasdiqladiAt?: string
  kamchilikEMImzo?: string
  // BB/Navbatchisi tasdiqlash
  kamchilikBBTasdiqladi: boolean
  kamchilikBBTasdiqladiAt: string
  kamchilikBBImzo: string
  kamchilikBBVaqt: string           // Avtomatik vaqt (soat:daqiqa)

  // ── Dinamik Tasdiqlash Zanjiri (Yangi logikaga moslashuv) ──
  approvalChain?: string[]          // Tasdiqlash ketma-ketligi rollari (masalan: ['yul_ustasi', 'katta_elektromexanik'])
  approvalsCol3?: { role: string; signedBy: string; signedAt: string }[]
  approvalsCol12?: { role: string; signedBy: string; signedAt: string }[]

  // ── Ustun 12 (bartarafInfo) uchun ──
  bartarafBajarildi: boolean        // Bajarildi belgilandi
  bartarafBajarildiAt: string
  bartarafImzo: string              // Bajarildi bosgan ism
  // Elektromexanik tasdiqlash (yo'l ustasi oqimida)
  bartarafNeedsEM?: boolean
  bartarafEMTasdiqladi?: boolean
  bartarafEMTasdiqladiAt?: string
  bartarafEMImzo?: string
  // BB/Navbatchisi tasdiqlash
  bartarafBBTasdiqladi: boolean
  bartarafBBTasdiqladiAt: string
  bartarafBBImzo: string
  bartarafBBVaqt: string            // Avtomatik vaqt (soat:daqiqa)

  // ── Umumiy ──
  createdByRole?: 'worker' | 'bekat_boshlighi' | 'yul_ustasi' | 'ech_xodimi'
  yuborildi: boolean
  dispetcherQabulQildi?: boolean
  dispetcherImzo?: string
  journalMonth?: string
}

// SHU-2 jurnal yozuvi
export interface SHU2Entry {
  nomber?: string      // № — tartib raqami (tahrirlanadigan)
  sana: string         // 1 - Sana
  yozuv: string        // 2 - Navbatchilikdagi yozuv va bajarilgan ishlar
  imzo: string         // 3 - Imzo
  tasdiqlandi?: boolean       // Ishchi tasdiqlagan
  tasdiqlaganImzo?: string    // Tasdiqlagan ishchi ismi
  yuborildi?: boolean         // Dispetcherga yuborildi
  dispetcherQabulQildi?: boolean  // Dispetcher qabul qildi
  dispetcherImzo?: string     // Dispetcher ismi (qabul qilganda)
  journalMonth?: string
}

// Poezd radioaloqasi va ALSN ni tekshirish jurnali yozuvi
export interface ALSNEntry {
  nomber?: string              // № — tartib raqami
  sana: string                 // Sana
  tekshirilganVaqt: string     // Tekshirilgan vaqt
  poezdRaqami: string          // Poezd Raqami
  teplovozRaqami: string       // Teplovoz raqami
  mashinistFamiliyasi: string  // Mashinist Familiyasi
  rps: string                  // RPS
  alsn: string                 // ALSN
  svetoforKorinishi: string    // Svetofor Ko'rinishi
  poezdOtganYol: string        // Poezd o'tgan yo'l
  imzo: string                 // Imzo (bajaruvchi ismi)
  bajarildi?: boolean          // Bajarildi tugmasi bosilganmi
  bajarildiAt?: string         // Qachon bajarildi
  journalMonth?: string        // Oy kaliti (2026-05)
}

// Yerlatgich xabarlagichi yordamida montaj izolyatsiya qarshiligini o'lchash jurnali
export interface YerlatgichEntry {
  sana: string              // Sana
  kuchlanishNomi: string    // Kuchlanish nomi
  olchanganQiymat: string   // O'lchangan qiymat
  imzo: string              // Imzo (ShN ShNM) — bajarildi tugmasi
  sana2: string             // Ikkinchi sana (jadvalning o'ng tomoni)
  olchanganQiymat2: string  // Ikkinchi o'lchangan qiymat
  imzo2: string             // Ikkinchi imzo
  bajarildi?: boolean       // Bajarildi tugmasi bosilganmi
  bajarildiAt?: string      // Qachon bajarildi
  journalMonth?: string     // Oy kaliti (2026-05)
}

// ALSN kodlarini to'g'rilash va tok kuchini o'lchash jurnali (NSH-01 10.4)
export interface AlsnKodEntry {
  sana: string              // Sana
  rzNomi: string            // R/Z nomi
  rzUzunligi: string        // R/Z uzunligi
  juftYonalish: string      // Juft yo'nalish (A)
  toqYonalish: string       // Toq Yo'nalish (A)
  izox: string              // Izox
  imzo: string              // Imzo — bajarildi tugmasi
  bajarildi?: boolean
  bajarildiAt?: string
  journalMonth?: string
}

// MPS turidagi elektrodvigatellarni friksion tokini o'lchash jurnali (NSH-01 9.1.4)
export interface MpsFriksionEntry {
  sana: string              // Sana
  strRaqami: string         // Str. №
  normalTokPlus: string     // Normal o'tishdagi tok (+)
  normalTokMinus: string    // Normal o'tishdagi tok (-)
  friksionTokPlus: string   // Friksiyaga ishlaganda tok (+)
  friksionTokMinus: string  // Friksiyaga ishlaganda tok (-)
  izox: string              // Izox
  imzo: string              // Imzo — bajarildi tugmasi
  bajarildi?: boolean
  bajarildiAt?: string
  journalMonth?: string
}

// Jurnal turi
export type JournalType = 'du46' | 'shu2' | 'boshqa' | 'alsn' | 'yerlatgich' | 'alsnKod' | 'mpsFriksion'

// Jurnal hujjati
export interface StationJournal {
  id: string
  stationId: string
  journalType: JournalType
  entries: DU46Entry[] | SHU2Entry[] | ALSNEntry[] | YerlatgichEntry[] | AlsnKodEntry[] | MpsFriksionEntry[]
  updatedAt: string
  updatedBy: string
}
