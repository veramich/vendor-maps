"use client";

import { useEffect, useState } from "react";
import SearchBar from "@/components/ui/SearchBar";
import FilterPanel from "@/components/ui/FilterPanel";
import {
  BusinessFilters,
  EMPTY_FILTERS,
  filtersToParams,
  localNowParams,
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
  logo_url: string | null;
  brand_name: string | null;
  brand_logo: string | null;
  icon_name: string | null;
  neighborhood: string;
  city: string;
  street_1: string | null;
  street_2: string | null;
  street_address: string | null;
  image_url: string | null;
  is_open: boolean | null;
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
        // Always send the local clock so each card's open/closed badge resolves,
        // even when the "open now" filter itself is off.
        const now = localNowParams();
        if (!params.has("now_day")) {
          params.set("now_day", now.now_day);
          params.set("prev_day", now.prev_day);
          params.set("now_time", now.now_time);
        }
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
        <div className="max-w-lg mx-auto px-4 py-4 grid grid-cols-2 gap-3">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}

// Price range shown on the card footer, derived from the 1–4 tier.
const PRICE_RANGES: Record<number, string> = {
  1: "$ - $10",
  2: "$10 - $25",
  3: "$25 - $50",
  4: "$50+",
};

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          className={i <= rounded ? "fill-primary" : "fill-white/80"}
        >
          <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" />
        </svg>
      ))}
    </div>
  );
}

function BusinessCard({ business }: { business: Business }) {
  const priceRange = PRICE_RANGES[business.price_tier] || PRICE_RANGES[1];
  const logo = business.logo_url || business.brand_logo;
  const iconSrc = business.icon_name
    ? `/icons/categories/${business.icon_name}.png`
    : null;
  const businessHref = `/${business.slug || business.id}`;
  // When there's no cover, the image area becomes a CTA into the photo step of
  // the suggest-edit flow (which gates on sign-in) rather than the listing.
  const addPhotoHref = `/my-submissions/${business.id}/edit?step=6`;

  const address =
    business.street_1 && business.street_2
      ? `${business.street_1} & ${business.street_2}`
      : business.street_address || "";
  const locality = [business.neighborhood || null, business.city || null]
    .filter(Boolean)
    .join(", ");

  // Card is split into two sibling links (cover + details) so the cover can lead
  // somewhere different when there's no photo, without nesting <a> in <a>.
  return (
    <div
      className="group block bg-background border border-gray-100 rounded-2xl
        overflow-hidden hover:border-gray-200 hover:shadow-sm transition"
    >
      {/* Cover image */}
      <div className="relative w-full aspect-[16/10]">
        {business.image_url ? (
          <a href={businessHref} className="block w-full h-full active:scale-99">
            <img
              src={business.image_url}
              alt={business.name}
              className="w-full h-full object-cover"
            />
          </a>
        ) : (
          // No photo: tappable CTA into the add-a-photo flow.
          <a
            href={addPhotoHref}
            className="flex w-full h-full flex-col items-center justify-center
              gap-2 bg-primary/10 text-primary hover:bg-primary/15 transition
              active:scale-99"
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4" />
              <circle cx="12" cy="13" r="3" />
              <line x1="19" y1="3" x2="19" y2="9" />
              <line x1="22" y1="6" x2="16" y2="6" />
            </svg>
            <span className="text-xs font-medium">Add a photo or video</span>
          </a>
        )}

        {/* Top-left: logo or category icon badge (decorative overlay) */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 w-11 h-11
          rounded-full bg-primary ring-2 ring-white overflow-hidden
          flex items-center justify-center">
          {logo ? (
            <img src={logo} alt="" className="w-full h-full object-cover" />
          ) : iconSrc ? (
            <img src={iconSrc} alt="" className="w-7 h-7 object-contain invert" />
          ) : (
            <span className="text-white text-sm font-semibold">
              {business.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Top-right: category pill */}
        {business.category && (
          <span className="pointer-events-none absolute top-2.5 right-2.5
            px-2.5 py-1 rounded-full text-[11px] font-medium text-white
            bg-black/45 backdrop-blur-sm">
            {business.category}
          </span>
        )}

        {/* Bottom-left: rating */}
        {business.avg_rating > 0 && (
          <div className="pointer-events-none absolute bottom-2.5 left-2.5
            [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.5))]">
            <StarRating rating={Number(business.avg_rating)} />
          </div>
        )}
      </div>

      {/* Details */}
      <a href={businessHref} className="block p-4 active:scale-99">
        <p className="font-semibold text-foreground text-sm mb-0.5 truncate">
          {business.name}
        </p>
        {business.brand_name && business.brand_name !== business.name && (
          <p className="text-xs text-gray-400 mb-1">
            Part of {business.brand_name}
          </p>
        )}

        {address && (
          <div className="flex items-start gap-1.5 text-xs text-gray-600">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 flex-shrink-0 text-primary"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div className="min-w-0">
              <p className="truncate">{address}</p>
              {locality && <p className="text-gray-400 truncate">{locality}</p>}
            </div>
          </div>
        )}

        {/* Footer: open badge (only when open) + price */}
        <div className="flex items-center justify-between mt-3">
          {business.is_open ? (
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold
              text-green-700 border border-green-300 bg-green-50">
              OPEN
            </span>
          ) : (
            <span />
          )}
          <span className="text-sm text-foreground">{priceRange}</span>
        </div>
      </a>
    </div>
  );
}
