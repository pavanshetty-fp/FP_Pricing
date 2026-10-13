import * as React from "react";
import {
  DELIVERED,
  LIVE,
  PORTAL_ACTOR,
  SHIP_TOS,
  allRequests,
  categoryOf,
  renameShipToInRequests,
  type ActiveStatus,
  type Asset,
  type ShipTo,
} from "./orders";

/*
  THE SITES STORE (Pavan, 2026-10-13) — ship-tos and assets, kept by the
  customer with no approval step. It edits `SHIP_TOS` in place, so the order
  sheet and the map read new records at once, and hands React a new snapshot
  on every change. The setter writes the activity log.
*/

let snapshot: ShipTo[] = [...SHIP_TOS];
const listeners = new Set<() => void>();
const emit = () => {
  snapshot = [...SHIP_TOS];
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useShipTos(): ShipTo[] {
  return React.useSyncExternalStore(subscribe, () => snapshot);
}

const log = (audit: ShipTo["audit"], change: string) => [
  ...(audit ?? []),
  { at: new Date().toISOString(), by: PORTAL_ACTOR, changes: [change] },
];

let seq = 0;
const newId = (p: string) => `${p}-new-${Date.now().toString(36)}-${++seq}`;

export type AssetDraft = Omit<Asset, "id" | "audit" | "level"> & { id?: string };
export type ShipToDraft = Omit<ShipTo, "id" | "audit" | "assets"> & { assets: AssetDraft[] };

/* ONE PRODUCT LIST — `product` is its first (what an order line starts
   from); categories left empty follow the products chosen. */
const toAsset = (d: AssetDraft, keep?: Asset): Asset => ({
  ...d,
  product: d.products[0] ?? "",
  categories: d.categories.length
    ? d.categories
    : Array.from(new Set(d.products.map(categoryOf).filter(Boolean))),
  id: d.id ?? newId("as"),
  level: keep?.level ?? 0,
  audit: keep?.audit ?? [{ at: new Date().toISOString(), by: PORTAL_ACTOR, changes: ["Asset added"] }],
});

export function blankAsset(): AssetDraft {
  return {
    name: "",
    code: "",
    rfid: "",
    erpId: "",
    type: "",
    categories: [],
    products: [],
    product: "",
    capacity: 0,
    rented: false,
    monitor: false,
    monitorId: "",
    lat: null,
    lng: null,
    status: "Active",
    notes: "",
  };
}

export function blankShipTo(): ShipToDraft {
  return {
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    lat: NaN,
    lng: NaN,
    contactName: "",
    contactPhone: "",
    hoursStart: 6 * 60,
    hoursEnd: 18 * 60,
    accessNotes: "",
    geofence: null,
    status: "Active",
    assets: [],
  };
}

export function createShipTo(d: ShipToDraft): ShipTo {
  const at = new Date().toISOString();
  const s: ShipTo = {
    ...d,
    id: newId("st"),
    assets: d.assets.map((a) => toAsset(a)),
    audit: [{ at, by: PORTAL_ACTOR, changes: ["Ship-to created"] }],
  };
  SHIP_TOS.unshift(s);
  emit();
  return s;
}

/** Write a ship-to's draft — its assets too: new rows are added, gone ones removed. */
export function updateShipTo(id: string, d: ShipToDraft, change?: string) {
  const i = SHIP_TOS.findIndex((s) => s.id === id);
  if (i < 0) return;
  const prev = SHIP_TOS[i];
  renameShipToInRequests(prev.name, d.name);
  SHIP_TOS[i] = {
    ...prev,
    ...d,
    assets: d.assets.map((a) => toAsset(a, prev.assets.find((x) => x.id === a.id))),
    audit: change ? log(prev.audit, change) : prev.audit,
  };
  emit();
}

export function createAsset(shipToId: string, d: AssetDraft): Asset {
  const s = SHIP_TOS.find((x) => x.id === shipToId);
  const a = toAsset(d);
  s?.assets.unshift(a);
  emit();
  return a;
}

/** Write an asset; a new ship-to moves it there. */
export function updateAsset(id: string, shipToId: string, d: AssetDraft, change?: string) {
  const from = SHIP_TOS.find((s) => s.assets.some((a) => a.id === id));
  const prev = from?.assets.find((a) => a.id === id);
  if (!from || !prev) return;
  const next: Asset = { ...prev, ...d, product: d.products[0] ?? "", id, audit: change ? log(prev.audit, change) : prev.audit };
  if (from.id === shipToId) {
    from.assets = from.assets.map((a) => (a.id === id ? next : a));
  } else {
    from.assets = from.assets.filter((a) => a.id !== id);
    SHIP_TOS.find((s) => s.id === shipToId)?.assets.unshift(next);
  }
  emit();
}

export function setShipToStatus(id: string, status: ActiveStatus) {
  const s = SHIP_TOS.find((x) => x.id === id);
  if (!s) return;
  s.status = status;
  s.audit = log(s.audit, status === "Active" ? "Reactivated" : "Deactivated");
  emit();
}

export function setAssetStatus(id: string, status: ActiveStatus) {
  const s = SHIP_TOS.find((x) => x.assets.some((a) => a.id === id));
  if (!s) return;
  s.assets = s.assets.map((a) =>
    a.id === id ? { ...a, status, audit: log(a.audit, status === "Active" ? "Reactivated" : "Deactivated") } : a
  );
  emit();
}

/** Requests still on their way to this asset — they block deactivating it. */
export function openOrdersForAsset(id: string): number {
  return allRequests().filter(
    (r) =>
      LIVE.includes(r.status) && !DELIVERED.includes(r.status) && r.lines.some((l) => l.assetId === id)
  ).length;
}

/** The same, for a ship-to. */
export function openOrdersForShipTo(name: string): number {
  return allRequests().filter(
    (r) => LIVE.includes(r.status) && !DELIVERED.includes(r.status) && r.shipTo === name
  ).length;
}

/** The last request delivered to this asset, if any. */
export function lastDeliveryFor(id: string): string | null {
  const d = allRequests()
    .filter((r) => DELIVERED.includes(r.status) && r.lines.some((l) => l.assetId === id) && r.date)
    .map((r) => r.date)
    .sort();
  return d.length ? d[d.length - 1] : null;
}

/** Who added the asset, and when — its first log entry. */
export function createdOf(a: Asset): { by: string; at: string } | null {
  const e = a.audit?.[0];
  return e ? { by: e.by, at: e.at } : null;
}
