// Rollar
export type Role = "dispatcher" | "worker" | "bekat_boshlighi" | "elektromexanik" | "elektromontyor" | "bekat_navbatchisi";

// Lavozimlar
export type Position = "katta_elektromexanik" | "bekat_boshlighi" | "dispatcher" | "elektromexanik" | "elektromontyor" | "bekat_navbatchisi";

// Foydalanuvchi
export interface User {
  id: string;
  login: string;
  fullName: string;
  role: Role;
  position: Position;
  stationIds: string[]; // worker: max 5, bekat_boshlighi: max 3, others: max 1
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

export interface PremiyaEntry {
  ish: string;
  lavozim: string;
  tabelNomeri: string;
  foiz: string;
  eslatma: string;
}

export interface PremiyaReport {
  id: string;
  workerId: string;
  workerName: string;
  stationId: string;
  stationName: string;
  month: string;       // "2026-03"
  year: string;
  sex: string;         // bekat/sex nomi
  entries: PremiyaEntry[];
  submittedAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
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
  nomber: string               // № — qator raqami, ishchi o'zgartira oladi
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
  // Ustun 3 (kamchilik) uchun
  kamchilikBajarildi: boolean  // Ishchi "Bajarildi" bosdi
  kamchilikBajarildiAt: string // Qachon bosdi
  kamchilikImzo: string        // Ishchi ismi (bajarildi dan keyin)
  kamchilikBBTasdiqladi: boolean   // BB tasdiqladi
  kamchilikBBTasdiqladiAt: string  // Qachon tasdiqladi
  kamchilikBBImzo: string      // BB ismi (tasdiqladi dan keyin)
  kamchilikBBVaqt: string      // BB tasdiqlagan vaqti (soat:daqiqa)
  // Ustun 12 (bartarafInfo) uchun
  bartarafBajarildi: boolean   // Ishchi "Bajarildi" bosdi
  bartarafBajarildiAt: string  // Qachon bosdi
  bartarafImzo: string         // Ishchi ismi (bajarildi dan keyin)
  bartarafBBTasdiqladi: boolean   // BB tasdiqladi
  bartarafBBTasdiqladiAt: string  // Qachon tasdiqladi
  bartarafBBImzo: string       // BB ismi (tasdiqladi dan keyin)
  bartarafBBVaqt: string       // BB tasdiqlagan vaqti (soat:daqiqa)
  // Umumiy
  createdByRole?: 'worker' | 'bekat_boshlighi'  // Qatorni kim yaratgan
  yuborildi: boolean           // Dispetcherga yuborildi
  dispetcherQabulQildi?: boolean  // Dispetcher qabul qildi
  dispetcherImzo?: string      // Dispetcher ismi (qabul qilganda)
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
