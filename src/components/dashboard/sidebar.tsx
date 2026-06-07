"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BagIcon,
  ChartIcon,
  GridIcon,
  LogoutIcon,
  SettingsIcon,
  StoreIcon,
  UsersIcon,
  WalletIcon,
} from "@/src/components/icons";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: GridIcon },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartIcon },
  { label: "Vendors", href: "/dashboard/vendors", icon: StoreIcon },
  { label: "Bookings", href: "/dashboard/bookings", icon: BagIcon },
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
          {NAV.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                  collapsed ? "lg:justify-center" : "",
                ].join(" ")}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
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
