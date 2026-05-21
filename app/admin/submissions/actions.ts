'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import sql from "@/lib/db";
import { generateSlug } from "@/lib/utils/generateSlug";

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
    SELECT b.name, l.city, l.neighborhood
    FROM businesses b
    LEFT JOIN locations l ON l.business_id = b.id
    WHERE b.id = ${businessId}
  `;

  if (!business.slug) {
    const slug = await generateSlug(
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

  redirect("/admin/submissions");
}

export async function rejectSubmission(formData: FormData) {
  await requireAdmin();

  const businessId = formData.get("businessId") as string;

  await sql`
    UPDATE businesses SET
      status = 'rejected'
    WHERE id = ${businessId}
  `;

  redirect("/admin/submissions");
}

export async function markDuplicate(formData: FormData) {
  await requireAdmin();

  const businessId = formData.get("businessId") as string;

  await sql`
    UPDATE businesses SET
      status = 'duplicate'
    WHERE id = ${businessId}
  `;

  redirect("/admin/submissions");
}
