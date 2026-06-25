import sql from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";

/**
 * Notification types. Keep in sync with the CHECK constraint in
 * db/schema/033_notifications.sql.
 */
export type NotificationType =
  | "submission_approved"
  | "submission_rejected"
  | "submission_duplicate"
  | "claim_approved"
  | "claim_rejected"
  | "review_approved"
  | "review_rejected"
  | "resource_approved"
  | "resource_rejected";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
};

/**
 * Create an in-app notification for a single user.
 *
 * This is the "trigger" layer only — it records the notification.
 * Delivery transport (web push now, native push later) plugs in here
 * as a separate concern, so the rest of the app never needs to know
 * how a notification reaches the device.
 *
 * Never throws into the caller: a failed notification must not break
 * the action that triggered it (e.g. approving a listing).
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    await sql`
      INSERT INTO notifications
        (user_id, type, title, body, link, data)
      VALUES (
        ${input.userId},
        ${input.type},
        ${input.title},
        ${input.body ?? null},
        ${input.link ?? null},
        ${sql.json((input.data ?? {}) as Record<string, never>)}
      )
    `;

    // Email delivery: mirror the notification to the user's inbox. Failures
    // here are swallowed inside sendNotificationEmail, so the in-app
    // notification is never lost if email is down.
    const [recipient] = await sql<{ email: string; name: string | null }[]>`
      SELECT email, name FROM "user" WHERE id = ${input.userId}
    `;

    if (recipient?.email) {
      await sendNotificationEmail({
        to: recipient.email,
        name: recipient.name ?? undefined,
        title: input.title,
        body: input.body,
        link: input.link,
      });
    }

    // Future: enqueue web push / native push delivery here.
  } catch (error) {
    console.error("createNotification failed:", error);
  }
}
