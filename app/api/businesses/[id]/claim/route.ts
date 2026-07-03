import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sendAdminSubmissionAlert } from "@/lib/email";

// GET — fetch business info for claim page
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      SELECT
        b.id,
        b.name,
        b.slug,
        b.claim_status,
        l.city,
        l.state_code
      FROM businesses b
      LEFT JOIN locations l
        ON l.business_id = b.id
      WHERE b.id = ${id}
      AND b.status = 'listed'
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const business = result[0];

    if (business.claim_status === "claimed") {
      return NextResponse.json(
        { error: "This business has already been claimed" },
        { status: 400 }
      );
    }

    return NextResponse.json({ business });

  } catch (error) {
    console.error("Claim GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch business" },
      { status: 500 }
    );
  }
}

// POST — submit a claim
export async function POST(
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
        { error: "You must be signed in to claim a business" },
        { status: 401 }
      );
    }

    const { contactInfo } = await req.json();

    if (!contactInfo?.trim()) {
      return NextResponse.json(
        { error: "Contact information is required" },
        { status: 400 }
      );
    }

    // Check business exists and is not claimed
    const result = await sql`
      SELECT id, name, claim_status
      FROM businesses
      WHERE id = ${id}
      AND status = 'listed'
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const business = result[0];

    if (business.claim_status === "claimed") {
      return NextResponse.json(
        { error: "This business has already been claimed" },
        { status: 400 }
      );
    }

    // Check if user already has a pending claim
    const existingClaim = await sql`
      SELECT id FROM claims
      WHERE business_id = ${id}
      AND user_id = ${session.user.id}
      AND status = 'pending'
    `;

    if (existingClaim.length > 0) {
      return NextResponse.json(
        { error: "You already have a pending claim for this business" },
        { status: 400 }
      );
    }

    // Create claim
    await sql`
      INSERT INTO claims (
        business_id,
        user_id,
        claim_contact,
        status,
        requested_at
      ) VALUES (
        ${id},
        ${session.user.id},
        ${contactInfo.trim()},
        'pending',
        NOW()
      )
    `;

    // Update business claim status
    await sql`
      UPDATE businesses
      SET claim_status = 'pending'
      WHERE id = ${id}
    `;

    // Nudge the moderation inbox. Fire-and-forget — the sender swallows its
    // own errors and no-ops without an admin address, so it never affects
    // the claim response.
    await sendAdminSubmissionAlert({
      itemName: business.name,
      kind: "claim",
      submittedBy: session.user.email,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Claim POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit claim" },
      { status: 500 }
    );
  }
}