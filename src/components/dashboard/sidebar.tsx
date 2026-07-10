"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BagIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  CartIcon,
  ChartIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  FileTextIcon,
  GridIcon,
  ImageIcon,
  LogoutIcon,
  MailIcon,
  MapPinIcon,
  MonitorIcon,
  PaletteIcon,
  PolygonIcon,
  RouteIcon,
  SettingsIcon,
  ShieldIcon,
  SmartphoneIcon,
  StarIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
  WalletIcon,
  WarehouseIcon,
  WrenchIcon,
} from "@/src/components/icons";
import { getPermissions, getStoredUser } from "@/src/lib/auth";
import type { ComponentType, SVGProps } from "react";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

// `permission` gates visibility for STAFF users (admins hold "*"). Leaves
// without a permission are visible to every panel session.
type NavLeaf = { label: string; href: string; icon: IconType; permission?: string };
type NavGroup = { label: string; icon: IconType; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

// Sections of the classic admin panel — hidden entirely from STAFF logins.
const ADMIN_NAV: NavEntry[] = [
  { label: "Overview", href: "/dashboard", icon: GridIcon },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartIcon, permission: "analytics.view" },
  { label: "Categories", href: "/dashboard/categories", icon: StoreIcon, permission: "categories.view" },
  { label: "Banner", href: "/dashboard/banners", icon: ImageIcon, permission: "banners.view" },
  { label: "Bookings", href: "/dashboard/bookings", icon: BagIcon, permission: "bookings.view" },
  {
    label: "Dispatcher",
    icon: MapPinIcon,
    children: [
      { label: "Service Partners", href: "/dashboard/dispatcher/partners", icon: UsersIcon, permission: "partners.view" },
      { label: "Teams", href: "/dashboard/dispatcher/teams", icon: UsersIcon, permission: "dispatcher.view" },
      { label: "Geo Fence", href: "/dashboard/dispatcher/geo-fence", icon: PolygonIcon, permission: "dispatcher.view" },
      { label: "Warehouses", href: "/dashboard/dispatcher/warehouses", icon: WarehouseIcon, permission: "dispatcher.view" },
      { label: "Auto Allocation", href: "/dashboard/dispatcher/allocation", icon: RouteIcon, permission: "dispatcher.view" },
      { label: "Pricing Rules", href: "/dashboard/dispatcher/pricing", icon: TagIcon, permission: "dispatcher.view" },
      { label: "Partner Wallets", href: "/dashboard/dispatcher/wallets", icon: WalletIcon, permission: "wallets.view" },
      { label: "Partner Payouts", href: "/dashboard/dispatcher/payouts", icon: WalletIcon, permission: "payouts.view" },
      { label: "Referrals", href: "/dashboard/dispatcher/referrals", icon: TagIcon, permission: "referrals.view" },
    ],
  },
  { label: "Contacts", href: "/dashboard/contacts", icon: MailIcon, permission: "contact.view" },
  { label: "Vendors", href: "/dashboard/vendors", icon: CartIcon, permission: "vendors.view" },
  { label: "Payments", href: "/dashboard/payments", icon: WalletIcon },
  {
    label: "Styling",
    icon: PaletteIcon,
    children: [
      { label: "Web Styling", href: "/dashboard/styling/web", icon: MonitorIcon },
      { label: "Mobile Styling", href: "/dashboard/styling/mobile", icon: SmartphoneIcon },
    ],
  },
  {
    label: "Tools",
    icon: WrenchIcon,
    children: [
      { label: "PDF Editor", href: "/dashboard/tools/pdf-editor", icon: FileTextIcon },
      { label: "Resume Builder", href: "/dashboard/tools/resume-builder", icon: ClipboardIcon },
    ],
  },
  { label: "Settings", href: "/dashboard/settings", icon: SettingsIcon, permission: "settings.view" },
];

const CRM_NAV: NavGroup = {
  label: "CRM",
  icon: BriefcaseIcon,
  children: [
    { label: "CRM Overview", href: "/dashboard/crm", icon: GridIcon, permission: "crm.view" },
    { label: "Customers", href: "/dashboard/crm/customers", icon: UsersIcon, permission: "customers.view" },
    { label: "Partners", href: "/dashboard/crm/partners", icon: UsersIcon, permission: "partners.view" },
    { label: "Bookings", href: "/dashboard/crm/bookings", icon: BagIcon, permission: "bookings.view" },
  ],
};

const HR_NAV: NavGroup = {
  label: "HR Management",
  icon: UsersIcon,
  children: [
    { label: "Employees", href: "/dashboard/crm/employees", icon: BriefcaseIcon, permission: "employees.view" },
    { label: "Attendance", href: "/dashboard/crm/attendance", icon: ClockIcon, permission: "attendance.view" },
    { label: "Leaves", href: "/dashboard/crm/leaves", icon: CalendarIcon, permission: "leaves.view" },
    { label: "Appraisals", href: "/dashboard/crm/appraisals", icon: StarIcon, permission: "appraisals.view" },
    { label: "HR Settings", href: "/dashboard/crm/hr-settings", icon: ClipboardIcon, permission: "departments.view" },
  ],
};

const ACCESS_NAV: NavGroup = {
  label: "Roles & Permissions",
  icon: ShieldIcon,
  children: [
    { label: "Roles & Permissions", href: "/dashboard/crm/roles", icon: ShieldIcon, permission: "roles.view" },
    { label: "Staff", href: "/dashboard/crm/staff", icon: UsersIcon, permission: "staff.view" },
  ],
};

// Multi-tenant SaaS platform (mounted at /real-estate). The platform-operator
// features — dashboard, client/tenant management, AI training and audit logs —
// are surfaced here in the panel as a SaaS dropdown so they're reachable
// without entering the sub-app; the tenant-facing CRM modules keep their own
// nav inside the /real-estate shell.
// Every child is gated on "saas.view" so the whole SaaS tab is hidden unless a
// role has been granted SaaS access (super admins hold "*"). Without the grant
// the group has no visible children and drops out of the nav entirely.
const REAL_ESTATE_NAV: NavGroup = {
  label: "SaaS",
  icon: BuildingIcon,
  children: [
    { label: "Dashboard", href: "/real-estate", icon: GridIcon, permission: "saas.view" },
    { label: "Add Clients", href: "/real-estate/client-management/add-clients", icon: UsersIcon, permission: "saas.view" },
    { label: "Manage Clients", href: "/real-estate/client-management/manage-clients", icon: UsersIcon, permission: "saas.view" },
    { label: "AI Training", href: "/real-estate/ai-training", icon: MonitorIcon, permission: "saas.view" },
    { label: "Audit Logs", href: "/real-estate/audit-logs", icon: FileTextIcon, permission: "saas.view" },
  ],
};

// Admins get the classic panel plus the full CRM and HR groups. STAFF members
// get the CRM/HR sections plus any admin modules their roles grant — admin
// entries WITHOUT a permission (Overview, Payments, Styling, …) stay
// admin-only and never appear for staff.
function buildNav(): NavEntry[] {
  const user = getStoredUser();
  const perms = getPermissions();
  const allowed = (leaf: NavLeaf) =>
    !leaf.permission || perms.includes("*") || perms.includes(leaf.permission);
  const groups = [CRM_NAV, HR_NAV, REAL_ESTATE_NAV, ACCESS_NAV]
    .map((g) => ({ ...g, children: g.children.filter(allowed) }))
    .filter((g) => g.children.length > 0);
  if (user?.role === "STAFF") {
    const staffAllowed = (leaf: NavLeaf) => !!leaf.permission && allowed(leaf);
    const adminEntries = ADMIN_NAV.map((entry) =>
      "children" in entry ? { ...entry, children: entry.children.filter(staffAllowed) } : entry,
    ).filter((entry) =>
      "children" in entry ? entry.children.length > 0 : staffAllowed(entry),
    );
    const entries = [...adminEntries, ...groups];
    // Settings always sits last, matching the admin layout.
    const settingsIdx = entries.findIndex(
      (e) => "href" in e && e.href === "/dashboard/settings",
    );
    if (settingsIdx !== -1) entries.push(...entries.splice(settingsIdx, 1));
    return entries;
  }
  return [...ADMIN_NAV.slice(0, 1), ...groups, ...ADMIN_NAV.slice(1)];
}

/** Every page link the current session may open (STAFF: permission-gated). */
function allowedLeaves(): NavLeaf[] {
  return buildNav().flatMap((entry) => ("children" in entry ? entry.children : [entry]));
}

/**
 * Where to land after login: admins get the overview; STAFF get their first
 * granted page (e.g. Analytics for an analytics+settings role).
 */
export function firstAllowedRoute(): string {
  const user = getStoredUser();
  // Tenant (SaaS) users don't belong in the admin panel — send them straight
  // into the /real-estate section, which is scoped to their tenant.
  if (isTenantUser()) return "/real-estate";
  if (user?.role !== "STAFF") return "/dashboard";
  return allowedLeaves()[0]?.href ?? "/dashboard";
}

// A tenant user is any signed-in account that is not a platform role
// (ADMIN / SUPER_ADMIN / STAFF) — e.g. a multi-tenant CRM member.
export function isTenantUser(): boolean {
  const role = getStoredUser()?.role;
  return !!role && role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "STAFF";
}

/**
 * Whether the current session may view a pathname — used by the dashboard
 * layout to bounce STAFF off pages their roles don't grant (deep links).
 */
export function routeAllowed(pathname: string): boolean {
  const user = getStoredUser();
  if (user?.role !== "STAFF") return true;
  return allowedLeaves().some((leaf) => leafActive(leaf.href, pathname));
}

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile, onLogout }: SidebarProps) {
  const pathname = usePathname();
  // Safe to read localStorage here: the dashboard layout only mounts the
  // sidebar after the client-side auth check, so this never runs during SSR.
  const nav = buildNav();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "lg:w-20" : "lg:w-64",
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex h-16 items-center gap-3 border-b border-border px-5 transition-opacity hover:opacity-80"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://restocare-asset.s3.ap-south-1.amazonaws.com/Clientlogo/6985da0674994.png"
            alt="RestoCare Logo"
            className="h-9 w-auto shrink-0"
          />
          {!collapsed && (
            <span className="truncate text-lg font-semibold text-foreground">RestoCare</span>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((entry) =>
            isGroup(entry) ? (
              <NavGroupItem
                key={entry.label}
                group={entry}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onCloseMobile}
              />
            ) : (
              <NavLeafLink
                key={entry.href}
                leaf={entry}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onCloseMobile}
              />
            ),
          )}
        </nav>

        {/* Footer / logout */}
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
            className={[
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-danger/10 hover:text-danger",
              collapsed ? "lg:justify-center" : "",
            ].join(" ")}
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// Section roots ("/dashboard", "/dashboard/crm") match exactly, else every
// child page would light them (and their group) up too.
const EXACT_HREFS = new Set(["/dashboard", "/dashboard/crm", "/real-estate"]);

function leafActive(href: string, pathname: string): boolean {
  return EXACT_HREFS.has(href) ? pathname === href : pathname.startsWith(href);
}

function NavLeafLink({
  leaf,
  pathname,
  collapsed,
  onNavigate,
  nested,
}: {
  leaf: NavLeaf;
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
  nested?: boolean;
}) {
  const active = leafActive(leaf.href, pathname);
  const Icon = leaf.icon;
  return (
    <Link
      href={leaf.href}
      onClick={onNavigate}
      title={collapsed ? leaf.label : undefined}
      className={[
        "group flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors",
        nested && !collapsed ? "px-3 pl-11" : "px-3",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
        collapsed ? "lg:justify-center" : "",
      ].join(" ")}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{leaf.label}</span>}
    </Link>
  );
}

function NavGroupItem({
  group,
  pathname,
  collapsed,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const childActive = group.children.some((c) => leafActive(c.href, pathname));
  const [open, setOpen] = useState(childActive);
  // Always show children when on one of their routes; otherwise honor the toggle.
  const expanded = open || childActive;
  const Icon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? group.label : undefined}
        className={[
          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          childActive
            ? "bg-sidebar-accent text-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
          collapsed ? "lg:justify-center" : "",
        ].join(" ")}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{group.label}</span>
            <ChevronDownIcon
              className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-1 space-y-1">
          {group.children.map((child) => (
            <NavLeafLink
              key={child.href}
              leaf={child}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}
