import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import sql, { resetDb, closeDb } from "./helpers/db.ts";
import { createUser, sessionCookieHeader } from "./helpers/auth.ts";
import { installNextMocks, setSessionCookie } from "./helpers/next-mocks.ts";

// PATCH /api/user/resources/[id] — the resource edit flow.
//
// DESIGN NOTE (confirmed intentional, not a bug): resources are
// community-editable. The endpoint checks sign-in but NOT ownership, so any
// signed-in user may edit any resource. The safety net is that every edit
// resets status -> 'pending' for admin re-approval. These tests PIN that
// intended behavior so it can't change silently. (Contrast: the submissions
// edit route IS ownership-scoped — see resourceEdit's sibling tests.)

installNextMocks();
let route: typeof import("@/app/api/user/resources/[id]/route");

function patch(id: string, data: Record<string, unknown>, cookie: string) {
  setSessionCookie(cookie);
  const fd = new FormData();
  fd.set("data", JSON.stringify({ timingType: "always", ...data }));
  const r = new NextRequest(`http://localhost/api/user/resources/${id}`, {
    method: "PATCH",
    body: fd,
  });
  return route.PATCH(r, { params: Promise.resolve({ id }) });
}

const VALID = {
  resourceType: "Grant",
  title: "Edited Title",
  availability: "Rolling",
};

async function insertResource(opts: {
  title: string;
  status: "pending" | "listed" | "rejected";
  submittedBy: string | null;
}) {
  const [row] = await sql`
    INSERT INTO resources (
      resource_type, title, availability, timing_type, always_available, status, submitted_by
    ) VALUES (
      'Grant', ${opts.title}, 'Rolling', 'always', true, ${opts.status}, ${opts.submittedBy}
    )
    RETURNING id
  `;
  return row.id as string;
}

async function row(id: string) {
  const [r] = await sql`SELECT title, status FROM resources WHERE id = ${id}`;
  return r as { title: string; status: string } | undefined;
}

let owner: { id: string; email: string };
let ownerCookie: string;
let otherCookie: string;

before(async () => {
  route = await import("@/app/api/user/resources/[id]/route");
  owner = await createUser({ name: "Owner" });
  ownerCookie = await sessionCookieHeader(owner.id);
  const other = await createUser({ name: "Other User" });
  otherCookie = await sessionCookieHeader(other.id);
});
beforeEach(resetDb);
after(closeDb);

test("editing requires sign-in (401)", async () => {
  const id = await insertResource({ title: "Orig", status: "pending", submittedBy: owner.id });
  const res = await patch(id, VALID, "");
  assert.equal(res.status, 401);
});

test("owner can edit their pending resource; fields update", async () => {
  const id = await insertResource({ title: "Orig", status: "pending", submittedBy: owner.id });

  const res = await patch(id, VALID, ownerCookie);
  assert.equal(res.status, 200);

  const after = await row(id);
  assert.equal(after?.title, "Edited Title");
  assert.equal(after?.status, "pending");
});

test("INTENTIONAL: a non-owner can also edit (community-editable resources)", async () => {
  const id = await insertResource({ title: "Orig", status: "pending", submittedBy: owner.id });

  const res = await patch(id, { ...VALID, title: "Edited By Stranger" }, otherCookie);
  assert.equal(res.status, 200, "resources are community-editable by design");
  assert.equal((await row(id))?.title, "Edited By Stranger");
});

test("re-moderation net: editing a LISTED resource resets it to pending (wasListed:true)", async () => {
  const id = await insertResource({ title: "Live One", status: "listed", submittedBy: owner.id });

  const res = await patch(id, VALID, ownerCookie);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true, wasListed: true });

  assert.equal((await row(id))?.status, "pending", "an edited listing must go back for re-approval");
});

test("a rejected resource is not editable (404 — loadEditable only allows pending/listed)", async () => {
  const id = await insertResource({ title: "Nope", status: "rejected", submittedBy: owner.id });
  const res = await patch(id, VALID, ownerCookie);
  assert.equal(res.status, 404);
});

test("required fields are still validated on edit (400)", async () => {
  const id = await insertResource({ title: "Orig", status: "pending", submittedBy: owner.id });
  const res = await patch(id, { resourceType: "Grant", availability: "x" }, ownerCookie); // no title
  assert.equal(res.status, 400);
  assert.equal((await row(id))?.title, "Orig", "a rejected edit must not change the row");
});
