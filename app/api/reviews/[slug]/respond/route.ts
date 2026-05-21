import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { reviewId, responseText } = await req.json();

    if (!responseText?.trim()) {
      return NextResponse.json(
        { error: "Response text is required" },
        { status: 400 }
      );
    }

    if (responseText.trim().length < 10) {
      return NextResponse.json(
        { error: "Response must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Verify the user is the claimed owner
    // of this business
    const business = await sql`
      SELECT b.id
      FROM businesses b
      WHERE b.slug = ${slug}
      AND b.claimed_by = ${session.user.id}
      AND b.claim_status = 'claimed'
      AND b.status = 'listed'
    `;

    if (!business || business.length === 0) {
      return NextResponse.json(
        { error: "You are not authorized to respond to reviews for this business" },
        { status: 403 }
      );
    }

    // Verify the review belongs to this business
    const review = await sql`
      SELECT r.id
      FROM reviews r
      WHERE r.id = ${reviewId}
      AND r.business_id = ${business[0].id}
      AND r.status = 'approved'
    `;

    if (!review || review.length === 0) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Check if response already exists
    const existing = await sql`
      SELECT id FROM review_responses
      WHERE review_id = ${reviewId}
    `;

    if (existing.length > 0) {
      // Update existing response
      await sql`
        UPDATE review_responses SET
          response_text = ${responseText.trim()},
          is_edited     = true,
          edited_at     = NOW(),
          updated_at    = NOW()
        WHERE review_id = ${reviewId}
      `;
    } else {
      // Insert new response
      await sql`
        INSERT INTO review_responses (
          review_id,
          owner_id,
          response_text,
          is_edited,
          status,
          flagged,
          created_at,
          updated_at
        ) VALUES (
          ${reviewId},
          ${session.user.id},
          ${responseText.trim()},
          false,
          'published',
          false,
          NOW(),
          NOW()
        )
      `;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Review response error:", error);
    return NextResponse.json(
      { error: "Failed to submit response" },
      { status: 500 }
    );
  }
}