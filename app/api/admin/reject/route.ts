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
  const businessId = formData.get("businessId") as string;

  await sql`
    UPDATE businesses SET
      status = 'rejected'
    WHERE id = ${businessId}
  `;

  return NextResponse.redirect(
    new URL("/admin/submissions", req.url)
  );
}