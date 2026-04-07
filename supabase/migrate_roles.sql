-- users jadvalidagi station_id ustunini station_ids massivga o'zgartirish
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS station_ids text[] DEFAULT '{}';

-- Eski station_id qiymatlarini yangi station_ids ga ko'chirish
UPDATE users
  SET station_ids = ARRAY[station_id]
  WHERE station_id IS NOT NULL AND (station_ids IS NULL OR station_ids = '{}');

-- role constraint ni yangilash
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('dispatcher', 'worker', 'bekat_boshlighi'));

-- position constraint ni yangilash
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_position_check;

ALTER TABLE users
  ADD CONSTRAINT users_position_check
  CHECK (position IN ('katta_elektromexanik', 'bekat_boshlighi'));

-- Dispatcher seed ni yangilash
UPDATE users
  SET station_ids = '{}'
  WHERE role = 'dispatcher' AND station_ids IS NULL;

-- station_schemas jadvalidagi cheklovni olib tashlash (har qanday nomga ruxsat berish uchun)
ALTER TABLE station_schemas
  DROP CONSTRAINT IF EXISTS station_schemas_schema_type_check;
