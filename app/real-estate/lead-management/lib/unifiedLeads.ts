import type { Lead, LeadStatus } from "../types";
import { LEAD_STATUS_OPTIONS, type ManualLead } from "@/app/api/manualLeadsApi";

export type LeadSource = "form" | "whatsapp" | "call" | "reference" | "walk_in";

export interface UnifiedLead {
  id: string;
  source: LeadSource;
  name: string;
  phone: string;
  project: string;
  budget: string;
  statusLabel: string;
  createdAt: string;
  aiMode: boolean | null;
  raw: Lead | ManualLead;
}

export const SOURCE_CONFIG: Record<
  LeadSource,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  form: {
    label: "Form",
    dot: "bg-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
  },
  whatsapp: {
    label: "WhatsApp",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  call: {
    label: "Calls",
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  reference: {
    label: "Reference",
    dot: "bg-purple-500",
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
  },
  walk_in: {
    label: "Walk-in",
    dot: "bg-teal-500",
    bg: "bg-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-500/20",
  },
};

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  follow_up: "Follow Up",
  interested: "Interested",
  meeting_scheduled: "Meeting",
  closed: "Closed",
  lost: "Lost",
};

export function fromLead(lead: Lead, source: LeadSource): UnifiedLead {
  return {
    id: `${source}-${lead.id}`,
    source,
    name: lead.name,
    phone: lead.phone,
    project: lead.project,
    budget: lead.budget,
    statusLabel: LEAD_STATUS_LABELS[lead.status] ?? lead.status,
    createdAt: lead.createdAt,
    aiMode: lead.aiMode ?? true,
    raw: lead,
  };
}

export function fromManualLead(lead: ManualLead): UnifiedLead {
  const source: LeadSource = lead.referenceType === "walk_in" ? "walk_in" : "reference";
  return {
    id: `${source}-${lead.id}`,
    source,
    name: lead.customerName,
    phone: lead.phoneNumber,
    project: lead.projectName,
    budget: lead.budget ?? "—",
    statusLabel: LEAD_STATUS_OPTIONS.find((o) => o.value === lead.status)?.label ?? lead.status,
    createdAt: lead.createdAt,
    aiMode: lead.aiMode ?? true,
    raw: lead,
  };
}
