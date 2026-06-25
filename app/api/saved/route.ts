import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const saved = await sql`
      SELECT
        b.id,
        b.name,
        b.slug,
        b.category,
        b.sub_type,
        b.price_tier,
        b.avg_rating,
        b.review_count,
        b.logo_url,
        l.city,
        l.neighborhood,
        sb.collection,
        sb.saved_at
      FROM saved_businesses sb
      JOIN businesses b ON b.id = sb.business_id
      LEFT JOIN locations l ON l.business_id = b.id
      WHERE sb.user_id = ${session.user.id}
      AND b.status = 'listed'
      ORDER BY sb.saved_at DESC
    `;

    return NextResponse.json({ saved });

  } catch (error) {
    console.error("Saved list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved businesses" },
      { status: 500 }
    );
  }
}