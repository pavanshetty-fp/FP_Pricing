import * as React from "react";
import { Users } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { TwoLineCell } from "../ListTable";
import { kindTone } from "../statusKind";
import { DirectoryEntityScreen, type EntityConfig, type Navigator } from "../threepl/DirectoryEntityScreen";
import type { FormSectionDef } from "../threepl/directoryFormTypes";
import { CREDIT_STATUSES, PAYMENT_TERMS } from "../threepl/directory";
import { customerFormSections, customerHeaderAside } from "../threepl/CustomerRecord";
import { money } from "../threepl/directoryCore";
import { Muted, Reading, UsageBar } from "./assetParts";
import { currentAssets } from "./AssetsScreen";
import { CustomerSheet } from "./CustomerSheet";
import { MD_CUSTOMER_RECORDS, figuresOf, ordersOf, regionOf, shipTosOf, type MdCustomer } from "./customers";

/*
  MASTER DATA · CUSTOMERS (Pavan, 2026-11-03) — the Lovable reference's
  Customers list and Customer 360, on OUR Directory template (as Assets):
  `DirectoryEntityScreen` for the list, and Customer 360 as a full record
  sheet (CustomerSheet.tsx). The form is the 3PL Directory customer form —
  same record, same form; the reference's form asked for open orders and
  YTD revenue, which are counted, not typed.
*/

type Col = "customer" | "poc" | "region" | "sites" | "terms" | "credit" | "exposure" | "open" | "ytd";

const COLUMNS: { key: Col; label: string; width: number; sortable: boolean }[] = [
  { key: "customer", label: "Customer", width: 180, sortable: true },
  { key: "poc", label: "Primary POC", width: 170, sortable: true },
  { key: "region", label: "Region", width: 150, sortable: true },
  { key: "sites", label: "Ship-to sites", width: 120, sortable: true },
  { key: "terms", label: "Terms", width: 110, sortable: true },
  { key: "credit", label: "Credit", width: 120, sortable: true },
  { key: "exposure", label: "Exposure", width: 190, sortable: true },
  { key: "open", label: "Open orders", width: 120, sortable: true },
  { key: "ytd", label: "YTD revenue", width: 130, sortable: true },
];

/* Credit by kind — the 3PL customer sheet's chip colours. */
const CREDIT_KIND = { Approved: "success", "On hold": "caution", Unapproved: "critical" } as const;

/* THE COUNTED COLUMNS — from the orders, never typed. */
const figures = (c: MdCustomer) => figuresOf(c, ordersOf(c, currentAssets()));

/* A STATE, not a lesson — the account has no limit to draw against. */
const NO_LIMIT = "No credit limit";
const exposureCell = (c: MdCustomer) => {
  if (c.creditLimit === null) return <TwoLineCell title={money(c.currentBalance)} description={NO_LIMIT} />;
  const pct = Math.round((c.currentBalance / c.creditLimit) * 100);
  return <Reading bar={<UsageBar pct={pct} />} pct={pct} line={`${money(c.currentBalance)} / ${money(c.creditLimit)}`} />;
};

const sortValue = (c: MdCustomer, key: Col): string | number => {
  switch (key) {
    case "customer":
      return c.name;
    case "poc":
      return c.mainContactName ?? "";
    case "region":
      return regionOf(c);
    case "sites":
      return shipTosOf(c).length;
    case "terms":
      return c.paymentTerms;
    case "credit":
      return c.creditStatus;
    case "exposure":
      return c.currentBalance;
    case "open":
      return figures(c).open;
    case "ytd":
      return figures(c).ytd;
  }
};

const SEARCH_FIELDS = [
  { key: "customer", label: "Customer", text: (c: MdCustomer) => `${c.name} ${c.erpId}` },
  { key: "poc", label: "Primary POC", text: (c: MdCustomer) => c.mainContactName ?? "" },
  { key: "region", label: "Region", text: (c: MdCustomer) => regionOf(c) },
  { key: "site", label: "Ship-to site", text: (c: MdCustomer) => shipTosOf(c).map((s) => s.locationName).join(" ") },
];

const matches = (c: MdCustomer, q: string) => SEARCH_FIELDS.some((f) => f.text(c).toLowerCase().includes(q));

/* THE 3PL DIRECTORY CUSTOMER FORM — Customer 360's extra fields ride along
   (a form edit spreads the record, so aging and the review date are kept). */
const FORM = customerFormSections() as unknown as FormSectionDef<MdCustomer>[];

function config(): EntityConfig<MdCustomer, Col> {
  return {
    urlKey: "md-customers",
    parentLabel: "Customers",
    noun: "customer",
    rowId: (c) => c.uid,
    nameOf: (c) => c.name || "New customer",
    columns: COLUMNS,
    matches,
    searchFields: SEARCH_FIELDS,
    searchPlaceholder: "Search by customer, POC, region or site",
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
      { key: "credit", label: "Credit", hides: "credit", order: [...CREDIT_STATUSES], valuesOf: (c) => [c.creditStatus] },
      { key: "terms", label: "Terms", hides: "terms", order: [...PAYMENT_TERMS], valuesOf: (c) => [c.paymentTerms] },
      { key: "region", label: "Region", hides: "region", valuesOf: (c) => [regionOf(c)] },
    ],
    facets: [
      { key: "credit", label: "Credit", options: [...CREDIT_STATUSES], valueOf: (c) => c.creditStatus },
      { key: "terms", label: "Terms", options: [...PAYMENT_TERMS], valueOf: (c) => c.paymentTerms },
      { key: "region", label: "Region", searchable: true, options: [...new Set(MD_CUSTOMER_RECORDS.map(regionOf))].sort(), valueOf: (c) => regionOf(c) },
      {
        key: "limit",
        label: "Credit limit",
        options: ["Over limit", "Within limit", "No limit"],
        valueOf: (c) => (c.creditLimit === null ? "No limit" : c.currentBalance > c.creditLimit ? "Over limit" : "Within limit"),
      },
    ],
    measureOf: (c) => c.currentBalance,
    formatTotal: (n) => `${money(n)} exposure`,
    emptyIcon: <Users />,
    renderCell: (c, key) => {
      switch (key) {
        case "customer":
          return <TwoLineCell title={c.name} description={c.erpId} />;
        case "poc":
          return c.mainContactName ? <TwoLineCell title={c.mainContactName} description={c.mainContactRole ?? ""} /> : <Muted />;
        case "region":
          return <span className="truncate text-sm text-foreground">{regionOf(c)}</span>;
        case "sites":
          return <span className="text-sm tabular-nums text-foreground">{shipTosOf(c).length}</span>;
        case "terms":
          return <span className="text-sm text-foreground">{c.paymentTerms}</span>;
        case "credit":
          return <StatusChip tone={kindTone(CREDIT_KIND[c.creditStatus])}>{c.creditStatus}</StatusChip>;
        case "exposure":
          return exposureCell(c);
        case "open":
          return <span className="text-sm tabular-nums text-foreground">{figures(c).open}</span>;
        case "ytd":
          return <span className="text-sm tabular-nums text-foreground">{money(figures(c).ytd)}</span>;
      }
    },
    exportRow: (c) => {
      const f = figures(c);
      return {
        Customer: c.name,
        "ERP ID": c.erpId,
        "Primary POC": c.mainContactName ?? "",
        Region: regionOf(c),
        "Ship-to sites": shipTosOf(c).length,
        Terms: c.paymentTerms,
        Credit: c.creditStatus,
        Exposure: c.currentBalance,
        "Credit limit": c.creditLimit ?? "",
        "Open orders": f.open,
        "YTD revenue": f.ytd,
      };
    },
    headerAsideOf: customerHeaderAside,
    /* Customer 360 draws the record (`renderRecord`). */
    readSectionsOf: () => [],
    renderRecord: ({ row, onClose, onChange }) => <CustomerSheet customer={row} form={FORM} onClose={onClose} onChange={onChange} />,
    formSections: FORM,
    blank: (id) => ({
      uid: id,
      id,
      name: "",
      erpId: "",
      status: "active",
      phone: null,
      secondaryPhone: null,
      email: null,
      billingEmail: null,
      dispatchEmail: null,
      mainContactName: null,
      mainContactRole: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      zip: null,
      country: "USA",
      creditStatus: "Unapproved",
      creditLimit: null,
      currentBalance: 0,
      paymentTerms: "Net 30",
      taxId: null,
      taxExempt: false,
      currency: "USD",
      accountingCustomerId: null,
      customerInstruction: null,
      deliveryNotes: null,
      defaultShipToId: null,
      preferredVendorId: null,
      portalAccessEnabled: false,
      tags: [],
      notes: null,
      attachments: [],
      contacts: [],
      audit: [{ id: `au-${id}`, at: new Date().toISOString(), by: "Dana Whitfield", action: "Created", changes: [] }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aging: { current: 0, late30: 0, late60: 0, late60plus: 0 },
      avgDaysToPay: 0,
      lastCreditReview: new Date().toISOString().slice(0, 10),
    }),
    statusField: {
      get: (c) => c.status,
      set: (c, next) => ({ ...c, status: next, updatedAt: new Date().toISOString() }),
    },
    auditOf: (c) => c.audit,
    withAudit: (c, entry) => ({ ...c, audit: [entry, ...c.audit], updatedAt: entry.at }),
  };
}

/* The list's records outlive a visit to another page in the session. */
let kept: MdCustomer[] = MD_CUSTOMER_RECORDS;
/** The customers as they are now — Ship-to 360 reads its customer from here. */
export const currentCustomers = () => kept;

const NO_NAV: Navigator = {
  openCustomer: () => {},
  openVendor: () => {},
  openProduct: () => {},
  openAsset: () => {},
};

export function MasterCustomersScreen({
  onTotalChange,
  focusId,
  onFocusHandled,
}: {
  onTotalChange?: (label: string | null) => void;
  /** A record to open on arrival — a shared link to one customer. */
  focusId?: string | null;
  onFocusHandled?: () => void;
}) {
  const [rows, setRowsState] = React.useState<MdCustomer[]>(kept);
  const setRows = React.useCallback((next: MdCustomer[]) => {
    kept = next;
    setRowsState(next);
  }, []);
  const cfg = React.useMemo(() => config(), []);
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
