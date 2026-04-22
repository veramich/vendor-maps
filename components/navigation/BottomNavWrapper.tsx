"use client";

import dynamic from "next/dynamic";

const BottomNav = dynamic(
  () => import("@/components/navigation/BottomNav"),
  { ssr: false }
);

export default function BottomNavWrapper() {
  return <BottomNav />;
}