"use client";

import { StickyNote } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { ProjectRequirementsData } from "./types";

interface ProjectRequirementsStepProps {
  data: ProjectRequirementsData;
  errors: Partial<Record<keyof ProjectRequirementsData, string>>;
  onChange: (field: keyof ProjectRequirementsData, value: string) => void;
}

export function ProjectRequirementsStep({
  data,
  onChange,
}: ProjectRequirementsStepProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="notes"
          className="flex items-center gap-1.5 font-medium text-sm"
        >
          <StickyNote className="size-4 text-muted-foreground" />
          Additional Notes / Description
        </Label>
        <Textarea
          id="notes"
          placeholder="Any additional context, requirements, or information that would be helpful..."
          value={data.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          className="min-h-24 resize-none"
        />
      </div>
    </div>
  );
}
