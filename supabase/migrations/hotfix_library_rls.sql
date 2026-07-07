-- =====================================================================
-- HOTFIX: Elektron kutubxona RLS tufayli "bo'sh" ko'rinishi
-- =====================================================================
-- SABAB: tighten_rls_station_scoped.sql ishga tushirilgandan keyin,
-- "Kutubxona" (LibraryView.tsx) bo'sh ko'rina boshladi. Sababi: kutubxona
-- kitoblari ALOHIDA jadvalda emas — station_schemas jadvalida maxsus
-- station_id = 'global_library_books' bilan saqlanadi
-- (lib/supabase-db.ts: LIBRARY_BOOKS_STATION_ID). Bu qiymat hech bir
-- foydalanuvchining users.station_ids massivida yo'q, shuning uchun
-- avvalgi "station_schemas_select_scoped" siyosati dispatcher bo'lmagan
-- barcha rollar uchun bu qatorlarni bloklab qo'ygan edi.
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
  );
