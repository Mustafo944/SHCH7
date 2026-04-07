-- 1. users jadvaliga agar mavjud bo'lmasa ruxsatlar kiritish
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  login TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('worker', 'bekat_boshlighi', 'dispatcher')),
  position TEXT NOT NULL,
  station_ids TEXT[] DEFAULT '{}',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. work_reports jadvali
CREATE TABLE IF NOT EXISTS work_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  worker_phone TEXT,
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  week_label TEXT NOT NULL,
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT
);

ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated work_reports" ON work_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. premiya_reports jadvali
CREATE TABLE IF NOT EXISTS premiya_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  sex TEXT,
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT
);

ALTER TABLE premiya_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated premiya_reports" ON premiya_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. station_schemas jadvali
CREATE TABLE IF NOT EXISTS station_schemas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  schema_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by TEXT
);

ALTER TABLE station_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated station_schemas" ON station_schemas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. station_journals jadvali (DU-46 va SHU-2)
CREATE TABLE IF NOT EXISTS station_journals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id TEXT NOT NULL,
  journal_type TEXT NOT NULL CHECK (journal_type IN ('du46', 'shu2')),
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT NOT NULL DEFAULT '',
  UNIQUE (station_id, journal_type)
);

ALTER TABLE station_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated station_journals" ON station_journals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Jadvallar uchun REALTIME ni faollashtirish
-- Supabase ning Realtime uzatuvchisi (WebSocket) ga ushbu jadvallarni ulaymiz.
begin;
  -- Avval publication 'supabase_realtime' mavjud bo'lmasa qandaydir muammo bo'lmasin. 
  -- Standart Supabase db lardagi realtime ni o'rnatamiz.
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table station_journals;
alter publication supabase_realtime add table work_reports;
alter publication supabase_realtime add table premiya_reports;
-- (users va schema rasmlari jonli bo'lishi kuchli ehtiyoj emas)
