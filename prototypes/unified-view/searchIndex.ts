import { FUEL_ORDERS } from "./data";
import { ASSET_ORDERS } from "./assetOrders";
import { CUSTOMERS } from "./customers";
import { ASSETS } from "./assets";

/*
  Global search index.

  One flat list built from all four datasets plus the rail destinations, so a
  single query reaches across every segment at once. Each entry carries where it
  lives (`navKey`) and which record it is (`recordId`), which is what lets a
  result both switch screens and open that record's sheet.

  STRUCTURE ONLY from the reference: scope tabs, grouped results, a result count,
  a recent/pages empty state and keyboard hints. The reference's own scope
  taxonomy (3PL / Lease / Sales / Pricing / Shared) is NOT reused — those are
  modules this prototype does not have, and inventing them would put fake
  navigation on screen. The scopes here are the four segments that actually
  exist, which is the same idea applied to real ground.
*/

export type SearchKind =
  | "page"
  | "fuel-order"
  | "asset-order"
  | "customer"
  | "asset";

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
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
  customer: "Customers",
  asset: "Assets",
};

/** Scope tabs. `null` is "Everything". */
export const SEARCH_SCOPES: { key: SearchKind | "all"; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "fuel-order", label: "Fuel Orders" },
  { key: "asset-order", label: "Asset Orders" },
  { key: "customer", label: "Customers" },
  { key: "asset", label: "Assets" },
];

const PAGES: Omit<SearchEntry, "haystack">[] = [
  {
    id: "page-fuel-orders",
    kind: "page",
    title: "Fuel Orders",
    subtitle: "Delivery and extraction orders · list",
    navKey: "fuel-orders",
    recordId: null,
  },
  {
    id: "page-asset-orders",
    kind: "page",
    title: "Asset Orders",
    subtitle: "Tank, pump and meter orders · list",
    navKey: "asset-orders",
    recordId: null,
  },
  {
    id: "page-customers",
    kind: "page",
    title: "Customers",
    subtitle: "Accounts, ship-tos and lines of service",
    navKey: "customers",
    recordId: null,
  },
  {
    id: "page-assets",
    kind: "page",
    title: "Assets",
    subtitle: "Tanks, pumps and monitored equipment",
    navKey: "assets",
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
      navKey: "fuel-orders",
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
      navKey: "asset-orders",
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
      navKey: "assets",
      recordId: a.id,
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
