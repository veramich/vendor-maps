'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import sql from "@/lib/db";
import { generateSlug } from "@/lib/utils/generateSlug";
import { createNotification } from "@/lib/notifications";

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
    SELECT b.name, b.slug, b.submitted_by, l.city, l.neighborhood
    FROM businesses b
    LEFT JOIN locations l ON l.business_id = b.id
    WHERE b.id = ${businessId}
  `;

  let slug = business.slug;

  if (!slug) {
    slug = await generateSlug(
      business.name,
      business.city,
      business.neighborhood
    );

    await sql`
      UPDATE businesses SET
        status = 'listed',
        slug   = ${slug}
      WHERE id = ${businessId}
    `;
  } else {
    await sql`
      UPDATE businesses SET
        status = 'listed'
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

  const [business] = await sql`
    SELECT name, submitted_by
    FROM businesses
    WHERE id = ${businessId}
  `;

  await sql`
    UPDATE businesses SET
      status = 'rejected'
    WHERE id = ${businessId}
  `;

  if (business?.submitted_by) {
    await createNotification({
      userId: business.submitted_by,
      type: "submission_rejected",
      title: `${business.name} wasn't approved`,
      body: "Your submission didn't meet our listing guidelines. Contact us if you have questions.",
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
    SELECT name, submitted_by
    FROM businesses
    WHERE id = ${businessId}
  `;

  await sql`
    UPDATE businesses SET
      status = 'duplicate'
    WHERE id = ${businessId}
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
