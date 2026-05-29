'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

export async function approveResource(formData: FormData) {
  await requireAdmin();

  const id = formData.get("resourceId") as string;

  await sql`
    UPDATE resources SET status = 'listed'
    WHERE id = ${id}
  `;

  revalidatePath("/resources");
  redirect("/admin/resources");
}

export async function rejectResource(formData: FormData) {
  await requireAdmin();

  const id = formData.get("resourceId") as string;

  await sql`
    UPDATE resources SET status = 'rejected'
    WHERE id = ${id}
  `;

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
