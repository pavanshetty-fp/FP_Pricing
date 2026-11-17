import * as React from "react";
import { Pill } from "@/components/ui/pill";
import { TERM_ICONS } from "@/components/ui/term-icons";
import type { GroupDim } from "@/components/tables-layout";
import { TwoLineCell, type ListColumn } from "../ListTable";
import { customerOf, effectivePrice, fmtWhen, plural, productOf, readSetting, shiptoOf, uniq, type ConfigRow } from "./changeLog";
import { useChangeLog } from "./changeLogStore";
import { ConfigList } from "./ConfigList";
import { PricingHistorySheet, PricingSheet } from "./PricingSheet";
import {
  APPLIED_LABEL,
  UNCONFIGURED,
  centsOf,
  customerPricing,
  factsOf,
  listCell,
  perGal,
  type CustomerPricing,
  type PricingTarget,
} from "./pricingConfig";

/*
  PRICING CONFIGURATION › SHIP-TO AND CUSTOMER (Yash, 2026-11-17).
  Ship-to: one row per ship-to × product, the production table's columns
  (screenshots, 2026-11-17) — per-gallon figures say "$/gal" in the header
  instead of the production note (UX-96). Customer: v2's Customer pricing,
  one record per customer that its ship-tos inherit. Cells read only; a row
  opens its pricing sheet (bulk and inline edits come later).
*/

/** The sheets a configuration page opens: the pricing, or its history. */
function useSheets() {
  const [pricing, setPricing] = React.useState<PricingTarget | null>(null);
  const [history, setHistory] = React.useState<PricingTarget | null>(null);
  const sheets = (
    <>
      <PricingSheet
        target={pricing}
        onClose={() => setPricing(null)}
        onHistory={(t) => {
          setPricing(null);
          setHistory(t);
        }}
      />
      <PricingHistorySheet target={history} onClose={() => setHistory(null)} />
    </>
  );
  return { setPricing, setHistory, sheets };
}

// ------------------------------------------------------------------ ship-to --

type SKey =
  | "shipto"
  | "customer"
  | "fee"
  | "product"
  | "category"
  | "market"
  | "rateType"
  | "base"
  | "margin"
  | "tax"
  | "adders"
  | "effective"
  | "lastDelivery"
  | "hub"
  | "state"
  | "county"
  | "applied"
  | "actions";

const SHIPTO_COLUMNS: ListColumn<SKey>[] = [
  { key: "shipto", label: "Ship-to", width: 220, sortable: true },
  { key: "customer", label: "Customer", width: 200, sortable: true },
  { key: "fee", label: "Fee", width: 180, sortable: true },
  { key: "product", label: "Product", width: 200, sortable: true },
  { key: "category", label: "Category", width: 140, sortable: true },
  { key: "market", label: "Market", width: 140, sortable: true },
  { key: "rateType", label: "Rate type", width: 150, sortable: true },
  { key: "base", label: "Base price ($/gal)", width: 150, sortable: true },
  { key: "margin", label: "Margin", width: 200, sortable: true },
  { key: "tax", label: "Tax", width: 200, sortable: true },
  { key: "adders", label: "Adders", width: 140, sortable: true },
  { key: "effective", label: "Effective price ($/gal)", width: 170, sortable: true },
  { key: "lastDelivery", label: "Last delivery", width: 170, sortable: true },
  { key: "hub", label: "Hub", width: 160, sortable: true },
  { key: "state", label: "State", width: 90, sortable: true },
  { key: "county", label: "County", width: 180, sortable: true },
  { key: "applied", label: "Applied pricing", width: 150, sortable: true },
  { key: "actions", label: "", width: 44 },
];

const appliedOf = (r: ConfigRow) => (r.configured ? APPLIED_LABEL[r.applied] : UNCONFIGURED);

export function ShiptoPricingScreen() {
  const log = useChangeLog();
  const ents = log.entityMap;
  const { setPricing, setHistory, sheets } = useSheets();
  const facts = React.useMemo(() => new Map(log.rows.map((r) => [r.id, factsOf(r, ents)])), [log.rows, ents]);

  const lines = React.useCallback(
    (r: ConfigRow, key: SKey): string[] => {
      const s = shiptoOf(r.shiptoId);
      const f = facts.get(r.id)!;
      const dash = !r.configured;
      switch (key) {
        case "shipto":
          return [s.name, s.address];
        case "customer":
          return [customerOf(r.customerId).name];
        case "product":
          return [productOf(r.productId).name];
        case "category":
          return [f.category];
        case "state":
          return [f.state];
        case "county":
          return [f.county];
        case "applied":
          return [appliedOf(r)];
        case "base":
          return [perGal(r.base)];
        case "market":
        case "rateType":
          return [dash ? "—" : readSetting(r, key, ents).text];
        case "fee": {
          if (dash) return ["—"];
          const c = listCell(r, "fee", ents, "fee", "fees");
          return [c.names, c.count];
        }
        case "margin": {
          if (dash) return ["—"];
          const c = listCell(r, "margin", ents, "margin", "margins");
          return [c.names, c.count];
        }
        case "tax": {
          if (dash) return ["—"];
          const c = listCell(r, "tax", ents, "tax", "taxes");
          return [c.names, c.count];
        }
        case "adders": {
          if (dash) return ["—"];
          const c = listCell(r, "adder", ents, "adder", "adders");
          return [centsOf(c.value), c.count];
        }
        case "effective":
          return [dash ? "—" : perGal(effectivePrice(r, ents))];
        case "lastDelivery":
          return [f.lastDelivery ? fmtWhen(f.lastDelivery) : "—"];
        case "hub":
          return [f.hub ?? "—"];
        default:
          return [""];
      }
    },
    [facts, ents]
  );
  const sortValue = (r: ConfigRow, key: SKey) =>
    key === "base" ? r.base : key === "effective" ? (r.configured ? effectivePrice(r, ents) : -1) : key === "lastDelivery" ? facts.get(r.id)!.lastDelivery ?? 0 : undefined;

  const values: Record<string, (r: ConfigRow) => string[]> = {
    customer: (r) => [customerOf(r.customerId).name],
    shipto: (r) => [shiptoOf(r.shiptoId).name],
    product: (r) => [productOf(r.productId).name],
    category: (r) => [facts.get(r.id)!.category],
    rateType: (r) => (r.configured ? [readSetting(r, "rateType", ents).text] : []),
    market: (r) => (r.configured ? [readSetting(r, "market", ents).text] : []),
    margin: (r) => readSetting(r, "margin", ents).ids.map((id) => ents.get(id)?.name ?? ""),
    fee: (r) => readSetting(r, "fee", ents).ids.map((id) => ents.get(id)?.name ?? ""),
    tax: (r) => readSetting(r, "tax", ents).ids.map((id) => ents.get(id)?.name ?? ""),
    hub: (r) => (facts.get(r.id)!.hub ? [facts.get(r.id)!.hub!] : []),
    state: (r) => [facts.get(r.id)!.state],
    county: (r) => [facts.get(r.id)!.county],
    applied: (r) => [appliedOf(r)],
  };
  const groupDims: GroupDim<ConfigRow>[] = [
    { key: "customer", label: "Customer", hides: "customer", valuesOf: values.customer },
    { key: "shipto", label: "Ship-to", hides: "shipto", valuesOf: values.shipto },
    { key: "product", label: "Product", hides: "product", valuesOf: values.product },
    { key: "category", label: "Category", hides: "category", valuesOf: values.category },
    { key: "market", label: "Market", hides: "market", valuesOf: (r) => (r.configured ? values.market(r) : [UNCONFIGURED]) },
    { key: "rateType", label: "Rate type", hides: "rateType", valuesOf: (r) => (r.configured ? values.rateType(r) : [UNCONFIGURED]) },
    { key: "state", label: "State", hides: "state", valuesOf: values.state },
    { key: "applied", label: "Applied pricing", hides: "applied", valuesOf: values.applied },
  ];

  const renderCell = (r: ConfigRow, key: SKey) => {
    const l = lines(r, key);
    switch (key) {
      case "shipto":
      case "fee":
      case "margin":
      case "tax":
      case "adders":
        return l.length > 1 ? <TwoLineCell title={l[0]} description={l[1]} /> : <span className="text-muted-foreground">—</span>;
      case "applied":
        return r.configured ? <Pill>{l[0]}</Pill> : <Pill kind="caution">{l[0]}</Pill>;
      default:
        return l[0] === "—" ? <span className="text-muted-foreground">—</span> : l[0];
    }
  };

  const open = (r: ConfigRow) => setPricing({ kind: "row", rowId: r.id, shiptoId: r.shiptoId });
  const unconfigured = log.rows.filter((r) => !r.configured).length;

  return (
    <>
      <ConfigList<ConfigRow, SKey>
        storageKey="pricing-config-shipto"
        rows={log.rows}
        rowId={(r) => r.id}
        columns={SHIPTO_COLUMNS}
        lines={lines}
        sortValue={sortValue}
        renderCell={renderCell}
        pillColumns={["applied"]}
        facets={[
          { key: "customer", label: "Customer", searchable: true },
          { key: "shipto", label: "Ship-to", searchable: true },
          { key: "product", label: "Product", searchable: true },
          { key: "applied", label: "Applied pricing", order: ["Ship-to", "Customer", "Hub", UNCONFIGURED] },
          { key: "category", label: "Category" },
          { key: "rateType", label: "Rate type" },
          { key: "market", label: "Market", searchable: true },
          { key: "margin", label: "Margin", searchable: true },
          { key: "fee", label: "Fee" },
          { key: "tax", label: "Tax" },
          { key: "hub", label: "Hub" },
          { key: "state", label: "State" },
          { key: "county", label: "County", searchable: true },
        ]}
        values={values}
        groupDims={groupDims}
        noun="prices"
        one="price"
        searchPlaceholder="Search ship-tos, customers, products…"
        unconfigured={{ count: unconfigured, title: `${plural(unconfigured, "ship-to price")} not configured yet`, facet: `applied:${UNCONFIGURED}` }}
        configured={(r) => r.configured}
        nameOf={(r) => `${productOf(r.productId).name} at ${shiptoOf(r.shiptoId).name}`}
        onOpen={open}
        onHistory={(r) => setHistory({ kind: "row", rowId: r.id, shiptoId: r.shiptoId })}
        exportSummary={(rows) => ({
          tilesTitle: "Overview",
          tiles: [
            { label: "Ship-tos", value: uniq(rows.map((r) => r.shiptoId)).length.toLocaleString(), icon: TERM_ICONS.shipTos },
            { label: "Customers", value: uniq(rows.map((r) => r.customerId)).length.toLocaleString(), icon: TERM_ICONS.customers },
          ],
        })}
      />
      {sheets}
    </>
  );
}

// ----------------------------------------------------------------- customer --

type CKey = "customer" | "shiptos" | "rateType" | "market" | "margin" | "tax" | "fee" | "discount" | "adders" | "status" | "actions";

const CUSTOMER_COLUMNS: ListColumn<CKey>[] = [
  { key: "customer", label: "Customer", width: 220, sortable: true },
  { key: "shiptos", label: "Ship-tos", width: 120, sortable: true },
  { key: "rateType", label: "Rate type", width: 150, sortable: true },
  { key: "market", label: "Market", width: 140, sortable: true },
  { key: "margin", label: "Margin", width: 200, sortable: true },
  { key: "tax", label: "Tax", width: 200, sortable: true },
  { key: "fee", label: "Fee", width: 180, sortable: true },
  { key: "discount", label: "Discount ($/gal)", width: 140, sortable: true },
  { key: "adders", label: "Adders", width: 140, sortable: true },
  { key: "status", label: "Pricing status", width: 140, sortable: true },
  { key: "actions", label: "", width: 44 },
];
const CONFIGURED = "Configured";

export function CustomerPricingScreen() {
  const log = useChangeLog();
  const ents = log.entityMap;
  const { setPricing, setHistory, sheets } = useSheets();
  const rows = React.useMemo(() => customerPricing(log.rows, log.customerOwn), [log.rows, log.customerOwn]);
  const statusOf = (c: CustomerPricing) => (c.record ? CONFIGURED : UNCONFIGURED);

  const lines = React.useCallback(
    (c: CustomerPricing, key: CKey): string[] => {
      const r = c.record;
      switch (key) {
        case "customer":
          return [customerOf(c.customerId).name, customerOf(c.customerId).account];
        case "shiptos":
          return [c.shiptos ? plural(c.shiptos, "ship-to") : "None inherit"];
        case "status":
          return [statusOf(c)];
        case "rateType":
        case "market":
          return [r ? readSetting(r, key, ents).text : "—"];
        case "discount":
          return [r && r.discount ? perGal(r.discount) : "—"];
        case "fee": {
          if (!r) return ["—"];
          const x = listCell(r, "fee", ents, "fee", "fees");
          return [x.names, x.count];
        }
        case "margin": {
          if (!r) return ["—"];
          const x = listCell(r, "margin", ents, "margin", "margins");
          return [x.names, x.count];
        }
        case "tax": {
          if (!r) return ["—"];
          const x = listCell(r, "tax", ents, "tax", "taxes");
          return [x.names, x.count];
        }
        case "adders": {
          if (!r) return ["—"];
          const x = listCell(r, "adder", ents, "adder", "adders");
          return [centsOf(x.value), x.count];
        }
        default:
          return [""];
      }
    },
    [ents]
  );
  const values: Record<string, (c: CustomerPricing) => string[]> = {
    customer: (c) => [customerOf(c.customerId).name],
    rateType: (c) => (c.record ? [readSetting(c.record, "rateType", ents).text] : []),
    market: (c) => (c.record ? [readSetting(c.record, "market", ents).text] : []),
    margin: (c) => (c.record ? readSetting(c.record, "margin", ents).ids.map((id) => ents.get(id)?.name ?? "") : []),
    status: (c) => [statusOf(c)],
  };
  const renderCell = (c: CustomerPricing, key: CKey) => {
    const l = lines(c, key);
    switch (key) {
      case "customer":
      case "fee":
      case "margin":
      case "tax":
      case "adders":
        return l.length > 1 ? <TwoLineCell title={l[0]} description={l[1]} /> : <span className="text-muted-foreground">—</span>;
      case "status":
        return c.record ? <Pill>{l[0]}</Pill> : <Pill kind="caution">{l[0]}</Pill>;
      case "shiptos":
        return c.shiptos ? l[0] : <span className="text-muted-foreground">{l[0]}</span>;
      default:
        return l[0] === "—" ? <span className="text-muted-foreground">—</span> : l[0];
    }
  };
  const unconfigured = rows.filter((c) => !c.record).length;

  return (
    <>
      <ConfigList<CustomerPricing, CKey>
        storageKey="pricing-config-customer"
        rows={rows}
        rowId={(c) => c.customerId}
        columns={CUSTOMER_COLUMNS}
        lines={lines}
        sortValue={(c, key) => (key === "shiptos" ? c.shiptos : key === "discount" ? c.record?.discount ?? -1 : undefined)}
        renderCell={renderCell}
        pillColumns={["status"]}
        facets={[
          { key: "customer", label: "Customer", searchable: true },
          { key: "status", label: "Pricing status", order: [CONFIGURED, UNCONFIGURED] },
          { key: "rateType", label: "Rate type" },
          { key: "market", label: "Market", searchable: true },
          { key: "margin", label: "Margin", searchable: true },
        ]}
        values={values}
        groupDims={[
          { key: "status", label: "Pricing status", hides: "status", valuesOf: values.status },
          { key: "rateType", label: "Rate type", hides: "rateType", valuesOf: (c) => (c.record ? values.rateType(c) : [UNCONFIGURED]) },
          { key: "market", label: "Market", hides: "market", valuesOf: (c) => (c.record ? values.market(c) : [UNCONFIGURED]) },
        ]}
        noun="customers"
        one="customer"
        searchPlaceholder="Search customers…"
        unconfigured={{ count: unconfigured, title: `${plural(unconfigured, "customer")} without customer pricing`, facet: `status:${UNCONFIGURED}` }}
        configured={(c) => !!c.record}
        nameOf={(c) => customerOf(c.customerId).name}
        onOpen={(c) => setPricing({ kind: "customer", customerId: c.customerId })}
        onHistory={(c) => setHistory({ kind: "customer", customerId: c.customerId })}
        exportSummary={(list) => ({
          tilesTitle: "Overview",
          tiles: [
            { label: "Customers", value: list.length.toLocaleString(), icon: TERM_ICONS.customers },
            { label: "Ship-tos", value: list.reduce((n, c) => n + c.shiptos, 0).toLocaleString(), icon: TERM_ICONS.shipTos },
          ],
        })}
      />
      {sheets}
    </>
  );
}
