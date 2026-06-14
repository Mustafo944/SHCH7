-- role constraint ni yangilash
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('dispatcher', 'worker', 'bekat_boshlighi', 'elektromexanik', 'elektromontyor', 'bekat_navbatchisi', 'yul_ustasi', 'ech_xodimi', 'mehnat_muhofazasi'));

-- position constraint ni yangilash
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_position_check;

ALTER TABLE users
  ADD CONSTRAINT users_position_check
  CHECK (position IN ('katta_elektromexanik', 'bekat_boshlighi', 'dispatcher', 'elektromexanik', 'elektromontyor', 'bekat_navbatchisi', 'yul_ustasi', 'ech_xodimi', 'mehnat_muhofazasi'));
