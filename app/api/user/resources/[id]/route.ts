import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { uploadImage } from "@/lib/utils/uploadImage";
import {
  MAX_FLYERS,
  MAX_CONTACTS,
  MAX_WEBSITES,
  MAX_SOCIAL_LINKS,
} from "@/lib/types/resource";

// --- shared helpers (kept in step with the submit route) ---
function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanText(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return value;
}

function parseDeliveryMode(value: unknown): "online" | "in_person" | "both" {
  return value === "online" || value === "in_person" ? value : "both";
}

type TimingType = "deadline" | "range" | "window" | "always";

function parseTimingType(value: unknown): TimingType {
  return value === "range" || value === "window" || value === "always"
    ? value
    : "deadline";
}

// Timing type for the edit form: trust the stored column
// (it alone distinguishes range vs. window), falling back
// to the dates for older rows that predate the column.
function deriveTimingType(r: any): TimingType {
  if (
    r.timing_type === "deadline" ||
    r.timing_type === "range" ||
    r.timing_type === "window" ||
    r.timing_type === "always"
  )
    return r.timing_type;
  if (r.always_available) return "always";
  if (r.start_date && r.end_date) return "range";
  return "deadline";
}

// Resolve timing type + raw dates into stored columns, or
// an error. Mirrors the resources_timing_type_dates check.
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

// Load a resource the caller is allowed to edit, or null.
async function loadOwned(id: string, userId: string) {
  const rows = await sql`
    SELECT * FROM resources
    WHERE id = ${id}
    AND submitted_by = ${userId}
    AND status IN ('pending', 'listed')
  `;
  return rows[0] || null;
}

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

    const r = await loadOwned(id, session.user.id);
    if (!r) {
      return NextResponse.json(
        { error: "Resource not found or not editable" },
        { status: 404 }
      );
    }

    const toIso = (d: unknown): string =>
      d ? new Date(d as string).toISOString().slice(0, 10) : "";

    // Shape into ResourceFormData for the edit form
    const form = {
      resourceType:       r.resource_type || "",
      title:              r.title || "",
      description:        r.description || "",
      deliveryMode:       parseDeliveryMode(r.delivery_mode),
      timingType:         deriveTimingType(r),
      alwaysAvailable:    r.always_available,
      startDate:          toIso(r.start_date),
      endDate:            toIso(r.end_date),
      availability:       r.availability || "",
      hasCutoff:          Boolean(r.availability_cutoff),
      availabilityCutoff: toIso(r.availability_cutoff),
      signupOnline:       Boolean(r.signup_url),
      signupUrl:          r.signup_url || "",
      walkInWelcome:      r.walk_in_welcome,
      streetAddress:      r.street_address || "",
      city:               r.city || "",
      state:              r.state || "",
      stateCode:          r.state_code || "",
      latitude:           r.latitude ?? null,
      longitude:          r.longitude ?? null,
      contacts:           (Array.isArray(r.contacts) && r.contacts.length
                            ? r.contacts : [""]) as string[],
      websites:           (Array.isArray(r.websites) && r.websites.length
                            ? r.websites : [""]) as string[],
      socialUrls:         (Array.isArray(r.social_urls) && r.social_urls.length
                            ? r.social_urls : [""]) as string[],
      flyers:             [],
      honeypot:           "",
    };

    return NextResponse.json({
      form,
      flyers: Array.isArray(r.flyers) ? r.flyers : [],
      status: r.status,
    });
  } catch (error) {
    console.error("Resource GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resource" },
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

    const existing = await loadOwned(id, session.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Resource not found or not editable" },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const data = JSON.parse((formData.get("data") as string) || "{}");

    if (data.honeypot) {
      // Bot — pretend success, change nothing
      return NextResponse.json({ success: true });
    }

    // --- Required ---
    const resourceType = cleanText(data.resourceType, 80);
    const title = cleanText(data.title, 120);
    const availability = cleanText(data.availability, 200);

    if (!resourceType)
      return NextResponse.json(
        { error: "Resource type is required." },
        { status: 400 }
      );
    if (!title)
      return NextResponse.json(
        { error: "A title is required." },
        { status: 400 }
      );
    if (!availability)
      return NextResponse.json(
        { error: "Availability is required." },
        { status: 400 }
      );

    // --- Timing (deadline / range / window / always) ---
    const timingType = parseTimingType(data.timingType);
    const timing = resolveTiming(timingType, data.startDate, data.endDate);
    if ("error" in timing)
      return NextResponse.json({ error: timing.error }, { status: 400 });
    const { alwaysAvailable, startDate, endDate } = timing;

    const availabilityCutoff = data.hasCutoff
      ? parseDate(data.availabilityCutoff)
      : null;

    const signupUrl = data.signupOnline
      ? normalizeUrl(data.signupUrl)
      : null;
    if (data.signupOnline && !signupUrl)
      return NextResponse.json(
        { error: "Enter a valid sign up link, or uncheck “Sign up online”." },
        { status: 400 }
      );

    const walkInWelcome = Boolean(data.walkInWelcome);
    const description = cleanText(data.description, 2000);
    const deliveryMode = parseDeliveryMode(data.deliveryMode);

    const streetAddress = cleanText(data.streetAddress, 250);
    const city = cleanText(data.city, 120);
    const state = cleanText(data.state, 80);
    const stateCode = cleanText(data.stateCode, 2);
    const latitude =
      typeof data.latitude === "number" ? data.latitude : null;
    const longitude =
      typeof data.longitude === "number" ? data.longitude : null;

    const contacts = Array.isArray(data.contacts)
      ? data.contacts
          .map((c: unknown) => cleanText(c, 200))
          .filter((c: string | null): c is string => Boolean(c))
          .slice(0, MAX_CONTACTS)
      : [];

    const websites = Array.isArray(data.websites)
      ? data.websites
          .map((u: unknown) => normalizeUrl(u))
          .filter((u: string | null): u is string => Boolean(u))
          .slice(0, MAX_WEBSITES)
      : [];

    const socialUrls = Array.isArray(data.socialUrls)
      ? data.socialUrls
          .map((u: unknown) => normalizeUrl(u))
          .filter((u: string | null): u is string => Boolean(u))
          .slice(0, MAX_SOCIAL_LINKS)
      : [];

    // --- Flyers: keep the retained ones, append any new uploads ---
    const keptFlyers = Array.isArray(data.keptFlyers)
      ? data.keptFlyers
          .filter(
            (f: any) =>
              f && typeof f.url === "string" && typeof f.publicId === "string"
          )
          .map((f: any) => ({ url: f.url, publicId: f.publicId }))
      : [];

    const newFiles: File[] = [];
    let i = 0;
    while (formData.get(`flyer_${i}`)) {
      const file = formData.get(`flyer_${i}`) as File;
      if (file && file.size > 0) newFiles.push(file);
      i++;
    }

    const room = Math.max(0, MAX_FLYERS - keptFlyers.length);
    const flyers = [...keptFlyers];
    for (const file of newFiles.slice(0, room)) {
      const uploaded = await uploadImage(file, "resources");
      flyers.push({ url: uploaded.url, publicId: uploaded.publicId });
    }

    const wasListed = existing.status === "listed";

    // Edits by the poster re-enter review before going public.
    await sql`
      UPDATE resources SET
        resource_type      = ${resourceType},
        title              = ${title},
        description        = ${description},
        delivery_mode      = ${deliveryMode},
        timing_type        = ${timingType},
        always_available   = ${alwaysAvailable},
        start_date         = ${startDate},
        end_date           = ${endDate},
        availability       = ${availability},
        availability_cutoff = ${availabilityCutoff},
        signup_url         = ${signupUrl},
        walk_in_welcome    = ${walkInWelcome},
        street_address     = ${streetAddress},
        city               = ${city},
        state              = ${state},
        state_code         = ${stateCode},
        latitude           = ${latitude},
        longitude          = ${longitude},
        contacts           = ${JSON.stringify(contacts)},
        websites           = ${JSON.stringify(websites)},
        social_urls        = ${JSON.stringify(socialUrls)},
        flyers             = ${JSON.stringify(flyers)},
        status             = 'pending'
      WHERE id = ${id}
      AND submitted_by = ${session.user.id}
    `;

    return NextResponse.json({ success: true, wasListed });
  } catch (error) {
    console.error("Resource PATCH error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
