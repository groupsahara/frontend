"use client";

import { Briefcase, DollarSign, Users } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  type BusinessDetailsData,
  COMPANY_SIZE_OPTIONS,
  INDUSTRY_OPTIONS,
  SERVICES_OPTIONS,
} from "./types";

interface BusinessDetailsStepProps {
  data: BusinessDetailsData;
  errors: Partial<Record<keyof BusinessDetailsData, string>>;
  onChange: <K extends keyof BusinessDetailsData>(
    field: K,
    value: BusinessDetailsData[K],
  ) => void;
}

interface SelectFieldProps {
  id: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
}

function SelectField({
  id,
  label,
  required,
  placeholder,
  icon,
  error,
  value,
  onValueChange,
  options,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className={cn(
          "flex items-center gap-1.5 font-medium text-sm",
          error && "text-destructive",
        )}
      >
        {icon}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Select value={value} onValueChange={(val) => val && onValueChange(val)}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <SelectValue placeholder={placeholder ?? `Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p id={`${id}-error`} className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function BusinessDetailsStep({
  data,
  errors,
  onChange,
}: BusinessDetailsStepProps) {
  const toggleService = (service: string) => {
    const current = data.servicesNeeded;
    const updated = current.includes(service)
      ? current.filter((s) => s !== service)
      : [...current, service];
    onChange("servicesNeeded", updated);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SelectField
          id="industry"
          label="Industry"
          required
          icon={<Briefcase className="size-4 text-muted-foreground" />}
          value={data.industry}
          onValueChange={(v) => onChange("industry", v)}
          options={INDUSTRY_OPTIONS}
          error={errors.industry}
        />

        <SelectField
          id="companySize"
          label="Company Size"
          required
          icon={<Users className="size-4 text-muted-foreground" />}
          value={data.companySize}
          onValueChange={(v) => onChange("companySize", v)}
          options={COMPANY_SIZE_OPTIONS}
          error={errors.companySize}
        />
      </div>

      {/* Services Needed */}
      <div className="flex flex-col gap-2">
        <Label
          className={cn(
            "flex items-center gap-1.5 font-medium text-sm",
            errors.servicesNeeded && "text-destructive",
          )}
        >
          Services Needed
          <span className="text-destructive">*</span>
        </Label>
        <div className="rounded-lg border border-input bg-transparent p-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SERVICES_OPTIONS.map((service) => (
              <label
                key={service}
                htmlFor={`service-${service}`}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <Checkbox
                  id={`service-${service}`}
                  checked={data.servicesNeeded.includes(service)}
                  onCheckedChange={() => toggleService(service)}
                />
                <span className="text-sm">{service}</span>
              </label>
            ))}
          </div>
        </div>
        {errors.servicesNeeded && (
          <p className="text-destructive text-xs" role="alert">
            {errors.servicesNeeded}
          </p>
        )}
      </div>

      {/* Monthly Budget */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="monthlyBudget"
          className={cn(
            "flex items-center gap-1.5 font-medium text-sm",
            errors.monthlyBudget && "text-destructive",
          )}
        >
          <DollarSign className="size-4 text-muted-foreground" />
          Monthly Budget
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="monthlyBudget"
          placeholder="e.g. $5000"
          value={data.monthlyBudget}
          onChange={(e) => onChange("monthlyBudget", e.target.value)}
          aria-invalid={!!errors.monthlyBudget}
        />
        {errors.monthlyBudget && (
          <p className="text-destructive text-xs" role="alert">
            {errors.monthlyBudget}
          </p>
        )}
      </div>
    </div>
  );
}
