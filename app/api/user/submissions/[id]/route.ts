import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { buildSocialUrls } from
  "@/lib/utils/buildSocialUrls";

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
      SELECT b.*
      FROM businesses b
      WHERE b.id = ${id}
      AND b.status IN ('pending', 'listed')
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Submission not found or not editable" },
        { status: 404 }
      );
    }

    const business = result[0];

    // Claimed listings can only be edited by their verified owner.
    if (
      business.claim_status === "claimed" &&
      business.claimed_by !== session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "This listing is managed by its verified owner and can't be edited.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      business
    });

  } catch (error) {
    console.error("Submission GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

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

    // Allow editing pending and listed submissions
    const existing = await sql`
      SELECT id, status, claim_status, claimed_by
      FROM businesses
      WHERE id = ${id}
      AND status IN ('pending', 'listed')
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: "Submission not found or not editable" },
        { status: 404 }
      );
    }

    // Claimed listings can only be edited by their verified owner.
    if (
      existing[0].claim_status === "claimed" &&
      existing[0].claimed_by !== session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "This listing is managed by its verified owner and can't be edited.",
        },
        { status: 403 }
      );
    }

    const wasListed = existing[0].status === 'listed';
    const data = await req.json();
    const socialUrls = buildSocialUrls(data);

    await sql`
      UPDATE businesses SET
        name               = ${data.name?.trim() || null},
        description        = ${data.description?.trim() || null},
        category           = ${data.category || null},
        price_tier         = ${data.priceTier || null},
        price_context      = ${data.priceContext || null},
        website            = ${socialUrls.website || null},
        instagram          = ${socialUrls.instagram || null},
        facebook           = ${socialUrls.facebook || null},
        tiktok             = ${socialUrls.tiktok || null},
        twitter            = ${socialUrls.twitter || null},
        youtube            = ${socialUrls.youtube || null},
        email              = ${data.email || null},
        phone              = ${data.phone || null},
        payment_options    = ${data.paymentOptions || []},
        ordering_methods   = ${data.orderingMethods || []},
        dietary_options    = ${data.dietaryOptions || []},
        business_amenities = ${data.businessAmenities || []},
        status             = 'pending',
        updated_at         = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      wasListed,
    });

  } catch (error) {
    console.error("Submission PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}