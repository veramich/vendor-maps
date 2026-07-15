import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFilters } from "@/lib/businessFilterSql";

// parseFilters is the untrusted-input boundary for the map/directory: it turns
// caller-supplied query params into the filter model the SQL builder consumes.
// These tests pin the validation/sanitization so bad input can't slip through.

const parse = (qs: string) => parseFilters(new URLSearchParams(qs));

test("drops invalid day names, keeps valid ones", () => {
  const f = parse("days=monday,funday,friday,MONDAY");
  assert.deepEqual(f.days, ["monday", "friday"]);
});

test("keeps only integer price tiers in 1..4", () => {
  const f = parse("price=0,1,2,4,5,3.5,abc");
  assert.deepEqual(f.priceTiers, [1, 2, 4]);
});

test("filters sub_types to the known allowlist", () => {
  const f = parse("sub_types=food_truck,dragon,market,pop_up,__proto__");
  assert.deepEqual(f.subTypes, ["food_truck", "market", "pop_up"]);
});

test("rejects out-of-set now_day / event_time", () => {
  const f = parse("now_day=someday&event_time=midnight");
  assert.equal(f.nowDay, null);
  assert.equal(f.eventTime, null);

  const ok = parse("now_day=tuesday&event_time=morning");
  assert.equal(ok.nowDay, "tuesday");
  assert.equal(ok.eventTime, "morning");
});

test("boolean flags require exactly '1'", () => {
  assert.equal(parse("open_now=1").openNow, true);
  assert.equal(parse("open_now=true").openNow, false);
  assert.equal(parse("open_now=0").openNow, false);
  assert.equal(parse("top_rated=1").topRated, true);
  assert.equal(parse("vendor_spaces=1").vendorSpaces, true);
});

test("numeric fields reject non-finite input", () => {
  const bad = parse("radius=abc&lat=&lng=NaN");
  assert.equal(bad.radiusMi, null);
  assert.equal(bad.lat, null);
  assert.equal(bad.lng, null);

  const good = parse("radius=5&lat=37.77&lng=-122.41");
  assert.equal(good.radiusMi, 5);
  assert.equal(good.lat, 37.77);
  assert.equal(good.lng, -122.41);
});

test("empty params yield an inert filter set", () => {
  const f = parse("");
  assert.deepEqual(f.days, []);
  assert.deepEqual(f.priceTiers, []);
  assert.deepEqual(f.subTypes, []);
  assert.equal(f.openNow, false);
  assert.equal(f.radiusMi, null);
});
