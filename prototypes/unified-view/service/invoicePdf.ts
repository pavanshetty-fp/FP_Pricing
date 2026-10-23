import { DATE_FMT } from "../data";
import {
  feesTotal,
  formatHours,
  jobsOf,
  money,
  partsTotal,
  technicianById,
  type ServiceOrder,
} from "./work";

/*
  A REAL INVOICE TO DOWNLOAD (Pavan, 2026-09-25).

  A one-page PDF written by hand — no library, so the single-file build stays
  self-contained. Text only, in the two standard PDF fonts, which every reader
  has. The figures come from the same helpers the order sheet's Summary uses,
  so the file and the screen cannot disagree.

  `partial` marks a rolled-over job's invoice: what was done on this visit,
  with the parts still owed listed and not charged.
*/

/** The standard fonts speak WinAnsi; keep to plain ASCII so nothing breaks. */
const ascii = (s: string) =>
  s
    .replace(/[—–]/g, "-")
    .replace(/×/g, "x")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/·/g, "-")
    .replace(/[^\x20-\x7E]/g, "");

const esc = (s: string) => ascii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

type Op = { x: number; y: number; text: string; bold?: boolean; size?: number; right?: boolean };

/** Rough Helvetica width, good enough to right-align a column of figures. */
const widthOf = (text: string, size: number) => ascii(text).length * size * 0.52;

function pdfFrom(ops: Op[], rules: { x1: number; x2: number; y: number }[]): Blob {
  const stream = [
    ...rules.map((r) => `0.8 G ${r.x1} ${r.y} m ${r.x2} ${r.y} l S`),
    ...ops.map((o) => {
      const size = o.size ?? 10;
      const x = o.right ? o.x - widthOf(o.text, size) : o.x;
      return `BT /${o.bold ? "F2" : "F1"} ${size} Tf 0 g ${x.toFixed(1)} ${o.y} Td (${esc(o.text)}) Tj ET`;
    }),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: "application/pdf" });
}

export function invoicePdf(order: ServiceOrder, opts: { partial?: boolean } = {}): Blob {
  const ops: Op[] = [];
  const rules: { x1: number; x2: number; y: number }[] = [];
  const L = 56;
  const R = 556;
  let y = 740;
  const line = (text: string, o: Partial<Op> = {}) => ops.push({ x: L, y, text, ...o });

  const issued = DATE_FMT.format(new Date(order.invoicedAt ?? order.invoiceSentAt ?? new Date().toISOString()));
  line(opts.partial ? "PARTIAL INVOICE" : "INVOICE", { bold: true, size: 20 });
  ops.push({ x: R, y, text: "FleetPanda Service", bold: true, size: 12, right: true });
  y -= 18;
  line(`Invoice ${order.orderNo}-INV · Issued ${issued}`, { size: 10 });
  y -= 30;

  line("Bill to", { bold: true });
  ops.push({ x: 320, y, text: "Job", bold: true });
  y -= 15;
  const tech = technicianById(order.technicianId);
  const left = [order.customer, order.shipTo, order.poc ? `${order.poc.name} - ${order.poc.email}` : ""].filter(Boolean);
  const right = [
    `Order ${order.orderNo}`,
    order.scheduledAt ? `Date ${DATE_FMT.format(new Date(order.scheduledAt))}` : "",
    tech ? `Technician ${tech.name}` : "",
  ].filter(Boolean);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i]) line(left[i]);
    if (right[i]) ops.push({ x: 320, y, text: right[i] });
    y -= 14;
  }
  y -= 12;

  const work = order.assets.flatMap((a) => jobsOf(a).map((j) => ({ asset: a.assetName, ...j }))).filter((j) => j.workType);
  if (work.length) {
    line("Work done", { bold: true });
    y -= 15;
    for (const w of work) {
      line(w.asset ? `${w.workType} - ${w.asset}` : w.workType);
      y -= 14;
    }
    y -= 12;
  }

  /* THE CHARGES TABLE */
  line("Description", { bold: true });
  ops.push({ x: 380, y, text: "Qty", bold: true, right: true });
  ops.push({ x: 470, y, text: "Unit", bold: true, right: true });
  ops.push({ x: R, y, text: "Amount", bold: true, right: true });
  y -= 6;
  rules.push({ x1: L, x2: R, y });
  y -= 14;
  const row = (desc: string, qty: string, unit: string, amount: number) => {
    line(desc);
    if (qty) ops.push({ x: 380, y, text: qty, right: true });
    if (unit) ops.push({ x: 470, y, text: unit, right: true });
    ops.push({ x: R, y, text: money(amount), right: true });
    y -= 16;
  };
  for (const p of order.parts) row(p.name || "Part", String(p.qty), money(p.cost), p.cost * p.qty);
  if (order.labor > 0 || order.laborRate > 0)
    row(`Labor (${formatHours(order.labor)})`, "", `${money(order.laborRate)}/h`, order.labor * order.laborRate);
  for (const f of order.fees) row(f.name || "Fee", "", "", f.amount);
  for (const f of order.extraCharges) row(f.name || "Charge", "", "", f.amount);
  rules.push({ x1: L, x2: R, y: y + 8 });
  y -= 6;
  const total =
    partsTotal(order.parts) + order.labor * order.laborRate + feesTotal(order.fees) + feesTotal(order.extraCharges);
  line("Total due", { bold: true, size: 12 });
  ops.push({ x: R, y, text: money(total), bold: true, size: 12, right: true });
  y -= 28;

  const owed = (order.unavailableParts ?? []).filter((p) => p.name);
  if (owed.length) {
    line(opts.partial ? "Still to come (not charged on this invoice)" : "Not included - parts not available", { bold: true });
    y -= 15;
    for (const p of owed) {
      line(`${p.name} x ${p.qty}`);
      y -= 14;
    }
    y -= 12;
  }

  if (order.payment) {
    line("Payment", { bold: true });
    y -= 15;
    line(`Received ${money(order.payment.amount)} on ${DATE_FMT.format(new Date(order.payment.paidAt))} by ${order.payment.method} (${order.payment.reference})`);
    y -= 14;
  } else {
    line(`Status: ${order.status}`, { size: 9 });
  }

  return pdfFrom(ops, rules);
}

/** Save the invoice as a file. */
export function downloadInvoice(order: ServiceOrder, opts: { partial?: boolean } = {}) {
  const url = URL.createObjectURL(invoicePdf(order, opts));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${order.orderNo}-${opts.partial ? "partial-" : ""}invoice.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
