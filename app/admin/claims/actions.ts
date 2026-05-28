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

  await sql`
    UPDATE businesses SET
      claim_status = 'claimed',
      claimed_by   = ${userId}
    WHERE id = ${businessId}
  `;

  redirect("/admin/claims");
}

export async function rejectClaim(formData: FormData) {
  await requireAdmin();

  const claimId    = formData.get("claimId") as string;
  const businessId = formData.get("businessId") as string;

  await sql`
    UPDATE claims SET
      status      = 'rejected',
      resolved_at = NOW()
    WHERE id = ${claimId}
  `;

  await sql`
    UPDATE businesses SET
      claim_status = 'unclaimed'
    WHERE id = ${businessId}
  `;

  redirect("/admin/claims");
}
