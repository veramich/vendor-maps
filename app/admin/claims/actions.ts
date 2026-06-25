'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import sql from "@/lib/db";
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

export async function approveClaim(formData: FormData) {
  await requireAdmin();

  const claimId    = formData.get("claimId") as string;
  const businessId = formData.get("businessId") as string;
  const userId     = formData.get("userId") as string;

  await sql`
    UPDATE claims SET
      status      = 'approved',
      resolved_at = NOW()
    WHERE id = ${claimId}
  `;

  const [business] = await sql<{ name: string; slug: string | null }[]>`
    UPDATE businesses SET
      claim_status = 'claimed',
      claimed_by   = ${userId}
    WHERE id = ${businessId}
    RETURNING name, slug
  `;

  if (business) {
    await createNotification({
      userId,
      type: "claim_approved",
      title: `You now manage ${business.name}`,
      body: "Your claim was approved. You can now edit this listing on VendorMaps.",
      link: business.slug ? `/${business.slug}` : "/profile",
      data: { businessId, claimId },
    });
  }

  redirect("/admin/claims");
}

export async function rejectClaim(formData: FormData) {
  await requireAdmin();

  const claimId    = formData.get("claimId") as string;
  const businessId = formData.get("businessId") as string;

  const [claim] = await sql<{ user_id: string }[]>`
    UPDATE claims SET
      status      = 'rejected',
      resolved_at = NOW()
    WHERE id = ${claimId}
    RETURNING user_id
  `;

  const [business] = await sql<{ name: string }[]>`
    UPDATE businesses SET
      claim_status = 'unclaimed'
    WHERE id = ${businessId}
    RETURNING name
  `;

  if (claim) {
    await createNotification({
      userId: claim.user_id,
      type: "claim_rejected",
      title: `Your claim for ${business?.name ?? "a business"} wasn't approved`,
      body: "We couldn't verify your ownership of this listing. Contact us if you have questions.",
      link: "/contact",
      data: { businessId, claimId },
    });
  }

  redirect("/admin/claims");
}
