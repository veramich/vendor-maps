"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

interface ClaimBusiness {
  name: string;
  slug: string;
  city: string | null;
  state_code: string | null;
}

export default function ClaimPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const businessId = params.id as string;

  const [business, setBusiness] = useState<ClaimBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Claim form fields
  const [contactInfo, setContactInfo] = useState("");
  const [confirmOwner, setConfirmOwner] = useState(false);

  const fetchBusiness = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/claim`
      );
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setBusiness(data.business);
    } catch {
      setError("Failed to load business");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBusiness();
  }, [fetchBusiness]);

  const handleSubmit = async () => {
    if (!confirmOwner) {
      setError(
        "Please confirm that you are the owner"
      );
      return;
    }

    if (!contactInfo.trim()) {
      setError("Please provide contact information");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(
        `/api/businesses/${businessId}/claim`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ contactInfo }),
        }
      );

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setSubmitted(true);

    } catch {
      setError("Failed to submit claim");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || isPending) {
    return (
      <div className="flex items-center justify-center
        min-h-screen">
        <div className="w-6 h-6 border-2
          border-gray-200 border-t-black rounded-full
          animate-spin"/>
      </div>
    );
  }

  if (error && !business) {
    return (
      <div className="flex flex-col items-center
        justify-center min-h-screen px-4 text-center">
        <p className="text-red-500 text-sm mb-4">
          {error}
        </p>
        <Link
          href="/"
          className="text-black underline text-sm"
        >
          Go home
        </Link>
      </div>
    );
  }

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex
        flex-col items-center justify-center
        px-6 text-center">
        <div className="w-16 h-16 bg-green-100
          rounded-full flex items-center
          justify-center mb-6">
          <svg width="32" height="32"
            viewBox="0 0 24 24" fill="none"
            stroke="#22c55e" strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-2xl font-semibold
          text-black mb-3">
          Claim submitted
        </h2>
        <p className="text-gray-500 text-sm mb-2">
          Your claim for{" "}
          <span className="font-medium text-black">
            {business?.name}
          </span>{" "}
          has been submitted.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          We will review your claim and get back
          to you shortly. You can track the status
          in My Submissions.
        </p>
        <div className="w-full max-w-xs space-y-3">
          <Link
            href="/my-submissions"
            className="block w-full bg-black text-white
              text-center rounded-xl py-4 text-sm
              font-medium hover:bg-gray-800 transition"
          >
            View My Submissions
          </Link>
          <Link
            href={`/${business?.slug || businessId}`}
            className="block w-full border-2
              border-gray-200 text-black text-center
              rounded-xl py-4 text-sm font-medium
              hover:bg-gray-50 transition"
          >
            Back to Listing
          </Link>
        </div>
      </div>
    );
  }

  // Must be signed in
  if (!session) {
    return (
      <div className="min-h-screen bg-white flex
        flex-col items-center justify-center
        px-6 text-center">
        <h2 className="text-2xl font-semibold
          text-black mb-3">
          Sign in to claim
        </h2>
        <p className="text-gray-500 text-sm mb-8">
          You need an account to claim a business
          listing on VendorMaps
        </p>
        <div className="w-full max-w-xs space-y-3">
          <Link
            href={`/sign-in?redirect=/claim/${businessId}`}
            className="block w-full bg-black text-white
              text-center rounded-xl py-4 text-sm
              font-medium hover:bg-gray-800 transition"
          >
            Sign In
          </Link>
          <Link
            href={`/sign-up?redirect=/claim/${businessId}`}
            className="block w-full border-2
              border-gray-200 text-black text-center
              rounded-xl py-4 text-sm font-medium
              hover:bg-gray-50 transition"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="px-4 py-4 border-b
        border-gray-100">
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
          <h1 className="text-lg font-semibold
            text-black">
            Claim Business
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6
        space-y-6">

        {/* Business info */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">
            Claiming
          </p>
          <p className="font-semibold text-black">
            {business?.name}
          </p>
          {business?.city && (
            <p className="text-sm text-gray-500">
              {business.city}
              {business.state_code
                ? `, ${business.state_code}`
                : ""
              }
            </p>
          )}
        </div>

        {/* What claiming means */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold
            text-black">
            What you get as a verified owner
          </h2>
          {[
            "Respond to reviews",
            "Update business information",
            "Add photos and videos",
            "Option to show your exact address",
            "Verified owner badge on your listing",
          ].map((benefit) => (
            <div key={benefit}
              className="flex items-center gap-3">
              <svg width="16" height="16"
                viewBox="0 0 24 24" fill="none"
                stroke="#22c55e" strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <p className="text-sm text-gray-700">
                {benefit}
              </p>
            </div>
          ))}
        </div>

        {/* Contact info */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Contact Information
            <span className="text-red-500 ml-1">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Provide a phone number, email or social
            media handle we can use to verify your
            ownership
          </p>
          <textarea
            value={contactInfo}
            onChange={(e) => {
              setContactInfo(e.target.value);
              if (error) setError("");
            }}
            placeholder={
              "e.g. Phone: 555-1234\n" +
              "Instagram: @mybusiness\n" +
              "Email: owner@mybusiness.com"
            }
            rows={4}
            className="w-full border-2 border-gray-200
              rounded-xl px-4 py-3 text-sm text-black
              focus:outline-none focus:border-black
              transition resize-none"
          />
        </div>

        {/* Confirm ownership */}
        <label className="flex items-start gap-3
          cursor-pointer p-4 border-2 rounded-xl
          transition
          border-gray-200">
          <input
            type="checkbox"
            checked={confirmOwner}
            onChange={(e) => {
              setConfirmOwner(e.target.checked);
              if (error) setError("");
            }}
            className="w-4 h-4 rounded mt-0.5
              flex-shrink-0"
          />
          <p className="text-sm text-black">
            I confirm that I am the owner or authorized
            representative of{" "}
            <span className="font-medium">
              {business?.name}
            </span>{" "}
            and that the information I provided is
            accurate.
          </p>
        </label>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border
            border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-500 text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-black text-white
            rounded-xl py-4 text-sm font-medium
            hover:bg-gray-800 transition
            disabled:opacity-50
            disabled:cursor-not-allowed"
        >
          {submitting
            ? "Submitting..."
            : "Submit Claim"
          }
        </button>

        <p className="text-center text-xs text-gray-400">
          Claims are reviewed within 1-3 business days
        </p>

      </div>
    </div>
  );
}