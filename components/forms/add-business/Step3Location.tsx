"use client";

import { useState, useEffect, useRef } from "react";
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

export default function Step3Location({
  formData,
  updateForm,
  nextStep,
}: Step3LocationProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  const isEvent =
    formData.subType === "market" ||
    formData.subType === "pop_up";

  // Load HERE script helper
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

  // Initialize mini map when location is confirmed
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
              lat: formData.lat,
              lng: formData.lng,
            },
            pixelRatio: window.devicePixelRatio || 1,
          }
        );

        // Add marker
        const svgMarkup = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="16" fill="#FF7300" stroke="white" stroke-width="3"/></svg>`;

        const icon = new H.map.Icon(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
          {
            size: { w: 36, h: 36 },
            anchor: { x: 18, y: 18 },
          }
        );

        const marker = new H.map.Marker(
          { lat: formData.lat, lng: formData.lng },
          { icon }
        );

        map.addObject(marker);

        const mapEvents = new H.mapevents.MapEvents(map);
        new H.mapevents.Behavior(mapEvents);

        window.addEventListener("resize", () => {
          map.getViewPort().resize();
        });

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
  }, [confirmed, formData.lat, formData.lng]);

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

  const handleFindLocation = async () => {
    if (!validate()) return;

    setGeocoding(true);
    setGeocodeError("");
    setConfirmed(false);

    if (mapInstance.current) {
      mapInstance.current.dispose();
      mapInstance.current = null;
    }

    const query = isEvent
      ? `${formData.streetAddress}, ${formData.city}, ${formData.stateCode}`
      : `${formData.street1} & ${formData.street2}, ${formData.city}, ${formData.stateCode}`;

    try {
      const res = await fetch(
        `/api/here/autocomplete?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();

      if (data.suggestions?.length > 0) {
        const first = data.suggestions[0];
        const geoRes = await fetch(
          `/api/here/geocode?id=${encodeURIComponent(first.id)}`
        );
        const geoData = await geoRes.json();

        if (geoData.location?.lat && geoData.location?.lng) {
          updateForm({
            lat:          geoData.location.lat,
            lng:          geoData.location.lng,
            neighborhood: geoData.location.neighborhood || "",
            zip:          formData.zip ||
                          geoData.location.zip || "",
          });
          setConfirmed(true);
        } else {
          setGeocodeError(
            "Could not find coordinates for this location. " +
            "Please check your address and try again."
          );
        }
      } else {
        setGeocodeError(
          "Location not found. Please check your " +
          "address and try again."
        );
      }
    } catch (error) {
      setGeocodeError(
        "Location lookup failed. Please try again."
      );
    } finally {
      setGeocoding(false);
    }
  };

  const handleEdit = () => {
    setConfirmed(false);
    setGeocodeError("");
    if (mapInstance.current) {
      mapInstance.current.dispose();
      mapInstance.current = null;
    }
  };

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

        {/* Cross streets */}
        {!isEvent && (
          <>
            <div>
              <label className="block text-sm
                font-medium text-black mb-1">
                Street 1
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={formData.street1}
                onChange={(e) => {
                  updateForm({ street1: e.target.value });
                  setConfirmed(false);
                  if (errors.street1) setErrors(
                    prev => ({ ...prev, street1: "" })
                  );
                }}
                placeholder="e.g. Main St"
                className={inputClass("street1")}
              />
              {errors.street1 && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.street1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm
                font-medium text-black mb-1">
                Street 2
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={formData.street2}
                onChange={(e) => {
                  updateForm({ street2: e.target.value });
                  setConfirmed(false);
                  if (errors.street2) setErrors(
                    prev => ({ ...prev, street2: "" })
                  );
                }}
                placeholder="e.g. Broadway"
                className={inputClass("street2")}
              />
              {errors.street2 && (
                <p className="text-red-500 text-xs mt-1">
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
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={formData.streetAddress}
              onChange={(e) => {
                updateForm({
                  streetAddress: e.target.value
                });
                setConfirmed(false);
                if (errors.streetAddress) setErrors(
                  prev => ({ ...prev, streetAddress: "" })
                );
              }}
              placeholder="e.g. 456 Spring St"
              className={inputClass("streetAddress")}
            />
            {errors.streetAddress && (
              <p className="text-red-500 text-xs mt-1">
                {errors.streetAddress}
              </p>
            )}
          </div>
        )}

        {/* City */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            City
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => {
              updateForm({ city: e.target.value });
              setConfirmed(false);
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
          <label className="block text-sm font-medium
            text-black mb-1">
            State
            <span className="text-red-500 ml-1">*</span>
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
              setConfirmed(false);
              if (errors.stateCode) setErrors(
                prev => ({ ...prev, stateCode: "" })
              );
            }}
            className={inputClass("stateCode")}
          >
            <option value="">Select a state</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
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

        {/* Zip optional */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Zip Code
            <span className="text-gray-400 text-xs
              font-normal ml-2">
              Optional
            </span>
          </label>
          <input
            type="text"
            value={formData.zip}
            onChange={(e) => {
              updateForm({ zip: e.target.value });
              setConfirmed(false);
            }}
            placeholder="e.g. 90012"
            maxLength={10}
            className={inputClass("zip")}
          />
        </div>

        {/* Privacy note */}
        {!isEvent && (
          <div className="bg-gray-50 rounded-xl p-4">
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
                Only cross streets are shown publicly.
                Your exact location stays private.
              </p>
            </div>
          </div>
        )}

        {/* Geocode error */}
        {geocodeError && (
          <div className="bg-red-50 border-2
            border-red-200 rounded-xl p-4">
            <p className="text-xs text-red-600">
              {geocodeError}
            </p>
          </div>
        )}

        {/* Find Location button */}
        {!confirmed && (
          <button
            onClick={handleFindLocation}
            disabled={geocoding}
            className="w-full border-2 border-black
              text-black rounded-xl py-4 text-sm
              font-medium hover:bg-gray-50 transition
              disabled:opacity-50
              disabled:cursor-not-allowed"
          >
            {geocoding
              ? "Finding location..."
              : "Find Location"
            }
          </button>
        )}

        {/* Map preview */}
        {confirmed && formData.lat && formData.lng && (
          <div>
            {/* Confirmed badge */}
            <div className="flex items-center
              justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100
                  rounded-full flex items-center
                  justify-center">
                  <svg width="12" height="12"
                    viewBox="0 0 24 24" fill="none"
                    stroke="#22c55e" strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="text-sm font-medium
                  text-black">
                  Location found
                </p>
              </div>
              <button
                onClick={handleEdit}
                className="text-xs text-gray-400
                  hover:text-gray-600 underline"
              >
                Edit
              </button>
            </div>

            {/* Location summary */}
            <div className="bg-gray-50 rounded-xl
              px-4 py-3 mb-3">
              <p className="text-sm text-black font-medium">
                {isEvent
                  ? formData.streetAddress
                  : `${formData.street1} & ${formData.street2}`
                }
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formData.neighborhood
                  ? `${formData.neighborhood}, `
                  : ""
                }
                {formData.city}, {formData.stateCode}
                {formData.zip ? ` ${formData.zip}` : ""}
              </p>
            </div>

            {/* Map preview */}
            <div className="rounded-2xl overflow-hidden
              border-2 border-gray-200">
              <div className="px-4 py-2 bg-gray-50
                border-b border-gray-200 flex items-center
                gap-2">
                <svg width="14" height="14"
                  viewBox="0 0 24 24" fill="none"
                  stroke="#FF7300" strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13S3
                    17 3 10a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <p className="text-xs text-gray-500">
                  {isEvent
                    ? "Approximate venue location"
                    : "Approximate cross street location"
                  }
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

            {/* Continue button */}
            <button
              onClick={nextStep}
              className="w-full bg-black text-white
                rounded-xl py-4 text-sm font-medium
                hover:bg-gray-800 transition mt-4"
            >
              Continue
            </button>
          </div>
        )}

      </div>
    </div>
  );
}