"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type MyResource = {
  id:               string;
  resource_type:    string;
  title:            string;
  status:           string;
  always_available: boolean;
  start_date:       string | null;
  end_date:         string | null;
  city:             string | null;
  state_code:       string | null;
  expires_at:       string | null;
  created_at:       string;
};

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

function timeRange(r: MyResource): string {
  if (r.always_available) return "Always available";
  if (r.start_date && r.end_date)
    return `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`;
  if (r.end_date) return `Through ${fmtDate(r.end_date)}`;
  return "";
}

function isExpired(r: MyResource): boolean {
  return Boolean(r.expires_at && new Date(r.expires_at) <= new Date());
}

export default function MyResourcesPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [resources, setResources] = useState<MyResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
      return;
    }
    if (session) {
      fetch("/api/user/resources")
        .then((r) => r.json())
        .then((d) => setResources(d.resources || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [session, isPending]);

  const statusBadge = (r: MyResource) => {
    if (isExpired(r))
      return { label: "Expired", cls: "bg-gray-100 text-gray-500" };
    switch (r.status) {
      case "listed":
        return { label: "Live", cls: "bg-green-100 text-green-700" };
      case "pending":
        return { label: "Under Review", cls: "bg-orange-100 text-orange-600" };
      case "rejected":
        return { label: "Rejected", cls: "bg-red-100 text-red-600" };
      default:
        return { label: r.status, cls: "bg-gray-100 text-gray-500" };
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-black
          rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-semibold text-black">
            My Resources
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Resources you&apos;ve posted
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {resources.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm mb-2">
              You haven&apos;t posted any resources yet
            </p>
            <Link
              href="/add-resource"
              className="text-black text-sm underline"
            >
              Share your first resource
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {resources.map((r) => {
              const badge = statusBadge(r);
              const expired = isExpired(r);
              return (
                <div
                  key={r.id}
                  className="border-2 border-gray-100 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3
                    mb-2">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block bg-gray-100 text-gray-600
                        text-xs font-medium px-2 py-0.5 rounded-full mb-1">
                        {r.resource_type}
                      </span>
                      <p className="font-semibold text-black text-sm">
                        {r.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {timeRange(r)}
                        {r.city ? ` · ${r.city}` : ""}
                        {r.state_code ? `, ${r.state_code}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full
                      font-medium flex-shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 mb-3">
                    {expired ? (
                      <p>This resource has ended and is no longer shown.</p>
                    ) : r.status === "pending" ? (
                      <p>Under review — usually doesn&apos;t take long.</p>
                    ) : r.status === "listed" ? (
                      <p>Live on the resources page.</p>
                    ) : r.status === "rejected" ? (
                      <p>This resource was not approved.</p>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {(r.status === "pending" || r.status === "listed") &&
                      !expired && (
                        <Link
                          href={`/my-resources/${r.id}/edit`}
                          className="text-xs border border-gray-200 text-black
                            px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                        >
                          Edit
                        </Link>
                      )}
                    {r.status === "listed" && !expired && (
                      <Link
                        href="/resources"
                        className="text-xs bg-black text-white px-3 py-1.5
                          rounded-lg"
                      >
                        View on Resources
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

            <Link
              href="/add-resource"
              className="flex items-center justify-center gap-2 w-full
                border-2 border-dashed border-gray-200 rounded-2xl py-4
                text-sm text-gray-400 hover:border-gray-300 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add another resource
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
