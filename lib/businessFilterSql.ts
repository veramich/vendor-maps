// Server-side filter parsing + SQL fragment construction.
// Shared by the directory and map (locations) API routes. Fragments assume the
// businesses table is aliased `b` and locations is aliased `l`.

import sql from "@/lib/db";

const VALID_DAYS = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

const EVENT_TIMES = new Set([
  "morning",
  "afternoon",
  "evening",
]);

// Sub types selectable via filters. Includes the small-business detailed sub
// types (filter panel) plus the event sub types market / pop_up, which the map
// page's legend chips filter on directly (b.sub_type holds the raw value for
// both event and permanent_location rows).
const VALID_SUB_TYPES = new Set([
  "street_vendor",
  "food_truck",
  "home_based",
  "market_based",
  "pop_up_based",
  "other",
  "market",
  "pop_up",
]);

export type ParsedFilters = {
  radiusMi: number | null;
  lat: number | null;
  lng: number | null;
  openNow: boolean;
  nowDay: string | null;
  prevDay: string | null;
  nowTime: string | null;
  days: string[];
  topRated: boolean;
  priceTiers: number[];
  amenities: string[];
  dietary: string[];
  payment: string[];
  ordering: string[];
  categories: string[];
  subTypes: string[];
  vendorSpaces: boolean;
  eventFrom: string | null;
  eventTo: string | null;
  eventDays: string[];
  eventTime: string | null;
};

export function parseFilters(params: URLSearchParams): ParsedFilters {
  const num = (key: string): number | null => {
    const raw = params.get(key);
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const list = (key: string): string[] =>
    (params.get(key) || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const days = list("days").filter((d) => VALID_DAYS.has(d));

  const priceTiers = list("price")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 4);

  const day = params.get("now_day");
  const prevDay = params.get("prev_day");

  const eventTime = params.get("event_time");

  return {
    radiusMi: num("radius"),
    lat: num("lat"),
    lng: num("lng"),
    openNow: params.get("open_now") === "1",
    nowDay: day && VALID_DAYS.has(day) ? day : null,
    prevDay: prevDay && VALID_DAYS.has(prevDay) ? prevDay : null,
    nowTime: params.get("now_time"),
    days,
    topRated: params.get("top_rated") === "1",
    priceTiers,
    amenities: list("amenities"),
    dietary: list("dietary"),
    payment: list("payment"),
    ordering: list("ordering"),
    categories: list("categories"),
    subTypes: list("sub_types").filter((s) => VALID_SUB_TYPES.has(s)),
    vendorSpaces: params.get("vendor_spaces") === "1",
    eventFrom: params.get("event_from"),
    eventTo: params.get("event_to"),
    eventDays: list("event_days").filter((d) => VALID_DAYS.has(d)),
    eventTime: eventTime && EVENT_TIMES.has(eventTime) ? eventTime : null,
  };
}

const MILES_TO_METERS = 1609.34;

// Boolean predicate: is business `b` open at the given local day/time? Open if
// any of business_hours / market_schedules / popup_events covers it. Handles
// windows that close after midnight via the previous day's closes_next_day
// rows. Used both as an "open now" filter and as an is_open projection in the
// directory list, so the two always agree.
export function openNowPredicate(
  nowDay: string,
  prevDay: string,
  nowTime: string
) {
  const t = sql`${nowTime}::time`;
  return sql`(
    EXISTS (
      SELECT 1 FROM business_hours bh
      WHERE bh.business_id = b.id
      AND bh.is_closed = false
      AND (
        (bh.day_of_week = ${nowDay} AND (
          (bh.closes_next_day = false AND bh.open_time <= ${t} AND bh.close_time > ${t})
          OR (bh.closes_next_day = true AND bh.open_time <= ${t})
        ))
        OR (bh.day_of_week = ${prevDay} AND bh.closes_next_day = true AND bh.close_time > ${t})
      )
    )
    OR EXISTS (
      SELECT 1 FROM market_schedules ms
      WHERE ms.business_id = b.id
      AND (
        (ms.day_of_week = ${nowDay} AND (
          (ms.closes_next_day = false AND ms.start_time <= ${t} AND ms.end_time > ${t})
          OR (ms.closes_next_day = true AND ms.start_time <= ${t})
        ))
        OR (ms.day_of_week = ${prevDay} AND ms.closes_next_day = true AND ms.end_time > ${t})
      )
    )
    OR EXISTS (
      SELECT 1 FROM popup_events pe
      WHERE pe.business_id = b.id
      AND pe.event_range @> NOW()::timestamp
    )
  )`;
}

// Time-of-day bands as [lo, hi) windows. An event matches a band when its
// open interval overlaps the band, so an 11:00–17:00 event hits both morning
// and afternoon. Evening runs to 24:00.
function timeBand(t: string | null): { lo: string; hi: string } | null {
  if (t === "morning") return { lo: "05:00", hi: "12:00" };
  if (t === "afternoon") return { lo: "12:00", hi: "17:00" };
  if (t === "evening") return { lo: "17:00", hi: "24:00" };
  return null;
}

// Returns a single SQL fragment (a run of AND clauses) to splice into a WHERE
// clause, or an empty fragment when no advanced filters are active.
export function buildFilterClause(f: ParsedFilters) {
  const frags: ReturnType<typeof sql>[] = [];

  // Radius — requires a center point and a valid radius. Only matches rows
  // that actually have coordinates.
  if (f.radiusMi != null && f.radiusMi > 0 && f.lat != null && f.lng != null) {
    const meters = f.radiusMi * MILES_TO_METERS;
    frags.push(sql`
      AND l.coordinates IS NOT NULL
      AND ST_DWithin(
        l.coordinates::geography,
        ST_SetSRID(ST_MakePoint(${f.lng}, ${f.lat}), 4326)::geography,
        ${meters}
      )
    `);
  }

  // Open now — open if any of business_hours / market_schedules / popup_events
  // covers the current local day+time. Handles windows that close after
  // midnight via the previous day's closes_next_day rows.
  if (f.openNow && f.nowDay && f.prevDay && f.nowTime) {
    frags.push(
      sql`AND ${openNowPredicate(f.nowDay, f.prevDay, f.nowTime)}`
    );
  }

  // Days open — business has a non-closed schedule on any selected day. Covers
  // permanent hours, recurring markets, and pop-ups (by the weekday of their
  // event date).
  if (f.days.length) {
    frags.push(sql`
      AND (
        EXISTS (
          SELECT 1 FROM business_hours bh
          WHERE bh.business_id = b.id
          AND bh.is_closed = false
          AND bh.day_of_week = ANY(${f.days})
        )
        OR EXISTS (
          SELECT 1 FROM market_schedules ms
          WHERE ms.business_id = b.id
          AND ms.day_of_week = ANY(${f.days})
        )
        OR EXISTS (
          SELECT 1 FROM popup_events pe
          WHERE pe.business_id = b.id
          AND lower(to_char(lower(pe.event_range), 'FMDay')) = ANY(${f.days})
        )
      )
    `);
  }

  if (f.topRated) {
    frags.push(sql`AND b.avg_rating >= 4`);
  }

  if (f.priceTiers.length) {
    frags.push(sql`AND b.price_tier = ANY(${f.priceTiers})`);
  }

  // Amenities / dietary — must contain ALL selected values.
  if (f.amenities.length) {
    frags.push(sql`AND l.location_amenities @> ${f.amenities}::text[]`);
  }

  if (f.dietary.length) {
    frags.push(sql`AND b.dietary_options @> ${f.dietary}::text[]`);
  }

  if (f.payment.length) {
    frags.push(sql`AND b.payment_options @> ${f.payment}::text[]`);
  }

  if (f.ordering.length) {
    frags.push(sql`AND b.ordering_methods @> ${f.ordering}::text[]`);
  }

  // Category / business sub type — single-valued columns, match ANY selected.
  if (f.categories.length) {
    frags.push(sql`AND b.category = ANY(${f.categories})`);
  }

  if (f.subTypes.length) {
    frags.push(sql`AND b.sub_type = ANY(${f.subTypes})`);
  }

  // Vendor spaces — only listings with an available vendor_spaces row.
  if (f.vendorSpaces) {
    frags.push(sql`
      AND EXISTS (
        SELECT 1 FROM vendor_spaces vs
        WHERE vs.business_id = b.id
        AND vs.vendor_space_available = true
      )
    `);
  }

  // Event date/time — narrows to event-type businesses with a matching market
  // schedule or pop-up occurrence. Markets (recurring) match on day-of-week;
  // pop-ups match on date-range overlap when a window is given, otherwise on
  // the weekday of their event date (e.g. the weekend filter).
  const hasDate = !!(f.eventFrom && f.eventTo);
  const hasDays = f.eventDays.length > 0;
  const hasTime = !!f.eventTime;
  if (hasDate || hasDays || hasTime) {
    const band = timeBand(f.eventTime);

    // Markets — recurring weekly, matched on day-of-week.
    let markets = sql`SELECT 1 FROM market_schedules ms WHERE ms.business_id = b.id`;
    if (hasDays) {
      markets = sql`${markets} AND ms.day_of_week = ANY(${f.eventDays})`;
    }
    if (band) {
      // Interval overlap of [start, end) with the band; closes_next_day means
      // the event also covers the late-night/early-morning span.
      markets = sql`${markets} AND (
        (ms.start_time < ${band.hi}::time AND ms.end_time > ${band.lo}::time)
        OR (ms.closes_next_day AND (ms.start_time < ${band.hi}::time OR ms.end_time > ${band.lo}::time))
      )`;
    }

    // Pop-ups — date-range overlap when windowed, else weekday of the event.
    let popups = sql`SELECT 1 FROM popup_events pe WHERE pe.business_id = b.id`;
    if (hasDate) {
      popups = sql`${popups} AND pe.event_range && tsrange(${f.eventFrom}::timestamp, ${f.eventTo}::timestamp)`;
    } else if (hasDays) {
      popups = sql`${popups} AND lower(to_char(lower(pe.event_range), 'FMDay')) = ANY(${f.eventDays})`;
    }
    if (band) {
      // Interval overlap of [start, end) with the band; a range that crosses
      // into the next day also covers the late-night/early-morning span.
      popups = sql`${popups} AND (
        (lower(pe.event_range)::time < ${band.hi}::time AND upper(pe.event_range)::time > ${band.lo}::time)
        OR (upper(pe.event_range)::date > lower(pe.event_range)::date
            AND (lower(pe.event_range)::time < ${band.hi}::time OR upper(pe.event_range)::time > ${band.lo}::time))
      )`;
    }

    frags.push(
      sql`AND b.type = 'event' AND (EXISTS (${markets}) OR EXISTS (${popups}))`
    );
  }

  // Compose into one fragment. Nested sql`` fragments concatenate; an array in
  // value position would instead render as a Postgres array, so we reduce.
  return frags.reduce((acc, frag) => sql`${acc} ${frag}`, sql``);
}
