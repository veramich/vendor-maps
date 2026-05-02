"use client";

import { useState } from "react";
import {
  BusinessFormData,
  PRICE_TIERS,
  PRICE_CONTEXT,
  PAYMENT_OPTIONS,
  ORDERING_METHODS,
  DIETARY_OPTIONS,
  LOCATION_AMENITIES,
  BUSINESS_AMENITIES,
  DAYS_OF_WEEK,
} from "@/lib/types/business";

interface Step5DetailsProps {
  formData: BusinessFormData;
  updateForm: (data: Partial<BusinessFormData>) => void;
  nextStep: () => void;
}

export default function Step5Details({
  formData,
  updateForm,
  nextStep,
}: Step5DetailsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isMarket = formData.subType === "market";
  const isPopUp = formData.subType === "pop_up";
  const isEvent = isMarket || isPopUp;
  const isPermanent =
    formData.subType === "permanent_location";

  const priceContext =
    PRICE_CONTEXT[formData.subType || ""] || "per item";

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.priceTier) {
      newErrors.priceTier = "Please select a price tier";
    }

    if (isPopUp) {
      if (!formData.popUpEvent?.eventName) {
        newErrors.eventName = "Event name is required";
      }
      if (!formData.popUpEvent?.startDate) {
        newErrors.startDate = "Start date is required";
      }
      if (!formData.popUpEvent?.startTime) {
        newErrors.startTime = "Start time is required";
      }
      if (!formData.popUpEvent?.endTime) {
        newErrors.endTime = "End time is required";
      }
    }

    if (isMarket && formData.marketSchedules.length === 0) {
      newErrors.schedule =
        "Please add at least one schedule";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) nextStep();
  };

  // Toggle amenity selection
  const toggleAmenity = (
    field: keyof BusinessFormData,
    value: string
  ) => {
    const current = formData[field] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateForm({ [field]: updated });
  };

  // Add market schedule
  const addSchedule = () => {
    updateForm({
      marketSchedules: [
        ...formData.marketSchedules,
        {
          dayOfWeek:      "saturday",
          recurrenceType: "weekly",
          startTime:      "08:00",
          endTime:        "14:00",
          closesNextDay:  false,
          isNightMarket:  false,
          seasonStart:    "",
          seasonEnd:      "",
        },
      ],
    });
  };

  const updateSchedule = (
    index: number,
    data: Partial<typeof formData.marketSchedules[0]>
  ) => {
    const updated = [...formData.marketSchedules];
    updated[index] = { ...updated[index], ...data };
    updateForm({ marketSchedules: updated });
  };

  const removeSchedule = (index: number) => {
    updateForm({
      marketSchedules: formData.marketSchedules
        .filter((_, i) => i !== index),
    });
  };

  // Hours helpers
  const addHours = (day: string) => {
    const existing = formData.hours.find(
      h => h.dayOfWeek === day
    );
    if (existing) return;
    updateForm({
      hours: [
        ...formData.hours,
        {
          dayOfWeek:     day,
          openTime:      "09:00",
          closeTime:     "17:00",
          closesNextDay: false,
          isClosed:      false,
          hoursVary:     false,
          seasonStart:   "",
          seasonEnd:     "",
        },
      ],
    });
  };

  const updateHours = (
    day: string,
    data: Partial<typeof formData.hours[0]>
  ) => {
    const updated = formData.hours.map(h =>
      h.dayOfWeek === day ? { ...h, ...data } : h
    );
    updateForm({ hours: updated });
  };

  const getHours = (day: string) =>
    formData.hours.find(h => h.dayOfWeek === day);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2
        text-black">
        {isEvent ? "Event details" : "Business details"}
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        Help customers know what to expect
      </p>

      <div className="space-y-8">

        {/* Price Tier */}
        <div>
          <label className="block text-sm font-medium
            text-black mb-1">
            Price Range
            <span className="text-red-500 ml-1">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Estimated {priceContext}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {PRICE_TIERS.map((tier) => (
              <button
                key={tier.tier}
                type="button"
                onClick={() => {
                  updateForm({
                    priceTier: tier.tier,
                    priceContext,
                  });
                  setErrors(prev => ({
                    ...prev, priceTier: ""
                  }));
                }}
                className={`border-2 rounded-xl py-3
                  text-center transition
                  ${formData.priceTier === tier.tier
                    ? "border-black bg-black text-white"
                    : "border-gray-200 text-black"
                  }`}
              >
                <p className="font-bold text-sm">
                  {tier.label}
                </p>
                <p className="text-xs mt-0.5 opacity-70">
                  {tier.description}
                </p>
              </button>
            ))}
          </div>
          {errors.priceTier && (
            <p className="text-red-500 text-xs mt-1">
              {errors.priceTier}
            </p>
          )}
        </div>

        {/* Pop-Up Event Date/Time */}
        {isPopUp && (
          <div className="space-y-4">
            <label className="block text-sm font-medium
              text-black">
              Event Details
              <span className="text-red-500 ml-1">*</span>
            </label>

            {/* Event Name */}
            <div>
              <label className="block text-xs
                text-gray-500 mb-1">
                Event Name
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.popUpEvent?.eventName || ""}
                onChange={(e) => {
                  updateForm({
                    popUpEvent: {
                      ...formData.popUpEvent!,
                      eventName: e.target.value,
                    }
                  });
                  if (errors.eventName) {
                    setErrors(prev => ({
                      ...prev, eventName: ""
                    }));
                  }
                }}
                placeholder="e.g. Holiday Pop-Up Market"
                className={`w-full border-2 rounded-xl
                  px-4 py-3 text-sm text-black
                  focus:outline-none transition
                  ${errors.eventName
                    ? "border-red-400"
                    : "border-gray-200 focus:border-black"
                  }`}
              />
              {errors.eventName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.eventName}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs
                  text-gray-500 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.popUpEvent?.startDate || ""}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    updateForm({
                      popUpEvent: {
                        ...formData.popUpEvent!,
                        startDate: e.target.value,
                        endDate: e.target.value,
                      }
                    });
                    if (errors.startDate) {
                      setErrors(prev => ({
                        ...prev, startDate: ""
                      }));
                    }
                  }}
                  className={`w-full border-2 rounded-xl
                    px-4 py-3 text-sm text-black
                    focus:outline-none transition
                    ${errors.startDate
                      ? "border-red-400"
                      : "border-gray-200 focus:border-black"
                    }`}
                />
              </div>
              <div>
                <label className="block text-xs
                  text-gray-500 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.popUpEvent?.endDate || ""}
                  min={formData.popUpEvent?.startDate ||
                    new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    updateForm({
                      popUpEvent: {
                        ...formData.popUpEvent!,
                        endDate: e.target.value,
                      }
                    })
                  }
                  className="w-full border-2 border-gray-200
                    rounded-xl px-4 py-3 text-sm text-black
                    focus:outline-none focus:border-black
                    transition"
                />
              </div>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs
                  text-gray-500 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.popUpEvent?.startTime || ""}
                  onChange={(e) => {
                    updateForm({
                      popUpEvent: {
                        ...formData.popUpEvent!,
                        startTime: e.target.value,
                      }
                    });
                    if (errors.startTime) {
                      setErrors(prev => ({
                        ...prev, startTime: ""
                      }));
                    }
                  }}
                  className={`w-full border-2 rounded-xl
                    px-4 py-3 text-sm text-black
                    focus:outline-none transition
                    ${errors.startTime
                      ? "border-red-400"
                      : "border-gray-200 focus:border-black"
                    }`}
                />
              </div>
              <div>
                <label className="block text-xs
                  text-gray-500 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.popUpEvent?.endTime || ""}
                  onChange={(e) => {
                    updateForm({
                      popUpEvent: {
                        ...formData.popUpEvent!,
                        endTime: e.target.value,
                      }
                    });
                    if (errors.endTime) {
                      setErrors(prev => ({
                        ...prev, endTime: ""
                      }));
                    }
                  }}
                  className={`w-full border-2 rounded-xl
                    px-4 py-3 text-sm text-black
                    focus:outline-none transition
                    ${errors.endTime
                      ? "border-red-400"
                      : "border-gray-200 focus:border-black"
                    }`}
                />
              </div>
            </div>

            {/* Closes Next Day */}
            <label className="flex items-center gap-3
              cursor-pointer">
              <input
                type="checkbox"
                checked={
                  formData.popUpEvent?.closesNextDay || false
                }
                onChange={(e) =>
                  updateForm({
                    popUpEvent: {
                      ...formData.popUpEvent!,
                      closesNextDay: e.target.checked,
                    }
                  })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-black">
                Event ends after midnight
              </span>
            </label>

            {/* Night Market */}
            <label className="flex items-center gap-3
              cursor-pointer">
              <input
                type="checkbox"
                checked={
                  formData.popUpEvent?.isNightMarket || false
                }
                onChange={(e) =>
                  updateForm({
                    popUpEvent: {
                      ...formData.popUpEvent!,
                      isNightMarket: e.target.checked,
                    }
                  })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-black">
                This is hosted by a market
              </span>
            </label>
          </div>
        )}

        {/* Market Schedule */}
        {isMarket && (
          <div>
            <div className="flex items-center
              justify-between mb-3">
              <label className="text-sm font-medium
                text-black">
                Schedule
                <span className="text-red-500 ml-1">*</span>
              </label>
              <button
                type="button"
                onClick={addSchedule}
                className="text-xs text-black underline"
              >
                + Add schedule
              </button>
            </div>

            {errors.schedule && (
              <p className="text-red-500 text-xs mb-2">
                {errors.schedule}
              </p>
            )}

            {formData.marketSchedules.length === 0 && (
              <button
                type="button"
                onClick={addSchedule}
                className="w-full border-2 border-dashed
                  border-gray-200 rounded-xl py-6 text-sm
                  text-gray-400 hover:border-gray-300
                  transition"
              >
                + Add your first schedule
              </button>
            )}

            {formData.marketSchedules.map((schedule, i) => (
              <div key={i} className="border-2
                border-gray-200 rounded-xl p-4 mb-3">

                <div className="flex justify-between mb-3">
                  <p className="text-sm font-medium
                    text-black">
                    Schedule {i + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeSchedule(i)}
                    className="text-xs text-red-400"
                  >
                    Remove
                  </button>
                </div>

                {/* Day */}
                <div className="mb-3">
                  <label className="block text-xs
                    text-gray-500 mb-1">
                    Day
                  </label>
                  <select
                    value={schedule.dayOfWeek}
                    onChange={(e) =>
                      updateSchedule(i, {
                        dayOfWeek: e.target.value
                      })
                    }
                    className="w-full border-2
                      border-gray-200 rounded-xl px-4
                      py-3 text-sm text-black
                      focus:outline-none
                      focus:border-black"
                  >
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day} value={day}>
                        {day.charAt(0).toUpperCase() +
                          day.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recurrence */}
                <div className="mb-3">
                  <label className="block text-xs
                    text-gray-500 mb-1">
                    Frequency
                  </label>
                  <select
                    value={schedule.recurrenceType}
                    onChange={(e) =>
                      updateSchedule(i, {
                        recurrenceType: e.target.value
                      })
                    }
                    className="w-full border-2
                      border-gray-200 rounded-xl px-4
                      py-3 text-sm text-black
                      focus:outline-none
                      focus:border-black"
                  >
                    <option value="weekly">
                      Every week
                    </option>
                    <option value="biweekly">
                      Every other week
                    </option>
                    <option value="monthly_first">
                      First of month
                    </option>
                    <option value="monthly_second">
                      Second of month
                    </option>
                    <option value="monthly_third">
                      Third of month
                    </option>
                    <option value="monthly_last">
                      Last of month
                    </option>
                  </select>
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs
                      text-gray-500 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={schedule.startTime}
                      onChange={(e) =>
                        updateSchedule(i, {
                          startTime: e.target.value
                        })
                      }
                      className="w-full border-2
                        border-gray-200 rounded-xl px-4
                        py-3 text-sm text-black
                        focus:outline-none
                        focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs
                      text-gray-500 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={schedule.endTime}
                      onChange={(e) =>
                        updateSchedule(i, {
                          endTime: e.target.value
                        })
                      }
                      className="w-full border-2
                        border-gray-200 rounded-xl px-4
                        py-3 text-sm text-black
                        focus:outline-none
                        focus:border-black"
                    />
                  </div>
                </div>

                {/* Night Market */}
                <label className="flex items-center
                  gap-3 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={schedule.isNightMarket}
                    onChange={(e) =>
                      updateSchedule(i, {
                        isNightMarket: e.target.checked
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-black">
                    🌙 Night market
                  </span>
                </label>

                {/* Season */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs
                      text-gray-500 mb-1">
                      Season Start (optional)
                    </label>
                    <input
                      type="date"
                      value={schedule.seasonStart}
                      onChange={(e) =>
                        updateSchedule(i, {
                          seasonStart: e.target.value
                        })
                      }
                      className="w-full border-2
                        border-gray-200 rounded-xl px-4
                        py-3 text-sm text-black
                        focus:outline-none
                        focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs
                      text-gray-500 mb-1">
                      Season End (optional)
                    </label>
                    <input
                      type="date"
                      value={schedule.seasonEnd}
                      onChange={(e) =>
                        updateSchedule(i, {
                          seasonEnd: e.target.value
                        })
                      }
                      className="w-full border-2
                        border-gray-200 rounded-xl px-4
                        py-3 text-sm text-black
                        focus:outline-none
                        focus:border-black"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Business Hours — small business only */}

        {!isEvent && (
  <div>
    <label className="block text-sm font-medium
      text-black mb-3">
      Business Hours
      <span className="text-gray-400 text-xs
        font-normal ml-2">
        Optional
      </span>
    </label>

    {/* Two checkboxes */}
    <div className="space-y-3 mb-4">

      {/* Hours posted on social */}
      <label className="flex items-start gap-3
        cursor-pointer p-4 border-2 rounded-xl
        transition border-gray-200">
        <input
          type="checkbox"
          checked={formData.hours.some(
            h => h.hoursVary
          )}
          onChange={(e) => {
            if (e.target.checked) {
              updateForm({
                hours: DAYS_OF_WEEK.map(day => ({
                  dayOfWeek:     day,
                  openTime:      "",
                  closeTime:     "",
                  closesNextDay: false,
                  isClosed:      false,
                  hoursVary:     true,
                  seasonStart:   "",
                  seasonEnd:     "",
                }))
              });
            } else {
              updateForm({ hours: [] });
            }
          }}
          className="w-4 h-4 rounded mt-0.5
            flex-shrink-0"
        />
        <p className="text-sm text-black">
          Hours posted weekly on social media page
        </p>
      </label>

      {/* Hours subject to change */}
      <label className="flex items-start gap-3
        cursor-pointer p-4 border-2 rounded-xl
        transition border-gray-200">
        <input
          type="checkbox"
          checked={
            (formData as any).hoursSubjectToChange
            || false
          }
          onChange={(e) =>
            updateForm({
              hoursSubjectToChange: e.target.checked
            } as any)
          }
          className="w-4 h-4 rounded mt-0.5
            flex-shrink-0"
        />
        <p className="text-sm text-black">
          Hours subject to change due to
          weather, events, etc.
        </p>
      </label>

    </div>

    {/* Monday-Sunday schedule
        only collapses when hours vary is checked */}
    {!formData.hours.some(h => h.hoursVary) && (
      <div className="space-y-2">
        {DAYS_OF_WEEK.map((day) => {
          const hours = getHours(day);
          const isAdded = !!hours;

          return (
            <div key={day}
              className="border-2 border-gray-100
                rounded-xl overflow-hidden">

              <div className="flex items-center
                justify-between px-4 py-3">
                <p className="text-sm font-medium
                  text-black capitalize">
                  {day}
                </p>
                <div className="flex items-center
                  gap-3">
                  {isAdded && (
                    <label className="flex items-center
                      gap-2 text-xs text-gray-500
                      cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hours?.isClosed}
                        onChange={(e) =>
                          updateHours(day, {
                            isClosed: e.target.checked
                          })
                        }
                        className="w-3.5 h-3.5"
                      />
                      Closed
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isAdded) {
                        updateForm({
                          hours: formData.hours.filter(
                            h => h.dayOfWeek !== day
                          )
                        });
                      } else {
                        addHours(day);
                      }
                    }}
                    className="text-xs text-black
                      underline"
                  >
                    {isAdded ? "Remove" : "Add"}
                  </button>
                </div>
              </div>

              {isAdded && !hours?.isClosed && (
                <div className="px-4 pb-3 grid
                  grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs
                      text-gray-400 mb-1">
                      Open
                    </label>
                    <input
                      type="time"
                      value={hours?.openTime || ""}
                      onChange={(e) =>
                        updateHours(day, {
                          openTime: e.target.value
                        })
                      }
                      className="w-full border-2
                        border-gray-200 rounded-xl
                        px-3 py-2 text-sm text-black
                        focus:outline-none
                        focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs
                      text-gray-400 mb-1">
                      Close
                    </label>
                    <input
                      type="time"
                      value={hours?.closeTime || ""}
                      onChange={(e) =>
                        updateHours(day, {
                          closeTime: e.target.value
                        })
                      }
                      className="w-full border-2
                        border-gray-200 rounded-xl
                        px-3 py-2 text-sm text-black
                        focus:outline-none
                        focus:border-black"
                    />
                  </div>
                  <label className="flex items-center
                    gap-2 text-xs text-gray-500
                    cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={
                        hours?.closesNextDay || false
                      }
                      onChange={(e) =>
                        updateHours(day, {
                          closesNextDay: e.target.checked
                        })
                      }
                      className="w-3.5 h-3.5"
                    />
                    Closes after midnight
                  </label>
                </div>
              )}
            </div>
          );
        })}

        {/* Note shown when hours subject to change */}
        {(formData as any).hoursSubjectToChange && (
          <div className="mt-3 p-4 bg-amber-50
            border-2 border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <svg width="16" height="16"
                viewBox="0 0 24 24" fill="none"
                stroke="#d97706" strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16"
                  x2="12.01" y2="16"/>
              </svg>
              <p className="text-xs text-amber-700">
                Hours subject to change due to
                weather, events, etc. will be
                displayed on your listing.
              </p>
            </div>
          </div>
        )}
      </div>
    )}

  </div>
)}


        {/* Amenities — small business only */}
        {!isEvent && (
          <>
            {/* Payment Options */}
            <AmenitySection
              title="Payment Options"
              options={PAYMENT_OPTIONS}
              selected={formData.paymentOptions}
              onToggle={(v) =>
                toggleAmenity("paymentOptions", v)
              }
            />

            {/* Ordering Methods */}
            <AmenitySection
              title="Ordering Methods"
              options={ORDERING_METHODS}
              selected={formData.orderingMethods}
              onToggle={(v) =>
                toggleAmenity("orderingMethods", v)
              }
            />

            {/* Dietary Options */}
            <AmenitySection
              title="Dietary Options"
              options={DIETARY_OPTIONS}
              selected={formData.dietaryOptions}
              onToggle={(v) =>
                toggleAmenity("dietaryOptions", v)
              }
            />

            {/* Business Amenities */}
            <AmenitySection
              title="Business Amenities"
              options={BUSINESS_AMENITIES}
              selected={formData.businessAmenities}
              onToggle={(v) =>
                toggleAmenity("businessAmenities", v)
              }
            />

            {/* Location Amenities — permanent only */}
            {isPermanent && (
              <AmenitySection
                title="Location Amenities"
                options={LOCATION_AMENITIES}
                selected={formData.locationAmenities}
                onToggle={(v) =>
                  toggleAmenity("locationAmenities", v)
                }
              />
            )}
          </>
        )}

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

// Reusable amenity checklist component
function AmenitySection({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium
        text-black mb-3">
        {title}
        <span className="text-gray-400 text-xs
          font-normal ml-2">
          Optional
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`px-4 py-2 rounded-full text-xs
              font-medium border-2 transition
              ${selected.includes(option)
                ? "bg-black border-black text-white"
                : "bg-white border-gray-200 text-black"
              }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}