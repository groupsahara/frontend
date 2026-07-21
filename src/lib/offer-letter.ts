// Offer-letter document renderer. One source of truth for the printable HTML
// so the on-screen preview (an <iframe srcDoc>), the HR download, and the
// employee download all look identical. Mirrors the invoice/payslip approach:
// build a self-contained HTML string → open a window → browser "Save as PDF".

import type { OfferLetterRow } from "@/src/api/api";

const EMPLOYMENT_LABEL: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERN: "Internship",
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

// "2026-08-01" → "01 August 2026". Falls back to the raw string if unparseable.
const longDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const parsed = new Date(`${d}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const STATUS_STAMP: Record<string, { label: string; color: string } | undefined> = {
  ACCEPTED: { label: "ACCEPTED", color: "#16a34a" },
  DECLINED: { label: "DECLINED", color: "#dc2626" },
  WITHDRAWN: { label: "WITHDRAWN", color: "#6b7280" },
};

export const offerLetterStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f1f5f9; }
  .sheet {
    font-family: Georgia, "Times New Roman", serif;
    color: #1f2933; background: #fff; max-width: 820px; margin: 24px auto;
    padding: 56px 60px; line-height: 1.6; font-size: 14px; position: relative;
    box-shadow: 0 1px 4px rgba(0,0,0,.08);
  }
  .sheet h1 { font-size: 22px; letter-spacing: .5px; margin: 0; color: #0f172a; }
  .head { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 28px; }
  .head .addr { font-size: 12px; color: #64748b; margin-top: 4px; max-width: 260px; }
  .head .meta { text-align: right; font-size: 12px; color: #475569; }
  .head .meta b { color: #0f172a; }
  .title { text-align: center; font-size: 15px; font-weight: bold; letter-spacing: 2px;
    text-transform: uppercase; margin: 8px 0 26px; color: #0f172a; }
  .sheet p { margin: 0 0 14px; }
  table.kv { width: 100%; border-collapse: collapse; margin: 6px 0 20px; font-size: 13px; }
  table.kv td { padding: 7px 10px; border: 1px solid #e2e8f0; }
  table.kv td.k { background: #f8fafc; font-weight: bold; width: 40%; color: #334155; }
  table.pay { width: 100%; border-collapse: collapse; margin: 4px 0 20px; font-size: 13px; }
  table.pay th, table.pay td { padding: 8px 10px; border: 1px solid #e2e8f0; text-align: left; }
  table.pay th { background: #0f172a; color: #fff; font-weight: 600; }
  table.pay td.amt, table.pay th.amt { text-align: right; }
  table.pay tr.total td { font-weight: bold; background: #f8fafc; }
  .note { background: #f8fafc; border-left: 3px solid #94a3b8; padding: 10px 14px;
    font-size: 13px; margin: 0 0 20px; color: #334155; }
  .sign { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
  .sign .col { width: 46%; font-size: 13px; }
  .sign .line { border-top: 1px solid #475569; margin-top: 48px; padding-top: 6px; color: #475569; }
  .foot { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 12px;
    font-size: 11px; color: #94a3b8; text-align: center; }
  .stamp { position: absolute; top: 120px; right: 60px; border: 4px solid; border-radius: 8px;
    padding: 6px 16px; font-size: 26px; font-weight: bold; letter-spacing: 3px;
    transform: rotate(-14deg); opacity: .16; }
  @media print {
    body { background: #fff; }
    .sheet { box-shadow: none; margin: 0; max-width: none; padding: 40px 48px; }
  }
`;

// The letter body only (no <html>/<head>) — embedded by both the print document
// and the on-screen preview iframe.
export function buildOfferLetterInner(o: OfferLetterRow): string {
  const stamp = STATUS_STAMP[o.status];
  const company = esc(o.companyName || "Restocare");
  const detailed = o.templateKey === "detailed";
  const b = o.computed.breakup;
  const monthly = o.computed.monthlyCtc;

  const payTable = detailed
    ? `
    <p style="margin-bottom:6px"><b>Compensation break-up</b></p>
    <table class="pay">
      <thead><tr><th>Component</th><th class="amt">Monthly</th><th class="amt">Annual</th></tr></thead>
      <tbody>
        <tr><td>Basic</td><td class="amt">${inr(b.basic)}</td><td class="amt">${inr(b.basic * 12)}</td></tr>
        <tr><td>House Rent Allowance</td><td class="amt">${inr(b.hra)}</td><td class="amt">${inr(b.hra * 12)}</td></tr>
        <tr><td>Special Allowance</td><td class="amt">${inr(b.specialAllowance)}</td><td class="amt">${inr(b.specialAllowance * 12)}</td></tr>
        <tr class="total"><td>Cost to Company (CTC)</td><td class="amt">${inr(monthly)}</td><td class="amt">${inr(o.annualCtc)}</td></tr>
      </tbody>
    </table>`
    : "";

  return `
  <div class="sheet">
    ${stamp ? `<div class="stamp" style="color:${stamp.color};border-color:${stamp.color}">${stamp.label}</div>` : ""}
    <div class="head">
      <div>
        <h1>${company}</h1>
        ${o.companyAddress ? `<div class="addr">${esc(o.companyAddress)}</div>` : ""}
      </div>
      <div class="meta">
        <div><b>Ref:</b> ${esc(o.referenceNo || "DRAFT")}</div>
        <div><b>Date:</b> ${longDate(o.offerDate)}</div>
      </div>
    </div>

    <div class="title">Offer of Employment</div>

    <p>Dear ${esc(o.candidateName)},</p>
    <p>
      We are delighted to extend an offer for the position of <b>${esc(o.designation)}</b>${
        o.departmentName ? ` in the ${esc(o.departmentName)} department` : ""
      } at ${company}. Based on your profile and our discussions, we believe you will be a
      valuable addition to our team. The principal terms of your employment are set out below.
    </p>

    <table class="kv">
      <tr><td class="k">Position</td><td>${esc(o.designation)}</td></tr>
      ${o.departmentName ? `<tr><td class="k">Department</td><td>${esc(o.departmentName)}</td></tr>` : ""}
      <tr><td class="k">Employment Type</td><td>${esc(EMPLOYMENT_LABEL[o.employmentType] || o.employmentType)}</td></tr>
      <tr><td class="k">Date of Joining</td><td>${longDate(o.joiningDate)}</td></tr>
      ${o.workLocation ? `<tr><td class="k">Work Location</td><td>${esc(o.workLocation)}</td></tr>` : ""}
      ${o.reportingTo ? `<tr><td class="k">Reporting To</td><td>${esc(o.reportingTo)}</td></tr>` : ""}
      <tr><td class="k">Probation Period</td><td>${o.probationMonths} month${o.probationMonths === 1 ? "" : "s"}</td></tr>
      <tr><td class="k">Annual CTC</td><td><b>${inr(o.annualCtc)}</b> (${esc(o.computed.annualInWords)})</td></tr>
    </table>

    ${payTable}

    <p>
      Your employment will be subject to a probation period of ${o.probationMonths} month${
        o.probationMonths === 1 ? "" : "s"
      }, during which your performance will be reviewed. You will be bound by the company's
      policies on confidentiality, code of conduct and data protection throughout your tenure.
    </p>

    ${o.customNote ? `<div class="note">${esc(o.customNote)}</div>` : ""}

    <p>
      This offer${
        o.responseByDate ? ` is valid until <b>${longDate(o.responseByDate)}</b> and` : ""
      } is contingent upon successful completion of our background verification.
      To accept, please sign in the space provided below or confirm acceptance from your
      employee portal.
    </p>

    <p>We look forward to welcoming you to ${company}.</p>

    <div class="sign">
      <div class="col">
        <div>Sincerely,</div>
        <div class="line">
          ${o.signatoryName ? `<b>${esc(o.signatoryName)}</b><br/>` : ""}
          ${esc(o.signatoryTitle || "Human Resources")}<br/>${company}
        </div>
      </div>
      <div class="col">
        <div>Accepted &amp; agreed,</div>
        <div class="line">${esc(o.candidateName)}<br/>Date: ____________________</div>
      </div>
    </div>

    <div class="foot">
      This is a system-generated offer letter${o.referenceNo ? ` (${esc(o.referenceNo)})` : ""} issued by ${company}.
    </div>
  </div>`;
}

// Full standalone document. `autoPrint` triggers the browser print dialog on
// load (used for the download/print action, not the preview iframe).
export function buildOfferLetterHtml(o: OfferLetterRow, autoPrint = false): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Offer Letter — ${esc(o.candidateName)}${o.referenceNo ? ` (${esc(o.referenceNo)})` : ""}</title>
  <style>${offerLetterStyles}</style>
</head>
<body>
  ${buildOfferLetterInner(o)}
  ${autoPrint ? `<script>window.onload=function(){setTimeout(function(){window.print();},350);};</script>` : ""}
</body>
</html>`;
}

// Open the letter in a new tab and trigger the print/save-as-PDF dialog. Falls
// back to a Blob URL when the popup is blocked (same as openInvoice).
export function downloadOfferLetter(o: OfferLetterRow): void {
  const html = buildOfferLetterHtml(o, true);
  const win = window.open("", "_blank");
  if (!win) {
    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
