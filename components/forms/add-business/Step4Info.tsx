"use client";

import { useState, useRef } from "react";
import {
  BusinessFormData,
  CATEGORIES,
} from "@/lib/types/business";

const sanitizeText = (value: string): string => {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "");
};

interface Step4InfoProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  nextStep: () => void;
}

export default function Step4Info({
  formData,
  updateForm,
  nextStep,
}: Step4InfoProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const charCount = formData.description.trim().length;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Business name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (!/^[a-zA-Z0-9\s'\-&.,!]+$/.test(
      formData.name.trim()
    )) {
      newErrors.name = "Name contains invalid characters";
    }

    if (!formData.category) {
      newErrors.category = "Please select a category";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (charCount < 25) {
      newErrors.description =
        `${25 - charCount} more character${
          25 - charCount === 1 ? "" : "s"
        } needed`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) nextStep();
  };

  const handleLogoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2 text-black">
        Tell us about your business
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        This information will appear on your listing
      </p>

      <div className="space-y-6">

        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Business Name
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            maxLength={100}
            onChange={(e) => {
              updateForm({ name: sanitizeText(e.target.value) });
              if (errors.name) {
                setErrors(prev => ({ ...prev, name: "" }));
                }
              }}
            placeholder="e.g. Maria's Tamales"
            autoComplete="off"
            spellCheck={false}
            className={`w-full border-2 rounded-xl px-4
              py-3 text-sm text-black focus:outline-none
              transition
              ${errors.name
                ? "border-red-400 focus:border-red-400"
                : "border-gray-200 focus:border-black"
              }`}
          />
          <div className="flex justify-between mt-1">
            {errors.name ? (
              <p className="text-red-500 text-xs">
                {errors.name}
              </p>
            ) : (
              <span />
            )}
            <p className="text-xs text-gray-400">
              {formData.name.length}/100
            </p>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Category
            <span className="text-red-500 ml-1">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowCategories(!showCategories)}
            className={`w-full border-2 rounded-xl px-4
              py-3 text-sm text-left transition
              flex items-center justify-between
              ${errors.category
                ? "border-red-400"
                : formData.category
                  ? "border-black"
                  : "border-gray-200"
              }`}
          >
            <span className={formData.category
              ? "text-black"
              : "text-gray-400"
            }>
              {formData.category || "Select a category"}
            </span>
            <svg
              width="16" height="16"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform
                ${showCategories ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showCategories && (
            <div className="border-2 border-gray-200
              rounded-xl mt-2 overflow-hidden max-h-64
              overflow-y-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    updateForm({ category: cat });
                    setShowCategories(false);
                    setErrors(prev => ({
                      ...prev,
                      category: ""
                    }));
                  }}
                  className={`w-full px-4 py-3 text-sm
                    text-left border-b border-gray-100
                    last:border-0 transition
                    ${formData.category === cat
                      ? "bg-black text-white"
                      : "text-black hover:bg-gray-50"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {errors.category && (
            <p className="text-red-500 text-xs mt-1">
              {errors.category}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Description
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            value={formData.description}
            maxLength={2000}
            onChange={(e) => {
              updateForm({
                description: sanitizeText(e.target.value)
              });
              if (errors.description) {
                setErrors(prev => ({ ...prev, description: "" }));
              }
            }}
            placeholder="Describe your business, what you
              sell, your story, menu items, services..."
            rows={5}
            className={`w-full border-2 rounded-xl px-4
              py-3 text-sm text-black focus:outline-none
              transition resize-none
              ${errors.description
                ? "border-red-400 focus:border-red-400"
                : "border-gray-200 focus:border-black"
              }`}
          />
          <div className="flex justify-between mt-1">
            {errors.description ? (
              <p className="text-red-500 text-xs">
                {errors.description}
              </p>
            ) : (
              <p className={`text-xs
                ${charCount >= 25
                  ? "text-green-500"
                  : "text-gray-400"
                }`}>
                {charCount >= 25
                  ? "✓ Minimum reached"
                  : `${25 - charCount} more character${
                      25 - charCount === 1 ? "" : "s"
                    } needed`
                }
              </p>
            )}
            <p className="text-xs text-gray-400">
              {charCount}/2000
            </p>
          </div>
        </div>

        {/* Logo — optional */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Logo
            <span className="text-gray-400 text-xs
              font-normal ml-2">
              Optional
            </span>
          </label>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleLogoChange}
            className="hidden"
          />

          {logoPreview ? (
            <div className="flex items-center gap-4">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-20 h-20 rounded-xl object-cover
                  border-2 border-gray-200"
              />
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    logoInputRef.current?.click()
                  }
                  className="block text-sm text-black
                    underline"
                >
                  Change logo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview(null);
                    updateForm({ logoUrl: "" });
                  }}
                  className="block text-sm text-red-400"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="w-full border-2 border-dashed
                border-gray-200 rounded-xl py-8
                flex flex-col items-center gap-2
                hover:border-gray-300 transition"
            >
              <svg width="28" height="28"
                viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18"
                  rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p className="text-sm text-gray-400">
                Upload logo
              </p>
              <p className="text-xs text-gray-300">
                PNG, JPG, WebP
              </p>
            </button>
          )}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="w-full bg-black text-white rounded-xl
            py-4 text-sm font-medium hover:bg-gray-800
            transition"
        >
          Continue
        </button>

      </div>
    </div>
  );
}