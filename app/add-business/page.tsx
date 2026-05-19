"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BusinessFormData,
  INITIAL_FORM_DATA,
} from "@/lib/types/business";
import Step1Type from
  "@/components/forms/add-business/Step1Type";
import Step2SubType from
  "@/components/forms/add-business/Step2SubType";
import Step2bSubType from
  "@/components/forms/add-business/Step2bSubType";
import Step3Location from
  "@/components/forms/add-business/Step3Location";
import Step4Info from
  "@/components/forms/add-business/Step4Info";
import Step5Details from
  "@/components/forms/add-business/Step5Details";
import Step6Media from
  "@/components/forms/add-business/Step6Media";
import Step7Review from
  "@/components/forms/add-business/Step7Review";
import ConfirmationScreen from
  "@/components/forms/add-business/ConfirmationScreen";

export default function AddBusinessPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] =
    useState<BusinessFormData>(INITIAL_FORM_DATA);
  const [showConfirmation, setShowConfirmation] =
    useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [currentBrandId, setCurrentBrandId] =
    useState<string | null>(null);

  // Total steps depends on path taken
  const getTotalSteps = () => {
    if (formData.type === "event") {
      return formData.subType === "pop_up" ? 6 : 7;
    }
    // Small business always has step 2b
    if (formData.subType === "no_location") return 7;
    return 8; // permanent_location has location step
  };

  const totalSteps = getTotalSteps();

  const getStepTitle = () => {
    switch (step) {
      case 1:  return "What are you adding?";
      case 2:
        return formData.type === "small_business"
          ? "Tell us about your business"
          : "Tell us about your event";
      case 2.5: return "What type of business?";
      case 3:  return "Where are you located?";
      case 4:  return "Business details";
      case 5:  return "Hours & amenities";
      case 6:  return "Photos & contact";
      case 7:  return "Review & submit";
      default: return "Add a Business";
    }
  };

  // Use a step index for display purposes
  const getDisplayStep = () => {
    if (step <= 2)   return step;
    if (step === 2.5) return 3;
    return step + 1;
  };

  const updateForm = (data: Partial<BusinessFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = (selectedSubType?: string) => {
    const subType = selectedSubType || formData.subType;

    // After step 2 for small business → go to step 2.5
    if (step === 2 &&
        formData.type === "small_business") {
      setStep(2.5);
      return;
    }

    // After step 2.5 → skip location for no_location
    if (step === 2.5 && subType === "no_location") {
      setStep(4);
      return;
    }

    // After step 2 for events → go to step 3
    if (step === 2 && formData.type === "event") {
      setStep(3);
      return;
    }

    // Normal progression
    if (step === 2.5) {
      setStep(3);
      return;
    }

    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    // From step 3 for no_location → back to step 2.5
    if (step === 4 &&
        formData.type === "small_business" &&
        formData.subType === "no_location") {
      setStep(2.5);
      return;
    }

    // From step 3 → back to step 2.5 for small business
    if (step === 3 &&
        formData.type === "small_business") {
      setStep(2.5);
      return;
    }

    // From step 2.5 → back to step 2
    if (step === 2.5) {
      setStep(2);
      return;
    }

    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      const formDataToSend = new FormData();

      formDataToSend.append(
        "data",
        JSON.stringify({
          ...formData,
          images: [],
        })
      );

      if (
        formData.logoUrl &&
        formData.logoUrl.startsWith("data:")
      ) {
        const logoBlob = await fetch(formData.logoUrl)
          .then(r => r.blob());
        formDataToSend.append(
          "logo", logoBlob, "logo.jpg"
        );
      }

      formData.images.forEach((image, index) => {
        formDataToSend.append(`image_${index}`, image);
      });

      const res = await fetch("/api/businesses/submit", {
        method: "POST",
        body: formDataToSend,
      });

      if (res.status === 413) {
        throw new Error(
          "Your photos are too large to upload. " +
          "Please reduce the number of photos or " +
          "use smaller images (under 4 MB total) " +
          "and try again."
        );
      }

      if (!res.ok && res.status !== 500) {
        throw new Error(
          `Submission failed (${res.status}). Please try again.`
        );
      }

      let result: any;
      try {
        result = await res.json();
      } catch {
        throw new Error(
          "Unexpected server response. Please try again."
        );
      }

      if (!result.success) {
        throw new Error(
          result.error || "Submission failed"
        );
      }

      setSubmittedName(formData.name);
      setCurrentBrandId(result.businessId);
      setShowConfirmation(true);

    } catch (error) {
      console.error("Submission error:", error);
      throw error;
    }
  };

  const handleAnotherLocation = () => {
    setFormData({
      ...INITIAL_FORM_DATA,
      name:            formData.name,
      category:        formData.category,
      description:     formData.description,
      logoUrl:         formData.logoUrl,
      website:         formData.website,
      instagram:       formData.instagram,
      facebook:        formData.facebook,
      tiktok:          formData.tiktok,
      twitter:         formData.twitter,
      youtube:         formData.youtube,
      phone:           formData.phone,
      email:           formData.email,
      priceTier:       formData.priceTier,
      priceContext:    formData.priceContext,
      isChainLocation: true,
      brandId:         currentBrandId,
    });
    setStep(3);
    setShowConfirmation(false);
  };

  const handleDifferentBusiness = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentBrandId(null);
    setStep(1);
    setShowConfirmation(false);
  };

  const handleDone = () => {
    router.push("/");
  };

  if (showConfirmation) {
    return (
      <ConfirmationScreen
        businessName={submittedName}
        onAnotherLocation={handleAnotherLocation}
        onDifferentBusiness={handleDifferentBusiness}
        onDone={handleDone}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="px-4 py-4 border-b
        border-gray-100">
        <div className="max-w-lg mx-auto flex
          items-center gap-4">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="p-1 text-gray-500
                hover:text-gray-700"
            >
              <svg width="20" height="20"
                viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-semibold
              text-black">
              {getStepTitle()}
            </h1>
            <p className="text-sm text-gray-400">
              Step {getDisplayStep()} of {totalSteps}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-1 bg-black transition-all
            duration-300"
          style={{
            width: `${(getDisplayStep() / totalSteps) * 100}%`
          }}
        />
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {step === 1 && (
          <Step1Type
            formData={formData}
            updateForm={updateForm}
            nextStep={nextStep}
          />
        )}
        {step === 2 && (
          <Step2SubType
            formData={formData}
            updateForm={updateForm}
            nextStep={nextStep}
          />
        )}
        {step === 2.5 && (
          <Step2bSubType
            formData={formData}
            updateForm={updateForm}
            nextStep={nextStep}
          />
        )}
        {step === 3 && (
          <Step3Location
            formData={formData}
            updateForm={updateForm}
            nextStep={nextStep}
          />
        )}
        {step === 4 && (
          <Step4Info
            formData={formData}
            updateForm={updateForm}
            nextStep={nextStep}
          />
        )}
        {step === 5 && (
          <Step5Details
            formData={formData}
            updateForm={updateForm}
            nextStep={nextStep}
          />
        )}
        {step === 6 && (
          <Step6Media
            formData={formData}
            updateForm={updateForm}
            nextStep={nextStep}
          />
        )}
        {step === 7 && (
          <Step7Review
            formData={formData}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}