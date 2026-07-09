"use client";

import { PencilLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { AddClientFormData, StepId } from "./types";

interface ReviewStepProps {
  data: AddClientFormData;
  onGoToStep: (step: StepId) => void;
}

interface ReviewSectionProps {
  title: string;
  stepId: StepId;
  onEdit: (step: StepId) => void;
  children: React.ReactNode;
}

function ReviewSection({
  title,
  stepId,
  onEdit,
  children,
}: ReviewSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(stepId)}
          className="h-7 gap-1.5 text-muted-foreground text-xs hover:text-foreground"
          aria-label={`Edit ${title}`}
        >
          <PencilLine className="size-3.5" />
          Edit
        </Button>
      </div>
      <div className="rounded-xl border border-input bg-muted/20 p-4">
        {children}
      </div>
    </div>
  );
}

interface ReviewRowProps {
  label: string;
  value?: string | string[] | null;
  empty?: string;
}

function ReviewRow({ label, value, empty = "—" }: ReviewRowProps) {
  const displayValue = Array.isArray(value)
    ? value.length > 0
      ? value
      : null
    : (value ?? null);

  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="min-w-35 font-medium text-muted-foreground text-xs">
        {label}
      </span>
      {displayValue === null ? (
        <span className="text-muted-foreground/60 text-xs">{empty}</span>
      ) : Array.isArray(displayValue) ? (
        <div className="flex flex-wrap gap-1.5">
          {displayValue.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs">
              {v}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-sm">{displayValue}</span>
      )}
    </div>
  );
}

export function ReviewStep({ data, onGoToStep }: ReviewStepProps) {
  const { basicInfo, businessDetails, projectRequirements } = data;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-muted-foreground text-sm">
          Please review all your information before submitting. You can go back
          to any step to make changes.
        </p>
      </div>

      {/* Basic Info */}
      <ReviewSection title="Basic Information" stepId={1} onEdit={onGoToStep}>
        <div className="flex flex-col gap-2.5">
          <ReviewRow label="Client Name" value={basicInfo.clientName} />
          <Separator />
          <ReviewRow label="Company Name" value={basicInfo.companyName} />
          <Separator />
          <ReviewRow label="Email" value={basicInfo.email} />
          <Separator />
          <ReviewRow
            label="Phone"
            value={basicInfo.phone}
            empty="Not provided"
          />
          <Separator />
          <ReviewRow
            label="Website"
            value={basicInfo.website}
            empty="Not provided"
          />
        </div>
      </ReviewSection>

      {/* Business Details */}
      <ReviewSection title="Business Details" stepId={2} onEdit={onGoToStep}>
        <div className="flex flex-col gap-2.5">
          <ReviewRow label="Industry" value={businessDetails.industry} />
          <Separator />
          <ReviewRow label="Company Size" value={businessDetails.companySize} />
          <Separator />
          <ReviewRow
            label="Services Needed"
            value={businessDetails.servicesNeeded}
          />
          <Separator />
          <ReviewRow
            label="Monthly Budget"
            value={businessDetails.monthlyBudget}
          />
        </div>
      </ReviewSection>

      {/* Project Requirements */}
      <ReviewSection
        title="Project Requirements"
        stepId={3}
        onEdit={onGoToStep}
      >
        <div className="flex flex-col gap-2.5">
          <ReviewRow
            label="Notes"
            value={projectRequirements.notes}
            empty="None"
          />
        </div>
      </ReviewSection>
    </div>
  );
}
