import * as React from "react";
import { DirectoryRecordSheet } from "../threepl/DirectoryRecordSheet";
import type { FormFieldDef, FormSectionDef } from "../threepl/directoryFormTypes";
import { MOVEMENT_LABEL, type MovementDirection } from "../threepl/orders";
import { dateOffset } from "../threepl/directoryCore";
import { MD_ASSETS, MD_OWNERSHIP, MD_SITES, type MdAsset } from "./assets";
import { DeliveryWindowTimeline, type TimeSpan } from "../DeliveryWindowTimeline";
import { formatWindow } from "@/components/form-layout/TimeWindowSlider";

/*
  CREATE ORDER FROM ASSET 360 (Pavan, 2026-11-02) — "Create order" offers a
  movement order or a service order, each a create side sheet with the
  Lovable reference's fields, on OUR form template (`DirectoryRecordSheet`
  in create mode: 600 form, sections two across, required marked, the
  footer's act names what it creates). The asset is filled in.

  Same data, same words: the movement type is 3PL's route vocabulary
  (Delivery · Pickup · Transfer · Relocate), not the reference's verbs.
*/

const ASSET_IDS = MD_ASSETS.map((a) => a.id);
const SITES = [...MD_SITES, "Fort Worth Yard"];
const DIRECTIONS = Object.keys(MOVEMENT_LABEL) as MovementDirection[];
const TECHNICIANS = ["Ravi Menon", "Dana Kohl", "Lena Kovacs", "Ben Ortiz", "Ana Cruz"];
const DRIVERS = ["M. Alvarez", "D. Whitfield", "P. Raman", "T. Nguyen", "J. Carter"];
const JOB_TYPES = [
  "Pump replacement",
  "Nozzle and hose swap",
  "Leak check",
  "Monitor calibration",
  "Filter change",
  "Inspection",
  "Repair",
  "Install",
  "Preventive maintenance",
  "Calibration",
];

const str = (v: string | number | boolean | null) => (typeof v === "string" ? v : "");
/** A text-kind field over one string key of the draft. */
function field<T, K extends keyof T & string>(
  key: K,
  label: string,
  kind: FormFieldDef<T>["kind"],
  extra: Partial<FormFieldDef<T>> = {},
): FormFieldDef<T> {
  return {
    key,
    label,
    kind,
    get: (d) => d[key] as unknown as string | number | boolean | null,
    set: (d, v) => ({ ...d, [key]: kind === "checkbox" || kind === "switch" ? Boolean(v) : kind === "number" ? (v === null ? null : Number(v)) : str(v) }),
    ...extra,
  };
}

/* ───────────────────────────────────────────────── movement order ── */

export interface MovementDraft {
  uid: string;
  asset: string;
  from: string;
  to: string;
  direction: string;
  date: string;
  /** The delivery window, minutes from midnight, and preferred times in it —
      the shared timeline every order sheet uses. */
  windowStart: number;
  windowEnd: number;
  preferred: TimeSpan[];
  fulfillment: string;
  notes: string;
  linked: string;
}

const MOVEMENT_FORM: FormSectionDef<MovementDraft>[] = [
  {
    key: "route",
    title: "Asset and route",
    fields: [
      field("asset", "Asset", "select", { required: true, options: ASSET_IDS }),
      field("from", "From location", "combobox", { required: true, options: SITES }),
      field("to", "To location", "combobox", {
        required: true,
        options: SITES,
        validate: (d) => (d.to && d.to === d.from ? "To location must differ from where it is" : null),
      }),
    ],
  },
  {
    key: "movement",
    title: "Movement",
    fields: [
      field("direction", "Movement type", "select", { required: true, options: DIRECTIONS.map((k) => MOVEMENT_LABEL[k]) }),
      field("date", "Scheduled date", "date", { required: true }),
      {
        key: "window",
        label: "Delivery window",
        kind: "text",
        required: true,
        wide: true,
        get: (d) => (d.windowEnd > d.windowStart ? formatWindow(d.windowStart, d.windowEnd) : ""),
        set: (d) => d,
        render: (d, setDraft) => (
          <DeliveryWindowTimeline
            required
            start={d.windowStart}
            end={d.windowEnd}
            onWindowChange={(windowStart, windowEnd) => setDraft({ ...d, windowStart, windowEnd })}
            preferred={d.preferred}
            onPreferredChange={(preferred) => setDraft({ ...d, preferred })}
          />
        ),
      },
      field("fulfillment", "Fulfillment", "select", { required: true, options: ["First party", "3PL"] }),
      field("notes", "Notes", "textarea", { wide: true }),
    ],
  },
  {
    key: "source",
    title: "Source",
    fields: [field("linked", "Linked asset order", "combobox", { clearLabel: "Independent", options: [] })],
  },
];

/* ───────────────────────────────────────────────── service order ── */

export interface ServiceDraft {
  uid: string;
  fulfillment: string;
  asset: string;
  customer: string;
  site: string;
  ownership: string;
  jobType: string;
  priority: string;
  raisedBy: string;
  requested: string;
  issue: string;
  internalNote: string;
  technician: string;
  techEmail: string;
  emailTech: boolean;
  driver: string;
  scheduled: string;
  scope: string;
  access: string;
  parts: string;
  po: string;
  checklist: boolean;
}

const SERVICE_FORM: FormSectionDef<ServiceDraft>[] = [
  {
    key: "fulfillment",
    title: "Fulfillment",
    fields: [field("fulfillment", "Service fulfillment", "select", { required: true, options: ["First party", "Carrier"] })],
  },
  {
    key: "asset",
    title: "Customer and asset",
    fields: [
      field("asset", "Asset", "select", { required: true, options: ASSET_IDS }),
      field("customer", "Customer", "text"),
      field("site", "Service site", "combobox", { options: SITES }),
      field("ownership", "Ownership", "select", { required: true, options: [...MD_OWNERSHIP] }),
    ],
  },
  {
    key: "request",
    title: "Service request",
    fields: [
      field("jobType", "Job type", "select", { required: true, options: JOB_TYPES }),
      field("priority", "Priority", "select", { required: true, options: ["Low", "Normal", "Urgent"] }),
      field("raisedBy", "Raised by", "select", { required: true, options: ["Service tech team", "Sales app", "Customer call", "Monitor alert"] }),
      field("requested", "Requested date", "date"),
      field("issue", "Customer-visible issue", "textarea", { required: true, wide: true }),
      field("internalNote", "Internal note", "textarea", { wide: true }),
    ],
  },
  {
    key: "assign",
    title: "Driver and technician",
    fields: [
      field("technician", "Technician", "combobox", { clearLabel: "Unassigned", options: TECHNICIANS }),
      field("techEmail", "Technician email", "email"),
      field("driver", "Driver", "combobox", { clearLabel: "Unassigned", options: DRIVERS }),
      field("scheduled", "Scheduled for", "date"),
      field("emailTech", "Email work order to technician", "checkbox"),
    ],
  },
  {
    key: "scope",
    title: "Work scope and billing",
    fields: [
      field("scope", "Scope of work", "textarea", { wide: true }),
      field("access", "Site access instructions", "textarea", { wide: true }),
      field("parts", "Parts or materials needed", "textarea", { wide: true }),
      field("po", "PO / billing reference", "text"),
      field("checklist", "Field checklist required", "checkbox"),
    ],
  },
];

const EMAIL: Record<string, string> = {
  "Ravi Menon": "ravi.menon@meridianoil.com",
  "Dana Kohl": "dana.kohl@meridianoil.com",
  "Lena Kovacs": "lena.kovacs@meridianoil.com",
  "Ben Ortiz": "ben.ortiz@meridianoil.com",
  "Ana Cruz": "ana.cruz@meridianoil.com",
};

/* ───────────────────────────────────────────────────────── sheets ── */

export function AssetOrderSheet({
  kind,
  asset: a,
  onClose,
  onCreateMovement,
  onCreateService,
}: {
  kind: "movement" | "service";
  asset: MdAsset;
  onClose: () => void;
  onCreateMovement: (d: MovementDraft) => void;
  onCreateService: (d: ServiceDraft) => void;
}) {
  const seq = React.useRef(0);
  const key = React.useMemo(() => `${kind}-${a.uid}-${(seq.current += 1)}`, [kind, a.uid]);

  if (kind === "movement") {
    /* The orders this asset could move under — its leases' orders. */
    const linked = [...new Set(a.journey.flatMap((p) => (p.order ? [p.order] : [])).concat(a.movements.map((m) => m.id)))];
    const form = MOVEMENT_FORM.map((s) =>
      s.key === "source"
        ? { ...s, fields: s.fields.map((f) => ({ ...f, options: linked })) }
        : s,
    );
    return (
      <DirectoryRecordSheet<MovementDraft>
        level={2}
        open
        onOpenChange={(o) => !o && onClose()}
        mode="create"
        noun="Movement Order"
        title="Create New Movement Order"
        recordKey={key}
        initial={{ uid: key, asset: a.id, from: a.site, to: "", direction: "", date: dateOffset(1), windowStart: 8 * 60, windowEnd: 12 * 60, preferred: [], fulfillment: "First party", notes: "", linked: "" }}
        sections={form}
        onSubmit={(d) => {
          onCreateMovement(d);
          onClose();
        }}
      />
    );
  }
  return (
    <DirectoryRecordSheet<ServiceDraft>
      level={2}
      open
      onOpenChange={(o) => !o && onClose()}
      mode="create"
      noun="Service Order"
      title="Create New Service Order"
      recordKey={key}
      initial={{
        uid: key,
        fulfillment: "First party",
        asset: a.id,
        customer: a.customer ?? "",
        site: a.site,
        ownership: a.ownership,
        jobType: "",
        priority: "Normal",
        raisedBy: "Service tech team",
        requested: "",
        issue: "",
        internalNote: "",
        technician: "",
        techEmail: "",
        emailTech: true,
        driver: "",
        scheduled: "",
        scope: "",
        access: "",
        parts: "",
        po: "",
        checklist: true,
      }}
      sections={SERVICE_FORM.map((s) =>
        s.key === "assign"
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.key === "technician"
                  ? { ...f, set: (d: ServiceDraft, v: string | number | boolean | null) => ({ ...d, technician: str(v), techEmail: EMAIL[str(v)] ?? d.techEmail }) }
                  : f,
              ),
            }
          : s,
      )}
      onSubmit={(d) => {
        onCreateService(d);
        onClose();
      }}
    />
  );
}
