"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "@/lib/auth-client";

export default function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
  };

  return (
    <>
      {/* Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: "var(--primary)" }}>
        <div className="relative flex items-center px-4 max-w-lg mx-auto" style={{ height: "56px" }}>

          {/* Left spacer — balances the hamburger */}
          <div className="w-10" />

          {/* Logo + name — centered */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
          >
            <Image
              src="/vmapsLOGO.png"
              alt="Vendor Maps"
              width={32}
              height={32}
              className="object-contain"
              style={{ width: 32, height: "auto" }}
              priority
            />
            <span className="text-white font-semibold text-base tracking-tight">
              Vendor Maps
            </span>
          </Link>

          {/* Hamburger Button — right */}
          <button
            onClick={() => setMenuOpen(true)}
            className="ml-auto p-2 rounded-lg hover:bg-orange-600 transition text-white"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-50"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Slide Out Menu */}
      <div className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-xl transform transition-transform duration-300 ${menuOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Menu Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 font-medium text-gray-700" >
          <span className="font-medium">Menu</span>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Menu Links */}
        <div className="flex flex-col py-4 text-gray-700">

          {/* Main Links */}
          <MenuLink
            href="/resources"
            onClick={() => setMenuOpen(false)}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            }
          >
            Resources
          </MenuLink>

          <MenuLink
            href="/about"
            onClick={() => setMenuOpen(false)}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            }
          >
            About
          </MenuLink>

          <MenuLink
            href="/contact"
            onClick={() => setMenuOpen(false)}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            }
          >
            Contact
          </MenuLink>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-3 mx-4" />

          {/* Owner Links — only if logged in */}
          {session && (
            <>
              <MenuLink
                href="/my-listings"
                onClick={() => setMenuOpen(false)}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                }
              >
                My Listings
              </MenuLink>

              <MenuLink
                href="/my-submissions"
                onClick={() => setMenuOpen(false)}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0
                      0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                }
              >
                My Submissions
              </MenuLink>

              {/* Divider */}
              <div className="h-px bg-gray-100 my-3 mx-4" />

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition text-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </>
          )}

        </div>
      </div>
    </>
  );
}

// Reusable menu link component
function MenuLink({
  href,
  onClick,
  icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 transition"
    >
      <span className="text-gray-500">{icon}</span>
      {children}
    </Link>
  );
}