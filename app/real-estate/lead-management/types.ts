export type LeadType = "form" | "whatsapp" | "inbound" | "manual";
export type Priority = "high" | "medium" | "low";
export type LeadStatus =
  | "new"
  | "follow_up"
  | "interested"
  | "meeting_scheduled"
  | "closed"
  | "lost";
export type CallStatus =
  | "no_answer"
  | "busy"
  | "interested"
  | "not_interested"
  | "callback"
  | "voicemail";
export type MeetingStatus = "scheduled" | "completed" | "cancelled";

export interface CallAttempt {
  id: string;
  attemptNumber: number;
  status: CallStatus;
  notes?: string;
  createdAt: string;
  // Raw fields from the backend call record — kept alongside the bucketed
  // `status` above (which loses precision) so the lead can be edited without
  // re-fetching the original submission.
  rawStatus?: string | null;
  leadClass?: string | null;
  score?: number | null;
  nextDate?: string | null;
  transcription?: string | null;
}

export interface Meeting {
  id: string;
  date: string;
  time: string;
  status: MeetingStatus;
  notes?: string;
}

export interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  project: string;
  phone: string;
  budget: string;
  priority: Priority;
  status: LeadStatus;
  calls: CallAttempt[];
  meeting?: Meeting;
  notes: LeadNote[];
  createdAt: string;
  type: LeadType;
  email?: string;
  aiMode: boolean;
}
