import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Get business data for owner
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const [business] = await sql`
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
      WHERE b.id = ${params.id}
      AND b.claimed_by = ${session.user.id}
      AND b.claim_status = 'claimed'
    `;

    if (!business) {
      return NextResponse.json(
        { error: "Business not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ business, location: business });

  } catch (error) {
    console.error("Owner GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch business" },
      { status: 500 }
    );
  }
}

// Update business location settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify ownership
    const [business] = await sql`
      SELECT id FROM businesses
      WHERE id = ${params.id}
      AND claimed_by = ${session.user.id}
      AND claim_status = 'claimed'
    `;

    if (!business) {
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

    // Update location
    await sql`
      UPDATE locations SET
        show_exact_address = ${showExactAddress},
        exact_address = ${
          showExactAddress && exactAddress
            ? `${exactAddress}, ${exactCity}, ${exactState} ${exactZip}`
            : null
        },
        updated_at = NOW()
      WHERE business_id = ${params.id}
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