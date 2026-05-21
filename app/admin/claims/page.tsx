import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";

export default async function AdminClaims() {
  await requireAdmin();

  const claims = await sql`
    SELECT
      c.*,
      b.name as business_name,
      b.slug as business_slug,
      u.email as user_email,
      u.name as user_name
    FROM claims c
    JOIN businesses b ON b.id = c.business_id
    JOIN "user" u ON u.id = c.user_id
    WHERE c.status = 'pending'
    ORDER BY c.requested_at ASC
  `;

  return (
    <div className="space-y-6">

      <div className="flex items-center
        justify-between">
        <h1 className="text-2xl font-semibold
          text-black">
          Claims
        </h1>
        <span className="text-sm text-gray-400">
          {claims.length} pending
        </span>
      </div>

      {claims.length === 0 ? (
        <div className="bg-white rounded-2xl p-8
          border-2 border-gray-100 text-center">
          <p className="text-gray-400">
            No pending claims
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim: any) => (
            <div key={claim.id}
              className="bg-white rounded-2xl p-5
                border-2 border-gray-100">

              <p className="font-semibold text-black
                mb-1">
                {claim.business_name}
              </p>

              <div className="text-xs text-gray-500
                space-y-1 mb-4">
                <p>
                  Claimed by:{" "}
                  <span className="text-black">
                    {claim.user_name}
                  </span>{" "}
                  ({claim.user_email})
                </p>
                <p>
                  Contact:{" "}
                  <span className="text-black">
                    {claim.claim_contact ||
                      "Not provided"
                    }
                  </span>
                </p>
                <p>
                  Requested:{" "}
                  {new Date(claim.requested_at)
                    .toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                </p>
              </div>

              <div className="flex gap-2">
                <form
                  action="/api/admin/approve-claim"
                  method="POST">
                  <input type="hidden"
                    name="claimId" value={claim.id}/>
                  <input type="hidden"
                    name="businessId"
                    value={claim.business_id}/>
                  <input type="hidden"
                    name="userId" value={claim.user_id}/>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-500
                      text-white text-xs font-medium
                      rounded-xl hover:bg-green-600
                      transition"
                  >
                    Approve Claim
                  </button>
                </form>

                <form
                  action="/api/admin/reject-claim"
                  method="POST">
                  <input type="hidden"
                    name="claimId" value={claim.id}/>
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
