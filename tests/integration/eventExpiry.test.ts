import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import sql, { resetDb, closeDb } from "./helpers/db.ts";

// Specific-date events (sub_type = 'pop_up') auto-expire once their last date
// ends: they drop out of the events list and the map, without any row being
// deleted. Recurring markets have no end date and must never expire.
//
// These drive the real route handlers, so they cover the shared
// `notExpiredEvent` fragment as actually composed into each query.

let eventsRoute: typeof import("@/app/api/businesses/events/route");
let locationsRoute: typeof import("@/app/api/businesses/locations/route");

before(async () => {
  eventsRoute = await import("@/app/api/businesses/events/route");
  locationsRoute = await import("@/app/api/businesses/locations/route");
});

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await closeDb();
});

// A listed event business. Coordinates are required to appear on the map.
async function createEvent(
  name: string,
  subType: "pop_up" | "market",
  opts: { onMap?: boolean } = {}
) {
  const [row] = await sql`
    INSERT INTO businesses (type, sub_type, name, status, slug)
    VALUES ('event', ${subType}, ${name}, 'listed', ${name.toLowerCase().replace(/\s+/g, "-")})
    RETURNING id
  `;
  const id = row.id as string;
  await sql`
    INSERT INTO locations (business_id, city, coordinates)
    VALUES (
      ${id}, 'Testville',
      ${opts.onMap === false ? null : sql`ST_SetSRID(ST_MakePoint(-118.2, 34.0), 4326)`}
    )
  `;
  return id;
}

// Insert one date. Offsets are in days relative to now; bounds are cast through
// ::text::timestamp because the driver would otherwise shift a naive timestamp
// string by the server's TZ offset (event_range must hold wall-clock times).
async function addDate(businessId: string, startDayOffset: number, hours = 4) {
  const start = new Date(Date.now() + startDayOffset * 86400_000);
  const end = new Date(start.getTime() + hours * 3600_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  await sql`
    INSERT INTO popup_events (business_id, event_range)
    VALUES (
      ${businessId},
      tsrange(${fmt(start)}::text::timestamp, ${fmt(end)}::text::timestamp)
    )
  `;
}

async function addSchedule(businessId: string) {
  // recurrence_type is NOT NULL (db/schema/006) — 'weekly' is the plain
  // every-Saturday case this test needs.
  await sql`
    INSERT INTO market_schedules (
      business_id, day_of_week, recurrence_type, start_time, end_time
    )
    VALUES (${businessId}, 'saturday', 'weekly', '09:00', '14:00')
  `;
}

async function listedEventNames() {
  const res = await eventsRoute.GET(
    new NextRequest("http://localhost/api/businesses/events")
  );
  const body = await res.json();
  return (body.events as { name: string }[]).map((e) => e.name);
}

async function mappedNames() {
  const res = await locationsRoute.GET(
    new NextRequest("http://localhost/api/businesses/locations?type=event")
  );
  const body = await res.json();
  return (body.locations as { name: string }[]).map((l) => l.name);
}

test("an event whose only date has passed drops off the list and the map", async () => {
  const id = await createEvent("Past Popup", "pop_up");
  await addDate(id, -3);

  assert.deepEqual(await listedEventNames(), []);
  assert.deepEqual(await mappedNames(), []);

  // Hidden, not deleted — the row survives so the owner can add new dates.
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM popup_events WHERE business_id = ${id}
  `;
  assert.equal(count, 1);
});

test("an event with an upcoming date stays listed and mapped", async () => {
  const id = await createEvent("Future Popup", "pop_up");
  await addDate(id, 5);

  assert.deepEqual(await listedEventNames(), ["Future Popup"]);
  assert.deepEqual(await mappedNames(), ["Future Popup"]);
});

test("an in-progress event has not expired yet", async () => {
  // Started 1h ago, runs 4h — still live, must remain visible.
  const id = await createEvent("Happening Now", "pop_up");
  await addDate(id, -1 / 24, 4);

  assert.deepEqual(await listedEventNames(), ["Happening Now"]);
});

test("mixed dates: expires only after the LAST date ends, and shows the next one", async () => {
  const id = await createEvent("Multi Date", "pop_up");
  await addDate(id, -10);
  await addDate(id, -2);
  await addDate(id, 7);

  const res = await eventsRoute.GET(
    new NextRequest("http://localhost/api/businesses/events")
  );
  const { events } = await res.json();
  assert.equal(events.length, 1);

  // The surfaced occurrence must be the upcoming date, not a past one.
  const start = new Date(events[0].event_start);
  assert.ok(
    start.getTime() > Date.now(),
    `expected an upcoming event_start, got ${events[0].event_start}`
  );
});

test("a recurring market never expires", async () => {
  const id = await createEvent("Weekly Market", "market");
  await addSchedule(id);

  assert.deepEqual(await listedEventNames(), ["Weekly Market"]);
  assert.deepEqual(await mappedNames(), ["Weekly Market"]);
});

test("expiry does not hide non-event businesses from the map", async () => {
  const [row] = await sql`
    INSERT INTO businesses (type, name, status, slug)
    VALUES ('permanent_location', 'Corner Shop', 'listed', 'corner-shop')
    RETURNING id
  `;
  await sql`
    INSERT INTO locations (business_id, city, coordinates)
    VALUES (${row.id}, 'Testville', ST_SetSRID(ST_MakePoint(-118.2, 34.0), 4326))
  `;

  const res = await locationsRoute.GET(
    new NextRequest("http://localhost/api/businesses/locations")
  );
  const { locations } = await res.json();
  assert.deepEqual(locations.map((l: { name: string }) => l.name), ["Corner Shop"]);
});
