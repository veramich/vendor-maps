"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RemoveListingDialog, { RemoveMode } from
  "@/components/ui/RemoveListingDialog";

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
  is_live_edit: boolean;
  can_restore:  boolean;
  city:         string | null;
  state_code:   string | null;
  // True when this user is the confirmed owner via an approved claim, as
  // opposed to merely having submitted the row.
  is_verified_owner: boolean;
  is_submitter:      boolean;
};

type Claim = {
  id:              string;
  business_id:     string;
  business_name:   string;
  business_slug:   string | null;
  status:          string;
  requested_at:    string;
  resolved_at:     string | null;
  // The claimed business's own state, so an approved claim can offer the
  // archive/restore actions a verified owner is entitled to.
  business_status: string;
  claim_status:    string;
  is_submitter:    boolean;
  can_restore:     boolean;
};

type Tab = "all" | "listed" | "not_listed" | "claimed";

// What an empty tab says, and where it points. "Not Listed" being empty is
// good news rather than a gap to fill, so it nudges toward the live listings
// instead of asking for another submission.
const EMPTY_STATES: Record<
  Tab,
  { message: string; cta: string; href: string }
> = {
  all: {
    message: "No submissions yet",
    cta:     "Add your first business",
    href:    "/add-business",
  },
  listed: {
    message: "You have no live listings yet",
    cta:     "Add your first business",
    href:    "/add-business",
  },
  not_listed: {
    message: "Nothing pending or archived — everything you "
             + "submitted is live",
    cta:     "Add another business",
    href:    "/add-business",
  },
  claimed: {
    message: "You have not claimed any businesses yet",
    cta:     "Browse businesses to claim",
    href:    "/directory",
  },
};

export default function MySubmissionsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  // The listing awaiting removal confirmation, if any. Every card feeds this:
  // a claim card removes the business it points at, so only the business id,
  // display name and archive-vs-delete mode matter here.
  const [removing, setRemoving] = useState<
    { id: string; name: string; mode: RemoveMode } | null
  >(null);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
      return;
    }
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [session, isPending, router, fetchData]);

  // A submission that has been live — or is a pending edit of a live listing —
  // carries other users' reviews and saves, so it is archived rather than
  // deleted. Anything else was never public and is safe to delete outright.
  // Mirrors the branch the DELETE route takes server-side; the server decides
  // for itself, so a stale value here only mislabels the dialog.
  const removeMode = (sub: Submission) =>
    sub.status === "listed" || sub.is_live_edit
      ? "archive"
      : "delete";

  const handleRemove = async (target: { id: string }) => {
    const res = await fetch(
      `/api/user/submissions/${target.id}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data.error || "Could not remove this submission."
      );
    }

    // An archived listing leaves the public site but stays in the user's
    // history; a deleted one is gone. Refetching keeps both in step with
    // whichever branch the server actually took.
    setRemoving(null);
    await fetchData();
  };

  // Restoring is a plain status flip with nothing destroyed either way, so it
  // needs no confirmation dialog — unlike archiving, a misclick here is
  // undone by archiving again.
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (target: { id: string }) => {
    setRestoringId(target.id);
    try {
      const res = await fetch(
        `/api/user/submissions/${target.id}/restore`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not restore this listing.");
        return;
      }
      await fetchData();
    } finally {
      setRestoringId(null);
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
      case "unlisted": return "Archived";
      case "expired":  return "Expired";
      default:         return status;
    }
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

  // A claim on a business this user also submitted would render twice — once
  // from `submissions`, once from `claims` — giving one listing two archive
  // buttons. The submission card is the richer of the two, so it wins and the
  // duplicate claim card is dropped everywhere.
  const standaloneClaims = claims.filter(c => !c.is_submitter);

  // Approved claims on businesses this user did not submit are real listings
  // they manage, so they belong beside the submissions rather than in a
  // separate list. Everything else — pending and rejected claims — has no
  // listing behind it yet and only appears under "All".
  const ownedClaims = standaloneClaims.filter(
    c => c.status === "approved"
  );
  const unresolvedClaims = standaloneClaims.filter(
    c => c.status !== "approved"
  );

  // "Listed" is what is publicly visible right now; "Not Listed" is its exact
  // complement — pending, rejected, duplicate, archived and expired alike — so
  // the two together always account for every row even if a new status appears.
  // "Claimed" cuts across both: it is what this user is the verified owner of,
  // whether or not they submitted it and whether or not it is currently live.
  const listedSubmissions = submissions.filter(
    s => s.status === "listed"
  );
  const unlistedSubmissions = submissions.filter(
    s => s.status !== "listed"
  );
  const claimedSubmissions = submissions.filter(
    s => s.is_verified_owner
  );

  const listedClaims = ownedClaims.filter(
    c => c.business_status === "listed"
  );
  const unlistedClaims = ownedClaims.filter(
    c => c.business_status !== "listed"
  );

  const visibleSubmissions =
    activeTab === "listed"     ? listedSubmissions   :
    activeTab === "not_listed" ? unlistedSubmissions :
    activeTab === "claimed"    ? claimedSubmissions  :
    submissions;

  const visibleOwnedClaims =
    activeTab === "listed"     ? listedClaims   :
    activeTab === "not_listed" ? unlistedClaims :
    ownedClaims;

  // A claim still awaiting review — or rejected — has no live listing behind
  // it, so it belongs under "Not Listed" as much as under the unfiltered view.
  const visibleUnresolvedClaims =
    activeTab === "all" || activeTab === "not_listed"
      ? unresolvedClaims
      : [];

  const tabCounts: Record<Tab, number> = {
    all:        submissions.length + standaloneClaims.length,
    listed:     listedSubmissions.length + listedClaims.length,
    not_listed: unlistedSubmissions.length
                  + unlistedClaims.length
                  + unresolvedClaims.length,
    claimed:    claimedSubmissions.length + ownedClaims.length,
  };

  const isEmpty =
    visibleSubmissions.length === 0 &&
    visibleOwnedClaims.length === 0 &&
    visibleUnresolvedClaims.length === 0;

  const TABS: { key: Tab; label: string }[] = [
    { key: "all",        label: "All"        },
    { key: "listed",     label: "Listed"     },
    { key: "not_listed", label: "Not Listed" },
    { key: "claimed",    label: "Claimed"    },
  ];

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

      {/* Tabs. Four of them no longer fit across a narrow phone, so the row
          scrolls sideways rather than wrapping onto a second line — the
          scrollbar itself is hidden to keep it looking like a tab strip. */}
      <div className="border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex gap-5 overflow-x-auto
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 text-sm font-medium
                  border-b-2 transition whitespace-nowrap
                  flex-shrink-0
                  ${activeTab === tab.key
                    ? "border-black text-black"
                    : "border-transparent text-gray-400"
                  }`}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className="ml-2 text-xs
                    bg-gray-100 text-gray-600
                    px-2 py-0.5 rounded-full">
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="space-y-3">

          {isEmpty && (
            <div className="text-center py-16 space-y-2">
              <p className="text-gray-400 text-sm">
                {EMPTY_STATES[activeTab].message}
              </p>
              <Link
                href={EMPTY_STATES[activeTab].href}
                className="text-black text-sm underline
                  inline-block"
              >
                {EMPTY_STATES[activeTab].cta}
              </Link>
            </div>
          )}

          {/* Businesses this user submitted */}
          {visibleSubmissions.map((sub) => (
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
                <div className="flex flex-col items-end
                  gap-1 flex-shrink-0">
                  <span className={`text-xs px-2 py-1
                    rounded-full font-medium
                    ${getStatusColor(sub.status)}`}>
                    {getStatusLabel(sub.status)}
                  </span>
                  {/* Verified badge — only for listings whose ownership was
                      actually confirmed via a claim. A listing the user merely
                      submitted isn't verified, so it stays unbadged. */}
                  {sub.is_verified_owner && (
                    <div className="flex items-center
                      gap-1">
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
                  )}
                </div>
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
                    VendorMaps.
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
                    already exists on VendorMaps.
                  </p>
                )}
                {sub.status === "unlisted" && (
                  <p>
                    {sub.can_restore
                      ? "You archived this listing. It is hidden from the map and search, but nothing was deleted — restore it whenever you're ready."
                      : "This listing was taken down by our team. Contact us if you think that was a mistake."
                    }
                  </p>
                )}
              </div>


              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {sub.status === "listed" && sub.slug && (
                  <Link
                    href={`/${sub.slug}`}
                    className="text-xs bg-black text-white
                      px-3 py-1.5 rounded-lg"
                  >
                    View Listing
                  </Link>
                )}

                {/* Edit for both pending and listed */}
                {(sub.status === "pending" ||
                  sub.status === "listed") && (
                  <Link
                    href={`/my-submissions/${sub.id}/edit`}
                    className="text-xs border border-gray-200
                      text-black px-3 py-1.5 rounded-lg
                      hover:bg-gray-50 transition"
                  >
                    Edit
                  </Link>
                )}

                {sub.status === "listed" &&
                  sub.claim_status === "unclaimed" && (
                  <Link
                    href={`/claim/${sub.id}`}
                    className="text-xs border border-gray-200
                      text-black px-3 py-1.5 rounded-lg
                      hover:bg-gray-50 transition"
                  >
                    Claim as Owner
                  </Link>
                )}

                {sub.status === "unlisted" &&
                  sub.can_restore && (
                  <button
                    type="button"
                    onClick={() => handleRestore(sub)}
                    disabled={restoringId === sub.id}
                    className="text-xs bg-black text-white
                      px-3 py-1.5 rounded-lg
                      hover:bg-gray-800 transition
                      disabled:opacity-50"
                  >
                    {restoringId === sub.id
                      ? "Restoring…"
                      : "Restore"}
                  </button>
                )}

                {/* An already-unlisted or expired listing has nothing
                    left to remove, so the action is hidden there. */}
                {sub.status !== "unlisted" &&
                  sub.status !== "expired" && (
                  <button
                    type="button"
                    onClick={() => setRemoving({
                      id:   sub.id,
                      name: sub.name,
                      mode: removeMode(sub),
                    })}
                    className="text-xs border border-gray-200
                      text-gray-500 px-3 py-1.5 rounded-lg
                      hover:border-red-200 hover:text-red-600
                      transition ml-auto"
                  >
                    {removeMode(sub) === "archive"
                      ? "Archive"
                      : "Delete"}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Businesses this user owns through an approved claim but did not
              submit. Same actions as a submission card, minus the ones that
              only make sense for a row they created. */}
          {visibleOwnedClaims.map((claim) => (
            <div
              key={claim.id}
              className="border-2 border-gray-100
                rounded-2xl p-4"
            >
              <div className="flex items-start
                justify-between gap-3 mb-3">
                <div className="flex-1">
                  <p className="font-semibold
                    text-black text-sm">
                    {claim.business_name}
                  </p>
                  <p className="text-xs
                    text-gray-400 mt-0.5">
                    Claimed{" "}
                    {new Date(
                      claim.resolved_at || claim.requested_at
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end
                  gap-1 flex-shrink-0">
                  <span className={`text-xs px-2 py-1
                    rounded-full font-medium
                    ${getStatusColor(
                      claim.business_status
                    )}`}>
                    {getStatusLabel(claim.business_status)}
                  </span>
                  <div className="flex items-center gap-1">
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
              </div>

              <p className="text-xs text-gray-400 mb-3">
                {claim.business_status === "unlisted"
                  ? claim.can_restore
                    ? "You archived this listing. It is hidden from the map and search, but nothing was deleted — restore it whenever you're ready."
                    : "This listing was taken down by our team. Contact us if you think that was a mistake."
                  : "Your claim has been approved. You are now the verified owner."
                }
              </p>

              <div className="flex gap-2 flex-wrap">
                {claim.business_status === "listed" &&
                  claim.business_slug && (
                  <Link
                    href={`/${claim.business_slug}`}
                    className="text-xs bg-black
                      text-white px-3 py-1.5
                      rounded-lg"
                  >
                    View Listing
                  </Link>
                )}

                {claim.business_status === "listed" && (
                  <Link
                    href={
                      `/my-submissions/${claim.business_id}/edit`
                    }
                    className="text-xs border
                      border-gray-200 text-black
                      px-3 py-1.5 rounded-lg
                      hover:bg-gray-50 transition"
                  >
                    Edit
                  </Link>
                )}

                {claim.business_status === "unlisted" &&
                  claim.can_restore && (
                  <button
                    type="button"
                    onClick={() => handleRestore({
                      id: claim.business_id,
                    })}
                    disabled={
                      restoringId === claim.business_id
                    }
                    className="text-xs bg-black text-white
                      px-3 py-1.5 rounded-lg
                      hover:bg-gray-800 transition
                      disabled:opacity-50"
                  >
                    {restoringId === claim.business_id
                      ? "Restoring…"
                      : "Restore"}
                  </button>
                )}

                {/* A verified owner archives rather than deletes: they
                    did not create the row, and other users' reviews and
                    saves hang off it. Hidden once it is already down. */}
                {claim.business_status !== "unlisted" &&
                  claim.business_status !== "expired" && (
                  <button
                    type="button"
                    onClick={() => setRemoving({
                      id:   claim.business_id,
                      name: claim.business_name,
                      mode: "archive",
                    })}
                    className="text-xs border border-gray-200
                      text-gray-500 px-3 py-1.5 rounded-lg
                      hover:border-red-200 hover:text-red-600
                      transition ml-auto"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Claims still awaiting a decision, or rejected. There is no
              listing of the user's to act on yet, so these are status-only. */}
          {visibleUnresolvedClaims.map((claim) => (
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
                    Claim submitted{" "}
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

              <p className="text-xs text-gray-400">
                {claim.status === "pending" &&
                  "Your claim is under review. We will verify your ownership within 1-3 business days."
                }
                {claim.status === "rejected" &&
                  "Your claim was not approved. Please contact support for more information."
                }
              </p>
            </div>
          ))}

          {/* Add another */}
          {!isEmpty && activeTab === "all" && (
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
      </div>

      <RemoveListingDialog
        businessName={removing?.name || ""}
        mode={removing?.mode || "archive"}
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => handleRemove(removing!)}
      />
    </div>
  );
}
