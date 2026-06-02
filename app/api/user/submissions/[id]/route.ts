import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { buildSocialUrls } from
  "@/lib/utils/buildSocialUrls";
import { uploadImage } from "@/lib/utils/uploadImage";
import cloudinary from "@/lib/cloudinary";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await sql`
      SELECT b.*
      FROM businesses b
      WHERE b.id = ${id}
      AND b.status IN ('pending', 'listed')
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "Submission not found or not editable" },
        { status: 404 }
      );
    }

    const business = result[0];

    // Claimed listings can only be edited by their verified owner.
    if (
      business.claim_status === "claimed" &&
      business.claimed_by !== session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "This listing is managed by its verified owner and can't be edited.",
        },
        { status: 403 }
      );
    }

    // Return already-uploaded photos so the edit form can show and manage
    // them (kept/removed), ordered the same way as the public listing.
    const images = await sql`
      SELECT id, cloudinary_url
      FROM business_images
      WHERE business_id = ${business.id}
      ORDER BY is_primary DESC, display_order ASC
    `;

    return NextResponse.json({
      business: {
        ...business,
        existingImages: images.map(img => ({
          id:  img.id,
          url: img.cloudinary_url,
        })),
      },
    });

  } catch (error) {
    console.error("Submission GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Allow editing pending and listed submissions
    const existing = await sql`
      SELECT id, status, claim_status, claimed_by
      FROM businesses
      WHERE id = ${id}
      AND status IN ('pending', 'listed')
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: "Submission not found or not editable" },
        { status: 404 }
      );
    }

    // Claimed listings can only be edited by their verified owner.
    if (
      existing[0].claim_status === "claimed" &&
      existing[0].claimed_by !== session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "This listing is managed by its verified owner and can't be edited.",
        },
        { status: 403 }
      );
    }

    const wasListed = existing[0].status === 'listed';

    // The edit form submits multipart (text fields as a JSON "data" blob,
    // kept image ids as JSON, plus new image files). Older callers may still
    // send raw JSON, so fall back to that.
    const contentType = req.headers.get("content-type") || "";
    let data: any;
    let keptImageIds: string[] | null = null;
    const newImageFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      data = JSON.parse((form.get("data") as string) || "{}");

      const keptRaw = form.get("keptImageIds");
      if (typeof keptRaw === "string") {
        try {
          keptImageIds = JSON.parse(keptRaw);
        } catch {
          keptImageIds = [];
        }
      }

      let i = 0;
      while (form.get(`image_${i}`)) {
        newImageFiles.push(form.get(`image_${i}`) as File);
        i++;
      }
    } else {
      data = await req.json();
    }

    const socialUrls = buildSocialUrls(data);

    await sql`
      UPDATE businesses SET
        name               = ${data.name?.trim() || null},
        description        = ${data.description?.trim() || null},
        category           = ${data.category || null},
        price_tier         = ${data.priceTier || null},
        price_context      = ${data.priceContext || null},
        website            = ${socialUrls.website || null},
        instagram          = ${socialUrls.instagram || null},
        facebook           = ${socialUrls.facebook || null},
        tiktok             = ${socialUrls.tiktok || null},
        twitter            = ${socialUrls.twitter || null},
        youtube            = ${socialUrls.youtube || null},
        email              = ${data.email || null},
        phone              = ${data.phone || null},
        payment_options    = ${data.paymentOptions || []},
        ordering_methods   = ${data.orderingMethods || []},
        dietary_options    = ${data.dietaryOptions || []},
        business_amenities = ${data.businessAmenities || []},
        status             = 'pending',
        updated_at         = NOW()
      WHERE id = ${id}
    `;

    // Reconcile photos (only when the multipart edit form sent them).
    if (keptImageIds !== null) {
      // Delete any existing image the user removed — from Cloudinary too.
      const current = await sql`
        SELECT id, cloudinary_public_id
        FROM business_images
        WHERE business_id = ${id}
      `;

      const removed = current.filter(
        img => !keptImageIds!.includes(img.id)
      );

      for (const img of removed) {
        try {
          await cloudinary.uploader.destroy(
            img.cloudinary_public_id
          );
        } catch (err) {
          // Don't fail the whole save if Cloudinary cleanup hiccups;
          // the DB row is still removed below.
          console.error(
            "Cloudinary destroy failed:",
            img.cloudinary_public_id,
            err
          );
        }
      }

      if (removed.length > 0) {
        await sql`
          DELETE FROM business_images
          WHERE business_id = ${id}
          AND id = ANY(${removed.map(r => r.id)})
        `;
      }

      // Upload newly added files, capturing their new ids in upload order.
      const newImageIds: string[] = [];
      for (const file of newImageFiles) {
        const uploaded = await uploadImage(file, "businesses");
        const [inserted] = await sql`
          INSERT INTO business_images (
            business_id,
            cloudinary_public_id,
            cloudinary_url,
            image_type
          ) VALUES (
            ${id},
            ${uploaded.publicId},
            ${uploaded.url},
            'gallery'
          )
          RETURNING id
        `;
        newImageIds.push(inserted.id);
      }

      // Final order = kept images (in the order the user left them) followed
      // by the new uploads. First image is the cover.
      const finalOrder = [...keptImageIds, ...newImageIds];

      for (let idx = 0; idx < finalOrder.length; idx++) {
        await sql`
          UPDATE business_images
          SET display_order = ${idx},
              is_primary    = ${idx === 0}
          WHERE id = ${finalOrder[idx]}
        `;
      }
    }

    return NextResponse.json({
      success: true,
      wasListed,
    });

  } catch (error) {
    console.error("Submission PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}