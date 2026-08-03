-- 041_owner_archive.sql
-- Created: 2026-08-02
-- Description: Let an owner take their own listing down without destroying it,
--   and record that they were the one who did it.
--
-- Two different removals exist, and conflating them loses data:
--
--   * A 'pending' submission that was never live is the submitter's own draft.
--     Nobody has reviewed it, nothing links to it, and no other user has
--     interacted with it — deleting the row outright is correct. Every
--     business_id child table (locations, hours, images, reviews, saves,
--     claims, ...) is ON DELETE CASCADE, so the row takes its dependents with
--     it. See the DELETE handler in app/api/user/submissions/[id]/route.ts.
--
--   * A listing that HAS been live may carry other people's content: reviews
--     written by other users and saves in their lists. Hard-deleting it would
--     silently erase that. Instead it flips to status='unlisted', which every
--     public surface already excludes (directory, map, events, search, saved,
--     reviews, sitemap all filter status='listed'), so the listing disappears
--     from the site while the associated content survives and the takedown
--     stays reversible.
--
-- 'unlisted' and unlisted_reason already exist (003_businesses.sql) but were
-- never written by application code — only an admin was ever meant to use
-- them. These columns record that an OWNER archived their own listing, which
-- distinguishes a self-service takedown from a moderation action and gives
-- support the "who/when" needed to restore it.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS unlisted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS unlisted_by TEXT;

-- Partial index: the archived set is small relative to the table, and the only
-- queries that touch it filter on the status first (an owner listing their own
-- archived items, support restoring one).
CREATE INDEX IF NOT EXISTS businesses_unlisted_by_idx
  ON businesses (unlisted_by)
  WHERE status = 'unlisted';
