"use client";

import dynamic from "next/dynamic";

const Header = dynamic(
  () => import("@/components/navigation/Header"),
  { ssr: false }
);

export default function HeaderWrapper() {
  return <Header />;
}