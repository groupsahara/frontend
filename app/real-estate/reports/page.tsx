"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/app/api/api";
import {
  Users,
  PhoneCall,
  PhoneMissed,
  TrendingUp,
  Building,
  CheckCircle2,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BarChart2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallRecord {
  id: string;
  status: string | null;
  summary: string | null;
  leadClass: string | null;
  score: number | null;
  createdAt: string;
}

interface Lead {
  id: string;
  formId: string;
  formTitle: string;
  phone: string | null;
  responses: Record<string, unknown>;
  createdAt: string;
  callMade: boolean;
  callSummary: string | null;
  calls: CallRecord[];
}

interface Conversion extends Lead {
  conversionCall: CallRecord | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  site_visit: { label: "Site Visit", color: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
  deal_closed: { label: "Deal Closed", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  intersted: { label: "Interested", color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  followup: { label: "Follow Up", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  not_interested: { label: "Not Interested", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  lost: { label: "Lost", color: "text-neutral-500 bg-neutral-500/10 border-neutral-500/20" },
};

const CLASS_LABELS: Record<string, { label: string; color: string }> = {
  hot: { label: "Hot", color: "text-red-500 bg-red-500/10 border-red-500/20" },
  warm: { label: "Warm", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  cold: { label: "Cold", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  low_priority: { label: "Low Priority", color: "text-neutral-400 bg-neutral-400/10 border-neutral-400/20" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function extractName(responses: Record<string, unknown>): string {
  const keys = Object.keys(responses);
  const nameKey = keys.find((k) =>
    /name|full.?name|customer/i.test(k),
  );
  if (nameKey) return String(responses[nameKey]);
  const first = responses[keys[0]];
  if (first && typeof first === "string" && first.length < 60) return first;
  return "—";
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const info = STATUS_LABELS[status] ?? { label: status, color: "text-muted-foreground bg-muted border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${info.color}`}>
      {info.label}
    </span>
  );
}

function ClassBadge({ cls }: { cls: string | null }) {
  if (!cls) return <span className="text-muted-foreground text-xs">—</span>;
  const info = CLASS_LABELS[cls] ?? { label: cls, color: "text-muted-foreground bg-muted border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${info.color}`}>
      {info.label}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 bg-muted/50 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function usePagination<T>(items: T[], perPage = 10) {
  const [page, setPage] = useState(1);
  const total = Math.ceil(items.length / perPage);
  const slice = items.slice((page - 1) * perPage, page * perPage);
  return { page, total, slice, setPage };
}

// ─── Leads Tab ────────────────────────────────────────────────────────────────

function LeadsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-leads"],
    queryFn: reportsApi.getLeads,
  });

  const leads: Lead[] = data?.data ?? [];
  const callsMade = leads.filter((l) => l.callMade || l.calls.length > 0).length;
  const pending = leads.length - callsMade;

  const { page, total, slice, setPage } = usePagination(leads, 10);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Leads"
          value={leads.length}
          color="bg-violet-500/10 text-violet-500"
        />
        <StatCard
          icon={<PhoneCall className="w-5 h-5" />}
          label="Calls Made"
          value={callsMade}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          icon={<PhoneMissed className="w-5 h-5" />}
          label="Pending Calls"
          value={pending}
          color="bg-amber-500/10 text-amber-500"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">All Leads</h2>
          <span className="text-xs text-muted-foreground">{leads.length} total</span>
        </div>

        {isLoading ? (
          <div className="p-5"><TableSkeleton /></div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Users className="w-8 h-8 opacity-30" />
            <p className="text-sm">No leads found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-10">#</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source Form</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Submitted</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Call Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lead Class</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((lead, idx) => {
                    const latestCall = lead.calls[0] ?? null;
                    const rowNum = (page - 1) * 10 + idx + 1;
                    return (
                      <tr key={lead.id} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">{rowNum}</td>
                        <td className="px-4 py-3.5 font-medium text-foreground max-w-40 truncate">
                          {extractName(lead.responses as Record<string, unknown>)}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">
                          {lead.phone ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 max-w-45 truncate">
                          <span className="text-xs text-foreground/80">{lead.formTitle}</span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 opacity-60" />
                            {formatDate(lead.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={latestCall?.status ?? null} />
                        </td>
                        <td className="px-4 py-3.5">
                          <ClassBadge cls={latestCall?.leadClass ?? null} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {total}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, total))}
                    disabled={page === total}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Conversions Tab ──────────────────────────────────────────────────────────

function ConversionsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-conversions"],
    queryFn: reportsApi.getConversions,
  });

  const { data: leadsData } = useQuery({
    queryKey: ["reports-leads"],
    queryFn: reportsApi.getLeads,
  });

  const conversions: Conversion[] = data?.data ?? [];
  const leads: Lead[] = leadsData?.data ?? [];

  const siteVisits = conversions.filter(
    (c) => c.conversionCall?.status === "site_visit",
  ).length;
  const dealsClosed = conversions.filter(
    (c) => c.conversionCall?.status === "deal_closed",
  ).length;
  const interested = conversions.filter(
    (c) => c.conversionCall?.status === "intersted",
  ).length;

  const totalCallsMade = leads.filter((l) => l.callMade || l.calls.length > 0).length;
  const conversionPct = totalCallsMade > 0
    ? (siteVisits / totalCallsMade) * 100
    : 0;
  const conversionDisplay = conversionPct % 1 === 0
    ? `${conversionPct.toFixed(0)}%`
    : `${conversionPct.toFixed(1)}%`;

  const { page, total, slice, setPage } = usePagination(conversions, 10);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Conversion Rate"
          value={conversionDisplay}
          color="bg-violet-500/10 text-violet-500"
        />
        <StatCard
          icon={<Building className="w-5 h-5" />}
          label="Site Visits"
          value={siteVisits}
          color="bg-sky-500/10 text-sky-500"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Deals Closed"
          value={dealsClosed}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          label="Interested"
          value={interested}
          color="bg-amber-500/10 text-amber-500"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Conversions</h2>
          <span className="text-xs text-muted-foreground">{conversions.length} total</span>
        </div>

        {isLoading ? (
          <div className="p-5"><TableSkeleton /></div>
        ) : conversions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <TrendingUp className="w-8 h-8 opacity-30" />
            <p className="text-sm">No conversions yet</p>
            <p className="text-xs opacity-70">Conversions appear when a lead books a site visit or closes a deal</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-10">#</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source Form</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conversion Type</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lead Class</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Call Summary</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((lead, idx) => {
                    const rowNum = (page - 1) * 10 + idx + 1;
                    return (
                      <tr key={lead.id} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">{rowNum}</td>
                        <td className="px-4 py-3.5 font-medium text-foreground max-w-35 truncate">
                          {extractName(lead.responses as Record<string, unknown>)}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">
                          {lead.phone ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 max-w-40 truncate">
                          <span className="text-xs text-foreground/80">{lead.formTitle}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={lead.conversionCall?.status ?? null} />
                        </td>
                        <td className="px-4 py-3.5">
                          <ClassBadge cls={lead.conversionCall?.leadClass ?? null} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {lead.conversionCall?.score != null ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {lead.conversionCall.score}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 max-w-55">
                          {lead.conversionCall?.summary ? (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {lead.conversionCall.summary}
                            </p>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 opacity-60" />
                            {lead.conversionCall
                              ? formatDate(lead.conversionCall.createdAt)
                              : formatDate(lead.createdAt)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {total}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, total))}
                    disabled={page === total}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "leads" | "conversions";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("leads");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "leads", label: "All Leads", icon: <Users className="w-4 h-4" /> },
    { id: "conversions", label: "Conversions", icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Reports</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            View all leads and track conversions from AI agent calls.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
              ${activeTab === tab.id
                ? "bg-background shadow-sm text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "leads" ? <LeadsTab /> : <ConversionsTab />}
    </div>
  );
}
