import { requireAdmin } from "@/lib/adminAuth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Admin header */}
      <div className="bg-black text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex
          items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-white opacity-60
                hover:opacity-100 text-sm"
            >
              ← Vendor Maps
            </Link>
            <span className="text-white opacity-30">
              /
            </span>
            <span className="text-white text-sm
              font-medium">
              Admin
            </span>
          </div>
          <span className="text-xs text-white
            opacity-40">
            Internal only
          </span>
        </div>
      </div>

      {/* Admin nav */}
      <div className="bg-white border-b
        border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { href: "/admin",              label: "Overview" },
              { href: "/admin/submissions",  label: "Submissions" },
              { href: "/admin/claims",       label: "Claims" },
              { href: "/admin/reviews",      label: "Reviews" },
              { href: "/admin/businesses",   label: "All Businesses" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-3 text-sm
                  text-gray-600 hover:text-black
                  whitespace-nowrap border-b-2
                  border-transparent
                  hover:border-gray-300 transition"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </div>

    </div>
  );
}