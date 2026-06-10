-- station_journals jadvali: DU-46 va SHU-2 jurnallari uchun
CREATE TABLE IF NOT EXISTS station_journals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id TEXT NOT NULL,
  journal_type TEXT NOT NULL CHECK (journal_type IN ('du46', 'shu2')),
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT NOT NULL DEFAULT '',
  UNIQUE (station_id, journal_type)
);

-- RLS yoqish
ALTER TABLE station_journals ENABLE ROW LEVEL SECURITY;

-- Barcha autentifikatsiya qilingan foydalanuvchilar uchun to'liq ruxsat
CREATE POLICY "Allow all for authenticated" ON station_journals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
