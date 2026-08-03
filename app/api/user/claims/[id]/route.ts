import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Claim statuses the claimant may clear out of My Submissions themselves.
//
// A REJECTED claim is a dead record: rejectClaim already set the business back
// to 'unclaimed' and notified the user, so the row grants nothing and blocks
// nothing — it is only history the claimant is entitled to stop looking at.
//
// 'pending' is excluded deliberately: it is under review and the business is
// sitting at claim_status='pending' because of it, so deleting the row would
// strand the listing in a pending state with no claim behind it. Withdrawing a
// live claim is a different action (it would have to reset the business too)
// and is not what this route does.
//
// 'approved' is excluded because the claim is the record of verified ownership
// — businesses.claimed_by points at this user precisely because this row exists.
const DELETABLE_CLAIM_STATUSES = ["rejected"];

// Why a claim couldn't be dismissed, in the claimant's terms. A bare 404 or
// a raw status reads as a bug when the claim is plainly sitting on their
// screen — mirrors notRemovableMessage in the submissions route.
function notDeletableMessage(status: string): string {
  switch (status) {
    case "pending":
      return "This claim is still under review, so it can't be removed yet. " +
        "Contact us if you'd like to withdraw it.";
    case "approved":
      return "This claim is how your ownership of the listing is verified, " +
        "so it can't be removed. Archive the listing instead.";
    default:
      return "This claim can't be removed right now.";
  }
}

/**
 * Dismiss a resolved claim from the user's own history.
 *
 * Scoped to the claimant: the WHERE clause below matches on user_id as well as
 * id, so one user can never delete another's claim by guessing an id. Deleting
 * the row touches nothing else — a rejected claim has already been fully
 * unwound on the businesses side by rejectClaim, so there is no business state
 * to restore here.
 */
export async function DELETE(
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

    // Fetch scoped to this user, then gate on status separately — filtering on
    // status in the WHERE clause would collapse "not your claim" and "wrong
    // status" into one indistinguishable 404.
    const existing = await sql`
      SELECT id, status
      FROM claims
      WHERE id = ${id}
      AND user_id = ${session.user.id}
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: "Claim not found" },
        { status: 404 }
      );
    }

    if (!DELETABLE_CLAIM_STATUSES.includes(existing[0].status)) {
      return NextResponse.json(
        { error: notDeletableMessage(existing[0].status) },
        { status: 409 }
      );
    }

    await sql`
      DELETE FROM claims
      WHERE id = ${id}
      AND user_id = ${session.user.id}
    `;

    return NextResponse.json({
      success: true,
      action: "deleted",
    });

  } catch (error) {
    console.error("Claim DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove claim" },
      { status: 500 }
    );
  }
}
