-- =====================================================================
-- task_scans: sxema hujjati + dublikatlarni to'sish + equipment_id turi
--
-- MUAMMO 1 — sxema repo'da yo'q edi.
--   Jadval Supabase Dashboard orqali QO'LDA yaratilgan, migratsiyalarda
--   faqat RLS va realtime o'zgarishlari bor edi. Natijada yangi muhitni
--   (test bazasi, yangi deploy) noldan ko'tarish IMKONSIZ edi.
--   Quyidagi CREATE TABLE IF NOT EXISTS — mavjud bazada NO-OP, yangi
--   bazada esa to'g'ri jadvalni yaratadi.
--
-- MUAMMO 2 — bir vaqtda skanerlashda dublikat qatorlar.
--   Ikki ishchi bitta qurilmani bir vaqtda skanerlasa IKKI qator yozilardi.
--   Klientdagi `existingScans` tekshiruvi race'ni to'sa olmaydi (tekshiruv
--   bilan INSERT orasida boshqa qurilma allaqachon yozib ulgurgan bo'ladi).
--   Natijada UI'da "Skaner qilingan: 5 / 4" kabi noto'g'ri hisob chiqardi.
--
-- MUAMMO 3 — equipment_id `uuid` turida, lekin unga stringToUuid() bilan
--   yasalgan 32-BITLI xesh yozilardi (lib/utils/qr.ts). `Math.abs()` ishorani
--   yo'qotgani uchun real fazo ~2^31 — ikki xil qurilma bir xil id olishi
--   mumkin edi. equipment_id KOD BO'YLAB HECH QAYERDA O'QILMAYDI (tekshirildi:
--   barcha solishtirishlar `equipment_name` bo'yicha ketadi), shuning uchun
--   uni `text` ga o'tkazib xom QR qiymatini saqlash eng sodda va xavfsiz yechim.
--
--   ⚠️  TARTIB MUHIM: bu SQL klient kodidan OLDIN ishga tushirilishi shart.
--       Aks holda kod xom QR satrini `uuid` ustuniga yozmoqchi bo'lib,
--       BARCHA skanerlar xato beradi.
--
-- Supabase Dashboard → SQL Editor da bir marta ishga tushiring.
-- =====================================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- ─────────────────────────────────────────────────────────────────────
-- 1. Jadval (mavjud bo'lsa tegilmaydi — faqat yangi muhitlar uchun)
--    Ustunlar lib/supabase-db.ts dagi `TaskScan` interfeysiga mos.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_scans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Bekat id'si. Hozircha uuid: matnli bekat id'lari ("st_1") klientda
  -- stringToUuid() bilan o'giriladi. Buni ham `text` ga o'tkazish alohida
  -- ish — u 4 ta so'rov filtrida ishlatilgani uchun backfill talab qiladi.
  station_id     uuid        NOT NULL,
  task_nsh       text        NOT NULL,
  task_date      date        NOT NULL,
  equipment_id   text        NOT NULL,
  equipment_name text        NOT NULL,
  scanned_by     text        NOT NULL,
  scanned_at     timestamptz NOT NULL DEFAULT now()
);

-- RLS. Mavjud bazada bu NO-OP (tighten_rls_station_scoped.sql allaqachon
-- yoqib, `task_scans_select_all_authenticated` va `task_scans_insert_authenticated`
-- siyosatlarini yaratgan). Yangi muhitda esa jadval RLS'siz ochiq qolmasligini
-- kafolatlaydi — siyosatlar tighten_rls_station_scoped.sql da keladi, unga
-- qadar jadval "hammaga yopiq" holatda turadi (xavfsiz standart).
--
-- Shu satr borligi uchun Supabase SQL Editor'dagi "creates a table without
-- enabling RLS" ogohlantirishiga "Run without RLS" ni bossangiz ham xavf yo'q.
ALTER TABLE public.task_scans ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- 2. equipment_id: uuid → text
--    uuid → text o'girish PostgreSQL'da yo'qotishsiz (mavjud qiymatlar
--    o'zining matn ko'rinishiga aylanadi). Eski qatorlar uuid ko'rinishida
--    qoladi — ular baribir hech qayerda o'qilmaydi.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'task_scans'
    AND column_name  = 'equipment_id';

  IF col_type IS NULL THEN
    RAISE EXCEPTION 'task_scans.equipment_id ustuni topilmadi — sxemani tekshiring';
  ELSIF col_type = 'uuid' THEN
    ALTER TABLE public.task_scans
      ALTER COLUMN equipment_id TYPE text USING equipment_id::text;
    RAISE NOTICE 'equipment_id: uuid -> text ga o''tkazildi';
  ELSE
    RAISE NOTICE 'equipment_id allaqachon % turida — o''zgartirilmadi', col_type;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Dublikatlarni to'sish
--
--    Kalit sifatida `equipment_name` ishlatiladi, `equipment_id` emas —
--    chunki ilova aynan shu ustun bo'yicha solishtiradi:
--      WorkerTasksModal:  dbScans.find(s => s.equipment_name === expectedQR)
--      currentScans:      dbScans.map(s => s.equipment_name)
--    Bu tanlov eski (uuid formatidagi equipment_id li) qatorlar uchun ham
--    to'g'ri ishlaydi.
--
--    Indeks yaratishdan OLDIN mavjud dublikatlar tozalanadi: har guruhdan
--    eng ERTA skaner (birinchi haqiqiy skaner) qoldiriladi, keyingilari
--    o'chiriladi. Bu xavfsiz — ular allaqachon UI'da bitta qator sifatida
--    ko'rsatilgan, faqat hisobni buzib turgan edi.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT 1
    FROM public.task_scans
    GROUP BY station_id, task_nsh, task_date, equipment_name
    HAVING COUNT(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE NOTICE '% ta dublikat guruh topildi — eng ertasidan boshqasi o''chiriladi', dup_count;

    DELETE FROM public.task_scans t
    USING (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY station_id, task_nsh, task_date, equipment_name
               ORDER BY scanned_at ASC, id ASC
             ) AS rn
      FROM public.task_scans
    ) ranked
    WHERE t.id = ranked.id
      AND ranked.rn > 1;

    RAISE NOTICE 'Dublikatlar tozalandi';
  ELSE
    RAISE NOTICE 'Dublikat topilmadi';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS task_scans_unique_scan
  ON public.task_scans (station_id, task_nsh, task_date, equipment_name);

-- ─────────────────────────────────────────────────────────────────────
-- 4. So'rov indeksi
--    getTaskScans() va getStationTaskScans() aynan shu ustunlar bo'yicha
--    filtrlaydi. 3-banddagi unique indeks (station_id, task_nsh, task_date)
--    prefiksini allaqachon qoplaydi, shuning uchun faqat "bekat bo'yicha
--    oxirgi skanerlar" (skaner tarixi tabi) uchun alohida indeks qo'shamiz.
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS task_scans_station_recent
  ON public.task_scans (station_id, scanned_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 5. Tekshiruv — natijani SQL Editor'da ko'rasiz
-- ─────────────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.task_scans)                       AS jami_skanerlar,
  (SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_scans'
      AND column_name = 'equipment_id')                          AS equipment_id_turi,
  (SELECT COUNT(*) FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'task_scans'
      AND indexname = 'task_scans_unique_scan')                  AS unique_indeks_bormi;
