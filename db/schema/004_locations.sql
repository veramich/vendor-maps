CREATE TABLE locations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id)
                      ON DELETE CASCADE,

  -- Cross streets
  -- used by all types EXCEPT market and pop_up
  street_1            TEXT,
  street_2            TEXT,

  -- Full address
  -- used by market and pop_up only
  street_address      TEXT,

  -- Shared fields
  city                TEXT,
  state               TEXT,
  state_code          TEXT,
  county              TEXT,
  zip                 TEXT,
  country             TEXT DEFAULT 'USA',
  neighborhood        TEXT,

  -- PostGIS coordinates
  -- populated from HERE geocoding API
  coordinates         GEOMETRY(Point, 4326),

  -- Location specific amenities
  location_amenities  TEXT[],
  -- 'parking', 'street_parking', 'ada_accessible',
  -- 'outdoor_seating', 'indoor_seating',
  -- 'restrooms_nearby', 'dog_friendly', 'covered_area'

  -- City expansion tracking
  is_active_area      BOOLEAN DEFAULT false,

  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);