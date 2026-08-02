import test from "node:test";
import assert from "node:assert/strict";

// The draft module reads `window.localStorage` inside each function rather than
// at import time, so installing a minimal in-memory stand-in here is enough to
// exercise the real save/load round trip.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem:    (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem:    (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
};

import {
  saveDraft,
  loadDraft,
  clearDraft,
  isDraftMeaningful,
} from "@/lib/utils/businessDraft";
import { INITIAL_FORM_DATA } from "@/lib/types/business";

test("round trips the answers a user has filled in", () => {
  store.clear();
  saveDraft(4, false, {
    ...INITIAL_FORM_DATA,
    type:        "small_business",
    name:        "Taco Stand",
    city:        "Austin",
    description: "Best tacos",
  });

  const draft = loadDraft();
  assert.ok(draft);
  assert.equal(draft.step, 4);
  assert.equal(draft.vendorSubStep, false);
  assert.equal(draft.formData.name, "Taco Stand");
  assert.equal(draft.formData.city, "Austin");
  assert.equal(draft.formData.description, "Best tacos");
});

test("drops photos, logo, and the image order that points at them", () => {
  store.clear();
  saveDraft(6, false, {
    ...INITIAL_FORM_DATA,
    type:       "small_business",
    name:       "Taco Stand",
    images:     [{ name: "a.jpg" } as unknown as File],
    imageOrder: ["new:0"],
    logoUrl:    "data:image/png;base64,AAAA",
  });

  const draft = loadDraft();
  assert.ok(draft);
  assert.deepEqual(draft.formData.images, []);
  assert.deepEqual(draft.formData.imageOrder, []);
  assert.equal(draft.formData.logoUrl, "");
  // The logo data URL must not be sitting in storage either.
  assert.ok(!store.get("vm_business_draft")!.includes("base64"));
});

test("restores fields added after the draft was written", () => {
  store.clear();
  store.set("vm_business_draft", JSON.stringify({
    step: 3,
    vendorSubStep: false,
    // An old draft that predates several form fields.
    formData: { name: "Old Draft", type: "small_business" },
    savedAt: Date.now(),
  }));

  const draft = loadDraft();
  assert.ok(draft);
  assert.equal(draft.formData.name, "Old Draft");
  // Missing fields fall back to their initial values rather than undefined.
  assert.deepEqual(draft.formData.servedZips, []);
  assert.equal(draft.formData.noFixedLocation, false);
});

test("discards drafts older than the max age", () => {
  store.clear();
  store.set("vm_business_draft", JSON.stringify({
    step: 4,
    vendorSubStep: false,
    formData: { name: "Stale", type: "small_business" },
    savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
  }));

  assert.equal(loadDraft(), null);
  // And it's purged, not left to be re-read.
  assert.equal(store.has("vm_business_draft"), false);
});

test("survives corrupted storage", () => {
  store.clear();
  store.set("vm_business_draft", "{not json");
  assert.equal(loadDraft(), null);
});

test("clearDraft removes the draft", () => {
  store.clear();
  saveDraft(3, false, { ...INITIAL_FORM_DATA, type: "event", name: "Fair" });
  clearDraft();
  assert.equal(loadDraft(), null);
});

test("only offers to resume drafts with real progress", () => {
  const bare = {
    step: 0,
    vendorSubStep: false,
    formData: INITIAL_FORM_DATA,
    savedAt: Date.now(),
  };
  // Step 0 with nothing chosen: the user tapped in and bounced.
  assert.equal(isDraftMeaningful(bare), false);
  // A chosen type, or any progress past step 1, is worth resuming.
  assert.equal(
    isDraftMeaningful({
      ...bare,
      formData: { ...INITIAL_FORM_DATA, type: "event" },
    }),
    true
  );
  assert.equal(isDraftMeaningful({ ...bare, step: 4 }), true);
});

test("resumes a step-0 draft that only picked 'my business'", () => {
  // A signed-out user who picks "this is my business" is sent to sign-up by
  // the claim prompt before choosing a type. That draft has no type and sits
  // on step 0, so it must be kept on the strength of submittedAsOwner alone —
  // otherwise they return to a blank form and lose the ownership answer.
  const owner = {
    step: 0,
    vendorSubStep: false,
    formData: { ...INITIAL_FORM_DATA, submittedAsOwner: true },
    savedAt: Date.now(),
  };
  assert.equal(isDraftMeaningful(owner), true);

  // "Someone else's business" involves no sign-up detour, so on its own it
  // still isn't worth resuming.
  assert.equal(
    isDraftMeaningful({
      ...owner,
      formData: { ...INITIAL_FORM_DATA, submittedAsOwner: false },
    }),
    false
  );
});
