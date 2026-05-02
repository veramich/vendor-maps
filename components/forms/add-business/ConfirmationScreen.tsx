"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";

interface ConfirmationScreenProps {
  businessName: string;
  onAnotherLocation: () => void;
  onDifferentBusiness: () => void;
  onDone: () => void;
}

export default function ConfirmationScreen({
  businessName,
  onAnotherLocation,
  onDifferentBusiness,
  onDone,
}: ConfirmationScreenProps) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center
        justify-center px-6 text-center">

        {/* Success icon */}
        <div className="w-20 h-20 bg-green-100
          rounded-full flex items-center
          justify-center mb-6">
          <svg width="40" height="40"
            viewBox="0 0 24 24" fill="none"
            stroke="#22c55e" strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold
          text-black mb-3">
          Submitted successfully
        </h2>

        {/* Business name */}
        <p className="text-gray-500 mb-2">
          <span className="font-medium text-black">
            {businessName}
          </span>{" "}
          has been submitted and is under review.
        </p>

        {/* Tracking message */}
        {session ? (
          <Link
            href="/my-submissions"
            className="text-sm text-black underline mb-12"
          >
            Track your submission in My Submissions →
          </Link>
        ) : (
          <p className="text-sm text-gray-400 mb-12">
            <Link
              href="/sign-up"
              className="text-black underline"
            >
              Create an account
            </Link>
            {" "}to track the status of your submission
          </p>
        )}

        {/* Options */}
        <div className="w-full max-w-sm space-y-3">

          <button
            onClick={onAnotherLocation}
            className="w-full border-2 border-gray-200
              rounded-2xl px-4 py-4 text-left
              hover:border-gray-300 transition
              active:scale-95"
          >
            <p className="font-medium text-sm
              text-black mb-1">
              Add another location of this business
            </p>
            <p className="text-xs text-gray-400">
              Same brand, different address
            </p>
          </button>

          <button
            onClick={onDifferentBusiness}
            className="w-full border-2 border-gray-200
              rounded-2xl px-4 py-4 text-left
              hover:border-gray-300 transition
              active:scale-95"
          >
            <p className="font-medium text-sm
              text-black mb-1">
              Add a completely different business
            </p>
            <p className="text-xs text-gray-400">
              Start fresh from the beginning
            </p>
          </button>

          <button
            onClick={onDone}
            className="w-full bg-black text-white
              rounded-2xl px-4 py-4 text-sm
              font-medium hover:bg-gray-800
              transition active:scale-95"
          >
            I'm done
          </button>

        </div>
      </div>
    </div>
  );
}