"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import SearchBar from "@/components/ui/SearchBar";
import FilterPanel from "@/components/ui/FilterPanel";
import type { HereMapHandle } from "@/components/map/HereMap";
import { BusinessFilters, EMPTY_FILTERS } from "@/lib/businessFilters";

const HereMap = dynamic(() => import("@/components/map/HereMap"), {
  ssr: false,
});

const MAP_CATEGORIES = [
  "All",
  "Events",
  "Food",
  "Coffee",
  "Desserts",
  "Beverages",
  "Fresh Fruit",
  "Candy",
  "Personal Care",
  "Wellness",
  "Fitness",
  "Handmade",
  "Art",
  "Jewelry",
  "Apparel",
  "Merchandise",
  "Flowers",
  "General Services",
  "Other",
];

export default function MapPage() {
  const [popup, setPopup] = useState<any>(null);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [filters, setFilters] = useState<BusinessFilters>(EMPTY_FILTERS);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const mapHandleRef = useRef<HereMapHandle>(null);

  // Ask for the visitor's location on load and keep the "you are here" dot in
  // sync as they move (like Google Maps). Failures (denied / unavailable) are
  // silent — the map just works without the dot. Cleared on unmount.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const handleSearch = (q: string) => {
    setSearchQuery(q.trim());
    setPopup(null);
  };

  const handleCategory = (cat: string) => {
    setCategoryFilter(cat === "All" ? "" : cat);
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
        categoryFilter={categoryFilter}
        filters={filters}
        userLocation={userLocation}
      />

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

        {/* Category filter pills */}
        <div
          style={{
            marginTop: "8px",
            overflowX: "auto",
            pointerEvents: "auto",
            scrollbarWidth: "none",
          }}
        >
          <div style={{ display: "flex", gap: "8px", minWidth: "max-content" }}>
            {MAP_CATEGORIES.map((cat) => {
              const isActive =
                cat === "All" ? categoryFilter === "" : categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategory(cat)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                    backgroundColor: isActive ? "#111" : "white",
                    color: isActive ? "white" : "#4b5563",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {cat}
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
