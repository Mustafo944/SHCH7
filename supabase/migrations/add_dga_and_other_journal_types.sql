-- Eski cheklovni topib o'chiramiz
ALTER TABLE station_journals DROP CONSTRAINT IF EXISTS station_journals_journal_type_check;

-- Yangi cheklovni qo'shamiz (barcha turlarni, jumladan dgaNazorat, alsnKod, mpsFriksion ni qo'shib)
ALTER TABLE station_journals ADD CONSTRAINT station_journals_journal_type_check 
CHECK (journal_type IN ('du46', 'shu2', 'boshqa', 'alsn', 'yerlatgich', 'alsnKod', 'mpsFriksion', 'dgaNazorat'));
