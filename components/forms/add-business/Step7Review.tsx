"use client";

import { useState } from "react";
import { BusinessFormData, PRICE_TIERS } from "@/lib/types/business";

interface Step7ReviewProps {
  formData: BusinessFormData;
  onSubmit: () => Promise<void>;
}

export default function Step7Review({
  formData,
  onSubmit,
}: Step7ReviewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onSubmit();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const priceTier = PRICE_TIERS.find(
    t => t.tier === formData.priceTier
  );

  const SUB_TYPE_LABELS: Record<string, string> = {
    permanent_location: "Permanent Location",
    no_location:        "No Permanent Location",
    market:             "Recurring Market",
    pop_up:             "Pop-Up Event",
  };

  const hasLocation =
    formData.subType === "permanent_location" ||
    formData.subType === "market" ||
    formData.subType === "pop_up";

  const isEvent =
    formData.subType === "market" ||
    formData.subType === "pop_up";

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2
        text-black">
        Review your listing
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        Make sure everything looks correct before
        submitting
      </p>

      <div className="space-y-6">

        {/* Business type */}
        <ReviewSection title="Type">
          <p className="text-sm text-black">
            {formData.type === "small_business"
              ? "Small Business"
              : "Event"
            }
          </p>
          <p className="text-sm text-gray-500">
            {SUB_TYPE_LABELS[formData.subType || ""] || ""}
          </p>
        </ReviewSection>

        {/* Location */}
        {hasLocation && (
          <ReviewSection title="Location">
            <p className="text-sm text-black">
              {formData.subType === "permanent_location"
                ? `${formData.street1} & ${formData.street2}`
                : formData.streetAddress
              }
            </p>
            <p className="text-sm text-gray-500">
              {formData.neighborhood
                ? `${formData.neighborhood}, `
                : ""
              }
              {formData.city}, {formData.stateCode}{" "}
              {formData.zip}
            </p>
          </ReviewSection>
        )}

        {/* Business info */}
        <ReviewSection title="Business Info">
          <div className="flex items-center gap-3 mb-2">
            {formData.logoUrl && (
              <img
                src={formData.logoUrl}
                alt="Logo"
                className="w-12 h-12 rounded-xl
                  object-cover border border-gray-200"
              />
            )}
            <div>
              <p className="text-sm font-semibold
                text-black">
                {formData.name}
              </p>
              <p className="text-xs text-gray-500">
                {formData.category}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {formData.description}
          </p>
        </ReviewSection>

        {/* Price tier */}
        {priceTier && (
          <ReviewSection title="Price Range">
            <p className="text-sm text-black">
              {priceTier.label} — {priceTier.description}
            </p>
            <p className="text-xs text-gray-500">
              {formData.priceContext}
            </p>
          </ReviewSection>
        )}

        {/* Hours */}
        {formData.hours.length > 0 && (
          <ReviewSection title="Hours">
            {formData.hours.some(h => h.hoursVary) ? (
              <p className="text-sm text-gray-500">
                Hours posted weekly on social media
              </p>
            ) : (
              <div className="space-y-1">
                {formData.hours.map((h) => (
                  <div key={h.dayOfWeek}
                    className="flex justify-between
                      text-sm">
                    <span className="capitalize
                      text-black">
                      {h.dayOfWeek}
                    </span>
                    <span className="text-gray-500">
                      {h.isClosed
                        ? "Closed"
                        : `${h.openTime} — ${h.closeTime}
                          ${h.closesNextDay
                            ? "(next day)"
                            : ""
                          }`
                      }
                    </span>
                  </div>
                ))}
                {(formData as any).hoursSubjectToChange && (
                  <p className="text-xs text-amber-600
                    mt-2">
                    ⚠ Hours subject to change
                  </p>
                )}
              </div>
            )}
          </ReviewSection>
        )}

        {/* Market schedule */}
        {isEvent && formData.marketSchedules.length > 0 && (
          <ReviewSection title="Schedule">
            {formData.marketSchedules.map((s, i) => (
              <div key={i} className="text-sm mb-2">
                <p className="text-black capitalize font-medium">
                  {s.dayOfWeek} —{" "}
                  {s.recurrenceType === "weekly"
                    ? "Every week"
                    : s.recurrenceType === "biweekly"
                    ? "Every other week"
                    : s.recurrenceType
                        .replace("monthly_", "")
                        .replace("_", " ") + " of month"
                  }
                </p>
                <p className="text-gray-500">
                  {s.startTime} — {s.endTime}
                  {s.isNightMarket && " 🌙"}
                </p>
              </div>
            ))}
          </ReviewSection>
        )}

        {/* Pop-up event */}
        {formData.subType === "pop_up" &&
          formData.popUpEvent && (
          <ReviewSection title="Event Details">
            <p className="text-sm font-medium text-black">
              {formData.popUpEvent.eventName}
            </p>
            <p className="text-sm text-gray-500">
              {formData.popUpEvent.startDate}
              {formData.popUpEvent.endDate !==
                formData.popUpEvent.startDate &&
                ` — ${formData.popUpEvent.endDate}`
              }
            </p>
            <p className="text-sm text-gray-500">
              {formData.popUpEvent.startTime} —{" "}
              {formData.popUpEvent.endTime}
              {formData.popUpEvent.closesNextDay &&
                " (next day)"
              }
              {formData.popUpEvent.isNightMarket &&
                " 🌙"
              }
            </p>
          </ReviewSection>
        )}

        {/* Amenities */}
        {(formData.paymentOptions.length > 0 ||
          formData.orderingMethods.length > 0 ||
          formData.dietaryOptions.length > 0 ||
          formData.businessAmenities.length > 0 ||
          formData.locationAmenities.length > 0) && (
          <ReviewSection title="Amenities">
            <div className="space-y-2">
              {formData.paymentOptions.length > 0 && (
                <AmenityRow
                  label="Payment"
                  items={formData.paymentOptions}
                />
              )}
              {formData.orderingMethods.length > 0 && (
                <AmenityRow
                  label="Ordering"
                  items={formData.orderingMethods}
                />
              )}
              {formData.dietaryOptions.length > 0 && (
                <AmenityRow
                  label="Dietary"
                  items={formData.dietaryOptions}
                />
              )}
              {formData.businessAmenities.length > 0 && (
                <AmenityRow
                  label="Business"
                  items={formData.businessAmenities}
                />
              )}
              {formData.locationAmenities.length > 0 && (
                <AmenityRow
                  label="Location"
                  items={formData.locationAmenities}
                />
              )}
            </div>
          </ReviewSection>
        )}

        {/* Photos */}
        {formData.images.length > 0 && (
          <ReviewSection title="Photos">
            <div className="grid grid-cols-3 gap-2">
              {Array.from(formData.images).map((img, i) => (
                <div key={i}
                  className="relative aspect-square">
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover
                      rounded-xl"
                  />
                  {i === 0 && (
                    <span className="absolute top-1
                      left-1 bg-black text-white
                      text-xs px-1.5 py-0.5 rounded-md">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ReviewSection>
        )}

        {/* Contact */}
        <ReviewSection title="Contact & Social">
          <div className="space-y-1">
            {formData.phone && (
              <p className="text-sm text-gray-600">
                📞 {formData.phone}
              </p>
            )}
            {formData.email && (
              <p className="text-sm text-gray-600">
                ✉️ {formData.email}
              </p>
            )}
            {formData.website && (
              <p className="text-sm text-gray-600">
                🌐 {formData.website}
              </p>
            )}
            {formData.instagram && (
              <p className="text-sm text-gray-600">
                Instagram: {formData.instagram}
              </p>
            )}
            {formData.facebook && (
              <p className="text-sm text-gray-600">
                Facebook: {formData.facebook}
              </p>
            )}
            {formData.tiktok && (
              <p className="text-sm text-gray-600">
                TikTok: {formData.tiktok}
              </p>
            )}
            {formData.twitter && (
              <p className="text-sm text-gray-600">
                Twitter: {formData.twitter}
              </p>
            )}
            {formData.youtube && (
              <p className="text-sm text-gray-600">
                YouTube: {formData.youtube}
              </p>
            )}
            {formData.videoUrl && (
              <p className="text-sm text-gray-600">
                🎥 {formData.videoUrl}
              </p>
            )}
          </div>
        </ReviewSection>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200
            rounded-xl px-4 py-3">
            <p className="text-red-500 text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-black text-white
            rounded-xl py-4 text-sm font-medium
            hover:bg-gray-800 transition
            disabled:opacity-50
            disabled:cursor-not-allowed"
        >
          {submitting
            ? "Submitting..."
            : "Submit listing"
          }
        </button>

        <p className="text-center text-xs text-gray-400">
          Your listing will be reviewed before
          going live on Vendor Maps
        </p>

      </div>
    </div>
  );
}

// Reusable section wrapper
function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-gray-100
      rounded-2xl p-4">
      <p className="text-xs font-medium text-gray-400
        uppercase tracking-wide mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

// Reusable amenity row
function AmenityRow({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {items.map(item => (
          <span
            key={item}
            className="text-xs bg-gray-100
              text-gray-700 px-2 py-1 rounded-full"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}