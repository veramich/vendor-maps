import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const businesses = await sql`
      SELECT
        b.id,
        b.name,
        b.category,
        b.sub_type,
        b.price_tier,
        b.avg_rating,
        b.review_count,
        l.neighborhood,
        l.city
      FROM businesses b
      LEFT JOIN locations l ON l.business_id = b.id
      WHERE b.status = 'listed'
      AND b.type IN ('small_business', 'permanent_location',
        'no_location')
      AND b.sub_type NOT IN ('market', 'pop_up')
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