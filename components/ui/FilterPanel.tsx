"use client";

import { useEffect, useRef, useState } from "react";
import {
  BusinessFilters,
  EMPTY_FILTERS,
  RADIUS_OPTIONS,
  DAY_OPTIONS,
  AMENITY_OPTIONS,
  DIETARY_FILTER_OPTIONS,
  PRICE_OPTIONS,
  EVENT_DATE_OPTIONS,
  EVENT_TIME_OPTIONS,
  activeFilterCount,
} from "@/lib/businessFilters";

const FILTER_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAgElEQVR4nO2USw6AIAwFZyEeHT/xVHIV2Ogh6oaVIVqFqDFM0mX7IJ0U/o4BJmAFAtADbcmAEZBddXeHucQwSVRQ9LicAK/ombW/GhLNloI0cQ9LfLktveRXMJ9V1yktEoW6WZqKQl21pimqunxXwzNc5gWVnGvqLwYcalo1fJYNcB+WiL9w4H8AAAAASUVORK5CYII=";

interface FilterPanelProps {
  value: BusinessFilters;
  onChange: (filters: BusinessFilters) => void;
  /** Inline styles for the trigger button (used on the map overlay). */
  buttonStyle?: React.CSSProperties;
  /** Show the event date/time section (map view only). */
  showEventFilters?: boolean;
}

const DAY_LABEL: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

type GeoStatus = "idle" | "locating" | "granted" | "denied";

export default function FilterPanel({
  value,
  onChange,
  buttonStyle,
  showEventFilters = false,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BusinessFilters>(value);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(
    value.lat != null ? "granted" : "idle"
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync the draft from the committed value each time the panel opens.
  useEffect(() => {
    if (open) {
      setDraft(value);
      setGeoStatus(value.lat != null ? "granted" : "idle");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply changes live while the panel is open, so selections take effect
  // immediately (matching the instant category pills on the map). Committing
  // the same reference is a no-op upstream, so the open-sync above is harmless.
  useEffect(() => {
    if (open) onChange(draft);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = activeFilterCount(value);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus("granted");
        setDraft((d) => ({
          ...d,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const selectRadius = (mi: number) => {
    setDraft((d) => {
      const next = d.radiusMi === mi ? null : mi;
      return { ...d, radiusMi: next };
    });
    // Fetch a location the first time a radius is picked.
    if (draft.radiusMi !== mi && draft.lat == null) requestLocation();
  };

  const toggleInArray = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const clearAll = () => {
    setDraft(EMPTY_FILTERS);
    setGeoStatus("idle");
    onChange(EMPTY_FILTERS);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filters"
        className="flex items-center gap-2 px-4 h-11 rounded-full
          border border-gray-200 bg-white shadow-md text-sm
          font-medium text-gray-700 whitespace-nowrap"
        style={buttonStyle}
      >
        <img src={FILTER_ICON} width={16} height={16} alt="" />
        Filters
        {count > 0 && (
          <span
            className="flex items-center justify-center min-w-5 h-5
              px-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 60 }}
          />

          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-100"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 61,
              width: "300px",
              maxWidth: "calc(100vw - 24px)",
              maxHeight: "min(70vh, 520px)",
              overflowY: "auto",
            }}
          >
            <div className="p-4 space-y-5">
              {/* Radius */}
              <Section title="Distance">
                <div className="flex flex-wrap gap-2">
                  {RADIUS_OPTIONS.map((mi) => (
                    <Pill
                      key={mi}
                      active={draft.radiusMi === mi}
                      onClick={() => selectRadius(mi)}
                    >
                      {mi} mi
                    </Pill>
                  ))}
                </div>
                {draft.radiusMi != null && geoStatus === "locating" && (
                  <p className="text-xs text-gray-400 mt-2">
                    Getting your location…
                  </p>
                )}
                {draft.radiusMi != null && geoStatus === "denied" && (
                  <p className="text-xs text-red-500 mt-2">
                    Location access is needed for distance.{" "}
                    <button
                      onClick={requestLocation}
                      className="underline"
                      type="button"
                    >
                      Retry
                    </button>
                  </p>
                )}
              </Section>

              {/* Open now */}
              <Section title="Availability">
                <div className="flex flex-wrap gap-2">
                  <Pill
                    active={draft.openNow}
                    onClick={() =>
                      setDraft((d) => ({ ...d, openNow: !d.openNow }))
                    }
                  >
                    Open now
                  </Pill>
                  <Pill
                    active={draft.topRated}
                    onClick={() =>
                      setDraft((d) => ({ ...d, topRated: !d.topRated }))
                    }
                  >
                    ★ Top rated
                  </Pill>
                </div>
              </Section>

              {/* Days open */}
              <Section title="Open on">
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => (
                    <Pill
                      key={day}
                      active={draft.days.includes(day)}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          days: toggleInArray(d.days, day),
                        }))
                      }
                    >
                      {DAY_LABEL[day]}
                    </Pill>
                  ))}
                </div>
              </Section>

              {/* Price */}
              <Section title="Price">
                <div className="flex flex-wrap gap-2">
                  {PRICE_OPTIONS.map((p) => (
                    <Pill
                      key={p.tier}
                      active={draft.priceTiers.includes(p.tier)}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          priceTiers: toggleInArray(d.priceTiers, p.tier),
                        }))
                      }
                    >
                      {p.label}
                    </Pill>
                  ))}
                </div>
              </Section>

              {/* Amenities */}
              <Section title="Amenities">
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((a) => (
                    <Pill
                      key={a}
                      active={draft.amenities.includes(a)}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          amenities: toggleInArray(d.amenities, a),
                        }))
                      }
                    >
                      {a}
                    </Pill>
                  ))}
                </div>
              </Section>

              {/* Dietary */}
              <Section title="Dietary">
                <div className="flex flex-wrap gap-2">
                  {DIETARY_FILTER_OPTIONS.map((a) => (
                    <Pill
                      key={a}
                      active={draft.dietary.includes(a)}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          dietary: toggleInArray(d.dietary, a),
                        }))
                      }
                    >
                      {a}
                    </Pill>
                  ))}
                </div>
              </Section>

              {/* Events — kept last so it's clearly separate from business filters */}
              {showEventFilters && (
                <Section title="Events">
                  <p className="text-[11px] text-gray-400 mb-1.5">Date</p>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_DATE_OPTIONS.map((o) => (
                      <Pill
                        key={o.value}
                        active={draft.eventDate === o.value}
                        onClick={() =>
                          setDraft((d) => ({ ...d, eventDate: o.value }))
                        }
                      >
                        {o.label}
                      </Pill>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3 mb-1.5">Time</p>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TIME_OPTIONS.map((o) => (
                      <Pill
                        key={o.value}
                        active={draft.eventTime === o.value}
                        onClick={() =>
                          setDraft((d) => ({ ...d, eventTime: o.value }))
                        }
                      >
                        {o.label}
                      </Pill>
                    ))}
                  </div>
                </Section>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between gap-3 px-4 py-3
                border-t border-gray-100 sticky bottom-0 bg-white"
            >
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-gray-500 underline"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-5 py-2 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: "var(--primary)" }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-900 mb-2">{title}</p>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium
        transition whitespace-nowrap border
        ${
          active
            ? "bg-black text-white border-black"
            : "bg-white text-gray-600 border-gray-200"
        }`}
    >
      {children}
    </button>
  );
}
