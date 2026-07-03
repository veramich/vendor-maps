"use client";

// Scoped error boundary for the admin/moderation area. A failed query in one
// of the dashboards should give the moderator a retry, not a blank screen that
// looks like the queue is empty. Admin access is still gated upstream by
// requireAdmin(); this only handles render/data failures for an already-
// authorized admin.
import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
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
        This admin view failed to load
      </h1>
      <p className="mt-4 text-base text-gray-600">
        A query or render error occurred. Retrying usually clears a transient
        database hiccup.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Admin home
        </Link>
      </div>
    </div>
  );
}
