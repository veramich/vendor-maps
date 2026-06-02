import { BusinessFormData } from "@/lib/types/business";

interface Step2SubTypeProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  nextStep: (subType?: string) => void;  // updated
}

export default function Step2SubType({
  updateForm,
  nextStep,
}: Step2SubTypeProps) {

  const handleSelect = (subType: string) => {
  updateForm({ subType: subType as any });
  nextStep(subType);  // pass subType directly
};

  // Small business type selection lives in Step2bSubType now; this screen is
  // only reached for events, which pick their subType ("market" | "pop_up")
  // directly here.
  const eventOptions = [
    {
      value: "market",
      title: "Recurring Market",
      description:
        "Swap meet, night market, farmers market and more",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="white" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2
            2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      color: "#111",
      background: "#FFF4EC",
      border: "var(--primary)",
      iconBg: "var(--primary)",
      chevron: "var(--primary)",
    },
    {
      value: "pop_up",
      title: "Pop-Up Event",
      description:
        "Holiday event, pop up market, one time event and more",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="white" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27
            17 14.14 18.18 21.02 12 17.77 5.82 21.02
            7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
      color: "#111",
      background: "#FFF4EC",
      border: "var(--primary)",
      iconBg: "var(--primary)",
      chevron: "var(--primary)",
    },
  ];

  const options = eventOptions;
  const title = "What type of event is this?";
  const subtitle =
    "This helps us set up the right schedule for the event";

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2 text-black">
        {title}
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        {subtitle}
      </p>

      <div className="space-y-4">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className="w-full rounded-2xl p-5 text-left
              transition active:scale-95"
            style={{
              background: option.background,
              border: `2px solid ${option.border}`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex
                  items-center justify-center flex-shrink-0"
                style={{ background: option.iconBg }}
              >
                {option.icon}
              </div>
              <div>
                <p className="font-semibold text-black
                  text-lg mb-1">
                  {option.title}
                </p>
                <p className="text-sm text-gray-500">
                  {option.description}
                </p>
              </div>
              <svg
                className="ml-auto flex-shrink-0"
                width="20" height="20"
                viewBox="0 0 24 24" fill="none"
                stroke={option.chevron} strokeWidth="2"
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