CREATE TABLE popup_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id)
                    ON DELETE CASCADE,

  -- Optional link to parent market
  -- NULL for standalone pop-ups
  -- populated when event is hosted at an existing market
  parent_market_id  UUID REFERENCES businesses(id)
                    ON DELETE SET NULL,

  -- Event details
  event_name        TEXT,
  -- "Summer Nights", "Mother's Day Market"
  -- NULL for regular standalone pop-ups

  -- Schedule using tsrange
  -- handles after midnight automatically
  -- '[2026-04-19 11:00:00, 2026-04-20 02:00:00)'
  event_range       TSRANGE NOT NULL,

  -- Night market flag
  -- drives glowing icon on map during opening hours
  is_night_market   BOOLEAN DEFAULT false,

  -- Notes
  notes             TEXT,

  -- Auto expiry
  -- set to upper(event_range) automatically
  -- cron job deletes when this passes
  auto_delete_at    TIMESTAMP 
                    GENERATED ALWAYS AS 
                    (upper(event_range)) STORED,

  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),

  -- Ensure event range is never empty
  CONSTRAINT no_empty_range 
    CHECK (NOT isempty(event_range))
);

-- GiST index required for tsrange queries
CREATE INDEX popup_events_range_idx
ON popup_events USING GIST(event_range);