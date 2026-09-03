/*
  Columns, search, sort and group dimensions for the three Directory lists.

  ONE FILE, because the three share a shape: a small record list with no date,
  no bulk actions, and a measure only where something genuinely sums. Splitting
  them into three near-identical modules would have made a change to the shape
  a change in three places.

  WHERE A MEASURE EXISTS, IT IS NAMED:
    · Customers      — outstanding balance. Dollars owed add up.
    · Rental Assets  — monthly revenue, counting only what is ON RENT. Capacity
                       would be the obvious pick and is wrong: a group's tanks
                       do not pool into one tank.
    · Products       — nothing. A reference price is per gallon; summing seven
                       of them produces a number with no referent.
*/
import type { GroupDim } from "@/components/tables-layout";
import {
  CREDIT_STATUSES,
  PRODUCT_CATEGORIES,
  RENTAL_STATUSES,
  RENTAL_TYPES,
  type BrokerCustomer,
  type BrokerProduct,
  type RentalAsset,
} from "./directory";

/* ───────────────────────────────────────────────────────────── customers ── */

export type BrokerCustomerColumnKey =
  | "name"
  | "shipTos"
  | "credit"
  | "limit"
  | "balance"
  | "terms"
  | "poc"
  | "actions";

export const BROKER_CUSTOMER_COLUMNS = [
  { key: "name" as const, label: "Customer", width: 260, sortable: true },
  { key: "shipTos" as const, label: "Ship-Tos", width: 240 },
  { key: "credit" as const, label: "Credit", width: 150, sortable: true },
  { key: "limit" as const, label: "Limit", width: 130, sortable: true, align: "right" as const },
  { key: "balance" as const, label: "Outstanding", width: 150, sortable: true, align: "right" as const },
  { key: "terms" as const, label: "Terms", width: 120, sortable: true },
  { key: "poc" as const, label: "Primary POC", width: 220 },
  { key: "actions" as const, label: "", width: 44 },
];

export const BROKER_CUSTOMER_SEARCH_FIELDS = [
  { key: "name", label: "Customer", text: (c: BrokerCustomer) => `${c.name} ${c.erpId}` },
  { key: "shipTos", label: "Ship-Tos", text: (c: BrokerCustomer) => c.shipTos.join(" ") },
  { key: "poc", label: "Primary POC", text: (c: BrokerCustomer) => `${c.poc} ${c.pocPhone}` },
];

export const BROKER_CUSTOMER_GROUP_DIMS: GroupDim<BrokerCustomer>[] = [
  {
    key: "credit",
    label: "Credit Status",
    hides: "credit",
    // Unapproved first: the group worth finding is the one that cannot order.
    order: ["Unapproved", "On hold", "Approved"],
    valuesOf: (c) => [c.creditStatus],
  },
  {
    key: "terms",
    label: "Terms",
    hides: "terms",
    valuesOf: (c) => [c.terms],
  },
];

/* ────────────────────────────────────────────────────────────── products ── */

export type BrokerProductColumnKey =
  | "name"
  | "category"
  | "unit"
  | "taxable"
  | "hazmat"
  | "price"
  | "status"
  | "actions";

export const BROKER_PRODUCT_COLUMNS = [
  { key: "name" as const, label: "Product", width: 260, sortable: true },
  { key: "category" as const, label: "Category", width: 150, sortable: true },
  { key: "unit" as const, label: "Unit", width: 100 },
  { key: "taxable" as const, label: "Tax", width: 140, sortable: true },
  { key: "hazmat" as const, label: "Hazmat", width: 200 },
  { key: "price" as const, label: "Ref. Price", width: 140, sortable: true, align: "right" as const },
  { key: "status" as const, label: "Status", width: 130, sortable: true },
  { key: "actions" as const, label: "", width: 44 },
];

export const BROKER_PRODUCT_SEARCH_FIELDS = [
  { key: "name", label: "Product", text: (p: BrokerProduct) => p.name },
  { key: "category", label: "Category", text: (p: BrokerProduct) => p.category },
  { key: "hazmat", label: "Hazmat", text: (p: BrokerProduct) => p.hazmat ?? "" },
];

export const BROKER_PRODUCT_GROUP_DIMS: GroupDim<BrokerProduct>[] = [
  {
    key: "category",
    label: "Category",
    hides: "category",
    order: [...PRODUCT_CATEGORIES],
    valuesOf: (p) => [p.category],
  },
  {
    key: "taxable",
    label: "Tax",
    hides: "taxable",
    // "Exempt" is the exception worth finding, so it leads.
    order: ["Exempt", "Taxable"],
    valuesOf: (p) => [p.taxable ? "Taxable" : "Exempt"],
  },
  {
    key: "status",
    label: "Status",
    hides: "status",
    order: ["Active", "Inactive"],
    valuesOf: (p) => [p.active ? "Active" : "Inactive"],
  },
  {
    key: "hazmat",
    label: "Hazmat",
    valuesOf: (p) => [p.hazmat ?? "Not regulated"],
  },
];

/* ────────────────────────────────────────────────────── rental assets ── */

export type RentalAssetColumnKey =
  | "name"
  | "type"
  | "capacity"
  | "status"
  | "customer"
  | "rate"
  | "since"
  | "actions";

export const RENTAL_ASSET_COLUMNS = [
  { key: "name" as const, label: "Asset", width: 230, sortable: true },
  { key: "type" as const, label: "Type", width: 150, sortable: true },
  { key: "capacity" as const, label: "Capacity", width: 130, sortable: true, align: "right" as const },
  { key: "status" as const, label: "Status", width: 160, sortable: true },
  { key: "customer" as const, label: "On Rent To", width: 260 },
  { key: "rate" as const, label: "Rate / mo", width: 130, sortable: true, align: "right" as const },
  { key: "since" as const, label: "Since", width: 140, sortable: true },
  { key: "actions" as const, label: "", width: 44 },
];

export const RENTAL_ASSET_SEARCH_FIELDS = [
  { key: "name", label: "Asset", text: (a: RentalAsset) => `${a.name} ${a.serial}` },
  { key: "customer", label: "On Rent To", text: (a: RentalAsset) => `${a.customer ?? ""} ${a.shipTo ?? ""}` },
  { key: "type", label: "Type", text: (a: RentalAsset) => a.type },
];

export const RENTAL_ASSET_GROUP_DIMS: GroupDim<RentalAsset>[] = [
  {
    key: "status",
    label: "Status",
    hides: "status",
    order: [...RENTAL_STATUSES],
    valuesOf: (a) => [a.status],
  },
  {
    key: "type",
    label: "Type",
    hides: "type",
    order: [...RENTAL_TYPES],
    valuesOf: (a) => [a.type],
  },
  {
    key: "customer",
    label: "On Rent To",
    /* Empty for everything in the yard — and that group, "—", is the one a
       fleet manager is looking for. */
    valuesOf: (a) => (a.customer ? [a.customer] : []),
  },
];

/** Kept beside the dims so a new credit status cannot be added without a facet. */
export const CREDIT_FACET_OPTIONS = [...CREDIT_STATUSES];
