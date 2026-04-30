"use client";

import { useState } from "react";
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

  const isEvent = formData.subType === "market" ||
    formData.subType === "pop_up";

  // Search HERE Autocomplete
  const handleSearch = async (value: string) => {
    setQuery(value);
    setConfirmed(false);

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/here/autocomplete?q=${encodeURIComponent(value)}`
      );
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Autocomplete error:", error);
    } finally {
      setLoading(false);
    }
  };

  // User selects a suggestion
  const handleSelect = async (suggestion: any) => {
    setQuery(suggestion.title);
    setSuggestions([]);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/here/geocode?id=${suggestion.id}`
      );
      const data = await res.json();

      if (data.location) {
        updateForm({
          city:         data.location.city,
          state:        data.location.state,
          stateCode:    data.location.stateCode,
          zip:          data.location.zip,
          neighborhood: data.location.neighborhood || "",
          lat:          data.location.lat,
          lng:          data.location.lng,
          // For events — full address
          ...(isEvent && {
            streetAddress: data.location.streetAddress || "",
          }),
          // For permanent — cross streets
          ...(!isEvent && {
            street1: data.location.street1 || "",
            street2: data.location.street2 || "",
          }),
        });
        setConfirmed(true);
      }
    } catch (error) {
      console.error("Geocode error:", error);
    } finally {
      setLoading(false);
    }
  };

  const canContinue = confirmed &&
    formData.lat !== null &&
    formData.lng !== null;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2 text-black">
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

      {/* Search input */}
      <div className="relative mb-4">
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
            rounded-xl px-4 py-3 text-sm
            focus:outline-none focus:border-black
            text-black"
        />
        {loading && (
          <div className="absolute right-4 top-3.5">
            <div className="w-4 h-4 border-2
              border-gray-300 border-t-black
              rounded-full animate-spin"/>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <div className="border border-gray-200 rounded-xl
          overflow-hidden mb-4">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSelect(s)}
              className="w-full px-4 py-3 text-left text-sm
                hover:bg-gray-50 border-b border-gray-100
                last:border-0 text-black"
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
        <div className="border-2 border-green-200
          bg-green-50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg width="20" height="20"
              viewBox="0 0 24 24" fill="none"
              stroke="#22c55e" strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0 mt-0.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-black">
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
              </p>
            </div>
            <button
              onClick={() => {
                setConfirmed(false);
                setQuery("");
                updateForm({
                  lat: null, lng: null,
                  city: "", state: "",
                  street1: "", street2: "",
                  streetAddress: "",
                });
              }}
              className="ml-auto text-gray-400
                hover:text-gray-600 text-sm"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={nextStep}
        disabled={!canContinue}
        className="w-full bg-black text-white rounded-xl
          py-4 text-sm font-medium transition
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:bg-gray-800"
      >
        Continue
      </button>

      {/* Manual entry fallback */}
      {!confirmed && (
        <p className="text-center text-xs text-gray-400 mt-4">
          Can't find your location?{" "}
          <button
            className="text-black underline"
            onClick={() => {
              // We will build manual entry later
              alert("Manual entry coming soon");
            }}
          >
            Enter manually
          </button>
        </p>
      )}
    </div>
  );
}