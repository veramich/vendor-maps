"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  BusinessFormData,
  INITIAL_FORM_DATA,
} from "@/lib/types/business";
import Step3Location from
  "@/components/forms/add-business/Step3Location";
import Step4Info from
  "@/components/forms/add-business/Step4Info";
import Step5Details from
  "@/components/forms/add-business/Step5Details";
import Step5bVendorSpace from
  "@/components/forms/add-business/Step5bVendorSpace";
import Step6Media from
  "@/components/forms/add-business/Step6Media";

export default function EditSubmissionPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const businessId = params.id as string;

  // Allow deep-linking to a step (e.g. the directory "Add a photo" CTA → step 6).
  const initialStep = (() => {
    const s = Number(searchParams.get("step"));
    return s >= 3 && s <= 6 ? s : 4;
  })();

  const [formData, setFormData] =
    useState<BusinessFormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(initialStep);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
      return;
    }
    if (session) fetchSubmission();
  }, [session, isPending]);

  const fetchSubmission = async () => {
    try {
      const res = await fetch(
        `/api/user/submissions/${businessId}`
      );
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Pre-fill form with existing data
      setFormData(prev => ({
        ...prev,
        ...data.business,
      }));

    } catch (err) {
      setError("Failed to load submission");
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (
    data: Partial<BusinessFormData>
  ) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const [saveMessage, setSaveMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      // Send text fields plus image reconciliation as multipart: the JSON
      // "data" blob, the ids of photos to keep, and any newly added files.
      const body = new FormData();
      body.append(
        "data",
        JSON.stringify({ ...formData, images: [] })
      );
      body.append(
        "keptImageIds",
        JSON.stringify(
          formData.existingImages.map(img => img.id)
        )
      );
      // The gallery order (existing ids + "new:<i>" tokens) drives the final
      // photo order, including which one is the cover. New files keep the
      // index encoded in their "new:<i>" token so the API can match them.
      body.append(
        "imageOrder",
        JSON.stringify(formData.imageOrder)
      );
      formData.images.forEach((image, index) => {
        body.append(`image_${index}`, image);
      });

      const res = await fetch(
        `/api/user/submissions/${businessId}`,
        {
          method: "PATCH",
          body,
        }
      );

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setSaved(true);
      setSaveMessage(
        data.wasListed
          ? "Changes submitted for review"
          : "Changes saved"
      );
      setTimeout(() => {
        router.push("/my-submissions");
      }, 1500);

    } catch (err) {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Events (market / pop_up) expose the vendor-spaces editor between Details
  // and Photos.
  const isEvent =
    (formData as any).sub_type === "market" ||
    (formData as any).sub_type === "pop_up";

  const STEPS = [
    { num: 3, label: "Location" },
    { num: 4, label: "Info" },
    { num: 5, label: "Details" },
    ...(isEvent ? [{ num: 5.5, label: "Vendor Spaces" }] : []),
    { num: 6, label: "Photos & Contact" },
  ];

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center
        min-h-screen">
        <div className="w-6 h-6 border-2
          border-gray-200 border-t-black
          rounded-full animate-spin"/>
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="flex flex-col items-center
        justify-center min-h-screen px-4 text-center">
        <p className="text-red-500 text-sm mb-4">
          {error}
        </p>
        <button
          onClick={() => router.back()}
          className="text-black underline text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="px-4 py-4 border-b
        border-gray-100">
        <div className="max-w-lg mx-auto flex
          items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500"
          >
            <svg width="20" height="20"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold
              text-black">
              Edit Submission
            </h1>
            <p className="text-sm text-gray-400">
              {formData.name}
            </p>
          </div>
        </div>
      </div>

      {/* Pending notice */}
      <div className={`border-b px-4 py-3
        ${formData.status === "listed"
          ? "bg-blue-50 border-blue-200"
          : "bg-amber-50 border-amber-200"
        }`}>
        <p className={`text-xs text-center
          max-w-lg mx-auto
          ${formData.status === "listed"
            ? "text-blue-700"
            : "text-amber-700"
          }`}>
          {formData.status === "listed"
            ? "ℹ️ Editing a live listing will submit it for review again before going live."
            : "⚠ This submission is pending review. Changes will be saved and reviewed by our team."
          }
        </p>
      </div>

      {/* Step tabs */}
      <div className="border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex gap-6">
            {STEPS.map((s) => (
              <button
                key={s.num}
                onClick={() => setStep(s.num)}
                className={`py-3 text-sm font-medium
                  border-b-2 transition
                  ${step === s.num
                    ? "border-black text-black"
                    : "border-transparent text-gray-400"
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {step === 3 && (
          <Step3Location
            formData={formData}
            updateForm={updateForm}
            nextStep={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <Step4Info
            formData={formData}
            updateForm={updateForm}
            nextStep={() => setStep(5)}
            allowLogo={formData.claim_status === "claimed"}
          />
        )}
        {step === 5 && (
          <Step5Details
            formData={formData}
            updateForm={updateForm}
            nextStep={() => setStep(isEvent ? 5.5 : 6)}
          />
        )}
        {step === 5.5 && (
          <Step5bVendorSpace
            formData={formData}
            updateForm={updateForm}
            nextStep={() => setStep(6)}
          />
        )}
        {step === 6 && (
          <Step6Media
            formData={formData}
            updateForm={updateForm}
            nextStep={handleSave}
          />
        )}
      </div>

      {/* Save bar */}
      <div className="fixed bottom-16 left-0
        right-0 bg-white border-t border-gray-100
        px-4 py-3">
        <div className="max-w-lg mx-auto flex
          items-center gap-3">
          {error && (
            <p className="text-red-500 text-xs
              flex-1">
              {error}
            </p>
          )}
          {saved && (
            <p className="text-green-500 text-xs flex-1">
              ✓ {saveMessage} — redirecting...
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="ml-auto bg-black text-white
              px-6 py-2.5 rounded-xl text-sm
              font-medium hover:bg-gray-800
              transition disabled:opacity-50
              disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

    </div>
  );
}