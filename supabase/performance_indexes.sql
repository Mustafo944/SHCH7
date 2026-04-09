-- =====================================================
-- PERFORMANCE INDEX-LAR
-- Barcha query-larni tezlashtiradi
-- =====================================================

-- work_reports: submitted_at bo'yicha tartiblash
CREATE INDEX IF NOT EXISTS idx_work_reports_submitted_at
  ON work_reports (submitted_at DESC);

-- work_reports: (worker_id, month) — worker hisobotlari
CREATE INDEX IF NOT EXISTS idx_work_reports_worker_month
  ON work_reports (worker_id, month DESC);

-- work_reports: (station_id, submitted_at) — stansiya hisobotlari
CREATE INDEX IF NOT EXISTS idx_work_reports_station_submitted
  ON work_reports (station_id, submitted_at DESC);

-- work_reports: confirmed_at IS NULL filter
CREATE INDEX IF NOT EXISTS idx_work_reports_pending
  ON work_reports (station_id) WHERE confirmed_at IS NULL;

-- premiya_reports: submitted_at bo'yicha tartiblash
CREATE INDEX IF NOT EXISTS idx_premiya_reports_submitted_at
  ON premiya_reports (submitted_at DESC);

-- premiya_reports: (worker_id, month) — worker premiyalari
CREATE INDEX IF NOT EXISTS idx_premiya_reports_worker_month
  ON premiya_reports (worker_id, month DESC);

-- premiya_reports: (station_id, submitted_at) — stansiya premiyalari
CREATE INDEX IF NOT EXISTS idx_premiya_reports_station_submitted
  ON premiya_reports (station_id, submitted_at DESC);

-- premiya_reports: confirmed_at IS NULL filter
CREATE INDEX IF NOT EXISTS idx_premiya_reports_pending
  ON premiya_reports (station_id) WHERE confirmed_at IS NULL;

-- station_journals: updated_at DESC — eng yangi jurnallar
CREATE INDEX IF NOT EXISTS idx_station_journals_updated
  ON station_journals (updated_at DESC);

-- station_journals: station_id — stansiya bo'yicha qidirish
CREATE INDEX IF NOT EXISTS idx_station_journals_station
  ON station_journals (station_id);

-- users: role + created_at — worker/dispatcher ro'yxati
CREATE INDEX IF NOT EXISTS idx_users_role_created
  ON users (role, created_at);

-- station_schemas: station_id — stansiya sxemalari
CREATE INDEX IF NOT EXISTS idx_station_schemas_station
  ON station_schemas (station_id, uploaded_at DESC);
