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
import type { FuelOrder } from "./types";
import type { AssetOrder } from "./assetOrders";
import { ASSET_ORDER_STATUSES } from "./assetOrders";
import type { Customer } from "./customers";
import type { Asset } from "./assets";
import { ASSET_STATUSES } from "./assets";

/* ------------------------------------------------------------ fuel orders --
   Measure: Qty (Gal). Customer and Ship To share one two-line cell, so neither
   hides it — grouping by customer makes the title line redundant but the
   ship-to beneath it is still the row's own information. */
export const FUEL_ORDER_GROUP_DIMS: GroupDim<FuelOrder>[] = [
  {
    key: "customer",
    label: "Customer",
    valuesOf: (r) => [r.customer.title],
  },
  {
    key: "shipTo",
    label: "Ship To",
    valuesOf: (r) => [r.customer.description],
  },
  {
    key: "driver",
    label: "Driver",
    hides: "driver",
    // The empty group here is the work queue — every order still needing one.
    valuesOf: (r) => (r.driver ? [r.driver.name] : []),
  },
  {
    key: "type",
    label: "Order Type",
    hides: "type",
    valuesOf: (r) => [r.type.label],
  },
  {
    key: "status",
    label: "Status",
    hides: "status",
    order: ["Requested", "Scheduled", "Dispatched", "Delivered", "Cancelled"],
    valuesOf: (r) => [r.status],
  },
  {
    key: "date",
    label: "Date of Delivery",
    hides: "date",
    // One group while the toolbar scopes the list to a single day. Earns its
    // place the moment that scope widens to a range.
    valuesOf: (r) => [r.date.title],
  },
  {
    key: "product",
    label: "Product",
    multi: true,
    valuesOf: (r) => r.products.map((p) => p.name),
  },
  {
    key: "tags",
    label: "Tags",
    multi: true,
    valuesOf: (r) => r.tags,
  },
];

/* ----------------------------------------------------------- asset orders --
   Measure: quantity (units). Asset Type and Ship To are on the row model but
   not columns — grouping can see them, the table stays as it was. */
export const ASSET_ORDER_GROUP_DIMS: GroupDim<AssetOrder>[] = [
  {
    key: "customer",
    label: "Customer",
    valuesOf: (r) => [r.customer.title],
  },
  {
    key: "salesRep",
    label: "Sales Rep",
    hides: "salesRep",
    valuesOf: (r) => [r.salesRep],
  },
  {
    key: "status",
    label: "Status",
    hides: "status",
    // A real lifecycle, so the groups follow it rather than the alphabet.
    order: ASSET_ORDER_STATUSES,
    valuesOf: (r) => [r.status],
  },
  {
    key: "date",
    label: "Delivery Date",
    hides: "date",
    valuesOf: (r) => [r.date.title],
  },
  {
    key: "assetType",
    label: "Asset Type",
    valuesOf: (r) => [r.assetType],
  },
  {
    key: "shipTo",
    label: "Ship To",
    valuesOf: (r) => [r.shipTo],
  },
];

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
    label: "Line of Service",
    multi: true,
    valuesOf: (r) => r.los,
  },
  {
    key: "billingTerms",
    label: "Billing Terms",
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
    label: "Tank Monitor",
    hides: "monitor",
    // Two groups answering "what isn't monitored", which is the real question.
    order: ["Not monitored", "Monitored"],
    valuesOf: (r) => [r.tankMonitor ? "Monitored" : "Not monitored"],
  },
  {
    key: "products",
    label: "Product Compatibility",
    multi: true,
    valuesOf: (r) => r.products,
  },
];
