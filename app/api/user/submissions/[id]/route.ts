import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { buildSocialUrls } from
  "@/lib/utils/buildSocialUrls";
import { uploadImage } from "@/lib/utils/uploadImage";
import { validateScheduleAnchor } from "@/lib/utils/validateSchedule";
import cloudinary from "@/lib/cloudinary";
import { BusinessFormData } from "@/lib/types/business";
import { buildListingSnapshot } from "@/lib/listingSnapshot";

// A listing can only be edited while it is live or awaiting review. Anything
// else is a terminal/administrative state whose edit form would have nothing
// meaningful to save back.
const EDITABLE_STATUSES = ["pending", "listed"];

// Why an edit was refused, in the owner's terms. The status alone ("rejected")
// is not actionable, and a bare "not found" actively misleads — it reads as a
// broken link when the listing exists and the user really does own it.
function notEditableMessage(status: string): string {
  switch (status) {
    case "rejected":
      return "This listing was rejected, so it can't be edited. " +
        "Contact us if you think that was a mistake.";
    case "duplicate":
      return "This listing was marked as a duplicate of an existing " +
        "business, so it can't be edited.";
    case "unlisted":
      return "This listing has been unlisted and can't be edited. " +
        "Contact us to put it back online.";
    case "expired":
      return "This listing has expired, so it can't be edited.";
    default:
      return "This listing isn't in an editable state right now.";
  }
}

// Add one day to a YYYY-MM-DD string (UTC noon, so it never drifts across a
// timezone boundary). Mirrors the helper in the submit route.
function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().split("T")[0];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch by id alone, then check the status separately. Filtering on status
    // in the WHERE clause collapses "no such listing" and "listing isn't in an
    // editable state" into one indistinguishable 404, which hides the real
    // reason (e.g. a rejected listing that still looks claimed to its owner).
    const result = await sql`
      SELECT b.*
      FROM businesses b
      WHERE b.id = ${id}
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (!EDITABLE_STATUSES.includes(result[0].status)) {
      return NextResponse.json(
        { error: notEditableMessage(result[0].status) },
        { status: 409 }
      );
    }

    const business = result[0];

    // The businesses row comes back snake_case, but the edit form
    // (BusinessFormData) reads camelCase keys. Without this mapping the
    // amenity/pricing selections silently fail to pre-fill. Spreading
    // `...business` afterwards keeps the raw columns too (status, sub_type,
    // etc. that the page reads directly).
    const businessFields = {
      priceTier:         business.price_tier ?? null,
      priceContext:      business.price_context || "",
      paymentOptions:    business.payment_options || [],
      orderingMethods:   business.ordering_methods || [],
      dietaryOptions:    business.dietary_options || [],
      businessAmenities: business.business_amenities || [],
      hoursSubjectToChange: business.hours_subject_to_change || false,
      servedZips:        business.served_zips || [],
    };

    // Claimed listings can only be edited by their verified owner.
    if (
      business.claim_status === "claimed" &&
      business.claimed_by !== session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "This listing is managed by its verified owner and can't be edited.",
        },
        { status: 403 }
      );
    }

    // Return already-uploaded photos so the edit form can show and manage
    // them (kept/removed), ordered the same way as the public listing.
    const images = await sql`
      SELECT id, cloudinary_url
      FROM business_images
      WHERE business_id = ${business.id}
      ORDER BY is_primary DESC, display_order ASC
    `;

    // Location, mapped to the camelCase keys the form (Step3Location) expects
    // so the address pre-fills and can be edited. no_location businesses have
    // no row / no coords → directory-only.
    const locRows = await sql`
      SELECT
        street_1, street_2, street_address,
        city, state, state_code, zip, neighborhood,
        location_amenities,
        show_exact_address, exact_address,
        ST_X(coordinates) AS lng,
        ST_Y(coordinates) AS lat
      FROM locations
      WHERE business_id = ${business.id}
      LIMIT 1
    `;
    const locRow = locRows[0] || null;

    const location = {
      street1:       locRow?.street_1 || "",
      street2:       locRow?.street_2 || "",
      streetAddress: locRow?.street_address || "",
      city:          locRow?.city || "",
      state:         locRow?.state || "",
      stateCode:     locRow?.state_code || "",
      zip:           locRow?.zip || "",
      neighborhood:  locRow?.neighborhood || "",
      locationAmenities: locRow?.location_amenities || [],
      showExactAddress: locRow?.show_exact_address || false,
      // exact_address is the joined "street, city, state, zip" display
      // string; the form edits the street portion only, so send that back.
      exactAddress:  locRow?.exact_address
        ? String(locRow.exact_address).split(",")[0].trim()
        : "",
      lat:           locRow?.lat ?? null,
      lng:           locRow?.lng ?? null,
      // Directory-only when the business has no map coordinates.
      noFixedLocation:
        business.type === "no_location" ||
        locRow?.lat == null ||
        locRow?.lng == null,
    };

    // Business hours (small business). Mapped to the camelCase shape
    // Step5Details expects so existing hours pre-fill and can be edited.
    const hourRows = await sql`
      SELECT
        day_of_week, open_time, close_time, closes_next_day,
        is_closed, hours_vary, season_start, season_end
      FROM business_hours
      WHERE business_id = ${business.id}
    `;
    const hours = hourRows.map(h => ({
      dayOfWeek:     h.day_of_week,
      openTime:      h.open_time ? String(h.open_time).slice(0, 5) : "",
      closeTime:     h.close_time ? String(h.close_time).slice(0, 5) : "",
      closesNextDay: h.closes_next_day || false,
      isClosed:      h.is_closed || false,
      hoursVary:     h.hours_vary || false,
      seasonStart:   h.season_start
        ? new Date(h.season_start).toISOString().split("T")[0]
        : "",
      seasonEnd:     h.season_end
        ? new Date(h.season_end).toISOString().split("T")[0]
        : "",
    }));

    // Vendor spaces + fees (events). Shape into the camelCase form the
    // edit form / BusinessFormData expects so it pre-fills directly.
    const vsRows = await sql`
      SELECT *
      FROM vendor_spaces
      WHERE business_id = ${business.id}
      LIMIT 1
    `;
    const vsRow = vsRows[0] || null;

    const feeRows = vsRow
      ? await sql`
          SELECT fee_type, amount, is_free, description
          FROM vendor_fees
          WHERE business_id = ${business.id}
        `
      : [];

    const vendorSpace =
      vsRow && vsRow.vendor_space_available
        ? {
            vendorSpaceAvailable: true,
            spaceSizes:  vsRow.space_sizes || [],
            vendorTypes: vsRow.vendor_types || [],
            hasWaitlist: vsRow.has_waitlist || false,
            hasHolds:    vsRow.has_holds || false,
            signupLink:  vsRow.signup_link || "",
            note:        vsRow.note || "",
          }
        : null;

    const vendorFees = feeRows.map(f => ({
      feeType:     f.fee_type,
      amount:      f.amount != null ? Number(f.amount) : null,
      isFree:      f.is_free || false,
      description: f.description || "",
    }));

    // Event dates. The kind is derived from sub_type: market → recurring
    // (market_schedules); pop_up → specific dates (popup_events). Both are
    // hydrated into the camelCase shape the form expects.
    const isEvent =
      business.sub_type === "market" || business.sub_type === "pop_up";
    const eventDateMode = isEvent
      ? business.sub_type === "market"
        ? "recurring"
        : "specific"
      : null;

    const scheduleRows =
      business.sub_type === "market"
        ? await sql`
            SELECT * FROM market_schedules
            WHERE business_id = ${business.id}
          `
        : [];

    const marketSchedules = scheduleRows.map(s => ({
      dayOfWeek:      s.day_of_week,
      recurrenceType: s.recurrence_type,
      anchorDate:     s.anchor_date
        ? new Date(s.anchor_date).toISOString().split("T")[0]
        : "",
      startTime:      s.start_time ? String(s.start_time).slice(0, 5) : "",
      endTime:        s.end_time ? String(s.end_time).slice(0, 5) : "",
      closesNextDay:  s.closes_next_day || false,
      seasonStart:    s.season_start
        ? new Date(s.season_start).toISOString().split("T")[0]
        : "",
      seasonEnd:      s.season_end
        ? new Date(s.season_end).toISOString().split("T")[0]
        : "",
    }));

    const dateRows =
      business.sub_type === "pop_up"
        ? await sql`
            SELECT
              id,
              event_name,
              lower(event_range) AS start_ts,
              upper(event_range) AS end_ts
            FROM popup_events
            WHERE business_id = ${business.id}
            ORDER BY lower(event_range) ASC
          `
        : [];

    // A timestamp string "YYYY-MM-DD HH:MM:SS" → date / HH:MM parts.
    const splitTs = (ts: string | Date) => {
      const [datePart, timePart] = String(ts).split(/[ T]/);
      return { date: datePart, time: (timePart || "").slice(0, 5) };
    };

    const eventDates = dateRows.map(r => {
      const start = splitTs(r.start_ts);
      const end = splitTs(r.end_ts);
      return {
        date:          start.date,
        startTime:     start.time,
        endTime:       end.time,
        // The event runs past midnight when the end date is after the start.
        closesNextDay: end.date !== start.date,
      };
    });

    const eventName = dateRows[0]?.event_name || "";

    return NextResponse.json({
      business: {
        ...business,
        ...businessFields,
        ...location,
        hours,
        existingImages: images.map(img => ({
          id:  img.id,
          url: img.cloudinary_url,
        })),
        vendorSpace,
        vendorFees,
        eventDateMode,
        marketSchedules,
        eventDates,
        eventName,
      },
    });

  } catch (error) {
    console.error("Submission GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch by id, then gate on status separately — same reasoning as GET, so a
    // save that lands on a no-longer-editable listing says why.
    const existing = await sql`
      SELECT id, type, status, claim_status, claimed_by
      FROM businesses
      WHERE id = ${id}
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (!EDITABLE_STATUSES.includes(existing[0].status)) {
      return NextResponse.json(
        { error: notEditableMessage(existing[0].status) },
        { status: 409 }
      );
    }

    // Claimed listings can only be edited by their verified owner.
    if (
      existing[0].claim_status === "claimed" &&
      existing[0].claimed_by !== session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "This listing is managed by its verified owner and can't be edited.",
        },
        { status: 403 }
      );
    }

    const wasListed = existing[0].status === 'listed';

    // Editing a live listing overwrites its row in place and flips it back to
    // pending, destroying the previously-live values. Capture a full snapshot
    // first so the admin queue can show a field-by-field old→new comparison.
    // Only real edits of a listed business are snapshotted; re-editing an
    // already-pending item keeps whatever snapshot it already had (its "before"
    // is still the last live version, not the intermediate pending state).
    if (wasListed) {
      const snapshot = await buildListingSnapshot(id);
      if (snapshot) {
        await sql`
          UPDATE businesses
          SET edit_snapshot = ${sql.json(
            snapshot as unknown as Record<string, never>
          )},
              edited_at      = NOW()
          WHERE id = ${id}
        `;
      }
    }

    // The edit form submits multipart (text fields as a JSON "data" blob,
    // kept image ids as JSON, plus new image files). Older callers may still
    // send raw JSON, so fall back to that.
    const contentType = req.headers.get("content-type") || "";
    // The parsed edit body. The form sends BusinessFormData-shaped JSON (it may
    // omit fields, which the reconciliation below handles defensively).
    let data: BusinessFormData;
    let keptImageIds: string[] | null = null;
    let imageOrder: string[] | null = null;
    const newImageFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      data = JSON.parse((form.get("data") as string) || "{}");

      const keptRaw = form.get("keptImageIds");
      if (typeof keptRaw === "string") {
        try {
          keptImageIds = JSON.parse(keptRaw);
        } catch {
          keptImageIds = [];
        }
      }

      const orderRaw = form.get("imageOrder");
      if (typeof orderRaw === "string") {
        try {
          imageOrder = JSON.parse(orderRaw);
        } catch {
          imageOrder = null;
        }
      }

      let i = 0;
      while (form.get(`image_${i}`)) {
        newImageFiles.push(form.get(`image_${i}`) as File);
        i++;
      }
    } else {
      data = await req.json();
    }

    const socialUrls = buildSocialUrls(data);

    // Served zips apply only to directory-only small businesses; prune blanks,
    // dedupe, cap at 5 (mirrors the submit route). The directory-only decision
    // is finalized in the location block below, but the zip cleanup is value-
    // only here — anything non-directory ends up cleared when type realigns.
    const isEventRowForZips = existing[0].type === "event";
    const directoryOnlyForZips =
      !isEventRowForZips &&
      (data.noFixedLocation === true ||
        data.lat == null ||
        data.lng == null);
    const servedZips: string[] =
      data.servedZips !== undefined && directoryOnlyForZips
        ? Array.from(
            new Set<string>(
              (data.servedZips || [])
                .map((z: string) => (z || "").replace(/\D/g, "").slice(0, 5))
                .filter((z: string) => z.length === 5)
            )
          ).slice(0, 5)
        : [];

    await sql`
      UPDATE businesses SET
        name               = ${data.name?.trim() || null},
        description        = ${data.description?.trim() || null},
        category           = ${data.category || null},
        price_tier         = ${data.priceTier || null},
        price_context      = ${data.priceContext || null},
        website            = ${socialUrls.website || null},
        instagram          = ${socialUrls.instagram || null},
        facebook           = ${socialUrls.facebook || null},
        tiktok             = ${socialUrls.tiktok || null},
        twitter            = ${socialUrls.twitter || null},
        youtube            = ${socialUrls.youtube || null},
        email              = ${data.email || null},
        phone              = ${data.phone || null},
        payment_options    = ${data.paymentOptions || []},
        ordering_methods   = ${data.orderingMethods || []},
        dietary_options    = ${data.dietaryOptions || []},
        business_amenities = ${data.businessAmenities || []},
        hours_subject_to_change = ${data.hoursSubjectToChange || false},
        served_zips        = ${servedZips.length > 0 ? servedZips : null},
        status             = 'pending',
        updated_at         = NOW()
      WHERE id = ${id}
    `;

    // Location. Only reconcile when the edit form sent address fields (the
    // Location tab always does; guarding protects older callers). Events keep
    // type='event'; small business derives no_location vs permanent_location
    // from the directory-only choice (mirrors the submit route).
    const sentLocation =
      data.streetAddress !== undefined ||
      data.street1 !== undefined ||
      data.city !== undefined;

    if (sentLocation) {
      const isEventRow = existing[0].type === "event";
      const directoryOnly =
        !isEventRow &&
        (data.noFixedLocation === true ||
          data.lat == null ||
          data.lng == null);

      // Exact address is a verified-owner capability: only a claimed listing's
      // owner may set it. Anyone else's value is ignored rather than rejected,
      // so a stale form can't fail an otherwise valid save.
      const isVerifiedOwner =
        existing[0].claim_status === "claimed" &&
        existing[0].claimed_by === session.user.id;

      const wantsExactAddress =
        isVerifiedOwner &&
        data.showExactAddress === true &&
        typeof data.exactAddress === "string" &&
        data.exactAddress.trim() !== "";

      const fullExactAddress = wantsExactAddress
        ? [
            data.exactAddress.trim(),
            data.city,
            data.stateCode,
            data.zip,
          ]
            .filter(Boolean)
            .join(", ")
        : null;

      // Publishing an exact address also drops the map pin — vendors with no
      // fixed location (home based, street based) have no coords otherwise, so
      // geocode what the owner just gave us.
      let exactCoords: { lat: number; lng: number } | null = null;

      if (fullExactAddress) {
        try {
          const geoRes = await fetch(
            "https://geocode.search.hereapi.com/v1/geocode" +
            `?q=${encodeURIComponent(fullExactAddress)}` +
            "&in=countryCode:USA&limit=1" +
            `&apiKey=${process.env.HERE_API_KEY}`
          );
          const geoData = await geoRes.json();
          const position = geoData.items?.[0]?.position;
          if (position?.lat && position?.lng) {
            exactCoords = {
              lat: position.lat,
              lng: position.lng,
            };
          }
        } catch (error) {
          // Never block the save on a geocode failure; the address still
          // publishes, the listing just keeps whatever pin it had.
          console.error("Exact-address geocode error:", error);
        }
      }

      const hasCoords =
        (!directoryOnly && data.lat != null && data.lng != null) ||
        exactCoords !== null;

      // The exact address wins the pin when set, so a directory-only vendor
      // who opts in still lands on the map at their own address.
      const pinLng = exactCoords ? exactCoords.lng : data.lng;
      const pinLat = exactCoords ? exactCoords.lat : data.lat;

      // Realign the business type for small business when the map/no-map
      // choice changed (events stay 'event'). Runs after the exact-address
      // geocode: a vendor with no fixed location who publishes their address
      // does get a pin, so they are no longer directory-only.
      if (!isEventRow) {
        await sql`
          UPDATE businesses
          SET type = ${
            directoryOnly && !exactCoords
              ? "no_location"
              : "permanent_location"
          }
          WHERE id = ${id}
        `;
      }

      const existingLoc = await sql`
        SELECT id FROM locations WHERE business_id = ${id} LIMIT 1
      `;

      if (existingLoc.length > 0) {
        // Update the address fields; set or clear coords depending on mode.
        await sql`
          UPDATE locations SET
            street_1       = ${data.street1 || null},
            street_2       = ${data.street2 || null},
            street_address = ${data.streetAddress || null},
            city           = ${data.city || null},
            state          = ${data.state || null},
            state_code     = ${data.stateCode || null},
            zip            = ${data.zip || null},
            neighborhood   = ${data.neighborhood || null},
            location_amenities = ${data.locationAmenities || []},
            show_exact_address = ${wantsExactAddress},
            exact_address  = ${fullExactAddress},
            coordinates    = ${
              hasCoords
                ? sql`ST_MakePoint(${pinLng}, ${pinLat})`
                : sql`NULL`
            },
            updated_at     = NOW()
          WHERE business_id = ${id}
        `;
      } else if (hasCoords || data.city || fullExactAddress) {
        // No row yet (e.g. a previously directory-only business gaining an
        // address) — insert one.
        await sql`
          INSERT INTO locations (
            business_id, street_1, street_2, street_address,
            city, state, state_code, zip, country, neighborhood,
            location_amenities, show_exact_address, exact_address,
            coordinates, is_active_area
          ) VALUES (
            ${id},
            ${data.street1 || null},
            ${data.street2 || null},
            ${data.streetAddress || null},
            ${data.city || null},
            ${data.state || null},
            ${data.stateCode || null},
            ${data.zip || null},
            'USA',
            ${data.neighborhood || null},
            ${data.locationAmenities || []},
            ${wantsExactAddress},
            ${fullExactAddress},
            ${hasCoords ? sql`ST_MakePoint(${pinLng}, ${pinLat})` : sql`NULL`},
            true
          )
        `;
      }
    }

    // Business hours (small business). Replace-all: clear then re-insert what
    // the form sent. Only reconcile when the field is present so older callers
    // that omit it don't wipe existing hours.
    if (Array.isArray(data.hours)) {
      await sql`DELETE FROM business_hours WHERE business_id = ${id}`;
      for (const h of data.hours) {
        if (!h.dayOfWeek) continue;
        await sql`
          INSERT INTO business_hours (
            business_id, day_of_week, open_time, close_time,
            closes_next_day, is_closed, hours_vary, season_start, season_end
          ) VALUES (
            ${id},
            ${h.dayOfWeek},
            ${h.openTime || null},
            ${h.closeTime || null},
            ${h.closesNextDay || false},
            ${h.isClosed || false},
            ${h.hoursVary || false},
            ${h.seasonStart || null},
            ${h.seasonEnd || null}
          )
          ON CONFLICT (business_id, day_of_week) DO NOTHING
        `;
      }
    }

    // Vendor spaces + fees. Only reconcile when the edit form sent the field
    // (it always does for the add/edit forms; guarding keeps older callers
    // that omit it from wiping data). When the toggle is on we upsert the
    // single vendor_spaces row and replace all fee rows; when off we remove
    // them entirely.
    if (data.vendorSpace !== undefined) {
      const vsData = data.vendorSpace;
      const VALID_FEE_TYPES = [
        "non_food",
        "prepackaged_food",
        "beverage",
        "hot_food",
        "other",
      ];

      if (vsData?.vendorSpaceAvailable) {
        await sql`
          INSERT INTO vendor_spaces (
            business_id,
            vendor_space_available,
            space_sizes,
            vendor_types,
            has_waitlist,
            has_holds,
            signup_link,
            note
          ) VALUES (
            ${id},
            true,
            ${vsData.spaceSizes || []},
            ${vsData.vendorTypes || []},
            ${vsData.hasWaitlist || false},
            ${vsData.hasHolds || false},
            ${vsData.signupLink || null},
            ${vsData.note || null}
          )
          ON CONFLICT (business_id) DO UPDATE SET
            vendor_space_available = EXCLUDED.vendor_space_available,
            space_sizes  = EXCLUDED.space_sizes,
            vendor_types = EXCLUDED.vendor_types,
            has_waitlist = EXCLUDED.has_waitlist,
            has_holds    = EXCLUDED.has_holds,
            signup_link  = EXCLUDED.signup_link,
            note         = EXCLUDED.note,
            updated_at   = NOW()
        `;
      } else {
        // Toggled off — drop the vendor space row (fees cascade via the
        // delete below anyway, but keep them explicit).
        await sql`
          DELETE FROM vendor_spaces WHERE business_id = ${id}
        `;
      }

      // Replace fees: clear then re-insert whatever the form sent.
      await sql`DELETE FROM vendor_fees WHERE business_id = ${id}`;

      if (vsData?.vendorSpaceAvailable && Array.isArray(data.vendorFees)) {
        for (const fee of data.vendorFees) {
          if (!VALID_FEE_TYPES.includes(fee.feeType)) continue;
          const hasAmount =
            fee.amount != null && !Number.isNaN(Number(fee.amount));
          const hasDescription = !!fee.description?.trim();
          if (!hasAmount && !hasDescription && !fee.isFree) continue;

          await sql`
            INSERT INTO vendor_fees (
              business_id,
              fee_type,
              amount,
              is_free,
              description
            ) VALUES (
              ${id},
              ${fee.feeType},
              ${hasAmount ? Number(fee.amount) : null},
              ${fee.isFree || false},
              ${fee.description?.trim() || null}
            )
          `;
        }
      }
    }

    // Event dates. Persist the chosen mode: recurring → market_schedules,
    // specific → popup_events. Replace-all (delete then reinsert) and clear
    // the other table so switching modes can't leave stale rows. sub_type is
    // realigned to the mode since the businesses UPDATE above doesn't touch it.
    if (data.eventDateMode === "recurring" || data.eventDateMode === "specific") {
      const newSubType =
        data.eventDateMode === "recurring" ? "market" : "pop_up";
      await sql`
        UPDATE businesses SET sub_type = ${newSubType} WHERE id = ${id}
      `;

      // Validate BEFORE the delete below — bailing out mid-loop would leave the
      // listing with its schedules wiped and nothing written back.
      if (
        data.eventDateMode === "recurring" &&
        Array.isArray(data.marketSchedules)
      ) {
        for (const s of data.marketSchedules) {
          if (!s.dayOfWeek || !s.recurrenceType) continue;
          const scheduleError = validateScheduleAnchor(s);
          if (scheduleError) {
            return NextResponse.json(
              { error: scheduleError },
              { status: 400 }
            );
          }
        }
      }

      await sql`DELETE FROM market_schedules WHERE business_id = ${id}`;
      await sql`DELETE FROM popup_events WHERE business_id = ${id}`;

      if (
        data.eventDateMode === "recurring" &&
        Array.isArray(data.marketSchedules)
      ) {
        for (const s of data.marketSchedules) {
          if (!s.dayOfWeek || !s.recurrenceType) continue;
          await sql`
            INSERT INTO market_schedules (
              business_id, day_of_week, recurrence_type, anchor_date,
              start_time, end_time, closes_next_day, season_start, season_end
            ) VALUES (
              ${id},
              ${s.dayOfWeek},
              ${s.recurrenceType},
              ${s.anchorDate || null},
              ${s.startTime || null},
              ${s.endTime || null},
              ${s.closesNextDay || false},
              ${s.seasonStart || null},
              ${s.seasonEnd || null}
            )
          `;
        }
      }

      if (
        data.eventDateMode === "specific" &&
        Array.isArray(data.eventDates)
      ) {
        for (const d of data.eventDates) {
          if (!d.date || !d.startTime || !d.endTime) continue;
          const startDateTime = `${d.date} ${d.startTime}`;
          const endDate = d.closesNextDay ? nextDay(d.date) : d.date;
          const endDateTime = `${endDate} ${d.endTime}`;
          if (new Date(startDateTime) >= new Date(endDateTime)) continue;
          // ::text::timestamp keeps these as naive wall-clock timestamps;
          // see the submit route for why the cast is required.
          await sql`
            INSERT INTO popup_events (
              business_id, event_name, event_range, notes
            ) VALUES (
              ${id},
              ${data.eventName || null},
              tsrange(
                ${startDateTime}::text::timestamp,
                ${endDateTime}::text::timestamp
              ),
              null
            )
          `;
        }
      }
    }

    // Reconcile photos (only when the multipart edit form sent them).
    if (keptImageIds !== null) {
      // Delete any existing image the user removed — from Cloudinary too.
      const current = await sql`
        SELECT id, cloudinary_public_id
        FROM business_images
        WHERE business_id = ${id}
      `;

      const removed = current.filter(
        img => !keptImageIds!.includes(img.id)
      );

      // When this edit is an under-review change to a live listing (wasListed),
      // defer destroying the removed assets: an admin may reject the edit, in
      // which case restoreListingSnapshot rebuilds these rows and the files must
      // still exist. approveSubmission calls purgeRemovedSnapshotImages to clean
      // them up once the edit is accepted. For a still-pending (never-listed)
      // submission there's nothing to revert to, so delete immediately.
      if (!wasListed) {
        for (const img of removed) {
          try {
            await cloudinary.uploader.destroy(
              img.cloudinary_public_id
            );
          } catch (err) {
            // Don't fail the whole save if Cloudinary cleanup hiccups;
            // the DB row is still removed below.
            console.error(
              "Cloudinary destroy failed:",
              img.cloudinary_public_id,
              err
            );
          }
        }
      }

      if (removed.length > 0) {
        await sql`
          DELETE FROM business_images
          WHERE business_id = ${id}
          AND id = ANY(${removed.map(r => r.id)})
        `;
      }

      // Upload newly added files, capturing their new ids keyed by the upload
      // index so the "new:<i>" tokens in `imageOrder` can resolve to them.
      const newImageIds: string[] = [];
      for (const file of newImageFiles) {
        const uploaded = await uploadImage(file, "businesses");
        const [inserted] = await sql`
          INSERT INTO business_images (
            business_id,
            cloudinary_public_id,
            cloudinary_url,
            image_type
          ) VALUES (
            ${id},
            ${uploaded.publicId},
            ${uploaded.url},
            'gallery'
          )
          RETURNING id
        `;
        newImageIds.push(inserted.id);
      }

      // The gallery order the form sent decides the final order and the cover
      // (first item). Resolve each token to a real image id: an existing id is
      // kept as-is; "new:<i>" maps to the i-th freshly uploaded image. Fall
      // back to kept-then-new when the client sent no explicit order.
      const finalOrder =
        imageOrder !== null
          ? imageOrder
              .map(token =>
                token.startsWith("new:")
                  ? newImageIds[Number(token.slice(4))]
                  : token
              )
              .filter(
                id =>
                  typeof id === "string" &&
                  (keptImageIds!.includes(id) ||
                    newImageIds.includes(id))
              )
          : [...keptImageIds, ...newImageIds];

      // Guard against an order that dropped some surviving photo (e.g. a stale
      // token): append any kept/new id the order didn't mention.
      for (const id of [...keptImageIds, ...newImageIds]) {
        if (!finalOrder.includes(id)) finalOrder.push(id);
      }

      for (let idx = 0; idx < finalOrder.length; idx++) {
        await sql`
          UPDATE business_images
          SET display_order = ${idx},
              is_primary    = ${idx === 0}
          WHERE id = ${finalOrder[idx]}
        `;
      }
    }

    return NextResponse.json({
      success: true,
      wasListed,
    });

  } catch (error) {
    console.error("Submission PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}