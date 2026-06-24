import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Attach businesses submitted while signed out to the now-authenticated user.
// The client stashes the returned businessId in localStorage on each anonymous
// submit (see lib/utils/pendingSubmissions.ts) and drains it here once a session
// exists. We only adopt rows that are still unowned (submitted_by IS NULL), so a
// stale or guessed id can never steal a business that already belongs to someone.
export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => null);
    const rawIds = body?.businessIds;

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json(
        { error: "businessIds required" },
        { status: 400 }
      );
    }

    // Keep only well-formed string ids, dedupe, and cap to a sane batch size.
    const businessIds = Array.from(
      new Set(
        rawIds.filter((id): id is string => typeof id === "string" && !!id)
      )
    ).slice(0, 50);

    if (businessIds.length === 0) {
      return NextResponse.json({ adopted: [] });
    }

    const adopted = await sql`
      UPDATE businesses
      SET submitted_by = ${userId}
      WHERE id = ANY(${businessIds})
        AND submitted_by IS NULL
      RETURNING id
    `;

    return NextResponse.json({
      adopted: adopted.map((row) => row.id),
    });

  } catch (error) {
    console.error("Adopt submissions error:", error);
    return NextResponse.json(
      { error: "Failed to adopt submissions" },
      { status: 500 }
    );
  }
}
