import * as React from "react";
import { MapPin } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { TwoLineCell } from "../ListTable";
import { ACTIVE_KIND, kindTone } from "../statusKind";
import { DirectoryEntityScreen, type EntityConfig, type Navigator } from "../threepl/DirectoryEntityScreen";
import type { FormSectionDef } from "../threepl/directoryFormTypes";
import { RECORD_STATUSES } from "../threepl/directoryCore";
import { Muted } from "./assetParts";
import { currentAssets } from "./AssetsScreen";
import { MD_CUSTOMER_NAMES, currentShipTos, keepShipTos, siteAddress, type MdShipTo } from "./customers";
import { ShipToSheet, recordStatusLabel } from "./ShipToSheet";

/*
  MASTER DATA · SHIP-TOS (Pavan, 2026-11-03) — the Lovable reference's
  ShipTos list and ShipTo 360, on the Directory template (as Customers and
  Assets): the list here, Ship-to 360 as a full record sheet
  (ShipToSheet.tsx). The record is the Directory's `ShipToLocation` shape.
  Rental and customer-owned counts are COUNTED from the assets on the site.
*/

type Col = "shipTo" | "location" | "customer" | "address" | "contact" | "rental" | "owned" | "status";

const COLUMNS: { key: Col; label: string; width: number; sortable: boolean }[] = [
  { key: "shipTo", label: "Ship-to", width: 110, sortable: true },
  { key: "location", label: "Location", width: 200, sortable: true },
  { key: "customer", label: "Customer", width: 160, sortable: true },
  { key: "address", label: "Address", width: 300, sortable: true },
  { key: "contact", label: "Contact", width: 170, sortable: true },
  { key: "rental", label: "Rental assets", width: 120, sortable: true },
  { key: "owned", label: "Customer-owned", width: 140, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
];

const assetsAt = (s: MdShipTo) => currentAssets().filter((a) => a.site === s.locationName);
const rentalAt = (s: MdShipTo) => assetsAt(s).filter((a) => a.ownership === "Rental").length;
const ownedAt = (s: MdShipTo) => assetsAt(s).length - rentalAt(s);

const sortValue = (s: MdShipTo, key: Col): string | number => {
  switch (key) {
    case "shipTo":
      return s.id;
    case "location":
      return s.locationName;
    case "customer":
      return s.customer;
    case "address":
      return siteAddress(s);
    case "contact":
      return s.contact ?? "";
    case "rental":
      return rentalAt(s);
    case "owned":
      return ownedAt(s);
    case "status":
      return s.status;
  }
};

const SEARCH_FIELDS = [
  { key: "location", label: "Location", text: (s: MdShipTo) => `${s.id} ${s.locationName}` },
  { key: "customer", label: "Customer", text: (s: MdShipTo) => s.customer },
  { key: "address", label: "Address", text: (s: MdShipTo) => siteAddress(s) },
  { key: "contact", label: "Contact", text: (s: MdShipTo) => s.contact ?? "" },
];

const matches = (s: MdShipTo, q: string) => SEARCH_FIELDS.some((f) => f.text(s).toLowerCase().includes(q));

const text = (v: string | number | boolean | null) => (typeof v === "string" && v !== "" ? v : null);
const coord = (v: string | number | boolean | null) => (v === null || v === "" ? null : Number(v));

const FORM: FormSectionDef<MdShipTo>[] = [
  {
    key: "identity",
    title: "Identity",
    fields: [
      { key: "id", label: "Ship-to ID", kind: "text", required: true, get: (s) => s.id, set: (s, v) => ({ ...s, id: String(v ?? "") }) },
      { key: "locationName", label: "Location name", kind: "text", required: true, get: (s) => s.locationName, set: (s, v) => ({ ...s, locationName: String(v ?? "") }) },
      { key: "customer", label: "Customer", kind: "combobox", required: true, options: MD_CUSTOMER_NAMES, get: (s) => s.customer, set: (s, v) => ({ ...s, customer: String(v ?? "") }) },
      { key: "status", label: "Record status", kind: "select", required: true, options: RECORD_STATUSES, get: (s) => s.status, set: (s, v) => ({ ...s, status: v as MdShipTo["status"] }) },
      { key: "isDefault", label: "Default site", kind: "switch", get: (s) => s.isDefault, set: (s, v) => ({ ...s, isDefault: Boolean(v) }) },
    ],
  },
  {
    key: "address",
    title: "Address",
    fields: [
      { key: "addressLine1", label: "Address line 1", kind: "text", required: true, get: (s) => s.addressLine1, set: (s, v) => ({ ...s, addressLine1: String(v ?? "") }) },
      { key: "addressLine2", label: "Address line 2", kind: "text", get: (s) => s.addressLine2, set: (s, v) => ({ ...s, addressLine2: text(v) }) },
      { key: "city", label: "City", kind: "text", required: true, get: (s) => s.city, set: (s, v) => ({ ...s, city: String(v ?? "") }) },
      { key: "state", label: "State", kind: "text", required: true, get: (s) => s.state, set: (s, v) => ({ ...s, state: String(v ?? "") }) },
      {
        key: "zip",
        label: "Zip",
        kind: "text",
        required: true,
        get: (s) => s.zip,
        set: (s, v) => ({ ...s, zip: String(v ?? "") }),
        validate: (s) => (s.zip && !/^\d{5}(-\d{4})?$/.test(s.zip) ? "Use a 5-digit ZIP, or ZIP+4" : null),
      },
      { key: "country", label: "Country", kind: "text", get: (s) => s.country, set: (s, v) => ({ ...s, country: String(v ?? "USA") }) },
      {
        key: "latitude",
        label: "Latitude",
        kind: "number",
        get: (s) => s.latitude,
        set: (s, v) => ({ ...s, latitude: coord(v) }),
        validate: (s) => (s.latitude !== null && Math.abs(s.latitude) > 90 ? "Latitude runs from -90 to 90" : null),
      },
      {
        key: "longitude",
        label: "Longitude",
        kind: "number",
        get: (s) => s.longitude,
        set: (s, v) => ({ ...s, longitude: coord(v) }),
        validate: (s) => (s.longitude !== null && Math.abs(s.longitude) > 180 ? "Longitude runs from -180 to 180" : null),
      },
    ],
  },
  {
    key: "contact",
    title: "Site contact",
    fields: [
      { key: "contact", label: "Contact", kind: "text", get: (s) => s.contact, set: (s, v) => ({ ...s, contact: text(v) }) },
      { key: "phone", label: "Phone", kind: "tel", get: (s) => s.phone, set: (s, v) => ({ ...s, phone: text(v) }) },
      { key: "notes", label: "Notes", kind: "textarea", wide: true, get: (s) => s.notes, set: (s, v) => ({ ...s, notes: text(v) }) },
    ],
  },
];

function config(onOpenCustomer?: (uid: string) => void): EntityConfig<MdShipTo, Col> {
  return {
    urlKey: "md-ship-tos",
    parentLabel: "Ship-tos",
    noun: "ship-to",
    rowId: (s) => s.uid,
    nameOf: (s) => s.locationName || "New ship-to",
    columns: COLUMNS,
    matches,
    searchFields: SEARCH_FIELDS,
    searchPlaceholder: "Search by location, customer, address or contact",
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
      { key: "customer", label: "Customer", hides: "customer", valuesOf: (s) => [s.customer] },
      { key: "state", label: "State", valuesOf: (s) => [s.state] },
      { key: "status", label: "Status", hides: "status", order: RECORD_STATUSES.map(recordStatusLabel), valuesOf: (s) => [recordStatusLabel(s.status)] },
    ],
    facets: [
      { key: "customer", label: "Customer", searchable: true, options: [...MD_CUSTOMER_NAMES], valueOf: (s) => s.customer },
      { key: "state", label: "State", options: [...new Set(currentShipTos().map((s) => s.state))].sort(), valueOf: (s) => s.state },
      { key: "assets", label: "Assets", options: ["With assets", "No assets"], valueOf: (s) => (assetsAt(s).length ? "With assets" : "No assets") },
    ],
    measureOf: (s) => assetsAt(s).length,
    formatTotal: (n) => `${n} ${n === 1 ? "asset" : "assets"} placed`,
    emptyIcon: <MapPin />,
    renderCell: (s, key) => {
      switch (key) {
        case "shipTo":
          return <span className="text-sm tabular-nums text-foreground">{s.id}</span>;
        case "location":
          return s.isDefault ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm text-foreground">{s.locationName}</span>
              <Pill>Default</Pill>
            </span>
          ) : (
            <span className="truncate text-sm text-foreground">{s.locationName}</span>
          );
        case "customer":
          return <span className="truncate text-sm text-foreground">{s.customer}</span>;
        case "address":
          return <span className="truncate text-sm text-foreground">{siteAddress(s)}</span>;
        case "contact":
          return s.contact ? <TwoLineCell title={s.contact} description={s.phone ?? ""} /> : <Muted />;
        case "rental":
          return <span className="text-sm tabular-nums text-foreground">{rentalAt(s)}</span>;
        case "owned":
          return <span className="text-sm tabular-nums text-foreground">{ownedAt(s)}</span>;
        case "status":
          return (
            <StatusChip tone={kindTone(ACTIVE_KIND(s.status === "active"))} variant="soft">
              {recordStatusLabel(s.status)}
            </StatusChip>
          );
      }
    },
    exportRow: (s) => ({
      "Ship-to": s.id,
      Location: s.locationName,
      Customer: s.customer,
      Address: siteAddress(s),
      Latitude: s.latitude ?? "",
      Longitude: s.longitude ?? "",
      Contact: s.contact ?? "",
      Phone: s.phone ?? "",
      "Rental assets": rentalAt(s),
      "Customer-owned": ownedAt(s),
      Default: s.isDefault ? "Yes" : "No",
      Status: recordStatusLabel(s.status),
    }),
    headerAsideOf: (s) => (
      <StatusChip tone={kindTone(ACTIVE_KIND(s.status === "active"))} variant="soft">
        {recordStatusLabel(s.status)}
      </StatusChip>
    ),
    /* Ship-to 360 draws the record (`renderRecord`). */
    readSectionsOf: () => [],
    renderRecord: ({ row, onClose, onChange }) => (
      <ShipToSheet site={row} form={FORM} onClose={onClose} onChange={onChange} onOpenCustomer={onOpenCustomer} />
    ),
    formSections: FORM,
    blank: (id) => ({
      uid: id,
      id: "",
      customer: "",
      locationName: "",
      addressLine1: "",
      addressLine2: null,
      city: "",
      state: "",
      zip: "",
      country: "USA",
      latitude: null,
      longitude: null,
      isDefault: false,
      status: "active",
      contact: null,
      phone: null,
      notes: null,
      audit: [{ id: `au-${id}`, at: new Date().toISOString(), by: "Dana Whitfield", action: "Created", changes: [] }],
    }),
    statusField: {
      get: (s) => s.status,
      set: (s, next) => ({ ...s, status: next }),
    },
    auditOf: (s) => s.audit,
    withAudit: (s, entry) => ({ ...s, audit: [entry, ...s.audit] }),
  };
}

const NO_NAV: Navigator = {
  openCustomer: () => {},
  openVendor: () => {},
  openProduct: () => {},
  openAsset: () => {},
};

export function MasterShipTosScreen({
  onTotalChange,
  focusId,
  onFocusHandled,
  onOpenCustomer,
}: {
  onTotalChange?: (label: string | null) => void;
  /** A record to open on arrival — a shared link to one ship-to. */
  focusId?: string | null;
  onFocusHandled?: () => void;
  /** The reference's "Customer profile" — opens that Customer 360. */
  onOpenCustomer?: (uid: string) => void;
}) {
  const [rows, setRowsState] = React.useState<MdShipTo[]>(currentShipTos);
  const setRows = React.useCallback((next: MdShipTo[]) => {
    keepShipTos(next);
    setRowsState(next);
  }, []);
  const cfg = React.useMemo(() => config(onOpenCustomer), [onOpenCustomer]);
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
