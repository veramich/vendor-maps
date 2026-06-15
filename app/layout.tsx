import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNavWrapper from "@/components/navigation/BottomNavWrapper";
import HeaderWrapper from "@/components/navigation/HeaderWrapper";
import CookieConsent from "@/components/ui/CookieConsent";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VendorMaps",
  description: "Find local vendors, markets and pop-ups near you",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "VendorMaps",
    description: "Find local vendors, markets and pop-ups near you",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <HeaderWrapper />
        <main className="pt-14 pb-20">
          {children}
        </main>
        <BottomNavWrapper />
        <CookieConsent />
      </body>
    </html>
  );
}
