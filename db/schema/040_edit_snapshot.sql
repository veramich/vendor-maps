-- 040_edit_snapshot.sql
-- Created: 2026-07-26
-- Description: Capture the pre-edit state of a live listing so the admin
--   moderation queue can show a field-by-field old→new comparison.
--
-- When a user edits an already-listed business, the edit route overwrites the
-- businesses row in place and flips status back to 'pending' (see
-- app/api/user/submissions/[id]/route.ts). That means the previously-live
-- values are gone by the time an admin reviews the change — there is nothing to
-- diff against. This snapshot column preserves a JSON copy of the full listing
-- state (business fields + location + hours + images + vendor spaces/fees +
-- event dates) taken immediately before the update is applied.
--
-- Semantics:
--   * edit_snapshot IS NOT NULL  → this pending item is an EDIT of a listing
--     that was previously live; the JSON holds the old values to compare.
--   * edit_snapshot IS NULL      → a brand-new submission (nothing to diff).
-- The snapshot is cleared when the edit is resolved (approve / reject /
-- duplicate) so it never lingers on a live listing.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS edit_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS edited_at     TIMESTAMP;
