"use client";

import { useState } from "react";
import { deleteEvent } from "./actions";

interface Props {
  businessId: string;
  name: string;
}

export default function DeleteEventButton({ businessId, name }: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const matches = typed === name;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-red-600 underline"
      >
        Delete
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
              Delete this event?
            </h2>

            <p className="text-sm text-gray-600">
              This permanently deletes{" "}
              <span className="font-medium text-black">{name}</span>{" "}
              and everything attached to it — its location and map
              pin, dates, photos, vendor spaces, reviews, and any
              claims. This cannot be undone.
            </p>

            <div className="space-y-2">
              <label
                htmlFor="confirmName"
                className="block text-xs text-gray-500"
              >
                Type the event name to confirm
              </label>
              <input
                id="confirmName"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={name}
                autoComplete="off"
                className="w-full rounded-lg border-2
                  border-gray-200 px-3 py-2 text-sm
                  text-black focus:border-black
                  focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTyped("");
                }}
                className="px-4 py-2 text-sm text-gray-600
                  rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>

              <form action={deleteEvent}>
                <input
                  type="hidden"
                  name="businessId"
                  value={businessId}
                />
                <input
                  type="hidden"
                  name="confirmName"
                  value={typed}
                />
                <button
                  type="submit"
                  disabled={!matches}
                  className="px-4 py-2 text-sm font-medium
                    rounded-lg text-white bg-red-600
                    hover:bg-red-700
                    disabled:bg-gray-200
                    disabled:text-gray-400
                    disabled:cursor-not-allowed"
                >
                  Delete event
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
