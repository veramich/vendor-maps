"use client";

import { useEffect, useState } from "react";

export default function ConstructionBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDismissed(true);
    }, 10000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (dismissed) return null;

  return (
    <div
      style={{ background: "var(--foreground)" }}
      className="fixed top-0 left-0 right-0 z-[100]
        px-4 py-2.5"
    >
      <div className="max-w-lg mx-auto flex items-center
        justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">🚧</span>
          <p className="text-white text-xs font-medium">
            Vendor Maps is coming soon — you're getting
            an exclusive sneak peek!
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-white opacity-70
            hover:opacity-100 transition flex-shrink-0"
        >
          <svg width="16" height="16"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}