import * as React from "react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { Pill } from "@/components/ui/pill";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { TableCellMultiSelect, TableCellSelect, TableRowRemove } from "@/components/form-layout/table-cells";
import { TERM_ICONS } from "@/components/ui/term-icons";
import { HangingAdd } from "../HangingAdd";
import type { ListColumn } from "../ListTable";
import { RecordSheet, useDraftSaveState, DraftStatusChip } from "../RecordSheet";
import { ActivityCard, RailRow, SheetRail, SummaryCard, type TimelineEntry } from "../SheetCards";
import { CURRENT_USER, NOW, DAY, plural, uniq, type EntityMap } from "./changeLog";
import { useChangeLog } from "./changeLogStore";
import { ConfigList } from "./ConfigList";
import { ShiptoCount } from "./customerShiptoParts";
import { hubMap } from "./fees";
import { HUBS, UNCONFIGURED } from "./pricingConfig";
import { CATEGORIES, PRODUCTS } from "./seed";

/*
  HUB-BASED PRICING (Yash, 2026-11-24; the live page) — one row per hub: its
  ship-tos, the rate type and market it prices from, and an optional product
  scope. A hub supplies rate type and market only; margins and fees stay with
  the customer and ship-to (fee rule engine). Edit pricing opens the hub's
  sheet: Details (rate type, market) and Product scope (category · products).
  An unconfigured hub sets up from the footer; a configured one autosaves.
*/

export interface HubScopeRow {
  category: string;
  products: string[];
}
export interface HubPricing {
  hub: string;
  rateType: string;
  market: string;
  scope: HubScopeRow[];
  configured: boolean;
  audit: { at: number; by: string; change: string }[];
}

let store: Record<string, HubPricing> | null = null;
const listeners = new Set<() => void>();
const setStore = (next: Record<string, HubPricing>) => {
  store = next;
  listeners.forEach((l) => l());
};

/** Seed once from the configuration: a hub whose ship-tos price from it takes
 *  their rate type and its market; the rest wait to be configured. */
function seedHubs(rows: ReturnType<typeof useChangeLog>["rows"], ents: EntityMap): Record<string, HubPricing> {
  const hubOf = hubMap(rows, ents);
  const out: Record<string, HubPricing> = {};
  HUBS.forEach((hub, i) => {
    const r = rows.find((x) => x.applied === "hub" && x.configured && hubOf.get(x.shiptoId) === hub);
    const marketName = hub.replace(/ hub$/, "");
    const market = [...ents.values()].find((e) => e.setting === "market" && e.name === marketName)?.id ?? "";
    out[hub] = {
      hub,
      rateType: r?.rateType ?? "",
      market: r ? market || r.market : "",
      scope: i % 4 === 1 && r ? [{ category: "diesel", products: [] }] : [],
      configured: !!r,
      audit: r ? [{ at: NOW - (30 + i) * DAY, by: "Priya Nair", change: "Configured" }] : [],
    };
  });
  return out;
}

function useHubStore() {
  const log = useChangeLog();
  if (!store) store = seedHubs(log.rows, log.entityMap);
  return React.useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => store!
  );
}
function saveHub(h: HubPricing, change: string | null) {
  const s = store!;
  const audit = change ? [{ at: NOW + Object.keys(s).length * 60_000, by: CURRENT_USER, change }, ...h.audit] : h.audit;
  setStore({ ...s, [h.hub]: { ...h, audit } });
}

const scopeText = (h: HubPricing) =>
  !h.scope.length
    ? "All products"
    : h.scope.map((r) => (r.products.length ? plural(r.products.length, "product") : CATEGORIES.find((c) => c.id === r.category)?.name ?? "All products")).join(", ");

type K = "hub" | "shiptos" | "rateType" | "market" | "scope" | "status" | "actions";
const COLUMNS: ListColumn<K>[] = [
  { key: "hub", label: "Hub", width: 220, sortable: true },
  { key: "shiptos", label: "Ship-tos", width: 120, sortable: true },
  { key: "rateType", label: "Rate type", width: 170, sortable: true },
  { key: "market", label: "Market", width: 150, sortable: true },
  { key: "scope", label: "Product scope", width: 180, sortable: true },
  { key: "status", label: "Status", width: 140, sortable: true },
  { key: "actions", label: "", width: 44 },
];
const CONFIGURED = "Configured";

export function HubPricingScreen() {
  const log = useChangeLog();
  const ents = log.entityMap;
  const hubs = useHubStore();
  const hubOf = React.useMemo(() => hubMap(log.rows, ents), [log.rows, ents]);
  /* A hub's ship-tos — the ones pricing from it (Applied pricing: Hub). */
  const shiptosOf = React.useCallback(
    (hub: string) => uniq(log.rows.filter((r) => r.applied === "hub" && hubOf.get(r.shiptoId) === hub).map((r) => r.shiptoId)),
    [log.rows, hubOf]
  );
  const rows = React.useMemo(() => Object.values(hubs), [hubs]);
  const [open, setOpen] = React.useState<string | null>(null);
  const name = (id: string) => ents.get(id)?.name ?? "—";
  const lines = (h: HubPricing, key: K): string[] => {
    switch (key) {
      case "hub":
        return [h.hub];
      case "shiptos":
        return [String(shiptosOf(h.hub).length)];
      case "rateType":
        return [h.configured ? name(h.rateType) : "—"];
      case "market":
        return [h.configured ? name(h.market) : "—"];
      case "scope":
        return [h.configured ? scopeText(h) : "—"];
      case "status":
        return [h.configured ? CONFIGURED : UNCONFIGURED];
      default:
        return [""];
    }
  };
  const unconfigured = rows.filter((h) => !h.configured).length;
  return (
    <>
      <ConfigList<HubPricing, K>
        storageKey="pricing-hub"
        rows={rows}
        rowId={(h) => h.hub}
        columns={COLUMNS}
        lines={lines}
        sortValue={(h, key) => (key === "shiptos" ? shiptosOf(h.hub).length : undefined)}
        renderCell={(h, key) => {
          const l = lines(h, key);
          if (key === "status") return h.configured ? <Pill>{l[0]}</Pill> : <Pill kind="caution">{l[0]}</Pill>;
          if (key === "shiptos") {
            const ids = shiptosOf(h.hub);
            return ids.length ? (
              <ShiptoCount inCell shiptoIds={ids} hubOf={(id) => hubOf.get(id) ?? h.hub} title={`${h.hub} ship-tos`} subtitle="Ship-tos that price from this hub" />
            ) : (
              <span className="text-muted-foreground">0</span>
            );
          }
          return l[0] === "—" ? <span className="text-muted-foreground">—</span> : <span className="block min-w-0 truncate">{l[0]}</span>;
        }}
        pillColumns={["status"]}
        facets={[
          { key: "status", label: "Status", order: [CONFIGURED, UNCONFIGURED] },
          { key: "rateType", label: "Rate type" },
          { key: "market", label: "Market", searchable: true },
        ]}
        values={{
          status: (h) => [h.configured ? CONFIGURED : UNCONFIGURED],
          rateType: (h) => (h.configured ? [name(h.rateType)] : []),
          market: (h) => (h.configured ? [name(h.market)] : []),
        }}
        groupDims={[{ key: "status", label: "Status", hides: "status", valuesOf: (h) => [h.configured ? CONFIGURED : UNCONFIGURED] }]}
        noun="hubs"
        one="hub"
        searchPlaceholder="Search hubs…"
        unconfigured={{ count: unconfigured, title: `${plural(unconfigured, "hub pricing configuration")} not set up yet`, facet: `status:${UNCONFIGURED}` }}
        configured={(h) => h.configured}
        nameOf={(h) => h.hub}
        onOpen={(h) => setOpen(h.hub)}
        onHistory={(h) => setOpen(h.hub)}
        exportSummary={(list) => ({
          tilesTitle: "Overview",
          tiles: [
            { label: "Hubs", value: list.length.toLocaleString(), icon: TERM_ICONS.shipTos },
            { label: "Configured", value: list.filter((h) => h.configured).length.toLocaleString(), icon: TERM_ICONS.customers },
          ],
        })}
      />
      {open && <HubSheet key={open} hub={hubs[open]} shiptos={shiptosOf(open)} onClose={() => setOpen(null)} />}
    </>
  );
}

const TH = "px-3 py-2.5 text-left text-sm font-medium";
const ALL_G = "All categories";
const ALL_P = "All products";

function HubSheet({ hub, shiptos, onClose }: { hub: HubPricing; shiptos: string[]; onClose: () => void }) {
  const log = useChangeLog();
  const ents = log.entityMap;
  const [d, setD] = React.useState(hub);
  const [configured, setConfigured] = React.useState(hub.configured);
  const saveState = useDraftSaveState(d);
  /* THE ROW JUST ADDED takes focus (DS ui §10f "Rows"). */
  const [added, setAdded] = React.useState<number | null>(null);
  const names = (setting: "rateType" | "market") => [...ents.values()].filter((e) => e.setting === setting);
  const idOf = (setting: "rateType" | "market", n: string) => names(setting).find((e) => e.name === n)?.id ?? "";
  const nameOf = (id: string) => ents.get(id)?.name ?? "";
  /* AUTOSAVE — a configured hub, 600ms after an edit settles. */
  React.useEffect(() => {
    if (!configured) return;
    const t = window.setTimeout(() => {
      const changes: string[] = [];
      if (d.rateType !== hub.rateType) changes.push(`Rate type: ${nameOf(d.rateType)}`);
      if (d.market !== hub.market) changes.push(`Market: ${nameOf(d.market)}`);
      if (JSON.stringify(d.scope) !== JSON.stringify(hub.scope)) changes.push(`Product scope: ${scopeText(d)}`);
      saveHub({ ...d, configured: true }, changes.length ? changes.join(" · ") : null);
    }, 600);
    return () => window.clearTimeout(t);
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = [
    !d.rateType && { key: "rateType", label: "Choose a rate type", target: "hub-details" },
    !d.market && { key: "market", label: "Choose a market", target: "hub-details" },
  ].filter(Boolean) as { key: string; label: string; target: string }[];
  const setRow = (i: number, p: Partial<HubScopeRow>) => setD((x) => ({ ...x, scope: x.scope.map((r, k) => (k === i ? { ...r, ...p } : r)) }));
  const entries: TimelineEntry[] = (configured ? hub.audit : []).map((a) => ({ at: new Date(a.at).toISOString(), by: a.by, changes: [a.change] }));
  return (
    <RecordSheet
      open
      onOpenChange={(v) => !v && onClose()}
      mode="edit"
      size="data"
      fit={{ tables: [[260, 320, 52]], rail: true }}
      editTitle={hub.hub}
      createTitle=""
      createAction=""
      editAction="Configure pricing"
      showCancel={false}
      noFooter={configured}
      pending={configured ? undefined : missing}
      headerAside={
        <span className="flex items-center gap-1.5">
          {configured ? <Pill>Hub</Pill> : <Pill kind="caution">{UNCONFIGURED}</Pill>}
          <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} showStatus={false} />
        </span>
      }
      headerSubtitle={<span className="text-sm text-muted-foreground">Hub pricing · {plural(shiptos.length, "ship-to")}</span>}
      onSubmit={() => {
        if (missing.length) return;
        saveHub({ ...d, configured: true }, "Configured");
        setConfigured(true);
        toast.success(`${hub.hub} configured`);
        onClose();
      }}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]">
        <div className="flex min-w-0 flex-col gap-10">
          <SheetSection title="Details" id="hub-details">
            <div className="grid grid-cols-2 gap-4">
              <SheetField label="Rate type" required>
                <Combobox
                  className="w-full"
                  value={nameOf(d.rateType)}
                  options={names("rateType").map((e) => e.name)}
                  placeholder="Select rate type"
                  searchPlaceholder="Search rate types…"
                  onValueChange={(v) => setD((x) => ({ ...x, rateType: idOf("rateType", v) }))}
                  aria-label="Rate type"
                />
              </SheetField>
              <SheetField label="Market" required>
                <Combobox
                  className="w-full"
                  value={nameOf(d.market)}
                  options={names("market").map((e) => e.name)}
                  placeholder="Select market"
                  searchPlaceholder="Search markets…"
                  onValueChange={(v) => setD((x) => ({ ...x, market: idOf("market", v) }))}
                  aria-label="Market"
                />
              </SheetField>
            </div>
          </SheetSection>
          <SheetSection
            title="Product scope"
            flush
            hanging={
              <HangingAdd
                label="Add products"
                onClick={() => {
                  setAdded(d.scope.length);
                  setD((x) => ({ ...x, scope: [...x.scope, { category: "", products: [] }] }));
                }}
              />
            }
          >
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[40%]" />
                <col />
                <col className="w-[52px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-fp-table-header">
                  <th className={TH}>Product category</th>
                  <th className={TH}>Products</th>
                  <th aria-hidden className="sticky right-0 z-10 bg-fp-table-header" />
                </tr>
              </thead>
              <tbody>
                {!d.scope.length && (
                  <tr className="h-11">
                    <td colSpan={3} className="px-3 text-sm text-muted-foreground">
                      All products
                    </td>
                  </tr>
                )}
                {d.scope.map((r, i) => {
                  const opts = PRODUCTS.filter((p) => !r.category || p.categoryId === r.category);
                  return (
                    <tr key={i} className="group/row h-11 border-b border-border last:border-b-0">
                      <td className="relative p-0">
                        {/* ONE VALUE — a row is one category (or all); its products are picked beside it. */}
                        <TableCellSelect
                          value={r.category ? CATEGORIES.find((c) => c.id === r.category)!.name : ALL_G}
                          options={[ALL_G, ...CATEGORIES.map((c) => c.name)]}
                          autoFocus={added === i}
                          aria-label={`Product category, row ${i + 1}`}
                          onChange={(n) => setRow(i, { category: n === ALL_G ? "" : CATEGORIES.find((c) => c.name === n)!.id, products: [] })}
                        />
                      </td>
                      <td className="relative p-0">
                        <TableCellMultiSelect
                          values={r.products.length ? r.products.map((id) => PRODUCTS.find((p) => p.id === id)!.name) : [ALL_P]}
                          options={opts.map((p) => p.name)}
                          allOption={ALL_P}
                          placeholder="Select products"
                          unitLabel="product"
                          aria-label={`Products, row ${i + 1}`}
                          onChange={(v) => setRow(i, { products: v.includes(ALL_P) ? [] : v.map((n) => PRODUCTS.find((p) => p.name === n)!.id) })}
                        />
                      </td>
                      <td className="sticky right-0 z-10 bg-popover p-0 text-center">
                        <TableRowRemove aria-label={`Remove product row ${i + 1}`} onRemove={() => setD((x) => ({ ...x, scope: x.scope.filter((_, k) => k !== i) }))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SheetSection>
        </div>
        <SheetRail>
          <SummaryCard title="Hub pricing">
            <dl className="flex flex-col">
              <RailRow variant="line" label="Rate type" value={nameOf(d.rateType) || "—"} />
              <RailRow variant="line" label="Market" value={nameOf(d.market) || "—"} />
              <RailRow variant="line" label="Product scope" value={scopeText(d)} />
              <RailRow variant="total" label="Ship-tos" value={shiptos.length.toLocaleString()} />
            </dl>
          </SummaryCard>
          {configured && <ActivityCard title="History" entries={entries} />}
        </SheetRail>
      </div>
    </RecordSheet>
  );
}
