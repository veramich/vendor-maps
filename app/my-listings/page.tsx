"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RemoveListingDialog from
  "@/components/ui/RemoveListingDialog";

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
  claim_status:       string;
  is_verified_owner:  boolean;
  is_submitter:       boolean;
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
  // The listing awaiting removal confirmation, if any.
  const [removing, setRemoving] = useState<Listing | null>(null);

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

  // Everything on this page is already live, so removal always archives
  // rather than deletes — reviews and saves from other users hang off these
  // listings. Errors are thrown so the dialog can surface them inline and
  // keep itself open instead of closing on a failure.
  const handleRemove = async (listing: Listing) => {
    const res = await fetch(
      `/api/user/submissions/${listing.id}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data.error || "Could not take this listing down."
      );
    }

    setListings(prev =>
      prev.filter(l => l.id !== listing.id)
    );
    setRemoving(null);
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
            My Listings
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Live businesses you submitted or manage
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {listings.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-gray-400 text-sm">
              You have no live listings yet
            </p>
            <p className="text-xs text-gray-300">
              Submissions still under review appear in
              My Submissions
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

                  <div className="flex-1">
                    <div className="flex items-start
                      justify-between gap-2">
                      <p className="font-semibold
                        text-black text-sm">
                        {listing.name}
                      </p>
                      {/* Verified badge — only for listings whose
                          ownership was actually confirmed via a claim.
                          A listing the user merely submitted isn't
                          verified, so it shows a claim prompt instead. */}
                      {listing.is_verified_owner ? (
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
                      ) : (
                        <span className="text-xs
                          text-gray-400 flex-shrink-0">
                          Submitted
                        </span>
                      )}
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
                      `/my-submissions/${listing.id}/edit`
                    }
                    className="flex-1 text-center
                      bg-black text-white text-xs
                      font-medium py-2.5 rounded-xl
                      hover:bg-gray-800 transition"
                  >
                    Edit Listing
                  </Link>
                  {/* Archiving is submitter-only. A verified owner who claimed
                      a listing someone else added can edit it but not pull it
                      down; they use the report flow on the listing page. */}
                  {listing.is_submitter && (
                  <button
                    type="button"
                    onClick={() => setRemoving(listing)}
                    aria-label={`Archive ${listing.name}`}
                    title="Archive"
                    className="px-3 border-2
                      border-gray-200 text-gray-400
                      rounded-xl hover:border-red-200
                      hover:text-red-600 transition"
                  >
                    <svg width="14" height="14"
                      viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <polyline points="21 8 21 21 3 21 3 8"/>
                      <rect x="1" y="3" width="22"
                        height="5"/>
                      <line x1="10" y1="12"
                        x2="14" y2="12"/>
                    </svg>
                  </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RemoveListingDialog
        businessName={removing?.name || ""}
        mode="archive"
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => handleRemove(removing!)}
      />
    </div>
  );
}