"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import SearchBar from "@/components/ui/SearchBar";
import FilterPanel from "@/components/ui/FilterPanel";
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
        onMarkerTap={setPopup}
        searchQuery={searchQuery}
        categoryFilter={categoryFilter}
        filters={filters}
      />

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
