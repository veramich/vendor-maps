-- 037_add_produce_category.sql
--
-- 'Produce' was offered in the add-business form (lib/types/business.ts) and
-- typed in BusinessCategory, but never existed in the categories table. As a
-- result any business submitted as 'Produce' got a NULL category_id and no map
-- icon. Produce is a distinct category from 'Fresh Fruit', so add it (it is not
-- a rename). Icon asset: public/icons/categories/produce.png.

INSERT INTO categories (name, icon_name)
VALUES ('Produce', 'produce')
ON CONFLICT (name) DO NOTHING;

-- Re-derive category_id for any existing businesses already submitted as
-- 'Produce' (the 036 trigger only fires on write; these rows predate the row).
UPDATE businesses b
SET category_id = c.id
FROM categories c
WHERE c.name = b.category
  AND b.category = 'Produce'
  AND b.category_id IS DISTINCT FROM c.id;
