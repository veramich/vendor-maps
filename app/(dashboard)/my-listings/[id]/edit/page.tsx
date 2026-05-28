"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useParams } from "next/navigation";

export default function EditListingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const businessId = params.id as string;

  const [business, setBusiness] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Exact address fields
  const [showExactAddress, setShowExactAddress] =
    useState(false);
  const [exactAddress, setExactAddress] = useState("");
  const [exactCity, setExactCity] = useState("");
  const [exactState, setExactState] = useState("");
  const [exactZip, setExactZip] = useState("");

  useEffect(() => {
    if (!session) {
      router.push("/sign-in");
      return;
    }
    fetchBusiness();
  }, [session]);

  const fetchBusiness = async () => {
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/owner`
      );
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setBusiness(data.business);
      setLocation(data.location);
      setIsOwner(
        data.business?.claim_status === "claimed" &&
        data.business?.claimed_by === session?.user?.id
      );
      setShowExactAddress(
        data.location?.show_exact_address || false
      );
      setExactAddress(
        data.location?.exact_address || ""
      );
      setExactCity(data.location?.city || "");
      setExactState(data.location?.state || "");
      setExactZip(data.location?.zip || "");

    } catch (err) {
      setError("Failed to load business");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(
        `/api/businesses/${businessId}/owner`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            showExactAddress,
            exactAddress,
            exactCity,
            exactState,
            exactZip,
          }),
        }
      );

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

    } catch (err) {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center
        min-h-screen">
        <div className="w-6 h-6 border-2 border-gray-200
          border-t-black rounded-full animate-spin"/>
      </div>
    );
  }

  if (error && !business) {
    return (
      <div className="flex items-center justify-center
        min-h-screen px-4">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="max-w-lg mx-auto flex
          items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500"
          >
            <svg width="20" height="20"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold
              text-black">
              Edit Listing
            </h1>
            <p className="text-sm text-gray-400">
              {business?.name}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6
        space-y-6">

        {/* Verified owner badge */}
        {isOwner && (
          <div className="flex items-center gap-2
            bg-green-50 border border-green-200
            rounded-xl px-4 py-3">
            <svg width="16" height="16"
              viewBox="0 0 24 24" fill="none"
              stroke="#22c55e" strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93
                -9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p className="text-sm text-green-700
              font-medium">
              Verified Owner
            </p>
          </div>
        )}

        {/* Location section — owner only */}
        {isOwner && location && (
          <div className="border-2 border-gray-100
            rounded-2xl p-5">

            <h2 className="text-base font-semibold
              text-black mb-1">
              Location Settings
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              By default only cross streets are shown.
              As a verified owner you can choose to
              display your exact address.
            </p>

            {/* Current location display */}
            <div className="bg-gray-50 rounded-xl
              px-4 py-3 mb-5">
              <p className="text-xs text-gray-400 mb-1">
                Current public display
              </p>
              <p className="text-sm font-medium
                text-black">
                {showExactAddress && exactAddress
                  ? exactAddress
                  : `${location.street_1} & ${location.street_2}`
                }
              </p>
              <p className="text-xs text-gray-500">
                {location.city}, {location.state_code}
              </p>
            </div>

            {/* Toggle exact address */}
            <label className="flex items-start gap-3
              cursor-pointer mb-5">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={showExactAddress}
                  onChange={(e) => {
                    setShowExactAddress(e.target.checked);
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 rounded-full
                    transition-colors
                    ${showExactAddress
                      ? "bg-black"
                      : "bg-gray-200"
                    }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5
                      w-5 h-5 bg-white rounded-full
                      shadow transition-transform
                      ${showExactAddress
                        ? "translate-x-5"
                        : "translate-x-0"
                      }`}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium
                  text-black">
                  Show exact address
                </p>
                <p className="text-xs text-gray-400
                  mt-0.5">
                  Your full address will be visible
                  to all users on your listing
                </p>
              </div>
            </label>

            {/* Exact address fields */}
            {showExactAddress && (
              <div className="space-y-3 border-t
                border-gray-100 pt-5">
                <p className="text-sm font-medium
                  text-black">
                  Your exact address
                </p>

                <div>
                  <label className="block text-xs
                    text-gray-500 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={exactAddress}
                    onChange={(e) =>
                      setExactAddress(e.target.value)
                    }
                    placeholder="e.g. 456 Spring St"
                    className="w-full border-2
                      border-gray-200 rounded-xl
                      px-4 py-3 text-sm text-black
                      focus:outline-none
                      focus:border-black transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs
                      text-gray-500 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={exactCity}
                      onChange={(e) =>
                        setExactCity(e.target.value)
                      }
                      placeholder="Los Angeles"
                      className="w-full border-2
                        border-gray-200 rounded-xl
                        px-4 py-3 text-sm text-black
                        focus:outline-none
                        focus:border-black transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs
                      text-gray-500 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={exactState}
                      onChange={(e) =>
                        setExactState(e.target.value)
                      }
                      placeholder="CA"
                      maxLength={2}
                      className="w-full border-2
                        border-gray-200 rounded-xl
                        px-4 py-3 text-sm text-black
                        focus:outline-none
                        focus:border-black transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs
                    text-gray-500 mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={exactZip}
                    onChange={(e) =>
                      setExactZip(e.target.value)
                    }
                    placeholder="90012"
                    maxLength={10}
                    className="w-full border-2
                      border-gray-200 rounded-xl
                      px-4 py-3 text-sm text-black
                      focus:outline-none
                      focus:border-black transition"
                  />
                </div>

                <div className="bg-amber-50 border
                  border-amber-200 rounded-xl
                  px-4 py-3">
                  <p className="text-xs text-amber-700">
                    ⚠ Your exact address will be
                    visible to all users once saved
                    and approved.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border
            border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-500 text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Save button — owner only */}
        {isOwner && (
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full rounded-xl py-4
              text-sm font-medium transition
              ${saved
                ? "bg-green-500 text-white"
                : "bg-black text-white hover:bg-gray-800"
              }
              disabled:opacity-50
              disabled:cursor-not-allowed`}
          >
            {saving
              ? "Saving..."
              : saved
              ? "✓ Saved"
              : "Save Changes"
            }
          </button>
        )}

      </div>
    </div>
  );
}