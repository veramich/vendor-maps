-- 036_wire_category_id.sql
--
-- Make businesses.category_id (added unused in 020) the real link to the
-- categories table. The app still passes category *names* around as display
-- text, so category stays as a denormalized cache; category_id is derived
-- from it by a trigger and is what the read joins use.

-- 1. Backfill category_id for existing rows from the category name.
UPDATE businesses b
SET category_id = c.id
FROM categories c
WHERE c.name = b.category
  AND b.category IS NOT NULL
  AND b.category_id IS DISTINCT FROM c.id;

-- 2. Keep category_id in sync with category on every insert/update.
-- Mirrors the existing description_search trigger pattern (see 017).
CREATE OR REPLACE FUNCTION sync_business_category_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category IS NULL THEN
    NEW.category_id = NULL;
  ELSE
    NEW.category_id = (
      SELECT id FROM categories WHERE name = NEW.category
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_sync_category_id
BEFORE INSERT OR UPDATE OF category ON businesses
FOR EACH ROW EXECUTE FUNCTION sync_business_category_id();

-- 3. Index the FK for the read-side joins.
CREATE INDEX IF NOT EXISTS idx_businesses_category_id
  ON businesses (category_id);
