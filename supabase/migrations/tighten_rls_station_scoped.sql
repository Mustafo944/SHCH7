-- =====================================================================
-- RLS QATTIQLASHTIRISH: bekat (station) darajasida ma'lumot izolyatsiyasi
-- =====================================================================
-- MAQSAD: dispatcher barcha bekatlarga, boshqa har bir foydalanuvchi FAQAT
-- o'zining users.station_ids massividagi bekatlarga tegishli qatorlarga
-- kira oladi. `users` jadvali bu migratsiyada TEGILMAYDI (u allaqachon
-- to'g'ri himoyalangan — security.sql).
--
-- ESLATMA — REPO/BAZA TEKSHIRUVI NATIJALARI (Supabase OpenAPI orqali
-- tasdiqlandi, chunki mahalliy schema.sql fayli ESKIRGAN edi):
--
--   * `premiya_reports` va `station_equipments` — HAQIQIY bazada JADVAL
--     SIFATIDA MAVJUD EMAS. Shuning uchun bu migratsiyada ularga
--     tegilmaydi. Agar kelajakda qo'shilsa, shu fayldagi
--     work_reports/station_schemas shabloni (TEXT station_id) qo'llanadi.
--
--   * "Bekat qurilmalari" (equipment kategoriyalari, QR-vazifa bog'lanishi)
--     ALOHIDA jadval EMAS — `station_journals` jadvalida
--     `station_id = '<haqiqiy_station_id>_equipments'` va
--     `journal_type = 'shu2'` sifatida saqlanadi
--     (lib/supabase-db.ts: getStationEquipments / upsertStationEquipments).
--     Bu funksiya TO'G'RIDAN-TO'G'RI brauzerdan (RLS ostida) yoziladi —
--     shuning uchun station_journals siyosati "_equipments" prefiksini
--     olib tashlab ham solishtiradi, aks holda xodimlar o'z bekatining
--     qurilmalar ro'yxatini ko'ra/tahrirlay olmay qoladi.
--
--   * Tekshirilgan haqiqiy ustun tiplari:
--       users.id                    uuid   (auth.uid() bilan bevosita mos)
--       users.station_ids           text[]
--       work_reports.station_id     text
--       station_journals.station_id text
--       station_schemas.station_id  text
--       task_scans.station_id       uuid   (stringToUuid() JS xeshi orqali)
--
--   * Yozish yo'llari:
--       - work_reports, station_schemas — TO'G'RIDAN-TO'G'RI brauzerdan
--         (RLS bevosita ta'sir qiladi).
--       - station_journals — oddiy jurnal yozuvlari (DU-46, SHU-2 va h.k.)
--         `app/actions/journal-actions.ts` server action orqali
--         (supabaseAdmin — RLS'ni chetlab o'tadi, lekin o'zining
--         assertJournalWriteAccess() funksiyasida xuddi shu "dispatcher
--         yoki o'z bekati" tekshiruvini alohida bajaradi). LEKIN
--         "Bekat qurilmalari" yozuvi (upsertStationEquipments) esa
--         TO'G'RIDAN-TO'G'RI brauzerdan yoziladi — shuning uchun RLS
--         baribir to'g'ri sozlanishi shart.
--       - task_scans — kodda faqat SELECT va INSERT ishlatiladi (hech
--         qayerda UPDATE/DELETE yo'q, tekshirildi).
--
--   * users.role qiymatlari (tekshirildi): dispatcher, worker,
--     elektromexanik, elektromontyor, bekat_boshlighi, bekat_navbatchisi,
--     yul_ustasi, ech_xodimi, mehnat_muhofazasi. Siyosatlar rolni ANIQ
--     sanamaydi — faqat "dispatcher"ni alohida ajratadi, qolgan BARCHA
--     rollar bir xil "o'z bekati" qoidasiga bo'ysunadi (kelajakda yangi
--     rol qo'shilsa ham ishlayveradi).
--
--   * `mehnat_muhofazasi` roli station_ids=[] bilan ro'yxatdan o'tgan
--     (dispatcher kabi), LEKIN u hozircha faqat `incidents` jadvali bilan
--     ishlaydi (station_id'siz, bu migratsiyaga kirmaydi) — shuning uchun
--     bu 4 jadvalga kira olmasligi HECH QANDAY FUNKSIYANI BUZMAYDI.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- Xavfsizlik: jadvalga faol trafik (autosave, skan, realtime) tegib
-- turgan bo'lishi mumkin. ALTER TABLE / CREATE POLICY qisqa muddatli
-- ACCESS EXCLUSIVE lock talab qiladi — agar boshqa sessiya band qilib
-- turgan bo'lsa, lock_timeout'siz bu SQL Editor gateway'i uzib
-- yubormaguncha "osilib" turaveradi (aynan shu "connection timeout"
-- xatosi). Shuning uchun tezda va ANIQ xato bilan to'xtashi uchun:
-- ─────────────────────────────────────────────────────────────────────
SET lock_timeout = '5s';
SET statement_timeout = '30s';


-- ─────────────────────────────────────────────────────────────────────
-- 0. Eski siyosatlarni tozalash
--    (a) DINAMIK: nomi repo'da kuzatilmagan/qo'lda Dashboard orqali
--        qo'shilgan siyosatlar ham (masalan task_scans'da) qolib
--        ketmasligi uchun — shu 4 jadvaldagi HAR QANDAY mavjud siyosatni
--        nomidan qat'i nazar o'chiradi.
--    (b) ANIQ NOMLAR: repo tarixida (schema.sql, security.sql,
--        fix_rls.sql) uchragan nomlar — hujjatlashtirish uchun.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('work_reports', 'station_journals', 'station_schemas', 'task_scans')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "allow all" ON work_reports;
DROP POLICY IF EXISTS "Allow all for authenticated work_reports" ON work_reports;
DROP POLICY IF EXISTS "work_reports_open" ON work_reports;

DROP POLICY IF EXISTS "Allow all for authenticated station_journals" ON station_journals;
DROP POLICY IF EXISTS "station_journals_open" ON station_journals;
DROP POLICY IF EXISTS "station_journals_select" ON station_journals;
DROP POLICY IF EXISTS "station_journals_insert" ON station_journals;
DROP POLICY IF EXISTS "station_journals_update" ON station_journals;
DROP POLICY IF EXISTS "station_journals_delete" ON station_journals;

DROP POLICY IF EXISTS "allow all" ON station_schemas;
DROP POLICY IF EXISTS "Allow all for authenticated station_schemas" ON station_schemas;
DROP POLICY IF EXISTS "station_schemas_open" ON station_schemas;


-- ─────────────────────────────────────────────────────────────────────
-- 1. HELPER: joriy foydalanuvchining bekatlari ro'yxati
--    get_user_role() allaqachon mavjud (security.sql) — bu yerga
--    tegilmaydi, faqat undan foydalaniladi.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_stations()
RETURNS text[] AS $$
  SELECT COALESCE(
    (SELECT station_ids FROM users WHERE id = auth.uid()),
    '{}'::text[]
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────
-- 2. WORK_REPORTS (oylik ish reja hisobotlari) — station_id: text
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_reports_select_scoped" ON work_reports
  FOR SELECT TO authenticated
  USING (get_user_role() = 'dispatcher' OR station_id = ANY(get_user_stations()));

CREATE POLICY "work_reports_insert_scoped" ON work_reports
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'dispatcher' OR station_id = ANY(get_user_stations()));

CREATE POLICY "work_reports_update_scoped" ON work_reports
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'dispatcher' OR station_id = ANY(get_user_stations()))
  WITH CHECK (get_user_role() = 'dispatcher' OR station_id = ANY(get_user_stations()));

-- Kodda work_reports uchun .delete() umuman ishlatilmaydi (tekshirildi) —
-- ehtiyot chorasi sifatida faqat dispatcher.
CREATE POLICY "work_reports_delete_dispatcher" ON work_reports
  FOR DELETE TO authenticated
  USING (get_user_role() = 'dispatcher');


-- ─────────────────────────────────────────────────────────────────────
-- 3. STATION_JOURNALS — station_id: text
--    "_equipments" prefiksi hisobga olingan (yuqoridagi eslatmaga qarang).
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE station_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "station_journals_select_scoped" ON station_journals
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'dispatcher'
    OR station_id = ANY(get_user_stations())
    OR regexp_replace(station_id, '_equipments$', '') = ANY(get_user_stations())
  );

CREATE POLICY "station_journals_insert_scoped" ON station_journals
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'dispatcher'
    OR station_id = ANY(get_user_stations())
    OR regexp_replace(station_id, '_equipments$', '') = ANY(get_user_stations())
  );

CREATE POLICY "station_journals_update_scoped" ON station_journals
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'dispatcher'
    OR station_id = ANY(get_user_stations())
    OR regexp_replace(station_id, '_equipments$', '') = ANY(get_user_stations())
  )
  WITH CHECK (
    get_user_role() = 'dispatcher'
    OR station_id = ANY(get_user_stations())
    OR regexp_replace(station_id, '_equipments$', '') = ANY(get_user_stations())
  );

-- Kodda station_journals uchun .delete() umuman ishlatilmaydi (tekshirildi) —
-- ehtiyot chorasi sifatida faqat dispatcher.
CREATE POLICY "station_journals_delete_dispatcher" ON station_journals
  FOR DELETE TO authenticated
  USING (get_user_role() = 'dispatcher');


-- ─────────────────────────────────────────────────────────────────────
-- 4. STATION_SCHEMAS (bir/ikki ipli sxemalar, PDF fayl yo'llari) —
--    station_id: text
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE station_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "station_schemas_select_scoped" ON station_schemas
  FOR SELECT TO authenticated
  USING (get_user_role() = 'dispatcher' OR station_id = ANY(get_user_stations()));

CREATE POLICY "station_schemas_insert_scoped" ON station_schemas
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'dispatcher' OR station_id = ANY(get_user_stations()));

CREATE POLICY "station_schemas_update_scoped" ON station_schemas
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'dispatcher' OR station_id = ANY(get_user_stations()))
  WITH CHECK (get_user_role() = 'dispatcher' OR station_id = ANY(get_user_stations()));

-- Kodda faqat dispatcher o'chiradi (app/dispatcher/components/SchemasView.tsx,
-- boshqa hech qayerda deleteSchema chaqirilmaydi — tekshirildi).
CREATE POLICY "station_schemas_delete_dispatcher" ON station_schemas
  FOR DELETE TO authenticated
  USING (get_user_role() = 'dispatcher');


-- ─────────────────────────────────────────────────────────────────────
-- 5. TASK_SCANS — station_id: UUID (stringToUuid() JS xeshi orqali),
--    users.station_ids (text[]) bilan BEVOSITA solishtirib bo'lmaydi.
--
--    (a) TAVSIYA ETILGAN VARIANT (shu yerda qo'llanildi) —
--        kod xatti-harakatini BUZMAYDI:
--          SELECT: barcha authenticated foydalanuvchiga ochiq (bugungidek).
--          INSERT: faqat authenticated (qo'shimcha egalik tekshiruvisiz).
--        Sabab: `scanned_by` ustuni foydalanuvchi ID emas, ISM saqlaydi
--        (masalan "Olimov Olim" — session.fullName), auth.uid() bilan
--        bevosita solishtirib bo'lmaydi.
--
--    (b) MUQOBIL (bu migratsiyada YOZILMAGAN) — to'liq bekat izolyatsiyasi:
--        `stringToUuid()` JS xesh algoritmini PL/pgSQL'da qayta yozib,
--        keyin `station_id = ANY(ARRAY(SELECT my_string_to_uuid(s)
--        FROM unnest(get_user_stations()) s))` kabi solishtirish.
--
--    (a) vs (b) taqqoslash:
--      +  (a): kodga mos, xech qanday xato-qilish xavfi yo'q, darhol
--         ishlaydi; − (a): SELECT hamon barcha bekatlar uchun OCHIQ
--         qoladi (istalgan xodim boshqa bekatning skaner tarixini
--         ko'rishi mumkin) — bu MAQSADdagi to'liq izolyatsiyaga
--         to'liq mos kelmaydi, faqat oraliq/xavfsizroq qadam.
--      +  (b): haqiqiy bekat-darajasidagi himoyani beradi (MAQSADga
--         to'liq mos); − (b): JS xesh funksiyasini SQL'da aynan
--         takrorlash xato-qilish ehtimoli yuqori (32-bitli ishorali
--         butun son overflow'i, bit operatsiyalar ketma-ketligi
--         JS bilan bir xil bo'lishi shart), va JS tomonda funksiya
--         keyinchalik o'zgarsa SQL nusxasi sezilmasdan eskirib qoladi
--         (jim, aniqlash qiyin bo'lgan xato manbai) — qo'shimcha
--         texnik xizmat yuki.
--      Xulosa: xavfsizlik nuqtai nazaridan (b) to'g'riroq, lekin siz
--      so'ragan "funksionallikni buzmaslik" ustuvorligiga ko'ra hozircha
--      (a) qo'llanildi.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE task_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_scans_select_all_authenticated" ON task_scans
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "task_scans_insert_authenticated" ON task_scans
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE/DELETE uchun siyosat qo'shilmadi — kodda bu amallar umuman
-- ishlatilmaydi (faqat SELECT va INSERT, tekshirildi). RLS yoqilgach,
-- siyosat yo'q amallar avtomatik taqiqlanadi (hech kimga ruxsat yo'q).


-- =====================================================================
-- ROLLBACK — agar biror rol bloklanib qolsa, TEZDA ochiq holatga
-- qaytarish uchun. Quyidagi blokni Supabase SQL Editor'da alohida
-- ishga tushiring (izohlarni olib tashlab, /* va */ qatorlarisiz).
-- =====================================================================
/*
DROP POLICY IF EXISTS "work_reports_select_scoped" ON work_reports;
DROP POLICY IF EXISTS "work_reports_insert_scoped" ON work_reports;
DROP POLICY IF EXISTS "work_reports_update_scoped" ON work_reports;
DROP POLICY IF EXISTS "work_reports_delete_dispatcher" ON work_reports;
CREATE POLICY "work_reports_open" ON work_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "station_journals_select_scoped" ON station_journals;
DROP POLICY IF EXISTS "station_journals_insert_scoped" ON station_journals;
DROP POLICY IF EXISTS "station_journals_update_scoped" ON station_journals;
DROP POLICY IF EXISTS "station_journals_delete_dispatcher" ON station_journals;
CREATE POLICY "station_journals_open" ON station_journals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "station_schemas_select_scoped" ON station_schemas;
DROP POLICY IF EXISTS "station_schemas_insert_scoped" ON station_schemas;
DROP POLICY IF EXISTS "station_schemas_update_scoped" ON station_schemas;
DROP POLICY IF EXISTS "station_schemas_delete_dispatcher" ON station_schemas;
CREATE POLICY "station_schemas_open" ON station_schemas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "task_scans_select_all_authenticated" ON task_scans;
DROP POLICY IF EXISTS "task_scans_insert_authenticated" ON task_scans;
CREATE POLICY "task_scans_open" ON task_scans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- get_user_stations() funksiyasini o'chirish shart emas — hech qanday
-- siyosat uni chaqirmasa, zararsiz turaveradi.
*/
