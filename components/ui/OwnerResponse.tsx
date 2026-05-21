"use client";

import { useState } from "react";

interface OwnerResponseProps {
  reviewId:       string;
  businessSlug:   string;
  existingResponse?: string;
  isOwner:        boolean;
}

export default function OwnerResponse({
  reviewId,
  businessSlug,
  existingResponse,
  isOwner,
}: OwnerResponseProps) {
  const [editing, setEditing] = useState(false);
  const [response, setResponse] = useState(
    existingResponse || ""
  );
  const [saved, setSaved] = useState(
    existingResponse || ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!response.trim()) {
      setError("Response cannot be empty");
      return;
    }
    if (response.trim().length < 10) {
      setError(
        "Response must be at least 10 characters"
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(
        `/api/reviews/${businessSlug}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reviewId,
            responseText: response,
          }),
        }
      );

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setSaved(response.trim());
      setEditing(false);

    } catch (err) {
      setError("Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  // Show existing response to everyone
  if (saved && !editing) {
    return (
      <div className="mt-3 bg-gray-50 rounded-xl p-4">
        <div className="flex items-center
          justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg width="14" height="14"
              viewBox="0 0 24 24" fill="none"
              stroke="#22c55e" strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1
                1-5.93-9.14"/>
              <polyline
                points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p className="text-xs font-medium
              text-black">
              Response from owner
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-400
                underline"
            >
              Edit
            </button>
          )}
        </div>
        <p className="text-xs text-gray-600
          leading-relaxed">
          {saved}
        </p>
      </div>
    );
  }

  // Show response form to owner only
  if (isOwner) {
    return (
      <div className="mt-3">
        {!editing && !saved && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-black underline"
          >
            Respond as owner
          </button>
        )}

        {editing && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium
              text-black mb-2">
              Response from owner
            </p>
            <textarea
              value={response}
              onChange={(e) => {
                setResponse(e.target.value);
                if (error) setError("");
              }}
              placeholder="Write a response to this review..."
              rows={3}
              maxLength={1000}
              className="w-full border-2 border-gray-200
                rounded-xl px-3 py-2 text-xs text-black
                focus:outline-none focus:border-black
                transition resize-none"
            />
            <div className="flex items-center
              justify-between mt-1 mb-3">
              {error ? (
                <p className="text-red-500 text-xs">
                  {error}
                </p>
              ) : (
                <span />
              )}
              <p className="text-xs text-gray-400">
                {response.length}/1000
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-black text-white
                  text-xs font-medium rounded-lg
                  hover:bg-gray-800 transition
                  disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Post Response"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setResponse(saved);
                  setError("");
                }}
                className="px-4 py-2 border border-gray-200
                  text-black text-xs rounded-lg
                  hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}