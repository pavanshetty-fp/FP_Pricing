import * as React from "react";
import { toast } from "sonner";
import { Copy, MoreHorizontal, ChevronDown, ChevronRight, CircleAlert, CircleCheck, Clock, Loader2, FolderOpen, Gauge, Info, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pill, type PillKind } from "@/components/ui/pill";
import { QuietPattern } from "@/components/ui/quiet-pattern";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { TableCellInput, TableCellMultiSelect, TableCellSelect, TableRowRemove } from "@/components/form-layout/table-cells";
import { HangingAdd } from "../HangingAdd";
import { PendingStrip, attend } from "../PendingStrip";
import { CELL, RecordSheet } from "../RecordSheet";
import { ActivityCard, RailCard, SheetRail, type TimelineEntry } from "../SheetCards";
import { NOW, customerOf, fmtWhen, money, plural, productOf, readSetting, shiptoOf, uniq, type ConfigRow, type EntityMap } from "./changeLog";
import { CATEGORIES, CUSTOMERS, PRODUCTS, SHIPTOS } from "./seed";
import { RecordViews, type ViewRow, type ViewTab } from "../masterdata/RecordViews";
import { FIGURE_STRIP } from "../masterdata/sheetParts";
import { InfoFigure } from "./ChangeSheet";
import {
  BUSINESS_LINES,
  LOS,
  MARKET_NAMES,
  REGION_NAMES,
  SETTINGS,
  WHICH,
  actionLabel,
  actionsFor,
  adjustedBy,
  blankChange,
  blankDefV2,
  blankCondition,
  COND_FIELDS,
  condLabel,
  groupsOf,
  regionOf,
  assetOf,
  assetName,
  type GroupImpact,
  comboLabel,
  APPLIED,
  ALL_VALUES,
  ALL_LABEL,
  type CondField,
  type Condition,
  blankTarget,
  changeReady,
  countOf,
  createRule,
  createTemplate,
  defOf,
  dynMargin,
  lastRun,
  matchRows,
  previewRule,
  priceOf,
  ruleStatus,
  runAgain,
  settingLabel,
  updateRule,
  updateTemplate,
  useBulkRules,
  valueKind,
  whereMatches,
  whichLabel,
  type ChangeRow,
  type ChangeSetting,
  type Preview,
  type Rule,
  type RuleDef,
  type Run,
  type RunResult,
  type TargetRow,
  type Which,
} from "./bulkRules";

/*
  THE BULK RULE SHEET (Yash, 2026-11-18). Read as a recipe, top to bottom:
  the rule (name, when, pricing source), then IF it matches the record, AND
  it belongs to these customers, THEN change these settings, EXCEPT these —
  each marker on the same left edge as the rule's own fields. A new rule's
  prices before → after sit under it; the right column is its Impact: how
  many prices, customers, ship-tos and products, and each setting before →
  after.

  Once it has run, the sheet is the rule: the latest run's prices on top,
  the run's impact on the right, and — when prices have moved since — a
  re-run offered in the bottom bar. Edits autosave and apply from the next
  run. A template is the same form without a date or a run.
*/

export type BulkSheetTarget =
  | { kind: "rule"; id: string | null; from?: RuleDef; /** The same sheet turns into this rule (Apply). */ stay?: boolean }
  | { kind: "template"; id: string | null };

const STATUS_KIND: Record<ReturnType<typeof ruleStatus>, PillKind> = {
  Scheduled: "info",
  "In progress": "info",
  Done: "success",
  "Partly failed": "caution",
};
export const StatusPill = ({ rule }: { rule: Rule }) => {
  const s = ruleStatus(rule);
  return <Pill kind={STATUS_KIND[s]}>{s}</Pill>;
};

/* ------------------------------------------------------------ the time -- */

const hhmm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const timeLabel = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const NO_TIME = "none";
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/** The moment a draft runs: the day, at the time if one is set, else now (today) or 6 AM. */
function whenOf(day: Date | null, time: string) {
  const d = new Date(day ?? NOW);
  if (time === NO_TIME) {
    if (sameDay(d.getTime(), NOW)) return NOW;
    d.setHours(6, 0, 0, 0);
    return d.getTime();
  }
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

const stepId = (k: string) => `bulk-step-${k}`;

/* ---------------------------------------------------------------- sheet -- */

interface Draft extends RuleDef {
  day: Date | null;
  time: string;
}

type PriceRow = { row: ConfigRow; outcome?: string; reason?: string; lines?: Preview["lines"]; priceBefore?: number | null; priceAfter?: number | null; combos?: number[] };
/** What an impact count opens: prices, or the names it counts — a sheet over this one. */
type PriceList =
  | { title: string; kind: "change" | "why"; rows: PriceRow[] }
  | { title: string; kind: "names"; head: [string, string]; names: { name: string; note: string }[] };

export function BulkRuleSheet({ target, onClose, onOpen }: { target: BulkSheetTarget; onClose: () => void; onOpen: (t: BulkSheetTarget) => void }) {
  const bulk = useBulkRules();
  const isTemplate = target.kind === "template";
  const rule = target.kind === "rule" && target.id ? bulk.rules.find((r) => r.id === target.id) ?? null : null;
  const template = isTemplate && target.id ? bulk.templates.find((t) => t.id === target.id) ?? null : null;
  const creating = !rule && !template;

  const [d, setD] = React.useState<Draft>(() => {
    const found: RuleDef = rule ?? template ?? (target.kind === "rule" ? target.from : undefined) ?? blankDefV2();
    /* ONE FORM — IF AS GROUPS (Yash, 2026-11-19: version 1 goes). A rule or
       template saved before reads as one group of its conditions. */
    const src: RuleDef = { ...found, groups: groupsOf(found), conditions: undefined };
    return { ...defOf(src), day: new Date(rule?.at ?? NOW), time: rule?.timeSet ? hhmm(rule.at) : NO_TIME };
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  /* AUTOSAVE — an existing rule or template, 600ms after an edit settles. */
  const first = React.useRef(true);
  React.useEffect(() => {
    if (creating) return;
    if (first.current) return void (first.current = false);
    const t = window.setTimeout(() => {
      if (!d.name.trim()) return;
      if (rule) updateRule(rule.id, { ...defOf(d), name: d.name.trim() });
      if (template) updateTemplate(template.id, { ...defOf(d), name: d.name.trim() });
    }, 600);
    return () => window.clearTimeout(t);
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = React.useMemo(() => previewRule(d, bulk.rows, bulk.entityMap, rule ? adjustedBy(rule) : undefined), [d, bulk.rows, bulk.entityMap, rule]);
  const at = whenOf(d.day, d.time);
  const later = at > NOW;

  const [list, setList] = React.useState<PriceList | null>(null);
  /* AN IMPACT COUNT FILTERS THE PRICE LIST AND TAKES YOU TO IT (Yash,
     2026-11-18) — no side sheet; the list has its own filters. */
  const [listApply, setListApply] = React.useState<{ tab: string; picked: string[]; n: number } | null>(null);
  const focusPrices = (picked: string[]) => {
    setListApply({ tab: "prices", picked, n: Date.now() });
    window.setTimeout(() => document.getElementById(stepId("prices"))?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };
  const [priceOpen, setPriceOpen] = React.useState<PriceRow | null>(null);

  const ready = d.changes.some(changeReady);
  const pending = [
    !d.name.trim() && { key: "name", label: "Enter a name", target: stepId("rule") },
    !d.conditions && d.where.length > 1 && d.where.some((w) => !w.region) && { key: "region", label: "Choose a region on each condition", target: stepId("where") },
    !d.conditions && d.targets.length > 1 && d.targets.some((t) => !t.customerId) && { key: "customer", label: "Choose a customer on each line", target: stepId("applies") },
    !isTemplate && !preview.groups.some((g) => g.asked) && { key: "if", label: "Add a condition", target: stepId("where") },
    !ready && { key: "change", label: "Add a change", target: stepId("change") },
    preview.groups.some((g) => g.sameAs) && { key: "same", label: "Two combinations are the same", target: stepId("where") },
    !isTemplate && ready && preview.updated.length === 0 && { key: "none", label: "Nothing to update", target: stepId("change") },
  ].filter(Boolean) as { key: string; label: string; target: string }[];

  /* APPLY STAYS ON THIS PAGE (Yash, 2026-11-19) — no new sheet: the page
     becomes the rule, and its status bar follows the run. */
  const apply = () => {
    const made = createRule({ ...defOf(d), name: d.name.trim() }, at, d.time !== NO_TIME, bulk.rows, bulk.entityMap);
    toast.success(later ? `${made.name} scheduled for ${fmtWhen(at)}` : `${made.name} running on ${plural(preview.updated.length, "price")}`);
    onOpen({ kind: "rule", id: made.id, stay: true });
  };
  /* THE SHEET'S DEFAULT PRIMARY CLOSES AFTER IT SUBMITS — this one turns into
     the record it made. */
  const keepOpen = React.useRef(false);
  const submit = () => {
    if (pending.length) return;
    if (isTemplate) {
      const t = createTemplate({ ...defOf(d), name: d.name.trim() });
      toast.success(`${t.name} template created`);
      return onOpen({ kind: "template", id: t.id });
    }
    apply();
  };

  /* THE ACT SAYS HOW MANY once there is a change to count. */
  /* RUN RULE, NOT APPLY, ON THE FIRST RUN (Yash, 2026-11-20). */
  const createAction = isTemplate ? "Create template" : later ? `Schedule for ${fmtWhen(at)}` : "Run rule";

  const run = rule ? lastRun(rule) : null;
  /* A RAN RULE READS AS IT STOOD WHEN IT RAN (Yash, 2026-11-19) — "No
     records match" after the run made them match no more was wrong. The
     records the run shown changed are put back as they were. */
  const beforeRows = React.useMemo(() => {
    const r0 = rule?.runs.filter((x) => x.status !== "scheduled").slice(-1)[0];
    if (!r0) return null;
    const was = new Map(r0.results.filter((x) => x.before).map((x) => [x.rowId, x.before!]));
    return bulk.rows.map((r) => was.get(r.id) ?? r);
  }, [rule, bulk.rows]);
  const asRan = React.useMemo(() => (beforeRows ? previewRule(d, beforeRows, bulk.entityMap) : preview), [beforeRows, d, bulk.entityMap, preview]);
  /* THE RUN SHOWN — the latest by default; a new run brings it back to that. */
  const doneRuns = rule ? rule.runs.filter((x) => x.status !== "scheduled") : [];
  const [runId, setRunId] = React.useState<string | null>(null);
  React.useEffect(() => setRunId(null), [run?.id]);
  const shown = doneRuns.find((x) => x.id === runId) ?? run;
  const scheduled = run?.status === "scheduled";
  const running = run?.status === "running";
  /* AFTER A RUN, ONE OF THREE (Yash, 2026-11-20). Failed records first —
     they are retried; then records that need another run (what would change
     now, less the failures); else nothing needs it. "Rerun available" only
     when the system knows records need it. */
  const rowOf = React.useMemo(() => new Map(bulk.rows.map((r) => [r.id, r])), [bulk.rows]);
  const failed = run && run.status === "done" ? run.results.filter((x) => x.outcome === "failed") : [];
  const failedIds = new Set(failed.map((x) => x.rowId));
  /* A FAILED RECORD SHOWS WHAT A RETRY WOULD CHANGE, AND WHY IT FAILED (Yash, 2026-11-20). */
  const willOf = new Map(preview.list.map((p) => [p.row.id, p]));
  const failedRows: PriceRow[] = failed
    .map((x) => {
      const w = willOf.get(x.rowId);
      const row = x.before ?? rowOf.get(x.rowId)!;
      return { row, outcome: "Failed", reason: x.reason, lines: w?.lines, priceBefore: w?.priceBefore ?? (row && row.configured ? priceOf(row, bulk.entityMap) : null), priceAfter: w && w.outcome === "updated" ? w.priceAfter : null };
    })
    .filter((x) => x.row);
  const needRows = preview.updated.filter((p) => !failedIds.has(p.row.id));
  const after: "failed" | "rerun" | "none" | null =
    !rule || scheduled || running ? null : failedRows.length ? "failed" : needRows.length ? "rerun" : "none";
  const [review, setReview] = React.useState<"rerun" | "failures" | null>(null);
  const [confirmAgain, setConfirmAgain] = React.useState(false);
  const rerun = (verb: string, n: number) => {
    if (!rule) return;
    runAgain(rule.id, bulk.rows, bulk.entityMap);
    toast.success(n ? `${verb} ${plural(n, "record")}` : `${rule.name} running again`);
  };

  /* THE BOTTOM BAR SPEAKS FOR THE NEXT RUN (Yash, 2026-11-18): when prices
     have moved since the last run, it says how many need attention, beside
     the act that reviews and reruns; when nothing would change, it says so
     and there is nothing to press. */
  /* WHAT APPLY IS WAITING ON, IN THE BOTTOM BAR'S LEFT (Yash, 2026-11-18,
     as Service work orders) — raised by a press with something missing, gone
     once all is in; no strip across the sheet above the bar. */
  const [raised, setRaised] = React.useState(false);
  const runNow = () => {
    if (!rule) return;
    runAgain(rule.id, bulk.rows, bulk.entityMap);
    toast.success(`${rule.name} running on ${plural(preview.updated.length, "price")}`);
  };
  const press = () => {
    if (pending.length) {
      setRaised(true);
      if (pending[0].target) attend(pending[0].target);
      return;
    }
    submit();
  };
  const createAside = creating && raised && pending.length > 0 ? <PendingStrip tone="caution" pending={pending} /> : undefined;
  const status = (tone: "caution" | "ok" | "progress", lead: string, rest?: string) => (
    <span className={cn("flex items-center gap-2 text-sm", tone === "ok" ? "text-muted-foreground" : "text-foreground")}>
      {tone === "progress" ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : tone === "ok" ? (
        <CircleCheck className="size-4 shrink-0 text-fp-banner-accent-success" />
      ) : (
        <CircleAlert className="size-4 shrink-0 text-fp-banner-accent-caution" />
      )}
      <span>
        <span className={cn(tone !== "ok" && "font-medium")}>{lead}</span>
        {rest && <span className="text-muted-foreground"> · {rest}</span>}
      </span>
    </span>
  );
  /* THE REVIEW'S FIGURES, ON TOP OF ITS TABLE (Yash, 2026-11-20) — as the
     Activity feed's: what the rule reaches, what the rerun or retry changes,
     and the ship-tos it overrides (or, at customer level, the ship-tos that
     inherit and those with their own pricing). */
  const allNow = allOfPreview(preview);
  const custNow = preview.customerMode ? customersOf(allNow) : null;
  const needCust = custNow ? custNow.filter((c) => needRows.some((p) => p.row.customerId === c.customerId)) : null;
  const needPrices: PriceRow[] = needRows.map((p) => ({ row: p.row, outcome: WILL, lines: p.lines, priceBefore: p.priceBefore, priceAfter: p.priceAfter }));
  const OVER = [`applied:${OVERRIDE.customer}`, `applied:${OVERRIDE.hub}`];
  const rerunFigures: Figure[] = needCust
    ? (() => {
        const inh = needCust.flatMap((c) => c.inheriting);
        const own = needCust.flatMap((c) => c.own);
        return [
          { label: "Customers matched", info: "Customers this rule reaches now.", value: custNow!.length, note: plural(custNow!.reduce((n, c) => n + c.inheriting.length + c.own.length, 0), "ship-to") },
          { label: "Will update", info: "Customers this rerun changes.", value: needCust.length, note: `of ${custNow!.length.toLocaleString()}`, picked: [] },
          { label: "Ship-tos inheriting", info: "Ship-tos that take the change from their customer.", value: inh.length, note: `of ${(inh.length + own.length).toLocaleString()}` },
          { label: "Ship-tos skipped", info: SHIPTO_PRICING_INFO, value: own.length, note: `of ${(inh.length + own.length).toLocaleString()}` },
        ];
      })()
    : [
        { label: "Records matched", info: "Records this rule reaches now.", value: preview.matched, note: plural(preview.byCustomer.length, "customer") },
        { label: "Will update", info: "Records this rerun changes.", value: needRows.length, note: `of ${preview.matched.toLocaleString()}`, picked: [] },
        { label: "Skipped", info: "Records already up to date, or that can't take the change.", value: preview.skipped.length, note: `of ${preview.matched.toLocaleString()}` },
        { label: "Pricing overridden", info: OVERRIDDEN_INFO, value: overriddenIn(needPrices).length, note: `of ${plural(uniq(needRows.map((p) => p.row.shiptoId)).length, "ship-to")}`, picked: OVER },
      ];
  const failFigures: Figure[] = [
    { label: "Records matched", info: "Records the last run reached.", value: run?.total ?? 0, note: plural(uniq(failedRows.map((p) => p.row.customerId)).length, "customer") },
    { label: "Failed", info: "Records the last run could not update.", value: failedRows.length, note: `of ${(run?.total ?? 0).toLocaleString()}`, picked: [] },
    { label: "Ship-tos", info: "Ship-tos with a failed record.", value: uniq(failedRows.map((p) => p.row.shiptoId)).length, note: plural(uniq(failedRows.map((p) => p.row.productId)).length, "product") },
    { label: "Pricing overridden", info: OVERRIDDEN_INFO, value: overriddenIn(failedRows).length, note: `of ${plural(uniq(failedRows.map((p) => p.row.shiptoId)).length, "ship-to")}`, picked: OVER },
  ];
  const rerunNoun = needCust ? "customer" : "record";
  const rerunN = needCust ? needCust.length : needRows.length;
  const footerAside =
    createAside ??
    (after === "failed"
      ? status("caution", "Run partially failed", `${failedRows.length.toLocaleString()} of ${plural(run!.total, "record")} failed`)
      : after === "rerun"
        ? status("caution", "Rerun available", `${rerunN.toLocaleString()} of ${plural(needCust ? custNow!.length : preview.matched, rerunNoun)} ${rerunN === 1 ? "needs" : "need"} attention`)
        : after === "none"
          ? status("ok", "No records need attention")
          : running
            ? /* IN PROGRESS, IN THE BAR TOO (Yash, 2026-11-20) — no act until it ends. */
              status("progress", "In progress", `${run!.progress.toLocaleString()} of ${plural(run!.total, "record")} done`)
            : undefined);
  const footerPrimary = rule ? (
    scheduled ? (
      <Button onClick={runNow}>Run now</Button>
    ) : after === "failed" ? (
      <Button onClick={() => setReview("failures")}>Review failures</Button>
    ) : after === "rerun" ? (
      <Button onClick={() => setReview("rerun")}>Review rerun</Button>
    ) : after === "none" ? (
      <Button onClick={() => setConfirmAgain(true)}>Run again</Button>
    ) : null
  ) : template ? (
    <Button onClick={() => onOpen({ kind: "rule", id: null, from: { ...defOf(d), name: "" } })}>Create rule from template</Button>
  ) : (
    <Button onClick={press}>{createAction}</Button>
  );

  const body = (
    <div className="flex min-w-0 flex-col gap-10">
      <RuleSection d={d} set={set} setD={setD} isTemplate={isTemplate} canLoad={false} templates={bulk.templates} />
      <GroupsSection
        groups={d.groups ?? [[blankCondition()]]}
        matches={d.matches ?? []}
        join={d.join ?? "or"}
        onChange={(p) => setD((x) => ({ ...x, ...p }))}
        impacts={asRan.groups}
        configRows={bulk.rows}
        ents={bulk.entityMap}
      />
      <ChangeSection changes={d.changes} onChange={(changes) => set("changes", changes)} entities={bulk.entities} />
      <TargetSection
        id={stepId("exclude")}
        tag="Exclude"
        rest="these"
        rows={d.exclude}
        onChange={(exclude) => set("exclude", exclude)}
        configRows={bulk.rows}
        def={{ ...d, exclude: [] }}
        ents={bulk.entityMap}
        exclude
      />
    </div>
  );

  /* THE PRICES RUN THE FULL WIDTH, UNDER THE FORM AND ITS CARD — the 3PL
     review's way: the card on the right keeps its height beside the form,
     and the table below goes end to end (Yash, 2026-11-18). */
  const prices = (
    <>
      {/* A NEW RULE'S PRICES, BEFORE → AFTER — the table under its title; the
          counts are the Impact card's on the right (Yash, 2026-11-18). */}
      {/* A RAN RULE'S PRICES SIT IN THE SAME PLACE, UNDER THE RECIPE — not on
          top of the rule (Yash, 2026-11-18). */}
      {rule && shown && (
        <RunSection run={shown} runs={doneRuns} onPick={setRunId} rows={bulk.rows} ents={bulk.entityMap} apply={listApply} onOpenPrice={setPriceOpen} customerMode={preview.customerMode} onNames={setList} />
      )}
      {/* THE TABLE IS ALWAYS THERE (Yash, 2026-11-20) — empty until there are
          conditions and a change, and says so in its body. */}
      {creating && !isTemplate && (
        <SheetSection title={preview.customerMode && ready ? "Customers to update" : "Records to update"} id={stepId("prices")} variant="plain">
          {!ready || !preview.groups.some((g) => g.asked) ? (
            <PricesView resetKey="empty" rows={[]} ents={bulk.entityMap} apply={null} onOpen={setPriceOpen} empty="Select conditions and changes to see records here." />
          ) : preview.customerMode ? (
            <CustomersView resetKey="new" rows={customersOf(allOfPreview(preview))} apply={listApply} onOpen={(c) => setList(custNames(c))} />
          ) : (
            <PricesView resetKey="new" rows={allOfPreview(preview)} ents={bulk.entityMap} apply={listApply} onOpen={setPriceOpen} empty="No records match these conditions." />
          )}
        </SheetSection>
      )}
    </>
  );

  const entries: TimelineEntry[] = rule
    ? /* OLDEST FIRST — the Activity card puts the newest on top itself. */
      rule.runs.map((x) => ({
        at: new Date(x.at).toISOString(),
        by: x.by,
        changes: [x.status === "scheduled" ? `Run ${x.n} scheduled` : `Run ${x.n} · ${runLine(x)}`],
      }))
    : [];

  const fitTables = [
    [CELL.pick, CELL.pick, CELL.pick, CELL.pick, CELL.bin],
    [CELL.name, CELL.pick, CELL.pick, CELL.pick, CELL.bin],
    [CELL.pick, CELL.pick, CELL.name, CELL.bin],
  ];

  return (
    <RecordSheet
      open
      onOpenChange={(v) => {
        if (v) return;
        if (keepOpen.current) return void (keepOpen.current = false);
        onClose();
      }}
      mode={creating ? "create" : "edit"}
      fit={{ tables: fitTables, rail: true }}
      createTitle={isTemplate ? "Create template" : "Create bulk rule"}
      editTitle={d.name || (isTemplate ? "Template" : "Bulk rule")}
      createAction={createAction}
      editAction=""
      showCancel={false}
      footerAside={footerAside}
      footerPrimary={footerPrimary}
      headerAside={rule ? <StatusPill rule={rule} /> : undefined}
      /* DUPLICATE, IN ⋯ (Yash, 2026-11-19) — templates are hidden; a rule is
         reused by duplicating it. */
      headerMenu={
        rule ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More rule actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => onOpen({ kind: "rule", id: null, from: { ...defOf(d), name: `${d.name} (copy)` } })}>
                <Copy />
                Duplicate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
      /* THE TITLE ALONE (Yash, 2026-11-19) — no "Bulk rule" under it. */
      /* THE STATUS AS A TRACK only while there is something to follow —
         scheduled or running. Once a rule has run, the header's pill says it. */
      /* NO STATUS TRACK (Yash, 2026-11-19) — the Impact card's progress says it. */
      onSubmit={submit}
    >
      {isTemplate ? (
        /* A TEMPLATE SHOWS ITS IMPACT TOO (Yash, 2026-11-19) — what it would
           reach today, the same card a rule shows. */
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]">
          {body}
          <SheetRail className={!preview.groups.some((g) => g.asked) ? "lg:h-(--rail-max)" : undefined}>
            <PreviewImpactCard d={d} preview={preview} ready={ready} ents={bulk.entityMap} onNames={setList} />
          </SheetRail>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-10">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]">
          {body}
          {/* THE EMPTY IMPACT CARD, ALONE, RUNS THE COLUMN — as a lone card does (IX-100). */}
          <SheetRail className={!rule && !preview.groups.some((g) => g.asked) ? "lg:h-(--rail-max)" : undefined}>
            {rule && run && !scheduled ? (
              <RunImpactCard
                rule={rule}
                run={shown ?? run}
                before={asRan}
                ents={bulk.entityMap}
                onFilter={focusPrices}
                cs={preview.customerMode ? customersOf(runRowsOf(shown ?? run, bulk.rows, bulk.entityMap)) : null}
                onNames={setList}
              />
            ) : (
              <PreviewImpactCard d={d} preview={preview} ready={ready} ents={bulk.entityMap} onFilter={focusPrices} onNames={setList} />
            )}
            {rule && <ActivityCard title="History" entries={entries} />}
          </SheetRail>
        </div>
        {prices}
        </div>
      )}
      {list && <ListSheet list={list} ents={bulk.entityMap} onClose={() => setList(null)} />}
      {review === "rerun" && (
        <ReviewRunSheet
          title="Review rerun"
          action={`Rerun ${plural(rerunN, rerunNoun)}`}
          kind="change"
          rows={needPrices}
          customers={needCust ? needCust.map((c) => ({ ...c, outcome: WILL })) : null}
          onNames={setList}
          figures={rerunFigures}
          ents={bulk.entityMap}
          onConfirm={() => rerun("Rerunning", needRows.length)}
          onClose={() => setReview(null)}
        />
      )}
      {review === "failures" && (
        <ReviewRunSheet
          title="Review failures"
          action={`Retry ${plural(failedRows.length, "record")}`}
          kind="why"
          rows={failedRows}
          figures={failFigures}
          ents={bulk.entityMap}
          onConfirm={() => rerun("Retrying", failedRows.length)}
          onClose={() => setReview(null)}
        />
      )}
      <AlertDialog open={confirmAgain} onOpenChange={setConfirmAgain}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No records need rerunning</AlertDialogTitle>
            <AlertDialogDescription>All records are up to date. You can still run this rule again if needed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => rerun("", 0)}>Run again</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {priceOpen && <PriceSheet price={priceOpen} ents={bulk.entityMap} onClose={() => setPriceOpen(null)} />}
    </RecordSheet>
  );
}

const runLine = (x: Run) => {
  const failed = countOf(x, "failed");
  return `${plural(countOf(x, "updated"), "price")} updated${failed ? ` · ${failed} failed` : ""}`;
};


/* -------------------------------------------------------------- recipe -- */

/** A STEP OF THE RECIPE — its marker (If · And · Then · Except) leading the
 *  title on the same left edge as the rule's own fields (Yash, 2026-11-18),
 *  then the table in the outlined box a stepped form gives a table. */
function RecipeSection({
  id,
  tag,
  rest,
  tone,
  hanging,
  boxed = true,
  last,
  info,
  children,
}: {
  id: string;
  tag: string;
  rest: string;
  /** WHAT THE STEP MEANS, BEHIND AN ⓘ by its title (UX-96 — no note on screen). */
  info?: React.ReactNode;
  tone?: "then";
  hanging?: React.ReactNode;
  boxed?: boolean;
  /** The last step — no line runs on from it. */
  last?: boolean;
  children: React.ReactNode;
}) {
  const box = <div className={cn("flex shrink-0 flex-col overflow-hidden rounded-lg border border-border", hanging && "rounded-bl-none")}>{children}</div>;
  return (
    /* THE LINE (Yash, 2026-11-18): from under each marker down to the next,
       the marker on the rule fields' left edge, the step's table just right
       of the line. */
    <section id={id} className="relative flex shrink-0 flex-col gap-4">
      {!last && <span aria-hidden className="absolute top-7 -bottom-10 left-3 w-px bg-border" />}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold",
            tone === "then" ? "bg-accent-violet text-accent-violet-foreground" : "bg-muted text-foreground"
          )}
        >
          {tag}
        </span>
        <h3 className="text-base font-medium text-muted-foreground">{rest}</h3>
        {info && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="How these conditions work"
                className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Info className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex w-80 flex-col gap-2 text-sm text-muted-foreground">
              {info}
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="pl-8">
        {!boxed ? (
          children
        ) : hanging ? (
          <div className="flex flex-col">
            {box}
            <div className="flex w-full items-center justify-between gap-4">{hanging}</div>
          </div>
        ) : (
          box
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- rule -- */

function RuleSection({
  d,
  set,
  setD,
  isTemplate,
  canLoad,
  templates,
}: {
  d: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  setD: React.Dispatch<React.SetStateAction<Draft>>;
  isTemplate: boolean;
  /** Load a template — while creating a rule only. */
  canLoad: boolean;
  templates: (RuleDef & { id: string })[];
}) {
  const load = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setD((x) => ({ ...x, ...defOf(t), groups: groupsOf(t), conditions: undefined, name: x.name || t.name }));
    toast.success(`${t.name} loaded`);
  };
  return (
    <SheetSection title={isTemplate ? "Template" : "Rule"} id={stepId("rule")}>
      {/* TWO ROWS OF FIELDS, 24px apart — as the fields sit across. */}
      <div className="flex flex-col gap-6">
        <div className={cn("grid gap-6", isTemplate ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_minmax(0,200px)_164px]")}>
          <SheetField label="Name" required>
            <div className="flex gap-2">
              <Input value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter a name" />
              {canLoad && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="Load a template">
                          <FolderOpen />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Load a template</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Templates</DropdownMenuLabel>
                    {templates.map((t) => (
                      <DropdownMenuItem key={t.id} onSelect={() => load(t.id)}>
                        {t.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </SheetField>
          {!isTemplate && (
            <>
              <SheetField label="Execution date" required>
                <DateField value={d.day} onChange={(day) => set("day", day)} dayDisabled={(day) => day.getTime() < new Date(NOW).setHours(0, 0, 0, 0)} />
              </SheetField>
              <SheetField label="Time">
                <Select value={d.time} onValueChange={(v) => set("time", v)}>
                  <SelectTrigger className="w-full" aria-label="Time">
                    {/* THE CLOCK BESIDE ITS TIME, not across the field from it. */}
                    <span className="flex min-w-0 items-center gap-2">
                      <Clock className="size-4 shrink-0 text-muted-foreground" />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={NO_TIME}>Immediately</SelectItem>
                    {TIMES.filter((v) => !(d.day && sameDay(d.day.getTime(), NOW) && whenOf(d.day, v) < NOW)).map((v) => (
                      <SelectItem key={v} value={v}>
                        {timeLabel(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SheetField>
            </>
          )}
        </div>
      </div>
    </SheetSection>
  );
}

/* ---------------------------------------------------------------- where -- */

const TH = "px-3 py-2.5 text-left text-sm font-medium";
/* `group/row` — the row bin shows on the row's hover (TableRowRemove). */
const TR = "group/row h-11 border-b border-border last:border-b-0";
/* NO DIVIDER BEFORE THE BIN (Yash, 2026-11-18) — the column stays pinned,
   the bin alone marks it. */
const BIN_TD = "sticky right-0 z-10 bg-popover p-0 text-center";
const BIN_TH = "sticky right-0 z-10 bg-fp-table-header";


/* ------------------------------------------------- version 2: if this -- */

/** Options in reading order: picked, then pickable, then ruled out. */
const ordered = (names: string[], picked: string[], off?: Record<string, string>) => [
  ...names.filter((n) => picked.includes(n)),
  ...names.filter((n) => !picked.includes(n) && !off?.[n]),
  ...names.filter((n) => !picked.includes(n) && off?.[n]),
];
/** A condition's name mid-sentence — "ship-to", but "LOS". */
const lowerLabel = (f: CondField) => (f === "los" ? "LOS" : condLabel(f).toLowerCase());

/** Every value a condition can take, as it reads — and back. */
function condOptions(f: CondField, ents: EntityMap): { names: string[]; toName: (v: string) => string; toValue: (n: string) => string } {
  const id = <T extends { id: string; name: string }>(xs: T[]) => {
    const byName = new Map(xs.map((x) => [x.name, x.id]));
    const byId = new Map(xs.map((x) => [x.id, x.name]));
    return { names: xs.map((x) => x.name), toName: (v: string) => byId.get(v) ?? v, toValue: (n: string) => byName.get(n) ?? n };
  };
  const plain = (names: string[]) => ({ names, toName: (v: string) => v, toValue: (n: string) => n });
  switch (f) {
    case "customer":
      return id(CUSTOMERS);
    case "shipto":
      return id(SHIPTOS);
    case "product":
      return id(PRODUCTS);
    case "region":
      return plain(REGION_NAMES);
    case "market":
      return plain(MARKET_NAMES);
    case "businessLine":
      return plain(BUSINESS_LINES);
    case "los":
      return plain(LOS);
    case "category":
      return plain(CATEGORIES.map((c) => c.name));
    case "rateType":
      return plain([...ents.values()].filter((e) => e.setting === "rateType").map((e) => e.name));
    case "applied":
      return plain(Object.values(APPLIED));
    case "configurations":
      return { names: WHICH.map((w) => w.label), toName: (v) => whichLabel(v as Which), toValue: (n) => WHICH.find((w) => w.label === n)?.key ?? n };
    case "source":
      return plain(["First party", "3PL"]);
  }
}

/** A condition's values at "All" — "Both" for configurations. */
const allOf = (f: CondField): string[] => (f === "configurations" ? ["both"] : [ALL_VALUES]);

/** WHY A GROUP MATCHES NOTHING, in words — the contradictions the AND/OR
 *  test found (Yash, 2026-11-19). */
function emptyWhy(g: Condition[], rows: ConfigRow[], ents: EntityMap): string {
  const get = (f: CondField) => g.find((c) => c.field === f && c.values.length && !c.values.includes(ALL_VALUES));
  const cu = get("customer");
  const st = get("shipto");
  if (cu && st && !st.values.some((id) => cu.values.includes(shiptoOf(id).customerId))) return "The ship-tos picked are not the customer's";
  const rg = get("region");
  const mk = get("market");
  if (rg && mk && !mk.values.some((m) => rg.values.includes(regionOf(m)))) return "The markets picked are not in the region";
  const which = get("configurations");
  if (which?.values[0] === "unconfigured" && (get("rateType") || get("applied"))) return "Records not set up have no rate type or applied pricing yet";
  void rows;
  void ents;
  return "No record has all of these together";
}

/** IF — GROUPS OF CONDITIONS (Yash, 2026-11-19). Inside a group every
 *  condition must hold (AND); any one group is enough (OR). No order and no
 *  precedence. Each group says what it matches on its own, and flags a group
 *  that matches nothing, adds nothing, or repeats another. */
function GroupsSection({
  groups,
  matches,
  join,
  onChange,
  impacts,
  configRows,
  ents,
}: {
  groups: Condition[][];
  /** Per combination: Match all (AND) or any (OR) of its conditions. */
  matches: ("all" | "any")[];
  /** Between combinations: AND or OR. */
  join: "and" | "or";
  onChange: (p: { groups?: Condition[][]; matches?: ("all" | "any")[]; join?: "and" | "or" }) => void;
  impacts: GroupImpact[];
  configRows: ConfigRow[];
  ents: EntityMap;
}) {
  const [added, setAdded] = React.useState<string | null>(null);
  const setGroup = (gi: number, g: Condition[]) => onChange({ groups: groups.map((x, k) => (k === gi ? g : x)) });
  const matchAt = (gi: number) => matches[gi] ?? "all";
  const sourced = configRows;
  const byLabel = (l: string) => COND_FIELDS.find((x) => x.label === l)!.key;
  return (
    <RecipeSection
      id={stepId("where")}
      tag="If"
      rest="it matches these conditions"
      boxed={false}
      info={
        <>
          <p>In a combination, Match all needs every condition to hold; Match any needs one.</p>
          <p>Between combinations, AND needs a record to meet all of them; OR needs any one. A record changes once.</p>
        </>
      }
    >
      <div className="flex flex-col">
        {groups.map((g, gi) => {
          const im = impacts[gi];
          const canAdd = g.some((c) => c.field) && g.every((c) => c.field) && g.length < COND_FIELDS.length;
          const warn = im?.sameAs
            ? `Same conditions as combination ${im.sameAs}. Delete one or add a condition.`
            : im?.empty
              ? `No records match this combination. ${emptyWhy(g, sourced, ents)}.`
              : im?.addsNothing
                ? "Every record here is already in another combination."
                : null;
          return (
            <React.Fragment key={gi}>
              {/* OR BETWEEN GROUPS — its own line, so it reads apart from the AND inside. */}
              {/* AND OR OR BETWEEN COMBINATIONS (Yash, 2026-11-19) — one choice for
                  the rule, shown on every line between them, so there is no
                  order to read. */}
              {gi > 0 && (
                <div className="flex items-center gap-2 py-2">
                  <span className="h-px flex-1 bg-border" />
                  <Select value={join} onValueChange={(v) => onChange({ join: v as "and" | "or" })}>
                    <SelectTrigger size="sm" className="h-7 w-auto gap-1 bg-muted px-2.5 text-xs font-semibold" aria-label="Between combinations">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="and">AND</SelectItem>
                      <SelectItem value="or">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className="flex flex-col">
                <div className={cn("flex flex-col overflow-hidden rounded-lg border", warn ? "border-fp-banner-accent-caution" : "border-border", canAdd && "rounded-bl-none")}>
                  {/* THE COMBINATION'S OWN SHARE (Yash, 2026-11-19) — who on the
                      left; unique and repeated records, the matched count as a
                      chip that opens them, and the bin on the right. */}
                  <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="text-sm font-medium text-foreground">Combination {gi + 1}</span>
                      {im && im.matched > 0 && (
                        <span className="truncate text-sm text-muted-foreground">
                          {plural(im.customers, "customer")} · {plural(im.shiptos, "ship-to")}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {/* MATCH ALL OR ANY (Yash, 2026-11-19); records stay in the Impact card. */}
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        Match
                        <Select
                          value={matchAt(gi)}
                          onValueChange={(v) => onChange({ matches: groups.map((_, k) => (k === gi ? (v as "all" | "any") : matchAt(k))) })}
                        >
                          <SelectTrigger size="sm" className="w-[112px]" aria-label={`Combination ${gi + 1} match`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All (AND)</SelectItem>
                            <SelectItem value="any">Any (OR)</SelectItem>
                          </SelectContent>
                        </Select>
                      </span>
                      {groups.length > 1 && (
                        <>
                          <span aria-hidden className="h-5 w-px bg-border" />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete combination ${gi + 1}`}
                            title="Delete combination"
                            onClick={() => onChange({ groups: groups.filter((_, k) => k !== gi), matches: groups.map((_, k) => matchAt(k)).filter((_, k) => k !== gi) })}
                          >
                            <Trash2 />
                          </Button>
                        </>
                      )}
                    </span>
                  </div>
                  {warn && (
                    /* THE ALERT IN ITS COLOUR, the line and its icon (Yash, 2026-11-19). */
                    <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm text-fp-banner-accent-caution">
                      <CircleAlert className="size-4 shrink-0" />
                      {warn}
                    </div>
                  )}
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[64px]" />
                      <col className="w-[28%]" />
                      <col />
                      <col className="w-[52px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border bg-fp-table-header">
                        <th aria-hidden className={TH} />
                        <th className={TH}>Condition</th>
                        <th className={TH}>Value</th>
                        <th aria-hidden className={BIN_TH} />
                      </tr>
                    </thead>
                    <tbody>
                      {g.map((c, i) => {
                        const setRow = (patch: Partial<Condition>) => setGroup(gi, g.map((x, k) => (k === i ? { ...x, ...patch } : x)));
                        const base = c.field ? condOptions(c.field, ents) : null;
                        const all = c.field && c.field !== "configurations" ? ALL_LABEL[c.field] : undefined;
                        const opts = base && {
                          ...base,
                          toName: (v: string) => (v === ALL_VALUES && all ? all : base.toName(v)),
                          toValue: (n: string) => (n === all ? ALL_VALUES : base.toValue(n)),
                        };
                        const one = c.field && COND_FIELDS.find((x) => x.key === c.field)!.one;
                        const others = g.filter((_, k) => k !== i).map((x) => x.field).filter(Boolean) as CondField[];
                        const key = `${gi}-${i}`;
                        return (
                          <tr key={i} className={TR}>
                            {/* WHERE, THEN AND BETWEEN CONDITIONS. */}
                            <td className="px-3 text-xs font-semibold text-muted-foreground">{i === 0 ? "Where" : matchAt(gi) === "any" ? "Or" : "And"}</td>
                            <td className="relative p-0">
                              <TableCellMultiSelect
                                values={c.field ? [condLabel(c.field)] : []}
                                options={COND_FIELDS.filter((f) => f.key === c.field || !others.includes(f.key)).map((f) => f.label)}
                                placeholder="Select condition"
                                unitLabel="condition"
                                autoFocus={added === key}
                                aria-label={`Combination ${gi + 1} condition ${i + 1}`}
                                onChange={(labels) => {
                                  const keys = labels.map(byLabel);
                                  if (!keys.length) return setRow(blankCondition());
                                  /* ALL BY DEFAULT (Yash, 2026-11-19) — a condition picked starts
                                     at "All" of its values; narrowing is a choice. */
                                  const keep = c.field && keys.includes(c.field) ? c : { field: keys[0], values: allOf(keys[0]) };
                                  const more = keys.filter((k) => k !== keep.field).map((field): Condition => ({ field, values: allOf(field) }));
                                  setGroup(gi, [...g.slice(0, i), keep, ...more, ...g.slice(i + 1)]);
                                }}
                              />
                            </td>
                            <td className="relative p-0">
                              {!opts ? (
                                <TableCellInput value="" disabled placeholder="" aria-label={`Combination ${gi + 1} value ${i + 1}`} onChange={() => undefined} />
                              ) : one ? (
                                /* ONE VALUE — a configurations choice is one of three. */
                                <TableCellSelect
                                  value={c.values[0] ? opts.toName(c.values[0]) : ""}
                                  options={all ? [all, ...opts.names] : opts.names}
                                  placeholder={`Select ${lowerLabel(c.field as CondField)}`}
                                  aria-label={`Combination ${gi + 1} value ${i + 1}`}
                                  onChange={(n) => setRow({ values: [opts.toValue(n)] })}
                                />
                              ) : (
                                <TableCellMultiSelect
                                  values={c.values.map(opts.toName)}
                                  options={ordered(opts.names, c.values.map(opts.toName))}
                                  allOption={all}
                                  placeholder={`Select ${lowerLabel(c.field as CondField)}`}
                                  unitLabel={lowerLabel(c.field as CondField)}
                                  aria-label={`Combination ${gi + 1} value ${i + 1}`}
                                  onChange={(v) => setRow({ values: v.map(opts.toValue) })}
                                />
                              )}
                            </td>
                            <td className={BIN_TD}>
                              {g.length > 1 && (
                                <TableRowRemove
                                  aria-label={`Remove ${c.field ? condLabel(c.field) : `condition ${i + 1}`} from combination ${gi + 1}`}
                                  onRemove={() => setGroup(gi, g.filter((_, k) => k !== i))}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {canAdd && (
                  <div className="flex">
                    <HangingAdd
                      label="Add condition"
                      onClick={() => {
                        setAdded(`${gi}-${g.length}`);
                        setGroup(gi, [...g, blankCondition()]);
                      }}
                    />
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
        {/* A NEW BRANCH — another combination, joined by OR; centred on its line
            like the Or between combinations (Yash, 2026-11-19). */}
        <div className="flex items-center gap-3 pt-4">
          <span className="h-px flex-1 bg-border" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAdded(`${groups.length}-0`);
              onChange({ groups: [...groups, [blankCondition()]], matches: [...groups.map((_, k) => matchAt(k)), "all"] });
            }}
          >
            <Plus />
            Add combination
          </Button>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>
    </RecipeSection>
  );
}

/* ----------------------------------------------- belongs to · except -- */

const ALL_CUSTOMERS = "All customers";
const ALL_SHIPTOS = "All ship-tos";
const ALL_PRODUCTS = "All products";
const productByName = new Map(PRODUCTS.map((p) => [p.name, p.id]));
const shiptoByName = new Map(SHIPTOS.map((s) => [s.name, s.id]));
const customerByName = new Map(CUSTOMERS.map((c) => [c.name, c.id]));

/** AND IT BELONGS TO — customer, its ship-tos, the products and which of
 *  their configurations (the service order's line items), "All" to start.
 *  Several customers picked split into a row each. Products none of the
 *  row's ship-tos take are dimmed, with why. EXCEPT starts as the dashed Add
 *  row (UX-89); a row left at "All" leaves nothing out. */
function TargetSection({
  id,
  tag,
  rest,
  rows,
  onChange,
  configRows,
  def,
  ents,
  exclude,
}: {
  id: string;
  tag: string;
  rest: string;
  rows: TargetRow[];
  onChange: (r: TargetRow[]) => void;
  configRows: ConfigRow[];
  def: RuleDef;
  ents: EntityMap;
  exclude?: boolean;
}) {
  const [added, setAdded] = React.useState<number | null>(null);
  /* WHAT THE PICKERS OFFER — the prices the conditions above already reach:
     the record narrows the customers; Except offers only what the rule takes in. */
  const pool = React.useMemo(
    () => (exclude ? matchRows(def, configRows, ents) : configRows.filter((r) => whereMatches(def, r, ents))),
    [exclude, def, configRows, ents]
  );
  const customers = uniq(pool.map((r) => r.customerId)).map((c) => customerOf(c).name).sort();
  const add = () => {
    setAdded(rows.length);
    onChange([...rows, blankTarget()]);
  };
  const setRow = (i: number, patch: Partial<TargetRow>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const setCustomers = (i: number, names: string[]) => {
    const ids = names.includes(ALL_CUSTOMERS) ? [] : names.map((n) => customerByName.get(n) ?? "").filter(Boolean);
    const next =
      ids.length > 1
        ? ids.map((customerId) => ({ ...blankTarget(), customerId, productIds: rows[i].productIds, which: rows[i].which }))
        : [{ ...rows[i], customerId: ids[0] ?? "", shiptoIds: [] }];
    onChange([...rows.slice(0, i), ...next, ...rows.slice(i + 1)]);
  };

  if (!rows.length)
    return (
      <RecipeSection id={id} tag={tag} rest={rest} boxed={false} last={exclude}>
        <div className="flex items-center justify-between gap-4 rounded-md border border-dashed border-fp-outline-1 px-4 py-3">
          <span className="text-sm text-foreground">Add exclusion</span>
          <Button variant="outline" size="sm" onClick={add}>
            <Plus /> Add
          </Button>
        </div>
      </RecipeSection>
    );

  return (
    <RecipeSection id={id} tag={tag} rest={rest} last={exclude} hanging={exclude || rows.some((t) => !!t.customerId) ? <HangingAdd label={exclude ? "Add exclusion" : "Add customer"} onClick={add} /> : undefined}>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className={exclude ? "w-[26%]" : "w-[28%]"} />
          <col />
          <col />
          {/* EXCEPT TAKES FOUR — customer, ship-to, product, asset (Yash, 2026-11-19). */}
          {exclude ? <col /> : <col className="w-[18%]" />}
          <col className="w-[52px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <th className={TH}>Customer</th>
            <th className={TH}>Ship-tos</th>
            {/* EXCLUDE READS CUSTOMER, SHIP-TO, ASSET, PRODUCT (Yash, 2026-11-19). */}
            {exclude ? (
              <>
                <th className={TH}>Assets</th>
                <th className={TH}>Products</th>
              </>
            ) : (
              <>
                <th className={TH}>Products</th>
                <th className={TH}>Configurations</th>
              </>
            )}
            <th aria-hidden className={BIN_TH} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const mine = r.customerId ? pool.filter((x) => x.customerId === r.customerId) : pool;
            const shiptos = r.customerId ? uniq(mine.map((x) => x.shiptoId)).map((s) => shiptoOf(s).name) : [];
            const atShiptos = r.shiptoIds.length ? mine.filter((x) => r.shiptoIds.includes(x.shiptoId)) : mine;
            const taken = new Set(atShiptos.map((x) => x.productId));
            const unavailable = Object.fromEntries(PRODUCTS.filter((p) => !taken.has(p.id)).map((p) => [p.name, "Not priced at these ship-tos"]));
            const others = rows.filter((_, k) => k !== i).map((x) => x.customerId).filter(Boolean);
            const productCell = (
                <td className="relative p-0">
                <TableCellMultiSelect
                  values={r.productIds.length ? r.productIds.map((p) => productOf(p).name) : exclude ? [] : [ALL_PRODUCTS]}
                  options={PRODUCTS.map((p) => p.name)}
                  allOption={exclude ? undefined : ALL_PRODUCTS}
                  placeholder="Select products"
                  unavailable={unavailable}
                  unitLabel="product"
                  aria-label={`Products, row ${i + 1}`}
                  onChange={(v) => setRow(i, { productIds: v.includes(ALL_PRODUCTS) ? [] : v.map((n) => productByName.get(n)!).filter(Boolean) })}
                />
              </td>
            );
            return (
              <tr key={i} className={TR}>
                <td className="relative p-0">
                  {/* EXCEPT NAMES WHAT IT LEAVES OUT — its cells start empty,
                      asking, not "All" (Yash, 2026-11-18). */}
                  <TableCellMultiSelect
                    values={r.customerId ? [customerOf(r.customerId).name] : exclude || rows.length > 1 ? [] : [ALL_CUSTOMERS]}
                    options={customers.filter((c) => !others.includes(customerByName.get(c) ?? ""))}
                    /* SEVERAL LINES, EACH NAMES ITS CUSTOMER (Yash, 2026-11-18). */
                    allOption={exclude || rows.length > 1 ? undefined : ALL_CUSTOMERS}
                    placeholder="Select customer"
                    unitLabel="customer"
                    autoFocus={added === i}
                    aria-label={`Customer, row ${i + 1}`}
                    onChange={(v) => setCustomers(i, v)}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellMultiSelect
                    values={r.shiptoIds.length ? r.shiptoIds.map((s) => shiptoOf(s).name) : exclude ? [] : [ALL_SHIPTOS]}
                    options={shiptos}
                    allOption={exclude ? undefined : ALL_SHIPTOS}
                    placeholder="Select ship-tos"
                    unitLabel="ship-to"
                    disabled={!r.customerId}
                    aria-label={`Ship-tos, row ${i + 1}`}
                    onChange={(v) => {
                      const ids = v.includes(ALL_SHIPTOS) ? [] : v.map((n) => shiptoByName.get(n)!).filter(Boolean);
                      const at = ids.length ? mine.filter((x) => ids.includes(x.shiptoId)) : mine;
                      const ok = new Set(at.map((x) => x.productId));
                      setRow(i, { shiptoIds: ids, productIds: r.productIds.filter((p) => ok.has(p)) });
                    }}
                  />
                </td>
                {!exclude && productCell}
                {exclude && (
                  <td className="relative p-0">
                    {/* THE TANKS OF WHAT THIS ROW NAMES — its customer, ship-tos, products. */}
                    {(() => {
                      const at = r.productIds.length ? atShiptos.filter((x) => r.productIds.includes(x.productId)) : atShiptos;
                      const ids = uniq(at.map(assetOf));
                      const byName = new Map(ids.map((id) => [assetName(id), id]));
                      return (
                        <TableCellMultiSelect
                          values={(r.assetIds ?? []).map(assetName)}
                          options={[...byName.keys()]}
                          placeholder="Select assets"
                          unitLabel="asset"
                          disabled={!r.customerId}
                          aria-label={`Assets, row ${i + 1}`}
                          onChange={(v) => setRow(i, { assetIds: v.map((n) => byName.get(n)!).filter(Boolean) })}
                        />
                      );
                    })()}
                  </td>
                )}
                {exclude && productCell}
                {!exclude && (
                  <td className="relative p-0">
                    {/* ONE VALUE — a line changes its set-up prices, its missing ones, or both. */}
                    <TableCellSelect
                      value={whichLabel(r.which)}
                      options={WHICH.map((w) => w.label)}
                      aria-label={`Configurations, row ${i + 1}`}
                      onChange={(l) => setRow(i, { which: WHICH.find((w) => w.label === l)!.key as Which })}
                    />
                  </td>
                )}
                <td className={BIN_TD}>
                  {(exclude || rows.length > 1) && (
                    <TableRowRemove
                      aria-label={`Remove ${r.customerId ? customerOf(r.customerId).name : `row ${i + 1}`}`}
                      onRemove={() => onChange(rows.filter((_, k) => k !== i))}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </RecipeSection>
  );
}

/* --------------------------------------------------------------- change -- */

type EntityLite = { id: string; setting: string; name: string; value?: number; desc?: string };
const ENTITY_SETTING: Record<Exclude<ChangeSetting, "base">, string> = { rateType: "rateType", margin: "margin", fee: "fee", tax: "tax", adder: "adder" };

/** THEN CHANGE — one row per change: the setting, what to do to it, the
 *  value; all land together, in one update per price. A list setting takes
 *  Add and Remove side by side — one row each — and an item cannot be both;
 *  Set or Replace says it all and stands alone (Yash, 2026-11-18). Each fee,
 *  tax, margin or adder is picked with its rate and description. */
function ChangeSection({ changes, onChange, entities }: { changes: ChangeRow[]; onChange: (c: ChangeRow[]) => void; entities: EntityLite[] }) {
  const [added, setAdded] = React.useState<number | null>(null);
  const setRow = (i: number, patch: Partial<ChangeRow>) => onChange(changes.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const byLabel = (l: string) => SETTINGS.find((x) => x.label === l)!.key;
  const free = (s: ChangeSetting, others: ChangeRow[]) => actionsFor(s, others.filter((o) => o.setting));
  /* THE ADD SHOWS while some setting can still take a row. */
  const canAdd = changes.some((c) => c.setting) && changes.every((c) => c.setting) && SETTINGS.some((s) => free(s.key, changes).length > 0);

  return (
    <RecipeSection
      id={stepId("change")}
      tag="Then"
      rest="change"
      tone="then"
      hanging={
        canAdd ? (
          <HangingAdd
            label="Add change"
            onClick={() => {
              setAdded(changes.length);
              onChange([...changes, blankChange()]);
            }}
          />
        ) : undefined
      }
    >
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[24%]" />
          <col className="w-[24%]" />
          <col />
          <col className="w-[52px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <th className={TH}>Setting</th>
            <th className={TH}>Action</th>
            <th className={TH}>Value</th>
            <th aria-hidden className={BIN_TH} />
          </tr>
        </thead>
        <tbody>
          {changes.map((c, i) => {
            const others = changes.filter((_, k) => k !== i);
            const kind = valueKind(c.setting, c.action);
            const choices = c.setting && c.setting !== "base" ? entities.filter((e) => e.setting === ENTITY_SETTING[c.setting as Exclude<ChangeSetting, "base">]) : [];
            /* AN ITEM IS ADDED OR REMOVED, NOT BOTH. */
            const elsewhere = new Set(others.filter((o) => o.setting === c.setting).flatMap((o) => o.entityIds));
            const offered = choices.filter((e) => !elsewhere.has(e.id));
            const nameOf = (id: string) => choices.find((e) => e.id === id)?.name ?? "";
            const idOf = (name: string) => choices.find((e) => e.name === name)?.id ?? "";
            const noteOf = (name: string) => {
              const e = choices.find((x) => x.name === name);
              if (!e) return "";
              return [e.value !== undefined ? `${money(e.value)}/gal` : "", e.desc ?? ""].filter(Boolean).join(" · ");
            };
            const actions = c.setting ? free(c.setting, others) : [];
            return (
              <tr key={i} className={TR}>
                <td className="relative p-0">
                  {/* THE CHECKBOX LIST — picking several settings makes a row
                      each (§10f); a setting with no action left is out. */}
                  <TableCellMultiSelect
                    values={c.setting ? [settingLabel(c.setting)] : []}
                    options={SETTINGS.filter((s) => s.key === c.setting || free(s.key, others).length > 0).map((s) => s.label)}
                    placeholder="Select setting"
                    unitLabel="setting"
                    autoFocus={added === i}
                    aria-label={`Setting, change ${i + 1}`}
                    onChange={(labels) => {
                      const keys = labels.map(byLabel);
                      if (!keys.length) return setRow(i, blankChange());
                      const rest = [...others];
                      const made: ChangeRow[] = keys.map((k) => {
                        const keep = k === c.setting ? c : { ...blankChange(), setting: k, action: free(k, rest)[0] ?? "add" };
                        rest.push(keep);
                        return keep;
                      });
                      onChange([...changes.slice(0, i), ...made, ...changes.slice(i + 1)]);
                    }}
                  />
                </td>
                <td className="relative p-0">
                  {/* ONE VALUE — a change does one thing to its setting. */}
                  <TableCellSelect
                    value={c.setting ? actionLabel(c.setting, c.action) : ""}
                    options={c.setting ? actions.map((a) => actionLabel(c.setting as ChangeSetting, a)) : []}
                    placeholder="Select action"
                    disabled={!c.setting}
                    aria-label={`Action, change ${i + 1}`}
                    onChange={(l) => {
                      const a = actions.find((x) => actionLabel(c.setting as ChangeSetting, x) === l)!;
                      setRow(i, { action: a, entityIds: [], amount: "" });
                    }}
                  />
                </td>
                <td className="relative p-0">
                  {kind === "rateType" ? (
                    /* ONE VALUE — a price has one rate type. */
                    <TableCellSelect
                      value={nameOf(c.entityIds[0] ?? "")}
                      options={choices.map((e) => e.name)}
                      placeholder="Select rate type"
                      aria-label={`Value, change ${i + 1}`}
                      onChange={(name) => setRow(i, { entityIds: [idOf(name)] })}
                    />
                  ) : kind === "entities" ? (
                    <TableCellMultiSelect
                      values={c.entityIds.map(nameOf)}
                      options={offered.map((e) => e.name)}
                      optionNote={noteOf}
                      placeholder={`Select ${settingLabel(c.setting as ChangeSetting).toLowerCase()}`}
                      unitLabel={settingLabel(c.setting as ChangeSetting).toLowerCase().replace(/s$/, "")}
                      aria-label={`Value, change ${i + 1}`}
                      onChange={(v) => setRow(i, { entityIds: v.map(idOf).filter(Boolean) })}
                    />
                  ) : (
                    <TableCellInput
                      numeric
                      value={c.amount}
                      disabled={kind === "none"}
                      placeholder={kind === "none" ? "" : c.action === "adjustPercent" ? "0.0" : "0.0000"}
                      aria-label={`Value, change ${i + 1}`}
                      onChange={(v) => setRow(i, { amount: v })}
                    />
                  )}
                </td>
                <td className={BIN_TD}>
                  {changes.length > 1 && (
                    <TableRowRemove
                      aria-label={`Remove ${c.setting ? settingLabel(c.setting) : `change ${i + 1}`}`}
                      onRemove={() => onChange(changes.filter((_, k) => k !== i))}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </RecipeSection>
  );
}

/* ------------------------------------------------------- impact (right) -- */

/** A count that opens what it counts. */
function Count({ children, onOpen }: { children: React.ReactNode; onOpen?: () => void }) {
  if (!onOpen) return <span className="tabular-nums">{children}</span>;
  return (
    <button type="button" onClick={onOpen} className="tabular-nums underline decoration-current/50 decoration-dotted underline-offset-4 hover:text-foreground">
      {children}
    </button>
  );
}

const VERB: Record<ChangeRow["action"], string> = {
  set: "Set to",
  adjustAmount: "Adjust by",
  adjustPercent: "Adjust by",
  add: "Add",
  remove: "Remove",
  replace: "Replace all with",
};

/** WHAT CHANGES — each setting a heading of its own (Yash, 2026-11-18), then
 *  what is done to it: the action, and the items under it with their rates
 *  on the right. */
function Settings({ changes, ents }: { changes: ChangeRow[]; ents: EntityMap }) {
  const ready = changes.filter(changeReady);
  if (!ready.length) return <p className="px-4 py-3 text-base text-muted-foreground">No change yet</p>;
  const settings = uniq(ready.map((c) => c.setting as ChangeSetting));
  const signed = (v: number) => `${v >= 0 ? "+" : "−"}${money(Math.abs(v))}`;
  return (
    <div className="flex flex-col divide-y divide-border">
      {settings.map((s) => {
        const label = settingLabel(s);
        const rows = ready.filter((c) => c.setting === s);
        const isList = (c: ChangeRow) => c.action === "add" || c.action === "remove" || c.action === "replace";
        return (
          <div key={s} className="flex flex-col gap-2 px-4 py-3">
            <span className="text-base font-semibold text-foreground">{label}</span>
            {rows.map((c) => (
              <div key={c.action} className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">{VERB[c.action]}</span>
                {isList(c) ? (
                  c.entityIds.map((id) => {
                    const e = ents.get(id);
                    return (
                      <div key={id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-foreground">{e?.name ?? id}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {e?.value === undefined ? "" : c.action === "replace" ? money(e.value) : signed(c.action === "remove" ? -e.value : e.value)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-foreground">
                      {c.setting === "rateType"
                        ? ents.get(c.entityIds[0])?.name ?? "—"
                        : c.action === "adjustPercent"
                          ? `${Number(c.amount) >= 0 ? "+" : ""}${Number(c.amount)}%`
                          : c.action === "adjustAmount"
                            ? signed(Number(c.amount))
                            : `${money(Number(c.amount))}/gal`}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** WHAT A RECORD IS, BEHIND AN ⓘ (UX-96; Yash, 2026-11-19). */
function RecordsInfo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="What a record is" className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm text-muted-foreground">
        <p>A record represents one ship-to and product combination, where the change will be applied.</p>
        <p className="mt-2">For example, Diesel at Creole Batch Plant ship-to is one record.</p>
      </PopoverContent>
    </Popover>
  );
}

const ROW = "flex items-baseline justify-between gap-3 px-4 py-1.5";

/** WHO — the customers, then each one with its ship-tos (and, with several
 *  groups, the groups that reach it); three at a time (Yash, 2026-11-19). */
function Who({ preview, cs }: { preview: ReturnType<typeof previewRule>; cs?: CustRow[] }) {
  /* A CUSTOMER-LEVEL RULE says "28 of 48 ship-tos" — the ship-tos that inherit it. */
  const inhOf = new Map((cs ?? []).map((c) => [c.customerId, c]));
  const custs = preview.byCustomer.map((c) => {
    const x = inhOf.get(c.customerId);
    return x ? { ...c, shiptos: x.inheriting.length + x.own.length, note: `${x.inheriting.length} of ${plural(x.inheriting.length + x.own.length, "ship-to")}` } : { ...c, note: plural(c.shiptos, "ship-to") };
  });
  const shiptos = custs.reduce((n, c) => n + c.shiptos, 0);
  const [all, setAll] = React.useState(false);
  const shown = all ? custs : custs.slice(0, 3);
  return (
    <div className="flex flex-col gap-1 border-b border-border py-2">
      <div className={ROW}>
        <span className="text-base font-medium text-foreground">{plural(custs.length, "customer")}</span>
        <span className="text-sm text-muted-foreground">{plural(shiptos, "ship-to")}</span>
      </div>
      {shown.map((c) => (
        <div key={c.customerId} className={cn(ROW, "py-0.5")}>
          <span className="min-w-0 truncate text-sm text-foreground">{customerOf(c.customerId).name}</span>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {c.note}
          </span>
        </div>
      ))}
      {custs.length > 3 && (
        <button type="button" onClick={() => setAll((x) => !x)} className="px-4 text-left text-sm text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground">
          {all ? "Show fewer" : `+${plural(custs.length - 3, "customer")}`}
        </button>
      )}
    </div>
  );
}

/** WHY A SHIP-TO IS FLAGGED — behind an ⓘ (UX-96). */
function OverrideInfo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="What pricing overridden means" className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm text-muted-foreground">
        <p>These ship-tos will have their own pricing and no longer inherit future changes from the customer or hub.</p>
      </PopoverContent>
    </Popover>
  );
}

/** OVERRIDES, BEFORE THE RUN, IN ONE LINE (Yash · PM, 2026-11-20) —
 *  inherited and hub ship-tos together; the count opens their records. */
function Overrides({ preview, onFilter }: { preview: ReturnType<typeof previewRule>; onFilter?: (picked: string[]) => void }) {
  const n = preview.overrides.customer + preview.overrides.hub;
  if (!n) return null;
  return (
    <dl className="flex flex-col border-b border-border py-2">
      <div className={ROW}>
        <dt className="flex items-center gap-1 text-sm text-muted-foreground">
          Pricing overridden <OverrideInfo />
        </dt>
        <dd className="text-base font-medium tabular-nums text-fp-banner-accent-caution">
          <Count onOpen={onFilter && (() => onFilter([`applied:${OVERRIDE.customer}`, `applied:${OVERRIDE.hub}`]))}>{n.toLocaleString()}</Count>
          <span className="text-sm font-normal text-muted-foreground"> of {plural(preview.shiptos.length, "ship-to")}</span>
        </dd>
      </div>
    </dl>
  );
}

/** RECORDS MATCHED — the label with its ⓘ, the count on the right. */
function Matched({ n }: { n: number }) {
  return (
    <div className={ROW}>
      <dt className="flex items-center gap-1 text-sm text-muted-foreground">
        Records matched <RecordsInfo />
      </dt>
      <dd className="text-base font-medium tabular-nums text-foreground">{n.toLocaleString()}</dd>
    </div>
  );
}

/** A COUNT OUT OF THE MATCHED — "Will update · 102 of 202". */
function OutOf({
  label,
  n,
  of,
  onOpen,
  tone,
  hideZero,
  split,
}: {
  label: string;
  n: number;
  of: number;
  onOpen?: () => void;
  tone?: "caution";
  hideZero?: boolean;
  /** THE BREAK-UP BY COMBINATION, behind a chevron (Yash, 2026-11-19). */
  split?: { label: string; n: number }[];
}) {
  const [open, setOpen] = React.useState(false);
  if (hideZero && n === 0) return null;
  const canOpen = !!split && split.length > 1 && n > 0;
  return (
    <>
      <div className={ROW}>
        <dt className="text-sm text-muted-foreground">
          {canOpen ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((x) => !x)}
              className="-ml-1 inline-flex items-center gap-1 rounded-sm pl-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {label}
              {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          ) : (
            label
          )}
        </dt>
        <dd className={cn("text-base font-medium tabular-nums text-foreground", tone === "caution" && n > 0 && "text-fp-banner-accent-caution")}>
          <Count onOpen={n ? onOpen : undefined}>{n.toLocaleString()}</Count>
          <span className="text-sm font-normal text-muted-foreground"> of {of.toLocaleString()}</span>
        </dd>
      </div>
      {canOpen &&
        open &&
        split!.map((x) => (
          <div key={x.label} className={cn(ROW, "py-0.5")}>
            <span className="text-sm text-muted-foreground">{x.label}</span>
            <span className="text-sm tabular-nums text-muted-foreground">{x.n.toLocaleString()}</span>
          </div>
        ))}
    </>
  );
}

/** IMPACT (Yash, 2026-11-19) — who (customers, their ship-tos, the groups
 *  that reach them), records matched, how many will update and skip out of
 *  them and why, then what changes. */
function PreviewImpactCard({
  d,
  preview,
  ready,
  ents,
  onFilter,
  onNames,
}: {
  d: RuleDef;
  preview: ReturnType<typeof previewRule>;
  ready: boolean;
  ents: EntityMap;
  /** Opens the records list below — none on a template. */
  onFilter?: (picked: string[]) => void;
  onNames?: (l: PriceList) => void;
}) {
  const Z = preview.matched;
  const cs = ready && preview.customerMode ? customersOf(allOfPreview(preview)) : null;
  /* NOTHING ASKED YET — an empty set, not every record (Yash, 2026-11-19). */
  const asked = preview.groups.some((g) => g.asked);
  return (
    <RailCard title="Impact" icon={<Gauge />} className={asked ? undefined : "flex min-h-0 flex-1 flex-col"}>
      {!asked ? (
        /* THE EMPTY STATE, ONE LINE — the card runs the column, its empty
           stretch the one QuietPattern (UX-93; Yash, 2026-11-19). */
        <>
          <p className="px-4 py-3 text-base text-muted-foreground">Set your conditions and change to see what will be affected.</p>
          <QuietPattern className="min-h-24 flex-1" />
        </>
      ) : (
        <>
          <Who preview={preview} cs={cs ?? undefined} />
          {cs ? (
            <CustomerCounts cs={cs} done={WILL} onFilter={onFilter} onNames={onNames} />
          ) : (
          <dl className="flex flex-col border-b border-border py-2">
            <Matched n={Z} />
            {ready && (
              <>
                <OutOf label="Will update" n={preview.updated.length} of={Z} onOpen={onFilter && (() => onFilter([`status:${WILL}`]))} />
                <OutOf label="Skipped" n={preview.skipped.length} of={Z} onOpen={onFilter && (() => onFilter([`status:${NOT}`]))} />
              </>
            )}
          </dl>
          )}
          {ready && !cs && <Overrides preview={preview} onFilter={onFilter} />}
        </>
      )}
      {asked && <Settings changes={d.changes} ents={ents} />}
    </RailCard>
  );
}

/** A RAN RULE'S IMPACT — the same card for the run shown (Yash, 2026-11-19):
 *  who it reached as the records stood before it ran, the records it took
 *  in, and what happened to them, out of those. */
function RunImpactCard({
  rule,
  run,
  before,
  ents,
  onFilter,
  cs,
  onNames,
}: {
  rule: Rule;
  run: Run;
  before: ReturnType<typeof previewRule>;
  ents: EntityMap;
  onFilter: (picked: string[]) => void;
  /** A customer-level rule's customers, as the run left them. */
  cs?: CustRow[] | null;
  onNames?: (l: PriceList) => void;
}) {
  const running = run.status === "running";
  const through = run.results.slice(0, run.progress);
  const of = (o: RunResult["outcome"]) => through.filter((x) => x.outcome === o);
  const go = (o: RunResult["outcome"]) => (running ? undefined : () => onFilter([`status:${OUTCOME[o]}`]));
  return (
    <RailCard title={`Impact · run ${run.n}`} icon={<Gauge />}>
      {/* WHILE IT APPLIES, SAY SO — at the top of the card (Yash, 2026-11-18). */}
      {running && (
        <div className="flex flex-col gap-2 border-b border-border bg-accent-violet-soft px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-base font-medium text-foreground">In progress</span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {run.progress.toLocaleString()} of {plural(run.total, "record")}
            </span>
          </div>
          <Progress value={run.total ? (run.progress / run.total) * 100 : 0} aria-label="In progress" />
        </div>
      )}
      <Who preview={before} cs={cs && !running ? cs : undefined} />
      {cs && !running ? (
        <CustomerCounts cs={cs} done="Updated" onFilter={onFilter} onNames={onNames} />
      ) : (
        <dl className="flex flex-col border-b border-border py-2">
          <Matched n={run.total} />
          <OutOf label="Updated" n={of("updated").length} of={run.total} onOpen={go("updated")} />
          <OutOf label="Skipped" n={of("unchanged").length + of("skipped").length} of={run.total} onOpen={go("skipped")} hideZero />
          <OutOf label="Failed" n={of("failed").length} of={run.total} onOpen={go("failed")} tone="caution" hideZero />
        </dl>
      )}
      <Settings changes={rule.changes} ents={ents} />
    </RailCard>
  );
}

/* ------------------------------------------------------------------ run -- */

/** A RUN'S PRICES — while it runs, its progress; once done, every price it
 *  changed, before → after. With more than one run, a switch between them
 *  (Yash, 2026-11-18), and the Impact card follows it. */
function RunSection({
  run,
  runs,
  onPick,
  rows,
  ents,
  apply,
  onOpenPrice,
  customerMode,
  onNames,
}: {
  run: Run;
  runs: Run[];
  onPick: (id: string) => void;
  rows: ConfigRow[];
  ents: EntityMap;
  apply: { tab: string; picked: string[]; n: number } | null;
  onOpenPrice: (p: PriceRow) => void;
  /** A customer-level rule reads customers; a row opens its ship-tos. */
  customerMode?: boolean;
  onNames?: (l: PriceList) => void;
}) {
  if (run.status === "scheduled")
    return (
      <SheetSection title={`Run ${run.n}`} variant="plain">
        <p className="text-sm text-foreground">Scheduled · {fmtWhen(run.at)}</p>
      </SheetSection>
    );
  const running = run.status === "running";
  /* A PRICE THE RUN DID NOT CHANGE reads at what it is. */
  const all = runRowsOf(run, rows, ents);
  const picker =
    runs.length > 1 ? (
      <Select value={run.id} onValueChange={onPick}>
        <SelectTrigger className="w-64" aria-label="Run shown">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[...runs].reverse().map((x) => (
            <SelectItem key={x.id} value={x.id}>
              {`Run ${x.n} · ${fmtWhen(x.at)}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : undefined;
  if (customerMode && !running)
    return (
      <SheetSection title="Customers updated" id={stepId("prices")} variant="plain">
        <CustomersView resetKey={run.id} rows={customersOf(all)} apply={apply} beforeSearch={picker} onOpen={(c) => onNames?.(custNames(c))} />
      </SheetSection>
    );
  return (
    <SheetSection title="Records updated" id={stepId("prices")} variant="plain">
      {running ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-foreground">{`${run.progress.toLocaleString()} of ${plural(run.total, "record")} done`}</span>
          <Progress value={run.total ? (run.progress / run.total) * 100 : 100} aria-label="Run progress" />
        </div>
      ) : (
        <PricesView
          resetKey={run.id}
          rows={all}
          ents={ents}
          apply={apply}
          onOpen={onOpenPrice}
          /* THE RUN PICKER FIRST, THEN SEARCH, THEN FILTERS (Yash, 2026-11-18)
             — which run is the set being searched. */
          beforeSearch={picker}
        />
      )}
    </SheetSection>
  );
}

/* -------------------------------------------------------- price list -- */

/* THE IMPACT CARD'S WORDS, IN THE FILTER TOO (Yash, 2026-11-19). A record
   already holding the change and one that cannot take it are both Skipped. */
const WILL = "Will update";
const NOT = "Skipped";
/** An inherited or hub ship-to the rule gives its own pricing, as the list reads it. */
const OVERRIDE = { customer: "Customer → Ship-to", hub: "Hub → Ship-to" } as const;
const appliedOf = (p: PriceRow) => {
  const l = (p.lines ?? []).find((x) => x.label === "Applied pricing");
  return l && l.before !== l.after ? `${l.before} → ${l.after}` : APPLIED[p.row.applied];
};
const OUTCOME: Record<RunResult["outcome"], string> = { updated: "Updated", unchanged: "Skipped", skipped: "Skipped", failed: "Failed" };

/** Every price a new rule reaches: the ones that change, then the rest with why. */
const allOfPreview = (preview: ReturnType<typeof previewRule>): PriceRow[] =>
  preview.list.map((p) => ({
    row: p.row,
    outcome: p.outcome === "updated" ? WILL : NOT,
    reason: p.reason,
    lines: p.lines,
    priceBefore: p.priceBefore,
    priceAfter: p.outcome === "updated" ? p.priceAfter : null,
    combos: preview.combos[p.row.id],
  }));

/** A CUSTOMER-LEVEL RULE, BY CUSTOMER (Yash, 2026-11-20) — the change is
 *  written to the customer's configuration, so it reads one row per
 *  customer: the change, the ship-tos that inherit it, the ship-tos with
 *  their own pricing it does not reach. No ship-to × product breakdown. */
type CustRow = { customerId: string; inheriting: string[]; own: string[]; outcome: string; lines: { label: string; before: string; after: string }[] };
function customersOf(prs: PriceRow[]): CustRow[] {
  const by = new Map<string, PriceRow[]>();
  prs.forEach((p) => by.set(p.row.customerId, [...(by.get(p.row.customerId) ?? []), p]));
  return [...by].map(([customerId, ps]) => {
    /* OUT OF EVERY SHIP-TO MATCHED (Yash, 2026-11-20) — inheriting plus
       skipped is the whole: own or hub pricing, or not set up. */
    const inheriting = uniq(ps.filter((p) => p.row.configured && p.row.applied === "customer").map((p) => p.row.shiptoId));
    const own = uniq(ps.map((p) => p.row.shiptoId)).filter((id) => !inheriting.includes(id));
    const outcome = [WILL, "Updated", "Failed"].find((o) => ps.some((p) => p.outcome === o)) ?? ps[0].outcome ?? NOT;
    const lead = ps.find((p) => p.outcome === outcome && (p.lines ?? []).length) ?? ps.find((p) => (p.lines ?? []).length);
    return { customerId, inheriting, own, outcome, lines: (lead?.lines ?? []).filter((l) => l.label !== "Applied pricing") };
  });
}
const SHIPTO_PRICING_INFO = "These ship-tos have their own pricing and won’t inherit changes from the customer or hub.";
const OVERRIDDEN_INFO = "These ship-tos will have their own pricing and no longer inherit future changes from the customer or hub.";
/** Ship-tos a list of records gives their own pricing. */
const overriddenIn = (rs: PriceRow[]) =>
  uniq(rs.filter((p) => (p.lines ?? []).some((l) => l.label === "Applied pricing" && l.before !== l.after)).map((p) => p.row.shiptoId));
/** Ship-tos by name, for a count that opens them. */
const shiptoNames = (title: string, ids: string[], note: string): PriceList => ({
  title,
  kind: "names",
  head: ["Ship-to", "Customer"],
  names: ids.map((id) => ({ name: shiptoOf(id).name, note: customerOf(shiptoOf(id).customerId).name || note })),
});
/** A ran rule's records, as they stood. */
function runRowsOf(run: Run, rows: ConfigRow[], ents: EntityMap): PriceRow[] {
  const rowOf = new Map(rows.map((r) => [r.id, r]));
  return run.results
    .map((x) => {
      const row = x.before ?? rowOf.get(x.rowId)!;
      const now = row && row.configured ? priceOf(row, ents) : null;
      return { row, outcome: OUTCOME[x.outcome], reason: x.reason, lines: x.lines, priceBefore: x.priceBefore ?? now, priceAfter: x.priceAfter ?? null };
    })
    .filter((x) => x.row);
}

/** THE CUSTOMERS, AS A LIST — a customer-level rule's records. A row opens
 *  its ship-tos by name. */
function CustomersView({
  resetKey,
  rows,
  apply,
  beforeSearch,
  onOpen,
}: {
  resetKey: string;
  rows: CustRow[];
  apply: { tab: string; picked: string[]; n: number } | null;
  beforeSearch?: React.ReactNode;
  onOpen: (c: CustRow) => void;
}) {
  const tabs = React.useMemo<ViewTab[]>(
    () => [
      {
        key: "prices",
        label: "Customers",
        noun: "customers",
        one: "customer",
        columns: [
          { key: "customer", label: "Customer", width: 240, sortable: true },
          { key: "change", label: "Change", width: 280, sortable: true },
          { key: "inheriting", label: "Ship-tos inheriting", width: 170, sortable: true },
          { key: "own", label: "Ship-tos skipped", width: 150, sortable: true },
        ],
        rows: rows.map(
          (c, i): ViewRow => ({
            id: String(i),
            text: {
              customer: customerOf(c.customerId).name,
              change: c.lines.map((l) => `${l.label} ${l.before} → ${l.after}`).join(" · ") || "—",
              inheriting: `${c.inheriting.length} of ${c.inheriting.length + c.own.length}`,
              own: String(c.own.length),
            },
            sort: { inheriting: c.inheriting.length, own: c.own.length },
            status: c.outcome,
            values: { customer: customerOf(c.customerId).name },
          })
        ),
        facets: [
          { key: "status", label: "Outcome", order: uniq([WILL, NOT, ...Object.values(OUTCOME)]) },
          { key: "customer", label: "Customer", searchable: true },
        ],
        nameOf: (r) => r.text.customer,
        onOpen: (r) => onOpen(rows[Number(r.id)]),
        renderCell: (r, key) => {
          const c = rows[Number(r.id)];
          if (key === "customer")
            return (
              <span className="block truncate" title={r.text.customer}>
                {r.text.customer}
              </span>
            );
          if (key === "change")
            return c.lines.length ? (
              <span className="flex min-w-0 flex-col">
                {c.lines.map((l) => (
                  <span key={l.label} className="truncate tabular-nums">
                    <span className="text-muted-foreground">
                      {l.label} {l.before} →
                    </span>{" "}
                    <span className="font-medium text-foreground">{l.after}</span>
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            );
          return undefined;
        },
      },
    ],
    [rows, onOpen]
  );
  return (
    <div className="grid h-[560px] min-h-0 grid-rows-1">
      <RecordViews resetKey={resetKey} tabs={tabs} hideSingleTab searchPlaceholder="Search customers" historyKey="pricing-bulk-customers" apply={apply} quickFilters={beforeSearch} />
    </div>
  );
}

/** A customer's ship-tos by name — what a customer row opens. */
const custNames = (c: CustRow): PriceList => ({
  title: customerOf(c.customerId).name,
  kind: "names",
  head: ["Ship-to", "Pricing"],
  names: [
    ...c.inheriting.map((id) => ({ name: shiptoOf(id).name, note: "Inherits from the customer" })),
    ...c.own.map((id) => ({ name: shiptoOf(id).name, note: "Skipped" })),
  ],
});

/** THE CUSTOMER-LEVEL COUNTS — the Impact card's rows for a customer-level
 *  rule: customers, those to update, the ship-tos that inherit, and the
 *  ship-tos with their own pricing it does not reach. */
function CustomerCounts({
  cs,
  done,
  onFilter,
  onNames,
}: {
  cs: CustRow[];
  /** The outcome the card counts — Will update before a run, Updated after. */
  done: string;
  onFilter?: (picked: string[]) => void;
  onNames?: (l: PriceList) => void;
}) {
  const inh = cs.flatMap((c) => c.inheriting);
  const own = cs.flatMap((c) => c.own);
  const T = inh.length + own.length;
  const n = cs.filter((c) => c.outcome === done).length;
  return (
    <dl className="flex flex-col border-b border-border py-2">
      <div className={ROW}>
        <dt className="text-sm text-muted-foreground">Customers matched</dt>
        <dd className="text-base font-medium tabular-nums text-foreground">{cs.length.toLocaleString()}</dd>
      </div>
      <OutOf label={done} n={n} of={cs.length} onOpen={onFilter && (() => onFilter([`status:${done}`]))} />
      <OutOf label="Ship-tos inheriting" n={inh.length} of={T} onOpen={onNames && (() => onNames(shiptoNames("Ship-tos inheriting", inh, "")))} />
      {own.length > 0 && (
        <div className={ROW}>
          <dt className="flex items-center gap-1 text-sm text-muted-foreground">
            Ship-tos skipped <InfoPop label="Why ship-tos are skipped" text={SHIPTO_PRICING_INFO} />
          </dt>
          <dd className="text-base font-medium tabular-nums text-foreground">
            <Count onOpen={onNames && (() => onNames(shiptoNames("Ship-tos skipped", own, "")))}>{own.length.toLocaleString()}</Count>
            <span className="text-sm font-normal text-muted-foreground"> of {T.toLocaleString()}</span>
          </dd>
        </div>
      )}
    </dl>
  );
}

/** An ⓘ with one line behind it (UX-96). */
function InfoPop({ label, text }: { label: string; text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm text-muted-foreground">
        <p>{text}</p>
      </PopoverContent>
    </Popover>
  );
}

/** THE PRICES, AS A LIST (FPDS: a view people search or filter is a list —
 *  ListTable, even in a sheet). Search, Filters (outcome, product, ship-to,
 *  customer), pages; it opens on the prices that change, the chip clears it.
 *  A row opens the price's make-up (Yash, 2026-11-18). */
function PricesView({
  resetKey,
  rows,
  ents,
  initial,
  apply,
  onOpen,
  beforeSearch,
  empty,
}: {
  resetKey: string;
  rows: PriceRow[];
  ents: EntityMap;
  initial?: string[];
  /** Before search — the run picker. */
  beforeSearch?: React.ReactNode;
  apply: { tab: string; picked: string[]; n: number } | null;
  onOpen: (p: PriceRow) => void;
  /** Said in the table's body when it has no rows. */
  empty?: string;
}) {
  /* WHERE EACH RECORD CAME FROM (Yash, 2026-11-19) — a Combination column
     and filter once the rule has more than one combination. */
  const combined = new Set(rows.flatMap((p) => p.combos ?? [])).size > 1;
  /* WHY IT FAILED — its own column once a failed record also shows its change. */
  const failedWhy = rows.some((p) => p.outcome === "Failed" && p.reason && (p.lines ?? []).length);
  const tabs = React.useMemo<ViewTab[]>(
    () => [
      {
        key: "prices",
        label: "Prices",
        noun: "records",
        one: "record",
        columns: [
          /* WIDTHS THAT FIT THE SHEET — no sideways scroll at the sheet's
             width; the customer beside its ship-to (Yash, 2026-11-18). */
          { key: "shipto", label: "Ship-to", width: failedWhy ? 180 : 190, sortable: true },
          { key: "customer", label: "Customer", width: failedWhy ? 150 : 160, sortable: true },
          { key: "product", label: "Product", width: failedWhy ? 140 : 150, sortable: true },
          /* WHY IT FAILED, BEFORE ITS CHANGE (Yash, 2026-11-20). */
          ...(failedWhy ? [{ key: "why", label: "Why", width: 200, sortable: true }] : []),
          { key: "change", label: "Change", width: failedWhy ? 210 : 236, sortable: true },
          /* NO OUTCOME OR COMBINATION COLUMN (Yash, 2026-11-19) — both stay as
             filters; an unchanged record reads "OPIS Rack High → OPIS Rack High". */
          { key: "price", label: "Price ($/gal)", width: failedWhy ? 150 : 160, sortable: true },
        ],
        rows: rows.map(
          (p, i): ViewRow => ({
            id: String(i),
            text: {
              shipto: shiptoOf(p.row.shiptoId).name,
              address: shiptoOf(p.row.shiptoId).address,
              product: productOf(p.row.productId).name,
              customer: customerOf(p.row.customerId).name,
              combination: p.combos?.length ? comboLabel(p.combos) : "—",
              change: (p.lines ?? []).length
                ? (p.lines ?? [])
                    .filter((l) => p.priceAfter == null || l.before !== l.after)
                    .map((l) => `${l.label} ${l.before} → ${l.after}`)
                    .join(" · ")
                : p.reason ?? "—",
              why: p.outcome === "Failed" ? p.reason ?? "—" : "—",
              price:
                p.priceAfter != null ? `${p.priceBefore == null ? "—" : money(p.priceBefore)} → ${money(p.priceAfter)}` : p.priceBefore == null ? "—" : money(p.priceBefore),
            },
            sort: { price: p.priceAfter ?? p.priceBefore ?? 0 },
            status: p.outcome ?? WILL,
            values: {
              customer: customerOf(p.row.customerId).name,
              shipto: shiptoOf(p.row.shiptoId).name,
              product: productOf(p.row.productId).name,
              applied: appliedOf(p),
            },
            /* MATCHED BY — each single combination the record meets; one in two
               shows under both (Yash, 2026-11-19). ENTITY — the settings the
               rule touches on it. */
            multi: {
              combination: (p.combos ?? []).map((k) => `Combination ${k}`),
              setting: uniq((p.lines ?? []).map((l) => l.label)),
            },
          })
        ),
        facets: [
          { key: "status", label: "Outcome", order: uniq([WILL, NOT, ...Object.values(OUTCOME)]) },
          /* "MATCHED BY", not "Combination" — its chip with two values picked
             read "Combination 2", like the second combination. */
          ...(combined ? [{ key: "combination", label: "Matched by" }] : []),
          { key: "setting", label: "Entity" },
          { key: "applied", label: "Applied pricing", order: [OVERRIDE.customer, OVERRIDE.hub, ...Object.values(APPLIED)] },
          { key: "product", label: "Product", searchable: true },
          { key: "shipto", label: "Ship-to", searchable: true },
          { key: "customer", label: "Customer", searchable: true },
        ],
        nameOf: (r) => `${r.text.shipto} · ${r.text.product}`,
        onOpen: (r) => onOpen(rows[Number(r.id)]),
        renderCell: (r, key) => {
          const p = rows[Number(r.id)];
          if (key === "shipto")
            return (
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{r.text.shipto}</span>
                <span className="truncate text-xs text-muted-foreground">{r.text.address}</span>
              </span>
            );
          /* NAMES CUT TO THEIR COLUMN — a list cell does not truncate on its own. */
          if (key === "customer" || key === "product" || key === "why")
            return (
              <span className="block truncate" title={r.text[key]}>
                {r.text[key]}
              </span>
            );
          if (key === "change")
            return (p.lines ?? []).length ? (
              <span className="flex min-w-0 flex-col">
                {(p.lines ?? [])
                  .filter((l) => p.priceAfter == null || l.before !== l.after)
                  .map((l) => (
                    <span key={l.label} className="truncate tabular-nums">
                      <span className="text-muted-foreground">
                        {l.label} {l.before} →
                      </span>{" "}
                      <span className="font-medium text-foreground">{l.after}</span>
                    </span>
                  ))}
              </span>
            ) : (
              <span className="truncate text-muted-foreground">{p.reason ?? "—"}</span>
            );
          if (key === "price")
            return p.priceAfter != null ? (
              <span className="whitespace-nowrap tabular-nums">
                <span className="text-muted-foreground">{p.priceBefore == null ? "—" : money(p.priceBefore)} →</span>{" "}
                <span className="font-medium text-foreground">{money(p.priceAfter)}</span>
              </span>
            ) : (
              <span className="tabular-nums text-muted-foreground">{p.priceBefore == null ? "—" : money(p.priceBefore)}</span>
            );
          return undefined;
        },
      },
    ],
    [rows, onOpen, combined, failedWhy]
  );
  void ents;
  return (
    <div className="relative grid h-[560px] min-h-0 grid-rows-1">
      {rows.length === 0 && empty && (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-6 text-center text-sm text-muted-foreground">{empty}</p>
      )}
      <RecordViews
        resetKey={resetKey}
        tabs={tabs}
        hideSingleTab
        searchPlaceholder="Search records"
        historyKey="pricing-bulk-prices"
        initialPicked={initial}
        apply={apply}
        quickFilters={beforeSearch}
      />
    </div>
  );
}

/** A price's make-up, now and after — what a row of the list opens. */
function PriceSheet({ price, ents, onClose }: { price: PriceRow; ents: EntityMap; onClose: () => void }) {
  const title = `${shiptoOf(price.row.shiptoId).name} · ${productOf(price.row.productId).name}`;
  return (
    <RecordSheet
      level={2}
      open
      onOpenChange={(v) => !v && onClose()}
      mode="edit"
      size="form"
      editTitle={title}
      createTitle={title}
      createAction=""
      editAction=""
      showCancel={false}
      noFooter
      headerSubtitle={<span className="text-sm text-muted-foreground">{shiptoOf(price.row.shiptoId).address}</span>}
      onSubmit={() => undefined}
    >
      <SheetSection title={price.outcome ?? "Price"} variant="plain">
        {price.priceAfter == null && price.reason && <p className="text-sm text-muted-foreground">{price.reason}</p>}
        <Breakdown row={price.row} ents={ents} lines={price.priceAfter == null ? [] : price.lines ?? []} priceAfter={price.priceAfter ?? price.priceBefore ?? null} />
      </SheetSection>
    </RecordSheet>
  );
}

/* --------------------------------------------------------- price tables -- */

const PTH = "px-3 py-2.5 text-left text-sm font-medium";

/** Each price, what changes on it, and the price before → after; a row
 *  opens what makes the price up. */
function PriceTable({ rows, ents, open, setOpen }: { rows: PriceRow[]; ents: EntityMap; open: string | null; setOpen: (id: string | null) => void }) {
  return (
    /* T2 — the table is its own unit in a plain section, not a box in a card. */
    <div data-table-variant="T2" className="shrink-0 overflow-hidden rounded-md border border-border">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[44px]" />
          <col className="w-[26%]" />
          <col className="w-[18%]" />
          <col />
          <col className="w-[176px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <th aria-hidden />
            <th className={PTH}>Ship-to</th>
            <th className={PTH}>Product</th>
            <th className={PTH}>Change</th>
            <th className={PTH}>Price ($/gal)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const isOpen = open === p.row.id;
            return (
              <React.Fragment key={p.row.id}>
                <tr className="cursor-pointer border-b border-border last:border-b-0 hover:bg-accent/50" onClick={() => setOpen(isOpen ? null : p.row.id)} aria-expanded={isOpen}>
                  <td className="px-3 py-2 text-muted-foreground">{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</td>
                  <td className="px-3 py-2">
                    <ShiptoCell row={p.row} />
                  </td>
                  <td className="truncate px-3 py-2 text-sm">{productOf(p.row.productId).name}</td>
                  <td className="px-3 py-2 text-sm">
                    <div className="flex flex-col gap-0.5">
                      {(p.lines ?? [])
                        .filter((l) => l.before !== l.after)
                        .map((l) => (
                          <span key={l.label} className="whitespace-nowrap tabular-nums">
                            <span className="text-muted-foreground">
                              {l.label} {l.before} →
                            </span>{" "}
                            <span className="font-medium text-foreground">{l.after}</span>
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap tabular-nums">
                    <span className="text-muted-foreground">{p.priceBefore == null ? "—" : money(p.priceBefore)} →</span>{" "}
                    <span className="font-medium text-foreground">{p.priceAfter == null ? "—" : money(p.priceAfter)}</span>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-border bg-fp-surface-1a last:border-b-0">
                    <td />
                    <td colSpan={4} className="px-3 py-3">
                      <Breakdown row={p.row} ents={ents} lines={p.lines ?? []} priceAfter={p.priceAfter ?? null} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A ship-to, its address under it (Yash, 2026-11-18). */
const ShiptoCell = ({ row }: { row: ConfigRow }) => (
  <div className="flex min-w-0 flex-col">
    <span className="truncate text-sm text-foreground">{shiptoOf(row.shiptoId).name}</span>
    <span className="truncate text-xs text-muted-foreground">{shiptoOf(row.shiptoId).address}</span>
  </div>
);

/** What makes the price up, now and proposed. WHAT MOVES STANDS OUT — its
 *  row tinted, the new value bold; what stays reads as it is (Yash,
 *  2026-11-18, as the order trace reads applied against the rest). */
function Breakdown({ row, ents, lines, priceAfter }: { row: ConfigRow; ents: EntityMap; lines: Preview["lines"]; priceAfter: number | null }) {
  const now: [string, string][] = [
    ["Rate type", row.configured ? ents.get(row.rateType)?.name ?? "—" : "Not set"],
    ["Base price", row.configured ? money(row.base) : "Not set"],
    ["Margin", row.configured ? money((dynMargin(row) ?? 0) + readSetting(row, "margin", ents).value) : "Not set"],
    ["Fees", row.configured ? money(readSetting(row, "fee", ents).value) : "—"],
    ["Taxes", row.configured ? money(readSetting(row, "tax", ents).value) : "—"],
    ["Adders", row.configured ? money(readSetting(row, "adder", ents).value) : "—"],
  ];
  const after = new Map(lines.map((l) => [l.label, l.after]));
  const total: [string, string, string] = ["Total", row.configured ? money(priceOf(row, ents)) : "—", priceAfter == null ? "—" : money(priceAfter)];
  const cells = (k: string, a: string, b: string, strong?: boolean) => {
    const moved = a !== b;
    return (
      <div key={k} className={cn("grid grid-cols-[140px_repeat(2,minmax(0,200px))] gap-x-6 rounded-sm px-2 py-1", moved && "bg-accent-violet-soft")}>
        <span className={cn(moved || strong ? "font-medium text-foreground" : "text-muted-foreground")}>{k}</span>
        <span className={cn("tabular-nums", moved ? "text-muted-foreground" : "text-foreground", strong && "font-medium")}>{a}</span>
        <span className={cn("tabular-nums text-foreground", (moved || strong) && "font-semibold")}>{b}</span>
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <div className="grid grid-cols-[140px_repeat(2,minmax(0,200px))] gap-x-6 px-2 pb-1 text-xs font-medium text-muted-foreground">
        <span>Setting</span>
        <span>Before</span>
        <span>After</span>
      </div>
      {now.map(([k, v]) => cells(k, v, after.get(k) ?? v))}
      <div className="mt-1 border-t border-border pt-1">{cells(total[0], total[1], total[2], true)}</div>
    </div>
  );
}

/* ------------------------------------------------- sheets over the rule -- */

/* WIDE ENOUGH FOR A CHANGE ON ONE LINE (Yash, 2026-11-18). */
const WIDE_PRICES = [CELL.check, CELL.name, CELL.name, 360, CELL.number + 66];

/** A count's list, in a sheet over the rule — read only. */
/** REVIEW BEFORE A RERUN OR A RETRY (Yash, 2026-11-20) — the records it
 *  would touch, over the rule: what changes on each, or why each failed;
 *  Cancel, or the act with its count. */
type Figure = { label: string; info: string; value: number; note: string; picked?: string[] };
function ReviewRunSheet({
  title,
  action,
  kind,
  rows,
  customers,
  figures,
  ents,
  onConfirm,
  onClose,
  onNames,
}: {
  title: string;
  action: string;
  kind: "change" | "why";
  rows: PriceRow[];
  /** A customer-level rerun lists customers, not records. */
  customers?: CustRow[] | null;
  figures: Figure[];
  ents: EntityMap;
  onConfirm: () => void;
  onClose: () => void;
  onNames?: (l: PriceList) => void;
}) {
  const [apply, setApply] = React.useState<{ tab: string; picked: string[]; n: number } | null>(null);
  /* THE SAME LIST AS RECORDS UPDATED (Yash, 2026-11-20) — search, Filters,
     Ship-to · Customer · Product · Change · Price; a row opens its make-up. */
  const [price, setPrice] = React.useState<PriceRow | null>(null);
  return (
    <RecordSheet
      level={2}
      open
      onOpenChange={(v) => !v && onClose()}
      mode="create"
      fit={{ tables: [kind === "why" ? [180, 150, 140, 200, 210, 150] : [190, 160, 150, 236, 160]] }}
      createTitle={title}
      editTitle={title}
      createAction={action}
      canSubmit={rows.length > 0}
      /* NO CANCEL (G23) — Yash asked Cancel / Rerun; the guardrail says Close is the exit. Raised with Yash. */
      showCancel={false}
      onSubmit={onConfirm}
    >
      {/* FIGURES ON TOP, AS THE ACTIVITY FEED'S — a figure with a filter narrows the table. */}
      <div className={FIGURE_STRIP}>
        {figures.map((f) => (
          <InfoFigure
            key={f.label}
            label={f.label}
            info={<p>{f.info}</p>}
            value={f.value.toLocaleString()}
            note={f.note}
            onOpen={f.picked && f.value > 0 ? () => setApply({ tab: "prices", picked: f.picked!, n: Date.now() }) : undefined}
            openLabel="show in the table"
          />
        ))}
      </div>
      {customers ? (
        <CustomersView resetKey={title} rows={customers} apply={apply} onOpen={(c) => onNames?.(custNames(c))} />
      ) : (
        <PricesView resetKey={title} rows={rows} ents={ents} apply={apply} onOpen={setPrice} />
      )}
      {price && <PriceSheet price={price} ents={ents} onClose={() => setPrice(null)} />}
    </RecordSheet>
  );
}

function ListSheet({ list, ents, onClose }: { list: PriceList; ents: EntityMap; onClose: () => void }) {
  const [shown, setShown] = React.useState(50);
  const [open, setOpen] = React.useState<string | null>(null);
  const total = list.kind === "names" ? list.names.length : list.rows.length;
  return (
    <RecordSheet
      level={2}
      open
      onOpenChange={(v) => !v && onClose()}
      mode="edit"
      fit={{ tables: [list.kind === "change" ? WIDE_PRICES : [CELL.name, CELL.name, CELL.text]] }}
      editTitle={list.title}
      createTitle={list.title}
      createAction=""
      editAction=""
      showCancel={false}
      noFooter
      onSubmit={() => undefined}
    >
      {list.kind === "names" ? (
        <NameTable head={list.head} names={list.names.slice(0, shown)} />
      ) : list.kind === "change" ? (
        <PriceTable rows={list.rows.slice(0, shown)} ents={ents} open={open} setOpen={setOpen} />
      ) : (
        <WhyTable rows={list.rows.slice(0, shown)} />
      )}
      {total > shown && (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setShown((n) => n + 100)}>
          Show more · {total - shown} left
        </Button>
      )}
    </RecordSheet>
  );
}

function NameTable({ head, names }: { head: [string, string]; names: { name: string; note: string }[] }) {
  return (
    /* T2 — the table is the sheet's whole body, its own unit. */
    <div data-table-variant="T2" className="shrink-0 overflow-hidden rounded-md border border-border">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <th className={PTH}>{head[0]}</th>
            <th className={PTH}>{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {names.map((n) => (
            <tr key={n.name} className="border-b border-border last:border-b-0">
              <td className="truncate px-3 py-2 text-sm text-foreground">{n.name}</td>
              <td className="truncate px-3 py-2 text-sm text-muted-foreground">{n.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WhyTable({ rows }: { rows: PriceRow[] }) {
  return (
    /* T2 — the table is the sheet's whole body, its own unit. */
    <div data-table-variant="T2" className="shrink-0 overflow-hidden rounded-md border border-border">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <th className={PTH}>Ship-to</th>
            <th className={PTH}>Product</th>
            <th className={PTH}>Why</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.row.id} className="border-b border-border last:border-b-0">
              <td className="px-3 py-2">
                <ShiptoCell row={p.row} />
              </td>
              <td className="truncate px-3 py-2 text-sm">{productOf(p.row.productId).name}</td>
              <td className="px-3 py-2 text-sm text-muted-foreground">{p.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** REVIEW, THEN RERUN — one sheet over the rule: the set-up prices it will
 *  overwrite, then every price before → after; the footer's act runs it. */
