import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";

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
            <div key={review.id}
              className="bg-white rounded-2xl p-5
                border-2 border-gray-100">

              <div className="flex items-center
                justify-between mb-2">
                <p className="font-semibold text-black">
                  {review.business_name}
                </p>
                <div className="flex">
                  {[1,2,3,4,5].map(star => (
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

              <p className="text-sm text-gray-600
                mb-4 leading-relaxed">
                {review.review_text}
              </p>

              <p className="text-xs text-gray-400 mb-4">
                {review.user_email} ·{" "}
                {new Date(review.created_at)
                  .toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
              </p>

              <div className="flex gap-2">
                <form
                  action="/api/admin/approve-review"
                  method="POST">
                  <input type="hidden"
                    name="reviewId" value={review.id}/>
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

                <form
                  action="/api/admin/reject-review"
                  method="POST">
                  <input type="hidden"
                    name="reviewId" value={review.id}/>
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