"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BusinessFormData,
  INITIAL_FORM_DATA,
} from "@/lib/types/business";
import Step1Type from "@/components/forms/add-business/Step1Type";
import Step2SubType from "@/components/forms/add-business/Step2SubType";
import Step3Location from "@/components/forms/add-business/Step3Location";
import ConfirmationScreen from "@/components/forms/add-business/ConfirmationScreen";
import Step4Info from "@/components/forms/add-business/Step4Info";
import Step5Details from "@/components/forms/add-business/Step5Details";
import Step6Media from "@/components/forms/add-business/Step6Media";
import Step7Review from "@/components/forms/add-business/Step7Review";

export default function AddBusinessPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<BusinessFormData>(
    INITIAL_FORM_DATA
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [currentBrandId, setCurrentBrandId] = useState<string | null>(null);

  const getTotalSteps = () => {
    if (formData.type === "event") {
      if (formData.subType === "pop_up") return 6;
      return 7;
    }
    if (formData.subType === "no_location") return 6;
    return 7;
  };

  const totalSteps = getTotalSteps();

  const getStepTitle = () => {
    switch (step) {
      case 1: return "What are you adding?";
      case 2:
        if (formData.type === "small_business")
          return "Tell us about your business";
        return "Tell us about your event";
      case 3: return "Where are you located?";
      case 4: return "Business details";
      case 5: return "Hours & amenities";
      case 6: return "Photos & contact";
      case 7: return "Review & submit";
      default: return "Add a Business";
    }
  };

  const getStepSubtitle = () => {
    return `Step ${step} of ${totalSteps}`;
  };

  const updateForm = (data: Partial<BusinessFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = (selectedSubType?: string) => {
  const subType = selectedSubType || formData.subType;

  // Skip location step for no_location businesses
  if (step === 2 && subType === "no_location") {
    setStep(4);
    return;
  }
  setStep(prev => prev + 1);
};

  const prevStep = () => {
    // Skip back over location step for no_location
    if (step === 4 && formData.subType === "no_location") {
      setStep(2);
      return;
    }
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setSubmittedName(formData.name);
    setShowConfirmation(true);
  };

  const handleAnotherLocation = () => {
    setFormData({
      ...INITIAL_FORM_DATA,
      name:             formData.name,
      category:         formData.category,
      description:      formData.description,
      logoUrl:          formData.logoUrl,
      website:          formData.website,
      instagram:        formData.instagram,
      facebook:         formData.facebook,
      tiktok:           formData.tiktok,
      twitter:          formData.twitter,
      youtube:          formData.youtube,
      phone:            formData.phone,
      email:            formData.email,
      priceTier:        formData.priceTier,
      priceContext:     formData.priceContext,
      isChainLocation:  true,
      brandId:          currentBrandId,
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
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <svg
                width="20" height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-black">
              {getStepTitle()}
            </h1>
            <p className="text-sm text-gray-400">
              {getStepSubtitle()}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-1 bg-black transition-all duration-300"
          style={{
            width: `${(step / totalSteps) * 100}%`
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