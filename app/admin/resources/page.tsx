import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";
import {
  approveResource,
  rejectResource,
  deleteResource,
} from "./actions";

export const dynamic = "force-dynamic";

function fmtDate(d: any): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

function timeRange(r: any): string {
  if (r.always_available || r.timing_type === "always")
    return "Always available";
  const start = fmtDate(r.start_date);
  const end = fmtDate(r.end_date);
  if (r.timing_type === "deadline") return end ? `Apply by ${end}` : "";
  if (start && end) return `${start} – ${end}`;
  if (end) return `Through ${end}`;
  return "";
}

export default async function AdminResources() {
  await requireAdmin();

  const pending = await sql`
    SELECT * FROM resources
    WHERE status = 'pending'
    ORDER BY created_at ASC
  `;

  const listed = await sql`
    SELECT * FROM resources
    WHERE status = 'listed'
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
    LIMIT 50
  `;

  const renderCard = (r: any, isPending: boolean) => {
    const flyers = Array.isArray(r.flyers) ? r.flyers : [];
    return (
      <div
        key={r.id}
        className="bg-white rounded-2xl p-5 border-2 border-gray-100"
      >
        <div className="flex items-start gap-4">
          {flyers[0] && (
            <img
              src={flyers[0].url}
              alt=""
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <span className="inline-block bg-gray-100 text-gray-600
              text-xs font-medium px-2 py-0.5 rounded-full mb-1">
              {r.resource_type}
            </span>
            <p className="font-semibold text-black">{r.title}</p>
            {r.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {r.description}
              </p>
            )}
            <div className="text-xs text-gray-400 mt-2 space-y-0.5">
              {timeRange(r) && <p>🗓 {timeRange(r)}</p>}
              <p>✅ {r.availability}</p>
              {(r.city || r.state_code || r.street_address) && (
                <p>
                  📍{" "}
                  {[r.street_address, r.city, r.state_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {r.walk_in_welcome && <p>🚶 Walk-ins welcome</p>}
              {(Array.isArray(r.contacts) ? r.contacts : []).map(
                (c: string, i: number) => <p key={i}>📞 {c}</p>
              )}
              {r.signup_url && (
                <p className="truncate">
                  🔗 Sign up:{" "}
                  <a
                    href={r.signup_url}
                    target="_blank"
                    className="underline"
                  >
                    {r.signup_url}
                  </a>
                </p>
              )}
              {(Array.isArray(r.websites) ? r.websites : []).map(
                (u: string, i: number) => (
                  <p key={i} className="truncate">
                    🌐{" "}
                    <a href={u} target="_blank" className="underline">
                      {u}
                    </a>
                  </p>
                )
              )}
              {(Array.isArray(r.social_urls) ? r.social_urls : []).map(
                (u: string, i: number) => (
                  <p key={i} className="truncate">
                    💬{" "}
                    <a href={u} target="_blank" className="underline">
                      {u}
                    </a>
                  </p>
                )
              )}
              <p className="text-gray-300 pt-1">
                Submitted {fmtDate(r.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {isPending && (
            <>
              <form action={approveResource}>
                <input type="hidden" name="resourceId" value={r.id} />
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white text-xs
                    font-medium rounded-xl hover:bg-green-600 transition"
                >
                  Approve
                </button>
              </form>
              <form action={rejectResource}>
                <input type="hidden" name="resourceId" value={r.id} />
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-500 text-white text-xs
                    font-medium rounded-xl hover:bg-red-600 transition"
                >
                  Reject
                </button>
              </form>
            </>
          )}
          <form action={deleteResource}>
            <input type="hidden" name="resourceId" value={r.id} />
            <button
              type="submit"
              className="px-4 py-2 bg-gray-200 text-gray-700 text-xs
                font-medium rounded-xl hover:bg-gray-300 transition"
            >
              Delete
            </button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Pending */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black">
            Resources
          </h1>
          <span className="text-sm text-gray-400">
            {pending.length} pending
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border-2
            border-gray-100 text-center">
            <p className="text-gray-400">No pending resources</p>
          </div>
        ) : (
          pending.map((r: any) => renderCard(r, true))
        )}
      </div>

      {/* Listed */}
      {listed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-black">
            Live resources ({listed.length})
          </h2>
          {listed.map((r: any) => renderCard(r, false))}
        </div>
      )}
    </div>
  );
}
