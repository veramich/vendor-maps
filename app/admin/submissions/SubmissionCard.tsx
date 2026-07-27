"use client";

import { useState } from "react";
import Link from "next/link";
import type { ListingSnapshot } from "@/lib/listingSnapshot";
import {
  approveSubmission,
  rejectSubmission,
  markDuplicate,
} from "./actions";

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

const SUB_TYPE_LABELS: Record<string, string> = {
  street_vendor: "Street Vendor",
  food_truck: "Food Truck",
  home_based: "Home Based",
  market_based: "Market Based",
  pop_up_based: "Pop-Up Based",
  other: "Other",
  catering_only: "Catering Only",
  shipping_only: "Shipping Only",
  market: "Recurring Market",
  pop_up: "Pop-Up Event",
};

const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: "Every week",
  biweekly: "Every other week",
  monthly_first: "First of month",
  monthly_second: "Second of month",
  monthly_third: "Third of month",
  monthly_fourth: "Fourth of month",
  monthly_last: "Last of month",
};

export interface SubmissionCardData {
  id: string;
  slug: string | null;
  status: string;
  createdAt: string;
  editedAt: string | null;
  primaryImage: string | null;
  cityLine: string;
  /** Current (post-edit / as-submitted) full state. */
  current: ListingSnapshot;
  /** Pre-edit state when this is an edit of a previously-live listing. */
  before: ListingSnapshot | null;
}

/** Format a single field value into a readable string for the diff/preview. */
function fmt(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/** Compare two field values for equality (order-insensitive for arrays). */
function same(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sa = [...a].map(String).sort();
    const sb = [...b].map(String).sort();
    return sa.every((v, i) => v === sb[i]);
  }
  return fmt(a) === fmt(b);
}

/** The scalar fields we surface in the comparison, in display order. */
function scalarFields(s: ListingSnapshot): [string, unknown][] {
  const priceTier = s.priceTier ? PRICE_LABELS[s.priceTier] : null;
  return [
    ["Name", s.name],
    ["Category", s.category],
    ["Type", s.type],
    ["Sub-type", s.subType ? SUB_TYPE_LABELS[s.subType] ?? s.subType : null],
    ["Description", s.description],
    ["Price", priceTier],
    ["Price context", s.priceContext],
    ["Website", s.website],
    ["Instagram", s.instagram],
    ["Facebook", s.facebook],
    ["TikTok", s.tiktok],
    ["Twitter", s.twitter],
    ["YouTube", s.youtube],
    ["Phone", s.phone],
    ["Email", s.email],
    ["Payment", s.paymentOptions],
    ["Ordering", s.orderingMethods],
    ["Dietary", s.dietaryOptions],
    ["Amenities", s.businessAmenities],
    ["Served ZIPs", s.servedZips],
  ];
}

function addressLine(loc: ListingSnapshot["location"]): string {
  if (!loc) return "—";
  const parts = [
    loc.street1 && loc.street2
      ? `${loc.street1} & ${loc.street2}`
      : loc.streetAddress || loc.street1,
    loc.neighborhood,
    loc.city,
    loc.stateCode,
    loc.zip,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function locationFields(s: ListingSnapshot): [string, unknown][] {
  const loc = s.location;
  return [
    ["Address", addressLine(loc)],
    ["Location amenities", loc?.locationAmenities ?? []],
    ["Show exact address", loc?.showExactAddress ?? false],
    ["Exact address", loc?.exactAddress ?? null],
    [
      "Map pin",
      loc?.lat != null && loc?.lng != null
        ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`
        : "Directory-only (no pin)",
    ],
  ];
}

function hoursSummary(s: ListingSnapshot): string {
  if (!s.hours.length) return "—";
  return s.hours
    .map((h) => {
      const day = DAY_LABELS[h.dayOfWeek] ?? h.dayOfWeek;
      if (h.isClosed) return `${day}: Closed`;
      if (h.hoursVary) return `${day}: Varies`;
      const end = h.closesNextDay ? `${h.closeTime}+1` : h.closeTime;
      return `${day}: ${h.openTime}–${end}`;
    })
    .join(" · ");
}

function eventSummary(s: ListingSnapshot): string {
  if (s.marketSchedules.length) {
    return s.marketSchedules
      .map((m) => {
        const day = DAY_LABELS[m.dayOfWeek] ?? m.dayOfWeek;
        const rec = RECURRENCE_LABELS[m.recurrenceType] ?? m.recurrenceType;
        const time =
          m.startTime && m.endTime ? ` ${m.startTime}–${m.endTime}` : "";
        return `${day} · ${rec}${time}`;
      })
      .join(" · ");
  }
  if (s.eventDates.length) {
    return s.eventDates
      .map((d) => `${d.date} ${d.startTime}–${d.endTime}`)
      .join(" · ");
  }
  return "—";
}

function vendorSummary(s: ListingSnapshot): string {
  if (!s.vendorSpace) return "—";
  const vs = s.vendorSpace;
  const bits = [
    vs.spaceSizes.length ? `Sizes: ${vs.spaceSizes.join(", ")}` : null,
    vs.vendorTypes.length ? `Types: ${vs.vendorTypes.join(", ")}` : null,
    vs.hasWaitlist ? "Waitlist" : null,
    vs.hasHolds ? "Holds" : null,
    vs.signupLink ? `Signup: ${vs.signupLink}` : null,
  ].filter(Boolean);
  const fees = s.vendorFees.length
    ? " · Fees: " +
      s.vendorFees
        .map((f) =>
          f.isFree
            ? `${f.feeType}: Free`
            : `${f.feeType}: $${f.amount ?? "?"}`
        )
        .join(", ")
    : "";
  return (bits.join(" · ") || "Available") + fees;
}

/** All comparable rows, folding derived multi-row sections into one line each. */
function allFields(s: ListingSnapshot): [string, unknown][] {
  const rows: [string, unknown][] = [
    ...scalarFields(s),
    ...locationFields(s),
    ["Hours", hoursSummary(s)],
    ["Photos", `${s.images.length} photo(s)`],
  ];
  if (s.type === "event") {
    rows.push(["Event dates", eventSummary(s)]);
    rows.push(["Event name", s.eventName]);
  }
  if (s.vendorSpace || s.vendorFees.length) {
    rows.push(["Vendor spaces", vendorSummary(s)]);
  }
  return rows;
}

/** One field row in preview mode (no before/after). */
function PreviewRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-1.5 border-b border-gray-50">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <span className="text-xs text-black whitespace-pre-wrap break-words">
        {fmt(value)}
      </span>
    </div>
  );
}

/** One field row in diff mode: old (struck) → new (highlighted) when changed. */
function DiffRow({
  label,
  before,
  after,
}: {
  label: string;
  before: unknown;
  after: unknown;
}) {
  const changed = !same(before, after);
  return (
    <div
      className={`grid grid-cols-[9rem_1fr] gap-3 py-1.5 border-b ${
        changed ? "border-amber-100 bg-amber-50/60" : "border-gray-50"
      }`}
    >
      <span
        className={`text-xs font-medium ${
          changed ? "text-amber-700" : "text-gray-400"
        }`}
      >
        {label}
        {changed && (
          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
        )}
      </span>
      {changed ? (
        <span className="text-xs break-words">
          <span className="text-red-500 line-through whitespace-pre-wrap">
            {fmt(before)}
          </span>
          <span className="mx-1.5 text-gray-300">→</span>
          <span className="text-green-700 font-medium whitespace-pre-wrap">
            {fmt(after)}
          </span>
        </span>
      ) : (
        <span className="text-xs text-gray-500 whitespace-pre-wrap break-words">
          {fmt(after)}
        </span>
      )}
    </div>
  );
}

function PhotoStrip({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {urls.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={u}
          alt=""
          className="h-20 w-20 flex-shrink-0 rounded-lg object-cover border border-gray-100"
        />
      ))}
    </div>
  );
}

export default function SubmissionCard({ data }: { data: SubmissionCardData }) {
  const [open, setOpen] = useState(false);
  const isEdit = data.before !== null;

  const currentRows = allFields(data.current);
  const beforeRows = data.before ? allFields(data.before) : [];
  const changedCount =
    isEdit && data.before
      ? currentRows.filter(
          ([label, val], i) => !same(beforeRows[i]?.[1], val)
        ).length
      : 0;

  const dateStr = new Date(
    isEdit && data.editedAt ? data.editedAt : data.createdAt
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
      {/* Compact header */}
      <div className="flex items-start gap-4 p-5">
        {/* Thumbnail */}
        <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-gray-100 overflow-hidden">
          {data.primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.primaryImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-300 text-xs">
              No photo
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-black truncate">
              {data.current.name}
            </p>
            {isEdit ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold uppercase tracking-wide">
                Edited · {changedCount} change{changedCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold uppercase tracking-wide">
                New
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.current.category}
            {data.current.subType
              ? ` · ${SUB_TYPE_LABELS[data.current.subType] ?? data.current.subType}`
              : ""}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {data.cityLine}
          </p>
          <p className="text-xs text-gray-300 mt-1">
            {isEdit ? "Edited" : "Submitted"} {dateStr}
          </p>
        </div>

        {/* Preview link + expand */}
        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/${data.slug || data.id}`}
            target="_blank"
            className="text-xs text-gray-400 underline"
          >
            Open live
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs font-medium text-orange-600 hover:text-orange-700"
          >
            {open
              ? "Hide details"
              : isEdit
              ? "Compare changes"
              : "Preview listing"}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t-2 border-gray-100 px-5 py-4 space-y-4 bg-gray-50/40">
          {isEdit && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Comparing the previously-live listing (
              <span className="text-red-500">old</span>) with the submitted
              edit (<span className="text-green-700">new</span>). Changed fields
              are highlighted.
            </p>
          )}

          {/* Photos: show new set; for edits, note the old count */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Photos{" "}
              {isEdit &&
                data.before &&
                data.before.images.length !== data.current.images.length && (
                  <span className="text-amber-600 font-normal">
                    ({data.before.images.length} → {data.current.images.length})
                  </span>
                )}
            </p>
            {data.current.images.length ? (
              <PhotoStrip urls={data.current.images.map((i) => i.url)} />
            ) : (
              <p className="text-xs text-gray-400">No photos</p>
            )}
          </div>

          {/* Field grid */}
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-2">
            {isEdit && data.before
              ? currentRows.map(([label, val], i) => (
                  <DiffRow
                    key={label}
                    label={label}
                    before={beforeRows[i]?.[1]}
                    after={val}
                  />
                ))
              : currentRows.map(([label, val]) => (
                  <PreviewRow key={label} label={label} value={val} />
                ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t-2 border-gray-100 px-5 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <form action={approveSubmission}>
              <input type="hidden" name="businessId" value={data.id} />
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white text-xs font-medium rounded-xl hover:bg-green-600 transition"
              >
                {isEdit ? "Approve changes" : "Approve"}
              </button>
            </form>

            <form action={markDuplicate}>
              <input type="hidden" name="businessId" value={data.id} />
              <button
                type="submit"
                className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-300 transition"
              >
                Duplicate
              </button>
            </form>
          </div>

          <form action={rejectSubmission} className="flex flex-col gap-2">
            <input type="hidden" name="businessId" value={data.id} />
            <textarea
              name="message"
              rows={2}
              placeholder="Optional message to the submitter (shown in their notification)"
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-xs text-black placeholder:text-gray-400 focus:outline-none focus:border-gray-300 resize-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-500 text-white text-xs font-medium rounded-xl hover:bg-red-600 transition self-start"
            >
              {isEdit ? "Reject changes" : "Reject"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
