-- 042_business_reports.sql
-- Created: 2026-08-02
-- Description: Let any visitor flag a listing that is no longer in service (or
--   otherwise wrong) so an admin can review and take it down.
--
-- Why this exists separately from the owner archive (041):
--   Archiving is submitter-only and acts immediately, because the submitter is
--   acting on their own listing. A report is the opposite: it comes from
--   someone with no claim to the listing, so it must NOT change what the public
--   sees. It only queues a signal for an admin. A vendor's livelihood is on the
--   line — a stranger must never be able to take a business off the map, which
--   would otherwise be a trivial griefing vector.
--
-- reported_by is nullable: reports are open to logged-out visitors, since the
-- person who walked up to a closed storefront usually has no account. That
-- makes abuse control necessary, hence reporter_ip and the partial unique index
-- below.

CREATE TABLE IF NOT EXISTS business_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  business_id   UUID NOT NULL REFERENCES businesses(id)
                ON DELETE CASCADE,

  -- What the reporter says is wrong. 'closed' is the headline case (the
  -- "no longer in service" button); the rest let one flow cover the other
  -- things people report so we don't need a new table per reason.
  reason        TEXT NOT NULL DEFAULT 'closed'
    CHECK (reason IN (
      'closed',
      'moved',
      'wrong_info',
      'duplicate',
      'inappropriate',
      'other'
    )),

  -- Optional free-text detail from the reporter.
  details       TEXT,

  -- Better Auth user id when signed in; NULL for anonymous reports.
  reported_by   TEXT,
  reporter_ip   TEXT,

  -- Moderation state. 'open' until an admin looks at it.
  --   accepted → the report was right and the listing was acted on
  --   dismissed → the listing is fine, no action taken
  status        TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'accepted', 'dismissed')),

  -- Admin who resolved it, and any note for the record.
  resolved_by   TEXT,
  resolution_note TEXT,

  created_at    TIMESTAMP DEFAULT NOW(),
  resolved_at   TIMESTAMP
);

-- The admin queue reads open reports newest-first.
CREATE INDEX IF NOT EXISTS business_reports_open_idx
  ON business_reports (created_at DESC)
  WHERE status = 'open';

-- Counting how many people flagged one business ("3 reports") and showing them
-- together on the review screen.
CREATE INDEX IF NOT EXISTS business_reports_business_idx
  ON business_reports (business_id);

-- Abuse control: one OPEN report per signed-in user per business. Partial so
-- that a resolved report doesn't block a genuine new one later (a business can
-- close, reopen, and close again). Anonymous reports are rate-limited by IP in
-- the route instead, since NULL never conflicts in a unique index.
CREATE UNIQUE INDEX IF NOT EXISTS business_reports_one_open_per_user_idx
  ON business_reports (business_id, reported_by)
  WHERE status = 'open' AND reported_by IS NOT NULL;
