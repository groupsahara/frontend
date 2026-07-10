"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import {
  crmQueryKeys,
  crmRestaurantsApi,
  type CrmBookingRow,
  type RestaurantBody,
  type RestaurantDetail,
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
import { PencilIcon, SpinnerIcon } from "@/src/components/icons";
import { hasPermission } from "@/src/lib/auth";

const PAGE_SIZE = 20;

const DETAIL_TABS = [
  { key: "profile", label: "Profile" },
  { key: "contract", label: "Contract & Documents" },
  { key: "orders", label: "Order history" },
  { key: "tickets", label: "Tickets" },
];

export default function RestaurantDetailPage() {
  const params = useParams<{ id: string }>();
  const restaurantId = Number(params.id);
  const qc = useQueryClient();

  const [tab, setTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.restaurant(restaurantId),
    queryFn: () => crmRestaurantsApi.get(restaurantId),
    enabled: Number.isFinite(restaurantId),
  });

  const canUpdate = hasPermission("restaurants.update");

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <SpinnerIcon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <Link
          href="/dashboard/crm/restaurants"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to restaurants
        </Link>
        <Notice kind="error">
          {error instanceof ApiError ? error.message : "Restaurant not found."}
        </Notice>
      </div>
    );
  }

  const r = data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/crm/restaurants"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to restaurants
        </Link>
        <PageHeader
          title={r.name}
          subtitle={[r.restaurantType, r.city].filter(Boolean).join(" · ") || undefined}
          action={
            <div className="flex items-center gap-3">
              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              {canUpdate && (
                <Btn
                  tone="ghost"
                  onClick={() => {
                    setNotice(null);
                    setEditing(true);
                  }}
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </Btn>
              )}
            </div>
          }
        />
      </div>
      {notice && <Notice kind="success">{notice}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total bookings"
          value={r.orderStats ? String(r.orderStats.totalBookings) : "—"}
          hint={r.orderStats ? undefined : "Not linked to a customer login"}
        />
        <StatCard
          label="Revenue"
          value={r.orderStats ? `₹${r.orderStats.revenue.toLocaleString("en-IN")}` : "—"}
          hint={r.orderStats ? undefined : "Not linked to a customer login"}
        />
        <StatCard label="Outlets" value={String(r.outlets)} />
        <StatCard label="Agreement ends" value={fmtDate(r.agreementEnd)} />
      </div>

      <Tabs tabs={DETAIL_TABS} active={tab} onChange={setTab} />

      {tab === "profile" && <ProfileTab r={r} />}
      {tab === "contract" && <ContractTab r={r} />}
      {tab === "orders" && (
        <OrdersTab restaurantId={r.restaurantId} linked={r.linkedUserId != null} />
      )}
      {tab === "tickets" && <TicketsTab r={r} />}

      {editing && (
        <RestaurantFormModal
          restaurant={r}
          onClose={() => setEditing(false)}
          onSaved={(name) => {
            setEditing(false);
            setNotice(`Restaurant “${name}” updated.`);
            qc.invalidateQueries({ queryKey: crmQueryKeys.restaurant(restaurantId) });
            qc.invalidateQueries({ queryKey: ["crm", "restaurants"] });
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function ProfileTab({ r }: { r: RestaurantDetail }) {
  return (
    <Card className="p-6">
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <Item label="Owner">{r.ownerName ?? "—"}</Item>
        <Item label="Contact number">{r.contactNumber ?? "—"}</Item>
        <Item label="Email">{r.email ?? "—"}</Item>
        <Item label="GST number">{r.gstNumber ?? "—"}</Item>
        <Item label="Address">{r.address ?? "—"}</Item>
        <Item label="City">{r.city ?? "—"}</Item>
        <Item label="Restaurant type">{r.restaurantType ?? "—"}</Item>
        <Item label="Notes">{r.notes ?? "—"}</Item>
        <Item label="Linked customer">
          {r.linkedUser
            ? `${r.linkedUser.name ?? "Unnamed"} (#${r.linkedUser.userId})`
            : r.linkedUserId != null
              ? `#${r.linkedUserId}`
              : "—"}
        </Item>
        <Item label="Created">{fmtDate(r.createdAt)}</Item>
      </dl>
    </Card>
  );
}

function DocLink({ url }: { url: string | null }) {
  if (!url) return <>—</>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary hover:underline"
    >
      Open
    </a>
  );
}

function ContractTab({ r }: { r: RestaurantDetail }) {
  return (
    <Card className="p-6">
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <Item label="Agreement start">{fmtDate(r.agreementStart)}</Item>
        <Item label="Agreement end">{fmtDate(r.agreementEnd)}</Item>
        <Item label="Service package">{r.servicePackage ?? "—"}</Item>
        <Item label="Pricing plan">{r.pricingPlan ?? "—"}</Item>
        <Item label="FSSAI number">{r.fssaiNumber ?? "—"}</Item>
        <Item label="Agreement copy">
          <DocLink url={r.agreementCopyUrl} />
        </Item>
        <Item label="GST certificate">
          <DocLink url={r.gstCertificateUrl} />
        </Item>
        <Item label="FSSAI license">
          <DocLink url={r.fssaiLicenseUrl} />
        </Item>
      </dl>
    </Card>
  );
}

type BookingWithRating = CrmBookingRow & { rating?: { rating: number } | null };

function OrdersTab({ restaurantId, linked }: { restaurantId: number; linked: boolean }) {
  const [page, setPage] = useState(1);
  const params = { page, limit: PAGE_SIZE };

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.restaurantBookings(restaurantId, params),
    queryFn: () => crmRestaurantsApi.bookings(restaurantId, params),
    placeholderData: keepPreviousData,
    enabled: linked,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const bookings = (data?.bookings ?? []) as BookingWithRating[];

  return (
    <div className="space-y-4">
      {error instanceof ApiError && <Notice kind="error">{error.message}</Notice>}
      <Card>
        <TableShell head={["Booking #", "Service", "Date", "Amount", "Status", "Rating"]}>
          {!linked && (
            <EmptyRow
              cols={6}
              label="Not linked to a customer login — no order history to show"
            />
          )}
          {linked && isLoading && <EmptyRow cols={6} label="Loading…" />}
          {linked && !isLoading && !bookings.length && (
            <EmptyRow cols={6} label="No bookings yet" />
          )}
          {linked &&
            bookings.map((b) => (
              <tr key={b.bookingId} className="transition-colors hover:bg-accent/50">
                <td className="px-4 py-3 font-medium text-foreground">#{b.bookingId}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div>{b.service?.name ?? "—"}</div>
                  {b.variant?.name && <div className="text-xs">{b.variant.name}</div>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(b.bookingDate)}</td>
                <td className="px-4 py-3 text-foreground">
                  ₹{b.totalAmount.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{b.rating?.rating ?? "—"}</td>
              </tr>
            ))}
        </TableShell>
        {linked && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Btn tone="ghost" small disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Btn>
              <Btn
                tone="ghost"
                small
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function TicketsTab({ r }: { r: RestaurantDetail }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/dashboard/crm/tickets"
          className="text-sm font-medium text-primary hover:underline"
        >
          Open support desk →
        </Link>
      </div>
      <Card>
        <TableShell head={["Subject", "Category", "Status", "Priority", "Created"]}>
          {!r.tickets.length && <EmptyRow cols={5} label="No tickets for this restaurant" />}
          {r.tickets.map((t) => (
            <tr key={t.ticketId} className="transition-colors hover:bg-accent/50">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{t.subject}</div>
                <div className="text-xs text-muted-foreground">#{t.ticketId}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{t.category}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(t.status)}>{t.status}</Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{t.priority}</td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(t.createdAt)}</td>
            </tr>
          ))}
        </TableShell>
      </Card>
    </div>
  );
}

/* ------------------------- Create / edit modal -------------------------- */
// Duplicated from the restaurants list page so both files stay self-contained.

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
