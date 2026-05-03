"use client";

import dynamic from "next/dynamic";

const ConstructionBannerDynamic = dynamic(
  () => import("@/components/ui/ConstructionBanner"),
  { ssr: false }
);

export default ConstructionBannerDynamic;
