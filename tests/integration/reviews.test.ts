import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import sql, { resetDb, closeDb } from "./helpers/db.ts";
import { createUser, adminCookieHeader, sessionCookieHeader } from "./helpers/auth.ts";
import { installNextMocks, setSessionCookie, expectRedirect } from "./helpers/next-mocks.ts";

// Full review lifecycle across the REAL code:
//   1. POST /api/reviews/[slug]  — a signed-in user submits a review (+ guards)
//   2. admin approveReview / rejectReview server actions
//   3. the update_business_rating trigger: only APPROVED reviews move a
//      business's avg_rating / review_count.

installNextMocks();
let reviewRoute: typeof import("@/app/api/reviews/[slug]/route");
let reviewActions: typeof import("@/app/admin/reviews/actions");

function postReview(slug: string, body: unknown, cookie: string) {
  setSessionCookie(cookie);
  const r = new NextRequest(`http://localhost/api/reviews/${slug}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return reviewRoute.POST(r, { params: Promise.resolve({ slug }) });
}

async function insertListedBusiness(name: string, slug: string) {
  const [row] = await sql`
    INSERT INTO businesses (type, name, slug, status)
    VALUES ('permanent_location', ${name}, ${slug}, 'listed')
    RETURNING id
  `;
  return row.id as string;
}

async function ratingOf(bizId: string) {
  const [b] = await sql<{ avg_rating: string; review_count: number }[]>`
    SELECT avg_rating, review_count FROM businesses WHERE id = ${bizId}
  `;
  return { avg: Number(b.avg_rating), count: b.review_count };
}

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const TEXT = "This vendor was genuinely excellent, highly recommend."; // >=25 chars

// Identity fixtures (auth tables aren't truncated between tests).
let adminCookie: string;
let reviewer: { id: string; email: string };
let reviewerCookie: string;

before(async () => {
  reviewRoute = await import("@/app/api/reviews/[slug]/route");
  reviewActions = await import("@/app/admin/reviews/actions");
  adminCookie = await adminCookieHeader();
  reviewer = await createUser({ name: "Reviewer" });
  reviewerCookie = await sessionCookieHeader(reviewer.id);
});
beforeEach(resetDb);
after(closeDb);

test("signed-in user submits a review -> pending, and rating is untouched while pending", async () => {
  const bizId = await insertListedBusiness("Rated Ramen", "rated-ramen");

  const res = await postReview("rated-ramen", { stars: 5, reviewText: TEXT }, reviewerCookie);
  assert.equal(res.status, 200);

  const [rev] = await sql`SELECT status, stars FROM reviews WHERE business_id = ${bizId}`;
  assert.equal(rev.status, "pending");
  assert.equal(rev.stars, 5);

  // The rating trigger only counts approved reviews.
  const r = await ratingOf(bizId);
  assert.equal(r.count, 0, "pending review must not count toward review_count");
  assert.equal(r.avg, 0, "pending review must not move avg_rating");
});

test("review requires sign-in (401)", async () => {
  await insertListedBusiness("Anon Antipasto", "anon-antipasto");
  const res = await postReview("anon-antipasto", { stars: 4, reviewText: TEXT }, "");
  assert.equal(res.status, 401);
});

test("rejects invalid star ratings and too-short text (400)", async () => {
  await insertListedBusiness("Validated Vindaloo", "validated-vindaloo");

  const badStars = await postReview("validated-vindaloo", { stars: 9, reviewText: TEXT }, reviewerCookie);
  assert.equal(badStars.status, 400);

  const shortText = await postReview("validated-vindaloo", { stars: 4, reviewText: "too short" }, reviewerCookie);
  assert.equal(shortText.status, 400);
});

test("unknown / unlisted business returns 404", async () => {
  const res = await postReview("does-not-exist", { stars: 5, reviewText: TEXT }, reviewerCookie);
  assert.equal(res.status, 404);
});

test("a second review by the same user is rejected (409, one-per-user constraint)", async () => {
  await insertListedBusiness("Doubled Dumplings", "doubled-dumplings");

  const first = await postReview("doubled-dumplings", { stars: 5, reviewText: TEXT }, reviewerCookie);
  assert.equal(first.status, 200);

  const second = await postReview("doubled-dumplings", { stars: 1, reviewText: TEXT }, reviewerCookie);
  assert.equal(second.status, 409);
});

test("admin approveReview: status approved, rating trigger updates, author notified", async () => {
  const bizId = await insertListedBusiness("Approvable Aioli", "approvable-aioli");
  await postReview("approvable-aioli", { stars: 4, reviewText: TEXT }, reviewerCookie);
  const [rev] = await sql`SELECT id FROM reviews WHERE business_id = ${bizId}`;

  setSessionCookie(adminCookie);
  const dest = await expectRedirect(() =>
    reviewActions.approveReview(form({ reviewId: rev.id }))
  );
  assert.equal(dest, "/admin/reviews");

  const [r] = await sql`SELECT status FROM reviews WHERE id = ${rev.id}`;
  assert.equal(r.status, "approved");

  const rating = await ratingOf(bizId);
  assert.equal(rating.count, 1, "approved review should count");
  assert.equal(rating.avg, 4, "avg_rating should reflect the approved review");

  const [n] = await sql`SELECT type FROM notifications WHERE user_id = ${reviewer.id}`;
  assert.equal(n?.type, "review_approved");
});

test("admin rejectReview: status rejected, rating stays at zero", async () => {
  const bizId = await insertListedBusiness("Rejectable Risotto", "rejectable-risotto");
  await postReview("rejectable-risotto", { stars: 5, reviewText: TEXT }, reviewerCookie);
  const [rev] = await sql`SELECT id FROM reviews WHERE business_id = ${bizId}`;

  setSessionCookie(adminCookie);
  await expectRedirect(() => reviewActions.rejectReview(form({ reviewId: rev.id })));

  const [r] = await sql`SELECT status FROM reviews WHERE id = ${rev.id}`;
  assert.equal(r.status, "rejected");

  const rating = await ratingOf(bizId);
  assert.equal(rating.count, 0, "rejected review must not count");
  assert.equal(rating.avg, 0);
});

test("a NON-admin cannot approve a review (guard redirects, status unchanged)", async () => {
  const bizId = await insertListedBusiness("Fortified Falafel", "fortified-falafel");
  await postReview("fortified-falafel", { stars: 3, reviewText: TEXT }, reviewerCookie);
  const [rev] = await sql`SELECT id FROM reviews WHERE business_id = ${bizId}`;

  setSessionCookie(reviewerCookie); // real session, not admin
  const dest = await expectRedirect(() =>
    reviewActions.approveReview(form({ reviewId: rev.id }))
  );
  assert.equal(dest, "/");

  const [r] = await sql`SELECT status FROM reviews WHERE id = ${rev.id}`;
  assert.equal(r.status, "pending", "non-admin must not change review status");
});
