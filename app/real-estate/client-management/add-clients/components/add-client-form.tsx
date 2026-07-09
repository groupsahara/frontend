"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { clientApi } from "@/app/api/api";
import { toast } from "sonner";

import { ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { cn } from "@/lib/utils";

import { BasicInfoStep } from "./step-basic-info";

import { BusinessDetailsStep } from "./step-business-details";

import { StepIndicator } from "./step-indicator";

import { ProjectRequirementsStep } from "./step-project-requirements";

import { ReviewStep } from "./step-review";

import { SuccessScreen } from "./success-screen";

import type {
  AddClientFormData,
  BasicInfoData,
  BusinessDetailsData,
  ProjectRequirementsData,
  StepId,
} from "./types";

import { STEPS } from "./types";

const initialFormData: AddClientFormData = {
  basicInfo: {
    clientName: "",
    companyName: "",
    email: "",
    phone: "",
    website: "",
  },

  businessDetails: {
    industry: "",
    companySize: "",
    servicesNeeded: [],
    monthlyBudget: "",
  },

  projectRequirements: {
    notes: "",
  },
};

type StepErrors = {
  1: Partial<Record<keyof BasicInfoData, string>>;

  2: Partial<Record<keyof BusinessDetailsData, string>>;

  3: Partial<Record<keyof ProjectRequirementsData, string>>;

  4: Record<string, never>;
};

function validateStep(
  step: StepId,
  data: AddClientFormData,
): StepErrors[StepId] {
  if (step === 1) {
    const errors: Partial<Record<keyof BasicInfoData, string>> = {};

    const {
      clientName,
      companyName,
      email,
    } = data.basicInfo;

    if (!clientName.trim()) {
      errors.clientName = "Client name is required.";
    }

    if (!companyName.trim()) {
      errors.companyName = "Company name is required.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.email = "Please enter a valid email address.";
    }

    return errors;
  }

  if (step === 2) {
    const errors: Partial<
      Record<keyof BusinessDetailsData, string>
    > = {};

    const {
      industry,
      companySize,
      servicesNeeded,
      monthlyBudget,
    } = data.businessDetails;

    if (!industry) {
      errors.industry = "Please select an industry.";
    }

    if (!companySize) {
      errors.companySize = "Please select company size.";
    }

    if (servicesNeeded.length === 0) {
      errors.servicesNeeded =
        "Please select at least one service.";
    }

    if (!monthlyBudget) {
      errors.monthlyBudget =
        "Please select a budget range.";
    }

    return errors;
  }

  if (step === 3) {
    return {};
  }

  return {};
}

const STEP_META: Record<
  StepId,
  {
    title: string;
    description: string;
  }
> = {
  1: {
    title: "Basic Information",
    description:
      "Tell us who the client is and how to reach them.",
  },

  2: {
    title: "Business Details",
    description:
      "Help us understand the client's business and needs.",
  },

  3: {
    title: "Project Requirements",
    description:
      "Define the scope and goals of the engagement.",
  },

  4: {
    title: "Review & Submit",
    description:
      "Verify everything looks correct before submitting.",
  },
};

export function AddClientForm() {
  const [currentStep, setCurrentStep] =
    useState<StepId>(1);

  const [formData, setFormData] =
    useState<AddClientFormData>(initialFormData);

  const [errors, setErrors] =
    useState<StepErrors[StepId]>({});

  const mutation = useMutation({
    mutationFn: clientApi.createClient,
    onSuccess: (data) => {
      console.log("CLIENT CREATED:", data);

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "create_password_email",
          formData.basicInfo.email,
        );
      }

      setIsSuccess(true);
      toast.success("Client added successfully");
    },
    onError: (err) => {
      console.error("Submit error:", err);
      toast.error("Failed to create client");
    },
  });

  const [isSuccess, setIsSuccess] =
    useState(false);

  const updateBasicInfo = (
    field: keyof BasicInfoData,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,

      basicInfo: {
        ...prev.basicInfo,
        [field]: value,
      },
    }));
  };

  const updateBusinessDetails = <
    K extends keyof BusinessDetailsData,
  >(
    field: K,
    value: BusinessDetailsData[K],
  ) => {
    setFormData((prev) => ({
      ...prev,

      businessDetails: {
        ...prev.businessDetails,
        [field]: value,
      },
    }));
  };

  const updateProjectRequirements = (
    field: keyof ProjectRequirementsData,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,

      projectRequirements: {
        ...prev.projectRequirements,
        [field]: value,
      },
    }));
  };

  const handleNext = () => {
    const stepErrors = validateStep(
      currentStep,
      formData,
    );

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});

    setCurrentStep((prev) =>
      prev < 4 ? ((prev + 1) as StepId) : prev,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleBack = () => {
    setErrors({});

    setCurrentStep((prev) =>
      prev > 1 ? ((prev - 1) as StepId) : prev,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleGoToStep = (step: StepId) => {
    setErrors({});

    setCurrentStep(step);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // REAL API SUBMIT
  // =========================

  const addUser = () => {
    const payload = {
      name: formData.basicInfo.companyName || formData.basicInfo.clientName,
      clientName: formData.basicInfo.clientName,
      companyName: formData.basicInfo.companyName,
      email: formData.basicInfo.email,
      phone: formData.basicInfo.phone,
      website: formData.basicInfo.website,
      industry: formData.businessDetails.industry,
      companySize: formData.businessDetails.companySize,
      servicesNeeded: formData.businessDetails.servicesNeeded,
      monthlyBudget: formData.businessDetails.monthlyBudget,
      notes: formData.projectRequirements.notes,
    };

    console.log("SENDING CLIENT:", payload);
    mutation.mutate(payload);
  };

  const handleReset = () => {
    setFormData(initialFormData);

    setCurrentStep(1);

    setErrors({});

    setIsSuccess(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            data={formData.basicInfo}
            errors={
              errors as Partial<
                Record<keyof BasicInfoData, string>
              >
            }
            onChange={updateBasicInfo}
          />
        );

      case 2:
        return (
          <BusinessDetailsStep
            data={formData.businessDetails}
            errors={
              errors as Partial<
                Record<
                  keyof BusinessDetailsData,
                  string
                >
              >
            }
            onChange={updateBusinessDetails}
          />
        );

      case 3:
        return (
          <ProjectRequirementsStep
            data={formData.projectRequirements}
            errors={
              errors as Partial<
                Record<
                  keyof ProjectRequirementsData,
                  string
                >
              >
            }
            onChange={updateProjectRequirements}
          />
        );

      case 4:
        return (
          <ReviewStep
            data={formData}
            onGoToStep={handleGoToStep}
          />
        );
    }
  };

  const isLastStep = currentStep === 4;

  const isFirstStep = currentStep === 1;

  const meta = STEP_META[currentStep];

  return (
    <div className="flex flex-col gap-6">
      {isSuccess ? (
        <Card>
          <CardContent className="py-6">
            <SuccessScreen
              clientName={
                formData.basicInfo.clientName
              }
              companyName={
                formData.basicInfo.companyName
              }
              onAddAnother={handleReset}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-visible">
            <CardContent className="px-6 pt-4 pb-8 sm:pb-10">
              <StepIndicator
                currentStep={currentStep}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted font-semibold text-muted-foreground text-sm">
                  {currentStep}
                </div>

                <div>
                  <CardTitle className="text-base">
                    {meta.title}
                  </CardTitle>

                  <CardDescription className="mt-0.5 text-xs">
                    {meta.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent
              className={cn(
                "pt-5 pb-2 transition-all duration-200",
              )}
              key={currentStep}
            >
              {renderStepContent()}
            </CardContent>

            <CardFooter className="flex items-center justify-between gap-4 border-t pt-4">
              <Button
                id="add-client-back-btn"
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={
                  isFirstStep || mutation.isPending
                }
                className="gap-2"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              <span className="hidden text-muted-foreground text-xs sm:block">
                Step {currentStep} of{" "}
                {STEPS.length}
              </span>

              {isLastStep ? (
                <Button
                  id="add-client-submit-btn"
                  type="button"
                  onClick={addUser}
                  disabled={mutation.isPending}
                  className="gap-2"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Submit Client
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  id="add-client-next-btn"
                  type="button"
                  onClick={handleNext}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}