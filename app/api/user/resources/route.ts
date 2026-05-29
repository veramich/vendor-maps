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

    // Resources this user posted (exclude rejected-then-hidden? keep all
    // so they can see status). Expired ones still show in this list with
    // their status, so the owner knows what happened.
    const resources = await sql`
      SELECT
        id,
        resource_type,
        title,
        status,
        always_available,
        start_date,
        end_date,
        city,
        state_code,
        expires_at,
        created_at
      FROM resources
      WHERE submitted_by = ${userId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ resources });
  } catch (error) {
    console.error("User resources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}
