"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import {
  getPendingSubmissions,
  clearPendingSubmissions,
} from "@/lib/utils/pendingSubmissions";

// Watches for an authenticated session and adopts any businesses that were
// submitted while signed out (ids stashed in localStorage). Mounted once in the
// root layout so it covers every auth path — email sign-up after verification,
// Google OAuth redirect, and plain sign-in — without each page wiring it up.
export default function SubmissionAdopter() {
  const { data: session, isPending } = useSession();
  // Guard against firing twice (session object identity can change on refetch).
  const ranForUser = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) return;

    const userId = session?.user?.id;
    if (!userId) return;
    if (ranForUser.current === userId) return;

    const businessIds = getPendingSubmissions();
    if (businessIds.length === 0) {
      ranForUser.current = userId;
      return;
    }

    ranForUser.current = userId;

    fetch("/api/user/submissions/adopt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessIds }),
    })
      .then((res) => {
        // Clear only on a definitive success. Leaving the ids on a transient
        // failure lets a later session retry the adoption.
        if (res.ok) clearPendingSubmissions();
      })
      .catch(() => {
        // Network error — keep the ids for a future attempt.
      });
  }, [session, isPending]);

  return null;
}
