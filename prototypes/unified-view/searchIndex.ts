import { FUEL_ORDERS } from "./data";
import { ASSET_ORDERS } from "./assetOrders";
import { CUSTOMERS } from "./customers";
import { ASSETS } from "./assets";
import { SEED_QUOTES } from "./quotes";
import { BROKER_ORDERS } from "./threepl/orders";
import { VENDORS, vendorName } from "./threepl/vendors";
import {
  BROKER_CUSTOMERS,
  BROKER_PRODUCTS,
  RENTAL_ASSETS,
  shipToNames,
} from "./threepl/directory";
import { SERVICE_ORDERS, TECHNICIANS, technicianById } from "./service/work";

/*
  Global search index.

  One flat list built from every module's records plus the rail destinations,
  so a single query reaches across every module at once. Each entry carries
  where it lives (`moduleKey` + `navKey`) and which record it is (`recordId`),
  which is what lets a result both switch screens and open that record's sheet.

  SCOPES ARE MODULES, THEN RECORD TYPES (Pavan, 2026-10-23 — the LinkedIn
  pattern). The first pill row is "All" plus one pill per module that has
  results; choosing a module shows a second row of that module's record types.
  Every count is the number of matches in the whole index, never the slice a
  group shows. Pricing and Lease have no records yet, so they never get a pill.
*/

export type SearchModule = "3pl" | "sales" | "service";

/** Module pills, in the order they appear. */
export const SEARCH_MODULES: { key: SearchModule; label: string }[] = [
  { key: "3pl", label: "3PL" },
  { key: "sales", label: "Sales" },
  { key: "service", label: "Service Work" },
];

export const MODULE_LABEL: Record<SearchModule, string> = Object.fromEntries(
  SEARCH_MODULES.map((m) => [m.key, m.label])
) as Record<SearchModule, string>;

export type SearchType =
  | "delivery-order"
  | "fuel-order"
  | "asset-order"
  | "quote"
  | "service-order"
  | "customer"
  | "vendor"
  | "product"
  | "asset"
  | "rental-asset"
  | "technician"
  | "page";

/** Record types in the order their pills and groups appear. */
export const TYPE_ORDER: SearchType[] = [
  "delivery-order",
  "fuel-order",
  "asset-order",
  "quote",
  "service-order",
  "customer",
  "vendor",
  "product",
  "asset",
  "rental-asset",
  "technician",
  "page",
];

/** Plural — pills and group headings. */
export const TYPE_LABEL: Record<SearchType, string> = {
  "delivery-order": "Delivery Orders",
  "fuel-order": "Fuel Orders",
  "asset-order": "Asset Orders",
  quote: "Quotes",
  "service-order": "Service Orders",
  customer: "Customers",
  vendor: "Vendors",
  product: "Products",
  asset: "Assets",
  "rental-asset": "Rental Assets",
  technician: "Technicians",
  page: "Pages",
};

/** Singular — the pill on a result row. */
export const TYPE_SINGULAR: Record<SearchType, string> = {
  "delivery-order": "Delivery order",
  "fuel-order": "Fuel order",
  "asset-order": "Asset order",
  quote: "Quote",
  "service-order": "Service Order",
  customer: "Customer",
  vendor: "Vendor",
  product: "Product",
  asset: "Asset",
  "rental-asset": "Rental Asset",
  technician: "Technician",
  page: "Page",
};

export interface SearchEntry {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string;
  /**
   * Which MODULE the destination belongs to. A hit in another module has to
   * switch the module switcher too, or the rail would show one module's
   * destinations while the content layer showed another's.
   */
  moduleKey: SearchModule;
  /** Rail destination this result lives on. */
  navKey: string;
  /** The record to open once there. `null` for a page result. */
  recordId: string | null;
  /**
   * Extra terms matched but NOT on the row's subtitle — product names,
   * ship-tos, serials, PO numbers. They are what somebody types, so the index
   * carries them; the one that matched is shown on the row so a hit never
   * looks unexplained.
   */
  keywords: string[];
  /** Everything matched against, lowercased at build time. */
  haystack: string;
}

type Raw = Omit<SearchEntry, "haystack" | "keywords"> & {
  keywords?: (string | null | undefined)[];
};

const build = (e: Raw): SearchEntry => {
  const keywords = (e.keywords ?? []).filter((k): k is string => Boolean(k && k.trim()));
  return {
    ...e,
    keywords,
    haystack: `${e.title} ${e.subtitle} ${keywords.join(" ")}`.toLowerCase(),
  };
};

const PAGES: Raw[] = [
  /* ── Sales ── */
  {
    id: "page-sales-orders",
    type: "page",
    title: "Orders",
    subtitle: "Fuel and asset orders · list",
    /* The two old page names still find it. */
    keywords: ["fuel orders", "asset orders"],
    moduleKey: "sales",
    navKey: "sales-orders",
    recordId: null,
  },
  {
    id: "page-quotes",
    type: "page",
    title: "Quotes",
    subtitle: "Fuel quotes · list",
    moduleKey: "sales",
    navKey: "quotes",
    recordId: null,
  },
  {
    id: "page-customers",
    type: "page",
    title: "Customers",
    subtitle: "Accounts, ship-tos and lines of service",
    moduleKey: "sales",
    navKey: "customers",
    recordId: null,
  },
  {
    id: "page-assets",
    type: "page",
    title: "Assets",
    subtitle: "Tanks, pumps and monitored equipment",
    moduleKey: "sales",
    navKey: "assets",
    recordId: null,
  },
  /* ── 3PL ── */
  {
    id: "page-3pl-orders",
    type: "page",
    title: "Delivery orders",
    subtitle: "Brokered orders and delivery partners · board",
    keywords: ["3pl orders"],
    moduleKey: "3pl",
    navKey: "3pl-delivery-orders",
    recordId: null,
  },
  {
    id: "page-3pl-recurring",
    type: "page",
    title: "Recurring orders",
    subtitle: "Repeating deliveries",
    moduleKey: "3pl",
    navKey: "3pl-recurring-orders",
    recordId: null,
  },
  {
    id: "page-3pl-customers",
    type: "page",
    title: "Customers",
    subtitle: "Archive · 3PL directory · accounts and ship-tos",
    moduleKey: "3pl",
    navKey: "3pl-customers",
    recordId: null,
  },
  {
    id: "page-3pl-vendors",
    type: "page",
    title: "Vendors",
    subtitle: "Archive · 3PL directory · delivery partners",
    moduleKey: "3pl",
    navKey: "3pl-vendors",
    recordId: null,
  },
  {
    id: "page-3pl-products",
    type: "page",
    title: "Products",
    subtitle: "Archive · 3PL directory · fuels, DEF and lubricants",
    moduleKey: "3pl",
    navKey: "3pl-products",
    recordId: null,
  },
  {
    id: "page-3pl-rental-assets",
    type: "page",
    title: "Rental assets",
    subtitle: "Archive · 3PL directory · tanks and equipment on rent",
    moduleKey: "3pl",
    navKey: "3pl-rental-assets",
    recordId: null,
  },
  /* ── Service Work ── */
  {
    id: "page-service-orders",
    type: "page",
    title: "Service orders",
    subtitle: "Dispatch board",
    moduleKey: "service",
    navKey: "service-orders-dispatch",
    recordId: null,
  },
  {
    id: "page-service-technicians",
    type: "page",
    title: "Technicians",
    subtitle: "Crew, skills and capacity",
    moduleKey: "service",
    navKey: "service-technicians",
    recordId: null,
  },
];

export const SEARCH_INDEX: SearchEntry[] = [
  ...PAGES.map(build),

  /* ── 3PL ── */
  ...BROKER_ORDERS.map((o) =>
    build({
      id: `bo-${o.id}`,
      type: "delivery-order",
      title: `${o.orderNo} · ${o.customer.title}`,
      subtitle: [
        o.kind,
        o.shipTo,
        `${o.window.start}–${o.window.end}`,
        o.status,
        o.vendorId ? vendorName(o.vendorId) : "No partner",
      ].join(" · "),
      keywords: [
        ...o.lines.map((l) => `${l.asset} ${l.product}`),
        o.poNumber,
        o.hub,
        o.primaryPoc,
        o.salesperson,
        o.customer.description,
      ],
      moduleKey: "3pl",
      navKey: "3pl-delivery-orders",
      recordId: o.id,
    })
  ),

  ...BROKER_CUSTOMERS.map((c) =>
    build({
      id: `bc-${c.id}`,
      type: "customer",
      title: c.name,
      subtitle: [
        c.erpId,
        [c.city, c.state].filter(Boolean).join(", "),
        c.creditStatus,
        c.status,
      ]
        .filter(Boolean)
        .join(" · "),
      keywords: [...shipToNames(c), c.mainContactName, c.email, c.paymentTerms, ...c.tags],
      moduleKey: "3pl",
      navKey: "3pl-customers",
      recordId: c.id,
    })
  ),

  ...VENDORS.map((v) =>
    build({
      id: `bv-${v.id}`,
      type: "vendor",
      title: v.name,
      subtitle: [v.vendorType, [v.city, v.state].filter(Boolean).join(", "), v.status]
        .filter(Boolean)
        .join(" · "),
      keywords: [v.erpVendorId, v.legalBusinessName, v.dbaName, v.mainContactName, v.dispatchContactName, v.email],
      moduleKey: "3pl",
      navKey: "3pl-vendors",
      recordId: v.id,
    })
  ),

  ...BROKER_PRODUCTS.map((p) =>
    build({
      id: `bp-${p.id}`,
      type: "product",
      title: p.name,
      subtitle: [p.productCode, p.category, p.unit, p.status].join(" · "),
      keywords: [p.erpItemId, p.description],
      moduleKey: "3pl",
      navKey: "3pl-products",
      recordId: p.id,
    })
  ),

  ...RENTAL_ASSETS.map((a) =>
    build({
      id: `br-${a.id}`,
      type: "rental-asset",
      title: a.name,
      subtitle: [a.assetType, a.customer ?? "Not on rent", a.shipTo, a.status]
        .filter(Boolean)
        .join(" · "),
      keywords: [a.serialNumber, a.externalAssetId, a.qrCode, a.city],
      moduleKey: "3pl",
      navKey: "3pl-rental-assets",
      recordId: a.id,
    })
  ),

  /* ── Sales ── */
  ...FUEL_ORDERS.map((o) =>
    build({
      id: `fo-${o.id}`,
      type: "fuel-order",
      title: `#${o.orderNo} · ${o.customer.title}`,
      subtitle: [
        o.type.label,
        o.customer.description,
        `${o.qtyGal.toLocaleString("en-US")} gal`,
        o.status,
        o.driver?.name ?? "Unassigned",
      ].join(" · "),
      keywords: [...o.products.map((p) => p.name), ...o.tags],
      moduleKey: "sales",
      navKey: "sales-orders",
      recordId: o.id,
    })
  ),

  ...ASSET_ORDERS.map((o) =>
    build({
      id: `ao-${o.id}`,
      type: "asset-order",
      title: `#${o.orderNo} · ${o.customer.title}`,
      subtitle: [o.assetType, `Qty ${o.quantity}`, o.salesRep, o.status].join(" · "),
      keywords: [o.serialNo, o.poNumber, o.shipTo, o.customer.description],
      moduleKey: "sales",
      navKey: "sales-orders",
      recordId: o.id,
    })
  ),

  ...SEED_QUOTES.map((q) =>
    build({
      id: `qu-${q.id}`,
      type: "quote",
      title: `${q.quoteNo} · ${q.customer}`,
      subtitle: [q.shipTo, q.market, q.stage].filter(Boolean).join(" · "),
      keywords: [...q.lines.map((l) => l.name), q.email, q.orderNo],
      moduleKey: "sales",
      navKey: "quotes",
      recordId: q.id,
    })
  ),

  ...CUSTOMERS.map((c) =>
    build({
      id: `cu-${c.id}`,
      type: "customer",
      title: c.name,
      subtitle: [
        c.erpId,
        `${c.shipTos.length} ship-to${c.shipTos.length === 1 ? "" : "s"}`,
        c.los.join(", "),
        c.status,
      ].join(" · "),
      keywords: [...c.shipTos, c.contactName, c.billingTerms],
      moduleKey: "sales",
      navKey: "customers",
      recordId: c.id,
    })
  ),

  ...ASSETS.map((a) =>
    build({
      id: `as-${a.id}`,
      type: "asset",
      title: a.displayName,
      subtitle: [
        a.uniqueId,
        a.hub,
        a.los,
        `${a.capacityGal.toLocaleString("en-US")} gal`,
        a.status,
      ].join(" · "),
      keywords: [
        ...a.products,
        a.erpId,
        a.tankMonitor ? `Monitor ${a.tankMonitorId}` : null,
      ],
      moduleKey: "sales",
      navKey: "assets",
      recordId: a.id,
    })
  ),

  /* ── Service Work ── */
  ...SERVICE_ORDERS.map((o) =>
    build({
      id: `so-${o.id}`,
      type: "service-order",
      title: `${o.orderNo} · ${o.customer}`,
      subtitle: [o.workType, o.shipTo, o.status, technicianById(o.technicianId)?.name ?? "Unassigned"]
        .filter(Boolean)
        .join(" · "),
      keywords: [
        ...o.assets.map((a) => a.assetName),
        o.fault,
        `${o.city}, ${o.state}`,
        o.priority === "Normal" ? null : o.priority,
      ],
      moduleKey: "service",
      navKey: "service-orders-dispatch",
      recordId: o.id,
    })
  ),

  ...TECHNICIANS.map((t) =>
    build({
      id: `te-${t.id}`,
      type: "technician",
      title: t.name,
      subtitle: [t.base, t.skills.join(", "), t.active ? "Active" : "Inactive"].join(" · "),
      keywords: [t.phone],
      moduleKey: "service",
      navKey: "service-technicians",
      recordId: t.id,
    })
  ),
];

/** The query as lowercase words. */
export const queryTerms = (query: string): string[] =>
  query.trim().toLowerCase().split(/\s+/).filter(Boolean);

/**
 * Match on every word in the query, in any order and any field — so
 * "morris diesel" finds a Morris order carrying diesel, which a plain substring
 * match would miss. Hits whose title carries a term come first; otherwise the
 * index order holds.
 */
export function searchAll(query: string): SearchEntry[] {
  const terms = queryTerms(query);
  const hits = SEARCH_INDEX.filter((e) => terms.every((t) => e.haystack.includes(t)));
  if (terms.length === 0) return hits;
  const inTitle = (e: SearchEntry) => terms.some((t) => e.title.toLowerCase().includes(t));
  return [...hits.filter(inTitle), ...hits.filter((e) => !inTitle(e))];
}

export interface ScopeCount<K extends string> {
  key: K;
  label: string;
  count: number;
}

/** One count per module with hits, in pill order. */
export function moduleCounts(hits: SearchEntry[]): ScopeCount<SearchModule>[] {
  return SEARCH_MODULES.map((m) => ({
    key: m.key,
    label: m.label,
    count: hits.filter((e) => e.moduleKey === m.key).length,
  })).filter((m) => m.count > 0);
}

/** One count per record type with hits, in pill order. */
export function typeCounts(hits: SearchEntry[]): ScopeCount<SearchType>[] {
  return TYPE_ORDER.map((t) => ({
    key: t,
    label: TYPE_LABEL[t],
    count: hits.filter((e) => e.type === t).length,
  })).filter((t) => t.count > 0);
}

/**
 * The keyword that explains a hit — the first one carrying a term that the
 * title and subtitle do not. `null` when the row already shows why it matched.
 */
export function matchedKeyword(e: SearchEntry, terms: string[]): string | null {
  const shown = `${e.title} ${e.subtitle}`.toLowerCase();
  const missing = terms.filter((t) => !shown.includes(t));
  if (missing.length === 0) return null;
  return e.keywords.find((k) => missing.some((t) => k.toLowerCase().includes(t))) ?? null;
}
