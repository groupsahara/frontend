"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import { crmApi, crmQueryKeys, type CrmCustomerRow } from "@/src/api/api";
import {
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
import { PencilIcon, SearchIcon } from "@/src/components/icons";
import { hasPermission } from "@/src/lib/auth";

const PAGE_SIZE = 20;

export default function CrmCustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CrmCustomerRow | null>(null);
  const params = { search: search || undefined, page, limit: PAGE_SIZE };

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.crmCustomers(params),
    queryFn: () => crmApi.customers(params),
    placeholderData: keepPreviousData,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Customers" subtitle={`${data?.total ?? "…"} registered customers`} />
      {error instanceof ApiError && <Notice kind="error">{error.message}</Notice>}

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
                <div className="font-medium text-foreground">{c.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">#{c.userId}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <div>{c.mobile ?? "—"}</div>
                <div className="text-xs">{c.email ?? ""}</div>
              </td>
              <td className="px-4 py-3 text-foreground">{c.bookingCount}</td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                {hasPermission("customers.update") && (
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
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
    </div>
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
