"use client";

import { useEffect, useState } from "react";
import SearchBar from "@/components/ui/SearchBar";
import { EMPTY_FILTERS, filtersToParams } from "@/lib/businessFilters";

type Event = {
  id: string;
  slug: string;
  name: string;
  category: string;
  sub_type: string;
  price_tier: number;
  logo_url: string | null;
  brand_logo: string | null;
  icon_name: string | null;
  image_url: string | null;
  neighborhood: string;
  city: string;
  street_address: string;
  vendor_space_available: boolean;
  // Recurring events have day_of_week + recurrence_type (anchored by
  // anchor_date); specific-date events have an exact event_start.
  day_of_week: string | null;
  recurrence_type: string | null;
  anchor_date: string | null;
  event_start: string | null;
  start_time: string | null;
  end_time: string | null;
};

type DateFilter = "all" | "today" | "weekend" | "week" | "month";
type TimeFilter = "all" | "morning" | "afternoon" | "evening";

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [vendorSpacesOnly, setVendorSpacesOnly] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = filtersToParams({
          ...EMPTY_FILTERS,
          eventDate: dateFilter,
          eventTime: timeFilter,
          vendorSpaces: vendorSpacesOnly,
        });
        if (searchQuery) params.set("q", searchQuery);
        const res = await fetch(`/api/businesses/events?${params.toString()}`);
        const data = await res.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [searchQuery, dateFilter, timeFilter, vendorSpacesOnly]);

  const DATE_FILTERS: { value: DateFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "weekend", label: "This Weekend" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ];

  const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
    { value: "all", label: "Any Time" },
    { value: "morning", label: "Morning" },
    { value: "afternoon", label: "Afternoon" },
    { value: "evening", label: "Evening" },
  ];

  const handleClearAll = () => {
    setInputValue("");
    setSearchQuery("");
    setDateFilter("all");
    setTimeFilter("all");
    setVendorSpacesOnly(false);
  };

  return (
    <div>
      {/* Search + Date + Time filters */}
      <div className="sticky top-28 bg-white z-10 border-b border-gray-100">
        {/* Search bar */}
        <div className="px-4 pt-3 pb-2">
          <SearchBar
            value={inputValue}
            onChange={setInputValue}
            onSearch={(q) => setSearchQuery(q.trim())}
            placeholder="Search events by name, city, keyword..."
          />
        </div>

        {/* Date filters */}
        <div className="px-4 py-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`px-4 py-2 rounded-full text-xs
                  font-medium transition whitespace-nowrap
                  ${dateFilter === f.value
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600"
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time filters */}
        <div className="px-4 pb-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {TIME_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTimeFilter(f.value)}
                className={`px-4 py-2 rounded-full text-xs
                  font-medium transition whitespace-nowrap
                  ${timeFilter === f.value
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600"
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vendor spaces filter */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setVendorSpacesOnly((v) => !v)}
            className={`px-4 py-2 rounded-full text-xs font-medium
              transition whitespace-nowrap border
              ${vendorSpacesOnly
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-green-700 border-green-300"
              }`}
          >
            Vendor Spaces
          </button>
        </div>
      </div>

      {/* Event list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-gray-400 text-sm">
            No events found for this filter
          </p>
          <button
            onClick={handleClearAll}
            className="text-black text-sm underline mt-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 grid grid-cols-2 gap-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

// Price range shown on the card footer, derived from the 1–4 tier.
const PRICE_RANGES: Record<number, string> = {
  1: "$ - $10",
  2: "$10 - $25",
  3: "$25 - $50",
  4: "$50+",
};

function formatTime12h(time: string | null): string {
  if (!time) return "";
  const [hourStr, minStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr || "0", 10);
  if (Number.isNaN(hour)) return "";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return min === 0
    ? `${hour12} ${period}`
    : `${hour12}:${String(min).padStart(2, "0")} ${period}`;
}

const WEEKDAY_TITLE: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const MONTHLY_ORDINAL: Record<string, string> = {
  monthly_first: "First",
  monthly_second: "Second",
  monthly_third: "Third",
  monthly_last: "Last",
};

const DOW_NUM: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const MONTHLY_NTH: Record<string, number> = {
  monthly_first: 1,
  monthly_second: 2,
  monthly_third: 3,
};

// Parse a Postgres DATE/timestamp string as a local date (no timezone shift).
function parseLocalDate(str: string): Date | null {
  const datePart = str.split(/[ T]/)[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const startOfToday = () => {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
};

// The Nth (1-based) or last `dow` weekday in the given year/month.
function nthWeekdayOfMonth(
  year: number,
  month: number,
  dow: number,
  nth: number | "last"
): Date {
  if (nth === "last") {
    const last = new Date(year, month + 1, 0); // last day of month
    const shift = (last.getDay() - dow + 7) % 7;
    return new Date(year, month, last.getDate() - shift);
  }
  const first = new Date(year, month, 1);
  const shift = (dow - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + shift + (nth - 1) * 7);
}

// Exact next occurrence (on/after today) for an anchored market schedule, or
// null when it can't be computed (no anchor / unknown recurrence).
function nextMarketDate(event: Event): Date | null {
  if (!event.anchor_date || !event.day_of_week) return null;
  const anchor = parseLocalDate(event.anchor_date);
  if (!anchor) return null;
  const today = startOfToday();
  const dow = DOW_NUM[event.day_of_week];

  if (event.recurrence_type === "weekly" || event.recurrence_type === "biweekly") {
    const period = event.recurrence_type === "biweekly" ? 14 : 7;
    const msPerDay = 86400000;
    if (anchor >= today) return anchor;
    const elapsed = Math.round((today.getTime() - anchor.getTime()) / msPerDay);
    const steps = Math.ceil(elapsed / period);
    return new Date(anchor.getTime() + steps * period * msPerDay);
  }

  if (event.recurrence_type?.startsWith("monthly")) {
    const nth: number | "last" =
      event.recurrence_type === "monthly_last"
        ? "last"
        : MONTHLY_NTH[event.recurrence_type] ?? 1;
    // This month's occurrence, rolling to next month if already past.
    for (let i = 0; i < 2; i++) {
      const cand = nthWeekdayOfMonth(
        today.getFullYear(),
        today.getMonth() + i,
        dow,
        nth
      );
      if (cand >= today) return cand;
    }
  }

  return null;
}

// The recurrence phrase, used as a fallback for legacy rows with no anchor.
function recurrencePhrase(event: Event): string {
  const day = event.day_of_week ? WEEKDAY_TITLE[event.day_of_week] : null;
  if (!day) return "";
  switch (event.recurrence_type) {
    case "weekly":
      return `Every ${day}`;
    case "biweekly":
      return `Every other ${day}`;
    case "monthly_first":
    case "monthly_second":
    case "monthly_third":
    case "monthly_last":
      return `${MONTHLY_ORDINAL[event.recurrence_type]} ${day} of every month`;
    default:
      return day;
  }
}

// Pop-ups and anchored markets show their exact next date; legacy markets
// without an anchor fall back to the recurrence phrase. "" hides the line.
function formatEventDate(event: Event): string {
  if (event.sub_type === "pop_up" && event.event_start) {
    const d = parseLocalDate(event.event_start);
    if (d) return fmtShortDate(d);
  }

  if (event.sub_type === "market") {
    const next = nextMarketDate(event);
    if (next) return fmtShortDate(next);
    return recurrencePhrase(event);
  }

  return "";
}

function EventCard({ event }: { event: Event }) {
  const priceRange = PRICE_RANGES[event.price_tier] || PRICE_RANGES[1];
  const logo = event.logo_url || event.brand_logo;
  const iconSrc = event.icon_name
    ? `/icons/categories/${event.icon_name}.png`
    : null;

  const address = event.street_address || "";
  const locality = [event.neighborhood || null, event.city || null]
    .filter(Boolean)
    .join(", ");

  const dateLabel = formatEventDate(event);
  const timeLabel =
    event.start_time && formatTime12h(event.start_time)
      ? `${formatTime12h(event.start_time)}${
          event.end_time ? ` - ${formatTime12h(event.end_time)}` : ""
        }`
      : "";

  return (
    <a
      href={`/${event.slug || event.id}`}
      className="group block bg-background border border-gray-100 rounded-2xl
        overflow-hidden hover:border-gray-200 hover:shadow-sm transition
        active:scale-99"
    >
      {/* Cover image */}
      <div className="relative w-full aspect-[16/10]">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          // No flyer: brand-tinted block with the logo or category icon.
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            {logo || iconSrc ? (
              <img
                src={logo || iconSrc || ""}
                alt={event.name}
                className="w-16 h-16 object-contain opacity-70"
              />
            ) : (
              <span className="text-3xl font-semibold text-primary/40">
                {event.name.charAt(0)}
              </span>
            )}
          </div>
        )}

        {/* Top-left: logo badge OR plain icon overlay (no circle background) */}
        {logo ? (
          <div className="pointer-events-none absolute top-2.5 left-2.5 w-11 h-11
            rounded-full bg-primary ring-2 ring-white overflow-hidden
            flex items-center justify-center">
            <img src={logo} alt="" className="w-full h-full object-cover" />
          </div>
        ) : iconSrc ? (
          <img
            src={iconSrc}
            alt=""
            className="pointer-events-none absolute top-3 left-3 w-8 h-8 object-contain
              [filter:brightness(0)_invert(1)_drop-shadow(0_1px_2px_rgba(0,0,0,0.7))]"
          />
        ) : (
          <div className="pointer-events-none absolute top-2.5 left-2.5 w-10 h-10
            rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {event.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Top-right: category pill */}
        {event.category && (
          <span className="pointer-events-none absolute top-2.5 right-2.5
            px-2.5 py-1 rounded-full text-[11px] font-medium text-white
            bg-black/45 backdrop-blur-sm">
            {event.category}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <p className="font-semibold text-foreground text-sm mb-0.5 truncate">
          {event.name}
        </p>

        {/* Date / recurrence and time */}
        {dateLabel && (
          <p className="text-xs font-medium text-foreground mb-1 truncate">
            {dateLabel}
            {timeLabel && (
              <span className="text-gray-500 font-normal"> · {timeLabel}</span>
            )}
          </p>
        )}

        {(address || locality) && (
          <div className="flex items-start gap-1.5 text-xs text-gray-600">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 flex-shrink-0 text-primary"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div className="min-w-0">
              {address && <p className="truncate">{address}</p>}
              {locality && <p className="text-gray-400 truncate">{locality}</p>}
            </div>
          </div>
        )}

        {/* Footer: vendor space badge + price */}
        <div className="flex items-center justify-between mt-3">
          {event.vendor_space_available ? (
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold
              text-green-700 border border-green-300 bg-green-50">
              Vendor Space
            </span>
          ) : (
            <span />
          )}
          <span className="text-sm text-foreground">{priceRange}</span>
        </div>
      </div>
    </a>
  );
}
