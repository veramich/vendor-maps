"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Remembers that the user dismissed the banner so we don't nag them every
// visit. (Their actual grant/deny lives in the browser's permission store.)
const DISMISS_KEY = "vm-location-banner-dismissed";

type Coords = { lat: number; lng: number };

// "hidden" until we've decided whether to show it (avoids a flash);
// "prompt" = show the banner; "blocked" = browser denied, show help.
type BannerState = "hidden" | "prompt" | "blocked";

export default function LocationBanner({
  onLocation,
}: {
  // Called with each position fix once the user enables location.
  onLocation: (c: Coords) => void;
}) {
  const [state, setState] = useState<BannerState>("hidden");
  const watchIdRef = useRef<number | null>(null);

  // Starts the live position watch. Called only after a user gesture (Enable)
  // or when permission is already granted.
  const startWatch = useCallback(() => {
    if (watchIdRef.current != null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => onLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        // PERMISSION_DENIED === 1
        if (err.code === 1) setState("blocked");
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
  }, [onLocation]);

  // Decide whether to show the banner on mount. We do NOT call geolocation
  // here — that's what auto-triggers (and gets auto-blocked) the native
  // prompt. We only read the existing permission state, then update state in
  // an async callback (never synchronously in the effect body).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    let cancelled = false;

    const decide = (permission?: PermissionState) => {
      if (cancelled) return;
      if (permission === "granted") {
        startWatch(); // already allowed — watch silently, no banner
      } else if (permission === "denied") {
        setState("blocked"); // permanently blocked — "Enable" wouldn't help
      } else {
        setState("prompt"); // "prompt"/unknown — let the user opt in
      }
    };

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((res) => decide(res.state))
        .catch(() => decide(undefined));
    } else {
      // No Permissions API: defer to a microtask so we don't setState
      // synchronously inside the effect body.
      Promise.resolve().then(() => decide(undefined));
    }

    return () => {
      cancelled = true;
    };
  }, [startWatch]);

  // Clear the watch on unmount.
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleEnable = () => {
    // This runs inside the click handler — a genuine user gesture — so the
    // native prompt is shown reliably instead of being auto-suppressed.
    setState("hidden");
    startWatch();
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setState("hidden");
  };

  if (state === "hidden") return null;

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
          alignItems: "center",
          gap: "12px",
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
          ) : (
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.4, color: "#4b5563" }}>
              Location is blocked. To use it, allow location for this site in your
              browser&rsquo;s site settings, then reload.
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
            <button
              onClick={handleEnable}
              style={{
                background: "#ea580c",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: "8px",
                whiteSpace: "nowrap",
              }}
            >
              Enable
            </button>
          </>
        ) : (
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
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
