"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { STEPS, type StepId } from "./types";

interface StepIndicatorProps {
  currentStep: StepId;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav className="w-full" role="progressbar" aria-label="Form progress">
      {/* Desktop: full label step indicator */}
      <div className="hidden w-full items-center sm:flex">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isLast = index === STEPS.length - 1;

          return (
            <div
              key={step.id}
              className="relative flex flex-1 items-center last:flex-none"
            >
              {/* Step circle + label */}
              <div className="relative z-10 ">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-semibold text-xs transition-all duration-300",
                    isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                    "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                    !isCompleted &&
                    !isCurrent &&
                    "border-border bg-background text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "absolute top-10 whitespace-nowrap font-medium text-xs transition-colors",
                    isLast ? "right-0 sm:translate-x-1/4 lg:translate-x-0" : "left-1/2 -translate-x-1/2",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="absolute top-1/2 left-8 right-0 z-0 -translate-y-1/2 px-2">
                  <div className="relative h-0.5 overflow-hidden rounded-full bg-border">
                    <div
                      className={cn(
                        "absolute inset-0 rounded-full bg-primary transition-all duration-500",
                        isCompleted ? "translate-x-0" : "-translate-x-full",
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact dot indicator */}
      <div className="flex items-center justify-center gap-2 sm:hidden">
        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <div
              key={step.id}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                isCompleted && "w-4 bg-primary",
                isCurrent && "w-6 bg-primary",
                !isCompleted && !isCurrent && "w-1.5 bg-border",
              )}
            />
          );
        })}
      </div>

      {/* Mobile: current step label */}
      <div className="mt-3 text-center sm:hidden">
        <span className="font-medium text-muted-foreground text-xs">
          Step {currentStep} of {STEPS.length}
        </span>
        <span className="mx-2 text-border text-xs">·</span>
        <span className="font-semibold text-foreground text-xs">
          {STEPS.find((s) => s.id === currentStep)?.label}
        </span>
      </div>
    </nav>
  );
}
