import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.0.0.41",
    "http://10.0.0.41",
    "http://10.0.0.41:3000",
    "localhost",
    "http://localhost:3000",
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
