CREATE TABLE review_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID NOT NULL REFERENCES reviews(id)
                  ON DELETE CASCADE,

  -- Owner info
  owner_id        TEXT NOT NULL,

  -- Response content
  response_text   TEXT NOT NULL,

  -- Edit tracking
  is_edited       BOOLEAN DEFAULT false,
  edited_at       TIMESTAMP,

  -- Moderation
  status          TEXT DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'approved',
      'rejected'
    )),
  flagged         BOOLEAN DEFAULT false,
  flag_reason     TEXT,

  -- Timestamps
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),

  -- One response per review
  UNIQUE(review_id)
);