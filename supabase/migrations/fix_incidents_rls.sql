-- =====================================================================
-- HODISALAR (incidents) RLS TUZATISH
-- =====================================================================
-- MUAMMO (incidents_migration.sql):
--   1) SELECT siyosati `USING (true)` va `TO` bandisiz yozilgan — bu
--      ANON rolga ham tegishli. Anon key JS bundle ichida ochiq bo'lgani
--      uchun LOGIN QILMAGAN istalgan odam barcha hodisalar matnini
--      o'qiy olar edi.
--   2) UPDATE/DELETE `auth.role() = 'authenticated'` — ya'ni ISTALGAN
--      login qilgan xodim istalgan hodisani o'chirib/tahrirlab tashlashi
--      mumkin edi. UI buni faqat mehnat muhofazasiga ko'rsatadi, lekin
--      API to'g'ridan-to'g'ri chaqirilsa himoya yo'q edi.
--
-- YECHIM:
--   SELECT              — faqat authenticated (barcha rollar o'qiydi,
--                         chunki worker/dispatcher sahifalari hodisalarni
--                         ko'rsatadi).
--   INSERT/UPDATE/DELETE — faqat mehnat_muhofazasi va dispatcher.
--                         (Kod tekshirildi: addIncident/deleteIncident/
--                         updateIncidentSeverity FAQAT
--                         app/mehnat-muhofazasi/page.tsx dan chaqiriladi.
--                         Dispatcher zaxira/admin sifatida qo'shildi.)
--
-- FUNKSIONALLIK BUZILMAYDI: barcha sahifalar login ortida ishlaydi,
-- hech bir mavjud oqim anon o'qish yoki oddiy xodim yozuviga tayanmaydi.
--
-- Qo'llash: Supabase Dashboard → SQL Editor → butun faylni Run.
-- =====================================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';


-- ─────────────────────────────────────────────────────────────────────
-- 0. Eski siyosatlarni tozalash (nomidan qat'i nazar — Dashboard orqali
--    qo'lda qo'shilganlari ham qolib ketmasligi uchun dinamik o'chirish)
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'incidents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON incidents', pol.policyname);
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────
-- 1. Yangi siyosatlar
--    get_user_role() allaqachon mavjud (security.sql, SECURITY DEFINER) —
--    joriy foydalanuvchining users.role qiymatini qaytaradi.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- O'qish: faqat login qilganlar (anon YOPILDI)
CREATE POLICY "incidents_select_authenticated" ON incidents
  FOR SELECT TO authenticated
  USING (true);

-- Qo'shish: faqat mehnat muhofazasi va dispetcher
CREATE POLICY "incidents_insert_admin" ON incidents
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('mehnat_muhofazasi', 'dispatcher'));

-- Tahrirlash: faqat mehnat muhofazasi va dispetcher
CREATE POLICY "incidents_update_admin" ON incidents
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('mehnat_muhofazasi', 'dispatcher'))
  WITH CHECK (get_user_role() IN ('mehnat_muhofazasi', 'dispatcher'));

-- O'chirish: faqat mehnat muhofazasi va dispetcher
CREATE POLICY "incidents_delete_admin" ON incidents
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('mehnat_muhofazasi', 'dispatcher'));


-- ─────────────────────────────────────────────────────────────────────
-- 2. TEKSHIRUV (ixtiyoriy): joriy siyosatlarni ko'rish
--      SELECT policyname, cmd, roles, qual, with_check
--      FROM pg_policies WHERE tablename = 'incidents';
-- Kutilgan natija: 4 ta siyosat, barchasi {authenticated} roliga.
-- ─────────────────────────────────────────────────────────────────────


-- =====================================================================
-- ROLLBACK — agar biror oqim bloklanib qolsa, eski (ochiq) holatga
-- qaytarish uchun quyidagini alohida ishga tushiring:
-- =====================================================================
/*
DROP POLICY IF EXISTS "incidents_select_authenticated" ON incidents;
DROP POLICY IF EXISTS "incidents_insert_admin" ON incidents;
DROP POLICY IF EXISTS "incidents_update_admin" ON incidents;
DROP POLICY IF EXISTS "incidents_delete_admin" ON incidents;

CREATE POLICY "Public read access for incidents"
    ON incidents FOR SELECT
    USING (true);
CREATE POLICY "Allow authenticated to insert incidents"
    ON incidents FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated to update incidents"
    ON incidents FOR UPDATE
    USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated to delete incidents"
    ON incidents FOR DELETE
    USING (auth.role() = 'authenticated');
*/
