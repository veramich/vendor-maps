import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import sql from "@/lib/db";
import { generateSlug } from "@/lib/utils/generateSlug";

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

  // Get business details for slug
  const [business] = await sql`
    SELECT b.name, l.city, l.neighborhood
    FROM businesses b
    LEFT JOIN locations l ON l.business_id = b.id
    WHERE b.id = ${businessId}
  `;

  // Generate slug if not already set
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

  return NextResponse.redirect(
    new URL("/admin/submissions", req.url)
  );
}