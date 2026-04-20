CREATE TABLE brands (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  logo_url      TEXT,
  description   TEXT,
  claimed_by    TEXT,
  claim_status  TEXT DEFAULT 'unclaimed'
    CHECK (claim_status IN ('unclaimed', 'pending', 'claimed')),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);