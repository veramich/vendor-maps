"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CLD } from "@/lib/utils/cldUrl";
import SearchBar from "@/components/ui/SearchBar";
import FilterPanel from "@/components/ui/FilterPanel";
import LocationBanner from "@/components/ui/LocationBanner";
import { useUserLocation } from "@/components/map/useUserLocation";
import type {
  HereMapHandle,
  MapLocation,
  PopupInsets,
} from "@/components/map/HereMap";
import { SUB_TYPE_LEGEND } from "@/components/map/HereMap";
import { BusinessFilters, EMPTY_FILTERS } from "@/lib/businessFilters";

const HereMap = dynamic(() => import("@/components/map/HereMap"), {
  ssr: false,
});

export default function MapPage() {
  const [popup, setPopup] = useState<MapLocation | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<BusinessFilters>(EMPTY_FILTERS);
  // Location is requested via a tap (the in-app banner or the locate button)
  // rather than firing the native prompt on load — unsolicited prompts get
  // auto-blocked by browsers. Position fixes keep the "you are here" dot live.
  const {
    location: userLocation,
    status: locationStatus,
    start: startLocation,
  } = useUserLocation();
  // Bumped to re-show the "location is blocked" help from the locate button.
  const [locationHelpSignal, setLocationHelpSignal] = useState(0);
  const mapHandleRef = useRef<HereMapHandle>(null);
  const searchOverlayRef = useRef<HTMLDivElement>(null);

  const closePopup = useCallback(() => setPopup(null), []);

  // A popup opening near the top of the map would land under the search bar
  // and chips; report their bottom edge so the map pans the popup clear.
  const getPopupInsets = useCallback((): PopupInsets => {
    const overlay = searchOverlayRef.current;
    return { top: overlay ? overlay.offsetTop + overlay.offsetHeight : 0 };
  }, []);

  // Locate button: zoom in to the visitor. Without a fix yet, this tap is the
  // user gesture that lets us ask for location, and the map zooms in once the
  // fix arrives. If the browser has blocked location, explain how to allow it.
  const handleLocate = () => {
    if (locationStatus === "denied") {
      setLocationHelpSignal((n) => n + 1);
      return;
    }
    startLocation();
    mapHandleRef.current?.recenter();
  };
  // Watching but no fix yet — the button pulses so the tap reads as working.
  const locating = locationStatus === "watching" && !userLocation;

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
        selected={popup}
        onPopupClose={closePopup}
        getPopupInsets={getPopupInsets}
        renderPopup={(location) => <BusinessPopup location={location} />}
        getPopupHref={(location) => `/${location.slug || location.id}`}
      />

      {/* In-app location request — shows a banner instead of letting the
          browser auto-fire (and auto-block) the native permission prompt. */}
      <LocationBanner
        status={locationStatus}
        onEnable={startLocation}
        reopenSignal={locationHelpSignal}
      />

      {/* Locate-me control, available any time the browser supports
          geolocation (it requests permission itself when needed). */}
      {locationStatus !== "unsupported" && (
        <button
          type="button"
          onClick={handleLocate}
          aria-label="Zoom to my location"
          aria-busy={locating}
          title="Zoom to my location"
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
          {/* Navigation arrow, in the "you are here" dot's blue. */}
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="#4285F4"
            stroke="#4285F4"
            strokeWidth="2"
            strokeLinejoin="round"
            animate={{ opacity: locating ? [1, 0.3, 1] : 1 }}
            transition={
              locating
                ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.15 }
            }
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </motion.svg>
        </button>
      )}

      {/* Search overlay */}
      <div
        ref={searchOverlayRef}
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

    </div>
  );
}

const POPUP_COVER_WIDTH = 240;
const POPUP_COVER_HEIGHT = 135;

// Popup content: the business name with a brand-orange arrow badge so it reads
// as tappable. A listing with a cover photo shows it above the name. HereMap
// supplies the white bubble, the tail pointing at the marker, the pop-out
// animation, and the link (getPopupHref) that makes the whole popup, tail
// included, one tap target. There is no close button; tapping empty map (or
// another marker) dismisses it.
function BusinessPopup({ location }: { location: MapLocation }) {
  const cover = location.image_url;
  return (
    <div
      style={{
        display: "block",
        // The bubble is max-content, so a cover needs a set width to fill;
        // without one the bubble hugs the name.
        width: cover ? `${POPUP_COVER_WIDTH}px` : undefined,
        maxWidth: "240px",
        color: "#111",
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontWeight: 600,
        lineHeight: 1.3,
      }}
    >
      {/* Fixed height, so the bubble's size is known before the photo loads
          and HereMap's pan-into-view measures it correctly. alt is empty:
          the name right below already labels the link. */}
      {cover && (
        <Image
          src={CLD.popup(cover)}
          alt=""
          width={POPUP_COVER_WIDTH}
          height={POPUP_COVER_HEIGHT}
          unoptimized
          style={{
            display: "block",
            width: "100%",
            height: `${POPUP_COVER_HEIGHT}px`,
            objectFit: "cover",
            borderRadius: "12px 12px 0 0",
            background: "#f3f4f6",
          }}
        />
      )}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 10px 10px 14px",
        }}
      >
        <span style={{ minWidth: 0 }}>{location.name}</span>
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            width: "24px",
            height: "24px",
            borderRadius: "9999px",
            background: "#FF7300",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </span>
    </div>
  );
}
