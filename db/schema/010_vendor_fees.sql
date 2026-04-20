CREATE TABLE vendor_fees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id)
                  ON DELETE CASCADE,

  -- Fee type
  fee_type        TEXT NOT NULL
    CHECK (fee_type IN (
      'non_food',
      'prepackaged_food',
      'beverage',
      'hot_food',
      'other'
    )),

  -- Fee details
  amount          DECIMAL(10,2),
  is_free         BOOLEAN DEFAULT false,
  description     TEXT,
  -- "per 10x10 space per day"
  -- "per event"
  -- "per season"

  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),

  -- One fee per type per business
  UNIQUE(business_id, fee_type)
);