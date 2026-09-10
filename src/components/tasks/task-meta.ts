import type { TaskPriority, TaskRow, TaskStatus } from "@/src/api/api";

// Status/priority vocabulary shared by the tasks page and its table so the
// two never drift apart.

export const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];
export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  BLOCKED: "Blocked",
};
export const STATUS_ACCENT: Record<TaskStatus, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-sky-500",
  IN_REVIEW: "bg-indigo-500",
  DONE: "bg-emerald-500",
  BLOCKED: "bg-rose-500",
};
export const STATUS_TEXT: Record<TaskStatus, string> = {
  TODO: "text-slate-500",
  IN_PROGRESS: "text-sky-600",
  IN_REVIEW: "text-indigo-600",
  DONE: "text-emerald-600",
  BLOCKED: "text-rose-600",
};

export const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "bg-slate-500/10 text-slate-500",
  MEDIUM: "bg-sky-500/10 text-sky-600",
  HIGH: "bg-amber-500/10 text-amber-600",
  URGENT: "bg-rose-500/10 text-rose-600",
};
/** Lower = more urgent; used to sort the priority column. */
export const PRIORITY_RANK: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
export function isOverdue(t: TaskRow): boolean {
  return t.status !== "DONE" && !!t.dueDate && new Date(t.dueDate).getTime() < Date.now();
}
export function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
