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
          Thank you! We got your request
        </h2>

        {/* Business name */}
        <p className="text-gray-500 mb-2">
          Your request to add{" "}
          <span className="font-medium text-black">
            {businessName}
          </span>{" "}
          is being checked by our team.
        </p>

        {/* Tracking message */}
        {session ? (
          <Link
            href="/my-submissions"
            className="text-sm text-black underline mb-12"
          >
            See how your request is doing →
          </Link>
        ) : (
          /* Signed-out: offer notification on approval. The submitted id is
             already stashed in localStorage by the add-business page, and
             SubmissionAdopter (root layout) attaches it to whichever account
             they end up in — so either link below links this submission. */
          <div className="w-full max-w-sm mb-12 rounded-2xl
            border-2 border-gray-200 p-4 text-left">
            <p className="text-sm font-medium text-black mb-1">
              Make an account to stay updated
            </p>
            <p className="text-xs text-gray-400 mb-4">
              We will save this request to your account. You you can check on it any time.
            </p>
            <div className="flex gap-3">
              <Link
                href="/sign-up"
                className="flex-1 text-white text-sm
                  font-medium py-3 rounded-xl text-center
                  transition active:scale-95"
                style={{ background: "var(--primary)" }}
              >
                Sign up
              </Link>
              <Link
                href="/sign-in"
                className="flex-1 border-2 border-gray-200
                  text-black text-sm font-medium py-3
                  rounded-xl text-center transition
                  active:scale-95 hover:bg-gray-50"
              >
                Sign in
              </Link>
            </div>
          </div>
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
              Add another place for this business
            </p>
            <p className="text-xs text-gray-400">
              Same business, different address
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
              Add a different business
            </p>
            <p className="text-xs text-gray-400">
              Start a new form for a different business.
            </p>
          </button>

          <button
            onClick={onDone}
            className="w-full bg-black text-white
              rounded-2xl px-4 py-4 text-sm
              font-medium hover:bg-gray-800
              transition active:scale-95"
          >
            I&apos;m done
          </button>

        </div>
      </div>
    </div>
  );
}