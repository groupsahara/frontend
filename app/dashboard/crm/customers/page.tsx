"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import {
  crmApi,
  crmQueryKeys,
  customersApi,
  type CreateCustomerInput,
  type CrmCustomerRow,
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
  PageHeader,
  TableShell,
  fmtDate,
} from "@/src/components/crm/ui";
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/src/components/icons";
import { getStoredUser, hasPermission } from "@/src/lib/auth";

const PAGE_SIZE = 20;

export default function CrmCustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CrmCustomerRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CrmCustomerRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = hasPermission("customers.update");
  const role = getStoredUser()?.role;
  const canDelete = role === "ADMIN" || role === "SUPER_ADMIN";

  const params = { search: search || undefined, page, limit: PAGE_SIZE };

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.crmCustomers(params),
    queryFn: () => crmApi.customers(params),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["crm", "customers"] });

  const block = useMutation({
    mutationFn: (c: CrmCustomerRow) => customersApi.setBlocked(c.userId, !c.isBlocked),
    onSuccess: (res) => {
      setActionError(null);
      setNotice(res.message);
      invalidate();
    },
    onError: (e) => setActionError(e instanceof ApiError ? e.message : "Action failed."),
  });

  const del = useMutation({
    mutationFn: (userId: number) => customersApi.remove(userId),
    onSuccess: (res) => {
      setActionError(null);
      setNotice(res.message);
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e) => {
      setConfirmDelete(null);
      setActionError(e instanceof ApiError ? e.message : "Could not delete customer.");
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`${data?.total ?? "…"} registered customers`}
        action={
          canManage ? (
            <Btn
              onClick={() => {
                setNotice(null);
                setActionError(null);
                setAdding(true);
              }}
            >
              <PlusIcon className="h-4 w-4" />
              Add customer
            </Btn>
          ) : undefined
        }
      />
      {error instanceof ApiError && <Notice kind="error">{error.message}</Notice>}
      {actionError && <Notice kind="error">{actionError}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={`${inputCls} pl-10`}
          placeholder="Search name, email or mobile…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <TableShell head={["Customer", "Contact", "Bookings", "Joined", ""]}>
          {isLoading && <EmptyRow cols={5} label="Loading…" />}
          {!isLoading && !data?.customers.length && <EmptyRow cols={5} label="No customers found" />}
          {data?.customers.map((c) => (
            <tr key={c.userId} className="transition-colors hover:bg-accent/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{c.name ?? "—"}</span>
                  {c.isBlocked && <Badge tone="danger">Blocked</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">#{c.userId}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <div>{c.mobile ?? "—"}</div>
                <div className="text-xs">{c.email ?? ""}</div>
              </td>
              <td className="px-4 py-3 text-foreground">{c.bookingCount}</td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  {canManage && (
                    <Btn
                      small
                      tone={c.isBlocked ? "success" : "danger"}
                      busy={block.isPending && block.variables?.userId === c.userId}
                      onClick={() => block.mutate(c)}
                    >
                      {c.isBlocked ? "Unblock" : "Block"}
                    </Btn>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      title="Edit customer"
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(c)}
                      title="Delete customer"
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
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Btn tone="ghost" small disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Btn>
            <Btn tone="ghost" small disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Btn>
          </div>
        </div>
      </Card>

      {editing && <EditCustomerModal customer={editing} onClose={() => setEditing(null)} />}
      {adding && (
        <AddCustomerModal
          onClose={() => setAdding(false)}
          onCreated={(name) => {
            setAdding(false);
            setActionError(null);
            setNotice(`Customer “${name}” created.`);
            invalidate();
          }}
        />
      )}
      {confirmDelete && (
        <DeleteCustomerModal
          customer={confirmDelete}
          busy={del.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => del.mutate(confirmDelete.userId)}
        />
      )}
    </div>
  );
}

// ➕ Create a customer (USER account). Mobile is required (it powers the OTP
// login); everything else is optional. Reuses the admin customers endpoint.
function AddCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [form, setForm] = useState<CreateCustomerInput>({
    name: "",
    mobile: "",
    email: "",
    restaurantName: "",
    gstNumber: "",
  });
  const [err, setErr] = useState("");

  const create = useMutation({
    mutationFn: (body: CreateCustomerInput) => customersApi.create(body),
    onSuccess: (row) => onCreated(row.name),
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not create customer."),
  });

  const set = (key: keyof CreateCustomerInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Modal title="Add customer" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErr("");
          const name = form.name.trim();
          const mobile = (form.mobile ?? "").replace(/\D/g, "");
          if (!name) return setErr("Name is required.");
          if (!/^\d{10}$/.test(mobile)) return setErr("Enter a valid 10-digit mobile number.");
          create.mutate({
            name,
            mobile,
            email: form.email?.trim() || undefined,
            restaurantName: form.restaurantName?.trim() || undefined,
            gstNumber: form.gstNumber?.trim() || undefined,
          });
        }}
      >
        {err && <Notice kind="error">{err}</Notice>}
        <Field label="Name">
          <input className={inputCls} value={form.name} onChange={set("name")} autoFocus />
        </Field>
        <Field label="Mobile" hint="10-digit number used for the customer's OTP login">
          <input
            className={inputCls}
            value={form.mobile}
            onChange={set("mobile")}
            inputMode="numeric"
            placeholder="9876543210"
          />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Restaurant name">
          <input className={inputCls} value={form.restaurantName} onChange={set("restaurantName")} />
        </Field>
        <Field label="GST number">
          <input className={inputCls} value={form.gstNumber} onChange={set("gstNumber")} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn tone="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" busy={create.isPending}>
            Create customer
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

// 🗑️ Confirm permanent deletion of a customer and all their data.
function DeleteCustomerModal({
  customer,
  busy,
  onCancel,
  onConfirm,
}: {
  customer: CrmCustomerRow;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Delete customer?" onClose={onCancel}>
      <p className="text-sm text-muted-foreground">
        This will permanently delete{" "}
        <strong className="text-foreground">{customer.name ?? `#${customer.userId}`}</strong> and
        erase <strong className="text-foreground">all associated data</strong> — bookings, coupons,
        addresses and ratings. This action is irreversible.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Btn tone="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Btn>
        <Btn tone="danger" busy={busy} onClick={onConfirm}>
          Delete everything
        </Btn>
      </div>
    </Modal>
  );
}

function EditCustomerModal({
  customer,
  onClose,
}: {
  customer: CrmCustomerRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(customer.name ?? "");
  const [mobile, setMobile] = useState(customer.mobile ?? "");
  const [err, setErr] = useState("");

  const save = useMutation({
    mutationFn: () => crmApi.updateCustomer(customer.userId, { name, mobile }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "customers"] });
      onClose();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Update failed"),
  });

  return (
    <Modal title={`Edit customer #${customer.userId}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {err && <Notice kind="error">{err}</Notice>}
        <Field label="Name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Mobile">
          <input className={inputCls} value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn tone="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" busy={save.isPending}>
            Save
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
