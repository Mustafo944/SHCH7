CREATE TABLE station_equipments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id text NOT NULL UNIQUE,
  equipment_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by_name text
);

ALTER TABLE station_equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select" ON station_equipments FOR SELECT USING (true);
CREATE POLICY "Public insert" ON station_equipments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON station_equipments FOR UPDATE USING (true);
