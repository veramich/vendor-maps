import type { MetadataRoute } from "next";
import sql from "@/lib/db";

const BASE_URL = "https://vendormaps.net";

// Regenerate on every request so newly listed / expired listings are reflected
// without a stale cache (same reasoning as the resources page).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Public, indexable static routes. Auth, dashboard, admin and submission
  // flows are intentionally excluded — they're gated and have no SEO value.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/directory`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/browse`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/resources`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Only listed, non-expired businesses that actually have a slug to link to.
  const businesses = await sql<{ slug: string; updated_at: Date }[]>`
    SELECT slug, updated_at
    FROM businesses
    WHERE status = 'listed'
      AND slug IS NOT NULL
      AND (expires_at IS NULL OR expires_at > NOW())
  `;

  const businessRoutes: MetadataRoute.Sitemap = businesses.map((b) => ({
    url: `${BASE_URL}/${b.slug}`,
    lastModified: b.updated_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...businessRoutes];
}
