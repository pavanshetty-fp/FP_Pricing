import type { Asset } from "../../customer-portal/orders";

/*
  TANK MONITORS ON 3PL SITE ASSETS (Pavan, 2026-10-20) — the readings the
  portal's tanks carry (level, battery, daily use), so a 3PL Delivery Order
  shows the same tank columns and suggests the same quantity. INVENTED and
  deterministic: seeded from the site and asset name, so a tank reads the
  same every time. Most tanks wear a monitor; a few don't, and show dashes.
*/

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A tank's size from its name — "LP Tank 500" is 500 gal; a tote, a skid, a rack by kind. */
function capacityOf(name: string, r: () => number): number {
  const n = /(\d{3,5})\s*$/.exec(name);
  if (/LP|Propane/i.test(name) && n) return Number(n[1]);
  if (/Tote/i.test(name)) return 330;
  if (/Skid/i.test(name)) return 120;
  if (/Drum|Rack/i.test(name)) return 220;
  if (/Pail|Case|Jug/i.test(name)) return 50;
  return [500, 1000, 1000, 2000, 3000][Math.floor(r() * 5)];
}

const cache = new Map<string, Asset>();

/** The tank at a ship-to, with its monitor's last reading. */
export function siteTank(
  shipTo: string,
  assetName: string,
  product: string,
  rental = false,
  /** Pinned by the site's asset list; unset, the seeded draw decides. */
  pinnedMonitor?: boolean
): Asset {
  const key = `${shipTo}::${assetName}`;
  const hit = cache.get(key);
  if (hit) return { ...hit, product, products: [product] };
  const r = rng(hash(key));
  const capacity = capacityOf(assetName, r);
  const drawn = r() < 0.9;
  const monitor = pinnedMonitor ?? drawn;
  const tank: Asset = {
    id: `3pl:${key}`,
    name: assetName,
    code: "",
    rfid: "",
    erpId: "",
    type: "Tank",
    categories: [],
    products: [product],
    product,
    capacity,
    rented: rental,
    monitor,
    monitorId: monitor ? `TM-${(hash(key) % 90000) + 10000}` : "",
    level: monitor ? Math.round(5 + r() * 90) : 0,
    battery: monitor ? Math.round(5 + r() * 95) : 0,
    dailyUse: monitor ? Math.max(1, Math.round(capacity * (0.02 + r() * 0.06))) : 0,
    lat: null,
    lng: null,
    status: "Active",
    notes: "",
  };
  cache.set(key, tank);
  return tank;
}
