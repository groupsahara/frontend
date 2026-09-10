"use client";

import { useQuery } from "@tanstack/react-query";
import { dispatcherApi, type LeadOutcome } from "@/src/api/api";

/**
 * Who a lead reached, and what each partner did with it.
 *
 * Acceptance and rejection were always recorded; the roster was not, so a
 * booking that went unassigned gave an admin nothing to look at — "every
 * partner ignored it" and "it reached nobody" looked the same. These two views
 * read the same log from either end: by booking, and by partner.
 */

const OUTCOME_LABEL: Record<LeadOutcome, string> = {
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  NO_RESPONSE: "No response",
};

const OUTCOME_CLASS: Record<LeadOutcome, string> = {
  ACCEPTED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  NO_RESPONSE: "bg-muted text-muted-foreground",
};

function OutcomeBadge({ outcome }: { outcome: LeadOutcome }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${OUTCOME_CLASS[outcome]}`}
    >
      {OUTCOME_LABEL[outcome]}
    </span>
  );
}

const km = (d: number | null) => (d == null ? "—" : `${d.toFixed(1)} km`);

const stamp = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/* ─────────────────── By booking: who was it sent to? ─────────────────── */

export function BookingLeadActivityPanel({ bookingId }: { bookingId: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "lead-activity", "booking", bookingId],
    queryFn: () => dispatcherApi.getBookingLeadActivity(bookingId),
    retry: false,
  });

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground">Loading lead activity…</p>
    );
  }
  if (isError || !data) {
    return (
      <p className="text-xs text-muted-foreground">
        Lead activity unavailable.
      </p>
    );
  }

  if (!data.recipients.length) {
    return (
      <p className="text-xs text-muted-foreground">
        {data.broadcastCount > 0
          ? "Broadcast, but no partner was eligible — nobody received this lead."
          : "Not broadcast yet. Leads sent before this log existed have no roster."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-foreground">
          Sent to {data.counts.sent} partner{data.counts.sent === 1 ? "" : "s"}
        </span>
        <span className="text-success">{data.counts.accepted} accepted</span>
        <span className="text-danger">{data.counts.rejected} rejected</span>
        <span className="text-muted-foreground">
          {data.counts.noResponse} no response
        </span>
        {data.broadcastCount > 1 && (
          <span className="text-muted-foreground">
            · {data.broadcastCount} broadcast rounds, last{" "}
            {stamp(data.lastBroadcastAt)}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {[
                "Partner",
                "Distance when sent",
                "Round",
                "Sent",
                "Outcome",
                "Reason",
              ].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2 text-left font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.recipients.map((r) => (
              <tr
                key={`${r.professionalId}-${r.attempt ?? "x"}`}
                className="border-t border-border"
              >
                <td className="whitespace-nowrap px-3 py-2 text-foreground">
                  {r.name}
                  {r.mobile ? (
                    <span className="ml-1 text-muted-foreground">
                      · {r.mobile}
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {km(r.distanceKm)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {r.attempt ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {stamp(r.sentAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <OutcomeBadge outcome={r.outcome} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {r.rejectionReason ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────── By partner: what were they offered? ─────────────── */

export function PartnerLeadActivitySection({
  professionalId,
}: {
  professionalId: number;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "lead-activity", "partner", professionalId],
    queryFn: () =>
      dispatcherApi.getPartnerLeadActivity(professionalId, { limit: 25 }),
    retry: false,
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Lead activity
        </h2>
        {data && (
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-muted-foreground">
              {data.counts.offers} offers
            </span>
            <span className="text-success">
              {data.counts.accepted} accepted
            </span>
            <span className="text-danger">{data.counts.rejected} rejected</span>
            <span className="text-muted-foreground">
              {data.counts.noResponse} no response
            </span>
          </div>
        )}
      </div>

      {isLoading && (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      )}
      {isError && (
        <p className="mt-3 text-sm text-muted-foreground">
          Lead activity unavailable.
        </p>
      )}

      {data && !data.leads.length && (
        <p className="mt-3 text-sm text-muted-foreground">
          No leads recorded for this partner yet. Only leads broadcast after
          this log was added appear here.
        </p>
      )}

      {data && data.leads.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {[
                  "Booking",
                  "Service",
                  "Distance when sent",
                  "Sent",
                  "Outcome",
                  "Note",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-left font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.leads.map((l) => (
                <tr
                  key={`${l.bookingId}-${l.attempt}`}
                  className="border-t border-border"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-foreground">
                    #{l.bookingId}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {l.serviceName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {km(l.distanceKm)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {stamp(l.sentAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <OutcomeBadge outcome={l.outcome} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {l.rejectionReason ??
                      (l.outcome === "NO_RESPONSE" && l.takenByOther
                        ? "Another partner took it"
                        : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.total > data.leads.length && (
            <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Showing the {data.leads.length} most recent of {data.total}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
