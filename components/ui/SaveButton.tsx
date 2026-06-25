"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type Collection =
  | "want_to_visit"
  | "favorites"
  | "been_here"
  | "on_my_radar";

const COLLECTIONS: {
  value: Collection;
  label: string;
  emoji: string;
}[] = [
  {
    value: "want_to_visit",
    label: "Want to Visit",
    emoji: "📍",
  },
  {
    value: "favorites",
    label: "Favorites",
    emoji: "⭐",
  },
  {
    value: "been_here",
    label: "Been Here",
    emoji: "✅",
  },
  {
    value: "on_my_radar",
    label: "On My Radar",
    emoji: "👀",
  },
];

export default function SaveButton({
  businessId,
}: {
  businessId: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  const [saved, setSaved] =
    useState<Collection | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/saved/${businessId}`
      );
      const data = await res.json();
      setSaved(data.collection || null);
    } catch (error) {
      console.error("Error fetching saved:", error);
    }
  }, [businessId]);

  useEffect(() => {
    // Loading the saved state on mount is the intended effect here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) fetchSaved();
  }, [session, fetchSaved]);

  const handleSave = async (
    collection: Collection
  ) => {
    if (!session) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);

    try {
      // If already in this collection → unsave
      if (saved === collection) {
        await fetch(`/api/saved/${businessId}`, {
          method: "DELETE",
        });
        setSaved(null);
      } else {
        // Save to new collection
        await fetch(`/api/saved/${businessId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ collection }),
        });
        setSaved(collection);
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const currentCollection = COLLECTIONS.find(
    c => c.value === saved
  );

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (!session) {
            router.push("/sign-in");
            return;
          }
          setShowMenu(!showMenu);
        }}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2
          rounded-xl border-2 text-sm font-medium
          transition
          ${saved
            ? "border-black bg-black text-white"
            : "border-gray-200 text-black hover:bg-gray-50"
          }`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2
            border-current border-t-transparent
            rounded-full animate-spin"/>
        ) : saved ? (
          <>
            <span>{currentCollection?.emoji}</span>
            <span>{currentCollection?.label}</span>
          </>
        ) : (
          <>
            <svg width="16" height="16"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0
                1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Save</span>
          </>
        )}
      </button>

      {/* Collection picker dropdown */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          <div className="absolute right-0 top-12
            bg-white border-2 border-gray-100
            rounded-2xl shadow-lg z-20 w-52
            overflow-hidden">
            <p className="text-xs text-gray-400
              px-4 py-3 border-b border-gray-100">
              Save to collection
            </p>
            {COLLECTIONS.map((col) => (
              <button
                key={col.value}
                onClick={() => handleSave(col.value)}
                className={`w-full flex items-center
                  gap-3 px-4 py-3 text-sm text-left
                  hover:bg-gray-50 transition
                  ${saved === col.value
                    ? "bg-gray-50 font-medium"
                    : ""
                  }`}
              >
                <span>{col.emoji}</span>
                <span className="text-black">
                  {col.label}
                </span>
                {saved === col.value && (
                  <svg
                    className="ml-auto"
                    width="14" height="14"
                    viewBox="0 0 24 24" fill="none"
                    stroke="#111" strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <polyline
                      points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}

            {/* Remove from saved */}
            {saved && (
              <>
                <div className="h-px bg-gray-100 mx-4"/>
                <button
                  onClick={() => handleSave(saved)}
                  className="w-full flex items-center
                    gap-3 px-4 py-3 text-sm text-left
                    text-red-500 hover:bg-red-50
                    transition"
                >
                  <svg width="14" height="14"
                    viewBox="0 0 24 24" fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <polyline
                      points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0
                      1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
                  </svg>
                  Remove from saved
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}