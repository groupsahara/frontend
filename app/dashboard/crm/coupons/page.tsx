"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customersApi, type CampaignCoupon } from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
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
} from "@/src/components/crm/ui";
import { PlusIcon } from "@/src/components/icons";
import { hasPermission } from "@/src/lib/auth";

const statusTone: Record<CampaignCoupon["status"], string> = {
  ACTIVE: "success",
  DISABLED: "muted",
  EXPIRED: "danger",
  EXHAUSTED: "warning",
};

/**
 * Campaign coupons — one code any customer may redeem once.
 *
 * The case this exists for: a ₹1 promotion, where the customer pays a fixed
 * total no matter what the service costs. The partner is unaffected — they are
 * still paid, and charged commission on, the job's full list price, so the
 * discount comes out of the platform's pocket rather than theirs.
 */
export default function CampaignCouponsPage() {
  const [creating, setCreating] = useState(false);
  const canManage = hasPermission("customers.update");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "coupon-campaigns"],
    queryFn: () => customersApi.campaigns(),
  });

  const coupons = data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Coupons"
        subtitle="Codes any customer can use — set the price they pay and the date it stops working."
        action={
          canManage ? (
            <Btn onClick={() => setCreating(true)}>
              <PlusIcon className="h-4 w-4" /> New coupon
            </Btn>
          ) : undefined
        }
      />

      <Card>
        <TableShell head={["Code", "Customer pays", "Valid till", "Used", "Status", ""]}>
          {isLoading && <EmptyRow cols={6} label="Loading…" />}
          {!isLoading && !coupons.length && (
            <EmptyRow cols={6} label="No coupons yet — create one to run a promotion." />
          )}
          {coupons.map((c) => (
            <CouponRow key={c.couponId} coupon={c} canManage={canManage} />
          ))}
        </TableShell>
      </Card>

      {creating && <CreateCouponModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function CouponRow({ coupon: c, canManage }: { coupon: CampaignCoupon; canManage: boolean }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => customersApi.updateCampaign(c.couponId, { isActive: !c.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "coupon-campaigns"] }),
  });

  return (
    <tr className="transition-colors hover:bg-accent/50">
      <td className="px-4 py-3">
        <div className="font-mono font-medium text-foreground">{c.code}</div>
        <div className="text-xs text-muted-foreground">{c.description}</div>
      </td>
      <td className="px-4 py-3 text-foreground">
        {c.discountType === "FLAT_TOTAL" && c.flatTotal != null
          ? `₹${c.flatTotal} total`
          : "—"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.validTill)}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {c.redemptions}
        {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
      </td>
      <td className="px-4 py-3">
        <Badge tone={statusTone[c.status]}>{c.status}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        {canManage && (
          <Btn small tone="ghost" busy={toggle.isPending} onClick={() => toggle.mutate()}>
            {c.isActive ? "Disable" : "Enable"}
          </Btn>
        )}
      </td>
    </tr>
  );
}

function CreateCouponModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("RC1");
  const [flatTotal, setFlatTotal] = useState("1");
  const [validTill, setValidTill] = useState("");
  const [description, setDescription] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [err, setErr] = useState("");

  const create = useMutation({
    mutationFn: () =>
      customersApi.createCampaign({
        code: code.trim().toUpperCase(),
        flatTotal: Number(flatTotal),
        validTill,
        description: description.trim() || undefined,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "coupon-campaigns"] });
      onClose();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not create the coupon."),
  });

  const submit = () => {
    setErr("");
    if (!code.trim()) return setErr("Give the coupon a code.");
    if (!(Number(flatTotal) >= 1)) return setErr("The lowest chargeable amount is ₹1.");
    if (!validTill) return setErr("Choose the date this coupon stops working.");
    create.mutate();
  };

  return (
    <Modal title="New coupon" onClose={onClose}>
      <div className="space-y-4">
        {err && <Notice kind="error">{err}</Notice>}

        <Field label="Code">
          <input
            className={inputCls}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="RC1"
          />
        </Field>

        <Field label="Customer pays (total, GST included)">
          <input
            type="number"
            min={1}
            className={inputCls}
            value={flatTotal}
            onChange={(e) => setFlatTotal(e.target.value)}
          />
        </Field>

        <Field label="Valid till">
          <input
            type="date"
            className={inputCls}
            value={validTill}
            onChange={(e) => setValidTill(e.target.value)}
          />
        </Field>

        <Field label="Description (shown to customers)">
          <input
            className={inputCls}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Book any service for just ₹1"
          />
        </Field>

        <Field label="Maximum redemptions (optional)">
          <input
            type="number"
            min={1}
            className={inputCls}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            placeholder="Leave blank for unlimited"
          />
        </Field>

        <p className="rounded-xl bg-accent/40 px-4 py-3 text-xs text-muted-foreground">
          Every customer can use this code once. Whatever the service costs, they pay the amount
          above — the partner is still paid the job&rsquo;s full price, so the discount is the
          platform&rsquo;s cost, not theirs.
        </p>

        <div className="flex justify-end gap-2">
          <Btn tone="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn busy={create.isPending} onClick={submit}>
            Create coupon
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
