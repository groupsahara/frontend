"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BagIcon,
  ChartIcon,
  ChevronDownIcon,
  GridIcon,
  ImageIcon,
  LogoutIcon,
  MapPinIcon,
  SettingsIcon,
  StoreIcon,
  UsersIcon,
  WalletIcon,
} from "@/src/components/icons";
import type { ComponentType, SVGProps } from "react";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type NavLeaf = { label: string; href: string; icon: IconType };
type NavGroup = { label: string; icon: IconType; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

const NAV: NavEntry[] = [
  { label: "Overview", href: "/dashboard", icon: GridIcon },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartIcon },
  { label: "Categories", href: "/dashboard/categories", icon: StoreIcon },
  { label: "Banner", href: "/dashboard/banners", icon: ImageIcon },
  { label: "Bookings", href: "/dashboard/bookings", icon: BagIcon },
  {
    label: "Dispatcher",
    icon: MapPinIcon,
    children: [
      { label: "Service Partners", href: "/dashboard/dispatcher/partners", icon: UsersIcon },
      { label: "Partner Wallets", href: "/dashboard/dispatcher/wallets", icon: WalletIcon },
    ],
  },
  { label: "Customers", href: "/dashboard/customers", icon: UsersIcon },
  { label: "Payments", href: "/dashboard/payments", icon: WalletIcon },
  { label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile, onLogout }: SidebarProps) {
  const pathname = usePathname();

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
          {NAV.map((entry) =>
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

function leafActive(href: string, pathname: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
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
  const childActive = group.children.some((c) => pathname.startsWith(c.href));
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
