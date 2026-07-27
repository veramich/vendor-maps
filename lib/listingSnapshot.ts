import sql from "@/lib/db";
import cloudinary from "@/lib/cloudinary";

/** Best-effort Cloudinary asset deletion — never throws (cleanup must not
 * block a resolve). Silently skips blank ids. */
async function destroyAssets(publicIds: string[]): Promise<void> {
  for (const publicId of publicIds) {
    if (!publicId) continue;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error("Cloudinary destroy failed:", publicId, err);
    }
  }
}

/**
 * Purge the Cloudinary assets that an approved edit removed. Called on approve:
 * the edit already dropped the image rows, so any asset in the pre-edit
 * snapshot whose public id is no longer referenced by a live row is orphaned
 * and safe to delete.
 */
export async function purgeRemovedSnapshotImages(
  businessId: string,
  snap: ListingSnapshot
): Promise<void> {
  const live = await sql`
    SELECT cloudinary_public_id FROM business_images WHERE business_id = ${businessId}
  `;
  const livePublicIds = new Set(live.map((r) => r.cloudinary_public_id));
  const orphaned = snap.images
    .map((i) => i.publicId)
    .filter((pid) => !livePublicIds.has(pid));
  await destroyAssets(orphaned);
}

/**
 * A flat, presentation-friendly snapshot of a listing's full state, used to
 * compare a pending EDIT against the values that were live before it. The shape
 * is intentionally denormalized (location, hours, images, vendor spaces/fees
 * and event dates are folded in) so the admin queue can render an old→new diff
 * without re-querying every related table.
 *
 * Stored as JSON in businesses.edit_snapshot at edit time (see the PATCH route
 * in app/api/user/submissions/[id]/route.ts) and rebuilt fresh for the current
 * row when the admin page needs the "new" side of the comparison.
 */
export interface ListingSnapshot {
  name: string | null;
  description: string | null;
  category: string | null;
  type: string | null;
  subType: string | null;
  priceTier: number | null;
  priceContext: string | null;

  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  twitter: string | null;
  youtube: string | null;
  phone: string | null;
  email: string | null;

  paymentOptions: string[];
  orderingMethods: string[];
  dietaryOptions: string[];
  businessAmenities: string[];
  servedZips: string[];

  location: {
    street1: string | null;
    street2: string | null;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    stateCode: string | null;
    zip: string | null;
    neighborhood: string | null;
    locationAmenities: string[];
    showExactAddress: boolean;
    exactAddress: string | null;
    lat: number | null;
    lng: number | null;
  } | null;

  hours: Array<{
    dayOfWeek: string;
    openTime: string;
    closeTime: string;
    closesNextDay: boolean;
    isClosed: boolean;
    hoursVary: boolean;
  }>;

  // Full image records in display order, so a rejected edit can rebuild the
  // exact rows (and identify which Cloudinary assets to keep vs. purge).
  images: Array<{
    id: string;
    publicId: string;
    url: string;
    displayOrder: number;
    isPrimary: boolean;
  }>;

  vendorSpace: {
    spaceSizes: string[];
    vendorTypes: string[];
    hasWaitlist: boolean;
    hasHolds: boolean;
    signupLink: string | null;
    note: string | null;
  } | null;

  vendorFees: Array<{
    feeType: string;
    amount: number | null;
    isFree: boolean;
    description: string | null;
  }>;

  marketSchedules: Array<{
    dayOfWeek: string;
    recurrenceType: string;
    anchorDate: string;
    startTime: string;
    endTime: string;
  }>;

  eventName: string | null;
  eventDates: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
}

/**
 * Build a full ListingSnapshot from the current database state for one
 * business. Reads the same related tables the edit form hydrates from, so the
 * captured "before" and the freshly-built "after" line up field for field.
 */
export async function buildListingSnapshot(
  businessId: string
): Promise<ListingSnapshot | null> {
  const rows = await sql`
    SELECT * FROM businesses WHERE id = ${businessId} LIMIT 1
  `;
  const b = rows[0];
  if (!b) return null;

  const locRows = await sql`
    SELECT
      street_1, street_2, street_address,
      city, state, state_code, zip, neighborhood,
      location_amenities, show_exact_address, exact_address,
      ST_X(coordinates) AS lng,
      ST_Y(coordinates) AS lat
    FROM locations
    WHERE business_id = ${businessId}
    LIMIT 1
  `;
  const loc = locRows[0] || null;

  const hourRows = await sql`
    SELECT day_of_week, open_time, close_time,
           closes_next_day, is_closed, hours_vary
    FROM business_hours
    WHERE business_id = ${businessId}
    ORDER BY day_of_week
  `;

  const imgRows = await sql`
    SELECT id, cloudinary_public_id, cloudinary_url, display_order, is_primary
    FROM business_images
    WHERE business_id = ${businessId}
    ORDER BY is_primary DESC, display_order ASC
  `;

  const vsRows = await sql`
    SELECT * FROM vendor_spaces WHERE business_id = ${businessId} LIMIT 1
  `;
  const vs = vsRows[0] || null;

  const feeRows = await sql`
    SELECT fee_type, amount, is_free, description
    FROM vendor_fees
    WHERE business_id = ${businessId}
  `;

  const schedRows = await sql`
    SELECT day_of_week, recurrence_type, anchor_date, start_time, end_time
    FROM market_schedules
    WHERE business_id = ${businessId}
  `;

  const dateRows = await sql`
    SELECT event_name,
           lower(event_range) AS start_ts,
           upper(event_range) AS end_ts
    FROM popup_events
    WHERE business_id = ${businessId}
    ORDER BY lower(event_range) ASC
  `;

  const hhmm = (t: unknown) => (t ? String(t).slice(0, 5) : "");
  const dateOnly = (d: unknown) =>
    d ? new Date(d as string).toISOString().split("T")[0] : "";
  const splitTs = (ts: unknown) => {
    const [datePart, timePart] = String(ts).split(/[ T]/);
    return { date: datePart, time: (timePart || "").slice(0, 5) };
  };

  return {
    name: b.name ?? null,
    description: b.description ?? null,
    category: b.category ?? null,
    type: b.type ?? null,
    subType: b.sub_type ?? null,
    priceTier: b.price_tier ?? null,
    priceContext: b.price_context ?? null,
    website: b.website ?? null,
    instagram: b.instagram ?? null,
    facebook: b.facebook ?? null,
    tiktok: b.tiktok ?? null,
    twitter: b.twitter ?? null,
    youtube: b.youtube ?? null,
    phone: b.phone ?? null,
    email: b.email ?? null,
    paymentOptions: b.payment_options || [],
    orderingMethods: b.ordering_methods || [],
    dietaryOptions: b.dietary_options || [],
    businessAmenities: b.business_amenities || [],
    servedZips: b.served_zips || [],
    location: loc
      ? {
          street1: loc.street_1 ?? null,
          street2: loc.street_2 ?? null,
          streetAddress: loc.street_address ?? null,
          city: loc.city ?? null,
          state: loc.state ?? null,
          stateCode: loc.state_code ?? null,
          zip: loc.zip ?? null,
          neighborhood: loc.neighborhood ?? null,
          locationAmenities: loc.location_amenities || [],
          showExactAddress: loc.show_exact_address || false,
          exactAddress: loc.exact_address ?? null,
          lat: loc.lat ?? null,
          lng: loc.lng ?? null,
        }
      : null,
    hours: hourRows.map((h) => ({
      dayOfWeek: h.day_of_week,
      openTime: hhmm(h.open_time),
      closeTime: hhmm(h.close_time),
      closesNextDay: h.closes_next_day || false,
      isClosed: h.is_closed || false,
      hoursVary: h.hours_vary || false,
    })),
    images: imgRows.map((i) => ({
      id: i.id,
      publicId: i.cloudinary_public_id,
      url: i.cloudinary_url,
      displayOrder: i.display_order ?? 0,
      isPrimary: i.is_primary ?? false,
    })),
    vendorSpace:
      vs && vs.vendor_space_available
        ? {
            spaceSizes: vs.space_sizes || [],
            vendorTypes: vs.vendor_types || [],
            hasWaitlist: vs.has_waitlist || false,
            hasHolds: vs.has_holds || false,
            signupLink: vs.signup_link ?? null,
            note: vs.note ?? null,
          }
        : null,
    vendorFees: feeRows.map((f) => ({
      feeType: f.fee_type,
      amount: f.amount != null ? Number(f.amount) : null,
      isFree: f.is_free || false,
      description: f.description ?? null,
    })),
    marketSchedules: schedRows.map((s) => ({
      dayOfWeek: s.day_of_week,
      recurrenceType: s.recurrence_type,
      anchorDate: dateOnly(s.anchor_date),
      startTime: hhmm(s.start_time),
      endTime: hhmm(s.end_time),
    })),
    eventName: dateRows[0]?.event_name ?? null,
    eventDates: dateRows.map((r) => {
      const start = splitTs(r.start_ts);
      const end = splitTs(r.end_ts);
      return { date: start.date, startTime: start.time, endTime: end.time };
    }),
  };
}

/**
 * Reapply a previously-captured ListingSnapshot onto a business, reverting the
 * scalar fields plus the location, hours, vendor spaces/fees and event-date
 * tables to their snapshotted state. Used when an admin rejects an EDIT of a
 * live listing: rather than taking the listing offline, we roll it back to the
 * values that were live before the edit and keep it listed.
 *
 * Not reverted: the business_images table. The snapshot stores Cloudinary URLs
 * only (not the public ids / row ids needed to reconstruct rows or clean up
 * Cloudinary), so photo changes made in a rejected edit are left in place. This
 * is a deliberate limitation — text, location, hours and event changes are the
 * high-value fields to roll back.
 */
export async function restoreListingSnapshot(
  businessId: string,
  snap: ListingSnapshot
): Promise<void> {
  await sql`
    UPDATE businesses SET
      name               = ${snap.name},
      description        = ${snap.description},
      category           = ${snap.category},
      type               = ${snap.type},
      sub_type           = ${snap.subType},
      price_tier         = ${snap.priceTier},
      price_context      = ${snap.priceContext},
      website            = ${snap.website},
      instagram          = ${snap.instagram},
      facebook           = ${snap.facebook},
      tiktok             = ${snap.tiktok},
      twitter            = ${snap.twitter},
      youtube            = ${snap.youtube},
      phone              = ${snap.phone},
      email              = ${snap.email},
      payment_options    = ${snap.paymentOptions},
      ordering_methods   = ${snap.orderingMethods},
      dietary_options    = ${snap.dietaryOptions},
      business_amenities = ${snap.businessAmenities},
      served_zips        = ${snap.servedZips.length ? snap.servedZips : null},
      updated_at         = NOW()
    WHERE id = ${businessId}
  `;

  // Location — replace-all: delete then reinsert if the snapshot had one.
  await sql`DELETE FROM locations WHERE business_id = ${businessId}`;
  if (snap.location) {
    const loc = snap.location;
    const hasCoords = loc.lat != null && loc.lng != null;
    await sql`
      INSERT INTO locations (
        business_id, street_1, street_2, street_address,
        city, state, state_code, zip, country, neighborhood,
        location_amenities, show_exact_address, exact_address,
        coordinates, is_active_area
      ) VALUES (
        ${businessId},
        ${loc.street1}, ${loc.street2}, ${loc.streetAddress},
        ${loc.city}, ${loc.state}, ${loc.stateCode}, ${loc.zip}, 'USA',
        ${loc.neighborhood},
        ${loc.locationAmenities}, ${loc.showExactAddress}, ${loc.exactAddress},
        ${hasCoords ? sql`ST_MakePoint(${loc.lng}, ${loc.lat})` : sql`NULL`},
        true
      )
    `;
  }

  // Business hours — replace-all.
  await sql`DELETE FROM business_hours WHERE business_id = ${businessId}`;
  for (const h of snap.hours) {
    if (!h.dayOfWeek) continue;
    await sql`
      INSERT INTO business_hours (
        business_id, day_of_week, open_time, close_time,
        closes_next_day, is_closed, hours_vary
      ) VALUES (
        ${businessId}, ${h.dayOfWeek},
        ${h.openTime || null}, ${h.closeTime || null},
        ${h.closesNextDay}, ${h.isClosed}, ${h.hoursVary}
      )
      ON CONFLICT (business_id, day_of_week) DO NOTHING
    `;
  }

  // Vendor spaces + fees — replace-all.
  await sql`DELETE FROM vendor_fees WHERE business_id = ${businessId}`;
  await sql`DELETE FROM vendor_spaces WHERE business_id = ${businessId}`;
  if (snap.vendorSpace) {
    const vs = snap.vendorSpace;
    await sql`
      INSERT INTO vendor_spaces (
        business_id, vendor_space_available, space_sizes, vendor_types,
        has_waitlist, has_holds, signup_link, note
      ) VALUES (
        ${businessId}, true, ${vs.spaceSizes}, ${vs.vendorTypes},
        ${vs.hasWaitlist}, ${vs.hasHolds}, ${vs.signupLink}, ${vs.note}
      )
    `;
    for (const f of snap.vendorFees) {
      await sql`
        INSERT INTO vendor_fees (business_id, fee_type, amount, is_free, description)
        VALUES (${businessId}, ${f.feeType}, ${f.amount}, ${f.isFree}, ${f.description})
      `;
    }
  }

  // Event dates — replace-all across both tables (mode derives from which the
  // snapshot populated).
  await sql`DELETE FROM market_schedules WHERE business_id = ${businessId}`;
  await sql`DELETE FROM popup_events WHERE business_id = ${businessId}`;
  for (const m of snap.marketSchedules) {
    if (!m.dayOfWeek || !m.recurrenceType) continue;
    await sql`
      INSERT INTO market_schedules (
        business_id, day_of_week, recurrence_type, anchor_date, start_time, end_time
      ) VALUES (
        ${businessId}, ${m.dayOfWeek}, ${m.recurrenceType},
        ${m.anchorDate || null}, ${m.startTime || null}, ${m.endTime || null}
      )
    `;
  }
  for (const d of snap.eventDates) {
    if (!d.date || !d.startTime || !d.endTime) continue;
    const startDateTime = `${d.date} ${d.startTime}`;
    // The snapshot flattened end to the start date, losing closesNextDay. If
    // that makes end <= start (an event that ran past midnight), roll the end
    // to the next day so the tsrange stays valid.
    let endDate = d.date;
    if (new Date(`${d.date} ${d.endTime}`) <= new Date(startDateTime)) {
      const [y, m, dd] = d.date.split("-").map(Number);
      const nd = new Date(Date.UTC(y, m - 1, dd, 12, 0, 0));
      nd.setUTCDate(nd.getUTCDate() + 1);
      endDate = nd.toISOString().split("T")[0];
    }
    const endDateTime = `${endDate} ${d.endTime}`;
    await sql`
      INSERT INTO popup_events (business_id, event_name, event_range, notes)
      VALUES (
        ${businessId}, ${snap.eventName},
        tsrange(${startDateTime}::text::timestamp, ${endDateTime}::text::timestamp),
        null
      )
    `;
  }

  // Photos. The edit route left the pre-edit assets on Cloudinary (it defers
  // destroy while a listed business is under review), so we can rebuild the
  // exact original rows. Any asset the edit ADDED that isn't in the snapshot is
  // now orphaned by the revert and gets purged.
  const liveRows = await sql`
    SELECT id, cloudinary_public_id
    FROM business_images
    WHERE business_id = ${businessId}
  `;
  const snapshotPublicIds = new Set(snap.images.map((i) => i.publicId));
  const addedByEdit = liveRows.filter(
    (r) => !snapshotPublicIds.has(r.cloudinary_public_id)
  );

  // Replace the current image rows with the snapshotted set (preserving ids so
  // display order / primary are exactly as they were before the edit).
  await sql`DELETE FROM business_images WHERE business_id = ${businessId}`;
  for (const img of snap.images) {
    await sql`
      INSERT INTO business_images (
        id, business_id, cloudinary_public_id, cloudinary_url,
        image_type, display_order, is_primary
      ) VALUES (
        ${img.id}, ${businessId}, ${img.publicId}, ${img.url},
        'gallery', ${img.displayOrder}, ${img.isPrimary}
      )
    `;
  }

  // Purge the now-orphaned assets the rejected edit had uploaded.
  await destroyAssets(addedByEdit.map((r) => r.cloudinary_public_id));
}
