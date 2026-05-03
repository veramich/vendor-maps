"use client";

import { useState, useEffect, useRef } from "react";
import { BusinessFormData } from "@/lib/types/business";

interface Step3LocationProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  nextStep: () => void;
}

export default function Step3Location({
  formData,
  updateForm,
  nextStep,
}: Step3LocationProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [searchError, setSearchError] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const isEvent =
    formData.subType === "market" ||
    formData.subType === "pop_up";

  // Load HERE scripts
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  };

  // Initialize mini map when location confirmed
  useEffect(() => {
    if (!confirmed || !formData.lat || !formData.lng) return;
    if (!mapRef.current) return;

    const initMiniMap = async () => {
      try {
        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-core.js"
        );
        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-service.js"
        );
        await loadScript(
          "https://js.api.here.com/v3/3.1/mapsjs-mapevents.js"
        );

        const H = (window as any).H;
        if (!H) return;

        // Dispose existing map
        if (mapInstance.current) {
          mapInstance.current.dispose();
          mapInstance.current = null;
        }

        const positronLayer = new H.map.layer.TileLayer(
          new H.map.provider.ImageTileProvider({
            getURL: (
              col: number,
              row: number,
              zoom: number
            ) => `https://a.basemaps.cartocdn.com/light_all/${zoom}/${col}/${row}@2x.png`,
            min: 0,
            max: 19,
            tileSize: 512,
          })
        );

        const map = new H.Map(
          mapRef.current,
          positronLayer,
          {
            zoom: 15,
            center: {
              lat: formData.lat,
              lng: formData.lng
            },
            pixelRatio: window.devicePixelRatio || 1,
          }
        );

        // Add marker
        const svgMarkup = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="#FF7300" stroke="white" stroke-width="3"/></svg>`;

        const icon = new H.map.Icon(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
          { size: { w: 32, h: 32 }, anchor: { x: 16, y: 16 } }
        );

        const marker = new H.map.Marker(
          { lat: formData.lat, lng: formData.lng },
          { icon }
        );

        map.addObject(marker);
        mapInstance.current = map;
        markerInstance.current = marker;

      } catch (error) {
        console.error("Mini map error:", error);
      }
    };

    // Small delay to ensure div is rendered
    setTimeout(initMiniMap, 100);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.dispose();
        mapInstance.current = null;
      }
    };
  }, [confirmed, formData.lat, formData.lng]);

  // Debounced search
  const handleSearch = (value: string) => {
    setQuery(value);
    setConfirmed(false);
    setSearchError("");

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/here/autocomplete?q=${encodeURIComponent(value)}`
        );
        const data = await res.json();
        setSuggestions(data.suggestions || []);

        if (data.suggestions?.length === 0) {
          setSearchError(
            "No results found. Try a different search."
          );
        }
      } catch (error) {
        setSearchError("Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // User selects suggestion
  const handleSelect = async (suggestion: any) => {
    setQuery(suggestion.title);
    setSuggestions([]);
    setLoading(true);
    setSearchError("");

    try {
      const res = await fetch(
        `/api/here/geocode?id=${encodeURIComponent(suggestion.id)}`
      );
      const data = await res.json();

      if (data.location) {
        updateForm({
          city:          data.location.city,
          state:         data.location.state,
          stateCode:     data.location.stateCode,
          zip:           data.location.zip,
          neighborhood:  data.location.neighborhood || "",
          lat:           data.location.lat,
          lng:           data.location.lng,
          ...(isEvent
            ? { streetAddress: data.location.streetAddress || suggestion.title }
            : {
                street1: data.location.street1 || "",
                street2: data.location.street2 || "",
              }
          ),
        });
        setConfirmed(true);
      } else {
        setSearchError(
          "Could not get coordinates. Try another result."
        );
      }
    } catch (error) {
      setSearchError("Failed to get location details.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = () => {
    setConfirmed(false);
    setQuery("");
    setSuggestions([]);
    setSearchError("");
    updateForm({
      lat: null, lng: null,
      city: "", state: "", stateCode: "",
      street1: "", street2: "", streetAddress: "",
    });
    if (mapInstance.current) {
      mapInstance.current.dispose();
      mapInstance.current = null;
    }
  };

  const canContinue =
    confirmed &&
    formData.lat !== null &&
    formData.lng !== null;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2
        text-black">
        {isEvent
          ? "Where is this event located?"
          : "Where is your business located?"
        }
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        {isEvent
          ? "Enter the venue address"
          : "Enter your main cross streets"
        }
      </p>

      <div className="space-y-4">

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={
              isEvent
                ? "e.g. 456 Spring St, Los Angeles"
                : "e.g. Main St & Broadway, Los Angeles"
            }
            className="w-full border-2 border-gray-200
              rounded-xl px-4 py-3 text-sm text-black
              focus:outline-none focus:border-black
              transition"
          />
          {loading && (
            <div className="absolute right-4 top-3.5">
              <div className="w-4 h-4 border-2
                border-gray-300 border-t-black
                rounded-full animate-spin"/>
            </div>
          )}
        </div>

        {/* Search error */}
        {searchError && (
          <p className="text-red-500 text-xs">
            {searchError}
          </p>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="border-2 border-gray-200
            rounded-xl overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelect(s)}
                className="w-full px-4 py-3 text-left
                  text-sm hover:bg-gray-50 border-b
                  border-gray-100 last:border-0
                  text-black"
              >
                <p className="font-medium">{s.title}</p>
                {s.address && (
                  <p className="text-gray-400 text-xs mt-0.5">
                    {s.address}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Confirmed location */}
        {confirmed && formData.lat && formData.lng && (
          <div>
            {/* Location details */}
            <div className="border-2 border-green-200
              bg-green-50 rounded-xl p-4 mb-3">
              <div className="flex items-start gap-3">
                <svg width="20" height="20"
                  viewBox="0 0 24 24" fill="none"
                  stroke="#22c55e" strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 mt-0.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium
                    text-black">
                    Location confirmed
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isEvent
                      ? formData.streetAddress
                      : `${formData.street1} & ${formData.street2}`
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    {formData.neighborhood
                      ? `${formData.neighborhood}, `
                      : ""
                    }
                    {formData.city}, {formData.stateCode}
                    {formData.zip
                      ? ` ${formData.zip}`
                      : ""
                    }
                  </p>
                </div>
                <button
                  onClick={handleChange}
                  className="text-xs text-gray-400
                    hover:text-gray-600 underline
                    flex-shrink-0"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Mini map preview */}
            <div className="rounded-xl overflow-hidden
              border-2 border-gray-200 mb-3">
              <div className="px-3 py-2 bg-gray-50
                border-b border-gray-200">
                <p className="text-xs text-gray-500">
                  📍 Pin preview — this is approximate
                </p>
              </div>
              <div
                ref={mapRef}
                style={{ height: "200px", width: "100%" }}
              />
            </div>

            {/* Privacy note for non-events */}
            {!isEvent && (
              <p className="text-xs text-gray-400
                text-center">
                Only cross streets are shown publicly.
                Your exact location stays private.
              </p>
            )}
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={nextStep}
          disabled={!canContinue}
          className="w-full bg-black text-white
            rounded-xl py-4 text-sm font-medium
            hover:bg-gray-800 transition
            disabled:opacity-40
            disabled:cursor-not-allowed"
        >
          Continue
        </button>

        {/* Manual fallback */}
        {!confirmed && (
          <p className="text-center text-xs
            text-gray-400">
            Can't find your location?{" "}
            <button
              className="text-black underline"
              onClick={() =>
                alert("Manual entry coming soon")
              }
            >
              Enter manually
            </button>
          </p>
        )}

      </div>
    </div>
  );
}