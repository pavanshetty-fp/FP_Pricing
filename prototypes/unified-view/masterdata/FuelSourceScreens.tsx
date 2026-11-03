import * as React from "react";
import { Factory, Warehouse } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { CELL } from "../RecordSheet";
import { TwoLineCell } from "../ListTable";
import { ACTIVE_KIND, kindTone } from "../statusKind";
import { SiteMiniMap } from "../threepl/SiteMiniMap";
import { DirectoryEntityScreen, type EntityConfig, type Navigator } from "../threepl/DirectoryEntityScreen";
import { ReadField, ReadGrid, SheetTable } from "../threepl/DirectoryRecordSheet";
import type { FormSectionDef } from "../threepl/directoryFormTypes";
import { RECORD_STATUSES } from "../threepl/directoryCore";
import { suppliersOf, terminalsOf, type LoadingAccount } from "../threepl/orders";
import { Muted } from "./assetParts";
import {
  MD_SUPPLIERS,
  MD_TERMINALS,
  SUPPLIER_TYPES,
  accountsAtTerminal,
  accountsOfSupplier,
  linesOfSupplier,
  marketsOfSupplier,
  productsAtTerminal,
  suppliersAt,
  terminalAddress,
  terminalsOfSupplier,
  type MdSupplier,
  type MdTerminal,
} from "./terminals";

/*
  MASTER DATA · TERMINALS AND SUPPLIERS (Pavan, 2026-11-03) — the Lovable
  reference's two lists and their details sheets, on the Directory template.
  The reference's sheet is a details card; ours is the Directory record sheet
  (the record is the form, it autosaves) with what the loading accounts say
  under it: a terminal's suppliers and accounts, a supplier's terminals and
  accounts (terminals.ts). The counts in the lists are read from the same
  accounts.
*/

const statusLabel = (s: MdTerminal["status"]) => s[0].toUpperCase() + s.slice(1);
const StatusPill = ({ s }: { s: MdTerminal["status"] }) => (
  <StatusChip tone={kindTone(ACTIVE_KIND(s === "active"))} variant="soft">
    {statusLabel(s)}
  </StatusChip>
);
const Num = ({ n }: { n: number }) => <span className="text-sm tabular-nums text-foreground">{n}</span>;
const Text = ({ v }: { v: string }) => <span className="truncate text-sm text-foreground">{v}</span>;
const text = (v: string | number | boolean | null) => (typeof v === "string" && v !== "" ? v : null);

const NO_NAV: Navigator = { openCustomer: () => {}, openVendor: () => {}, openProduct: () => {}, openAsset: () => {} };

function sorter<Row, K extends string>(value: (r: Row, k: K) => string | number) {
  return (rows: Row[], sort: { key: K; dir: "asc" | "desc" } | null) => {
    if (!sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((x, y) => {
      const a = value(x, sort.key);
      const b = value(y, sort.key);
      return (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))) * dir;
    });
  };
}

/** The loading accounts table — the one both sheets show. */
const accountsSection = (rows: LoadingAccount[], other: "terminal" | "supplier") => ({
  key: "accounts",
  title: "Loading accounts",
  count: rows.length,
  columns: [CELL.pick, CELL.name, CELL.text],
  render: () => (
    <SheetTable
      rows={rows}
      rowKey={(a) => a.name}
      emptyBody="No loading account draws here yet."
      columns={[
        { key: "name", label: "Account", render: (a) => <span className="text-sm tabular-nums">{a.name}</span> },
        {
          key: "other",
          label: other === "terminal" ? "Terminals" : "Suppliers",
          render: (a) => <span className="text-sm">{(other === "terminal" ? terminalsOf(a) : suppliersOf(a)).join(", ")}</span>,
        },
        { key: "products", label: "Products", render: (a) => <span className="text-sm">{a.products.join(", ")}</span> },
      ]}
    />
  ),
});

/* ═══════════════════════════════════════════════════════════ terminals ═ */

type TCol = "name" | "market" | "suppliers" | "address" | "erpId" | "radius" | "status";

const T_COLUMNS: { key: TCol; label: string; width: number; sortable: boolean }[] = [
  { key: "name", label: "Terminal name", width: 300, sortable: true },
  { key: "market", label: "Market", width: 180, sortable: true },
  { key: "suppliers", label: "Suppliers", width: 110, sortable: true },
  { key: "address", label: "Address", width: 320, sortable: true },
  { key: "erpId", label: "ERP ID", width: 110, sortable: true },
  { key: "radius", label: "Radius", width: 100, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
];

const T_SEARCH = [
  { key: "name", label: "Terminal", text: (t: MdTerminal) => `${t.name} ${t.erpId}` },
  { key: "market", label: "Market", text: (t: MdTerminal) => t.market },
  { key: "address", label: "Address", text: (t: MdTerminal) => terminalAddress(t) },
  { key: "supplier", label: "Supplier", text: (t: MdTerminal) => suppliersAt(t.name).join(" ") },
];

const MARKETS = [...new Set(MD_TERMINALS.map((t) => t.market))].sort();

const T_FORM: FormSectionDef<MdTerminal>[] = [
  {
    key: "identity",
    title: "Identity",
    fields: [
      { key: "name", label: "Terminal name", kind: "text", required: true, get: (t) => t.name, set: (t, v) => ({ ...t, name: String(v ?? "") }) },
      { key: "market", label: "Market", kind: "combobox", required: true, options: MARKETS, allowCreate: true, get: (t) => t.market, set: (t, v) => ({ ...t, market: String(v ?? "") }) },
      { key: "erpId", label: "ERP ID", kind: "text", required: true, get: (t) => t.erpId, set: (t, v) => ({ ...t, erpId: String(v ?? "") }) },
      { key: "status", label: "Record status", kind: "select", required: true, options: RECORD_STATUSES, get: (t) => t.status, set: (t, v) => ({ ...t, status: v as MdTerminal["status"] }) },
    ],
  },
  {
    key: "location",
    title: "Location",
    fields: [
      { key: "addressLine1", label: "Address line 1", kind: "text", required: true, get: (t) => t.addressLine1, set: (t, v) => ({ ...t, addressLine1: String(v ?? "") }) },
      { key: "city", label: "City", kind: "text", required: true, get: (t) => t.city, set: (t, v) => ({ ...t, city: String(v ?? "") }) },
      { key: "state", label: "State", kind: "text", required: true, get: (t) => t.state, set: (t, v) => ({ ...t, state: String(v ?? "") }) },
      {
        key: "zip",
        label: "Zip",
        kind: "text",
        required: true,
        get: (t) => t.zip,
        set: (t, v) => ({ ...t, zip: String(v ?? "") }),
        validate: (t) => (t.zip && !/^\d{5}(-\d{4})?$/.test(t.zip) ? "Use a 5-digit ZIP, or ZIP+4" : null),
      },
      {
        key: "latitude",
        label: "Latitude",
        kind: "number",
        required: true,
        get: (t) => t.latitude,
        set: (t, v) => ({ ...t, latitude: Number(v ?? 0) }),
        validate: (t) => (Math.abs(t.latitude) > 90 ? "Latitude runs from -90 to 90" : null),
      },
      {
        key: "longitude",
        label: "Longitude",
        kind: "number",
        required: true,
        get: (t) => t.longitude,
        set: (t, v) => ({ ...t, longitude: Number(v ?? 0) }),
        validate: (t) => (Math.abs(t.longitude) > 180 ? "Longitude runs from -180 to 180" : null),
      },
      {
        key: "radiusM",
        label: "Radius (m)",
        kind: "number",
        required: true,
        get: (t) => t.radiusM,
        set: (t, v) => ({ ...t, radiusM: Number(v ?? 0) }),
        validate: (t) => (t.radiusM <= 0 ? "A radius is more than 0 m" : null),
      },
    ],
  },
  {
    key: "notes",
    title: "Notes",
    fields: [{ key: "notes", label: "Internal notes", kind: "textarea", wide: true, get: (t) => t.notes, set: (t, v) => ({ ...t, notes: text(v) }) }],
  },
];

const terminalValue = (t: MdTerminal, k: TCol): string | number =>
  k === "suppliers" ? suppliersAt(t.name).length : k === "address" ? terminalAddress(t) : k === "radius" ? t.radiusM : k === "status" ? t.status : t[k];

function terminalConfig(): EntityConfig<MdTerminal, TCol> {
  return {
    urlKey: "md-terminals",
    parentLabel: "Terminals",
    noun: "terminal",
    rowId: (t) => t.uid,
    nameOf: (t) => t.name || "New terminal",
    columns: T_COLUMNS,
    matches: (t, q) => T_SEARCH.some((f) => f.text(t).toLowerCase().includes(q)),
    searchFields: T_SEARCH,
    searchPlaceholder: "Search by terminal, market, address or supplier",
    sortRows: sorter<MdTerminal, TCol>(terminalValue),
    dimensions: [
      { key: "market", label: "Market", hides: "market", valuesOf: (t) => [t.market] },
      { key: "state", label: "State", valuesOf: (t) => [t.state] },
      { key: "status", label: "Status", hides: "status", order: RECORD_STATUSES.map(statusLabel), valuesOf: (t) => [statusLabel(t.status)] },
    ],
    facets: [
      { key: "market", label: "Market", searchable: true, options: MARKETS, valueOf: (t) => t.market },
      { key: "supplier", label: "Supplier", searchable: true, options: MD_SUPPLIERS.map((s) => s.name), valueOf: (t) => suppliersAt(t.name) },
    ],
    measureOf: (t) => accountsAtTerminal(t.name).length,
    formatTotal: (n) => `${n} loading accounts`,
    emptyIcon: <Warehouse />,
    renderCell: (t, key) => {
      switch (key) {
        case "name":
          return <Text v={t.name} />;
        case "market":
          return <Text v={t.market} />;
        case "suppliers":
          return <Num n={suppliersAt(t.name).length} />;
        case "address":
          return <Text v={terminalAddress(t)} />;
        case "erpId":
          return <Text v={t.erpId} />;
        case "radius":
          return <Text v={`${t.radiusM.toLocaleString()} m`} />;
        case "status":
          return <StatusPill s={t.status} />;
      }
    },
    exportRow: (t) => ({
      "Terminal name": t.name,
      Market: t.market,
      Suppliers: suppliersAt(t.name).join(" | "),
      Address: terminalAddress(t),
      Latitude: t.latitude,
      Longitude: t.longitude,
      "ERP ID": t.erpId,
      "Radius (m)": t.radiusM,
      Status: statusLabel(t.status),
    }),
    headerAsideOf: (t) => <StatusPill s={t.status} />,
    readSectionsOf: (t) => [
      {
        key: "map",
        title: "On the map",
        note: `${t.radiusM.toLocaleString()} m rack radius`,
        render: () => (
          <div className="flex flex-col gap-4 p-4">
            <SiteMiniMap className="h-48 w-full" site={{ lat: t.latitude, lng: t.longitude }} points={[]} minRadius={t.radiusM} />
            <ReadGrid>
              <ReadField label="Address" value={terminalAddress(t)} />
              <ReadField label="Coordinates" value={`${t.latitude.toFixed(4)}, ${t.longitude.toFixed(4)}`} />
              <ReadField label="Products loaded" value={productsAtTerminal(t.name).join(", ") || null} />
            </ReadGrid>
          </div>
        ),
      },
      {
        key: "suppliers",
        title: "Suppliers",
        count: suppliersAt(t.name).length,
        columns: [CELL.name, CELL.pick, CELL.pick],
        render: () => (
          <SheetTable
            rows={suppliersAt(t.name)}
            rowKey={(s) => s}
            emptyBody="No supplier loads here yet."
            columns={[
              { key: "name", label: "Supplier", render: (s) => <span className="text-sm">{s}</span> },
              { key: "type", label: "Type", render: (s) => <span className="text-sm">{MD_SUPPLIERS.find((x) => x.name === s)?.type ?? "—"}</span> },
              { key: "accounts", label: "Accounts here", render: (s) => <span className="text-sm tabular-nums">{accountsAtTerminal(t.name).filter((a) => suppliersOf(a).includes(s)).length}</span> },
            ]}
          />
        ),
      },
      accountsSection(accountsAtTerminal(t.name), "supplier"),
    ],
    formSections: T_FORM,
    blank: (id) => ({
      uid: id,
      name: "",
      market: "",
      erpId: "",
      addressLine1: "",
      city: "",
      state: "",
      zip: "",
      latitude: 0,
      longitude: 0,
      radiusM: 200,
      status: "active",
      notes: null,
      audit: [{ id: `au-${id}`, at: new Date().toISOString(), by: "Dana Whitfield", action: "Created", changes: [] }],
    }),
    statusField: { get: (t) => t.status, set: (t, next) => ({ ...t, status: next }) },
    auditOf: (t) => t.audit,
    withAudit: (t, entry) => ({ ...t, audit: [entry, ...t.audit] }),
  };
}

let keptTerminals: MdTerminal[] = MD_TERMINALS;

export function MasterTerminalsScreen(props: { onTotalChange?: (label: string | null) => void; focusId?: string | null; onFocusHandled?: () => void }) {
  const [rows, setRowsState] = React.useState(keptTerminals);
  const cfg = React.useMemo(terminalConfig, []);
  return (
    <DirectoryEntityScreen
      config={cfg}
      rows={rows}
      onRowsChange={(next) => {
        keptTerminals = next;
        setRowsState(next);
      }}
      navigate={NO_NAV}
      {...props}
    />
  );
}

/* ═══════════════════════════════════════════════════════════ suppliers ═ */

type SCol = "name" | "type" | "market" | "terminals" | "accounts" | "erpId" | "status";

const S_COLUMNS: { key: SCol; label: string; width: number; sortable: boolean }[] = [
  { key: "name", label: "Supplier name", width: 260, sortable: true },
  { key: "type", label: "Type", width: 140, sortable: true },
  { key: "market", label: "Market", width: 220, sortable: true },
  { key: "terminals", label: "Terminals", width: 110, sortable: true },
  { key: "accounts", label: "Loading accounts", width: 150, sortable: true },
  { key: "erpId", label: "ERP ID", width: 110, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
];

const S_SEARCH = [
  { key: "name", label: "Supplier", text: (s: MdSupplier) => `${s.name} ${s.erpId}` },
  { key: "market", label: "Market", text: (s: MdSupplier) => marketsOfSupplier(s.name).join(" ") },
  { key: "terminal", label: "Terminal", text: (s: MdSupplier) => terminalsOfSupplier(s.name).join(" ") },
  { key: "account", label: "Loading account", text: (s: MdSupplier) => accountsOfSupplier(s.name).map((a) => a.name).join(" ") },
];

const S_FORM: FormSectionDef<MdSupplier>[] = [
  {
    key: "identity",
    title: "Identity",
    fields: [
      { key: "name", label: "Supplier name", kind: "text", required: true, get: (s) => s.name, set: (s, v) => ({ ...s, name: String(v ?? "") }) },
      { key: "type", label: "Type", kind: "select", required: true, options: SUPPLIER_TYPES, get: (s) => s.type, set: (s, v) => ({ ...s, type: v as MdSupplier["type"] }) },
      { key: "erpId", label: "ERP ID", kind: "text", required: true, get: (s) => s.erpId, set: (s, v) => ({ ...s, erpId: String(v ?? "") }) },
      { key: "status", label: "Record status", kind: "select", required: true, options: RECORD_STATUSES, get: (s) => s.status, set: (s, v) => ({ ...s, status: v as MdSupplier["status"] }) },
    ],
  },
  {
    key: "contact",
    title: "Contact",
    fields: [
      { key: "contact", label: "Contact", kind: "text", get: (s) => s.contact, set: (s, v) => ({ ...s, contact: text(v) }) },
      { key: "phone", label: "Phone", kind: "tel", get: (s) => s.phone, set: (s, v) => ({ ...s, phone: text(v) }) },
      {
        key: "email",
        label: "Email",
        kind: "email",
        get: (s) => s.email,
        set: (s, v) => ({ ...s, email: text(v) }),
        validate: (s) => (s.email && !s.email.includes("@") ? "Enter a valid email address" : null),
      },
      { key: "notes", label: "Internal notes", kind: "textarea", wide: true, get: (s) => s.notes, set: (s, v) => ({ ...s, notes: text(v) }) },
    ],
  },
];

const supplierValue = (s: MdSupplier, k: SCol): string | number =>
  k === "market"
    ? marketsOfSupplier(s.name).join(", ")
    : k === "terminals"
      ? terminalsOfSupplier(s.name).length
      : k === "accounts"
        ? accountsOfSupplier(s.name).length
        : s[k];

function supplierConfig(): EntityConfig<MdSupplier, SCol> {
  return {
    urlKey: "md-suppliers",
    parentLabel: "Suppliers",
    noun: "supplier",
    rowId: (s) => s.uid,
    nameOf: (s) => s.name || "New supplier",
    columns: S_COLUMNS,
    matches: (s, q) => S_SEARCH.some((f) => f.text(s).toLowerCase().includes(q)),
    searchFields: S_SEARCH,
    searchPlaceholder: "Search by supplier, market, terminal or account",
    sortRows: sorter<MdSupplier, SCol>(supplierValue),
    dimensions: [
      { key: "type", label: "Type", hides: "type", order: [...SUPPLIER_TYPES], valuesOf: (s) => [s.type] },
      { key: "market", label: "Market", multi: true, valuesOf: (s) => marketsOfSupplier(s.name) },
      { key: "status", label: "Status", hides: "status", order: RECORD_STATUSES.map(statusLabel), valuesOf: (s) => [statusLabel(s.status)] },
    ],
    facets: [
      { key: "type", label: "Type", options: [...SUPPLIER_TYPES], valueOf: (s) => s.type },
      { key: "market", label: "Market", searchable: true, options: MARKETS, valueOf: (s) => marketsOfSupplier(s.name) },
      { key: "line", label: "Line of service", options: ["Fuel", "DEF", "Lubricants", "Propane"], valueOf: (s) => linesOfSupplier(s.name) },
    ],
    measureOf: (s) => accountsOfSupplier(s.name).length,
    formatTotal: (n) => `${n} loading accounts`,
    emptyIcon: <Factory />,
    renderCell: (s, key) => {
      switch (key) {
        case "name":
          return <TwoLineCell title={s.name} description={linesOfSupplier(s.name).join(" · ")} />;
        case "type":
          return <Pill>{s.type}</Pill>;
        case "market": {
          const m = marketsOfSupplier(s.name);
          return m.length ? <Text v={m.join(", ")} /> : <Muted />;
        }
        case "terminals":
          return <Num n={terminalsOfSupplier(s.name).length} />;
        case "accounts":
          return <Num n={accountsOfSupplier(s.name).length} />;
        case "erpId":
          return <Text v={s.erpId} />;
        case "status":
          return <StatusPill s={s.status} />;
      }
    },
    exportRow: (s) => ({
      "Supplier name": s.name,
      Type: s.type,
      Market: marketsOfSupplier(s.name).join(" | "),
      Terminals: terminalsOfSupplier(s.name).join(" | "),
      "Loading accounts": accountsOfSupplier(s.name).map((a) => a.name).join(" | "),
      "Lines of service": linesOfSupplier(s.name).join(" | "),
      "ERP ID": s.erpId,
      Status: statusLabel(s.status),
    }),
    headerAsideOf: (s) => (
      <span className="flex items-center gap-1.5">
        <StatusPill s={s.status} />
        <Pill>{s.type}</Pill>
      </span>
    ),
    readSectionsOf: (s) => [
      {
        key: "supply",
        title: "What it supplies",
        render: () => (
          <ReadGrid>
            <ReadField label="Markets" value={marketsOfSupplier(s.name).join(", ") || null} />
            <ReadField label="Lines of service" value={linesOfSupplier(s.name).join(", ") || null} />
          </ReadGrid>
        ),
      },
      {
        key: "terminals",
        title: "Terminals",
        count: terminalsOfSupplier(s.name).length,
        columns: [CELL.name, CELL.pick, CELL.pick],
        render: () => (
          <SheetTable
            rows={terminalsOfSupplier(s.name)}
            rowKey={(t) => t}
            emptyBody="This supplier loads at no terminal yet."
            columns={[
              { key: "name", label: "Terminal", render: (t) => <span className="text-sm">{t}</span> },
              { key: "market", label: "Market", render: (t) => <span className="text-sm">{MD_TERMINALS.find((x) => x.name === t)?.market ?? "—"}</span> },
              { key: "accounts", label: "Accounts here", render: (t) => <span className="text-sm tabular-nums">{accountsOfSupplier(s.name).filter((a) => terminalsOf(a).includes(t)).length}</span> },
            ]}
          />
        ),
      },
      accountsSection(accountsOfSupplier(s.name), "terminal"),
    ],
    formSections: S_FORM,
    blank: (id) => ({
      uid: id,
      name: "",
      type: "Distributor",
      erpId: "",
      contact: null,
      phone: null,
      email: null,
      status: "active",
      notes: null,
      audit: [{ id: `au-${id}`, at: new Date().toISOString(), by: "Dana Whitfield", action: "Created", changes: [] }],
    }),
    statusField: { get: (s) => s.status, set: (s, next) => ({ ...s, status: next }) },
    auditOf: (s) => s.audit,
    withAudit: (s, entry) => ({ ...s, audit: [entry, ...s.audit] }),
  };
}

let keptSuppliers: MdSupplier[] = MD_SUPPLIERS;

export function MasterSuppliersScreen(props: { onTotalChange?: (label: string | null) => void; focusId?: string | null; onFocusHandled?: () => void }) {
  const [rows, setRowsState] = React.useState(keptSuppliers);
  const cfg = React.useMemo(supplierConfig, []);
  return (
    <DirectoryEntityScreen
      config={cfg}
      rows={rows}
      onRowsChange={(next) => {
        keptSuppliers = next;
        setRowsState(next);
      }}
      navigate={NO_NAV}
      {...props}
    />
  );
}
