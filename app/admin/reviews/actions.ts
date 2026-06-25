'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import sql from "@/lib/db";
import { createNotification } from "@/lib/notifications";

type ReviewTarget = {
  user_id: string;
  name: string;
  slug: string | null;
};

/** Resolve the review author + the business it's on, for notifications. */
async function reviewTarget(reviewId: string): Promise<ReviewTarget | null> {
  const [row] = await sql<ReviewTarget[]>`
    SELECT r.user_id, b.name, b.slug
    FROM reviews r
    JOIN businesses b ON b.id = r.business_id
    WHERE r.id = ${reviewId}
  `;
  return row ?? null;
}

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

  const target = await reviewTarget(reviewId);
  if (target) {
    await createNotification({
      userId: target.user_id,
      type: "review_approved",
      title: `Your review of ${target.name} is live`,
      body: "Thanks for sharing — your review is now published on VendorMaps.",
      link: target.slug ? `/${target.slug}` : "/directory",
      data: { reviewId },
    });
  }

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

  const target = await reviewTarget(reviewId);
  if (target) {
    await createNotification({
      userId: target.user_id,
      type: "review_rejected",
      title: `Your review of ${target.name} wasn't published`,
      body: "It didn't meet our review guidelines. Contact us if you have questions.",
      link: "/contact",
      data: { reviewId },
    });
  }

  redirect("/admin/reviews");
}
