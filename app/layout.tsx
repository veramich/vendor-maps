import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNavWrapper from "@/components/navigation/BottomNavWrapper";
import HeaderWrapper from "@/components/navigation/HeaderWrapper";
import CookieConsent from "@/components/ui/CookieConsent";
import SubmissionAdopter from "@/components/auth/SubmissionAdopter";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes every relative metadata URL (OG/Twitter images, canonicals) resolve
  // to an absolute production URL. Without this, shared links can ship broken
  // image paths.
  metadataBase: new URL("https://vendormaps.net"),
  title: "VendorMaps",
  description: "Find local vendors, markets and pop-ups near you",
  alternates: {
    canonical: "/",
  },
  // An explicit `icons` object opts out of the app/apple-icon.png file
  // convention's auto-detection, so the apple-touch-icon is listed by hand.
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Launches fullscreen (no Safari chrome) when opened from the iOS home
  // screen. The home-screen icon itself comes from app/apple-icon.png via
  // the file convention.
  appleWebApp: {
    capable: true,
    title: "VendorMaps",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "VendorMaps",
    description: "Find local vendors, markets and pop-ups near you",
    url: "/",
    siteName: "VendorMaps",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

// Tints the browser/status bar chrome to match the brand orange. Must live in
// the `viewport` export — `metadata.themeColor` is deprecated.
export const viewport: Viewport = {
  themeColor: "#FF7300",
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
        <SubmissionAdopter />
      </body>
    </html>
  );
}
