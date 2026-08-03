"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  businessId: string;
  businessName: string;
}

const REASONS: { value: string; label: string }[] = [
  { value: "closed",        label: "Permanently closed / no longer in service" },
  { value: "moved",         label: "Moved to a different location" },
  { value: "wrong_info",    label: "Information is wrong or out of date" },
  { value: "duplicate",     label: "Duplicate of another listing" },
  { value: "inappropriate", label: "Inappropriate or spam" },
  { value: "other",         label: "Something else" },
];

/**
 * "Report this listing" — available to every visitor, signed in or not.
 *
 * Submitting only queues a report for admin review; it never changes what the
 * public sees. The copy says so explicitly, so a reporter doesn't expect the
 * listing to vanish and file the same report repeatedly.
 */
export default function ReportListingButton({
  businessId,
  businessName,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 underline
          hover:text-gray-600 transition"
      >
        This business is no longer in service
      </button>

      {open && (
        <ReportDialog
          businessId={businessId}
          businessName={businessName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// Split out so its state is created fresh per open and torn down on close —
// same reasoning as RemoveListingDialog.
function ReportDialog({
  businessId,
  businessName,
  onClose,
}: Props & { onClose: () => void }) {
  const [reason, setReason] = useState("closed");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, details }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error || "Could not send that report. Please try again."
        );
        setSubmitting(false);
        return;
      }

      setDone(true);
    } catch {
      setError("Could not send that report. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center
        justify-center p-4 bg-black/40"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-listing-title"
        className="bg-white rounded-2xl w-full max-w-sm
          p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <>
            <h2
              id="report-listing-title"
              className="text-base font-semibold text-black"
            >
              Thanks for letting us know
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              We&apos;ll review {businessName} and update the
              listing if needed.
            </p>
            <button
              type="button"
              ref={closeRef}
              onClick={onClose}
              className="w-full bg-black text-white text-xs
                font-medium py-2.5 rounded-xl mt-5
                hover:bg-gray-800 transition"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <h2
              id="report-listing-title"
              className="text-base font-semibold text-black"
            >
              Report this listing
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Tell us what&apos;s wrong with{" "}
              <span className="font-medium text-black">
                {businessName}
              </span>
              . Our team reviews every report before anything
              changes.
            </p>

            <div className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-start gap-2
                    text-sm text-black cursor-pointer"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    disabled={submitting}
                    className="mt-0.5 accent-black"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-4">
              <label
                htmlFor="report-details"
                className="text-xs text-gray-500 block mb-1.5"
              >
                Anything else we should know? (optional)
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                disabled={submitting}
                rows={3}
                maxLength={1000}
                className="w-full border-2 border-gray-200
                  rounded-xl px-3 py-2 text-sm text-black
                  focus:border-black focus:outline-none
                  disabled:bg-gray-50 resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 mt-3">
                {error}
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 border-2 border-gray-200
                  text-black text-xs font-medium py-2.5
                  rounded-xl hover:bg-gray-50 transition
                  disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex-1 bg-black text-white text-xs
                  font-medium py-2.5 rounded-xl
                  hover:bg-gray-800 transition
                  disabled:opacity-40"
              >
                {submitting ? "Sending…" : "Send report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
