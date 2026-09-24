"use client";

import { useEffect } from "react";

interface ClaimSignInPromptProps {
  onSignUp:  () => void;
  onGuest:   () => void;
  onDismiss: () => void;
}

/**
 * Shown when a signed-out user picks "This is my business".
 *
 * Claiming is tied to an account: the submit route only files a claim when it
 * has a session (`ownerCanClaim = submittedAsOwner && Boolean(submittedBy)`),
 * so a guest who says they're the owner gets a listing that is permanently
 * unclaimed and attributed to nobody. This explains that trade-off up front
 * rather than letting them discover it after the listing is live.
 *
 * Copy note: most users here read English as a second language, so this avoids
 * product jargon ("claim", "link", "directory") and contractions in favour of
 * short literal sentences. The user-facing words are "account", "updates" and
 * "guest"; "claim" survives only in the code, never on screen.
 */
export default function ClaimSignInPrompt({
  onSignUp,
  onGuest,
  onDismiss,
}: ClaimSignInPromptProps) {

  // Escape backs out to the ownership choice, matching the Lightbox.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  // z-[60] sits above the z-50 BottomNav, which otherwise covers the guest
  // button on phones.
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50
        flex items-end sm:items-center justify-center
        px-4 pb-4 sm:pb-0"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-signin-title"
    >
      <div
        className="bg-white rounded-2xl p-6 w-full
          max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >

        <div
          className="w-12 h-12 rounded-xl flex items-center
            justify-center mb-4"
          style={{ background: "#FFF4EC" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="var(--primary)"
            strokeWidth="1.8" strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0
              0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>

        <h2
          id="claim-signin-title"
          className="text-lg font-semibold text-black mb-2"
        >
          Want to get updates?
        </h2>

        <p className="text-sm text-gray-500 mb-6">
          Make an account to get updates and edit your
          business any time.
        </p>

        <div className="space-y-3">
          <button
            onClick={onSignUp}
            className="w-full text-white text-sm font-medium
              py-3 rounded-xl transition active:scale-95"
            style={{ background: "var(--primary)" }}
          >
            Create an account
          </button>
          <button
            onClick={onGuest}
            className="w-full border-2 border-gray-200
              text-black text-sm font-medium py-3
              rounded-xl transition active:scale-95
              hover:bg-gray-50"
          >
            Continue as guest
          </button>
        </div>

      </div>
    </div>
  );
}
