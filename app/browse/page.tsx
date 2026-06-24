import type { Metadata } from "next";
import Link from "next/link";
import sql from "@/lib/db";

// Server-rendered link hub: a plain, crawlable index of every listed business
// so search engines can follow real <a href> links to each profile (the main
// /directory is client-rendered and fetches its list after load, so those
// links don't exist in the initial HTML). This page is additive — it doesn't
// change the interactive directory.

export const metadata: Metadata = {
  title: "Browse all vendors | VendorMaps",
  description:
    "Browse the full directory of local vendors, markets and pop-ups on VendorMaps.",
  alternates: { canonical: "/browse" },
};

// Render fresh so newly listed / expired businesses appear without a stale
// cache (same reasoning as the resources page and sitemap).
export const dynamic = "force-dynamic";

interface BrowseRow {
  slug: string;
  name: string;
  city: string | null;
  state_code: string | null;
  state: string | null;
}

async function getBusinesses(): Promise<BrowseRow[]> {
  // Mirrors the sitemap's set: every listed, non-expired business that has a
  // slug to link to. Broader than the /directory tab (which excludes events)
  // so the hub links to everything the sitemap promises.
  return sql<BrowseRow[]>`
    SELECT
      b.slug,
      b.name,
      l.city,
      l.state_code,
      l.state
    FROM businesses b
    LEFT JOIN locations l
      ON l.business_id = b.id
    WHERE b.status = 'listed'
      AND b.slug IS NOT NULL
      AND (b.expires_at IS NULL OR b.expires_at > NOW())
    ORDER BY l.state_code NULLS LAST, l.city NULLS LAST, b.name
  `;
}

// Group rows under a "City, ST" heading; rows with no location fall into a
// generic bucket so they're still linked.
function groupByLocation(rows: BrowseRow[]) {
  const groups = new Map<string, BrowseRow[]>();
  for (const row of rows) {
    const region = row.state_code || row.state;
    const key =
      row.city && region
        ? `${row.city}, ${region}`
        : row.city || region || "Other";
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()];
}

export default async function BrowsePage() {
  const businesses = await getBusinesses();
  const groups = groupByLocation(businesses);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-black">
          Browse all vendors
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          The full directory of vendors, markets and pop-ups on VendorMaps.
          Looking for the interactive list?{" "}
          <Link href="/directory" className="underline">
            Open the directory
          </Link>
          .
        </p>

        {groups.length === 0 ? (
          <p className="mt-8 text-sm text-gray-400">
            No vendors listed yet.
          </p>
        ) : (
          <div className="mt-8 space-y-8">
            {groups.map(([location, rows]) => (
              <section key={location}>
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                  {location}
                </h2>
                <ul className="mt-2 space-y-1">
                  {rows.map((b) => (
                    <li key={b.slug}>
                      <Link
                        href={`/${b.slug}`}
                        className="text-black hover:underline"
                      >
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
