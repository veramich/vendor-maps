"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CLD } from "@/lib/utils/cldUrl";

type Listing = {
  id:           string;
  name:         string;
  slug:         string;
  type:         string;
  sub_type:     string | null;
  category:     string | null;
  status:       string;
  avg_rating:   number;
  review_count: number;
  city:         string | null;
  state_code:   string | null;
  logo_url:     string | null;
};

const SUB_TYPE_LABELS: Record<string, string> = {
  street_vendor:      "Street Vendor",
  food_truck:         "Food Truck",
  home_based:         "Home Based",
  market_based:       "Market Based",
  pop_up_based:       "Pop-Up Based",
  other:              "Other",
  // Legacy values kept for businesses submitted before the type list change
  catering_only:      "Catering",
  shipping_only:      "Shipping",
  market:             "Market",
  pop_up:             "Pop-Up Event",
};

const TYPE_LABELS: Record<string, string> = {
  permanent_location: "Permanent Location",
  no_location:        "No Location",
  event:              "Event",
};

export default function MyListingsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch("/api/user/listings");
      const data = await res.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
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
    if (session) fetchListings();
  }, [session, isPending, router, fetchListings]);

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
            My Listings
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Businesses you own and manage
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {listings.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-gray-400 text-sm">
              You have no verified listings yet
            </p>
            <p className="text-xs text-gray-300">
              Claim a business listing to manage it
            </p>
            <Link
              href="/directory"
              className="text-black text-sm underline
                block"
            >
              Browse businesses to claim
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="border-2 border-gray-100
                  rounded-2xl p-4"
              >
                <div className="flex items-start
                  gap-3 mb-4">

                  {/* Logo */}
                  {listing.logo_url ? (
                    <Image
                      src={CLD.thumb(listing.logo_url)}
                      alt={listing.name}
                      width={56}
                      height={56}
                      unoptimized
                      className="w-14 h-14 rounded-xl
                        object-cover border
                        border-gray-100 flex-shrink-0"
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

                  <div className="flex-1">
                    <div className="flex items-start
                      justify-between gap-2">
                      <p className="font-semibold
                        text-black text-sm">
                        {listing.name}
                      </p>
                      {/* Verified badge */}
                      <div className="flex items-center
                        gap-1 flex-shrink-0">
                        <svg width="12" height="12"
                          viewBox="0 0 24 24" fill="none"
                          stroke="#22c55e"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10
                            0 1 1-5.93-9.14"/>
                          <polyline points="22 4
                            12 14.01 9 11.01"/>
                        </svg>
                        <span className="text-xs
                          text-green-600">
                          Verified
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500
                      mt-0.5">
                      {listing.sub_type
                        ? SUB_TYPE_LABELS[listing.sub_type]
                        : TYPE_LABELS[listing.type]
                      }
                      {listing.category
                        ? ` · ${listing.category}`
                        : ""
                      }
                    </p>

                    {(listing.city ||
                      listing.state_code) && (
                      <p className="text-xs text-gray-400
                        mt-0.5">
                        {listing.city}
                        {listing.state_code
                          ? `, ${listing.state_code}`
                          : ""
                        }
                      </p>
                    )}

                    {listing.avg_rating > 0 && (
                      <p className="text-xs text-gray-500
                        mt-1">
                        ★{" "}
                        {Number(listing.avg_rating)
                          .toFixed(1)}{" "}
                        ({listing.review_count} reviews)
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/${listing.slug}`}
                    className="flex-1 text-center
                      border-2 border-gray-200
                      text-black text-xs font-medium
                      py-2.5 rounded-xl
                      hover:bg-gray-50 transition"
                  >
                    View Listing
                  </Link>
                  <Link
                    href={
                      `/my-listings/${listing.id}/edit`
                    }
                    className="flex-1 text-center
                      bg-black text-white text-xs
                      font-medium py-2.5 rounded-xl
                      hover:bg-gray-800 transition"
                  >
                    Edit Listing
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}