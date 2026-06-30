CREATE OR REPLACE FUNCTION get_dispatcher_journal_summary()
RETURNS TABLE (station_id uuid, journal_type text, pending_count integer) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sj.station_id, 
    sj.journal_type, 
    (
      SELECT count(*)::integer 
      FROM jsonb_array_elements(sj.entries) AS e 
      WHERE (e->>'yuborildi')::boolean = true AND (e->>'dispetcherQabulQildi')::boolean IS NOT true
    ) AS pending_count
  FROM station_journals sj
  WHERE sj.journal_type IN ('du46', 'shu2');
END;
$$ LANGUAGE plpgsql;
