/*
  The cross-references between the four Directory entities.

  WHY A SEPARATE FILE. `orders.ts` imports from `vendors.ts` (the picker needs
  carriers) and `directory.ts` imports from `orders.ts` (products and ship-tos
  are the ones orders actually name). A vendor pointing at a product would close
  that loop, so the links are made HERE, by a module that imports everything and
  is imported by nothing except the screens.

  It runs once, on first import, and mutates the seed records in place. That is
  the same thing a backend join would do, minus the join.
*/
import {
  BROKER_CUSTOMERS,
  BROKER_PRODUCTS,
  RENTAL_ASSETS,
  SHIP_TO_LOCATIONS,
  type BrokerCustomer,
  type BrokerProduct,
  type RentalAsset,
} from "./directory";
import { BROKER_ORDERS } from "./orders";
import {
  VENDORS,
  setAssignedOrderCounts,
  type Vendor,
} from "./vendors";
import { intBetween, rng, someOf } from "./directoryCore";

let linked = false;

function link(): void {
  if (linked) return;
  linked = true;

  /* ── which products a vendor can actually haul ──────────────────────────
     Derived from the vendor's BUSINESS LINES rather than drawn at random: a
     carrier that runs Bulk Fuel and nothing else must not turn up as capable
     of a lube drum, because the order sheet filters on exactly this. */
  const byCategory = {
    Fuel: BROKER_PRODUCTS.filter((p) => p.category === "Fuel").map((p) => p.id),
    DEF: BROKER_PRODUCTS.filter((p) => p.category === "DEF").map((p) => p.id),
    Lubricant: BROKER_PRODUCTS.filter((p) => p.category === "Lubricant").map((p) => p.id),
    Additive: BROKER_PRODUCTS.filter((p) => p.category === "Additive").map((p) => p.id),
    Service: BROKER_PRODUCTS.filter((p) => p.category === "Service").map((p) => p.id),
  };

  VENDORS.forEach((v, i) => {
    const r = rng(21_000 + i);
    const pool = new Set<string>();
    if (v.businessLines.includes("Bulk Fuel")) byCategory.Fuel.forEach((id) => pool.add(id));
    if (v.businessLines.includes("DEF")) byCategory.DEF.forEach((id) => pool.add(id));
    if (v.businessLines.includes("Packaged Lubes")) {
      byCategory.Lubricant.forEach((id) => pool.add(id));
      byCategory.Additive.forEach((id) => pool.add(id));
    }
    if (v.businessLines.includes("Emergency Response")) byCategory.Service.forEach((id) => pool.add(id));

    /* Not everything in the pool — a carrier runs a subset of what its line
       covers, and "supports 6 of 17 fuels" is the fact the picker needs. */
    const all = [...pool];
    v.supportedProductIds =
      all.length === 0 ? [] : someOf(r, all, Math.max(2, Math.round(all.length * 0.6)));
    v.preferredCustomerIds =
      r() < 0.3 ? someOf(r, BROKER_CUSTOMERS.map((c) => c.id), 4) : [];
  });

  /* ── which vendors can supply a product — the same fact, read the other way ── */
  const supports = new Map<string, string[]>();
  VENDORS.forEach((v) => {
    v.supportedProductIds.forEach((pid) => {
      const list = supports.get(pid) ?? [];
      list.push(v.id);
      supports.set(pid, list);
    });
  });
  BROKER_PRODUCTS.forEach((p, i) => {
    const r = rng(22_000 + i);
    p.availableVendorIds = supports.get(p.id) ?? [];
    p.defaultVendorIds =
      p.availableVendorIds.length > 0 ? someOf(r, p.availableVendorIds, 2) : [];
  });

  /* ── the vendor a customer prefers, and the vendor servicing an asset ── */
  BROKER_CUSTOMERS.forEach((c, i) => {
    const r = rng(23_000 + i);
    if (r() < 0.35) {
      const eligible = VENDORS.filter((v) => v.active && v.serviceStates.length > 0);
      c.preferredVendorId = eligible[intBetween(r, 0, eligible.length - 1)]?.id ?? null;
    }
  });

  RENTAL_ASSETS.forEach((a, i) => {
    const r = rng(24_000 + i);
    if (r() < 0.55) {
      const movers = VENDORS.filter((v) => v.assetHandlingCapable && v.active);
      a.assignedVendorId = movers[intBetween(r, 0, movers.length - 1)]?.id ?? null;
    }
  });

  /* ── live order counts, so the Vendors list can carry a real column ── */
  const LIVE = new Set(["Quoting", "Assigned", "Completed", "Review", "Verified", "Partially Synced"]);
  const counts: Record<string, number> = {};
  BROKER_ORDERS.forEach((o) => {
    if (!LIVE.has(o.status)) return;
    const ids = new Set<string>([
      ...(o.vendorId ? [o.vendorId] : []),
      ...o.acceptedVendorIds,
      ...o.invitedVendorIds,
    ]);
    ids.forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
  });
  setAssignedOrderCounts(counts);
}

link();

/* ── lookups the screens use ─────────────────────────────────────────────── */

export const customerById = (id: string | null): BrokerCustomer | null =>
  id ? BROKER_CUSTOMERS.find((c) => c.id === id) ?? null : null;

export const productById = (id: string | null): BrokerProduct | null =>
  id ? BROKER_PRODUCTS.find((p) => p.id === id) ?? null : null;

export const assetById = (id: string | null): RentalAsset | null =>
  id ? RENTAL_ASSETS.find((a) => a.id === id) ?? null : null;

export const shipToById = (id: string | null) =>
  id ? SHIP_TO_LOCATIONS.find((s) => s.id === id) ?? null : null;

/** Orders placed by this account, newest first. Drives the detail page's tab. */
export const ordersForCustomer = (name: string) =>
  BROKER_ORDERS.filter((o) => o.customer.title === name);

/** Everything this vendor is on, live or done. */
export const ordersForVendor = (vendorId: string) =>
  BROKER_ORDERS.filter(
    (o) =>
      o.vendorId === vendorId ||
      o.acceptedVendorIds.includes(vendorId) ||
      o.invitedVendorIds.includes(vendorId)
  );

/** Orders whose lines name this product. */
export const ordersForProduct = (productName: string) =>
  BROKER_ORDERS.filter((o) => o.lines.some((l) => l.product === productName));

/** Orders whose lines name this asset. */
export const ordersForAsset = (assetName: string) =>
  BROKER_ORDERS.filter((o) => o.lines.some((l) => l.asset === assetName));

/** Assets out at this account right now. */
export const assetsForCustomer = (customerId: string): RentalAsset[] =>
  RENTAL_ASSETS.filter((a) => a.customerId === customerId);

/** Ship-tos belonging to this account. */
export const shipTosForCustomer = (customerId: string) =>
  SHIP_TO_LOCATIONS.filter((s) => s.customerId === customerId);

/** Vendors that can supply this product AND are assignable today. */
export const vendorsForProduct = (p: BrokerProduct): Vendor[] =>
  VENDORS.filter((v) => p.availableVendorIds.includes(v.id));
