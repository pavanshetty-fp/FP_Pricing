import { Pill } from "@/components/ui/pill";
import { TwoLineCell, type ListColumn } from "../ListTable";
import { DASH, formatDate, money } from "../threepl/directoryCore";
import type { MdAsset } from "./assets";
import { DocumentsCell, STATUS_KIND } from "./assetParts";
import { kindTone } from "../statusKind";
import { StatusChip } from "@/components/ui/status-chip";
import {
  assetsOf,
  leasesOf,
  productsOf,
  recurringOf,
  shipTosOf,
  siteAddress,
  type MdCustomer,
  type MdCustomerOrder,
} from "./customers";
import { RecordViews, type ViewRow, type ViewTab } from "./RecordViews";

/*
  CUSTOMER 360 — THE VIEWS (Pavan, 2026-11-03), on the shared 360 views
  (RecordViews.tsx, as Asset 360). Every list the reference stacks down its
  page is a tab here: orders across modules (a table, or a board by status),
  products delivered, ship-to sites, assets on site, recurring schedules,
  leases and contracts. One search and one Filters over all of them.
*/

const qtyText = (o: MdCustomerOrder) => (o.qty === null ? DASH : o.unit === "gal" ? `${o.qty.toLocaleString()} gal` : `${o.qty} ${o.unit}`);
const perUnit = (n: number | null, unit: string | null) => (n === null ? DASH : `${money(n)} / ${unit === "drums" ? "drum" : "gal"}`);
const orMoney = (n: number | null) => (n === null ? DASH : money(n));

/* What a product is — its category, the Products tab's facet. */
const CATEGORY: Record<string, string> = { DEF: "DEF", "Hydraulic Oil AW-46": "Lubricant", "Propane HD-5": "Propane" };

/* ─────────────────────────────────────────────────────────── rows ── */

const orderRows = (orders: MdCustomerOrder[]): ViewRow[] =>
  orders.map((o) => ({
    id: o.id,
    text: {
      id: o.id,
      type: o.type,
      module: o.module,
      date: formatDate(o.date),
      site: o.site,
      item: o.item,
      asset: o.asset ?? DASH,
      qty: qtyText(o),
      unitPrice: perUnit(o.unitPrice, o.unit),
      revenue: orMoney(o.revenue),
      margin: orMoney(o.margin),
      status: o.stage,
      documents: o.documents.length ? `${o.documents.length} documents` : DASH,
    },
    sort: { date: o.date, qty: o.qty ?? -1, unitPrice: o.unitPrice ?? -1, revenue: o.revenue ?? -1, margin: o.margin ?? -1 },
    status: o.stage,
    values: { type: o.type, module: o.module },
  }));

const ORDER_COLS: ListColumn<string>[] = [
  { key: "id", label: "Order", width: 120, sortable: true },
  { key: "type", label: "Type", width: 110, sortable: true },
  { key: "module", label: "Module", width: 130, sortable: true },
  { key: "date", label: "Date", width: 120, sortable: true },
  { key: "site", label: "Site", width: 170, sortable: true },
  { key: "item", label: "Product or job", width: 180, sortable: true },
  { key: "asset", label: "Asset", width: 110, sortable: true },
  { key: "qty", label: "Quantity", width: 120, sortable: true },
  { key: "unitPrice", label: "Unit price", width: 120, sortable: true },
  { key: "revenue", label: "Revenue", width: 120, sortable: true },
  { key: "margin", label: "Margin", width: 110, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
  { key: "documents", label: "Documents", width: 130, sortable: true },
];

const PRODUCT_COLS: ListColumn<string>[] = [
  { key: "product", label: "Product", width: 200, sortable: true },
  { key: "category", label: "Category", width: 120, sortable: true },
  { key: "orders", label: "Orders", width: 100, sortable: true },
  { key: "qty", label: "Quantity", width: 140, sortable: true },
  { key: "revenue", label: "Revenue", width: 130, sortable: true },
  { key: "avg", label: "Average price", width: 140, sortable: true },
  { key: "last", label: "Last order", width: 130, sortable: true },
];

const SITE_COLS: ListColumn<string>[] = [
  { key: "name", label: "Site", width: 200, sortable: true },
  { key: "address", label: "Address", width: 320, sortable: true },
  { key: "contact", label: "Contact", width: 150, sortable: true },
  { key: "assets", label: "Assets", width: 100, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
];

const ASSET_COLS: ListColumn<string>[] = [
  { key: "id", label: "Asset", width: 180, sortable: true },
  { key: "site", label: "Site", width: 180, sortable: true },
  { key: "product", label: "Product", width: 140, sortable: true },
  { key: "rate", label: "Rate", width: 120, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
];

const RECURRING_COLS: ListColumn<string>[] = [
  { key: "id", label: "Schedule", width: 120, sortable: true },
  { key: "site", label: "Site", width: 180, sortable: true },
  { key: "product", label: "Product", width: 140, sortable: true },
  { key: "qty", label: "Quantity", width: 120, sortable: true },
  { key: "cadence", label: "Repeats", width: 200, sortable: true },
  { key: "next", label: "Next", width: 120, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
];

const LEASE_COLS: ListColumn<string>[] = [
  { key: "id", label: "Lease", width: 120, sortable: true },
  { key: "asset", label: "Asset", width: 110, sortable: true },
  { key: "product", label: "Product", width: 140, sortable: true },
  { key: "from", label: "Starts", width: 120, sortable: true },
  { key: "to", label: "Ends", width: 120, sortable: true },
  { key: "committed", label: "Committed volume", width: 160, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
];

const STATUS = { key: "status", label: "Status" };

/** Orders across modules — Customer 360's tab, and Ship-to 360's (which
 *  has no Site column: every order there is at that site). */
export function ordersTab(orders: MdCustomerOrder[], { site = true, label = "Orders across modules" } = {}): ViewTab {
  const t: ViewTab = {
      key: "orders",
      label,
      noun: "orders",
      one: "order",
      columns: ORDER_COLS,
      rows: orderRows(orders),
      facets: [{ key: "type", label: "Type", order: ["Delivery", "Service"] }, { key: "module", label: "Module", order: ["3PL", "First party", "Service Work"] }, STATUS],
      board: {
        lanes: [
          { key: "Open", color: "grey" },
          { key: "Assigned", color: "yellow" },
          { key: "Delivered", color: "green" },
          { key: "Completed", color: "green" },
          { key: "Invoiced", color: "blue" },
        ],
        card: (r) => ({
          id: r.id,
          title: r.id,
          badges: [
            { label: r.text.type, tone: "neutral" as const },
            { label: r.text.module, tone: "neutral" as const },
          ],
          units: [
            { kind: "stack" as const, key: "what", heading: r.text.type === "Service" ? "Job" : "Product", lines: [{ text: r.text.item, level: 1 as const }, { text: r.text.type === "Service" ? r.text.asset : r.text.qty, level: 2 as const }] },
            { kind: "inline" as const, key: "when", heading: "Date", parts: [], planned: { date: r.text.date } },
            { kind: "stack" as const, key: "site", heading: "Site", lines: [{ text: r.text.site, level: 1 as const }] },
          ],
        }),
      },
      renderCell: (r, key) => {
        if (key === "type") return <Pill>{r.text.type}</Pill>;
        if (key === "module") return <Pill>{r.text.module}</Pill>;
        if (key === "documents") return <DocumentsCell owner={r.id} files={orders.find((o) => o.id === r.id)?.documents ?? []} />;
        return undefined;
      },
    };
  return site ? t : { ...t, columns: t.columns.filter((c) => c.key !== "site") };
}

/** The assets at a customer's sites, or at one site. */
export function assetsTab(assets: MdAsset[]): ViewTab {
  return {
      key: "assets",
      label: "Assets on site",
      noun: "assets",
      one: "asset",
      columns: ASSET_COLS,
      rows: assets.map((a) => ({
        id: a.uid,
        text: { id: a.id, type: a.type, site: a.site, product: a.product ?? DASH, rate: a.rate === null ? DASH : `${money(a.rate)} / mo`, status: a.status },
        sort: { rate: a.rate ?? -1 },
        status: a.status,
      })),
      facets: [STATUS],
      renderCell: (r, key) =>
        key === "id" ? (
          <TwoLineCell title={r.text.id} description={r.text.type} />
        ) : key === "status" ? (
          <StatusChip tone={kindTone(STATUS_KIND[r.status as MdAsset["status"]])}>{r.status}</StatusChip>
        ) : undefined,
      readValue: (r, key) => (key === "id" ? `${r.text.id} · ${r.text.type}` : undefined),
    };
}

export function CustomerViews({ customer: c, orders, assets }: { customer: MdCustomer; orders: MdCustomerOrder[]; assets: MdAsset[] }) {
  const mineAssets = assetsOf(c, assets);
  const tabs: ViewTab[] = [
    ordersTab(orders),
    {
      key: "products",
      label: "Products delivered",
      noun: "products",
      one: "product",
      columns: PRODUCT_COLS,
      rows: productsOf(orders).map((p) => ({
        id: p.product,
        text: {
          product: p.product,
          category: CATEGORY[p.product] ?? "Fuel",
          orders: String(p.orders),
          qty: `${p.qty.toLocaleString()} ${p.unit}`,
          revenue: money(p.revenue),
          avg: perUnit(p.revenue / p.qty, p.unit),
          last: formatDate(p.last),
          status: "",
        },
        sort: { orders: p.orders, qty: p.qty, revenue: p.revenue, avg: p.revenue / p.qty, last: p.last },
        status: "",
        values: { category: CATEGORY[p.product] ?? "Fuel" },
      })),
      facets: [{ key: "category", label: "Category", order: ["Fuel", "Propane", "DEF", "Lubricant"] }],
      nameOf: (r) => r.text.product,
    },
    {
      key: "sites",
      label: "Ship-to sites",
      noun: "sites",
      one: "site",
      columns: SITE_COLS,
      rows: shipTosOf(c).map((s) => {
        const n = mineAssets.filter((a) => a.site === s.locationName).length;
        const status = s.status[0].toUpperCase() + s.status.slice(1);
        return {
          id: s.uid,
          text: { name: s.locationName, address: siteAddress(s), contact: s.contact ?? DASH, assets: n ? String(n) : DASH, status },
          sort: { assets: n },
          status,
        };
      }),
      facets: [STATUS],
      nameOf: (r) => r.text.name,
    },
    assetsTab(mineAssets),
    {
      key: "recurring",
      label: "Recurring schedules",
      noun: "schedules",
      one: "schedule",
      columns: RECURRING_COLS,
      rows: recurringOf(c).map((s) => ({
        id: s.id,
        text: { id: s.id, site: s.site, product: s.product, qty: `${s.qtyGal.toLocaleString()} gal`, cadence: s.cadence, next: s.status === "Paused" ? DASH : formatDate(s.next), status: s.status },
        sort: { qty: s.qtyGal, next: s.status === "Paused" ? "9999" : s.next },
        status: s.status,
      })),
      facets: [STATUS],
    },
    {
      key: "leases",
      label: "Leases and contracts",
      noun: "leases",
      one: "lease",
      columns: LEASE_COLS,
      rows: leasesOf(c, assets).map((l) => ({
        id: l.id,
        text: {
          id: l.id,
          asset: l.asset,
          product: l.product,
          from: l.from ? formatDate(l.from) : DASH,
          to: l.to ? formatDate(l.to) : DASH,
          committed: l.committedGal ? `${l.committedGal.toLocaleString()} gal` : DASH,
          status: l.status,
        },
        sort: { from: l.from ?? "", to: l.to ?? "", committed: l.committedGal ?? -1 },
        status: l.status,
      })),
      facets: [STATUS],
    },
  ];
  return <RecordViews resetKey={c.uid} tabs={tabs} searchPlaceholder="Search this customer" historyKey="md-customer-360" />;
}

