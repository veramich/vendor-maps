CREATE TABLE businesses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            UUID REFERENCES brands(id) ON DELETE SET NULL,

  -- Type
  type                TEXT NOT NULL
    CHECK (type IN (
      'no_location',
      'permanent_location',
      'event'
    )),
  sub_type            TEXT
    CHECK (sub_type IN (
      'street_vendor',
      'food_truck',
      'home_based',
      'market_based',
      'pop_up_based',
      'catering_only',
      'shipping_only',
      'market',
      'pop_up'
    )),

  -- Info
  name                TEXT NOT NULL,
  logo_url            TEXT,
  description         TEXT,
  description_search  TSVECTOR,
  category            TEXT,

  -- Pricing
  price_tier          INTEGER CHECK (price_tier BETWEEN 1 AND 4),
  price_context       TEXT,

  -- Contact and social
  website             TEXT,
  instagram           TEXT,
  facebook            TEXT,
  tiktok              TEXT,
  twitter             TEXT,
  youtube             TEXT,
  phone               TEXT,
  email               TEXT,
  other_links         JSONB DEFAULT '[]',

  -- Amenities
  payment_options     TEXT[],
  ordering_methods    TEXT[],
  dietary_options     TEXT[],
  business_amenities  TEXT[],

  -- Status
  status              TEXT DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'listed',
      'unlisted',
      'rejected',
      'duplicate',
      'expired'
    )),
  unlisted_reason     TEXT,

  -- Submission tracking
  added_by            TEXT DEFAULT 'user_submission'
    CHECK (added_by IN ('user_submission', 'owner_added')),
  submitted_by        TEXT,
  submitter_email     TEXT,
  submitter_ip        TEXT,

  -- Claiming
  claim_status        TEXT DEFAULT 'unclaimed'
    CHECK (claim_status IN ('unclaimed', 'pending', 'claimed')),
  claimed_by          TEXT,

  -- Chain
  is_chain_location   BOOLEAN DEFAULT false,
  location_nickname   TEXT,

  -- Ratings
  avg_rating          DECIMAL(2,1) DEFAULT 0.0,
  review_count        INTEGER DEFAULT 0,

  -- Auto expiry
  expires_at          TIMESTAMP,

  -- Timestamps
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);