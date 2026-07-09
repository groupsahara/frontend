export interface BasicInfoData {
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  website: string;
}

export interface BusinessDetailsData {
  industry: string;
  companySize: string;
  servicesNeeded: string[];
  monthlyBudget: string;
}

export interface ProjectRequirementsData {
  notes: string;
}

export interface AddClientFormData {
  basicInfo: BasicInfoData;
  businessDetails: BusinessDetailsData;
  projectRequirements: ProjectRequirementsData;
}

export const STEPS = [
  { id: 1, label: "Basic Info", shortLabel: "Basic" },
  { id: 2, label: "Business Details", shortLabel: "Business" },
  { id: 3, label: "Project Requirements", shortLabel: "Project" },
  { id: 4, label: "Review & Submit", shortLabel: "Review" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance & Banking",
  "E-commerce & Retail",
  "Education",
  "Real Estate",
  "Manufacturing",
  "Media & Entertainment",
  "Hospitality & Travel",
  "Non-profit",
  "Government",
  "Other",
];

export const COMPANY_SIZE_OPTIONS = [
  "1-10 (Startup)",
  "11-50 (Small)",
  "51-200 (Medium)",
  "201-500 (Large)",
  "500+ (Enterprise)",
];

export const SERVICES_OPTIONS = [
  "AI Sales Agent",
  "CRM Integration",
  "Lead Generation",
  "Marketing Automation",
  "Analytics & Reporting",
  "Customer Support AI",
  "Content Generation",
  "Social Media Management",
  "SEO & Digital Marketing",
  "Custom Development",
];
