"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import { crmQueryKeys, hrApi, type EmployeeRow } from "@/src/api/api";
import {
  Badge,
  Btn,
  Card,
  EmptyRow,
  Field,
  Modal,
  Notice,
  PageHeader,
  TableShell,
  fmtDate,
  inputCls,
  statusTone,
} from "@/src/components/crm/ui";
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/src/components/icons";
import { hasPermission } from "@/src/lib/auth";

export default function CrmEmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; row: EmployeeRow } | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<EmployeeRow | null>(null);
  const [notice, setNotice] = useState("");
  const params = { search: search || undefined };

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.employees(params),
    queryFn: () => hrApi.employees(params),
  });

  const del = useMutation({
    mutationFn: (id: number) => hrApi.deleteEmployee(id),
    onSuccess: () => {
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["hr", "employees"] });
    },
    onError: (e) => setNotice(e instanceof ApiError ? e.message : "Delete failed"),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Employees"
        subtitle={`${data?.length ?? "…"} employees`}
        action={
          hasPermission("employees.create") ? (
            <Btn onClick={() => setModal({ mode: "create" })}>
              <PlusIcon className="h-4 w-4" /> Add employee
            </Btn>
          ) : undefined
        }
      />
      {error instanceof ApiError && <Notice kind="error">{error.message}</Notice>}
      {notice && <Notice kind="error">{notice}</Notice>}

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={`${inputCls} pl-10`}
          placeholder="Search name, code, designation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <TableShell head={["Employee", "Department", "Office", "Type", "Status", "Joined", ""]}>
          {isLoading && <EmptyRow cols={7} label="Loading…" />}
          {!isLoading && !data?.length && <EmptyRow cols={7} label="No employees yet" />}
          {data?.map((e) => (
            <tr key={e.employeeId} className="transition-colors hover:bg-accent/50">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{e.name}</div>
                <div className="text-xs text-muted-foreground">
                  {e.employeeCode} · {e.designation ?? "—"}
                  {e.user ? " · has login" : ""}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{e.department?.name ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{e.office?.name ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {e.employmentType.replaceAll("_", " ")}
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(e.status)}>{e.status.replaceAll("_", " ")}</Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(e.joinDate)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  {hasPermission("employees.update") && (
                    <button
                      type="button"
                      onClick={() => setModal({ mode: "edit", row: e })}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                  {hasPermission("employees.delete") && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(e)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </TableShell>
      </Card>

      {modal && (
        <EmployeeForm
          row={modal.mode === "edit" ? modal.row : undefined}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <Modal title="Delete employee" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{confirmDelete.name}</span> (
            {confirmDelete.employeeCode})? Attendance, leave and appraisal history will be removed.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Btn tone="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Btn>
            <Btn tone="danger" busy={del.isPending} onClick={() => del.mutate(confirmDelete.employeeId)}>
              Delete
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EmployeeForm({ row, onClose }: { row?: EmployeeRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    name: row?.name ?? "",
    email: row?.email ?? "",
    phone: row?.phone ?? "",
    designation: row?.designation ?? "",
    departmentId: row?.department?.departmentId?.toString() ?? "",
    officeId: row?.office?.officeId?.toString() ?? "",
    employmentType: row?.employmentType ?? "FULL_TIME",
    status: row?.status ?? "ACTIVE",
    joinDate: row?.joinDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    salary: row?.salary?.toString() ?? "",
    address: row?.address ?? "",
    emergencyContact: row?.emergencyContact ?? "",
    loginPassword: "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const { data: departments } = useQuery({
    queryKey: crmQueryKeys.departments,
    queryFn: hrApi.departments,
  });
  const { data: offices } = useQuery({ queryKey: crmQueryKeys.offices, queryFn: hrApi.offices });

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        name: f.name,
        phone: f.phone || undefined,
        designation: f.designation || undefined,
        departmentId: f.departmentId ? Number(f.departmentId) : null,
        officeId: f.officeId ? Number(f.officeId) : null,
        employmentType: f.employmentType,
        salary: f.salary ? Number(f.salary) : undefined,
        address: f.address || undefined,
        emergencyContact: f.emergencyContact || undefined,
      };
      if (row) {
        body.status = f.status;
        return hrApi.updateEmployee(row.employeeId, body);
      }
      body.email = f.email;
      body.joinDate = f.joinDate;
      if (f.loginPassword) body.loginPassword = f.loginPassword;
      return hrApi.createEmployee(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "employees"] });
      onClose();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Save failed"),
  });

  return (
    <Modal title={row ? `Edit ${row.name}` : "Add employee"} onClose={onClose} wide>
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {err && (
          <div className="sm:col-span-2">
            <Notice kind="error">{err}</Notice>
          </div>
        )}
        <Field label="Full name">
          <input className={inputCls} required value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Email" hint={row ? "Email cannot be changed" : undefined}>
          <input
            className={inputCls}
            type="email"
            required
            disabled={!!row}
            value={f.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Designation">
          <input
            className={inputCls}
            value={f.designation}
            onChange={(e) => set("designation", e.target.value)}
          />
        </Field>
        <Field label="Department">
          <select
            className={inputCls}
            value={f.departmentId}
            onChange={(e) => set("departmentId", e.target.value)}
          >
            <option value="">— None —</option>
            {departments?.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Office (attendance geofence)">
          <select className={inputCls} value={f.officeId} onChange={(e) => set("officeId", e.target.value)}>
            <option value="">— None —</option>
            {offices?.map((o) => (
              <option key={o.officeId} value={o.officeId}>
                {o.name} ({o.radiusMeters} m)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Employment type">
          <select
            className={inputCls}
            value={f.employmentType}
            onChange={(e) => set("employmentType", e.target.value)}
          >
            {["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"].map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        {row ? (
          <Field label="Status">
            <select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}>
              {["ACTIVE", "ON_LEAVE", "TERMINATED", "RESIGNED"].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Join date">
            <input
              className={inputCls}
              type="date"
              required
              value={f.joinDate}
              onChange={(e) => set("joinDate", e.target.value)}
            />
          </Field>
        )}
        <Field label="Monthly salary (₹)">
          <input
            className={inputCls}
            type="number"
            min="0"
            value={f.salary}
            onChange={(e) => set("salary", e.target.value)}
          />
        </Field>
        <Field label="Emergency contact">
          <input
            className={inputCls}
            value={f.emergencyContact}
            onChange={(e) => set("emergencyContact", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address">
            <input className={inputCls} value={f.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
        </div>
        {!row && (
          <div className="sm:col-span-2">
            <Field
              label="Panel login password (optional)"
              hint="If set, a STAFF login is created so the employee can sign in, mark geofenced attendance and apply for leaves."
            >
              <input
                className={inputCls}
                type="password"
                minLength={6}
                value={f.loginPassword}
                onChange={(e) => set("loginPassword", e.target.value)}
              />
            </Field>
          </div>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Btn tone="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" busy={save.isPending}>
            {row ? "Save changes" : "Create employee"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
