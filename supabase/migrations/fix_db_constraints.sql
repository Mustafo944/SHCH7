-- 1. work_reports jadvalidagi eski cheklovni topib o'chirish
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_reports_worker_month_unique'
  ) THEN
    ALTER TABLE work_reports DROP CONSTRAINT work_reports_worker_month_unique;
  END IF;
END $$;

-- Yangi "ishchi + oy + bekat" uchun cheklov qo'shish
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_reports_worker_month_station_unique'
  ) THEN
    ALTER TABLE work_reports ADD CONSTRAINT work_reports_worker_month_station_unique UNIQUE (worker_id, month, station_id);
  END IF;
END $$;

-- 2. premiya_reports jadvalidagi eski cheklovni topib o'chirish
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'premiya_reports_worker_month_unique'
  ) THEN
    ALTER TABLE premiya_reports DROP CONSTRAINT premiya_reports_worker_month_unique;
  END IF;
END $$;

-- Yangi "ishchi + oy + bekat" uchun cheklov qo'shish (premiya)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'premiya_reports_worker_month_station_unique'
  ) THEN
    ALTER TABLE premiya_reports ADD CONSTRAINT premiya_reports_worker_month_station_unique UNIQUE (worker_id, month, station_id);
  END IF;
END $$;

-- Natijani tekshirish (ixtiyoriy)
-- Ikkala jadvalda ham yangi cheklovlar ishlashi kerak.
