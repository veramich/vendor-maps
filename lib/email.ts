import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "VendorMaps <noreply@vendormaps.net>";
const BRAND = "#FF7300"; // brand orange — matches --primary in globals.css
const BRAND_DARK = "#C25A00"; // darker orange for small text/links on white

/**
 * Absolute base URL for links inside emails. Email clients can't resolve
 * relative paths, so every link must be absolute.
 */
function baseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://vendormaps.net"
  ).replace(/\/$/, "");
}

/**
 * Shared HTML shell so every email looks the same. `cta` is optional —
 * pass a label + href to render a branded button.
 */
export function layout(opts: {
  heading: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
}): string {
  const button = opts.cta
    ? `<a href="${opts.cta.href}"
          style="display:inline-block;background:${BRAND};color:#ffffff;
                 text-decoration:none;padding:12px 24px;border-radius:8px;
                 font-weight:600;margin:8px 0 4px;">${opts.cta.label}</a>`
    : "";

  return `
  <div style="background:#f3f4f6;padding:32px 0;font-family:-apple-system,
              BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;
                border-radius:12px;overflow:hidden;
                box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:${BRAND};padding:20px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right:10px;vertical-align:middle;">
              <img src="${baseUrl()}/vmapsLOGO.png" width="36" height="36"
                   alt="VendorMaps"
                   style="display:block;width:36px;height:36px;" />
            </td>
            <td style="vertical-align:middle;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;
                           letter-spacing:-0.01em;">VendorMaps</span>
            </td>
          </tr>
        </table>
      </div>
      <div style="padding:32px;color:#111827;font-size:15px;line-height:1.6;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">
          ${opts.heading}
        </h2>
        ${opts.bodyHtml}
        ${button}
      </div>
      <div style="padding:20px 32px;border-top:1px solid #e5e7eb;
                  color:#6b7280;font-size:12px;line-height:1.5;">
        <p style="margin:0;">
          VendorMaps · Find local vendors, markets &amp; pop-ups.<br/>
          <a href="${baseUrl()}" style="color:${BRAND_DARK};">vendormaps.net</a>
        </p>
      </div>
    </div>
  </div>`;
}

/**
 * Low-level send. Never throws into callers — a failed email must not
 * break the action that triggered it (sign-up, approving a listing, …).
 */
async function send(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    await resend.emails.send({ from: FROM, ...args });
  } catch (error) {
    console.error("email send failed:", args.subject, error);
  }
}

export function sendVerificationEmail(to: string, url: string) {
  return send({
    to,
    subject: "Verify your VendorMaps email",
    html: layout({
      heading: "Confirm your email",
      bodyHtml: `<p style="margin:0 0 16px;">Thanks for signing up. Please
        confirm your email address to activate your account.</p>`,
      cta: { label: "Verify email", href: url },
    }),
  });
}

export function sendPasswordResetEmail(to: string, url: string) {
  return send({
    to,
    subject: "Reset your VendorMaps password",
    html: layout({
      heading: "Reset your password",
      bodyHtml: `<p style="margin:0 0 16px;">Click below to choose a new
        password. This link expires in 1 hour.</p>
        <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">If you didn't
        request this, you can safely ignore this email.</p>`,
      cta: { label: "Reset password", href: url },
    }),
  });
}

export function sendWelcomeEmail(to: string, name?: string) {
  const greeting = name ? `Welcome, ${name}!` : "Welcome to VendorMaps!";
  return send({
    to,
    subject: "Welcome to VendorMaps",
    html: layout({
      heading: greeting,
      bodyHtml: `<p style="margin:0 0 16px;">Your email is confirmed and your
        account is ready. Here's what you can do next:</p>
        <ul style="margin:0 0 16px;padding-left:20px;color:#374151;">
          <li style="margin-bottom:6px;">Discover vendors, markets and
              pop-ups near you on the map.</li>
          <li style="margin-bottom:6px;">Save your favorite businesses.</li>
          <li style="margin-bottom:6px;">List or claim your own business.</li>
        </ul>`,
      cta: { label: "Explore the map", href: `${baseUrl()}/map` },
    }),
  });
}

/**
 * Submission received — a confirmation/receipt sent the moment someone
 * submits a business or a resource, before any moderation outcome. Unlike
 * the approved/rejected notifications, this isn't tied to a user account:
 * the submitter may be signed out, so the caller passes whatever email it
 * has. `kind` only tweaks the wording; both share the branded layout.
 */
export function sendSubmissionReceivedEmail(args: {
  to: string;
  name?: string;
  itemName: string;
  kind: "business" | "resource";
}) {
  const greeting = args.name ? `Thanks, ${args.name}!` : "Thanks!";
  const noun = args.kind === "resource" ? "resource" : "listing";
  return send({
    to: args.to,
    subject: `We received your submission: ${args.itemName}`,
    html: layout({
      heading: greeting,
      bodyHtml: `<p style="margin:0 0 16px;">We received your submission for
        <strong>${args.itemName}</strong>. Our team reviews every ${noun}
        to keep VendorMaps accurate, so it isn't live just yet.</p>
        <p style="margin:0 0 16px;">You'll get another email as soon as it's
        approved and visible on VendorMaps. Reviews usually take a day or
        two.</p>`,
      cta: { label: "Browse VendorMaps", href: `${baseUrl()}/map` },
    }),
  });
}

/**
 * Generic notification email — mirrors an in-app notification. Called from
 * the notifications layer so every notification type gets email delivery.
 */
export function sendNotificationEmail(args: {
  to: string;
  name?: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  const href = args.link
    ? args.link.startsWith("http")
      ? args.link
      : `${baseUrl()}${args.link.startsWith("/") ? "" : "/"}${args.link}`
    : null;

  return send({
    to: args.to,
    subject: args.title,
    html: layout({
      heading: args.title,
      bodyHtml: args.body
        ? `<p style="margin:0 0 16px;">${args.body}</p>`
        : "",
      cta: href ? { label: "View on VendorMaps", href } : undefined,
    }),
  });
}
