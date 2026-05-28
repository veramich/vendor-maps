import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET — fetch business data for owner
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await sql`
      SELECT
        b.*,
        l.id as location_id,
        l.street_1,
        l.street_2,
        l.street_address,
        l.city,
        l.state,
        l.state_code,
        l.zip,
        l.show_exact_address,
        l.exact_address,
        l.neighborhood
      FROM businesses b
      LEFT JOIN locations l
        ON l.business_id = b.id
      WHERE b.id = ${id}
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Business not found or unauthorized" },
        { status: 404 }
      );
    }

    const business = result[0];

    return NextResponse.json({
      business,
      location: business,
    });

  } catch (error) {
    console.error("Owner GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch business" },
      { status: 500 }
    );
  }
}

// PATCH — update business location settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify ownership
    const owned = await sql`
      SELECT id FROM businesses
      WHERE id = ${id}
      AND claimed_by = ${session.user.id}
      AND claim_status = 'claimed'
    `;

    if (!owned || owned.length === 0) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const {
      showExactAddress,
      exactAddress,
      exactCity,
      exactState,
      exactZip,
    } = await req.json();

    // Build full exact address string
    const fullExactAddress =
      showExactAddress && exactAddress
        ? [
            exactAddress,
            exactCity,
            exactState,
            exactZip,
          ]
            .filter(Boolean)
            .join(", ")
        : null;

    // Update location
    await sql`
      UPDATE locations SET
        show_exact_address = ${showExactAddress || false},
        exact_address      = ${fullExactAddress},
        updated_at         = NOW()
      WHERE business_id = ${id}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Owner PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}