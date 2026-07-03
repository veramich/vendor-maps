"use client";

// Route-segment error boundary. Next.js renders this when a server or client
// component under the segment throws during render. It sits inside the root
// layout, so the header/bottom nav stay in place — only the page content is
// replaced. `reset()` re-renders the segment to retry.
import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  // Next 16.2 renamed the recovery prop: unstable_retry re-fetches AND
  // re-renders the segment (the old `reset` only re-rendered, which can't
  // clear a data-fetch failure). See node_modules/next docs error.md.
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Surface the error for logging. The digest links this to the server-side
    // log entry without exposing the raw message to the user.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        Something went wrong
      </h1>
      <p className="mt-4 text-base text-gray-600">
        We hit an unexpected error loading this page. Please try again — if it
        keeps happening, come back in a little while.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Back to the map
        </Link>
      </div>
    </main>
  );
}
