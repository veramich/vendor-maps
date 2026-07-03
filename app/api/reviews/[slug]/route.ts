import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import sql, { isPgError } from "@/lib/db";
import { sendAdminSubmissionAlert } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "You must be signed in to submit a review" },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const { stars, reviewText } = await req.json();

  if (!stars || stars < 1 || stars > 5) {
    return NextResponse.json(
      { error: "Please select a star rating" },
      { status: 400 }
    );
  }

  if (!reviewText || reviewText.trim().length < 25) {
    return NextResponse.json(
      { error: "Review must be at least 25 characters" },
      { status: 400 }
    );
  }

  const business = await sql`
    SELECT id, name FROM businesses
    WHERE slug = ${slug} AND status = 'listed'
  `;

  if (!business || business.length === 0) {
    return NextResponse.json(
      { error: "Business not found" },
      { status: 404 }
    );
  }

  try {
    await sql`
      INSERT INTO reviews (
        business_id,
        user_id,
        user_email,
        stars,
        review_text
      ) VALUES (
        ${business[0].id},
        ${session.user.id},
        ${session.user.email},
        ${stars},
        ${reviewText.trim()}
      )
    `;
  } catch (err) {
    if (isPgError(err) && err.code === "23505") {
      return NextResponse.json(
        { error: "You have already reviewed this business" },
        { status: 409 }
      );
    }
    throw err;
  }

  // Nudge the moderation inbox — reviews are held for approval. Fire-and-
  // forget; the sender swallows its own errors and no-ops without an admin
  // address, so it never affects the review response. Only reached when the
  // insert succeeds (the duplicate case early-returns above).
  await sendAdminSubmissionAlert({
    itemName: business[0].name,
    kind: "review",
    submittedBy: session.user.email,
  });

  return NextResponse.json({ success: true });
}
