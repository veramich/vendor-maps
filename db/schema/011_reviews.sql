CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id)
                  ON DELETE CASCADE,

  -- Reviewer info
  user_id         TEXT NOT NULL,
  user_email      TEXT NOT NULL,

  -- Rating
  stars           INTEGER NOT NULL
    CHECK (stars BETWEEN 1 AND 5),

  -- Written review
  review_text     TEXT NOT NULL,
  review_length   INTEGER
                  GENERATED ALWAYS AS
                  (LENGTH(review_text)) STORED,

  -- Helpful
  helpful_by      JSONB DEFAULT '[]',
  helpful_count   INTEGER
                  GENERATED ALWAYS AS
                  (jsonb_array_length(helpful_by)) STORED,

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

  -- One review per user per business
  UNIQUE(business_id, user_id)
);