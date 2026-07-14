-- =====================================================================
-- HOTFIX: "Grafiklar" (Yillik/4-haftalik ish reja grafigi) RLS tufayli
-- xodimlarga "FAYL JOYLANMAGAN" bo'lib ko'rinishi
-- =====================================================================
-- SABAB: tighten_rls_station_scoped.sql ishga tushirilgandan keyin,
-- "Grafiklar" (WorkerGraphicsView.tsx) dispatcher bo'lmagan xodimlarga
-- bo'sh ko'rina boshladi. Sababi: bu fayllar ALOHIDA jadvalda emas —
-- station_schemas jadvalida maxsus station_id = 'global_graphics' bilan
-- saqlanadi (lib/supabase-db.ts: GLOBAL_GRAPHICS_STATION_ID). Bu qiymat
-- hech bir foydalanuvchining users.station_ids massivida yo'q, shuning
-- uchun "station_schemas_select_scoped" siyosati dispatcher bo'lmagan
-- barcha rollar uchun bu qatorlarni bloklab qo'ygan edi.
--
-- Bu aynan xuddi shu sabab bilan "Kutubxona" (global_library_books) uchun
-- allaqachon bir marta yuz bergan va hotfix_library_rls.sql bilan
-- tuzatilgan edi — o'sha safar "global_graphics" istisnosi qo'shilishi
-- unutilib qolgan.
--
-- Bu faylni Supabase SQL Editor'da ishga tushiring — faqat bitta
-- siyosatni (SELECT) qayta yaratadi, boshqa hech narsaga tegmaydi.
-- =====================================================================

DROP POLICY IF EXISTS "station_schemas_select_scoped" ON station_schemas;

CREATE POLICY "station_schemas_select_scoped" ON station_schemas
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'dispatcher'
    OR station_id = ANY(get_user_stations())
    OR station_id = 'global_library_books'
    OR station_id = 'global_graphics'
  );
