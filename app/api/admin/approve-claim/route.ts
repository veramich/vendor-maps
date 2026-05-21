import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (
    !session ||
    session.user.id !== process.env.ADMIN_USER_ID
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const formData = await req.formData();
  const claimId    = formData.get("claimId") as string;
  const businessId = formData.get("businessId") as string;
  const userId     = formData.get("userId") as string;

  // Approve claim
  await sql`
  UPDATE claims SET
    status      = 'approved',
    resolved_at = NOW()
  WHERE id = ${claimId}
`;

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

  return NextResponse.redirect(
    new URL("/admin/claims", req.url)
  );
}