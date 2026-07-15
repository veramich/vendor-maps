import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import sql, { resetDb, closeDb } from "./helpers/db.ts";
import { createUser, adminCookieHeader, sessionCookieHeader } from "./helpers/auth.ts";
import { installNextMocks, setSessionCookie, expectRedirect } from "./helpers/next-mocks.ts";

// Full claim lifecycle across the REAL code:
//   1. POST /api/businesses/[id]/claim  — a signed-in user files a claim
//      (+ its auth / already-claimed / duplicate guards)
//   2. admin approveClaim / rejectClaim server actions resolve it
// Auth is genuine (signed cookie + session row + requireAdmin), same scaffolding
// as adminActions.test.ts.

installNextMocks();
let claimRoute: typeof import("@/app/api/businesses/[id]/claim/route");
let claimActions: typeof import("@/app/admin/claims/actions");

// Route params arrive as a promise in this Next version.
function req(businessId: string, body: unknown, cookie: string) {
  setSessionCookie(cookie);
  const r = new NextRequest(`http://localhost/api/businesses/${businessId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return claimRoute.POST(r, { params: Promise.resolve({ id: businessId }) });
}

async function insertListedBusiness(name: string) {
  const [row] = await sql`
    INSERT INTO businesses (type, name, status, claim_status)
    VALUES ('permanent_location', ${name}, 'listed', 'unclaimed')
    RETURNING id
  `;
  return row.id as string;
}

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// Identity fixtures (auth tables aren't truncated between tests).
let adminCookie: string;
let claimer: { id: string; email: string };
let claimerCookie: string;

before(async () => {
  claimRoute = await import("@/app/api/businesses/[id]/claim/route");
  claimActions = await import("@/app/admin/claims/actions");
  adminCookie = await adminCookieHeader();
  claimer = await createUser({ name: "Claimer" });
  claimerCookie = await sessionCookieHeader(claimer.id);
});
beforeEach(resetDb);
after(closeDb);

test("signed-in user files a claim: creates pending claim + flips business to pending", async () => {
  const bizId = await insertListedBusiness("Claimable Cafe");

  const res = await req(bizId, { contactInfo: "@claimer_ig" }, claimerCookie);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true });

  const [claim] = await sql`
    SELECT user_id, status, claim_contact FROM claims WHERE business_id = ${bizId}
  `;
  assert.equal(claim.status, "pending");
  assert.equal(claim.user_id, claimer.id);
  assert.equal(claim.claim_contact, "@claimer_ig");

  const [biz] = await sql`SELECT claim_status FROM businesses WHERE id = ${bizId}`;
  assert.equal(biz.claim_status, "pending");
});

test("claiming requires sign-in (401) and does not create a claim", async () => {
  const bizId = await insertListedBusiness("Guarded Grill");

  const res = await req(bizId, { contactInfo: "x" }, ""); // no cookie
  assert.equal(res.status, 401);

  const claims = await sql`SELECT id FROM claims WHERE business_id = ${bizId}`;
  assert.equal(claims.length, 0);
});

test("contact info is required (400)", async () => {
  const bizId = await insertListedBusiness("Blankcontact Bistro");
  const res = await req(bizId, { contactInfo: "   " }, claimerCookie);
  assert.equal(res.status, 400);
});

test("an already-claimed business rejects new claims (400)", async () => {
  const bizId = await insertListedBusiness("Taken Taqueria");
  await sql`UPDATE businesses SET claim_status = 'claimed' WHERE id = ${bizId}`;

  const res = await req(bizId, { contactInfo: "@me" }, claimerCookie);
  assert.equal(res.status, 400);
});

test("a duplicate pending claim by the same user is rejected (400)", async () => {
  const bizId = await insertListedBusiness("Doubled Diner");

  const first = await req(bizId, { contactInfo: "@me" }, claimerCookie);
  assert.equal(first.status, 200);

  const second = await req(bizId, { contactInfo: "@me again" }, claimerCookie);
  assert.equal(second.status, 400);

  const claims = await sql`SELECT id FROM claims WHERE business_id = ${bizId}`;
  assert.equal(claims.length, 1, "no second claim row should be created");
});

test("admin approveClaim: claim approved, business claimed by user, notified", async () => {
  const bizId = await insertListedBusiness("Approvable Alehouse");
  await req(bizId, { contactInfo: "@owner" }, claimerCookie);
  const [claim] = await sql`SELECT id FROM claims WHERE business_id = ${bizId}`;

  setSessionCookie(adminCookie);
  const dest = await expectRedirect(() =>
    claimActions.approveClaim(
      form({ claimId: claim.id, businessId: bizId, userId: claimer.id })
    )
  );
  assert.equal(dest, "/admin/claims");

  const [c] = await sql`SELECT status FROM claims WHERE id = ${claim.id}`;
  assert.equal(c.status, "approved");
  const [b] = await sql`SELECT claim_status, claimed_by FROM businesses WHERE id = ${bizId}`;
  assert.equal(b.claim_status, "claimed");
  assert.equal(b.claimed_by, claimer.id);

  const [n] = await sql`SELECT type FROM notifications WHERE user_id = ${claimer.id}`;
  assert.equal(n?.type, "claim_approved");
});

test("admin rejectClaim: claim rejected, business back to unclaimed", async () => {
  const bizId = await insertListedBusiness("Rejectable Rotisserie");
  await req(bizId, { contactInfo: "@owner" }, claimerCookie);
  const [claim] = await sql`SELECT id FROM claims WHERE business_id = ${bizId}`;

  setSessionCookie(adminCookie);
  await expectRedirect(() =>
    claimActions.rejectClaim(form({ claimId: claim.id, businessId: bizId }))
  );

  const [c] = await sql`SELECT status FROM claims WHERE id = ${claim.id}`;
  assert.equal(c.status, "rejected");
  const [b] = await sql`SELECT claim_status FROM businesses WHERE id = ${bizId}`;
  assert.equal(b.claim_status, "unclaimed");
});

test("a NON-admin cannot approve a claim (guard redirects, nothing changes)", async () => {
  const bizId = await insertListedBusiness("Fortified Foodhall");
  await req(bizId, { contactInfo: "@owner" }, claimerCookie);
  const [claim] = await sql`SELECT id FROM claims WHERE business_id = ${bizId}`;

  setSessionCookie(claimerCookie); // real session, not admin
  const dest = await expectRedirect(() =>
    claimActions.approveClaim(
      form({ claimId: claim.id, businessId: bizId, userId: claimer.id })
    )
  );
  assert.equal(dest, "/");

  const [c] = await sql`SELECT status FROM claims WHERE id = ${claim.id}`;
  assert.equal(c.status, "pending", "non-admin must not resolve the claim");
});
