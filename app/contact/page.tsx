import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact · VendorMaps",
  description:
    "Get in touch with VendorMaps. Share suggestions, report issues, or list your business — every message is read and answered personally.",
};
 
export default function ContactPage() {
  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold text-black">Get in touch</h1>
      <p className="mt-3 leading-relaxed text-gray-600">
        This is the very first version of VendorMaps, and your input genuinely
        shapes where it goes next. Have a suggestion, ran into a bug, or
        something just didn't work the way you expected? Please reach
        out. No issue is too small. I read and reply to every
        message personally.
      </p>
      <p className="mt-3 leading-relaxed text-gray-600">
        Whether you want to share feedback, get your business listed, or just
        say hello, I'd love to hear from you.
      </p>

      <div className="mt-8 space-y-4">
        {/* Email */}
        <a
          href="mailto:hello@vendormaps.net"
          className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 transition hover:border-orange-300 hover:bg-gray-50"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <div>
            <div className="text-sm font-medium text-black">Email</div>
            <div className="text-sm text-gray-500">hello@vendormaps.net</div>
          </div>
        </a>

        {/* Instagram */}
        <a
          href="https://www.instagram.com/vendormaps"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 transition hover:border-orange-300 hover:bg-gray-50"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          <div>
            <div className="text-sm font-medium text-black">Instagram</div>
            <div className="text-sm text-gray-500">@vendormaps</div>
          </div>
        </a>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-gray-500">
        Thank you for being one of the first to use VendorMaps. Every
        suggestion helps make it better for vendors and the people who love
        them.
      </p>
    </div>
  );
}
