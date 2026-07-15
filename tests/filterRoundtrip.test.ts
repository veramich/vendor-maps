import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filtersToParams,
  type BusinessFilters,
} from "@/lib/businessFilters";
import { parseFilters } from "@/lib/businessFilterSql";

// The map/directory serialize filters to the URL (filtersToParams) and the API
// re-parses them (parseFilters). These must agree, or a filter the user set
// silently stops narrowing results. This pins the round-trip for the fields
// that survive serialization unchanged.

test("activeFilterCount counts each engaged facet once", () => {
  assert.equal(activeFilterCount(EMPTY_FILTERS), 0);

  const f: BusinessFilters = {
    ...EMPTY_FILTERS,
    openNow: true,
    days: ["monday"],
    priceTiers: [2, 3],
    categories: ["food"],
    eventDate: "weekend",
  };
  // openNow + days + priceTiers + categories + eventDate = 5
  assert.equal(activeFilterCount(f), 5);
});

test("radius facet counts only when center point is present", () => {
  assert.equal(
    activeFilterCount({ ...EMPTY_FILTERS, radiusMi: 5 }),
    0,
    "radius without lat/lng is not an active filter"
  );
  assert.equal(
    activeFilterCount({ ...EMPTY_FILTERS, radiusMi: 5, lat: 1, lng: 2 }),
    1
  );
});

test("filtersToParams -> parseFilters preserves stable facets", () => {
  const original: BusinessFilters = {
    ...EMPTY_FILTERS,
    radiusMi: 10,
    lat: 37.77,
    lng: -122.41,
    days: ["monday", "friday"],
    topRated: true,
    priceTiers: [1, 3],
    amenities: ["restrooms"],
    categories: ["food"],
    subTypes: ["food_truck"],
    vendorSpaces: true,
  };

  const round = parseFilters(filtersToParams(original));

  assert.equal(round.radiusMi, 10);
  assert.equal(round.lat, 37.77);
  assert.equal(round.lng, -122.41);
  assert.deepEqual(round.days, ["monday", "friday"]);
  assert.equal(round.topRated, true);
  assert.deepEqual(round.priceTiers, [1, 3]);
  assert.deepEqual(round.amenities, ["restrooms"]);
  assert.deepEqual(round.categories, ["food"]);
  assert.deepEqual(round.subTypes, ["food_truck"]);
  assert.equal(round.vendorSpaces, true);
});

test("openNow serializes the caller's local day/time and re-parses", () => {
  const round = parseFilters(filtersToParams({ ...EMPTY_FILTERS, openNow: true }));
  assert.equal(round.openNow, true);
  assert.ok(round.nowDay, "now_day should round-trip");
  assert.match(round.nowTime ?? "", /^\d{2}:\d{2}$/);
});
