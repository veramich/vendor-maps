// Tracks businesses submitted while signed out so they can be adopted onto the
// user's account once they sign up / sign in. We only stash the business id
// (returned by /api/businesses/submit); the server-side adopt endpoint refuses
// to attach any id that already has an owner, so a stale/guessed id is a no-op.

const STORAGE_KEY = "vm_pending_submissions";

// Read the stashed ids. Returns [] in any non-browser / corrupted-storage case.
export function getPendingSubmissions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

// Append a freshly-submitted business id (deduped). Called after an anonymous
// submit succeeds.
export function addPendingSubmission(businessId: string): void {
  if (typeof window === "undefined" || !businessId) return;
  try {
    const ids = new Set(getPendingSubmissions());
    ids.add(businessId);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...ids])
    );
  } catch {
    // Storage full / disabled — nothing we can do, adoption just won't happen.
  }
}

export function clearPendingSubmissions(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
