ALTER TABLE station_journals DROP CONSTRAINT IF EXISTS station_journals_journal_type_check;
ALTER TABLE station_journals ADD CONSTRAINT station_journals_journal_type_check CHECK (journal_type IN ('du46', 'shu2', 'alsn', 'boshqa'));
