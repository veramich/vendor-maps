import Link from "next/link";
import sql from "@/lib/db";
import ResourceList from "@/components/resources/ResourceList";
import {
  Resource,
  ResourceFlyer,
  DeliveryMode,
  TimingType,
} from "@/lib/types/resource";

// Always render fresh so newly approved / expired
// resources show up without a stale cache.
export const dynamic = "force-dynamic";

// Maps to a listed `resources` row. Columns that are NOT NULL in the schema
// (and so always present for listed rows) are typed non-null to match the
// public Resource shape this builds.
interface ResourceRow {
  id: string;
  resource_type: string;
  title: string;
  description: string | null;
  delivery_mode: DeliveryMode;
  timing_type: TimingType;
  always_available: boolean;
  start_date: string | null;
  end_date: string | null;
  availability: string;
  availability_cutoff: string | null;
  signup_url: string | null;
  walk_in_welcome: boolean;
  street_address: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
  contacts: string[] | null;
  websites: string[] | null;
  social_urls: string[] | null;
  flyers: ResourceFlyer[] | null;
  status: string;
  created_at: string;
}

async function getResources(): Promise<Resource[]> {
  const rows = await sql<ResourceRow[]>`
    SELECT
      id,
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
      contacts,
      websites,
      social_urls,
      flyers,
      street_address,
      city,
      state,
      state_code,
      status,
      created_at
    FROM resources
    WHERE status = 'listed'
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY
      always_available ASC,  -- dated/ending ones first
      end_date ASC NULLS LAST,
      created_at DESC
  `;

  const toIso = (d: unknown): string | null =>
    d ? new Date(d as string).toISOString().slice(0, 10) : null;

  return rows.map((r) => ({
    id:                 r.id,
    resourceType:       r.resource_type,
    title:              r.title,
    description:        r.description,
    deliveryMode:       r.delivery_mode,
    timingType:         r.timing_type,
    alwaysAvailable:    r.always_available,
    startDate:          toIso(r.start_date),
    endDate:            toIso(r.end_date),
    availability:       r.availability,
    availabilityCutoff: toIso(r.availability_cutoff),
    signupUrl:          r.signup_url,
    walkInWelcome:      r.walk_in_welcome,
    contacts:           Array.isArray(r.contacts) ? r.contacts : [],
    websites:           Array.isArray(r.websites) ? r.websites : [],
    socialUrls:         Array.isArray(r.social_urls) ? r.social_urls : [],
    flyers:             Array.isArray(r.flyers) ? r.flyers : [],
    streetAddress:      r.street_address,
    city:               r.city,
    state:              r.state,
    stateCode:          r.state_code,
    status:             r.status,
    createdAt:          new Date(r.created_at).toISOString(),
  }));
}

export default async function ResourcesPage() {
  const resources = await getResources();

  return (
    <div className="px-4 py-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-medium">Resources</h1>
          <Link
            href="/add-resource"
            className="flex items-center gap-2 bg-black text-white
              text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Resource
          </Link>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Grants, free seminars, legal help and more for street
          vendors and home-based businesses. Anyone can post.
        </p>

        {/* Listings */}
        {resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center
            py-20 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"
              strokeLinejoin="round" className="mb-3">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <p className="text-gray-400">No resources yet</p>
            <Link
              href="/add-resource"
              className="text-sm text-black underline mt-2"
            >
              Be the first to post one
            </Link>
          </div>
        ) : (
          <ResourceList resources={resources} />
        )}
      </div>
    </div>
  );
}
