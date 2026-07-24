-- Next occurrence of an nth-weekday-of-month recurrence, on/after `from_date`.
--
-- Monthly market schedules ("third Saturday of the month") repeat by ordinal
-- weekday, not by a fixed day-step from the anchor date. The events API used to
-- rank them by stepping 7 days from anchor_date, i.e. treating them as weekly,
-- while the directory UI computed the real nth weekday — so a monthly market
-- sorted by one date and displayed another.
--
-- Mirrors nextMarketDate()/nthWeekdayOfMonth() in app/directory/EventList.tsx.
-- Keep the two in sync.
--
-- day_name: 'sunday'..'saturday' (matches market_schedules.day_of_week)
-- recurrence: 'monthly_first' | 'monthly_second' | 'monthly_third'
--             | 'monthly_fourth' | 'monthly_last'
-- Returns NULL for non-monthly or unrecognized input, so callers can COALESCE
-- to their own fallback rather than getting a silently wrong date.

CREATE OR REPLACE FUNCTION nth_weekday_of_month(
  from_date  date,
  day_name   text,
  recurrence text
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  target_dow int;
  month_start date;
  first_match date;
  candidate date;
  i int;
BEGIN
  IF day_name IS NULL OR recurrence IS NULL
     OR recurrence NOT LIKE 'monthly%' THEN
    RETURN NULL;
  END IF;

  target_dow := CASE day_name
    WHEN 'sunday' THEN 0 WHEN 'monday' THEN 1
    WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3
    WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5
    WHEN 'saturday' THEN 6 END;

  IF target_dow IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check this month, then next: the ordinal date for the current month may
  -- already be past, in which case the next occurrence rolls forward.
  FOR i IN 0..1 LOOP
    month_start := date_trunc('month', from_date)::date
                     + (i || ' month')::interval;

    IF recurrence = 'monthly_last' THEN
      -- Walk back from the last day of the month to the target weekday.
      candidate := (date_trunc('month', month_start)
                     + interval '1 month' - interval '1 day')::date;
      candidate := candidate
        - ((EXTRACT(DOW FROM candidate)::int - target_dow + 7) % 7);
    ELSE
      -- First matching weekday, then step forward by whole weeks.
      first_match := month_start
        + ((target_dow - EXTRACT(DOW FROM month_start)::int + 7) % 7);
      candidate := first_match + (
        CASE recurrence
          WHEN 'monthly_first'  THEN 0
          WHEN 'monthly_second' THEN 1
          WHEN 'monthly_third'  THEN 2
          WHEN 'monthly_fourth' THEN 3
          ELSE 0
        END * 7
      );
      -- A 5th-weekday overflow (e.g. "fourth Friday" in a month with only
      -- four) would spill into the next month; clamp by skipping it.
      IF date_trunc('month', candidate) <> date_trunc('month', month_start) THEN
        CONTINUE;
      END IF;
    END IF;

    IF candidate >= from_date THEN
      RETURN candidate;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;
