"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BusinessFormData,
  INITIAL_FORM_DATA,
} from "@/lib/types/business";
import { addPendingSubmission } from "@/lib/utils/pendingSubmissions";
import {
  BusinessDraft,
  saveDraft,
  loadDraft,
  clearDraft,
  isDraftMeaningful,
} from "@/lib/utils/businessDraft";
import Step0Ownership from
  "@/components/forms/add-business/Step0Ownership";
import Step1Type from
  "@/components/forms/add-business/Step1Type";
import Step2bSubType from
  "@/components/forms/add-business/Step2bSubType";
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
import Step7Review from
  "@/components/forms/add-business/Step7Review";
import ConfirmationScreen from
  "@/components/forms/add-business/ConfirmationScreen";

export default function AddBusinessPage() {
  const router = useRouter();
  // Step 0 is the ownership screen (this is my business / someone else's). It
  // sits before the numbered flow, so it's excluded from "Step X of N".
  const [step, setStep] = useState(0);
  const [formData, setFormData] =
    useState<BusinessFormData>(INITIAL_FORM_DATA);
  const [showConfirmation, setShowConfirmation] =
    useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [currentBrandId, setCurrentBrandId] =
    useState<string | null>(null);
  // Events insert a "Vendor spaces" screen between Details (step 5) and Photos
  // (step 6) without renumbering the later steps: while this is true and
  // step === 5, the vendor screen renders in place of Step5Details.
  const [vendorSubStep, setVendorSubStep] = useState(false);

  // Autosaved draft found on mount — offered via a resume banner rather than
  // applied silently, so a user starting a genuinely new submission isn't
  // dropped into a half-filled form they didn't ask for. Read lazily on the
  // first render (not in an effect) so the banner is there immediately and the
  // autosave effect below never runs before the stored draft has been read.
  // localStorage is unavailable during SSR; loadDraft returns null there and
  // the state initializer re-runs on the client during hydration.
  const [pendingDraft, setPendingDraft] =
    useState<BusinessDraft | null>(() => {
      const draft = loadDraft();
      if (!draft) return null;
      if (isDraftMeaningful(draft)) return draft;
      // Nothing worth resuming — drop it so it can't resurface later.
      clearDraft();
      return null;
    });
  // Set once the flow submits successfully: from then on the draft is gone and
  // must not be rewritten by the autosave effect.
  const submittedRef = useRef(false);

  const isEvent = formData.type === "event";

  // Autosave on every change. localStorage writes are synchronous and this
  // payload is small (photos and the logo data URL are excluded), so there's
  // no need to debounce.
  useEffect(() => {
    if (submittedRef.current) return;
    // Don't overwrite a draft the user hasn't answered the banner for yet —
    // the form is still showing empty initial state behind it.
    if (pendingDraft) return;
    saveDraft(step, vendorSubStep, formData);
  }, [step, vendorSubStep, formData, pendingDraft]);

  const resumeDraft = () => {
    if (!pendingDraft) return;
    setFormData(pendingDraft.formData);
    setStep(pendingDraft.step);
    setVendorSubStep(pendingDraft.vendorSubStep);
    setPendingDraft(null);
  };

  const discardDraft = () => {
    clearDraft();
    setPendingDraft(null);
  };

  // Events skip the Step-2 type screen (the kind is derived from the date mode
  // in Step 5), so the internal step sequence is 1 → 3 → 4 → 5(+vendor) → 6 → 7.
  // Both event paths therefore show 7 steps: Type, Location, Info, Event
  // details, Vendor spaces, Photos, Review. Small business stays 7.
  const getTotalSteps = () => 7;

  const totalSteps = getTotalSteps();

  const getStepTitle = () => {
    // Vendor spaces is a sub-screen of step 5 for events.
    if (step === 5 && vendorSubStep) return "Vendor spaces";
    switch (step) {
      case 0:  return "Who's this for?";
      case 1:  return "What are you adding?";
      case 2:  return "What type of business?";
      case 3:
        return isEvent
          ? "Where is the event located?"
          : "Where is the business located?";
      case 4:  return "Business details";
      case 5:  return isEvent ? "Event details" : "Hours & amenities";
      case 6:  return "Photos & contact";
      case 7:  return "Review & submit";
      default: return "Add a Business";
    }
  };

  // Events skip internal step 2, so display numbers compact it out, and the
  // vendor screen sits at display 5 (pushing Photos/Review to 6/7).
  //   internal 1→1, 3→2, 4→3, 5→4, vendor→5, 6→6, 7→7
  const getDisplayStep = () => {
    if (!isEvent) return step;
    if (step === 1) return 1;
    if (step === 5) return vendorSubStep ? 5 : 4;
    if (step >= 6) return step;     // 6→6, 7→7
    return step - 1;                // 3→2, 4→3
  };

  const updateForm = (data: Partial<BusinessFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // Linear progression. Step 2 renders the type screen (Step2bSubType for
  // small business, Step2SubType for events); both continue to the location
  // step, which for small business is where directory-only is chosen.
  // (Children still pass a subType arg; it is no longer needed for routing.)
  const nextStep = () => {
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    // Back out of the vendor sub-screen to Details without changing step.
    if (step === 5 && vendorSubStep) {
      setVendorSubStep(false);
      return;
    }
    // Returning from Photos (step 6) to an event's vendor screen.
    if (isEvent && step === 6) {
      setStep(5);
      setVendorSubStep(true);
      return;
    }
    // Events skip the type screen, so Location (3) goes back to Type (1).
    if (isEvent && step === 3) {
      setStep(1);
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

      // Send photos in gallery order so the submit API's first image (index 0)
      // is the cover the user chose. `imageOrder` holds "new:<i>" tokens here
      // (no existing photos in the add flow); fall back to array order.
      const orderedImages =
        formData.imageOrder.length > 0
          ? formData.imageOrder
              .map(t => formData.images[Number(t.replace("new:", ""))])
              .filter((f): f is File => Boolean(f))
          : formData.images;

      orderedImages.forEach((image, index) => {
        formDataToSend.append(`image_${index}`, image);
      });

      const res = await fetch("/api/businesses/submit", {
        method: "POST",
        body: formDataToSend,
      });

      if (res.status === 413) {
        throw new Error(
          "Upload is too large. Please remove some photos and try again."
        );
      }

      // Rate limit — surface the server's friendly message ("Too many
      // submissions. Try again tomorrow.") instead of a raw status code.
      if (res.status === 429) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(
          error ||
            "You've reached today's submission limit. Please try again tomorrow."
        );
      }

      if (!res.ok && res.status !== 500) {
        throw new Error(
          `Submission failed (${res.status}). Please try again.`
        );
      }

      let result: {
        success?: boolean;
        error?: string;
        business?: unknown;
        businessId?: string;
        brandId?: string | null;
      };
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

      // Stash the id so an anonymous submission can be adopted onto the user's
      // account if they sign up / sign in later (drained by SubmissionAdopter).
      // No-op for signed-in submitters: the row is already owned server-side,
      // and the adopt endpoint only claims rows where submitted_by IS NULL.
      if (result.businessId) {
        addPendingSubmission(result.businessId);
      }

      // The submission landed, so the draft has served its purpose. Cleared
      // before the confirmation screen renders so a resumed-draft banner can't
      // reappear if the user starts another submission from here.
      submittedRef.current = true;
      clearDraft();

      setSubmittedName(formData.name);
      // Track the real brand id (minted server-side for chain locations) so
      // "add another location" links the next location to the same brand.
      // The server returns null for non-chain single businesses.
      setCurrentBrandId(result.brandId ?? null);
      setShowConfirmation(true);

    } catch (error) {
      console.error("Submission error:", error);
      throw error;
    }
  };

  const handleAnotherLocation = () => {
    setFormData({
      ...INITIAL_FORM_DATA,
      // A new location of the same chain keeps its type/category so it
      // submits with the same DB type and marker; only the location resets.
      type:            formData.type,
      detailedSubType: formData.detailedSubType,
      // Same chain → same owner, so carry the ownership choice (and logo).
      submittedAsOwner: formData.submittedAsOwner,
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
    // A new submission begins here, so autosave resumes for it.
    submittedRef.current = false;
    setStep(3);
    setShowConfirmation(false);
  };

  const handleDifferentBusiness = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentBrandId(null);
    // A new submission begins here, so autosave resumes for it.
    submittedRef.current = false;
    // Back to the ownership pre-step — a different business may have a
    // different owner.
    setStep(0);
    setShowConfirmation(false);
  };

  const handleDone = () => {
    // The re-seeded "add another" form is abandoned by leaving — don't keep it
    // around to offer as a draft on the next visit.
    clearDraft();
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

  const goToStep = (target: number) => {
    // 5.5 is the sentinel for the event-only vendor-spaces sub-screen.
    if (target === 5.5) {
      setStep(5);
      setVendorSubStep(true);
      return;
    }
    setVendorSubStep(false);
    setStep(target);
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="px-4 py-4 border-b
        border-gray-100">
        <div className="max-w-lg mx-auto flex
          items-center gap-4">
          {step > 0 && (
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
            {/* Ownership (step 0) sits before the numbered flow. */}
            {step > 0 && (
              <p className="text-sm text-gray-400">
                Step {getDisplayStep()} of {totalSteps}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar — hidden on the ownership pre-step */}
      {step > 0 && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-black transition-all
              duration-300"
            style={{
              width: `${(getDisplayStep() / totalSteps) * 100}%`
            }}
          />
        </div>
      )}

      {/* Resume banner — shown when an autosaved draft was found on mount */}
      {pendingDraft && (
        <div className="max-w-lg mx-auto px-4 pt-6">
          <div
            className="rounded-2xl p-4"
            style={{
              background: "#FFF4EC",
              border: "2px solid var(--primary)",
            }}
          >
            <p className="font-semibold text-black mb-1">
              Pick up where you left off?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              We saved your progress
              {pendingDraft.formData.name
                ? ` on "${pendingDraft.formData.name}"`
                : ""}
              . Photos and your logo aren&apos;t saved, so you&apos;ll
              need to add those again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={resumeDraft}
                className="flex-1 rounded-xl py-2.5 text-sm
                  font-semibold text-white transition
                  active:scale-95"
                style={{ background: "var(--primary)" }}
              >
                Continue
              </button>
              <button
                onClick={discardDraft}
                className="flex-1 rounded-xl py-2.5 text-sm
                  font-semibold text-gray-600 bg-white
                  border border-gray-200 transition
                  active:scale-95"
              >
                Start over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {step === 0 && (
          <Step0Ownership
            formData={formData}
            updateForm={updateForm}
            nextStep={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <Step1Type
            formData={formData}
            updateForm={updateForm}
            // Events skip the type screen and go straight to Location.
            nextStep={(type) =>
              setStep(type === "event" ? 3 : 2)
            }
          />
        )}
        {step === 2 && (
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
            // Owners can add a logo; community submitters of someone
            // else's business cannot.
            allowLogo={formData.submittedAsOwner}
          />
        )}
        {step === 5 && !vendorSubStep && (
          <Step5Details
            formData={formData}
            updateForm={updateForm}
            nextStep={
              // Events branch into the vendor screen before Photos.
              isEvent
                ? () => setVendorSubStep(true)
                : nextStep
            }
          />
        )}
        {step === 5 && vendorSubStep && (
          <Step5bVendorSpace
            formData={formData}
            updateForm={updateForm}
            nextStep={() => {
              setVendorSubStep(false);
              setStep(6);
            }}
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
            onEditStep={goToStep}
          />
        )}
      </div>
    </div>
  );
}