import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { uploadImage } from "@/lib/utils/uploadImage";
import { auth } from "@/lib/auth";
import { sendSubmissionReceivedEmail } from "@/lib/email";
import { headers } from "next/headers";
import {
  MAX_FLYERS,
  MAX_CONTACTS,
  MAX_WEBSITES,
  MAX_SOCIAL_LINKS,
} from "@/lib/types/resource";

// Normalize a user supplied link into an http(s) URL,
// returning null if it can't be made into a valid one.
function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol =
    /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

// Strip basic HTML/script-y bits and clamp length so a
// stored value can't carry markup into the page.
function cleanText(
  value: unknown,
  maxLen: number
): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}

// Accept YYYY-MM-DD only; anything else becomes null.
function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return value;
}

// Online / in person / both — defaults to "both".
function parseDeliveryMode(value: unknown): "online" | "in_person" | "both" {
  return value === "online" || value === "in_person" ? value : "both";
}

type TimingType = "deadline" | "range" | "window" | "always";

function parseTimingType(value: unknown): TimingType {
  return value === "range" || value === "window" || value === "always"
    ? value
    : "deadline";
}

// Resolve timing type + raw dates into the stored
// columns, or return an error message. Mirrors the
// resources_timing_type_dates DB constraint:
//   always   -> no dates
//   deadline -> end only (the last day to apply)
//   range    -> start + end (event span)
//   window   -> start + end (opens .. closes)
function resolveTiming(
  timingType: TimingType,
  rawStart: unknown,
  rawEnd: unknown
):
  | { error: string }
  | { alwaysAvailable: boolean; startDate: string | null; endDate: string | null } {
  if (timingType === "always") {
    return { alwaysAvailable: true, startDate: null, endDate: null };
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const endDate = parseDate(rawEnd);

  if (timingType === "deadline") {
    if (!endDate) return { error: "A deadline date is required." };
    if (endDate < todayIso)
      return { error: "The deadline has already passed." };
    return { alwaysAvailable: false, startDate: null, endDate };
  }

  // range | window — both dates required
  const startDate = parseDate(rawStart);
  if (!startDate)
    return {
      error:
        timingType === "window"
          ? "An opening date is required."
          : "A start date is required.",
    };
  if (!endDate)
    return {
      error:
        timingType === "window"
          ? "A closing date is required."
          : "An end date is required.",
    };
  if (endDate < startDate)
    return {
      error:
        timingType === "window"
          ? "The closing date must be on or after the opening date."
          : "The end date must be on or after the start date.",
    };
  if (endDate < todayIso)
    return { error: "That date range has already ended." };

  return { alwaysAvailable: false, startDate, endDate };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const data = JSON.parse(
      (formData.get("data") as string) || "{}"
    );

    // Honeypot — silently accept so bots think they won
    if (data.honeypot) {
      return NextResponse.json({ success: true });
    }

    // Optional session (resources can be posted signed out)
    const session = await auth.api
      .getSession({ headers: await headers() })
      .catch(() => null);

    const submittedBy = session?.user?.id || null;
    const submitterEmail = session?.user?.email || null;
    const submitterName = session?.user?.name || null;

    // Client IP for rate limiting
    const ip =
      req.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        .trim() || "unknown";

    // Rate limit — max 5 resource posts per IP per day
    const recent = await sql`
      SELECT COUNT(*) AS count
      FROM resources
      WHERE submitter_ip = ${ip}
      AND created_at > NOW() - INTERVAL '24 hours'
    `;

    if (Number(recent[0].count) >= 5) {
      return NextResponse.json(
        { error: "You've reached today's submission limit. Please try again tomorrow." },
        { status: 429 }
      );
    }

    // --- Validate required fields ---
    const resourceType = cleanText(data.resourceType, 80);
    const title = cleanText(data.title, 120);
    const availability = cleanText(data.availability, 200);

    if (!resourceType) {
      return NextResponse.json(
        { error: "Resource type is required." },
        { status: 400 }
      );
    }
    if (!title) {
      return NextResponse.json(
        { error: "A title is required." },
        { status: 400 }
      );
    }
    if (!availability) {
      return NextResponse.json(
        { error: "Availability is required." },
        { status: 400 }
      );
    }

    // --- Timing (deadline / range / window / always) ---
    const timingType = parseTimingType(data.timingType);
    const timing = resolveTiming(timingType, data.startDate, data.endDate);
    if ("error" in timing) {
      return NextResponse.json({ error: timing.error }, { status: 400 });
    }
    const { alwaysAvailable, startDate, endDate } = timing;

    // --- Availability cut off (optional, structured) ---
    // Folded into the timing model in the UI; kept here so
    // older clients still round-trip.
    const availabilityCutoff = data.hasCutoff
      ? parseDate(data.availabilityCutoff)
      : null;

    // --- Sign up online (link only kept if checked) ---
    const signupUrl = data.signupOnline
      ? normalizeUrl(data.signupUrl)
      : null;

    if (data.signupOnline && !signupUrl) {
      return NextResponse.json(
        { error: "Enter a valid sign up link, or uncheck “Sign up online”." },
        { status: 400 }
      );
    }

    // --- Optional location ---
    // All optional — online-only resources have none.
    const streetAddress = cleanText(data.streetAddress, 250);
    const city = cleanText(data.city, 120);
    const state = cleanText(data.state, 80);
    const stateCode = cleanText(data.stateCode, 2);
    const latitude =
      typeof data.latitude === "number" ? data.latitude : null;
    const longitude =
      typeof data.longitude === "number" ? data.longitude : null;

    // --- Optional contact / links ---
    const walkInWelcome = Boolean(data.walkInWelcome);
    const description = cleanText(data.description, 2000);
    const deliveryMode = parseDeliveryMode(data.deliveryMode);

    // Contacts — repeatable free-text lines, cleaned & de-blanked
    const contacts = Array.isArray(data.contacts)
      ? data.contacts
          .map((c: unknown) => cleanText(c, 200))
          .filter((c: string | null): c is string => Boolean(c))
          .slice(0, MAX_CONTACTS)
      : [];

    // Websites — repeatable URLs, normalized & de-blanked
    const websites = Array.isArray(data.websites)
      ? data.websites
          .map((u: unknown) => normalizeUrl(u))
          .filter((u: string | null): u is string => Boolean(u))
          .slice(0, MAX_WEBSITES)
      : [];

    // Social posts — repeatable URLs, normalized & de-blanked
    const socialUrls = Array.isArray(data.socialUrls)
      ? data.socialUrls
          .map((u: unknown) => normalizeUrl(u))
          .filter((u: string | null): u is string => Boolean(u))
          .slice(0, MAX_SOCIAL_LINKS)
      : [];

    // --- Flyers (up to MAX_FLYERS) ---
    const flyerFiles: File[] = [];
    let i = 0;
    while (formData.get(`flyer_${i}`)) {
      const file = formData.get(`flyer_${i}`) as File;
      if (file && file.size > 0) flyerFiles.push(file);
      i++;
    }

    const flyers: { url: string; publicId: string }[] = [];
    for (const file of flyerFiles.slice(0, MAX_FLYERS)) {
      const uploaded = await uploadImage(file, "resources");
      flyers.push({
        url:      uploaded.url,
        publicId: uploaded.publicId,
      });
    }

    // --- Insert ---
    const [resource] = await sql`
      INSERT INTO resources (
        resource_type,
        title,
        description,
        delivery_mode,
        timing_type,
        always_available,
        start_date,
        end_date,
        availability,
        availability_cutoff,
        signup_url,
        walk_in_welcome,
        street_address,
        city,
        state,
        state_code,
        latitude,
        longitude,
        contacts,
        websites,
        social_urls,
        flyers,
        status,
        submitted_by,
        submitter_ip
      ) VALUES (
        ${resourceType},
        ${title},
        ${description},
        ${deliveryMode},
        ${timingType},
        ${alwaysAvailable},
        ${startDate},
        ${endDate},
        ${availability},
        ${availabilityCutoff},
        ${signupUrl},
        ${walkInWelcome},
        ${streetAddress},
        ${city},
        ${state},
        ${stateCode},
        ${latitude},
        ${longitude},
        ${JSON.stringify(contacts)},
        ${JSON.stringify(websites)},
        ${JSON.stringify(socialUrls)},
        ${JSON.stringify(flyers)},
        'pending',
        ${submittedBy},
        ${ip}
      )
      RETURNING id
    `;

    // Confirmation email — only to the signed-in submitter. Resources have
    // no single contact-email field (just free-text contact lines), so
    // signed-out submissions get no receipt. Fire-and-forget; the send
    // swallows its own errors so it can't fail the submit.
    if (submitterEmail) {
      await sendSubmissionReceivedEmail({
        to: submitterEmail,
        name: submitterName ?? undefined,
        itemName: title,
        kind: "resource",
      });
    }

    return NextResponse.json({
      success: true,
      resourceId: resource.id,
    });
  } catch (error) {
    console.error("Resource submission error:", error);

    if (error && typeof error === "object" && "code" in error) {
      console.error("DB error details:", {
        code:       (error as any).code,
        detail:     (error as any).detail,
        constraint: (error as any).constraint,
      });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to submit resource";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
