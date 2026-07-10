"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import {
  crmQueryKeys,
  crmRestaurantsApi,
  type RestaurantBody,
  type RestaurantRow,
  type RestaurantStatus,
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
  Tabs,
  fmtDate,
  statusTone,
} from "@/src/components/crm/ui";
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/src/components/icons";
import { hasPermission } from "@/src/lib/auth";

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "PROSPECT", label: "Prospect" },
  { key: "ACTIVE", label: "Active" },
  { key: "INACTIVE", label: "Inactive" },
  { key: "CHURNED", label: "Churned" },
];

export default function CrmRestaurantsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<RestaurantRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RestaurantRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = hasPermission("restaurants.create");
  const canUpdate = hasPermission("restaurants.update");
  const canDelete = hasPermission("restaurants.delete");

  // Deep link: /dashboard/crm/restaurants?new=1 opens the create modal.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setAdding(true);
  }, []);

  const params = {
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.restaurants(params),
    queryFn: () => crmRestaurantsApi.list(params),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["crm", "restaurants"] });

  const del = useMutation({
    mutationFn: (id: number) => crmRestaurantsApi.remove(id),
    onSuccess: () => {
      setActionError(null);
      setNotice("Restaurant deleted.");
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e) => {
      setConfirmDelete(null);
      setActionError(e instanceof ApiError ? e.message : "Could not delete restaurant.");
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Restaurants"
        subtitle={`${data?.total ?? "…"} restaurant clients`}
        action={
          canCreate ? (
            <Btn
              onClick={() => {
                setNotice(null);
                setActionError(null);
                setAdding(true);
              }}
            >
              <PlusIcon className="h-4 w-4" />
              Add restaurant
            </Btn>
          ) : undefined
        }
      />
      {error instanceof ApiError && <Notice kind="error">{error.message}</Notice>}
      {actionError && <Notice kind="error">{actionError}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      <Tabs
        tabs={STATUS_TABS}
        active={status}
        onChange={(key) => {
          setStatus(key);
          setPage(1);
        }}
      />

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={`${inputCls} pl-10`}
          placeholder="Search name, owner, contact or GST…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <TableShell
          head={[
            "Name",
            "Owner",
            "Contact",
            "City",
            "Type",
            "Outlets",
            "Agreement ends",
            "Status",
            "Tickets",
            "",
          ]}
        >
          {isLoading && <EmptyRow cols={10} label="Loading…" />}
          {!isLoading && !data?.restaurants.length && (
            <EmptyRow cols={10} label="No restaurants found" />
          )}
          {data?.restaurants.map((r) => (
            <tr key={r.restaurantId} className="transition-colors hover:bg-accent/50">
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/crm/restaurants/${r.restaurantId}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {r.name}
                </Link>
                <div className="text-xs text-muted-foreground">#{r.restaurantId}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{r.ownerName ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                <div>{r.contactNumber ?? "—"}</div>
                <div className="text-xs">{r.email ?? ""}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{r.city ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.restaurantType ?? "—"}</td>
              <td className="px-4 py-3 text-foreground">{r.outlets}</td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.agreementEnd)}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </td>
              <td className="px-4 py-3 text-foreground">{r._count?.tickets ?? 0}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      title="Edit restaurant"
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(r)}
                      title="Delete restaurant"
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

      {adding && (
        <RestaurantFormModal
          restaurant={null}
          onClose={() => setAdding(false)}
          onSaved={(name) => {
            setAdding(false);
            setActionError(null);
            setNotice(`Restaurant “${name}” created.`);
            invalidate();
          }}
        />
      )}
      {editing && (
        <RestaurantFormModal
          restaurant={editing}
          onClose={() => setEditing(null)}
          onSaved={(name) => {
            setEditing(null);
            setActionError(null);
            setNotice(`Restaurant “${name}” updated.`);
            invalidate();
          }}
        />
      )}
      {confirmDelete && (
        <Modal title="Delete restaurant?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-muted-foreground">
            This will permanently delete{" "}
            <strong className="text-foreground">{confirmDelete.name}</strong> and its contract,
            documents and ticket history. This action is irreversible.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Btn tone="ghost" onClick={() => setConfirmDelete(null)} disabled={del.isPending}>
              Cancel
            </Btn>
            <Btn tone="danger" busy={del.isPending} onClick={() => del.mutate(confirmDelete.restaurantId)}>
              Delete restaurant
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------- Create / edit modal -------------------------- */

const RESTAURANT_TYPES = ["Fine Dine", "QSR", "Cafe", "Cloud Kitchen", "Banquet", "Other"];
const RESTAURANT_STATUSES: RestaurantStatus[] = ["PROSPECT", "ACTIVE", "INACTIVE", "CHURNED"];

function RestaurantFormModal({
  restaurant,
  onClose,
  onSaved,
}: {
  restaurant: RestaurantRow | null;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [form, setForm] = useState({
    name: restaurant?.name ?? "",
    ownerName: restaurant?.ownerName ?? "",
    contactNumber: restaurant?.contactNumber ?? "",
    email: restaurant?.email ?? "",
    gstNumber: restaurant?.gstNumber ?? "",
    address: restaurant?.address ?? "",
    city: restaurant?.city ?? "",
    restaurantType: restaurant?.restaurantType ?? "",
    outlets: String(restaurant?.outlets ?? 1),
    status: restaurant?.status ?? "PROSPECT",
    agreementStart: restaurant?.agreementStart?.slice(0, 10) ?? "",
    agreementEnd: restaurant?.agreementEnd?.slice(0, 10) ?? "",
    servicePackage: restaurant?.servicePackage ?? "",
    pricingPlan: restaurant?.pricingPlan ?? "",
    fssaiNumber: restaurant?.fssaiNumber ?? "",
    agreementCopyUrl: restaurant?.agreementCopyUrl ?? "",
    gstCertificateUrl: restaurant?.gstCertificateUrl ?? "",
    fssaiLicenseUrl: restaurant?.fssaiLicenseUrl ?? "",
    notes: restaurant?.notes ?? "",
    linkedUserId: restaurant?.linkedUserId != null ? String(restaurant.linkedUserId) : "",
  });
  const [err, setErr] = useState("");

  const save = useMutation({
    mutationFn: (body: RestaurantBody & { name: string }) =>
      restaurant
        ? crmRestaurantsApi.update(restaurant.restaurantId, body)
        : crmRestaurantsApi.create(body),
    onSuccess: (row) => onSaved(row.name),
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not save restaurant."),
  });

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const opt = (v: string) => (v.trim() ? v.trim() : undefined);

  return (
    <Modal wide title={restaurant ? `Edit ${restaurant.name}` : "Add restaurant"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErr("");
          const name = form.name.trim();
          if (!name) return setErr("Name is required.");
          save.mutate({
            name,
            status: form.status as RestaurantStatus,
            outlets: Number(form.outlets) || 1,
            ownerName: opt(form.ownerName),
            contactNumber: opt(form.contactNumber),
            email: opt(form.email),
            gstNumber: opt(form.gstNumber),
            address: opt(form.address),
            city: opt(form.city),
            restaurantType: opt(form.restaurantType),
            agreementStart: opt(form.agreementStart),
            agreementEnd: opt(form.agreementEnd),
            servicePackage: opt(form.servicePackage),
            pricingPlan: opt(form.pricingPlan),
            fssaiNumber: opt(form.fssaiNumber),
            agreementCopyUrl: opt(form.agreementCopyUrl),
            gstCertificateUrl: opt(form.gstCertificateUrl),
            fssaiLicenseUrl: opt(form.fssaiLicenseUrl),
            notes: opt(form.notes),
            linkedUserId: form.linkedUserId.trim() ? Number(form.linkedUserId) : undefined,
          });
        }}
      >
        {err && <Notice kind="error">{err}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Name">
              <input className={inputCls} value={form.name} onChange={set("name")} autoFocus />
            </Field>
          </div>
          <Field label="Owner name">
            <input className={inputCls} value={form.ownerName} onChange={set("ownerName")} />
          </Field>
          <Field label="Contact number">
            <input
              className={inputCls}
              value={form.contactNumber}
              onChange={set("contactNumber")}
              inputMode="numeric"
              placeholder="9876543210"
            />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="GST number">
            <input className={inputCls} value={form.gstNumber} onChange={set("gstNumber")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <input className={inputCls} value={form.address} onChange={set("address")} />
            </Field>
          </div>
          <Field label="City">
            <input className={inputCls} value={form.city} onChange={set("city")} />
          </Field>
          <Field label="Restaurant type">
            <select className={inputCls} value={form.restaurantType} onChange={set("restaurantType")}>
              <option value="">Select type…</option>
              {RESTAURANT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Outlets">
            <input
              className={inputCls}
              type="number"
              min={1}
              value={form.outlets}
              onChange={set("outlets")}
            />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={form.status} onChange={set("status")}>
              {RESTAURANT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Agreement start">
            <input
              className={inputCls}
              type="date"
              value={form.agreementStart}
              onChange={set("agreementStart")}
            />
          </Field>
          <Field label="Agreement end">
            <input
              className={inputCls}
              type="date"
              value={form.agreementEnd}
              onChange={set("agreementEnd")}
            />
          </Field>
          <Field label="Service package">
            <input className={inputCls} value={form.servicePackage} onChange={set("servicePackage")} />
          </Field>
          <Field label="Pricing plan">
            <input className={inputCls} value={form.pricingPlan} onChange={set("pricingPlan")} />
          </Field>
          <Field label="FSSAI number">
            <input className={inputCls} value={form.fssaiNumber} onChange={set("fssaiNumber")} />
          </Field>
          <Field
            label="Linked customer userId"
            hint="optional — the customer login that places this restaurant's bookings"
          >
            <input
              className={inputCls}
              type="number"
              value={form.linkedUserId}
              onChange={set("linkedUserId")}
            />
          </Field>
          <Field label="Agreement copy URL">
            <input
              className={inputCls}
              value={form.agreementCopyUrl}
              onChange={set("agreementCopyUrl")}
              placeholder="https://"
            />
          </Field>
          <Field label="GST certificate URL">
            <input
              className={inputCls}
              value={form.gstCertificateUrl}
              onChange={set("gstCertificateUrl")}
              placeholder="https://"
            />
          </Field>
          <Field label="FSSAI license URL">
            <input
              className={inputCls}
              value={form.fssaiLicenseUrl}
              onChange={set("fssaiLicenseUrl")}
              placeholder="https://"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea className={inputCls} rows={3} value={form.notes} onChange={set("notes")} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Btn tone="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" busy={save.isPending}>
            {restaurant ? "Save changes" : "Create restaurant"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
