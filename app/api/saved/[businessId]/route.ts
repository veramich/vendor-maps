import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET — check if business is saved
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ collection: null });
    }

    const result = await sql`
      SELECT collection
      FROM saved_businesses
      WHERE business_id = ${businessId}
      AND user_id = ${session.user.id}
      LIMIT 1
    `;

    return NextResponse.json({
      collection: result[0]?.collection || null,
    });

  } catch (error) {
    console.error("Saved GET error:", error);
    return NextResponse.json(
      { collection: null }
    );
  }
}

// POST — save business to collection
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { collection } = await req.json();

    const validCollections = [
      "want_to_visit",
      "favorites",
      "been_here",
      "on_my_radar",
    ];

    if (!validCollections.includes(collection)) {
      return NextResponse.json(
        { error: "Invalid collection" },
        { status: 400 }
      );
    }

    // Upsert — update if exists, insert if not
    await sql`
      INSERT INTO saved_businesses (
        business_id,
        user_id,
        collection,
        saved_at
      ) VALUES (
        ${businessId},
        ${session.user.id},
        ${collection},
        NOW()
      )
      ON CONFLICT (business_id, user_id)
      DO UPDATE SET
        collection = ${collection},
        saved_at   = NOW()
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Saved POST error:", error);
    return NextResponse.json(
      { error: "Failed to save" },
      { status: 500 }
    );
  }
}

// DELETE — remove from saved
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await sql`
      DELETE FROM saved_businesses
      WHERE business_id = ${businessId}
      AND user_id = ${session.user.id}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Saved DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove" },
      { status: 500 }
    );
  }
}