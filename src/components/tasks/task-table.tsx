"use client";

import { useMemo, useState } from "react";
import type { TaskRow, TaskStatus } from "@/src/api/api";
import { ChevronDownIcon } from "@/src/components/icons";
import {
  PRIORITY_RANK,
  PRIORITY_STYLE,
  STATUSES,
  STATUS_ACCENT,
  STATUS_LABEL,
  fmtDate,
  initials,
  isOverdue,
} from "./task-meta";

type SortKey = "id" | "title" | "assignee" | "priority" | "status" | "dueDate" | "createdAt";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: "id", label: "#", className: "w-14 text-right" },
  { key: "title", label: "Title", className: "min-w-[260px]" },
  { key: "assignee", label: "Assignee", className: "min-w-[170px]" },
  { key: "priority", label: "Priority", className: "w-28" },
  { key: "status", label: "Status", className: "w-44" },
  { key: "dueDate", label: "Due", className: "w-28" },
  { key: "createdAt", label: "Created", className: "w-28" },
];

function time(iso: string | null): number {
  return iso ? new Date(iso).getTime() : 0;
}

function compare(a: TaskRow, b: TaskRow, key: SortKey): number {
  switch (key) {
    case "id":
      return a.taskId - b.taskId;
    case "title":
      return a.title.localeCompare(b.title);
    case "assignee":
      return a.assignee.name.localeCompare(b.assignee.name);
    case "priority":
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    case "status":
      return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
    case "dueDate":
      return time(a.dueDate) - time(b.dueDate);
    case "createdAt":
      return time(a.createdAt) - time(b.createdAt);
  }
}

// Excel-style cells: every cell carries its own right + bottom hairline.
// border-separate (not collapse) keeps those lines visible on the sticky header.
const HEAD_CELL =
  "sticky top-0 z-10 border-b border-r border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground last:border-r-0";
const BODY_CELL = "border-b border-r border-border px-3 py-2 align-middle last:border-r-0";

export function TaskTable({
  tasks,
  pendingTaskId,
  onOpen,
  onMove,
  emptyMessage,
  onClearFilters,
}: {
  tasks: TaskRow[];
  /** Task whose status change is in flight; its select is disabled meanwhile. */
  pendingTaskId: number | null;
  onOpen: (taskId: number) => void;
  onMove: (taskId: number, status: TaskStatus) => void;
  emptyMessage: string;
  onClearFilters?: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const rows = [...tasks];
    rows.sort((a, b) => {
      // "No due date" always sinks to the bottom, whichever way the column sorts.
      if (sortKey === "dueDate" && !a.dueDate !== !b.dueDate) return a.dueDate ? -1 : 1;
      const c = compare(a, b, sortKey);
      return (sortDir === "asc" ? c : -c) || b.taskId - a.taskId;
    });
    return rows;
  }, [tasks, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "createdAt" || key === "id" ? "desc" : "asc");
    }
  }

  return (
    <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {COLUMNS.map((col) => {
              const active = col.key === sortKey;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  className={`${HEAD_CELL} ${col.className}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={`group inline-flex w-full items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                      col.key === "id" ? "justify-end" : ""
                    } ${active ? "text-foreground" : "hover:text-foreground"}`}
                  >
                    {col.label}
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                        active ? (sortDir === "asc" ? "rotate-180" : "") : "opacity-0 group-hover:opacity-40"
                      }`}
                    />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-5 py-14 text-center text-muted-foreground">
                <p>{emptyMessage}</p>
                {onClearFilters && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="mt-2 text-sm font-medium text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </td>
            </tr>
          ) : (
            sorted.map((t) => {
              const overdue = isOverdue(t);
              return (
                <tr
                  key={t.taskId}
                  className="even:bg-muted/30 hover:bg-primary/5 [&:last-child>td]:border-b-0"
                >
                  <td className={`${BODY_CELL} text-right tabular-nums text-muted-foreground`}>{t.taskId}</td>
                  <td className={BODY_CELL}>
                    <button
                      type="button"
                      onClick={() => onOpen(t.taskId)}
                      className="block max-w-full rounded text-left font-medium text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <span className="line-clamp-1">{t.title}</span>
                    </button>
                    {t.description && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">{t.description}</p>
                    )}
                  </td>
                  <td className={BODY_CELL}>
                    <span className="flex items-center gap-2" title={t.assignee.designation ?? undefined}>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                        {initials(t.assignee.name)}
                      </span>
                      <span className="truncate text-foreground">{t.assignee.name}</span>
                    </span>
                  </td>
                  <td className={BODY_CELL}>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLE[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className={BODY_CELL}>
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_ACCENT[t.status]}`} />
                      <select
                        value={t.status}
                        disabled={pendingTaskId === t.taskId}
                        onChange={(e) => onMove(t.taskId, e.target.value as TaskStatus)}
                        aria-label={`Status of ${t.title}`}
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary disabled:opacity-60"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </span>
                  </td>
                  <td
                    className={`${BODY_CELL} whitespace-nowrap tabular-nums ${
                      overdue ? "font-semibold text-rose-600" : "text-foreground"
                    }`}
                    title={overdue ? "Overdue" : undefined}
                  >
                    {fmtDate(t.dueDate)}
                  </td>
                  <td className={`${BODY_CELL} whitespace-nowrap tabular-nums text-muted-foreground`}>
                    {fmtDate(t.createdAt)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
