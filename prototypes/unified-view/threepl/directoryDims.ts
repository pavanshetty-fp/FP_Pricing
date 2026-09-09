/*
  Columns, search, sort and group dimensions for three of the four Directory
  lists. Vendors keeps its own next to its records, because the order flow
  already owned that file.

  ONE FILE, because the three share a shape: a record list whose columns are
  the reference screen's columns, in the reference screen's order. Splitting
  them into three near-identical modules would have made a change to the shape
  a change in three places.

  COLUMN ORDER IS THE REFERENCE'S, NOT MINE. Name, then the identifier, then
  how to reach them, then where they are, then the money. That is the order
  somebody reads a row in when they are looking for one particular record, and
  re-sorting it into something tidier would have made the screen harder to scan
  while looking neater in isolation.

  WHERE A MEASURE EXISTS, IT IS NAMED:
    · Customers      — outstanding balance. Dollars owed add up.
    · Rental Assets  — monthly revenue, counting only what is ON RENT. Capacity
                       would be the obvious pick and is wrong: a group's tanks
                       do not pool into one tank.
    · Products       — nothing. A base price is per gallon; summing sixty of
                       them produces a number with no referent.
*/
import type { GroupDim } from "@/components/tables-layout";
import { oneLineAddress } from "./directoryCore";
import {
  MAINTENANCE_STATUSES,
  PAYMENT_TERMS,
  PRODUCT_CATEGORIES,
  RENTAL_STATUSES,
  RENTAL_TYPES,
  UNITS_OF_MEASURE,
  customerReach,
  shipToNames,
  type BrokerCustomer,
  type BrokerProduct,
  type RentalAsset,
} from "./directory";

/* ───────────────────────────────────────────────────────────── customers ── */

export type BrokerCustomerColumnKey =
  | "name"
  | "erpId"
  | "poc"
  | "address"
  | "credit"
  | "balance"
  | "shipTos"
  | "terms"
  | "status"
  | "instruction"
  | "actions";

/*
  ELEVEN COLUMNS, DOWN FROM SIXTEEN. Four of the old ones were parts of a
  single fact printed apart, and one was a duplicate:

    · Address + City + Zip + State  ->  ONE Address column, two lines. A
      street, a city, a state and a ZIP are one postal address; splitting them
      cost four column widths and made the reader assemble it themselves.
    · Credit + Credit Limit         ->  ONE Credit column. A limit means
      nothing without the status it sits under — "Not set" reads as an error
      beside Unapproved and as an omission beside Approved.
    · Phone                          ->  gone. It was the same number already
      printed under Primary POC, and a table that says a thing twice teaches
      people to distrust both.

  POC MOVED TO THIRD, right after the identifiers. Who to ring is the question
  a directory is opened with most often, and it was sitting past the fold.

  CUSTOMER INSTRUCTIONS MOVED LAST, and stopped being text. See its cell.
*/
export const BROKER_CUSTOMER_COLUMNS = [
  { key: "name" as const, label: "Customer Name", width: 240, sortable: true },
  { key: "erpId" as const, label: "ERP ID", width: 130, sortable: true },
  { key: "poc" as const, label: "Primary POC", width: 210 },
  { key: "address" as const, label: "Address", width: 260, sortable: true },
  { key: "credit" as const, label: "Credit", width: 170, sortable: true },
  { key: "balance" as const, label: "Current Balance ($)", width: 180, sortable: true, align: "right" as const },
  { key: "shipTos" as const, label: "Ship-Tos", width: 230 },
  { key: "terms" as const, label: "Terms", width: 130, sortable: true },
  { key: "status" as const, label: "Status", width: 120, sortable: true },
  /* 64px — the table's own resize minimum, and the narrowest this can be.
     The cell is a 32px icon: 32 + 24px of padding is 56, so the label is free
     up to ~34px of text and the FLOOR is set by `useColumnWidths`, not by the
     word. "Notes" measures 34px and fits inside it; "Instructions" would cost
     92px, and the extra 28px buys precision this column does not need — the
     icon's tooltip and the drawer's own title both say "Delivery instructions"
     in full. Judged within its own table there is no other notes column to
     confuse it with. */
  { key: "instruction" as const, label: "Notes", width: 64 },
  { key: "actions" as const, label: "", width: 44 },
];

export const BROKER_CUSTOMER_SEARCH_FIELDS = [
  { key: "name", label: "Customer", text: (c: BrokerCustomer) => `${c.name} ${c.erpId}` },
  { key: "shipTos", label: "Ship-Tos", text: (c: BrokerCustomer) => shipToNames(c).join(" ") },
  { key: "poc", label: "Primary POC", text: (c: BrokerCustomer) => `${c.mainContactName ?? ""} ${c.phone ?? ""}` },
  { key: "city", label: "City", text: (c: BrokerCustomer) => `${c.city ?? ""} ${c.state ?? ""} ${c.zip ?? ""}` },
];

/** Free-text across everything an account is findable by. */
export function matchesCustomer(c: BrokerCustomer, q: string): boolean {
  return `${c.name} ${c.erpId} ${c.mainContactName ?? ""} ${c.city ?? ""} ${c.state ?? ""} ${c.zip ?? ""} ${c.phone ?? ""} ${shipToNames(c).join(" ")}`
    .toLowerCase()
    .includes(q);
}

export interface CustomerSort {
  key: BrokerCustomerColumnKey;
  dir: "asc" | "desc";
}

/**
 * NUMERIC COLUMNS SORT AS NUMBERS. `$1,200` before `$900` is the classic
 * string-sorted money column, and the two that matter most here are money.
 * `null` limit sorts LAST in both directions — an account with no limit set is
 * not an account with a limit of zero.
 */
export function sortCustomers(rows: BrokerCustomer[], sort: CustomerSort | null): BrokerCustomer[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  const of = (c: BrokerCustomer): string | number | null => {
    switch (sort.key) {
      case "name": return c.name;
      case "erpId": return c.erpId;
      /* SORTING BY ADDRESS MEANS SORTING BY PLACE. Nobody wants their accounts
         ordered by house number, so the merged column sorts on the second
         line — city, then state — which is what "sort by address" is asking
         for on a list of customers. */
      case "address": return `${c.city ?? ""} ${c.state ?? ""}`.trim();
      case "credit": return c.creditStatus;
      case "balance": return c.currentBalance;
      case "terms": return c.paymentTerms;
      case "status": return c.status;
      default: return c.name;
    }
  };
  return [...rows].sort((a, b) => {
    const x = of(a);
    const y = of(b);
    if (x === null || x === "") return 1;
    if (y === null || y === "") return -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
    return String(x).localeCompare(String(y)) * dir;
  });
}

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
    label: "Payment Terms",
    hides: "terms",
    order: [...PAYMENT_TERMS],
    valuesOf: (c) => [c.paymentTerms],
  },
  {
    key: "state",
    label: "State",
    /* No `hides`: state is part of the Address column now, and hiding that
       while grouped by state would take the street away with it. */
    valuesOf: (c) => (c.state ? [c.state] : []),
  },
  {
    key: "status",
    label: "Record Status",
    hides: "status",
    order: ["active", "inactive", "archived"],
    valuesOf: (c) => [c.status],
  },
  {
    /* MULTI. An account carries several tags and belongs under each of them,
       which is why the footer says the counts add up past the total. */
    key: "tags",
    label: "Tag",
    multi: true,
    valuesOf: (c) => c.tags,
  },
];

/* ────────────────────────────────────────────────────────────── products ── */

export type BrokerProductColumnKey =
  | "name"
  | "code"
  | "category"
  | "unit"
  | "topOff"
  | "price"
  | "taxCode"
  | "accounting"
  | "status"
  | "customers"
  | "vendors"
  | "notes"
  | "actions";

export const BROKER_PRODUCT_COLUMNS = [
  { key: "name" as const, label: "Product Name", width: 250, sortable: true },
  { key: "code" as const, label: "Product Code", width: 140, sortable: true },
  { key: "category" as const, label: "Category", width: 140, sortable: true },
  { key: "unit" as const, label: "UOM", width: 100, sortable: true },
  { key: "topOff" as const, label: "TopOff", width: 130, sortable: true },
  { key: "price" as const, label: "Base Price", width: 140, sortable: true, align: "right" as const },
  { key: "taxCode" as const, label: "Tax Code", width: 140, sortable: true },
  { key: "accounting" as const, label: "Accounting Mapping", width: 230 },
  { key: "status" as const, label: "Status", width: 120, sortable: true },
  { key: "customers" as const, label: "Customers", width: 130, sortable: true, align: "right" as const },
  { key: "vendors" as const, label: "Vendors", width: 120, sortable: true, align: "right" as const },
  /* Same 64px icon column as Customers and Vendors — see the note there. */
  { key: "notes" as const, label: "Notes", width: 64 },
  { key: "actions" as const, label: "", width: 44 },
];

export const BROKER_PRODUCT_SEARCH_FIELDS = [
  { key: "name", label: "Product", text: (p: BrokerProduct) => `${p.name} ${p.productCode}` },
  { key: "category", label: "Category", text: (p: BrokerProduct) => p.category },
  { key: "accounting", label: "Accounting", text: (p: BrokerProduct) => `${p.taxCode ?? ""} ${p.revenueAccount ?? ""} ${p.erpItemId ?? ""}` },
];

export function matchesProduct(p: BrokerProduct, q: string): boolean {
  return `${p.name} ${p.productCode} ${p.category} ${p.unit} ${p.hazmat ?? ""} ${p.erpItemId ?? ""}`
    .toLowerCase()
    .includes(q);
}

export interface ProductSort {
  key: BrokerProductColumnKey;
  dir: "asc" | "desc";
}

export function sortProducts(rows: BrokerProduct[], sort: ProductSort | null): BrokerProduct[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  const of = (p: BrokerProduct): string | number | null => {
    switch (sort.key) {
      case "name": return p.name;
      case "code": return p.productCode;
      case "category": return p.category;
      case "unit": return p.unit;
      case "topOff": return p.topOffSupported ? 1 : 0;
      case "price": return p.basePrice;
      case "taxCode": return p.taxCode;
      case "status": return p.status;
      case "customers": return customerReach(p);
      case "vendors": return p.availableVendorIds.length;
      default: return p.name;
    }
  };
  return [...rows].sort((a, b) => {
    const x = of(a);
    const y = of(b);
    if (x === null || x === "") return 1;
    if (y === null || y === "") return -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
    return String(x).localeCompare(String(y)) * dir;
  });
}

export const BROKER_PRODUCT_GROUP_DIMS: GroupDim<BrokerProduct>[] = [
  {
    key: "category",
    label: "Category",
    hides: "category",
    order: [...PRODUCT_CATEGORIES],
    valuesOf: (p) => [p.category],
  },
  {
    key: "unit",
    label: "Unit of Measure",
    hides: "unit",
    order: [...UNITS_OF_MEASURE],
    valuesOf: (p) => [p.unit],
  },
  {
    key: "status",
    label: "Status",
    hides: "status",
    order: ["active", "inactive", "archived"],
    valuesOf: (p) => [p.status],
  },
  {
    key: "topOff",
    label: "TopOff Support",
    hides: "topOff",
    order: ["Supported", "Not supported"],
    valuesOf: (p) => [p.topOffSupported ? "Supported" : "Not supported"],
  },
];

/* ────────────────────────────────────────────────────────── rental assets ── */

export type RentalAssetColumnKey =
  | "name"
  | "serial"
  | "type"
  | "customer"
  | "shipTo"
  | "address"
  | "city"
  | "state"
  | "status"
  | "availability"
  | "start"
  | "end"
  | "rate"
  | "product"
  | "maintenance"
  | "actions";

export const RENTAL_ASSET_COLUMNS = [
  { key: "name" as const, label: "Asset Name", width: 210, sortable: true },
  { key: "serial" as const, label: "Asset ID / Serial", width: 170, sortable: true },
  { key: "type" as const, label: "Asset Type", width: 160, sortable: true },
  { key: "customer" as const, label: "Customer", width: 250 },
  { key: "shipTo" as const, label: "Ship-to / Location", width: 210 },
  { key: "address" as const, label: "Address", width: 240 },
  { key: "city" as const, label: "City", width: 140, sortable: true },
  { key: "state" as const, label: "State", width: 90, sortable: true },
  { key: "status" as const, label: "Status", width: 120, sortable: true },
  { key: "availability" as const, label: "Availability", width: 160, sortable: true },
  { key: "start" as const, label: "Rental Start", width: 150, sortable: true },
  { key: "end" as const, label: "Rental End", width: 170, sortable: true },
  { key: "rate" as const, label: "Rate", width: 130, sortable: true, align: "right" as const },
  { key: "product" as const, label: "Linked Product", width: 200 },
  { key: "maintenance" as const, label: "Maintenance", width: 160, sortable: true },
  { key: "actions" as const, label: "", width: 44 },
];

export const RENTAL_ASSET_SEARCH_FIELDS = [
  { key: "name", label: "Asset", text: (a: RentalAsset) => `${a.name} ${a.serialNumber ?? ""}` },
  { key: "customer", label: "Customer", text: (a: RentalAsset) => `${a.customer ?? ""} ${a.shipTo ?? ""}` },
  { key: "type", label: "Type", text: (a: RentalAsset) => a.assetType },
  { key: "location", label: "Location", text: (a: RentalAsset) => oneLineAddress(a) },
];

export function matchesAsset(a: RentalAsset, q: string): boolean {
  return `${a.name} ${a.serialNumber ?? ""} ${a.assetType} ${a.customer ?? ""} ${a.shipTo ?? ""} ${a.city ?? ""} ${a.state ?? ""}`
    .toLowerCase()
    .includes(q);
}

export interface AssetSort {
  key: RentalAssetColumnKey;
  dir: "asc" | "desc";
}

export function sortAssets(rows: RentalAsset[], sort: AssetSort | null): RentalAsset[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  const of = (a: RentalAsset): string | number | null => {
    switch (sort.key) {
      case "name": return a.name;
      case "serial": return a.serialNumber;
      case "type": return a.assetType;
      case "city": return a.city;
      case "state": return a.state;
      case "status": return a.status;
      case "availability": return a.availabilityStatus;
      case "start": return a.rentalStartDate;
      case "end": return a.rentalEndDate;
      case "rate": return a.rentalRate;
      case "maintenance": return a.maintenanceStatus;
      default: return a.name;
    }
  };
  return [...rows].sort((a, b) => {
    const x = of(a);
    const y = of(b);
    if (x === null || x === "") return 1;
    if (y === null || y === "") return -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
    return String(x).localeCompare(String(y)) * dir;
  });
}

export const RENTAL_ASSET_GROUP_DIMS: GroupDim<RentalAsset>[] = [
  {
    key: "availability",
    label: "Availability",
    hides: "availability",
    order: [...RENTAL_STATUSES],
    valuesOf: (a) => [a.availabilityStatus],
  },
  {
    key: "type",
    label: "Asset Type",
    hides: "type",
    order: [...RENTAL_TYPES],
    valuesOf: (a) => [a.assetType],
  },
  {
    key: "customer",
    label: "Customer",
    hides: "customer",
    /* Built from the DATA rather than a constant: only accounts that actually
       have an asset out belong in a menu of who has one. An asset in the yard
       falls into the NO_VALUE group, which is exactly where it belongs. */
    valuesOf: (a) => (a.customer ? [a.customer] : []),
  },
  {
    key: "maintenance",
    label: "Maintenance",
    hides: "maintenance",
    order: [...MAINTENANCE_STATUSES],
    valuesOf: (a) => [a.maintenanceStatus],
  },
];
