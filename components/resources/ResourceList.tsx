"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Resource } from "@/lib/types/resource";
import ResourceCard from "./ResourceCard";

export default function ResourceList({
  resources,
}: {
  resources: Resource[];
}) {
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");

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
    return resources.filter((r) => {
      if (stateCode && r.stateCode !== stateCode) return false;
      if (city && r.city !== city) return false;
      return true;
    });
  }, [resources, stateCode, city]);

  const hasLocationData = states.length > 0 || cities.length > 0;

  return (
    <>
      {/* City / state filter */}
      {hasLocationData && (
        <div className="flex gap-2 mb-6">
          <select
            value={stateCode}
            onChange={(e) => {
              setStateCode(e.target.value);
              setCity(""); // reset city when state changes
            }}
            className="flex-1 border-2 border-gray-200 rounded-xl px-3
              py-2.5 text-sm text-black focus:outline-none
              focus:border-black transition bg-white"
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={cities.length === 0}
            className="flex-1 border-2 border-gray-200 rounded-xl px-3
              py-2.5 text-sm text-black focus:outline-none
              focus:border-black transition bg-white
              disabled:opacity-50"
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(stateCode || city) && (
            <button
              type="button"
              onClick={() => {
                setStateCode("");
                setCity("");
              }}
              className="text-sm text-gray-400 underline hover:text-gray-600
                whitespace-nowrap px-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16
          text-center">
          <p className="text-gray-400">
            No resources match this location.
          </p>
          <button
            type="button"
            onClick={() => {
              setStateCode("");
              setCity("");
            }}
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
