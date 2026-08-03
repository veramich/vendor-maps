import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import sql, { resetDb, closeDb } from "./helpers/db.ts";
import { createUser, sessionCookieHeader } from "./helpers/auth.ts";
import { installNextMocks, setSessionCookie } from "./helpers/next-mocks.ts";

// GET/PATCH/DELETE /api/user/submissions/[id] — the business edit flow.
//
// VendorMaps is a community directory: any signed-in user may EDIT an unclaimed
// listing, but only the submitter or verified owner may DESTROY anything. The
// rule is "a non-owner may add and amend, never destroy". These tests pin both
// halves — it is equally wrong to block community edits and to allow a stranger
// to delete someone's photos.
//
// A CLAIMED listing stays owner-only: claim_status='claimed' + claimed_by !=
// caller is a 403 before any body parsing. See resourceEdit.test.ts for the
// resources equivalent.

installNextMocks();
let route: typeof import("@/app/api/user/submissions/[id]/route");

function patch(id: string, cookie: string, body?: Record<string, unknown>) {
  setSessionCookie(cookie);
  const fd = new FormData();
  fd.set("data", JSON.stringify(body ?? { name: "Hijacked Name" }));
  const r = new NextRequest(`http://localhost/api/user/submissions/${id}`, {
    method: "PATCH",
    body: fd,
  });
  return route.PATCH(r, { params: Promise.resolve({ id }) });
}

// A multipart edit that declares which existing photos survive. Omitting an id
// from keptImageIds is how the form asks for a photo to be removed.
function patchWithPhotos(
  id: string,
  cookie: string,
  opts: { keptImageIds?: string[]; imageOrder?: string[] }
) {
  setSessionCookie(cookie);
  const fd = new FormData();
  fd.set("data", JSON.stringify({ name: "Edited Name" }));
  if (opts.keptImageIds !== undefined) {
    fd.set("keptImageIds", JSON.stringify(opts.keptImageIds));
  }
  if (opts.imageOrder !== undefined) {
    fd.set("imageOrder", JSON.stringify(opts.imageOrder));
  }
  const r = new NextRequest(`http://localhost/api/user/submissions/${id}`, {
    method: "PATCH",
    body: fd,
  });
  return route.PATCH(r, { params: Promise.resolve({ id }) });
}

function get(id: string, cookie: string) {
  setSessionCookie(cookie);
  const r = new NextRequest(`http://localhost/api/user/submissions/${id}`);
  return route.GET(r, { params: Promise.resolve({ id }) });
}

function del(id: string, cookie: string) {
  setSessionCookie(cookie);
  const r = new NextRequest(`http://localhost/api/user/submissions/${id}`, {
    method: "DELETE",
  });
  return route.DELETE(r, { params: Promise.resolve({ id }) });
}

async function insertClaimedBusiness(name: string, ownerId: string) {
  const [row] = await sql`
    INSERT INTO businesses (type, name, status, claim_status, claimed_by)
    VALUES ('permanent_location', ${name}, 'listed', 'claimed', ${ownerId})
    RETURNING id
  `;
  return row.id as string;
}

// An unclaimed listing submitted by `submitterId` — the community-editable
// case. submitter_ip is set so the GET redaction has something to hide.
async function insertUnclaimedBusiness(name: string, submitterId: string) {
  const [row] = await sql`
    INSERT INTO businesses (
      type, name, status, claim_status, submitted_by, submitter_ip
    )
    VALUES (
      'permanent_location', ${name}, 'listed', 'unclaimed',
      ${submitterId}, '203.0.113.7'
    )
    RETURNING id
  `;
  return row.id as string;
}

async function addPhoto(businessId: string, order: number) {
  const [row] = await sql`
    INSERT INTO business_images (
      business_id, cloudinary_public_id, cloudinary_url,
      image_type, display_order, is_primary
    )
    VALUES (
      ${businessId}, ${`pid_${order}`}, ${`https://example.test/${order}.jpg`},
      'gallery', ${order}, ${order === 0}
    )
    RETURNING id
  `;
  return row.id as string;
}

let owner: { id: string };
let submitter: { id: string };
let editorCookie: string;
let submitterCookie: string;
let intruderCookie: string;

before(async () => {
  route = await import("@/app/api/user/submissions/[id]/route");
  owner = await createUser({ name: "Verified Owner" });
  submitter = await createUser({ name: "Original Submitter" });
  const editor = await createUser({ name: "Community Editor" });
  const intruder = await createUser({ name: "Intruder" });
  editorCookie = await sessionCookieHeader(editor.id);
  submitterCookie = await sessionCookieHeader(submitter.id);
  intruderCookie = await sessionCookieHeader(intruder.id);
});
beforeEach(resetDb);
after(closeDb);

// ---------------------------------------------------------------------------
// Claimed listings stay owner-only (pre-existing behavior, must not regress)
// ---------------------------------------------------------------------------

test("a non-owner cannot edit a CLAIMED listing (403, name unchanged)", async () => {
  const id = await insertClaimedBusiness("Verified Bistro", owner.id);

  const res = await patch(id, intruderCookie);
  assert.equal(res.status, 403, "claimed listings are owner-only");

  const [b] = await sql`SELECT name FROM businesses WHERE id = ${id}`;
  assert.equal(b.name, "Verified Bistro", "a blocked edit must not change the row");
});

test("editing requires sign-in (401)", async () => {
  const id = await insertClaimedBusiness("Verified Bistro 2", owner.id);
  const res = await patch(id, "");
  assert.equal(res.status, 401);
});

// ---------------------------------------------------------------------------
// Community editing: any signed-in user may AMEND an unclaimed listing
// ---------------------------------------------------------------------------

test("a non-owner CAN edit text fields on an UNCLAIMED listing", async () => {
  const id = await insertUnclaimedBusiness("Rosa's Tacos", submitter.id);

  const res = await patch(id, editorCookie, {
    name: "Rosa's Taqueria",
    description: "Corrected by a community editor",
  });
  assert.equal(res.status, 200, "unclaimed listings are community-editable");

  const [b] = await sql`SELECT name FROM businesses WHERE id = ${id}`;
  assert.equal(b.name, "Rosa's Taqueria", "the edit must actually apply");
});

test("a non-owner CAN add photos to an unclaimed listing", async () => {
  const id = await insertUnclaimedBusiness("Photo Add", submitter.id);
  const existing = await addPhoto(id, 0);

  // Keeping every existing photo and adding nothing to remove is allowed.
  const res = await patchWithPhotos(id, editorCookie, {
    keptImageIds: [existing],
  });
  assert.equal(res.status, 200, "keeping all photos is not a removal");

  const rows = await sql`
    SELECT id FROM business_images WHERE business_id = ${id}
  `;
  assert.equal(rows.length, 1, "the existing photo must survive");
});

// ---------------------------------------------------------------------------
// ...but may NOT destroy: photos, ordering, or the listing itself
// ---------------------------------------------------------------------------

test("a non-owner CANNOT remove a photo (403, photos unchanged)", async () => {
  const id = await insertUnclaimedBusiness("Photo Guard", submitter.id);
  const keep = await addPhoto(id, 0);
  await addPhoto(id, 1); // omitted below => a removal request

  const res = await patchWithPhotos(id, editorCookie, {
    keptImageIds: [keep],
  });
  assert.equal(res.status, 403, "photo removal is owner-only");

  const rows = await sql`
    SELECT id FROM business_images WHERE business_id = ${id}
  `;
  assert.equal(rows.length, 2, "a refused removal must not delete anything");
});

test("a refused photo removal leaves no edit_snapshot behind", async () => {
  const id = await insertUnclaimedBusiness("No Partial State", submitter.id);
  const keep = await addPhoto(id, 0);
  await addPhoto(id, 1);

  await patchWithPhotos(id, editorCookie, { keptImageIds: [keep] });

  // The snapshot write happens after the permission checks, so a listing whose
  // edit was refused must not look like it has one pending.
  const [b] = await sql`
    SELECT edit_snapshot, status FROM businesses WHERE id = ${id}
  `;
  assert.equal(b.edit_snapshot, null, "refused edit must not stage a snapshot");
  assert.equal(b.status, "listed", "refused edit must not unpublish the listing");
});

test("a non-owner CANNOT change the cover photo by reordering", async () => {
  const id = await insertUnclaimedBusiness("Order Guard", submitter.id);
  const first = await addPhoto(id, 0);
  const second = await addPhoto(id, 1);

  // Ask to promote the second photo to cover. The edit succeeds (the text part
  // is legitimate) but the reorder is dropped rather than applied.
  const res = await patchWithPhotos(id, editorCookie, {
    keptImageIds: [first, second],
    imageOrder: [second, first],
  });
  assert.equal(res.status, 200);

  const [cover] = await sql`
    SELECT id FROM business_images
    WHERE business_id = ${id} AND is_primary = true
  `;
  assert.equal(cover.id, first, "a non-owner must not repoint the cover photo");
});

test("a non-owner CANNOT delete an unclaimed listing (403)", async () => {
  const id = await insertUnclaimedBusiness("Delete Guard", submitter.id);

  const res = await del(id, editorCookie);
  assert.equal(res.status, 403, "removal stays with the submitter/owner");

  const [b] = await sql`SELECT status FROM businesses WHERE id = ${id}`;
  assert.equal(b.status, "listed", "a refused delete must not change status");
});

// ---------------------------------------------------------------------------
// The submitter keeps full control
// ---------------------------------------------------------------------------

test("the submitter CAN remove photos from their own listing", async () => {
  const id = await insertUnclaimedBusiness("Owner Photos", submitter.id);
  const keep = await addPhoto(id, 0);
  await addPhoto(id, 1);

  const res = await patchWithPhotos(id, submitterCookie, {
    keptImageIds: [keep],
  });
  assert.equal(res.status, 200, "the submitter may curate their own photos");

  const rows = await sql`
    SELECT id FROM business_images WHERE business_id = ${id}
  `;
  assert.equal(rows.length, 1, "the omitted photo should be gone");
});

// ---------------------------------------------------------------------------
// GET: community editors get the form data, not the submitter's PII
// ---------------------------------------------------------------------------

test("GET redacts submitter_ip from a non-owner", async () => {
  const id = await insertUnclaimedBusiness("PII Guard", submitter.id);

  const res = await get(id, editorCookie);
  assert.equal(res.status, 200, "a community editor may load the edit form");

  const body = await res.json();
  assert.equal(
    body.business.submitter_ip,
    undefined,
    "submitter IP must never reach a non-owner"
  );
  assert.equal(
    body.business.edit_snapshot,
    undefined,
    "moderation internals must not reach a non-owner"
  );
  assert.equal(
    body.permissions.canRemovePhotos,
    false,
    "the UI needs to know to hide destructive controls"
  );
});

test("GET returns the full row to the submitter", async () => {
  const id = await insertUnclaimedBusiness("Owner View", submitter.id);

  const res = await get(id, submitterCookie);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(
    body.business.submitter_ip,
    "203.0.113.7",
    "the submitter still sees their own submission metadata"
  );
  assert.equal(body.permissions.canRemovePhotos, true);
});
