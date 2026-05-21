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

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
      return;
    }
    if (session) {
      setNameValue(session.user.name || "");
      fetchStats();
    }
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

  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      setNameError("Name cannot be empty");
      return;
    }
    if (nameValue.trim().length < 2) {
      setNameError("Name must be at least 2 characters");
      return;
    }

    setNameSaving(true);
    setNameError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameValue.trim()
        }),
      });

      const data = await res.json();

      if (data.error) {
        setNameError(data.error);
        return;
      }

      setEditingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);

    } catch (err) {
      setNameError("Failed to save name");
    } finally {
      setNameSaving(false);
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

  const displayName = nameValue || user.name || "Vendor Maps User";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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

          {/* Initials avatar */}
          <div className="w-16 h-16 rounded-full
            bg-black flex items-center justify-center
            flex-shrink-0">
            <span className="text-white text-xl
              font-semibold">
              {initials}
            </span>
          </div>

          <div className="flex-1">
            {/* Name — editable */}
            {editingName ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => {
                    setNameValue(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  maxLength={60}
                  autoFocus
                  className="w-full border-2
                    border-gray-200 rounded-xl
                    px-3 py-2 text-sm text-black
                    focus:outline-none
                    focus:border-black transition"
                />
                {nameError && (
                  <p className="text-red-500 text-xs">
                    {nameError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={nameSaving}
                    className="px-3 py-1.5 bg-black
                      text-white text-xs font-medium
                      rounded-lg hover:bg-gray-800
                      transition disabled:opacity-50"
                  >
                    {nameSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNameValue(
                        user.name || ""
                      );
                      setNameError("");
                    }}
                    className="px-3 py-1.5 border
                      border-gray-200 text-black
                      text-xs rounded-lg
                      hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-semibold text-black
                  text-lg">
                  {displayName}
                </p>
                {nameSaved && (
                  <span className="text-xs
                    text-green-500">
                    ✓ Saved
                  </span>
                )}
                <button
                  onClick={() => setEditingName(true)}
                  className="text-gray-400
                    hover:text-gray-600 transition"
                >
                  <svg width="14" height="14"
                    viewBox="0 0 24 24" fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2
                      2v14a2 2 0 0 0 2 2h14a2 2 0
                      0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121
                      0 0 1 3 3L12 15l-4 1 1-4
                      9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            )}

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
                  <line x1="16" y1="13"
                    x2="8" y2="13"/>
                  <line x1="16" y1="17"
                    x2="8" y2="17"/>
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
                border-b border-gray-100
                last:border-0 hover:bg-gray-50
                transition"
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
            border-red-100 text-red-500
            rounded-2xl py-4 text-sm font-medium
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