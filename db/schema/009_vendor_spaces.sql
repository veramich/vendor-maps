CREATE TABLE vendor_spaces (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id)
                          ON DELETE CASCADE,

  -- Toggle
  vendor_space_available  BOOLEAN DEFAULT false,

  -- Space details
  space_sizes             TEXT[],
  -- ["10x10", "10x20", "custom"]

  -- Vendor types checklist
  vendor_types            TEXT[],
  -- ["food", "craft", "beverage",
  --  "clothing", "art", "wellness"]

  -- Waitlist and holds
  has_waitlist            BOOLEAN DEFAULT false,
  has_holds               BOOLEAN DEFAULT false,

  -- Sign up link
  signup_link             TEXT,
  signup_link_status      TEXT DEFAULT 'pending'
    CHECK (signup_link_status IN (
      'pending',
      'verified',
      'flagged'
    )),
  signup_link_checked_at  TIMESTAMP,

  -- Notes
  note                    TEXT,

  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW(),

  -- One vendor space record per business
  UNIQUE(business_id)
);