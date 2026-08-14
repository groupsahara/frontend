"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  taskApi,
  type AssignableEmployee,
  type CreateTaskInput,
  type TaskPriority,
  type TaskRepeat,
  type TaskRow,
  type TaskStatus,
} from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { SpinnerIcon } from "@/src/components/icons";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];
const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "Pending",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Completed",
  BLOCKED: "Blocked",
};
const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const REPEATS: TaskRepeat[] = ["DAILY", "WEEKLY", "MONTHLY"];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelCls = "mb-1.5 block text-sm font-medium text-foreground";
const req = <span className="text-danger"> *</span>;


export function TaskFormModal({
  mode = "manage",
  onClose,
  onSaved,
}: {
  mode?: "manage" | "self";
  onClose: () => void;
  onSaved?: (task: TaskRow) => void;
}) {
  const qc = useQueryClient();
  const isSelf = mode === "self";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("HIGH");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatEvery, setRepeatEvery] = useState<TaskRepeat>("WEEKLY");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [files, setFiles] = useState<(File | null)[]>([null]);
  const [voiceNote, setVoiceNote] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [uploadNote, setUploadNote] = useState("");

  const employees = useQuery({
    queryKey: ["task-employees"],
    queryFn: () => taskApi.employees(),
    enabled: !isSelf,
  });

  const save = useMutation({
    mutationFn: async () => {
      const body: CreateTaskInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        ...(assignee.startsWith("u:")
          ? { assigneeUserId: Number(assignee.slice(2)) }
          : { assigneeId: Number(assignee.slice(2)) }),
        priority,
        status,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        isRepeating,
        repeatEvery: isRepeating ? repeatEvery : undefined,
        repeatUntil: isRepeating && repeatUntil ? repeatUntil : undefined,
      };

      const task = isSelf
        ? await taskApi.createMyTask(body)
        : await taskApi.create(body);

      // Files ride along after creation; a failed upload must not read as a
      // failed task, so it is surfaced separately.
      const pending = [...files.filter((f): f is File => !!f), ...(voiceNote ? [voiceNote] : [])];
      if (pending.length) {
        setUploadNote(`Uploading ${pending.length} file(s)…`);
        const failed: string[] = [];
        for (const file of pending) {
          try {
            await (isSelf
              ? taskApi.addMyAttachment(task.taskId, file)
              : taskApi.addAttachment(task.taskId, file));
          } catch {
            failed.push(file.name);
          }
        }
        if (failed.length) throw new Error(`Task created, but these did not upload: ${failed.join(", ")}`);
      }
      return task;
    },
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      onSaved?.(task);
      onClose();
    },
    onError: (e) => {
      setUploadNote("");
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not save the task.");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!title.trim()) return setErr("Please give the task a title.");
    if (!isSelf && !assignee) return setErr("Please choose who this task is for.");
    if (!startDate) return setErr("Please set a start date.");
    if (!dueDate) return setErr("Please set a due date.");
    if (dueDate < startDate) return setErr("The due date cannot be before the start date.");
    if (isRepeating && repeatUntil && repeatUntil < dueDate) {
      return setErr("Repeat-until cannot be before the due date.");
    }
    save.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="my-8 w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-lg font-semibold text-foreground">Create new Task</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Fields with (*) are mandatory.</p>
        </div>

        <div className="space-y-5 px-6 py-6">
          {err && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {err}
            </div>
          )}

          <div>
            <label className={labelCls}>Task Title{req}</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          <AttachmentPicker files={files} onChange={setFiles} />

          <div>
            <label className={labelCls}>Task Description</label>
            <textarea
              className={`${inputCls} min-h-28 resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task details"
            />
          </div>

          {!isSelf && (
            <div>
              <label className={labelCls}>Assign To{req}</label>
              <select
                className={inputCls}
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">-- Select a user --</option>
                {employees.data?.map((p: AssignableEmployee) => {
                  // Employees are keyed by employeeId; logins without an
                  // employee record are keyed by userId and get one created
                  // for them on assignment.
                  const value = p.employeeId ? `e:${p.employeeId}` : `u:${p.userId}`;
                  return (
                    <option key={value} value={value}>
                      {p.name}
                      {p.designation ? ` — ${p.designation}` : ""}
                    </option>
                  );
                })}
              </select>
              {employees.isLoading && (
                <p className="mt-1.5 text-xs text-muted-foreground">Loading users…</p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-3">
              <span
                className={`relative h-6 w-11 rounded-full transition-colors ${isRepeating ? "bg-primary" : "bg-muted"}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isRepeating}
                  onChange={(e) => setIsRepeating(e.target.checked)}
                />
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${isRepeating ? "left-[22px]" : "left-0.5"}`}
                />
              </span>
              <span className="text-sm text-foreground">This is a repeating task</span>
            </label>

            {isRepeating && (
              <div className="grid gap-5 rounded-xl border border-border bg-accent/30 p-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Repeat every</label>
                  <select
                    className={inputCls}
                    value={repeatEvery}
                    onChange={(e) => setRepeatEvery(e.target.value as TaskRepeat)}
                  >
                    {REPEATS.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0) + r.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Repeat until</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Start Date{req}</label>
              <input
                type="date"
                className={inputCls}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Due Date{req}</label>
              <input
                type="date"
                className={inputCls}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Priority{req}</label>
              <select
                className={inputCls}
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status{req}</label>
              <select
                className={inputCls}
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <VoiceNoteRecorder note={voiceNote} onChange={setVoiceNote} />
        </div>

        <div className="flex items-center gap-3 border-t border-border px-6 py-4">
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {save.isPending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
            Save Task
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            Cancel
          </button>
          {uploadNote && save.isPending && (
            <span className="text-xs text-muted-foreground">{uploadNote}</span>
          )}
        </div>
      </form>
    </div>
  );
}

/** One row per file, with "Add More File" — matches how the reference form works. */
function AttachmentPicker({
  files,
  onChange,
}: {
  files: (File | null)[];
  onChange: (next: (File | null)[]) => void;
}) {
  const setAt = (i: number, file: File | null) => {
    const next = [...files];
    next[i] = file;
    onChange(next);
  };

  return (
    <div>
      <label className={labelCls}>Add Attachment</label>
      <div className="space-y-2">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="file"
              onChange={(e) => setAt(i, e.target.files?.[0] ?? null)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:text-foreground"
            />
            <button
              type="button"
              title="Remove this file"
              onClick={() =>
                onChange(files.length === 1 ? [null] : files.filter((_, idx) => idx !== i))
              }
              className="rounded-xl bg-danger/15 px-3 py-2 text-danger transition-colors hover:bg-danger/25"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...files, null])}
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-success/20 px-4 py-2 text-sm font-medium text-success transition-colors hover:bg-success/30"
      >
        Add More File +
      </button>
      {files.filter(Boolean).length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {files.filter(Boolean).length} file(s) will upload once the task is created.
        </p>
      )}
    </div>
  );
}

/**
 * Records a voice note in the browser and hands it over as a file.
 *
 * The stream's tracks are stopped when recording ends and on unmount — without
 * that the microphone stays live (and the browser keeps showing the recording
 * indicator) after the modal is closed.
 */
function VoiceNoteRecorder({
  note,
  onChange,
}: {
  note: File | null;
  onChange: (f: File | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        onChange(new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type }));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("Microphone unavailable. Check the browser's permission for this site.");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div>
      <label className={labelCls}>🎙 Record Voice Note</label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={recording}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {recording ? "Recording…" : "Record"}
        </button>
        <button
          type="button"
          onClick={stop}
          disabled={!recording}
          className="rounded-xl bg-danger/20 px-4 py-2 text-sm font-medium text-danger disabled:opacity-50"
        >
          Stop
        </button>
        {note && !recording && (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Voice note ready ({Math.max(1, Math.round(note.size / 1024))} KB)
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-danger underline-offset-2 hover:underline"
            >
              discard
            </button>
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
