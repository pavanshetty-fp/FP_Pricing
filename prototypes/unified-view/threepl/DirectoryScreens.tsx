import * as React from "react";
import { Boxes, Contact, Droplet, Shield, Truck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { StatusChip } from "@/components/ui/status-chip";
import { DATE_FMT } from "../data";
import { OverflowList, TwoLineCell } from "../ListTable";
import { DirectoryList } from "./DirectoryList";
import {
  BROKER_CUSTOMERS,
  BROKER_PRODUCTS,
  CREDIT_STATUSES,
  PRODUCT_CATEGORIES,
  RENTAL_ASSETS,
  RENTAL_STATUSES,
  RENTAL_TYPES,
  USD,
  creditAvailable,
  creditBlocked,
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
  type BrokerCustomerColumnKey,
  type BrokerProductColumnKey,
  type RentalAssetColumnKey,
} from "./directoryDims";
import {
  BUSINESS_LINES,
  DISTANCE_BANDS,
  SAFETY_BANDS,
  VENDORS,
  VENDOR_COLUMNS,
  VENDOR_SEARCH_FIELDS,
  distanceBand,
  matchesVendor,
  safetyBand,
  sortVendors,
  type Vendor,
  type VendorColumnKey,
} from "./vendors";
import { VENDOR_GROUP_DIMS } from "./vendorDims";

/*
  The four Directory screens. Each is its records, its columns, its cells and
  what it can be grouped or filtered by — everything else is `DirectoryList`.

  A generic sort, so three of the four do not each write the same twenty lines.
  It reads the value through the cell's own accessor, which keeps "how a column
  sorts" next to "how it renders" rather than in a switch far away.
*/
function makeSort<Row, K extends string>(of: Record<string, (r: Row) => string | number>) {
  return (rows: Row[], sort: { key: K; dir: "asc" | "desc" } | null): Row[] => {
    if (!sort) return rows;
    const get = of[sort.key];
    if (!get) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
      return String(x).localeCompare(String(y)) * dir;
    });
  };
}

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return DATE_FMT.format(new Date(y, m - 1, d));
};

/* ─────────────────────────────────────────────────────────────── vendors ── */

export function BrokerVendorsScreen() {
  const [rows, setRows] = React.useState<Vendor[]>(VENDORS);

  const setEmails = (id: string, on: boolean) =>
    setRows((prev) => prev.map((v) => (v.id === id ? { ...v, emailsEnabled: on } : v)));

  const renderCell = (v: Vendor, key: VendorColumnKey) => {
    switch (key) {
      case "name":
        return <TwoLineCell title={v.name} description={v.base} />;
      case "lines":
        return <OverflowList values={v.businessLines} label="business lines" />;
      case "safety":
        /* Same shield the order sheet's partner table uses, so a score means
           the same thing in both places. */
        return (
          <span className="flex items-center justify-end gap-1.5 tabular-nums">
            <Shield className="size-3.5 text-muted-foreground" />
            {v.safetyScore}
          </span>
        );
      case "distance":
        return <span className="tabular-nums">{v.distanceMi} mi</span>;
      case "emails":
        /* EDITED IN PLACE. §6 makes this the screen's one real action and it is
           a single boolean — a sheet to flip one switch is a round trip. */
        return (
          <Switch
            checked={v.emailsEnabled}
            onCheckedChange={(on) => setEmails(v.id, on)}
            aria-label={`Email ${v.name}`}
          />
        );
      case "account":
        /* A vendor without an account still works — they acknowledge from the
           emailed link — so this is a fact, not a fault. */
        return (
          <StatusChip tone={v.hasAccount ? "success" : "neutral"} variant="text">
            {v.hasAccount ? "Has account" : "Link only"}
          </StatusChip>
        );
      default:
        return null;
    }
  };

  return (
    <DirectoryList<Vendor, VendorColumnKey>
      rows={rows}
      columns={VENDOR_COLUMNS}
      rowId={(v) => v.id}
      renderCell={renderCell}
      matches={matchesVendor}
      searchFields={VENDOR_SEARCH_FIELDS}
      searchPlaceholder="Search vendors, cities, business lines…"
      sortRows={sortVendors}
      dimensions={VENDOR_GROUP_DIMS}
      /* The picker's own filters (§5.5). RANGES, because nobody asks for
         "safety exactly 88" — and the same bands back the grouping, so
         filtering and grouping speak one vocabulary. */
      facets={[
        {
          key: "lines",
          label: "Business Lines",
          options: [...BUSINESS_LINES],
          valueOf: (v) => v.businessLines,
        },
        {
          key: "safety",
          label: "Safety Score",
          options: [...SAFETY_BANDS],
          valueOf: (v) => safetyBand(v.safetyScore),
        },
        {
          key: "distance",
          label: "Distance",
          options: [...DISTANCE_BANDS],
          valueOf: (v) => distanceBand(v.distanceMi),
        },
      ]}
      noun="vendor"
      /* NOTHING SUMS. A summed distance is meaningless and an averaged safety
         score is a different statistic sitting where a total goes. */
      emptyIcon={<Truck />}
      openLabel={(v) => `Open vendor ${v.name}`}
    />
  );
}

/* ───────────────────────────────────────────────────────────── customers ── */

const sortCustomers = makeSort<BrokerCustomer, BrokerCustomerColumnKey>({
  name: (c) => c.name,
  credit: (c) => c.creditStatus,
  limit: (c) => c.creditLimit ?? -1,
  balance: (c) => c.balance,
  terms: (c) => c.terms,
});

export function BrokerCustomersScreen() {
  const renderCell = (c: BrokerCustomer, key: BrokerCustomerColumnKey) => {
    switch (key) {
      case "name":
        return <TwoLineCell title={c.name} description={c.erpId} />;
      case "shipTos":
        return <OverflowList values={c.shipTos} label="ship-tos" />;
      case "credit":
        /* The chip carries the STATUS; being over the limit is a separate fact
           and shows on the balance, where the number that caused it is. */
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
        /* No limit set is not a limit of zero — one means "unbounded until
           somebody decides", the other means "cannot order at all". */
        return (
          <span className="tabular-nums">
            {c.creditLimit === null ? (
              <span className="text-muted-foreground">Not set</span>
            ) : (
              USD.format(c.creditLimit)
            )}
          </span>
        );
      case "balance": {
        const over = c.creditLimit !== null && c.balance > c.creditLimit;
        const left = creditAvailable(c);
        return (
          <span className="flex flex-col items-end tabular-nums">
            <span className={over ? "font-medium text-status-failed" : undefined}>
              {USD.format(c.balance)}
            </span>
            {left !== null && (
              <span className="text-xs text-muted-foreground">
                {left >= 0 ? `${USD.format(left)} left` : `${USD.format(-left)} over`}
              </span>
            )}
          </span>
        );
      }
      case "terms":
        return c.terms;
      case "poc":
        return <TwoLineCell title={c.poc} description={c.pocPhone} />;
      default:
        return null;
    }
  };

  return (
    <DirectoryList<BrokerCustomer, BrokerCustomerColumnKey>
      rows={BROKER_CUSTOMERS}
      columns={BROKER_CUSTOMER_COLUMNS}
      rowId={(c) => c.id}
      renderCell={renderCell}
      matches={(c, q) =>
        `${c.name} ${c.erpId} ${c.poc} ${c.shipTos.join(" ")}`.toLowerCase().includes(q)
      }
      searchFields={BROKER_CUSTOMER_SEARCH_FIELDS}
      searchPlaceholder="Search accounts, ERP IDs, ship-tos…"
      sortRows={sortCustomers}
      dimensions={BROKER_CUSTOMER_GROUP_DIMS}
      facets={[
        {
          key: "credit",
          label: "Credit Status",
          options: [...CREDIT_STATUSES],
          valueOf: (c) => c.creditStatus,
        },
        {
          key: "blocked",
          label: "Can Order",
          options: ["Can order", "Blocked"],
          valueOf: (c) => (creditBlocked(c) ? "Blocked" : "Can order"),
        },
      ]}
      noun="account"
      /* DOLLARS OWED ADD UP — the one thing on this list that sums to something
         true. A summed credit limit would not: limits are not a pool. */
      measureOf={(c) => c.balance}
      formatTotal={(t) => `${USD.format(t)} outstanding`}
      emptyIcon={<Contact />}
      openLabel={(c) => `Open account ${c.name}`}
    />
  );
}

/* ────────────────────────────────────────────────────────────── products ── */

const sortProducts = makeSort<BrokerProduct, BrokerProductColumnKey>({
  name: (p) => p.name,
  category: (p) => p.category,
  taxable: (p) => (p.taxable ? 1 : 0),
  price: (p) => p.refPrice,
  status: (p) => (p.active ? 1 : 0),
});

export function BrokerProductsScreen() {
  const renderCell = (p: BrokerProduct, key: BrokerProductColumnKey) => {
    switch (key) {
      case "name":
        return <TwoLineCell title={p.name} description={p.id.toUpperCase()} />;
      case "category":
        return p.category;
      case "unit":
        return <span className="text-muted-foreground">{p.unit}</span>;
      case "taxable":
        /* Exempt is the exception and the one worth spotting: dyed diesel is
           off-road, and the dye IS the exemption. */
        return (
          <StatusChip tone={p.taxable ? "neutral" : "processing"} variant="text">
            {p.taxable ? "Taxable" : "Exempt"}
          </StatusChip>
        );
      case "hazmat":
        return p.hazmat ? (
          <span className="tabular-nums">{p.hazmat}</span>
        ) : (
          <span className="text-muted-foreground">Not regulated</span>
        );
      case "price":
        return (
          <span className="tabular-nums">
            ${p.refPrice.toFixed(2)}
            <span className="text-muted-foreground"> /{p.unit}</span>
          </span>
        );
      case "status":
        /* Inactive is not deleted — old orders still reference it. */
        return (
          <StatusChip tone={p.active ? "success" : "neutral"} variant="text">
            {p.active ? "Active" : "Inactive"}
          </StatusChip>
        );
      default:
        return null;
    }
  };

  return (
    <DirectoryList<BrokerProduct, BrokerProductColumnKey>
      rows={BROKER_PRODUCTS}
      columns={BROKER_PRODUCT_COLUMNS}
      rowId={(p) => p.id}
      renderCell={renderCell}
      matches={(p, q) =>
        `${p.name} ${p.category} ${p.hazmat ?? ""}`.toLowerCase().includes(q)
      }
      searchFields={BROKER_PRODUCT_SEARCH_FIELDS}
      searchPlaceholder="Search products, categories, hazmat classes…"
      sortRows={sortProducts}
      dimensions={BROKER_PRODUCT_GROUP_DIMS}
      facets={[
        {
          key: "category",
          label: "Category",
          options: [...PRODUCT_CATEGORIES],
          valueOf: (p) => p.category,
        },
        {
          key: "status",
          label: "Status",
          options: ["Active", "Inactive"],
          valueOf: (p) => (p.active ? "Active" : "Inactive"),
        },
        {
          key: "taxable",
          label: "Tax",
          options: ["Taxable", "Exempt"],
          valueOf: (p) => (p.taxable ? "Taxable" : "Exempt"),
        },
      ]}
      noun="product"
      /* NOTHING SUMS. A reference price is per gallon; adding seven of them
         produces a number with no referent. */
      emptyIcon={<Droplet />}
      openLabel={(p) => `Open product ${p.name}`}
    />
  );
}

/* ────────────────────────────────────────────────────── rental assets ── */

const sortAssets = makeSort<RentalAsset, RentalAssetColumnKey>({
  name: (a) => a.name,
  type: (a) => a.type,
  capacity: (a) => a.capacityGal,
  status: (a) => a.status,
  rate: (a) => a.monthlyRate,
  // Never-rented sorts last under ascending, which is where it belongs.
  since: (a) => a.onRentSince ?? "9999",
});

export function BrokerRentalAssetsScreen() {
  const renderCell = (a: RentalAsset, key: RentalAssetColumnKey) => {
    switch (key) {
      case "name":
        return <TwoLineCell title={a.name} description={a.serial} />;
      case "type":
        return a.type;
      case "capacity":
        /* A pump cart holds nothing — "—" rather than "0 gal", which would
           read as an empty tank. */
        return a.capacityGal > 0 ? (
          <span className="tabular-nums">{a.capacityGal.toLocaleString()} gal</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      case "status":
        return (
          <StatusChip
            tone={
              a.status === "On rent"
                ? "success"
                : a.status === "Available"
                  ? "neutral"
                  : "processing"
            }
            variant="text"
          >
            {a.status}
          </StatusChip>
        );
      case "customer":
        return a.customer ? (
          <TwoLineCell title={a.customer} description={a.shipTo ?? ""} />
        ) : (
          <span className="text-muted-foreground">In the yard</span>
        );
      case "rate":
        return <span className="tabular-nums">{USD.format(a.monthlyRate)}</span>;
      case "since":
        return a.onRentSince ? (
          <span className="tabular-nums">{fmtDate(a.onRentSince)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      default:
        return null;
    }
  };

  return (
    <DirectoryList<RentalAsset, RentalAssetColumnKey>
      rows={RENTAL_ASSETS}
      columns={RENTAL_ASSET_COLUMNS}
      rowId={(a) => a.id}
      renderCell={renderCell}
      matches={(a, q) =>
        `${a.name} ${a.serial} ${a.type} ${a.customer ?? ""} ${a.shipTo ?? ""}`
          .toLowerCase()
          .includes(q)
      }
      searchFields={RENTAL_ASSET_SEARCH_FIELDS}
      searchPlaceholder="Search assets, serials, accounts…"
      sortRows={sortAssets}
      dimensions={RENTAL_ASSET_GROUP_DIMS}
      facets={[
        {
          key: "status",
          label: "Status",
          options: [...RENTAL_STATUSES],
          valueOf: (a) => a.status,
        },
        { key: "type", label: "Type", options: [...RENTAL_TYPES], valueOf: (a) => a.type },
      ]}
      noun="asset"
      /* REVENUE, NOT CAPACITY. Capacity is the obvious pick and is wrong — a
         group's tanks do not pool into one tank. What a group of assets is
         worth is what the ones ON RENT bill each month; the rest bill nothing,
         which is exactly the point of the number. */
      measureOf={(a) => (a.status === "On rent" ? a.monthlyRate : 0)}
      formatTotal={(t) => `${USD.format(t)}/mo on rent`}
      emptyIcon={<Boxes />}
      openLabel={(a) => `Open asset ${a.name}`}
    />
  );
}
