-- Anchor date for recurring market schedules: the vendor-picked next/first
-- occurrence. Required to resolve biweekly cadence (which has no other phase
-- reference) and lets us show exact next dates for weekly/monthly too.
-- Nullable: pre-existing rows fall back to weekday-only recurrence.
ALTER TABLE market_schedules
ADD COLUMN anchor_date DATE;
