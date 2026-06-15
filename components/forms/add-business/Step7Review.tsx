"use client";

import { useState } from "react";
import {
  BusinessFormData,
  PRICE_TIERS,
} from "@/lib/types/business";

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: "Every week",
  biweekly: "Every other week",
  monthly_first: "First of month",
  monthly_second: "Second of month",
  monthly_third: "Third of month",
  monthly_last: "Last of month",
};

interface Step7ReviewProps {
  formData:    BusinessFormData;
  onSubmit:    () => Promise<void>;
  onEditStep:  (step: number) => void;
}

export default function Step7Review({
  formData,
  onSubmit,
  onEditStep,
}: Step7ReviewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onSubmit();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  };

  const priceTier = PRICE_TIERS.find(
    t => t.tier === formData.priceTier
  );

  const DETAILED_SUB_TYPE_LABELS: Record<string, string> = {
    street_vendor:      "Street Vendor",
    food_truck:         "Food Truck",
    home_based:         "Home Based",
    market_based:       "Market Based",
    pop_up_based:       "Pop-Up Based",
    other:              "Other",
  };

  const isEvent = formData.type === "event";

  // Events derive their kind from the chosen date mode.
  const eventKindLabel =
    formData.eventDateMode === "recurring"
      ? "Recurring event"
      : formData.eventDateMode === "specific"
      ? "Specific dates"
      : "";

  // Small business has a location unless they chose directory-only; events
  // always have a venue.
  const hasLocation = isEvent
    ? true
    : formData.type === "small_business" &&
      !formData.noFixedLocation;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2
        text-black">
        Review the listing
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        Make sure everything looks correct
        before submitting
      </p>

      <div className="space-y-4">

        {/* Type — events edit jumps to the date step (5); the type screen no
            longer exists for events. */}
        <ReviewSection
          title="Type"
          onEdit={() => onEditStep(isEvent ? 5 : 2)}
        >
          <p className="text-sm text-black">
            {formData.type === "small_business"
              ? "Small Business"
              : "Event"
            }
          </p>
          {/* Events show their date mode; small business shows the
              chosen detailed type. */}
          {isEvent && eventKindLabel && (
            <p className="text-sm text-gray-500">
              {eventKindLabel}
            </p>
          )}
          {formData.type === "small_business" &&
            formData.detailedSubType && (
            <p className="text-sm text-gray-500">
              {DETAILED_SUB_TYPE_LABELS[
                formData.detailedSubType
              ] || ""}
            </p>
          )}
        </ReviewSection>

        {/* Location */}
        {hasLocation && (
          <ReviewSection
            title="Location"
            onEdit={() => onEditStep(3)}
          >
            <p className="text-sm text-black">
              {formData.street1 && formData.street2
                ? `${formData.street1} & ${formData.street2}`
                : formData.streetAddress
              }
            </p>
            <p className="text-sm text-gray-500">
              {formData.neighborhood
                ? `${formData.neighborhood}, `
                : ""
              }
              {formData.city}, {formData.stateCode}
              {formData.zip ? ` ${formData.zip}` : ""}
            </p>
          </ReviewSection>
        )}

        {/* Directory-only (small business that skipped location) */}
        {!hasLocation && formData.type === "small_business" && (
          <ReviewSection
            title="Location"
            onEdit={() => onEditStep(3)}
          >
            <p className="text-sm text-black">
              No location
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              The listing will appear in the directory list
            </p>
            {formData.servedZips.filter(Boolean).length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">
                  Serves these zip codes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {formData.servedZips.filter(Boolean).map((zip) => (
                    <span
                      key={zip}
                      className="text-xs font-medium text-black
                        bg-gray-100 rounded-full px-2.5 py-0.5"
                    >
                      {zip}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </ReviewSection>
        )}

        {/* Business info */}
        <ReviewSection
          title="Business Info"
          onEdit={() => onEditStep(4)}
        >
          <div className="flex items-center
            gap-3 mb-2">
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
              {formData.category && (
                <p className="text-xs text-gray-500">
                  {formData.category}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600
            leading-relaxed line-clamp-3">
            {formData.description}
          </p>
        </ReviewSection>

        {/* Details */}
        <ReviewSection
          title={isEvent
            ? "Event Details"
            : "Business Details"
          }
          onEdit={() => onEditStep(5)}
        >
          {/* Price / Admission */}
          {priceTier && (
            <p className="text-sm text-black mb-1">
              {priceTier.label} — {priceTier.description}
            </p>
          )}
          {isEvent && (
            <p className="text-sm text-black mb-1">
              {(formData as any).isFreeEntry
                ? "Free Entry"
                : `$${(formData as any).admissionPrice} admission`
              }
            </p>
          )}

          {/* Hours */}
          {formData.hours.length > 0 && (
            <div className="mt-2">
              {formData.hours.some(h => h.hoursVary) ? (
                <p className="text-xs text-gray-500">
                  Hours posted weekly on social media
                </p>
              ) : (
                <div className="space-y-1">
                  {formData.hours
                    .slice(0, 3)
                    .map((h) => (
                    <div
                      key={h.dayOfWeek}
                      className="flex justify-between
                        text-xs"
                    >
                      <span className="capitalize
                        text-black">
                        {h.dayOfWeek}
                      </span>
                      <span className="text-gray-500">
                        {h.isClosed
                          ? "Closed"
                          : `${h.openTime} — ${h.closeTime}`
                        }
                      </span>
                    </div>
                  ))}
                  {formData.hours.length > 3 && (
                    <p className="text-xs text-gray-400">
                      +{formData.hours.length - 3} more days
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Event name */}
          {isEvent && formData.eventName && (
            <p className="text-xs font-medium text-black mt-2">
              {formData.eventName}
            </p>
          )}

          {/* Recurring schedule */}
          {isEvent &&
            formData.eventDateMode === "recurring" &&
            formData.marketSchedules.length > 0 && (
            <div className="mt-2 space-y-1">
              {formData.marketSchedules.map((s, i) => (
                <p key={i}
                  className="text-xs text-black
                    capitalize">
                  {s.dayOfWeek} —{" "}
                  {RECURRENCE_LABELS[s.recurrenceType] ||
                    s.recurrenceType}
                  {s.anchorDate ? ` · from ${s.anchorDate}` : ""}
                  {" · "}{s.startTime} — {s.endTime}
                </p>
              ))}
            </div>
          )}

          {/* Specific dates */}
          {isEvent &&
            formData.eventDateMode === "specific" &&
            formData.eventDates.length > 0 && (
            <div className="mt-2 space-y-1">
              {formData.eventDates.map((d, i) => (
                <p key={i} className="text-xs text-black">
                  {d.date}
                  {" · "}{d.startTime} — {d.endTime}
                  {d.closesNextDay ? " (next day)" : ""}
                </p>
              ))}
            </div>
          )}

          {/* Amenities summary */}
          {!isEvent && (
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                ...formData.paymentOptions,
                ...formData.orderingMethods,
                ...formData.dietaryOptions,
              ].slice(0, 5).map(item => (
                <span
                  key={item}
                  className="text-xs bg-gray-100
                    text-gray-600 px-2 py-0.5
                    rounded-full"
                >
                  {item}
                </span>
              ))}
              {(
                formData.paymentOptions.length +
                formData.orderingMethods.length +
                formData.dietaryOptions.length
              ) > 5 && (
                <span className="text-xs
                  text-gray-400">
                  +{(
                    formData.paymentOptions.length +
                    formData.orderingMethods.length +
                    formData.dietaryOptions.length
                  ) - 5} more
                </span>
              )}
            </div>
          )}
        </ReviewSection>

        {/* Vendor spaces — events only */}
        {isEvent && (
          <ReviewSection
            title="Vendor Spaces"
            onEdit={() => onEditStep(5.5)}
          >
            {formData.vendorSpace?.vendorSpaceAvailable ? (
              <div className="space-y-1">
                <p className="text-sm text-black">
                  Vendor spaces available
                </p>
                {formData.vendorSpace.spaceSizes.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Sizes: {formData.vendorSpace.spaceSizes.join(", ")}
                  </p>
                )}
                {formData.vendorFees.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {formData.vendorFees.length} fee
                    {formData.vendorFees.length === 1 ? "" : "s"} set
                  </p>
                )}
                {formData.vendorSpace.signupLink && (
                  <p className="text-xs text-gray-500 truncate">
                    Sign up: {formData.vendorSpace.signupLink}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No vendor spaces
              </p>
            )}
          </ReviewSection>
        )}

        {/* Photos and contact */}
        <ReviewSection
          title="Photos & Contact"
          onEdit={() => onEditStep(6)}
        >
          {/* Images */}
          {formData.images.length > 0 && (
            <div className="flex gap-2 mb-3">
              {Array.from(formData.images)
                .slice(0, 3)
                .map((img, i) => (
                <div
                  key={i}
                  className="relative w-16 h-16
                    rounded-xl overflow-hidden
                    flex-shrink-0"
                >
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full
                      object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute top-0.5
                      left-0.5 bg-black text-white
                      text-xs px-1 rounded">
                      Cover
                    </span>
                  )}
                </div>
              ))}
              {formData.images.length > 3 && (
                <div className="w-16 h-16 rounded-xl
                  bg-gray-100 flex items-center
                  justify-center flex-shrink-0">
                  <p className="text-xs text-gray-500">
                    +{formData.images.length - 3}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Contact */}
          <div className="space-y-1">
            {formData.phone && (
              <p className="text-xs text-gray-600">
                📞 {formData.phone}
              </p>
            )}
            {formData.email && (
              <p className="text-xs text-gray-600">
                ✉️ {formData.email}
              </p>
            )}
            {formData.website && (
              <p className="text-xs text-gray-600
                truncate">
                🌐 {formData.website}
              </p>
            )}
            {formData.instagram && (
              <p className="text-xs text-gray-600">
                Instagram: {formData.instagram}
              </p>
            )}
            {formData.tiktok && (
              <p className="text-xs text-gray-600">
                TikTok: {formData.tiktok}
              </p>
            )}
            {formData.facebook && (
              <p className="text-xs text-gray-600">
                Facebook: {formData.facebook}
              </p>
            )}
            {formData.twitter && (
              <p className="text-xs text-gray-600">
                Twitter: {formData.twitter}
              </p>
            )}
            {formData.youtube && (
              <p className="text-xs text-gray-600">
                YouTube: {formData.youtube}
              </p>
            )}
            {!formData.phone &&
              !formData.email &&
              !formData.website &&
              !formData.instagram && (
              <p className="text-xs text-red-500">
                No contact info added
              </p>
            )}
          </div>
        </ReviewSection>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border
            border-red-200 rounded-xl px-4 py-3">
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
          The listing will be reviewed before
          going live on VendorMaps
        </p>

      </div>
    </div>
  );
}

function ReviewSection({
  title,
  children,
  onEdit,
}: {
  title:    string;
  children: React.ReactNode;
  onEdit:   () => void;
}) {
  return (
    <div className="border-2 border-gray-100
      rounded-2xl p-4">
      <div className="flex items-center
        justify-between mb-3">
        <p className="text-xs font-medium
          text-gray-400 uppercase tracking-wide">
          {title}
        </p>
        <button
          onClick={onEdit}
          className="text-xs text-black underline
            hover:text-gray-600 transition"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}