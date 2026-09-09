import * as React from "react";
import { Boxes, Contact, Droplet, NotebookPen, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyValue } from "@/components/ui/copy-value";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OverflowList, TwoLineCell } from "../ListTable";
import { ReadDrawer } from "./DirectoryRecordSheet";
import {
  DirectoryEntityScreen,
  activeBulkAction,
  tagBulkAction,
  type EntityConfig,
  type Navigator,
} from "./DirectoryEntityScreen";
import {
  DASH,
  PLACES,
  STATE_NAMES,
  blank,
  daysFromToday,
  formatDate,
  money,
  oneLineAddress,
  type RecordStatus,
} from "./directoryCore";
import {
  BROKER_CUSTOMERS,
  BROKER_PRODUCTS,
  CREDIT_STATUSES,
  MAINTENANCE_STATUSES,
  PAYMENT_TERMS,
  PRODUCT_CATEGORIES,
  RENTAL_ASSETS,
  RENTAL_STATUSES,
  RENTAL_TYPES,
  UNITS_OF_MEASURE,
  creditAvailable,
  creditBlocked,
  customerReach,
  endingSoon,
  monthlyRevenue,
  shipToNames,
  type BrokerCustomer,
  type BrokerProduct,
  type RentalAsset,
} from "./directory";
import {
  BROKER_CUSTOMER_COLUMNS,
  BROKER_CUSTOMER_GROUP_DIMS,
  BROKER_CUSTOMER_SEARCH_FIELDS,
  BROKER_PRODUCT_COLUMNS,
  BROKER_PRODUCT_GROUP_DIMS,
  BROKER_PRODUCT_SEARCH_FIELDS,
  RENTAL_ASSET_COLUMNS,
  RENTAL_ASSET_GROUP_DIMS,
  RENTAL_ASSET_SEARCH_FIELDS,
  matchesAsset,
  matchesCustomer,
  matchesProduct,
  sortAssets,
  sortCustomers,
  sortProducts,
  type BrokerCustomerColumnKey,
  type BrokerProductColumnKey,
  type RentalAssetColumnKey,
} from "./directoryDims";
import {
  AVAILABILITY_STATUSES,
  BUSINESS_LINES,
  COMPLIANCE_STATUSES,
  DISTANCE_BANDS,
  SAFETY_BANDS,
  VENDORS,
  VENDOR_COLUMNS,
  VENDOR_SEARCH_FIELDS,
  assignedOrderCount,
  distanceBand,
  hasOverdueDocs,
  matchesVendor,
  safetyBand,
  sortVendors,
  type Vendor,
  type VendorColumnKey,
} from "./vendors";
import "./directoryLinks";
import {
  assetsForCustomer,
  ordersForCustomer,
  vendorsForProduct,
} from "./directoryLinks";
import { customerFormSections, customerHeaderAside, customerReadSections } from "./CustomerRecord";
import { vendorFormSections, vendorHeaderAside, vendorReadSections } from "./VendorRecord";
import { productFormSections, productHeaderAside, productReadSections } from "./ProductRecord";
import { assetFormSections, assetHeaderAside, assetReadSections } from "./AssetRecord";

/*
  The four Directory screens.

  EACH ONE IS A CONFIG, not a component. What differs between Customers and
  Rental Assets is entirely declarative — columns, cells, facets, what a record
  page shows, what a form asks — and `DirectoryEntityScreen` does the rest. The
  point is not brevity: it is that the fourth screen cannot behave differently
  from the first by accident.

  MISSING VALUES ARE PRINTED, NOT SUPPRESSED. `-` for a field somebody has not
  filled in, `N/A` for one that does not apply. A cell that goes blank makes an
  incomplete record look complete, and the whole reason to have a directory is
  to see which records are not finished.
*/

/* ── shared cell helpers ───────────────────────────────────────────────── */

const Muted = ({ children = DASH }: { children?: React.ReactNode }) => (
  <span className="text-sm text-muted-foreground/70">{children}</span>
);

/** Long text that has to fit a column: clipped, with the whole of it on hover. */
function Clamped({ text }: { text: string | null }) {
  if (!text) return <Muted />;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block truncate text-sm text-foreground">{text}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

const Money = ({ value, cents = false }: { value: number | null; cents?: boolean }) =>
  value === null ? <Muted /> : <span className="text-sm tabular-nums">{money(value, cents)}</span>;

const RECORD_STATUS_TONE = (s: RecordStatus) =>
  s === "active" ? ("success" as const) : ("neutral" as const);

function RecordStatusChip({ status }: { status: RecordStatus }) {
  return (
    <StatusChip tone={RECORD_STATUS_TONE(status)} variant="text">
      <span className="capitalize">{status}</span>
    </StatusChip>
  );
}

const STATE_CODES = Object.keys(STATE_NAMES);
const CITY_NAMES = [...new Set(PLACES.map((p) => p.city))];

/* ═══════════════════════════════════════════════════════════════ customers ═ */

export function customerConfig(
  /* The instruction cell OPENS something, so it needs a handler; the screen
     owns that state because the drawer lives beside the list, not in it. */
  onOpenNote: (c: BrokerCustomer) => void
): EntityConfig<BrokerCustomer, BrokerCustomerColumnKey> {
  return {
    urlKey: "customers",
    parentLabel: "Customers",
    noun: "customer",
    rowId: (c) => c.id,
    nameOf: (c) => c.name,
    columns: BROKER_CUSTOMER_COLUMNS,
    matches: matchesCustomer,
    searchFields: BROKER_CUSTOMER_SEARCH_FIELDS,
    searchPlaceholder: "Search by customer name",
    sortRows: sortCustomers,
    dimensions: BROKER_CUSTOMER_GROUP_DIMS,
    emptyIcon: <Contact />,
    /* THE ONE THING THAT SUMS. Dollars owed add up; a credit limit does not,
       because a group of accounts does not share one limit. */
    measureOf: (c) => c.currentBalance,
    measureUnit: "",
    formatTotal: (n) => `${money(n)} outstanding`,

    renderCell: (c, key) => {
      switch (key) {
        case "name":
          /* ONE LINE. The ERP id used to ride under the name AND have its own
             column — the same string twice, three characters apart. It kept
             the column. */
          return <span className="text-sm font-medium text-foreground">{c.name}</span>;
        case "erpId":
          return <span className="text-sm tabular-nums">{c.erpId}</span>;
        case "poc":
          /* NAME OVER NUMBER, and the number is why the Phone column is gone:
             it was printing this same string one column to the left. */
          return c.mainContactName ? (
            <TwoLineCell title={c.mainContactName} description={blank(c.phone)} />
          ) : c.phone ? (
            <span className="text-sm tabular-nums">{c.phone}</span>
          ) : (
            <Muted />
          );
        case "address":
          /* STREET OVER PLACE. A postal address is one fact, and the second
             line takes the same muted treatment the ERP id used to have under
             the name — near enough to read as part of the same thing, quiet
             enough not to compete with the street. */
          if (!c.addressLine1 && !c.city && !c.state && !c.zip) return <Muted />;
          return (
            <TwoLineCell
              title={c.addressLine1 ?? DASH}
              description={
                [c.city, [c.state, c.zip].filter(Boolean).join(" ")]
                  .filter(Boolean)
                  .join(", ") || DASH
              }
            />
          );
        case "credit": {
          const over = c.creditLimit !== null && c.currentBalance > c.creditLimit;
          return (
            <div className="flex min-w-0 flex-col gap-0.5">
              <StatusChip
                tone={
                  c.creditStatus === "Approved"
                    ? "success"
                    : c.creditStatus === "On hold"
                      ? "processing"
                      : "failed"
                }
                variant="text"
              >
                {c.creditStatus}
              </StatusChip>
              {/* NO LIMIT IS NOT ZERO. Printing `$0` would block orders that
                  should go through, so it says so in words — and under the
                  status, where "Not set" reads as expected beside Unapproved
                  and as an omission beside Approved. */}
              <span
                className="truncate text-xs tabular-nums text-muted-foreground"
                title={over ? `Over the ${money(c.creditLimit)} limit` : undefined}
              >
                {c.creditLimit === null ? "No limit set" : `${money(c.creditLimit)} limit`}
              </span>
            </div>
          );
        }
        case "balance": {
          const over = creditBlocked(c) && c.creditLimit !== null && c.currentBalance > c.creditLimit;
          return (
            <span
              className={`text-sm tabular-nums ${over ? "font-medium text-status-failed" : ""}`}
              title={over ? `Over the ${money(c.creditLimit)} limit` : undefined}
            >
              {money(c.currentBalance)}
            </span>
          );
        }
        case "shipTos":
          return <OverflowList values={shipToNames(c)} label="ship-to" />;
        case "terms":
          return <span className="text-sm">{c.paymentTerms}</span>;
        case "status":
          return <RecordStatusChip status={c.status} />;
        case "instruction":
          /*
            AN ICON, NOT A TRUNCATED SENTENCE.

            The instruction is prose — a gate code, a rule about Fridays — and
            a 320px column showed the first six words of it followed by an
            ellipsis. Six words of a driver instruction is worse than none:
            long enough to look like the whole thing, short enough to be
            missing the part that matters. The icon says one exists and opens
            it in full; an account with none shows nothing at all, which is
            the honest answer and scans far faster down a column.
          */
          return c.customerInstruction || c.deliveryNotes ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Read delivery instructions for ${c.name}`}
                  onClick={() => onOpenNote(c)}
                >
                  <NotebookPen />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Read delivery instructions</TooltipContent>
            </Tooltip>
          ) : (
            <Muted />
          );
        default:
          return null;
      }
    },

    facets: [
      { key: "status", label: "Status", options: ["active", "inactive", "archived"], valueOf: (c) => c.status },
      { key: "credit", label: "Credit Status", options: [...CREDIT_STATUSES], valueOf: (c) => c.creditStatus },
      { key: "terms", label: "Payment Terms", options: [...PAYMENT_TERMS], valueOf: (c) => c.paymentTerms },
      { key: "state", label: "State", options: STATE_CODES, searchable: true, valueOf: (c) => c.state ?? "" },
      { key: "city", label: "City", options: CITY_NAMES, searchable: true, valueOf: (c) => c.city ?? "" },
      {
        key: "balance",
        label: "Balance",
        options: ["Has balance", "Zero balance", "Over limit"],
        valueOf: (c) => {
          const out: string[] = [c.currentBalance > 0 ? "Has balance" : "Zero balance"];
          if (c.creditLimit !== null && c.currentBalance > c.creditLimit) out.push("Over limit");
          return out;
        },
      },
      {
        key: "activity",
        label: "Activity",
        options: ["Has active orders", "Has recurring orders", "Has rental assets", "No orders"],
        valueOf: (c) => {
          const orders = ordersForCustomer(c.name);
          const out: string[] = [];
          if (orders.some((o) => !["Completed", "Accounting Synced", "Cancelled"].includes(o.status))) {
            out.push("Has active orders");
          }
          if (orders.some((o) => o.kind === "Recurring")) out.push("Has recurring orders");
          if (assetsForCustomer(c.id).length > 0) out.push("Has rental assets");
          if (orders.length === 0) out.push("No orders");
          return out;
        },
      },
      {
        key: "tagged",
        label: "Tags",
        options: ["Tagged", "Untagged"],
        valueOf: (c) => (c.tags.length > 0 ? "Tagged" : "Untagged"),
      },
      {
        key: "recent",
        label: "Recency",
        options: ["Created in 30 days", "Updated in 7 days", "Updated in 30 days"],
        valueOf: (c) => {
          const out: string[] = [];
          const created = daysFromToday(c.createdAt.slice(0, 10)) ?? -999;
          const updated = daysFromToday(c.updatedAt.slice(0, 10)) ?? -999;
          if (created >= -30) out.push("Created in 30 days");
          if (updated >= -7) out.push("Updated in 7 days");
          if (updated >= -30) out.push("Updated in 30 days");
          return out;
        },
      },
    ],

    exportRow: (c) => ({
      "Customer Name": c.name,
      "ERP ID": c.erpId,
      Status: c.status,
      Phone: blank(c.phone),
      Address: oneLineAddress(c),
      City: blank(c.city),
      State: blank(c.state),
      Zip: blank(c.zip),
      Credit: c.creditStatus,
      "Credit Limit": c.creditLimit ?? "",
      "Current Balance": c.currentBalance,
      "Available Credit": creditAvailable(c) ?? "",
      Terms: c.paymentTerms,
      "Primary POC": blank(c.mainContactName),
      "Ship-Tos": shipToNames(c).join(" | "),
      "Customer Instruction": blank(c.customerInstruction),
      Tags: c.tags.join(" | "),
    }),

    headerAsideOf: customerHeaderAside,
    readSectionsOf: (c, go) => customerReadSections(c, go),

    formSections: customerFormSections(),
    blank: (id) => ({
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
      audit: [
        {
          id: `au-${Date.now().toString(36)}`,
          at: new Date().toISOString(),
          by: "Dana Whitfield",
          action: "Created",
          changes: ["Customer record created"],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    statusField: {
      get: (c) => c.status,
      set: (c, next) => ({ ...c, status: next, updatedAt: new Date().toISOString() }),
    },
    auditOf: (c) => c.audit,
    withAudit: (c, entry) => ({
      ...c,
      audit: [entry, ...c.audit],
      updatedAt: entry.at,
    }),
    extraBulkActions: (selected, apply) => [
      tagBulkAction<BrokerCustomer>(
        apply,
        (c, tag) => (c.tags.includes(tag) ? c : { ...c, tags: [...c.tags, tag] }),
        selected.length
      ),
    ],
  };
}

/* ═════════════════════════════════════════════════════════════════ vendors ═ */

export function vendorConfig(
  onOpenNote: (v: Vendor) => void
): EntityConfig<Vendor, VendorColumnKey> {
  return {
    urlKey: "vendors",
    parentLabel: "Vendors",
    noun: "vendor",
    rowId: (v) => v.id,
    nameOf: (v) => v.name,
    columns: VENDOR_COLUMNS,
    matches: matchesVendor,
    searchFields: VENDOR_SEARCH_FIELDS,
    searchPlaceholder: "Search vendors, contacts, cities, states, products…",
    sortRows: sortVendors,
    dimensions: [
      { key: "lines", label: "Business Line", multi: true, valuesOf: (v: Vendor) => v.businessLines },
      /* No `hides` on either: compliance now lives under the vendor's name and
         state inside Address, and hiding those columns while grouped would
         take the name and the street away with them. */
      { key: "compliance", label: "Compliance", order: [...COMPLIANCE_STATUSES], valuesOf: (v: Vendor) => [v.complianceStatus] },
      { key: "state", label: "Home State", valuesOf: (v: Vendor) => (v.state ? [v.state] : []) },
      { key: "availability", label: "Availability", order: [...AVAILABILITY_STATUSES], valuesOf: (v: Vendor) => [v.availabilityStatus] },
      { key: "safety", label: "Safety Band", order: [...SAFETY_BANDS], valuesOf: (v: Vendor) => [safetyBand(v.safetyScore)] },
    ],
    /* NOTHING SUMS. A safety score is a property of one vendor, and a summed
       distance is meaningless — so the footer counts and claims nothing. */
    emptyIcon: <Truck />,

    renderCell: (v, key) => {
      switch (key) {
        case "name": {
          /*
            COMPLIANCE RIDES UNDER THE NAME, where the legal name used to.

            It is the fact that most often decides whether this vendor is
            usable today, and it was eleven columns to the right. The legal
            name it replaced is reference — it belongs in the record, not in
            the one line a reader always sees.

            SILENT WHEN VALID. A green tick on 64 of 80 rows is not
            information, it is texture, and it makes the 16 that matter harder
            to find rather than easier. Valid states the date, muted, the same
            weight the legal name had. Only expiring or expired take a colour.
          */
          const days = daysFromToday(v.complianceValidTo);
          const bad = days !== null && days < 0;
          const soon = days !== null && days >= 0 && days < 60;
          return (
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground">{v.name}</span>
              <span
                className={cn(
                  "truncate text-xs",
                  bad
                    ? "font-medium text-status-failed"
                    : soon
                      ? "text-fp-banner-accent-caution"
                      : "text-muted-foreground"
                )}
                title={
                  days === null
                    ? undefined
                    : bad
                      ? `Lapsed ${Math.abs(days)} days ago`
                      : `${days} days of cover left`
                }
              >
                {bad
                  ? `Compliance expired ${formatDate(v.complianceValidTo)}`
                  : soon
                    ? `Compliance expires ${formatDate(v.complianceValidTo)}`
                    : `Compliant to ${formatDate(v.complianceValidTo)}`}
              </span>
            </div>
          );
        }
        case "dispatch":
          /* THE TWO THINGS YOU DO WITH A DISPATCH DESK — ring it or email it —
             and both are values somebody needs in another window, so both are
             copyable rather than selectable-by-dragging. */
          return (
            <div className="flex min-w-0 flex-col gap-0.5">
              <CopyValue
                value={v.dispatchPhone ?? ""}
                label={`${v.name} dispatch phone`}
                tabular
                className="text-sm"
              />
              <CopyValue
                value={v.dispatchEmail ?? ""}
                label={`${v.name} dispatch email`}
                className="text-xs text-muted-foreground"
              />
            </div>
          );
        case "lines":
          return <OverflowList values={v.businessLines} label="line" />;
        case "erpId":
          return v.erpVendorId ? <span className="text-sm tabular-nums">{v.erpVendorId}</span> : <Muted />;
        case "address":
          if (!v.addressLine1 && !v.city && !v.state && !v.zip) return <Muted />;
          return (
            <TwoLineCell
              title={v.addressLine1 ?? DASH}
              description={
                [v.city, [v.state, v.zip].filter(Boolean).join(" ")]
                  .filter(Boolean)
                  .join(", ") || DASH
              }
            />
          );
        case "serviceArea":
          return <OverflowList values={v.serviceStates} label="state" />;
        case "products":
          return (
            <OverflowList
              values={v.supportedProductIds
                .map((id) => BROKER_PRODUCTS.find((p) => p.id === id)?.name ?? "")
                .filter(Boolean)}
              label="product"
            />
          );
        case "status":
          /* ACTIVE AND APPROVED ARE TWO DECISIONS. A vendor can be switched on
             and still be withheld from assignment, and that pair is what
             stops an order — one chip cannot carry both. */
          return (
            <div className="flex min-w-0 flex-col gap-0.5">
              <StatusChip tone={v.active ? "success" : "neutral"} variant="text">
                {v.active ? "Active" : "Inactive"}
              </StatusChip>
              {v.active && !v.approvedForAssignment && (
                <span className="truncate text-xs text-status-failed">Not approved</span>
              )}
            </div>
          );
        case "rateCard": {
          const base = v.rateCard.find((l) => l.id === v.defaultRateCardId) ?? v.rateCard[0];
          return base ? (
            <TwoLineCell title={base.label} description={`${money(base.rate, true)} ${base.unit}`} />
          ) : (
            <Muted />
          );
        }
        case "assigned": {
          const n = assignedOrderCount(v.id);
          return n === 0 ? <Muted>0</Muted> : <span className="text-sm tabular-nums">{n}</span>;
        }
        case "instruction":
          return v.vendorInstruction ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Read dispatch notes for ${v.name}`}
                  onClick={() => onOpenNote(v)}
                >
                  <NotebookPen />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Read dispatch notes</TooltipContent>
            </Tooltip>
          ) : (
            <Muted />
          );
        default:
          return null;
      }
    },

    facets: [
      { key: "status", label: "Active", options: ["Active", "Inactive"], valueOf: (v) => (v.active ? "Active" : "Inactive") },
      { key: "compliance", label: "Compliance", options: [...COMPLIANCE_STATUSES], valueOf: (v) => v.complianceStatus },
      { key: "lines", label: "Business Lines", options: [...BUSINESS_LINES], valueOf: (v) => v.businessLines },
      { key: "serviceState", label: "Service State", options: Object.values(STATE_NAMES), searchable: true, valueOf: (v) => v.serviceStates },
      { key: "availability", label: "Availability", options: [...AVAILABILITY_STATUSES], valueOf: (v) => v.availabilityStatus },
      { key: "safety", label: "Safety Score", options: [...SAFETY_BANDS], valueOf: (v) => safetyBand(v.safetyScore) },
      { key: "distance", label: "Distance", options: [...DISTANCE_BANDS], valueOf: (v) => distanceBand(v.distanceMi) },
      {
        key: "flags",
        label: "Flags",
        options: [
          "Has overdue docs",
          "Has active assignments",
          "Approved for assignment",
          "TopOff capable",
          "Asset handling",
          "After hours",
        ],
        valueOf: (v) => {
          const out: string[] = [];
          if (hasOverdueDocs(v)) out.push("Has overdue docs");
          if (assignedOrderCount(v.id) > 0) out.push("Has active assignments");
          if (v.approvedForAssignment) out.push("Approved for assignment");
          if (v.topOffCapable) out.push("TopOff capable");
          if (v.assetHandlingCapable) out.push("Asset handling");
          if (v.afterHoursCapable) out.push("After hours");
          return out;
        },
      },
    ],

    exportRow: (v) => ({
      "Vendor Name": v.name,
      "Vendor ID": blank(v.erpVendorId),
      "Legal Name": blank(v.legalBusinessName),
      Type: v.vendorType,
      "Dispatch Contact": blank(v.dispatchContactName),
      "Dispatch Phone": blank(v.dispatchPhone),
      "Dispatch Email": blank(v.dispatchEmail),
      Address: oneLineAddress(v),
      City: blank(v.city),
      State: blank(v.state),
      "Service Area": v.serviceStates.join(" | "),
      "Business Lines": v.businessLines.join(" | "),
      "Supported Products": v.supportedProductIds.length,
      Compliance: v.complianceStatus,
      "Compliance Valid To": v.complianceValidTo,
      Active: v.active ? "Yes" : "No",
      "Approved For Assignment": v.approvedForAssignment ? "Yes" : "No",
      "Safety Score": v.safetyScore,
      "Assigned Orders": assignedOrderCount(v.id),
      "Payment Terms": v.paymentTerms,
      "Vendor Instruction": blank(v.vendorInstruction),
    }),

    headerAsideOf: vendorHeaderAside,
    readSectionsOf: (v) => vendorReadSections(v),

    formSections: vendorFormSections(),
    blank: (id) => ({
      id,
      name: "",
      erpVendorId: null,
      legalBusinessName: null,
      dbaName: null,
      taxId: null,
      status: "active",
      vendorType: "Carrier",
      mainContactName: null,
      dispatchContactName: null,
      accountingContactName: null,
      escalationContactName: null,
      phone: null,
      dispatchPhone: null,
      email: null,
      dispatchEmail: null,
      accountingEmail: null,
      contacts: [],
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      zip: null,
      country: "USA",
      base: "",
      serviceAreaType: "state",
      serviceStates: [],
      coveredCities: [],
      coveredZips: [],
      maxRadiusMiles: null,
      businessLines: [],
      supportedProductIds: [],
      supportedOrderTypes: [],
      topOffCapable: false,
      assetHandlingCapable: false,
      afterHoursCapable: false,
      complianceStatus: "Missing",
      complianceValidTo: "",
      insuranceExpiry: null,
      licenseNumbers: [],
      documents: [],
      approvedForAssignment: false,
      active: true,
      defaultRateCardId: null,
      rateCard: [],
      minimumCharge: null,
      paymentTerms: "Net 30",
      accountingVendorId: null,
      availabilityStatus: "Available",
      blackoutDates: [],
      assignmentPriority: 3,
      preferredCustomerIds: [],
      safetyScore: 0,
      distanceMi: 0,
      emailsEnabled: true,
      hasAccount: false,
      vendorInstruction: null,
      tags: [],
      notes: null,
      attachments: [],
      audit: [
        {
          id: `au-${Date.now().toString(36)}`,
          at: new Date().toISOString(),
          by: "Dana Whitfield",
          action: "Created",
          changes: ["Vendor record created"],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    statusField: {
      get: (v) => v.status,
      set: (v, next) => ({
        ...v,
        status: next,
        /* Archiving a vendor also switches them off. A record that is archived
           but still `active` would keep turning up on the order picker, which
           is the exact confusion archiving exists to end. */
        active: next === "active" ? v.active : false,
        updatedAt: new Date().toISOString(),
      }),
    },
    auditOf: (v) => v.audit,
    withAudit: (v, entry) => ({ ...v, audit: [entry, ...v.audit], updatedAt: entry.at }),
    extraBulkActions: (selected, apply) => [
      activeBulkAction<Vendor>(
        apply,
        (v) => v.active,
        (v, next) => ({ ...v, active: next, status: next ? "active" : "inactive" }),
        selected
      ),
      tagBulkAction<Vendor>(
        apply,
        (v, tag) => (v.tags.includes(tag) ? v : { ...v, tags: [...v.tags, tag] }),
        selected.length
      ),
    ],
  };
}

/* ════════════════════════════════════════════════════════════════ products ═ */

export function productConfig(
  onOpenNote: (p: BrokerProduct) => void
): EntityConfig<BrokerProduct, BrokerProductColumnKey> {
  return {
    urlKey: "products",
    parentLabel: "Products",
    noun: "product",
    rowId: (p) => p.id,
    nameOf: (p) => p.name,
    columns: BROKER_PRODUCT_COLUMNS,
    matches: matchesProduct,
    searchFields: BROKER_PRODUCT_SEARCH_FIELDS,
    searchPlaceholder: "Search by product name or code",
    sortRows: sortProducts,
    dimensions: BROKER_PRODUCT_GROUP_DIMS,
    emptyIcon: <Droplet />,

    renderCell: (p, key) => {
      switch (key) {
        case "name":
          return <TwoLineCell title={p.name} description={p.hazmat ?? p.category} />;
        case "code":
          return <span className="text-sm tabular-nums">{p.productCode}</span>;
        case "category":
          return <span className="text-sm">{p.category}</span>;
        case "unit":
          return <span className="text-sm">{p.unit}</span>;
        case "topOff":
          /* NO DOT. A dot means a STATE — something that changes, and that you
             might act on. Top-off is a capability the product either has or
             does not, and dotting it put a signal next to a fact, which spends
             the reader's attention on nothing. The words carry it. */
          return (
            <span
              className={
                p.topOffSupported ? "text-sm text-foreground" : "text-sm text-muted-foreground"
              }
            >
              {p.topOffSupported ? "Supported" : "Fixed qty"}
            </span>
          );
        case "price":
          return <Money value={p.basePrice} cents />;
        case "taxCode":
          /* A taxable product with no code is the one gap that produces a
             wrong invoice rather than an incomplete record — so it is loud. */
          return p.taxCode ? (
            <span className="text-sm">{p.taxCode}</span>
          ) : p.taxable ? (
            <StatusChip tone="failed" variant="text">Missing</StatusChip>
          ) : (
            <Muted>N/A</Muted>
          );
        case "accounting":
          /* NO DOT EITHER, but "Unmapped" keeps its colour: it is a GAP, not a
             state — the product will not sync cleanly until somebody fixes it
             — and colour is what makes it findable down a column of account
             numbers. The dot was adding a second signal to say the one thing
             the colour already said. */
          return p.revenueAccount ? (
            <TwoLineCell title={p.revenueAccount} description={p.cogsAccount ?? "No COGS account"} />
          ) : (
            <span className="text-sm font-medium text-fp-banner-accent-caution">Unmapped</span>
          );
        case "status":
          return <RecordStatusChip status={p.status} />;
        case "customers":
          return <span className="text-sm tabular-nums">{customerReach(p)}</span>;
        case "vendors": {
          const n = vendorsForProduct(p).length;
          return n === 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-medium tabular-nums text-status-failed">0</span>
              </TooltipTrigger>
              <TooltipContent>No vendor can fulfil this — orders naming it cannot be assigned</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-sm tabular-nums">{n}</span>
          );
        }
        case "notes":
          return p.notes || p.description ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Read notes for ${p.name}`}
                  onClick={() => onOpenNote(p)}
                >
                  <NotebookPen />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Read product notes</TooltipContent>
            </Tooltip>
          ) : (
            <Muted />
          );
        default:
          return null;
      }
    },

    facets: [
      { key: "status", label: "Status", options: ["active", "inactive", "archived"], valueOf: (p) => p.status },
      { key: "category", label: "Category", options: [...PRODUCT_CATEGORIES], valueOf: (p) => p.category },
      { key: "unit", label: "Unit of Measure", options: [...UNITS_OF_MEASURE], valueOf: (p) => p.unit },
      { key: "topOff", label: "TopOff", options: ["Supported", "Not supported"], valueOf: (p) => (p.topOffSupported ? "Supported" : "Not supported") },
      {
        key: "config",
        label: "Configuration",
        options: ["Tax configured", "Tax missing", "Accounting mapped", "Accounting unmapped", "No vendor can fulfil"],
        valueOf: (p) => {
          const out: string[] = [];
          out.push(p.taxCode ? "Tax configured" : "Tax missing");
          out.push(p.revenueAccount && p.cogsAccount ? "Accounting mapped" : "Accounting unmapped");
          if (vendorsForProduct(p).length === 0) out.push("No vendor can fulfil");
          return out;
        },
      },
      {
        key: "usage",
        label: "Usage",
        options: ["Used in active orders", "Used in recurring orders", "Never ordered"],
        valueOf: (p) => {
          const orders = BROKER_PRODUCTS.length > 0 ? ordersUsing(p.name) : [];
          const out: string[] = [];
          if (orders.some((o) => !["Completed", "Accounting Synced", "Cancelled"].includes(o.status))) {
            out.push("Used in active orders");
          }
          if (orders.some((o) => o.kind === "Recurring")) out.push("Used in recurring orders");
          if (orders.length === 0) out.push("Never ordered");
          return out;
        },
      },
    ],

    exportRow: (p) => ({
      "Product Name": p.name,
      "Product Code": p.productCode,
      Category: p.category,
      "Unit of Measure": p.unit,
      "TopOff Supported": p.topOffSupported ? "Yes" : "No",
      "Base Price": p.basePrice ?? "",
      "Tax Code": blank(p.taxCode),
      "Revenue Account": blank(p.revenueAccount),
      "COGS Account": blank(p.cogsAccount),
      Status: p.status,
      "Available Customers": customerReach(p),
      "Available Vendors": vendorsForProduct(p).length,
      Hazmat: blank(p.hazmat),
      Notes: blank(p.notes),
    }),

    headerAsideOf: productHeaderAside,
    readSectionsOf: (p, go) => productReadSections(p, go),

    formSections: productFormSections(),
    blank: (id) => ({
      id,
      name: "",
      productCode: "",
      erpItemId: null,
      category: "Fuel",
      description: null,
      status: "active",
      unit: "gal",
      quantityPrecision: 0,
      minimumQuantity: null,
      maximumQuantity: null,
      defaultQuantity: null,
      topOffSupported: false,
      quantityOverrideAllowed: true,
      basePrice: null,
      currency: "USD",
      taxCode: null,
      taxable: true,
      revenueAccount: null,
      cogsAccount: null,
      inventoryClassification: null,
      availableToAllCustomers: true,
      allowedCustomerIds: [],
      blockedCustomerIds: [],
      availableVendorIds: [],
      defaultVendorIds: [],
      geographyRestrictions: [],
      hazmat: null,
      hazardFlags: [],
      sdsAttachments: [],
      tags: [],
      notes: null,
      attachments: [],
      audit: [
        {
          id: `au-${Date.now().toString(36)}`,
          at: new Date().toISOString(),
          by: "Dana Whitfield",
          action: "Created",
          changes: ["Product record created"],
        },
      ],
      displayOrder: 999,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    statusField: {
      get: (p) => p.status,
      set: (p, next) => ({ ...p, status: next, updatedAt: new Date().toISOString() }),
    },
    auditOf: (p) => p.audit,
    withAudit: (p, entry) => ({ ...p, audit: [entry, ...p.audit], updatedAt: entry.at }),
    extraBulkActions: (selected, apply) => [
      {
        key: "topoff",
        label: "Enable TopOff",
        icon: <Droplet />,
        onSelect: () =>
          apply(
            (p) => ({ ...p, topOffSupported: true }),
            `TopOff enabled on ${selected.length} ${selected.length === 1 ? "product" : "products"}`
          ),
      },
    ],
  };
}

/* Local helper — the product facet needs orders without importing the module
   twice under two names. */
import { BROKER_ORDERS } from "./orders";
const ordersUsing = (productName: string) =>
  BROKER_ORDERS.filter((o) => o.lines.some((l) => l.product === productName));

/* ═══════════════════════════════════════════════════════════ rental assets ═ */

export function assetConfig(): EntityConfig<RentalAsset, RentalAssetColumnKey> {
  return {
    urlKey: "assets",
    parentLabel: "Rental Assets",
    noun: "asset",
    rowId: (a) => a.id,
    nameOf: (a) => a.name,
    columns: RENTAL_ASSET_COLUMNS,
    matches: matchesAsset,
    searchFields: RENTAL_ASSET_SEARCH_FIELDS,
    searchPlaceholder: "Search by asset, serial, customer or location",
    sortRows: sortAssets,
    dimensions: RENTAL_ASSET_GROUP_DIMS,
    emptyIcon: <Boxes />,
    /* ONLY WHAT IS OUT EARNS. Capacity would be the obvious measure and is
       wrong — a group's tanks do not pool into one tank. */
    measureOf: (a) => (a.availabilityStatus === "On rent" ? a.rentalRate : 0),
    formatTotal: (n) => `${money(n)} / mo on rent`,

    renderCell: (a, key) => {
      switch (key) {
        case "name":
          return <TwoLineCell title={a.name} description={a.serialNumber ?? "No serial"} />;
        case "serial":
          return a.serialNumber ? (
            <span className="text-sm tabular-nums">{a.serialNumber}</span>
          ) : (
            <Muted />
          );
        case "type":
          return <span className="text-sm">{a.assetType}</span>;
        case "customer":
          return a.customer ? (
            <span className="text-sm">{a.customer}</span>
          ) : (
            <Muted>At the yard</Muted>
          );
        case "shipTo":
          return a.shipTo ? <span className="text-sm">{a.shipTo}</span> : <Muted />;
        case "address":
          return <Clamped text={a.addressLine1 ? oneLineAddress(a) : null} />;
        case "city":
          return a.city ? <span className="text-sm">{a.city}</span> : <Muted />;
        case "state":
          return a.state ? <span className="text-sm">{a.state}</span> : <Muted />;
        case "status":
          return <RecordStatusChip status={a.status} />;
        case "availability":
          return (
            <StatusChip
              tone={
                a.availabilityStatus === "Available"
                  ? "success"
                  : a.availabilityStatus === "On rent"
                    ? "processing"
                    : a.availabilityStatus === "In maintenance"
                      ? "failed"
                      : "neutral"
              }
              variant="text"
            >
              {a.availabilityStatus}
            </StatusChip>
          );
        case "start":
          return a.rentalStartDate ? (
            <span className="text-sm tabular-nums">{formatDate(a.rentalStartDate)}</span>
          ) : (
            <Muted>N/A</Muted>
          );
        case "end":
          if (!a.rentalEndDate) {
            return a.availabilityStatus === "On rent" ? <Muted>Open ended</Muted> : <Muted>N/A</Muted>;
          }
          return (
            <span className="flex items-center gap-1.5">
              <span className="text-sm tabular-nums">{formatDate(a.rentalEndDate)}</span>
              {endingSoon(a) && (
                <Badge variant="secondary" className="font-normal">
                  Soon
                </Badge>
              )}
            </span>
          );
        case "rate":
          return <Money value={a.rentalRate} />;
        case "product": {
          const p = BROKER_PRODUCTS.find((x) => x.id === a.associatedProductId);
          return p ? <span className="text-sm">{p.name}</span> : <Muted>N/A</Muted>;
        }
        case "maintenance":
          return (
            <StatusChip
              tone={
                a.maintenanceStatus === "OK"
                  ? "success"
                  : a.maintenanceStatus === "Service due"
                    ? "processing"
                    : "failed"
              }
              variant="text"
            >
              {a.maintenanceStatus}
            </StatusChip>
          );
        default:
          return null;
      }
    },

    facets: [
      { key: "status", label: "Record Status", options: ["active", "inactive", "archived"], valueOf: (a) => a.status },
      { key: "availability", label: "Availability", options: [...RENTAL_STATUSES], valueOf: (a) => a.availabilityStatus },
      { key: "type", label: "Asset Type", options: [...RENTAL_TYPES], valueOf: (a) => a.assetType },
      { key: "maintenance", label: "Maintenance", options: [...MAINTENANCE_STATUSES], valueOf: (a) => a.maintenanceStatus },
      {
        key: "customer",
        label: "Customer",
        searchable: true,
        options: [...new Set(RENTAL_ASSETS.map((a) => a.customer).filter((x): x is string => Boolean(x)))].sort(),
        valueOf: (a) => a.customer ?? "",
      },
      { key: "state", label: "State", options: STATE_CODES, searchable: true, valueOf: (a) => a.state ?? "" },
      {
        key: "flags",
        label: "Flags",
        options: ["Rental ending soon", "Compliance risk", "Under maintenance", "Linked to recurring", "Unassigned"],
        valueOf: (a) => {
          const out: string[] = [];
          if (endingSoon(a)) out.push("Rental ending soon");
          if (a.complianceStatus === "Expired" || a.complianceStatus === "Expiring") out.push("Compliance risk");
          if (a.availabilityStatus === "In maintenance") out.push("Under maintenance");
          if (BROKER_ORDERS.some((o) => o.kind === "Recurring" && o.lines.some((l) => l.asset === a.name))) {
            out.push("Linked to recurring");
          }
          if (!a.customerId) out.push("Unassigned");
          return out;
        },
      },
    ],

    exportRow: (a) => ({
      "Asset Name": a.name,
      Serial: blank(a.serialNumber),
      "Asset Type": a.assetType,
      Ownership: a.ownershipType,
      Customer: blank(a.customer),
      "Ship-to": blank(a.shipTo),
      Address: oneLineAddress(a),
      City: blank(a.city),
      State: blank(a.state),
      Status: a.status,
      Availability: a.availabilityStatus,
      "Rental Start": blank(a.rentalStartDate),
      "Rental End": blank(a.rentalEndDate),
      Rate: a.rentalRate,
      "Billing Frequency": a.billingFrequency,
      Capacity: a.capacityGal > 0 ? a.capacityGal : "N/A",
      "Linked Product": blank(BROKER_PRODUCTS.find((p) => p.id === a.associatedProductId)?.name ?? null),
      Maintenance: a.maintenanceStatus,
      Compliance: a.complianceStatus,
      "Next Service Due": blank(a.nextServiceDue),
    }),

    headerAsideOf: assetHeaderAside,
    readSectionsOf: (a, go) => assetReadSections(a, go),

    formSections: assetFormSections(),
    blank: (id) => ({
      id,
      name: "",
      assetType: "Bulk Tank",
      serialNumber: null,
      qrCode: null,
      externalAssetId: null,
      ownershipType: "owned",
      status: "active",
      customerId: null,
      customer: null,
      shipToId: null,
      shipTo: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      zip: null,
      country: "USA",
      latitude: null,
      longitude: null,
      installedDate: null,
      removalDate: null,
      availabilityStatus: "Available",
      rentalStartDate: null,
      rentalEndDate: null,
      contractId: null,
      billingFrequency: "Monthly",
      rentalRate: 0,
      depositAmount: null,
      autoRenew: false,
      associatedProductId: null,
      capacityGal: 0,
      unit: "gal",
      fillThreshold: null,
      reorderPoint: null,
      topOffRelevant: false,
      assignedVendorId: null,
      lastServiceDate: null,
      nextServiceDue: null,
      maintenanceStatus: "OK",
      complianceStatus: "Not required",
      assetPhoto: null,
      documents: [],
      inspectionFiles: [],
      installationRecords: [],
      tags: [],
      notes: null,
      audit: [
        {
          id: `au-${Date.now().toString(36)}`,
          at: new Date().toISOString(),
          by: "Dana Whitfield",
          action: "Created",
          changes: ["Asset record created"],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    statusField: {
      get: (a) => a.status,
      set: (a, next) => ({
        ...a,
        status: next,
        availabilityStatus: next === "archived" ? "Retired" : a.availabilityStatus,
        updatedAt: new Date().toISOString(),
      }),
    },
    auditOf: (a) => a.audit,
    withAudit: (a, entry) => ({ ...a, audit: [entry, ...a.audit], updatedAt: entry.at }),
    extraBulkActions: (selected, apply) => [
      {
        key: "maintenance",
        label: "Mark under maintenance",
        icon: <Boxes />,
        onSelect: () =>
          apply(
            (a) => ({ ...a, availabilityStatus: "In maintenance", maintenanceStatus: "Out of service" }),
            `${selected.length} ${selected.length === 1 ? "asset" : "assets"} marked under maintenance`
          ),
      },
      tagBulkAction<RentalAsset>(
        apply,
        (a, tag) => (a.tags.includes(tag) ? a : { ...a, tags: [...a.tags, tag] }),
        selected.length
      ),
    ],
  };
}

/* ═══════════════════════════════════════════════════════════════ the four ═ */

/**
 * The Directory's own state, held once above the four screens.
 *
 * An edit made on Vendors has to be visible from a Product's "who can fulfil
 * this" table, so the arrays cannot live inside the screens that render them.
 * A real app would refetch; this owns them.
 */
export function useDirectoryData() {
  const [customers, setCustomers] = React.useState(BROKER_CUSTOMERS);
  const [vendors, setVendors] = React.useState(VENDORS);
  const [products, setProducts] = React.useState(BROKER_PRODUCTS);
  const [assets, setAssets] = React.useState(RENTAL_ASSETS);
  return { customers, setCustomers, vendors, setVendors, products, setProducts, assets, setAssets };
}

export type DirectoryData = ReturnType<typeof useDirectoryData>;

export function BrokerCustomersScreen({
  data,
  navigate,
  focusId,
  onFocusHandled,
  onTotalChange,
}: {
  data: DirectoryData;
  navigate: Navigator;
  focusId?: string | null;
  onFocusHandled?: () => void;
  onTotalChange?: (label: string | null) => void;
}) {
  /** The account whose delivery instructions are open, or none. */
  const [note, setNote] = React.useState<BrokerCustomer | null>(null);
  const config = React.useMemo(() => customerConfig(setNote), []);
  return (
    <>
      <DirectoryEntityScreen
        config={config}
        rows={data.customers}
        onRowsChange={data.setCustomers}
        navigate={navigate}
        focusId={focusId}
        onFocusHandled={onFocusHandled}
        onTotalChange={onTotalChange}
      />
      <ReadDrawer
        open={note !== null}
        onOpenChange={(o) => !o && setNote(null)}
        title="Delivery instructions"
        subtitle={note?.name}
      >
        {note && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Customer instruction</h3>
              <p className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
                {note.customerInstruction ?? (
                  <span className="text-muted-foreground/70">Nothing recorded.</span>
                )}
              </p>
              {/* WHO READS IT is the reason it is worth opening at all. */}
              <p className="mt-2 text-xs text-muted-foreground">
                Printed on the dispatch sheet — the driver reads this.
              </p>
            </div>
            {note.deliveryNotes && (
              <div>
                <h3 className="text-sm font-semibold text-foreground">Delivery notes</h3>
                <p className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
                  {note.deliveryNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </ReadDrawer>
    </>
  );
}

export function BrokerVendorsScreen({
  data,
  navigate,
  focusId,
  onFocusHandled,
  onTotalChange,
}: {
  data: DirectoryData;
  navigate: Navigator;
  focusId?: string | null;
  onFocusHandled?: () => void;
  onTotalChange?: (label: string | null) => void;
}) {
  const [note, setNote] = React.useState<Vendor | null>(null);
  const config = React.useMemo(() => vendorConfig(setNote), []);
  return (
    <>
      <DirectoryEntityScreen
        config={config}
        rows={data.vendors}
        onRowsChange={data.setVendors}
        navigate={navigate}
        focusId={focusId}
        onFocusHandled={onFocusHandled}
        onTotalChange={onTotalChange}
      />
      <ReadDrawer
        open={note !== null}
        onOpenChange={(o) => !o && setNote(null)}
        title="Dispatch notes"
        subtitle={note?.name}
      >
        {note && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Vendor instruction</h3>
              <p className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
                {note.vendorInstruction ?? (
                  <span className="text-muted-foreground/70">Nothing recorded.</span>
                )}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Shown to dispatch when this vendor is picked for an order.
              </p>
            </div>
            {note.notes && (
              <div>
                <h3 className="text-sm font-semibold text-foreground">Internal notes</h3>
                <p className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">{note.notes}</p>
              </div>
            )}
          </div>
        )}
      </ReadDrawer>
    </>
  );
}

export function BrokerProductsScreen({
  data,
  navigate,
  focusId,
  onFocusHandled,
  onTotalChange,
}: {
  data: DirectoryData;
  navigate: Navigator;
  focusId?: string | null;
  onFocusHandled?: () => void;
  onTotalChange?: (label: string | null) => void;
}) {
  const [note, setNote] = React.useState<BrokerProduct | null>(null);
  const config = React.useMemo(() => productConfig(setNote), []);
  return (
    <>
      <DirectoryEntityScreen
        config={config}
        rows={data.products}
        onRowsChange={data.setProducts}
        navigate={navigate}
        focusId={focusId}
        onFocusHandled={onFocusHandled}
        onTotalChange={onTotalChange}
      />
      <ReadDrawer
        open={note !== null}
        onOpenChange={(o) => !o && setNote(null)}
        title="Product notes"
        subtitle={note ? `${note.name} · ${note.productCode}` : undefined}
      >
        {note && (
          <div className="flex flex-col gap-6">
            {note.description && (
              <div>
                <h3 className="text-sm font-semibold text-foreground">Description</h3>
                <p className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
                  {note.description}
                </p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-foreground">Notes</h3>
              <p className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
                {note.notes ?? (
                  <span className="text-muted-foreground/70">Nothing recorded.</span>
                )}
              </p>
            </div>
            {note.hazmat && (
              <div>
                <h3 className="text-sm font-semibold text-foreground">Hazard classification</h3>
                <p className="mt-1.5 text-sm text-foreground">{note.hazmat}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Printed on the bill of lading and the vehicle placard.
                </p>
              </div>
            )}
          </div>
        )}
      </ReadDrawer>
    </>
  );
}

export function RentalAssetsScreen({
  data,
  navigate,
  focusId,
  onFocusHandled,
  onTotalChange,
}: {
  data: DirectoryData;
  navigate: Navigator;
  focusId?: string | null;
  onFocusHandled?: () => void;
  onTotalChange?: (label: string | null) => void;
}) {
  const config = React.useMemo(assetConfig, []);
  return (
    <DirectoryEntityScreen
      config={config}
      rows={data.assets}
      onRowsChange={data.setAssets}
      navigate={navigate}
      focusId={focusId}
      onFocusHandled={onFocusHandled}
      onTotalChange={onTotalChange}
    />
  );
}

/** Kept for the monthly-revenue footer used by the old screen wiring. */
export { monthlyRevenue };
