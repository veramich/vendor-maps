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

    const claims = await sql`
      SELECT
        c.id,
        c.business_id,
        c.claim_contact,
        c.status,
        c.requested_at,
        c.resolved_at,
        b.name as business_name,
        b.slug as business_slug
      FROM claims c
      JOIN businesses b ON b.id = c.business_id
      WHERE c.user_id = ${session.user.id}
      ORDER BY c.requested_at DESC
    `;

    return NextResponse.json({ claims });

  } catch (error) {
    console.error("Claims error:", error);
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 }
    );
  }
}