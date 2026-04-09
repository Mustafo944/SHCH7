-- =====================================================
-- Row Level Security (RLS) — Minimal Xavfsizlik
-- Funksionallik buzilmaydi, faqat admin huquqlar cheklanadi
-- =====================================================

-- Helper function: foydalanuvchi rolini olish
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- =====================================================
-- 1. USERS: Faqat dispatcher boshqaradi
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON users;
DROP POLICY IF EXISTS "users_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_dispatcher_manage" ON users;

-- O'qish: hamma ko'radi
CREATE POLICY "users_select" ON users
  FOR SELECT TO authenticated
  USING (true);

-- Yaratish/Tahrirlash/O'chirish: faqat dispatcher
CREATE POLICY "users_manage_dispatcher" ON users
  FOR ALL TO authenticated
  USING (get_user_role() = 'dispatcher')
  WITH CHECK (get_user_role() = 'dispatcher');


-- =====================================================
-- 2. BOSHQA JADVALLAR: Hozircha ochiq qolsin
-- (ishchi ko'p yozuv yubora olishi, BB tasdiqlashi kerak)
-- =====================================================
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE premiya_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_schemas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated work_reports" ON work_reports;
DROP POLICY IF EXISTS "Allow all for authenticated premiya_reports" ON premiya_reports;
DROP POLICY IF EXISTS "Allow all for authenticated station_journals" ON station_journals;
DROP POLICY IF EXISTS "Allow all for authenticated station_schemas" ON station_schemas;

-- Hozircha ochiq (funksionallik buzilmasligi uchun)
CREATE POLICY "work_reports_open" ON work_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "premiya_reports_open" ON premiya_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "station_journals_open" ON station_journals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "station_schemas_open" ON station_schemas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =====================================================
-- 3. STORAGE: sxemalar bucket
-- =====================================================
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "storage_sxemalar_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_sxemalar_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_sxemalar_delete" ON storage.objects;

-- Ko'rish/Yuklash: hamma autentifikatsiyadan o'tgan
CREATE POLICY "storage_sxemalar_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sxemalar');

CREATE POLICY "storage_sxemalar_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sxemalar');

-- O'chirish: faqat dispatcher
CREATE POLICY "storage_sxemalar_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'sxemalar'
    AND get_user_role() = 'dispatcher'
  );
