"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import SearchBar from "@/components/ui/SearchBar";
import FilterPanel from "@/components/ui/FilterPanel";
import LocationBanner from "@/components/ui/LocationBanner";
import type { HereMapHandle } from "@/components/map/HereMap";
import { SUB_TYPE_LEGEND } from "@/components/map/HereMap";
import { BusinessFilters, EMPTY_FILTERS } from "@/lib/businessFilters";

const HereMap = dynamic(() => import("@/components/map/HereMap"), {
  ssr: false,
});

export default function MapPage() {
  const [popup, setPopup] = useState<any>(null);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<BusinessFilters>(EMPTY_FILTERS);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const mapHandleRef = useRef<HereMapHandle>(null);

  // Location is requested via an in-app banner (LocationBanner) rather than
  // firing the native prompt on load — unsolicited prompts get auto-blocked by
  // browsers. The banner only calls geolocation after a user taps "Enable",
  // then streams position fixes here to keep the "you are here" dot in sync.

  const handleSearch = (q: string) => {
    setSearchQuery(q.trim());
    setPopup(null);
  };

  // The legend chips are a single-select view of the sub_types filter: picking
  // one replaces the whole subTypes array, "All" clears it. This keeps the chip
  // row and the FilterPanel's sub-type checkboxes reading from one source.
  const activeSubType = filters.subTypes[0] ?? "";
  const handleSubType = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      subTypes: value === "" ? [] : [value],
    }));
    setPopup(null);
  };

  const handleFilters = (f: BusinessFilters) => {
    setFilters(f);
    setPopup(null);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "56px",
        bottom: "64px",
        left: 0,
        right: 0,
      }}
    >
      <HereMap
        ref={mapHandleRef}
        onMarkerTap={setPopup}
        searchQuery={searchQuery}
        filters={filters}
        userLocation={userLocation}
      />

      {/* In-app location request — shows a banner instead of letting the
          browser auto-fire (and auto-block) the native permission prompt. */}
      <LocationBanner onLocation={setUserLocation} />

      {/* Recenter-on-me control — only useful once we have a fix. */}
      {userLocation && (
        <button
          type="button"
          onClick={() => mapHandleRef.current?.recenter()}
          aria-label="Center map on my location"
          title="Center on my location"
          style={{
            position: "absolute",
            right: "12px",
            bottom: "24px",
            zIndex: 50,
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            border: "none",
            cursor: "pointer",
            background: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4285F4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      )}

      {/* Search overlay */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          right: "12px",
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar
              value={inputValue}
              onChange={setInputValue}
              onSearch={handleSearch}
              placeholder="Search by name, city, zip, keyword..."
            />
          </div>
          <FilterPanel
            value={filters}
            onChange={handleFilters}
            showEventFilters
          />
        </div>

        {/* Sub-type legend / filter pills. Each chip carries its marker color
            (as a dot when inactive, as the fill when active), so the row
            doubles as a color key for the map markers. Single-select. */}
        <div
          style={{
            marginTop: "8px",
            overflowX: "auto",
            pointerEvents: "auto",
            scrollbarWidth: "none",
          }}
        >
          <div style={{ display: "flex", gap: "8px", minWidth: "max-content" }}>
            <button
              onClick={() => handleSubType("")}
              style={{
                padding: "6px 14px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 500,
                whiteSpace: "nowrap",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                backgroundColor: activeSubType === "" ? "#111" : "white",
                color: activeSubType === "" ? "white" : "#4b5563",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              All
            </button>
            {SUB_TYPE_LEGEND.map(({ value, label, color }) => {
              const isActive = activeSubType === value;
              return (
                <button
                  key={value}
                  onClick={() => handleSubType(value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                    backgroundColor: isActive ? color : "white",
                    color: isActive ? "white" : "#4b5563",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {/* Color dot — hidden when active since the chip itself is
                      the color. */}
                  {!isActive && (
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "9999px",
                        backgroundColor: color,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Business popup */}
      {popup && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            width: "280px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              fontFamily: "sans-serif",
              position: "relative" as const,
            }}
          >
            <button
              onClick={() => setPopup(null)}
              style={{
                position: "absolute" as const,
                top: "8px",
                right: "8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                color: "#999",
                lineHeight: 1,
              }}
            >
              ×
            </button>

            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                margin: "0 0 4px",
                paddingRight: "24px",
                color: "#111",
              }}
            >
              {popup.name}
            </p>

            <p style={{ fontSize: "12px", color: "#666", margin: "0 0 4px" }}>
              {popup.category || ""}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#666" }}>
                {"$".repeat(popup.price_tier || 1)}
              </span>
              {popup.avg_rating > 0 && (
                <span style={{ fontSize: "12px", color: "#666" }}>
                  ★ {Number(popup.avg_rating).toFixed(1)} ({popup.review_count})
                </span>
              )}
            </div>

            <p style={{ fontSize: "12px", color: "#888", margin: "0 0 12px" }}>
              {popup.neighborhood || popup.city}
            </p>

            <a
              href={`/${popup.slug || popup.id}`}
              style={{
                display: "block",
                background: "#111",
                color: "white",
                textAlign: "center" as const,
                padding: "10px",
                borderRadius: "8px",
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              View Business
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
