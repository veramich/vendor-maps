"use client";

import { useState } from "react";
import type { LocationStatus } from "@/components/map/useUserLocation";
import { locationSettingsSteps } from "@/lib/utils/locationSettingsSteps";

// Remembers that the user dismissed the banner so we don't nag them every
// visit. (Their actual grant/deny lives in the browser's permission store.)
const DISMISS_KEY = "vm-location-banner-dismissed";

const PRIMARY_BUTTON: React.CSSProperties = {
  background: "#ea580c",
  color: "white",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: "8px",
  whiteSpace: "nowrap",
};

// Plain blue text, like the system "Settings" action people know from
// permission prompts.
const LINK_BUTTON: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  color: "#007AFF",
  padding: "8px 10px",
  borderRadius: "8px",
  whiteSpace: "nowrap",
};

// Asks for location ("prompt") or explains that it's blocked ("blocked").
// The location watch itself lives in useUserLocation; this only renders.
export default function LocationBanner({
  status,
  onEnable,
  reopenSignal,
}: {
  status: LocationStatus;
  // Starts the location watch. Called from the Enable tap — a genuine user
  // gesture — so the native prompt is shown instead of auto-suppressed.
  onEnable: () => void;
  // Bumped when the user asks for location while it's blocked (the map's
  // locate button), re-showing the banner even if it was dismissed.
  reopenSignal: number;
}) {
  // The reopenSignal the banner was dismissed at, or null if it hasn't been.
  // A later signal no longer matches, so the banner shows again. A dismissal
  // from a past visit counts as dismissed at the initial signal (0).
  const [dismissedAt, setDismissedAt] = useState<number | null>(() =>
    typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1"
      ? 0
      : null
  );

  // Settings steps for this browser, once "Open settings" is tapped.
  const [steps, setSteps] = useState<string | null>(null);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissedAt(reopenSignal);
  };

  // "prompt" = let the user opt in; "blocked" = browser denied, show help.
  const state =
    status === "prompt" ? "prompt" : status === "denied" ? "blocked" : null;
  if (!state || dismissedAt === reopenSignal) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: "12px",
        right: "12px",
        bottom: "24px",
        zIndex: 60,
        pointerEvents: "none",
      }}
    >
      <div
        role="region"
        aria-label="Location"
        style={{
          pointerEvents: "auto",
          margin: "0 auto",
          maxWidth: "440px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          padding: "14px 16px",
          display: "flex",
          // The blocked message is long, so its action wraps onto its own
          // line under the text; × stays pinned to the top corner.
          alignItems: state === "blocked" ? "flex-start" : "center",
          flexWrap: state === "blocked" ? "wrap" : undefined,
          gap: "4px 12px",
        }}
      >
        {/* Location pin icon */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ea580c"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>

        <div style={{ flex: 1, minWidth: 0 }}>
          {state === "prompt" ? (
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.4, color: "#4b5563" }}>
              See vendors near you and center the map on your location.
            </p>
          ) : steps ? (
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.4, color: "#4b5563" }}>
              {steps} Then reload this page.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.4, color: "#4b5563" }}>
              Location is blocked. To use it, allow location for this site in your
              browser&rsquo;s site settings.
            </p>
          )}
        </div>

        {state === "prompt" ? (
          <>
            <button
              onClick={handleDismiss}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                color: "#6b7280",
                padding: "8px 10px",
                borderRadius: "8px",
              }}
            >
              Not now
            </button>
            <button onClick={onEnable} style={PRIMARY_BUTTON}>
              Enable
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                color: "#9ca3af",
                lineHeight: 1,
                padding: "4px 8px",
                // Lines the × up with the first line of text.
                marginTop: "-4px",
              }}
            >
              ×
            </button>
            {/* Full-width row, so it wraps below the text. Reload matters for
                home-screen installs, which have no browser reload button to
                pick up the changed setting. */}
            <div
              style={{
                flexBasis: "100%",
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "-6px",
              }}
            >
              {steps ? (
                <button onClick={() => window.location.reload()} style={LINK_BUTTON}>
                  Reload
                </button>
              ) : (
                <button
                  onClick={() => setSteps(locationSettingsSteps())}
                  style={LINK_BUTTON}
                >
                  Open settings
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
