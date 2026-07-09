"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  X,
} from "lucide-react";

import { toast } from "sonner";
import { auditLogsApi, type AuditLogQuery } from "@/app/api/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditCategory = "USER_ACTIVITY" | "LOGIN" | "SYSTEM";
type AuditLevel = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

interface AuditLog {
  id: string;
  category: AuditCategory;
  action: string;
  level: AuditLevel;
  message: string | null;
  status: string | null;
  userId: string | null;
  userEmail: string | null;
  tenantId: string | null;
  entityType: string | null;
  entityId: string | null;
  method: string | null;
  path: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditStats {
  total: number;
  byCategory: Record<string, number>;
  byLevel: Record<string, number>;
}

const TABS: { key: AuditCategory; label: string; icon: typeof Activity; blurb: string }[] = [
  {
    key: "USER_ACTIVITY",
    label: "User Activities",
    icon: Activity,
    blurb: "Every state-changing action performed by a logged-in user.",
  },
  {
    key: "LOGIN",
    label: "Login Logs",
    icon: KeyRound,
    blurb: "Successful and failed authentication attempts.",
  },
  {
    key: "SYSTEM",
    label: "System Logs",
    icon: ServerCog,
    blurb: "Application lifecycle events and server-side errors.",
  },
];

const LEVELS: ("" | AuditLevel)[] = ["", "INFO", "WARNING", "ERROR", "CRITICAL"];
const PAGE_SIZE = 25;

function isCategory(v: string | null): v is AuditCategory {
  return v === "USER_ACTIVITY" || v === "LOGIN" || v === "SYSTEM";
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function levelBadge(level: AuditLevel) {
  switch (level) {
    case "ERROR":
    case "CRITICAL":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "WARNING":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    default:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
}

function statusBadge(status: string | null) {
  if (status === "success")
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (status === "failure")
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  return "bg-muted text-muted-foreground border-border";
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function DetailModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const rows: [string, string | null][] = [
    ["Category", log.category],
    ["Action", log.action],
    ["Level", log.level],
    ["Status", log.status],
    ["Message", log.message],
    ["User", log.userEmail],
    ["User ID", log.userId],
    ["Tenant ID", log.tenantId],
    ["Entity", log.entityType ? `${log.entityType}${log.entityId ? ` (${log.entityId})` : ""}` : null],
    ["Method / Path", log.method || log.path ? `${log.method ?? ""} ${log.path ?? ""}`.trim() : null],
    ["IP Address", log.ipAddress],
    ["User Agent", log.userAgent],
    ["Time", formatDateTime(log.createdAt)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-card-foreground">Log Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rows
              .filter(([, v]) => v != null && v !== "")
              .map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="break-words text-sm text-foreground">{value}</p>
                </div>
              ))}
          </div>

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Metadata</p>
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AuditLogsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: AuditCategory = isCategory(tabParam) ? tabParam : "USER_ACTIVITY";

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [level, setLevel] = useState<"" | AuditLevel>("");
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const activeMeta = useMemo(() => TABS.find((t) => t.key === activeTab)!, [activeTab]);

  // Debounce free-text search.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  // Reset paging / filters when switching tabs.
  const [prevTab, setPrevTab] = useState(activeTab);
  if (activeTab !== prevTab) {
    setPrevTab(activeTab);
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
    setLevel("");
  }

  const fetchStats = useCallback(async () => {
    try {
      const data = await auditLogsApi.getStats();
      setStats(data);
    } catch {
      // Stats are best-effort; the table is the source of truth.
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: AuditLogQuery = {
        category: activeTab,
        page,
        limit: PAGE_SIZE,
      };
      if (level) params.level = level;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await auditLogsApi.getLogs(params);
      setLogs(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.meta?.total ?? 0);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load audit logs");
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, level, debouncedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchStats();
  }, [fetchStats]);

  const refresh = () => {
    void fetchLogs();
    void fetchStats();
  };

  const switchTab = (key: AuditCategory) => {
    router.push(`/real-estate/audit-logs?tab=${key}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="@container/main flex w-full flex-col gap-4 md:gap-6">
      {selected && <DetailModal log={selected} onClose={() => setSelected(null)} />}

      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <h1 className="font-semibold text-xl tracking-tight">Audit Logs</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Platform-wide activity, authentication, and system events. Visible to super admins only.
          </p>
        </div>

        <button
          onClick={refresh}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Events" value={stats?.total ?? 0} icon={ShieldCheck} />
        {TABS.map((t) => (
          <StatCard
            key={t.key}
            label={t.label}
            value={stats?.byCategory?.[t.key] ?? 0}
            icon={t.icon}
            active={activeTab === t.key}
            onClick={() => switchTab(t.key)}
          />
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">{activeMeta.blurb}</p>

      {/* ── FILTERS ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search action, message, email, IP…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </div>

        <select
          value={level}
          onChange={(e) => {
            setLevel(e.target.value as "" | AuditLevel);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        >
          {LEVELS.map((l) => (
            <option key={l || "all"} value={l}>
              {l ? l : "All levels"}
            </option>
          ))}
        </select>
      </div>

      {/* ── TABLE ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Time", "Action", "Level", activeTab === "SYSTEM" ? "Status" : "User", "Details"].map(
                  (h) => (
                    <th key={h} className="px-5 py-4 font-medium text-muted-foreground">
                      {h}
                    </th>
                  ),
                )}
                <th className="px-5 py-4 text-right font-medium text-muted-foreground"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><div className="h-3 w-28 bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 40}ms` }} /></td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-32 bg-muted rounded animate-pulse mb-1.5" style={{ animationDelay: `${i * 40}ms` }} />
                      <div className="h-2.5 w-48 bg-muted/60 rounded animate-pulse" style={{ animationDelay: `${i * 40 + 20}ms` }} />
                    </td>
                    <td className="px-5 py-4"><div className="h-5 w-14 bg-muted rounded-md animate-pulse" style={{ animationDelay: `${i * 40}ms` }} /></td>
                    <td className="px-5 py-4"><div className="h-3 w-32 bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 40}ms` }} /></td>
                    <td className="px-5 py-4"><div className="h-3 w-24 bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 40}ms` }} /></td>
                    <td className="px-5 py-4 text-right"><div className="h-3 w-8 bg-muted rounded animate-pulse ml-auto" style={{ animationDelay: `${i * 40}ms` }} /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                    No logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                    >
                      {/* TIME */}
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </td>

                      {/* ACTION */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{log.action}</p>
                        {log.message && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                            {log.message}
                          </p>
                        )}
                      </td>

                      {/* LEVEL */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${levelBadge(
                            log.level,
                          )}`}
                        >
                          {log.level}
                        </span>
                      </td>

                      {/* USER or STATUS */}
                      <td className="px-5 py-4">
                        {activeTab === "SYSTEM" ? (
                          <span
                            className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusBadge(
                              log.status,
                            )}`}
                          >
                            {log.status ?? "—"}
                          </span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-xs text-foreground/80">
                              {log.userEmail ?? "—"}
                            </span>
                            {log.status && (
                              <span
                                className={`mt-1 inline-flex w-fit rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${statusBadge(
                                  log.status,
                                )}`}
                              >
                                {log.status}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* DETAILS */}
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {log.ipAddress && <div>IP: {log.ipAddress}</div>}
                        {log.entityType && (
                          <div>
                            {log.entityType}
                            {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                          </div>
                        )}
                        {log.method && log.path && (
                          <div className="max-w-[12rem] truncate">
                            {log.method} {log.path}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="text-xs text-violet-600 dark:text-violet-400">View</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* ── PAGINATION ── */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="size-3" /> Prev
            </button>
            <span className="text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
            >
              Next <ChevronRight className="size-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors ${
        onClick ? "hover:bg-accent" : "cursor-default"
      } ${active ? "border-violet-500 ring-1 ring-violet-500/30" : "border-border"}`}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </button>
  );
}
