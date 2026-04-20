CREATE TABLE claims (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id)
                    ON DELETE CASCADE,

  -- Better Auth user ID of person claiming
  user_id           TEXT NOT NULL,

  -- Contact info provided for manual verification
  -- at least one required
  claim_contact     TEXT,
  -- social media handle or phone number

  -- Status
  status            TEXT DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'approved',
      'rejected'
    )),

  -- Rejection reason
  -- populated when status = 'rejected'
  rejection_reason  TEXT,

  -- Timestamps
  requested_at      TIMESTAMP DEFAULT NOW(),
  resolved_at       TIMESTAMP,

  -- One active claim per business at a time
  UNIQUE(business_id, status)
);