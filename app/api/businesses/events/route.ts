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
        l.neighborhood,
        l.city,
        l.street_address,
        COALESCE(vs.vendor_space_available, false)
          as vendor_space_available,
        ms.day_of_week,
        ms.start_time,
        ms.end_time,
        ms.is_night_market,
        pe.event_range
      FROM businesses b
      LEFT JOIN locations l ON l.business_id = b.id
      LEFT JOIN market_schedules ms ON ms.business_id = b.id
      LEFT JOIN popup_events pe ON pe.business_id = b.id
      LEFT JOIN vendor_spaces vs ON vs.business_id = b.id
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
