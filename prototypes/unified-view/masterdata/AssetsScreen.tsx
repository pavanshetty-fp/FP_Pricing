import * as React from "react";
import { Boxes, Link2Off } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { TwoLineCell } from "../ListTable";
import { kindTone } from "../statusKind";
import { LevelGauge } from "../../customer-portal/TankLevel";
import { DirectoryEntityScreen, type EntityConfig, type Navigator } from "../threepl/DirectoryEntityScreen";
import type { FormSectionDef } from "../threepl/directoryFormTypes";
import { formatDate, money } from "../threepl/directoryCore";
import {
  MD_ASSETS,
  MD_ASSET_STATUSES,
  MD_ASSET_TYPES,
  MD_CONDITIONS,
  MD_OWNERSHIP,
  MD_PRODUCTS,
  MONITOR_STATES,
  contractUse,
  deliveryStats,
  levelPct,
  monitorState,
  type MdAsset,
  type MdAssetStatus,
} from "./assets";
import { Muted, Reading, STATUS_KIND, UsageBar, gal, perMonth } from "./assetParts";
import { AssetSheet } from "./AssetSheet";
import { MD_CUSTOMER_NAMES, MD_PLACES } from "./customers";

/*
  MASTER DATA · ASSETS (Pavan, 2026-11-02) — the Lovable reference's Assets
  list and Asset 360 page, on OUR Directory template: `DirectoryEntityScreen`
  (the list with search, filters, group by, columns, saved views, export) and
  a record SHEET (not a page — the DS's record interaction): Asset 360, a full
  sheet in the reference's layout (AssetSheet.tsx).
*/

type Col = "asset" | "ownership" | "customer" | "shipTo" | "monitor" | "deliveries" | "contract" | "onRent" | "status";

/* THE WIDTHS (Pavan, 2026-11-13): Deliveries is a date and two short
   figures, never longer — a fixed width (grow 0). Ship-to carries a name and
   its address, so it takes twice the spare room; every other column an
   even share. */
const COLUMNS: { key: Col; label: string; width: number; sortable: boolean; grow?: number }[] = [
  { key: "asset", label: "Asset", width: 140, sortable: true },
  { key: "ownership", label: "Ownership", width: 146, sortable: true },
  { key: "customer", label: "Customer", width: 140, sortable: true },
  { key: "shipTo", label: "Ship-to", width: 220, sortable: true, grow: 2 },
  { key: "monitor", label: "Monitor", width: 126, sortable: true },
  { key: "deliveries", label: "Deliveries", width: 170, sortable: true, grow: 0 },
  { key: "contract", label: "Contract", width: 130, sortable: true },
  { key: "onRent", label: "On rent", width: 120, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
];

/* ────────────────────────────────────────────────────────── list ── */

const monitorCell = (a: MdAsset) => {
  const pct = levelPct(a);
  /* NOT LINKED READS AS A BROKEN LINK (Pavan, 2026-11-13). */
  if (pct === null && monitorState(a) === "Not linked")
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link2Off className="size-4 shrink-0" aria-hidden />
        Not linked
      </span>
    );
  if (pct === null) return <Muted>{monitorState(a)}</Muted>;
  return (
    <Reading
      bar={<LevelGauge pct={pct} />}
      pct={pct}
      line={`${(a.monitor?.levelGal ?? 0).toLocaleString()} / ${gal(a.capacityGal)}`}
    />
  );
};

const deliveriesCell = (a: MdAsset) => {
  const s = deliveryStats(a);
  if (!s.last) return <Muted>No deliveries</Muted>;
  return (
    <TwoLineCell
      title={`${formatDate(s.last.date)} · ${gal(s.last.gal)}`}
      description={`${s.monthCount} this month · ${gal(s.monthGal)}`}
    />
  );
};

const contractCell = (a: MdAsset) => {
  const c = contractUse(a);
  if (!c) return <Muted>No contract</Muted>;
  const pct = Math.round((c.used / c.committed) * 100);
  return <Reading bar={<UsageBar pct={pct} />} pct={pct} line={`${c.used.toLocaleString()} / ${gal(c.committed)}`} />;
};

const sortValue = (a: MdAsset, key: Col): string | number => {
  switch (key) {
    case "asset":
      return a.id;
    case "ownership":
      return a.ownership;
    case "customer":
      return a.customer ?? "";
    case "shipTo":
      return a.site;
    case "monitor":
      return levelPct(a) ?? -1;
    case "deliveries":
      return deliveryStats(a).last?.date ?? "";
    case "contract": {
      const c = contractUse(a);
      return c ? c.used / c.committed : -1;
    }
    case "onRent":
      return a.onRentSince ?? "";
    case "status":
      return a.status;
  }
};

const SEARCH_FIELDS = [
  { key: "asset", label: "Asset", text: (a: MdAsset) => `${a.id} ${a.type}` },
  { key: "customer", label: "Customer", text: (a: MdAsset) => a.customer ?? "" },
  { key: "site", label: "Site", text: (a: MdAsset) => `${a.site} ${a.address}` },
  { key: "monitor", label: "Monitor", text: (a: MdAsset) => a.monitor?.id ?? "" },
];

const matches = (a: MdAsset, q: string) =>
  SEARCH_FIELDS.some((f) => f.text(a).toLowerCase().includes(q));

/* ────────────────────────────────────────────────────────── form ── */

const text = (v: string | number | boolean | null) => (typeof v === "string" && v !== "" ? v : null);

/* A TANK HOLDS WHAT ITS TYPE SAYS — picking "500 gal skid tank" fills an
   empty capacity with 500 (the reference let the two disagree). */
const withType = (a: MdAsset, type: string): MdAsset => {
  const m = /([\d,]+) gal/.exec(type);
  return { ...a, type, capacityGal: a.capacityGal || (m ? Number(m[1].replace(/,/g, "")) : 0) };
};

/* A customer's own tank has no rental terms. */
const rented = (a: MdAsset) => a.ownership === "Rental";

/* THE 3PL ASSET FORM'S SECTIONS AND WORDS (same data, same control). */
const FORM: FormSectionDef<MdAsset>[] = [
  {
    key: "identity",
    title: "Identity",
    fields: [
      { key: "id", label: "Asset ID", kind: "text", required: true, get: (a) => a.id, set: (a, v) => ({ ...a, id: String(v ?? "") }) },
      { key: "type", label: "Asset type", kind: "select", required: true, options: MD_ASSET_TYPES, get: (a) => a.type, set: (a, v) => withType(a, String(v ?? "")) },
      { key: "ownership", label: "Ownership", kind: "select", required: true, options: MD_OWNERSHIP, get: (a) => a.ownership, set: (a, v) => ({ ...a, ownership: v as MdAsset["ownership"] }) },
      { key: "condition", label: "Condition", kind: "select", required: true, options: MD_CONDITIONS, get: (a) => a.condition, set: (a, v) => ({ ...a, condition: v as MdAsset["condition"] }) },
      { key: "status", label: "Status", kind: "select", required: true, options: MD_ASSET_STATUSES, get: (a) => a.status, set: (a, v) => ({ ...a, status: v as MdAssetStatus }) },
    ],
  },
  {
    key: "capacity",
    title: "Capacity and product",
    fields: [
      { key: "capacity", label: "Capacity (gal)", kind: "number", get: (a) => a.capacityGal || null, set: (a, v) => ({ ...a, capacityGal: Number(v ?? 0) }) },
      { key: "product", label: "Fuel product", kind: "combobox", clearLabel: "No product", options: MD_PRODUCTS, get: (a) => a.product ?? "", set: (a, v) => ({ ...a, product: text(v) }) },
    ],
  },
  {
    key: "placement",
    title: "Placement",
    fields: [
      { key: "customer", label: "Customer", kind: "combobox", clearLabel: "No customer", options: MD_CUSTOMER_NAMES, get: (a) => a.customer ?? "", set: (a, v) => ({ ...a, customer: text(v) }) },
      { key: "site", label: "Site", kind: "combobox", required: true, options: MD_PLACES, get: (a) => a.site, set: (a, v) => ({ ...a, site: String(v ?? "") }) },
      { key: "placedOn", label: "Placed on", kind: "date", get: (a) => a.placedOn ?? "", set: (a, v) => ({ ...a, placedOn: text(v) }) },
      { key: "address", label: "Address", kind: "text", wide: true, get: (a) => a.address, set: (a, v) => ({ ...a, address: String(v ?? "") }) },
    ],
  },
  {
    key: "rental",
    title: "Rental terms",
    fields: [
      { key: "onRentSince", label: "On rent since", kind: "date", visible: rented, get: (a) => a.onRentSince ?? "", set: (a, v) => ({ ...a, onRentSince: text(v) }) },
      { key: "rate", label: "Rate / mo", kind: "money", visible: rented, get: (a) => a.rate, set: (a, v) => ({ ...a, rate: v === null || v === "" ? null : Number(v) }) },
    ],
  },
];

function config(update: (id: string, fn: (a: MdAsset) => MdAsset) => void): EntityConfig<MdAsset, Col> {
  return {
    urlKey: "md-assets",
    parentLabel: "Assets",
    noun: "asset",
    rowId: (a) => a.uid,
    nameOf: (a) => a.id || "New asset",
    columns: COLUMNS,
    matches,
    searchFields: SEARCH_FIELDS,
    searchPlaceholder: "Search by asset, customer, site or monitor",
    sortRows: (rows, sort) => {
      if (!sort) return rows;
      const dir = sort.dir === "asc" ? 1 : -1;
      return [...rows].sort((x, y) => {
        const a = sortValue(x, sort.key);
        const b = sortValue(y, sort.key);
        return (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))) * dir;
      });
    },
    dimensions: [
      { key: "ownership", label: "Ownership", hides: "ownership", order: [...MD_OWNERSHIP], valuesOf: (a) => [a.ownership] },
      { key: "customer", label: "Customer", hides: "customer", valuesOf: (a) => (a.customer ? [a.customer] : []) },
      { key: "status", label: "Status", hides: "status", order: [...MD_ASSET_STATUSES], valuesOf: (a) => [a.status] },
      { key: "type", label: "Type", valuesOf: (a) => [a.type] },
      { key: "monitor", label: "Monitor", order: [...MONITOR_STATES], valuesOf: (a) => [monitorState(a)] },
    ],
    facets: [
      { key: "status", label: "Status", options: [...MD_ASSET_STATUSES], valueOf: (a) => a.status },
      { key: "ownership", label: "Ownership", options: [...MD_OWNERSHIP], valueOf: (a) => a.ownership },
      { key: "type", label: "Type", options: [...MD_ASSET_TYPES], valueOf: (a) => a.type },
      { key: "customer", label: "Customer", searchable: true, options: [...MD_CUSTOMER_NAMES], valueOf: (a) => a.customer ?? "" },
      { key: "monitor", label: "Monitor", options: [...MONITOR_STATES], valueOf: (a) => monitorState(a) },
      { key: "contract", label: "Contract", options: ["With contract volume", "No contract"], valueOf: (a) => (contractUse(a) ? "With contract volume" : "No contract") },
    ],
    measureOf: (a) => (a.status === "On rent" ? a.rate ?? 0 : 0),
    formatTotal: (n) => `${money(n)} / mo on rent`,
    emptyIcon: <Boxes />,
    renderCell: (a, key) => {
      switch (key) {
        case "asset":
          return <TwoLineCell title={a.id} description={a.type} />;
        case "ownership":
          return <Pill>{a.ownership}</Pill>;
        case "customer":
          return a.customer ?? <Muted />;
        /* THE SHIP-TO, ITS OWN COLUMN (Pavan, 2026-11-13) — it was the
           Customer cell's second line; now the site and its address. */
        case "shipTo":
          return <TwoLineCell title={a.site} description={a.address} />;
        case "monitor":
          return monitorCell(a);
        case "deliveries":
          return deliveriesCell(a);
        case "contract":
          return contractCell(a);
        case "onRent":
          return a.onRentSince ? (
            <TwoLineCell title={formatDate(a.onRentSince)} description={perMonth(a.rate)} />
          ) : (
            <Muted />
          );
        case "status":
          return <StatusChip tone={kindTone(STATUS_KIND[a.status])}>{a.status}</StatusChip>;
      }
    },
    exportRow: (a) => {
      const s = deliveryStats(a);
      const c = contractUse(a);
      return {
        Asset: a.id,
        Type: a.type,
        Ownership: a.ownership,
        Customer: a.customer ?? "",
        "Ship-to": a.site,
        "Ship-to address": a.address,
        "Level %": levelPct(a) ?? "",
        Capacity: a.capacityGal,
        "Last delivery": s.last ? s.last.date : "",
        "Deliveries this month": s.monthCount,
        "Gallons this month": s.monthGal,
        "Contract used": c ? c.used : "",
        "Contract volume": c ? c.committed : "",
        "On rent since": a.onRentSince ?? "",
        "Rate / mo": a.rate ?? "",
        Status: a.status,
      };
    },
    headerAsideOf: (a) => (
      <span className="flex items-center gap-1.5">
        <StatusChip tone={kindTone(STATUS_KIND[a.status])}>{a.status}</StatusChip>
        <Pill>{a.ownership}</Pill>
        <Pill>{a.condition}</Pill>
      </span>
    ),
    /* Asset 360 draws the record (`renderRecord`) — the standard sheet's
       related sections are not used. */
    readSectionsOf: () => [],
    renderRecord: ({ row, onClose, onChange }) => (
      <AssetSheet asset={row} form={FORM} onClose={onClose} onChange={onChange} update={update} />
    ),
    formSections: FORM,
    blank: (id) => ({
      uid: id,
      id: "",
      type: "",
      ownership: "Rental",
      condition: "New",
      status: "Available",
      recordStatus: "active",
      customer: null,
      site: "",
      address: "",
      placedOn: null,
      onRentSince: null,
      rate: null,
      product: null,
      capacityGal: 0,
      monitor: null,
      leases: [],
      deliveries: [],
      movements: [],
      journey: [],
      serviceOrders: [],
      agreement: null,
      maintenance: [],
      compliance: [],
      leakChecks: [],
      peripherals: [],
      invoices: [],
      audit: [{ id: `au-${id}`, at: new Date().toISOString(), by: "Dana Whitfield", action: "Created", changes: ["Asset record created"] }],
    }),
    statusField: {
      get: (a) => a.recordStatus,
      set: (a, next) => ({ ...a, recordStatus: next }),
    },
    auditOf: (a) => a.audit,
    withAudit: (a, entry) => ({ ...a, audit: [entry, ...a.audit] }),
  };
}

/* The list's records outlive a visit to another page in the session. */
let kept: MdAsset[] = MD_ASSETS;
/** The assets as they are now — Customer 360 reads its tanks, fills and leases from here. */
export const currentAssets = () => kept;

const NO_NAV: Navigator = {
  openCustomer: () => {},
  openVendor: () => {},
  openProduct: () => {},
  openAsset: () => {},
};

export function MasterAssetsScreen({
  onTotalChange,
  focusId,
  onFocusHandled,
}: {
  onTotalChange?: (label: string | null) => void;
  /** A record to open on arrival — a shared link to one asset. */
  focusId?: string | null;
  onFocusHandled?: () => void;
}) {
  const [rows, setRowsState] = React.useState<MdAsset[]>(kept);
  /* THE FORM HOLDS A COPY. A save from the sheet carries the record as it
     was when the form opened, so what the record's own actions changed since
     — a movement order, a service order, the monitor — is kept from the list,
     and the two histories are joined. */
  const setRows = React.useCallback((next: MdAsset[]) => {
    const merged = next.map((r) => {
      const cur = kept.find((k) => k.uid === r.uid);
      if (!cur || cur === r) return r;
      const audit = [...r.audit, ...cur.audit.filter((e) => !r.audit.some((x) => x.id === e.id))].sort((x, y) =>
        y.at.localeCompare(x.at),
      );
      return { ...r, movements: cur.movements, serviceOrders: cur.serviceOrders, monitor: cur.monitor, audit };
    });
    kept = merged;
    setRowsState(merged);
  }, []);
  const update = React.useCallback(
    (id: string, fn: (a: MdAsset) => MdAsset) =>
      setRowsState((prev) => {
        const next = prev.map((a) => (a.uid === id ? fn(a) : a));
        kept = next;
        return next;
      }),
    [],
  );
  const cfg = React.useMemo(() => config(update), [update]);
  return (
    <DirectoryEntityScreen
      config={cfg}
      rows={rows}
      onRowsChange={setRows}
      navigate={NO_NAV}
      focusId={focusId}
      onFocusHandled={onFocusHandled}
      onTotalChange={onTotalChange}
    />
  );
}

