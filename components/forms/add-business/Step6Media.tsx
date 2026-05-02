"use client";

import { useState, useRef } from "react";
import { BusinessFormData } from "@/lib/types/business";

const sanitizeText = (value: string): string => {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "");
};

interface Step6MediaProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  nextStep: () => void;
}

export default function Step6Media({
  formData,
  updateForm,
  nextStep,
}: Step6MediaProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEvent =
    formData.subType === "market" ||
    formData.subType === "pop_up";

  const maxImages = isEvent ? 5 : 5;
  const maxFlyers = 2;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // At least one contact method required
    const hasContact =
      formData.phone ||
      formData.email ||
      formData.instagram ||
      formData.facebook ||
      formData.tiktok ||
      formData.twitter ||
      formData.youtube ||
      formData.website;

    if (!hasContact) {
      newErrors.contact =
        "Please add at least one contact method";
    }

    // Validate URL formats
    const urlFields = [
      { field: "website",   label: "Website" },
      { field: "instagram", label: "Instagram" },
      { field: "facebook",  label: "Facebook" },
      { field: "tiktok",    label: "TikTok" },
      { field: "twitter",   label: "Twitter" },
      { field: "youtube",   label: "YouTube" },
      { field: "videoUrl",  label: "Video link" },
    ];

    urlFields.forEach(({ field, label }) => {
      const value = formData[
        field as keyof BusinessFormData
      ] as string;
      if (value && !isValidUrl(value)) {
        newErrors[field] =
          `${label} must be a valid URL`;
      }
    });

    // Validate phone
    if (
      formData.phone &&
      !/^\+?[\d\s\-\(\)]{7,15}$/.test(formData.phone)
    ) {
      newErrors.phone = "Enter a valid phone number";
    }

    // Validate email
    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      newErrors.email = "Enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = maxImages - formData.images.length;
    const toAdd = files.slice(0, remaining);

    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [
          ...prev,
          reader.result as string
        ]);
      };
      reader.readAsDataURL(file);
    });

    updateForm({
      images: [...formData.images, ...toAdd]
    });
  };

  const removeImage = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    updateForm({
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  const handleContinue = () => {
    if (validate()) nextStep();
  };

  const socialFields = [
    {
      field:       "website",
      label:       "Website",
      placeholder: "https://yourwebsite.com",
      prefix: null,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10
            15.3 15.3 0 0 1-4 10
            15.3 15.3 0 0 1-4-10
            15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
    },
    {
      field:       "instagram",
      label:       "Instagram",
      placeholder: null,
      prefix: "instagram.com/",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20"
            rx="5" ry="5"/>
          <circle cx="12" cy="12" r="5"/>
          <circle cx="17.5" cy="6.5" r="1.5"
            fill="currentColor"/>
        </svg>
      ),
    },
    {
      field:       "facebook",
      label:       "Facebook",
      placeholder: null,
      prefix: "facebook.com/",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4
            v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
      ),
    },
    {
      field:       "tiktok",
      label:       "TikTok",
      placeholder: null,
      prefix: "tiktok.com/@",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0
            5 5"/>
        </svg>
      ),
    },
    {
      field:       "twitter",
      label:       "Twitter / X",
      placeholder: null,
      prefix: "twitter.com/",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53
            4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0
            0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7
            2c9 5 20 0 20-11.5a4.5 4.5 0 0
            0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
        </svg>
      ),
    },
    {
      field:       "youtube",
      label:       "YouTube",
      placeholder: null,
      prefix: "youtube.com/@",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 0
            0-1.95-1.96C18.88 4 12 4 12 4s-6.88
            0-8.59.46a2.78 2.78 0 0 0-1.95
            1.96A29 29 0 0 0 1 12a29 29 0 0 0
            .46 5.58A2.78 2.78 0 0 0 3.41
            19.54C5.12 20 12 20 12 20s6.88 0
            8.59-.46a2.78 2.78 0 0 0
            1.95-1.96A29 29 0 0 0 23 12a29 29
            0 0 0-.46-5.58z"/>
          <polygon points="9.75 15.02 15.5 12
            9.75 8.98 9.75 15.02"/>
        </svg>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2
        text-black">
        Photos & contact
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        Help customers find and connect with you
      </p>

      <div className="space-y-8">

        {/* Images */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Photos
            <span className="text-gray-400 text-xs
              font-normal ml-2">
              Optional — up to {maxImages}
            </span>
          </label>
          <p className="text-xs text-gray-400 mb-3">
            First photo will be your cover image
          </p>

          {/* Image previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {previews.map((preview, i) => (
                <div key={i} className="relative
                  aspect-square">
                  <img
                    src={preview}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover
                      rounded-xl"
                  />
                  {i === 0 && (
                    <span className="absolute top-1
                      left-1 bg-black text-white text-xs
                      px-1.5 py-0.5 rounded-md">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1
                      bg-black bg-opacity-60 text-white
                      w-6 h-6 rounded-full flex items-center
                      justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {previews.length < maxImages && (
            <>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() =>
                  imageInputRef.current?.click()
                }
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
                  <rect x="3" y="3" width="18"
                    height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p className="text-sm text-gray-400">
                  {previews.length === 0
                    ? "Add photos"
                    : `Add more (${previews.length}/${maxImages})`
                  }
                </p>
                <p className="text-xs text-gray-300">
                  PNG, JPG, WebP
                </p>
              </button>
            </>
          )}
        </div>

        {/* Video link */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Video Link
            <span className="text-gray-400 text-xs
              font-normal ml-2">
              Optional
            </span>
          </label>
          <p className="text-xs text-gray-400 mb-2">
            YouTube, Instagram, TikTok or Facebook
          </p>
          <input
            type="url"
            value={formData.videoUrl}
            onChange={(e) => {
              updateForm({
                videoUrl: sanitizeText(e.target.value)
              });
              if (errors.videoUrl) {
                setErrors(prev => ({
                  ...prev, videoUrl: ""
                }));
              }
            }}
            placeholder="https://youtube.com/watch?v=..."
            className={`w-full border-2 rounded-xl
              px-4 py-3 text-sm text-black
              focus:outline-none transition
              ${errors.videoUrl
                ? "border-red-400"
                : "border-gray-200 focus:border-black"
              }`}
          />
          {errors.videoUrl && (
            <p className="text-red-500 text-xs mt-1">
              {errors.videoUrl}
            </p>
          )}
        </div>

        {/* Contact */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Contact & Social Media
            <span className="text-red-500 ml-1">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Add at least one way for customers to
            reach you
          </p>

          {errors.contact && (
            <div className="bg-red-50 border border-red-200
              rounded-xl px-4 py-3 mb-4">
              <p className="text-red-500 text-xs">
                {errors.contact}
              </p>
            </div>
          )}

          <div className="space-y-3">

            {/* Phone */}
            <div className="flex items-center gap-3
              border-2 rounded-xl px-4 py-3
              focus-within:border-black transition
              border-gray-200">
              <svg width="18" height="18"
                viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18
                  2 19.79 19.79 0 0 1-8.63-3.07
                  19.5 19.5 0 0 1-6-6 19.79 19.79
                  0 0 1-3.07-8.67A2 2 0 0 1 4.11
                  2h3a2 2 0 0 1 2 1.72 12.84 12.84
                  0 0 0 .7 2.81 2 2 0 0 1-.45 2.11
                  L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27
                  a2 2 0 0 1 2.11-.45 12.84 12.84 0
                  0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  updateForm({
                    phone: sanitizeText(e.target.value)
                  });
                  if (errors.phone) {
                    setErrors(prev => ({
                      ...prev, phone: "", contact: ""
                    }));
                  }
                }}
                placeholder="Phone number"
                className="flex-1 text-sm text-black
                  focus:outline-none bg-transparent"
              />
            </div>
            {errors.phone && (
              <p className="text-red-500 text-xs -mt-1">
                {errors.phone}
              </p>
            )}

            {/* Email */}
            <div className="flex items-center gap-3
              border-2 rounded-xl px-4 py-3
              focus-within:border-black transition
              border-gray-200">
              <svg width="18" height="18"
                viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2
                  2v12c0 1.1-.9 2-2 2H4c-1.1
                  0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  updateForm({
                    email: sanitizeText(e.target.value)
                  });
                  if (errors.email) {
                    setErrors(prev => ({
                      ...prev, email: "", contact: ""
                    }));
                  }
                }}
                placeholder="Public contact email"
                className="flex-1 text-sm text-black
                  focus:outline-none bg-transparent"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs -mt-1">
                {errors.email}
              </p>
            )}

            {/* Social links */}
            {socialFields.map(
            ({ field, label, placeholder, prefix, icon }) => (
            <div key={field}>
                <div className={`flex items-center border-2
                rounded-xl overflow-hidden
                focus-within:border-black transition
                ${errors[field]
                    ? "border-red-400"
                    : "border-gray-200"
                }`}>
                {/* Icon */}
                <span className="pl-4 text-gray-400 flex-shrink-0">
                    {icon}
                </span>

                {/* Prefix label */}
                {prefix && (
                    <span className="pl-3 text-sm text-gray-400
                    flex-shrink-0 select-none">
                    {prefix}
                    </span>
                )}

                {/* Input */}
                <input
                    type={prefix ? "text" : "url"}
                    value={
                    formData[
                        field as keyof BusinessFormData
                    ] as string
                    }
                    onChange={(e) => {
                    // For prefixed fields store username only
                    // For website store full URL
                    const value = prefix
                        ? e.target.value.replace(/^@/, "")
                        // strip @ if user types it
                        : sanitizeText(e.target.value);

                    updateForm({ [field]: value });
                    if (errors[field]) {
                        setErrors(prev => ({
                        ...prev,
                        [field]: "",
                        contact: "",
                        }));
                    }
                    }}
                    placeholder={placeholder || undefined}
                    className="flex-1 px-3 py-3 text-sm
                    text-black focus:outline-none
                    bg-transparent min-w-0"
                />
                </div>
                {errors[field] && (
                <p className="text-red-500 text-xs mt-1">
                    {errors[field]}
                </p>
                )}
            </div>
            ))}

          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="w-full bg-black text-white
            rounded-xl py-4 text-sm font-medium
            hover:bg-gray-800 transition"
        >
          Continue
        </button>

      </div>
    </div>
  );
}