-- 038_claims_updated_at.sql
-- Reconcile the committed schema with what already runs on the `dev` branch.
-- Two things existed on dev (applied directly to the DB) but were missing from
-- db/schema/*.sql, so a fresh schema build (e.g. the empty `production` branch
-- or the integration test branch) did NOT match dev:
--
--   1. claims.updated_at column. The claims_updated_at trigger (017_triggers.sql)
--      sets NEW.updated_at = NOW() on every UPDATE, but 014_claims.sql never
--      declared the column — so on a freshly-built schema, approving/rejecting a
--      claim errored: record "new" has no field "updated_at". (dev already had
--      the column, so live claims there were unaffected.)
--
--   2. claims_resolved_at trigger + update_claim_resolved_at() function, which
--      stamps resolved_at when a claim leaves 'pending'. Present on dev, absent
--      from the schema files entirely.
--
-- This migration is idempotent and safe to (re-)run on any branch, including
-- dev (where it is a no-op).

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE OR REPLACE FUNCTION update_claim_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected')
  AND OLD.status = 'pending' THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS claims_resolved_at ON claims;
CREATE TRIGGER claims_resolved_at
BEFORE UPDATE ON claims
FOR EACH ROW EXECUTE FUNCTION update_claim_resolved_at();
