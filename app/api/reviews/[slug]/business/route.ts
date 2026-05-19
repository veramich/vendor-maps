import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const result = await sql`
      SELECT
        b.id,
        b.name,
        b.slug,
        b.category,
        b.logo_url
      FROM businesses b
      WHERE b.slug = ${slug}
      AND b.status = 'listed'
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      business: result[0]
    });

  } catch (error) {
    console.error("Review business GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch business" },
      { status: 500 }
    );
  }
}