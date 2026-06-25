"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type SavedBusiness = {
  id:           string;
  name:         string;
  slug:         string;
  category:     string | null;
  sub_type:     string | null;
  price_tier:   number | null;
  avg_rating:   number;
  review_count: number;
  city:         string | null;
  neighborhood: string | null;
  logo_url:     string | null;
  collection:   string;
  saved_at:     string;
};

type Collection =
  | "all"
  | "want_to_visit"
  | "favorites"
  | "been_here"
  | "on_my_radar";

const COLLECTIONS: {
  value: Collection;
  label: string;
  emoji: string;
}[] = [
  { value: "all",           label: "All Saved", emoji: "🔖" },
  { value: "want_to_visit", label: "Want to Visit", emoji: "📍" },
  { value: "favorites",     label: "Favorites", emoji: "⭐" },
  { value: "been_here",     label: "Been Here", emoji: "✅" },
  { value: "on_my_radar",   label: "On My Radar", emoji: "👀" },
];

export default function SavedPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [saved, setSaved] = useState<SavedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCollection, setActiveCollection] =
    useState<Collection>("all");

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch("/api/saved");
      const data = await res.json();
      setSaved(data.saved || []);
    } catch (error) {
      console.error("Error fetching saved:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) fetchSaved();
  }, [session, isPending, router, fetchSaved]);

  const filtered = activeCollection === "all"
    ? saved
    : saved.filter(
        b => b.collection === activeCollection
      );

  const PRICE_TIER: Record<number, string> = {
    1: "$", 2: "$$", 3: "$$$", 4: "$$$$",
  };

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center
        min-h-screen">
        <div className="w-6 h-6 border-2
          border-gray-200 border-t-black
          rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="px-4 py-4 border-b
        border-gray-100">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-semibold
            text-black">
            Saved
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Your saved businesses
          </p>
        </div>
      </div>

      {/* Collection filter */}
      <div className="border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto
            py-3">
            {COLLECTIONS.map((col) => {
              const count = col.value === "all"
                ? saved.length
                : saved.filter(
                    b => b.collection === col.value
                  ).length;

              return (
                <button
                  key={col.value}
                  onClick={() =>
                    setActiveCollection(col.value)
                  }
                  className={`flex items-center gap-1.5
                    px-3 py-1.5 rounded-full text-xs
                    font-medium whitespace-nowrap
                    transition flex-shrink-0
                    ${activeCollection === col.value
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600"
                    }`}
                >
                  <span>{col.emoji}</span>
                  <span>{col.label}</span>
                  {count > 0 && (
                    <span className={`
                      ${activeCollection === col.value
                        ? "text-white opacity-70"
                        : "text-gray-400"
                      }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Saved list */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl mb-3">
              {activeCollection === "all"
                ? "🔖"
                : COLLECTIONS.find(
                    c => c.value === activeCollection
                  )?.emoji
              }
            </p>
            <p className="text-gray-400 text-sm mb-2">
              {activeCollection === "all"
                ? "No saved businesses yet"
                : `Nothing in ${COLLECTIONS.find(
                    c => c.value === activeCollection
                  )?.label} yet`
              }
            </p>
            <Link
              href="/directory"
              className="text-black text-sm underline"
            >
              Browse businesses
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((business) => (
              <Link
                key={business.id}
                href={`/${business.slug}`}
                className="flex items-center gap-3
                  border-2 border-gray-100 rounded-2xl
                  p-4 hover:border-gray-200 transition"
              >
                {/* Logo */}
                {business.logo_url ? (
                  <Image
                    src={business.logo_url}
                    alt={business.name}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-xl
                      object-cover flex-shrink-0
                      border border-gray-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl
                    bg-gray-100 flex-shrink-0 flex
                    items-center justify-center">
                    <svg width="20" height="20"
                      viewBox="0 0 24 24" fill="none"
                      stroke="#d1d5db" strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <rect x="3" y="3" width="18"
                        height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5"
                        r="1.5"/>
                      <polyline
                        points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-black
                    text-sm truncate">
                    {business.name}
                  </p>
                  <p className="text-xs text-gray-500
                    mt-0.5">
                    {business.category}
                  </p>
                  <div className="flex items-center
                    gap-2 mt-1">
                    {business.price_tier && (
                      <span className="text-xs
                        text-gray-500">
                        {PRICE_TIER[business.price_tier]}
                      </span>
                    )}
                    {business.avg_rating > 0 && (
                      <span className="text-xs
                        text-gray-500">
                        ★{" "}
                        {Number(business.avg_rating)
                          .toFixed(1)}
                      </span>
                    )}
                    <span className="text-xs
                      text-gray-400">
                      {business.neighborhood ||
                        business.city}
                    </span>
                  </div>
                </div>

                {/* Collection badge */}
                <div className="flex-shrink-0">
                  <span className="text-lg">
                    {COLLECTIONS.find(
                      c => c.value === business.collection
                    )?.emoji}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}