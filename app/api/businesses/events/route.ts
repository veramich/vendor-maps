import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { parseFilters, buildFilterClause } from "@/lib/businessFilterSql";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";

  try {
    const searchFrag = q
      ? sql`AND (
          b.name ILIKE ${"%" + q + "%"}
          OR b.description ILIKE ${"%" + q + "%"}
          OR l.city ILIKE ${"%" + q + "%"}
          OR l.street_address ILIKE ${"%" + q + "%"}
          OR l.neighborhood ILIKE ${"%" + q + "%"}
        )`
      : sql``;

    const filterFrag = buildFilterClause(
      parseFilters(req.nextUrl.searchParams)
    );

    const events = await sql`
      SELECT
        b.id,
        b.slug,
        b.name,
        b.category,
        b.sub_type,
        b.price_tier,
        b.logo_url,
        br.logo_url AS brand_logo,
        cat.icon_name,
        l.neighborhood,
        l.city,
        l.street_address,
        COALESCE(vs.vendor_space_available, false)
          as vendor_space_available,
        occ.day_of_week,
        occ.recurrence_type,
        occ.anchor_date::text AS anchor_date,
        occ.start_time,
        occ.end_time,
        occ.event_start,
        (
          SELECT bi.cloudinary_url
          FROM business_images bi
          WHERE bi.business_id = b.id
          ORDER BY bi.is_primary DESC, bi.display_order ASC
          LIMIT 1
        ) AS image_url
      FROM businesses b
      LEFT JOIN locations l ON l.business_id = b.id
      LEFT JOIN brands br ON br.id = b.brand_id
      LEFT JOIN categories cat ON cat.id = b.category_id
      LEFT JOIN vendor_spaces vs ON vs.business_id = b.id
      -- Collapse a market's many schedule rows (and a pop-up's many dates) to a
      -- single "soonest upcoming" occurrence, so each business is one card.
      -- Markets rank by days until the next matching weekday; pop-ups by days
      -- until their start date, with past dates pushed to the back.
      LEFT JOIN LATERAL (
        SELECT * FROM (
          SELECT
            ms.day_of_week,
            ms.recurrence_type,
            ms.anchor_date,
            ms.start_time,
            ms.end_time,
            NULL::text AS event_start,
            CASE
              -- With an anchor, step by the real cadence (14d biweekly, else 7d)
              -- to the next occurrence on/after today.
              WHEN ms.anchor_date IS NOT NULL THEN
                (CASE WHEN ms.recurrence_type = 'biweekly' THEN 14 ELSE 7 END)
                  * GREATEST(0, CEIL(
                      (CURRENT_DATE - ms.anchor_date)::numeric
                      / (CASE WHEN ms.recurrence_type = 'biweekly' THEN 14 ELSE 7 END)
                    ))::int
                + ms.anchor_date - CURRENT_DATE
              -- Legacy rows without an anchor: rank by next matching weekday.
              ELSE (
                (CASE ms.day_of_week
                   WHEN 'sunday' THEN 0 WHEN 'monday' THEN 1
                   WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3
                   WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5
                   WHEN 'saturday' THEN 6 END)
                - EXTRACT(DOW FROM CURRENT_DATE)::int + 7
              ) % 7
            END AS sort_key
          FROM market_schedules ms
          WHERE ms.business_id = b.id

          UNION ALL

          SELECT
            NULL::text AS day_of_week,
            NULL::text AS recurrence_type,
            NULL::date AS anchor_date,
            lower(pe.event_range)::time AS start_time,
            upper(pe.event_range)::time AS end_time,
            lower(pe.event_range)::text AS event_start,
            CASE
              WHEN lower(pe.event_range)::date >= CURRENT_DATE
                THEN (lower(pe.event_range)::date - CURRENT_DATE)
              ELSE (lower(pe.event_range)::date - CURRENT_DATE) + 100000
            END AS sort_key
          FROM popup_events pe
          WHERE pe.business_id = b.id
        ) occs
        ORDER BY sort_key ASC
        LIMIT 1
      ) occ ON true
      WHERE b.status = 'listed'
      AND b.sub_type IN ('market', 'pop_up')
      ${searchFrag}
      ${filterFrag}
      ORDER BY b.created_at DESC
    `;

    return NextResponse.json({ events });

  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
