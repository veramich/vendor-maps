import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import sql, { resetDb, closeDb } from "./helpers/db.ts";
import { createUser, sessionCookieHeader } from "./helpers/auth.ts";
import { installNextMocks, setSessionCookie } from "./helpers/next-mocks.ts";

// PATCH /api/user/submissions/[id] — the business/submission edit flow.
//
// Unlike resources (community-editable), a CLAIMED business can only be edited
// by its verified owner: the route returns 403 when claim_status='claimed' and
// claimed_by != the caller. This test pins that ownership guard (which fires
// before any body parsing) so it can't regress into the resources-style
// open-editing. See resourceEdit.test.ts for the deliberate contrast.

installNextMocks();
let route: typeof import("@/app/api/user/submissions/[id]/route");

function patch(id: string, cookie: string) {
  setSessionCookie(cookie);
  const fd = new FormData();
  fd.set("data", JSON.stringify({ name: "Hijacked Name" }));
  const r = new NextRequest(`http://localhost/api/user/submissions/${id}`, {
    method: "PATCH",
    body: fd,
  });
  return route.PATCH(r, { params: Promise.resolve({ id }) });
}

async function insertClaimedBusiness(name: string, ownerId: string) {
  const [row] = await sql`
    INSERT INTO businesses (type, name, status, claim_status, claimed_by)
    VALUES ('permanent_location', ${name}, 'listed', 'claimed', ${ownerId})
    RETURNING id
  `;
  return row.id as string;
}

let owner: { id: string };
let intruderCookie: string;

before(async () => {
  route = await import("@/app/api/user/submissions/[id]/route");
  owner = await createUser({ name: "Verified Owner" });
  const intruder = await createUser({ name: "Intruder" });
  intruderCookie = await sessionCookieHeader(intruder.id);
});
beforeEach(resetDb);
after(closeDb);

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
