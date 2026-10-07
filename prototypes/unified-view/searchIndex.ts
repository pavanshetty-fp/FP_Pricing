import { FUEL_ORDERS } from "./data";
import { ASSET_ORDERS } from "./assetOrders";
import { CUSTOMERS } from "./customers";
import { ASSETS } from "./assets";
import { BROKER_ORDERS } from "./threepl/orders";
import { vendorName } from "./threepl/vendors";

/*
  Global search index.

  One flat list built from all four datasets plus the rail destinations, so a
  single query reaches across every segment at once. Each entry carries where it
  lives (`navKey`) and which record it is (`recordId`), which is what lets a
  result both switch screens and open that record's sheet.

  STRUCTURE ONLY from the reference: scope tabs, grouped results, a result count,
  a recent/pages empty state and keyboard hints.

  SCOPES ARE SEGMENTS, NOT MODULES. The reference's scope tabs are its MODULE
  list (3PL / Lease / Sales / Pricing / Shared). When only Sales existed that
  taxonomy was refused outright, because three of those five were modules this
  prototype did not have and putting them on screen would have been fake
  navigation. Two of them now exist — but the tabs still scope by SEGMENT
  (Fuel Orders, 3PL Orders, Customers …) rather than by module, because a
  segment is what a person searching has in mind; "which module owns it" is the
  app's concern, and the entry carries it as `moduleKey` so a hit can switch
  module silently on the way to the record.
*/

export type SearchKind =
  | "page"
  | "fuel-order"
  | "asset-order"
  | "broker-order"
  | "customer"
  | "asset";

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  /**
   * Which MODULE the destination belongs to. A hit in another module has to
   * switch the module switcher too, or the rail would show one module's
   * destinations while the content layer showed another's.
   */
  moduleKey: string;
  /** Rail destination this result lives on. */
  navKey: string;
  /** The record to open once there. `null` for a page result. */
  recordId: string | null;
  /**
   * Extra terms folded into the haystack but NOT shown on the row — product
   * names, ship-tos, serials, PO numbers. A row has no space for them, but they
   * are exactly what somebody types, so the index has to carry them or a real
   * query like "morris diesel" finds nothing.
   */
  keywords?: string;
  /** Everything matched against, lowercased at build time. */
  haystack: string;
}

/** Group headings, in the order they appear. */
export const KIND_LABEL: Record<SearchKind, string> = {
  page: "Pages",
  "fuel-order": "Fuel Orders",
  "asset-order": "Asset Orders",
  "broker-order": "3PL Orders",
  customer: "Customers",
  asset: "Assets",
};

/** Scope tabs. `null` is "Everything". */
export const SEARCH_SCOPES: { key: SearchKind | "all"; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "fuel-order", label: "Fuel Orders" },
  { key: "asset-order", label: "Asset Orders" },
  { key: "broker-order", label: "3PL Orders" },
  { key: "customer", label: "Customers" },
  { key: "asset", label: "Assets" },
];

const PAGES: Omit<SearchEntry, "haystack">[] = [
  /* ONE ORDERS PAGE (Pavan, 2026-10-07) — fuel and asset orders together. */
  {
    id: "page-sales-orders",
    kind: "page",
    title: "Orders",
    subtitle: "Fuel and asset orders · list",
    /* The two old page names still find it. */
    keywords: "fuel orders asset orders",
    moduleKey: "sales",
    navKey: "sales-orders",
    recordId: null,
  },
  {
    id: "page-customers",
    kind: "page",
    title: "Customers",
    subtitle: "Accounts, ship-tos and lines of service",
    moduleKey: "sales",
    navKey: "customers",
    recordId: null,
  },
  {
    id: "page-assets",
    kind: "page",
    title: "Assets",
    subtitle: "Tanks, pumps and monitored equipment",
    moduleKey: "sales",
    navKey: "assets",
    recordId: null,
  },
  {
    id: "page-3pl-orders",
    kind: "page",
    title: "3PL Orders",
    subtitle: "Brokered orders and delivery partners · board",
    moduleKey: "3pl",
    navKey: "3pl-orders",
    recordId: null,
  },
];

const withHaystack = (e: Omit<SearchEntry, "haystack">): SearchEntry => ({
  ...e,
  haystack: `${e.title} ${e.subtitle} ${e.keywords ?? ""}`.toLowerCase(),
});

export const SEARCH_INDEX: SearchEntry[] = [
  ...PAGES.map(withHaystack),

  ...FUEL_ORDERS.map((o) =>
    withHaystack({
      id: `fo-${o.id}`,
      kind: "fuel-order",
      title: `#${o.orderNo} · ${o.customer.title}`,
      subtitle: [
        o.type.label,
        o.customer.description,
        `${o.qtyGal.toLocaleString()} gal`,
        o.status,
        o.driver?.name ?? "Unassigned",
      ].join(" · "),
      keywords: [
        o.products.map((p) => p.name).join(" "),
        o.tags.join(" "),
        o.customer.description,
      ].join(" "),
      moduleKey: "sales",
      navKey: "sales-orders",
      recordId: o.id,
    })
  ),

  ...ASSET_ORDERS.map((o) =>
    withHaystack({
      id: `ao-${o.id}`,
      kind: "asset-order",
      title: `#${o.orderNo} · ${o.customer.title}`,
      subtitle: [o.assetType, `Qty ${o.quantity}`, o.salesRep, o.status].join(" · "),
      keywords: [o.serialNo, o.poNumber, o.shipTo, o.customer.description].join(" "),
      moduleKey: "sales",
      navKey: "sales-orders",
      recordId: o.id,
    })
  ),

  ...CUSTOMERS.map((c) =>
    withHaystack({
      id: `cu-${c.id}`,
      kind: "customer",
      title: c.name,
      subtitle: [
        c.erpId,
        `${c.shipTos.length} ship-to${c.shipTos.length === 1 ? "" : "s"}`,
        c.los.join(", "),
        c.status,
      ].join(" · "),
      keywords: [c.shipTos.join(" "), c.contactName, c.billingTerms].join(" "),
      moduleKey: "sales",
      navKey: "customers",
      recordId: c.id,
    })
  ),

  ...ASSETS.map((a) =>
    withHaystack({
      id: `as-${a.id}`,
      kind: "asset",
      title: a.displayName,
      subtitle: [
        a.uniqueId,
        a.hub,
        a.los,
        `${a.capacityGal.toLocaleString()} gal`,
        a.status,
      ].join(" · "),
      keywords: [
        a.products.join(" "),
        a.erpId,
        a.tankMonitor ? `monitor ${a.tankMonitorId}` : "no monitor",
      ].join(" "),
      moduleKey: "sales",
      navKey: "assets",
      recordId: a.id,
    })
  ),

  ...BROKER_ORDERS.map((o) =>
    withHaystack({
      id: `bo-${o.id}`,
      kind: "broker-order",
      title: `${o.orderNo} · ${o.customer.title}`,
      subtitle: [
        o.kind,
        o.shipTo,
        `${o.window.start}–${o.window.end}`,
        o.status,
        o.vendorId ? vendorName(o.vendorId) : "No partner",
      ].join(" · "),
      keywords: [
        o.lines.map((l) => `${l.asset} ${l.product}`).join(" "),
        o.poNumber,
        o.hub,
        o.primaryPoc,
        o.salesperson,
        o.customer.description,
      ].join(" "),
      moduleKey: "3pl",
      navKey: "3pl-orders",
      recordId: o.id,
    })
  ),
];

/**
 * Match on every word in the query, in any order and any field — so
 * "morris diesel" finds a Morris order carrying diesel, which a plain substring
 * match would miss.
 */
export function searchAll(
  query: string,
  scope: SearchKind | "all"
): SearchEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return SEARCH_INDEX.filter((e) => {
    if (scope !== "all" && e.kind !== scope) return false;
    return terms.every((t) => e.haystack.includes(t));
  });
}

/** Group hits by kind, preserving the KIND_LABEL order. */
export function groupByKind(
  entries: SearchEntry[]
): { kind: SearchKind; label: string; items: SearchEntry[] }[] {
  const order: SearchKind[] = [
    "page",
    "fuel-order",
    "asset-order",
    "broker-order",
    "customer",
    "asset",
  ];
  return order
    .map((kind) => ({
      kind,
      label: KIND_LABEL[kind],
      items: entries.filter((e) => e.kind === kind),
    }))
    .filter((g) => g.items.length > 0);
}
