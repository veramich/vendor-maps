"use client";

import { useEffect, useState } from "react";
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

const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      const ampm = hour < 12 ? "AM" : "PM";
      const label = `${h12}:${minute
        .toString()
        .padStart(2, "0")} ${ampm}`;
      const value = `${hour
        .toString()
        .padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      options.push({ label, value });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

function TimeSelect({
  value,
  onChange,
  className,
  hasError,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  hasError?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || `w-full border-2
        rounded-xl px-4 py-3 text-sm text-black
        focus:outline-none focus:border-black
        bg-white transition
        ${hasError
          ? "border-red-400"
          : "border-gray-200"
        }`}
    >
      <option value="">Select time</option>
      {TIME_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

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

export default function Step5Details({
  formData,
  updateForm,
  nextStep,
}: Step5DetailsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Events no longer pick a sub_type in Step 2 — it's derived at submit from
  // the date mode. Within the form, the event date mode drives which UI shows:
  // "recurring" → market schedules, "specific" → discrete dates. Default a
  // freshly-reached event to "specific".
  const isEvent = formData.type === "event";
  const mode: "specific" | "recurring" =
    formData.eventDateMode ?? "specific";
  const isRecurring = isEvent && mode === "recurring";
  const isSpecific  = isEvent && mode === "specific";
  // Small business is permanent unless directory-only is chosen at the
  // location step (subType is only derived at submit time).
  const isPermanent =
    formData.type === "small_business" && !formData.noFixedLocation;

  // Price context keys off the chosen detailedSubType (small business);
  // events use a generic event context.
  const priceContext =
    PRICE_CONTEXT[
      formData.detailedSubType || (isEvent ? "pop_up" : "") || ""
    ] || "per item";

  const MAX_EVENT_DATES = 6;

  // Persist the default mode so submit/review see it even if the user never
  // taps the toggle.
  useEffect(() => {
    if (isEvent && formData.eventDateMode == null) {
      updateForm({ eventDateMode: "specific" });
    }
  }, [isEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!isEvent && !formData.priceTier) {
      newErrors.priceTier = "Please select a price tier";
    }

    if (
      isEvent &&
      !(formData as any).isFreeEntry &&
      !(formData as any).admissionPrice
    ) {
      newErrors.admissionPrice =
        "Please enter an admission price";
    }

    // Specific-dates mode — at least one date, each with date + times, and a
    // per-row end-after-start check (unless it runs past midnight).
    if (isSpecific) {
      if (formData.eventDates.length === 0) {
        newErrors.eventDates = "Please add at least one date";
      }
      formData.eventDates.forEach((d, i) => {
        if (!d.date) {
          newErrors[`date_${i}`] = "Date is required";
        }
        if (!d.startTime) {
          newErrors[`startTime_${i}`] = "Start time is required";
        }
        if (!d.endTime) {
          newErrors[`endTime_${i}`] = "End time is required";
        }
        if (
          d.date &&
          d.startTime &&
          d.endTime &&
          !d.closesNextDay
        ) {
          const start = new Date(`${d.date} ${d.startTime}`);
          const end = new Date(`${d.date} ${d.endTime}`);
          if (start >= end) {
            newErrors[`endTime_${i}`] =
              "End time must be after start time";
          }
        }
      });
    }

    // Recurring mode — at least one schedule, each with an anchor date so we
    // can compute exact upcoming dates (and resolve biweekly cadence).
    if (isRecurring) {
      if (formData.marketSchedules.length === 0) {
        newErrors.schedule =
          "Please add at least one schedule";
      }
      formData.marketSchedules.forEach((s, i) => {
        if (!s.anchorDate) {
          newErrors[`anchorDate_${i}`] =
            s.recurrenceType.startsWith("monthly")
              ? "Pick the first date this happens"
              : "Pick the next date this happens";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) nextStep();
  };

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

  const addSchedule = () => {
    updateForm({
      marketSchedules: [
        ...formData.marketSchedules,
        {
          dayOfWeek:      "saturday",
          recurrenceType: "weekly",
          anchorDate:     "",
          startTime:      "08:00",
          endTime:        "14:00",
          closesNextDay:  false,
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

  const addEventDate = () => {
    if (formData.eventDates.length >= MAX_EVENT_DATES) return;
    updateForm({
      eventDates: [
        ...formData.eventDates,
        {
          date:          "",
          startTime:     "10:00",
          endTime:       "16:00",
          closesNextDay: false,
        },
      ],
    });
  };

  const updateEventDate = (
    index: number,
    data: Partial<typeof formData.eventDates[0]>
  ) => {
    const updated = [...formData.eventDates];
    updated[index] = { ...updated[index], ...data };
    updateForm({ eventDates: updated });
  };

  const removeEventDate = (index: number) => {
    updateForm({
      eventDates: formData.eventDates
        .filter((_, i) => i !== index),
    });
  };

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

        {/* Price Range — small business only */}
        {!isEvent && (
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
        )}

        {/* Admission — events only */}
        {isEvent && (
          <div>
            <label className="block text-sm font-medium
              text-black mb-3">
              Admission
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    updateForm({
                      isFreeEntry:    true,
                      admissionPrice: "",
                    } as any)
                  }
                  className={`border-2 rounded-xl py-4
                    text-center transition
                    ${(formData as any).isFreeEntry
                      ? "border-black bg-black text-white"
                      : "border-gray-200 text-black"
                    }`}
                >
                  <p className="font-semibold text-sm">
                    Free Entry
                  </p>
                  <p className="text-xs mt-0.5 opacity-70">
                    No admission fee
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateForm({
                      isFreeEntry: false,
                    } as any)
                  }
                  className={`border-2 rounded-xl py-4
                    text-center transition
                    ${!(formData as any).isFreeEntry
                      ? "border-black bg-black text-white"
                      : "border-gray-200 text-black"
                    }`}
                >
                  <p className="font-semibold text-sm">
                    Paid Entry
                  </p>
                  <p className="text-xs mt-0.5 opacity-70">
                    Admission required
                  </p>
                </button>
              </div>

              {!(formData as any).isFreeEntry && (
                <div>
                  <label className="block text-xs
                    text-gray-500 mb-1">
                    Admission Price
                  </label>
                  <div className="flex items-center
                    border-2 border-gray-200 rounded-xl
                    focus-within:border-black transition">
                    <span className="pl-4 text-gray-400
                      text-sm">
                      $
                    </span>
                    <input
                      type="text"
                      value={
                        (formData as any).admissionPrice
                      }
                      onChange={(e) =>
                        updateForm({
                          admissionPrice: e.target.value
                        } as any)
                      }
                      placeholder="e.g. 5 or 5-10"
                      className="flex-1 px-3 py-3 text-sm
                        text-black focus:outline-none
                        bg-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-400
                    mt-1">
                    You can enter a range e.g. 5-10
                  </p>
                  {errors.admissionPrice && (
                    <p className="text-red-500 text-xs
                      mt-1">
                      {errors.admissionPrice}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event dates — all events. Mode toggle picks between scattered
            specific dates and a recurring schedule. */}
        {isEvent && (
          <div className="space-y-5">

            {/* Optional event name */}
            <div>
              <label className="block text-sm font-medium
                text-black mb-1">
                Event Name
                <span className="text-gray-400 text-xs
                  font-normal ml-2">
                  Optional
                </span>
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.eventName}
                onChange={(e) =>
                  updateForm({ eventName: e.target.value })
                }
                placeholder="e.g. Holiday Night Market"
                className="w-full border-2 border-gray-200
                  rounded-xl px-4 py-3 text-sm text-black
                  focus:outline-none focus:border-black
                  transition"
              />
            </div>

            {/* Mode toggle */}
            <div>
              <label className="block text-sm font-medium
                text-black mb-3">
                When does it happen?
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    updateForm({ eventDateMode: "specific" })
                  }
                  className={`border-2 rounded-xl py-4
                    text-center transition
                    ${isSpecific
                      ? "border-black bg-black text-white"
                      : "border-gray-200 text-black"
                    }`}
                >
                  <p className="font-semibold text-sm">
                    Specific dates
                  </p>
                  <p className="text-xs mt-0.5 opacity-70">
                    Up to 6 dates
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateForm({ eventDateMode: "recurring" })
                  }
                  className={`border-2 rounded-xl py-4
                    text-center transition
                    ${isRecurring
                      ? "border-black bg-black text-white"
                      : "border-gray-200 text-black"
                    }`}
                >
                  <p className="font-semibold text-sm">
                    Recurring event
                  </p>
                  <p className="text-xs mt-0.5 opacity-70">
                    Repeats on a schedule
                  </p>
                </button>
              </div>
            </div>

            {/* Specific dates */}
            {isSpecific && (
              <div>
                <div className="flex items-center
                  justify-between mb-3">
                  <label className="text-sm font-medium
                    text-black">
                    Dates
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  {formData.eventDates.length <
                    MAX_EVENT_DATES && (
                    <button
                      type="button"
                      onClick={addEventDate}
                      className="text-xs text-black underline"
                    >
                      + Add date
                    </button>
                  )}
                </div>

                {errors.eventDates && (
                  <p className="text-red-500 text-xs mb-2">
                    {errors.eventDates}
                  </p>
                )}

                {formData.eventDates.length === 0 && (
                  <button
                    type="button"
                    onClick={addEventDate}
                    className="w-full border-2 border-dashed
                      border-gray-200 rounded-xl py-6 text-sm
                      text-gray-400 hover:border-gray-300
                      transition"
                  >
                    + Add your first date
                  </button>
                )}

                {formData.eventDates.map((d, i) => (
                  <div key={i} className="border-2
                    border-gray-200 rounded-xl p-4 mb-3">

                    <div className="flex justify-between mb-3">
                      <p className="text-sm font-medium
                        text-black">
                        Date {i + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeEventDate(i)}
                        className="text-xs text-red-400"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Date */}
                    <div className="mb-3">
                      <label className="block text-xs
                        text-gray-500 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={d.date}
                        min={
                          new Date().toISOString().split("T")[0]
                        }
                        onChange={(e) => {
                          updateEventDate(i, {
                            date: e.target.value
                          });
                          if (errors[`date_${i}`]) {
                            setErrors(prev => ({
                              ...prev, [`date_${i}`]: ""
                            }));
                          }
                        }}
                        className={`w-full border-2 rounded-xl
                          px-4 py-3 text-sm text-black
                          focus:outline-none transition
                          ${errors[`date_${i}`]
                            ? "border-red-400"
                            : "border-gray-200 focus:border-black"
                          }`}
                      />
                      {errors[`date_${i}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`date_${i}`]}
                        </p>
                      )}
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2
                      gap-3 mb-3">
                      <div>
                        <label className="block text-xs
                          text-gray-500 mb-1">
                          Start Time
                        </label>
                        <TimeSelect
                          value={d.startTime}
                          onChange={(val) => {
                            updateEventDate(i, {
                              startTime: val
                            });
                            if (errors[`startTime_${i}`]) {
                              setErrors(prev => ({
                                ...prev,
                                [`startTime_${i}`]: ""
                              }));
                            }
                          }}
                          hasError={!!errors[`startTime_${i}`]}
                        />
                        {errors[`startTime_${i}`] && (
                          <p className="text-red-500 text-xs
                            mt-1">
                            {errors[`startTime_${i}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs
                          text-gray-500 mb-1">
                          End Time
                        </label>
                        <TimeSelect
                          value={d.endTime}
                          onChange={(val) => {
                            updateEventDate(i, {
                              endTime: val
                            });
                            if (errors[`endTime_${i}`]) {
                              setErrors(prev => ({
                                ...prev,
                                [`endTime_${i}`]: ""
                              }));
                            }
                          }}
                          hasError={!!errors[`endTime_${i}`]}
                        />
                        {errors[`endTime_${i}`] && (
                          <p className="text-red-500 text-xs
                            mt-1">
                            {errors[`endTime_${i}`]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Closes next day */}
                    <label className="flex items-center gap-3
                      cursor-pointer">
                      <input
                        type="checkbox"
                        checked={d.closesNextDay}
                        onChange={(e) =>
                          updateEventDate(i, {
                            closesNextDay: e.target.checked
                          })
                        }
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-black">
                        Ends after midnight
                      </span>
                    </label>
                  </div>
                ))}

                {formData.eventDates.length >=
                  MAX_EVENT_DATES && (
                  <p className="text-gray-400 text-xs">
                    You can add up to {MAX_EVENT_DATES} dates.
                  </p>
                )}
              </div>
            )}

            {/* Recurring schedule */}
            {isRecurring && (
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

                {formData.marketSchedules.map(
                  (schedule, i) => (
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
                          focus:border-black bg-white"
                      >
                        {DAYS_OF_WEEK.map(day => (
                          <option key={day} value={day}>
                            {day.charAt(0).toUpperCase() +
                              day.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Frequency */}
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
                          focus:border-black bg-white"
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

                    {/* Anchor date — the next/first occurrence. Lets us show
                        exact upcoming dates and resolve biweekly cadence. */}
                    <div className="mb-3">
                      <label className="block text-xs
                        text-gray-500 mb-1">
                        {schedule.recurrenceType.startsWith("monthly")
                          ? "First date this happens"
                          : "Next date this happens"}
                      </label>
                      <input
                        type="date"
                        value={schedule.anchorDate || ""}
                        min={
                          new Date().toISOString().split("T")[0]
                        }
                        onChange={(e) => {
                          updateSchedule(i, {
                            anchorDate: e.target.value
                          });
                          if (errors[`anchorDate_${i}`]) {
                            setErrors(prev => ({
                              ...prev,
                              [`anchorDate_${i}`]: ""
                            }));
                          }
                        }}
                        className={`w-full border-2 rounded-xl
                          px-4 py-3 text-sm text-black
                          focus:outline-none transition
                          ${errors[`anchorDate_${i}`]
                            ? "border-red-400"
                            : "border-gray-200 focus:border-black"
                          }`}
                      />
                      {errors[`anchorDate_${i}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`anchorDate_${i}`]}
                        </p>
                      )}
                      <p className="text-gray-400 text-xs mt-1">
                        {schedule.recurrenceType === "biweekly"
                          ? "We'll repeat every 2 weeks from this date."
                          : "Used to show the next upcoming date."}
                      </p>
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2
                      gap-3 mb-3">
                      <div>
                        <label className="block text-xs
                          text-gray-500 mb-1">
                          Start Time
                        </label>
                        <TimeSelect
                          value={schedule.startTime}
                          onChange={(val) =>
                            updateSchedule(i, {
                              startTime: val
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs
                          text-gray-500 mb-1">
                          End Time
                        </label>
                        <TimeSelect
                          value={schedule.endTime}
                          onChange={(val) =>
                            updateSchedule(i, {
                              endTime: val
                            })
                          }
                        />
                      </div>
                    </div>

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

            {/* Hours vary toggle */}
            <div className="space-y-3 mb-4">
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
                      hoursSubjectToChange:
                        e.target.checked
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

            {/* Day schedule */}
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
                            <label className="flex
                              items-center gap-2 text-xs
                              text-gray-500
                              cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hours?.isClosed}
                                onChange={(e) =>
                                  updateHours(day, {
                                    isClosed:
                                      e.target.checked
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
                                  hours: formData.hours
                                    .filter(
                                      h => h.dayOfWeek
                                        !== day
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
                        <div className="px-4 pb-3
                          grid grid-cols-2 gap-3">
                          <div>
                            <label className="block
                              text-xs text-gray-400 mb-1">
                              Open
                            </label>
                            <TimeSelect
                              value={
                                hours?.openTime || ""
                              }
                              onChange={(val) =>
                                updateHours(day, {
                                  openTime: val
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="block
                              text-xs text-gray-400 mb-1">
                              Close
                            </label>
                            <TimeSelect
                              value={
                                hours?.closeTime || ""
                              }
                              onChange={(val) =>
                                updateHours(day, {
                                  closeTime: val
                                })
                              }
                            />
                          </div>
                          <label className="flex
                            items-center gap-2 text-xs
                            text-gray-500 cursor-pointer
                            col-span-2">
                            <input
                              type="checkbox"
                              checked={
                                hours?.closesNextDay ||
                                false
                              }
                              onChange={(e) =>
                                updateHours(day, {
                                  closesNextDay:
                                    e.target.checked
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

                {/* Hours subject to change note */}
                {(formData as any).hoursSubjectToChange && (
                  <div className="mt-3 p-4 bg-amber-50
                    border-2 border-amber-200 rounded-xl">
                    <div className="flex items-start
                      gap-2">
                      <svg width="16" height="16"
                        viewBox="0 0 24 24" fill="none"
                        stroke="#d97706" strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8"
                          x2="12" y2="12"/>
                        <line x1="12" y1="16"
                          x2="12.01" y2="16"/>
                      </svg>
                      <p className="text-xs
                        text-amber-700">
                        Hours subject to change due to
                        weather, events, etc. will be
                        displayed on the listing.
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
            <AmenitySection
              title="Payment Options"
              options={PAYMENT_OPTIONS}
              selected={formData.paymentOptions}
              onToggle={(v) =>
                toggleAmenity("paymentOptions", v)
              }
            />

            <AmenitySection
              title="Ordering Methods"
              options={ORDERING_METHODS}
              selected={formData.orderingMethods}
              onToggle={(v) =>
                toggleAmenity("orderingMethods", v)
              }
            />

            <AmenitySection
              title="Dietary Options"
              options={DIETARY_OPTIONS}
              selected={formData.dietaryOptions}
              onToggle={(v) =>
                toggleAmenity("dietaryOptions", v)
              }
            />

            <AmenitySection
              title="Business Amenities"
              options={BUSINESS_AMENITIES}
              selected={formData.businessAmenities}
              onToggle={(v) =>
                toggleAmenity("businessAmenities", v)
              }
            />

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