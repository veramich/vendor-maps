import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { uploadImage } from "@/lib/utils/uploadImage";
import { buildSocialUrls } from "@/lib/utils/buildSocialUrls";
import { generateSlug } from "@/lib/utils/generateSlug";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

    // Get IP for spam prevention (take only the first IP from x-forwarded-for)
    const ip =
      req.headers.get("x-forwarded-for")
        ?.split(",")[0].trim()
      || "unknown";

    // Rate limit — max 3 submissions per IP per day
    const recentSubmissions = await sql`
      SELECT COUNT(*) as count
      FROM businesses
      WHERE submitter_ip = ${ip}
      AND created_at > NOW() - INTERVAL '24 hours'
    `;

    if (Number(recentSubmissions[0].count) >= 3) {
      return NextResponse.json(
        { error: "Too many submissions. Try again tomorrow." },
        { status: 429 }
      );
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

    // Map form subType to DB type and sub_type
    const dbType =
      data.type === "small_business"
        ? data.subType === "permanent_location"
          ? "permanent_location"
          : "no_location"
        : "event";

    const dbSubType =
      data.subType === "permanent_location" ||
      data.subType === "no_location"
        ? data.detailedSubType &&
          [
            "street_vendor",
            "food_truck",
            "home_based",
            "market_based",
            "pop_up_based",
            "catering_only",
            "shipping_only",
          ].includes(data.detailedSubType)
          ? data.detailedSubType
          : null
        : data.subType === "market"
        ? "market"
        : data.subType === "pop_up"
        ? "pop_up"
        : null;

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
        slug,
        status,
        claim_status,
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
        ${slug},
        'pending',
        'unclaimed',
        'user_submission',
        ${submittedBy},
        ${ip}
      )
      RETURNING id
    `;

    const businessId = business.id;

    // Insert location if applicable
    const hasLocation =
      data.subType === "permanent_location" ||
      data.subType === "market" ||
      data.subType === "pop_up";

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

    // Insert market schedules
    if (
      data.subType === "market" &&
      data.marketSchedules?.length > 0
    ) {
      for (const schedule of data.marketSchedules) {
        await sql`
          INSERT INTO market_schedules (
            business_id,
            day_of_week,
            recurrence_type,
            start_time,
            end_time,
            closes_next_day,
            is_night_market,
            season_start,
            season_end
          ) VALUES (
            ${businessId},
            ${schedule.dayOfWeek},
            ${schedule.recurrenceType},
            ${schedule.startTime},
            ${schedule.endTime},
            ${schedule.closesNextDay || false},
            false,
            ${schedule.seasonStart || null},
            ${schedule.seasonEnd || null}
          )
        `;
      }
    }

    // Insert pop-up event
    if (
      data.subType === "pop_up" &&
      data.popUpEvent?.startDate &&
      data.popUpEvent?.startTime &&
      data.popUpEvent?.endTime
    ) {
      const { popUpEvent } = data;

      const startDateTime =
        `${popUpEvent.startDate} ${popUpEvent.startTime}`;

      let endDate =
        popUpEvent.endDate || popUpEvent.startDate;

      if (popUpEvent.closesNextDay) {
        const start = new Date(popUpEvent.startDate);
        start.setDate(start.getDate() + 1);
        endDate = start.toISOString().split("T")[0];
      }

      const endDateTime =
        `${endDate} ${popUpEvent.endTime}`;

      if (
        new Date(startDateTime) >= new Date(endDateTime)
      ) {
        return NextResponse.json(
          { error: "Event end time must be after start time." },
          { status: 400 }
        );
      }

      await sql`
        INSERT INTO popup_events (
          business_id,
          event_name,
          event_range,
          is_night_market,
          notes
        ) VALUES (
          ${businessId},
          ${popUpEvent.eventName || null},
          tsrange(${startDateTime}, ${endDateTime}),
          ${popUpEvent.isNightMarket || false},
          ${popUpEvent.notes || null}
        )
      `;
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

    return NextResponse.json({
      success: true,
      businessId,
      slug,
    });

  } catch (error) {
    console.error("Submission error:", error);

    // Log full PostgreSQL error details if available
    if (error && typeof error === "object" && "code" in error) {
      console.error("DB error details:", {
        code:    (error as any).code,
        detail:  (error as any).detail,
        hint:    (error as any).hint,
        column:  (error as any).column,
        table:   (error as any).table,
        constraint: (error as any).constraint,
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