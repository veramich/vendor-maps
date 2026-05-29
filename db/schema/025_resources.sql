-- 025_resources.sql
--
-- Community resources for street vendors and
-- home based businesses (grants, free seminars,
-- legal help, etc). Posted by any visitor, signed
-- in or not. Time limited resources auto disappear
-- from the site once their end date passes.

CREATE TABLE resources (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What it is
  -- free text so posters aren't boxed in
  -- "Available Grants", "Free Seminars", "Legal Help"
  resource_type       TEXT NOT NULL,

  -- Short headline + optional detail for the card
  title               TEXT NOT NULL,
  description         TEXT,

  -- Time range
  -- always_available hides the dates entirely.
  -- otherwise start_date / end_date drive display
  -- and auto removal.
  always_available    BOOLEAN NOT NULL DEFAULT false,
  start_date          DATE,
  end_date            DATE,

  -- Availability
  -- free text ("First come first serve",
  -- "Cut off date July 3, 2026") plus an optional
  -- structured cut off date for future filtering.
  availability        TEXT NOT NULL,
  availability_cutoff DATE,

  -- Sign up online
  -- link to a form, only set when the poster
  -- checked "sign up online"
  signup_url          TEXT,

  -- Walk in welcome
  walk_in_welcome     BOOLEAN NOT NULL DEFAULT false,

  -- Contact, websites, social
  contact             TEXT,
  website             TEXT,
  social_url          TEXT,

  -- Flyers
  -- up to 2, stored as
  -- [{ "url": ..., "publicId": ... }]
  flyers              JSONB NOT NULL DEFAULT '[]',

  -- Status (mirrors businesses moderation flow)
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'listed',
      'rejected',
      'expired'
    )),

  -- Auto expiry
  -- end of the end_date day in plain timestamp.
  -- NULL when always_available (never expires).
  -- query layer hides rows past this; a cron can
  -- hard delete later, matching popup_events.
  expires_at          TIMESTAMP
                      GENERATED ALWAYS AS (
                        CASE
                          WHEN always_available THEN NULL
                          WHEN end_date IS NULL THEN NULL
                          ELSE (end_date + 1)::timestamp
                        END
                      ) STORED,

  -- Submission tracking (spam prevention)
  submitted_by        TEXT,
  submitter_ip        TEXT,

  -- Timestamps
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),

  -- A dated resource needs an end date so it can
  -- expire; an always-available one must not carry
  -- dates that would contradict it.
  CONSTRAINT resources_date_range CHECK (
    (always_available AND start_date IS NULL
       AND end_date IS NULL)
    OR
    (NOT always_available AND end_date IS NOT NULL)
  ),

  -- End must not precede start when both given
  CONSTRAINT resources_date_order CHECK (
    start_date IS NULL
    OR end_date IS NULL
    OR end_date >= start_date
  )
);

-- Reuse the shared updated_at trigger from 017
CREATE TRIGGER resources_updated_at
BEFORE UPDATE ON resources
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
-- listing query filters on status + expiry
CREATE INDEX resources_status_idx
ON resources(status);

CREATE INDEX resources_expires_at_idx
ON resources(expires_at);

CREATE INDEX resources_type_idx
ON resources(resource_type);

CREATE INDEX resources_created_at_idx
ON resources(created_at);
