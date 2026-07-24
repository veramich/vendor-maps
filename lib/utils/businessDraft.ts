// Autosaves the add-business form to localStorage so a user who navigates away
// mid-flow (closed tab, clicked a link, refreshed) doesn't lose their answers.
//
// Two form fields can't survive a round trip through storage and are dropped:
//   - `images`: File objects aren't JSON-serializable and can't be rebuilt.
//   - `logoUrl`: a base64 data URL big enough to blow the ~5MB quota on its own.
// Both live on the Photos/Info steps, so a restored draft simply asks for them
// again; everything else comes back as the user left it.

import {
  BusinessFormData,
  INITIAL_FORM_DATA,
} from "@/lib/types/business";

const STORAGE_KEY = "vm_business_draft";

// Drafts older than this are treated as abandoned and discarded on load, so a
// user returning weeks later starts clean instead of resuming a stale flow.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days

export type BusinessDraft = {
  step:          number;
  vendorSubStep: boolean;
  formData:      BusinessFormData;
  savedAt:       number;
};

// Fields deliberately not persisted (see note above).
type StoredFormData = Omit<BusinessFormData, "images" | "logoUrl">;

type StoredDraft = {
  step:          number;
  vendorSubStep: boolean;
  formData:      StoredFormData;
  savedAt:       number;
};

export function saveDraft(
  step: number,
  vendorSubStep: boolean,
  formData: BusinessFormData
): void {
  if (typeof window === "undefined") return;
  try {
    const rest: StoredFormData = { ...formData };
    delete (rest as Partial<BusinessFormData>).images;
    delete (rest as Partial<BusinessFormData>).logoUrl;
    const draft: StoredDraft = {
      step,
      vendorSubStep,
      formData: rest,
      savedAt:  Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage full / disabled — autosave is best-effort, keep the form working.
  }
}

// Read the stashed draft, merged over INITIAL_FORM_DATA so a draft written by
// an older build (missing fields added since) still restores cleanly.
// Returns null when there's nothing usable to resume.
export function loadDraft(): BusinessDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredDraft> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.formData || typeof parsed.formData !== "object") return null;

    if (
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > MAX_AGE_MS
    ) {
      clearDraft();
      return null;
    }

    return {
      step:          typeof parsed.step === "number" ? parsed.step : 0,
      vendorSubStep: parsed.vendorSubStep === true,
      formData: {
        ...INITIAL_FORM_DATA,
        ...parsed.formData,
        // Never restored — the user re-picks these on their steps.
        images:  [],
        logoUrl: "",
        // `imageOrder` tokens point into the `images` array we just dropped, so
        // any surviving "new:<i>" would resolve to nothing at submit. The add
        // flow has no existing photos, so the order resets with the photos.
        imageOrder: [],
      },
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// True when a draft holds enough progress to be worth offering to restore.
// A user who only tapped "this is my business" and bounced gets no prompt.
export function isDraftMeaningful(draft: BusinessDraft): boolean {
  return draft.step > 1 || Boolean(draft.formData.type);
}
