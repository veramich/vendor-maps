// Shared, client-safe filter model used by the map and directory.
// No DB import here so it can be bundled into client components.
// Server-side parsing + SQL lives in lib/businessFilterSql.ts.

import {
  DAYS_OF_WEEK,
  LOCATION_AMENITIES,
  DIETARY_OPTIONS,
  PRICE_TIERS,
} from "@/lib/types/business";

export type EventDateFilter = "all" | "today" | "weekend" | "week" | "month";
export type EventTimeFilter =
  | "all"
  | "morning"
  | "afternoon"
  | "evening"
  | "night_market";

export type BusinessFilters = {
  // Radius is active only when radiusMi is set AND we have a center point.
  radiusMi: number | null;
  lat: number | null;
  lng: number | null;

  openNow: boolean;
  days: string[]; // lowercase day names, e.g. "monday"
  topRated: boolean;
  priceTiers: number[]; // 1-4
  amenities: string[]; // values from LOCATION_AMENITIES
  dietary: string[]; // values from DIETARY_OPTIONS

  // Event-only filters (surfaced on the map). When active, results are
  // narrowed to event-type businesses matching the date/time window.
  eventDate: EventDateFilter;
  eventTime: EventTimeFilter;
};

export const EMPTY_FILTERS: BusinessFilters = {
  radiusMi: null,
  lat: null,
  lng: null,
  openNow: false,
  days: [],
  topRated: false,
  priceTiers: [],
  amenities: [],
  dietary: [],
  eventDate: "all",
  eventTime: "all",
};

// Options surfaced in the FilterPanel UI.
export const RADIUS_OPTIONS = [1, 2, 5, 10, 25] as const;
export const DAY_OPTIONS = DAYS_OF_WEEK;
export const AMENITY_OPTIONS = LOCATION_AMENITIES;
export const DIETARY_FILTER_OPTIONS = DIETARY_OPTIONS;
export const PRICE_OPTIONS = PRICE_TIERS;

// Event date/time options — mirror those in the directory EventList.
export const EVENT_DATE_OPTIONS: { value: EventDateFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "weekend", label: "Weekend" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

export const EVENT_TIME_OPTIONS: { value: EventTimeFilter; label: string }[] = [
  { value: "all", label: "Any Time" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night_market", label: "🌙 Night Market" },
];

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// Number of distinct filter groups that are active — used for the badge.
export function activeFilterCount(f: BusinessFilters): number {
  let n = 0;
  if (f.radiusMi != null && f.lat != null && f.lng != null) n++;
  if (f.openNow) n++;
  if (f.days.length) n++;
  if (f.topRated) n++;
  if (f.priceTiers.length) n++;
  if (f.amenities.length) n++;
  if (f.dietary.length) n++;
  if (f.eventDate !== "all") n++;
  if (f.eventTime !== "all") n++;
  return n;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Naive local timestamp string (no timezone) to compare against TSRANGE,
// which stores wall-clock times.
const fmtLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
  `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

// Resolves an event date filter into an optional concrete window plus the
// day-of-week names it covers. When `from`/`to` are null the filter is purely
// weekday-based (no date cutoff) so far-out events still surface.
function eventWindow(date: EventDateFilter): {
  from: Date | null;
  to: Date | null;
  days: string[];
} | null {
  if (date === "all") return null;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = todayStart.getDay();

  if (date === "today") {
    const to = new Date(todayStart);
    to.setDate(to.getDate() + 1);
    return { from: todayStart, to, days: [DAY_NAMES[dow]] };
  }

  if (date === "weekend") {
    // Weekday-based, no date cutoff: any Saturday/Sunday event matches.
    return { from: null, to: null, days: ["saturday", "sunday"] };
  }

  if (date === "week") {
    const to = new Date(todayStart);
    to.setDate(to.getDate() + 7);
    return { from: todayStart, to, days: [...DAY_NAMES] };
  }

  // month — through the first of next month
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: todayStart, to, days: [...DAY_NAMES] };
}

// The caller's local day/time, used to resolve open/closed against the user's
// timezone. now_day/prev_day/now_time are read server-side by openNowPredicate.
export function localNowParams(): {
  now_day: string;
  prev_day: string;
  now_time: string;
} {
  const now = new Date();
  return {
    now_day: DAY_NAMES[now.getDay()],
    prev_day: DAY_NAMES[(now.getDay() + 6) % 7],
    now_time: `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`,
  };
}

// Serializes filters into query params. "Open now" is resolved against the
// caller's local clock here, so day/time reflect the user's timezone.
export function filtersToParams(f: BusinessFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (f.radiusMi != null && f.lat != null && f.lng != null) {
    params.set("radius", String(f.radiusMi));
    params.set("lat", String(f.lat));
    params.set("lng", String(f.lng));
  }

  if (f.openNow) {
    const { now_day, prev_day, now_time } = localNowParams();
    params.set("open_now", "1");
    params.set("now_day", now_day);
    params.set("prev_day", prev_day);
    params.set("now_time", now_time);
  }

  if (f.days.length) params.set("days", f.days.join(","));
  if (f.topRated) params.set("top_rated", "1");
  if (f.priceTiers.length) params.set("price", f.priceTiers.join(","));
  if (f.amenities.length) params.set("amenities", f.amenities.join(","));
  if (f.dietary.length) params.set("dietary", f.dietary.join(","));

  const win = eventWindow(f.eventDate);
  if (win) {
    if (win.from && win.to) {
      params.set("event_from", fmtLocal(win.from));
      params.set("event_to", fmtLocal(win.to));
    }
    if (win.days.length) params.set("event_days", win.days.join(","));
  }
  if (f.eventTime !== "all") params.set("event_time", f.eventTime);

  return params;
}
