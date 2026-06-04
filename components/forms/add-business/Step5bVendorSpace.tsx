"use client";

import { useState } from "react";
import { BusinessFormData, VendorFee } from "@/lib/types/business";

interface Step5bVendorSpaceProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  nextStep: () => void;
}

// The five fee categories, in display order. feeType matches the
// vendor_fees.fee_type CHECK constraint (see db/schema/010_vendor_fees.sql).
const FEE_ROWS: { feeType: string; label: string }[] = [
  { feeType: "non_food",         label: "Non-food cost" },
  { feeType: "prepackaged_food", label: "Prepackaged food cost" },
  { feeType: "beverage",         label: "Beverage cost" },
  { feeType: "hot_food",         label: "Hot food cost" },
  { feeType: "other",            label: "Other costs" },
];

// Default vendor space object created when the toggle is switched on.
const emptyVendorSpace = () => ({
  vendorSpaceAvailable: true,
  spaceSizes:           [] as string[],
  vendorTypes:          [] as string[],
  hasWaitlist:          false,
  hasHolds:             false,
  signupLink:           "",
  note:                 "",
});

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export default function Step5bVendorSpace({
  formData,
  updateForm,
  nextStep,
}: Step5bVendorSpaceProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sizeInput, setSizeInput] = useState("");

  const vs = formData.vendorSpace;
  const enabled = !!vs?.vendorSpaceAvailable;

  const updateVendor = (data: Partial<NonNullable<typeof vs>>) => {
    updateForm({
      vendorSpace: { ...(vs ?? emptyVendorSpace()), ...data },
    });
  };

  const toggle = (on: boolean) => {
    setErrors({});
    updateForm({ vendorSpace: on ? emptyVendorSpace() : null });
  };

  // Push the typed size as a chip. Splits on commas so "10x10, 20x20" pasted
  // at once becomes two chips; dedupes and ignores blanks.
  const commitSizes = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const existing = vs?.spaceSizes ?? [];
    const merged = [...existing];
    for (const p of parts) {
      if (!merged.includes(p)) merged.push(p);
    }
    updateVendor({ spaceSizes: merged });
    setSizeInput("");
    if (errors.spaceSizes) {
      setErrors((prev) => ({ ...prev, spaceSizes: "" }));
    }
  };

  const removeSize = (size: string) => {
    updateVendor({
      spaceSizes: (vs?.spaceSizes ?? []).filter((s) => s !== size),
    });
  };

  // Read a single fee row by type from formData.vendorFees.
  const getFee = (feeType: string): VendorFee | undefined =>
    formData.vendorFees.find((f) => f.feeType === feeType);

  const updateFee = (feeType: string, amountStr: string) => {
    const others = formData.vendorFees.filter((f) => f.feeType !== feeType);
    const trimmed = amountStr.trim();
    if (trimmed === "") {
      // Empty clears the row entirely.
      updateForm({ vendorFees: others });
      return;
    }
    const amount = Number(trimmed.replace(/[^0-9.]/g, ""));
    const existing = getFee(feeType);
    updateForm({
      vendorFees: [
        ...others,
        {
          feeType,
          amount: Number.isFinite(amount) ? amount : null,
          isFree: false,
          description: existing?.description ?? "",
        },
      ],
    });
  };

  const validate = () => {
    if (!enabled) return true;
    const newErrors: Record<string, string> = {};

    if (!(vs?.spaceSizes?.length)) {
      newErrors.spaceSizes = "Add at least one space size";
    }
    if (!vs?.signupLink?.trim()) {
      newErrors.signupLink = "Sign up link is required";
    } else if (!isValidUrl(vs.signupLink.trim())) {
      newErrors.signupLink = "Enter a valid URL (include https://)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    // Fold any size left in the input box into the chips before validating.
    if (sizeInput.trim()) commitSizes(sizeInput);
    if (validate()) nextStep();
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2 text-black">
        Vendor spaces
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        Let vendors know if they can sell at this event
      </p>

      <div className="space-y-8">

        {/* Availability toggle */}
        <div>
          <label className="block text-sm font-medium text-black mb-3">
            Are vendor spaces available?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => toggle(true)}
              className={`border-2 rounded-xl py-4 text-center transition
                ${enabled
                  ? "border-black bg-black text-white"
                  : "border-gray-200 text-black"
                }`}
            >
              <p className="font-semibold text-sm">Yes</p>
              <p className="text-xs mt-0.5 opacity-70">
                Vendors can apply
              </p>
            </button>
            <button
              type="button"
              onClick={() => toggle(false)}
              className={`border-2 rounded-xl py-4 text-center transition
                ${!enabled
                  ? "border-black bg-black text-white"
                  : "border-gray-200 text-black"
                }`}
            >
              <p className="font-semibold text-sm">No</p>
              <p className="text-xs mt-0.5 opacity-70">
                Not accepting vendors
              </p>
            </button>
          </div>
        </div>

        {enabled && (
          <>
            {/* Flyer note — flyers are added as regular photos */}
            <div className="flex items-start gap-2 bg-gray-50 border-2
              border-gray-100 rounded-xl p-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#6b7280" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p className="text-xs text-gray-600">
                Add your vendor flyer in the next step (Photos)
              </p>
            </div>

            {/* Space sizes */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Space sizes
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">
                e.g. 10x10, 20x20 — press Enter to add each one
              </p>

              {(vs?.spaceSizes?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {vs!.spaceSizes.map((size) => (
                    <span
                      key={size}
                      className="flex items-center gap-1.5 bg-black text-white
                        text-xs px-3 py-1.5 rounded-full"
                    >
                      {size}
                      <button
                        type="button"
                        onClick={() => removeSize(size)}
                        aria-label={`Remove ${size}`}
                        className="text-white/80 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <input
                type="text"
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commitSizes(sizeInput);
                  }
                }}
                onBlur={() => sizeInput.trim() && commitSizes(sizeInput)}
                placeholder="Type a size and press Enter"
                className={`w-full border-2 rounded-xl px-4 py-3 text-sm
                  text-black focus:outline-none transition
                  ${errors.spaceSizes
                    ? "border-red-400"
                    : "border-gray-200 focus:border-black"
                  }`}
              />
              {errors.spaceSizes && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.spaceSizes}
                </p>
              )}
            </div>

            {/* Vendor fees */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Vendor fees
                <span className="text-gray-400 text-xs font-normal ml-2">
                  Optional
                </span>
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Leave blank if a fee doesn&apos;t apply
              </p>
              <div className="space-y-3">
                {FEE_ROWS.map((row) => {
                  const fee = getFee(row.feeType);
                  const value =
                    fee?.amount != null ? String(fee.amount) : "";
                  return (
                    <div
                      key={row.feeType}
                      className="flex items-center gap-3"
                    >
                      <span className="text-sm text-black flex-1">
                        {row.label}
                      </span>
                      <div className="flex items-center border-2 border-gray-200
                        rounded-xl focus-within:border-black transition w-32">
                        <span className="pl-3 text-gray-400 text-sm">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={value}
                          onChange={(e) =>
                            updateFee(row.feeType, e.target.value)
                          }
                          placeholder="0"
                          className="flex-1 px-2 py-2.5 text-sm text-black
                            focus:outline-none bg-transparent min-w-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Waitlist / Holds */}
            <div>
              <label className="block text-sm font-medium text-black mb-3">
                Availability
                <span className="text-gray-400 text-xs font-normal ml-2">
                  Optional
                </span>
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-4
                  border-2 border-gray-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={vs?.hasWaitlist || false}
                    onChange={(e) =>
                      updateVendor({ hasWaitlist: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-black">
                    Waitlist available
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-4
                  border-2 border-gray-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={vs?.hasHolds || false}
                    onChange={(e) =>
                      updateVendor({ hasHolds: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-black">
                    Holds available
                  </span>
                </label>
              </div>
            </div>

            {/* Sign-up link */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Sign up link
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Where vendors apply or register
              </p>
              <input
                type="url"
                value={vs?.signupLink || ""}
                onChange={(e) => {
                  updateVendor({ signupLink: e.target.value });
                  if (errors.signupLink) {
                    setErrors((prev) => ({ ...prev, signupLink: "" }));
                  }
                }}
                placeholder="https://..."
                className={`w-full border-2 rounded-xl px-4 py-3 text-sm
                  text-black focus:outline-none transition
                  ${errors.signupLink
                    ? "border-red-400"
                    : "border-gray-200 focus:border-black"
                  }`}
              />
              {errors.signupLink && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.signupLink}
                </p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Note
                <span className="text-gray-400 text-xs font-normal ml-2">
                  Optional
                </span>
              </label>
              <textarea
                value={vs?.note || ""}
                onChange={(e) => updateVendor({ note: e.target.value })}
                rows={3}
                maxLength={500}
                placeholder="Anything vendors should know (setup time, electricity, etc.)"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3
                  text-sm text-black focus:outline-none focus:border-black
                  transition resize-none"
              />
            </div>
          </>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="w-full bg-black text-white rounded-xl py-4 text-sm
            font-medium hover:bg-gray-800 transition"
        >
          Continue
        </button>

      </div>
    </div>
  );
}
