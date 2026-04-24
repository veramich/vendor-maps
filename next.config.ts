import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.0.0.41",
    "http://10.0.0.41",
    "http://10.0.0.41:3000",
    "localhost",
    "http://localhost:3000",
  ],
  /* config options here */
};

export default nextConfig;
