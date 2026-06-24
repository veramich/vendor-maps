import type { MetadataRoute } from "next";

const BASE_URL = "https://vendormaps.net";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Gated, private, or no-SEO-value routes — keep them out of the index.
      disallow: [
        "/api/",
        "/admin/",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/profile",
        "/saved",
        "/my-listings",
        "/my-resources",
        "/my-submissions",
        "/claim/",
        "/add-business",
        "/add-resource",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
