import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";
import { approveReview, rejectReview } from "./actions";

export default async function AdminReviews() {
  await requireAdmin();

  const reviews = await sql`
    SELECT
      r.*,
      b.name as business_name,
      b.slug as business_slug
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
          {reviews.map((review: any) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl p-5
                border-2 border-gray-100"
            >
              {/* Business name and stars */}
              <div className="flex items-center
                justify-between mb-2">
                <p className="font-semibold text-black">
                  {review.business_name}
                </p>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={`text-sm
                        ${star <= review.stars
                          ? "text-black"
                          : "text-gray-200"
                        }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* Review text */}
              <p className="text-sm text-gray-600
                leading-relaxed mb-3">
                {review.review_text}
              </p>

              {/* Meta info */}
              <div className="flex items-center
                gap-3 mb-4">
                <p className="text-xs text-gray-400">
                  {review.user_email}
                </p>
                <span className="text-gray-200">·</span>
                <p className="text-xs text-gray-400">
                  {new Date(review.created_at)
                    .toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                </p>
                <span className="text-gray-200">·</span>
                <p className="text-xs text-gray-400">
                  {review.review_length} chars
                </p>
                {review.flagged && (
                  <>
                    <span className="text-gray-200">
                      ·
                    </span>
                    <p className="text-xs text-red-500">
                      🚩 Flagged
                    </p>
                  </>
                )}
              </div>

              {/* View listing link */}
              {review.business_slug && (
                <a
                  href={`/${review.business_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400
                    underline block mb-4"
                >
                  View listing →
                </a>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <form action={approveReview}>
                  <input
                    type="hidden"
                    name="reviewId"
                    value={review.id}
                  />
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

                <form action={rejectReview}>
                  <input
                    type="hidden"
                    name="reviewId"
                    value={review.id}
                  />
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