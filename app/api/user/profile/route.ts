import { NextRequest, NextResponse } from "next/server";
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

    const [subResult, reviewResult, savedResult, claimResult] =
      await Promise.all([
        sql`SELECT COUNT(*) FROM businesses WHERE submitted_by = ${userId}`,
        sql`SELECT COUNT(*) FROM reviews WHERE user_id = ${userId}`,
        sql`SELECT COUNT(*) FROM saved_businesses WHERE user_id = ${userId}`,
        sql`SELECT COUNT(*) FROM claims WHERE user_id = ${userId}`,
      ]);

    return NextResponse.json({
      stats: {
        submissions: Number(subResult[0].count),
        reviews:     Number(reviewResult[0].count),
        saved:       Number(savedResult[0].count),
        claims:      Number(claimResult[0].count),
      },
      isAdmin: userId === process.env.ADMIN_USER_ID,
    });

  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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

    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    await sql`
      UPDATE "user"
      SET
        name       = ${name.trim()},
        updated_at = NOW()
      WHERE id = ${session.user.id}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update name" },
      { status: 500 }
    );
  }
}