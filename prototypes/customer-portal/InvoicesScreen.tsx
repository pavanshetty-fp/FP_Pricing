import * as React from "react";
import { toast } from "sonner";
import { Download, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertBanner, type BannerAlert } from "@/components/ui/alert-banner";
import { cn } from "@/lib/utils";
import { TwoLineCell, type ListColumn } from "../unified-view/ListTable";
import { printKey, useRequests } from "./orders";
import { RecordLink, usePortalNav } from "./nav";
import { CREDIT } from "./dashboard";
import { PortalList } from "./PortalList";
import { InvoiceSheet } from "./InvoiceSheet";
import { StatementView } from "./StatementView";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_TONE,
  SETTLED,
  TERMS,
  daysFrom,
  amountDue,
  inQuestion,
  invoiceSummary,
  totalOf,
  useInvoices,
  type Invoice,
} from "./invoices";

/*
  INVOICES (Pavan, 2026-10-14) — the Lovable reference's invoice page and
  flow, in our DS:

    overview   Outstanding · Overdue · Paid (last 90 days) · Terms (and the
               credit limit, where the tenant gives credit) — ONE read-only
               card, tiles ruled apart, as on Orders
    alerts     the DS banner with interaction, under the toolbar (the
               portal's place): overdue · payment disputed · due this week;
               each title filters the list to its status
    list       Invoice · Issued · Due · Order · Ship-to · Amount · Status ·
               Download — the portal list (the Unified View list as one piece)
    sheet      a row opens the invoice: summary and charges to the total

  NO "PAY" COLUMN. The portal does not take payments yet, so the status says
  where an invoice stands, and the last column is DOWNLOAD INVOICE — one
  icon, highlighted only when the pointer is on it.
*/

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type IK = "invoice" | "issued" | "due" | "order" | "shipTo" | "amount" | "status" | "download" | "actions";
const COLUMNS: ListColumn<IK>[] = [
  { key: "invoice", label: "Invoice", width: 130, sortable: true },
  { key: "issued", label: "Issued", width: 130, sortable: true },
  { key: "due", label: "Due", width: 150, sortable: true },
  { key: "order", label: "Order", width: 120, sortable: true },
  { key: "shipTo", label: "Ship-to", width: 170, sortable: true },
  { key: "amount", label: "Amount", width: 130, sortable: true, align: "right" },
  { key: "status", label: "Status", width: 170, sortable: true },
  { key: "download", label: "Download", width: 100, align: "center" },
  { key: "actions", label: "", width: 44 },
];

const dueNote = (i: Invoice) => {
  if (SETTLED.includes(i.status)) return "";
  /* AN OPEN DISPUTE PAUSES THE DUE DATE — never "overdue" while it lasts. */
  if (i.status === "Invoice disputed") return "Paused · disputed";
  const d = daysFrom(i.due);
  return d < 0 ? `${-d} ${d === -1 ? "day" : "days"} overdue` : d === 0 ? "Due today" : `In ${d} ${d === 1 ? "day" : "days"}`;
};

const text = (i: Invoice, k: IK): string => {
  switch (k) {
    case "invoice":
      return i.invoiceNo;
    case "issued":
      return printKey(i.issued);
    case "due":
      return `${printKey(i.due)} ${dueNote(i)}`;
    case "order":
      return i.orderNo;
    case "shipTo":
      return i.shipTo;
    case "amount":
      return usd.format(totalOf(i));
    case "status":
      return i.status;
    default:
      return "";
  }
};

/** The overview — four read-only tiles in one card. */
function Overview() {
  const s = invoiceSummary();
  const tiles = [
    { title: "Outstanding", value: usd0.format(s.outstanding), note: plural(s.openCount, "open invoice", "open invoices") },
    {
      title: "Overdue",
      value: usd0.format(s.overdue),
      note: plural(s.overdueCount, "invoice", "invoices"),
      tone: s.overdue > 0 ? "text-status-failed" : undefined,
    },
    { title: "Paid · last 90 days", value: usd0.format(s.paid90), note: plural(s.paid90Count, "invoice", "invoices") },
    {
      title: "Terms",
      value: TERMS,
      note: CREDIT.enabled ? `Credit limit ${usd0.format(CREDIT.limit)} a ${CREDIT.period}` : "Pay on invoice",
    },
  ];
  return (
    <div className="grid grid-cols-1 divide-y divide-border rounded-xl border border-border bg-fp-surface-1b sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
      {tiles.map((t) => (
        <section key={t.title} className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">{t.title}</h3>
          <p className={cn("text-3xl font-semibold tabular-nums text-foreground", t.tone)}>{t.value}</p>
          <p className="text-xs text-muted-foreground">{t.note}</p>
        </section>
      ))}
    </div>
  );
}

export function InvoicesScreen({ focus }: { focus?: { invoiceNo: string; n: number } | null } = {}) {
  const rows = useInvoices();
  const nav = usePortalNav();
  const requests = useRequests();
  const [openNo, setOpenNo] = React.useState<string | null>(null);
  /* TWO TABS (Pavan, 2026-10-15): the invoices, and the statement. */
  const [tab, setTab] = React.useState("invoices");
  const TABS = [
    { key: "invoices", label: "Invoices" },
    { key: "statement", label: "Statement" },
  ];
  /* OPENED FROM A LINK — the invoice behind an order. */
  React.useEffect(() => {
    if (focus) setOpenNo(focus.invoiceNo);
  }, [focus?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  /* THE ORDER, AS A LINK when it is still on the Orders page (PRD FR-10). */
  const orderCell = (no: string) =>
    requests.some((r) => r.requestNo === no) ? (
      <RecordLink label={no} onOpen={() => nav.openOrder(no)} />
    ) : (
      <span className="text-sm tabular-nums">{no}</span>
    );
  const [applied, setApplied] = React.useState<{ ids: string[]; n: number } | undefined>();
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const [snoozed, setSnoozed] = React.useState<Record<string, number>>({});
  const download = (i: Invoice) => toast.success(`${i.invoiceNo}.pdf downloaded`);
  const filterTo = (status: string) => setApplied({ ids: [`status:${status}`], n: Date.now() });
  /* WHICH ALERT'S FILTER IS ON — the list's filter is exactly its status. */
  const [facets, setFacets] = React.useState<string[]>([]);
  const ALERT_STATUS: Record<string, string> = { overdue: "Overdue", disputed: "Invoice disputed", due: "Payment due" };
  const appliedId =
    facets.length === 1 ? (Object.keys(ALERT_STATUS).find((k) => facets[0] === `status:${ALERT_STATUS[k]}`) ?? null) : null;

  /* THE ALERTS — what needs paying or settling, most urgent first. */
  const by = (st: Invoice["status"]) => rows.filter((i) => i.status === st);
  const items = (xs: Invoice[]) =>
    xs.map((i) => ({
      id: i.invoiceNo,
      title: `${i.invoiceNo} · ${usd.format(totalOf(i))}`,
      detail: `${i.shipTo} · ${dueNote(i) || printKey(i.due)}`,
      onApply: () => setOpenNo(i.invoiceNo),
    }));
  const overdue = by("Overdue");
  /* BOTH DISPUTES — the customer's and the tenant's. */
  const disputed = [...by("Invoice disputed"), ...by("Payment disputed")];
  const dueSoon = by("Payment due");
  const sum = (xs: Invoice[]) => usd0.format(xs.reduce((t, i) => t + totalOf(i), 0));
  const alerts = (
    [
      overdue.length > 0 && {
        id: "overdue",
        status: "warning" as const,
        tag: "Overdue",
        title: `${plural(overdue.length, "invoice is", "invoices are")} overdue`,
        detail: sum(overdue),
        count: overdue.length,
        onApply: () => filterTo("Overdue"),
        items: items(overdue),
      },
      disputed.length > 0 && {
        id: "disputed",
        status: "warning" as const,
        tag: "Disputed",
        title: `${plural(disputed.length, "invoice is", "invoices are")} disputed`,
        detail: usd0.format(disputed.reduce((t, i) => t + inQuestion(i), 0)),
        count: disputed.length,
        onApply: () => filterTo("Invoice disputed"),
        items: disputed.map((i) => ({
          id: i.invoiceNo,
          title: `${i.invoiceNo} · ${usd.format(inQuestion(i))} in question`,
          detail: i.dispute?.reason ?? i.shipTo,
          onApply: () => setOpenNo(i.invoiceNo),
        })),
      },
      dueSoon.length > 0 && {
        id: "due",
        status: "caution" as const,
        tag: "Due soon",
        title: `${plural(dueSoon.length, "invoice is", "invoices are")} due this week`,
        detail: sum(dueSoon),
        count: dueSoon.length,
        onApply: () => filterTo("Payment due"),
        items: items(dueSoon),
      },
    ].filter(Boolean) as BannerAlert[]
  ).filter((a) => !dismissed.has(a.id) && !((snoozed[a.id] ?? 0) > Date.now()));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tab === "statement" ? (
        <>
          <div className="mb-8 shrink-0">
            <Overview />
          </div>
          <StatementView invoices={rows} segments={TABS} segmentValue={tab} onSegmentChange={setTab} />
        </>
      ) : (
      <PortalList<Invoice, IK>
        segments={TABS}
        segmentValue={tab}
        onSegmentChange={setTab}
        above={<Overview />}
        banner={
          alerts.length > 0 ? (
            <AlertBanner
              alerts={alerts}
              onSnooze={(id, ms) => setSnoozed((p) => ({ ...p, [id]: Date.now() + ms }))}
              onDismiss={(id) => setDismissed((p) => new Set(p).add(id))}
              appliedId={appliedId}
              onClearApplied={() => setApplied({ ids: [], n: Date.now() })}
            />
          ) : undefined
        }
        applyFacets={applied}
        onFacetsChange={setFacets}
        rows={rows}
        columns={COLUMNS}
        rowId={(i) => i.invoiceNo}
        text={text}
        sortValue={(i, k) =>
          k === "amount" ? totalOf(i) : k === "issued" ? i.issued : k === "due" ? i.due : k === "status" ? INVOICE_STATUSES.indexOf(i.status) : undefined
        }
        renderCell={(i, k) => {
          switch (k) {
            case "invoice":
              return <span className="text-sm font-medium text-foreground">{i.invoiceNo}</span>;
            case "issued":
              return <span className="text-sm">{printKey(i.issued)}</span>;
            case "due": {
              const note = dueNote(i);
              return note ? (
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm text-foreground">{printKey(i.due)}</span>
                  <span className={cn("text-xs", daysFrom(i.due) < 0 && i.status !== "Invoice disputed" ? "text-status-failed" : "text-muted-foreground")}>
                    {note}
                  </span>
                </span>
              ) : (
                <span className="text-sm">{printKey(i.due)}</span>
              );
            }
            case "order":
              return orderCell(i.orderNo);
            case "shipTo":
              return <TwoLineCell title={i.shipTo} description={i.billTo} />;
            case "amount":
              return <span className="text-sm tabular-nums text-foreground">{usd.format(amountDue(i))}</span>;
            case "status":
              return (
                <span className="flex flex-col items-start gap-0.5">
                  <StatusChip tone={INVOICE_STATUS_TONE[i.status]} variant="text">
                    {i.status}
                  </StatusChip>
                  {/* WHAT IS IN QUESTION, under a customer's open dispute. */}
                  {i.status === "Invoice disputed" && (
                    <span className="text-xs tabular-nums text-muted-foreground">{usd.format(inQuestion(i))} in question</span>
                  )}
                </span>
              );
            case "download":
              /* ONE ICON — highlighted only under the pointer; the press
                 stays here and does not open the row. */
              return (
                <div className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Download ${i.invoiceNo}`}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          download(i);
                        }}
                      >
                        <Download />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download invoice</TooltipContent>
                  </Tooltip>
                </div>
              );
            default:
              return null;
          }
        }}
        facets={[
          { key: "status", label: "Status", options: [...INVOICE_STATUSES] },
          { key: "shipTo", label: "Ship-to", options: Array.from(new Set(rows.map((i) => i.shipTo))) },
        ]}
        facetValues={(i, f) => (f === "status" ? [i.status] : f === "shipTo" ? [i.shipTo] : [])}
        storageKey="portal-invoices"
        noun="invoices"
        nounOne="invoice"
        searchPlaceholder="Search invoices, orders, ship-tos…"
        onOpen={(i) => setOpenNo(i.invoiceNo)}
        openLabel={(i) => `Open invoice ${i.invoiceNo}`}
        emptyIcon={<ReceiptText />}
      />
      )}
      <InvoiceSheet
        invoice={rows.find((i) => i.invoiceNo === openNo) ?? null}
        open={openNo !== null}
        onOpenChange={(o) => !o && setOpenNo(null)}
        onDownload={download}
        orderLink={orderCell}
      />
    </div>
  );
}
