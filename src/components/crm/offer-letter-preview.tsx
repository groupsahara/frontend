"use client";

import type { OfferLetterRow } from "@/src/api/api";
import { buildOfferLetterHtml } from "@/src/lib/offer-letter";

// Renders the exact printable letter inside a sandboxed iframe so the document
// stylesheet can't leak into (or inherit from) the panel. Same HTML the PDF
// download uses, minus the auto-print trigger.
export function OfferLetterPreview({
  offer,
  height = 540,
}: {
  offer: OfferLetterRow;
  height?: number;
}) {
  return (
    <iframe
      title={`Offer letter for ${offer.candidateName}`}
      srcDoc={buildOfferLetterHtml(offer)}
      sandbox="allow-same-origin"
      className="w-full rounded-xl border border-border bg-white"
      style={{ height }}
    />
  );
}
