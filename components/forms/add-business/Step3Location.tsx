"use client";

import { useState, useEffect, useRef } from "react";

const PRIMARY = "#FF7300";
import { BusinessFormData } from "@/lib/types/business";

interface Step3LocationProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  nextStep: () => void;
  // Verified owners may publish their exact address instead of just cross
  // streets — including home based and street based vendors, who otherwise
  // have no address on the listing at all. Mirrors Step4Info's allowLogo.
  allowExactAddress?: boolean;
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
  allowExactAddress = false,
}: Step3LocationProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);

  // Edit mode arrives with a saved address: coords already set, or a
  // directory-only (no_location) business. Seed the component so the saved
  // location is treated as the current selection — the user can Save without
  // re-geocoding, and only needs "Find Location" if they change the address.
  const hasSavedLocation =
    (formData.lat != null && formData.lng != null) ||
    formData.noFixedLocation;

  const [selectedResult, setSelectedResult] =
    useState<LocationResult | null>(
      formData.lat != null && formData.lng != null
        ? {
            id:           "existing",
            title:        formData.streetAddress ||
              `${formData.street1} & ${formData.street2}`,
            address:      "",
            lat:          formData.lat,
            lng:          formData.lng,
            city:         formData.city,
            state:        formData.state,
            stateCode:    formData.stateCode,
            zip:          formData.zip,
            neighborhood: formData.neighborhood,
          }
        : null
    );
  const [notOnMap, setNotOnMap] =
    useState(formData.noFixedLocation);

  // Verified owners choose how their location appears, rather than being
  // limited to cross streets. Derived from saved data on load: an exact
  // address wins, then the directory-only flag, else intersections.
  type OwnerLocationMode = "none" | "cross" | "exact";
  const [ownerMode, setOwnerMode] = useState<OwnerLocationMode>(
    formData.showExactAddress
      ? "exact"
      : formData.noFixedLocation
      ? "none"
      : "cross"
  );
  // Open straight to the summary/results view when a saved location exists.
  const [showResults, setShowResults] = useState(hasSavedLocation);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<HMap | null>(null);

  // Events no longer set subType in the merged flow — key off the top-level
  // type instead.
  const isEvent = formData.type === "event";

  // Events can give either a full street address or cross streets. Default to
  // full address; switch to cross streets if the form already has them (e.g.
  // returning to this step / editing). Small business always uses cross
  // streets, so this toggle is event-only.
  const [eventAddressMode, setEventAddressMode] = useState<
    "full" | "cross"
  >(
    isEvent && !formData.streetAddress && (formData.street1 || formData.street2)
      ? "cross"
      : "full"
  );

  // The owner picked "exact address" — that replaces the intersection inputs
  // and drives both the listing address and the map pin.
  const ownerExactMode =
    allowExactAddress && !isEvent && ownerMode === "exact";

  // Whether the cross-streets fields are the active address inputs.
  const useCrossStreets = isEvent
    ? eventAddressMode === "cross"
    : true;

  // Switch event address style, clearing the other style's fields so a stale
  // value from the hidden inputs can't be submitted alongside.
  const switchEventAddressMode = (mode: "full" | "cross") => {
    setEventAddressMode(mode);
    setErrors({});
    if (mode === "full") {
      updateForm({ street1: "", street2: "" });
    } else {
      updateForm({ streetAddress: "" });
    }
  };

  // Switch the owner's location mode. Each mode owns a different set of
  // fields, so clear the ones it doesn't use — otherwise a stale value from a
  // hidden input gets saved alongside (same reasoning as the event switcher).
  const switchOwnerMode = (mode: OwnerLocationMode) => {
    setOwnerMode(mode);
    setErrors({});
    setSearchError("");

    if (mode === "none") {
      setNotOnMap(true);
      setSelectedResult(null);
      setResults([]);
      setShowResults(false);
      if (mapInstance.current) {
        mapInstance.current.dispose();
        mapInstance.current = null;
      }
      updateForm({
        noFixedLocation:  true,
        showExactAddress: false,
        exactAddress:     "",
        street1:          "",
        street2:          "",
        lat:              null,
        lng:              null,
      });
      return;
    }

    setNotOnMap(false);

    if (mode === "cross") {
      updateForm({
        noFixedLocation:  false,
        showExactAddress: false,
        exactAddress:     "",
      });
    } else {
      // Exact address: the pin comes from the address itself, so the
      // intersection fields are cleared and re-derived server-side.
      setSelectedResult(null);
      setResults([]);
      setShowResults(false);
      updateForm({
        noFixedLocation:  false,
        showExactAddress: true,
        street1:          "",
        street2:          "",
      });
    }
  };

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

        const H = window.H;
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

        const container = mapRef.current;
        if (!container) return;

        const map = new H.Map(
          container,
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

    if (ownerExactMode) {
      if (!formData.exactAddress.trim()) {
        newErrors.exactAddress = "Street address is required";
      }
    } else if (useCrossStreets) {
      if (!formData.street1.trim()) {
        newErrors.street1 = "Street 1 is required";
      }
      if (!formData.street2.trim()) {
        newErrors.street2 = "Street 2 is required";
      }
    } else {
      if (!formData.streetAddress.trim()) {
        newErrors.streetAddress =
          "Street address is required";
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

    const streetPart = ownerExactMode
      ? formData.exactAddress
      : useCrossStreets
      ? `${formData.street1} & ${formData.street2}`
      : formData.streetAddress;

    const query =
      `${streetPart}, ${formData.city}, ${formData.stateCode}` +
      `${formData.zip ? ` ${formData.zip}` : ""}`;

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

    } catch {
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

  // Served zip editor for directory-only businesses. Up to 5 zips, 5-digit
  // each; blank entries are pruned at submit. Keeps at least one input row so
  // there is always somewhere to type.
  const MAX_SERVED_ZIPS = 5;
  const servedZips =
    formData.servedZips.length > 0 ? formData.servedZips : [""];

  const updateServedZip = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 5);
    const next = [...servedZips];
    next[index] = digits;
    updateForm({ servedZips: next });
  };

  const addServedZip = () => {
    if (servedZips.length >= MAX_SERVED_ZIPS) return;
    updateForm({ servedZips: [...servedZips, ""] });
  };

  const removeServedZip = (index: number) => {
    const next = servedZips.filter((_, i) => i !== index);
    updateForm({ servedZips: next.length > 0 ? next : [""] });
  };

  // A render helper (not a nested component) so the inputs keep focus across
  // keystrokes — a nested component would remount on every parent render.
  const renderServedZipEditor = () => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-black">
        Zip codes served
        <span className="text-gray-400 text-xs font-normal ml-2">
          Optional · up to {MAX_SERVED_ZIPS}
        </span>
      </label>
      <p className="text-xs text-gray-500">
        Add the zip code(s) this business delivers to or serves.
      </p>
      {servedZips.map((zip, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={zip}
            onChange={(e) => updateServedZip(i, e.target.value)}
            placeholder="e.g. 90012"
            maxLength={5}
            className="flex-1 border-2 border-gray-200 rounded-xl
              px-4 py-3 text-sm text-black focus:outline-none
              focus:border-black transition"
          />
          {(servedZips.length > 1 || zip) && (
            <button
              type="button"
              onClick={() => removeServedZip(i)}
              className="p-2 text-gray-400 hover:text-gray-700"
              aria-label="Remove zip code"
            >
              <svg width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      ))}
      {servedZips.length < MAX_SERVED_ZIPS && (
        <button
          type="button"
          onClick={addServedZip}
          className="text-xs font-medium text-black underline
            hover:text-gray-600"
        >
          + Add another zip code
        </button>
      )}
    </div>
  );

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
          ? "Enter the venue's full address or its cross streets."
          : allowExactAddress
          ? <>
              As a verified owner you choose how much of your
              location is public.
            </>
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
            {/* Verified owners pick how their location appears. Everyone else
                gets the plain directory-only opt-out below. */}
            {allowExactAddress && !isEvent && (
              <div className="space-y-2 mb-2">
                <p className="text-sm font-medium text-black">
                  How should your location appear?
                </p>
                {([
                  {
                    value: "none" as const,
                    title: "No location",
                    desc:  "Directory only, no pin on the map. " +
                           "You can list the zip codes you serve.",
                  },
                  {
                    value: "cross" as const,
                    title: "Cross streets",
                    desc:  "Show the nearest intersection instead " +
                           "of your address.",
                  },
                  {
                    value: "exact" as const,
                    title: "Exact address",
                    desc:  "Show your full street address and place " +
                           "your pin there.",
                  },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => switchOwnerMode(opt.value)}
                    className={`w-full border-2 rounded-xl p-4
                      text-left transition
                      ${ownerMode === opt.value
                        ? "border-black bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full
                        border-2 flex-shrink-0 mt-0.5 flex
                        items-center justify-center transition
                        ${ownerMode === opt.value
                          ? "border-black bg-black"
                          : "border-gray-300"
                        }`}>
                        {ownerMode === opt.value && (
                          <div className="w-2 h-2 rounded-full
                            bg-white"/>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium
                          text-black">
                          {opt.title}
                        </p>
                        <p className="text-xs text-gray-500
                          mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Directory-only opt-out — placed first so vendors without a
                fixed spot can skip the address entirely. Checking it
                collapses the rest of this section. */}
            {!isEvent && !allowExactAddress && (
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
                {renderServedZipEditor()}
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

            {/* Event address style toggle — full address or cross streets */}
            {isEvent && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => switchEventAddressMode("full")}
                  className={`border-2 rounded-xl py-2.5 text-sm
                    font-medium transition
                    ${eventAddressMode === "full"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 text-black"
                    }`}
                >
                  Full address
                </button>
                <button
                  type="button"
                  onClick={() => switchEventAddressMode("cross")}
                  className={`border-2 rounded-xl py-2.5 text-sm
                    font-medium transition
                    ${eventAddressMode === "cross"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 text-black"
                    }`}
                >
                  Cross streets
                </button>
              </div>
            )}

            {/* Exact address — verified owners only, replaces the
                intersection inputs and drives the map pin. */}
            {!notOnMap && ownerExactMode && (
              <div>
                <label className="block text-sm
                  font-medium text-black mb-1">
                  Street Address
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.exactAddress}
                  onChange={(e) => {
                    updateForm({
                      exactAddress: e.target.value,
                    });
                    if (errors.exactAddress) setErrors(
                      prev => ({ ...prev, exactAddress: "" })
                    );
                  }}
                  placeholder="e.g. 456 Spring St"
                  className={inputClass("exactAddress")}
                />
                {errors.exactAddress && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.exactAddress}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Shown publicly on your listing.
                </p>
              </div>
            )}

            {/* Cross streets */}
            {!notOnMap && !ownerExactMode && useCrossStreets && (
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

            {/* Full address (events, full-address mode) */}
            {!useCrossStreets && (
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
                {ownerExactMode
                  ? formData.exactAddress
                  : useCrossStreets
                  ? `${formData.street1} & ${formData.street2}`
                  : formData.streetAddress
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

            {/* Directory-only checkbox — small business only; events must
                have a location. Verified owners use the mode selector
                instead, so this would duplicate "No location" for them. */}
            {!isEvent && !allowExactAddress && (
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
            )}

            {/* Served zips for the post-search directory-only path */}
            {!isEvent && notOnMap && (
              <div className="bg-gray-50 rounded-xl p-4">
                {renderServedZipEditor()}
              </div>
            )}

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

            {/* Exact-address mode publishes the street address publicly and
                pins the map there — worth restating before they commit. */}
            {ownerExactMode && selectedResult && (
              <div className="bg-amber-50 border
                border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700">
                  ⚠ This address will be visible to everyone
                  on your listing, and your business will
                  appear as a pin on the map here.
                </p>
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