import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/db";
import Link from "next/link";
import { acceptReport, dismissReport } from "./actions";

interface ReportRow {
  id: string;
  business_id: string;
  business_name: string;
  business_slug: string | null;
  business_status: string;
  reason: string;
  details: string | null;
  reported_by: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  created_at: string;
  report_count: number;
}

const REASON_LABELS: Record<string, string> = {
  closed:        "No longer in service",
  moved:         "Moved location",
  wrong_info:    "Wrong / outdated info",
  duplicate:     "Duplicate listing",
  inappropriate: "Inappropriate or spam",
  other:         "Other",
};

export default async function AdminReports() {
  await requireAdmin();

  // One row per open report, plus how many open reports the same business has.
  // The count is what makes this queue triageable: five people flagging one
  // shop is far stronger evidence than one, and it should be reviewed first.
  const reports = await sql<ReportRow[]>`
    SELECT
      r.*,
      b.name   AS business_name,
      b.slug   AS business_slug,
      b.status AS business_status,
      u.name   AS reporter_name,
      u.email  AS reporter_email,
      COUNT(*) OVER (PARTITION BY r.business_id) AS report_count
    FROM business_reports r
    JOIN businesses b ON b.id = r.business_id
    LEFT JOIN "user" u ON u.id = r.reported_by
    WHERE r.status = 'open'
    ORDER BY
      COUNT(*) OVER (PARTITION BY r.business_id) DESC,
      r.business_id,
      r.created_at ASC
  `;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black">
          Reports
        </h1>
        <span className="text-sm text-gray-400">
          {reports.length} open
        </span>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">
            No open reports
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border-2 border-gray-100
                rounded-2xl p-4"
            >
              <div className="flex items-start
                justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2
                    flex-wrap">
                    {report.business_slug ? (
                      <Link
                        href={`/${report.business_slug}`}
                        target="_blank"
                        className="font-semibold text-black
                          text-sm underline"
                      >
                        {report.business_name}
                      </Link>
                    ) : (
                      <span className="font-semibold
                        text-black text-sm">
                        {report.business_name}
                      </span>
                    )}

                    {Number(report.report_count) > 1 && (
                      <span className="text-xs
                        bg-red-100 text-red-700
                        px-2 py-0.5 rounded-full
                        font-medium">
                        {report.report_count} reports
                      </span>
                    )}

                    {report.business_status !== "listed" && (
                      <span className="text-xs
                        bg-gray-100 text-gray-500
                        px-2 py-0.5 rounded-full">
                        already {report.business_status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 mt-1.5">
                    {REASON_LABELS[report.reason] ||
                      report.reason}
                  </p>

                  {report.details && (
                    <p className="text-sm text-gray-700
                      mt-2 bg-gray-50 rounded-xl p-3">
                      {report.details}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    {report.reporter_email
                      ? `${report.reporter_name || "User"} · ${report.reporter_email}`
                      : "Anonymous visitor"
                    }
                    {" · "}
                    {new Date(report.created_at)
                      .toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                {/* Accepting resolves every open report on this business,
                    so it's hidden once the listing is already down. */}
                {report.business_status === "listed" && (
                  <form action={acceptReport}>
                    <input type="hidden" name="businessId"
                      value={report.business_id}/>
                    <button
                      type="submit"
                      className="text-xs bg-red-600
                        text-white px-3 py-1.5 rounded-lg
                        hover:bg-red-700 transition"
                    >
                      Take listing down
                    </button>
                  </form>
                )}

                <form action={dismissReport}>
                  <input type="hidden" name="reportId"
                    value={report.id}/>
                  <button
                    type="submit"
                    className="text-xs border
                      border-gray-200 text-black
                      px-3 py-1.5 rounded-lg
                      hover:bg-gray-50 transition"
                  >
                    Dismiss
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
