"use client";

import dynamic from "next/dynamic";

const HereMap = dynamic(
  () => import("@/components/map/HereMap"),
  { ssr: false }
);

export default function MapPage() {
  return (
    <div
      style={{
        position: "fixed",
        top: "56px",
        bottom: "64px",
        left: 0,
        right: 0,
      }}
    >
      <HereMap />
    </div>
  );
}
