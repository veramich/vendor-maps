import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import sql, { resetDb, closeDb } from "./helpers/db.ts";

// Exercises the moderation lifecycle against the real schema on a Neon test
// branch: a submission lands as `pending`, is invisible to the public
// directory, and only appears once an admin moves it to `listed`. This is the
// core pending→listed invariant the whole moderation flow depends on.

// Mirrors the public directory predicate (app/api/businesses/directory).
function listedCount(name: string) {
  return sql`
    SELECT count(*)::int AS n FROM businesses b
    WHERE b.status = 'listed'
      AND b.type IN ('permanent_location', 'no_location')
      AND b.name = ${name}
  `.then((r) => r[0].n as number);
}

async function insertBusiness(name: string) {
  const [row] = await sql`
    INSERT INTO businesses (type, name)
    VALUES ('permanent_location', ${name})
    RETURNING id, status
  `;
  return row as { id: string; status: string };
}

before(async () => {
  // Fail fast with a clear message if the branch/schema didn't load.
  const [{ exists }] = await sql`
    SELECT to_regclass('public.businesses') IS NOT NULL AS exists
  `;
  assert.equal(exists, true, "businesses table must exist — schema load failed?");
});

beforeEach(resetDb);
after(closeDb);

test("a new submission defaults to pending and is not listed", async () => {
  const biz = await insertBusiness("Pending Tacos");
  assert.equal(biz.status, "pending", "status column should default to 'pending'");
  assert.equal(await listedCount("Pending Tacos"), 0, "pending rows must not appear in the directory");
});

test("approving a submission (pending -> listed) makes it appear", async () => {
  const biz = await insertBusiness("Approvable Arepas");
  assert.equal(await listedCount("Approvable Arepas"), 0);

  await sql`UPDATE businesses SET status = 'listed' WHERE id = ${biz.id}`;

  assert.equal(await listedCount("Approvable Arepas"), 1, "listed rows must appear in the directory");
});

test("rejected and unlisted rows never surface", async () => {
  const a = await insertBusiness("Rejected Ramen");
  const b = await insertBusiness("Unlisted Udon");
  await sql`UPDATE businesses SET status = 'rejected' WHERE id = ${a.id}`;
  await sql`UPDATE businesses SET status = 'unlisted' WHERE id = ${b.id}`;

  assert.equal(await listedCount("Rejected Ramen"), 0);
  assert.equal(await listedCount("Unlisted Udon"), 0);
});

test("status CHECK constraint rejects unknown values", async () => {
  const biz = await insertBusiness("Constraint Curry");
  await assert.rejects(
    () => sql`UPDATE businesses SET status = 'approved' WHERE id = ${biz.id}`,
    /violates check constraint/,
    "'approved' is not a valid status — the CHECK constraint should reject it"
  );
});
