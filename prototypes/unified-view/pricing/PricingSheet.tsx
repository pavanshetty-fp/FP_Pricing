import * as React from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Pill } from "@/components/ui/pill";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { PocCard } from "../PocDetails";
import { CELL, DraftStatusChip, RecordSheet, useDraftSaveState } from "../RecordSheet";
import { ActivityCard, RailRow, SheetRail, SummaryCard, type TimelineEntry } from "../SheetCards";
import { TableCellMultiSelect } from "@/components/form-layout/table-cells";
import { TokenMultiSelect } from "../TokenMultiSelect";
import {
  SETTING_LABEL,
  changeSummary,
  customerOf,
  plural,
  productOf,
  readSetting,
  shiptoOf,
  uniq,
  type ChangeRecord,
  type ConfigRow,
  type Edit,
  type Setting,
} from "./changeLog";
import { addEntity, savePricing, useChangeLog } from "./changeLogStore";
import { CATEGORIES } from "./seed";
import { HUBS } from "./pricingConfig";
import { APPLIED_LABEL, UNCONFIGURED, customerPricing, historyOf, perGal, type PricingTarget } from "./pricingConfig";

/*
  A SHIP-TO'S OR A CUSTOMER'S PRICING, ON THE RECORD SHEET (Yash, 2026-11-17)
  — v2's Edit / Configure pricing form (Details: rate type and market; then
  adders, margin, tax and fee as chips), on the shared sheet. It autosaves
  (Unified View interactions §1): no Save, no Cancel. Every save of one open
  sheet is ONE change in the Change log, rewritten as the sheet changes.

  AN UNCONFIGURED RECORD is a draft until it is configured: its picks are
  kept, and the footer's act — Configure pricing — sets it up and writes
  the "Configured" change. A configured record has no next act, so no footer.

  The right column: what the price is made of, and the record's activity.
  The history icon opens the full log for the ship-to or customer.
*/

/* The production form's order (dev site, 2026-11-17): Details, then margin,
   tax and fee, then adders. */
const LISTS: { setting: Setting; title: string; add: string; search: string }[] = [
  { setting: "margin", title: "Margin", add: "Add margins", search: "Search margins…" },
  { setting: "tax", title: "Tax", add: "Add taxes", search: "Search taxes…" },
  { setting: "fee", title: "Fee", add: "Add fees", search: "Search fees…" },
  { setting: "adder", title: "Adders", add: "Add adders", search: "Search adders…" },
];

/* A customer's margin, tax and fee come from one of three places; only
   Customer pricing sets them here. */
type Source = "customer" | "shipto" | "hub";
const SOURCES: [Source, string][] = [
  ["customer", "Customer pricing"],
  ["shipto", "Ship-to pricing"],
  ["hub", "Hub pricing"],
];
const SETTINGS: Setting[] = ["rateType", "market", "adder", "margin", "tax", "fee"];

type Draft = Record<Setting, string[]>;
const emptyDraft = (): Draft => ({ rateType: [], market: [], adder: [], margin: [], tax: [], fee: [] });

/* An unconfigured record's picks, kept when its sheet closes (the prototype
   has no server). */
const DRAFTS = new Map<string, Draft>();
const keyOf = (t: PricingTarget) => (t.kind === "row" ? t.rowId : `customer:${t.customerId}`);

function withDraft(r: ConfigRow, d: Draft): ConfigRow {
  return {
    ...r,
    rateType: d.rateType[0] ?? "",
    market: d.market[0] ?? "",
    margins: d.margin,
    fees: d.fee,
    taxes: d.tax,
    adders: d.adder,
  };
}

/** A change, as the record's History card says it. */
const entryOf = (c: ChangeRecord, ents: Parameters<typeof changeSummary>[1]): TimelineEntry => ({
  at: new Date(c.effectiveAt).toISOString(),
  by: c.by,
  changes: [`${changeSummary(c, ents)} · ${c.id}`],
});

export function PricingSheet({
  target,
  onClose,
  onHistory,
}: {
  target: PricingTarget | null;
  onClose: () => void;
  /** Opens the full log for this record. */
  onHistory: (t: PricingTarget) => void;
}) {
  if (!target) return null;
  return <PricingSheetBody key={keyOf(target)} target={target} onClose={onClose} onHistory={onHistory} />;
}

function PricingSheetBody({
  target,
  onClose,
  onHistory,
}: {
  target: PricingTarget;
  onClose: () => void;
  onHistory: (t: PricingTarget) => void;
}) {
  const log = useChangeLog();
  const ents = log.entityMap;
  const isRow = target.kind === "row";

  /* WHAT THE SHEET FOUND — read once per open; the sheet's own saves must
     not rebuild the form (interactions §1). */
  const [found] = React.useState(() => {
    if (target.kind === "row") {
      const row = log.rows.find((r) => r.id === target.rowId)!;
      return { record: row, baseline: [row], configured: row.configured, own: null as ConfigRow | null, customerRows: [] as string[] };
    }
    const cp = customerPricing(log.rows, log.customerOwn).find((c) => c.customerId === target.customerId)!;
    const inh = log.rows.filter((r) => cp.rowIds.includes(r.id));
    return { record: cp.record, baseline: inh, configured: !!cp.record, own: log.customerOwn[target.customerId] ?? null, customerRows: cp.rowIds };
  });
  const read = (s: Setting) => (found.record && found.configured ? readSetting(found.record, s, ents).ids : []);
  const [draft, setDraft] = React.useState<Draft>(() => {
    if (!found.configured) return DRAFTS.get(keyOf(target)) ?? emptyDraft();
    const d = emptyDraft();
    for (const s of SETTINGS) d[s] = read(s);
    return d;
  });
  const [configured, setConfigured] = React.useState(found.configured);
  const changeId = React.useRef<string | null>(null);
  const saveState = useDraftSaveState(draft);

  const rowIds = isRow ? [target.rowId] : found.customerRows;
  const editsFor = React.useCallback(
    (d: Draft, configure: boolean): Edit[] => {
      const out: Edit[] = [];
      for (const s of SETTINGS) {
        const was = configure ? [] : read(s);
        const now = d[s];
        const added = now.filter((id) => !was.includes(id));
        const removed = was.filter((id) => !now.includes(id));
        if (!added.length && !removed.length) continue;
        const base = { setting: s, rowIds, via: isRow ? undefined : ("customer" as const), configure: configure || undefined };
        if (s === "rateType" || s === "market") out.push({ ...base, operation: "set", entityIds: now });
        else if (!removed.length) out.push({ ...base, operation: "add", entityIds: added });
        else if (!added.length) out.push({ ...base, operation: "remove", entityIds: removed });
        else out.push({ ...base, operation: "replace", entityIds: now });
      }
      return out;
    },
    [rowIds.join("|")] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* THE AUTOSAVE — 600ms after a pick settles. A draft (unconfigured) is
     kept aside; a configured record writes its one change. */
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if (!configured) {
        DRAFTS.set(keyOf(target), draft);
        return;
      }
      const own = !isRow && found.own;
      changeId.current = savePricing({
        changeId: changeId.current,
        baseline: found.baseline,
        edits: editsFor(draft, false),
        source: isRow ? "shiptoInline" : "customer",
        customer: own ? { id: (target as { customerId: string }).customerId, before: found.own, after: withDraft(found.own!, draft) } : undefined,
      });
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = [
    !draft.rateType.length && { key: "rateType", label: "Choose a rate type", target: "pricing-details" },
    !draft.market.length && { key: "market", label: "Choose a market", target: "pricing-details" },
  ].filter(Boolean) as { key: string; label: string; target: string }[];

  const configure = () => {
    if (missing.length) return;
    const customerId = isRow ? undefined : (target as { customerId: string }).customerId;
    const sample = isRow ? found.record! : found.record ?? log.rows.find((r) => r.customerId === customerId)!;
    const id = savePricing({
      changeId: null,
      baseline: found.baseline,
      edits: editsFor(draft, true),
      source: isRow ? "shiptoInline" : "customer",
      configure: true,
      customer: customerId && !found.customerRows.length ? { id: customerId, before: null, after: { ...withDraft(sample, draft), configured: true, applied: "customer" } } : undefined,
    });
    DRAFTS.delete(keyOf(target));
    setConfigured(true);
    toast.success(`Pricing configured${id ? ` · ${id}` : ""}`);
    onClose();
  };

  /* THE RECORD AS IT STANDS NOW — for the summary. */
  const live = isRow ? log.rows.find((r) => r.id === target.rowId) : undefined;
  const sample = live ?? found.record ?? log.rows.find((r) => r.customerId === (target as { customerId: string }).customerId)!;
  const now = withDraft(sample, draft);
  const part = (s: Setting) => readSetting(now, s, ents).value;
  const base = isRow ? sample.base : null;
  const effective = (base ?? 0) + part("margin") + part("fee") + part("tax") + part("adder") - now.discount;

  const names = (s: Setting) => log.changes && [...ents.values()].filter((e) => e.setting === s);
  const nameOf = (id: string) => ents.get(id)?.name ?? "";
  const idOf = (s: Setting, name: string) => names(s).find((e) => e.name === name)?.id ?? "";
  const history = historyOf(log.changes, target);

  /* Customer-only settings and the POC — held on the sheet for now; the
     change log does not record them. */
  const [byCategory, setByCategory] = React.useState(false);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [source, setSource] = React.useState<Source>("customer");
  const [maxPricing, setMaxPricing] = React.useState(false);
  const [poc, setPoc] = React.useState("");
  const [deliveryWindow, setWindow] = React.useState({ from: "", to: "" });
  const [creating, setCreating] = React.useState<Setting | null>(null);
  /* MARGINS BY HUB — a customer priced from hubs sets margins per hub. */
  const [hubPicks, setHubPicks] = React.useState<Record<string, { margin: string[]; fee: string[] }>>({});
  const [hubQuery, setHubQuery] = React.useState("");
  const pocShipto = isRow
    ? shiptoOf(live!.shiptoId).name
    : shiptoOf(log.rows.find((r) => r.customerId === (target as { customerId: string }).customerId)!.shiptoId).name;

  const title = isRow ? shiptoOf(live!.shiptoId).name : `${customerOf((target as { customerId: string }).customerId).name}`;
  const subtitle = isRow
    ? `${customerOf(live!.customerId).name} · ${productOf(live!.productId).name}`
    : found.customerRows.length
      ? `${plural(uniq(log.rows.filter((r) => found.customerRows.includes(r.id)).map((r) => r.shiptoId)).length, "ship-to")} inherit this pricing`
      : "No ship-to inherits this pricing";
  const applied = isRow ? APPLIED_LABEL[live!.applied] : "Customer";

  const listSection = (l: (typeof LISTS)[number]) => (
    <SheetSection
      key={l.setting}
      title={l.title}
      action={
        <Button variant="ghost" size="sm" onClick={() => setCreating(l.setting)}>
          <Plus />
          New
        </Button>
      }
    >
      <TokenMultiSelect
        options={names(l.setting).map((e) => e.name)}
        value={draft[l.setting].map(nameOf)}
        onChange={(next) => setDraft((d) => ({ ...d, [l.setting]: next.map((n) => idOf(l.setting, n)).filter(Boolean) }))}
        addLabel={l.add}
        searchPlaceholder={l.search}
      />
    </SheetSection>
  );

  return (
    <RecordSheet
      open
      onOpenChange={(v) => !v && onClose()}
      mode="edit"
      size="data"
      fit={{ tables: [[CELL.name, 280, 280]], rail: true }}
      editTitle={title}
      createTitle=""
      createAction=""
      editAction="Configure pricing"
      showCancel={false}
      noFooter={configured}
      pending={configured ? undefined : missing}
      headerAside={
        <span className="flex items-center gap-1.5">
          {configured ? <Pill>{applied}</Pill> : <Pill kind="caution">{UNCONFIGURED}</Pill>}
          <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} showStatus={false} />
        </span>
      }
      headerSubtitle={<span className="text-sm text-muted-foreground">{subtitle}</span>}
      onSubmit={configure}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]">
        <div className="flex min-w-0 flex-col gap-10">
          <SheetSection title="Details" id="pricing-details">
            <div className="grid grid-cols-2 gap-4">
              {(["rateType", "market"] as const).map((s) => (
                <SheetField key={s} label={SETTING_LABEL[s]} required>
                  <Combobox
                    value={nameOf(draft[s][0] ?? "")}
                    options={names(s).map((e) => e.name)}
                    placeholder={`Select ${SETTING_LABEL[s].toLowerCase()}`}
                    searchPlaceholder={`Search ${SETTING_LABEL[s].toLowerCase()}s…`}
                    onValueChange={(v) => setDraft((d) => ({ ...d, [s]: [idOf(s, v)].filter(Boolean) }))}
                    aria-label={SETTING_LABEL[s]}
                    className="w-full"
                  />
                </SheetField>
              ))}
            </div>
            {!isRow && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Product categories</span>
                  <Switch checked={byCategory} onCheckedChange={setByCategory} aria-label="Product categories" />
                </div>
                {byCategory && (
                  <TokenMultiSelect
                    options={CATEGORIES.map((c) => c.name)}
                    value={categories}
                    onChange={setCategories}
                    addLabel="Add categories"
                    searchPlaceholder="Search categories…"
                  />
                )}
              </>
            )}
          </SheetSection>
          {!isRow && (
            <SheetSection title="Margin and fee source">
              <RadioGroup value={source} onValueChange={(v) => setSource(v as Source)} className="flex gap-6">
                {SOURCES.map(([v, text]) => (
                  <div key={v} className="flex items-center gap-2">
                    <RadioGroupItem value={v} id={`source-${v}`} />
                    <Label htmlFor={`source-${v}`} className="font-normal">
                      {text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {/* A STATE, NOT A GUIDE (ux §helper text — "a value came from
                  somewhere the reader did not put it"): where this customer's
                  margins and fees come from while it is not Customer pricing.
                  In the read-out box the 3PL order sheet uses under its ship-to. */}
              {source === "shipto" && (
                <p className="rounded-md border border-fp-outline-1 bg-fp-surface-1a px-4 py-2.5 text-sm text-muted-foreground">
                  Margins and fees come from each ship-to's own pricing.
                </p>
              )}
            </SheetSection>
          )}
          {LISTS.filter((l) => l.setting !== "adder" && (isRow || source === "customer")).map(listSection)}
          {!isRow && source === "hub" && (
            <SheetSection title="Margins and fees by hub" flush>
              <div className="border-b border-border p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-8 pl-8" placeholder="Search hubs…" value={hubQuery} onChange={(e) => setHubQuery(e.target.value)} aria-label="Search hubs" />
                </div>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full table-fixed text-sm">
                  <thead className="sticky top-0 z-10 bg-muted text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left w-1/3 px-3 py-2 font-medium">Hub</th>
                      <th className="text-left border-l border-border px-3 py-2 font-medium">Margins</th>
                      <th className="text-left border-l border-border px-3 py-2 font-medium">Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HUBS.filter((h) => h.toLowerCase().includes(hubQuery.trim().toLowerCase())).map((h) => (
                      <tr key={h} className="border-t border-border align-middle">
                        <td className="px-3 py-3">{h}</td>
                        {(["margin", "fee"] as const).map((k) => (
                          <td key={k} className="relative border-l border-border p-0">
                            <TableCellMultiSelect
                              allOption={k === "margin" ? "All margins" : "All fees"}
                              values={hubPicks[h]?.[k] ?? []}
                              /* WHAT IS APPLIED COMES FIRST when the list reopens. */
                              options={[
                                ...(hubPicks[h]?.[k] ?? []).filter((n) => !n.startsWith("All ")),
                                ...names(k).map((e) => e.name).filter((n) => !(hubPicks[h]?.[k] ?? []).includes(n)),
                              ]}
                              placeholder={k === "margin" ? "Select margins" : "Select fees"}
                              unitLabel={k}
                              onChange={(next) => setHubPicks((m) => ({ ...m, [h]: { margin: m[h]?.margin ?? [], fee: m[h]?.fee ?? [], [k]: next } }))}
                              aria-label={`${k === "margin" ? "Margins" : "Fees"} for ${h}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SheetSection>
          )}
          {/* ADDERS AFTER THE MARGINS AND FEES — wherever those come from. */}
          {LISTS.filter((l) => l.setting === "adder").map(listSection)}
          {!isRow && (
            <SheetSection title="Max pricing">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Use the higher of today's or imported price</span>
                <Switch checked={maxPricing} onCheckedChange={setMaxPricing} aria-label="Max pricing" />
              </div>
              {maxPricing && (
                <div className="grid grid-cols-2 gap-4">
                  <SheetField label="Window starts" required>
                    <Input type="time" value={deliveryWindow.from} onChange={(e) => setWindow((w) => ({ ...w, from: e.target.value }))} />
                  </SheetField>
                  <SheetField label="Window ends" required>
                    <Input type="time" value={deliveryWindow.to} onChange={(e) => setWindow((w) => ({ ...w, to: e.target.value }))} />
                  </SheetField>
                </div>
              )}
            </SheetSection>
          )}
        </div>

        <SheetRail>
          <SummaryCard title="Price summary">
            <dl className="flex flex-col">
              {base !== null && <RailRow variant="line" label="Base price ($/gal)" value={perGal(base)} />}
              {/* A CUSTOMER PRICED FROM ITS SHIP-TOS OR HUBS sets no margin,
                  tax or fee here — the summary shows only what it does set. */}
              {(isRow || source === "customer") && (
                <>
                  <RailRow variant="line" label="Margin ($/gal)" value={perGal(part("margin"))} />
                  <RailRow variant="line" label="Tax ($/gal)" value={perGal(part("tax"))} />
                  <RailRow variant="line" label="Fee ($/gal)" value={perGal(part("fee"))} />
                </>
              )}
              <RailRow variant="line" label="Adders ($/gal)" value={perGal(part("adder"))} />
              {now.discount > 0 && <RailRow variant="line" label="Discount ($/gal)" value={`−${perGal(now.discount)}`} />}
              {base !== null && <RailRow variant="total" label="Effective price ($/gal)" value={perGal(effective)} />}
            </dl>
          </SummaryCard>
          <PocCard shipTo={pocShipto} value={poc} onChange={setPoc} />
          <ActivityCard
            title="History"
            entries={[...history].reverse().map((c) => entryOf(c, ents))}
            action={
              history.length > 0 && (
                <Button variant="ghost" size="xs" onClick={() => onHistory(target)}>
                  View all
                </Button>
              )
            }
          />
        </SheetRail>
      </div>
      <NewEntitySheet
        setting={creating}
        onClose={() => setCreating(null)}
        onCreated={(s, id) => setDraft((d) => ({ ...d, [s]: [...d[s], id] }))}
      />
    </RecordSheet>
  );
}

const NEW_NOUN: Partial<Record<Setting, string>> = { margin: "margin", fee: "fee", tax: "tax", adder: "adder" };

/**
 * + NEW (Yash, 2026-11-17) — make a margin, fee, tax or adder without leaving
 * the pricing: a second sheet over this one, its name and amount; on create it
 * joins Pricing setup and is picked here.
 */
function NewEntitySheet({
  setting,
  onClose,
  onCreated,
}: {
  setting: Setting | null;
  onClose: () => void;
  onCreated: (s: Setting, id: string) => void;
}) {
  const [f, setF] = React.useState({ name: "", amount: "", desc: "" });
  React.useEffect(() => {
    if (setting) setF({ name: "", amount: "", desc: "" });
  }, [setting]);
  if (!setting) return null;
  const noun = NEW_NOUN[setting] ?? "";
  const amount = Number(f.amount);
  const missing = [
    !f.name.trim() && { key: "name", label: "Enter a name", target: "new-entity" },
    (!f.amount.trim() || Number.isNaN(amount)) && { key: "amount", label: "Enter an amount", target: "new-entity" },
  ].filter(Boolean) as { key: string; label: string; target: string }[];
  return (
    <RecordSheet
      level={2}
      size="form"
      stepNav={false}
      open
      onOpenChange={(v) => !v && onClose()}
      mode="create"
      createTitle={`New ${noun}`}
      editTitle=""
      createAction={`Create ${noun}`}
      editAction=""
      showCancel={false}
      pending={missing}
      onSubmit={() => {
        if (missing.length) return;
        const id = addEntity(setting, f.name.trim(), amount, f.desc.trim() || undefined);
        onCreated(setting, id);
        toast.success(`${f.name.trim()} created`);
        onClose();
      }}
    >
      <div id="new-entity" className="flex flex-col gap-4">
        <SheetField label="Name" required>
          <Input value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} placeholder={`Enter ${noun} name`} />
        </SheetField>
        <SheetField label="Amount ($/gal)" required>
          <Input inputMode="decimal" value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} placeholder="0.0000" />
        </SheetField>
        <SheetField label="Description">
          <Input value={f.desc} onChange={(e) => setF((x) => ({ ...x, desc: e.target.value }))} placeholder="Enter description" />
        </SheetField>
      </div>
    </RecordSheet>
  );
}


