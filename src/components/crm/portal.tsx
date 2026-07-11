"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import {
  crmQueryKeys,
  essApi,
  hrApi,
  type HolidayRow,
  type LeaveBalanceRow,
  type MyPortal,
  type PayslipRow,
} from "@/src/api/api";
import {
  Badge,
  Btn,
  Card,
  EmptyRow,
  Field,
  inputCls,
  Modal,
  Notice,
  TableShell,
  fmtDate,
  fmtTime,
  statusTone,
} from "@/src/components/crm/ui";
import { SpinnerIcon } from "@/src/components/icons";

const inr = (n: number | null | undefined) =>
  n == null ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const istToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation is not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied — allow location access to mark attendance"
              : "Could not read your location; try again",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

const Loading = ({ min = "min-h-40" }: { min?: string }) => (
  <div className={`flex ${min} items-center justify-center`}>
    <SpinnerIcon className="h-6 w-6 animate-spin text-primary" />
  </div>
);

/* --------------------------- Dashboard header --------------------------- */

export function PortalStatsHeader({ portal }: { portal: MyPortal }) {
  const emp = portal.employee;
  const remainingLeave = portal.leave.totalAllocated - portal.leave.totalUsed;

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
            {emp.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-48 flex-1">
            <h1 className="text-2xl font-semibold text-foreground">{emp.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[emp.designation, emp.department?.name, emp.office?.name].filter(Boolean).join(" · ") ||
                "—"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <span className="block text-xs text-muted-foreground">Employee code</span>
              <span className="font-medium text-foreground">{emp.employeeCode}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Joined</span>
              <span className="font-medium text-foreground">{fmtDate(emp.joinDate)}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Manager</span>
              <span className="font-medium text-foreground">{emp.manager?.name ?? "—"}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Type</span>
              <span className="font-medium text-foreground">
                {emp.employmentType.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <span className="text-sm text-muted-foreground">Leave balance</span>
          <div className="mt-2 text-3xl font-semibold text-foreground">{remainingLeave}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            of {portal.leave.totalAllocated} days this year
          </div>
        </Card>
        <Card className="p-5">
          <span className="text-sm text-muted-foreground">Present days</span>
          <div className="mt-2 text-3xl font-semibold text-foreground">
            {portal.attendanceThisMonth.presentDays}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {portal.attendanceThisMonth.checkedInToday ? "checked in today" : "not checked in today"}{" "}
            · {monthLabel(portal.attendanceThisMonth.month)}
          </div>
        </Card>
        <Card className="p-5">
          <span className="text-sm text-muted-foreground">Latest payslip</span>
          <div className="mt-2 text-3xl font-semibold text-foreground">
            {portal.latestPayslipMonth ? monthLabel(portal.latestPayslipMonth).split(" ")[0] : "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {portal.latestPayslipMonth ? "view in Payslips" : "no payslip published yet"}
          </div>
        </Card>
        <Card className="p-5">
          <span className="text-sm text-muted-foreground">Latest rating</span>
          <div className="mt-2 text-3xl font-semibold text-foreground">
            {portal.latestAppraisal?.overallRating != null
              ? `★ ${portal.latestAppraisal.overallRating}`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {portal.latestAppraisal?.cycle ?? "no appraisal yet"}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------ Analytics ------------------------------- */

function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "primary" | "warning" | "success";
}) {
  const toneCls = {
    default: "text-foreground",
    primary: "text-primary",
    warning: "text-warning",
    success: "text-success",
  }[tone];
  return (
    <Card className="p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className={`mt-2 text-3xl font-semibold ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

export function AnalyticsSection({ portal }: { portal: MyPortal }) {
  const leaves = useQuery({ queryKey: crmQueryKeys.myLeaves, queryFn: hrApi.myLeaves });
  const holidaysQ = useQuery({
    queryKey: crmQueryKeys.holidays(),
    queryFn: () => essApi.holidays(),
  });

  const today = istToday();
  const requests = leaves.data?.requests ?? [];
  const pending = requests.filter((r) => r.status === "PENDING").length;
  const approvedDays = requests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + r.days, 0);
  const upcomingHolidays = (holidaysQ.data ?? []).filter((h) => h.date >= today);
  const remaining = portal.leave.totalAllocated - portal.leave.totalUsed;
  const workedHours = Math.round((portal.attendanceThisMonth.workedMinutes / 60) * 10) / 10;
  const balances = leaves.data?.balances ?? portal.leave.balances;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">My analytics</h2>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label="Pending leave requests"
          value={pending}
          hint={pending ? "awaiting approval" : "none pending"}
          tone={pending ? "warning" : "default"}
        />
        <StatTile
          label="Leave balance left"
          value={remaining}
          hint={`${portal.leave.totalUsed} used · ${approvedDays} approved days`}
          tone="primary"
        />
        <StatTile
          label="Upcoming holidays"
          value={upcomingHolidays.length}
          hint={upcomingHolidays[0] ? `next: ${upcomingHolidays[0].name}` : "none left this year"}
        />
        <StatTile
          label="Worked this month"
          value={`${workedHours}h`}
          hint={`${portal.attendanceThisMonth.presentDays} present days`}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground">Leave balance by type</h3>
          <div className="mt-4 space-y-3">
            {!balances.length && (
              <p className="text-sm text-muted-foreground">No leave balances provisioned yet.</p>
            )}
            {balances.map((b: LeaveBalanceRow) => {
              const pct = b.allocated ? Math.min(100, (b.used / b.allocated) * 100) : 0;
              return (
                <div key={b.balanceId} className="text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-foreground">
                      {b.leaveType.name}
                      {!b.leaveType.isPaid && (
                        <span className="ml-1.5 text-xs text-muted-foreground">unpaid</span>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {b.allocated - b.used} left · {b.used}/{b.allocated}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted-foreground/10">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground">Upcoming holidays</h3>
          <div className="mt-3 space-y-2 text-sm">
            {!upcomingHolidays.length && (
              <p className="text-muted-foreground">No upcoming holidays this year.</p>
            )}
            {upcomingHolidays.slice(0, 8).map((h) => (
              <div key={h.holidayId} className="flex items-center justify-between">
                <span className="text-foreground">
                  {h.name}
                  {h.isOptional && (
                    <span className="ml-2 text-xs text-muted-foreground">(optional)</span>
                  )}
                </span>
                <Badge tone="primary">{fmtDate(h.date)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------- Overview ------------------------------- */

export function OverviewSection({ checkedInToday }: { checkedInToday: boolean }) {
  const qc = useQueryClient();
  const [punchError, setPunchError] = useState<string | null>(null);
  const [punchNotice, setPunchNotice] = useState<string | null>(null);

  const celebrations = useQuery({
    queryKey: crmQueryKeys.celebrations,
    queryFn: essApi.celebrations,
  });
  const holidays = useQuery({
    queryKey: crmQueryKeys.holidays(),
    queryFn: () => essApi.holidays(),
  });

  const punch = useMutation({
    mutationFn: async (kind: "in" | "out") => {
      const pos = await getPosition();
      return kind === "in" ? hrApi.checkIn(pos) : hrApi.checkOut(pos);
    },
    onSuccess: (_res, kind) => {
      setPunchError(null);
      setPunchNotice(kind === "in" ? "Checked in — have a great shift!" : "Checked out. See you!");
      qc.invalidateQueries({ queryKey: crmQueryKeys.myPortal });
      qc.invalidateQueries({ queryKey: ["hr", "attendance"] });
    },
    onError: (e) => setPunchError(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const today = istToday();
  const upcomingHolidays = (holidays.data ?? []).filter((h) => h.date >= today).slice(0, 6);

  return (
    <div className="space-y-4">
      {punchError && <Notice kind="error">{punchError}</Notice>}
      {punchNotice && <Notice kind="success">{punchNotice}</Notice>}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-medium text-foreground">Attendance</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Geofenced — you must be within your office radius to check in.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn
            tone="success"
            busy={punch.isPending && punch.variables === "in"}
            disabled={checkedInToday || punch.isPending}
            onClick={() => punch.mutate("in")}
          >
            Check in
          </Btn>
          <Btn
            tone="ghost"
            busy={punch.isPending && punch.variables === "out"}
            disabled={punch.isPending}
            onClick={() => punch.mutate("out")}
          >
            Check out
          </Btn>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-medium text-foreground">Celebrations (next 30 days)</h2>
          {celebrations.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
          {celebrations.data && (
            <div className="mt-3 space-y-4 text-sm">
              <CelebrationList
                title="🎂 Birthdays"
                items={celebrations.data.birthdays.map((b) => ({
                  key: `b${b.employeeId}`,
                  main: b.name,
                  sub: b.designation ?? b.department ?? "",
                  right: fmtDate(b.date),
                }))}
              />
              <CelebrationList
                title="🎉 Work anniversaries"
                items={celebrations.data.anniversaries.map((a) => ({
                  key: `a${a.employeeId}`,
                  main: a.name,
                  sub: `${a.years} year${(a.years ?? 0) > 1 ? "s" : ""}`,
                  right: fmtDate(a.date),
                }))}
              />
              <CelebrationList
                title="👋 New joiners"
                items={celebrations.data.newJoiners.map((j) => ({
                  key: `j${j.employeeId}`,
                  main: j.name,
                  sub: j.designation ?? "",
                  right: fmtDate(j.date),
                }))}
              />
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium text-foreground">Upcoming holidays</h2>
          <div className="mt-3 space-y-2 text-sm">
            {!upcomingHolidays.length && (
              <p className="text-muted-foreground">No upcoming holidays this year.</p>
            )}
            {upcomingHolidays.map((h: HolidayRow) => (
              <div key={h.holidayId} className="flex items-center justify-between">
                <span className="text-foreground">
                  {h.name}
                  {h.isOptional && (
                    <span className="ml-2 text-xs text-muted-foreground">(optional)</span>
                  )}
                </span>
                <Badge tone="primary">{fmtDate(h.date)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function CelebrationList({
  title,
  items,
}: {
  title: string;
  items: { key: string; main: string; sub: string; right: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {!items.length && <p className="mt-1 text-muted-foreground">None coming up.</p>}
      <div className="mt-1 space-y-1">
        {items.map((i) => (
          <div key={i.key} className="flex items-center justify-between">
            <span className="text-foreground">
              {i.main}
              {i.sub && <span className="ml-1.5 text-xs text-muted-foreground">{i.sub}</span>}
            </span>
            <span className="text-xs text-muted-foreground">{i.right}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Attendance ------------------------------ */

export function AttendanceSection() {
  const qc = useQueryClient();
  const month = istToday().slice(0, 7);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.myAttendance(month),
    queryFn: () => hrApi.myAttendance(month),
    retry: false,
  });

  const punch = useMutation({
    mutationFn: async (kind: "in" | "out") => {
      const pos = await getPosition();
      return kind === "in" ? hrApi.checkIn(pos) : hrApi.checkOut(pos);
    },
    onSuccess: (row, kind) => {
      setMsg({
        kind: "success",
        text:
          kind === "in"
            ? `Checked in ✓ — ${row.checkInDistanceM} m from the office`
            : `Checked out ✓ — worked ${row.workedMinutes} min`,
      });
      qc.invalidateQueries({ queryKey: ["hr", "attendance"] });
      qc.invalidateQueries({ queryKey: crmQueryKeys.myPortal });
    },
    onError: (e) =>
      setMsg({ kind: "error", text: e instanceof ApiError ? e.message : (e as Error).message }),
  });

  if (isLoading) return <Loading />;
  if (error || !data)
    return (
      <Notice kind="error">
        {error instanceof ApiError ? error.message : "Could not load your attendance."}
      </Notice>
    );

  const today = data.today;
  const office = data.employee.office;

  return (
    <div className="space-y-4">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">
              {office
                ? `${office.name} · allowed within ${office.radiusMeters} m`
                : "No office assigned — contact HR"}
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {today?.checkOutAt
                ? `Done for today · ${today.workedMinutes} min`
                : today
                  ? `Checked in at ${fmtTime(today.checkInAt)}`
                  : "Not checked in yet"}
            </div>
          </div>
          <div className="flex gap-2">
            {!today && office && (
              <Btn busy={punch.isPending} onClick={() => punch.mutate("in")}>
                Check in
              </Btn>
            )}
            {!today && !office && (
              <span className="rounded-lg bg-accent px-3 py-2 text-xs text-muted-foreground">
                Ask HR to assign your office to enable check-in
              </span>
            )}
            {today && !today.checkOutAt && (
              <Btn tone="ghost" busy={punch.isPending} onClick={() => punch.mutate("out")}>
                Check out
              </Btn>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-4 text-sm font-medium text-foreground">
          {monthLabel(month)}
        </div>
        <TableShell head={["Date", "Check-in", "Distance", "Check-out", "Worked", "Status"]}>
          {!data.records.length && <EmptyRow cols={6} label="No attendance yet this month" />}
          {data.records.map((r) => (
            <tr key={r.attendanceId}>
              <td className="px-4 py-2.5 text-foreground">{fmtDate(r.date)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{fmtTime(r.checkInAt)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.checkInDistanceM} m</td>
              <td className="px-4 py-2.5 text-muted-foreground">{fmtTime(r.checkOutAt)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {r.workedMinutes != null ? `${r.workedMinutes} min` : "—"}
              </td>
              <td className="px-4 py-2.5">
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </td>
            </tr>
          ))}
        </TableShell>
      </Card>
    </div>
  );
}

/* -------------------------------- Leaves -------------------------------- */

export function LeavesSection() {
  const qc = useQueryClient();
  const [applying, setApplying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.myLeaves,
    queryFn: hrApi.myLeaves,
  });

  const cancel = useMutation({
    mutationFn: (id: number) => hrApi.cancelLeave(id),
    onSuccess: () => {
      setNotice("Leave request cancelled.");
      qc.invalidateQueries({ queryKey: crmQueryKeys.myLeaves });
      qc.invalidateQueries({ queryKey: crmQueryKeys.myPortal });
    },
    onError: (e) =>
      setActionError(e instanceof ApiError ? e.message : "Could not cancel the request."),
  });

  if (isLoading) return <Loading />;
  if (error || !data)
    return (
      <Notice kind="error">
        {error instanceof ApiError ? error.message : "Could not load your leaves."}
      </Notice>
    );

  return (
    <div className="space-y-4">
      {actionError && <Notice kind="error">{actionError}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">My allowances</h2>
        <Btn onClick={() => setApplying(true)}>Apply for leave</Btn>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.balances.map((b: LeaveBalanceRow) => (
          <Card key={b.balanceId} className="p-5">
            <span className="text-sm text-muted-foreground">{b.leaveType.name}</span>
            <div className="mt-2 text-3xl font-semibold text-foreground">{b.allocated - b.used}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              of {b.allocated} left · {b.used} used
              {!b.leaveType.isPaid && " · unpaid"}
            </div>
          </Card>
        ))}
        {!data.balances.length && (
          <Card className="p-5 text-sm text-muted-foreground">
            No leave balances provisioned yet — contact HR.
          </Card>
        )}
      </div>

      <Card>
        <TableShell head={["Type", "From", "To", "Days", "Reason", "Status", ""]}>
          {!data.requests.length && <EmptyRow cols={7} label="No leave requests yet." />}
          {data.requests.map((r) => (
            <tr key={r.leaveRequestId} className="text-foreground">
              <td className="px-4 py-3 font-medium">{r.leaveType.name}</td>
              <td className="px-4 py-3">{fmtDate(r.startDate)}</td>
              <td className="px-4 py-3">{fmtDate(r.endDate)}</td>
              <td className="px-4 py-3">{r.days}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.reason ?? "—"}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                {r.status === "REJECTED" && r.rejectionReason && (
                  <span className="ml-2 text-xs text-muted-foreground">{r.rejectionReason}</span>
                )}
              </td>
              <td className="px-4 py-3">
                {r.status === "PENDING" && (
                  <Btn
                    small
                    tone="ghost"
                    busy={cancel.isPending}
                    onClick={() => cancel.mutate(r.leaveRequestId)}
                  >
                    Cancel
                  </Btn>
                )}
              </td>
            </tr>
          ))}
        </TableShell>
      </Card>

      {applying && (
        <ApplyLeaveModal
          balances={data.balances}
          onClose={() => setApplying(false)}
          onApplied={() => {
            setApplying(false);
            setActionError(null);
            setNotice("Leave request submitted for approval.");
            qc.invalidateQueries({ queryKey: crmQueryKeys.myLeaves });
          }}
        />
      )}
    </div>
  );
}

function ApplyLeaveModal({
  balances,
  onClose,
  onApplied,
}: {
  balances: LeaveBalanceRow[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const [leaveTypeId, setLeaveTypeId] = useState(balances[0]?.leaveTypeId ?? 0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const apply = useMutation({
    mutationFn: () =>
      hrApi.applyLeave({ leaveTypeId, startDate, endDate, reason: reason.trim() || undefined }),
    onSuccess: onApplied,
    onError: (e) =>
      setFormError(e instanceof ApiError ? e.message : "Could not submit the request."),
  });

  const submit = () => {
    if (!leaveTypeId) return setFormError("Pick a leave type.");
    if (!startDate || !endDate) return setFormError("Pick the start and end dates.");
    if (endDate < startDate) return setFormError("End date is before the start date.");
    setFormError(null);
    apply.mutate();
  };

  return (
    <Modal title="Apply for leave" onClose={onClose}>
      <div className="space-y-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <Field label="Leave type">
          <select
            className={inputCls}
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(Number(e.target.value))}
          >
            {balances.map((b) => (
              <option key={b.leaveTypeId} value={b.leaveTypeId}>
                {b.leaveType.name} ({b.allocated - b.used} left)
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From">
            <input
              type="date"
              className={inputCls}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              className={inputCls}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Reason (optional)">
          <textarea
            className={`${inputCls} min-h-20`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn tone="ghost" onClick={onClose} disabled={apply.isPending}>
            Cancel
          </Btn>
          <Btn busy={apply.isPending} onClick={submit}>
            Submit request
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------- Payslips ------------------------------- */

export function PayslipsSection() {
  const [viewing, setViewing] = useState<PayslipRow | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.myPayslips,
    queryFn: essApi.myPayslips,
  });

  if (isLoading) return <Loading />;
  if (error)
    return (
      <Notice kind="error">
        {error instanceof ApiError ? error.message : "Could not load payslips."}
      </Notice>
    );

  return (
    <div className="space-y-4">
      <Card>
        <TableShell head={["Month", "Gross pay", "Deductions", "Net pay", "Paid days", ""]}>
          {!data?.length && (
            <EmptyRow
              cols={6}
              label="No payslips published yet — they appear here after HR runs payroll."
            />
          )}
          {data?.map((p) => (
            <tr key={p.payslipId} className="text-foreground">
              <td className="px-4 py-3 font-medium">{monthLabel(p.month)}</td>
              <td className="px-4 py-3">{inr(p.grossPay)}</td>
              <td className="px-4 py-3 text-muted-foreground">{inr(p.grossPay - p.netPay)}</td>
              <td className="px-4 py-3 font-semibold">{inr(p.netPay)}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.paidDays}</td>
              <td className="px-4 py-3">
                <Btn small tone="ghost" onClick={() => setViewing(p)}>
                  View slip
                </Btn>
              </td>
            </tr>
          ))}
        </TableShell>
      </Card>

      {viewing && <PayslipModal payslipId={viewing.payslipId} onClose={() => setViewing(null)} />}
    </div>
  );
}

function PayslipModal({ payslipId, onClose }: { payslipId: number; onClose: () => void }) {
  const { data: slip, isLoading } = useQuery({
    queryKey: crmQueryKeys.myPayslip(payslipId),
    queryFn: () => essApi.myPayslip(payslipId),
  });

  const printSlip = () => {
    if (!slip) return;
    const rows = (items: [string, number][]) =>
      items
        .map(
          ([l, v]) =>
            `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${l}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">₹${v.toLocaleString("en-IN")}</td></tr>`,
        )
        .join("");
    const win = window.open("", "_blank", "width=760,height=900");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Payslip ${slip.month}</title></head>
      <body style="font-family:sans-serif;max-width:680px;margin:24px auto;color:#111">
        <h2 style="margin-bottom:0">Restocare — Salary Slip</h2>
        <p style="color:#666;margin-top:4px">${monthLabel(slip.month)}</p>
        <p><strong>${slip.employee?.name ?? ""}</strong> (${slip.employee?.employeeCode ?? ""})<br/>
        ${[slip.employee?.designation, slip.employee?.department?.name].filter(Boolean).join(" · ")}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <tr><th colspan="2" style="text-align:left;padding:8px 12px;background:#f5f5f5">Earnings</th></tr>
          ${rows([["Basic", slip.basic], ["HRA", slip.hra], ["Allowances", slip.allowances], ["Bonus", slip.bonus]])}
          <tr><th colspan="2" style="text-align:left;padding:8px 12px;background:#f5f5f5">Deductions</th></tr>
          ${rows([["Provident fund", slip.pf], ["Tax", slip.tax], ["Other deductions", slip.deductions]])}
          <tr><td style="padding:10px 12px;font-weight:bold">Net pay (${slip.paidDays} paid days${slip.lopDays ? `, ${slip.lopDays} LOP` : ""})</td>
          <td style="padding:10px 12px;text-align:right;font-weight:bold">₹${slip.netPay.toLocaleString("en-IN")}</td></tr>
        </table>
        <p style="color:#999;font-size:12px;margin-top:16px">System-generated payslip — no signature required.</p>
        <script>window.print()</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <Modal title={slip ? `Payslip — ${monthLabel(slip.month)}` : "Payslip"} onClose={onClose} wide>
      {isLoading && <Loading min="min-h-32" />}
      {slip && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            {slip.employee?.name} ({slip.employee?.employeeCode}) ·{" "}
            {[slip.employee?.designation, slip.employee?.department?.name].filter(Boolean).join(" · ")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="divide-y divide-border">
              <div className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Earnings
              </div>
              {(
                [
                  ["Basic", slip.basic],
                  ["HRA", slip.hra],
                  ["Allowances", slip.allowances],
                  ["Bonus", slip.bonus],
                ] as [string, number][]
              ).map(([label, v]) => (
                <div key={label} className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground">{inr(v)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 font-medium">
                <span>Gross</span>
                <span>{inr(slip.grossPay)}</span>
              </div>
            </Card>
            <Card className="divide-y divide-border">
              <div className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Deductions
              </div>
              {(
                [
                  ["Provident fund", slip.pf],
                  ["Tax", slip.tax],
                  ["Other", slip.deductions],
                ] as [string, number][]
              ).map(([label, v]) => (
                <div key={label} className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground">{inr(v)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Paid days</span>
                <span className="text-foreground">
                  {slip.paidDays}
                  {slip.lopDays > 0 && (
                    <span className="ml-1.5 text-xs text-danger">({slip.lopDays} LOP)</span>
                  )}
                </span>
              </div>
            </Card>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
            <span className="font-medium text-foreground">Net pay</span>
            <span className="text-xl font-semibold text-primary">{inr(slip.netPay)}</span>
          </div>
          {slip.notes && <p className="text-xs text-muted-foreground">Note: {slip.notes}</p>}
          <div className="flex justify-end gap-2">
            <Btn tone="ghost" onClick={onClose}>
              Close
            </Btn>
            <Btn onClick={printSlip}>Print / Save PDF</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------ Increments ------------------------------ */

export function IncrementsSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.myIncrements,
    queryFn: essApi.myIncrements,
  });

  if (isLoading) return <Loading />;
  if (error || !data)
    return (
      <Notice kind="error">
        {error instanceof ApiError ? error.message : "Could not load increments."}
      </Notice>
    );

  const recTone: Record<string, string> = {
    PROMOTE: "success",
    INCREMENT: "primary",
    HOLD: "warning",
    PIP: "danger",
  };
  const maxGross = Math.max(1, ...data.salaryTrend.map((s) => s.grossPay));

  return (
    <div className="space-y-4">
      <Card>
        <div className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
          Appraisal outcomes
        </div>
        <TableShell head={["Cycle", "Period", "Rating", "Recommendation", "Increment"]}>
          {!data.appraisals.length && (
            <EmptyRow
              cols={5}
              label="No completed appraisals yet — increments appear here after your review."
            />
          )}
          {data.appraisals.map((a) => (
            <tr key={a.appraisalId} className="text-foreground">
              <td className="px-4 py-3 font-medium">{a.cycle}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {fmtDate(a.periodStart)} – {fmtDate(a.periodEnd)}
              </td>
              <td className="px-4 py-3">{a.overallRating != null ? `★ ${a.overallRating}` : "—"}</td>
              <td className="px-4 py-3">
                {a.recommendation ? (
                  <Badge tone={recTone[a.recommendation] ?? "muted"}>{a.recommendation}</Badge>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 font-medium">
                {a.incrementPct != null ? `+${a.incrementPct}%` : "—"}
              </td>
            </tr>
          ))}
        </TableShell>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-medium text-foreground">Salary trend (published payslips)</h2>
        <div className="mt-4 space-y-2">
          {!data.salaryTrend.length && (
            <p className="text-sm text-muted-foreground">No published payslips yet.</p>
          )}
          {data.salaryTrend.map((s) => (
            <div key={s.month} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-muted-foreground">{s.month}</span>
              <div className="h-2 w-full rounded-full bg-muted-foreground/10">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${Math.max(2, (s.grossPay / maxGross) * 100)}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right font-medium text-foreground">
                {inr(s.grossPay)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------- Holidays ------------------------------- */

export function HolidaysSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.holidays(),
    queryFn: () => essApi.holidays(),
  });

  if (isLoading) return <Loading />;
  if (error)
    return (
      <Notice kind="error">
        {error instanceof ApiError ? error.message : "Could not load holidays."}
      </Notice>
    );

  const today = istToday();
  const rows = data ?? [];

  return (
    <Card>
      <TableShell head={["Holiday", "Date", "Type", "Status"]}>
        {!rows.length && <EmptyRow cols={4} label="No holidays configured for this year." />}
        {rows.map((h) => {
          const upcoming = h.date >= today;
          return (
            <tr key={h.holidayId} className="text-foreground">
              <td className="px-4 py-3 font-medium">{h.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(h.date)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {h.isOptional ? "Optional" : "Gazetted"}
              </td>
              <td className="px-4 py-3">
                <Badge tone={upcoming ? "primary" : "muted"}>{upcoming ? "Upcoming" : "Passed"}</Badge>
              </td>
            </tr>
          );
        })}
      </TableShell>
    </Card>
  );
}

/* ------------------------------ Positions ------------------------------- */

export function PositionsSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.openPositions,
    queryFn: essApi.openPositions,
  });

  if (isLoading) return <Loading />;
  if (error)
    return (
      <Notice kind="error">
        {error instanceof ApiError ? error.message : "Could not load open positions."}
      </Notice>
    );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {!data?.length && (
        <Card className="p-5 text-sm text-muted-foreground">
          No open positions right now — check back later.
        </Card>
      )}
      {data?.map((job) => (
        <Card key={job.jobId} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium text-foreground">{job.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[job.department?.name, job.location].filter(Boolean).join(" · ") || "—"} · posted{" "}
                {fmtDate(job.postedAt)}
              </p>
            </div>
            <Badge tone="primary">{job.employmentType.replace(/_/g, " ")}</Badge>
          </div>
          {job.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {job.description}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Interested? Reach out to HR with the position title.
          </p>
        </Card>
      ))}
    </div>
  );
}
