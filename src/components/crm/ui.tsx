"use client";

/**
 * Shared primitives for the CRM/HR pages — same Tailwind token idioms as the
 * rest of the dashboard (cards `rounded-2xl border-border bg-card`, inputs
 * with `focus:ring-ring/30`, tinted status badges).
 */
import { CloseIcon, SpinnerIcon } from "@/src/components/icons";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card ${className}`}>{children}</div>
  );
}

const badgeTones: Record<string, string> = {
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  muted: "bg-muted-foreground/10 text-muted-foreground",
  primary: "bg-primary/10 text-primary",
};

export function Badge({ tone = "muted", children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeTones[tone] ?? badgeTones.muted}`}
    >
      {children}
    </span>
  );
}

export const statusTone = (status: string): string =>
  (
    {
      ACTIVE: "success",
      PRESENT: "success",
      APPROVED: "success",
      COMPLETED: "success",
      ACKNOWLEDGED: "success",
      ACCEPTED: "success",
      VERIFIED: "primary",
      SUBMITTED: "primary",
      IN_PROGRESS: "primary",
      ISSUED: "primary",
      PENDING: "warning",
      ON_LEAVE: "warning",
      DRAFT: "warning",
      LATE: "warning",
      HALF_DAY: "warning",
      REJECTED: "danger",
      DECLINED: "danger",
      CANCELLED: "danger",
      BLOCKED: "danger",
      TERMINATED: "danger",
      RESIGNED: "muted",
      WITHDRAWN: "muted",
    } as Record<string, string>
  )[status] ?? "muted";

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl border border-border bg-card p-6 shadow-xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30";

export function Btn({
  children,
  onClick,
  type = "button",
  tone = "primary",
  busy,
  disabled,
  small,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  tone?: "primary" | "ghost" | "danger" | "success";
  busy?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const tones = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    ghost: "border border-border text-foreground hover:bg-accent",
    danger: "bg-danger/10 text-danger hover:bg-danger/20",
    success: "bg-success/10 text-success hover:bg-success/20",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        small ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
      } ${tones[tone]}`}
    >
      {busy && <SpinnerIcon className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const cls =
    kind === "error"
      ? "border-danger/30 bg-danger/10 text-danger"
      : "border-success/30 bg-success/10 text-success";
  return <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function TableShell({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
            active === t.key
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 text-xs opacity-80">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}

export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtTime = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
