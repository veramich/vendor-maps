import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VendorMaps",
    // Home screens truncate at roughly 12 characters.
    short_name: "VendorMaps",
    description: "Find local vendors, markets and pop-ups near you",
    start_url: "/",
    display: "standalone",
    background_color: "#FF7300",
    theme_color: "#FF7300",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Art is inset to the 80% safe zone so Android can crop this to any
      // shape (circle, squircle) without clipping the umbrella.
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
