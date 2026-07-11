-- =====================================================================
-- 1) get_worker_pending_counts RPC
--    lib/supabase-db.ts dagi getPendingJournalCounts client-side mantiqʼining
--    AYNAN nusxasi — hisob endi serverda bajariladi, jurnalning to'liq
--    `entries` massivi klientga tortilmaydi (payload: butun jurnal → 2 raqam).
--
--    Klient kodi RPC-first ishlaydi: bu SQL hali ishga tushirilmagan bo'lsa,
--    eski client-side hisob avtomatik davom etadi (hech narsa buzilmaydi).
--
-- 2) task_scans jadvalini realtime publication'ga qo'shish
--    (WorkerTasksModal endi 5s polling o'rniga realtime'ga obuna bo'ladi).
--
-- Supabase Dashboard → SQL Editor da bir marta ishga tushiring.
-- =====================================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- ─────────────────────────────────────────────────────────────────────
-- JS truthiness (agar qiymat bo'lmasa/null bo'lsa false; bo'sh satr false;
-- 'false' SATRI esa JS'dagidek TRUE — chunki bo'sh bo'lmagan satr truthy)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _js_truthy(v jsonb)
RETURNS boolean AS $$
  SELECT CASE jsonb_typeof(v)
    WHEN 'boolean' THEN v::text = 'true'
    WHEN 'string'  THEN (v #>> '{}') <> ''
    WHEN 'number'  THEN (v #>> '{}')::numeric <> 0
    WHEN 'array'   THEN true
    WHEN 'object'  THEN true
    ELSE false
  END;
$$ LANGUAGE sql IMMUTABLE;

-- ─────────────────────────────────────────────────────────────────────
-- DU-46: keyingi tasdiqlashi kerak bo'lgan rol (faqat 'DSP' natijasi
-- bekat_navbatchisi uchun ishlatiladi) — JS getNextRole() nusxasi
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _du46_next_role(e jsonb, col integer)
RETURNS text AS $$
DECLARE
  worker_roles text[] := ARRAY['worker','elektromexanik','elektromontyor','katta_elektromexanik'];
  chain jsonb := COALESCE(e->'approvalChain', '[]'::jsonb);
  approvals jsonb;
  creator text := COALESCE(NULLIF(e->>'createdByRole', ''), 'worker');
  writer text;
  participants text[] := '{}';
  c text;
  r text;
  matched boolean;
BEGIN
  IF col = 3 THEN
    IF NOT _js_truthy(e->'kamchilikBajarildi') THEN RETURN NULL; END IF;
    approvals := COALESCE(e->'approvalsCol3', '[]'::jsonb);

    IF jsonb_array_length(approvals) < jsonb_array_length(chain) THEN
      RETURN chain->>jsonb_array_length(approvals);
    END IF;
    -- Bekat boshlig'i ham bekat navbatchisi tomonidan tasdiqlanadi
    IF NOT _js_truthy(e->'kamchilikBBTasdiqladi') THEN RETURN 'DSP'; END IF;
    RETURN NULL;
  ELSE
    IF NOT _js_truthy(e->'bartarafBajarildi') THEN RETURN NULL; END IF;
    approvals := COALESCE(e->'approvalsCol12', '[]'::jsonb);

    -- col3Participants = {creator} ∪ chain (kiritish tartibi saqlanadi)
    participants := ARRAY[creator];
    FOR c IN SELECT jsonb_array_elements_text(chain) LOOP
      IF NOT (c = ANY(participants)) THEN
        participants := participants || c;
      END IF;
    END LOOP;

    writer := COALESCE(NULLIF(e->>'bartarafByRole', ''), creator);

    -- requiredChainFor12 = participants \ {writer}; birinchi tasdiqlamagan rol
    FOREACH r IN ARRAY participants LOOP
      IF r = writer THEN CONTINUE; END IF;
      SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(approvals) a
        WHERE (r = 'worker' AND (a->>'role') = ANY(worker_roles))
           OR (a->>'role') = r
      ) INTO matched;
      IF NOT matched THEN RETURN r; END IF;
    END LOOP;

    -- Faqat bekat_navbatchisi o'zi "Tugadi" bossa, qayta tasdiqlamaydi
    IF writer <> 'bekat_navbatchisi' AND NOT _js_truthy(e->'bartarafBBTasdiqladi') THEN
      RETURN 'DSP';
    END IF;
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─────────────────────────────────────────────────────────────────────
-- DU-46: berilgan (navbatchi bo'lmagan) rol shu ustunda tasdiqlashi
-- kutilyaptimi — JS checkCol() nusxasi
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _du46_check_col(e jsonb, col integer, user_role text)
RETURNS boolean AS $$
DECLARE
  worker_roles text[] := ARRAY['worker','elektromexanik','elektromontyor','katta_elektromexanik'];
  chain text[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(e->'approvalChain', '[]'::jsonb)));
  approvals jsonb;
  creator text := COALESCE(NULLIF(e->>'createdByRole', ''), 'worker');
  writer text;
  participants text[] := '{}';
  c text;
  is_participant boolean := false;
BEGIN
  IF col = 3 THEN
    IF NOT _js_truthy(e->'kamchilikBajarildi') THEN RETURN false; END IF;
    approvals := COALESCE(e->'approvalsCol3', '[]'::jsonb);

    is_participant := user_role = ANY(chain)
      OR (user_role = 'katta_elektromexanik' AND 'worker' = ANY(chain));
  ELSE
    IF NOT _js_truthy(e->'bartarafBajarildi') THEN RETURN false; END IF;
    approvals := COALESCE(e->'approvalsCol12', '[]'::jsonb);

    -- Diqqat: JS'da bu yerda creator faqat bekat_boshlighi BO'LMASA qo'shiladi
    IF creator <> 'bekat_boshlighi' THEN
      participants := participants || creator;
    END IF;
    FOREACH c IN ARRAY chain LOOP
      IF NOT (c = ANY(participants)) THEN
        participants := participants || c;
      END IF;
    END LOOP;

    writer := COALESCE(NULLIF(e->>'bartarafByRole', ''), creator);
    IF writer = ANY(worker_roles) THEN
      participants := ARRAY(SELECT x FROM unnest(participants) x WHERE NOT (x = ANY(worker_roles)));
    ELSE
      participants := ARRAY(SELECT x FROM unnest(participants) x WHERE x <> writer);
    END IF;

    is_participant := user_role = ANY(participants)
      OR (user_role IN ('elektromexanik','elektromontyor','katta_elektromexanik')
          AND 'worker' = ANY(participants));
  END IF;

  IF is_participant THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(approvals) a
      WHERE (a->>'role') = user_role
         OR (user_role = ANY(worker_roles) AND (a->>'role') = ANY(worker_roles))
    );
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─────────────────────────────────────────────────────────────────────
-- ASOSIY RPC: bekat bo'yicha DU-46/SHU-2 pending sonlari
-- Har doim aynan BITTA qator qaytaradi (jurnal bo'lmasa 0,0).
-- SECURITY INVOKER (default) — RLS siyosatlari amal qiladi.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worker_pending_counts(
  p_station_id text,
  p_role text,
  p_position text DEFAULT NULL
)
RETURNS TABLE (du46_count integer, shu2_count integer) AS $$
DECLARE
  rec RECORD;
  e jsonb;
  v_user_role text := COALESCE(NULLIF(p_position, ''), p_role);
  v_du46 integer := 0;
  v_shu2 integer := 0;
  v_cnt integer;
BEGIN
  FOR rec IN
    SELECT journal_type, entries
    FROM station_journals
    WHERE station_id = p_station_id
      AND journal_type IN ('du46', 'shu2')
  LOOP
    IF rec.journal_type = 'shu2' THEN
      -- SHU-2: worker dispetcher qabul qilishini kutadi
      IF p_role IN ('worker', 'elektromexanik', 'elektromontyor') THEN
        SELECT count(*)::integer INTO v_cnt
        FROM jsonb_array_elements(COALESCE(rec.entries, '[]'::jsonb)) AS e2
        WHERE _js_truthy(e2->'yuborildi')
          AND NOT _js_truthy(e2->'dispetcherQabulQildi');
        v_shu2 := v_shu2 + COALESCE(v_cnt, 0);
      END IF;
    ELSE
      FOR e IN SELECT * FROM jsonb_array_elements(COALESCE(rec.entries, '[]'::jsonb))
      LOOP
        IF _js_truthy(e->'yuborildi') THEN CONTINUE; END IF;

        IF v_user_role = 'bekat_navbatchisi' THEN
          IF _du46_next_role(e, 3) = 'DSP' OR _du46_next_role(e, 12) = 'DSP' THEN
            v_du46 := v_du46 + 1;
          END IF;
        ELSE
          IF _du46_check_col(e, 3, v_user_role) OR _du46_check_col(e, 12, v_user_role) THEN
            v_du46 := v_du46 + 1;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_du46, v_shu2;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────────
-- task_scans → realtime publication (WorkerTasksModal realtime obunasi uchun)
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'task_scans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_scans;
    RAISE NOTICE 'task_scans jadvaliga realtime qo''shildi';
  ELSE
    RAISE NOTICE 'task_scans allaqachon realtime da bor';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- TEKSHIRUV (ixtiyoriy): natija client-side hisob bilan bir xilligini
-- solishtirish uchun namunaviy chaqiruv:
--   SELECT * FROM get_worker_pending_counts('st_7', 'worker', 'katta_elektromexanik');
-- ─────────────────────────────────────────────────────────────────────
