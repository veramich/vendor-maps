"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">

        {/* Map */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition
            ${pathname === "/" ? "text-black" : "text-gray-400 hover:text-gray-600"}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
            <line x1="9" y1="3" x2="9" y2="18"/>
            <line x1="15" y1="6" x2="15" y2="21"/>
          </svg>
          <span className="text-xs">Map</span>
        </Link>

        {/* Directory */}
        <Link
          href="/directory"
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition
            ${pathname === "/directory" ? "text-black" : "text-gray-400 hover:text-gray-600"}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span className="text-xs">Directory</span>
        </Link>

        {/* Add Business */}
        <Link
          href="/add-business"
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition
            ${pathname === "/add-business" ? "text-black" : "text-gray-400 hover:text-gray-600"}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          <span className="text-xs">Add</span>
        </Link>

        {/* Saved — only show if logged in */}
        {session ? (
          <Link
            href="/saved"
            className={`flex flex-col items-center
              gap-1 text-xs transition
              ${pathname === "/saved"
                ? "text-black"
                : "text-gray-400"
              }`}
          >
            <svg width="22" height="22"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0
                1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            Saved
          </Link>
        ) : (
          <Link
            href="/sign-in"
            className={`flex flex-col items-center
              gap-1 text-xs transition
              ${pathname === "/sign-in"
                ? "text-black"
                : "text-gray-400"
              }`}
          >
            <svg width="22" height="22"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4
                0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Sign In
          </Link>
        )}

        {/* Profile or Sign In */}
        <Link
          href={session ? "/profile" : "/sign-in"}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition
            ${pathname === "/profile" || pathname === "/sign-in"
              ? "text-black"
              : "text-gray-400 hover:text-gray-600"}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="text-xs">
            {session ? "Profile" : "Sign In"}
          </span>
        </Link>

      </div>

      {/* Safe area for iPhone home indicator */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}