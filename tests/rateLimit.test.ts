import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// The rate limiter guards the paid HERE proxy from being hammered to run up the
// API bill, so its allow/block boundary is worth protecting from regression.

test("rateLimit allows requests up to the limit, then blocks", () => {
  const key = `test:allow:${Math.random()}`;
  const limit = 3;
  const windowMs = 60_000;

  // First `limit` calls are allowed.
  for (let i = 0; i < limit; i++) {
    const r = rateLimit(key, limit, windowMs);
    assert.equal(r.ok, true, `call ${i + 1} should be allowed`);
    assert.equal(r.remaining, limit - (i + 1));
  }

  // The next call is blocked with a retry hint.
  const blocked = rateLimit(key, limit, windowMs);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfter >= 1, "blocked result must include a retryAfter");
});

test("rateLimit buckets keys independently", () => {
  const a = `test:bucket-a:${Math.random()}`;
  const b = `test:bucket-b:${Math.random()}`;

  // Exhaust bucket A.
  rateLimit(a, 1, 60_000);
  assert.equal(rateLimit(a, 1, 60_000).ok, false, "A is exhausted");

  // B is untouched.
  assert.equal(rateLimit(b, 1, 60_000).ok, true, "B has its own budget");
});

test("clientIp reads the first x-forwarded-for entry", () => {
  const req = new Request("https://example.com", {
    headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" },
  });
  assert.equal(clientIp(req), "203.0.113.7");
});

test("clientIp falls back to x-real-ip, then 'unknown'", () => {
  const withReal = new Request("https://example.com", {
    headers: { "x-real-ip": "198.51.100.5" },
  });
  assert.equal(clientIp(withReal), "198.51.100.5");

  const bare = new Request("https://example.com");
  assert.equal(clientIp(bare), "unknown");
});
