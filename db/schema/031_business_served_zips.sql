-- Served zip codes for directory-only (no_location) businesses.
-- These businesses have no location row and therefore no single zip; a
-- small bounded list (up to ~5) of the zip codes they serve lives here on
-- the business itself. NULL/empty for located businesses and events.
ALTER TABLE businesses
  ADD COLUMN served_zips TEXT[];
