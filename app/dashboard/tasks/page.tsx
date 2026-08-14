"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  taskApi,
  type TaskPriority,
  type TaskRow,
  type TaskStatus,
} from "@/src/api/api";
import { TaskDetailDrawer } from "@/src/components/dashboard/task-detail-drawer";
import { TaskFormModal } from "@/src/components/tasks/task-form";
import { SearchIcon, SpinnerIcon, PlusIcon } from "@/src/components/icons";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];
const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  BLOCKED: "Blocked",
};
const STATUS_ACCENT: Record<TaskStatus, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-sky-500",
  IN_REVIEW: "bg-indigo-500",
  DONE: "bg-emerald-500",
  BLOCKED: "bg-rose-500",
};
const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "bg-slate-500/10 text-slate-500",
  MEDIUM: "bg-sky-500/10 text-sky-600",
  HIGH: "bg-amber-500/10 text-amber-600",
  URGENT: "bg-rose-500/10 text-rose-600",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function isOverdue(t: TaskRow): boolean {
  return t.status !== "DONE" && !!t.dueDate && new Date(t.dueDate).getTime() < Date.now();
}
function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const params = { search: search.trim() || undefined, priority: priority || undefined, limit: 300 };
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tasks", params],
    queryFn: () => taskApi.list(params),
    placeholderData: keepPreviousData,
  });

  const tasks = data?.tasks ?? [];
  const byStatus = useMemo(() => {
    const m: Record<TaskStatus, TaskRow[]> = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [], BLOCKED: [] };
    for (const t of tasks) m[t.status].push(t);
    return m;
  }, [tasks]);

  const moveStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      taskApi.update(taskId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">Assign work to employees and track it to done.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <PlusIcon className="h-4 w-4" /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, description or assignee"
            className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority | "")}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">{tasks.length} tasks</span>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center text-muted-foreground">
          <SpinnerIcon className="h-6 w-6" />
        </div>
      ) : isError ? (
        <div className="flex h-60 flex-col items-center justify-center gap-3">
          <p className="text-muted-foreground">Couldn’t load tasks.</p>
          <button onClick={() => refetch()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {STATUSES.map((s) => (
            <div key={s} className="flex flex-col rounded-2xl border border-border bg-muted/30">
              <div className="flex items-center gap-2 px-4 py-3">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_ACCENT[s]}`} />
                <span className="text-sm font-semibold text-foreground">{STATUS_LABEL[s]}</span>
                <span className="ml-auto text-xs text-muted-foreground">{byStatus[s].length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                {byStatus[s].length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">No tasks</p>
                ) : (
                  byStatus[s].map((t) => (
                    <TaskCard
                      key={t.taskId}
                      task={t}
                      onOpen={() => setOpenId(t.taskId)}
                      onMove={(status) => moveStatus.mutate({ taskId: t.taskId, status })}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <TaskFormModal onClose={() => setCreating(false)} />}
      {openId != null && <TaskDetailDrawer taskId={openId} mode="manage" onClose={() => setOpenId(null)} />}
    </div>
  );
}

function TaskCard({ task, onOpen, onMove }: { task: TaskRow; onOpen: () => void; onMove: (s: TaskStatus) => void }) {
  const overdue = isOverdue(task);
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/40">
      <button onClick={onOpen} className="block w-full text-left">
        <p className="line-clamp-2 text-sm font-medium text-foreground">{task.title}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLE[task.priority]}`}>
            {task.priority}
          </span>
          {task.dueDate && (
            <span className={`text-[11px] ${overdue ? "font-semibold text-rose-600" : "text-muted-foreground"}`}>
              Due {fmtDate(task.dueDate)}
            </span>
          )}
        </div>
      </button>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" title={task.assignee.name}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
            {initials(task.assignee.name)}
          </span>
          <span className="max-w-[90px] truncate">{task.assignee.name}</span>
        </span>
        <select
          value={task.status}
          onChange={(e) => onMove(e.target.value as TaskStatus)}
          onClick={(e) => e.stopPropagation()}
          className="rounded-md border border-border bg-background px-1.5 py-1 text-[11px] text-foreground outline-none focus:border-primary"
          title="Move to"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}




