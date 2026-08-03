import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const VALID_REASONS = [
  "closed",
  "moved",
  "wrong_info",
  "duplicate",
  "inappropriate",
  "other",
];

/**
 * Flag a listing for admin review — "this business is no longer in service".
 *
 * Open to everyone, including logged-out visitors: the person who walked up to
 * a shuttered storefront usually has no account, and requiring sign-in would
 * lose most of the signal this is meant to collect.
 *
 * This NEVER changes the listing's status. A report only queues a signal for an
 * admin to verify. Letting a stranger take a business off the map directly
 * would be a trivial way to sabotage a competitor, and a vendor's livelihood
 * depends on staying listed. Removal stays a human decision.
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
    const reportedBy = session?.user?.id || null;

    // First IP from x-forwarded-for, matching the submit route.
    const ip =
      req.headers.get("x-forwarded-for")
        ?.split(",")[0].trim()
      || "unknown";

    const body = await req.json().catch(() => ({}));

    const reason = VALID_REASONS.includes(body.reason)
      ? body.reason
      : "closed";

    // Strip tags and cap length — this text is read in the admin queue.
    const details =
      typeof body.details === "string" && body.details.trim()
        ? body.details
            .replace(/<[^>]*>/g, "")
            .trim()
            .slice(0, 1000)
        : null;

    // Only a live listing can be reported. Anything else is already invisible
    // to the public, so a report on it would be noise in the queue.
    const existing = await sql`
      SELECT id, name, status
      FROM businesses
      WHERE id = ${id}
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (existing[0].status !== "listed") {
      return NextResponse.json(
        { error: "This listing isn't currently live." },
        { status: 409 }
      );
    }

    // Anonymous abuse control: cap reports per IP per day. Signed-in users are
    // instead limited to one open report per business by a partial unique index
    // (migration 042), which is both stricter and cheaper to enforce.
    if (!reportedBy) {
      const recent = await sql`
        SELECT COUNT(*) AS count
        FROM business_reports
        WHERE reporter_ip = ${ip}
        AND created_at > NOW() - INTERVAL '24 hours'
      `;

      if (Number(recent[0].count) >= 5) {
        return NextResponse.json(
          {
            error:
              "You've reported several listings today. Please try again tomorrow.",
          },
          { status: 429 }
        );
      }
    }

    // A signed-in user re-reporting the same business is not an error worth
    // showing: ON CONFLICT DO NOTHING makes the request idempotent, and the
    // response below reads the same either way, so the reporter can't probe
    // whether their earlier report exists.
    await sql`
      INSERT INTO business_reports (
        business_id, reason, details, reported_by, reporter_ip
      ) VALUES (
        ${id},
        ${reason},
        ${details},
        ${reportedBy},
        ${ip}
      )
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Business report error:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}
