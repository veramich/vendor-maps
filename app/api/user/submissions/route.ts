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

    const userId = session.user.id;

    // Get submissions by this user
    const submissions = await sql`
      SELECT
        b.id,
        b.name,
        b.slug,
        b.type,
        b.sub_type,
        b.category,
        b.status,
        b.claim_status,
        b.created_at,
        -- A pending row carrying a snapshot is an edit of an already-live
        -- listing (migration 040), so removing it must archive rather than
        -- delete. The UI needs the flag to label the action correctly; the
        -- snapshot itself is large, so only its presence is sent.
        (b.edit_snapshot IS NOT NULL) AS is_live_edit,
        -- Only an archive the user performed themselves is theirs to undo; an
        -- admin takedown also lands on 'unlisted' but must not be reversible
        -- from here. Mirrors the check in the restore route.
        (
          b.status = 'unlisted'
          AND b.unlisted_by = ${userId}
        ) AS can_restore,
        -- claim_status is part of the test, not just claimed_by: a claim that
        -- was revoked or reset can leave claimed_by populated, and the DELETE
        -- handler checks both. Drives the "Verified" badge and the Claimed
        -- tab, so a stale value here would misfile the listing.
        (
          b.claim_status = 'claimed'
          AND b.claimed_by = ${userId}
        ) AS is_verified_owner,
        TRUE AS is_submitter,
        l.city,
        l.state_code
      FROM businesses b
      LEFT JOIN locations l
        ON l.business_id = b.id
      WHERE b.submitted_by = ${userId}
      ORDER BY b.created_at DESC
    `;

    // Get claims by this user. The business's own status comes along so an
    // approved claim can offer the same archive/restore actions a submission
    // gets — a verified owner may take their own listing down (see the DELETE
    // handler). is_submitter distinguishes the case where this user also
    // created the row, in which case the listing already appears in the
    // submissions list above and the claim card should not duplicate its
    // actions.
    const claims = await sql`
      SELECT
        c.id,
        c.business_id,
        c.status,
        c.requested_at,
        c.resolved_at,
        b.name as business_name,
        b.slug as business_slug,
        b.status as business_status,
        b.claim_status,
        (b.submitted_by = ${userId}) AS is_submitter,
        (
          b.status = 'unlisted'
          AND b.unlisted_by = ${userId}
        ) AS can_restore
      FROM claims c
      JOIN businesses b ON b.id = c.business_id
      WHERE c.user_id = ${userId}
      ORDER BY c.requested_at DESC
    `;

    return NextResponse.json({
      submissions,
      claims,
    });

  } catch (error) {
    console.error("Submissions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}