"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { crmApi, crmQueryKeys } from "@/src/api/api";
import { Card, PageHeader } from "@/src/components/crm/ui";
import {
  BagIcon,
  BriefcaseIcon,
  CalendarIcon,
  UsersIcon,
} from "@/src/components/icons";
import { getPermissions, getStoredUser } from "@/src/lib/auth";

export default function CrmOverviewPage() {
  const { data } = useQuery({ queryKey: crmQueryKeys.summary, queryFn: crmApi.summary });
  const user = getStoredUser();
  const perms = getPermissions();
  const can = (p: string) => perms.includes("*") || perms.includes(p);

  const stats = [
    { label: "Customers", value: data?.customers, icon: UsersIcon, href: "/dashboard/crm/customers", show: can("customers.view") },
    { label: "Partners", value: data?.partners, icon: UsersIcon, href: "/dashboard/crm/partners", show: can("partners.view") },
    { label: "Bookings today", value: data?.bookingsToday, icon: BagIcon, href: "/dashboard/crm/bookings", show: can("bookings.view") },
    { label: "Active employees", value: data?.employees, icon: BriefcaseIcon, href: "/dashboard/crm/employees", show: can("employees.view") },
    { label: "Pending leaves", value: data?.pendingLeaves, icon: CalendarIcon, href: "/dashboard/crm/leaves", show: true },
  ].filter((s) => s.show);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={`Welcome${user?.name ? `, ${user.name}` : ""}`}
        subtitle="CRM & HR — customers, partners, bookings, workforce, leaves and appraisals."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="p-5 transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-2 text-3xl font-semibold text-foreground">
                  {s.value ?? "—"}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
      <Card className="p-5 text-sm text-muted-foreground">
        Use <span className="font-medium text-foreground">Attendance</span> to mark your
        geofenced check-in (within your office radius),{" "}
        <span className="font-medium text-foreground">Leaves</span> to apply against your yearly
        allowance, and <span className="font-medium text-foreground">Staff &amp; Roles</span> to
        control what each staff member can access.
      </Card>
    </div>
  );
}
