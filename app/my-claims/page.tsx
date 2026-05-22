"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Claim = {
  id:            string;
  business_id:   string;
  claim_contact: string;
  status:        string;
  requested_at:  string;
  resolved_at:   string | null;
  business_name: string;
  business_slug: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending:  "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  pending:  "text-yellow-600",
  approved: "text-green-600",
  rejected: "text-red-500",
};

export default function MyClaimsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
      return;
    }
    if (session) fetchClaims();
  }, [session, isPending]);

  const fetchClaims = async () => {
    try {
      const res = await fetch("/api/user/claims");
      const data = await res.json();
      setClaims(data.claims || []);
    } catch (error) {
      console.error("Error fetching claims:", error);
    } finally {
      setLoading(false);
    }
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
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-semibold text-black">
            My Claims
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Businesses you've requested to claim
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {claims.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-gray-400 text-sm">
              You have no claim requests yet
            </p>
            <Link
              href="/directory"
              className="text-black text-sm underline block"
            >
              Browse businesses to claim
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="border-2 border-gray-100 rounded-2xl p-4"
              >
                <div className="flex items-start
                  justify-between gap-2 mb-1">
                  <p className="font-semibold text-black text-sm">
                    {claim.business_name}
                  </p>
                  <span className={`text-xs font-medium flex-shrink-0
                    ${STATUS_COLORS[claim.status] ?? "text-gray-500"}`}>
                    {STATUS_LABELS[claim.status] ?? claim.status}
                  </span>
                </div>

                <p className="text-xs text-gray-400">
                  Requested{" "}
                  {new Date(claim.requested_at).toLocaleDateString()}
                </p>

                {claim.resolved_at && (
                  <p className="text-xs text-gray-400">
                    Resolved{" "}
                    {new Date(claim.resolved_at).toLocaleDateString()}
                  </p>
                )}

                <div className="mt-3">
                  <Link
                    href={`/${claim.business_slug}`}
                    className="text-xs text-black underline"
                  >
                    View listing
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
