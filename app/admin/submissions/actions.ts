'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import sql from "@/lib/db";
import { generateSlug } from "@/lib/utils/generateSlug";
import { createNotification } from "@/lib/notifications";
import {
  restoreListingSnapshot,
  purgeRemovedSnapshotImages,
  type ListingSnapshot,
} from "@/lib/listingSnapshot";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (
    !session ||
    session.user.id !== process.env.ADMIN_USER_ID
  ) {
    redirect("/");
  }
}

export async function approveSubmission(formData: FormData) {
  await requireAdmin();

  const businessId = formData.get("businessId") as string;

  const [business] = await sql`
    SELECT b.name, b.slug, b.submitted_by, b.edit_snapshot, l.city, l.neighborhood
    FROM businesses b
    LEFT JOIN locations l ON l.business_id = b.id
    WHERE b.id = ${businessId}
  `;

  // Approving an edit accepts the new photo set: the pre-edit assets the edit
  // route deferred deleting are now truly orphaned, so purge them from
  // Cloudinary. (No-op for a new submission, which has no snapshot.)
  if (business.edit_snapshot) {
    await purgeRemovedSnapshotImages(
      businessId,
      business.edit_snapshot as ListingSnapshot
    );
  }

  let slug = business.slug;

  if (!slug) {
    slug = await generateSlug(
      business.name,
      business.city,
      business.neighborhood
    );

    await sql`
      UPDATE businesses SET
        status        = 'listed',
        slug          = ${slug},
        edit_snapshot = NULL,
        edited_at     = NULL
      WHERE id = ${businessId}
    `;
  } else {
    await sql`
      UPDATE businesses SET
        status        = 'listed',
        edit_snapshot = NULL,
        edited_at     = NULL
      WHERE id = ${businessId}
    `;
  }

  if (business.submitted_by) {
    await createNotification({
      userId: business.submitted_by,
      type: "submission_approved",
      title: `${business.name} is now listed`,
      body: "Your submission was approved and is live on VendorMaps.",
      link: `/${slug}`,
      data: { businessId, slug },
    });
  }

  redirect("/admin/submissions");
}

export async function rejectSubmission(formData: FormData) {
  await requireAdmin();

  const businessId = formData.get("businessId") as string;
  const message = (formData.get("message") as string | null)?.trim() || null;

  const [business] = await sql`
    SELECT name, slug, submitted_by, edit_snapshot
    FROM businesses
    WHERE id = ${businessId}
  `;

  // An edit of a previously-live listing carries a snapshot of the values that
  // were live before the edit. Rejecting such an edit rolls the listing back to
  // that snapshot and keeps it listed, rather than taking a live business
  // offline. A brand-new submission (no snapshot) is rejected outright.
  if (business?.edit_snapshot) {
    await restoreListingSnapshot(
      businessId,
      business.edit_snapshot as ListingSnapshot
    );
    await sql`
      UPDATE businesses SET
        status        = 'listed',
        edit_snapshot = NULL,
        edited_at     = NULL
      WHERE id = ${businessId}
    `;

    if (business.submitted_by) {
      await createNotification({
        userId: business.submitted_by,
        type: "submission_rejected",
        title: `Your edits to ${business.name} weren't approved`,
        body:
          message ??
          "Your changes didn't meet our listing guidelines, so the listing was kept as it was. Contact us if you have questions.",
        link: business.slug ? `/${business.slug}` : "/contact",
        data: { businessId },
      });
    }

    redirect("/admin/submissions");
  }

  // Taking the listing down also retires any claim on it. A claim only grants
  // ownership of a live listing, so leaving claim_status='claimed' on a
  // rejected business strands the owner: "My Listings" filters on
  // status='listed' and the edit route on status IN ('pending','listed'), so
  // the listing silently vanishes from both while still looking claimed.
  await sql`
    UPDATE businesses SET
      status        = 'rejected',
      claim_status  = 'unclaimed',
      claimed_by    = NULL,
      edit_snapshot = NULL,
      edited_at     = NULL
    WHERE id = ${businessId}
  `;

  // Retire the live claims. This is a DELETE rather than a flip to 'rejected'
  // because claims carries UNIQUE(business_id, status): a business that already
  // has a rejected claim from an earlier round would hit a 23505 duplicate-key
  // error on the update. The claim is moot once the listing is gone, and the
  // claimant is told via the notification below.
  await sql`
    DELETE FROM claims
    WHERE business_id = ${businessId}
    AND status IN ('pending', 'approved')
  `;

  if (business?.submitted_by) {
    await createNotification({
      userId: business.submitted_by,
      type: "submission_rejected",
      title: `${business.name} wasn't approved`,
      body:
        message ??
        "Your submission didn't meet our listing guidelines. Contact us if you have questions.",
      link: "/contact",
      data: { businessId },
    });
  }

  redirect("/admin/submissions");
}

export async function markDuplicate(formData: FormData) {
  await requireAdmin();

  const businessId = formData.get("businessId") as string;

  const [business] = await sql`
    SELECT name, submitted_by, edit_snapshot
    FROM businesses
    WHERE id = ${businessId}
  `;

  // If a snapshot is present (an edit), the deferred pre-edit assets are no
  // longer reachable once this becomes a duplicate — purge them so they don't
  // leak on Cloudinary.
  if (business?.edit_snapshot) {
    await purgeRemovedSnapshotImages(
      businessId,
      business.edit_snapshot as ListingSnapshot
    );
  }

  // Same reasoning as rejectSubmission: a duplicate is no longer a live
  // listing, so it must not stay claimed by anyone.
  await sql`
    UPDATE businesses SET
      status        = 'duplicate',
      claim_status  = 'unclaimed',
      claimed_by    = NULL,
      edit_snapshot = NULL,
      edited_at     = NULL
    WHERE id = ${businessId}
  `;

  // Retire the live claims. This is a DELETE rather than a flip to 'rejected'
  // because claims carries UNIQUE(business_id, status): a business that already
  // has a rejected claim from an earlier round would hit a 23505 duplicate-key
  // error on the update. The claim is moot once the listing is gone, and the
  // claimant is told via the notification below.
  await sql`
    DELETE FROM claims
    WHERE business_id = ${businessId}
    AND status IN ('pending', 'approved')
  `;

  if (business?.submitted_by) {
    await createNotification({
      userId: business.submitted_by,
      type: "submission_duplicate",
      title: `${business.name} is already listed`,
      body: "This business is already on VendorMaps, so we marked your submission as a duplicate.",
      link: "/directory",
      data: { businessId },
    });
  }

  redirect("/admin/submissions");
}
