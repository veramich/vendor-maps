'use server'

import { requireAdmin } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sql from "@/lib/db";
import cloudinary from "@/lib/cloudinary";

/**
 * Take any listing off the site without destroying it.
 *
 * Unlike deleteEvent this works on every type, because it is non-destructive:
 * the row and all its children survive, and the listing simply stops matching
 * the status='listed' filter every public surface applies. That makes it the
 * right default for admin takedowns — a closed shop, a listing under dispute,
 * a business that asked to be removed — where a delete would also destroy
 * reviews written by other users.
 *
 * unlisted_by is deliberately left NULL. That column marks an OWNER archive,
 * and the owner-facing restore route (app/api/user/submissions/[id]/restore)
 * only restores rows where unlisted_by matches the requester. Leaving it NULL
 * is what stops a submitter from one-click reversing a moderation decision.
 */
export async function archiveBusiness(formData: FormData) {
  await requireAdmin();

  const id = formData.get("businessId") as string;
  const reason = (formData.get("reason") as string)?.trim() || null;

  if (!id) {
    throw new Error("Missing business id");
  }

  const [business] = await sql<{ name: string; slug: string | null }[]>`
    SELECT name, slug FROM businesses WHERE id = ${id}
  `;

  if (!business) {
    throw new Error("Business not found");
  }

  // Ownership (claim_status/claimed_by) and the claims rows are left intact,
  // for the same reason the owner archive leaves them: archiving is meant to
  // be reversible, and clearing them would force a verified owner back through
  // the whole claim process if the listing is ever restored.
  await sql`
    UPDATE businesses SET
      status          = 'unlisted',
      unlisted_reason = ${reason ?? "Unlisted by admin"},
      unlisted_at     = NOW(),
      unlisted_by     = NULL,
      updated_at      = NOW()
    WHERE id = ${id}
  `;

  // Any open report on this listing is now resolved — the listing is down, so
  // leaving them queued would re-surface work already done.
  await sql`
    UPDATE business_reports SET
      status      = 'accepted',
      resolved_by = ${process.env.ADMIN_USER_ID ?? null},
      resolved_at = NOW()
    WHERE business_id = ${id}
    AND status = 'open'
  `;

  revalidatePath("/admin/businesses");
  revalidatePath("/admin/reports");
  revalidatePath("/directory");
  revalidatePath("/events");
  revalidatePath("/");
  if (business.slug) revalidatePath(`/${business.slug}`);

  redirect("/admin/businesses");
}

/**
 * Put an archived listing back online.
 *
 * Restores to 'listed' regardless of who archived it — an admin can undo both
 * their own takedowns and an owner's. Clearing unlisted_by here is harmless
 * since the row is no longer unlisted at all.
 */
export async function restoreBusiness(formData: FormData) {
  await requireAdmin();

  const id = formData.get("businessId") as string;

  if (!id) {
    throw new Error("Missing business id");
  }

  const [business] = await sql<
    { name: string; slug: string | null; status: string }[]
  >`
    SELECT name, slug, status FROM businesses WHERE id = ${id}
  `;

  if (!business) {
    throw new Error("Business not found");
  }

  // Only an archived listing can be restored. Flipping a rejected or duplicate
  // row straight to 'listed' from here would bypass the moderation queue that
  // put it in that state.
  if (business.status !== "unlisted") {
    throw new Error(
      `Only an unlisted business can be restored (this one is "${business.status}").`
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

  revalidatePath("/admin/businesses");
  revalidatePath("/directory");
  revalidatePath("/events");
  revalidatePath("/");
  if (business.slug) revalidatePath(`/${business.slug}`);

  redirect("/admin/businesses");
}

export async function deleteEvent(formData: FormData) {
  await requireAdmin();

  const id = formData.get("businessId") as string;
  const confirmName = formData.get("confirmName") as string;

  if (!id) {
    throw new Error("Missing business id");
  }

  // Re-read from the DB rather than trusting anything else the form sent.
  // Only type='event' rows are deletable here — this action must not become
  // a way to remove permanent listings.
  const [business] = await sql<{ name: string; slug: string | null }[]>`
    SELECT name, slug FROM businesses
    WHERE id = ${id} AND type = 'event'
  `;

  if (!business) {
    throw new Error("Event not found (or is not an event)");
  }

  // Typed-name confirmation: the destructive step needs a deliberate act,
  // not a single click that can be fired by a stray POST.
  if (confirmName !== business.name) {
    throw new Error(
      `Name confirmation did not match. Type "${business.name}" exactly to delete.`
    );
  }

  const images = await sql<{ cloudinary_public_id: string | null }[]>`
    SELECT cloudinary_public_id FROM business_images
    WHERE business_id = ${id}
  `;

  // Every child table (locations, popup_events, business_images, reviews,
  // claims, …) is ON DELETE CASCADE, so one delete clears the DB side.
  await sql`DELETE FROM businesses WHERE id = ${id}`;

  // Cloudinary isn't covered by the cascade. Clean up after the row is gone,
  // best-effort: a hiccup here must not resurrect the listing.
  for (const img of images) {
    if (!img.cloudinary_public_id) continue;
    try {
      await cloudinary.uploader.destroy(img.cloudinary_public_id);
    } catch (err) {
      console.error(
        `Cloudinary cleanup failed for ${img.cloudinary_public_id}`,
        err
      );
    }
  }

  revalidatePath("/admin/businesses");
  revalidatePath("/events");
  revalidatePath("/");
  if (business.slug) revalidatePath(`/${business.slug}`);

  redirect("/admin/businesses");
}
