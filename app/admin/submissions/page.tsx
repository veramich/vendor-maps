import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";
import Link from "next/link";
import { approveSubmission, rejectSubmission, markDuplicate } from "./actions";

export default async function AdminSubmissions() {
  await requireAdmin();

  const submissions = await sql`
    SELECT
      b.*,
      l.city,
      l.state_code,
      l.street_1,
      l.street_2,
      l.street_address
    FROM businesses b
    LEFT JOIN locations l
      ON l.business_id = b.id
    WHERE b.status = 'pending'
    ORDER BY b.created_at ASC
  `;

  return (
    <div className="space-y-6">

      <div className="flex items-center
        justify-between">
        <h1 className="text-2xl font-semibold
          text-black">
          Submissions
        </h1>
        <span className="text-sm text-gray-400">
          {submissions.length} pending
        </span>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-2xl p-8
          border-2 border-gray-100 text-center">
          <p className="text-gray-400">
            No pending submissions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((b: any) => (
            <div key={b.id}
              className="bg-white rounded-2xl p-5
                border-2 border-gray-100">

              {/* Business info */}
              <div className="flex items-start
                justify-between mb-4">
                <div>
                  <p className="font-semibold
                    text-black">
                    {b.name}
                  </p>
                  <p className="text-xs text-gray-500
                    mt-0.5">
                    {b.category} ·{" "}
                    {b.sub_type?.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-400
                    mt-0.5">
                    {b.street_1 && b.street_2
                      ? `${b.street_1} & ${b.street_2}`
                      : b.street_address || ""
                    }
                    {b.city ? `, ${b.city}` : ""}
                    {b.state_code
                      ? `, ${b.state_code}`
                      : ""
                    }
                  </p>
                  <p className="text-xs text-gray-300
                    mt-1">
                    Submitted{" "}
                    {new Date(b.created_at)
                      .toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                  </p>
                </div>
                <Link
                  href={`/${b.slug || b.id}`}
                  target="_blank"
                  className="text-xs text-gray-400
                    underline"
                >
                  Preview
                </Link>
              </div>

              {/* Description preview */}
              {b.description && (
                <p className="text-xs text-gray-500
                  mb-4 line-clamp-2">
                  {b.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <form action={approveSubmission}>
                  <input type="hidden"
                    name="businessId" value={b.id}/>
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

                <form action={rejectSubmission}>
                  <input type="hidden"
                    name="businessId" value={b.id}/>
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

                <form action={markDuplicate}>
                  <input type="hidden"
                    name="businessId" value={b.id}/>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-200
                      text-gray-700 text-xs font-medium
                      rounded-xl hover:bg-gray-300
                      transition"
                  >
                    Duplicate
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