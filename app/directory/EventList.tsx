"use client";

import { useEffect, useState } from "react";

type Event = {
  id: string;
  name: string;
  category: string;
  sub_type: string;
  price_tier: number;
  neighborhood: string;
  city: string;
  street_address: string;
  is_night_market: boolean;
  vendor_space_available: boolean;
  next_date: string;
  start_time: string;
  end_time: string;
};

type DateFilter =
  | "all"
  | "today"
  | "weekend"
  | "week"
  | "month";

type TimeFilter =
  | "all"
  | "morning"
  | "afternoon"
  | "evening"
  | "night_market";

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");
  const [timeFilter, setTimeFilter] =
    useState<TimeFilter>("all");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(
          `/api/businesses/events?date=${dateFilter}&time=${timeFilter}`
        );
        const data = await res.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [dateFilter, timeFilter]);

  const DATE_FILTERS: { value: DateFilter; label: string }[] = [
    { value: "all",     label: "All" },
    { value: "today",   label: "Today" },
    { value: "weekend", label: "Weekend" },
    { value: "week",    label: "This Week" },
    { value: "month",   label: "This Month" },
  ];

  const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
    { value: "all",         label: "Any Time" },
    { value: "morning",     label: "Morning" },
    { value: "afternoon",   label: "Afternoon" },
    { value: "evening",     label: "Evening" },
    { value: "night_market", label: "🌙 Night Market" },
  ];

  return (
    <div>
      {/* Date filters */}
      <div className="sticky top-28 bg-white z-10
        border-b border-gray-100">
        <div className="px-4 py-3 overflow-x-auto">
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
        <div className="px-4 pb-3 overflow-x-auto">
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
      </div>

      {/* Event list */}
      {loading ? (
        <div className="flex items-center justify-center
          py-20">
          <div className="w-6 h-6 border-2 border-gray-200
            border-t-black rounded-full animate-spin"/>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center
          justify-center py-20 px-4 text-center">
          <p className="text-gray-400 text-sm">
            No events found for this filter
          </p>
          <button
            onClick={() => {
              setDateFilter("all");
              setTimeFilter("all");
            }}
            className="text-black text-sm underline mt-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4
          space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  return (
    <a
      href={`/businesses/${event.id}`}
      className="block border border-gray-100 rounded-2xl
        p-4 hover:border-gray-200 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">

          {/* Badges */}
          <div className="flex gap-2 mb-2">
            {event.is_night_market && (
              <span className="text-xs bg-gray-900
                text-white px-2 py-0.5 rounded-full">
                🌙 Night Market
              </span>
            )}
            {event.vendor_space_available && (
              <span className="text-xs bg-green-100
                text-green-700 px-2 py-0.5 rounded-full">
                Vendor Space
              </span>
            )}
          </div>

          <p className="font-semibold text-black
            text-sm mb-1">
            {event.name}
          </p>

          <p className="text-xs text-gray-500 mb-2">
            {event.category}
          </p>

          {/* Date and time */}
          {event.next_date && (
            <p className="text-xs font-medium
              text-black mb-1">
              {new Date(event.next_date)
                .toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              {event.start_time && (
                <span className="text-gray-500
                  font-normal">
                  {" "}· {event.start_time}
                  {event.end_time &&
                    ` - ${event.end_time}`
                  }
                </span>
              )}
            </p>
          )}

          <p className="text-xs text-gray-400">
            {event.neighborhood || event.city}
          </p>

        </div>

        <svg width="16" height="16"
          viewBox="0 0 24 24" fill="none"
          stroke="#9ca3af" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </a>
  );
}