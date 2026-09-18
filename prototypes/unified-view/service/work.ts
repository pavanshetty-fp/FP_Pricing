import { RENTAL_ASSETS, type RentalAsset } from "../threepl/directory";
import { SHIP_TO_SITES } from "../threepl/orders";
import type { LaneColor } from "../threepl/BrokerBoard";
import type { StatusTone } from "@/components/ui/status-chip";
import type { CodeDiscTone } from "@/components/ui/code-disc";

/*
  SERVICE WORK — the module's model, its fixture and its invariants.

  WHAT THIS MODULE IS. Everything this business rents out — tanks, pumps,
  meters, the hoses and nozzles hanging off them — needs looking after: it gets
  inspected on a cycle, it breaks, it gets swapped, it gets taken away. That
  work is what this module holds, and the thing it holds is a WORK ORDER: one
  visit, to one asset, at one site, on one day, by one technician.

  WHY THE ASSET IS THE SUBJECT. 3PL's order is about a quantity going to a
  place; this one is about a THING that is already there. The asset is what the
  history hangs off — "this tank has been out three times this year" is the
  question the module exists to answer — so an order that names a site and not
  an asset would be a visit nobody could account for afterwards.

  WHY IT IS NOT BROKERED. 3PL already covers work put out to partners and
  priced. Service work is OUR OWN people: the question is who is free and when,
  not who is cheapest, so there is no quoting here and no partner table.
  (Decided 2026-09-18 when the module was created. If service work ever goes
  out to third parties it is a change to make deliberately, not by default.)

  INVENTED, and flagged: the technicians, the fault descriptions, the labour
  hours and the parts. Customers, ship-tos and assets are REUSED from the
  existing directory, because they are the same records — a tank being serviced
  is the tank on the rental list, not a second copy of it.
*/

/* ------------------------------------------------------------------ stages */

/**
 * THE LIFE OF A WORK ORDER.
 *
 * Reported and Scheduled are two facts, not one: a fault that has been raised
 * and a fault with a technician and a date against it are different problems,
 * and the gap between them is the backlog this board exists to show.
 *
 * On Hold is the exception lane — waiting on a part, waiting on the customer,
 * waiting on access — and it sits apart from the run of stages for the same
 * reason 3PL's Cancelled does: it is not a step of the work, it is a way of
 * not doing it today.
 */
export type WorkStatus =
  | "Reported"
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Invoiced"
  | "On Hold"
  | "Cancelled";

export const WORK_STATUSES: WorkStatus[] = [
  "Reported",
  "Scheduled",
  "In Progress",
  "Completed",
  "Invoiced",
  "On Hold",
  "Cancelled",
];

/** Past this, the visit has happened and the record is being settled. */
export function isWorked(s: WorkStatus): boolean {
  return s === "Completed" || s === "Invoiced";
}

/**
 * THE DS SHIPS FOUR TONE CHANNELS and this lifecycle has seven stages, so some
 * of them share. The rule the DS states is that colour is never the only
 * carrier of meaning — the label always says which — so sharing is honest
 * where the two stages are the same KIND of state.
 */
export const WORK_STATUS_TONE: Record<WorkStatus, StatusTone> = {
  Reported: "neutral",
  Scheduled: "processing",
  "In Progress": "processing",
  Completed: "success",
  Invoiced: "success",
  /* THE ONE STAGE WHERE SOMETHING HAS GONE WRONG, so it takes the one channel
     that says so. It is also the only stage that needs a reason written on it. */
  "On Hold": "failed",
  Cancelled: "neutral",
};

/** The board's lanes. Same shape as 3PL's, so one board teaches the other. */
export const WORK_LANES: {
  key: string;
  statuses: WorkStatus[];
  apart?: boolean;
}[] = [
  { key: "Reported", statuses: ["Reported"] },
  { key: "Scheduled", statuses: ["Scheduled"] },
  { key: "In Progress", statuses: ["In Progress"] },
  { key: "Completed", statuses: ["Completed"] },
  { key: "Invoiced", statuses: ["Invoiced"] },
  /* Behind the rule: neither is a step of the work. */
  { key: "On Hold", statuses: ["On Hold"], apart: true },
  { key: "Cancelled", statuses: ["Cancelled"] },
];

/** Lane fills, from the DS's `--fp-lane-*` set — the same tokens 3PL uses. */
export const WORK_LANE_COLOR: Record<WorkStatus, LaneColor> = {
  Reported: "grey",
  Scheduled: "blue",
  "In Progress": "cyan",
  Completed: "green",
  Invoiced: "violet",
  "On Hold": "yellow",
  Cancelled: "red",
};

/* -------------------------------------------------------------- job kinds */

/**
 * WHAT THE VISIT IS FOR.
 *
 * Inspection and Preventive are both planned and both recur; the difference is
 * that one of them is somebody looking and the other is somebody doing. They
 * are separate because the paperwork is: an inspection ends in a certificate,
 * a service ends in a parts list.
 */
export const JOB_TYPES = [
  "Inspection",
  "Preventive Service",
  "Repair",
  "Install",
  "Removal",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

/** The disc beside the number, as the two order modules already do it. */
export const JOB_TYPE_CODE: Record<JobType, { text: string; tone: CodeDiscTone }> = {
  Inspection: { text: "I", tone: "pastel-blue" },
  "Preventive Service": { text: "PS", tone: "pastel-teal" },
  Repair: { text: "R", tone: "pastel-rose" },
  Install: { text: "IN", tone: "pastel-violet" },
  Removal: { text: "RM", tone: "pastel-slate" },
};

/**
 * HOW BADLY IT IS WANTED.
 *
 * Three levels, not five. The only decision a priority drives here is which of
 * today's jobs gets moved when a technician loses an hour, and nobody makes
 * that call with five grades.
 */
export const PRIORITIES = ["Routine", "High", "Emergency"] as const;
export type Priority = (typeof PRIORITIES)[number];

/* ------------------------------------------------------------ technicians */

export interface Technician {
  id: string;
  name: string;
  /** Where they start the day — the same yards the asset orders run between. */
  base: string;
  skills: string[];
  /** Jobs they can take in a day, which is what makes a schedule full. */
  dailyCapacity: number;
  phone: string;
  active: boolean;
}

/* INVENTED. Names, phones and skills are fixture, flagged as such. The BASES
   are real — they are the yards `orders.ts` already declares. */
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

/* ------------------------------------------------------------ work orders */

export interface WorkOrder {
  id: string;
  /** W- series, as 3PL uses D- and M-. */
  orderNo: string;
  status: WorkStatus;
  jobType: JobType;
  priority: Priority;

  /* ── who and where ── */
  customer: string;
  shipTo: string;
  city: string;
  state: string;

  /* ── what it is about. The asset is the subject of the whole record. ── */
  assetId: string;
  assetName: string;
  assetType: string;

  /** What was reported, in the words it was reported in. */
  fault: string;

  /* ── when ── */
  /** The day it is booked for. `YYYY-MM-DD`, as the other modules key dates. */
  dateKey: string;
  window: { start: string; end: string };
  /** Null until somebody schedules it — which is the whole point of Reported. */
  technicianId: string | null;

  /** Set the first time the visit is called done, cleared if it goes back. */
  completedAt: string | null;
  /** Hours on site. Null until the visit has happened. */
  hoursOnSite: number | null;
  /** What was fitted. Empty on a visit that needed nothing. */
  parts: { name: string; qty: number }[];

  /** Why it is not being worked on. Only ever set on `On Hold`. */
  holdReason: string | null;
  raisedBy: string;
}

const FAULTS: Record<JobType, string[]> = {
  Inspection: [
    "Annual tank inspection due",
    "Certificate expires this month",
    "Post-relocation inspection",
  ],
  "Preventive Service": [
    "Filter change and seal check",
    "Scheduled pump service",
    "Meter calibration due",
  ],
  Repair: [
    "Nozzle leaking at the collar",
    "Pump cutting out under load",
    "Meter reading high against the ticket",
    "Sight gauge cracked",
  ],
  Install: ["New tank commissioning", "Fit containment tray and grounding reel"],
  Removal: ["Contract ended — decommission and collect", "Tank being replaced"],
};

const HOLD_REASONS = [
  "Waiting on a replacement seal kit",
  "Customer cannot give site access this week",
  "Waiting on the customer to confirm the shutdown window",
];

const RAISED_BY = ["Dana Whitfield", "Alicia Bray", "Sam Okafor", "System — Schedule"];

const WORK_WINDOWS = [
  { start: "8:00 AM", end: "11:00 AM" },
  { start: "10:00 AM", end: "1:00 PM" },
  { start: "1:00 PM", end: "4:00 PM" },
  { start: "2:00 PM", end: "6:00 PM" },
];

const PART_POOL = [
  "Seal kit",
  "Filter element",
  "Nozzle",
  "Hose, 3m",
  "Gasket set",
  "Meter head",
];

/** Same deterministic stream the other fixtures use — a seeded LCG, not Math.random. */
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
 * The fixture.
 *
 * EVERY LANE HOLDS SOMETHING ON MOST DAYS. The board is scoped to a date range
 * like every other list here, so a status seeded once would only be visible on
 * the day it happened to fall — the stages are dealt round by index rather than
 * drawn, which is the same rule 3PL's seed follows and for the same reason.
 */
function buildWorkOrders(): WorkOrder[] {
  const pick = makePick(20260918);
  const out: WorkOrder[] = [];
  /* Only assets that are actually placed somewhere can be visited. */
  const placed: RentalAsset[] = RENTAL_ASSETS.filter((a) => a.shipTo && a.customer);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const spread: WorkStatus[] = [
    "Reported",
    "Scheduled",
    "Scheduled",
    "In Progress",
    "Completed",
    "Completed",
    "Invoiced",
    "On Hold",
    "Reported",
    "Scheduled",
    "Completed",
    "Cancelled",
  ];

  for (let i = 0; i < 96; i++) {
    const asset = placed[i % placed.length];
    const status = spread[i % spread.length];
    const jobType = JOB_TYPES[i % JOB_TYPES.length];
    const faults = FAULTS[jobType];
    const day = new Date(today);
    /* −3 to +4 days around today, so stepping the date control finds work on
       either side of it rather than an empty board. */
    day.setDate(day.getDate() + ((i % 8) - 3));

    /* A TECHNICIAN IS WHAT SCHEDULING MEANS. Reported is exactly the state of
       having nobody against it, so seeding one there would make the first lane
       indistinguishable from the second. Cancelled keeps whoever it had. */
    const technicianId =
      status === "Reported"
        ? null
        : TECHNICIANS.filter((t) => t.active)[i % TECHNICIANS.filter((t) => t.active).length].id;

    const worked = isWorked(status);
    const completedAt = worked
      ? (() => {
          const at = new Date(day);
          at.setHours(9 + (i % 7), (i * 11) % 60, 0, 0);
          return at.toISOString();
        })()
      : null;

    out.push({
      id: `wo-${i}`,
      orderNo: `W-${104_600 + i * 7}`,
      status,
      jobType,
      /* EMERGENCY IS RARE ON PURPOSE. A board where a third of the cards shout
         is a board with no priority on it at all. */
      priority:
        i % 17 === 0 ? "Emergency" : i % 5 === 0 ? "High" : "Routine",
      customer: asset.customer ?? "",
      shipTo: asset.shipTo ?? "",
      city: asset.city ?? "",
      state: asset.state ?? "",
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.assetType,
      fault: faults[i % faults.length],
      dateKey: dateKeyOf(day),
      window: WORK_WINDOWS[i % WORK_WINDOWS.length],
      technicianId,
      completedAt,
      /* Hours are a fact about a visit that happened. */
      hoursOnSite: worked ? Number((0.75 + pick() * 3).toFixed(2)) : null,
      /* An inspection fits nothing; the repairs are where the parts are. */
      parts:
        worked && (jobType === "Repair" || jobType === "Preventive Service")
          ? [
              {
                name: PART_POOL[i % PART_POOL.length],
                qty: 1 + (i % 3),
              },
            ]
          : [],
      holdReason:
        status === "On Hold" ? HOLD_REASONS[i % HOLD_REASONS.length] : null,
      raisedBy: RAISED_BY[i % RAISED_BY.length],
    });
  }
  return out;
}

export const WORK_ORDERS: WorkOrder[] = buildWorkOrders();

/**
 * THE INVARIANTS, checked against the fixture at boot.
 *
 * A seed that contradicts the UI is a bug that only shows up as a screen
 * nobody can explain, so the rules the screens rely on are stated here and
 * shouted about in the console — the same contract `orders.ts` keeps.
 */
export function assertWorkConsistent(rows: WorkOrder[]): string[] {
  const problems: string[] = [];
  for (const r of rows) {
    if (!r.orderNo.startsWith("W-")) {
      problems.push(`${r.orderNo}: work order without a W prefix`);
    }
    if (r.status === "Cancelled") continue;
    /* SCHEDULING IS ASSIGNING SOMEBODY. Reported means nobody is on it; every
       stage after it means somebody is, or the lane is telling a lie. */
    if ((r.status === "Reported") !== (r.technicianId === null)) {
      problems.push(`${r.orderNo}: ${r.status} and its technician disagree`);
    }
    if (isWorked(r.status) !== (r.completedAt !== null)) {
      problems.push(`${r.orderNo}: ${r.status} and its completion time disagree`);
    }
    if (isWorked(r.status) !== (r.hoursOnSite !== null)) {
      problems.push(`${r.orderNo}: ${r.status} and its hours on site disagree`);
    }
    if ((r.status === "On Hold") !== (r.holdReason !== null)) {
      problems.push(`${r.orderNo}: hold reason and status disagree`);
    }
    if (r.parts.length > 0 && !isWorked(r.status)) {
      problems.push(`${r.orderNo}: parts fitted on a visit that has not happened`);
    }
    if (!SHIP_TO_SITES.some((s) => s.name === r.shipTo)) {
      /* Not fatal — the asset fixture has sites of its own — but worth saying,
         because the geography facets are built from the order's site. */
    }
  }
  return problems;
}
