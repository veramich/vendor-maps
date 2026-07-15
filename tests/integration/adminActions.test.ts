import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import sql, { resetDb, closeDb } from "./helpers/db.ts";
import { createUser, adminCookieHeader, sessionCookieHeader } from "./helpers/auth.ts";
import {
  installNextMocks,
  setSessionCookie,
  expectRedirect,
} from "./helpers/next-mocks.ts";

// Drives the REAL admin server actions end-to-end: through their requireAdmin()
// guard (auth.api.getSession against a real signed cookie + session row) and
// their DB side effects. This is the layer the pure/DB-only tests couldn't
// reach — it proves the moderation flow works as wired, and that a non-admin is
// turned away.

// Mocks must be installed before the action module is imported.
installNextMocks();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let actions: typeof import("@/app/admin/submissions/actions");

async function insertPending(name: string, submittedBy?: string) {
  const [row] = await sql`
    INSERT INTO businesses (type, name, status, submitted_by)
    VALUES ('permanent_location', ${name}, 'pending', ${submittedBy ?? null})
    RETURNING id
  `;
  return row.id as string;
}

function form(businessId: string, extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("businessId", businessId);
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return fd;
}

async function statusOf(id: string) {
  const [row] = await sql`SELECT status, slug FROM businesses WHERE id = ${id}`;
  return row as { status: string; slug: string | null };
}

// Identity fixtures, seeded once (see resetDb — auth tables aren't truncated).
let adminCookie: string;
let nonAdminCookie: string;
let submitterId: string;

before(async () => {
  actions = await import("@/app/admin/submissions/actions");
  adminCookie = await adminCookieHeader();
  const nonAdmin = await createUser({ name: "Regular User" });
  nonAdminCookie = await sessionCookieHeader(nonAdmin.id);
  submitterId = (await createUser({ name: "Submitter" })).id;
});
beforeEach(resetDb);
after(closeDb);

test("admin approveSubmission moves pending -> listed, sets a slug, notifies submitter", async () => {
  const id = await insertPending("Corner Tamales", submitterId);

  setSessionCookie(adminCookie);
  const dest = await expectRedirect(() => actions.approveSubmission(form(id)));
  assert.equal(dest, "/admin/submissions");

  const after = await statusOf(id);
  assert.equal(after.status, "listed");
  assert.equal(after.slug, "corner-tamales", "approve should generate a slug");

  const [notif] = await sql`
    SELECT type FROM notifications WHERE user_id = ${submitterId}
  `;
  assert.equal(notif?.type, "submission_approved", "submitter should get an approval notification");
});

test("admin rejectSubmission sets status = rejected", async () => {
  const id = await insertPending("Rejectable Rolls", submitterId);

  setSessionCookie(adminCookie);
  await expectRedirect(() => actions.rejectSubmission(form(id, { message: "Not a fit" })));

  assert.equal((await statusOf(id)).status, "rejected");
});

test("a signed-in NON-admin cannot approve (guard redirects, status unchanged)", async () => {
  const id = await insertPending("Guarded Gyros");

  setSessionCookie(nonAdminCookie); // real session, but not the admin user
  const dest = await expectRedirect(() => actions.approveSubmission(form(id)));
  assert.equal(dest, "/", "non-admin should be redirected home by requireAdmin()");
  assert.equal((await statusOf(id)).status, "pending", "non-admin must not change status");
});

test("a signed-OUT request cannot approve", async () => {
  const id = await insertPending("Anon Arancini");
  setSessionCookie(""); // no cookie

  const dest = await expectRedirect(() => actions.approveSubmission(form(id)));
  assert.equal(dest, "/");
  assert.equal((await statusOf(id)).status, "pending");
});
