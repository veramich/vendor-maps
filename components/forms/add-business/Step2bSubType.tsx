import { BusinessFormData, DetailedSubType } from "@/lib/types/business";

interface Step2bSubTypeProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  nextStep: (subType?: string) => void;
}

export default function Step2bSubType({
  formData,
  updateForm,
  nextStep,
}: Step2bSubTypeProps) {

  const handleSelect = (detailedSubType: string) => {
    updateForm({
      detailedSubType: detailedSubType as DetailedSubType,
    });
    nextStep();
  };

  const options = [
    {
      value:       "street_vendor",
      title:       "Street Vendor",
      description: "Operates from a cart, stand or stall",
    },
    {
      value:       "food_truck",
      title:       "Food Truck",
      description: "Operates from a truck or trailer",
    },
    {
      value:       "home_based",
      title:       "Home Based",
      description: "Operates from a home or private property",
    },
    {
      value:       "market_based",
      title:       "Market Based",
      description: "Primarily sells at recurring markets",
    },
    {
      value:       "pop_up_based",
      title:       "Pop-Up Based",
      description: "Hosts or attends pop-up events",
    },
    {
      value:       "other",
      title:       "Other",
      description: "Another type of small business",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2
        text-black">
        How does this business primarily operate?
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        This helps us show the listing correctly
      </p>

      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={`w-full rounded-2xl p-5
              text-left transition active:scale-95
              border-2 bg-white
              ${formData.detailedSubType === option.value
                ? "border-black"
                : "border-gray-200 hover:border-gray-300"
              }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-black
                  text-base mb-0.5">
                  {option.title}
                </p>
                <p className="text-sm text-gray-500">
                  {option.description}
                </p>
              </div>
              <svg
                className="flex-shrink-0"
                width="20" height="20"
                viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
