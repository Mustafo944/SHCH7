-- ═══════════════════════════════════════════════════════════════════════
-- REALTIME PUBLICATION SOZLAMALARI
-- Bu SQL ni Supabase Dashboard → SQL Editor da ishga tushiring
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Barcha jadvallarga realtime publication qo'shish
-- (Agar allaqachon qo'shilgan bo'lsa, xato bermaydi)

DO $$
BEGIN
  -- station_journals
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'station_journals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE station_journals;
    RAISE NOTICE 'station_journals jadvaliga realtime qo''shildi';
  ELSE
    RAISE NOTICE 'station_journals allaqachon realtime da bor';
  END IF;

  -- work_reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'work_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE work_reports;
    RAISE NOTICE 'work_reports jadvaliga realtime qo''shildi';
  ELSE
    RAISE NOTICE 'work_reports allaqachon realtime da bor';
  END IF;

  -- premiya_reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'premiya_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE premiya_reports;
    RAISE NOTICE 'premiya_reports jadvaliga realtime qo''shildi';
  ELSE
    RAISE NOTICE 'premiya_reports allaqachon realtime da bor';
  END IF;
END $$;

-- 2. Qaysi jadvallar realtime da ekanligini tekshirish
SELECT schemaname, tablename, pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════
-- REALTIME ROW LEVEL SECURITY (RLS) - Realtime uchun RLS politikalari
-- ═══════════════════════════════════════════════════════════════════════

-- station_journals uchun realtime SELECT policy (agar yo'q bo'lsa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'station_journals'
    AND policyname = 'realtime_select_station_journals'
  ) THEN
    CREATE POLICY realtime_select_station_journals
    ON station_journals
    FOR SELECT
    TO authenticated
    USING (true);
    RAISE NOTICE 'station_journals realtime SELECT policy yaratildi';
  ELSE
    RAISE NOTICE 'station_journals realtime policy allaqachon bor';
  END IF;
END $$;
