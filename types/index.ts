// Rollar
export type Role = "dispatcher" | "worker" | "bekat_boshlighi";

// Lavozimlar
export type Position = "katta_elektromexanik" | "bekat_boshlighi" | "dispatcher";

// Foydalanuvchi
export interface User {
  id: string;
  login: string;
  password?: string;
  fullName: string;
  role: Role;
  position: Position;
  stationIds: string[]; // Bir nechta bekat (worker: max 5, bekat_boshlighi: max 3)
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
  bajarildiShn: string;
  bajarildiImzo: string;
  adImzosi: string;
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
  yuborildi: boolean           // Dispetcherga yuborildi
  dispetcherQabulQildi?: boolean  // Dispetcher qabul qildi
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
}

// Jurnal turi
export type JournalType = 'du46' | 'shu2'

// Jurnal hujjati
export interface StationJournal {
  id: string
  stationId: string
  journalType: JournalType
  entries: DU46Entry[] | SHU2Entry[]
  updatedAt: string
  updatedBy: string
}
