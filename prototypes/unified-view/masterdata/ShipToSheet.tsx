import * as React from "react";
import { DetailViewMenuItem } from "../RecordSheet";
import { toast } from "sonner";
import { Archive, CheckCircle2, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordSheet } from "../RecordSheet";
import { BarColumns } from "../DashboardParts";
import { RailCard, RailRow } from "../SheetCards";
import { SiteMiniMap } from "../threepl/SiteMiniMap";
import { DirectoryRecordSheet } from "../threepl/DirectoryRecordSheet";
import type { FormSectionDef } from "../threepl/directoryFormTypes";
import { ACTIVE_KIND, kindTone } from "../statusKind";
import type { ListColumn } from "../ListTable";
import { DASH, formatDate, money } from "../threepl/directoryCore";
import { currentAssets } from "./AssetsScreen";
import { currentCustomers } from "./CustomersScreen";
import { assetsTab, ordersTab } from "./CustomerViews";
import { gal, invoicesAt, isOpen, monthsOf, ordersAt, siteAddress, type MdShipTo } from "./customers";
import { RecordViews, type ViewTab } from "./RecordViews";
import { FIGURE_STRIP, Figure, Trend, WORK_AREA, useDockedWorkArea, wholeMoney } from "./sheetParts";

/*
  SHIP-TO 360 (Pavan, 2026-11-03 — the Lovable reference's ShipTo 360, on
  the same sheet as Asset 360 and Customer 360):
    · header — the site, its code, customer and town, its status;
    · four figures — deliveries, gallons delivered, revenue, open orders —
      and two trends by month (volume, spend);
    · left, three views — orders and deliveries (table or board), assets on
      site, invoices — under one search and filter bar;
    · right, the Location card (the board card's site map: the ship-to's
      radius and its assets) and the Details card, each with Edit.
  The reference's "Customer profile" is the customer's name in Details —
  it opens that Customer 360.
*/

const Edit = ({ onEdit }: { onEdit: () => void }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon-sm" aria-label="Edit details" onClick={onEdit}>
        <Pencil />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Edit details</TooltipContent>
  </Tooltip>
);

const Stacked = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1 px-4 py-2.5">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground">{children}</dd>
  </div>
);

const INVOICE_COLS: ListColumn<string>[] = [
  { key: "id", label: "Invoice", width: 130, sortable: true },
  { key: "order", label: "Order", width: 120, sortable: true },
  { key: "item", label: "Product or job", width: 180, sortable: true },
  { key: "issued", label: "Issued", width: 120, sortable: true },
  { key: "due", label: "Due", width: 120, sortable: true },
  { key: "total", label: "Amount", width: 130, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
];

export const recordStatusLabel = (s: MdShipTo["status"]) => s[0].toUpperCase() + s.slice(1);

export function ShipToSheet({
  site: s,
  form,
  onClose,
  onChange,
  onOpenCustomer,
}: {
  site: MdShipTo;
  /** The ship-to's form — Edit details opens it over this sheet. */
  form: FormSectionDef<MdShipTo>[];
  onClose: () => void;
  onChange: (next: MdShipTo) => void;
  onOpenCustomer?: (uid: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const work = useDockedWorkArea();
  const assets = currentAssets();
  const customer = currentCustomers().find((c) => c.name === s.customer);
  const orders = React.useMemo(() => ordersAt(s, customer, assets), [s, customer, assets]);
  const invoices = invoicesAt(s, customer, orders, assets);
  const here = assets.filter((a) => a.site === s.locationName);
  const done = orders.filter((o) => !isOpen(o));
  const deliveries = done.filter((o) => o.type === "Delivery");
  const revenue = done.reduce((t, o) => t + (o.revenue ?? 0), 0);
  const margin = done.reduce((t, o) => t + (o.margin ?? 0), 0);
  const open = orders.filter(isOpen).sort((x, y) => x.date.localeCompare(y.date));
  const months = monthsOf(orders);
  const rental = here.filter((a) => a.ownership === "Rental").length;
  const archived = s.status === "archived";

  const setArchived = (on: boolean) => {
    onChange({ ...s, status: on ? "archived" : "active" });
    toast.success(on ? "Ship-to archived" : "Ship-to restored");
    if (on) onClose();
  };

  const tabs: ViewTab[] = [
    { ...ordersTab(orders, { site: false, label: "Orders and deliveries" }) },
    assetsTab(here),
    {
      key: "invoices",
      label: "Invoices",
      noun: "invoices",
      one: "invoice",
      columns: INVOICE_COLS,
      rows: invoices.map((i) => ({
        id: i.id,
        text: { id: i.id, order: i.order, item: i.item, issued: formatDate(i.issued), due: formatDate(i.due), total: money(i.total), status: i.status },
        sort: { issued: i.issued, due: i.due, total: i.total },
        status: i.status,
      })),
      facets: [{ key: "status", label: "Status" }],
    },
  ];

  return (
    <>
      <RecordSheet
        size="full"
        open
        onOpenChange={(o) => !o && onClose()}
        mode="edit"
        editTitle={`${s.locationName} · Ship-to 360`}
        createTitle=""
        createAction=""
        showCancel={false}
        stepNav={false}
        /* NO FOOTER — nothing here to confirm; Edit details autosaves. */
        noFooter
        headerSubtitle={<span className="text-sm text-muted-foreground">{[s.id, s.customer, `${s.city}, ${s.state}`].join(" · ")}</span>}
        headerAside={
          <span className="flex items-center gap-1.5">
            <StatusChip tone={kindTone(ACTIVE_KIND(s.status === "active"))} variant="soft">
              {recordStatusLabel(s.status)}
            </StatusChip>
            {s.isDefault && <Pill>Default site</Pill>}
          </span>
        }
        headerMenu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More ship-to actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DetailViewMenuItem />
              {archived ? (
                <DropdownMenuItem onSelect={() => setArchived(false)}>
                  <CheckCircle2 />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onSelect={() => setArchived(true)}>
                  <Archive />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        onSubmit={onClose}
      >
        <div className={FIGURE_STRIP}>
          <Figure label="Deliveries" value={deliveries.length} note={deliveries[0] ? `Last on ${formatDate(deliveries[0].date)}` : "None yet"} />
          <Figure
            label="Gallons delivered"
            value={deliveries.filter((o) => o.unit === "gal").reduce((t, o) => t + (o.qty ?? 0), 0).toLocaleString()}
            note={`${new Set(deliveries.map((o) => o.item)).size} products`}
          />
          <Figure label="Revenue" value={wholeMoney(revenue)} note={revenue ? `${((margin / revenue) * 100).toFixed(1)}% margin` : DASH} />
          <Figure label="Open orders" value={open.length} note={open[0] ? `Next on ${formatDate(open[0].date)}` : "None scheduled"} />
        </div>

        <div className="grid shrink-0 gap-4 lg:grid-cols-2">
          <Trend title="Volume delivered by month" aside="Thousand gallons">
            <BarColumns
              height={96}
              data={months.map((m) => ({ key: m.key, label: m.label, value: Math.round(m.gallons / 100) / 10, detail: `${gal(m.gallons)} · ${m.orders} orders` }))}
            />
          </Trend>
          <Trend title="Spend by month" aside="Thousand dollars">
            <BarColumns
              height={96}
              data={months.map((m) => {
                const spend = orders.filter((o) => o.date.startsWith(m.key) && !isOpen(o)).reduce((t, o) => t + (o.revenue ?? 0), 0);
                return { key: m.key, label: m.label, value: Math.round(spend / 100) / 10, detail: wholeMoney(spend) };
              })}
            />
          </Trend>
        </div>

        <div ref={work} className={WORK_AREA}>
          {/* LEFT — the views, under one filter bar. */}
          <RecordViews resetKey={s.uid} tabs={tabs} searchPlaceholder="Search this ship-to" historyKey="md-shipto-360" />
          {/* RIGHT, AS THE RAIL — a card per subject. */}
          <div className="flex min-h-0 flex-col gap-3 overflow-auto">
            <div className="flex flex-col gap-4">
              <RailCard title="Location" action={<Edit onEdit={() => setEditing(true)} />}>
                {s.latitude !== null && s.longitude !== null && (
                  <div className="px-4 pt-3">
                    <SiteMiniMap
                      className="h-40 w-full"
                      site={{ lat: s.latitude, lng: s.longitude }}
                      /* The assets stand around the site, a few metres apart. */
                      points={here.map((a, i) => ({ name: a.id, lat: s.latitude! + 0.0003 * (i + 1), lng: s.longitude! + 0.0004 * (i % 2 ? -1 : 1), selected: true }))}
                    />
                  </div>
                )}
                <dl className="flex flex-col py-1">
                  <Stacked label="Address">{siteAddress(s)}</Stacked>
                  <RailRow label="Coordinates" value={s.latitude !== null && s.longitude !== null ? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}` : DASH} />
                </dl>
              </RailCard>
              <RailCard title="Details" action={<Edit onEdit={() => setEditing(true)} />}>
                <dl className="flex flex-col py-1">
                  <RailRow
                    label="Customer"
                    value={
                      customer && onOpenCustomer ? (
                        <button type="button" className="text-sm text-foreground underline-offset-4 hover:underline" onClick={() => onOpenCustomer(customer.uid)}>
                          {s.customer}
                        </button>
                      ) : (
                        s.customer
                      )
                    }
                  />
                  <RailRow label="Site contact" value={s.contact ?? DASH} />
                  <RailRow label="Phone" value={s.phone ?? DASH} />
                  <RailRow label="Payment terms" value={customer?.paymentTerms ?? DASH} />
                  <RailRow label="Assets placed" value={here.length ? `${rental} rental · ${here.length - rental} customer-owned` : DASH} />
                  {s.notes && <Stacked label="Notes">{s.notes}</Stacked>}
                </dl>
              </RailCard>
            </div>
          </div>
        </div>
      </RecordSheet>

      {/* EDIT DETAILS — the ship-to form, over the sheet; it autosaves. */}
      {editing && (
        <DirectoryRecordSheet<MdShipTo>
          level={2}
          open
          onOpenChange={(o) => !o && setEditing(false)}
          mode="edit"
          noun="Ship-to"
          title={`Edit ${s.locationName}`}
          recordKey={`${s.uid}-edit`}
          initial={s}
          sections={form}
          onAutosave={onChange}
          onClose={(latest) => latest && onChange(latest)}
          onSubmit={(draft) => {
            onChange(draft);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}
