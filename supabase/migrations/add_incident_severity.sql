-- Baxtsiz hodisalarga og'irlik darajasi (severity) ustuni qo'shish.
-- Eski yozuvlarda bu maydon bo'sh (NULL) qoladi — ular kiritilgan paytda
-- bu tasnif hali mavjud bo'lmagan. Yangi yozuvlar uchun ilova (IncidentAdminView)
-- severity tanlanishini majburiy qiladi.
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS severity TEXT
  CHECK (severity IS NULL OR severity IN ('olim', 'ogir', 'orta_ogir', 'yengil'));
