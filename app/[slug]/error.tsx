"use client";

// Scoped error boundary for the public business profile. This is the highest-
// traffic server-rendered page (every listing, every shared link, SEO
// crawlers), so a DB hiccup or unexpected row shape here should degrade to a
// contained message with a retry rather than blanking the whole page. A
// business that simply doesn't exist is handled separately by notFound().
import { useEffect } from "react";
import Link from "next/link";

export default function BusinessError({
  error,
  // Next 16.2: unstable_retry re-fetches + re-renders (replaces `reset`).
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        We couldn&apos;t load this listing
      </h1>
      <p className="mt-4 text-base text-gray-600">
        Something went wrong on our end. Please try again in a moment.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Try again
        </button>
        <Link
          href="/directory"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Browse the directory
        </Link>
      </div>
    </div>
  );
}
