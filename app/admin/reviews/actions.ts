'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import sql from "@/lib/db";

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

export async function approveReview(formData: FormData) {
  await requireAdmin();

  const reviewId = formData.get("reviewId") as string;

  await sql`
    UPDATE reviews SET
      status     = 'approved',
      updated_at = NOW()
    WHERE id = ${reviewId}
  `;

  redirect("/admin/reviews");
}

export async function rejectReview(formData: FormData) {
  await requireAdmin();

  const reviewId = formData.get("reviewId") as string;

  await sql`
    UPDATE reviews SET
      status     = 'rejected',
      updated_at = NOW()
    WHERE id = ${reviewId}
  `;

  redirect("/admin/reviews");
}
