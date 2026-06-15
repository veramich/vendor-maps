"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";

// Where the user's choice is remembered. Bumping the version (e.g. if the
// set of trackers changes materially) re-prompts everyone.
const CONSENT_KEY = "vm-cookie-consent-v1";

// Custom event the banner listens for so any part of the app (e.g. the
// "Cookie settings" menu link) can re-open it to let the user change or
// withdraw consent — a GDPR requirement that withdrawal be as easy as consent.
const OPEN_EVENT = "vm-open-cookie-settings";

/** Re-open the cookie consent banner from anywhere in the app. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Choice = "accepted" | "declined";

// Microsoft Clarity project id (also referenced from app/layout.tsx history).
const CLARITY_ID = "vxvurldpvd";

export default function CookieConsent() {
  // null = not yet read from storage (first render / SSR), so we render nothing
  // until we know the stored choice. Avoids a flash of the banner.
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);
  // True when the user re-opened the banner via "Cookie settings" after
  // already deciding — lets us show it again to change consent.
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    // Read the stored choice off the effect's synchronous path (a microtask)
    // so we don't trigger cascading renders by setting state in the body.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === "accepted" || stored === "declined") {
        setChoice(stored);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for "open cookie settings" requests from elsewhere in the app.
  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const decide = (next: Choice) => {
    localStorage.setItem(CONSENT_KEY, next);
    setChoice(next);
    setReopened(false);
    // Declining after Clarity already loaded won't unload it this session;
    // a reload starts clean. Note this to the user via the banner copy.
  };

  // Don't render anything until we've read storage.
  if (!ready) return null;

  // Show the banner when no choice has been made yet, or when the user
  // explicitly re-opened settings to change it.
  const showBanner = choice === null || reopened;

  return (
    <>
      {/* Analytics (Microsoft Clarity) loads only after the user accepts. */}
      {choice === "accepted" && (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");`}
        </Script>
      )}

      {showBanner && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4"
        >
          <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
            <p className="text-sm leading-relaxed text-gray-600">
              We use essential cookies to keep VendorMaps working, and optional
              analytics cookies (Microsoft Clarity) to understand how the site is
              used and improve it. You can accept or decline analytics. See our{" "}
              <Link href="/privacy" className="text-orange-600 underline">
                Privacy Policy
              </Link>
              .
            </p>
            {reopened && choice !== null && (
              <p className="mt-2 text-xs text-gray-400">
                Current choice: analytics {choice}. Changing to decline takes full
                effect after a page reload.
              </p>
            )}
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => decide("declined")}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                Decline
              </button>
              <button
                onClick={() => decide("accepted")}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
