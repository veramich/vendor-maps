"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import imageCompression from "browser-image-compression";
import {
  ResourceFormData,
  ResourceFlyer,
  INITIAL_RESOURCE_FORM,
  RESOURCE_TYPE_SUGGESTIONS,
  DELIVERY_MODES,
  TIMING_TYPES,
  TimingType,
  MAX_FLYERS,
  MAX_CONTACTS,
  MAX_WEBSITES,
  MAX_SOCIAL_LINKS,
} from "@/lib/types/resource";
import AddressAutocomplete, {
  SelectedAddress,
} from "@/components/resources/AddressAutocomplete";

const sanitizeText = (value: string): string =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "");

const isValidUrl = (value: string): boolean => {
  const withProtocol = /^https?:\/\//i.test(value)
    ? value
    : `https://${value}`;
  try {
    new URL(withProtocol);
    return true;
  } catch {
    return false;
  }
};

const todayIso = () => new Date().toISOString().slice(0, 10);

type ListField = "contacts" | "websites" | "socialUrls";

interface ResourceFormProps {
  mode: "create" | "edit";
  // edit mode only:
  resourceId?: string;
  initial?: ResourceFormData;
  // flyers already uploaded to Cloudinary (edit mode)
  initialFlyers?: ResourceFlyer[];
  // whether the resource being edited is currently live
  wasListed?: boolean;
}

export default function ResourceForm({
  mode,
  resourceId,
  initial,
  initialFlyers = [],
  wasListed = false,
}: ResourceFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isEdit = mode === "edit";

  const [form, setForm] = useState<ResourceFormData>(
    initial || INITIAL_RESOURCE_FORM
  );
  // New flyer files added in this session (previews parallel this list)
  const [previews, setPreviews] = useState<string[]>([]);
  // Existing flyers retained from before (edit mode)
  const [keptFlyers, setKeptFlyers] =
    useState<ResourceFlyer[]>(initialFlyers);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  const flyerInputRef = useRef<HTMLInputElement>(null);

  const totalFlyers = keptFlyers.length + form.flyers.length;

  const update = (data: Partial<ResourceFormData>) =>
    setForm((prev) => ({ ...prev, ...data }));

  // Switching timing type clears any dates that no
  // longer apply and keeps alwaysAvailable in sync.
  const selectTimingType = (timingType: TimingType) => {
    update({
      timingType,
      alwaysAvailable: timingType === "always",
      startDate: "",
      endDate: "",
    });
    clearError("startDate");
    clearError("endDate");
  };

  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  // --- Flyers ---
  const handleFlyerChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_FLYERS - totalFlyers;
    const toAdd = files.slice(0, remaining);

    setCompressing(true);
    try {
      const compressed = await Promise.all(
        toAdd.map((file) =>
          imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: "image/jpeg",
          })
        )
      );

      const newPreviews = await Promise.all(
        compressed.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () =>
                resolve(reader.result as string);
              reader.readAsDataURL(file);
            })
        )
      );

      setPreviews((prev) => [...prev, ...newPreviews]);
      update({ flyers: [...form.flyers, ...compressed] });
    } finally {
      setCompressing(false);
      if (flyerInputRef.current) flyerInputRef.current.value = "";
    }
  };

  const removeNewFlyer = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    update({ flyers: form.flyers.filter((_, i) => i !== index) });
  };

  const removeKeptFlyer = (index: number) => {
    setKeptFlyers((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Validation ---
  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!form.resourceType.trim())
      next.resourceType = "Please choose or enter a resource type";
    if (!form.title.trim()) next.title = "Please add a title";
    if (!form.availability.trim())
      next.availability = "Please describe availability";

    if (form.timingType !== "always") {
      const needsStart =
        form.timingType === "range" || form.timingType === "window";

      if (needsStart && !form.startDate)
        next.startDate =
          form.timingType === "window"
            ? "Add the opening date"
            : "Add the start date";

      if (!form.endDate)
        next.endDate =
          form.timingType === "deadline"
            ? "Add the deadline"
            : form.timingType === "window"
            ? "Add the closing date"
            : "Add the end date";

      if (
        form.startDate &&
        form.endDate &&
        form.endDate < form.startDate
      )
        next.endDate =
          form.timingType === "window"
            ? "Closing date must be on or after the opening date"
            : "End date must be on or after the start date";

      if (form.endDate && form.endDate < todayIso())
        next.endDate = "That date can't be in the past";
    }

    if (form.signupOnline) {
      if (!form.signupUrl.trim())
        next.signupUrl = "Add the sign up link";
      else if (!isValidUrl(form.signupUrl))
        next.signupUrl = "Enter a valid link";
    }

    form.websites.forEach((url, i) => {
      if (url.trim() && !isValidUrl(url))
        next[`website_${i}`] = "Enter a valid website URL";
    });

    form.socialUrls.forEach((url, i) => {
      if (url.trim() && !isValidUrl(url))
        next[`social_${i}`] = "Enter a valid link";
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // --- Repeatable list helpers ---
  const listMax: Record<ListField, number> = {
    contacts:   MAX_CONTACTS,
    websites:   MAX_WEBSITES,
    socialUrls: MAX_SOCIAL_LINKS,
  };

  const listErrorKey: Record<ListField, string | null> = {
    contacts:   null,
    websites:   "website",
    socialUrls: "social",
  };

  const updateListItem = (
    field: ListField,
    index: number,
    value: string
  ) => {
    const list = [...form[field]];
    list[index] = sanitizeText(value);
    update({ [field]: list });
  };

  const addListItem = (field: ListField) => {
    if (form[field].length >= listMax[field]) return;
    update({ [field]: [...form[field], ""] });
  };

  const removeListItem = (field: ListField, index: number) => {
    const list = form[field].filter((_, i) => i !== index);
    update({ [field]: list.length ? list : [""] });
    const prefix = listErrorKey[field];
    if (prefix) clearError(`${prefix}_${index}`);
  };

  // --- Submit ---
  const buildDataPayload = () => ({
    resourceType: form.resourceType,
    title: form.title,
    description: form.description,
    deliveryMode: form.deliveryMode,
    timingType: form.timingType,
    alwaysAvailable: form.alwaysAvailable,
    startDate: form.startDate,
    endDate: form.endDate,
    availability: form.availability,
    hasCutoff: form.hasCutoff,
    availabilityCutoff: form.availabilityCutoff,
    signupOnline: form.signupOnline,
    signupUrl: form.signupUrl,
    walkInWelcome: form.walkInWelcome,
    streetAddress: form.streetAddress,
    city: form.city,
    state: form.state,
    stateCode: form.stateCode,
    latitude: form.latitude,
    longitude: form.longitude,
    contacts: form.contacts,
    websites: form.websites,
    socialUrls: form.socialUrls,
    honeypot: form.honeypot,
  });

  const handleSubmit = async () => {
    setSubmitError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();

      const payload: Record<string, unknown> = buildDataPayload();
      // In edit mode, tell the server which existing flyers to keep
      if (isEdit) payload.keptFlyers = keptFlyers;

      fd.append("data", JSON.stringify(payload));

      form.flyers.forEach((file, i) => {
        fd.append(`flyer_${i}`, file);
      });

      const url = isEdit
        ? `/api/user/resources/${resourceId}`
        : "/api/resources/submit";

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        body: fd,
      });

      if (res.status === 413) {
        throw new Error(
          "Upload is too large. Please remove a flyer and try again."
        );
      }

      let result: any;
      try {
        result = await res.json();
      } catch {
        throw new Error("Unexpected server response. Please try again.");
      }

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Submission failed");
      }

      if (isEdit) {
        router.push("/my-resources");
        router.refresh();
      } else {
        setDone(true);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --- Create-mode confirmation screen ---
  if (done) {
    return (
      <div className="min-h-screen bg-white px-4 py-16">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-green-100
            flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#16a34a" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-black mb-2">
            Thanks for sharing!
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Your resource was submitted and will appear once it&apos;s
            reviewed. This usually doesn&apos;t take long.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setForm(INITIAL_RESOURCE_FORM);
                setPreviews([]);
                setErrors({});
                setDone(false);
              }}
              className="w-full bg-black text-white rounded-xl py-4
                text-sm font-medium hover:bg-gray-800 transition"
            >
              Post another resource
            </button>
            <Link
              href="/resources"
              className="w-full border-2 border-gray-200 text-gray-700
                rounded-xl py-4 text-sm font-medium text-center
                hover:border-gray-300 transition"
            >
              Back to resources
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = (key: string) =>
    `w-full border-2 rounded-xl px-4 py-3 text-sm text-black
     focus:outline-none transition ${
       errors[key]
         ? "border-red-400"
         : "border-gray-200 focus:border-black"
     }`;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Link
            href={isEdit ? "/my-resources" : "/resources"}
            className="p-1 text-gray-500 hover:text-gray-700"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-black">
              {isEdit ? "Edit resource" : "Share a resource"}
            </h1>
            <p className="text-sm text-gray-400">
              For street vendors &amp; home-based businesses
            </p>
          </div>
        </div>
      </div>

      {/* Re-review notice (edit mode, currently live) */}
      {isEdit && wasListed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <p className="text-xs text-amber-700 text-center max-w-lg
            mx-auto">
            ⚠ Editing a live resource sends it back for review before the
            changes appear publicly.
          </p>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="space-y-8">

          {/* Honeypot — hidden from humans */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.honeypot}
            onChange={(e) => update({ honeypot: e.target.value })}
            className="absolute -left-[9999px] w-px h-px opacity-0"
            aria-hidden="true"
          />

          {/* Sign-in nudge (create mode, signed out) */}
          {!isEdit && !session && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl
              px-4 py-3">
              <p className="text-xs text-gray-500">
                You can post without an account.{" "}
                <Link href="/sign-in" className="text-black underline">
                  Sign in
                </Link>{" "}
                first if you&apos;d like to edit or manage this resource
                later.
              </p>
            </div>
          )}

          {/* Resource Type */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Resource type
              <span className="text-red-400 ml-1">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Pick one or type your own
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {RESOURCE_TYPE_SUGGESTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    update({ resourceType: type });
                    clearError("resourceType");
                  }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full
                    border-2 transition ${
                      form.resourceType === type
                        ? "border-black bg-black text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.resourceType}
              onChange={(e) => {
                update({ resourceType: sanitizeText(e.target.value) });
                clearError("resourceType");
              }}
              placeholder="e.g. Available Grants"
              maxLength={80}
              className={inputClass("resourceType")}
            />
            {errors.resourceType && (
              <p className="text-red-500 text-xs mt-1">
                {errors.resourceType}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Title
              <span className="text-red-400 ml-1">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              A short headline for the resource
            </p>
            <input
              type="text"
              value={form.title}
              onChange={(e) => {
                update({ title: sanitizeText(e.target.value) });
                clearError("title");
              }}
              placeholder="e.g. Small Business Startup Grant 2026"
              maxLength={120}
              className={inputClass("title")}
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Description
              <span className="text-gray-400 text-xs font-normal ml-2">
                Optional
              </span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                update({ description: sanitizeText(e.target.value) })
              }
              placeholder="Who it's for, what it covers, how to qualify…"
              rows={4}
              maxLength={2000}
              className="w-full border-2 border-gray-200 rounded-xl px-4
                py-3 text-sm text-black focus:outline-none
                focus:border-black transition resize-none"
            />
          </div>

          {/* Delivery mode — online / in person / both */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Online or in person
              <span className="text-red-400 ml-1">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              How people take part in this resource
            </p>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => update({ deliveryMode: mode.value })}
                  className={`text-sm font-medium px-4 py-2 rounded-full
                    border-2 transition ${
                      form.deliveryMode === mode.value
                        ? "border-black bg-black text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Timing
              <span className="text-red-400 ml-1">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Dated resources are automatically removed after their
              last date
            </p>

            {/* Timing type picker */}
            <div className="space-y-2">
              {TIMING_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => selectTimingType(t.value)}
                  className={`w-full text-left flex items-start gap-3
                    rounded-xl border-2 px-4 py-3 transition ${
                      form.timingType === t.value
                        ? "border-black bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full border-2
                      flex-shrink-0 flex items-center justify-center
                      transition ${
                        form.timingType === t.value
                          ? "border-black"
                          : "border-gray-300"
                      }`}
                  >
                    {form.timingType === t.value && (
                      <span className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-black">
                      {t.label}
                    </span>
                    <span className="block text-xs text-gray-400">
                      {t.hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {/* Date inputs — shape depends on timing type */}
            {form.timingType === "deadline" && (
              <div className="mt-3">
                <label className="block text-xs text-gray-500 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  min={todayIso()}
                  onChange={(e) => {
                    update({ endDate: e.target.value });
                    clearError("endDate");
                  }}
                  className={inputClass("endDate")}
                />
              </div>
            )}

            {(form.timingType === "range" ||
              form.timingType === "window") && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {form.timingType === "window"
                      ? "Opens"
                      : "Start date"}
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    min={todayIso()}
                    onChange={(e) => {
                      update({ startDate: e.target.value });
                      clearError("startDate");
                      clearError("endDate");
                    }}
                    className={inputClass("startDate")}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {form.timingType === "window"
                      ? "Closes"
                      : "End date"}
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate || todayIso()}
                    onChange={(e) => {
                      update({ endDate: e.target.value });
                      clearError("endDate");
                    }}
                    className={inputClass("endDate")}
                  />
                </div>
              </div>
            )}

            {errors.startDate && (
              <p className="text-red-500 text-xs mt-1">
                {errors.startDate}
              </p>
            )}
            {errors.endDate && (
              <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
            )}
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Availability
              <span className="text-red-400 ml-1">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              e.g. First come first serve, Limited spots, By appointment
            </p>
            <input
              type="text"
              value={form.availability}
              onChange={(e) => {
                update({ availability: sanitizeText(e.target.value) });
                clearError("availability");
              }}
              placeholder="e.g. First come, first serve"
              maxLength={200}
              className={inputClass("availability")}
            />
            {errors.availability && (
              <p className="text-red-500 text-xs mt-1">
                {errors.availability}
              </p>
            )}
          </div>

          {/* Sign up online */}
          <div>
            <button
              type="button"
              onClick={() =>
                update({
                  signupOnline: !form.signupOnline,
                  signupUrl: "",
                })
              }
              className="flex items-center gap-2"
            >
              <span
                className={`w-5 h-5 rounded-md border-2 flex items-center
                  justify-center transition ${
                    form.signupOnline
                      ? "bg-black border-black"
                      : "border-gray-300"
                  }`}
              >
                {form.signupOnline && (
                  <svg width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="white" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </span>
              <span className="text-sm font-medium text-black">
                Sign up online
              </span>
            </button>
            {form.signupOnline && (
              <div className="mt-2">
                <input
                  type="url"
                  value={form.signupUrl}
                  onChange={(e) => {
                    update({ signupUrl: sanitizeText(e.target.value) });
                    clearError("signupUrl");
                  }}
                  placeholder="https://link-to-the-form.com"
                  className={inputClass("signupUrl")}
                />
                {errors.signupUrl && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.signupUrl}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Walk in welcome */}
          <button
            type="button"
            onClick={() =>
              update({ walkInWelcome: !form.walkInWelcome })
            }
            className="flex items-center gap-2"
          >
            <span
              className={`w-5 h-5 rounded-md border-2 flex items-center
                justify-center transition ${
                  form.walkInWelcome
                    ? "bg-black border-black"
                    : "border-gray-300"
                }`}
            >
              {form.walkInWelcome && (
                <svg width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="white" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </span>
            <span className="text-sm font-medium text-black">
              Walk-ins welcome
            </span>
          </button>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Location
              <span className="text-gray-400 text-xs font-normal ml-2">
                Optional
              </span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Add a place so people can filter by city &amp; state.
              Leave blank for online-only resources.
            </p>
            <AddressAutocomplete
              value={{
                streetAddress: form.streetAddress,
                city:          form.city,
                state:         form.state,
                stateCode:     form.stateCode,
                latitude:      form.latitude,
                longitude:     form.longitude,
              }}
              onChange={(addr: SelectedAddress) =>
                update({
                  streetAddress: addr.streetAddress,
                  city:          addr.city,
                  state:         addr.state,
                  stateCode:     addr.stateCode,
                  latitude:      addr.latitude,
                  longitude:     addr.longitude,
                })
              }
            />
          </div>

          {/* Contacts (repeatable) */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Contact
              <span className="text-gray-400 text-xs font-normal ml-2">
                Optional
              </span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Name, phone, or email people can reach out to. Add more
              than one if needed.
            </p>
            <div className="space-y-2">
              {form.contacts.map((contact, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) =>
                      updateListItem("contacts", i, e.target.value)
                    }
                    placeholder="e.g. Maria · (555) 123-4567"
                    maxLength={200}
                    className="flex-1 border-2 border-gray-200 rounded-xl
                      px-4 py-3 text-sm text-black focus:outline-none
                      focus:border-black transition"
                  />
                  {(form.contacts.length > 1 || contact) && (
                    <button
                      type="button"
                      onClick={() => removeListItem("contacts", i)}
                      className="w-9 h-9 flex-shrink-0 rounded-lg border-2
                        border-gray-200 text-gray-400 hover:text-gray-600
                        hover:border-gray-300 transition flex items-center
                        justify-center"
                      aria-label="Remove contact"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {form.contacts.length < MAX_CONTACTS && (
              <button
                type="button"
                onClick={() => addListItem("contacts")}
                className="text-sm text-black underline mt-2"
              >
                + Add another contact
              </button>
            )}
          </div>

          {/* Flyers */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Flyer
              <span className="text-gray-400 text-xs font-normal ml-2">
                Optional — up to {MAX_FLYERS}
              </span>
            </label>

            {(keptFlyers.length > 0 || previews.length > 0) && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Existing flyers (edit mode) */}
                {keptFlyers.map((flyer, i) => (
                  <div
                    key={flyer.publicId || i}
                    className="relative aspect-[4/3]"
                  >
                    <img
                      src={flyer.url}
                      alt={`Flyer ${i + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => removeKeptFlyer(i)}
                      className="absolute top-1 right-1 bg-black
                        bg-opacity-60 text-white w-6 h-6 rounded-full
                        flex items-center justify-center text-xs"
                      aria-label="Remove flyer"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {/* Newly added flyers */}
                {previews.map((preview, i) => (
                  <div key={i} className="relative aspect-[4/3]">
                    <img
                      src={preview}
                      alt={`Flyer ${i + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewFlyer(i)}
                      className="absolute top-1 right-1 bg-black
                        bg-opacity-60 text-white w-6 h-6 rounded-full
                        flex items-center justify-center text-xs"
                      aria-label="Remove flyer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalFlyers < MAX_FLYERS && (
              <>
                <input
                  ref={flyerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  multiple
                  onChange={handleFlyerChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => flyerInputRef.current?.click()}
                  disabled={compressing}
                  className="w-full border-2 border-dashed border-gray-200
                    rounded-xl py-8 flex flex-col items-center gap-2
                    hover:border-gray-300 transition disabled:opacity-50"
                >
                  {compressing ? (
                    <>
                      <svg width="28" height="28" viewBox="0 0 24 24"
                        fill="none" stroke="#9ca3af" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"
                        className="animate-spin">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      <p className="text-sm text-gray-400">
                        Optimizing…
                      </p>
                    </>
                  ) : (
                    <>
                      <svg width="28" height="28" viewBox="0 0 24 24"
                        fill="none" stroke="#9ca3af" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18"
                          rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <p className="text-sm text-gray-400">
                        {totalFlyers === 0
                          ? "Add a flyer"
                          : `Add another (${totalFlyers}/${MAX_FLYERS})`}
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

          {/* Websites (repeatable) */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Website
              <span className="text-gray-400 text-xs font-normal ml-2">
                Optional
              </span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Add more than one if needed.
            </p>
            <div className="space-y-2">
              {form.websites.map((url, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        updateListItem("websites", i, e.target.value);
                        clearError(`website_${i}`);
                      }}
                      placeholder="https://example.org"
                      className={`flex-1 border-2 rounded-xl px-4 py-3
                        text-sm text-black focus:outline-none transition
                        ${
                          errors[`website_${i}`]
                            ? "border-red-400"
                            : "border-gray-200 focus:border-black"
                        }`}
                    />
                    {(form.websites.length > 1 || url) && (
                      <button
                        type="button"
                        onClick={() => removeListItem("websites", i)}
                        className="w-9 h-9 flex-shrink-0 rounded-lg border-2
                          border-gray-200 text-gray-400 hover:text-gray-600
                          hover:border-gray-300 transition flex items-center
                          justify-center"
                        aria-label="Remove website"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {errors[`website_${i}`] && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors[`website_${i}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {form.websites.length < MAX_WEBSITES && (
              <button
                type="button"
                onClick={() => addListItem("websites")}
                className="text-sm text-black underline mt-2"
              >
                + Add another website
              </button>
            )}
          </div>

          {/* Social media posts (repeatable) */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Social media post
              <span className="text-gray-400 text-xs font-normal ml-2">
                Optional
              </span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Link to a post about this resource. Add more than one if
              needed.
            </p>
            <div className="space-y-2">
              {form.socialUrls.map((url, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        updateListItem("socialUrls", i, e.target.value);
                        clearError(`social_${i}`);
                      }}
                      placeholder="https://instagram.com/p/…"
                      className={`flex-1 border-2 rounded-xl px-4 py-3
                        text-sm text-black focus:outline-none transition
                        ${
                          errors[`social_${i}`]
                            ? "border-red-400"
                            : "border-gray-200 focus:border-black"
                        }`}
                    />
                    {(form.socialUrls.length > 1 || url) && (
                      <button
                        type="button"
                        onClick={() => removeListItem("socialUrls", i)}
                        className="w-9 h-9 flex-shrink-0 rounded-lg border-2
                          border-gray-200 text-gray-400 hover:text-gray-600
                          hover:border-gray-300 transition flex items-center
                          justify-center"
                        aria-label="Remove link"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {errors[`social_${i}`] && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors[`social_${i}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {form.socialUrls.length < MAX_SOCIAL_LINKS && (
              <button
                type="button"
                onClick={() => addListItem("socialUrls")}
                className="text-sm text-black underline mt-2"
              >
                + Add another link
              </button>
            )}
          </div>

          {/* Submit */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl
              px-4 py-3">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || compressing}
            className="w-full bg-black text-white rounded-xl py-4
              text-sm font-medium hover:bg-gray-800 transition
              disabled:opacity-50"
          >
            {submitting
              ? isEdit
                ? "Saving…"
                : "Posting…"
              : isEdit
              ? "Save changes"
              : "Post resource"}
          </button>

          <p className="text-xs text-gray-400 text-center -mt-4">
            Posts are reviewed before they appear publicly.
          </p>
        </div>
      </div>
    </div>
  );
}
