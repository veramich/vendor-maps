import { BusinessFormData } from "@/lib/types/business";

interface Step0OwnershipProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  nextStep: () => void;
}

export default function Step0Ownership({
  updateForm,
  nextStep,
}: Step0OwnershipProps) {

  const handleSelect = (isOwner: boolean) => {
    updateForm({ submittedAsOwner: isOwner });
    nextStep();
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2 text-black">
        Whose business is this?
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        This helps us know who to credit and lets owners manage
        their listing.
      </p>

      <div className="space-y-4">

        {/* This is my business */}
        <button
          onClick={() => handleSelect(true)}
          className="w-full rounded-2xl p-5 text-left
            transition active:scale-95"
          style={{
            background: "#FFF4EC",
            border: "2px solid var(--primary)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex
                items-center justify-center flex-shrink-0"
              style={{ background: "var(--primary)" }}
            >
              <svg width="28" height="28"
                viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0
                  0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-black text-lg mb-1">
                This is my business
              </p>
              <p className="text-sm text-gray-500">
                Add a logo and start the process to claim and
                manage your listing.
              </p>
            </div>
            <svg
              className="ml-auto flex-shrink-0"
              width="20" height="20"
              viewBox="0 0 24 24" fill="none"
              stroke="var(--primary)" strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </button>

        {/* Someone else's business */}
        <button
          onClick={() => handleSelect(false)}
          className="w-full rounded-2xl p-5 text-left
            transition active:scale-95"
          style={{
            background: "#F5F5F5",
            border: "2px solid #111",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex
                items-center justify-center flex-shrink-0"
              style={{ background: "#111" }}
            >
              <svg width="28" height="28"
                viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0
                  0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-black text-lg mb-1">
                Someone else&rsquo;s business
              </p>
              <p className="text-sm text-gray-500">
                Please get their permission first. They can
                claim it later.
              </p>
            </div>
            <svg
              className="ml-auto flex-shrink-0"
              width="20" height="20"
              viewBox="0 0 24 24" fill="none"
              stroke="black" strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </button>

      </div>
    </div>
  );
}
