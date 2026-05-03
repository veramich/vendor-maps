import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { uploadImage } from "@/lib/utils/uploadImage";
import { buildSocialUrls } from "@/lib/utils/buildSocialUrls";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Parse JSON data
    const data = JSON.parse(
      formData.get("data") as string
    );

    // Get IP for spam prevention
    const ip = req.headers.get("x-forwarded-for")
      || "unknown";

    // Rate limit check — max 3 submissions per IP per day
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

    // Honeypot check
    if (data.honeypot) {
      return NextResponse.json({ success: true });
    }

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
        video_url,
        other_links,
        payment_options,
        ordering_methods,
        dietary_options,
        business_amenities,
        location_amenities,
        hours_subject_to_change,
        is_chain_location,
        location_nickname,
        status,
        claim_status,
        added_by,
        submitter_ip
      ) VALUES (
        ${data.brandId || null},
        ${data.type === "small_business"
          ? (data.subType === "permanent_location"
            ? "permanent_location"
            : "no_location")
          : "event"
        },
        ${data.subType},
        ${data.name.trim()},
        ${logoUrl || null},
        ${data.description.trim()},
        ${data.category},
        ${data.priceTier},
        ${data.priceContext},
        ${socialUrls.website || null},
        ${socialUrls.instagram || null},
        ${socialUrls.facebook || null},
        ${socialUrls.tiktok || null},
        ${socialUrls.twitter || null},
        ${socialUrls.youtube || null},
        ${data.email || null},
        ${data.phone || null},
        ${socialUrls.videoUrl || null},
        ${JSON.stringify(data.otherLinks || [])},
        ${data.paymentOptions || []},
        ${data.orderingMethods || []},
        ${data.dietaryOptions || []},
        ${data.businessAmenities || []},
        ${data.locationAmenities || []},
        ${data.hoursSubjectToChange || false},
        ${data.isChainLocation || false},
        ${data.locationNickname || null},
        'pending',
        'unclaimed',
        'user_submission',
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

    if (hasLocation && data.lat && data.lng) {
      await sql`
        INSERT INTO locations (
          business_id,
          location_type,
          street_1,
          street_2,
          street_address,
          city,
          state,
          state_code,
          zip,
          country,
          neighborhood,
          coordinates,
          is_active_area
        ) VALUES (
          ${businessId},
          ${data.subType === "permanent_location"
            ? "intersection"
            : "address"
          },
          ${data.street1 || null},
          ${data.street2 || null},
          ${data.streetAddress || null},
          ${data.city},
          ${data.state},
          ${data.stateCode},
          ${data.zip},
          'USA',
          ${data.neighborhood || null},
          ST_MakePoint(${data.lng}, ${data.lat}),
          true
        )
      `;
    }

    // Insert business hours
    if (data.hours && data.hours.length > 0) {
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
            ${schedule.isNightMarket || false},
            ${schedule.seasonStart || null},
            ${schedule.seasonEnd || null}
          )
        `;
      }
    }

    // Insert pop-up event
    if (
      data.subType === "pop_up" &&
      data.popUpEvent
    ) {
      const { popUpEvent } = data;
      const startDateTime =
        `${popUpEvent.startDate} ${popUpEvent.startTime}`;
      const endDate = popUpEvent.closesNextDay
        ? popUpEvent.endDate
        : popUpEvent.startDate;
      const endDateTime =
        `${endDate} ${popUpEvent.endTime}`;

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
      imageFiles.push(formData.get(`image_${i}`) as File);
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
    });

  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit business" },
      { status: 500 }
    );
  }
}