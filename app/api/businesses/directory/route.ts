import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import {
  parseFilters,
  buildFilterClause,
  openNowPredicate,
} from "@/lib/businessFilterSql";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const category = req.nextUrl.searchParams.get("category") || "";

  try {
    const filters = parseFilters(req.nextUrl.searchParams);

    // is_open is computed against the caller's local day/time when provided;
    // it stays NULL (unknown) otherwise so the card can hide the badge.
    const openFrag =
      filters.nowDay && filters.prevDay && filters.nowTime
        ? sql`${openNowPredicate(
            filters.nowDay,
            filters.prevDay,
            filters.nowTime
          )}`
        : sql`NULL`;

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

    const filterFrag = buildFilterClause(filters);

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
        b.logo_url,
        br.name AS brand_name,
        br.logo_url AS brand_logo,
        cat.icon_name,
        l.neighborhood,
        l.city,
        l.street_1,
        l.street_2,
        l.street_address,
        (
          SELECT bi.cloudinary_url
          FROM business_images bi
          WHERE bi.business_id = b.id
          ORDER BY bi.is_primary DESC, bi.display_order ASC
          LIMIT 1
        ) AS image_url,
        ${openFrag} AS is_open
      FROM businesses b
      LEFT JOIN locations l
        ON l.business_id = b.id
      LEFT JOIN brands br
        ON br.id = b.brand_id
      LEFT JOIN categories cat
        ON cat.name = b.category
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
