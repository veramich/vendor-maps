"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Stats = {
  submissions: number;
  reviews:     number;
  saved:       number;
  claims:      number;
};

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    submissions: 0,
    reviews:     0,
    saved:       0,
    claims:      0,
  });
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
      return;
    }
    if (session) fetchStats();
  }, [session, isPending]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      setStats(data.stats || {
        submissions: 0,
        reviews:     0,
        saved:       0,
        claims:      0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.push("/");
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

  if (!session) return null;

  const { user } = session;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  const memberSince = new Date(user.createdAt)
    .toLocaleDateString("en-US", {
      month: "long",
      year:  "numeric",
    });

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="px-4 py-4 border-b
        border-gray-100">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-semibold
            text-black">
            Profile
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6
        space-y-6">

        {/* Avatar and info */}
        <div className="flex items-center gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || ""}
              className="w-16 h-16 rounded-full
                object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full
              bg-black flex items-center
              justify-center flex-shrink-0">
              <span className="text-white text-xl
                font-semibold">
                {initials}
              </span>
            </div>
          )}
          <div>
            <p className="font-semibold text-black
              text-lg">
              {user.name || "Vendor Maps User"}
            </p>
            <p className="text-sm text-gray-500">
              {user.email}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Member since {memberSince}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/my-submissions"
            className="border-2 border-gray-100
              rounded-2xl p-4 hover:border-gray-200
              transition"
          >
            <p className="text-2xl font-bold
              text-black">
              {stats.submissions}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Submissions
            </p>
          </Link>

          <Link
            href="/my-claims"
            className="border-2 border-gray-100
              rounded-2xl p-4 hover:border-gray-200
              transition"
          >
            <p className="text-2xl font-bold
              text-black">
              {stats.claims}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Claims
            </p>
          </Link>

          <Link
            href="/saved"
            className="border-2 border-gray-100
              rounded-2xl p-4 hover:border-gray-200
              transition"
          >
            <p className="text-2xl font-bold
              text-black">
              {stats.saved}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Saved
            </p>
          </Link>

          <div className="border-2 border-gray-100
            rounded-2xl p-4">
            <p className="text-2xl font-bold
              text-black">
              {stats.reviews}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Reviews Written
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div className="border-2 border-gray-100
          rounded-2xl overflow-hidden">
          {[
            {
              href:  "/my-listings",
              label: "My Listings",
              icon: (
                <svg width="18" height="18"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0
                    0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline
                    points="9 22 9 12 15 12 15 22"/>
                </svg>
              ),
            },
            {
              href:  "/my-submissions",
              label: "My Submissions",
              icon: (
                <svg width="18" height="18"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2
                    2v16a2 2 0 0 0 2 2h12a2 2 0
                    0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              ),
            },
            {
              href:  "/my-claims",
              label: "My Claims",
              icon: (
                <svg width="18" height="18"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0
                    1 1-5.93-9.14"/>
                  <polyline
                    points="22 4 12 14.01 9 11.01"/>
                </svg>
              ),
            },
            {
              href:  "/saved",
              label: "Saved Businesses",
              icon: (
                <svg width="18" height="18"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2
                    0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              ),
            },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center
                justify-between px-4 py-3.5
                border-b border-gray-100 last:border-0
                hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-500">
                  {icon}
                </span>
                <span className="text-sm text-black">
                  {label}
                </span>
              </div>
              <svg width="16" height="16"
                viewBox="0 0 24 24" fill="none"
                stroke="#d1d5db" strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center
            justify-center gap-2 border-2
            border-red-100 text-red-500 rounded-2xl
            py-4 text-sm font-medium
            hover:bg-red-50 transition
            disabled:opacity-50"
        >
          <svg width="18" height="18"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2
              2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {signingOut ? "Signing out..." : "Sign out"}
        </button>

      </div>
    </div>
  );
}