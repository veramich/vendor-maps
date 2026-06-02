-- Add 'other' to the businesses.sub_type CHECK constraint.
--
-- The add-business small-business flow was simplified to a single flat type
-- list (street_vendor, food_truck, home_based, market_based, pop_up_based,
-- other). 'catering_only' and 'shipping_only' are no longer offered for new
-- submissions but are retained here so existing rows remain valid.

ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_sub_type_check;

ALTER TABLE businesses
  ADD CONSTRAINT businesses_sub_type_check
  CHECK (sub_type IN (
    'street_vendor',
    'food_truck',
    'home_based',
    'market_based',
    'pop_up_based',
    'other',
    'catering_only',  -- legacy
    'shipping_only',  -- legacy
    'market',
    'pop_up'
  ));
