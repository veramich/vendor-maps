'use server'

import { requireAdmin } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sql from "@/lib/db";
import cloudinary from "@/lib/cloudinary";

export async function deleteEvent(formData: FormData) {
  await requireAdmin();

  const id = formData.get("businessId") as string;
  const confirmName = formData.get("confirmName") as string;

  if (!id) {
    throw new Error("Missing business id");
  }

  // Re-read from the DB rather than trusting anything else the form sent.
  // Only type='event' rows are deletable here — this action must not become
  // a way to remove permanent listings.
  const [business] = await sql<{ name: string; slug: string | null }[]>`
    SELECT name, slug FROM businesses
    WHERE id = ${id} AND type = 'event'
  `;

  if (!business) {
    throw new Error("Event not found (or is not an event)");
  }

  // Typed-name confirmation: the destructive step needs a deliberate act,
  // not a single click that can be fired by a stray POST.
  if (confirmName !== business.name) {
    throw new Error(
      `Name confirmation did not match. Type "${business.name}" exactly to delete.`
    );
  }

  const images = await sql<{ cloudinary_public_id: string | null }[]>`
    SELECT cloudinary_public_id FROM business_images
    WHERE business_id = ${id}
  `;

  // Every child table (locations, popup_events, business_images, reviews,
  // claims, …) is ON DELETE CASCADE, so one delete clears the DB side.
  await sql`DELETE FROM businesses WHERE id = ${id}`;

  // Cloudinary isn't covered by the cascade. Clean up after the row is gone,
  // best-effort: a hiccup here must not resurrect the listing.
  for (const img of images) {
    if (!img.cloudinary_public_id) continue;
    try {
      await cloudinary.uploader.destroy(img.cloudinary_public_id);
    } catch (err) {
      console.error(
        `Cloudinary cleanup failed for ${img.cloudinary_public_id}`,
        err
      );
    }
  }

  revalidatePath("/admin/businesses");
  revalidatePath("/events");
  revalidatePath("/");
  if (business.slug) revalidatePath(`/${business.slug}`);

  redirect("/admin/businesses");
}
