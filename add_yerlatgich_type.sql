-- Avvalgi cheklovni o'chiramiz
ALTER TABLE station_journals DROP CONSTRAINT IF EXISTS station_journals_journal_type_check;

-- Yangi cheklovni qo'shamiz ('yerlatgich' bilan birga)
ALTER TABLE station_journals ADD CONSTRAINT station_journals_journal_type_check CHECK (journal_type IN ('du46', 'shu2', 'alsn', 'yerlatgich'));
