CREATE TABLE market_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id)
                    ON DELETE CASCADE,

  -- Day and recurrence
  day_of_week       TEXT NOT NULL
    CHECK (day_of_week IN (
      'monday', 'tuesday', 'wednesday',
      'thursday', 'friday', 'saturday', 'sunday'
    )),
  recurrence_type   TEXT NOT NULL
    CHECK (recurrence_type IN (
      'weekly',
      'biweekly',
      'monthly_first',
      'monthly_second',
      'monthly_third',
      'monthly_last'
    )),

  -- Hours
  start_time        TIME,
  end_time          TIME,
  closes_next_day   BOOLEAN DEFAULT false,

  -- Night market flag
  -- drives glowing icon on map during opening hours
  is_night_market   BOOLEAN DEFAULT false,

  -- Seasonal schedule
  -- NULL means runs year round
  season_start      DATE,
  season_end        DATE,

  -- Day states
  hours_vary        BOOLEAN DEFAULT false,

  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);