import * as React from "react";
import { Boxes, Contact, Droplet, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OverflowList, TwoLineCell } from "../ListTable";
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

export function customerConfig(): EntityConfig<BrokerCustomer, BrokerCustomerColumnKey> {
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
          return <TwoLineCell title={c.name} description={c.erpId} />;
        case "erpId":
          return <span className="text-sm tabular-nums">{c.erpId}</span>;
        case "phone":
          return c.phone ? <span className="text-sm tabular-nums">{c.phone}</span> : <Muted />;
        case "address":
          return <Clamped text={c.addressLine1 ? oneLineAddress(c) : null} />;
        case "city":
          return c.city ? <span className="text-sm">{c.city}</span> : <Muted />;
        case "zip":
          return c.zip ? <span className="text-sm tabular-nums">{c.zip}</span> : <Muted />;
        case "state":
          return c.state ? <span className="text-sm">{c.state}</span> : <Muted />;
        case "credit":
          return (
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
          );
        case "limit":
          /* NO LIMIT IS NOT ZERO, and printing `$0` for it would block orders
             that should go through — so it says so in words. */
          return c.creditLimit === null ? <Muted>Not set</Muted> : <Money value={c.creditLimit} />;
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
        case "instruction":
          return <Clamped text={c.customerInstruction} />;
        case "shipTos":
          return <OverflowList values={shipToNames(c)} label="ship-to" />;
        case "terms":
          return <span className="text-sm">{c.paymentTerms}</span>;
        case "poc":
          return c.mainContactName ? (
            <TwoLineCell title={c.mainContactName} description={blank(c.phone)} />
          ) : (
            <Muted />
          );
        case "status":
          return <RecordStatusChip status={c.status} />;
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

export function vendorConfig(): EntityConfig<Vendor, VendorColumnKey> {
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
      { key: "compliance", label: "Compliance", hides: "compliance", order: [...COMPLIANCE_STATUSES], valuesOf: (v: Vendor) => [v.complianceStatus] },
      { key: "state", label: "Home State", hides: "state", valuesOf: (v: Vendor) => (v.state ? [v.state] : []) },
      { key: "availability", label: "Availability", order: [...AVAILABILITY_STATUSES], valuesOf: (v: Vendor) => [v.availabilityStatus] },
      { key: "safety", label: "Safety Band", order: [...SAFETY_BANDS], valuesOf: (v: Vendor) => [safetyBand(v.safetyScore)] },
    ],
    /* NOTHING SUMS. A safety score is a property of one vendor, and a summed
       distance is meaningless — so the footer counts and claims nothing. */
    emptyIcon: <Truck />,

    renderCell: (v, key) => {
      switch (key) {
        case "name":
          return <TwoLineCell title={v.name} description={v.legalBusinessName ?? v.vendorType} />;
        case "erpId":
          return v.erpVendorId ? <span className="text-sm tabular-nums">{v.erpVendorId}</span> : <Muted />;
        case "dispatchPhone":
          return v.dispatchPhone ? <span className="text-sm tabular-nums">{v.dispatchPhone}</span> : <Muted />;
        case "dispatchEmail":
          return <Clamped text={v.dispatchEmail} />;
        case "address":
          return <Clamped text={v.addressLine1 ? oneLineAddress(v) : null} />;
        case "city":
          return v.city ? <span className="text-sm">{v.city}</span> : <Muted />;
        case "state":
          return v.state ? <span className="text-sm">{v.state}</span> : <Muted />;
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
        case "compliance": {
          const days = daysFromToday(v.complianceValidTo);
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <StatusChip
                    tone={
                      v.complianceStatus === "Valid"
                        ? "success"
                        : v.complianceStatus === "Expiring"
                          ? "processing"
                          : "failed"
                    }
                    variant="text"
                  >
                    {v.complianceStatus}
                  </StatusChip>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {days === null
                  ? "No expiry recorded"
                  : days < 0
                    ? `Lapsed ${Math.abs(days)} days ago (${formatDate(v.complianceValidTo)})`
                    : `${days} days left (${formatDate(v.complianceValidTo)})`}
              </TooltipContent>
            </Tooltip>
          );
        }
        case "status":
          return (
            <StatusChip tone={v.active ? "success" : "neutral"} variant="text">
              {v.active ? "Active" : "Inactive"}
            </StatusChip>
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
          return <Clamped text={v.vendorInstruction} />;
        case "lines":
          return <OverflowList values={v.businessLines} label="line" />;
        case "safety":
          return <span className="text-sm tabular-nums">{v.safetyScore}</span>;
        case "distance":
          return <span className="text-sm tabular-nums">{v.distanceMi} mi</span>;
        case "emails":
          return (
            <StatusChip tone={v.emailsEnabled ? "success" : "neutral"} variant="text">
              {v.emailsEnabled ? "On" : "Off"}
            </StatusChip>
          );
        case "account":
          /* A vendor without an account still works — they acknowledge from
             the emailed link — so this is a fact, not a fault. */
          return (
            <StatusChip tone={v.hasAccount ? "success" : "neutral"} variant="text">
              {v.hasAccount ? "Has account" : "Link only"}
            </StatusChip>
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

export function productConfig(): EntityConfig<BrokerProduct, BrokerProductColumnKey> {
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
          return (
            <StatusChip tone={p.topOffSupported ? "success" : "neutral"} variant="text">
              {p.topOffSupported ? "Supported" : "Fixed qty"}
            </StatusChip>
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
          return p.revenueAccount ? (
            <TwoLineCell title={p.revenueAccount} description={p.cogsAccount ?? "No COGS account"} />
          ) : (
            <StatusChip tone="processing" variant="text">Unmapped</StatusChip>
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
          return <Clamped text={p.notes ?? p.description} />;
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
  const config = React.useMemo(customerConfig, []);
  return (
    <DirectoryEntityScreen
      config={config}
      rows={data.customers}
      onRowsChange={data.setCustomers}
      navigate={navigate}
      focusId={focusId}
      onFocusHandled={onFocusHandled}
      onTotalChange={onTotalChange}
    />
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
  const config = React.useMemo(vendorConfig, []);
  return (
    <DirectoryEntityScreen
      config={config}
      rows={data.vendors}
      onRowsChange={data.setVendors}
      navigate={navigate}
      focusId={focusId}
      onFocusHandled={onFocusHandled}
      onTotalChange={onTotalChange}
    />
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
  const config = React.useMemo(productConfig, []);
  return (
    <DirectoryEntityScreen
      config={config}
      rows={data.products}
      onRowsChange={data.setProducts}
      navigate={navigate}
      focusId={focusId}
      onFocusHandled={onFocusHandled}
      onTotalChange={onTotalChange}
    />
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
