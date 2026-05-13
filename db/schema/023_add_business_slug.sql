ALTER TABLE businesses
ADD COLUMN slug TEXT UNIQUE;

CREATE INDEX businesses_slug_idx
ON businesses(slug);