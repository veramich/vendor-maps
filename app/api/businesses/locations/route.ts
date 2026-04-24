import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const locations = await sql`
      SELECT
        b.id,
        b.name,
        b.category,
        b.price_tier,
        b.avg_rating,
        b.review_count,
        b.type,
        b.sub_type,
        ST_X(l.coordinates) as lng,
        ST_Y(l.coordinates) as lat,
        l.neighborhood,
        l.city
      FROM businesses b
      JOIN locations l ON l.business_id = b.id
      WHERE b.status = 'listed'
      AND l.coordinates IS NOT NULL
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