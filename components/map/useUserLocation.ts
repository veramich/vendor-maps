"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Coords = { lat: number; lng: number };

// "checking"    — reading the permission state on mount (nothing shown yet)
// "prompt"      — not allowed yet; start() must run from a user tap
// "watching"    — the position watch is live; fixes stream into `location`
// "denied"      — the browser blocked location for this site
// "unsupported" — no Geolocation API
export type LocationStatus =
  | "checking"
  | "prompt"
  | "watching"
  | "denied"
  | "unsupported";

/**
 * The visitor's live position for the map. Never fires the native permission
 * prompt on its own — unsolicited prompts get auto-blocked by browsers. If
 * permission is already granted it starts watching on mount; otherwise it
 * waits for start() to be called from a tap (the location banner's "Enable"
 * or the map's locate button).
 */
export function useUserLocation() {
  const [location, setLocation] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>("checking");
  const watchIdRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (watchIdRef.current != null || !("geolocation" in navigator)) return;
    setStatus("watching");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) =>
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        // PERMISSION_DENIED === 1. The watch is dead; drop it so a later
        // start() can try again.
        if (err.code === 1) {
          if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          setStatus("denied");
        }
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
  }, []);

  // Read the existing permission state on mount — never call geolocation
  // here unless it's already granted. State is only updated in async
  // callbacks, never synchronously in the effect body.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      Promise.resolve().then(() => setStatus("unsupported"));
      return;
    }

    let cancelled = false;

    const decide = (permission?: PermissionState) => {
      // A tap may have started the watch while the query was in flight.
      if (cancelled || watchIdRef.current != null) return;
      if (permission === "granted") {
        start(); // already allowed — watch silently
      } else {
        setStatus(permission === "denied" ? "denied" : "prompt");
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
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [start]);

  return { location, status, start };
}
