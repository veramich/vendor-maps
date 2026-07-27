import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";
import {
  buildListingSnapshot,
  type ListingSnapshot,
} from "@/lib/listingSnapshot";
import SubmissionCard, {
  type SubmissionCardData,
} from "./SubmissionCard";

interface PendingRow {
  id: string;
  slug: string | null;
  status: string;
  created_at: string;
  edited_at: string | null;
  edit_snapshot: ListingSnapshot | null;
  city: string | null;
  state_code: string | null;
  neighborhood: string | null;
  street_1: string | null;
  street_2: string | null;
  street_address: string | null;
}

function cityLine(r: PendingRow): string {
  const addr =
    r.street_1 && r.street_2
      ? `${r.street_1} & ${r.street_2}`
      : r.street_address || "";
  return (
    [addr, r.neighborhood, r.city, r.state_code].filter(Boolean).join(", ") ||
    "No location"
  );
}

export default async function AdminSubmissions() {
  await requireAdmin();

  const rows = await sql<PendingRow[]>`
    SELECT
      b.id,
      b.slug,
      b.status,
      b.created_at,
      b.edited_at,
      b.edit_snapshot,
      l.city,
      l.state_code,
      l.neighborhood,
      l.street_1,
      l.street_2,
      l.street_address
    FROM businesses b
    LEFT JOIN locations l ON l.business_id = b.id
    WHERE b.status = 'pending'
    ORDER BY b.edited_at DESC NULLS LAST, b.created_at ASC
  `;

  // Build the current (post-edit / as-submitted) snapshot and primary image for
  // each pending item. The stored edit_snapshot, when present, is the "before"
  // side of the comparison; a null snapshot means a brand-new submission.
  const cards: SubmissionCardData[] = await Promise.all(
    rows.map(async (r) => {
      const current = await buildListingSnapshot(r.id);
      return {
        id: r.id,
        slug: r.slug,
        status: r.status,
        createdAt: String(r.created_at),
        editedAt: r.edited_at ? String(r.edited_at) : null,
        primaryImage: current?.images[0]?.url ?? null,
        cityLine: cityLine(r),
        // buildListingSnapshot only returns null if the row vanished mid-request;
        // fall back to an empty-ish snapshot so the card still renders.
        current: current ?? EMPTY_SNAPSHOT,
        before: r.edit_snapshot ?? null,
      };
    })
  );

  const editCount = cards.filter((c) => c.before !== null).length;
  const newCount = cards.length - editCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black">Submissions</h1>
        <span className="text-sm text-gray-400">
          {newCount} new · {editCount} edited
        </span>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 text-center">
          <p className="text-gray-400">No pending submissions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((c) => (
            <SubmissionCard key={c.id} data={c} />
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_SNAPSHOT: ListingSnapshot = {
  name: null,
  description: null,
  category: null,
  type: null,
  subType: null,
  priceTier: null,
  priceContext: null,
  website: null,
  instagram: null,
  facebook: null,
  tiktok: null,
  twitter: null,
  youtube: null,
  phone: null,
  email: null,
  paymentOptions: [],
  orderingMethods: [],
  dietaryOptions: [],
  businessAmenities: [],
  servedZips: [],
  location: null,
  hours: [],
  images: [],
  vendorSpace: null,
  vendorFees: [],
  marketSchedules: [],
  eventName: null,
  eventDates: [],
};
