import { BusinessFormData } from "@/lib/types/business";

interface Step1TypeProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  // The chosen type is passed back so the parent can route off the fresh
  // value (events skip the Step-2 type screen) rather than stale state.
  nextStep: (type?: "small_business" | "event") => void;
}

export default function Step1Type({
  formData,
  updateForm,
  nextStep,
}: Step1TypeProps) {

  const handleSelect = (type: "small_business" | "event") => {
    updateForm({ type, subType: null });
    nextStep(type);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2 text-black">
        Where would you like to add the business?
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        Select where in the website the business should be added. This can always be changed later.
      </p>

      <div className="space-y-4">

        {/* Small Business */}
        <button
          onClick={() => handleSelect("small_business")}
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
                <path d="M3 9l9-7 9 7v11a2 2 0 0
                  1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-black text-lg mb-1">
                Small Business
              </p>
              <p className="text-sm text-gray-500">
                Street Vendors, Home-based
                Businesses, Food Trucks and more
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

        {/* Event */}
        <button
          onClick={() => handleSelect("event")}
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
                <rect x="3" y="4" width="18" height="18"
                  rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-black text-lg mb-1">
                Event
              </p>
              <p className="text-sm text-gray-500">
                Swap Meets, Farmers Markets, Pop Ups, and more
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

      </div>
    </div>
  );
}