import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import sql, { resetDb, closeDb } from "./helpers/db.ts";
import { createUser, adminCookieHeader, sessionCookieHeader } from "./helpers/auth.ts";
import { installNextMocks, setSessionCookie, expectRedirect } from "./helpers/next-mocks.ts";

// Full resource lifecycle across the REAL code:
//   1. POST /api/resources/submit — multipart submit (no-flyer path, so no
//      Cloudinary), signed-in or anonymous, + validation guards
//   2. admin approveResource / rejectResource / deleteResource server actions
//
// Only the flyerless path is exercised so uploadImage (Cloudinary) is never
// called; flyer upload is out of scope for a moderation-flow test.

installNextMocks();
let submitRoute: typeof import("@/app/api/resources/submit/route");
let resourceActions: typeof import("@/app/admin/resources/actions");

// Build a multipart submit request. `always` timing needs no dates and
// satisfies the resources_date_range CHECK, keeping payloads minimal.
function submit(data: Record<string, unknown>, cookie: string) {
  setSessionCookie(cookie);
  const fd = new FormData();
  fd.set("data", JSON.stringify({ timingType: "always", ...data }));
  const r = new NextRequest("http://localhost/api/resources/submit", {
    method: "POST",
    body: fd, // sets multipart content-type + boundary automatically
  });
  return submitRoute.POST(r);
}

const VALID = {
  resourceType: "Grant",
  title: "Small Vendor Grant",
  availability: "Rolling, apply anytime",
};

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function statusOf(id: string) {
  const [row] = await sql`SELECT status, submitted_by FROM resources WHERE id = ${id}`;
  return row as { status: string; submitted_by: string | null } | undefined;
}

// Identity fixtures (auth tables aren't truncated between tests).
let adminCookie: string;
let submitter: { id: string; email: string };
let submitterCookie: string;

before(async () => {
  submitRoute = await import("@/app/api/resources/submit/route");
  resourceActions = await import("@/app/admin/resources/actions");
  adminCookie = await adminCookieHeader();
  submitter = await createUser({ name: "Resource Submitter" });
  submitterCookie = await sessionCookieHeader(submitter.id);
});
beforeEach(resetDb);
after(closeDb);

test("signed-in submit creates a pending resource attributed to the user", async () => {
  const res = await submit(VALID, submitterCookie);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);

  const s = await statusOf(body.resourceId);
  assert.equal(s?.status, "pending");
  assert.equal(s?.submitted_by, submitter.id, "resource should be attributed to the submitter");
});

test("anonymous submit is allowed and lands pending with no submitter", async () => {
  const res = await submit(VALID, ""); // signed out
  assert.equal(res.status, 200);
  const { resourceId } = await res.json();
  const s = await statusOf(resourceId);
  assert.equal(s?.status, "pending");
  assert.equal(s?.submitted_by, null);
});

test("missing required fields are rejected (400)", async () => {
  const noTitle = await submit({ resourceType: "Grant", availability: "x" }, submitterCookie);
  assert.equal(noTitle.status, 400);

  const noType = await submit({ title: "X", availability: "x" }, submitterCookie);
  assert.equal(noType.status, 400);

  const noAvail = await submit({ resourceType: "Grant", title: "X" }, submitterCookie);
  assert.equal(noAvail.status, 400);
});

test("admin approveResource moves pending -> listed and notifies the submitter", async () => {
  const { resourceId } = await (await submit(VALID, submitterCookie)).json();

  setSessionCookie(adminCookie);
  const dest = await expectRedirect(() =>
    resourceActions.approveResource(form({ resourceId }))
  );
  assert.equal(dest, "/admin/resources");

  assert.equal((await statusOf(resourceId))?.status, "listed");
  const [n] = await sql`SELECT type FROM notifications WHERE user_id = ${submitter.id}`;
  assert.equal(n?.type, "resource_approved");
});

test("admin rejectResource sets status = rejected", async () => {
  const { resourceId } = await (await submit(VALID, submitterCookie)).json();

  setSessionCookie(adminCookie);
  await expectRedirect(() => resourceActions.rejectResource(form({ resourceId })));

  assert.equal((await statusOf(resourceId))?.status, "rejected");
});

test("admin deleteResource removes the row", async () => {
  const { resourceId } = await (await submit(VALID, submitterCookie)).json();

  setSessionCookie(adminCookie);
  await expectRedirect(() => resourceActions.deleteResource(form({ resourceId })));

  assert.equal(await statusOf(resourceId), undefined, "row should be gone");
});

test("a NON-admin cannot approve or delete a resource (guard redirects, row intact)", async () => {
  const { resourceId } = await (await submit(VALID, submitterCookie)).json();

  setSessionCookie(submitterCookie); // real session, not admin
  const approveDest = await expectRedirect(() =>
    resourceActions.approveResource(form({ resourceId }))
  );
  assert.equal(approveDest, "/");
  assert.equal((await statusOf(resourceId))?.status, "pending", "status must be unchanged");

  const deleteDest = await expectRedirect(() =>
    resourceActions.deleteResource(form({ resourceId }))
  );
  assert.equal(deleteDest, "/");
  assert.ok(await statusOf(resourceId), "row must still exist after non-admin delete attempt");
});
