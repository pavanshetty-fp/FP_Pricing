import { DATE_FMT, dateKeyOf, relativeLabel, startOfDay } from "./data";
import type { TwoLine } from "./types";
import { statusTones } from "./statusKind";
import type { ActivityEntry } from "./activity";

/*
  Asset Orders — the second rail destination.

  Columns are the five that were specified: Order #, Customer, Sales Rep,
  Delivery Date, Status. Everything structural is borrowed from Fuel Orders on
  purpose — same column-frame widths, same sort cycle, same date derivation off
  today — so the two lists read as one family rather than two designs.

  INVENTED, and flagged because it is not transcribed from the source app:
    • which stage each sample order sits at, and the Dispatched ones especially.
      The five stages themselves are Lovable's, adopted for every Sales order
      (Pavan, 2026-10-07) — see `AssetOrderStatus`.
    • the ship-tos. Each is a `SHIP_TO_SITES` name so the map can place it.
    • the sales-rep names.
    • the order numbers, which continue a separate 61xxxxx series so they cannot
      be confused with fuel order numbers.
  Customer names ARE reused from the Fuel Orders dataset, so the same accounts
  appear across both lists.
*/

/* THE SALES STAGES (Pavan, 2026-10-07) — Lovable's five, the same set Fuel
   Orders uses. Open was invented; it is Requested now. */
export type AssetOrderStatus =
  | "Requested"
  | "Scheduled"
  | "Dispatched"
  | "Delivered"
  | "Canceled"
  /* …or a stage added in Sales Settings (Pavan, 2026-10-07). */
  | (string & {});

/** Status → badge colour, by kind (`statusKind.ts`). One map; the sheet and the
 *  table both read it. */
export const ASSET_ORDER_STATUS_TONE = statusTones<CoreAssetStage>({
  /* Waiting on somebody to schedule it. */
  Requested: "caution",
  /* A date is set. True, and asks nothing. */
  Scheduled: "info",
  /* On the road. Under way, asks nothing. */
  Dispatched: "info",
  Delivered: "success",
  /* NOT RED — a terminal non-event, not a problem to solve. */
  Canceled: "neutral",
});

type CoreAssetStage = "Requested" | "Scheduled" | "Dispatched" | "Delivered" | "Canceled";

/** In stage order — the filter, the group-by and the sort all read it. */
export const ASSET_ORDER_STATUSES: CoreAssetStage[] = [
  "Requested",
  "Scheduled",
  "Dispatched",
  "Delivered",
  "Canceled",
];

export interface AssetOrder {
  id: string;
  orderNo: string;
  /** Customer name over its ERP id, the same two-line cell Fuel Orders uses. */
  customer: TwoLine;
  salesRep: string;
  /** Delivery date, formatted, over its relative label. */
  date: TwoLine;
  /** `YYYY-MM-DD` — what the toolbar's date range matches. */
  dateKey: string;
  status: AssetOrderStatus;
  /** Sheet-only fields. Not columns; they exist so the sheet has a body. */
  assetType: string;
  quantity: number;
  serialNo: string;
  shipTo: string;
  poNumber: string;
  note: string;
  /** The change log — see `activity.tsx`. */
  audit?: ActivityEntry[];
  /** What a field added in Sales Settings holds, by its key (2026-10-07). */
  extra?: Record<string, string | boolean>;
  /** ISO — when the order entered its stage. The SLA clock. */
  stageSince?: string;
  /** A move asked for and waiting on approval — the stage it would go to. */
  approvalFor?: string;
}

export const SALES_REPS = [
  "Dana Whitfield",
  "Marcus Reed",
  "Priya Raman",
  "Tom Alvarez",
];

export const ASSET_TYPES = [
  "Tank — 500 gal",
  "Tank — 1000 gal",
  "Pump assembly",
  "Meter",
  "Hose reel",
];

const NEWEST_ASSET_ORDER_NO = 6104420;
const TOTAL = 46;

interface Seed {
  customer: TwoLine;
  salesRep: string;
  dayOffset: number;
  status: AssetOrderStatus;
  assetType: string;
  quantity: number;
  serialNo: string;
  shipTo: string;
  poNumber: string;
}

const SEED: Seed[] = [
  /* TOMORROW HAS WORK — invented (Pavan, 2026-10-07). The list opens on
     tomorrow, so this one and the Morris Requested below moved from today to
     tomorrow, next to the GPM one already there. */
  {
    customer: { title: "Bray, Raymond and Marks", description: "ERP 418223" },
    salesRep: "Dana Whitfield",
    dayOffset: 1,
    status: "Scheduled",
    assetType: "Tank — 1000 gal",
    quantity: 2,
    serialNo: "TK-1000-4471",
    shipTo: "Bray North Yard",
    poNumber: "PO-88213",
  },
  {
    customer: { title: "Morris Group", description: "ERP 505112" },
    salesRep: "Marcus Reed",
    dayOffset: 0,
    status: "Requested",
    assetType: "Pump assembly",
    quantity: 1,
    serialNo: "PA-2210",
    shipTo: "Morris Yard 4",
    poNumber: "PO-88240",
  },
  {
    customer: { title: "Gonzalez, Palmer and Miller", description: "ERP 331904" },
    salesRep: "Priya Raman",
    dayOffset: 1,
    status: "Scheduled",
    assetType: "Tank — 500 gal",
    quantity: 4,
    serialNo: "TK-500-9033",
    shipTo: "GPM Southside",
    poNumber: "PO-88255",
  },
  {
    customer: { title: "Morris Group", description: "ERP 505112" },
    salesRep: "Tom Alvarez",
    dayOffset: -1,
    status: "Delivered",
    assetType: "Meter",
    quantity: 6,
    serialNo: "MT-7781",
    shipTo: "Morris Yard 4",
    poNumber: "PO-88190",
  },
  {
    customer: { title: "Bray, Raymond and Marks", description: "ERP 418223" },
    salesRep: "Dana Whitfield",
    dayOffset: 0,
    status: "Delivered",
    assetType: "Hose reel",
    quantity: 3,
    serialNo: "HR-1140",
    shipTo: "Bray North Yard",
    poNumber: "PO-88201",
  },
  {
    customer: { title: "Gonzalez, Palmer and Miller", description: "ERP 331904" },
    salesRep: "Marcus Reed",
    dayOffset: 2,
    status: "Canceled",
    assetType: "Tank — 1000 gal",
    quantity: 1,
    serialNo: "TK-1000-4502",
    shipTo: "GPM Southside",
    poNumber: "PO-88262",
  },
  {
    customer: { title: "Morris Group", description: "ERP 505112" },
    salesRep: "Priya Raman",
    dayOffset: 1,
    status: "Requested",
    assetType: "Tank — 500 gal",
    quantity: 2,
    serialNo: "TK-500-9077",
    shipTo: "Morris Yard 4",
    poNumber: "PO-88271",
  },
  /* ON THE ROAD — invented sample data (Pavan, 2026-10-07), so the
     Dispatched stage has rows. */
  {
    customer: { title: "Bray, Raymond and Marks", description: "ERP 418223" },
    salesRep: "Tom Alvarez",
    dayOffset: 0,
    status: "Dispatched",
    assetType: "Tank — 500 gal",
    quantity: 2,
    serialNo: "TK-500-9102",
    shipTo: "Bray Depot 2",
    poNumber: "PO-88277",
  },
  {
    customer: { title: "Gonzalez, Palmer and Miller", description: "ERP 331904" },
    salesRep: "Priya Raman",
    dayOffset: 0,
    status: "Dispatched",
    assetType: "Meter",
    quantity: 3,
    serialNo: "MT-7810",
    shipTo: "GPM Southside",
    poNumber: "PO-88280",
  },
];

export const ASSET_ORDERS: AssetOrder[] = (() => {
  const today = startOfDay(new Date());
  return Array.from({ length: TOTAL }, (_, i) => {
    const { dayOffset, ...seed } = SEED[i % SEED.length];
    const when = new Date(today);
    when.setDate(when.getDate() + dayOffset);
    return {
      ...seed,
      id: `ao-${i + 1}`,
      orderNo: String(NEWEST_ASSET_ORDER_NO - i * 3),
      date: {
        title: DATE_FMT.format(when),
        description: relativeLabel(dayOffset, when),
      },
      dateKey: dateKeyOf(when),
      note: "",
      /* SAMPLE TIME IN STAGE — INVENTED (2026-10-07), for the SLA flag. */
      stageSince: new Date(Date.now() - [3, 30, 9, 60][i % 4] * 3_600_000).toISOString(),
    };
  });
})();

/* ---- searching ---- */

export function matchesAssetOrder(row: AssetOrder, q: string): boolean {
  return [
    row.orderNo,
    row.customer.title,
    row.customer.description,
    row.salesRep,
    row.date.title,
    row.status,
    row.assetType,
    row.serialNo,
    row.poNumber,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}
