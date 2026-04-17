-- =====================================================
-- station_journals uchun RLS siyosatini tuzatish
-- Ushbu skriptni Supabase SQL Editor da ishga tushiring
-- =====================================================

-- Avval eski siyosatlarni tozalaymiz
DROP POLICY IF EXISTS "station_journals_open" ON station_journals;
DROP POLICY IF EXISTS "Allow all for authenticated station_journals" ON station_journals;
DROP POLICY IF EXISTS "station_journals_select" ON station_journals;
DROP POLICY IF EXISTS "station_journals_insert" ON station_journals;
DROP POLICY IF EXISTS "station_journals_update" ON station_journals;
DROP POLICY IF EXISTS "station_journals_delete" ON station_journals;

-- RLS yoqilgan bo'lishi kerak
ALTER TABLE station_journals ENABLE ROW LEVEL SECURITY;

-- Barcha autentifikatsiyadan o'tgan foydalanuvchilarga to'liq ruxsat
CREATE POLICY "station_journals_select" ON station_journals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "station_journals_insert" ON station_journals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "station_journals_update" ON station_journals
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "station_journals_delete" ON station_journals
  FOR DELETE TO authenticated USING (true);
