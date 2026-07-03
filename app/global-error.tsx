"use client";

// Last-resort error boundary. This only catches errors thrown in the ROOT
// layout (app/layout.tsx) — the one place app/error.tsx can't cover, since
// that boundary renders inside the layout. Because the layout failed, this
// component must render its own <html> and <body>. Since Next 15.2 it also
// renders in development, not just production.
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            textAlign: "center",
            fontFamily:
              "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          }}
        >
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "#111827",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: "1rem",
              fontSize: "1rem",
              color: "#4b5563",
              maxWidth: "32rem",
            }}
          >
            VendorMaps ran into an unexpected error. Please try again.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              marginTop: "2rem",
              borderRadius: "0.375rem",
              backgroundColor: "#111827",
              color: "#ffffff",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
