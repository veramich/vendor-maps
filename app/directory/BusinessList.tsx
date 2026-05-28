"use client";

import { useEffect, useState } from "react";
import SearchBar from "@/components/ui/SearchBar";
import FilterPanel from "@/components/ui/FilterPanel";
import {
  BusinessFilters,
  EMPTY_FILTERS,
  filtersToParams,
} from "@/lib/businessFilters";

type Business = {
  id: string;
  slug: string;
  name: string;
  category: string;
  type: string;
  sub_type: string;
  price_tier: number;
  avg_rating: number;
  review_count: number;
  neighborhood: string;
  city: string;
};

const CATEGORIES = [
  "All",
  "Food",
  "Coffee",
  "Desserts",
  "Beverages",
  "Fresh Fruit",
  "Candy",
  "Produce",
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
  "Event Services",
  "Custom Designs",
  "Collectables",
  "Other",
];

export default function BusinessList() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [filters, setFilters] = useState<BusinessFilters>(EMPTY_FILTERS);

  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoading(true);
      try {
        const params = filtersToParams(filters);
        if (searchQuery) params.set("q", searchQuery);
        if (categoryFilter) params.set("category", categoryFilter);
        const qs = params.toString();
        const res = await fetch(
          `/api/businesses/directory${qs ? `?${qs}` : ""}`
        );
        const data = await res.json();
        setBusinesses(data.businesses || []);
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, [searchQuery, categoryFilter, filters]);

  const handleSearch = (q: string) => {
    setSearchQuery(q.trim());
  };

  const handleClearFilters = () => {
    setInputValue("");
    setSearchQuery("");
    setCategoryFilter("");
    setFilters(EMPTY_FILTERS);
  };

  const hasFilters =
    searchQuery || categoryFilter || filters !== EMPTY_FILTERS;

  return (
    <div>
      {/* Search + Category filters */}
      <div className="sticky top-28 bg-white z-10 border-b border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
          <SearchBar
            value={inputValue}
            onChange={setInputValue}
            onSearch={handleSearch}
            placeholder="Search by name, city, zip, keyword..."
            className="flex-1"
          />
          <FilterPanel value={filters} onChange={setFilters} />
        </div>
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map((cat) => {
              const isActive =
                cat === "All" ? categoryFilter === "" : categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() =>
                    setCategoryFilter(cat === "All" ? "" : cat)
                  }
                  className={`px-4 py-2 rounded-full text-xs font-medium
                    transition whitespace-nowrap
                    ${isActive
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600"
                    }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
        </div>
      ) : businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-gray-400 text-sm">
            {hasFilters
              ? "No businesses found for this search"
              : "No businesses listed yet"}
          </p>
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="text-black text-sm underline mt-2"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}

function BusinessCard({ business }: { business: Business }) {
  const priceTier = "$".repeat(business.price_tier || 1);

  const TYPE_LABELS: Record<string, string> = {
    permanent_location: "Permanent Location",
    no_location: "No Permanent Location",
  };

  return (
    <a
      href={`/${business.slug || business.id}`}
      className="block border border-gray-100 rounded-2xl
        p-4 hover:border-gray-200 transition
        active:scale-99"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-black text-sm mb-1">
            {business.name}
          </p>
          <p className="text-xs text-gray-500 mb-2">
            {business.category} ·{" "}
            {TYPE_LABELS[business.type] || ""}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{priceTier}</span>
            {business.avg_rating > 0 && (
              <span className="text-xs text-gray-500">
                ★ {Number(business.avg_rating).toFixed(1)}
                ({business.review_count})
              </span>
            )}
            <span className="text-xs text-gray-400">
              {business.neighborhood || business.city}
            </span>
          </div>
        </div>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </a>
  );
}
