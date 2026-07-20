-- =====================================================================
-- DU-46 "_du46_next_role" ni UI (DU46JournalView.tsx) bilan SINXRONLASH
-- =====================================================================
-- MUAMMO: bosh sahifadagi "kutilmoqda" belgisi (badge) uchun ishlatiladigan
-- bu SQL funksiya JS tomonidagi ESKIROQ mantiqning qo'lda ko'chirmasi edi
-- (add_worker_pending_rpc_and_task_scans_realtime.sql, 36-37 qatorlardagi
-- izohga qarang: "JS getNextRole() nusxasi"). Shu orada UI'dagi asosiy
-- hisob-kitob (endi lib/journals/du46Approval.ts, avval DU46JournalView.tsx
-- ichida) ikkita holat uchun tuzatilgan edi, lekin bu funksiyaga
-- ko'chirilmagan edi:
--
--   1) Creator bekat_navbatchisi bo'lsa, 3-ustunda ham DSP tasdig'i talab
--      qilinmasligi kerak (ular allaqachon DSP'ning o'zi) — bu tekshiruv
--      SQL'da butunlay yo'q edi.
--   2) "Tugadi" bosgan odam creator bilan ISM bo'yicha ham solishtirilishi
--      kerak (createdByRole ko'pincha umumiy 'worker' bo'lib saqlanadi,
--      tugatgan xodim esa aniq rol bilan — masalan 'katta_elektromexanik' —
--      shuning uchun faqat rol solishtirish yetarli emas).
--   3) bekat_navbatchisi 12-ustun tasdiqlash zanjiriga oddiy a'zo sifatida
--      kiritilmasligi kerak (u alohida, eng oxirida 'DSP' sifatida
--      tasdiqlaydi) — SQL'da bu bekat_boshlighi uchun bor edi, lekin
--      bekat_navbatchisi uchun yo'q edi.
--
-- Bu farqlar bosh sahifadagi qizil "kutilmoqda" belgisini haqiqiy holatga
-- mos kelmasligiga olib kelishi mumkin edi (masalan, bekat navbatchisi
-- o'zi yozgan yozuv uchun ham unga noto'g'ri "sizga tasdiqlash kerak"
-- ko'rsatilishi mumkin edi).
--
-- MUHIM: bu faylni Supabase Dashboard → SQL Editor'da bir marta qo'lda
-- ishga tushiring (loyihada avtomatik migratsiya CI yo'q — boshqa
-- migratsiya fayllari ham shu tarzda qo'llanilgan).
--
-- Kelajakda lib/journals/du46Approval.ts dagi getNextApproverRole
-- o'zgartirilsa, bu funksiya ham QO'LDA shu bilan sinxronlanishi kerak
-- (uchinchi mustaqil nusxa yaratmaslik uchun ikkalasini yonma-yon o'qib
-- chiqing).
-- =====================================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';

CREATE OR REPLACE FUNCTION _du46_next_role(e jsonb, col integer)
RETURNS text AS $$
DECLARE
  worker_roles text[] := ARRAY['worker','elektromexanik','elektromontyor','katta_elektromexanik'];
  chain jsonb := COALESCE(e->'approvalChain', '[]'::jsonb);
  approvals jsonb;
  creator text := COALESCE(NULLIF(e->>'createdByRole', ''), 'worker');
  tugadi_role text;
  tugadi_name text;
  creator_name text;
  creator_is_tugadi_presser boolean;
  required_approvers text[] := '{}';
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

    -- Creator bekat_navbatchisi bo'lsa, u DSP tasdig'iga muhtoj emas
    IF creator = 'bekat_navbatchisi' THEN RETURN NULL; END IF;

    -- Boshqalar yaratgan bo'lsa bekat navbatchisi tomonidan tasdiqlanadi
    IF NOT _js_truthy(e->'kamchilikBBTasdiqladi') THEN RETURN 'DSP'; END IF;
    RETURN NULL;
  ELSE
    IF NOT _js_truthy(e->'bartarafBajarildi') THEN RETURN NULL; END IF;
    approvals := COALESCE(e->'approvalsCol12', '[]'::jsonb);

    tugadi_role := COALESCE(NULLIF(e->>'bartarafByRole', ''), creator);
    tugadi_name := COALESCE(e->>'bartarafImzo', '');
    creator_name := COALESCE(e->>'kamchilikImzo', '');

    -- "Tugadi" bosgan odam = creator mi? (ism orqali ham, chunki
    -- createdByRole ko'pincha umumiy 'worker' ga map qilingan)
    creator_is_tugadi_presser :=
      (creator = tugadi_role) OR
      (creator_name <> '' AND tugadi_name <> '' AND creator_name = tugadi_name);

    -- requiredApprovers = (creator, agar Tugadi bosmagan va bekat_navbatchisi
    -- bo'lmasa) ∪ (chain a'zolari, Tugadi bosgan roldan boshqalari)
    IF NOT creator_is_tugadi_presser AND creator <> 'bekat_navbatchisi' THEN
      required_approvers := required_approvers || creator;
    END IF;

    FOR c IN SELECT jsonb_array_elements_text(chain) LOOP
      IF c <> tugadi_role AND NOT (c = ANY(required_approvers)) THEN
        required_approvers := required_approvers || c;
      END IF;
    END LOOP;

    FOREACH r IN ARRAY required_approvers LOOP
      SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(approvals) a
        WHERE (r = ANY(worker_roles) AND (a->>'role') = ANY(worker_roles))
           OR (a->>'role') = r
      ) INTO matched;
      IF NOT matched THEN RETURN r; END IF;
    END LOOP;

    -- Faqat bekat_navbatchisi o'zi "Tugadi" bossa, qayta tasdiqlamaydi
    IF tugadi_role <> 'bekat_navbatchisi' AND NOT _js_truthy(e->'bartarafBBTasdiqladi') THEN
      RETURN 'DSP';
    END IF;
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ROLLBACK (agar tuzatish muammo keltirib chiqarsa, eski versiyaga qaytarish
-- uchun add_worker_pending_rpc_and_task_scans_realtime.sql dagi asl
-- funksiyani qayta ishga tushiring).
