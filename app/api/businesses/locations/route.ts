import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { parseFilters, buildFilterClause } from "@/lib/businessFilterSql";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const category = req.nextUrl.searchParams.get("category") || "";
  const type = req.nextUrl.searchParams.get("type") || "";

  try {
    const filterFrag = buildFilterClause(
      parseFilters(req.nextUrl.searchParams)
    );

    const searchFrag = q
      ? sql`AND (
          b.name ILIKE ${"%" + q + "%"}
          OR b.description ILIKE ${"%" + q + "%"}
          OR l.street_address ILIKE ${"%" + q + "%"}
          OR l.city ILIKE ${"%" + q + "%"}
          OR l.state ILIKE ${"%" + q + "%"}
          OR l.state_code ILIKE ${"%" + q + "%"}
          OR l.zip ILIKE ${"%" + q + "%"}
        )`
      : sql``;

    const categoryFrag = category
      ? sql`AND b.category = ${category}`
      : sql``;

    const typeFrag = type === "event" ? sql`AND b.type = 'event'` : sql``;

    const locations = await sql`
      SELECT
        b.id,
        b.slug,
        b.name,
        b.type,
        b.sub_type,
        b.category,
        cat.icon_name,
        b.price_tier,
        b.avg_rating,
        b.review_count,
        ST_X(l.coordinates) as lng,
        ST_Y(l.coordinates) as lat,
        l.neighborhood,
        l.city
      FROM businesses b
      JOIN locations l ON l.business_id = b.id
      LEFT JOIN categories cat ON cat.name = b.category
      WHERE b.status = 'listed'
      AND l.coordinates IS NOT NULL
      AND b.type IN (
        'permanent_location',
        'event'
      )
      ${searchFrag}
      ${categoryFrag}
      ${typeFrag}
      ${filterFrag}
    `;

    return NextResponse.json({ locations });

  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
