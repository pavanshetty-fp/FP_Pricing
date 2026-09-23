import { RENTAL_ASSETS, type RentalAsset } from "../threepl/directory";
import type { StatusTone } from "@/components/ui/status-chip";
import type { CodeDiscTone } from "@/components/ui/code-disc";
import type { LaneColor } from "../threepl/BrokerBoard";

/*
  SERVICE WORK — the model, the fixture and the invariants.

  WHAT THIS MODULE IS. Everything this business puts out on rent — tanks,
  pumps, monitors, nozzles — breaks, drifts out of spec, or needs swapping.
  A SERVICE ORDER is one job on one deployed asset: somebody reports it, a
  dispatcher books it, a technician does it, a manager signs it off, and it is
  billed. The asset is the subject, because the history hangs off the asset.

  THE MONEY RULE, WHICH IS THE SHARP EDGE OF THE WHOLE MODULE.

    A QUOTE is parts + the predefined fee, and it is sent and approved on site
    BEFORE the work starts. It cannot contain labour or mileage, because at the
    moment it is sent nobody knows how long the job took or how far the van
    went.

    AN INVOICE is raised AFTER the job and may be bigger: actual labour hours,
    mileage, and any extra parts the technician turned out to need. The gap
    between the two is not an error — it is the thing the customer has to be
    able to see, so both figures stay on the record.

  INVENTED, and flagged: the technicians, the fault text, the labour hours, the
  parts and their costs, the rates. Customers, ship-tos and assets are REUSED
  from the existing rental directory, because a tank being serviced is the tank
  on the rental list, not a second copy of it.
*/

/* ------------------------------------------------------------ the stages */

/**
 * EIGHT STAGES, and each is a different answer to "what is this job waiting
 * on".
 *
 *   Open            nobody is on it
 *   Assigned        a technician is, but they have not arrived
 *   In progress     they have arrived and are working
 *   Parts-pending   they stopped, and it is a part that stopped them
 *   Needs approval  the work is recorded and a manager has not signed it
 *   Approved        signed off; the invoice exists
 *   Completed       the invoice reached accounting and the job is closed
 *   Cancelled       it is not happening
 *
 * OPEN AND ASSIGNED ARE TWO FACTS, NOT ONE. A job nobody is on and a job
 * somebody is on but has not started are different problems, and the gap
 * between them is the dispatcher's backlog.
 *
 * APPROVED AND COMPLETED ARE TWO FACTS TOO. Approved says a human agreed the
 * numbers; Completed says the money left the building. An invoice that has
 * been raised and an invoice that has landed in accounting are not the same
 * state, and only the second one means nobody has to look at this again.
 */
export type WorkStatus =
  | "Open"
  | "Assigned"
  | "In progress"
  | "Parts-pending"
  | "Needs approval"
  | "Approved"
  | "Completed"
  | "Cancelled";

export const WORK_STATUSES: WorkStatus[] = [
  "Open",
  "Assigned",
  "In progress",
  "Parts-pending",
  "Needs approval",
  "Approved",
  "Completed",
  "Cancelled",
];

/** Past this, the visit has happened and what is left is money. */
export function isRecorded(s: WorkStatus): boolean {
  return s === "Needs approval" || s === "Approved" || s === "Completed";
}

/** The technician can still act on it. */
export function isWorkable(s: WorkStatus): boolean {
  return s === "Assigned" || s === "In progress" || s === "Parts-pending";
}

/**
 * THE DS SHIPS FOUR TONE CHANNELS and this lifecycle has eight stages, so some
 * of them share. The DS's own rule is that colour is never the only carrier of
 * meaning — the label always says which — so sharing is honest where two
 * stages are the same KIND of state. The lane colours below do the separating.
 */
export const WORK_STATUS_TONE: Record<WorkStatus, StatusTone> = {
  Open: "neutral",
  Assigned: "processing",
  "In progress": "processing",
  /* THE ONLY STAGE WHERE SOMETHING HAS GONE WRONG, and the only one that
     carries a reason. */
  "Parts-pending": "failed",
  "Needs approval": "processing",
  Approved: "success",
  Completed: "success",
  Cancelled: "neutral",
};

/** Lane order on the board. Cancelled sits behind a rule — it is not a step. */
export const WORK_LANES: {
  key: string;
  statuses: WorkStatus[];
  apart?: boolean;
}[] = [
  { key: "Open", statuses: ["Open"] },
  { key: "Assigned", statuses: ["Assigned"] },
  { key: "In progress", statuses: ["In progress"] },
  { key: "Parts-pending", statuses: ["Parts-pending"] },
  { key: "Needs approval", statuses: ["Needs approval"] },
  { key: "Approved", statuses: ["Approved"] },
  { key: "Completed", statuses: ["Completed"] },
  { key: "Cancelled", statuses: ["Cancelled"], apart: true },
];

/** The DS's `--fp-lane-*` set, the same tokens the 3PL board draws from. */
export const WORK_LANE_COLOR: Record<WorkStatus, LaneColor> = {
  Open: "grey",
  Assigned: "blue",
  "In progress": "cyan",
  "Parts-pending": "yellow",
  "Needs approval": "violet",
  Approved: "green",
  Completed: "purple",
  Cancelled: "red",
};

/* ------------------------------------------------------- what and how much */

/**
 * WHERE THE JOB CAME FROM. It is on the record because it is the one fact
 * about a job that nobody can reconstruct afterwards, and because the mix of
 * sources is how a service desk knows whether the portal is worth having.
 */
export const INTAKE_SOURCES = [
  "Customer call",
  "Sales rep",
  "Flagged inspection",
] as const;
/** Offered only when the portal switch is on — see `settings.ts`. */
export const PORTAL_SOURCE = "Portal request";
export type IntakeSource = (typeof INTAKE_SOURCES)[number] | typeof PORTAL_SOURCE;

export interface PartLine {
  name: string;
  qty: number;
  /** Per unit. */
  cost: number;
}

export interface FeeLine {
  name: string;
  amount: number;
}

/**
 * THE PRICE BOOK. A work type is not just a label: it is the parts the job
 * usually needs and the fee it usually carries. With the price book off, both
 * are typed by hand and the work type is only a name.
 */
export const WORK_TYPES: Record<
  string,
  { parts: PartLine[]; fees: FeeLine[] }
> = {
  "Leak check": { parts: [], fees: [{ name: "Service call fee", amount: 100 }] },
  "Hose swap": {
    parts: [{ name: 'Hose 1"', qty: 1, cost: 38 }],
    fees: [{ name: "Service call fee", amount: 100 }],
  },
  "Pump replace": {
    parts: [{ name: "Pump assembly", qty: 1, cost: 320 }],
    fees: [{ name: "Service call fee", amount: 150 }],
  },
  "Nozzle replace": {
    parts: [{ name: "Nozzle", qty: 1, cost: 55 }],
    fees: [{ name: "Service call fee", amount: 100 }],
  },
  "Monitor install": {
    parts: [{ name: "Level monitor", qty: 1, cost: 210 }],
    fees: [{ name: "Service call fee", amount: 120 }],
  },
  "Tank swap": { parts: [], fees: [{ name: "Service call fee", amount: 250 }] },
};

export const WORK_TYPE_NAMES = Object.keys(WORK_TYPES);

/** The disc beside the number, as both order modules already do it. */
export const WORK_TYPE_CODE: Record<string, { text: string; tone: CodeDiscTone }> = {
  "Leak check": { text: "LC", tone: "pastel-blue" },
  "Hose swap": { text: "HS", tone: "pastel-teal" },
  "Pump replace": { text: "PR", tone: "pastel-rose" },
  "Nozzle replace": { text: "NR", tone: "pastel-amber" },
  "Monitor install": { text: "MI", tone: "pastel-violet" },
  "Tank swap": { text: "TS", tone: "pastel-slate" },
};

/**
 * THREE LEVELS, NOT FIVE. The only decision a priority drives is which of
 * today's jobs moves when a technician loses an hour, and nobody makes that
 * call with five grades.
 */
export const PRIORITIES = ["Normal", "High", "Urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** INVENTED, and flagged. Both are what the invoice is worked out from. */
export const LABOR_RATE = 95;
export const MILEAGE_RATE = 1.5;

/* ------------------------------------------------------------ technicians */

export interface Technician {
  id: string;
  name: string;
  /** Where they start the day. */
  base: string;
  skills: string[];
  /** Jobs they can take in a day, which is what makes a schedule full. */
  dailyCapacity: number;
  phone: string;
  active: boolean;
}

export const TECHNICIANS: Technician[] = [
  { id: "tech-1", name: "Rosa Delgado", base: "Fresno Yard", skills: ["Tanks", "Pumps", "Meters"], dailyCapacity: 5, phone: "+1 559-555-0114", active: true },
  { id: "tech-2", name: "Curtis Nwosu", base: "Fresno Yard", skills: ["Tanks", "Welding"], dailyCapacity: 4, phone: "+1 559-555-0127", active: true },
  { id: "tech-3", name: "Priya Raman", base: "Kern Yard", skills: ["Meters", "Electrical"], dailyCapacity: 6, phone: "+1 661-555-0142", active: true },
  { id: "tech-4", name: "Dale Whitmore", base: "Kern Yard", skills: ["Pumps", "Hoses"], dailyCapacity: 5, phone: "+1 661-555-0158", active: true },
  { id: "tech-5", name: "Aiko Tanaka", base: "Bray North Yard", skills: ["Tanks", "Inspections"], dailyCapacity: 5, phone: "+1 559-555-0163", active: true },
  { id: "tech-6", name: "Marcus Bell", base: "Bray North Yard", skills: ["Electrical", "Meters"], dailyCapacity: 4, phone: "+1 559-555-0171", active: false },
];

export const technicianById = (id: string | null) =>
  id ? TECHNICIANS.find((t) => t.id === id) : undefined;

export const ACTIVE_TECHNICIANS = TECHNICIANS.filter((t) => t.active);

/* ------------------------------------------------------- the service order */

/**
 * A QUOTE IS A SNAPSHOT, not a live total.
 *
 * It is what the parts and fees WERE at the moment it was sent, kept whole so
 * the invoice can be read against it afterwards. Recomputing it from today's
 * lines would quietly rewrite what the customer agreed to.
 */
export interface Quote {
  parts: PartLine[];
  fees: FeeLine[];
  total: number;
  sentAt: string;
  /** Null until the customer says yes on site. */
  approvedAt: string | null;
}

export interface ServiceOrder {
  id: string;
  /** SO- series, as 3PL uses D-, M- and the asset orders W-. */
  orderNo: string;
  status: WorkStatus;
  source: IntakeSource;
  priority: Priority;

  /* ── who and where ── */
  customer: string;
  shipTo: string;
  city: string;
  state: string;

  /* ── what it is about ── */
  assetId: string;
  assetName: string;
  assetType: string;
  workType: string;
  /** What was reported, in the words it was reported in. */
  fault: string;

  /* ── when and who ── */
  /** The day it is booked for. `YYYY-MM-DD`, as every list here keys dates. */
  dateKey: string;
  /** ISO. Null means "dispatch it at the yard team's discretion". */
  scheduledAt: string | null;
  /** Null is exactly what Open means. */
  technicianId: string | null;
  /** Set when the technician marks arrival. */
  arrivedAt: string | null;
  /**
   * WHEN WORK ACTUALLY BEGAN — which is not when they arrived (Pavan,
   * 2026-09-23). Between the two sit the quote and, where the customer has to
   * agree to it, the wait for that answer. Billing an hour of somebody else's
   * deliberation as labour is the reason these are two timestamps and not one.
   */
  startedAt: string | null;

  /* ── the money ── */
  parts: PartLine[];
  /**
   * Hours on site, and **the effective figure every total reads.** 0 until
   * the work is recorded.
   *
   * IT IS DERIVED, AND IT CAN BE OVERRULED (Pavan, 2026-09-23 — "computed
   * with an override"). On completion it is `startedAt → completedAt`, which
   * is a fact nobody has to remember to type. `laborOverride` is what a
   * person typed instead, and it wins — because a clock cannot know about the
   * half hour spent moving a truck that should not be billed, and a computed
   * figure nobody can correct is one people work around by not starting the
   * job in the app.
   */
  labor: number;
  /**
   * The typed figure, when somebody has disagreed with the clock. `null` means
   * nobody has, and `labor` is whatever the clock said.
   *
   * KEPT SEPARATE FROM `labor` rather than just writing over it, so the screen
   * can show BOTH — what was measured and what is being billed. Overwriting
   * loses the measurement, and the measurement is the thing that makes the
   * correction reviewable.
   */
  laborOverride: number | null;
  /** Miles. Billable on the invoice only. */
  mileage: number;
  /** Set by the dispatcher at intake, added to by the technician. */
  fees: FeeLine[];
  /** Present only where a quote was sent on site. */
  quote: Quote | null;
  /** Charges added at the moment the invoice was raised. */
  extraCharges: FeeLine[];
  /** Raised — automatically on approval, or by hand. */
  invoiceCreated: boolean;
  invoicedAt: string | null;
  /** The invoice reached accounting. Batch, not real time. */
  synced: boolean;

  /* ── exceptions and provenance ── */
  /** Why it stalled. Only ever set on `Parts-pending`. */
  partNeeded: string | null;
  /** The linked return visit this job spawned, or the job that spawned this one. */
  returnOf: string | null;
  spawnedReturn: string | null;
  /** Signature captured on completion. */
  signed: boolean;
  completedAt: string | null;
  raisedBy: string;
}

/* ----------------------------------------------------------------- money */

export const partsTotal = (parts: PartLine[]) =>
  parts.reduce((n, p) => n + p.cost * p.qty, 0);
export const feesTotal = (fees: FeeLine[]) =>
  fees.reduce((n, f) => n + (f.amount || 0), 0);
export const laborTotal = (hours: number) => hours * LABOR_RATE;

/**
 * WHAT THE CLOCK SAYS — start of work to completion, in quarter hours.
 *
 * QUARTER HOURS BECAUSE THAT IS HOW LABOUR IS BILLED, and a raw 1.7383 would
 * be a figure the reader has to round in their head before they can check it.
 * Rounding here means the number on screen is the number on the invoice.
 *
 * Returns 0 rather than null when either end is missing: a job that has not
 * been started and finished has no measured labour, which is a different
 * thing from "we do not know" only in a sentence nobody reads.
 */
export function computedLabor(
  startedAt: string | null,
  completedAt: string | null
): number {
  if (!startedAt || !completedAt) return 0;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.max(0.25, Math.round((ms / 3_600_000) * 4) / 4);
}

/** The figure to bill: what somebody typed, or failing that what the clock said. */
export const effectiveLabor = (o: {
  laborOverride: number | null;
  startedAt: string | null;
  completedAt: string | null;
}) => o.laborOverride ?? computedLabor(o.startedAt, o.completedAt);
export const mileageTotal = (miles: number) => miles * MILEAGE_RATE;

/**
 * WHAT THE JOB COMES TO. Parts, labour, mileage, fees, and anything added when
 * the invoice was raised — in that order, because that is the order they are
 * known in.
 */
export function orderTotal(o: ServiceOrder): number {
  return (
    partsTotal(o.parts) +
    laborTotal(o.labor) +
    mileageTotal(o.mileage) +
    feesTotal(o.fees) +
    feesTotal(o.extraCharges)
  );
}

/** What a quote CAN contain — parts and fees, never labour or mileage. */
export function quoteableTotal(parts: PartLine[], fees: FeeLine[]): number {
  return partsTotal(parts) + feesTotal(fees);
}

/** One helper, app-wide. */
export { MONEY as money } from "../data";

/* ------------------------------------------------------------- the fixture */

const FAULTS: Record<string, string[]> = {
  "Leak check": [
    "Weeping at the bottom collar",
    "Customer reports smell at the bund",
    "Annual leak test due",
  ],
  "Hose swap": ["Hose perished at the cuff", "Hose kinked and split"],
  "Pump replace": [
    "Pump cutting out under load",
    "Pump seized — will not prime",
  ],
  "Nozzle replace": ["Nozzle dripping after shutoff", "Trigger latch broken"],
  "Monitor install": [
    "New level monitor to fit",
    "Monitor reading flat — replace head",
  ],
  "Tank swap": ["Tank out of certification", "Upsizing to 1,000 gal"],
};

const PARTS_NEEDED = [
  "2-inch pump seal on order",
  "Replacement sight gauge — arriving Thursday",
  "Meter head backordered",
];

const RAISED_BY = ["Dana Whitfield", "Alicia Bray", "Sam Okafor", "System — Inspection"];

const WINDOWS_HOURS = [8, 10, 13, 14];

const EXTRA_PARTS = [
  { name: "Gasket set", qty: 1, cost: 26 },
  { name: "Camlock fitting", qty: 2, cost: 14 },
  { name: "Grounding clamp", qty: 1, cost: 31 },
];

/** A seeded stream, so the fixture is the same on every load. */
function makePick(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function dateKeyOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * EVERY LANE HOLDS SOMETHING ON MOST DAYS.
 *
 * The board is date-scoped like every other list here, so a stage seeded once
 * would only be visible on the day it happened to fall. The stages are DEALT
 * ROUND by index rather than drawn, which is the same rule 3PL's seed follows
 * and for the same reason.
 */
function buildOrders(): ServiceOrder[] {
  const pick = makePick(20260918);
  const out: ServiceOrder[] = [];
  /* Only an asset that is actually placed somewhere can be serviced. */
  const placed: RentalAsset[] = RENTAL_ASSETS.filter((a) => a.shipTo && a.customer);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const spread: WorkStatus[] = [
    "Open",
    "Assigned",
    "In progress",
    "Assigned",
    "Needs approval",
    "Parts-pending",
    "Approved",
    "Open",
    "Completed",
    "Assigned",
    "Needs approval",
    "Completed",
    "In progress",
    "Approved",
    "Cancelled",
    "Open",
  ];

  for (let i = 0; i < 112; i++) {
    const asset = placed[i % placed.length];
    const status = spread[i % spread.length];
    const workType = WORK_TYPE_NAMES[i % WORK_TYPE_NAMES.length];
    const book = WORK_TYPES[workType];
    const faults = FAULTS[workType];

    const day = new Date(today);
    /* −4 to +5 days around today, so stepping the dates finds work on either
       side rather than an empty board. */
    day.setDate(day.getDate() + ((i % 10) - 4));
    const hour = WINDOWS_HOURS[i % WINDOWS_HOURS.length];

    /* A TECHNICIAN IS WHAT "ASSIGNED" MEANS. Open is exactly the state of
       having nobody on it, so seeding one there would make the first lane
       indistinguishable from the second. */
    const technicianId =
      status === "Open"
        ? null
        : ACTIVE_TECHNICIANS[i % ACTIVE_TECHNICIANS.length].id;

    /* EVERY SIXTH JOB IS LEFT UNSCHEDULED, because "dispatch it when you can"
       is a real answer the intake form offers and the board has to be able to
       show it. Never on a job already under way — a technician cannot have
       arrived at a visit nobody booked. */
    const scheduled =
      status === "Open" && i % 6 === 0
        ? null
        : (() => {
            const at = new Date(day);
            /* ON THE HALF HOUR, because that is the grid the time picker
               offers. A stored value the picker cannot represent shows in the
               field and vanishes the moment anybody opens it. */
            at.setHours(hour, (i % 2) * 30, 0, 0);
            return at.toISOString();
          })();

    const started = status !== "Open" && status !== "Assigned" && status !== "Cancelled";
    const recorded = isRecorded(status);
    const billed = status === "Approved" || status === "Completed";

    const arrivedAt = started && scheduled
      ? new Date(new Date(scheduled).getTime() + 12 * 60_000).toISOString()
      : null;

    const parts: PartLine[] = recorded
      ? [
          ...book.parts.map((p) => ({ ...p })),
          /* THE INVOICE IS ALLOWED TO BE BIGGER THAN THE QUOTE — every fifth
             recorded job turned out to need something nobody predicted, which
             is the case the quote-versus-invoice line on the sheet exists to
             explain. */
          ...(i % 5 === 0 ? [{ ...EXTRA_PARTS[i % EXTRA_PARTS.length] }] : []),
        ]
      : status === "Parts-pending"
        ? book.parts.map((p) => ({ ...p }))
        : book.parts.map((p) => ({ ...p }));

    const fees: FeeLine[] = book.fees.map((f) => ({ ...f }));
    /* After-hours is the commonest fee a technician adds on site. */
    if (recorded && i % 7 === 0) fees.push({ name: "After-hours callout", amount: 75 });

    /* WORK BEGINS AFTER THE ARRIVAL, not at it — the gap is the walk round the
       asset and, on a quoted job, the wait for the customer's answer. */
    const startedAt =
      started && arrivedAt
        ? new Date(new Date(arrivedAt).getTime() + 18 * 60_000).toISOString()
        : null;
    const mileage = recorded ? Math.round(pick() * 40) : 0;

    /* A QUOTE ONLY EXISTS WHERE ONE WAS SENT, and it is a snapshot of the
       BOOK parts and fees — never the extra part found later, and never the
       labour, which nobody knew at the time. */
    const quote: Quote | null =
      recorded && i % 3 !== 0
        ? {
            parts: book.parts.map((p) => ({ ...p })),
            fees: book.fees.map((f) => ({ ...f })),
            total: quoteableTotal(book.parts, book.fees),
            sentAt: arrivedAt ?? day.toISOString(),
            approvedAt: arrivedAt ?? day.toISOString(),
          }
        : null;

    const completedAt = recorded
      ? (() => {
          const at = new Date(day);
          at.setHours(hour + 2, (i * 13) % 60, 0, 0);
          return at.toISOString();
        })()
      : null;

    /* EVERY SIXTH RECORDED JOB HAS BEEN CORRECTED BY HAND, so the screen has
       both cases in it from the first load: a figure the clock produced, and
       one somebody disagreed with. A fixture with only the happy case is how
       an override ships untested. */
    const laborOverride =
      recorded && i % 6 === 0
        ? Number((0.5 + pick() * 2).toFixed(2))
        : null;
    const labor =
      laborOverride ??
      (status === "Parts-pending"
        ? computedLabor(startedAt, new Date(new Date(startedAt ?? day).getTime() + 45 * 60_000).toISOString())
        : computedLabor(startedAt, completedAt));

    out.push({
      id: `so-${i}`,
      orderNo: `SO-${1042 + i * 3}`,
      status,
      source:
        i % 11 === 0
          ? PORTAL_SOURCE
          : INTAKE_SOURCES[i % INTAKE_SOURCES.length],
      /* URGENT IS RARE ON PURPOSE. A board where a third of the cards shout is
         a board with no priority on it at all. */
      priority: i % 19 === 0 ? "Urgent" : i % 6 === 0 ? "High" : "Normal",
      customer: asset.customer ?? "",
      shipTo: asset.shipTo ?? "",
      city: asset.city ?? "",
      state: asset.state ?? "",
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.assetType,
      workType,
      fault: faults[i % faults.length],
      dateKey: dateKeyOf(day),
      scheduledAt: scheduled,
      technicianId,
      arrivedAt,
      startedAt,
      parts,
      labor,
      laborOverride,
      mileage,
      fees,
      quote,
      extraCharges: [],
      invoiceCreated: billed,
      invoicedAt: billed ? completedAt : null,
      /* SYNCING IS WHAT COMPLETED MEANS. An approved job with its invoice
         still in flight is exactly the state the Approved lane holds. */
      synced: status === "Completed",
      partNeeded:
        status === "Parts-pending" ? PARTS_NEEDED[i % PARTS_NEEDED.length] : null,
      returnOf: null,
      spawnedReturn: null,
      signed: recorded,
      completedAt,
      raisedBy: RAISED_BY[i % RAISED_BY.length],
    });
  }
  return out;
}

export const SERVICE_ORDERS: ServiceOrder[] = buildOrders();

/**
 * THE INVARIANTS, checked against the fixture at boot.
 *
 * A seed that contradicts the screens is a bug that only ever shows up as a
 * view nobody can explain, so the rules the screens rely on are stated here
 * and shouted about in the console — the same contract `orders.ts` keeps.
 */
export function assertServiceConsistent(rows: ServiceOrder[]): string[] {
  const problems: string[] = [];
  for (const r of rows) {
    if (!r.orderNo.startsWith("SO-")) {
      problems.push(`${r.orderNo}: service order without an SO prefix`);
    }
    /* A cancelled order is a snapshot of whatever it was when it stopped, so
       the stage rules below do not describe it. */
    if (r.status === "Cancelled") continue;

    /* OPEN MEANS NOBODY IS ON IT. Every stage after it means somebody is, or
       the lane is telling a lie. */
    if ((r.status === "Open") !== (r.technicianId === null)) {
      problems.push(`${r.orderNo}: ${r.status} and its technician disagree`);
    }
    /* ARRIVAL IS WHAT STARTS THE WORK. Nothing past Assigned can be without
       it, and nothing before it can have one. */
    const started = r.status !== "Open" && r.status !== "Assigned";
    if (started && !r.arrivedAt) {
      problems.push(`${r.orderNo}: ${r.status} with no arrival recorded`);
    }
    if (!started && r.arrivedAt) {
      problems.push(`${r.orderNo}: arrived on a job that has not started`);
    }
    /* RECORDED WORK IS HOURS AND A SIGNATURE. A job sent for approval with no
       labour on it is a job nobody could approve. */
    if (isRecorded(r.status) && r.labor <= 0) {
      problems.push(`${r.orderNo}: ${r.status} with no labour recorded`);
    }
    if (isRecorded(r.status) !== (r.completedAt !== null)) {
      problems.push(`${r.orderNo}: ${r.status} and its completion time disagree`);
    }
    /* THE INVOICE FOLLOWS THE APPROVAL, and the sync follows the invoice. */
    const billed = r.status === "Approved" || r.status === "Completed";
    if (billed !== r.invoiceCreated) {
      problems.push(`${r.orderNo}: ${r.status} and its invoice disagree`);
    }
    if (r.synced && !r.invoiceCreated) {
      problems.push(`${r.orderNo}: synced without an invoice`);
    }
    if ((r.status === "Completed") !== r.synced) {
      problems.push(`${r.orderNo}: Completed means the invoice reached accounting`);
    }
    /* A STALL HAS A REASON, and only a stall has one. */
    if ((r.status === "Parts-pending") !== (r.partNeeded !== null)) {
      problems.push(`${r.orderNo}: hold reason and status disagree`);
    }
    /* A QUOTE CANNOT CONTAIN WHAT NOBODY KNEW WHEN IT WAS SENT. */
    if (r.quote && r.quote.total !== quoteableTotal(r.quote.parts, r.quote.fees)) {
      problems.push(`${r.orderNo}: the quote's total does not match its lines`);
    }
    if (r.quote && !isRecorded(r.status) && r.status !== "Parts-pending") {
      problems.push(`${r.orderNo}: a quote on a job that has not been worked`);
    }
  }
  return problems;
}
