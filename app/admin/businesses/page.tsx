import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";
import Link from "next/link";
import DeleteEventButton from "./DeleteEventButton";
import ArchiveBusinessButton from "./ArchiveBusinessButton";

interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  sub_type: string | null;
  status: string;
  claim_status: string | null;
  unlisted_reason: string | null;
  city: string | null;
  state_code: string | null;
  created_at: string;
  // True for a pop_up event whose dates have all passed. Such a listing stays
  // status='listed' but is auto-hidden from the map/events surfaces by
  // notExpiredEvent, so the admin table flags it to explain the discrepancy.
  event_expired: boolean;
}

const STATUS_FILTERS = [
  "all",
  "listed",
  "pending",
  "unlisted",
  "rejected",
] as const;

export default async function AdminBusinesses({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();

  const { status: statusParam } = await searchParams;

  // Whitelisted rather than interpolated: the value reaches a SQL comparison
  // below, and only these five are meaningful anyway.
  const status =
    STATUS_FILTERS.includes(statusParam as typeof STATUS_FILTERS[number])
      ? statusParam!
      : "all";

  // Without this filter an archived listing is effectively unreachable — the
  // table is capped at 50 rows by created_at, so anything taken down months
  // after it was added falls off the end and can never be restored from here.
  const businesses = await sql<BusinessRow[]>`
    SELECT
      b.id,
      b.name,
      b.slug,
      b.type,
      b.sub_type,
      b.status,
      b.claim_status,
      b.unlisted_reason,
      b.created_at,
      l.city,
      l.state_code,
      -- Mirrors notExpiredEvent: a pop_up with no future date has expired out
      -- of the public listings even while status stays 'listed'. Recurring
      -- markets never expire, so they are never flagged.
      (
        b.sub_type = 'pop_up'
        AND NOT EXISTS (
          SELECT 1 FROM popup_events pe
          WHERE pe.business_id = b.id
          AND upper(pe.event_range) > NOW()::timestamp
        )
      ) AS event_expired
    FROM businesses b
    LEFT JOIN locations l ON l.business_id = b.id
    ${
      status === "all"
        ? sql``
        : sql`WHERE b.status = ${status}`
    }
    ORDER BY b.created_at DESC
    LIMIT 50
  `;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between
        gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-black">
          All Businesses
        </h1>
        <span className="text-sm text-gray-400">
          {businesses.length}
          {businesses.length === 50 ? "+" : ""} shown
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f}
            href={
              f === "all"
                ? "/admin/businesses"
                : `/admin/businesses?status=${f}`
            }
            className={`text-xs px-3 py-1.5 rounded-full
              border-2 capitalize transition
              ${status === f
                ? "border-black bg-black text-white"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {f === "unlisted" ? "archived" : f}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border-2
        border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b
            border-gray-100">
            <tr>
              {["Name", "Type", "Status",
                "Claim", "Location", ""].map(h => (
                <th key={h}
                  className="text-left px-4 py-3
                    text-xs text-gray-500
                    font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {businesses.map((b) => (
              <tr key={b.id}
                className="border-b border-gray-100
                  last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-black">
                    {b.name}
                  </p>
                </td>
                <td className="px-4 py-3
                  text-gray-500 capitalize">
                  {b.sub_type?.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap
                    items-center gap-1.5">
                    <span
                      title={
                        b.status === "unlisted" &&
                        b.unlisted_reason
                          ? b.unlisted_reason
                          : undefined
                      }
                      className={`text-xs px-2 py-1
                      rounded-full font-medium
                      ${b.status === "listed"
                        ? "bg-green-100 text-green-600"
                        : b.status === "pending"
                        ? "bg-orange-100 text-orange-600"
                        : b.status === "unlisted"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                      }`}>
                      {b.status === "unlisted"
                        ? "archived"
                        : b.status}
                    </span>
                    {b.event_expired && (
                      <span
                        title="All dates for this pop-up have
                          passed, so it is hidden from the map
                          and events list. Add a future date to
                          relist it."
                        className="text-xs px-2 py-1
                          rounded-full font-medium
                          bg-red-100 text-red-600"
                      >
                        expired
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1
                    rounded-full font-medium
                    ${b.claim_status === "claimed"
                      ? "bg-green-100 text-green-600"
                      : b.claim_status === "pending"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-gray-100 text-gray-500"
                    }`}>
                    {b.claim_status}
                  </span>
                </td>
                <td className="px-4 py-3
                  text-gray-500 text-xs">
                  {b.city && b.state_code
                    ? `${b.city}, ${b.state_code}`
                    : "—"
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/${b.slug || b.id}`}
                      target="_blank"
                      className="text-xs text-black
                        underline"
                    >
                      View
                    </Link>
                    <ArchiveBusinessButton
                      businessId={b.id}
                      name={b.name}
                      status={b.status}
                      unlistedReason={b.unlisted_reason}
                    />
                    {b.type === "event" && (
                      <DeleteEventButton
                        businessId={b.id}
                        name={b.name}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}