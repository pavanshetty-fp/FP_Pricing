import type { GroupDim } from "@/components/tables-layout";
import type { CodeDiscTone } from "@/components/ui/code-disc";
import type { ListColumn } from "./ListTable";
import { matchesFuelOrder, plannedAt, startOfDay } from "./data";
import { liveStage, stageIds, stageLabel, UNIT_SHORT, getSalesSettings } from "./salesSettings";
import { matchesAssetOrder, type AssetOrder } from "./assetOrders";
import { TYPE_TONE } from "./FuelOrdersTable";
import type { FuelOrder, FuelOrderStatus } from "./types";
import type { DateRange } from "./threepl/DateRangeFilter";

/*
  SALES ORDERS — ONE LIST, TWO KINDS (Pavan, 2026-10-07). Fuel Orders and
  Asset Orders were two pages; they are one page now, structured like 3PL's
  Delivery Orders: one record list, a Line of Service switch on the view bar,
  one table whose columns cover both kinds. Each row keeps its own record, so
  each kind keeps its own sheet and its own change log.
*/

export type SalesOrderRow =
  | { kind: "fuel"; id: string; fuel: FuelOrder }
  | { kind: "asset"; id: string; asset: AssetOrder };

/** The view bar's Line of Service switch — "All" first, and the default. */
export const SALES_LINES = ["All", "Fuel Orders", "Asset Orders"] as const;
export type SalesLine = (typeof SALES_LINES)[number];

export function inSalesLine(line: SalesLine, r: SalesOrderRow): boolean {
  return (
    line === "All" ||
    (line === "Fuel Orders" && r.kind === "fuel") ||
    (line === "Asset Orders" && r.kind === "asset")
  );
}

/** A day as a one-day range. */
const dayRange = (offset: number): DateRange => {
  const day = startOfDay(new Date());
  day.setDate(day.getDate() + offset);
  return { from: day, to: new Date(day) };
};

/* THE OPENING WINDOW, PER LINE (Pavan, 2026-10-07) — today for All and Fuel
   Orders; tomorrow for Asset Orders, as that page opened before the merge. */
export const defaultRangeFor = (line: SalesLine): DateRange =>
  dayRange(line === "Asset Orders" ? 1 : 0);

/* ---- the Type disc — tells the two kinds apart on every row and card ---- */

/* ASSET ORDERS GET THEIR OWN LETTER (Pavan, 2026-10-07) — violet, 3PL's
   colour for an asset order. */
export function salesTypeCode(r: SalesOrderRow): {
  text: string;
  label: string;
  tone: CodeDiscTone;
} {
  if (r.kind === "fuel")
    return {
      text: r.fuel.type.code,
      label: r.fuel.type.label,
      tone: TYPE_TONE[r.fuel.type.code],
    };
  return { text: "A", label: "Asset order", tone: "pastel-violet" };
}

/* ---- shared fields, read the same way for either kind ------------------- */

export const orderNoOf = (r: SalesOrderRow) =>
  r.kind === "fuel" ? r.fuel.orderNo : r.asset.orderNo;
export const customerOf = (r: SalesOrderRow) =>
  r.kind === "fuel" ? r.fuel.customer.title : r.asset.customer.title;
/* THE CUSTOMER CELL'S SECOND LINE IS THE SHIP-TO FOR BOTH (2026-10-07) — a
   column whose second line meant a site on one row and an ERP id on the next
   could not be read down. */
export const shipToOf = (r: SalesOrderRow) =>
  r.kind === "fuel" ? r.fuel.customer.description : r.asset.shipTo;
export const dateOf = (r: SalesOrderRow) => (r.kind === "fuel" ? r.fuel.date : r.asset.date);
export const dateKeyOfRow = (r: SalesOrderRow) =>
  r.kind === "fuel" ? r.fuel.dateKey : r.asset.dateKey;
export const statusOf = (r: SalesOrderRow): FuelOrderStatus =>
  liveStage(r.kind === "fuel" ? r.fuel.status : r.asset.status);

export type SalesOrderColumnKey =
  | "order"
  | "type"
  | "customer"
  | "products"
  | "qty"
  | "date"
  | "planned"
  | "status"
  | "driver"
  | "salesRep"
  | "tags"
  | "actions";

/* SHARED COLUMNS, KIND-SPECIFIC CELLS — 3PL's All (Pavan, 2026-10-07). One
   column set for every line, as 3PL keeps one set across its lines. A cell a
   kind has no value for prints an em-dash. */
export const SALES_ORDER_COLUMNS: ListColumn<SalesOrderColumnKey>[] = [
  { key: "order", label: "Order #", width: 90, sortable: true },
  { key: "type", label: "Type", width: 120, sortable: true },
  { key: "customer", label: "Customer", width: 250, sortable: true },
  { key: "products", label: "Product / asset", width: 230, sortable: true },
  { key: "qty", label: "Qty", width: 100, sortable: true },
  { key: "date", label: "Date of delivery", width: 140, sortable: true },
  { key: "planned", label: "Planned date & time", width: 160, sortable: true },
  /* ROOM FOR A STAGE AND ITS FLAG — "Over SLA" rides beside it (2026-10-07). */
  { key: "status", label: "Status", width: 200, sortable: true },
  { key: "driver", label: "Driver", width: 120, sortable: true },
  { key: "salesRep", label: "Sales rep", width: 120, sortable: true },
  { key: "tags", label: "Tags", width: 150, sortable: true },
  { key: "actions", label: "", width: 44 },
];

const QTY_FMT = new Intl.NumberFormat("en-US");

/**
 * WHAT EACH COLUMN PRINTS, as text a header box or the column search can
 * match — 3PL's `brokerColumnText` rule.
 */
export function salesOrderColumnText(r: SalesOrderRow, key: string): string {
  switch (key) {
    case "order":
      return orderNoOf(r);
    case "type": {
      const c = salesTypeCode(r);
      return `${c.text} ${c.label}`;
    }
    case "customer":
      return `${customerOf(r)} ${shipToOf(r)}`;
    case "products":
      return r.kind === "fuel" ? r.fuel.products.map((p) => p.name).join(" ") : r.asset.assetType;
    case "qty":
      return r.kind === "fuel"
        ? `${QTY_FMT.format(r.fuel.qtyGal)} ${UNIT_SHORT[getSalesSettings().unit]}`
        : `${r.asset.quantity} ${r.asset.quantity === 1 ? "unit" : "units"}`;
    case "date": {
      const d = dateOf(r);
      return `${d.title} ${d.description ?? ""}`;
    }
    case "planned":
      return r.kind === "fuel" && r.fuel.planned
        ? `${r.fuel.planned.date} ${r.fuel.planned.time}`
        : "";
    case "status":
      /* THE STAGE'S NAME, as Sales Settings call it (2026-10-07). */
      return stageLabel(statusOf(r));
    case "driver":
      return r.kind === "fuel" ? (r.fuel.driver?.name ?? "Unassigned") : "";
    case "salesRep":
      return r.kind === "asset" ? r.asset.salesRep : "";
    case "tags":
      return r.kind === "fuel" ? r.fuel.tags.join(" ") : "";
    default:
      return "";
  }
}

/** The column search's fields — every text column. */
export const SALES_ORDER_SEARCH_FIELDS = SALES_ORDER_COLUMNS.filter(
  (c) => c.label && c.key !== "qty"
).map((c) => ({ key: c.key, label: c.label }));

export function matchesSalesOrder(r: SalesOrderRow, q: string): boolean {
  return (
    (r.kind === "fuel"
      ? matchesFuelOrder(r.fuel, q)
      : matchesAssetOrder(r.asset, q) || r.asset.shipTo.toLowerCase().includes(q)) ||
    /* A renamed stage is found by its name. */
    stageLabel(statusOf(r)).toLowerCase().includes(q)
  );
}

/* ---- sorting ------------------------------------------------------------ */

/**
 * `group` never flips with the direction, `value` does: an empty cell stays
 * last both ways, and Qty keeps gallons and units apart (fuel first) rather
 * than ranking 3 units against 1,200 gallons.
 */
function sortKey(
  r: SalesOrderRow,
  key: SalesOrderColumnKey
): { group: number; value: string | number } {
  const empty = { group: 9, value: 0 };
  switch (key) {
    case "order":
      return { group: 0, value: Number(orderNoOf(r)) };
    case "type":
      return { group: 0, value: salesTypeCode(r).label.toLowerCase() };
    case "customer":
      return { group: 0, value: `${customerOf(r)} ${shipToOf(r)}`.toLowerCase() };
    case "products":
      return {
        group: 0,
        value: salesOrderColumnText(r, "products").toLowerCase(),
      };
    case "qty":
      return r.kind === "fuel"
        ? { group: 0, value: r.fuel.qtyGal }
        : { group: 1, value: r.asset.quantity };
    case "date":
      return { group: 0, value: dateKeyOfRow(r) };
    case "planned": {
      const at = r.kind === "fuel" ? plannedAt(r.fuel) : null;
      return at ? { group: 0, value: at.getTime() } : empty;
    }
    case "status":
      return { group: 0, value: stageIds().indexOf(statusOf(r)) };
    case "driver":
      return r.kind === "fuel" && r.fuel.driver
        ? { group: 0, value: r.fuel.driver.name.toLowerCase() }
        : empty;
    case "salesRep":
      return r.kind === "asset" ? { group: 0, value: r.asset.salesRep.toLowerCase() } : empty;
    case "tags":
      return r.kind === "fuel" && r.fuel.tags.length
        ? { group: 0, value: r.fuel.tags.join(" ").toLowerCase() }
        : empty;
    default:
      return empty;
  }
}

export function sortSalesOrders(
  rows: SalesOrderRow[],
  sort: { key: SalesOrderColumnKey; dir: "asc" | "desc" } | null
): SalesOrderRow[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortKey(a, sort.key);
    const bv = sortKey(b, sort.key);
    if (av.group !== bv.group) return av.group - bv.group;
    if (av.value === bv.value) return 0;
    return av.value > bv.value ? dir : -dir;
  });
}

/* ---- grouping ------------------------------------------------------------ */

/* THE TWO LISTS' DIMENSIONS, AS ONE (Pavan, 2026-10-07). A kind-only
   dimension leaves the other kind in its empty group. */
export const SALES_ORDER_GROUP_DIMS: GroupDim<SalesOrderRow>[] = [
  { key: "customer", label: "Customer", valuesOf: (r) => [customerOf(r)] },
  { key: "shipTo", label: "Ship-to", valuesOf: (r) => [shipToOf(r)] },
  {
    key: "status",
    label: "Status",
    hides: "status",
    /* NAMES IN THE SETTINGS' ORDER, read when the groups are built. */
    get order() {
      return stageIds().map((id) => stageLabel(id));
    },
    valuesOf: (r) => [stageLabel(statusOf(r))],
  },
  {
    key: "date",
    label: "Date of delivery",
    hides: "date",
    valuesOf: (r) => [dateOf(r).title],
  },
  {
    key: "type",
    label: "Order type",
    hides: "type",
    valuesOf: (r) => [salesTypeCode(r).label],
  },
  {
    key: "driver",
    label: "Driver",
    hides: "driver",
    valuesOf: (r) => (r.kind === "fuel" && r.fuel.driver ? [r.fuel.driver.name] : []),
  },
  {
    key: "product",
    label: "Product",
    multi: true,
    valuesOf: (r) => (r.kind === "fuel" ? r.fuel.products.map((p) => p.name) : []),
  },
  {
    key: "assetType",
    label: "Asset type",
    valuesOf: (r) => (r.kind === "asset" ? [r.asset.assetType] : []),
  },
  {
    key: "salesRep",
    label: "Sales rep",
    hides: "salesRep",
    valuesOf: (r) => (r.kind === "asset" ? [r.asset.salesRep] : []),
  },
  {
    key: "tags",
    label: "Tags",
    multi: true,
    valuesOf: (r) => (r.kind === "fuel" ? r.fuel.tags : []),
  },
];
