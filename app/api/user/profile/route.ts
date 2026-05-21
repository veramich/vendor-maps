import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
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

    const userId = session.user.id;

    // Get submission count
    const [submissionCount] = await sql`
      SELECT COUNT(*) as count
      FROM businesses
      WHERE submitted_by = ${userId}
    `;

    // Get review count
    const [reviewCount] = await sql`
      SELECT COUNT(*) as count
      FROM reviews
      WHERE user_id = ${userId}
    `;

    // Get saved count
    const [savedCount] = await sql`
      SELECT COUNT(*) as count
      FROM saved_businesses
      WHERE user_id = ${userId}
    `;

    // Get claim count
    const [claimCount] = await sql`
      SELECT COUNT(*) as count
      FROM claims
      WHERE user_id = ${userId}
    `;

    return NextResponse.json({
      stats: {
        submissions: Number(submissionCount.count),
        reviews:     Number(reviewCount.count),
        saved:       Number(savedCount.count),
        claims:      Number(claimCount.count),
      },
    });

  } catch (error) {
    console.error("Profile stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}