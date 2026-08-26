import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: the dev server refuses to serve client bundles / HMR assets to
  // origins not listed here, so testing on a phone over the LAN yields a page
  // that renders but never hydrates (nothing interactive works). Wildcards
  // cover the usual private ranges so this keeps working when the router
  // hands out a different subnet — otherwise it silently breaks again.
  // Entries are matched against the request origin's *hostname* only, so they
  // must be bare hosts — a "http://host:3000" entry never matches anything.
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "localhost",
  ],
  images: {
    // All user-uploaded media (logos, cover photos, flyers) is served from
    // Cloudinary, so next/image needs to be allowed to optimize it.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dyvpt7u6b/**",
      },
    ],
  },
};

export default nextConfig;
