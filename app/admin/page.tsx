import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";
import Link from "next/link";

interface RecentRow {
  id: string;
  name: string;
  status: string;
  sub_type: string | null;
  created_at: string;
}

export default async function AdminDashboard() {
  await requireAdmin();

  // Get counts
  const [pending] = await sql`
    SELECT COUNT(*) as count
    FROM businesses
    WHERE status = 'pending'
  `;

  const [listed] = await sql`
    SELECT COUNT(*) as count
    FROM businesses
    WHERE status = 'listed'
  `;

  const [claims] = await sql`
    SELECT COUNT(*) as count
    FROM claims
    WHERE status = 'pending'
  `;

  const [reviews] = await sql`
    SELECT COUNT(*) as count
    FROM reviews
    WHERE status = 'pending'
  `;

  const [resources] = await sql`
    SELECT COUNT(*) as count
    FROM resources
    WHERE status = 'pending'
  `;

  const byType = await sql<{ type: string; count: number }[]>`
    SELECT type, COUNT(*) as count
    FROM businesses
    WHERE status = 'listed'
    GROUP BY type
    ORDER BY count DESC
  `;

  // Recent submissions
  const recent = await sql<RecentRow[]>`
    SELECT id, name, type, sub_type,
           status, created_at
    FROM businesses
    ORDER BY created_at DESC
    LIMIT 5
  `;

  const stats = [
    {
      label:  "Pending Submissions",
      value:  pending.count,
      href:   "/admin/submissions",
      urgent: Number(pending.count) > 0,
    },
    {
      label:  "Listed Businesses",
      value:  listed.count,
      href:   "/admin/businesses",
      urgent: false,
    },
    {
      label:  "Pending Claims",
      value:  claims.count,
      href:   "/admin/claims",
      urgent: Number(claims.count) > 0,
    },
    {
      label:  "Pending Reviews",
      value:  reviews.count,
      href:   "/admin/reviews",
      urgent: Number(reviews.count) > 0,
    },
    {
      label:  "Pending Resources",
      value:  resources.count,
      href:   "/admin/resources",
      urgent: Number(resources.count) > 0,
    },
  ];

  return (
    <div className="space-y-8">

      <h1 className="text-2xl font-semibold
        text-black">
        Dashboard
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`bg-white rounded-2xl p-5
              border-2 hover:border-gray-300
              transition
              ${stat.urgent
                ? "border-orange-200 bg-orange-50"
                : "border-gray-100"
              }`}
          >
            <p className={`text-3xl font-bold mb-1
              ${stat.urgent
                ? "text-orange-500"
                : "text-black"
              }`}>
              {stat.value}
            </p>
            <p className="text-sm text-gray-500">
              {stat.label}
            </p>
            {stat.urgent && Number(stat.value) > 0 && (
              <p className="text-xs text-orange-500
                mt-1">
                Needs attention →
              </p>
            )}
          </Link>
        ))}
      </div>

      {/* By type breakdown */}
      {byType.length > 0 && (
        <div className="bg-white rounded-2xl p-5
          border-2 border-gray-100">
          <h2 className="text-sm font-semibold
            text-black mb-4">
            Listed By Type
          </h2>
          <div className="space-y-2">
            {byType.map((row) => (
              <div key={row.type}
                className="flex justify-between
                  text-sm">
                <span className="text-gray-600
                  capitalize">
                  {row.type.replace(/_/g, " ")}
                </span>
                <span className="font-medium
                  text-black">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent submissions */}
      <div className="bg-white rounded-2xl p-5
        border-2 border-gray-100">
        <div className="flex items-center
          justify-between mb-4">
          <h2 className="text-sm font-semibold
            text-black">
            Recent Submissions
          </h2>
          <Link
            href="/admin/submissions"
            className="text-xs text-black underline"
          >
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-gray-400">
            No submissions yet
          </p>
        ) : (
          <div className="space-y-3">
            {recent.map((b) => (
              <div key={b.id}
                className="flex items-center
                  justify-between">
                <div>
                  <p className="text-sm font-medium
                    text-black">
                    {b.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {b.sub_type?.replace(/_/g, " ")} ·{" "}
                    {new Date(b.created_at)
                      .toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1
                  rounded-full font-medium
                  ${b.status === "pending"
                    ? "bg-orange-100 text-orange-600"
                    : b.status === "listed"
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-500"
                  }`}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}