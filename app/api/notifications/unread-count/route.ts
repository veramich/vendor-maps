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

    const [row] = await sql`
      SELECT COUNT(*)::int AS count
      FROM notifications
      WHERE user_id = ${session.user.id}
      AND read_at IS NULL
    `;

    return NextResponse.json({ count: row?.count ?? 0 });

  } catch (error) {
    console.error("Notifications unread-count error:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
