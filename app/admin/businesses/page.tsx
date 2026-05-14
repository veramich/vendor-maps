import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";
import Link from "next/link";

export default async function AdminBusinesses() {
  await requireAdmin();

  const businesses = await sql`
    SELECT
      b.id,
      b.name,
      b.slug,
      b.type,
      b.sub_type,
      b.status,
      b.claim_status,
      b.created_at,
      l.city,
      l.state_code
    FROM businesses b
    LEFT JOIN locations l ON l.business_id = b.id
    ORDER BY b.created_at DESC
    LIMIT 50
  `;

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-semibold text-black">
        All Businesses
      </h1>

      <div className="bg-white rounded-2xl border-2
        border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b
            border-gray-100">
            <tr>
              {["Name", "Type", "Status",
                "Claim", "Location", ""].map(h => (
                <th key={h}
                  className="text-left px-4 py-3
                    text-xs text-gray-500
                    font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {businesses.map((b: any) => (
              <tr key={b.id}
                className="border-b border-gray-100
                  last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-black">
                    {b.name}
                  </p>
                </td>
                <td className="px-4 py-3
                  text-gray-500 capitalize">
                  {b.sub_type?.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1
                    rounded-full font-medium
                    ${b.status === "listed"
                      ? "bg-green-100 text-green-600"
                      : b.status === "pending"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-gray-100 text-gray-500"
                    }`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1
                    rounded-full font-medium
                    ${b.claim_status === "claimed"
                      ? "bg-green-100 text-green-600"
                      : b.claim_status === "pending"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-gray-100 text-gray-500"
                    }`}>
                    {b.claim_status}
                  </span>
                </td>
                <td className="px-4 py-3
                  text-gray-500 text-xs">
                  {b.city && b.state_code
                    ? `${b.city}, ${b.state_code}`
                    : "—"
                  }
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/${b.slug || b.id}`}
                    target="_blank"
                    className="text-xs text-black
                      underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}