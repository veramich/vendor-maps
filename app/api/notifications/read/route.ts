import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Mark notifications as read.
 *
 * Body (optional): { ids: string[] }
 *   - With ids: marks only those notifications read.
 *   - Without ids: marks ALL of the user's unread notifications read.
 *
 * Always scoped to the session user, so a user can never mark
 * someone else's notifications.
 */
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

    let ids: string[] | undefined;
    try {
      const body = await req.json();
      if (Array.isArray(body?.ids)) {
        ids = body.ids.filter((id: unknown) => typeof id === "string");
      }
    } catch {
      // No body / invalid JSON — treat as "mark all read".
    }

    if (ids && ids.length > 0) {
      await sql`
        UPDATE notifications
        SET read_at = NOW()
        WHERE user_id = ${session.user.id}
        AND id = ANY(${ids})
        AND read_at IS NULL
      `;
    } else {
      await sql`
        UPDATE notifications
        SET read_at = NOW()
        WHERE user_id = ${session.user.id}
        AND read_at IS NULL
      `;
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Notifications mark-read error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications read" },
      { status: 500 }
    );
  }
}
