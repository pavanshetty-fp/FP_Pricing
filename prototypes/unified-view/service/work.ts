import { RENTAL_ASSETS, type RentalAsset } from "../threepl/directory";
import type { CodeDiscTone } from "@/components/ui/code-disc";
import type { LaneColor } from "../threepl/BrokerBoard";
import { statusTones, type StatusKind } from "../statusKind";
import { MONEY as money } from "../data";

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
/*
  ═══════════════════════════════════════════════════════════════════════════
  THE LIFECYCLE — FIVE LANES, AND THE STATUSES INSIDE THEM
  ═══════════════════════════════════════════════════════════════════════════

  RESTRUCTURED 2026-09-23 (Pavan). It was eight flat statuses and eight lanes,
  one each, which made the board a row of narrow columns most of them empty —
  and made every status a peer of every other, so "waiting for a part" looked
  like the same KIND of thing as "approved".

  A LANE IS A PLACE IN THE WORK. A STATUS IS WHY IT IS THERE. The lane answers
  "whose problem is this now"; the status answers "what exactly". Five lanes,
  because there are five people-shaped answers to the first question:

    Open      nobody is on it            → dispatch has to assign somebody
    Assigned  somebody is on it, later   → nothing to do but wait for the day
    Working   it is in the field today   → the technician has it
    Completed the visit is over          → what is left is money
    Synced    the money has been checked → finished

  THE TWO OPEN STATUSES THAT ARE NOT "NEW" ARE THE POINT. A remainder from a
  partial visit and a spawned linked order are both WORK NOBODY IS ON, which
  is what Open means — filing them anywhere else hides outstanding work behind
  a word about how it arose.
*/

export type WorkLane =
  | "Open"
  | "Assigned"
  | "Working"
  | "Completed"
  | "Synced"
  | "Cancelled";

export type WorkStatus =
  /* Open — nobody is on it */
  | "Drafted"
  | "Parts pending"
  | "Linked order"
  /* Assigned — somebody is, but not today */
  | "Assigned"
  /* Working — it is in the field */
  | "Yet to start"
  | "Ongoing"
  | "Needs approval"
  /* Completed — the visit is over */
  | "Completed"
  | "Completed — linked"
  /* Synced — the money has been looked at */
  | "Yet to be reviewed"
  | "Reviewed"
  | "Cancelled";

export const WORK_STATUSES: WorkStatus[] = [
  "Drafted",
  "Parts pending",
  "Linked order",
  "Assigned",
  "Yet to start",
  "Ongoing",
  "Needs approval",
  "Completed",
  "Completed — linked",
  "Yet to be reviewed",
  "Reviewed",
  "Cancelled",
];

/** Lane order on the board. Cancelled sits behind a rule — it is not a step. */
export const WORK_LANES: {
  key: WorkLane;
  statuses: WorkStatus[];
  apart?: boolean;
}[] = [
  { key: "Open", statuses: ["Drafted", "Parts pending", "Linked order"] },
  { key: "Assigned", statuses: ["Assigned"] },
  { key: "Working", statuses: ["Yet to start", "Ongoing", "Needs approval"] },
  { key: "Completed", statuses: ["Completed", "Completed — linked"] },
  { key: "Synced", statuses: ["Yet to be reviewed", "Reviewed"] },
  { key: "Cancelled", statuses: ["Cancelled"], apart: true },
];

/** Which lane a status lives in. One place, so the board and the list agree. */
export const LANE_OF: Record<WorkStatus, WorkLane> = Object.fromEntries(
  WORK_LANES.flatMap((l) => l.statuses.map((st) => [st, l.key]))
) as Record<WorkStatus, WorkLane>;

/** Past this, the visit has happened and what is left is money. */
export function isRecorded(s: WorkStatus): boolean {
  return (
    s === "Needs approval" ||
    LANE_OF[s] === "Completed" ||
    LANE_OF[s] === "Synced"
  );
}

/**
 * The technician can still act on it.
 *
 * NOT "PARTS PENDING" ANY MORE. That status now belongs to the REMAINDER,
 * which is a separate order sitting in Open waiting for somebody to be put on
 * it — there is nothing for a technician to resume.
 */
export function isWorkable(s: WorkStatus): boolean {
  return s === "Assigned" || s === "Yet to start" || s === "Ongoing";
}

/** Work nobody is on. The lane's whole meaning, and the CTA follows it. */
export const isUnassigned = (s: WorkStatus) => LANE_OF[s] === "Open";

/**
 * THE DS SHIPS FOUR TONE CHANNELS and this lifecycle has twelve statuses, so
 * they share. The DS's own rule is that colour is never the only carrier of
 * meaning — the label always says which — so sharing is honest where two
 * statuses are the same KIND of state. The lane colours below do the
 * separating.
 */

/**
 * WHAT KIND OF STATE A STATUS IS — the badge's colour (Pavan, 2026-09-23).
 *
 * FIVE KINDS, AND THEY ARE ABOUT WHAT THE READER SHOULD DO, not about where
 * the status sits in the ladder:
 *
 *   caution   WAITING ON SOMEBODY — pending, awaiting, not yet looked at
 *   success   DONE — the thing it was for has happened
 *   info      SIMPLY TRUE — somebody is on it, it is under way. Asks nothing
 *   critical  A WARNING, or a state important enough to change a plan
 *   neutral   NEITHER — a record that exists and is not yet a state
 *
 * A DISPATCHER SCANS A BOARD FOR THE YELLOW ONES. That is the whole argument
 * for colouring these: every badge grey made the column the only thing
 * carrying meaning, and a column is a place, not a state — a Parts-pending
 * remainder and a brand-new job sat in Open looking identical.
 *
 * NOTHING IS CRITICAL YET, and that is deliberate rather than an oversight:
 * no status in this lifecycle is a warning. Red stays for the priority badge
 * and for a state that genuinely goes wrong, so that when it does appear it
 * is worth looking at.
 */
export const WORK_STATUS_KIND: Record<WorkStatus, StatusKind> = {
  /* A record that exists. Nothing has happened to it yet. */
  Drafted: "neutral",
  /* Waiting on parts, and on somebody to take the next trip. */
  "Parts pending": "caution",
  /* Work spun off another job and waiting for an owner. */
  "Linked order": "caution",
  /* Somebody is on it. Both are facts, neither asks anything. */
  Assigned: "info",
  "Yet to start": "info",
  Ongoing: "info",
  /* Sitting on a manager's desk. */
  "Needs approval": "caution",
  Completed: "success",
  "Completed — linked": "success",
  /* An invoice nobody has checked. */
  "Yet to be reviewed": "caution",
  Reviewed: "success",
  /* NOT RED. Cancelled is a terminal non-event, not a problem to solve — and
     a red badge on a lane of them would be the loudest thing on the board
     saying the least. */
  Cancelled: "neutral",
};

/** The same kinds as `StatusChip` tones — the table's and the sheet's chip. */
export const WORK_STATUS_TONE = statusTones(WORK_STATUS_KIND);

/** The DS's `--fp-lane-*` set, the same tokens the 3PL board draws from. */
export const WORK_LANE_COLOR: Record<WorkStatus, LaneColor> = {
  Drafted: "grey",
  "Parts pending": "yellow",
  "Linked order": "yellow",
  Assigned: "blue",
  "Yet to start": "blue",
  Ongoing: "cyan",
  "Needs approval": "violet",
  Completed: "green",
  "Completed — linked": "green",
  "Yet to be reviewed": "violet",
  Reviewed: "purple",
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
  /** How many the job needs. */
  qty: number;
  /** Per unit. */
  cost: number;
  /**
   * HOW MANY WERE ACTUALLY FITTED (Pavan, 2026-09-23). `undefined` means "all
   * of them", which is the normal case and keeps every existing line valid.
   *
   * A NUMBER, NOT A FLAG, because the real shortfall is usually partial:
   * a job needing five hoses and finding three is the case that makes the
   * whole follow-up worth modelling. A boolean would force the technician to
   * choose between claiming all five or none.
   */
  fittedQty?: number;
}

export interface FeeLine {
  name: string;
  amount: number;
  /** Set when the fee was added on a task on site — the task's key. */
  task?: string;
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

/**
 * WHAT KIND OF JOB A TASK IS — two kinds (Pavan, 2026-09-24): servicing a
 * piece of equipment, or adding / replacing parts on it. Derived from the
 * work type, never typed, so two orders for the same work cannot disagree.
 */
export type TaskKind = "Servicing" | "Parts";
export const WORK_TYPE_CATEGORY: Record<string, TaskKind> = {
  "Leak check": "Servicing",
  "Hose swap": "Parts",
  "Pump replace": "Parts",
  "Nozzle replace": "Parts",
  "Monitor install": "Parts",
  "Tank swap": "Parts",
};
export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  Servicing: "Servicing of equipment",
  Parts: "Adding or replacing parts",
};

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

/** What the technician found — deliberately not a restatement of the fault. */
const ASSESSMENTS = [
  "Hose split at the crimp, not the body. Whole assembly wants replacing.",
  "Seal is fine. It was the clamp backing off — retorqued and watched it.",
  "Pump is drawing air. Suction line has a pinhole about a foot off the tank.",
  "Meter reads 3% high against the prover. Recalibrated.",
  "Fitting was cross-threaded from the last visit. Chased the thread.",
];

const TECH_NOTES = [
  "Site contact asked to be called before the next visit — gate is locked after 3.",
  "Second skid at this yard is showing the same wear. Worth a look next time.",
  "Customer watched the whole job and signed happily.",
  "Access was tight; bring the short hose reel next time.",
];

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
  /** Who on the customer's side acknowledged it, on site. */
  acknowledgedBy?: string;
}

/**
 * ONE LINE OF THE ON-SITE ASSESSMENT (Pavan, 2026-09-24).
 *
 * The technician compares what the ORDER asks for with what is actually in
 * front of them, line by line:
 *   accurate   the requirement is right as ordered
 *   different  it is there, but not as described — `actual` says what it is
 *   skip       on the order, needs no attention, can be skipped
 *   added      not on the order at all — found on site
 * Each line carries its own note and photos.
 */
export type AssessmentVerdict = "accurate" | "different" | "skip" | "added";

export interface AssessmentLine {
  key: string;
  /** From the order's asset rows, or found on site. */
  source: "order" | "added";
  assetName: string;
  workType: string;
  /** What the order said. Empty on an added line. */
  reported: string;
  verdict: AssessmentVerdict | null;
  /** What it actually needs — required when `different` or `added`. */
  actual: string;
  /** The assessment note's subject line (Pavan, 2026-09-24). */
  subject?: string;
  /** The assessment note's description. */
  note: string;
  /** Photo URLs taken on site. */
  photos: string[];
  /**
   * WHEN IT IS A DIFFERENT ISSUE (Pavan, 2026-09-24): what was actually found —
   * which asset, what kind of issue, a description, and the parts it needs.
   * The parts join the order when the assessment is saved, so the quote and
   * the completion carry them.
   */
  found?: {
    assetName: string;
    workType: string;
    description: string;
    /** Retired — a task's parts now live on the task, whatever the answer. */
    parts?: PartLine[];
  };
  /**
   * THE TASK'S PARTS, WITH A COST EACH (Pavan, 2026-09-24) — one or many, on
   * every answer: added when faulty as described, what the real issue needs
   * when different, cross-checked when no fault. Prefilled from the price
   * book for the work type when the answer is first picked. Together they
   * become the order's parts, and so the quote.
   */
  parts?: PartLine[];
  /** THE TASK'S FEES (Pavan, 2026-09-24) — one or many, beside its parts. */
  fees?: FeeLine[];
}

/**
 * ONE TRIP TO THE SITE.
 *
 * ITS OWN CLOCK AND ITS OWN TECHNICIAN, because across a partial job neither
 * is the same twice: the second trip may be a different person on a different
 * day, and a single pair of timestamps cannot hold that.
 */
export interface ServiceVisit {
  /** ISO. A visit exists from the moment somebody starts work. */
  startedAt: string;
  /** ISO, or null while it is running. Only the last visit may be running. */
  endedAt: string | null;
  /** Who was on it. Null on a fixture old enough not to have said. */
  technicianId: string | null;
  /**
   * The hours somebody typed for THIS visit, overruling its clock.
   *
   * PER VISIT, NOT PER ORDER. The half hour that should not be billed happened
   * on one of the trips, and correcting the total would hide which.
   */
  override: number | null;
}

/** One asset on a visit, with the work it needs and what was reported about it. */
export interface ServiceAssetLine {
  assetId: string;
  assetName: string;
  assetType: string;
  workType: string;
  /** What was reported about THIS asset, in the words it was reported in. */
  fault: string;
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
  /**
   * THE ASSETS THIS VISIT COVERS — one row each (Pavan, 2026-09-23).
   *
   * A LIST, BECAUSE A VISIT IS. One truck goes to one site and works on three
   * skids; as a single asset that was three orders, three call-out fees and
   * three invoices for one trip. The site is the constant and the assets are
   * the variable, which is why the customer and the assets are now two cards
   * rather than one.
   *
   * EACH ROW CARRIES ITS OWN WORK TYPE AND FAULT, because they belong to the
   * asset and not to the visit: a hose swap on one skid and a meter
   * recalibration on the next are the same trip and different jobs.
   */
  assets: ServiceAssetLine[];

  /* ── the first asset, mirrored ──────────────────────────────────────────
     THESE FIVE ARE `assets[0]`, KEPT IN SYNC ON EVERY WRITE. Thirty-eight
     places read them — board cards, list columns, both technician apps — and
     rewriting all of them to walk a list would be a day's work for a
     prototype whose lists are nearly always one long. `syncPrimaryAsset` is
     the ONE place the mirror is maintained; nothing else may write them. */
  assetId: string;
  assetName: string;
  assetType: string;
  workType: string;
  /** What was reported, in the words it was reported in. */
  fault: string;

  /* ── when and who ── */
  /** The day it is booked for. `YYYY-MM-DD`, as every list here keys dates. */
  dateKey: string;
  /**
   * ISO — **the START of the window**, kept because every list, card and
   * header already reads it. Null means "dispatch it at the yard team's
   * discretion".
   */
  scheduledAt: string | null;
  /**
   * THE END OF THE WINDOW, in minutes from midnight (Pavan, 2026-09-23).
   *
   * A SLOT, NOT A MOMENT — the same control 3PL uses for a delivery window,
   * and for the same reason: a site whose gate opens between 7 and 11 was
   * being filed under a single 7:00 AM that nobody could honour, and the four
   * hours of slack lived in a dispatcher's head. A window is two times, so it
   * takes two numbers.
   *
   * Minutes rather than a second ISO because the END shares the start's DATE
   * by definition; storing it as a full timestamp invites the two to disagree
   * about which day they are on.
   */
  windowEndMin: number | null;
  /** Null is exactly what Open means. */
  technicianId: string | null;
  /** Set when the technician marks arrival. */
  arrivedAt: string | null;
  /**
   * EVERY VISIT, WITH ITS OWN CLOCK (Pavan, 2026-09-23).
   *
   * A PARTIAL JOB IS VISITED MORE THAN ONCE, and once `continue` keeps the
   * same order across trips, "when did the work start" stops having one
   * answer. Two hours on Tuesday and forty minutes on Thursday is not a
   * two-hour-forty job that began on Tuesday — it is two visits, and the
   * customer is owed the sum of them with the dates against it.
   *
   * THE LAST ONE IS THE LIVE ONE. A visit with no `endedAt` is running, and
   * there is never more than one.
   */
  visits: ServiceVisit[];

  /* ── the current visit, mirrored ────────────────────────────────────────
     `startedAt` is the LAST visit's start and `completedAt` its end, kept in
     sync by `syncVisits`. Everything that watches a running job — the
     dispatcher's timer, the technician's screen, the Record rail — asks about
     the visit in progress, which is the last one. Nothing else may write
     them. */
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
  /**
   * WHAT AN HOUR COSTS ON THIS JOB (Pavan, 2026-09-23).
   *
   * PER ORDER, NOT PER COMPANY. `LABOR_RATE` is the house rate and the
   * default, but an after-hours callout, a contract customer and a warranty
   * job are three different numbers, and a single global rate meant the
   * difference had to be smuggled in as a fee with a name that explained it.
   */
  laborRate: number;
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
  /**
   * WHAT THE TECHNICIAN FOUND, as against what was reported (Pavan,
   * 2026-09-23). `fault` is the customer's words, taken down over the phone;
   * this is the first field in the module that records what was actually
   * true. They are often not the same thing, and the gap between them is the
   * most useful sentence on a service record.
   *
   * Captured in the technician's app, once they are standing in front of it.
   */
  assessment: string | null;
  /**
   * The technician's own note, written after the job ended — completed or
   * stalled for a part.
   *
   * ONE FIELD, NOT TWO. "What I want to say about finishing this" and "what I
   * want to say about not finishing it" are the same act at two different
   * endings, and two fields would mean a job that did both ends up with the
   * note in whichever one nobody reads.
   */
  techNotes: string | null;
  /** Why it stalled. Only ever set on `Parts-pending`. */
  partNeeded: string | null;
  /** The on-site assessment, line by line. Absent until it is saved. */
  assessmentLines?: AssessmentLine[];
  /** The linked return visit this job spawned, or the job that spawned this one. */
  returnOf: string | null;
  spawnedReturn: string | null;
  /** Signature captured on completion. */
  signed: boolean;
  completedAt: string | null;
  raisedBy: string;
  /**
   * THE ORDER'S CHANGE LOG (Pavan, 2026-09-23) — the same shape as a 3PL
   * order's `audit`: one entry per save that changed something, oldest first,
   * each change already in words ("Technician: — → Curtis Nwosu"). Written by
   * the screen on every change (`diffServiceOrder`), seeded for the fixture
   * from the facts each order already carries.
   */
  audit: ServiceAuditEntry[];
}

export interface ServiceAuditEntry {
  /** ISO instant of the save. */
  at: string;
  /** Who saved it. */
  by: string;
  /** One line per thing that changed, already in words. */
  changes: string[];
}

/**
 * WHAT IS WORTH WRITING DOWN — one audit entry (the list Pavan approved,
 * 2026-09-23). NOT every save: a log that records each pause in typing is one
 * nobody reads. It records what changes WHO is on the job, WHEN it happens,
 * WHAT IT COSTS, or WHAT STAGE it is at — with the old value and the new.
 * Notes, faults, intake source, contacts and the asset rows are not logged.
 */
export function diffServiceOrder(a: ServiceOrder, b: ServiceOrder): string[] {
  const out: string[] = [];
  const say = (label: string, from: unknown, to: unknown) => {
    if (String(from ?? "") === String(to ?? "")) return;
    out.push(`${label}: ${from || "—"} → ${to || "—"}`);
  };
  const tech = (id: string | null) => technicianById(id)?.name ?? "";

  /* STAGE — with the reason where the stage carries one. */
  if (a.status !== b.status) {
    if (b.status === "Parts pending") {
      const owed = shortfallLabel(b.parts);
      out.push(`Held for parts${owed ? ` · ${owed} owed` : ""}`);
    } else if (b.status === "Completed" && !a.completedAt && b.completedAt) {
      out.push("Work recorded");
    } else say("Status", a.status, b.status);
  }
  /* WHO. */
  say("Technician", tech(a.technicianId), tech(b.technicianId));
  /* WHEN. */
  const when = (r: ServiceOrder) =>
    r.scheduledAt ? `${r.scheduledAt.slice(0, 10)} ${r.scheduledAt.slice(11, 16)}${r.windowEndMin != null ? `–${String(Math.floor(r.windowEndMin / 60)).padStart(2, "0")}:${String(r.windowEndMin % 60).padStart(2, "0")}` : ""}` : "";
  say("Scheduled", when(a), when(b));
  /* THE VISITS — each one's start and end, who went and for how long. */
  for (const v of b.visits) {
    const was = a.visits.find((x) => x.startedAt === v.startedAt);
    if (!was) out.push(`Visit started · ${tech(v.technicianId) || "—"}`);
    if (v.endedAt && !was?.endedAt)
      out.push(`Visit ended · ${tech(v.technicianId) || "—"} · ${formatHours(visitHours(v))}`);
  }
  /* THE QUOTE. */
  if (!a.quote && b.quote) out.push(`Quote sent · ${money(b.quote.total)}`);
  if (!a.quote?.approvedAt && b.quote?.approvedAt) out.push("Quote approved");
  /* WHAT IT COSTS — the rate, a hand correction to the hours, and the
     bill's lines once the work is recorded (before that they are the plan,
     and the plan is still being written). */
  say("Labour rate", a.laborRate, b.laborRate);
  if (a.laborOverride !== b.laborOverride)
    out.push(
      b.laborOverride == null
        ? "Labour: back to the clock"
        : `Labour corrected: ${formatHours(b.laborOverride)}`
    );
  if (isRecorded(a.status)) {
    const parts = (r: ServiceOrder) => r.parts.map((p) => `${p.name || "?"} ×${p.qty}`).join(" · ");
    const lines = (xs: FeeLine[]) => xs.map((f) => `${f.name || "?"} ${money(f.amount)}`).join(" · ");
    say("Parts", parts(a), parts(b));
    say("Fees", lines(a.fees), lines(b.fees));
    say("Additional charges", lines(a.extraCharges), lines(b.extraCharges));
  }
  /* THE INVOICE. */
  if (!a.invoiceCreated && b.invoiceCreated) out.push("Invoice raised");
  if (!a.synced && b.synced) out.push("Invoice reviewed");
  /* URGENCY — only to or from Urgent; High ↔ Normal changes no plan. */
  if ((a.priority === "Urgent") !== (b.priority === "Urgent"))
    say("Priority", a.priority, b.priority);
  return out;
}

/**
 * THE FIXTURE'S HISTORY, from what each order already records with a time on
 * it — visits, the hold, the quote, completion, the invoice. Creation is put a
 * day before the booking: the fixture never stored when an order was raised,
 * and a log that begins with its second event reads as a log with a gap.
 */
function seedServiceAudit(r: ServiceOrder): ServiceAuditEntry[] {
  const tech = (id: string | null) => technicianById(id)?.name ?? "";
  const e: ServiceAuditEntry[] = [];
  const booked = r.scheduledAt ?? `${r.dateKey}T09:00:00`;
  e.push({
    at: new Date(new Date(booked).getTime() - 24 * 3_600_000).toISOString(),
    by: r.raisedBy,
    changes: [`Order created · ${r.source}`],
  });
  const firstTech = r.visits[0]?.technicianId ?? r.technicianId;
  if (firstTech)
    e.push({
      at: new Date(new Date(booked).getTime() - 20 * 3_600_000).toISOString(),
      by: "Dana Whitfield",
      changes: [`Technician: — → ${tech(firstTech)}`],
    });
  for (const v of r.visits) {
    e.push({ at: v.startedAt, by: tech(v.technicianId), changes: ["Visit started"] });
    if (v.endedAt)
      e.push({ at: v.endedAt, by: tech(v.technicianId), changes: [`Visit ended · ${formatHours(visitHours(v))}`] });
  }
  if (r.quote) {
    e.push({ at: r.quote.sentAt, by: "Dana Whitfield", changes: ["Quote sent"] });
    if (r.quote.approvedAt) e.push({ at: r.quote.approvedAt, by: r.customer, changes: ["Quote approved"] });
  }
  const last = r.visits[r.visits.length - 1];
  if (r.status === "Parts pending" && last?.endedAt)
    e.push({ at: last.endedAt, by: tech(last.technicianId), changes: [`Held for parts${shortfallLabel(r.parts) ? ` · ${shortfallLabel(r.parts)} owed` : ""}`] });
  if (r.completedAt && r.status !== "Parts pending")
    e.push({ at: r.completedAt, by: tech(r.technicianId), changes: ["Work recorded"] });
  if (r.invoicedAt) e.push({ at: r.invoicedAt, by: "Dana Whitfield", changes: ["Invoice raised"] });
  return e.sort((x, y) => x.at.localeCompare(y.at));
}

/* ----------------------------------------------------------------- money */

export const partsTotal = (parts: PartLine[]) =>
  parts.reduce((n, p) => n + p.cost * p.qty, 0);

/* ───────────────────────────────────────── parts that did not turn up ── */

/** How many of this line actually went on. Absent means all of them. */
export const fittedOf = (p: PartLine) => p.fittedQty ?? p.qty;

/** True once somebody has said this line was short. */
export const isShort = (p: PartLine) => fittedOf(p) < p.qty;

/**
 * WHAT WAS FITTED, AND WHAT IS STILL OWED — the same list, split in two.
 *
 * THE SPLIT IS THE WHOLE FEATURE. A job that needed five hoses and fitted
 * three is not "pending a part": it is a visit that did most of the work and
 * a debt of two hoses. The first order keeps what it did and what that cost;
 * the follow-up carries the debt and nothing else.
 *
 * A ZERO-QUANTITY LINE IS DROPPED from both sides rather than carried as a
 * line worth nothing — an invoice with "Hose 1\" ×0" on it is a line the
 * customer has to ask about.
 */
export function splitParts(parts: PartLine[]): {
  fitted: PartLine[];
  owed: PartLine[];
} {
  const fitted: PartLine[] = [];
  const owed: PartLine[] = [];
  for (const p of parts) {
    const got = Math.max(0, Math.min(p.qty, fittedOf(p)));
    if (got > 0) fitted.push({ ...p, qty: got, fittedQty: undefined });
    if (p.qty - got > 0) owed.push({ ...p, qty: p.qty - got, fittedQty: undefined });
  }
  return { fitted, owed };
}

/** The shortfall as a sentence — "2 × Hose 1\"", for a label or a fault line. */
export const shortfallLabel = (parts: PartLine[]) =>
  splitParts(parts)
    .owed.map((p) => `${p.qty} × ${p.name}`)
    .join(", ");
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
  /* TO THE MINUTE, NOT THE QUARTER HOUR. It used to round to quarters,
     because labour is BILLED in quarters and a raw 1.7383 is a figure nobody
     can check. That argument died the moment the figure was displayed as
     hours and minutes: "1 h 44 m" is perfectly checkable, and with the start
     and stop times on the same row a 55-minute visit rounded to "1 h 0 m"
     reads as a bug. (Changed 2026-09-23, when the visits table put the stamps
     next to the duration for the first time.) */
  return Math.round(ms / 60_000) / 60;
}

/**
 * HOURS AS HOURS AND MINUTES. `2.25` is how the money is worked out; `2 h
 * 15 m` is how long the job took, and those are two different sentences.
 *
 * A TECHNICIAN THINKS IN MINUTES (Pavan, 2026-09-23). Nobody comes off a job
 * saying "that was one point seven five hours", and asking them to convert is
 * asking them to make a rounding error on the invoice.
 */
export function splitHours(hours: number): { h: number; m: number } {
  const total = Math.max(0, Math.round(hours * 60));
  return { h: Math.floor(total / 60), m: total % 60 };
}

/** `2 h 15 m`, or `45 m` when there is no hour to print. */
export function formatHours(hours: number): string {
  const { h, m } = splitHours(hours);
  if (h === 0 && m === 0) return "0 m";
  if (h === 0) return `${m} m`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} m`;
}

/** Back the other way, for the two number fields. */
export const joinHours = (h: number, m: number) =>
  Math.max(0, h) + Math.max(0, Math.min(59, m)) / 60;

/**
 * KEEP THE MIRRORED ASSET FIELDS TRUE. Call it after any write to `assets`.
 *
 * ONE PLACE, ON PURPOSE. A mirror maintained at each call site is a mirror
 * that is wrong at one of them, and the failure is silent — a board card
 * naming an asset the order no longer has.
 */
export function syncPrimaryAsset<T extends { assets: ServiceAssetLine[] }>(
  o: T
): T & Pick<ServiceOrder, "assetId" | "assetName" | "assetType" | "workType" | "fault"> {
  const first = o.assets[0];
  return {
    ...o,
    assetId: first?.assetId ?? "",
    assetName: first?.assetName ?? "",
    assetType: first?.assetType ?? "",
    workType: first?.workType ?? "",
    fault: first?.fault ?? "",
  };
}

/* ──────────────────────────────────────────────────────────── the visits ── */

/** What ONE visit comes to — what somebody typed, or what its clock said. */
export const visitHours = (v: ServiceVisit) =>
  v.override ?? computedLabor(v.startedAt, v.endedAt);

/** The sum of the trips. This is the figure every total reads. */
export const totalVisitHours = (visits: ServiceVisit[]) =>
  visits.reduce((n, v) => n + visitHours(v), 0);

/** The one that is still running, if any. Only ever the last. */
export const openVisit = (visits: ServiceVisit[]) =>
  visits.length > 0 && visits[visits.length - 1].endedAt === null
    ? visits[visits.length - 1]
    : null;

/**
 * KEEP THE MIRRORED CLOCK AND THE TOTAL TRUE. Call it after any write to
 * `visits`.
 *
 * ONE PLACE, ON PURPOSE — the same discipline `syncPrimaryAsset` follows. A
 * mirror maintained at each call site is a mirror that is wrong at one of
 * them, and the failure is silent: a timer counting from a visit that ended
 * on Tuesday.
 */
export function syncVisits<T extends { visits: ServiceVisit[] }>(o: T) {
  const last = o.visits[o.visits.length - 1];
  return {
    ...o,
    startedAt: last?.startedAt ?? null,
    completedAt: last?.endedAt ?? null,
    labor: Math.round(totalVisitHours(o.visits) * 60) / 60,
  };
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
    o.labor * o.laborRate +
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
export { money };

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

/**
 * THE SAME THREE STALLS AS LINES, for a Parts-pending job whose work type has
 * no parts in the book (a leak check, a tank swap). Without them the order's
 * Parts table said "No parts on this job" beside a status that says it is
 * waiting on one. Same index as `PARTS_NEEDED`, so the line matches the reason.
 */
const PARTS_OWED: PartLine[] = [
  { name: "2-inch pump seal", qty: 2, cost: 45, fittedQty: 0 },
  { name: "Sight gauge", qty: 1, cost: 60, fittedQty: 0 },
  { name: "Meter head", qty: 1, cost: 180, fittedQty: 0 },
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

  /* EVERY LANE HOLDS SOMETHING, AND EVERY STATUS APPEARS. A board whose fifth
     column is always empty is a board nobody believes; a status reachable
     only by a sequence of presses is a status nobody has reviewed. */
  const spread: WorkStatus[] = [
    "Drafted",
    "Assigned",
    "Ongoing",
    "Assigned",
    "Needs approval",
    "Parts pending",
    "Completed",
    "Drafted",
    "Reviewed",
    "Yet to start",
    "Needs approval",
    "Completed — linked",
    "Ongoing",
    "Yet to be reviewed",
    "Cancelled",
    "Linked order",
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
      LANE_OF[status] === "Open"
        ? null
        : ACTIVE_TECHNICIANS[i % ACTIVE_TECHNICIANS.length].id;

    /* EVERY SIXTH JOB IS LEFT UNSCHEDULED, because "dispatch it when you can"
       is a real answer the intake form offers and the board has to be able to
       show it. Never on a job already under way — a technician cannot have
       arrived at a visit nobody booked. */
    const scheduled =
      LANE_OF[status] === "Open" && i % 6 === 0
        ? null
        : (() => {
            const at = new Date(day);
            /* ON THE HALF HOUR, because that is the grid the time picker
               offers. A stored value the picker cannot represent shows in the
               field and vanishes the moment anybody opens it. */
            at.setHours(hour, (i % 2) * 30, 0, 0);
            return at.toISOString();
          })();

    /* "PARTS PENDING" HAS BEEN VISITED AND IS STILL IN OPEN. It is the one
       status that is both — a job that could not be finished and went back
       for somebody to take the next trip — so the seed has to give it an
       arrival like any other worked job. */
    const started =
      status === "Parts pending" ||
      (LANE_OF[status] !== "Open" && status !== "Assigned" && status !== "Cancelled");
    const recorded = isRecorded(status);
    const billed = LANE_OF[status] === "Completed" || LANE_OF[status] === "Synced";

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
      : status === "Parts pending"
        ? /* FIVE OF TEN, ON THE RECORD. A Parts-pending order whose lines all
             came back full would be a stall with nothing outstanding — the
             fitted quantity is the whole reason it is still open. */
          book.parts.length > 0
          ? book.parts.map((p, k) => ({
              ...p,
              qty: Math.max(2, p.qty * 2),
              fittedQty: k === 0 ? Math.max(1, p.qty) : 0,
            }))
          : [{ ...PARTS_OWED[i % PARTS_OWED.length] }]
        : book.parts.map((p) => ({ ...p }));

    const fees: FeeLine[] = book.fees.map((f) => ({ ...f }));
    /* After-hours is the commonest fee a technician adds on site. */
    if (recorded && i % 7 === 0) fees.push({ name: "After-hours callout", amount: 75 });

    /* WORK BEGINS AFTER THE ARRIVAL, not at it — the gap is the walk round the
       asset and, on a quoted job, the wait for the customer's answer.

       A JOB STILL RUNNING STARTED TODAY. The elapsed clock on the order sheet
       counts from here, and a fixture that started an In-progress job on the
       scheduled day made it read "49 h 50 m" — true of the data and useless
       as a picture of the state, because no job runs for two days. A running
       job is seeded from NOW, between twenty minutes and three hours ago. */
    const startedAt = !started
      ? null
      : status === "Ongoing"
        ? new Date(Date.now() - (20 + (i % 9) * 20) * 60_000).toISOString()
        : arrivedAt
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
    /* LABOUR IS THE SUM OF THE TRIPS. It is written here because every total
       reads it; `syncVisits` is what keeps it true after any later edit. */
    const labor = 0;

    out.push(syncVisits({
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
      assets: [
        {
          assetId: asset.id,
          assetName: asset.name,
          assetType: asset.assetType,
          workType,
          fault: faults[i % faults.length],
        },
        /* EVERY NINTH VISIT COVERS A SECOND ASSET, so the table has more than
           one row in it from the first load. A fixture with only the
           single-asset case is how a list ships untested. */
        ...(i % 9 === 0
          ? [
              {
                assetId: `${asset.id}-b`,
                assetName: `${asset.name.replace(/\d+$/, "").trim()} ${Number(asset.name.match(/\d+$/)?.[0] ?? 0) + 1}`,
                assetType: asset.assetType,
                workType: WORK_TYPE_NAMES[(i + 3) % WORK_TYPE_NAMES.length],
                fault: faults[(i + 2) % faults.length],
              },
            ]
          : []),
      ],
      assetType: asset.assetType,
      workType,
      fault: faults[i % faults.length],
      dateKey: dateKeyOf(day),
      scheduledAt: scheduled,
      /* A THREE-HOUR SLOT BY DEFAULT, wide enough to be honest about a yard
         team's day and narrow enough to be a promise. */
      windowEndMin: scheduled
        ? (new Date(scheduled).getHours() + 3) * 60
        : null,
      technicianId,
      arrivedAt,
      /* THE TRIPS THIS JOB HAS TAKEN. One for most; TWO for a Parts-pending
         order, because that is exactly what it is — a job that was visited,
         could not be finished, and is waiting for the next trip. A fixture
         with only single-visit jobs would leave the accumulating total
         untested. */
      visits: !startedAt
        ? []
        : status === "Parts pending"
          ? [
              /* TWO TRIPS, TWO PEOPLE. A Parts-pending order has nobody on it
                 NOW — it is in Open — but somebody was on each of the visits
                 that happened, and on a second trip it is usually not the
                 same somebody. A fixture where both visits name one person
                 would leave the card's "earlier visit" line untested. */
              {
                startedAt: new Date(new Date(startedAt).getTime() - 26 * 3_600_000).toISOString(),
                endedAt: new Date(new Date(startedAt).getTime() - 24.5 * 3_600_000).toISOString(),
                technicianId: ACTIVE_TECHNICIANS[i % ACTIVE_TECHNICIANS.length].id,
                override: null,
              },
              {
                startedAt,
                endedAt: new Date(new Date(startedAt).getTime() + 55 * 60_000).toISOString(),
                technicianId:
                  ACTIVE_TECHNICIANS[(i + 2) % ACTIVE_TECHNICIANS.length].id,
                override: null,
              },
            ]
          : [
              {
                startedAt,
                endedAt: completedAt,
                technicianId,
                override: laborOverride,
              },
            ],
      startedAt,
      assessment:
        started && i % 3 !== 0
          ? ASSESSMENTS[i % ASSESSMENTS.length]
          : null,
      techNotes:
        recorded && i % 4 === 0 ? TECH_NOTES[i % TECH_NOTES.length] : null,
      parts,
      labor,
      laborOverride,
      laborRate: LABOR_RATE,
      mileage,
      fees,
      quote,
      extraCharges: [],
      invoiceCreated: billed,
      invoicedAt: billed ? completedAt : null,
      /* REVIEWED IS WHAT SYNCED MEANS. An invoice raised but not yet looked
         at is exactly the state "Yet to be reviewed" holds. */
      synced: status === "Reviewed",
      partNeeded:
        status === "Parts pending" ? PARTS_NEEDED[i % PARTS_NEEDED.length] : null,
      returnOf: null,
      spawnedReturn: null,
      signed: recorded,
      completedAt,
      raisedBy: RAISED_BY[i % RAISED_BY.length],
      audit: [],
    }));
  }
  return out;
}

/* ─────────────────────────── shared by every place that makes an order ──
   The dispatch sheet and the technician's app both create orders; they read
   the same lists and start from the same blank so the two cannot drift. */

/** Customers with at least one placed asset — the only ones serviceable. */
export const SERVICE_CUSTOMERS: string[] = Array.from(
  new Set(RENTAL_ASSETS.map((a) => a.customer).filter(Boolean) as string[])
).sort();

/*
  DUMMY SHIP-TOS, 3 TO 10 PER CUSTOMER (Pavan, 2026-09-24). The only sites
  the fixture knew were the ones a rental asset happened to sit at, so most
  customers had one or none and the order form's Ship-to list came up empty.
  The real sites come first; the rest are invented, deterministic (a hash of
  the name, never a random draw), and FLAGGED AS DUMMY here.
*/
const SITE_KINDS = ["Yard", "Depot", "Terminal", "Site", "Plant", "Station", "Shop", "Lot"];
const SITE_PLACES: { city: string; state: string }[] = [
  { city: "Fresno", state: "CA" }, { city: "Bakersfield", state: "CA" }, { city: "Stockton", state: "CA" },
  { city: "Reno", state: "NV" }, { city: "Phoenix", state: "AZ" }, { city: "Salt Lake City", state: "UT" },
  { city: "Boise", state: "ID" }, { city: "Portland", state: "OR" }, { city: "Sacramento", state: "CA" },
  { city: "Las Vegas", state: "NV" },
];
const hashOf = (text: string) => Array.from(text).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

const SHIP_TOS: Record<string, { name: string; city: string; state: string }[]> = (() => {
  const out: Record<string, { name: string; city: string; state: string }[]> = {};
  const customers = Array.from(new Set(RENTAL_ASSETS.map((a) => a.customer).filter(Boolean) as string[]));
  for (const c of customers) {
    const real = Array.from(
      new Map(
        RENTAL_ASSETS.filter((a) => a.customer === c && a.shipTo).map((a) => [
          a.shipTo as string,
          { name: a.shipTo as string, city: a.city ?? "", state: a.state ?? "" },
        ])
      ).values()
    );
    const h = hashOf(c);
    const want = 3 + (h % 8);
    const stem = c.split(/[ ,]/)[0];
    const list = [...real];
    for (let k = 0; list.length < want; k++) {
      const name = `${stem} ${SITE_KINDS[(h + k) % SITE_KINDS.length]} ${k + 2}`;
      if (list.some((x) => x.name === name)) continue;
      const place = SITE_PLACES[(h + k * 3) % SITE_PLACES.length];
      list.push({ name, ...place });
    }
    out[c] = list;
  }
  return out;
})();

export const shipTosOf = (customer: string): string[] =>
  (SHIP_TOS[customer] ?? []).map((x) => x.name);

/** A ship-to's city and state — from its real asset, or its dummy place. */
export const shipToPlace = (shipTo: string): { city: string; state: string } => {
  for (const list of Object.values(SHIP_TOS)) {
    const hit = list.find((x) => x.name === shipTo);
    if (hit) return { city: hit.city, state: hit.state };
  }
  return { city: "", state: "" };
};

export const assetsAt = (shipTo: string) =>
  RENTAL_ASSETS.filter((a) => a.shipTo === shipTo).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.assetType,
  }));

const keyOfDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A blank order, booked for 9 tomorrow, with the price book's lines if it is on. */
export function blankServiceOrder(opts: {
  priceBook: boolean;
  defaultMileage: number;
  raisedBy: string;
  technicianId?: string | null;
  source?: IntakeSource;
}): ServiceOrder {
  const workType = WORK_TYPE_NAMES[0];
  const book = WORK_TYPES[workType];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return {
    id: "so-new",
    orderNo: "—",
    status: "Drafted",
    source: opts.source ?? INTAKE_SOURCES[0],
    priority: "Normal",
    customer: "",
    shipTo: "",
    city: "",
    state: "",
    assetId: "",
    assetName: "",
    assets: [{ assetId: "", assetName: "", assetType: "", workType, fault: "" }],
    assetType: "",
    workType,
    fault: "",
    dateKey: keyOfDay(tomorrow),
    scheduledAt: tomorrow.toISOString(),
    windowEndMin: (tomorrow.getHours() + 3) * 60,
    technicianId: opts.technicianId ?? null,
    arrivedAt: null,
    visits: [],
    startedAt: null,
    assessment: null,
    techNotes: null,
    parts: opts.priceBook ? book.parts.map((p) => ({ ...p })) : [],
    labor: 0,
    laborOverride: null,
    laborRate: LABOR_RATE,
    mileage: opts.defaultMileage,
    fees: opts.priceBook ? book.fees.map((f) => ({ ...f })) : [],
    quote: null,
    extraCharges: [],
    invoiceCreated: false,
    invoicedAt: null,
    synced: false,
    partNeeded: null,
    returnOf: null,
    spawnedReturn: null,
    signed: false,
    completedAt: null,
    raisedBy: opts.raisedBy,
    audit: [],
  };
}

/**
 * A TICKET RAISED ON SITE (Pavan, 2026-09-24): a new order for the same
 * customer and site, the technician on it, booked for now, linked back to
 * the order it was raised on. Only the services and fees are the
 * technician's.
 */
export function ticketFrom(
  from: ServiceOrder,
  req: { assets: ServiceAssetLine[]; fees: FeeLine[] },
  orderNo: string,
  by: string
): ServiceOrder {
  const now = new Date();
  const first = req.assets[0];
  return {
    ...blankServiceOrder({ priceBook: false, defaultMileage: 0, raisedBy: by, technicianId: from.technicianId, source: "Flagged inspection" }),
    id: `so-t-${orderNo}`,
    orderNo,
    status: "Assigned",
    priority: from.priority,
    customer: from.customer,
    shipTo: from.shipTo,
    city: from.city,
    state: from.state,
    assets: req.assets,
    assetId: first?.assetId ?? "",
    assetName: first?.assetName ?? "",
    assetType: first?.assetType ?? "",
    workType: first?.workType ?? "",
    fault: first?.fault ?? "",
    fees: req.fees,
    scheduledAt: now.toISOString(),
    dateKey: keyOfDay(now),
    windowEndMin: now.getHours() * 60 + now.getMinutes() + 120,
    returnOf: from.orderNo,
    audit: [{ at: now.toISOString(), by, changes: [`Order created on site · from ${from.orderNo}`] }],
  };
}

/** When the order was raised — the first entry of its log. */
export const createdAtOf = (o: ServiceOrder): string =>
  o.audit[0]?.at ?? o.scheduledAt ?? `${o.dateKey}T00:00:00`;

export const SERVICE_ORDERS: ServiceOrder[] = buildOrders().map((r) => ({
  ...r,
  audit: seedServiceAudit(r),
}));

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
    if (isUnassigned(r.status) !== (r.technicianId === null)) {
      problems.push(`${r.orderNo}: ${r.status} and its technician disagree`);
    }
    /* ARRIVAL IS WHAT STARTS THE WORK. Nothing past Assigned can be without
       it, and nothing before it can have one. */
    /* NOTHING IN OPEN OR ASSIGNED HAS BEEN VISITED — WITH ONE EXCEPTION.
       "Parts pending" is an order that WAS visited, could not be finished,
       and went back to Open for somebody to take the next trip. It is the
       only status that is both unassigned and already worked on, and that is
       the whole shape of a partial visit. */
    const started =
      r.status === "Parts pending" ||
      (!isUnassigned(r.status) && r.status !== "Assigned");
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
    /* A RECORDED JOB HAS A FINISHED VISIT — but the converse is NOT true any
       more, and that is the point of visits. "Parts pending" has a finished
       visit and is not a finished job: `completedAt` is now the mirror of the
       LAST VISIT'S END, which answers "when did somebody last leave site",
       not "is this done". The status is the only thing that answers the
       second, and it should not be inferred from a timestamp. */
    if (isRecorded(r.status) && !r.visits.some((v) => v.endedAt !== null)) {
      problems.push(`${r.orderNo}: ${r.status} with no finished visit`);
    }
    /* NOTHING UNVISITED HAS A VISIT. Parts pending is the exception on the
       other side — it is in Open and has been visited. */
    if (r.visits.length > 0 && !started) {
      problems.push(`${r.orderNo}: ${r.status} with a visit on it`);
    }
    /* THE INVOICE FOLLOWS THE VISIT, and the sync follows the invoice. BOTH
       Completed statuses are past the visit — "Completed — linked" is a
       finished job that happened to spawn a remainder, and the remainder is a
       different order with its own invoice. */
    const billed =
      LANE_OF[r.status] === "Synced" || LANE_OF[r.status] === "Completed";
    if (billed !== r.invoiceCreated) {
      problems.push(`${r.orderNo}: ${r.status} and its invoice disagree`);
    }
    if (r.synced && !r.invoiceCreated) {
      problems.push(`${r.orderNo}: synced without an invoice`);
    }
    if ((r.status === "Reviewed") !== r.synced) {
      problems.push(`${r.orderNo}: Completed means the invoice reached accounting`);
    }
    /* THE VISITS AND THE MIRRORED CLOCK AGREE. `startedAt` and `completedAt`
       are the LAST visit's ends, and `labor` is the sum of them all — three
       facts derived from one list, which is three chances for a call site to
       have written one of them by hand. */
    const last = r.visits[r.visits.length - 1];
    if ((last?.startedAt ?? null) !== r.startedAt) {
      problems.push(`${r.orderNo}: startedAt does not match the last visit`);
    }
    if ((last?.endedAt ?? null) !== r.completedAt) {
      problems.push(`${r.orderNo}: completedAt does not match the last visit`);
    }
    if (Math.abs(totalVisitHours(r.visits) - r.labor) > 0.02) {
      problems.push(`${r.orderNo}: labour is not the sum of its visits`);
    }
    /* ONLY THE LAST VISIT MAY BE RUNNING. An open visit earlier in the list
       is a clock nobody will ever stop. */
    if (r.visits.some((v, i) => v.endedAt === null && i !== r.visits.length - 1)) {
      problems.push(`${r.orderNo}: a visit before the last one is still running`);
    }

    /* A STALL HAS A REASON, and only a stall has one. */
    if ((r.status === "Parts pending") !== (r.partNeeded !== null)) {
      problems.push(`${r.orderNo}: hold reason and status disagree`);
    }
    /* A QUOTE CANNOT CONTAIN WHAT NOBODY KNEW WHEN IT WAS SENT. */
    if (r.quote && r.quote.total !== quoteableTotal(r.quote.parts, r.quote.fees)) {
      problems.push(`${r.orderNo}: the quote's total does not match its lines`);
    }
    if (r.quote && !isRecorded(r.status) && r.status !== "Parts pending") {
      problems.push(`${r.orderNo}: a quote on a job that has not been worked`);
    }
  }
  return problems;
}
