'use server'

import { requireAdmin } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sql from "@/lib/db";

/**
 * Accept a report and take the listing down.
 *
 * The listing goes to 'unlisted' rather than being deleted, for the same reason
 * an owner archive does: reviews and saves belong to other users, and a closed
 * business that reopens should be restorable. unlisted_by is deliberately left
 * NULL — that column marks an OWNER archive, and the restore route uses it to
 * decide what an owner may undo themselves. A moderation takedown must not be
 * self-reversible.
 */
export async function acceptReport(formData: FormData) {
  await requireAdmin();

  const businessId = formData.get("businessId") as string;
  const note       = (formData.get("note") as string) || null;

  await sql`
    UPDATE businesses SET
      status          = 'unlisted',
      unlisted_reason = 'Reported as no longer in service',
      unlisted_at     = NOW(),
      unlisted_by     = NULL,
      updated_at      = NOW()
    WHERE id = ${businessId}
  `;

  // Resolve every open report on this business, not just the one clicked:
  // several people commonly report the same closed shop, and leaving the
  // duplicates open would make the queue re-surface work already done.
  await sql`
    UPDATE business_reports SET
      status          = 'accepted',
      resolved_by     = ${process.env.ADMIN_USER_ID ?? null},
      resolution_note = ${note},
      resolved_at     = NOW()
    WHERE business_id = ${businessId}
    AND status = 'open'
  `;

  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}

/**
 * Dismiss a report — the listing is fine and stays exactly as it is.
 *
 * Only the single report is dismissed here (unlike accept). Separate reports on
 * the same business can have different merit, so the others stay queued.
 */
export async function dismissReport(formData: FormData) {
  await requireAdmin();

  const reportId = formData.get("reportId") as string;
  const note     = (formData.get("note") as string) || null;

  await sql`
    UPDATE business_reports SET
      status          = 'dismissed',
      resolved_by     = ${process.env.ADMIN_USER_ID ?? null},
      resolution_note = ${note},
      resolved_at     = NOW()
    WHERE id = ${reportId}
  `;

  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}
