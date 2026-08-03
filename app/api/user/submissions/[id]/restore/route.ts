import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Put an owner-archived listing back online.
 *
 * This is the inverse of the archive branch in ../route.ts, and it is only
 * possible because archiving destroys nothing: the photos, reviews, hours,
 * location and verified ownership are all still attached to the row, so
 * restoring is a single status flip rather than a resubmission.
 *
 * Two deliberate restrictions:
 *
 *   * Submitter only — the same person who was allowed to archive it. A
 *     claimant who did not submit the listing cannot resurrect it.
 *
 *   * Only a listing the OWNER archived (unlisted_by = this user). An admin
 *     takedown also lands on status='unlisted', and letting an owner undo a
 *     moderation decision with one click would defeat it entirely. Those come
 *     back through support instead.
 *
 * The listing returns to 'listed' rather than 'pending': it was already
 * approved, and nothing about it changed while archived, so there is nothing
 * for an admin to re-review. An owner who edits it afterwards goes through the
 * normal pending flow.
 */
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
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existing = await sql`
      SELECT id, name, slug, status, submitted_by, unlisted_by
      FROM businesses
      WHERE id = ${id}
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const business = existing[0];

    if (
      business.submitted_by == null ||
      business.submitted_by !== session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Only the person who originally submitted this listing can restore it.",
        },
        { status: 403 }
      );
    }

    if (business.status !== "unlisted") {
      return NextResponse.json(
        {
          error:
            business.status === "listed"
              ? "This listing is already live."
              : "This listing isn't archived, so it can't be restored.",
        },
        { status: 409 }
      );
    }

    // An admin takedown is not the owner's to undo — see the note above.
    if (business.unlisted_by !== session.user.id) {
      return NextResponse.json(
        {
          error:
            "This listing was taken down by our team, so it can't be restored " +
            "from here. Contact us if you think that was a mistake.",
        },
        { status: 403 }
      );
    }

    await sql`
      UPDATE businesses SET
        status          = 'listed',
        unlisted_reason = NULL,
        unlisted_at     = NULL,
        unlisted_by     = NULL,
        updated_at      = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      slug: business.slug,
    });

  } catch (error) {
    console.error("Submission restore error:", error);
    return NextResponse.json(
      { error: "Failed to restore listing" },
      { status: 500 }
    );
  }
}
