"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Submission = {
  id:           string;
  name:         string;
  slug:         string | null;
  type:         string;
  sub_type:     string | null;
  category:     string | null;
  status:       string;
  claim_status: string;
  created_at:   string;
  city:         string | null;
  state_code:   string | null;
};

type Claim = {
  id:            string;
  business_id:   string;
  business_name: string;
  business_slug: string | null;
  status:        string;
  requested_at:  string;
  resolved_at:   string | null;
};

export default function MySubmissionsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"submissions" | "claims">("submissions");

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
      return;
    }
    if (session) {
      fetchData();
    }
  }, [session, isPending]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/user/submissions");
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setClaims(data.claims || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "listed":
      case "approved":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-orange-100 text-orange-600";
      case "rejected":
        return "bg-red-100 text-red-600";
      case "duplicate":
        return "bg-gray-100 text-gray-500";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "listed":   return "Live";
      case "pending":  return "Under Review";
      case "rejected": return "Rejected";
      case "duplicate": return "Duplicate";
      case "approved": return "Approved";
      default:         return status;
    }
  };

  const SUB_TYPE_LABELS: Record<string, string> = {
    street_vendor:      "Street Vendor",
    food_truck:         "Food Truck",
    home_based:         "Home Based",
    market_based:       "Market Based",
    pop_up_based:       "Pop-Up Based",
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
            My Submissions
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Track your listings and claims
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("submissions")}
              className={`py-4 text-sm font-medium
                border-b-2 transition
                ${activeTab === "submissions"
                  ? "border-black text-black"
                  : "border-transparent text-gray-400"
                }`}
            >
              Businesses
              {submissions.length > 0 && (
                <span className="ml-2 text-xs
                  bg-gray-100 text-gray-600
                  px-2 py-0.5 rounded-full">
                  {submissions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("claims")}
              className={`py-4 text-sm font-medium
                border-b-2 transition
                ${activeTab === "claims"
                  ? "border-black text-black"
                  : "border-transparent text-gray-400"
                }`}
            >
              Claims
              {claims.length > 0 && (
                <span className="ml-2 text-xs
                  bg-gray-100 text-gray-600
                  px-2 py-0.5 rounded-full">
                  {claims.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* Submissions tab */}
        {activeTab === "submissions" && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm mb-2">
                  No submissions yet
                </p>
                <Link
                  href="/add-business"
                  className="text-black text-sm underline"
                >
                  Add your first business
                </Link>
              </div>
            ) : (
              submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="border-2 border-gray-100
                    rounded-2xl p-4"
                >
                  <div className="flex items-start
                    justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="font-semibold
                        text-black text-sm">
                        {sub.name}
                      </p>
                      <p className="text-xs
                        text-gray-500 mt-0.5">
                        {sub.sub_type
                          ? SUB_TYPE_LABELS[sub.sub_type]
                          : TYPE_LABELS[sub.type]
                        }
                        {sub.category
                          ? ` · ${sub.category}`
                          : ""
                        }
                      </p>
                      {(sub.city || sub.state_code) && (
                        <p className="text-xs
                          text-gray-400 mt-0.5">
                          {sub.city}
                          {sub.state_code
                            ? `, ${sub.state_code}`
                            : ""
                          }
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1
                      rounded-full font-medium
                      flex-shrink-0
                      ${getStatusColor(sub.status)}`}>
                      {getStatusLabel(sub.status)}
                    </span>
                  </div>

                  {/* Status message */}
                  <div className="text-xs text-gray-400
                    mb-3">
                    {sub.status === "pending" && (
                      <p>
                        Submitted{" "}
                        {new Date(sub.created_at)
                          .toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        . Under review — usually 1-3
                        business days.
                      </p>
                    )}
                    {sub.status === "listed" && (
                      <p>
                        Your listing is live on
                        Vendor Maps.
                      </p>
                    )}
                    {sub.status === "rejected" && (
                      <p>
                        Your submission was not approved.
                        This may be due to incomplete
                        information or a duplicate listing.
                      </p>
                    )}
                    {sub.status === "duplicate" && (
                      <p>
                        A listing for this business
                        already exists on Vendor Maps.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {sub.status === "listed" &&
                      sub.slug && (
                      <Link
                        href={`/${sub.slug}`}
                        className="text-xs bg-black
                          text-white px-3 py-1.5
                          rounded-lg"
                      >
                        View Listing
                      </Link>
                    )}
                    {sub.status === "listed" &&
                      sub.claim_status === "unclaimed" && (
                      <Link
                        href={`/claim/${sub.id}`}
                        className="text-xs border
                          border-gray-200 text-black
                          px-3 py-1.5 rounded-lg
                          hover:bg-gray-50 transition"
                      >
                        Claim as Owner
                      </Link>
                    )}
                    {sub.status === "listed" &&
                      sub.claim_status === "claimed" && (
                      <Link
                        href={
                          `/my-listings/${sub.id}/edit`
                        }
                        className="text-xs border
                          border-gray-200 text-black
                          px-3 py-1.5 rounded-lg
                          hover:bg-gray-50 transition"
                      >
                        Edit Listing
                      </Link>
                    )}
                    {sub.status === "rejected" && (
                      <Link
                        href="/add-business"
                        className="text-xs border
                          border-gray-200 text-black
                          px-3 py-1.5 rounded-lg
                          hover:bg-gray-50 transition"
                      >
                        Submit Again
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Add another */}
            {submissions.length > 0 && (
              <Link
                href="/add-business"
                className="flex items-center
                  justify-center gap-2 w-full
                  border-2 border-dashed
                  border-gray-200 rounded-2xl
                  py-4 text-sm text-gray-400
                  hover:border-gray-300 transition"
              >
                <svg width="16" height="16"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <line x1="12" y1="5"
                    x2="12" y2="19"/>
                  <line x1="5" y1="12"
                    x2="19" y2="12"/>
                </svg>
                Add another business
              </Link>
            )}
          </div>
        )}

        {/* Claims tab */}
        {activeTab === "claims" && (
          <div className="space-y-3">
            {claims.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm">
                  No claims submitted yet
                </p>
              </div>
            ) : (
              claims.map((claim) => (
                <div
                  key={claim.id}
                  className="border-2 border-gray-100
                    rounded-2xl p-4"
                >
                  <div className="flex items-start
                    justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold
                        text-black text-sm">
                        {claim.business_name}
                      </p>
                      <p className="text-xs
                        text-gray-400 mt-0.5">
                        Submitted{" "}
                        {new Date(claim.requested_at)
                          .toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1
                      rounded-full font-medium
                      flex-shrink-0
                      ${getStatusColor(claim.status)}`}>
                      {getStatusLabel(claim.status)}
                    </span>
                  </div>

                  {/* Status message */}
                  <p className="text-xs text-gray-400
                    mb-3">
                    {claim.status === "pending" &&
                      "Your claim is under review. We will verify your ownership within 1-3 business days."
                    }
                    {claim.status === "approved" &&
                      "Your claim has been approved. You are now the verified owner."
                    }
                    {claim.status === "rejected" &&
                      "Your claim was not approved. Please contact support for more information."
                    }
                  </p>

                  {/* Actions */}
                  {claim.status === "approved" &&
                    claim.business_slug && (
                    <div className="flex gap-2">
                      <Link
                        href={`/${claim.business_slug}`}
                        className="text-xs bg-black
                          text-white px-3 py-1.5
                          rounded-lg"
                      >
                        View Listing
                      </Link>
                      <Link
                        href={
                          `/my-listings/${claim.business_id}/edit`
                        }
                        className="text-xs border
                          border-gray-200 text-black
                          px-3 py-1.5 rounded-lg
                          hover:bg-gray-50 transition"
                      >
                        Edit Listing
                      </Link>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}