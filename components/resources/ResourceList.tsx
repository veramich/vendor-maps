"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Resource, DELIVERY_MODES } from "@/lib/types/resource";
import ResourceCard from "./ResourceCard";

const selectClass = `border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm
  text-black focus:outline-none focus:border-black transition bg-white
  disabled:opacity-50`;

export default function ResourceList({
  resources,
}: {
  resources: Resource[];
}) {
  const [query, setQuery] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  const [onDate, setOnDate] = useState("");

  // Resource types that actually appear among posts
  const types = useMemo(() => {
    const set = new Set<string>();
    for (const r of resources) {
      if (r.resourceType) set.add(r.resourceType);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [resources]);

  // States that actually appear among posted resources
  const states = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of resources) {
      if (r.stateCode) {
        map.set(r.stateCode, r.state || r.stateCode);
      }
    }
    return Array.from(map, ([code, name]) => ({ code, name })).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [resources]);

  // Cities available for the chosen state (or all states)
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const r of resources) {
      if (!r.city) continue;
      if (stateCode && r.stateCode !== stateCode) continue;
      set.add(r.city);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [resources, stateCode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return resources.filter((r) => {
      // Keyword — title, description, type
      if (q) {
        const haystack = [r.title, r.description, r.resourceType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (resourceType && r.resourceType !== resourceType) return false;

      // Delivery mode — "both" resources match either online or in person
      if (deliveryMode) {
        if (r.deliveryMode !== "both" && r.deliveryMode !== deliveryMode)
          return false;
      }

      if (stateCode && r.stateCode !== stateCode) return false;
      if (city && r.city !== city) return false;

      // Date — keep resources available on the chosen day.
      // Always-available ones always qualify; dated ones must
      // span the date (treating a missing start as open-ended).
      if (onDate) {
        if (!r.alwaysAvailable) {
          if (r.startDate && onDate < r.startDate) return false;
          if (r.endDate && onDate > r.endDate) return false;
        }
      }

      return true;
    });
  }, [resources, query, resourceType, deliveryMode, stateCode, city, onDate]);

  const hasActiveFilter =
    !!query ||
    !!resourceType ||
    !!deliveryMode ||
    !!stateCode ||
    !!city ||
    !!onDate;

  const clearAll = () => {
    setQuery("");
    setResourceType("");
    setDeliveryMode("");
    setStateCode("");
    setCity("");
    setOnDate("");
  };

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2
          text-gray-400 pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search grants, seminars, legal help…"
          className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-9
            py-2.5 text-sm text-black focus:outline-none focus:border-black
            transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2
              text-gray-400 hover:text-gray-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-2 mb-3">
        {types.length > 0 && (
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className={selectClass}
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        <select
          value={deliveryMode}
          onChange={(e) => setDeliveryMode(e.target.value)}
          className={selectClass}
        >
          <option value="">Online or in person</option>
          {DELIVERY_MODES.filter((m) => m.value !== "both").map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {states.length > 0 && (
          <select
            value={stateCode}
            onChange={(e) => {
              setStateCode(e.target.value);
              setCity(""); // reset city when state changes
            }}
            className={selectClass}
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {cities.length > 0 && (
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={selectClass}
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2 border-2 border-gray-200
          rounded-xl px-3 py-2.5 text-sm text-gray-500 bg-white
          focus-within:border-black transition">
          <span className="whitespace-nowrap">Available on</span>
          <input
            type="date"
            value={onDate}
            onChange={(e) => setOnDate(e.target.value)}
            className="text-black focus:outline-none bg-transparent"
          />
        </label>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-gray-400 underline hover:text-gray-600
              whitespace-nowrap px-1"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-400 mb-4">
        {filtered.length}{" "}
        {filtered.length === 1 ? "resource" : "resources"}
        {hasActiveFilter && " match your filters"}
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16
          text-center">
          <p className="text-gray-400">
            No resources match your search.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-black underline mt-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}

      {/* Subtle hint to contribute */}
      <div className="text-center mt-8">
        <Link
          href="/add-resource"
          className="text-sm text-gray-400 underline hover:text-gray-600"
        >
          Know a resource? Add one
        </Link>
      </div>
    </>
  );
}
