CREATE TABLE listing_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id)
                  ON DELETE CASCADE,

  -- Better Auth user ID
  -- NULL if guest user
  user_id         TEXT,

  -- Where the view came from
  source          TEXT
    CHECK (source IN (
      'map',
      'list',
      'search',
      'direct',
      'saved'
    )),

  -- Prevent counting duplicate views
  -- same user viewing same listing
  -- within a short time window
  viewed_at       TIMESTAMP DEFAULT NOW()
);