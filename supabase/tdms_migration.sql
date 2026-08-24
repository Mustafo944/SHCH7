-- ═══════════════════════════════════════════════════════════════════════════════
-- TDMS (Texnik Hujjatlarni Boshqarish Tizimi) — Supabase jadvallar
-- ═══════════════════════════════════════════════════════════════════════════════
-- Bu SQL ni Supabase Dashboard → SQL Editor ga nusxalab ishlatish kerak.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. HUJJATLAR JADVALI
CREATE TABLE IF NOT EXISTS tdms_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  name TEXT NOT NULL,
  drive_url TEXT NOT NULL,
  version TEXT DEFAULT 'V1',
  category TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TEKSHIRUVLAR (AUDIT) JADVALI
CREATE TABLE IF NOT EXISTS tdms_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT DEFAULT '',
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('cat1', 'cat2', 'cat3', 'cat4')),
  auditor_name TEXT NOT NULL,
  auditor_role TEXT NOT NULL,
  note TEXT DEFAULT '',
  audited_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. GRAFIKLAR JADVALI
CREATE TABLE IF NOT EXISTS tdms_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  audit_type TEXT NOT NULL CHECK (audit_type IN ('cat1', 'cat2', 'cat3', 'cat4')),
  completed BOOLEAN DEFAULT false,
  completed_audit_id UUID REFERENCES tdms_audits(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Bir bekat uchun bir oyda bitta tekshiruv turi
  UNIQUE (station_id, year, month, audit_type)
);

-- 4. VARAQLAR JADVALI (Har bir varaq = alohida PDF)
CREATE TABLE IF NOT EXISTS tdms_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES tdms_documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  drive_url TEXT NOT NULL,
  version TEXT DEFAULT 'V1',
  uploaded_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Bitta sxemada har bir varaq raqami faqat 1 marta
  UNIQUE (document_id, page_number)
);

-- 5. VARAQ VERSIYALARI (Eski sxemalar arxivi — o'chirilmaydi)
CREATE TABLE IF NOT EXISTS tdms_page_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES tdms_pages(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  drive_url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  replaced_at TIMESTAMPTZ DEFAULT now()
);

-- 6. VARAQ TEKSHIRUVLARI (Kim qachon tekshirdi)
CREATE TABLE IF NOT EXISTS tdms_page_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES tdms_pages(id) ON DELETE CASCADE,
  checked_by TEXT NOT NULL,
  checked_role TEXT NOT NULL DEFAULT '',
  checked_at TIMESTAMPTZ DEFAULT now(),
  check_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'matches',
  comment TEXT
);

-- 7. TDMS BEKATLAR (Faqat Texnik Hujjatlar uchun — boshqa sahifalarga ta'sir qilmaydi)
CREATE TABLE IF NOT EXISTS tdms_stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bekat' CHECK (type IN ('bekat', 'oraliq')),
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEKSLAR (Tez qidiruv uchun)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_tdms_documents_station ON tdms_documents(station_id);
CREATE INDEX IF NOT EXISTS idx_tdms_audits_station ON tdms_audits(station_id);
CREATE INDEX IF NOT EXISTS idx_tdms_audits_type ON tdms_audits(audit_type);
CREATE INDEX IF NOT EXISTS idx_tdms_schedules_year ON tdms_schedules(year);
CREATE INDEX IF NOT EXISTS idx_tdms_schedules_station ON tdms_schedules(station_id);
CREATE INDEX IF NOT EXISTS idx_tdms_pages_document ON tdms_pages(document_id);
CREATE INDEX IF NOT EXISTS idx_tdms_page_versions_page ON tdms_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_tdms_page_checks_page ON tdms_page_checks(page_id);
CREATE INDEX IF NOT EXISTS idx_tdms_stations_sort ON tdms_stations(sort_order);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS (Row Level Security) — Xavfsizlik
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE tdms_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tdms_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tdms_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tdms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tdms_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tdms_page_checks ENABLE ROW LEVEL SECURITY;

-- Authenticated foydalanuvchilarga to'liq ruxsat (bizning tizimimiz rol-asosli)
CREATE POLICY "tdms_documents_all" ON tdms_documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "tdms_audits_all" ON tdms_audits FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "tdms_schedules_all" ON tdms_schedules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "tdms_pages_all" ON tdms_pages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "tdms_page_versions_all" ON tdms_page_versions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "tdms_page_checks_all" ON tdms_page_checks FOR ALL USING (auth.role() = 'authenticated');
ALTER TABLE tdms_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tdms_stations_all" ON tdms_stations FOR ALL USING (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════════════════
-- V2: MULTI-LEVEL CHECKS (Elektromexanik va Muhandis)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE tdms_page_checks 
  ADD COLUMN IF NOT EXISTS check_type TEXT NOT NULL DEFAULT 'engineer_3_year',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS comment TEXT;
