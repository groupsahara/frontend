"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  taskApi,
  type AssignableEmployee,
  type TaskDetail,
  type TaskPriority,
  type TaskStatus,
} from "@/src/api/api";
import { SpinnerIcon, TrashIcon } from "@/src/components/icons";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];
const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  BLOCKED: "Blocked",
};
const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";

function isImage(mime: string | null): boolean {
  return !!mime && mime.startsWith("image/");
}
function describeActivity(a: TaskDetail["activities"][number]): string {
  switch (a.type) {
    case "CREATED":
      return "created this task";
    case "STATUS_CHANGED":
      return `moved it ${a.fromStatus ? STATUS_LABEL[a.fromStatus] : "?"} → ${a.toStatus ? STATUS_LABEL[a.toStatus] : "?"}`;
    case "ASSIGNED":
      return "reassigned this task";
    case "COMMENTED":
      return "commented";
    case "ATTACHED":
      return "attached a file";
    default:
      return "updated this task";
  }
}

export function TaskDetailDrawer({
  taskId,
  mode,
  onClose,
}: {
  taskId: number;
  mode: "manage" | "self";
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isManage = mode === "manage";
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", mode, taskId],
    queryFn: () => (isManage ? taskApi.get(taskId) : taskApi.getMyTask(taskId)),
  });
  const { data: employees } = useQuery({
    queryKey: ["task-employees", ""],
    queryFn: () => taskApi.employees(),
    enabled: isManage,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["task", mode, taskId] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
  };

  const patch = useMutation({
    mutationFn: (body: Parameters<typeof taskApi.update>[1]) =>
      isManage ? taskApi.update(taskId, body) : taskApi.updateMyTask(taskId, body),
    onSuccess: invalidate,
  });
  const addComment = useMutation({
    mutationFn: (body: string) => (isManage ? taskApi.addComment(taskId, body) : taskApi.addMyComment(taskId, body)),
    onSuccess: () => {
      setComment("");
      invalidate();
    },
  });
  const addSubtask = useMutation({
    mutationFn: (title: string) => (isManage ? taskApi.addSubtask(taskId, title) : taskApi.addMySubtask(taskId, title)),
    onSuccess: () => {
      setNewSubtask("");
      invalidate();
    },
  });
  const toggleSubtask = useMutation({
    mutationFn: ({ subtaskId, isDone }: { subtaskId: number; isDone: boolean }) =>
      isManage ? taskApi.updateSubtask(subtaskId, { isDone }) : taskApi.updateMySubtask(subtaskId, { isDone }),
    onSuccess: invalidate,
  });
  const removeSubtask = useMutation({
    mutationFn: (subtaskId: number) => (isManage ? taskApi.removeSubtask(subtaskId) : taskApi.removeMySubtask(subtaskId)),
    onSuccess: invalidate,
  });
  const uploadAttachment = useMutation({
    mutationFn: (file: File) => (isManage ? taskApi.addAttachment(taskId, file) : taskApi.addMyAttachment(taskId, file)),
    onSuccess: invalidate,
  });
  const removeAttachment = useMutation({
    mutationFn: (id: number) => (isManage ? taskApi.removeAttachment(id) : taskApi.removeMyAttachment(id)),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => taskApi.remove(taskId),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const doneSubtasks = task?.subtasks.filter((s) => s.isDone).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {task ? `Task #${task.taskId}` : "Task"}
          </span>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
            ✕
          </button>
        </div>

        {isLoading || !task ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <SpinnerIcon className="h-6 w-6" />
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {/* Title */}
            <input
              defaultValue={task.title}
              onBlur={(e) => e.target.value.trim() && e.target.value !== task.title && patch.mutate({ title: e.target.value.trim() })}
              className="w-full rounded-lg border border-transparent bg-transparent text-lg font-semibold text-foreground outline-none hover:border-border focus:border-primary focus:px-2 focus:py-1"
            />

            {/* Properties */}
            <div className="grid grid-cols-2 gap-3">
              <Prop label="Status">
                <select value={task.status} onChange={(e) => patch.mutate({ status: e.target.value as TaskStatus })} className={inputCls}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Prop>
              <Prop label="Priority">
                <select value={task.priority} onChange={(e) => patch.mutate({ priority: e.target.value as TaskPriority })} className={inputCls}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </Prop>
              <Prop label="Assignee">
                {/* Reassignment moves the task to an existing employee record.
                    Logins that have never been assigned anything do not have one
                    yet, so they are offered on the create form — which creates
                    it — rather than here. */}
                {isManage ? (
                  <select value={task.assigneeId} onChange={(e) => patch.mutate({ assigneeId: Number(e.target.value) })} className={inputCls}>
                    {(employees ?? [])
                      .filter((emp: AssignableEmployee) => emp.employeeId != null)
                      .map((emp: AssignableEmployee) => (
                        <option key={emp.employeeId} value={emp.employeeId as number}>
                          {emp.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">{task.assignee.name}</div>
                )}
              </Prop>
              <Prop label="Due date">
                <input type="date" defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""} onChange={(e) => patch.mutate({ dueDate: e.target.value })} className={inputCls} />
              </Prop>
            </div>

            {/* Subtasks */}
            <Section title={`Subtasks ${task.subtasks.length ? `(${doneSubtasks}/${task.subtasks.length})` : ""}`}>
              <div className="space-y-1.5">
                {task.subtasks.map((s) => (
                  <div key={s.subtaskId} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={s.isDone}
                      onChange={() => toggleSubtask.mutate({ subtaskId: s.subtaskId, isDone: !s.isDone })}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className={`flex-1 text-sm ${s.isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>{s.title}</span>
                    <button onClick={() => removeSubtask.mutate(s.subtaskId)} className="text-muted-foreground hover:text-danger" title="Remove">
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newSubtask.trim() && addSubtask.mutate(newSubtask.trim())}
                  placeholder="Add a subtask…"
                  className={inputCls}
                />
                <button
                  onClick={() => newSubtask.trim() && addSubtask.mutate(newSubtask.trim())}
                  disabled={!newSubtask.trim()}
                  className="rounded-xl border border-border px-3 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </Section>

            {/* Attachments */}
            <Section title={`Attachments ${task.attachments.length ? `(${task.attachments.length})` : ""}`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {task.attachments.map((a) => (
                  <div key={a.attachmentId} className="group relative overflow-hidden rounded-xl border border-border">
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                      {isImage(a.mimeType) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.url} alt={a.fileName} className="h-24 w-full object-cover" />
                      ) : (
                        <div className="flex h-24 w-full flex-col items-center justify-center gap-1 bg-muted/40 p-2 text-center">
                          <span className="text-2xl">📄</span>
                          <span className="line-clamp-2 text-[10px] text-muted-foreground">{a.fileName}</span>
                        </div>
                      )}
                    </a>
                    <button
                      onClick={() => removeAttachment.mutate(a.attachmentId)}
                      className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white group-hover:flex"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAttachment.mutate(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadAttachment.isPending}
                className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground disabled:opacity-50"
              >
                {uploadAttachment.isPending ? <SpinnerIcon className="h-4 w-4" /> : "📎"} Upload photo / PDF / screenshot
              </button>
            </Section>

            {/* Description */}
            <Section title="Description">
              <textarea
                defaultValue={task.description ?? ""}
                onBlur={(e) => e.target.value !== (task.description ?? "") && patch.mutate({ description: e.target.value })}
                rows={4}
                placeholder="Add a description…"
                className={inputCls}
              />
            </Section>

            {/* Comments */}
            <Section title={`Comments (${task.comments.length})`}>
              <div className="space-y-3">
                {task.comments.map((c) => (
                  <div key={c.commentId} className="rounded-xl border border-border bg-background p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{c.author?.name ?? "—"}</span>
                      <span>{new Date(c.createdAt).toLocaleString("en-IN")}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && comment.trim() && addComment.mutate(comment.trim())}
                  placeholder="Write a comment…"
                  className={inputCls}
                />
                <button
                  onClick={() => comment.trim() && addComment.mutate(comment.trim())}
                  disabled={addComment.isPending || !comment.trim()}
                  className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </Section>

            {/* Activity */}
            <Section title="History">
              <ol className="space-y-2.5">
                {task.activities.map((a) => (
                  <li key={a.activityId} className="flex gap-2.5 text-xs">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <span className="text-foreground">
                        {a.actor?.name ?? "System"} {describeActivity(a)}
                      </span>
                      {a.note && <span className="text-muted-foreground"> — {a.note}</span>}
                      <div className="text-muted-foreground">{new Date(a.createdAt).toLocaleString("en-IN")}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>

            {isManage && (
              <button
                onClick={() => confirm("Delete this task? This cannot be undone.") && remove.mutate()}
                disabled={remove.isPending}
                className="flex items-center gap-1.5 text-sm font-medium text-danger hover:underline disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" /> Delete task
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
