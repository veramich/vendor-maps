"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CLD } from "@/lib/utils/cldUrl";

interface ReviewBusiness {
  name: string;
  category: string | null;
  logo_url: string | null;
}

export default function ReviewPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [business, setBusiness] = useState<ReviewBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Review fields
  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const charCount = reviewText.trim().length;

  const fetchBusiness = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/reviews/${slug}/business`
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
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBusiness();
  }, [fetchBusiness]);

  const handleSubmit = async () => {
    if (stars === 0) {
      setError("Please select a star rating");
      return;
    }
    if (charCount < 25) {
      setError(
        `Please write at least ${25 - charCount} more character${25 - charCount === 1 ? "" : "s"}`
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(
        `/api/reviews/${slug}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ stars, reviewText }),
        }
      );

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setSubmitted(true);

    } catch {
      setError("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const STAR_LABELS: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  };

  if (loading || isPending) {
    return (
      <div className="flex items-center justify-center
        min-h-screen">
        <div className="w-6 h-6 border-2
          border-gray-200 border-t-black
          rounded-full animate-spin"/>
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
          Review submitted
        </h2>
        <p className="text-gray-500 text-sm mb-2">
          Thank you for reviewing{" "}
          <span className="font-medium text-black">
            {business?.name}
          </span>
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Your review will appear after it has
          been approved.
        </p>
        <Link
          href={`/${slug}`}
          className="w-full max-w-xs bg-black text-white
            text-center rounded-xl py-4 text-sm
            font-medium hover:bg-gray-800 transition
            block"
        >
          Back to Listing
        </Link>
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
          Sign in to review
        </h2>
        <p className="text-gray-500 text-sm mb-8">
          You need an account to write a review
          on VendorMaps
        </p>
        <div className="w-full max-w-xs space-y-3">
          <Link
            href={`/sign-in?redirect=/${slug}/review`}
            className="block w-full bg-black text-white
              text-center rounded-xl py-4 text-sm
              font-medium hover:bg-gray-800 transition"
          >
            Sign In
          </Link>
          <Link
            href={`/sign-up?redirect=/${slug}/review`}
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
          <div>
            <h1 className="text-lg font-semibold
              text-black">
              Write a Review
            </h1>
            {business && (
              <p className="text-sm text-gray-400">
                {business.name}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6
        space-y-6">

        {/* Business info */}
        {business && (
          <div className="bg-gray-50 rounded-2xl p-4
            flex items-center gap-3">
            {business.logo_url && (
              <Image
                src={CLD.thumb(business.logo_url)}
                alt={business.name}
                width={48}
                height={48}
                unoptimized
                className="w-12 h-12 rounded-xl
                  object-cover flex-shrink-0"
              />
            )}
            <div>
              <p className="font-semibold text-black
                text-sm">
                {business.name}
              </p>
              <p className="text-xs text-gray-500">
                {business.category}
              </p>
            </div>
          </div>
        )}

        {/* Star rating */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-3">
            Rating
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setStars(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="transition active:scale-110"
              >
                <svg
                  width="36" height="36"
                  viewBox="0 0 24 24"
                  fill={
                    star <= (hoveredStar || stars)
                      ? "#111"
                      : "none"
                  }
                  stroke={
                    star <= (hoveredStar || stars)
                      ? "#111"
                      : "#d1d5db"
                  }
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26
                    22 9.27 17 14.14 18.18 21.02
                    12 17.77 5.82 21.02 7 14.14
                    2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            ))}
            {(hoveredStar || stars) > 0 && (
              <span className="text-sm text-gray-500
                ml-2">
                {STAR_LABELS[hoveredStar || stars]}
              </span>
            )}
          </div>
        </div>

        {/* Review text */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Review
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => {
              setReviewText(e.target.value);
              if (error) setError("");
            }}
            placeholder="Share your experience with
              this business. What did you like?
              Would you recommend it?"
            rows={6}
            maxLength={2000}
            className="w-full border-2 border-gray-200
              rounded-xl px-4 py-3 text-sm text-black
              focus:outline-none focus:border-black
              transition resize-none"
          />
          <div className="flex justify-between mt-1">
            <p className={`text-xs
              ${charCount >= 25
                ? "text-green-500"
                : "text-gray-400"
              }`}>
              {charCount >= 25
                ? "✓ Minimum reached"
                : `${25 - charCount} more character${25 - charCount === 1 ? "" : "s"} needed`
              }
            </p>
            <p className="text-xs text-gray-400">
              {charCount}/2000
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border
            border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-500 text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-black text-white
            rounded-xl py-4 text-sm font-medium
            hover:bg-gray-800 transition
            disabled:opacity-50
            disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Submit Review"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Reviews are moderated before appearing
          publicly
        </p>

      </div>
    </div>
  );
}