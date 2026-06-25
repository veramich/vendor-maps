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

    const userId = session.user.id;

    // Get submissions by this user
    const submissions = await sql`
      SELECT
        b.id,
        b.name,
        b.slug,
        b.type,
        b.sub_type,
        b.category,
        b.status,
        b.claim_status,
        b.created_at,
        l.city,
        l.state_code
      FROM businesses b
      LEFT JOIN locations l
        ON l.business_id = b.id
      WHERE b.submitted_by = ${userId}
      ORDER BY b.created_at DESC
    `;

    // Get claims by this user
    const claims = await sql`
      SELECT
        c.id,
        c.business_id,
        c.status,
        c.requested_at,
        c.resolved_at,
        b.name as business_name,
        b.slug as business_slug
      FROM claims c
      JOIN businesses b ON b.id = c.business_id
      WHERE c.user_id = ${userId}
      ORDER BY c.requested_at DESC
    `;

    return NextResponse.json({
      submissions,
      claims,
    });

  } catch (error) {
    console.error("Submissions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}