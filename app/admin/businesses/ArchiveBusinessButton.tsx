"use client";

import { useState } from "react";
import { archiveBusiness, restoreBusiness } from "./actions";

interface Props {
  businessId: string;
  name: string;
  status: string;
  /**
   * Why the listing is currently down, when it is. Shown on the restore
   * confirmation so an admin knows what they are undoing — particularly
   * whether it was the owner's own choice or a moderation call.
   */
  unlistedReason?: string | null;
}

/**
 * Archive / restore control for the admin business table.
 *
 * Archiving asks for confirmation but not a typed name (unlike DeleteEventButton):
 * nothing is destroyed and the same screen can put it straight back, so the
 * friction of transcribing the name would buy nothing.
 */
export default function ArchiveBusinessButton({
  businessId,
  name,
  status,
  unlistedReason,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const isArchived = status === "unlisted";

  // A listing that is neither live nor archived (pending, rejected, duplicate,
  // expired) is already out of public view and belongs to the moderation
  // queue's flow, not this one.
  if (status !== "listed" && !isArchived) return null;

  const close = () => {
    setOpen(false);
    setReason("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-xs underline ${
          isArchived ? "text-green-700" : "text-orange-600"
        }`}
      >
        {isArchived ? "Restore" : "Archive"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center
            justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border-2
            border-gray-100 w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-black">
              {isArchived
                ? "Put this listing back online?"
                : "Archive this listing?"}
            </h2>

            {isArchived ? (
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <span className="font-medium text-black">
                    {name}
                  </span>{" "}
                  will be live again on the map, directory and
                  search.
                </p>
                {unlistedReason && (
                  <p className="text-xs text-gray-500
                    bg-gray-50 rounded-lg p-3">
                    Taken down because:{" "}
                    <span className="text-black">
                      {unlistedReason}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <span className="font-medium text-black">
                    {name}
                  </span>{" "}
                  will be hidden from the map, directory and
                  search.
                </p>
                <p>
                  Nothing is deleted — its photos, reviews and
                  ownership are kept, and you can restore it
                  from this same screen.
                </p>
              </div>
            )}

            {!isArchived && (
              <div className="space-y-2">
                <label
                  htmlFor={`reason-${businessId}`}
                  className="block text-xs text-gray-500"
                >
                  Reason (optional — kept for the record)
                </label>
                <input
                  id={`reason-${businessId}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Permanently closed"
                  autoComplete="off"
                  maxLength={200}
                  className="w-full rounded-lg border-2
                    border-gray-200 px-3 py-2 text-sm
                    text-black focus:border-black
                    focus:outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-sm text-gray-600
                  rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>

              <form
                action={isArchived ? restoreBusiness : archiveBusiness}
              >
                <input
                  type="hidden"
                  name="businessId"
                  value={businessId}
                />
                {!isArchived && (
                  <input
                    type="hidden"
                    name="reason"
                    value={reason}
                  />
                )}
                <button
                  type="submit"
                  className={`px-4 py-2 text-sm font-medium
                    rounded-lg text-white ${
                      isArchived
                        ? "bg-black hover:bg-gray-800"
                        : "bg-orange-600 hover:bg-orange-700"
                    }`}
                >
                  {isArchived ? "Restore listing" : "Archive listing"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
