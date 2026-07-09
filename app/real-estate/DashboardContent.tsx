"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Users,
  CheckCircle2,
  ShieldAlert,
  Search,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/app/api/apiClient";
import { usePermissions } from "@/hooks/usePermissions";
import { manualLeadsApi, type ManualLead } from "@/app/api/manualLeadsApi";
import { fetchAllFormAndWhatsappLeads } from "./lead-management/lib/formLeads";
import { fromLead, fromManualLead, SOURCE_CONFIG, type UnifiedLead } from "./lead-management/lib/unifiedLeads";
import { Pagination } from "@/components/ui/Pagination";



// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
    id: string;
    title: string;
    slug: string;
    totalLeads: number;
    callsMade: number;
    progress: number;
    meetingsBooked: number;
}

interface LiveCall {
    id: string;
    name: string;
    phone: string;
    company: string;
    role: string;
    campaignTitle: string;
    startedAt: string;
}

interface ClientDetail {
    id: string;
    name: string;
    companyName: string | null;
    email: string;
    phone: string | null;
    isBlocked: boolean;
    createdAt: string;
    projectCount: number;
    userCount: number;
    callCount: number;
}

interface DashboardStats {
    role?: "super_admin" | "admin" | "user";
    totalCalls: number;
    todaysCalls: number;
    meetingsBooked: number;
    totalUsers: number;
    totalLeads: number;
    campaigns?: Campaign[];
    liveCalls?: LiveCall[];
    hourlyCalls?: Array<{ hour: string; count: number }>;
    outcomes?: {
        interested: number;
        followup: number;
        siteVisit: number;
        dealClosed: number;
    };
    totalClients?: number;
    activeClients?: number;
    blockedClients?: number;
    clients?: ClientDetail[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProgressColor(progress: number): string {
    if (progress >= 70) return "bg-[#4ade80]";
    if (progress >= 40) return "bg-[#3b82f6]";
    return "bg-[#a1a1aa]";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KpiSkeleton() {
    return (
        <div className="animate-pulse bg-accent border border-border rounded-lg p-5 h-25">
            <div className="h-3 w-24 bg-muted rounded mb-3" />
            <div className="h-7 w-16 bg-muted rounded mb-2" />
            <div className="h-3 w-32 bg-muted rounded" />
        </div>
    );
}

function CampaignRowSkeleton() {
    return (
        <tr>
            <td className="px-5 py-4"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></td>
            <td className="px-5 py-4"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
            <td className="px-5 py-4"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
            <td className="px-5 py-4"><div className="h-4 w-10 bg-muted rounded animate-pulse" /></td>
            <td className="px-5 py-4"><div className="h-4 w-8 bg-muted rounded animate-pulse" /></td>
        </tr>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

function LiveCallRow({ call }: { call: LiveCall }) {
    const displayInfo = [call.company, call.role].filter(Boolean).join(" · ");

    return (
        <div className="rounded-lg border border-border bg-background p-4 border-l-2 border-l-[#4ade80]">
            <div className="flex justify-between items-start mb-1">
                <p className="text-sm font-medium text-foreground">{call.name}</p>
            </div>
            {displayInfo ? (
                <p className="text-xs text-muted-foreground mb-3">{displayInfo}</p>
            ) : (
                <p className="text-xs text-muted-foreground mb-3">{call.phone}</p>
            )}
            <div className="flex gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[11px] border border-border text-muted-foreground">
                    {call.campaignTitle}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] border border-[#4ade80]/20 text-[#4ade80] bg-[#4ade80]/5 animate-pulse">
                    Live Call
                </span>
            </div>
        </div>
    );
}

export default function DashboardContent() {
    const { isSuperAdmin, roleNames } = usePermissions();
    const primaryRole = roleNames?.[0] ?? "";
    const isTenantAdmin = primaryRole.toLowerCase().replace(/[_\s]/g, "") === "admin";
    const isAgent = !isSuperAdmin && !isTenantAdmin;

    const { data, isLoading } = useQuery<DashboardStats>({
        queryKey: ["dashboard-stats"],
        queryFn: async () => {
            const res = await apiClient.get("/api/calls/dashboard-stats");
            return res.data.data as DashboardStats;
        },
        staleTime: 3 * 1000,
        refetchInterval: 5 * 1000,
        // Don't poll when the tab is hidden — keeps the page eligible for
        // the back/forward cache (bfcache) and avoids wasted requests.
        refetchIntervalInBackground: false,
    });

    const stats: DashboardStats = data ?? {
        totalCalls: 0,
        todaysCalls: 0,
        meetingsBooked: 0,
        totalUsers: 0,
        totalLeads: 0,
        campaigns: [],
        liveCalls: [],
        hourlyCalls: [],
        totalClients: 0,
        activeClients: 0,
        blockedClients: 0,
        clients: [],
    };

    // Client search state for Super Admin
    const [searchQuery, setSearchQuery] = useState("");

    // All Leads (from Manage Leads) — Admin/Agent dashboard
    const { data: formAndWhatsappLeads = [] } = useQuery({
        queryKey: ["form-whatsapp-leads-all"],
        queryFn: fetchAllFormAndWhatsappLeads,
        staleTime: 30 * 1000,
        enabled: !isSuperAdmin,
    });

    const { data: manualLeads = [] } = useQuery<ManualLead[]>({
        queryKey: ["manual-leads"],
        queryFn: manualLeadsApi.getAll,
        enabled: !isSuperAdmin,
    });

    const allLeads = useMemo<UnifiedLead[]>(() => {
        const merged: UnifiedLead[] = [
            ...formAndWhatsappLeads.map((l) => fromLead(l, l.type === "whatsapp" ? "whatsapp" : "form")),
            ...manualLeads.map(fromManualLead),
        ];
        return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [formAndWhatsappLeads, manualLeads]);

    const [leadSearch, setLeadSearch] = useState("");
    const [leadPage, setLeadPage] = useState(1);
    const [leadsPerPage, setLeadsPerPage] = useState(10);

    const filteredLeads = useMemo(() => {
        const q = leadSearch.toLowerCase().trim();
        if (!q) return allLeads;
        return allLeads.filter(
            (l) =>
                l.name.toLowerCase().includes(q) ||
                l.phone.toLowerCase().includes(q) ||
                l.project.toLowerCase().includes(q)
        );
    }, [allLeads, leadSearch]);

    const leadTotalPages = Math.max(1, Math.ceil(filteredLeads.length / leadsPerPage));
    const safeLeadPage = Math.min(leadPage, leadTotalPages);
    const paginatedLeads = filteredLeads.slice((safeLeadPage - 1) * leadsPerPage, safeLeadPage * leadsPerPage);

    const filteredClients = useMemo(() => {
        if (!stats.clients) return [];
        const q = searchQuery.toLowerCase();
        return stats.clients.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.companyName && c.companyName.toLowerCase().includes(q)) ||
                c.email.toLowerCase().includes(q)
        );
    }, [stats.clients, searchQuery]);

    const hourlyData = (stats.hourlyCalls && stats.hourlyCalls.length > 0)
        ? (() => {
              const maxCount = Math.max(...stats.hourlyCalls.map((item) => item.count), 1);
              return stats.hourlyCalls.map((item) => ({
                  hour: item.hour,
                  count: item.count,
                  height: `${Math.round((item.count / maxCount) * 100)}%`,
                  active: item.count > 0,
              }));
          })()
        : [
              { hour: '9', count: 12, height: '12%', active: false },
              { hour: '10', count: 8, height: '8%', active: false },
              { hour: '11', count: 24, height: '24%', active: false },
              { hour: '12', count: 48, height: '45%', active: false },
              { hour: '13', count: 86, height: '62%', active: false },
              { hour: '14', count: 104, height: '70%', active: false },
              { hour: '15', count: 182, height: '85%', active: true },
              { hour: '16', count: 219, height: '92%', active: true },
              { hour: '17', count: 247, height: '98%', active: true },
              { hour: '18', count: 198, height: '88%', active: true },
              { hour: '19', count: 135, height: '68%', active: false },
              { hour: '20', count: 92, height: '48%', active: false },
          ];

    const outcomes = stats.outcomes
        ? [
              { label: 'Interested', count: stats.outcomes.interested, dotColor: 'bg-[#3b82f6]' },
              { label: 'Call Connected', count: stats.outcomes.followup, dotColor: 'bg-[#6366f1]' },
              { label: 'Site Visit', count: stats.outcomes.siteVisit, dotColor: 'bg-[#10b981]' },
              { label: 'Deal Closed', count: stats.outcomes.dealClosed, dotColor: 'bg-[#22c55e]' },
          ]
        : [
              { label: 'Interested', count: 0, dotColor: 'bg-[#3b82f6]' },
              { label: 'Call Connected', count: stats.totalCalls, dotColor: 'bg-[#6366f1]' },
              { label: 'Site Visit', count: stats.meetingsBooked, dotColor: 'bg-[#10b981]' },
              { label: 'Deal Closed', count: 0, dotColor: 'bg-[#22c55e]' },
          ];

    const totalOutcomes = outcomes.reduce((s, o) => s + o.count, 0);

    const displayAgents = [
        {
            name: 'Gemini',
            avatar: 'G',
            stats: `${stats.totalCalls} call${stats.totalCalls !== 1 ? 's' : ''} · ${stats.liveCalls && stats.liveCalls.length > 0 ? 'On Call' : 'Standby'}`,
            status: stats.liveCalls && stats.liveCalls.length > 0 ? 'Busy' : 'Active',
            avatarClass: 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/30',
            badgeClass: stats.liveCalls && stats.liveCalls.length > 0 
                ? 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-850/30'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30'
        }
    ];

    // Helper to get initials
    const getInitials = (name: string) => {
        return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    };

    const AVATAR_COLORS = [
        "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
        "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500", "bg-teal-500",
    ];
      
    const avatarColor = (id: string) => {
        const total = id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
        return AVATAR_COLORS[total % AVATAR_COLORS.length];
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: SUPER ADMIN DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    if (isSuperAdmin) {
        return (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500">
                                <ShieldCheck className="w-5 h-5" />
                            </span>
                            <h1 className="text-xl font-bold text-foreground tracking-tight">Platform Admin Console</h1>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            System Overview · {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                    </div>
                    <div className="flex gap-2.5 w-full md:w-auto">
                        <Link
                            href="/real-estate/client-management/manage-clients"
                            className="flex-1 md:flex-none h-9 px-4 text-xs font-semibold rounded-lg border border-border bg-card text-card-foreground flex items-center justify-center hover:bg-accent transition-colors duration-200"
                        >
                            Manage Clients
                        </Link>
                        <Link
                            href="/real-estate/client-management/add-clients"
                            className="flex-1 md:flex-none h-9 px-4 text-xs font-semibold rounded-lg bg-violet-600 text-white flex items-center justify-center hover:bg-violet-500 transition-colors duration-200"
                        >
                            Register Client
                        </Link>
                    </div>
                </div>

                {/* Super Admin KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoading ? (
                        <>
                            <KpiSkeleton />
                            <KpiSkeleton />
                            <KpiSkeleton />
                            <KpiSkeleton />
                        </>
                    ) : (
                        <>
                            {/* Total Clients */}
                            <div className="bg-[#F5F3FF] dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/30 rounded-xl p-5 hover:shadow-md hover:shadow-violet-500/5 transition-colors duration-300 group">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Total Clients</p>
                                    <Building2 className="w-4 h-4 text-violet-500 group-hover:scale-110 transition-transform duration-200" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mb-1">{(stats.totalClients ?? 0).toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground">registered tenants</p>
                            </div>

                            {/* Active Clients */}
                            <div className="bg-[#ECFDF5] dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-5 hover:shadow-md hover:shadow-emerald-500/5 transition-colors duration-300 group relative overflow-hidden">
                                <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping m-3" />
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Clients</p>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform duration-200" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mb-1">{(stats.activeClients ?? 0).toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground">fully active tenants</p>
                            </div>

                            {/* Blocked Clients */}
                            <div className="bg-[#FEF2F2] dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-5 hover:shadow-md hover:shadow-rose-500/5 transition-colors duration-300 group">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Blocked Clients</p>
                                    <ShieldAlert className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform duration-200" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mb-1">{(stats.blockedClients ?? 0).toLocaleString()}</p>
                                <p className="text-[10px] text-rose-500/80">suspended tenants</p>
                            </div>

                            {/* Total Users */}
                            <div className="bg-[#ECFEFF] dark:bg-cyan-950/10 border border-cyan-100 dark:border-cyan-900/30 rounded-xl p-5 hover:shadow-md hover:shadow-cyan-500/5 transition-colors duration-300 group">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Platform Users</p>
                                    <Users className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform duration-200" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mb-1">{(stats.totalUsers ?? 0).toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground">aggregate user count</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Super Admin Layout: Client list & traffic */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-500">
                    {/* Left: Tenants Directory */}
                    <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
                        <div>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center px-5 py-4 border-b border-border gap-3">
                                <div>
                                    <h2 className="text-sm font-bold text-foreground">Tenant Directories</h2>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">List of registered client companies & current usage</p>
                                </div>
                                <div className="relative max-w-xs w-full">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search tenants..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full text-xs bg-muted border border-border rounded-lg pl-8 pr-3 py-1.5 text-foreground outline-none focus:border-violet-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40">
                                            <th className="px-5 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Client / Company</th>
                                            <th className="px-5 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                            <th className="px-5 py-3 font-semibold text-muted-foreground text-center uppercase tracking-wider">Projects</th>
                                            <th className="px-5 py-3 font-semibold text-muted-foreground text-center uppercase tracking-wider">Users</th>
                                            <th className="px-5 py-3 font-semibold text-muted-foreground text-center uppercase tracking-wider">Calls</th>
                                            <th className="px-5 py-3 font-semibold text-muted-foreground text-right uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {isLoading ? (
                                            <>
                                                <CampaignRowSkeleton />
                                                <CampaignRowSkeleton />
                                                <CampaignRowSkeleton />
                                            </>
                                        ) : filteredClients.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                                                    No tenants found matching your query.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredClients.map((client) => (
                                                <tr key={client.id} className="hover:bg-accent/25 transition-colors">
                                                    {/* Client and Company */}
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`flex w-8 h-8 rounded-full items-center justify-center text-xs font-bold text-white shrink-0 ${avatarColor(client.id)}`}>
                                                                {getInitials(client.name)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-foreground truncate">{client.name}</p>
                                                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{client.companyName ?? "Unknown Company"}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Status badge */}
                                                    <td className="px-5 py-3.5">
                                                        {client.isBlocked ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                                                Blocked
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                Active
                                                            </span>
                                                        )}
                                                    </td>
                                                    {/* Project Count */}
                                                    <td className="px-5 py-3.5 text-center text-foreground font-medium">
                                                        {client.projectCount}
                                                    </td>
                                                    {/* User Count */}
                                                    <td className="px-5 py-3.5 text-center text-foreground font-medium">
                                                        {client.userCount}
                                                    </td>
                                                    {/* Call Count */}
                                                    <td className="px-5 py-3.5 text-center text-foreground font-semibold">
                                                        {client.callCount}
                                                    </td>
                                                    {/* Actions link */}
                                                    <td className="px-5 py-3.5 text-right">
                                                        <Link
                                                            href="/real-estate/client-management/manage-clients"
                                                            className="inline-flex items-center gap-1 text-xs text-violet-500 hover:text-violet-600 font-semibold transition-colors"
                                                        >
                                                            Manage <ExternalLink className="w-3 h-3" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-end">
                            <Link href="/real-estate/client-management/manage-clients" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                                View all clients →
                            </Link>
                        </div>
                    </div>

                    {/* Right: Metrics */}
                    <div className="flex flex-col gap-6">
                        {/* Traffic */}
                        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between min-h-55">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-foreground">Global Calls by Hour</h3>
                                <span className="text-[10px] text-violet-500 font-bold">System Load</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-end">
                                <div className="flex justify-between items-end gap-1.5 h-24 px-1">
                                    {hourlyData.map((item, idx) => (
                                        <div key={idx} className="flex-1 flex flex-col justify-end items-center h-full group relative">
                                            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                                                <div className="bg-popover border border-border text-[9px] text-popover-foreground font-mono rounded px-1.5 py-0.5 shadow-md whitespace-nowrap">
                                                    {item.count} calls
                                                </div>
                                                <div className="w-1.5 h-1.5 bg-popover border-r border-b border-border rotate-45 -mt-1" />
                                            </div>
                                            <div
                                                style={{ height: item.height, willChange: 'transform' }}
                                                className={`w-full max-w-4.5 rounded-t-[3px] transition-transform duration-300 group-hover:scale-y-105 cursor-pointer ${item.active
                                                    ? 'bg-violet-500'
                                                    : 'bg-zinc-800/40 group-hover:bg-zinc-700/60'
                                                    }`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center px-1 mt-2">
                                    {hourlyData.map((item, idx) => (
                                        <span key={idx} className="flex-1 text-[9px] text-center font-medium text-muted-foreground">
                                            {item.hour}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Outcomes */}
                        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between min-h-55">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-foreground">Global Call Outcomes</h3>
                                <div className="text-[10px] text-violet-500 font-bold flex items-center gap-0.5">
                                    System Stats
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-center gap-2">
                                {outcomes.map((item, idx) => {
                                    const pct = totalOutcomes > 0 ? Math.round((item.count / totalOutcomes) * 100) : 0;
                                    return (
                                        <div key={idx} className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-accent/20 transition-colors">
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${item.dotColor}`} />
                                                <span className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <div className="text-[11px] font-semibold text-foreground tabular-nums">
                                                {item.count}{" "}
                                                <span className="text-[9px] text-muted-foreground font-normal ml-1">({pct}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: ADMIN OR USER/AGENT DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-foreground tracking-tight">
                        {isAgent ? "Agent Workspace" : "Campaign Dashboard"}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {isAgent ? "Welcome back! Here is your performance overview." : `Tenant Administration Dashboard`}
                        {stats.campaigns && stats.campaigns.length > 0 && ` · ${stats.campaigns.length} campaign${stats.campaigns.length !== 1 ? "s" : ""} running`}
                    </p>
                </div>
                {/* Buttons are hidden for standard users/agents */}
                {!isAgent && (
                    <div className="flex gap-2 w-full md:w-auto animate-in slide-in-from-right duration-300">
                        <Link href="/real-estate/form/create-your-own" className="flex-1 md:flex-none h-9 px-4 text-sm font-medium rounded-md btn-dashboard-primary transition-colors shadow-sm flex items-center justify-center">
                            New Campaign
                        </Link>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading ? (
                    <>
                        <KpiSkeleton />
                        <KpiSkeleton />
                        <KpiSkeleton />
                        <KpiSkeleton />
                    </>
                ) : (
                    <>
                        {/* 1 — Total Leads */}
                        <div className="bg-[#FFE6E7] border border-border rounded-lg p-5 hover:shadow-sm transition-colors duration-300">
                            <p className="text-xs font-semibold text-[#131517]/60 uppercase tracking-wider mb-3">Total Leads</p>
                            <p className="text-2xl font-bold text-[#131517] mb-1.5">{allLeads.length.toLocaleString()}</p>
                            <p className="text-xs text-[#131517]/50 font-normal">all time</p>
                        </div>
                        {/* 2 — Total Calls */}
                        <div className="bg-[#F2F2FF] border border-border rounded-lg p-5 hover:shadow-sm transition-colors duration-300">
                            <p className="text-xs font-semibold text-[#131517]/60 uppercase tracking-wider mb-3">Total Calls</p>
                            <p className="text-2xl font-bold text-[#131517] mb-1.5">{(stats.totalCalls ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-[#131517]/50 font-normal">all time</p>
                        </div>
                        {/* 3 — Today's Calls */}
                        <div className="bg-[#DAFFFA] border border-border rounded-lg p-5 hover:shadow-sm transition-colors duration-300">
                            <p className="text-xs font-semibold text-[#131517]/60 uppercase tracking-wider mb-3">Today&apos;s Calls</p>
                            <p className="text-2xl font-bold text-[#131517] mb-1.5">{(stats.todaysCalls ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-[#131517]/50 font-normal">since midnight</p>
                        </div>
                        {/* 4 — Total Users (excludes the tenant's admin account) */}
                        <div className="bg-[#DEF6FE] border border-border rounded-lg p-5 hover:shadow-sm transition-colors duration-300">
                            <p className="text-xs font-semibold text-[#131517]/60 uppercase tracking-wider mb-3">Total Users</p>
                            <p className="text-2xl font-bold text-[#131517] mb-1.5">{Math.max(0, (stats.totalUsers ?? 0) - 1).toLocaleString()}</p>
                            <p className="text-xs text-[#131517]/50 font-normal">registered users</p>
                        </div>
                    </>
                )}
            </div>
            {/* Bottom Tables */}
            <div
                className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4"
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}
            >
                {/* Active Campaigns / Forms Table */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-5 py-4 border-b border-border">
                        <h2 className="text-sm font-semibold text-foreground">Active Campaigns</h2>
                        {/* Link hidden for agents as they cannot manage forms */}
                        {!isAgent && (
                            <Link href="/real-estate/form/manage-forms" className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                                View all →
                            </Link>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-125 text-left">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign</th>
                                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Called</th>
                                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Booked</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <>
                                        <CampaignRowSkeleton />
                                        <CampaignRowSkeleton />
                                        <CampaignRowSkeleton />
                                    </>
                                ) : (!stats.campaigns || stats.campaigns.length === 0) ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                            No campaigns yet. {isAgent ? "Wait for your admin to create a form." : "Create a form to get started."}
                                        </td>
                                    </tr>
                                ) : (
                                    stats.campaigns.map((campaign) => {
                                        const isActive = campaign.totalLeads > 0 && campaign.progress < 100;
                                        const isDone = campaign.progress === 100;
                                        const isDraft = campaign.totalLeads === 0;
                                        const barColor = getProgressColor(campaign.progress);

                                        return (
                                            <tr key={campaign.id} className="hover:bg-accent/30 transition-colors">
                                                <td className="px-5 py-4">
                                                    <p className="text-sm font-medium text-foreground">{campaign.title}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {campaign.totalLeads} lead{campaign.totalLeads !== 1 ? "s" : ""} · {campaign.slug}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {isDraft ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-accent text-muted-foreground border border-border">
                                                            <span className="w-1 h-1 rounded-full bg-[#a1a1aa]" />Draft
                                                        </span>
                                                    ) : isDone ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                                                            <span className="w-1 h-1 rounded-full bg-[#3b82f6]" />Done
                                                        </span>
                                                    ) : isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">
                                                            <span className="w-1 h-1 rounded-full bg-[#4ade80]" />Running
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">
                                                            <span className="w-1 h-1 rounded-full bg-[#4ade80]" />Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {isDraft ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-20 h-1.5 bg-accent rounded-full overflow-hidden" />
                                                            <span className="text-xs text-muted-foreground tabular-nums">—</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-20 h-1.5 bg-accent rounded-full overflow-hidden">
                                                                 <div className={`h-full rounded-full ${barColor}`} style={{ width: `${campaign.progress}%` }} />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground tabular-nums">{campaign.progress}%</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-foreground tabular-nums">
                                                    {isDraft ? "—" : `${campaign.callsMade}/${campaign.totalLeads}`}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-foreground tabular-nums">
                                                    {campaign.meetingsBooked > 0 ? campaign.meetingsBooked : isDraft ? "—" : 0}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Live Calls Panel */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-5 py-4 border-b border-border">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-foreground">Live Calls</h2>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">
                                {stats.todaysCalls} today
                            </span>
                        </div>
                    </div>

                    <div className="p-4 flex flex-col gap-3">
                        {stats.liveCalls && stats.liveCalls.length > 0 ? (
                            stats.liveCalls.map((call) => (
                                <LiveCallRow key={call.id} call={call} />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <p className="text-xs text-muted-foreground">No active calls at the moment</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* All Leads (from Manage Leads) */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 px-5 py-4 border-b border-border">
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">All Leads</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {allLeads.length} lead{allLeads.length !== 1 ? "s" : ""} across all sources
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-56">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search name, phone, project..."
                                value={leadSearch}
                                onChange={(e) => {
                                    setLeadSearch(e.target.value);
                                    setLeadPage(1);
                                }}
                                className="w-full text-xs bg-muted border border-border rounded-lg pl-8 pr-3 py-1.5 text-foreground outline-none focus:border-ring transition-colors"
                            />
                        </div>
                        <Link
                            href="/real-estate/lead-management"
                            className="shrink-0 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                            View all →
                        </Link>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-175 text-left">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                        {leadSearch ? "No leads match your search." : "No leads yet."}
                                    </td>
                                </tr>
                            ) : (
                                paginatedLeads.map((lead) => {
                                    const cfg = SOURCE_CONFIG[lead.source];
                                    return (
                                        <tr key={lead.id} className="hover:bg-accent/30 transition-colors">
                                            <td className="px-5 py-3.5 text-sm font-medium text-foreground">{lead.name}</td>
                                            <td className="px-5 py-3.5 text-sm text-muted-foreground">{lead.project || "—"}</td>
                                            <td className="px-5 py-3.5 text-sm text-muted-foreground tabular-nums">{lead.phone || "—"}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                                    <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />{cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-muted-foreground">{lead.statusLabel}</td>
                                            <td className="px-5 py-3.5 text-sm text-muted-foreground tabular-nums">
                                                {new Date(lead.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={safeLeadPage}
                    totalPages={leadTotalPages}
                    onPageChange={setLeadPage}
                    totalItems={filteredLeads.length}
                    itemsPerPage={leadsPerPage}
                    onItemsPerPageChange={(n) => {
                        setLeadsPerPage(n);
                        setLeadPage(1);
                    }}
                />
            </div>

            {/* Trends & AI Agents Section */}
            <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}
            >
                {/* Calls by Hour */}
                <div className="bg-card border border-border rounded-lg p-4 flex flex-col justify-between min-h-57.5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-foreground">Calls by Hour</h3>
                        <span className="text-xs text-blue-500 font-semibold hover:text-blue-400 transition-colors cursor-pointer">Today</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-end">
                        <div className="flex justify-between items-end gap-1.5 h-24 px-1">
                            {hourlyData.map((item, idx) => (
                                <div key={idx} className="flex-1 flex flex-col justify-end items-center h-full group relative">
                                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                                        <div className="bg-popover border border-border text-[10px] text-popover-foreground font-mono rounded px-1.5 py-0.5 shadow-md whitespace-nowrap">
                                            {item.count} calls
                                        </div>
                                        <div className="w-1.5 h-1.5 bg-popover border-r border-b border-border rotate-45 -mt-1" />
                                    </div>
                                    <div
                                        style={{ height: item.height, willChange: 'transform' }}
                                        className={`w-full max-w-4.5 rounded-t-[3px] transition-transform duration-300 group-hover:scale-y-105 cursor-pointer ${item.active
                                            ? 'bg-[#3b82f6]'
                                            : 'bg-zinc-800/40 group-hover:bg-zinc-700/60'
                                            }`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center px-1 mt-2">
                            {hourlyData.map((item, idx) => (
                                <span key={idx} className="flex-1 text-[10px] text-center font-medium text-muted-foreground">
                                    {item.hour}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Call Outcomes */}
                <div className="bg-card border border-border rounded-lg p-4 flex flex-col justify-between min-h-57.5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-foreground">Call Outcomes</h3>
                        <a className="text-xs text-blue-500 hover:text-blue-400 font-semibold flex items-center gap-0.5 transition-colors cursor-pointer group">
                            Insights <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </a>
                    </div>
                    <div className="flex-1 flex flex-col justify-center gap-2">
                        {outcomes.map((item, idx) => {
                            const pct = totalOutcomes > 0 ? Math.round((item.count / totalOutcomes) * 100) : 0;
                            return (
                                <div key={idx} className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-accent/20 transition-colors">
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${item.dotColor}`} />
                                        <span className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default">
                                            {item.label}
                                        </span>
                                    </div>
                                    <div className="text-xs font-semibold text-foreground tabular-nums">
                                        {item.count}{" "}
                                        <span className="text-[10px] text-muted-foreground font-normal ml-1">({pct}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AI Agents */}
                <div className="bg-card border border-border rounded-lg p-4 flex flex-col justify-between min-h-57.5">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-foreground">AI Agents</h3>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                        {displayAgents.map((agent, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-50/30 dark:hover:bg-zinc-950/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-colors duration-300">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-semibold ${agent.avatarClass}`}>
                                        {agent.avatar}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-medium text-foreground leading-tight">{agent.name}</h4>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{agent.stats}</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium border transition-colors ${agent.badgeClass}`}>
                                    {agent.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
