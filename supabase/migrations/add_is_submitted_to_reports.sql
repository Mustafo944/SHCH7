-- =====================================================
-- work_reports: draft (avtosaqlangan) vs yuborilgan rejani ajratish
-- =====================================================
-- Muammo: avtosaqlash ham, "Yuborish" tugmasi ham bir xil upsert
-- qilardi — dispetcher hali yuborilmagan draft rejani ham ko'rardi.
--
-- Yechim: `is_submitted` bayrog'i. Faqat "Yuborish" bosilganda `true`
-- bo'ladi. Avtosaqlash bu ustunga tegmaydi (mavjud qiymat saqlanadi).
-- Dispetcher so'rovlari faqat `is_submitted = true` yozuvlarni oladi.
-- =====================================================

alter table public.work_reports
  add column if not exists is_submitted boolean not null default false;

-- Backfill: eski yozuvlarda draft/yuborilgan farqi saqlanmagan edi.
-- Faqat ANIQ yuborilgan rejalarni (dispetcher tasdiqlagan yoki rad etgan)
-- "yuborilgan" deb belgilaymiz — ular ko'rinishda qoladi.
-- Qolgan (hech qachon tasdiqlanmagan/rad etilmagan) yozuvlar draft
-- sifatida `false` bo'lib qoladi va dispetcherga ko'rinmaydi; xodim
-- ularni "Yuborish" tugmasi bilan qayta yuborishi kerak.
--
-- ⚠️ Agar hozir dispetcher tasdiqlashini kutayotgan HAQIQIY (yuborilgan,
--    lekin hali tasdiqlanmagan) rejalaringiz bo'lsa, quyidagi shartni
--    `where true` ga o'zgartiring — shunda hammasi ko'rinishda qoladi.
update public.work_reports
set is_submitted = true
where confirmed_at is not null or rejected_at is not null;

-- Dispetcher pending so'rovi tez ishlashi uchun indeks
create index if not exists idx_work_reports_submitted
  on public.work_reports (is_submitted)
  where is_submitted = true;
