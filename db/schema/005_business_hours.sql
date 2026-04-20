CREATE TABLE business_hours (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id)
                    ON DELETE CASCADE,

  -- Day of week
  day_of_week       TEXT NOT NULL
    CHECK (day_of_week IN (
      'monday', 'tuesday', 'wednesday',
      'thursday', 'friday', 'saturday', 'sunday'
    )),

  -- Hours
  open_time         TIME,
  close_time        TIME,
  closes_next_day   BOOLEAN DEFAULT false,

  -- Day states
  is_closed         BOOLEAN DEFAULT false,
  hours_vary        BOOLEAN DEFAULT false,

  -- Seasonal hours
  -- NULL means hours apply year round
  season_start      DATE,
  season_end        DATE,

  -- Prevent duplicate days per business
  UNIQUE(business_id, day_of_week)
);