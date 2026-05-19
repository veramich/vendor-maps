import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";
import Link from "next/link";

export default async function AdminReviews() {
  await requireAdmin();

  const reviews = await sql`
    SELECT
      r.*,
      b.name  AS business_name,
      b.slug  AS business_slug
    FROM reviews r
    JOIN businesses b ON b.id = r.business_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
  `;

  return (
    <div className="space-y-6">

      <div className="flex items-center
        justify-between">
        <h1 className="text-2xl font-semibold
          text-black">
          Reviews
        </h1>
        <span className="text-sm text-gray-400">
          {reviews.length} pending
        </span>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-8
          border-2 border-gray-100 text-center">
          <p className="text-gray-400">
            No pending reviews
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r: any) => (
            <div key={r.id}
              className="bg-white rounded-2xl p-5
                border-2 border-gray-100">

              {/* Review header */}
              <div className="flex items-start
                justify-between mb-3">
                <div>
                  <Link
                    href={`/${r.business_slug || r.business_id}`}
                    target="_blank"
                    className="font-semibold text-black
                      hover:underline"
                  >
                    {r.business_name}
                  </Link>
                  <p className="text-xs text-gray-500
                    mt-0.5">
                    {r.user_email} ·{" "}
                    {"★".repeat(r.stars)}
                    {"☆".repeat(5 - r.stars)}
                  </p>
                  <p className="text-xs text-gray-300
                    mt-1">
                    {new Date(r.created_at)
                      .toLocaleDateString("en-US", {
                        month: "short",
                        day:   "numeric",
                        year:  "numeric",
                      })}
                  </p>
                </div>
                {r.flagged && (
                  <span className="text-xs px-2 py-1
                    rounded-full bg-red-100
                    text-red-600 font-medium">
                    Flagged
                  </span>
                )}
              </div>

              {/* Review text */}
              <p className="text-sm text-gray-600
                mb-4 leading-relaxed">
                {r.review_text}
              </p>

              {/* Flag reason */}
              {r.flag_reason && (
                <p className="text-xs text-red-500
                  mb-4">
                  Flag reason: {r.flag_reason}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <form action="/api/admin/approve-review"
                  method="POST">
                  <input type="hidden"
                    name="reviewId" value={r.id}/>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-500
                      text-white text-xs font-medium
                      rounded-xl hover:bg-green-600
                      transition"
                  >
                    Approve
                  </button>
                </form>

                <form action="/api/admin/reject-review"
                  method="POST">
                  <input type="hidden"
                    name="reviewId" value={r.id}/>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-500
                      text-white text-xs font-medium
                      rounded-xl hover:bg-red-600
                      transition"
                  >
                    Reject
                  </button>
                </form>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
