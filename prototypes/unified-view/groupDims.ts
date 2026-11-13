/*
  Groupable dimensions, per list.

  What a list can be grouped by is a property of its DATA, not of the Group By
  control — which is why the DS menu now takes these as a prop. The DS's own
  fourteen-name default was generic: eight of those names (Created At, State,
  City, ZIP, Source, Truck, Created By, Assigned By) have no backing field on a
  fuel order, so they could never have grouped anything.

  Two rules hold across all four lists:

  • ONLY DIMENSIONS WITH USEFUL CARDINALITY. No order numbers, unique ids, ERP
    ids, raw timestamps, notes or contact fields — one group per row organises
    nothing.

  • A MULTI-VALUE DIMENSION NEVER SETS `hides`. Hiding the column it groups by
    would delete the row's OTHER values: an account grouped under
    "Transportation" is also Tank Wagon, and that has to stay on the row.
    Single-value dimensions do hide their column, because there every cell
    repeats its own group header.
*/
import type { GroupDim } from "@/components/tables-layout";
import type { Customer } from "./customers";
import type { Asset } from "./assets";
import { ASSET_STATUSES } from "./assets";

/* THE ORDERS PAGE'S DIMENSIONS live with its rows, in `salesOrders.ts`
   (Pavan, 2026-10-07) — fuel and asset orders, one list. */

/* -------------------------------------------------------------- customers --
   Measure: ship-tos. An account count alone would make every header say the
   same thing twice, and ship-to count is the one number that varies. */
export const CUSTOMER_GROUP_DIMS: GroupDim<Customer>[] = [
  {
    key: "status",
    label: "Status",
    hides: "status",
    order: ["Active", "Inactive"],
    valuesOf: (r) => [r.status],
  },
  {
    key: "los",
    label: "Line of service",
    multi: true,
    valuesOf: (r) => r.los,
  },
  {
    key: "billingTerms",
    label: "Billing terms",
    valuesOf: (r) => [r.billingTerms],
  },
];

/* ----------------------------------------------------------------- assets --
   Measure: capacity (gal) — the strongest rollup of the four lists. "Houston,
   TX — 14 assets, 82,000 gal" is a number the flat list cannot produce. */
export const ASSET_GROUP_DIMS: GroupDim<Asset>[] = [
  {
    key: "hub",
    label: "Hub",
    hides: "hub",
    valuesOf: (r) => [r.hub],
  },
  {
    key: "los",
    label: "LOS",
    hides: "los",
    valuesOf: (r) => [r.los],
  },
  {
    key: "status",
    label: "Status",
    hides: "status",
    order: ASSET_STATUSES,
    valuesOf: (r) => [r.status],
  },
  {
    key: "monitor",
    label: "Tank monitor",
    hides: "monitor",
    // Two groups answering "what isn't monitored", which is the real question.
    order: ["Not monitored", "Monitored"],
    valuesOf: (r) => [r.tankMonitor ? "Monitored" : "Not monitored"],
  },
  {
    key: "products",
    label: "Product compatibility",
    multi: true,
    valuesOf: (r) => r.products,
  },
];
