import * as React from "react";
import { toast } from "sonner";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "../RecordSheet";
import { ActivityCard, RailRow, SheetRail, SummaryCard, type TimelineEntry } from "../SheetCards";
import { TokenMultiSelect } from "../TokenMultiSelect";
import { kindTone } from "../statusKind";
import { RecordViews, type ViewRow, type ViewTab } from "../masterdata/RecordViews";
import {
  SETTING_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  changeSummary,
  customerOf,
  fmtWhen,
  plural,
  productOf,
  readSetting,
  shiptoOf,
  uniq,
  type ChangeRecord,
  type ChangeStatus,
  type ConfigRow,
  type Edit,
  type Setting,
} from "./changeLog";
import { savePricing, useChangeLog } from "./changeLogStore";
import { STATUS_KIND, actionOf } from "./activityFeed";
import { ChangeSheet } from "./ChangeSheet";
import { fitTab } from "./customerShiptoViews";
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

const LISTS: { setting: Setting; title: string; add: string; search: string }[] = [
  { setting: "adder", title: "Adders", add: "Add adders", search: "Search adders…" },
  { setting: "margin", title: "Margin", add: "Add margins", search: "Search margins…" },
  { setting: "tax", title: "Tax", add: "Add taxes", search: "Search taxes…" },
  { setting: "fee", title: "Fee", add: "Add fees", search: "Search fees…" },
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

const STATUS_BY_LABEL = Object.fromEntries((Object.keys(STATUS_LABEL) as ChangeStatus[]).map((s) => [STATUS_LABEL[s], s])) as Record<string, ChangeStatus>;

/** A change, as the record's Activity card says it. */
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

function PricingSheetBody({ target, onClose, onHistory }: { target: PricingTarget; onClose: () => void; onHistory: (t: PricingTarget) => void }) {
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

  const title = isRow ? shiptoOf(live!.shiptoId).name : `${customerOf((target as { customerId: string }).customerId).name}`;
  const subtitle = isRow
    ? `${customerOf(live!.customerId).name} · ${productOf(live!.productId).name}`
    : found.customerRows.length
      ? `${plural(uniq(log.rows.filter((r) => found.customerRows.includes(r.id)).map((r) => r.shiptoId)).length, "ship-to")} inherit this pricing`
      : "No ship-to inherits this pricing";
  const applied = isRow ? APPLIED_LABEL[live!.applied] : "Customer";

  return (
    <RecordSheet
      open
      onOpenChange={(v) => !v && onClose()}
      mode="edit"
      size="data"
      editTitle={title}
      createTitle=""
      createAction=""
      editAction="Configure pricing"
      showCancel={false}
      stepNav={false}
      noFooter={configured}
      pending={configured ? undefined : missing}
      headerAside={
        <span className="flex items-center gap-1.5">
          {configured ? <Pill>{applied}</Pill> : <Pill kind="caution">{UNCONFIGURED}</Pill>}
          <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} showStatus={false} />
        </span>
      }
      headerSubtitle={<span className="text-sm text-muted-foreground">{subtitle}</span>}
      headerActions={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="History" onClick={() => onHistory(target)}>
              <History />
            </Button>
          </TooltipTrigger>
          <TooltipContent>History</TooltipContent>
        </Tooltip>
      }
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
          </SheetSection>
          {LISTS.map((l) => (
            <SheetSection key={l.setting} title={l.title} flush>
              <TokenMultiSelect
                flush
                options={names(l.setting).map((e) => e.name)}
                value={draft[l.setting].map(nameOf)}
                onChange={(next) => setDraft((d) => ({ ...d, [l.setting]: next.map((n) => idOf(l.setting, n)).filter(Boolean) }))}
                addLabel={l.add}
                searchPlaceholder={l.search}
              />
            </SheetSection>
          ))}
        </div>

        <SheetRail>
          <SummaryCard title="Price summary">
            <dl className="flex flex-col">
              {base !== null && <RailRow variant="line" label="Base price ($/gal)" value={perGal(base)} />}
              <RailRow variant="line" label="Margin ($/gal)" value={perGal(part("margin"))} />
              <RailRow variant="line" label="Tax ($/gal)" value={perGal(part("tax"))} />
              <RailRow variant="line" label="Fee ($/gal)" value={perGal(part("fee"))} />
              <RailRow variant="line" label="Adders ($/gal)" value={perGal(part("adder"))} />
              {now.discount > 0 && <RailRow variant="line" label="Discount ($/gal)" value={`−${perGal(now.discount)}`} />}
              {base !== null && <RailRow variant="total" label="Effective price ($/gal)" value={perGal(effective)} />}
            </dl>
          </SummaryCard>
          <ActivityCard entries={[...history].reverse().map((c) => entryOf(c, ents))} />
        </SheetRail>
      </div>
    </RecordSheet>
  );
}

/**
 * THE LOG HISTORY (Yash, 2026-11-17) — v2's ship-to and customer history:
 * every change that reached the ship-to (or the customer's pricing), as the
 * Change log's own table with its search, filters and columns. A row opens
 * the change over it. Read-only, so no footer (rule 28).
 */
export function PricingHistorySheet({ target, onClose }: { target: PricingTarget | null; onClose: () => void }) {
  const log = useChangeLog();
  const [changeId, setChangeId] = React.useState<string | null>(null);
  if (!target) return null;
  const ents = log.entityMap;
  const isRow = target.kind === "row";
  const changes = historyOf(log.changes, target);
  const shiptoId = isRow ? target.shiptoId : null;
  const title = isRow ? `${shiptoOf(shiptoId!).name} history` : `${customerOf(target.customerId).name} history`;

  const productsIn = (c: ChangeRecord) =>
    uniq((shiptoId ? c.lines.filter((l) => l.shiptoId === shiptoId) : c.lines).map((l) => productOf(l.productId).name));
  const tab: ViewTab = fitTab({
    key: "changes",
    label: "Changes",
    noun: "changes",
    one: "change",
    columns: [
      { key: "when", label: "Date & time", width: 180, sortable: true },
      { key: "change", label: "Change", width: 320, sortable: true },
      ...(isRow ? [{ key: "products", label: "Products", width: 200, sortable: true }] : [{ key: "shiptos", label: "Ship-tos", width: 120, sortable: true }]),
      { key: "setting", label: "Entity", width: 120, sortable: true },
      { key: "action", label: "Action", width: 120, sortable: true },
      { key: "by", label: "Made by", width: 140, sortable: true },
      { key: "source", label: "Made via", width: 200, sortable: true },
      { key: "status", label: "Status", width: 120, sortable: true },
    ],
    rows: changes.map((c): ViewRow => {
      const products = productsIn(c);
      const entities = uniq(c.edits.map((e) => SETTING_LABEL[e.setting])).join(", ");
      return {
        id: c.id,
        text: {
          when: fmtWhen(c.effectiveAt),
          change: `${changeSummary(c, ents)} · ${c.id}`,
          products: products.length > 2 ? `${products.slice(0, 2).join(", ")} +${products.length - 2}` : products.join(", ") || "—",
          shiptos: uniq(c.lines.map((l) => l.shiptoId)).length.toLocaleString(),
          setting: entities,
          action: actionOf(c),
          by: c.by,
          source: SOURCE_LABEL[c.source],
        },
        sort: { when: c.effectiveAt },
        status: STATUS_LABEL[c.status],
        values: { setting: entities, action: actionOf(c), by: c.by, product: products.join(", ") },
      };
    }),
    facets: [
      { key: "setting", label: "Entity" },
      { key: "action", label: "Action" },
      { key: "by", label: "Made by" },
      { key: "status", label: "Status" },
    ],
    renderCell: (r, key) =>
      key === "status" ? (
        <StatusChip tone={kindTone(STATUS_KIND[STATUS_BY_LABEL[r.status]] ?? "neutral")} variant="text">
          {r.status}
        </StatusChip>
      ) : key === "action" ? (
        <Pill>{r.text.action}</Pill>
      ) : undefined,
    onOpen: (r) => setChangeId(r.id),
    nameOf: (r) => r.id,
  });

  return (
    <>
      <RecordSheet
        size="full"
        open
        onOpenChange={(v) => !v && onClose()}
        mode="edit"
        editTitle={title}
        createTitle=""
        createAction=""
        showCancel={false}
        stepNav={false}
        noFooter
        headerSubtitle={
          <span className="text-sm text-muted-foreground">
            {isRow ? `${customerOf(shiptoOf(shiptoId!).customerId).name} · ${shiptoOf(shiptoId!).address}` : "Customer pricing"}
          </span>
        }
        onSubmit={onClose}
      >
        <RecordViews resetKey={isRow ? shiptoId! : target.customerId} tabs={[tab]} searchPlaceholder="Search this history" historyKey="pricing-config-history" />
      </RecordSheet>
      <ChangeSheet id={changeId} onClose={() => setChangeId(null)} onOpen={setChangeId} level={2} />
    </>
  );
}
