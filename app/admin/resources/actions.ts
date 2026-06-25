'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

export async function approveResource(formData: FormData) {
  await requireAdmin();

  const id = formData.get("resourceId") as string;

  const [resource] = await sql<{ submitted_by: string | null; title: string }[]>`
    UPDATE resources SET status = 'listed'
    WHERE id = ${id}
    RETURNING submitted_by, title
  `;

  if (resource?.submitted_by) {
    await createNotification({
      userId: resource.submitted_by,
      type: "resource_approved",
      title: `${resource.title} is now listed`,
      body: "Your resource was approved and is live on VendorMaps.",
      link: "/resources",
      data: { resourceId: id },
    });
  }

  revalidatePath("/resources");
  redirect("/admin/resources");
}

export async function rejectResource(formData: FormData) {
  await requireAdmin();

  const id = formData.get("resourceId") as string;

  const [resource] = await sql<{ submitted_by: string | null; title: string }[]>`
    UPDATE resources SET status = 'rejected'
    WHERE id = ${id}
    RETURNING submitted_by, title
  `;

  if (resource?.submitted_by) {
    await createNotification({
      userId: resource.submitted_by,
      type: "resource_rejected",
      title: `${resource.title} wasn't approved`,
      body: "Your resource submission didn't meet our listing guidelines. Contact us if you have questions.",
      link: "/contact",
      data: { resourceId: id },
    });
  }

  revalidatePath("/resources");
  redirect("/admin/resources");
}

export async function deleteResource(formData: FormData) {
  await requireAdmin();

  const id = formData.get("resourceId") as string;

  await sql`
    DELETE FROM resources WHERE id = ${id}
  `;

  revalidatePath("/resources");
  redirect("/admin/resources");
}
