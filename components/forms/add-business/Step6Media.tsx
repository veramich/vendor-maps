"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import imageCompression from "browser-image-compression";
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

// A single photo in the gallery — either already uploaded (edit flow) or a
// newly added file pending upload.
type GalleryItem =
  | { key: string; url: string; kind: "existing"; id: string }
  | { key: string; url: string; kind: "new"; index: number };

export default function Step6Media({
  formData,
  updateForm,
  nextStep,
}: Step6MediaProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [compressing, setCompressing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Previews are derived from formData.images (the source of truth) so that
  // existing photos reappear when this step is revisited from Review — and so
  // we never show fewer thumbnails than will actually be submitted. Computed
  // synchronously to avoid a flash, with the object URLs revoked on the next
  // change / unmount to avoid leaks.
  const previews = useMemo(
    () => formData.images.map(file => URL.createObjectURL(file)),
    [formData.images]
  );

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  // A gallery slot is either an already-uploaded photo (edit flow) or a newly
  // added file. Each is identified by a stable token so the chosen cover and
  // the submitted order survive add/remove of other photos.
  const tokenFor = (item: GalleryItem) =>
    item.kind === "existing" ? item.id : `new:${item.index}`;

  // All slots in their default order: existing photos, then new files.
  const slots = useMemo<GalleryItem[]>(
    () => [
      ...formData.existingImages.map(img => ({
        key:  img.id,
        url:  img.url,
        kind: "existing" as const,
        id:   img.id,
      })),
      ...previews.map((url, i) => ({
        key:   `new-${i}`,
        url,
        kind:  "new" as const,
        index: i,
      })),
    ],
    [formData.existingImages, previews]
  );

  // `imageOrder` (when set) is the authoritative gallery order, holding one
  // token per slot. The first token is the cover. We intersect it with the
  // live slots so a removed/added photo can't leave a stale or missing token,
  // then append any slot the order doesn't mention yet (e.g. a just-added
  // photo). With no order recorded this falls back to the default slot order.
  const order = useMemo<string[]>(() => {
    const tokens = slots.map(tokenFor);
    const fromState = (formData.imageOrder || []).filter(t =>
      tokens.includes(t)
    );
    const missing = tokens.filter(t => !fromState.includes(t));
    return [...fromState, ...missing];
  }, [formData.imageOrder, slots]);

  const gallery = useMemo<GalleryItem[]>(() => {
    const byToken = new Map(slots.map(s => [tokenFor(s), s]));
    return order
      .map(t => byToken.get(t))
      .filter((s): s is GalleryItem => Boolean(s));
  }, [order, slots]);

  const totalImages =
    formData.existingImages.length + formData.images.length;

  const isEvent =
    formData.subType === "market" ||
    formData.subType === "pop_up";

  const maxImages = isEvent ? 5 : 5;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const attachPrefixForValidation = (
      value: string,
      prefix?: string
    ): string => {
      if (!value) return "";
      if (!prefix) return value;

      if (
        value.startsWith("http://") ||
        value.startsWith("https://")
      ) {
        return value;
      }

      return `https://${prefix}${value.replace(/^@/, "")}`;
    };

    // Validate URL formats
    const urlFields = [
      { field: "website",   label: "Website" },
      { field: "instagram", label: "Instagram", prefix: "instagram.com/" },
      { field: "facebook",  label: "Facebook",  prefix: "facebook.com/" },
      { field: "tiktok",    label: "TikTok",    prefix: "tiktok.com/@" },
      { field: "twitter",   label: "Twitter",   prefix: "twitter.com/" },
      { field: "youtube",   label: "YouTube",   prefix: "youtube.com/@" },
      { field: "videoUrl",  label: "Video link" },
    ];

    urlFields.forEach(({ field, label, prefix }) => {
      const value = formData[
        field as keyof BusinessFormData
      ] as string;

      const fullUrl = attachPrefixForValidation(
        value,
        prefix
      );

      if (value && !isValidUrl(fullUrl)) {
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

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = maxImages - totalImages;
    const toAdd = files.slice(0, remaining);

    setCompressing(true);
    try {
      const compressed = await Promise.all(
        toAdd.map(file =>
          imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: "image/jpeg",
          })
        )
      );

      // previews are derived from formData.images by the memo above
      updateForm({
        images: [...formData.images, ...compressed],
      });
    } finally {
      setCompressing(false);
    }
  };

  // Removing a new file shifts the later files' indices, so the "new:<i>"
  // tokens are remapped to stay aligned with `images` (the i in a token must
  // always equal that file's index at submit time).
  const removeNewImage = (item: GalleryItem) => {
    if (item.kind !== "new") return;
    const removed = item.index;
    updateForm({
      images: formData.images.filter((_, i) => i !== removed),
      imageOrder: formData.imageOrder
        .filter(t => t !== `new:${removed}`)
        .map(t => {
          if (!t.startsWith("new:")) return t;
          const i = Number(t.slice(4));
          return i > removed ? `new:${i - 1}` : t;
        }),
    });
  };

  const removeExistingImage = (id: string) => {
    updateForm({
      existingImages: formData.existingImages.filter(
        img => img.id !== id
      ),
      imageOrder: formData.imageOrder.filter(t => t !== id),
    });
  };

  // The cover is whichever photo leads the gallery. "Set as cover" pins the
  // chosen photo's token to the front of `imageOrder`; the gallery renders
  // straight from that order, and the edit API consumes the same token list
  // (see app/api/user/submissions/[id]/route.ts).
  const setAsCover = (item: GalleryItem) => {
    const token = tokenFor(item);
    updateForm({
      imageOrder: [token, ...order.filter(t => t !== token)],
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
        Help customers find and connect with the business
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
            Tap the star to choose your cover photo
          </p>

          {/* Image previews */}
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {gallery.map((item, i) => (
                <div key={item.key} className="relative
                  aspect-square">
                  {/* Mix of existing URLs and client-side object-URL previews;
                      next/image can't optimize the latter. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover
                      rounded-xl"
                  />
                  {i === 0 ? (
                    <span className="absolute top-1
                      left-1 bg-black text-white text-xs
                      px-1.5 py-0.5 rounded-md
                      flex items-center gap-1">
                      <svg width="11" height="11"
                        viewBox="0 0 24 24" fill="currentColor"
                        stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAsCover(item)}
                      aria-label="Set as cover photo"
                      title="Set as cover photo"
                      className="absolute top-1 left-1
                        bg-black bg-opacity-60 text-white
                        w-6 h-6 rounded-full flex items-center
                        justify-center hover:bg-opacity-80
                        transition"
                    >
                      <svg width="13" height="13"
                        viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      item.kind === "existing"
                        ? removeExistingImage(item.id)
                        : removeNewImage(item)
                    }
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
          {totalImages < maxImages && (
            <>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() =>
                  imageInputRef.current?.click()
                }
                disabled={compressing}
                className="w-full border-2 border-dashed
                  border-gray-200 rounded-xl py-8
                  flex flex-col items-center gap-2
                  hover:border-gray-300 transition
                  disabled:opacity-50"
              >
                {compressing ? (
                  <>
                    <svg width="28" height="28"
                      viewBox="0 0 24 24" fill="none"
                      stroke="#9ca3af" strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-spin">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    <p className="text-sm text-gray-400">
                      Optimizing photos…
                    </p>
                  </>
                ) : (
                  <>
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
                      {totalImages === 0
                        ? "Add photos"
                        : `Add more (${totalImages}/${maxImages})`
                      }
                    </p>
                    <p className="text-xs text-gray-300">
                      PNG, JPG, WebP, HEIC
                    </p>
                  </>
                )}
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
            <span className="text-gray-400 text-xs font-normal ml-2">
              Optional
            </span>
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Add ways for customers to reach the business
          </p>

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
            ({ field, placeholder, prefix, icon }) => (
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
          disabled={compressing}
          className="w-full bg-black text-white
            rounded-xl py-4 text-sm font-medium
            hover:bg-gray-800 transition
            disabled:opacity-50"
        >
          Continue
        </button>

      </div>
    </div>
  );
}