-- Drop premiya reports completely
DROP TABLE IF EXISTS premiya_reports;

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_name TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Policies for incidents
CREATE POLICY "Public read access for incidents"
    ON incidents FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated to insert incidents"
    ON incidents FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to update incidents"
    ON incidents FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to delete incidents"
    ON incidents FOR DELETE
    USING (auth.role() = 'authenticated');

-- Create incident_reads table
CREATE TABLE IF NOT EXISTS incident_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(incident_id, worker_id)
);

-- Enable RLS
ALTER TABLE incident_reads ENABLE ROW LEVEL SECURITY;

-- Policies for incident_reads
CREATE POLICY "Public read access for incident_reads"
    ON incident_reads FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated to insert incident_reads"
    ON incident_reads FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to update incident_reads"
    ON incident_reads FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to delete incident_reads"
    ON incident_reads FOR DELETE
    USING (auth.role() = 'authenticated');

-- Drop old views/functions related to premiya if any (optional, assuming none specifically created outside standard queries)
