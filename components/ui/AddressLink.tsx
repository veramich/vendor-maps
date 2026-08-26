"use client";

import { useState, useEffect, useCallback } from "react";

const PREF_KEY = "vmaps_map_app";

type AppId = "apple" | "google" | "waze";

interface MapApp {
  id: AppId;
  label: string;
  /** Built from coordinates when we have them, the address string otherwise. */
  href: (target: Target) => string;
}

/**
 * Coordinates route far more reliably than a text address — cross-street
 * listings ("5th & Main") and privacy-trimmed addresses geocode badly or not
 * at all. Fall back to the text only when the listing has no point.
 */
interface Target {
  address: string;
  lat: number | null;
  lng: number | null;
  name: string;
}

const APPS: MapApp[] = [
  {
    id: "apple",
    label: "Apple Maps",
    href: ({ address, lat, lng, name }) =>
      lat != null && lng != null
        ? `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`
        : `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`,
  },
  {
    id: "google",
    label: "Google Maps",
    href: ({ address, lat, lng }) =>
      lat != null && lng != null
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
            address
          )}`,
  },
  {
    id: "waze",
    label: "Waze",
    href: ({ address, lat, lng }) =>
      lat != null && lng != null
        ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        : `https://waze.com/ul?q=${encodeURIComponent(address)}`,
  },
];

/**
 * Apple Maps only exists on Apple platforms, so it is hidden elsewhere and
 * demoted below Google on Android. Waze is a phone app; on desktop its links
 * bounce through a web page that just tells you to install it, so it is
 * dropped there rather than offered as a dead end.
 */
function orderedApps(): MapApp[] {
  if (typeof navigator === "undefined") return APPS;
  const ua = navigator.userAgent;
  const isApple = /iPhone|iPad|iPod|Macintosh/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = isAndroid || /iPhone|iPad|iPod/.test(ua);

  const by = (id: AppId) => APPS.find((a) => a.id === id)!;
  const list: MapApp[] = [];
  if (isApple) list.push(by("apple"));
  list.push(by("google"));
  if (isMobile) list.push(by("waze"));
  return list;
}

interface Props {
  address: string;
  lat: number | null;
  lng: number | null;
  businessName: string;
  /** Rendered as the link's visible content (address plus city line). */
  children: React.ReactNode;
}

export default function AddressLink({
  address,
  lat,
  lng,
  businessName,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<MapApp[]>([]);
  // Until this flips, the click handler is not attached yet and the anchor
  // would navigate straight to its href. See the `href` comment below.
  const [hydrated, setHydrated] = useState(false);

  const target: Target = { address, lat, lng, name: businessName };

  // userAgent is unavailable during SSR, so the app list is resolved after
  // mount. The picker can't open before then anyway.
  useEffect(() => {
    // Set off the effect's synchronous path (a microtask) so we don't trigger
    // cascading renders, matching CookieConsent's approach.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setApps(orderedApps());
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openIn = useCallback(
    (app: MapApp, remember: boolean) => {
      if (remember) {
        try {
          localStorage.setItem(PREF_KEY, app.id);
        } catch {
          // Private browsing can throw on write; opening the map still works.
        }
      }
      setOpen(false);
      window.open(app.href(target), "_blank", "noopener,noreferrer");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [address, lat, lng, businessName]
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const available = apps.length ? apps : orderedApps();

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(PREF_KEY);
    } catch {
      // Storage blocked — fall through to the picker.
    }
    // A remembered app that is no longer offered (the user switched devices)
    // falls back to the picker rather than to a link the platform can't open.
    const preferred = available.find((a) => a.id === saved);
    if (preferred) {
      window.open(preferred.href(target), "_blank", "noopener,noreferrer");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {/*
        Before hydration the click handler is not attached, so a tap follows
        `href` directly. Pointing that at one specific app would silently open
        the wrong one — the picker would appear to be skipped. So the anchor is
        only a real link once hydrated; until then it renders without an href,
        and a tap does nothing rather than something wrong.
      */}
      <a
        href={hydrated ? APPS[1].href(target) : undefined}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
        className="text-left group cursor-pointer"
      >
        <span className="block group-hover:underline
          decoration-gray-300 underline-offset-2">
          {children}
        </span>
      </a>

      {open && (
        <MapPicker
          apps={apps.length ? apps : orderedApps()}
          address={address}
          onPick={openIn}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function MapPicker({
  apps,
  address,
  onPick,
  onClose,
}: {
  apps: MapApp[];
  address: string;
  onPick: (app: MapApp, remember: boolean) => void;
  onClose: () => void;
}) {
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center
        justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-picker-title"
        className="bg-white rounded-2xl w-full max-w-sm
          p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="map-picker-title"
          className="text-base font-semibold text-black"
        >
          Open directions
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {address}
        </p>

        <div className="mt-4 space-y-2">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => onPick(app, remember)}
              className="w-full border-2 border-gray-200
                text-black text-sm font-medium py-2.5
                rounded-xl hover:bg-gray-50 transition"
            >
              {app.label}
            </button>
          ))}
        </div>

        <label
          className="flex items-center gap-2 mt-4
            text-xs text-gray-500 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300
              accent-[var(--primary)]"
          />
          Don&apos;t ask again
        </label>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-gray-500 text-xs
            font-medium py-2.5 mt-3 rounded-xl
            hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
