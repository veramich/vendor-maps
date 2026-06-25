import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | VendorMaps",
  description:
    "VendorMaps is a community-powered map that gives street vendors and home-based businesses an equal platform to be found.",
};

const SURVEY_SPLIT = [
  {
    label: "A map of vendors nearby",
    icon: (
      <>
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </>
    ),
  },
  {
    label: "Written reviews",
    icon: (
      <>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="7" y1="9" x2="15" y2="9" />
        <line x1="7" y1="13" x2="12" y2="13" />
      </>
    ),
  },
  {
    label: "A social media page to check",
    icon: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </>
    ),
  },
  {
    label: "Photos of the stand & products",
    icon: (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <div className="px-4 py-8 bg-white">
      <div className="max-w-2xl mx-auto text-black">
        {/* Hero */}
        <header className="text-center mb-12 px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-3">
            Putting Every Vendor on the Map
          </h1>
          <p className="text-lg leading-relaxed">
            VendorMaps is a community-powered map that gives street vendors and home-based businesses 
            an equal platform to be found.
          </p>
        </header>

        {/* Story */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-3">How it started</h2>
          <p className="leading-relaxed mb-4">
            VendorMaps was created by Patricia. The idea began in 2023, while
            she was providing graphic design and web services to small
            businesses. She kept noticing the same thing: a widening digital gap
            between street vendors and more established businesses.
          </p>
          <p className="leading-relaxed">
            We live in a digital age, and we tend to put more trust in
            businesses that have an online presence. VendorMaps is an
            interactive map built to give every vendor that same platform. This way
            a wider audience can find them, whether they&apos;re active on
            social media or not.
          </p>
        </section>

        {/* Research */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-3">What we learned</h2>
          <p className="leading-relaxed mb-6">
            In early 2026, before building VendorMaps, Patricia ran a survey to
            understand how people decide who to buy from.
          </p>

          <div className="rounded-2xl border-2 border-orange-300 bg-white p-6 text-center mb-6 shadow-[0_0_0_1px_rgba(251,146,60,0.2),0_0_12px_rgba(251,146,60,0.25)]">
            <div className="text-4xl font-semibold">50%+</div>
            <p className="mt-1 leading-relaxed">
              of participants said digital payments &mdash; Zelle, Cash App, Tap
              to Pay and more &mdash; matter when they make a purchase.
            </p>
          </div>

          <p className="leading-relaxed mb-4">
            When asked what would encourage them to try food from a new vendor,
            answers were split almost evenly across four things:
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {SURVEY_SPLIT.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-gray-700 bg-gray-800 text-white p-4 flex flex-col gap-2"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {item.icon}
                </svg>
                <span className="text-sm leading-snug">{item.label}</span>
              </div>
            ))}
          </div>

          <p className="leading-relaxed">
            Most participants admitted they had been discouraged from buying
            food or drinks from a street vendor simply because they hadn&rsquo;t
            heard any reviews. VendorMaps is built to close that gap.
          </p>
        </section>

        {/* What makes us different */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-3">What makes us different</h2>
          <p className="leading-relaxed">
            Unlike Google Maps or Yelp, VendorMaps never displays a
            business&rsquo;s exact address unless a verified owner chooses to
            share it. This protects the privacy of home-based businesses and
            gives street vendors the flexibility they need.
          </p>
        </section>

        {/* Community */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-3">A community app</h2>
          <p className="leading-relaxed">
            VendorMaps is community-powered. Anyone can add a business &mdash;
            whether it&rsquo;s their own or one they love &mdash; along with
            photos, menus, hours and reviews to help it stand out.
          </p>
        </section>

        {/* Closing CTA */}
        <section className="rounded-2xl border-2 border-orange-300 bg-white p-6 text-center mb-6 shadow-[0_0_0_1px_rgba(251,146,60,0.2),0_0_12px_rgba(251,146,60,0.25)]">
          <p className="text-lg leading-relaxed mb-6">
            We all see the fruit carts, elote ladies and food vendors around the
            neighborhood. Let&rsquo;s help them out by putting them on Vendor
            Maps.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="bg-black text-white font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition"
            >
              Explore the map
            </Link>
            <Link
              href="/add-business"
              className="border border-gray-300 text-black font-medium px-5 py-2.5 rounded-lg hover:bg-gray-100 transition"
            >
              Add a business
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
