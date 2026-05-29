-- 027_resources_multi_website.sql
--
-- Turns the single website into a repeatable list,
-- matching contacts and social_urls.

ALTER TABLE resources
  ADD COLUMN websites JSONB NOT NULL DEFAULT '[]';

-- Migrate the existing single website into the array
UPDATE resources
SET websites = jsonb_build_array(website)
WHERE website IS NOT NULL
  AND website <> '';

ALTER TABLE resources DROP COLUMN website;
