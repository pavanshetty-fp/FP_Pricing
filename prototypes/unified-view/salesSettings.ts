import type { PillColor } from "@/components/ui/pill";
import * as React from "react";
import { toast } from "sonner";
import { FUEL_ORDER_STAGES, stageAfterDriver } from "./data";
import { KIND_TONE, type StatusKind } from "./statusKind";
import type { StatusTone } from "@/components/ui/status-chip";
import type { LaneColor } from "./threepl/BrokerBoard";
import { ASSET_TYPES, SALES_REPS } from "./assetOrders";
import { MARKETS } from "./quotes";

/*
  THE SALES MODULE'S SETTINGS (Pavan, 2026-10-07).

  ONE OWNER, OUTSIDE EVERY SCREEN — `quoteStore`'s pattern. The settings page
  and the sheets are never mounted together, so a field hidden on the page has
  to reach a sheet opened later from Orders; a screen's own state is thrown
  away the moment the reader leaves it.

  EVERY CHANGE IS KEPT AS IT IS MADE. There is no Save: a setting that waits
  for a button is one somebody walks away from half-set.

  KEPT ACROSS A RELOAD (Pavan, 2026-10-07 — "fix it all", G). Written to
  localStorage on every change; every read and write is in a try/catch, and
  anything that does not read back as settings falls back to the defaults.
*/

export type SalesFormKind = "fuel" | "asset" | "quote";

export type FieldType = "Text" | "Number" | "Select" | "Date" | "Toggle" | "File";

/** The types a field can be switched to. File comes only from the library. */
export const FIELD_TYPES: FieldType[] = ["Text", "Number", "Select", "Date", "Toggle"];

/* LOVABLE'S CAP (Pavan, 2026-10-07): fields IN USE — the ones a sheet draws —
   against 15. An add past it is refused, and so is showing a hidden one. */
export const FIELD_LIMIT = 15;

export interface FormField {
  key: string;
  label: string;
  section: string;
  type: FieldType;
  required: boolean;
  visible: boolean;
  /* WHAT THE RECORD CANNOT EXIST WITHOUT — always shown, always required, and
     its type is the record's, so none of the three is offered. */
  locked?: boolean;
  /* `built-in` rows are the sheet's own fields and can be hidden but not
     removed; `library` and `custom` rows were added here and can go. */
  source: "built-in" | "library" | "custom";
  /** A built-in field's own control is drawn only while `type` is this. */
  nativeType?: FieldType;
  /** A Select's choices. New ones can be typed in the sheet. */
  options?: string[];
}

export interface LibraryField {
  key: string;
  label: string;
  type: FieldType;
  /** Lovable's section — where it lands, editable afterwards. */
  section: string;
  options?: string[];
  /** Built-in keys that are the same field — a form with one is not offered it. */
  same?: string[];
}

const field = (
  key: string,
  label: string,
  section: string,
  type: FieldType,
  locked = false
): FormField => ({
  key,
  label,
  section,
  type,
  nativeType: type,
  required: locked,
  visible: true,
  locked: locked || undefined,
  source: "built-in",
});

/* THE FUEL ORDER SHEET'S FIELDS, in its order. The product table is two
   rows — product and quantity — because those are its two columns; the table
   is drawn where the first of them sits. */
const FUEL_FIELDS: FormField[] = [
  field("orderType", "Order type", "Order details", "Select"),
  field("customer", "Customer", "Order details", "Select", true),
  field("shipTo", "Ship-to", "Order details", "Select", true),
  field("driver", "Driver", "Order details", "Select"),
  field("planDate", "Plan date", "Schedule", "Date"),
  field("planTime", "Plan time", "Schedule", "Text"),
  field("urgent", "Mark as urgent", "Schedule", "Toggle"),
  field("product", "Product", "Product details", "Select", true),
  field("quantity", "Quantity", "Product details", "Number", true),
  field("tags", "Tags", "Tags", "Select"),
  field("site", "Site", "Delivery details", "Select"),
  field("note", "Note", "Delivery details", "Text"),
];

/* THE ASSET ORDER SHEET'S. Status is locked because on an asset order it is
   a field, and the order has to have one. */
const ASSET_FIELDS: FormField[] = [
  field("customer", "Customer", "Order details", "Select", true),
  field("shipTo", "Ship-to", "Order details", "Select", true),
  field("salesRep", "Sales rep", "Order details", "Select"),
  field("status", "Status", "Order details", "Select", true),
  field("assetType", "Asset type", "Asset", "Select", true),
  field("quantity", "Quantity", "Asset", "Number", true),
  field("serialNo", "Serial no", "Asset", "Text"),
  field("deliveryDate", "Delivery date", "Schedule", "Date"),
  field("poNumber", "PO number", "Reference", "Text"),
  field("note", "Note", "Reference", "Text"),
];

/* THE QUOTE SHEET'S (Pavan, 2026-10-07). Everything a quote is priced and
   sent from is locked; the notes are not. Products and Pricing are its two
   tables. */
const QUOTE_FIELDS: FormField[] = [
  field("customer", "Customer", "Customer & delivery", "Select", true),
  field("shipTo", "Ship-to", "Customer & delivery", "Select", true),
  field("email", "Customer email", "Customer & delivery", "Text", true),
  field("validThrough", "Valid through", "Customer & delivery", "Date", true),
  field("market", "Market", "Product & market", "Select", true),
  field("products", "Products", "Product & market", "Select", true),
  field("pricing", "Pricing", "Pricing breakdown", "Number", true),
  field("notes", "Customer notes", "Pricing breakdown", "Text"),
];

const TAG_OPTIONS = ["Keep Full", "Rush", "Night", "Weekend", "Split Load", "Hazmat", "After Hours"];

/* THE FIELD LIBRARY — Lovable's whole list (Pavan, 2026-10-07), with
   Lovable's sections. A form is offered what it does not already have. The
   choices on the selects are INVENTED samples; more can be typed. */
export const FIELD_LIBRARY: LibraryField[] = [
  { key: "jobType", label: "Job type", type: "Select", section: "Order", options: ["Delivery", "Extraction", "Install", "Service"] },
  { key: "pickupHub", label: "Pickup hub", type: "Select", section: "Logistics", options: ["Houston Hub", "Dallas Hub", "San Antonio Hub"] },
  { key: "dropoffSite", label: "Drop-off site", type: "Select", section: "Logistics", options: [] },
  { key: "preferredCarrier", label: "Preferred carrier", type: "Select", section: "Logistics", options: ["Cardinal Logistics", "Ironline Transit"] },
  { key: "fuelSurcharge", label: "Fuel surcharge %", type: "Number", section: "Freight" },
  { key: "accessorialNotes", label: "Accessorial notes", type: "Text", section: "Freight" },
  { key: "customerPo", label: "Customer PO", type: "Text", section: "Billing", same: ["poNumber"] },
  { key: "salesRep", label: "Sales rep", type: "Select", section: "Sales", options: SALES_REPS },
  { key: "assetTankType", label: "Asset / tank type", type: "Select", section: "Product", options: ASSET_TYPES, same: ["assetType"] },
  { key: "capacityGal", label: "Capacity (gal)", type: "Number", section: "Product" },
  { key: "monthlyRate", label: "Monthly rate", type: "Number", section: "Terms" },
  { key: "leaseTerm", label: "Lease term (months)", type: "Number", section: "Terms" },
  { key: "contractedGallons", label: "Contracted gallons / mo", type: "Number", section: "ROI" },
  { key: "installCost", label: "Install cost", type: "Number", section: "ROI" },
  { key: "autoRenew", label: "Auto-renew", type: "Toggle", section: "Terms" },
  { key: "insuranceOnFile", label: "Insurance on file", type: "Toggle", section: "Terms" },
  { key: "market", label: "Market", type: "Select", section: "Scope", options: MARKETS },
  { key: "businessLine", label: "Business line", type: "Select", section: "Scope", options: ["Fuel", "Lubricants", "Equipment"] },
  { key: "indexBasis", label: "Index basis (OPIS / rack)", type: "Select", section: "Basis", options: ["OPIS", "Rack"] },
  { key: "differential", label: "Differential (cpg)", type: "Number", section: "Basis" },
  { key: "freightAdder", label: "Freight adder (cpg)", type: "Number", section: "Basis" },
  { key: "marginFloor", label: "Margin floor (cpg)", type: "Number", section: "Guardrails" },
  { key: "maxDiscount", label: "Max discount (cpg)", type: "Number", section: "Guardrails" },
  { key: "effectiveDate", label: "Effective date", type: "Date", section: "Publish" },
  { key: "shipTo", label: "Ship-to", type: "Select", section: "Order", options: [] },
  { key: "terminal", label: "Terminal", type: "Select", section: "Logistics", options: ["Pasadena Terminal", "Irving Terminal"] },
  { key: "supplier", label: "Supplier", type: "Select", section: "Logistics", options: ["Valero", "Motiva", "Shell"] },
  { key: "recurring", label: "Mark as recurring", type: "Toggle", section: "Order" },
  { key: "tags", label: "Tags", type: "Select", section: "Order", options: TAG_OPTIONS },
  { key: "attachments", label: "Attachments", type: "File", section: "Custom" },
  { key: "internalNotes", label: "Internal notes", type: "Text", section: "Custom" },
];

/** What the library offers a form — less what the form already has. */
export function libraryFor(fields: FormField[]): LibraryField[] {
  const have = new Set(fields.map((f) => f.key));
  return FIELD_LIBRARY.filter((l) => !have.has(l.key) && !(l.same ?? []).some((k) => have.has(k)));
}

/* ---------------------------------------------------------- workflow --- */

/** The five stages the order model is built on — never removed. */
export const CORE_STAGES = FUEL_ORDER_STAGES;

export interface StageRule {
  /** The stage as stored on an order — a core stage's own name, or `stage-…`. */
  id: string;
  /** What every screen prints. Renamed here, renamed everywhere. */
  label: string;
  approval: boolean;
  /* NULL ON THE TWO STAGES AN ORDER ENDS IN. A time limit is how long an
     order may sit in a stage before it is late; Delivered and Canceled are
     never left, so nothing can be late in them. */
  slaHours: number | null;
  /** THE TAG'S COLOUR (Pavan, 2026-10-09). Null = the stage's kind colour. */
  color?: PillColor | null;
}

/* THE ORDER TYPES AS TAGS, each with a colour of its own (Pavan, 2026-10-09). */
export interface TypeTag {
  label: string;
  color: PillColor;
}
export const DEFAULT_TYPE_TAGS: TypeTag[] = [
  { label: "Delivery", color: "cyan" },
  { label: "Extraction", color: "orange" },
  { label: "Asset order", color: "violet" },
];

/* ---------------------------------------------------- notifications --- */

export interface NotificationRule {
  key: string;
  event: string;
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

/* THE EVENTS THERE ARE (Pavan, 2026-10-07). The rows on the page are the
   ones being routed; an event can be added back from here. Which of them
   actually fire in the prototype is said in `notify`'s callers. */
export const NOTIFICATION_EVENTS: { key: string; event: string }[] = [
  { key: "created", event: "Order created" },
  { key: "urgent", event: "Urgent order created" },
  { key: "noDriver", event: "Scheduled order without driver" },
  { key: "approval", event: "Approval requested" },
  { key: "dispatched", event: "Order dispatched" },
  { key: "delivered", event: "Order delivered" },
  { key: "canceled", event: "Order canceled" },
  { key: "overSla", event: "Order over SLA" },
  { key: "digest", event: "Daily order digest" },
  { key: "quoteSent", event: "Quote sent" },
  { key: "quoteAccepted", event: "Quote accepted" },
  { key: "quoteExpired", event: "Quote expired" },
];

/* ----------------------------------------------------- preferences --- */

export const TIME_ZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
] as const;

export const UNITS = ["Gallons", "Litres", "Drums"] as const;
export type SalesUnit = (typeof UNITS)[number];

/** The unit as a quantity prints it — `1,200 gal`. A label, not a conversion. */
export const UNIT_SHORT: Record<SalesUnit, string> = {
  Gallons: "gal",
  Litres: "L",
  Drums: "drums",
};

export interface SalesSettings {
  forms: Record<SalesFormKind, FormField[]>;
  stages: StageRule[];
  typeTags: TypeTag[];
  notifications: NotificationRule[];
  timeZone: (typeof TIME_ZONES)[number];
  unit: SalesUnit;
  autoAssignOwner: boolean;
  requireAcceptedQuote: boolean;
}

/* The SLAs and the notification defaults are INVENTED — a sensible start, not
   anything a customer asked for. */
const TERMINAL = ["Delivered", "Canceled"];
const SLA: Record<string, number> = { Requested: 24, Scheduled: 48, Dispatched: 8 };
/* STATUS COLOURS PAVAN SET (2026-10-09): Scheduled yellow, Dispatched blue;
   Requested, Delivered and Canceled keep their kind's colour. */
const STAGE_COLOR: Record<string, PillColor> = { Scheduled: "yellow", Dispatched: "blue" };

export const DEFAULT_SALES_SETTINGS: SalesSettings = {
  forms: { fuel: FUEL_FIELDS, asset: ASSET_FIELDS, quote: QUOTE_FIELDS },
  stages: CORE_STAGES.map((stage) => ({
    id: stage,
    label: stage,
    approval: false,
    slaHours: TERMINAL.includes(stage) ? null : (SLA[stage] ?? null),
    color: STAGE_COLOR[stage] ?? null,
  })),
  typeTags: DEFAULT_TYPE_TAGS,
  notifications: [
    { key: "urgent", event: "Urgent order created", inApp: true, email: true, sms: true },
    { key: "noDriver", event: "Scheduled order without driver", inApp: true, email: true, sms: false },
    { key: "delivered", event: "Order delivered", inApp: true, email: false, sms: false },
    { key: "canceled", event: "Order canceled", inApp: true, email: true, sms: false },
    { key: "digest", event: "Daily order digest", inApp: false, email: true, sms: false },
    { key: "quoteAccepted", event: "Quote accepted", inApp: true, email: true, sms: false },
    { key: "quoteExpired", event: "Quote expired", inApp: true, email: false, sms: false },
  ],
  timeZone: "America/Chicago",
  unit: "Gallons",
  autoAssignOwner: true,
  requireAcceptedQuote: false,
};

/* ------------------------------------------------------- the store --- */

const STORAGE_KEY = "fp-ds.sales-settings.v2";

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/* WHAT COMES BACK IS CHECKED, PIECE BY PIECE. A key that does not read as its
   default's shape is the default — an old or hand-edited entry can cost a
   setting, never the page. */
function revive(raw: unknown): SalesSettings {
  const d = DEFAULT_SALES_SETTINGS;
  if (!isObj(raw)) return d;
  const fieldOk = (f: unknown) =>
    isObj(f) &&
    typeof f.key === "string" &&
    typeof f.label === "string" &&
    typeof f.section === "string" &&
    typeof f.type === "string" &&
    typeof f.required === "boolean" &&
    typeof f.visible === "boolean";
  const forms = { ...d.forms };
  if (isObj(raw.forms)) {
    for (const k of Object.keys(d.forms) as SalesFormKind[]) {
      const list = raw.forms[k];
      /* "PoC at Delivery" LEFT THE FORM (Pavan, 2026-10-29) — POC details is a
         card now; a saved form that still lists it drops it. */
      if (Array.isArray(list) && list.every(fieldOk))
        forms[k] = (list as FormField[]).filter((f) => !(f.source === "built-in" && f.key === "poc"));
    }
  }
  const stagesOk =
    Array.isArray(raw.stages) &&
    raw.stages.every((s) => isObj(s) && typeof s.id === "string" && typeof s.label === "string") &&
    CORE_STAGES.every((c) => (raw.stages as StageRule[]).some((s) => s.id === c));
  const notesOk =
    Array.isArray(raw.notifications) &&
    raw.notifications.every((n) => isObj(n) && typeof n.key === "string" && typeof n.event === "string");
  /* A STAGE SAVED BEFORE COLOURS EXISTED takes the default colour. */
  const stages = stagesOk
    ? (raw.stages as StageRule[]).map((r) =>
        r.color === undefined ? { ...r, color: STAGE_COLOR[r.id] ?? null } : r
      )
    : d.stages;
  const typeTagsOk =
    Array.isArray(raw.typeTags) &&
    raw.typeTags.every((t) => isObj(t) && typeof t.label === "string" && typeof t.color === "string");
  return {
    forms,
    stages,
    typeTags: typeTagsOk ? (raw.typeTags as TypeTag[]) : d.typeTags,
    notifications: notesOk ? (raw.notifications as NotificationRule[]) : d.notifications,
    timeZone: TIME_ZONES.includes(raw.timeZone as SalesSettings["timeZone"])
      ? (raw.timeZone as SalesSettings["timeZone"])
      : d.timeZone,
    unit: UNITS.includes(raw.unit as SalesUnit) ? (raw.unit as SalesUnit) : d.unit,
    autoAssignOwner:
      typeof raw.autoAssignOwner === "boolean" ? raw.autoAssignOwner : d.autoAssignOwner,
    requireAcceptedQuote:
      typeof raw.requireAcceptedQuote === "boolean"
        ? raw.requireAcceptedQuote
        : d.requireAcceptedQuote,
  };
}

function load(): SalesSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? revive(JSON.parse(raw)) : DEFAULT_SALES_SETTINGS;
  } catch {
    return DEFAULT_SALES_SETTINGS;
  }
}

function persist(s: SalesSettings) {
  try {
    if (s === DEFAULT_SALES_SETTINGS) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* Storage refused (private window, quota) — the change still holds for
       this visit. */
  }
}

let current: SalesSettings = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSalesSettings(): SalesSettings {
  return React.useSyncExternalStore(subscribe, () => current, () => current);
}

/** The settings outside React — for code that runs on a press, not a render. */
export const getSalesSettings = () => current;

export function setSalesSettings(fn: (prev: SalesSettings) => SalesSettings) {
  current = fn(current);
  persist(current);
  emit();
}

export function resetSalesSettings() {
  current = DEFAULT_SALES_SETTINGS;
  persist(current);
  emit();
}

export function setFormFields(kind: SalesFormKind, fn: (prev: FormField[]) => FormField[]) {
  setSalesSettings((s) => ({ ...s, forms: { ...s.forms, [kind]: fn(s.forms[kind]) } }));
}

/* ------------------------------------------------- the signed-in user --- */

/* WHO "ME" IS, for Auto-assign owner. The shell owns the account; it hands
   the name down here once, so a sheet does not need the shell's props. */
let me = "";
const meListeners = new Set<() => void>();
export function setSalesCurrentUser(name: string) {
  if (name === me) return;
  me = name;
  meListeners.forEach((l) => l());
}
export const getSalesCurrentUser = () => me;

/**
 * AUTO-ASSIGN OWNER ON CREATE (Pavan, 2026-10-07). A new record whose form
 * draws a Sales rep field starts with the signed-in user in it. Nothing else
 * on an order or a quote names an owner, so without that field there is
 * nothing to fill.
 */
export function ownerOnCreate(kind: SalesFormKind, s: SalesSettings = current): string {
  if (!s.autoAssignOwner || !me) return "";
  return s.forms[kind].some((f) => f.key === "salesRep" && f.visible) ? me : "";
}

export function useSalesCurrentUser(): string {
  return React.useSyncExternalStore(
    (l) => {
      meListeners.add(l);
      return () => meListeners.delete(l);
    },
    () => me,
    () => me
  );
}

/* ------------------------------------------------------ stage lookups --- */

const CORE_KIND: Record<string, StatusKind> = {
  /* Waiting on a dispatcher to schedule it. */
  Requested: "caution",
  /* True, and asks nothing — not finished. */
  Scheduled: "info",
  Dispatched: "info",
  Delivered: "success",
  /* Not a warning — grey, never red. */
  Canceled: "neutral",
};

const CORE_LANE: Record<string, LaneColor> = {
  Requested: "yellow",
  Scheduled: "blue",
  Dispatched: "cyan",
  Delivered: "green",
  Canceled: "grey",
};
/* An added stage's lane — colours the core five do not use, in turn. */
const ADDED_LANES: LaneColor[] = ["violet", "orange", "purple", "pink"];

/** Every stage id, in the order an order moves through them. */
export const stageIds = (s: SalesSettings = current) => s.stages.map((r) => r.id);

/* A STAGE THAT WAS REMOVED IN SETTINGS sends its orders back to the first
   stage (Pavan, 2026-10-07) — an order is never left in a lane that is not
   on the board. */
export const liveStage = (id: string, s: SalesSettings = current): string =>
  s.stages.some((r) => r.id === id) ? id : (s.stages[0]?.id ?? "Requested");

/** THE ONE LABEL LOOKUP — chips, filters, lanes, "Move to …", the banner. */
export function stageLabel(id: string, s: SalesSettings = current): string {
  return s.stages.find((r) => r.id === id)?.label.trim() || id;
}

/* AN ADDED STAGE TAKES THE KIND OF THE CORE STAGE BEFORE IT (Pavan,
   2026-10-07): one after Requested is still waiting on somebody, one after
   Scheduled or Dispatched is under way. */
export function stageKind(id: string, s: SalesSettings = current): StatusKind {
  if (CORE_KIND[id]) return CORE_KIND[id];
  const ids = stageIds(s);
  for (let i = ids.indexOf(id) - 1; i >= 0; i--) {
    if (CORE_KIND[ids[i]]) return CORE_KIND[ids[i]];
  }
  return "info";
}

/** The colour chosen for a stage, or null for its kind's. */
export const stageColor = (id: string, s: SalesSettings = current): PillColor | null =>
  s.stages.find((r) => r.id === id)?.color ?? null;

/** The colour chosen for an order type's tag. */
export const typeColor = (label: string, s: SalesSettings = current): PillColor =>
  s.typeTags.find((t) => t.label === label)?.color ?? "grey";

export const stageTone = (id: string, s: SalesSettings = current): StatusTone =>
  KIND_TONE[stageKind(id, s)];

export function stageLaneColor(id: string, s: SalesSettings = current): LaneColor {
  if (CORE_LANE[id]) return CORE_LANE[id];
  const added = s.stages.filter((r) => !CORE_LANE[r.id]).map((r) => r.id);
  return ADDED_LANES[Math.max(0, added.indexOf(id)) % ADDED_LANES.length];
}

/** The stage an order moves on to — none from Delivered or Canceled. */
export function nextStage(id: string, s: SalesSettings = current): string | null {
  if (id === "Delivered" || id === "Canceled") return null;
  const ids = stageIds(s).filter((x) => x !== "Canceled");
  return ids[ids.indexOf(id) + 1] ?? null;
}

/** The stage right before Scheduled — the one a driver pick schedules from. */
export function stageBeforeScheduled(s: SalesSettings = current): string {
  const ids = stageIds(s).filter((x) => x !== "Canceled");
  return ids[ids.indexOf("Scheduled") - 1] ?? "Requested";
}

export const stageNeedsApproval = (id: string, s: SalesSettings = current) =>
  Boolean(s.stages.find((r) => r.id === id)?.approval);

/** A fuel order may be scheduled — no accepted quote is asked for, or it has one. */
export const quoteAllows = (o: { fromQuote?: string }, s: SalesSettings = current) =>
  !s.requireAcceptedQuote || Boolean(o.fromQuote);

/**
 * WHAT A DRIVER CHANGE LEAVES, UNDER THE SETTINGS (Pavan, 2026-10-07). A
 * pick schedules the order only from the stage right before Scheduled, and
 * only when Scheduled asks for no approval and the quote rule is met;
 * otherwise the driver is kept and the move waits for its act.
 */
export function driverStage(
  o: { status: string; fromQuote?: string },
  hasDriver: boolean,
  s: SalesSettings = current
): string {
  return stageAfterDriver(
    o.status,
    hasDriver,
    stageBeforeScheduled(s),
    !stageNeedsApproval("Scheduled", s) && quoteAllows(o, s)
  );
}

/** Longer in its stage than the stage allows. No limit, or no clock, is never late. */
export function overSla(
  id: string,
  since: string | undefined,
  now: number,
  s: SalesSettings = current
): boolean {
  const hours = s.stages.find((r) => r.id === id)?.slaHours;
  if (!hours || !since) return false;
  const at = new Date(since).getTime();
  return Number.isFinite(at) && now - at > hours * 3_600_000;
}

/* ------------------------------------------------------ notifications --- */

let unread = 0;
const unreadListeners = new Set<() => void>();

/** How many in-app notifications Sales has raised this visit — the bell's dot. */
export function useSalesUnread(): number {
  return React.useSyncExternalStore(
    (l) => {
      unreadListeners.add(l);
      return () => unreadListeners.delete(l);
    },
    () => unread,
    () => unread
  );
}

/**
 * AN EVENT HAPPENED. If its row is on the Notifications tab with In-app
 * ticked, it is a toast and a dot on the bell. Email and SMS are stored, not
 * sent — the prototype has nowhere to send them.
 */
export function notify(eventKey: string, message: string) {
  const rule = current.notifications.find((n) => n.key === eventKey);
  if (!rule?.inApp) return;
  toast(message);
  unread += 1;
  unreadListeners.forEach((l) => l());
}

/* ------------------------------------------------------- form lookups --- */

/**
 * What a sheet asks of a field: is it drawn, and is it marked required. A key
 * the settings do not know is shown and optional — a sheet field added later
 * must not vanish because nobody listed it here.
 */
export function useFormFieldRules(kind: SalesFormKind) {
  const fields = useSalesSettings().forms[kind];
  return React.useMemo(() => {
    const byKey = new Map(fields.map((f) => [f.key, f]));
    return {
      shown: (key: string) => byKey.get(key)?.visible ?? true,
      required: (key: string) => byKey.get(key)?.required ?? false,
      label: (key: string, fallback: string) => byKey.get(key)?.label.trim() || fallback,
    };
  }, [fields]);
}

/* THE TIME ZONE IS FOR MOMENTS, NOT CALENDAR DAYS (Pavan, 2026-10-07). A
   delivery date and a planned "1:35 AM" are wall-clock values typed for the
   site; the instants Sales records — the change log, a quote's Updated — are
   printed in the zone chosen on Preferences. */
export const dateIn = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone }).format(d);
export const timeIn = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(d);

/** The unit's short label, live. */
export function useUnitShort(): string {
  return UNIT_SHORT[useSalesSettings().unit];
}
