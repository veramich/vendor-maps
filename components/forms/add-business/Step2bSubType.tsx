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

  const isPermanent =
    formData.subType === "permanent_location";

  const handleSelect = (detailedSubType: string) => {
    updateForm({
      detailedSubType: detailedSubType as DetailedSubType
    });
    nextStep(formData.subType ?? undefined);
  };

  const permanentOptions = [
    {
      value:       "street_vendor",
      title:       "Street Vendor",
      description: "You operate from a cart, stand or stall at a fixed spot",
    },
    {
      value:       "food_truck",
      title:       "Food Truck",
      description: "You operate from a truck or trailer at a fixed spot",
    },
    {
      value:       "home_based",
      title:       "Home Based",
      description: "You operate from your home or private property",
    },
    {
      value:       "other_permanent",
      title:       "Other",
      description: "Another type of permanent location business",
    },
  ];

  const noLocationOptions = [
    {
      value:       "market_based",
      title:       "Market Based",
      description: "You primarily sell at markets and events",
    },
    {
      value:       "pop_up_based",
      title:       "Pop-Up Based",
      description: "You host or attend pop-up events",
    },
    {
      value:       "catering_only",
      title:       "Catering Only",
      description: "You provide catering services",
    },
    {
      value:       "shipping_only",
      title:       "Shipping Only",
      description: "You sell and ship products online",
    },
    {
      value:       "other_no_location",
      title:       "Other",
      description: "Another type of mobile or online business",
    },
  ];

  const options = isPermanent
    ? permanentOptions
    : noLocationOptions;

  const title = isPermanent
    ? "What type of permanent business?"
    : "How do you primarily operate?";

  const subtitle = isPermanent
    ? "This determines how your marker appears on the map"
    : "This helps us show your listing correctly";

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2
        text-black">
        {title}
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        {subtitle}
      </p>

      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className="w-full rounded-2xl p-5
              text-left transition active:scale-95
              border-2 border-gray-200
              hover:border-gray-300 bg-white"
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