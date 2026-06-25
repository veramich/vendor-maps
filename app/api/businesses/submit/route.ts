import { NextRequest, NextResponse } from "next/server";
import sql, { isPgError } from "@/lib/db";
import { uploadImage } from "@/lib/utils/uploadImage";
import { buildSocialUrls } from "@/lib/utils/buildSocialUrls";
import { generateSlug } from "@/lib/utils/generateSlug";
import { auth } from "@/lib/auth";
import { sendSubmissionReceivedEmail } from "@/lib/email";
import { headers } from "next/headers";

// Add one day to a YYYY-MM-DD string, returning YYYY-MM-DD. Built from the
// date parts (UTC noon) so it never drifts across a timezone boundary.
function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Parse JSON data
    const data = JSON.parse(
      formData.get("data") as string
    );

    // Honeypot check
    if (data.honeypot) {
      return NextResponse.json({ success: true });
    }

    // Get session if signed in
    const session = await auth.api.getSession({
      headers: await headers(),
    }).catch(() => null);

    const submittedBy = session?.user?.id || null;
    const submitterEmail = session?.user?.email || null;
    const submitterName = session?.user?.name || null;

    // Get IP for spam prevention (take only the first IP from x-forwarded-for)
    const ip =
      req.headers.get("x-forwarded-for")
        ?.split(",")[0].trim()
      || "unknown";

    // Rate limit — max 3 submissions per IP per day. Signed-in users are
    // trusted and exempt; the limit only guards anonymous spam.
    if (!submittedBy) {
      const recentSubmissions = await sql`
        SELECT COUNT(*) as count
        FROM businesses
        WHERE submitter_ip = ${ip}
        AND created_at > NOW() - INTERVAL '24 hours'
      `;

      if (Number(recentSubmissions[0].count) >= 3) {
        return NextResponse.json(
          { error: "You've reached today's submission limit. Please try again tomorrow." },
          { status: 429 }
        );
      }
    }

    // Upload logo if provided
    let logoUrl = "";
    const logoFile = formData.get("logo") as File | null;
    if (logoFile && logoFile.size > 0) {
      const uploaded = await uploadImage(logoFile, "logos");
      logoUrl = uploaded.url;
    }

    // Build social URLs
    const socialUrls = buildSocialUrls(data);
    const submittedOtherLinks = [
      ...(Array.isArray(data.otherLinks)
        ? data.otherLinks
        : []
      ),
      ...(socialUrls.videoUrl
        ? [socialUrls.videoUrl]
        : []
      ),
    ];

    // For small business, the permanent_location vs no_location distinction
    // is derived from the location step: no fixed location (or no coords)
    // means directory-only. Events carry their subType ("market" | "pop_up")
    // directly from the form.
    // Owner intent from step 0 of the form. When the submitter is also signed
    // in we can auto-start the claiming process (insert a claims row + flip
    // claim_status to 'pending'); when they're not signed in we still record
    // the intent so they can finish claiming after creating an account.
    const submittedAsOwner = data.submittedAsOwner === true;
    const ownerCanClaim = submittedAsOwner && Boolean(submittedBy);
    const claimStatus = ownerCanClaim ? "pending" : "unclaimed";

    const isSmallBiz = data.type === "small_business";
    const isDirectoryOnly =
      data.noFixedLocation === true ||
      data.lat == null ||
      data.lng == null;

    const dbType = isSmallBiz
      ? isDirectoryOnly
        ? "no_location"
        : "permanent_location"
      : "event";

    // Events no longer pick a sub_type up front — it's derived from the date
    // mode: recurring → market (market_schedules); specific dates → pop_up
    // (popup_events).
    const dbSubType = isSmallBiz
      ? data.detailedSubType &&
        [
          "street_vendor",
          "food_truck",
          "home_based",
          "market_based",
          "pop_up_based",
          "other",
        ].includes(data.detailedSubType)
        ? data.detailedSubType
        : null
      : data.eventDateMode === "recurring"
      ? "market"
      : "pop_up";

    // Handle event pricing
    const isEventType = data.type === "event";

    const dbPriceTier = isEventType
      ? null
      : data.priceTier || null;

    const dbPriceContext = isEventType
      ? data.isFreeEntry
        ? "Free entry"
        : data.admissionPrice
        ? `$${data.admissionPrice} admission`
        : null
      : data.priceContext || null;

    // Served zips only apply to directory-only businesses; prune blanks,
    // dedupe, and cap at 5. Anything else (located biz, events) stores null.
    const servedZips: string[] =
      isSmallBiz && isDirectoryOnly
        ? Array.from(
            new Set<string>(
              (data.servedZips || [])
                .map((z: string) => (z || "").replace(/\D/g, "").slice(0, 5))
                .filter((z: string) => z.length === 5)
            )
          ).slice(0, 5)
        : [];

    // Generate slug
    const slug = await generateSlug(
      data.name,
      data.city,
      data.neighborhood
    );

    // Insert business
    const [business] = await sql`
      INSERT INTO businesses (
        brand_id,
        type,
        sub_type,
        name,
        logo_url,
        description,
        category,
        price_tier,
        price_context,
        website,
        instagram,
        facebook,
        tiktok,
        twitter,
        youtube,
        email,
        phone,
        other_links,
        payment_options,
        ordering_methods,
        dietary_options,
        business_amenities,
        hours_subject_to_change,
        is_chain_location,
        location_nickname,
        served_zips,
        slug,
        status,
        claim_status,
        submitted_as_owner,
        added_by,
        submitted_by,
        submitter_ip
      ) VALUES (
        ${data.brandId || null},
        ${dbType},
        ${dbSubType},
        ${data.name.trim()},
        ${logoUrl || null},
        ${data.description.trim()},
        ${!isEventType ? data.category : null},
        ${dbPriceTier},
        ${dbPriceContext},
        ${socialUrls.website || null},
        ${socialUrls.instagram || null},
        ${socialUrls.facebook || null},
        ${socialUrls.tiktok || null},
        ${socialUrls.twitter || null},
        ${socialUrls.youtube || null},
        ${data.email || null},
        ${data.phone || null},
        ${JSON.stringify(submittedOtherLinks)},
        ${sql.array(!isEventType ? data.paymentOptions || [] : [], 25)},
        ${sql.array(!isEventType ? data.orderingMethods || [] : [], 25)},
        ${sql.array(!isEventType ? data.dietaryOptions || [] : [], 25)},
        ${sql.array(!isEventType ? data.businessAmenities || [] : [], 25)},
        ${!isEventType
          ? data.hoursSubjectToChange || false
          : false
        },
        ${data.isChainLocation || false},
        ${data.locationNickname || null},
        ${servedZips.length > 0 ? sql.array(servedZips, 25) : null},
        ${slug},
        'pending',
        ${claimStatus},
        ${submittedAsOwner},
        'user_submission',
        ${submittedBy},
        ${ip}
      )
      RETURNING id
    `;

    const businessId = business.id;

    // Owner submitting their own business while signed in → auto-start the
    // claiming process so an admin can approve it (mirrors the /claim flow).
    // The business above was already set to claim_status='pending'. Use any
    // contact details they provided as the claim contact for verification.
    if (ownerCanClaim) {
      const claimContact =
        [data.email, data.phone, socialUrls.instagram]
          .map((v: string | undefined) => (v || "").trim())
          .filter(Boolean)
          .join(" / ") || "Submitted via add-business form";

      await sql`
        INSERT INTO claims (
          business_id,
          user_id,
          claim_contact,
          status,
          requested_at
        ) VALUES (
          ${businessId},
          ${submittedBy},
          ${claimContact},
          'pending',
          NOW()
        )
      `;
    }

    // Insert location if applicable. Small business: anything that resolved
    // to a permanent_location (has coords, not directory-only). Events always
    // have a venue.
    const hasLocation =
      dbType === "permanent_location" ||
      isEventType;

    if (hasLocation) {
      if (data.lat && data.lng) {
        await sql`
          INSERT INTO locations (
            business_id,
            street_1,
            street_2,
            street_address,
            city,
            state,
            state_code,
            zip,
            country,
            neighborhood,
            location_amenities,
            coordinates,
            is_active_area
          ) VALUES (
            ${businessId},
            ${data.street1 || null},
            ${data.street2 || null},
            ${data.streetAddress || null},
            ${data.city || null},
            ${data.state || null},
            ${data.stateCode || null},
            ${data.zip || null},
            'USA',
            ${data.neighborhood || null},
            ${sql.array(data.locationAmenities || [], 25)},
            ST_MakePoint(${data.lng}, ${data.lat}),
            true
          )
        `;
      } else {
        await sql`
          INSERT INTO locations (
            business_id,
            street_1,
            street_2,
            street_address,
            city,
            state,
            state_code,
            zip,
            country,
            neighborhood,
            location_amenities,
            is_active_area
          ) VALUES (
            ${businessId},
            ${data.street1 || null},
            ${data.street2 || null},
            ${data.streetAddress || null},
            ${data.city || null},
            ${data.state || null},
            ${data.stateCode || null},
            ${data.zip || null},
            'USA',
            ${data.neighborhood || null},
            ${sql.array(data.locationAmenities || [], 25)},
            true
          )
        `;
      }
    }

    // Insert business hours
    if (
      !isEventType &&
      data.hours &&
      data.hours.length > 0
    ) {
      for (const hour of data.hours) {
        await sql`
          INSERT INTO business_hours (
            business_id,
            day_of_week,
            open_time,
            close_time,
            closes_next_day,
            is_closed,
            hours_vary
          ) VALUES (
            ${businessId},
            ${hour.dayOfWeek},
            ${hour.openTime || null},
            ${hour.closeTime || null},
            ${hour.closesNextDay || false},
            ${hour.isClosed || false},
            ${hour.hoursVary || false}
          )
        `;
      }
    }

    // Insert market schedules (recurring-mode events)
    if (
      isEventType &&
      data.eventDateMode === "recurring" &&
      data.marketSchedules?.length > 0
    ) {
      for (const schedule of data.marketSchedules) {
        await sql`
          INSERT INTO market_schedules (
            business_id,
            day_of_week,
            recurrence_type,
            anchor_date,
            start_time,
            end_time,
            closes_next_day,
            season_start,
            season_end
          ) VALUES (
            ${businessId},
            ${schedule.dayOfWeek},
            ${schedule.recurrenceType},
            ${schedule.anchorDate || null},
            ${schedule.startTime},
            ${schedule.endTime},
            ${schedule.closesNextDay || false},
            ${schedule.seasonStart || null},
            ${schedule.seasonEnd || null}
          )
        `;
      }
    }

    // Insert discrete event dates (specific-mode events) — one popup_events
    // row per date. Each date carries its own times; closesNextDay rolls the
    // end to the following day.
    if (
      isEventType &&
      data.eventDateMode === "specific" &&
      Array.isArray(data.eventDates)
    ) {
      for (const d of data.eventDates) {
        if (!d.date || !d.startTime || !d.endTime) continue;

        const startDateTime = `${d.date} ${d.startTime}`;
        const endDate = d.closesNextDay ? nextDay(d.date) : d.date;
        const endDateTime = `${endDate} ${d.endTime}`;

        if (new Date(startDateTime) >= new Date(endDateTime)) {
          return NextResponse.json(
            { error: "Event end time must be after start time." },
            { status: 400 }
          );
        }

        // ::text::timestamp forces the driver-bound value to be parsed as a
        // naive (wall-clock) timestamp. Without it postgres.js infers the
        // bare string as timestamptz and shifts it by the server TZ offset.
        await sql`
          INSERT INTO popup_events (
            business_id,
            event_name,
            event_range,
            notes
          ) VALUES (
            ${businessId},
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

    // Insert vendor spaces (events only). One row per business; fees are
    // separate rows in vendor_fees.
    if (
      isEventType &&
      data.vendorSpace?.vendorSpaceAvailable
    ) {
      const vsData = data.vendorSpace;

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
          ${businessId},
          true,
          ${sql.array(vsData.spaceSizes || [], 25)},
          ${sql.array(vsData.vendorTypes || [], 25)},
          ${vsData.hasWaitlist || false},
          ${vsData.hasHolds || false},
          ${vsData.signupLink || null},
          ${vsData.note || null}
        )
      `;

      // Insert each fee the user filled in. Skip empty rows (no amount and
      // no description).
      const VALID_FEE_TYPES = [
        "non_food",
        "prepackaged_food",
        "beverage",
        "hot_food",
        "other",
      ];

      if (Array.isArray(data.vendorFees)) {
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
              ${businessId},
              ${fee.feeType},
              ${hasAmount ? Number(fee.amount) : null},
              ${fee.isFree || false},
              ${fee.description?.trim() || null}
            )
          `;
        }
      }
    }

    // Upload and insert business images
    const imageFiles: File[] = [];
    let i = 0;
    while (formData.get(`image_${i}`)) {
      imageFiles.push(
        formData.get(`image_${i}`) as File
      );
      i++;
    }

    for (let idx = 0; idx < imageFiles.length; idx++) {
      const file = imageFiles[idx];
      const uploaded = await uploadImage(
        file,
        "businesses"
      );

      await sql`
        INSERT INTO business_images (
          business_id,
          cloudinary_public_id,
          cloudinary_url,
          image_type,
          display_order,
          is_primary
        ) VALUES (
          ${businessId},
          ${uploaded.publicId},
          ${uploaded.url},
          'gallery',
          ${idx},
          ${idx === 0}
        )
      `;
    }

    // Confirmation email to whoever submitted. Prefer the signed-in user's
    // email (the actual submitter); fall back to the business contact email
    // for signed-out submissions. Fire-and-forget — sendSubmissionReceived-
    // Email swallows its own errors, so a flaky inbox never fails the submit.
    const recipientEmail = submitterEmail || data.email || null;
    if (recipientEmail) {
      await sendSubmissionReceivedEmail({
        to: recipientEmail,
        name: submitterName ?? undefined,
        itemName: data.name.trim(),
        kind: "business",
      });
    }

    return NextResponse.json({
      success: true,
      businessId,
      slug,
    });

  } catch (error) {
    console.error("Submission error:", error);

    // Log full PostgreSQL error details if available
    if (isPgError(error)) {
      console.error("DB error details:", {
        code:    error.code,
        detail:  error.detail,
        hint:    error.hint,
        column:  error.column,
        table:   error.table,
        constraint: error.constraint,
      });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to submit business";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}