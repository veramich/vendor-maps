-- 028_resources_delivery_mode.sql
--
-- Adds how a resource is delivered: online, in
-- person, or both. Powers an "Online or in person"
-- filter on the resources page.

ALTER TABLE resources
  ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'both'
    CHECK (delivery_mode IN ('online', 'in_person', 'both'));

-- Best-effort backfill for existing rows: a resource
-- with a sign-up link but no address looks online;
-- one with an address looks in person. Everything
-- else stays 'both' (the default).
UPDATE resources
SET delivery_mode = 'in_person'
WHERE city IS NOT NULL AND city <> '';

UPDATE resources
SET delivery_mode = 'online'
WHERE (city IS NULL OR city = '')
  AND signup_url IS NOT NULL;

CREATE INDEX resources_delivery_mode_idx
ON resources(delivery_mode);
