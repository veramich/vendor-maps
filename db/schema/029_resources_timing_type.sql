-- 029_resources_timing_type.sql
--
-- Distinguishes the *kind* of timing a resource has,
-- so the card and form can phrase dates correctly:
--   deadline  — a single last day (e.g. grant apply-by)
--   range     — runs across start..end (e.g. 3-day seminar)
--   window    — applications open then close (start..end)
--   always    — no dates (always available)
--
-- All four still map onto the existing start_date /
-- end_date / always_available columns, so the expiry
-- logic (expires_at, generated from end_date) is
-- unchanged.

ALTER TABLE resources
  ADD COLUMN timing_type TEXT NOT NULL DEFAULT 'deadline'
    CHECK (timing_type IN ('deadline', 'range', 'window', 'always'));

-- Backfill existing rows from their current dates:
--   always_available           -> 'always'
--   has a start AND end date    -> 'range'
--   end date only (no start)    -> 'deadline'
UPDATE resources
SET timing_type = CASE
  WHEN always_available THEN 'always'
  WHEN start_date IS NOT NULL AND end_date IS NOT NULL THEN 'range'
  ELSE 'deadline'
END;

-- Keep timing_type consistent with the date columns.
ALTER TABLE resources
  ADD CONSTRAINT resources_timing_type_dates CHECK (
    (timing_type = 'always'
      AND always_available
      AND start_date IS NULL
      AND end_date IS NULL)
    OR
    (timing_type = 'deadline'
      AND NOT always_available
      AND start_date IS NULL
      AND end_date IS NOT NULL)
    OR
    (timing_type IN ('range', 'window')
      AND NOT always_available
      AND start_date IS NOT NULL
      AND end_date IS NOT NULL)
  );
