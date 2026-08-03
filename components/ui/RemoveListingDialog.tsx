"use client";

import { useState, useEffect, useRef } from "react";

export type RemoveMode = "delete" | "archive" | "dismiss";

interface Props {
  businessName: string;
  /**
   * "delete" is permanent and asks the user to type the listing name.
   * "archive" takes the listing offline and is reversible, so a plain
   * confirmation is enough.
   * "dismiss" clears a dead record (a rejected claim) out of the user's own
   * history. Nothing public changes and no one else's content is touched, so
   * it is confirmed but not gated behind typing the name.
   */
  mode: RemoveMode;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * Gate the real dialog on `open` so its state is created fresh on each open
 * and torn down on close. Resetting inside an effect instead would leave a
 * previous attempt's typed name or error sitting in state between opens —
 * which for a delete would let a second confirmation through without the user
 * typing anything.
 */
export default function RemoveListingDialog(props: Props) {
  if (!props.open) return null;
  return <RemoveListingDialogInner {...props} />;
}

function RemoveListingDialogInner({
  businessName,
  mode,
  onClose,
  onConfirm,
}: Props) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "delete") inputRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  const isDelete  = mode === "delete";
  const isDismiss = mode === "dismiss";
  // Case- and whitespace-insensitive: the point is deliberate confirmation,
  // not an exact-transcription test.
  const nameMatches =
    typed.trim().toLowerCase() === businessName.trim().toLowerCase();
  const canConfirm = (!isDelete || nameMatches) && !submitting;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
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
        aria-labelledby="remove-listing-title"
        className="bg-white rounded-2xl w-full max-w-sm
          p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="remove-listing-title"
          className="text-base font-semibold text-black"
        >
          {isDelete
            ? "Delete this listing?"
            : isDismiss
              ? "Remove this claim?"
              : "Archive this listing?"}
        </h2>

        <div className="text-sm text-gray-500 mt-2 space-y-2">
          {isDelete ? (
            <p>
              <span className="font-medium text-black">
                {businessName}
              </span>{" "}
              and its photos will be permanently deleted.
              This can&apos;t be undone.
            </p>
          ) : isDismiss ? (
            <>
              <p>
                Your rejected claim for{" "}
                <span className="font-medium text-black">
                  {businessName}
                </span>{" "}
                will be removed from your submissions.
              </p>
              <p>
                The listing itself isn&apos;t affected — only
                your claim record is cleared. You can claim it
                again later if you need to.
              </p>
            </>
          ) : (
            <>
              <p>
                <span className="font-medium text-black">
                  {businessName}
                </span>{" "}
                will be hidden from the map, directory and
                search.
              </p>
              <p>
                Nothing is deleted — its photos, reviews and
                verified ownership are all kept, so you can
                put it back online whenever you want.
              </p>
            </>
          )}
        </div>

        {isDelete && (
          <div className="mt-4">
            <label
              htmlFor="confirm-name"
              className="text-xs text-gray-500 block mb-1.5"
            >
              Type{" "}
              <span className="font-medium text-black">
                {businessName}
              </span>{" "}
              to confirm
            </label>
            <input
              id="confirm-name"
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={submitting}
              autoComplete="off"
              className="w-full border-2 border-gray-200
                rounded-xl px-3 py-2 text-sm text-black
                focus:border-black focus:outline-none
                disabled:bg-gray-50"
            />
          </div>
        )}

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
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 text-white text-xs
              font-medium py-2.5 rounded-xl transition
              disabled:opacity-40
              ${isDelete
                ? "bg-red-600 hover:bg-red-700"
                : "bg-black hover:bg-gray-800"
              }`}
          >
            {submitting
              ? "Working…"
              : isDelete
                ? "Delete permanently"
                : isDismiss
                  ? "Remove claim"
                  : "Take down"}
          </button>
        </div>
      </div>
    </div>
  );
}
