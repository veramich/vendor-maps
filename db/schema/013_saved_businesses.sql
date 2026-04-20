CREATE TABLE saved_businesses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id)
                  ON DELETE CASCADE,

  -- Better Auth user ID
  user_id         TEXT NOT NULL,

  -- Preset collections
  collection      TEXT NOT NULL DEFAULT 'want_to_visit'
    CHECK (collection IN (
      'want_to_visit',
      'favorites',
      'been_here',
      'on_my_radar'
    )),

  saved_at        TIMESTAMP DEFAULT NOW(),

  -- User can save same business to multiple collections
  -- but not the same collection twice
  UNIQUE(business_id, user_id, collection)
);
