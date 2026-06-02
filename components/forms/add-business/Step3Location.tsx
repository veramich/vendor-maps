"use client";

import { useState, useEffect, useRef } from "react";

const PRIMARY = "#FF7300";
import { BusinessFormData } from "@/lib/types/business";

interface Step3LocationProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  nextStep: () => void;
}

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

type LocationResult = {
  id:          string;
  title:       string;
  address:     string;
  lat:         number;
  lng:         number;
  city:        string;
  state:       string;
  stateCode:   string;
  zip:         string;
  neighborhood: string;
};

export default function Step3Location({
  formData,
  updateForm,
  nextStep,
}: Step3LocationProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [selectedResult, setSelectedResult] =
    useState<LocationResult | null>(null);
  const [notOnMap, setNotOnMap] =
    useState(formData.noFixedLocation);
  const [showResults, setShowResults] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  const isEvent =
    formData.subType === "market" ||
    formData.subType === "pop_up";

  // Load HERE script
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

  // Mini map when location selected
  useEffect(() => {
    if (
      !selectedResult ||
      !mapRef.current ||
      notOnMap
    ) return;

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

        await new Promise(r => setTimeout(r, 300));

        const H = (window as any).H;
        if (!H) return;

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
            ) =>
              `https://a.basemaps.cartocdn.com/light_all/${zoom}/${col}/${row}@2x.png`,
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
              lat: selectedResult.lat,
              lng: selectedResult.lng,
            },
            pixelRatio: window.devicePixelRatio || 1,
          }
        );

        const svgMarkup = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="16" fill="${PRIMARY}" stroke="white" stroke-width="3"/></svg>`;

        const icon = new H.map.Icon(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
          {
            size: { w: 36, h: 36 },
            anchor: { x: 18, y: 18 },
          }
        );

        const marker = new H.map.Marker(
          {
            lat: selectedResult.lat,
            lng: selectedResult.lng,
          },
          { icon }
        );

        map.addObject(marker);

        const mapEvents = new H.mapevents.MapEvents(map);
        new H.mapevents.Behavior(mapEvents);

        mapInstance.current = map;

      } catch (error) {
        console.error("Mini map error:", error);
      }
    };

    setTimeout(initMiniMap, 100);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.dispose();
        mapInstance.current = null;
      }
    };
  }, [selectedResult, notOnMap]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (isEvent) {
      if (!formData.streetAddress.trim()) {
        newErrors.streetAddress =
          "Street address is required";
      }
    } else {
      if (!formData.street1.trim()) {
        newErrors.street1 = "Street 1 is required";
      }
      if (!formData.street2.trim()) {
        newErrors.street2 = "Street 2 is required";
      }
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.stateCode) {
      newErrors.stateCode = "State is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = async () => {
    if (!validate()) return;

    setSearching(true);
    setSearchError("");
    setResults([]);
    setSelectedResult(null);
    setShowResults(false);
    setNotOnMap(false);

    if (mapInstance.current) {
      mapInstance.current.dispose();
      mapInstance.current = null;
    }

    const query = isEvent
      ? `${formData.streetAddress}, ${formData.city}, ${formData.stateCode}${formData.zip ? ` ${formData.zip}` : ""}`
      : `${formData.street1} & ${formData.street2}, ${formData.city}, ${formData.stateCode}${formData.zip ? ` ${formData.zip}` : ""}`;

    try {
      const res = await fetch(
        `/api/here/autocomplete?q=${encodeURIComponent(query)}&city=${encodeURIComponent(formData.city)}&state=${encodeURIComponent(formData.stateCode)}`
      );
      const data = await res.json();

      if (!data.suggestions?.length) {
        setSearchError(
          "No results found. Try adjusting your " +
          "address or check the box below."
        );
        setShowResults(true);
        setSearching(false);
        return;
      }

      // Geocode top 3 suggestions
      const geocoded: LocationResult[] = [];

      for (const suggestion of
        data.suggestions.slice(0, 3)) {
        try {
          const geoRes = await fetch(
            `/api/here/geocode?id=${encodeURIComponent(suggestion.id)}`
          );
          const geoData = await geoRes.json();

          if (geoData.location?.lat &&
              geoData.location?.lng) {
            geocoded.push({
              id:          suggestion.id,
              title:       suggestion.title,
              address:     suggestion.address,
              lat:         geoData.location.lat,
              lng:         geoData.location.lng,
              city:        geoData.location.city || "",
              state:       geoData.location.state || "",
              stateCode:   geoData.location.stateCode || "",
              zip:         geoData.location.zip || "",
              neighborhood:
                geoData.location.neighborhood || "",
            });
          }
        } catch {
          // Skip failed geocodes
        }
      }

      setResults(geocoded);
      setShowResults(true);

    } catch (error) {
      setSearchError(
        "Search failed. Please try again."
      );
      setShowResults(true);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: LocationResult) => {
    setSelectedResult(result);
    setNotOnMap(false);

    updateForm({
      lat:          result.lat,
      lng:          result.lng,
      noFixedLocation: false,
      neighborhood: result.neighborhood,
      city:         result.city || formData.city,
      state:        result.state || formData.state,
      stateCode:    result.stateCode || formData.stateCode,
      zip:          formData.zip || result.zip,
    });
  };

  const handleNotOnMap = (checked: boolean) => {
    setNotOnMap(checked);

    if (checked) {
      setSelectedResult(null);
      if (mapInstance.current) {
        mapInstance.current.dispose();
        mapInstance.current = null;
      }
      // Directory-only: clear coords and flag it as the source of truth
      // for the derived subType at submit.
      updateForm({
        lat: null,
        lng: null,
        noFixedLocation: true,
      });
    } else {
      updateForm({ noFixedLocation: false });
    }
  };

  const handleReset = () => {
    setShowResults(false);
    setResults([]);
    setSelectedResult(null);
    setNotOnMap(false);
    setSearchError("");
    updateForm({ lat: null, lng: null, noFixedLocation: false });
    if (mapInstance.current) {
      mapInstance.current.dispose();
      mapInstance.current = null;
    }
  };

  const canContinue =
    selectedResult !== null || notOnMap;

  const inputClass = (field: string) =>
    `w-full border-2 rounded-xl px-4 py-3 text-sm
    text-black focus:outline-none transition
    ${errors[field]
      ? "border-red-400 focus:border-red-400"
      : "border-gray-200 focus:border-black"
    }`;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2
        text-black">
        {isEvent
          ? "Where is this event located?"
          : "Where is the business located?"
        }
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        {isEvent
          ? "Enter the venue address"
          : <>
              We will not ask for the address, just the cross streets.
              <br />
              This helps us place it on the map.
            </>
        }
      </p>

      <div className="space-y-4">

        {/* Address fields */}
        {!showResults && (
          <>
            {/* Directory-only opt-out — placed first so vendors without a
                fixed spot can skip the address entirely. Checking it
                collapses the rest of this section. */}
            {!isEvent && (
              <label className="flex items-center gap-2
                cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={notOnMap}
                  onChange={(e) =>
                    handleNotOnMap(e.target.checked)
                  }
                  className="w-4 h-4 rounded flex-shrink-0"
                />
                <span className="text-sm text-gray-600">
                  This business has no fixed location
                </span>
              </label>
            )}

            {/* When directory-only is checked, the address fields collapse
                and a Continue button is shown instead. */}
            {notOnMap && !isEvent && (
              <div className="bg-gray-50 rounded-xl p-4
                space-y-4">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16"
                    viewBox="0 0 24 24" fill="none"
                    stroke="#6b7280" strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16"
                      x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-xs text-gray-500">
                    No address needed. The business will
                    appear in the directory but not as a pin
                    on the map.
                  </p>
                </div>
                <button
                  onClick={nextStep}
                  className="w-full bg-black text-white
                    rounded-xl py-4 text-sm font-medium
                    hover:bg-gray-800 transition"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Cross streets */}
            {!notOnMap && !isEvent && (
              <>
                <div>
                  <label className="block text-sm
                    font-medium text-black mb-1">
                    Street 1
                    <span className="text-red-500 ml-1">
                      *
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.street1}
                    onChange={(e) => {
                      updateForm({
                        street1: e.target.value
                      });
                      if (errors.street1) setErrors(
                        prev => ({
                          ...prev, street1: ""
                        })
                      );
                    }}
                    placeholder="e.g. Main St"
                    className={inputClass("street1")}
                  />
                  {errors.street1 && (
                    <p className="text-red-500 text-xs
                      mt-1">
                      {errors.street1}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm
                    font-medium text-black mb-1">
                    Street 2
                    <span className="text-red-500 ml-1">
                      *
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.street2}
                    onChange={(e) => {
                      updateForm({
                        street2: e.target.value
                      });
                      if (errors.street2) setErrors(
                        prev => ({
                          ...prev, street2: ""
                        })
                      );
                    }}
                    placeholder="e.g. Broadway"
                    className={inputClass("street2")}
                  />
                  {errors.street2 && (
                    <p className="text-red-500 text-xs
                      mt-1">
                      {errors.street2}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Full address for events */}
            {isEvent && (
              <div>
                <label className="block text-sm
                  font-medium text-black mb-1">
                  Street Address
                  <span className="text-red-500 ml-1">
                    *
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.streetAddress}
                  onChange={(e) => {
                    updateForm({
                      streetAddress: e.target.value
                    });
                    if (errors.streetAddress) setErrors(
                      prev => ({
                        ...prev, streetAddress: ""
                      })
                    );
                  }}
                  placeholder="e.g. 456 Spring St"
                  className={inputClass("streetAddress")}
                />
                {errors.streetAddress && (
                  <p className="text-red-500 text-xs
                    mt-1">
                    {errors.streetAddress}
                  </p>
                )}
              </div>
            )}

            {/* Shared location fields + search (hidden when directory-only) */}
            {!notOnMap && (
            <>
            {/* City */}
            <div>
              <label className="block text-sm
                font-medium text-black mb-1">
                City
                <span className="text-red-500 ml-1">
                  *
                </span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => {
                  updateForm({ city: e.target.value });
                  if (errors.city) setErrors(
                    prev => ({ ...prev, city: "" })
                  );
                }}
                placeholder="e.g. Los Angeles"
                className={inputClass("city")}
              />
              {errors.city && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.city}
                </p>
              )}
            </div>

            {/* State */}
            <div>
              <label className="block text-sm
                font-medium text-black mb-1">
                State
                <span className="text-red-500 ml-1">
                  *
                </span>
              </label>
              <select
                value={formData.stateCode}
                onChange={(e) => {
                  const selected = US_STATES.find(
                    s => s.code === e.target.value
                  );
                  updateForm({
                    stateCode: e.target.value,
                    state:     selected?.name || "",
                  });
                  if (errors.stateCode) setErrors(
                    prev => ({ ...prev, stateCode: "" })
                  );
                }}
                className={inputClass("stateCode")}
              >
                <option value="">Select a state</option>
                {US_STATES.map((state) => (
                  <option
                    key={state.code}
                    value={state.code}
                  >
                    {state.name}
                  </option>
                ))}
              </select>
              {errors.stateCode && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.stateCode}
                </p>
              )}
            </div>

            {/* Zip */}
            <div>
              <label className="block text-sm
                font-medium text-black mb-1">
                Zip Code
                <span className="text-gray-400 text-xs
                  font-normal ml-2">
                  Optional
                </span>
              </label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) =>
                  updateForm({ zip: e.target.value })
                }
                placeholder="e.g. 90012"
                maxLength={10}
                className={inputClass("zip")}
              />
            </div>


            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={searching}
              className="w-full border-2 border-black
                text-black rounded-xl py-4 text-sm
                font-medium hover:bg-gray-50 transition
                disabled:opacity-50
                disabled:cursor-not-allowed"
            >
              {searching
                ? "Searching..."
                : "Find Location"
              }
            </button>
            </>
            )}
          </>
        )}

        {/* Results section */}
        {showResults && (
          <div className="space-y-4">

            {/* Search summary */}
            <div className="flex items-center
              justify-between">
              <p className="text-sm font-medium
                text-black">
                {isEvent
                  ? formData.streetAddress
                  : `${formData.street1} & ${formData.street2}`
                }
                {formData.city
                  ? `, ${formData.city}`
                  : ""
                }
              </p>
              <button
                onClick={handleReset}
                className="text-xs text-gray-400
                  underline hover:text-gray-600"
              >
                Edit
              </button>
            </div>

            {/* Error */}
            {searchError && (
              <div className="bg-red-50 border-2
                border-red-200 rounded-xl p-4">
                <p className="text-xs text-red-600">
                  {searchError}
                </p>
              </div>
            )}

            {/* Results list */}
            {results.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Select the correct location:
                </p>
                <div className="space-y-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() =>
                        handleSelectResult(result)
                      }
                      className={`w-full border-2
                        rounded-xl p-4 text-left
                        transition
                        ${selectedResult?.id === result.id
                          ? "border-black bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <div className="flex items-start
                        gap-3">
                        <div className={`w-5 h-5
                          rounded-full border-2
                          flex-shrink-0 mt-0.5
                          flex items-center
                          justify-center transition
                          ${selectedResult?.id ===
                            result.id
                            ? "border-black bg-black"
                            : "border-gray-300"
                          }`}>
                          {selectedResult?.id ===
                            result.id && (
                            <div className="w-2 h-2
                              rounded-full bg-white"/>
                          )}
                        </div>
                        <div>
                          <p className="text-sm
                            font-medium text-black">
                            {result.title}
                          </p>
                          <p className="text-xs
                            text-gray-500 mt-0.5">
                            {result.address}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Directory-only checkbox */}
            <label className={`flex items-start gap-3
              cursor-pointer p-4 border-2 rounded-xl
              transition
              ${notOnMap
                ? "border-black bg-gray-50"
                : "border-gray-200"
              }`}>
              <input
                type="checkbox"
                checked={notOnMap}
                onChange={(e) =>
                  handleNotOnMap(e.target.checked)
                }
                className="w-4 h-4 rounded mt-0.5
                  flex-shrink-0"
              />
              <div>
                <p className="text-sm font-medium
                  text-black">
                  The business location is not listed above
                </p>
                <p className="text-xs text-gray-400
                  mt-0.5">
                  The business will appear in the directory
                  but not as a pin on the map.
                </p>
              </div>
            </label>

            {/* Map preview */}
            {selectedResult && !notOnMap && (
              <div className="rounded-2xl overflow-hidden
                border-2 border-gray-200">
                <div className="px-4 py-2 bg-gray-50
                  border-b border-gray-200 flex
                  items-center gap-2">
                  <svg width="14" height="14"
                    viewBox="0 0 24 24" fill="none"
                    stroke="var(--primary)" strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13S3
                      17 3 10a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <p className="text-xs text-gray-500">
                    The marker will appear here
                  </p>
                </div>
                <div
                  ref={mapRef}
                  style={{
                    height: "220px",
                    width: "100%",
                  }}
                />
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

          </div>
        )}

      </div>
    </div>
  );
}