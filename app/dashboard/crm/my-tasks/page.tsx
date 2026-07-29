"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskApi, type TaskPriority, type TaskRow, type TaskStatus } from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { TaskDetailDrawer } from "@/src/components/dashboard/task-detail-drawer";
import { PlusIcon, SpinnerIcon } from "@/src/components/icons";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];
const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  BLOCKED: "Blocked",
};
const STATUS_STYLE: Record<TaskStatus, string> = {
  TODO: "bg-slate-500/10 text-slate-500",
  IN_PROGRESS: "bg-sky-500/10 text-sky-600",
  IN_REVIEW: "bg-indigo-500/10 text-indigo-600",
  DONE: "bg-emerald-500/10 text-emerald-600",
  BLOCKED: "bg-rose-500/10 text-rose-600",
};
const PRIORITY_STYLE: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-500",
  MEDIUM: "bg-sky-500/10 text-sky-600",
  HIGH: "bg-amber-500/10 text-amber-600",
  URGENT: "bg-rose-500/10 text-rose-600",
};

const TABS: { key: "OPEN" | "ALL" | TaskStatus; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "DONE", label: "Completed" },
  { key: "ALL", label: "All" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function isOverdue(t: TaskRow): boolean {
  return t.status !== "DONE" && !!t.dueDate && new Date(t.dueDate).getTime() < Date.now();
}

export default function MyTasksPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"OPEN" | "ALL" | TaskStatus>("OPEN");
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-tasks", "all"],
    queryFn: () => taskApi.myTasks(),
    placeholderData: keepPreviousData,
  });

  const setStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) => taskApi.updateMyStatus(taskId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-tasks"] }),
  });

  const all = data?.tasks ?? [];
  const filtered = all.filter((t) =>
    tab === "ALL" ? true : tab === "OPEN" ? t.status !== "DONE" : t.status === tab,
  );
  const counts = data?.counts ?? {};
  const openCount = (counts.all ?? 0) - (counts.DONE ?? 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {data?.employee?.name ? `Assigned to ${data.employee.name}` : "Tasks assigned to you"} — click a task for details, or add your own.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <PlusIcon className="h-4 w-4" /> New Task
        </button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const count = t.key === "ALL" ? counts.all ?? 0 : t.key === "OPEN" ? openCount : counts[t.key] ?? 0;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <sup className="ml-1 text-xs">({count})</sup>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center text-muted-foreground">
          <SpinnerIcon className="h-6 w-6" />
        </div>
      ) : isError ? (
        <div className="flex h-60 flex-col items-center justify-center gap-3">
          <p className="text-muted-foreground">Couldn’t load your tasks.</p>
          <button onClick={() => refetch()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-center">
          <p className="text-4xl">✅</p>
          <p className="text-sm text-muted-foreground">Nothing here. You’re all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.taskId} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setOpenId(t.taskId)} className="min-w-0 flex-1 cursor-pointer text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLE[t.priority]}`}>
                      {t.priority}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    {isOverdue(t) && (
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600">Overdue</span>
                    )}
                  </div>
                  <p className="mt-1.5 font-medium text-foreground">{t.title}</p>
                  {t.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Due: {fmtDate(t.dueDate)}</span>
                    <span>Assigned by: {t.assignedBy?.name ?? "—"}</span>
                  </div>
                </button>
                <select
                  value={t.status}
                  onChange={(e) => setStatus.mutate({ taskId: t.taskId, status: e.target.value as TaskStatus })}
                  disabled={setStatus.isPending}
                  className="shrink-0 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <CreateMyTaskModal onClose={() => setCreating(false)} />}
      {openId != null && <TaskDetailDrawer taskId={openId} mode="self" onClose={() => setOpenId(null)} />}
    </div>
  );
}

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";

function CreateMyTaskModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      taskApi.createMyTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      onClose();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not create the task."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-base font-semibold text-foreground">New Task</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
            ✕
          </button>
        </div>
        <div className="space-y-4 p-5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you need to do?" className={inputCls} autoFocus />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Details…" className={inputCls} />
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due date</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </label>
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
            Cancel
          </button>
          <button
            onClick={() => (title.trim() ? create.mutate() : setErr("Please enter a title."))}
            disabled={create.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending && <SpinnerIcon className="h-4 w-4" />} Create
          </button>
        </div>
      </div>
    </div>
  );
}
