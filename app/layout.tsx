import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import BottomNavWrapper from "@/components/navigation/BottomNavWrapper";
import HeaderWrapper from "@/components/navigation/HeaderWrapper";
import ConstructionBannerWrapper from "@/components/ui/ConstructionBannerDynamic";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vendor Maps",
  description: "Find local vendors, markets and pop-ups near you",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Vendor Maps",
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
      <head>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "vxvurldpvd");`}
        </Script>
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConstructionBannerWrapper />
        <HeaderWrapper />
        <main className="pt-14 pb-20">
          {children}
        </main>
        <BottomNavWrapper />
      </body>
    </html>
  );
}
