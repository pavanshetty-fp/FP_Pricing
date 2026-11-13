import { Pill } from "@/components/ui/pill";
import { SheetSection, SheetSectionNote } from "@/components/side-sheet/parts";
import { SheetTable } from "../threepl/DirectoryRecordSheet";
import { DASH, formatDate } from "../threepl/directoryCore";
import type { ViewRow } from "./RecordViews";
import type { MdAsset } from "./assets";
import { DocumentsCell, Status, stamp } from "./assetParts";

/*
  ASSET 360 — THE OVERVIEW TAB (Pavan, 2026-11-13, after the Lovable asset
  page): every table about the asset on one tab — Asset movement orders,
  Deliveries, Service, Equipment, Billing — each with Lovable's columns. The
  journey and the activity log stay tabs of their own.

  ONE SEARCH AND STATUS FILTER FOR THE TAB: every row here is also a ViewRow
  (`overviewRows`), so the shared bar narrows all the tables at once.
*/

const usd = (n: number | null) =>
  n === null ? DASH : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Section = "movement" | "delivery" | "service" | "maintenance" | "compliance" | "leak" | "equipment" | "billing";

const row = (section: Section, id: string, text: Record<string, string>, status: string): ViewRow => ({
  id: `${section}:${id}`,
  text,
  status,
  values: { section },
});

/** Every Overview table's rows, for the shared search and Status filter. */
export function overviewRows(a: MdAsset): ViewRow[] {
  return [
    ...a.movements.map((m) => row("movement", m.id, { name: m.id, a: a.id, b: m.source, c: m.from, d: m.to }, m.status)),
    ...a.deliveries.map((d) => row("delivery", d.id, { name: d.id, a: d.product, b: d.carrier }, d.pod === "Attached" ? "Attached" : "Not attached")),
    ...a.serviceOrders.map((s) => row("service", s.id, { name: s.id, a: s.job, b: s.technician }, s.stage)),
    ...a.maintenance.map((m, i) => row("maintenance", String(i), { name: m.plan, a: m.cadence }, m.autoGenerate ? "On" : "Off")),
    ...a.compliance.map((c, i) => row("compliance", String(i), { name: c.requirement, a: c.authority }, c.status)),
    ...a.leakChecks.map((l) => row("leak", l.id, { name: l.id, a: l.technician, b: l.method }, l.result)),
    ...a.peripherals.map((p) => row("equipment", p.id, { name: p.type, a: p.model, b: p.serial }, p.status)),
    ...a.invoices.map((v) => row("billing", v.id, { name: v.id, a: v.serviceOrder }, v.status)),
  ];
}

const shownIn = (rows: ViewRow[], section: Section) =>
  new Set(rows.filter((r) => r.values?.section === section).map((r) => r.id.slice(section.length + 1)));

const note = (n: number, one: string, many: string) => (
  <SheetSectionNote>{`${n} ${n === 1 ? one : many}`}</SheetSectionNote>
);

export function AssetOverview({ asset: a, rows }: { asset: MdAsset; rows: ViewRow[] }) {
  const mv = shownIn(rows, "movement");
  const dl = shownIn(rows, "delivery");
  const so = shownIn(rows, "service");
  const mt = shownIn(rows, "maintenance");
  const cp = shownIn(rows, "compliance");
  const lk = shownIn(rows, "leak");
  const eq = shownIn(rows, "equipment");
  const bl = shownIn(rows, "billing");
  const movements = a.movements.filter((m) => mv.has(m.id));
  const deliveries = a.deliveries.filter((d) => dl.has(d.id));
  const services = a.serviceOrders.filter((s) => so.has(s.id));
  const maintenance = a.maintenance.filter((_, i) => mt.has(String(i)));
  const compliance = a.compliance.filter((_, i) => cp.has(String(i)));
  const leaks = a.leakChecks.filter((l) => lk.has(l.id));
  const peripherals = a.peripherals.filter((p) => eq.has(p.id));
  const invoices = a.invoices.filter((v) => bl.has(v.id));
  const billed = a.invoices.reduce((s, v) => s + v.total, 0);
  const ag = a.agreement;

  return (
    /* SCROLLS INSIDE THE WORK AREA, like a table (Pavan, 2026-11-13): grown
       to its full height it pushed the page past the work area, and the cards
       on the right slid away with the last one half cut. */
    <div className="flex h-full flex-col gap-10 overflow-auto overscroll-contain">
      <SheetSection title="Asset movement orders" flush note={note(movements.length, "order", "orders")}>
        <SheetTable
          rows={movements}
          rowKey={(m) => m.id}
          emptyBody="No asset movement orders yet."
          columns={[
            { key: "id", label: "Movement order", render: (m) => m.id },
            { key: "asset", label: "Asset", render: () => a.id },
            { key: "source", label: "Source", render: (m) => m.source },
            { key: "from", label: "From", render: (m) => m.from },
            { key: "to", label: "To", render: (m) => m.to },
            { key: "scheduled", label: "Scheduled", render: (m) => formatDate(m.scheduled) },
            { key: "status", label: "Status", render: (m) => <Status value={m.status} /> },
            {
              key: "documents",
              label: "Documents",
              render: (m) => (
                <DocumentsCell owner={m.id} files={m.documents === "Attached" ? [{ name: `${m.id} bill of lading.pdf`, kind: `Bill of lading · ${m.source}` }] : []} />
              ),
            },
          ]}
        />
      </SheetSection>

      <SheetSection title="Deliveries" flush note={<SheetSectionNote>Fuel delivery history</SheetSectionNote>}>
        <SheetTable
          rows={deliveries}
          rowKey={(d) => d.id}
          emptyBody="No fuel deliveries yet."
          columns={[
            { key: "id", label: "Delivery", render: (d) => d.id },
            { key: "date", label: "Date", render: (d) => formatDate(d.date) },
            { key: "product", label: "Product", render: (d) => d.product },
            { key: "gal", label: "Gallons", render: (d) => d.gal.toLocaleString() },
            { key: "carrier", label: "Carrier", render: (d) => d.carrier },
            { key: "amount", label: "Amount", render: (d) => usd(d.amount) },
            {
              key: "documents",
              label: "Documents",
              render: (d) => <DocumentsCell owner={d.id} files={[{ name: `${d.id} POD.pdf`, kind: `POD · ${d.pod}` }]} />,
            },
          ]}
        />
      </SheetSection>

      {/* SERVICE — Lovable's four parts: the orders, the agreement and its
          maintenance, compliance, leak checks. */}
      <SheetSection title="Service orders" flush note={<SheetSectionNote>Service order history</SheetSectionNote>}>
        <SheetTable
          rows={services}
          rowKey={(s) => s.id}
          emptyBody="No service orders for this asset yet."
          columns={[
            { key: "id", label: "Order", render: (s) => s.id },
            { key: "job", label: "Job", render: (s) => s.job },
            { key: "tech", label: "Technician", render: (s) => s.technician },
            { key: "scheduled", label: "Scheduled", render: (s) => stamp(s.scheduled) },
            { key: "amount", label: "Amount", render: (s) => usd(s.amount) },
            { key: "stage", label: "Stage", render: (s) => <Status value={s.stage} /> },
            {
              key: "documents",
              label: "Documents",
              render: (s) => <DocumentsCell owner={s.id} files={[{ name: `${s.id} completion.pdf`, kind: `Completion · ${s.documents}` }]} />,
            },
          ]}
        />
      </SheetSection>

      <SheetSection
        title="Service agreement and maintenance"
        flush
        note={ag ? <SheetSectionNote>{ag.autoRenew ? "Auto-renew on" : "Auto-renew off"}</SheetSectionNote> : undefined}
      >
        {ag ? (
          <dl className="grid grid-cols-4 gap-4 border-b border-fp-outline-1 p-4">
            {[
              ["Agreement", ag.id],
              ["Plan", ag.plan],
              ["Visits", `${ag.visitsUsed}/${ag.visitsTotal}`],
              ["Renews", formatDate(ag.renews)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-medium text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 text-sm text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="border-b border-fp-outline-1 px-4 py-3 text-sm text-muted-foreground">No service agreement.</p>
        )}
        <SheetTable
          rows={maintenance}
          rowKey={(m) => m.plan}
          emptyBody="No maintenance plans."
          columns={[
            { key: "plan", label: "Maintenance plan", render: (m) => m.plan },
            { key: "cadence", label: "Cadence", render: (m) => m.cadence },
            { key: "last", label: "Last", render: (m) => (m.last ? formatDate(m.last) : DASH) },
            { key: "next", label: "Next due", render: (m) => formatDate(m.next) },
            { key: "auto", label: "Auto-generate", render: (m) => <Pill>{m.autoGenerate ? "On" : "Off"}</Pill> },
          ]}
        />
      </SheetSection>

      <SheetSection title="Compliance and leak checks" flush note={note(a.compliance.length, "item", "items")}>
        <SheetTable
          rows={compliance}
          rowKey={(c) => c.requirement}
          emptyBody="No compliance requirements yet."
          columns={[
            { key: "req", label: "Requirement", render: (c) => c.requirement },
            { key: "auth", label: "Authority", render: (c) => c.authority },
            { key: "last", label: "Last", render: (c) => (c.last ? formatDate(c.last) : DASH) },
            { key: "due", label: "Due", render: (c) => formatDate(c.due) },
            { key: "status", label: "Status", render: (c) => <Status value={c.status} /> },
          ]}
        />
        <div className="border-t border-fp-outline-1">
          <SheetTable
            rows={leaks}
            rowKey={(l) => l.id}
            emptyBody="No leak checks yet."
            columns={[
              { key: "id", label: "Leak check", render: (l) => l.id },
              { key: "date", label: "Date", render: (l) => formatDate(l.date) },
              { key: "tech", label: "Technician", render: (l) => l.technician },
              { key: "method", label: "Method", render: (l) => l.method },
              { key: "pressure", label: "Pressure", render: (l) => l.pressure },
              { key: "result", label: "Result", render: (l) => <Status value={l.result} /> },
            ]}
          />
        </div>
      </SheetSection>

      <SheetSection title="Equipment" flush note={<SheetSectionNote>Peripherals and warranty</SheetSectionNote>}>
        <SheetTable
          rows={peripherals}
          rowKey={(p) => p.id}
          emptyBody="No peripherals on this asset."
          columns={[
            { key: "type", label: "Type", render: (p) => p.type },
            { key: "model", label: "Model", render: (p) => p.model },
            { key: "serial", label: "Serial", render: (p) => p.serial },
            { key: "installed", label: "Installed", render: (p) => formatDate(p.installed) },
            { key: "warranty", label: "Warranty ends", render: (p) => formatDate(p.warrantyEnds) },
            { key: "status", label: "Status", render: (p) => <Status value={p.status} /> },
          ]}
        />
      </SheetSection>

      <SheetSection
        title="Billing"
        flush
        note={<SheetSectionNote>{`${a.invoices.length} ${a.invoices.length === 1 ? "invoice" : "invoices"} · ${usd(billed)} billed`}</SheetSectionNote>}
      >
        <SheetTable
          rows={invoices}
          rowKey={(v) => v.id}
          emptyBody="No service invoices yet."
          columns={[
            { key: "id", label: "Invoice", render: (v) => v.id },
            { key: "so", label: "Service order", render: (v) => v.serviceOrder },
            { key: "issued", label: "Issued", render: (v) => formatDate(v.issued) },
            { key: "due", label: "Due", render: (v) => formatDate(v.due) },
            { key: "total", label: "Total", render: (v) => usd(v.total) },
            { key: "status", label: "Status", render: (v) => <Status value={v.status} /> },
          ]}
        />
      </SheetSection>
    </div>
  );
}
