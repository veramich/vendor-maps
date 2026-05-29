"use client";

import { useState, useEffect, useRef } from "react";

export type SelectedAddress = {
  streetAddress: string;
  city:          string;
  state:         string;
  stateCode:     string;
  latitude:      number | null;
  longitude:     number | null;
};

type Suggestion = {
  id:      string;
  title:   string;
  address: string;
};

interface Props {
  // Current value (the resolved address, if any)
  value: SelectedAddress;
  onChange: (value: SelectedAddress) => void;
}

const EMPTY: SelectedAddress = {
  streetAddress: "",
  city:          "",
  state:         "",
  stateCode:     "",
  latitude:      null,
  longitude:     null,
};

export default function AddressAutocomplete({
  value,
  onChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const hasSelection = Boolean(
    value.city || value.streetAddress || value.stateCode
  );

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        boxRef.current &&
        !boxRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced autocomplete lookup
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);

    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/here/autocomplete?q=${encodeURIComponent(q)}`
        );
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const handleSelect = async (s: Suggestion) => {
    setOpen(false);
    setQuery("");
    setSuggestions([]);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/here/geocode?id=${encodeURIComponent(s.id)}`
      );
      const data = await res.json();
      const loc = data.location;

      onChange({
        streetAddress: loc?.streetAddress || s.address || s.title,
        city:          loc?.city || "",
        state:         loc?.state || "",
        stateCode:     loc?.stateCode || "",
        latitude:      loc?.lat ?? null,
        longitude:     loc?.lng ?? null,
      });
    } catch {
      // Fall back to the raw suggestion text
      onChange({
        ...EMPTY,
        streetAddress: s.address || s.title,
      });
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    onChange(EMPTY);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  };

  // Once an address is chosen, show it as a chip with a clear button
  if (hasSelection) {
    const display = [
      value.streetAddress,
      value.city,
      value.stateCode,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <div className="flex items-start justify-between gap-3 border-2
        border-gray-200 rounded-xl px-4 py-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"
            strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="text-sm text-black break-words">
            {display}
          </span>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-gray-400 underline hover:text-gray-600
            flex-shrink-0"
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder="Search an address, city, or place"
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3
          text-sm text-black focus:outline-none focus:border-black
          transition"
      />

      {loading && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </span>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border-2
          border-gray-200 rounded-xl overflow-hidden shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50
                transition border-b border-gray-100 last:border-0"
            >
              <p className="text-sm text-black">{s.title}</p>
              {s.address && s.address !== s.title && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {s.address}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
