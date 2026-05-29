-- 026_resources_address_and_multi.sql
--
-- Adds an optional address to resources (used to
-- filter the list by city / state) and turns the
-- single contact and social link into repeatable
-- lists.

-- 1. Optional address
-- street_address / city / state are all optional —
-- online only resources (e.g. a grant portal) carry
-- none of them. latitude / longitude come from the
-- HERE geocode when a real place is picked.
ALTER TABLE resources
  ADD COLUMN street_address TEXT,
  ADD COLUMN city           TEXT,
  ADD COLUMN state          TEXT,
  ADD COLUMN state_code     TEXT,
  ADD COLUMN latitude       DOUBLE PRECISION,
  ADD COLUMN longitude      DOUBLE PRECISION;

-- 2. Multiple contacts
-- each entry is a single free-text line, e.g.
-- "Maria · (555) 123-4567" or "grants@city.gov".
ALTER TABLE resources
  ADD COLUMN contacts JSONB NOT NULL DEFAULT '[]';

-- Migrate the existing single contact into the array
UPDATE resources
SET contacts = jsonb_build_array(contact)
WHERE contact IS NOT NULL
  AND contact <> '';

ALTER TABLE resources DROP COLUMN contact;

-- 3. Multiple social media posts
-- each entry is a URL string.
ALTER TABLE resources
  ADD COLUMN social_urls JSONB NOT NULL DEFAULT '[]';

UPDATE resources
SET social_urls = jsonb_build_array(social_url)
WHERE social_url IS NOT NULL
  AND social_url <> '';

ALTER TABLE resources DROP COLUMN social_url;

-- 4. Indexes for city / state filtering
CREATE INDEX resources_city_idx
ON resources(city);

CREATE INDEX resources_state_code_idx
ON resources(state_code);
