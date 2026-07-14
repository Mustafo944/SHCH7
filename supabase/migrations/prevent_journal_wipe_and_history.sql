-- =====================================================================
-- JURNAL/QURILMA MA'LUMOTLARINI YO'QOTISHDAN HIMOYA
-- =====================================================================
-- MUAMMO (2026-07-07 hodisasi): station_journals jadvalidagi bir qator
-- BUTUN massiv bilan ustidan yoziladi ("last-writer-wins"). Eski/bo'sh
-- nusxa yuklangan sessiya "Saqlash" bosgan paytda mavjud yozuvlar
-- (DU-46, SHU-2 jurnallari va _equipments qatoridagi qurilmalar) bir
-- lahzada bo'shab qolgan.
--
-- YECHIM — ikki BEFORE UPDATE trigger (bazada, klientni chetlab bo'lmaydi):
--   1) prevent_journal_wipe        — mavjud yozuvni BO'SH nusxa bilan
--                                     ustidan yozishni RAD ETADI.
--   2) archive_journal_before_upd  — har UPDATE'dan OLDINGI holatni
--                                     station_journals_history'ga yozadi
--                                     (Free rejada backup yo'qligini qoplaydi,
--                                     istalgan yo'qotishni tiklash imkonini beradi).
--
-- Qo'llash: Supabase Dashboard → SQL Editor → butun faylni Run.
-- Funksionallikni BUZMAYDI: oddiy saqlashlar (yozuv qo'shish/tahrirlash)
-- avvalgidek ishlaydi; faqat "hammasini bo'shatish" bloklanadi.
-- =====================================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';


-- ─────────────────────────────────────────────────────────────────────
-- 1. TARIX JADVALI
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS station_journals_history (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id  text NOT NULL,
  journal_type text NOT NULL,
  entries     jsonb NOT NULL,
  updated_by  text,
  archived_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sjh_station_type_time
  ON station_journals_history (station_id, journal_type, archived_at DESC);

-- Tarix jadvaliga faqat trigger yozadi; oddiy foydalanuvchi ko'ra/tahrirlay olmaydi
ALTER TABLE station_journals_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sjh_dispatcher_select" ON station_journals_history;
CREATE POLICY "sjh_dispatcher_select" ON station_journals_history
  FOR SELECT TO authenticated
  USING (get_user_role() = 'dispatcher');


-- ─────────────────────────────────────────────────────────────────────
-- 2. "BO'SHNI USTIDAN YOZMA" TRIGGER FUNKSIYASI
--    Oddiy jurnal (du46/shu2/...) — entries to'g'ridan-to'g'ri yozuvlar massivi.
--    Qurilmalar (station_id '..._equipments') — entries ichida
--      {type:'categories', data:[...]} bo'lgani uchun ALOHIDA hisoblanadi.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_journal_wipe()
RETURNS trigger AS $$
DECLARE
  old_count int;
  new_count int;
BEGIN
  IF OLD.station_id LIKE '%\_equipments' THEN
    old_count := COALESCE((
      SELECT jsonb_array_length(COALESCE(e->'data', '[]'::jsonb))
      FROM jsonb_array_elements(COALESCE(OLD.entries, '[]'::jsonb)) e
      WHERE e->>'type' = 'categories' LIMIT 1
    ), 0);
    new_count := COALESCE((
      SELECT jsonb_array_length(COALESCE(e->'data', '[]'::jsonb))
      FROM jsonb_array_elements(COALESCE(NEW.entries, '[]'::jsonb)) e
      WHERE e->>'type' = 'categories' LIMIT 1
    ), 0);
  ELSE
    old_count := jsonb_array_length(COALESCE(OLD.entries, '[]'::jsonb));
    new_count := jsonb_array_length(COALESCE(NEW.entries, '[]'::jsonb));
  END IF;

  IF old_count > 0 AND new_count = 0 THEN
    RAISE EXCEPTION
      'BLOCKED_WIPE: bo''sh ma''lumot mavjud yozuvlar (% dona) ustidan yozilmaydi. station=%, type=%',
      old_count, OLD.station_id, OLD.journal_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────
-- 3. TARIXGA YOZISH TRIGGER FUNKSIYASI (entries o'zgargandagina)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION archive_journal_before_update()
RETURNS trigger AS $$
BEGIN
  IF OLD.entries IS DISTINCT FROM NEW.entries THEN
    INSERT INTO station_journals_history (station_id, journal_type, entries, updated_by)
    VALUES (OLD.station_id, OLD.journal_type, OLD.entries, OLD.updated_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────
-- 4. TRIGGERLARNI ULASH
--    Nomlar alifbo tartibida ishlaydi: avval "archive" (eski holat
--    saqlanadi), keyin "prevent" (bo'sh bo'lsa bekor qilinadi — bu holda
--    tranzaksiya rollback bo'lib, arxiv yozuvi ham qaytariladi).
-- ─────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_archive_journal ON station_journals;
CREATE TRIGGER trg_archive_journal
  BEFORE UPDATE ON station_journals
  FOR EACH ROW EXECUTE FUNCTION archive_journal_before_update();

DROP TRIGGER IF EXISTS trg_prevent_journal_wipe ON station_journals;
CREATE TRIGGER trg_prevent_journal_wipe
  BEFORE UPDATE ON station_journals
  FOR EACH ROW EXECUTE FUNCTION prevent_journal_wipe();


-- =====================================================================
-- TIKLASH NAMUNASI (kelajakda yo'qotish bo'lsa):
--   Eng oxirgi bo'sh bo'lmagan nusxani tarixdan qaytarish —
-- ---------------------------------------------------------------------
-- UPDATE station_journals sj
-- SET entries = h.entries
-- FROM (
--   SELECT DISTINCT ON (station_id, journal_type) station_id, journal_type, entries
--   FROM station_journals_history
--   WHERE jsonb_array_length(entries) > 0
--   ORDER BY station_id, journal_type, archived_at DESC
-- ) h
-- WHERE sj.station_id = h.station_id AND sj.journal_type = h.journal_type
--   AND sj.station_id = 'st_1';   -- kerakli bekat
-- =====================================================================

-- ROLLBACK (agar triggerlar biror ishni to'sib qo'ysa):
-- DROP TRIGGER IF EXISTS trg_prevent_journal_wipe ON station_journals;
-- DROP TRIGGER IF EXISTS trg_archive_journal ON station_journals;
