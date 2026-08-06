-- ============================================================
-- SOFT DELETE: Ishchilarni butunlay o'chirish o'rniga arxivlash
-- ============================================================
-- Bu migratsiyani Supabase Dashboard > SQL Editor da ishga tushiring.
--
-- Nima qiladi:
-- 1. `users` jadvaliga `deleted_at` ustuni qo'shadi (NULL = faol, sana = arxivlangan)
-- 2. Mavjud so'rovlar buzilmaydi, chunki yangi ustun NULL default.
-- ============================================================

-- 1. Ustun qo'shish (agar allaqachon mavjud bo'lsa, xato bermaydi)
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Indeks: arxivlanmagan (faol) ishchilarni tez qidirish uchun
--    Partial index — faqat deleted_at IS NULL bo'lgan qatorlarga ta'sir qiladi.
CREATE INDEX IF NOT EXISTS idx_users_active ON users (id) WHERE deleted_at IS NULL;

-- 3. Agar photo_url ustuni hali yo'q bo'lsa (schema.sql eski versiyada yo'q):
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url text DEFAULT NULL;
