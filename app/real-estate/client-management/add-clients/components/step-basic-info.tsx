"use client";

import { Building2, Globe, Mail, Phone, User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { BasicInfoData } from "./types";

interface BasicInfoStepProps {
  data: BasicInfoData;
  errors: Partial<Record<keyof BasicInfoData, string>>;
  onChange: (field: keyof BasicInfoData, value: string) => void;
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}

function FormField({ id, label, required, icon, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className={cn(
          "flex items-center gap-1.5 font-medium text-sm",
          error && "text-destructive",
        )}
      >
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <div className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground">
          {icon}
        </div>
        <div className="[&>input]:pl-8">{children}</div>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

export function BasicInfoStep({ data, errors, onChange }: BasicInfoStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          id="clientName"
          label="Client Name"
          required
          icon={<User className="size-4" />}
          error={errors.clientName}
        >
          <Input
            id="clientName"
            placeholder="e.g. John Smith"
            value={data.clientName}
            onChange={(e) => onChange("clientName", e.target.value)}
            aria-invalid={!!errors.clientName}
            aria-describedby={
              errors.clientName ? "clientName-error" : undefined
            }
          />
        </FormField>

        <FormField
          id="companyName"
          label="Company Name"
          required
          icon={<Building2 className="size-4" />}
          error={errors.companyName}
        >
          <Input
            id="companyName"
            placeholder="e.g. Acme Corp"
            value={data.companyName}
            onChange={(e) => onChange("companyName", e.target.value)}
            aria-invalid={!!errors.companyName}
          />
        </FormField>
      </div>

      <FormField
        id="email"
        label="Email Address"
        required
        icon={<Mail className="size-4" />}
        error={errors.email}
      >
        <Input
          id="email"
          type="email"
          placeholder="e.g. john@acmecorp.com"
          value={data.email}
          onChange={(e) => onChange("email", e.target.value)}
          aria-invalid={!!errors.email}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          id="phone"
          label="Phone Number"
          icon={<Phone className="size-4" />}
          error={errors.phone}
        >
          <Input
            id="phone"
            type="tel"
            placeholder="e.g. +1 (555) 000-0000"
            value={data.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            aria-invalid={!!errors.phone}
          />
        </FormField>

        <FormField
          id="website"
          label="Website URL"
          icon={<Globe className="size-4" />}
          error={errors.website}
        >
          <Input
            id="website"
            type="url"
            placeholder="e.g. https://acmecorp.com"
            value={data.website}
            onChange={(e) => onChange("website", e.target.value)}
            aria-invalid={!!errors.website}
          />
        </FormField>
      </div>
    </div>
  );
}
