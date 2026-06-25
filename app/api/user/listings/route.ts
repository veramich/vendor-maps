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

    const listings = await sql`
      SELECT
        b.id,
        b.name,
        b.slug,
        b.type,
        b.sub_type,
        b.category,
        b.status,
        b.avg_rating,
        b.review_count,
        b.logo_url,
        l.city,
        l.state_code
      FROM businesses b
      LEFT JOIN locations l
        ON l.business_id = b.id
      WHERE b.claimed_by = ${session.user.id}
      AND b.claim_status = 'claimed'
      AND b.status = 'listed'
      ORDER BY b.created_at DESC
    `;

    return NextResponse.json({ listings });

  } catch (error) {
    console.error("Listings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}