/*
  Customers — the third rail destination.

  Columns are the four that were specified: Name (with its ERP id), Ship-Tos,
  LOS, Status.

  The SHIP-TOS cell reuses the truncation idiom the Fuel Orders Product and Tags
  cells already use: show what fits and put the remainder behind a `+N`. Here the
  brief was explicitly "one name, and we can show +1, +2", so this one is capped
  at a single name by design rather than measured — the count is the information,
  the first name is just an anchor.

  LOS values (Transportation, Tank Wagon, Propane) were given. Status is
  Active/Inactive, which is the rulebook's own status vocabulary for records
  (§6: "labelled toggle row controls active/inactive; reflected as a status value
  in lists") — so the sheet edits it as a switch, not a picker.

  INVENTED, and flagged: the ERP ids, the ship-to names beyond those already in
  the Fuel Orders dataset, and the contact fields the sheet carries.
*/

export type LineOfService = "Transportation" | "Tank Wagon" | "Propane";

export const LINES_OF_SERVICE: LineOfService[] = [
  "Transportation",
  "Tank Wagon",
  "Propane",
];

export type CustomerStatus = "Active" | "Inactive";

export interface Customer {
  id: string;
  /** Account name. */
  name: string;
  /** ERP id, shown under the name in the same two-line cell shape. */
  erpId: string;
  /** Every ship-to under the account. The cell shows the first plus `+N`. */
  shipTos: string[];
  /** An account can carry more than one line of service. */
  los: LineOfService[];
  status: CustomerStatus;
  /** Sheet-only fields. */
  billingTerms: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  note: string;
}

export type CustomerColumnKey =
  | "name"
  | "shipTos"
  | "los"
  | "status"
  | "actions";

export interface CustomerColumnDef {
  key: CustomerColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
}

export const CUSTOMER_COLUMNS: CustomerColumnDef[] = [
  { key: "name", label: "Customer", width: 250, sortable: true },
  /* EVERY COLUMN SORTS (Pavan, 2026-10-07) — DS rule. Ship-tos by count. */
  { key: "shipTos", label: "Ship-Tos", width: 170, sortable: true },
  { key: "los", label: "LOS", width: 300, sortable: true },
  { key: "status", label: "Status", width: 100, sortable: true },
  { key: "actions", label: "", width: 44 },
];

export const BILLING_TERMS = ["Net 15", "Net 30", "Net 45", "Prepaid"];

export const CUSTOMERS: Customer[] = [
  {
    id: "cu-1",
    name: "Bray, Raymond and Marks",
    erpId: "ERP 418223",
    shipTos: ["Bray, Raymond and Marks", "Bray North Yard", "Bray Depot 2"],
    los: ["Transportation", "Tank Wagon"],
    status: "Active",
    billingTerms: "Net 30",
    contactName: "Alicia Bray",
    contactEmail: "alicia@brayraymond.example",
    contactPhone: "(415) 555-0142",
    note: "",
  },
  {
    id: "cu-2",
    name: "Morris Group",
    erpId: "ERP 505112",
    shipTos: [
      "Morris Group - 505112",
      "Morris Group - 505118",
      "Morris West Terminal",
      "Morris Yard 4",
    ],
    los: ["Tank Wagon"],
    status: "Active",
    billingTerms: "Net 15",
    contactName: "Dev Morris",
    contactEmail: "dev@morrisgroup.example",
    contactPhone: "(312) 555-0198",
    note: "",
  },
  {
    id: "cu-3",
    name: "Gonzalez, Palmer and Miller",
    erpId: "ERP 331904",
    shipTos: ["Gonzalez, Palmer and Miller", "GPM Southside"],
    los: ["Propane", "Transportation", "Tank Wagon"],
    status: "Active",
    billingTerms: "Net 45",
    contactName: "Renata Palmer",
    contactEmail: "renata@gpm.example",
    contactPhone: "(206) 555-0117",
    note: "",
  },
  {
    id: "cu-4",
    name: "Halvorsen Fuel Co.",
    erpId: "ERP 227740",
    shipTos: ["Halvorsen Main"],
    los: ["Propane"],
    status: "Inactive",
    billingTerms: "Prepaid",
    contactName: "Ed Halvorsen",
    contactEmail: "ed@halvorsen.example",
    contactPhone: "(503) 555-0164",
    note: "",
  },
  {
    id: "cu-5",
    name: "Cardinal Logistics",
    erpId: "ERP 610882",
    shipTos: ["Cardinal Hub A", "Cardinal Hub B", "Cardinal Overflow"],
    los: ["Transportation"],
    status: "Active",
    billingTerms: "Net 30",
    contactName: "Joy Nakamura",
    contactEmail: "joy@cardinallog.example",
    contactPhone: "(702) 555-0155",
    note: "",
  },
  {
    id: "cu-6",
    name: "Westbrook Agriculture",
    erpId: "ERP 884001",
    shipTos: ["Westbrook Farm 1", "Westbrook Farm 2"],
    los: ["Tank Wagon", "Propane"],
    status: "Active",
    billingTerms: "Net 30",
    contactName: "Sam Westbrook",
    contactEmail: "sam@westbrookag.example",
    contactPhone: "(559) 555-0173",
    note: "",
  },
  {
    id: "cu-7",
    name: "Ironline Transit",
    erpId: "ERP 990233",
    shipTos: ["Ironline Depot"],
    los: ["Transportation"],
    status: "Inactive",
    billingTerms: "Net 15",
    contactName: "Nia Okafor",
    contactEmail: "nia@ironline.example",
    contactPhone: "(212) 555-0129",
    note: "",
  },
];

/* ---- sorting / searching ---- */

export type CustomerSortDir = "asc" | "desc";
export interface CustomerSortState {
  key: CustomerColumnKey;
  dir: CustomerSortDir;
}

function sortValue(c: Customer, key: CustomerColumnKey): string | number {
  switch (key) {
    case "name":
      return c.name.toLowerCase();
    case "shipTos":
      return c.shipTos.length;
    case "los":
      return c.los.join(" ").toLowerCase();
    case "status":
      return c.status;
    default:
      return "";
  }
}

export function sortCustomers(
  rows: Customer[],
  sort: CustomerSortState | null
): Customer[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

export function matchesCustomer(c: Customer, q: string): boolean {
  return [c.name, c.erpId, c.shipTos.join(" "), c.los.join(" "), c.status, c.contactName]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export const CUSTOMER_SEARCH_FIELDS = [
  {
    key: "name",
    label: "Customer",
    text: (c: Customer) => `${c.name} ${c.erpId}`,
  },
  { key: "shipTos", label: "Ship-Tos", text: (c: Customer) => c.shipTos.join(" ") },
  { key: "los", label: "LOS", text: (c: Customer) => c.los.join(" ") },
  { key: "status", label: "Status", text: (c: Customer) => c.status },
];

export function matchesCustomerIn(
  c: Customer,
  q: string,
  scope: string
): boolean {
  if (!q) return true;
  const f = CUSTOMER_SEARCH_FIELDS.find((x) => x.key === scope);
  return f ? f.text(c).toLowerCase().includes(q) : true;
}
