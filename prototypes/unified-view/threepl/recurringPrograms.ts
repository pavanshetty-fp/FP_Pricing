import { DATE_FMT, dateKeyOf, startOfDay } from "../data";
import { CUSTOMERS } from "../customers";
import type { TwoLine } from "../types";
import {
  LOADING_ACCOUNTS,
  SHIP_TO_SITES,
  defaultLineCharges,
  type BrokerOrderType,
  type JobType,
  type OrderLine,
  type ServiceLine,
} from "./orders";
import { parseSchedule, type Schedule, type SeriesStatus } from "./recurring";
import { VENDORS, type Vendor } from "./vendors";

/*
  RECURRING ORDERS — V1.1, THE LANE-FIRST PROGRAMME.

  IT SITS BESIDE V1 AND V2 AND REPLACES NEITHER (Pavan, 2026-09-21).

  THE INVERSION IS THE WHOLE IDEA. V1 is customer-first: pick the customer, then
  find somebody to haul it. Here you pick the PARTNER first, and the only
  customers and ship-tos on offer are the ones that partner can actually reach.
  You are filling a haulier's capacity across a region, not servicing one
  account — and that is a different act, which is why it is its own version
  rather than a switch on V1.

  WHAT THE INVERSION FIXES. Three things break when one rule spans many sites:
  the partner's service area, where product is lifted from, and the price. The
  first is fixed by making the partner the gate — an unreachable site is never
  offered, so a programme cannot be built that the partner cannot run. The
  second is a broker's own judgement and is left free. The third does not fan
  out at all, and that is what the second layer is for.

  TWO LAYERS.

    The programme  what is true of every delivery it will ever make — the
                   partner, where it loads, the product, and the FREQUENCY.
    The targets    a row per ship-to for everything that moves: the tanks and
                   quantities, the window, the contacts, and both prices.

  BOTH PRICES SIT ON THE ROW, SO THE ROW CARRIES THE MARGIN. That makes the
  programme a margin table for a whole book of work — twelve lanes and what
  each one earns, in one grid. It is the thing this version can show that
  neither of the others can.

  FREQUENCY IS CONSTITUTIVE, and this is the sharpest rule here. A site that
  wants a different day is not on this programme; it belongs to another one.
  No per-site override, ever. Two things follow, and both are worth having:
  a programme DESCRIBES ITSELF — partner · product · frequency, and you can
  read it from its title without opening it — and putting one ship-to on two
  programmes for the same product becomes a collision worth catching at the
  moment somebody adds it, rather than when two trucks turn up.

  A TARGET IS A SHIP-TO, NOT AN ASSET. A truck filling three tanks at one site
  is one order, not three. So the unit is the site, assets are lines inside it,
  and the grid stays two-dimensional — targets down, dates across.

  INVENTED, and flagged: the programme numbers, the lane prices, which lanes
  have been accepted, and which sites have fallen out of coverage.
*/

/* ---------------------------------------------------------------------------
 * Coverage — the gate
 * ------------------------------------------------------------------------ */

export interface ShipToSite {
  name: string;
  city: string;
  state: string;
  zip: string;
  assets: { name: string; product: string; rental?: boolean }[];
}

/**
 * CAN THIS PARTNER REACH THIS SITE?
 *
 * Read off the partner's own service area, in the terms that area is declared
 * in — a zip list is not a state list and treating them alike would offer a
 * site the partner has never heard of. `radius` and `custom` have no geometry
 * in this fixture, so they fall back to the states, which is the honest
 * approximation: it is the widest thing the record actually says.
 */
export function canServe(v: Vendor, site: ShipToSite): boolean {
  if (!v.active || !v.approvedForAssignment) return false;
  switch (v.serviceAreaType) {
    case "zip":
      return v.coveredZips.includes(site.zip);
    case "state":
      return v.serviceStates.includes(site.state);
    default:
      return (
        v.coveredCities.includes(site.city) ||
        v.serviceStates.includes(site.state)
      );
  }
}

export const siteByName = (name: string): ShipToSite | undefined =>
  SHIP_TO_SITES.find((s) => s.name === name) as ShipToSite | undefined;

/** Every customer + ship-to pair this partner could be given. */
export function reachableTargets(
  v: Vendor
): { customer: TwoLine; shipTo: string; site: ShipToSite }[] {
  const out: { customer: TwoLine; shipTo: string; site: ShipToSite }[] = [];
  for (const c of CUSTOMERS) {
    for (const name of c.shipTos) {
      const site = siteByName(name);
      if (!site || !canServe(v, site)) continue;
      out.push({
        customer: { title: c.name, description: c.erpId },
        shipTo: name,
        site,
      });
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * A target — one ship-to on the programme
 * ------------------------------------------------------------------------ */

/**
 * WHERE A LANE HAS GOT TO WITH THE PARTNER.
 *
 * One partner, many lanes, priced per lane — so acceptance happens per lane,
 * and a programme can be PARTLY LIVE. Eight sites delivering while four are
 * still being argued over is the ordinary case, not an edge one, and it is the
 * state the screen exists to show.
 */
export type LaneState = "Draft" | "Invited" | "Quoted" | "Accepted" | "Declined";

export const LANE_STATES: LaneState[] = [
  "Draft",
  "Invited",
  "Quoted",
  "Accepted",
  "Declined",
];

/** Only an accepted lane generates anything. */
export const laneIsLive = (s: LaneState) => s === "Accepted";

export interface ProgramTarget {
  id: string;
  customer: TwoLine;
  shipTo: string;
  city: string;
  state: string;
  /** The tanks at this site the programme fills, with what each takes. */
  lines: OrderLine[];
  /** This site's own window. You cannot be at thirty sites at eight o'clock. */
  window: { start: string; end: string };
  poc: string;
  instructions: string;
  poNumber: string;
  /** What the partner charges for THIS lane. Null until they have priced it. */
  vendorPrice: number | null;
  /** What this customer is billed. Their contract, not the programme's. */
  customerPrice: number | null;
  state_: LaneState;
  /**
   * COVERAGE IS NOT STATIC. A partner's area changes, they go inactive, their
   * compliance lapses — and a site that qualified when the programme was built
   * can stop qualifying. Quiet until the day it matters, which is why it is
   * stored rather than recomputed only at the picker.
   */
  serviceable: boolean;
}

/* ---------------------------------------------------------------------------
 * The programme
 * ------------------------------------------------------------------------ */

export interface RecurringProgram {
  id: string;
  /** `P-2140`. Not an order number and not a rule number — its own series. */
  programNo: string;
  createdAt: string;

  /* ── who runs it ── */
  /**
   * BROKERAGE OR OUR OWN FLEET. On `Transportation` there is no partner and
   * no gate: we are the haulier, so reaching a site is our problem rather
   * than a constraint on which sites may be on the programme.
   */
  jobType: JobType;

  /* ── the gate, on brokerage only ── */
  /**
   * EVERY PARTNER THE RULE'S LANES GO OUT TO. Usually one; a rule put out to
   * several is offered to all of them, and the sites it can cover are the
   * union of their service areas rather than the overlap.
   */
  vendorIds: string[];

  /* ── where it loads. A broker's judgement, not a constraint. ── */
  loadOrder: boolean;
  /**
   * A ROW PER LOADING ACCOUNT. One number normally carries the whole load, so
   * a row holds as many of the rule's products as its account can take; a
   * second row exists only when something has to load somewhere else.
   */
  loadRows: {
    products: string[];
    terminal: string;
    supplier: string;
    loadingAccount: string;
  }[];

  /* ── what goes on the truck ── */
  /** One rule can carry several. The tanks offered per site follow these. */
  products: string[];
  /** Which of those products the rule delivers as a winter blend. */
  winterProducts: string[];
  serviceLine: ServiceLine;
  business: string | null;
  orderType: BrokerOrderType;
  signatureOnDelivery: boolean;

  /* ── when. CONSTITUTIVE — no target may override it. ── */
  schedule: Schedule;
  startKey: string;
  endKey: string | null;

  tags: string[];
  internalNote: string;

  targets: ProgramTarget[];
  status: SeriesStatus;
}

/** The partners on a programme, in the order they were picked. */
export const programVendors = (p: RecurringProgram) =>
  p.vendorIds
    .map((id) => VENDORS.find((v) => v.id === id))
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

/**
 * ONE NAME AND A COUNT. A cell wide enough for three partner names is a cell
 * that fits nothing else, and the first one picked is the one a reader is
 * looking for.
 */
export function programPartnerLabel(p: RecurringProgram): string {
  const names = programVendors(p).map((v) => v.name);
  if (names.length === 0) return "No partner";
  return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
}

/** Partner · product · frequency — a programme read without opening it. */
export function programTitle(p: RecurringProgram): string {
  return `${programPartnerLabel(p)} · ${p.products.join(" + ")} · ${p.schedule.label}`;
}

export const liveTargets = (p: RecurringProgram) =>
  p.targets.filter((t) => laneIsLive(t.state_) && t.serviceable);

export const waitingTargets = (p: RecurringProgram) =>
  p.targets.filter((t) => !laneIsLive(t.state_) || !t.serviceable);

/** What the whole programme costs and earns on ONE run of the live lanes. */
export function programMoney(p: RecurringProgram) {
  const live = liveTargets(p);
  const cost = live.reduce((s, t) => s + (t.vendorPrice ?? 0), 0);
  const revenue = live.reduce((s, t) => s + (t.customerPrice ?? 0), 0);
  return { cost, revenue, margin: revenue - cost };
}

/** Gallons per run across the live lanes. Top-offs contribute nothing. */
export function programGallons(p: RecurringProgram): number {
  return liveTargets(p).reduce(
    (s, t) => s + t.lines.reduce((a, l) => a + (l.topOff ? 0 : (l.gal ?? 0)), 0),
    0
  );
}

/**
 * ALREADY ON ANOTHER PROGRAMME FOR THE SAME PRODUCT.
 *
 * The collision that `frequency is constitutive` makes checkable: two
 * programmes covering one site with one product will send two trucks, and the
 * only moment anybody can be told cheaply is while they are adding the site.
 */
export function clashFor(
  shipTo: string,
  products: string[],
  exceptProgramId: string,
  all: RecurringProgram[]
): RecurringProgram | null {
  return (
    all.find(
      (p) =>
        p.id !== exceptProgramId &&
        p.products.some((x) => products.includes(x)) &&
        p.status !== "Cancelled" &&
        p.targets.some((t) => t.shipTo === shipTo)
    ) ?? null
  );
}

/* ---------------------------------------------------------------------------
 * The seed
 * ------------------------------------------------------------------------ */

const WINDOWS = [
  { start: "6:00 AM", end: "10:00 AM" },
  { start: "8:00 AM", end: "12:00 PM" },
  { start: "10:00 AM", end: "2:00 PM" },
  { start: "1:00 PM", end: "5:00 PM" },
];

const POCS = [
  "Ray Obuya",
  "Colleen Marsh",
  "Marisol Vega",
  "Dwight Feeney",
  "Anita Kaur",
  "Tom Alvarez",
];

const INSTRUCTIONS = [
  "Gate code 4471. Call ahead.",
  "Deliver to the rear tank only.",
  "Yard closes at 4pm sharp.",
  "",
  "Weighbridge on the left as you enter.",
  "",
];

/** Which frequencies a programme may run on — no `Custom`, it has no meaning
 *  across a book of sites. */
const PROGRAM_FREQUENCIES = [
  "Weekly On Tuesday",
  "Every Weekday (Monday To Friday)",
  "Monthly On First Thursday",
  "Weekly On Thursday",
];

const PROGRAM_PRODUCTS = [
  "Clear Diesel #2",
  "Dyed Diesel",
  "Unleaded 87",
  "Engine Oil 15W-40",
];

/** Deterministic pseudo-random, so the fixture is the same every load. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const RECURRING_PROGRAMS: RecurringProgram[] = (() => {
  const pick = rng(20260921);
  const today = startOfDay(new Date());
  const todayKey = dateKeyOf(today);
  const out: RecurringProgram[] = [];

  /* Only partners who can actually reach somewhere. A programme built on a
     partner with no reachable site would be a screen demonstrating nothing. */
  const usable = VENDORS.filter(
    (v) => v.active && v.approvedForAssignment && reachableTargets(v).length >= 4
  ).slice(0, 7);

  usable.forEach((v, i) => {
    const product = PROGRAM_PRODUCTS[i % PROGRAM_PRODUCTS.length];
    const account =
      LOADING_ACCOUNTS.find((a) => a.products.includes(product)) ??
      LOADING_ACCOUNTS[0];
    const raw = PROGRAM_FREQUENCIES[i % PROGRAM_FREQUENCIES.length];

    /* THE START IS IN THE PAST FOR MOST — a programme nobody has run yet
       teaches nothing about a screen whose whole job is showing a book of
       work in flight. */
    const start = new Date(today);
    start.setDate(start.getDate() - (i % 3) * 21);
    const startKey = dateKeyOf(start);
    const schedule = parseSchedule(raw, startKey);

    const reach = reachableTargets(v);
    /* Between three and seven sites, AND NEVER ALL OF THEM. A programme that
       has already consumed every site its partner can reach makes Add ship-to
       permanently empty — which hides the one thing this version exists to
       show. Two lanes of headroom is what makes the gate demonstrable. */
    const count = Math.max(
      2,
      Math.min(reach.length - 1, 3 + Math.floor(pick() * 4))
    );

    const targets: ProgramTarget[] = reach.slice(0, count).map((r, k) => {
      /* The tanks AT that site that take this product. A site with none is
         still a legitimate target — it takes the product into a bulk tank —
         so it falls back to one unnamed line rather than being dropped. */
      const tanks = r.site.assets.filter((a) => a.product === product);
      const lines: OrderLine[] =
        tanks.length > 0
          ? tanks.slice(0, 2).map((a, n) => ({
              asset: a.name,
              product,
              /* TOP-OFF IS THE PORTABLE QUANTITY. "Fill it" travels across a
                 book of sites; a number belongs to one tank. Most lanes top
                 off; some name a figure. */
              gal: n === 0 && k % 3 === 0 ? 500 + ((k * 137) % 900) : null,
              topOff: !(n === 0 && k % 3 === 0),
              rental: a.rental,
              charges: defaultLineCharges(),
            }))
          : [
              {
                asset: "Bulk tank",
                product,
                gal: null,
                topOff: true,
                charges: defaultLineCharges(),
              },
            ];

      /* ACCEPTANCE IS A MATRIX. Most lanes are away; a few are still being
         argued over and one has said no — which is the partly-live state the
         version exists to show. */
      const laneState: LaneState =
        k % 7 === 5
          ? "Declined"
          : k % 5 === 3
            ? "Quoted"
            : k % 5 === 4
              ? "Invited"
              : "Accepted";

      const gal = lines.reduce((s, l) => s + (l.gal ?? 900), 0);
      const priced = laneState === "Accepted" || laneState === "Quoted";

      return {
        id: `${v.id}-t${k}`,
        customer: r.customer,
        shipTo: r.shipTo,
        city: r.site.city,
        state: r.site.state,
        lines,
        window: WINDOWS[(i + k) % WINDOWS.length],
        poc: POCS[(i + k) % POCS.length],
        instructions: INSTRUCTIONS[(i + k) % INSTRUCTIONS.length],
        poNumber: k % 4 === 0 ? `PO-${81_000 + i * 40 + k}` : "",
        vendorPrice: priced ? Number((gal * (0.29 + pick() * 0.1)).toFixed(2)) : null,
        customerPrice: priced ? Number((gal * (0.38 + pick() * 0.1)).toFixed(2)) : null,
        state_: laneState,
        /* One site in the book has fallen out of the partner's area since the
           programme was built. It is the case nobody designs for. */
        serviceable: !(i === 1 && k === 2),
      };
    });

    out.push({
      id: `prog-${i}`,
      programNo: `P-${2140 + i * 7}`,
      createdAt: new Date(
        start.getTime() - (3 + i) * 86_400_000
      ).toISOString(),
      jobType: "Brokerage",
      vendorIds: [v.id],
      loadOrder: i % 3 !== 2,
      loadRows:
        i % 3 !== 2
          ? [
              {
                products: [product],
                terminal: account.terminal,
                supplier: account.supplier,
                loadingAccount: account.name,
              },
            ]
          : [],
      products: [product],
      winterProducts: product.includes("Diesel") && i % 4 === 0 ? [product] : [],
      serviceLine:
        product === "Engine Oil 15W-40" ? "Lubricants" : "Fuel",
      business:
        product === "Engine Oil 15W-40" ? "Packaged Goods" : "Transport",
      orderType: "Core",
      signatureOnDelivery: i % 2 === 0,
      schedule,
      startKey,
      endKey: null,
      tags: i % 3 === 0 ? ["Contracted"] : [],
      internalNote: "",
      status: startKey > todayKey ? "Upcoming" : i === 4 ? "Paused" : "Active",
      targets,
    });
  });

  return out;
})();

/** Free-text across everything a programme is findable by. */
export function matchesProgram(p: RecurringProgram, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [
    p.programNo,
    programTitle(p),
    ...p.loadRows.map((l) => `${l.terminal} ${l.supplier} ${l.loadingAccount}`),
    ...p.targets.map((t) => `${t.customer.title} ${t.shipTo} ${t.city}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

/** The next few dates this programme will cut orders on. */
export function nextDates(p: RecurringProgram, n = 5): string[] {
  const today = startOfDay(new Date());
  const out: string[] = [];
  const d = new Date(today);
  for (let i = 0; i < 400 && out.length < n; i++) {
    if (p.schedule.hits(d) && dateKeyOf(d) >= p.startKey) out.push(dateKeyOf(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export const fmtKey = (key: string) =>
  DATE_FMT.format(new Date(`${key}T00:00:00`));

/** One money format across the programme screens. */
/** Re-exported so the programme screens keep one import. One helper, app-wide. */
export { MONEY } from "../data";
