"use client";

import { useEffect, useState } from "react";

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

export default function BusinessList() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await fetch("/api/businesses/directory");
        const data = await res.json();
        setBusinesses(data.businesses || []);
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center
        py-20">
        <div className="w-6 h-6 border-2 border-gray-200
          border-t-black rounded-full animate-spin"/>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center
        justify-center py-20 px-4 text-center">
        <p className="text-gray-400 text-sm">
          No businesses listed yet
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
      {businesses.map((business) => (
        <BusinessCard
          key={business.id}
          business={business}
        />
      ))}
    </div>
  );
}

function BusinessCard({ business }: { business: Business }) {
  const priceTier = "$".repeat(business.price_tier || 1);

  const TYPE_LABELS: Record<string, string> = {
    permanent_location: "Permanent Location",
    no_location:        "No Permanent Location",
};

  return (
    <a
      href={`/${business.slug || business.id}`}
      className="block border border-gray-100 rounded-2xl
        p-4 hover:border-gray-200 transition
        active:scale-99"
    >
      <div className="flex items-start justify-between
        gap-3">
        <div className="flex-1">
          <p className="font-semibold text-black text-sm mb-1">
            {business.name}
          </p>
          <p className="text-xs text-gray-500 mb-2">
            {business.category} ·{" "}
            {TYPE_LABELS[business.type] || ""}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {priceTier}
            </span>
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

        <svg width="16" height="16"
          viewBox="0 0 24 24" fill="none"
          stroke="#9ca3af" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </a>
  );
}