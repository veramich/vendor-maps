import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { parseFilters, buildFilterClause } from "@/lib/businessFilterSql";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const category = req.nextUrl.searchParams.get("category") || "";

  try {
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

    const filterFrag = buildFilterClause(
      parseFilters(req.nextUrl.searchParams)
    );

    const businesses = await sql`
      SELECT
        b.id,
        b.slug,
        b.name,
        b.category,
        b.type,
        b.sub_type,
        b.price_tier,
        b.avg_rating,
        b.review_count,
        l.neighborhood,
        l.city
      FROM businesses b
      LEFT JOIN locations l
        ON l.business_id = b.id
      WHERE b.status = 'listed'
      AND b.type IN (
        'permanent_location',
        'no_location'
      )
      ${searchFrag}
      ${categoryFrag}
      ${filterFrag}
      ORDER BY b.created_at DESC
    `;

    return NextResponse.json({ businesses });

  } catch (error) {
    console.error("Error fetching businesses:", error);
    return NextResponse.json(
      { error: "Failed to fetch businesses" },
      { status: 500 }
    );
  }
}
