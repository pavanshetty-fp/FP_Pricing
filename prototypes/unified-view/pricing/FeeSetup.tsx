import * as React from "react";
import { toast } from "sonner";
import { Copy, FlaskConical, History, MoreHorizontal, Pencil, Power, Receipt } from "lucide-react";
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
import { Combobox } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import {
  TableCellInput,
  TableCellMultiSelect,
  TableCellSelect,
  TableRequiredLabel,
  TableRowRemove,
} from "@/components/form-layout/table-cells";
import { cn } from "@/lib/utils";
import { HangingAdd } from "../HangingAdd";
import type { ListColumn } from "../ListTable";
import type { ListFacet } from "../ListFilters";
import {
  RecordSheet,
  useDraftSaveState,
  DraftStatusChip,
} from "../RecordSheet";
import {
  ActivityCard,
  RailCard,
  RailRow,
  SheetRail,
  SummaryCard,
  type TimelineEntry,
} from "../SheetCards";
import { StandardList } from "../StandardList";
import { NOW, plural, readSetting, uniq, type ConfigRow } from "./changeLog";
import { useChangeLog } from "./changeLogStore";
import { HistorySheet, type HistoryItem } from "./HistorySheet";
import { fitColumns } from "./fitColumns";
import {
  APPLICABLE_LABEL,
  ASSET_TYPES,
  CATEGORIES,
  COND_KINDS,
  COND_LABEL,
  COND_OPS,
  CUSTOMERS,
  DAY_SHORT,
  HOLIDAYS,
  MODE_LABEL,
  MONTHS,
  ORDER_TYPES,
  PER_LABEL,
  PRODUCTS,
  RANGE_LABEL,
  SHIPTOS,
  TIMES,
  blankCond,
  blankFee,
  createFee,
  feeEdits,
  hubsIn,
  inScope,
  modeOf,
  rateText,
  scopeText,
  setFeeActive,
  timeLabel,
  updateFee,
  useFees,
  useHubMap,
  type ApplicableType,
  type Band,
  type ChargePer,
  type Cond,
  type CondKind,
  type Fee,
  type FeeMode,
  type ProductRow,
  type RangeBy,
  type ScopeRow,
  type VendorRate,
  type SimResult,
  VENDORS,
  calcText,
  perGalText,
  simulate,
} from "./fees";
import { doneWithFeeToOpen, takeFeeToOpen } from "./pricingNav";

/*
  PRICING SETUP › FEE (Yash, 2026-11-24) — the configuration layer of the
  fee rule engine (docs/unified-view/pricing/fee-rule-engine.md). The list,
  and the fee on the record sheet: Details · Application · Rule (By rule) ·
  Scope · Fee amount, its reach and history on the right. A new fee is
  created from the footer; an open fee autosaves (UV interactions §1).
*/

type K =
  "name" | "mode" | "rate" | "per" | "scope" | "reach" | "status" | "actions";
const COLUMNS: ListColumn<K>[] = [
  { key: "name", label: "Name", width: 220, sortable: true },
  { key: "mode", label: "Application", width: 170, sortable: true },
  { key: "rate", label: "Rate", width: 180, sortable: true },
  { key: "per", label: "Charge per", width: 120, sortable: true },
  { key: "scope", label: "Scope", width: 260, sortable: true },
  { key: "reach", label: "Ship-tos reached", width: 150, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/** Prices a fee reaches today — configured ship-to × product rows in its scope. */
function useReach() {
  const log = useChangeLog();
  const hub = useHubMap(log.rows, log.entityMap);
  const rows = React.useMemo(
    () => log.rows.filter((r) => r.configured),
    [log.rows],
  );
  return React.useCallback(
    (f: Fee) => rows.filter((r) => inScope(f, r, hub(r.shiptoId)).ok),
    [rows, hub],
  );
}

export function FeeSetupScreen() {
  const { fees } = useFees();
  const reach = useReach();
  const [open, setOpen] = React.useState<{
    id: string | null;
    from?: string;
    /** Opened from Edit fee in a new tab — shown as a page, no slide. */
    page?: boolean;
  } | null>(() => {
    const id = takeFeeToOpen();
    /* A fee this tab doesn't know (deleted, or a bad link) opens nothing. */
    return id && fees.some((f) => f.id === id) ? { id, page: true } : null;
  });
  const [off, setOff] = React.useState<Fee | null>(null);
  const [history, setHistory] = React.useState<string | null>(null);
  const counts = React.useMemo(
    /* SHIP-TOS, NOT PRICES (Yash, 2026-11-25) — a ship-to × product count read
       as noise; the ship-tos a fee reaches is the number people ask for. */
    () => new Map(fees.map((f) => [f.id, uniq(reach(f).map((r) => r.shiptoId)).length])),
    [fees, reach],
  );
  const text = (f: Fee, key: K): string => {
    switch (key) {
      case "name":
        return f.name;
      case "mode":
        return MODE_LABEL[modeOf(f)];
      case "rate":
        return rateText(f.amount);
      case "per":
        return f.amount.unit === "%" ? "Order" : PER_LABEL[f.amount.per];
      case "scope":
        return scopeText(f);
      case "reach":
        return (counts.get(f.id) ?? 0).toLocaleString();
      case "status":
        return f.active ? "Active" : "Deactivated";
      default:
        return "";
    }
  };
  const columns = React.useMemo(
    () =>
      fitColumns(COLUMNS, fees, (f, key) => [text(f, key)], ["mode", "status"]),
    [fees, counts],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const facets: ListFacet[] = (["mode", "per", "status"] as K[]).map((key) => ({
    key,
    label: COLUMNS.find((c) => c.key === key)!.label,
    options: uniq(fees.map((f) => text(f, key))).sort(),
  }));

  return (
    <>
      <StandardList<Fee, K>
        rows={fees}
        columns={columns}
        rowId={(f) => f.id}
        text={text}
        sortValue={(f, key) =>
          key === "reach" ? (counts.get(f.id) ?? 0) : undefined
        }
        renderCell={(f, key) => {
          if (key === "status")
            return f.active ? (
              <Pill kind="success">Active</Pill>
            ) : (
              <Pill>Deactivated</Pill>
            );
          if (key === "mode") return <Pill>{MODE_LABEL[modeOf(f)]}</Pill>;
          if (key === "name")
            return (
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-foreground">
                  {f.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {f.code}
                </span>
              </span>
            );
          return text(f, key);
        }}
        rowMenu={(f) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${f.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => setOpen({ id: f.id })}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setHistory(f.id)}>
                <History />
                History
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setOpen({ id: null, from: f.id })}
              >
                <Copy />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                variant={f.active ? "destructive" : "default"}
                onSelect={() => {
                  if (f.active) return setOff(f);
                  setFeeActive(f.id, true);
                  toast.success(`${f.name} activated`);
                }}
              >
                <Power />
                {f.active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        facets={facets}
        facetValues={(f, k) => [text(f, k as K)]}
        storageKey="pricing-setup-fee"
        noun="fees"
        nounOne="fee"
        searchPlaceholder="Search fees…"
        ctaLabel="Add fee"
        onCreate={() => setOpen({ id: null })}
        onOpen={(f) => setOpen({ id: f.id })}
        openLabel={(f) => `Open ${f.name}`}
        emptyIcon={<Receipt />}
      />
      {open && (
        <FeeSheet
          key={`${open.id ?? "new"}:${open.from ?? ""}`}
          id={open.id}
          from={open.from}
          page={open.page}
          onClose={() => {
            doneWithFeeToOpen();
            setOpen(null);
          }}
        />
      )}
      {history && <FeeHistorySheet id={history} onClose={() => setHistory(null)} />}
      <AlertDialog open={!!off} onOpenChange={(o) => !o && setOff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {off?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It stops reaching{" "}
              {plural(off ? (counts.get(off.id) ?? 0) : 0, "ship-to")}. New and
              undelivered orders drop it; delivered orders keep it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!off) return;
                setFeeActive(off.id, false);
                toast.success(`${off.name} deactivated`);
                setOff(null);
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** A FEE'S HISTORY (Yash, 2026-11-27) — the timeline every artifact has:
 *  its fee history, each entry but an order's opening its change. */
function FeeHistorySheet({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useFees();
  const fee = store.fees.find((f) => f.id === id);
  const list = store.audit[id] ?? [];
  const items: HistoryItem[] = list.map((a, k) => ({
    key: `${id}-${k}`,
    at: a.at,
    action: a.action,
    change: a.change,
    text: a.change,
    by: a.by,
    note: a.rowIds?.length ? plural(a.rowIds.length, "record") : undefined,
    changeId: a.kind && a.kind !== "order" ? `CH-F-${id}-${list.length - 1 - k}` : undefined,
  }));
  return <HistorySheet title={`${fee?.name ?? ""} history`} subtitle="Fee" items={items} onClose={onClose} historyKey="pricing-setup-activity-fee" />;
}

// ------------------------------------------------------------- the sheet --

const ISO = (t: number) => new Date(t).toISOString();

function FeeSheet({
  id,
  from,
  page,
  onClose,
}: {
  id: string | null;
  from?: string;
  page?: boolean;
  onClose: () => void;
}) {
  const store = useFees();
  const log = useChangeLog();
  const reach = useReach();
  const creating = id === null;
  /* WHAT THE SHEET OPENED ON — read once; its own saves must not rebuild it. */
  const [start] = React.useState<Fee>(() => {
    const src = store.fees.find((f) => f.id === (id ?? from));
    if (!src) return blankFee();
    return id
      ? src
      : { ...src, id: "", name: `${src.name} (copy)`, code: `${src.code}-2` };
  });
  const [d, setD] = React.useState<Fee>(start);
  const saveState = useDraftSaveState(d);
  const patch = (p: Partial<Fee>) => setD((x) => ({ ...x, ...p }));

  /* AUTOSAVE — an existing fee, 600ms after an edit settles. Each save logs
     what moved since the last one, old → new (Yash, 2026-11-27). */
  const saved = React.useRef<Fee>(start);
  React.useEffect(() => {
    if (creating) return;
    const t = window.setTimeout(() => {
      if (!d.name.trim()) return;
      const edits = feeEdits(saved.current, d);
      saved.current = d;
      updateFee(d, edits);
    }, 600);
    return () => window.clearTimeout(t);
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = [
    !d.name.trim() && {
      key: "name",
      label: "Enter a name",
      target: "fee-details",
    },
    !d.code.trim() && {
      key: "code",
      label: "Enter a code",
      target: "fee-details",
    },
    d.when === "rule" &&
      !d.rule.conds.some((c) => c.kind) && {
        key: "rule",
        label: "Add a condition",
        target: "fee-rule",
      },
    !d.scope.some((s) => s.mode === "include") && {
      key: "scope",
      label: "Include a customer or ship-to",
      target: "fee-scope",
    },
  ].filter(Boolean) as { key: string; label: string; target: string }[];

  const create = () => {
    if (missing.length) return;
    createFee({ ...d, name: d.name.trim(), code: d.code.trim() });
    toast.success(`${d.name.trim()} created`);
    onClose();
  };

  const reached = reach(d);
  const entries: TimelineEntry[] = creating
    ? []
    : [...(store.audit[id!] ?? [])]
        .reverse()
        .map((a) => ({ at: ISO(a.at), by: a.by, changes: [a.change] }));

  const body = (
    <div className="flex min-w-0 flex-col gap-10">
      <SheetSection title="Details" id="fee-details">
        <SheetField label="Name" required>
          <Input
            value={d.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Enter fee name"
          />
        </SheetField>
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Code" required>
            <Input
              value={d.code}
              onChange={(e) => patch({ code: e.target.value })}
              placeholder="Enter code"
            />
          </SheetField>
          <SheetField label="ERP ID">
            <Input
              value={d.erpId}
              onChange={(e) => patch({ erpId: e.target.value })}
              placeholder="Enter ERP ID"
            />
          </SheetField>
        </div>
        <SheetField label="Applicable type">
          <Combobox
            className="w-full"
            value={APPLICABLE_LABEL[d.applicableType]}
            options={Object.values(APPLICABLE_LABEL)}
            onValueChange={(v) =>
              patch({
                applicableType: (Object.entries(APPLICABLE_LABEL).find(
                  ([, l]) => l === v,
                )?.[0] ?? "all") as ApplicableType,
              })
            }
            aria-label="Applicable type"
          />
        </SheetField>
        <SheetField label="Description">
          <Textarea
            value={d.desc}
            onChange={(e) => patch({ desc: e.target.value })}
            placeholder="Enter description"
            rows={2}
          />
        </SheetField>
        {!creating && (
          <SwitchRow
            label="Active"
            checked={d.active}
            onChange={(v) => patch({ active: v })}
          />
        )}
      </SheetSection>

      <ApplicationSection d={d} patch={patch} />
      {d.when === "rule" && <RuleSection d={d} patch={patch} />}
      <ScopeSection d={d} patch={patch} rows={log.rows} />
      <AmountSection d={d} patch={patch} />
    </div>
  );

  return (
    <RecordSheet
      open
      onOpenChange={(v) => !v && onClose()}
      mode={creating ? "create" : "edit"}
      size="data"
      /* EDIT FEE IN A NEW TAB IS A PAGE (Yash, 2026-11-24) — no slide in. */
      presentation={page ? "full" : undefined}
      fit={{ tables: [[64, 200, 150, 480, 52], [120, 220, 200, 200, 52]], rail: true }}
      createTitle="Add fee"
      editTitle={d.name || "Fee"}
      createAction="Create fee"
      editAction=""
      showCancel={false}
      noFooter={!creating}
      pending={creating ? missing : undefined}
      headerAside={
        creating ? undefined : (
          <span className="flex items-center gap-1.5">
            {d.active ? (
              <Pill kind="success">Active</Pill>
            ) : (
              <Pill>Deactivated</Pill>
            )}
            <DraftStatusChip
              tone="neutral"
              label="Draft"
              saveState={saveState}
              showStatus={false}
            />
          </span>
        )
      }
      headerSubtitle={
        <span className="text-sm text-muted-foreground">
          {creating ? "Pricing setup" : `Fee · ${d.code}`}
        </span>
      }
      onSubmit={create}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]">
        {body}
        <SheetRail>
          <SummaryCard title="Reach">
            <dl className="flex flex-col">
              <RailRow
                variant="line"
                label="Application"
                value={MODE_LABEL[modeOf(d)]}
              />
              <RailRow
                variant="line"
                label="Customers"
                value={uniq(
                  reached.map((r) => r.customerId),
                ).length.toLocaleString()}
              />
              {/* NO PRICES ROW (Yash, 2026-11-25) — ship-tos is the reach. */}
              <RailRow
                variant="total"
                label="Ship-tos"
                value={uniq(
                  reached.map((r) => r.shiptoId),
                ).length.toLocaleString()}
              />
            </dl>
          </SummaryCard>
          <FeeSimulator fee={d} />
          {!creating && <ActivityCard title="History" entries={entries} />}
        </SheetRail>
      </div>
    </RecordSheet>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function Choice<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as T)}
      className="flex flex-wrap gap-6"
    >
      {options.map(([v, text]) => (
        <div key={v} className="flex items-center gap-2">
          <RadioGroupItem value={v} id={`${id}-${v}`} />
          <Label htmlFor={`${id}-${v}`} className="font-normal">
            {text}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

type Patch = (p: Partial<Fee>) => void;

/* ------------------------------------------------------------ application -- */

/** THREE CHOICES (Yash, 2026-11-24) — Always applied · By rule · Review and
 *  apply (order: Always · Review · By rule, Yash 2026-11-24). "Review a
 *  rule fee on the order" is a question for the PM. */
function ApplicationSection({ d, patch }: { d: Fee; patch: Patch }) {
  const pick: FeeMode = modeOf(d) === "ruleReview" ? "rule" : modeOf(d);
  return (
    <SheetSection title="Application" id="fee-application">
      <Choice<FeeMode>
        id="fee-mode"
        value={pick}
        options={[
          ["always", MODE_LABEL.always],
          ["review", MODE_LABEL.review],
          ["rule", MODE_LABEL.rule],
        ]}
        onChange={(m) =>
          patch(
            m === "always"
              ? { when: "always", review: false }
              : m === "review"
                ? { when: "always", review: true }
                : {
                    when: "rule",
                    review: false,
                    rule: d.rule.conds.length
                      ? d.rule
                      : { ...d.rule, conds: [{ kind: "", op: "" }] },
                  },
          )
        }
      />
    </SheetSection>
  );
}

/* ------------------------------------------------------------------- rule -- */

const TH = "px-3 py-2.5 text-left text-sm font-medium";
const TR = "group/row h-11 border-b border-border last:border-b-0";
const BIN_TD = "sticky right-0 z-10 bg-popover p-0 text-center";
const BIN_TH = "sticky right-0 z-10 bg-fp-table-header";
/** Several table cells side by side in one cell. */
const Split = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-11 divide-x divide-border">{children}</div>
);
const Part = ({ children, w }: { children: React.ReactNode; w?: string }) => (
  <div className={cn("relative min-w-0", w ?? "flex-1")}>{children}</div>
);
const num = (v: string) => (v.trim() === "" ? null : Number(v) || 0);
/** A number typed as text — "0.0" stays "0.0" while it is being typed. */
function useNumText(n: number | null | undefined, on: (v: number | null) => void) {
  const [t, setT] = React.useState(n === null || n === undefined ? "" : String(n));
  React.useEffect(() => {
    if ((t.trim() === "" ? null : Number(t)) !== (n ?? null)) setT(n === null || n === undefined ? "" : String(n));
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  return [t, (v: string) => (setT(v), on(num(v)))] as const;
}
function NumCell({ value, onChange, ...rest }: { value: number | null | undefined; onChange: (v: number | null) => void; suffix?: string; placeholder?: string; "aria-label": string }) {
  const [t, set] = useNumText(value, onChange);
  return <TableCellInput numeric value={t} onChange={set} {...rest} />;
}
function NumField({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  const [t, set] = useNumText(value, (v) => onChange(v ?? 0));
  return <Input inputMode="decimal" value={t} onChange={(e) => set(e.target.value)} placeholder={placeholder} />;
}
const WEEK = [1, 2, 3, 4, 5, 6, 0];

function CondValue({
  c,
  set,
  i,
}: {
  c: Cond;
  set: (p: Partial<Cond>) => void;
  i: number;
}) {
  const at = (what: string) => `${what}, condition ${i + 1}`;
  const time = (
    v: string | undefined,
    on: (v: string) => void,
    label: string,
  ) => (
    // ONE VALUE — a window has one start and one end time.
    <TableCellSelect
      value={v ? timeLabel(v) : ""}
      options={TIMES.map(timeLabel)}
      placeholder="Time"
      aria-label={at(label)}
      onChange={(l) => on(TIMES.find((t) => timeLabel(t) === l) ?? "00:00")}
    />
  );
  const WHEN = WEEK.flatMap((d) => TIMES.map((t) => `${DAY_SHORT[d]} ${timeLabel(t)}`));
  const when = (d: number | undefined, t: string | undefined, on: (d: number, t: string) => void, label: string) => (
    // ONE VALUE — a weekly period starts at one day and time, and ends at one.
    <TableCellSelect
      value={d === undefined ? "" : `${DAY_SHORT[d]} ${timeLabel(t ?? "00:00")}`}
      options={WHEN}
      placeholder="Day and time"
      aria-label={at(label)}
      onChange={(v) => {
        const [dd, ...rest] = v.split(" ");
        const tl = rest.join(" ");
        on(DAY_SHORT.indexOf(dd), TIMES.find((x) => timeLabel(x) === tl) ?? "00:00");
      }}
    />
  );
  const n = (
    v: number | null | undefined,
    on: (v: number | null) => void,
    label: string,
    suffix?: string,
  ) => (
    <NumCell value={v} suffix={suffix} aria-label={at(label)} onChange={on} />
  );
  const multi = (
    values: string[],
    options: string[],
    on: (v: string[]) => void,
    label: string,
    unit: string,
  ) => (
    <TableCellMultiSelect
      values={values}
      options={options}
      placeholder={`Select ${unit}s`}
      unitLabel={unit}
      aria-label={at(label)}
      onChange={on}
    />
  );
  switch (c.kind) {
    case "dayTime":
      return (
        <Split>
          <Part>
            {multi(
              (c.days ?? [])
                .sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b))
                .map((x) => DAY_SHORT[x]),
              WEEK.map((x) => DAY_SHORT[x]),
              (v) => set({ days: v.map((x) => DAY_SHORT.indexOf(x)) }),
              "Days",
              "day",
            )}
          </Part>
          <Part w="w-[124px]">
            {time(c.from, (from) => set({ from }), "From")}
          </Part>
          <Part w="w-[124px]">{time(c.to, (to) => set({ to }), "To")}</Part>
        </Split>
      );
    case "period":
      return (
        /* DAY AND TIME IN ONE PICK (Yash, 2026-11-24) — "Fri 5:00 PM" to
           "Mon 12:00 AM"; four pickers did not fit beside the condition. */
        <Split>
          <Part>{when(c.fromDay, c.from, (fromDay, from) => set({ fromDay, from }), "From")}</Part>
          <Part>{when(c.toDay, c.to, (toDay, to) => set({ toDay, to }), "To")}</Part>
        </Split>
      );
    case "date":
      return c.op === "holiday" ? (
        multi(
          (c.holidays ?? []).map(
            (h) => HOLIDAYS.find((x) => x.id === h)?.name ?? h,
          ),
          HOLIDAYS.map((h) => h.name),
          (v) =>
            set({
              holidays: v.map((nm) => HOLIDAYS.find((h) => h.name === nm)!.id),
            }),
          "Holidays",
          "holiday",
        )
      ) : (
        <Split>
          <Part>
            {/* ONE VALUE — a season starts in one month. */}
            <TableCellSelect
              value={MONTHS[(c.months ?? [0, 0])[0]]}
              options={MONTHS}
              aria-label={at("From month")}
              onChange={(m) =>
                set({ months: [MONTHS.indexOf(m), (c.months ?? [0, 0])[1]] })
              }
            />
          </Part>
          <Part>
            {/* ONE VALUE — and ends in one. */}
            <TableCellSelect
              value={MONTHS[(c.months ?? [0, 0])[1]]}
              options={MONTHS}
              aria-label={at("To month")}
              onChange={(m) =>
                set({ months: [(c.months ?? [0, 0])[0], MONTHS.indexOf(m)] })
              }
            />
          </Part>
        </Split>
      );
    case "leadTime":
      return c.op === "sameDay" ? (
        <span className="block px-3 text-sm text-muted-foreground">—</span>
      ) : (
        n(c.n, (v) => set({ n: v }), "Hours", "h")
      );
    case "quantity":
    case "assets": {
      const unit = c.kind === "quantity" ? "gal" : undefined;
      return c.op === "between" ? (
        <Split>
          <Part>{n(c.n, (v) => set({ n: v }), "From", unit)}</Part>
          <Part>{n(c.n2, (v) => set({ n2: v }), "To", unit)}</Part>
        </Split>
      ) : (
        n(c.n, (v) => set({ n: v }), "Value", unit)
      );
    }
    case "orderType":
      return multi(
        c.values ?? [],
        ORDER_TYPES,
        (values) => set({ values }),
        "Order types",
        "order type",
      );
    case "assetType":
      return multi(
        c.values ?? [],
        ASSET_TYPES,
        (values) => set({ values }),
        "Asset types",
        "asset type",
      );
    default:
      return (
        <TableCellInput
          value=""
          disabled
          aria-label={at("Value")}
          onChange={() => undefined}
        />
      );
  }
}

/** WHEN — THE BULK RULE'S CONDITION TABLE (Yash, 2026-11-24), with the fee
 *  conditions from the use-case sheet. Match all (AND) or any (OR). */
function RuleSection({ d, patch }: { d: Fee; patch: Patch }) {
  const r = d.rule;
  const conds = r.conds.length ? r.conds : [{ kind: "", op: "" } as Cond];
  const setConds = (cs: Cond[]) => patch({ rule: { ...r, conds: cs } });
  const setAt = (i: number, p: Partial<Cond>) =>
    setConds(conds.map((c, k) => (k === i ? { ...c, ...p } : c)));
  const used = conds.map((c) => c.kind).filter(Boolean) as CondKind[];
  const canAdd = conds.every((c) => c.kind) && conds.length < COND_KINDS.length;
  const [added, setAdded] = React.useState<number | null>(null);
  return (
    <SheetSection
      title="Rule"
      id="fee-rule"
      flush
      hanging={
        canAdd ? (
          <HangingAdd
            label="Add condition"
            onClick={() => {
              setAdded(conds.length);
              setConds([...conds, { kind: "", op: "" }]);
            }}
          />
        ) : undefined
      }
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          Match
          <Select
            value={r.match}
            onValueChange={(v) =>
              patch({ rule: { ...r, match: v as "all" | "any" } })
            }
          >
            <SelectTrigger size="sm" className="w-[112px]" aria-label="Match">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (AND)</SelectItem>
              <SelectItem value="any">Any (OR)</SelectItem>
            </SelectContent>
          </Select>
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          Time zone
          <Select
            value={r.tz}
            onValueChange={(v) =>
              patch({ rule: { ...r, tz: v as "shipto" | "tenant" } })
            }
          >
            <SelectTrigger
              size="sm"
              className="w-[120px]"
              aria-label="Time zone"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shipto">Ship-to</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
            </SelectContent>
          </Select>
        </span>
      </div>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[64px]" />
          <col className="w-[200px]" />
          <col className="w-[150px]" />
          <col />
          <col className="w-[52px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <th aria-hidden className={TH} />
            <th className={TH}>Condition</th>
            <th className={TH}>Operator</th>
            <th className={TH}>Value</th>
            <th aria-hidden className={BIN_TH} />
          </tr>
        </thead>
        <tbody>
          {conds.map((c, i) => {
            const ops = c.kind ? COND_OPS[c.kind] : [];
            return (
              <tr key={i} className={TR}>
                <td className="px-3 text-xs font-semibold text-muted-foreground">
                  {i === 0 ? "Where" : r.match === "any" ? "Or" : "And"}
                </td>
                <td className="relative p-0">
                  {/* ONE VALUE — a row is one condition; its values are picked beside it. */}
                  <TableCellSelect
                    value={c.kind ? COND_LABEL[c.kind] : ""}
                    options={COND_KINDS.filter(
                      (k) => k === c.kind || !used.includes(k),
                    ).map((k) => COND_LABEL[k])}
                    placeholder="Select condition"
                    autoFocus={added === i}
                    aria-label={`Condition ${i + 1}`}
                    onChange={(l) => {
                      const k = COND_KINDS.find((x) => COND_LABEL[x] === l)!;
                      setConds(
                        conds.map((x, j) => (j === i ? blankCond(k) : x)),
                      );
                    }}
                  />
                </td>
                <td className="relative p-0">
                  {/* ONE VALUE — a condition reads one way. */}
                  <TableCellSelect
                    value={ops.find(([v]) => v === c.op)?.[1] ?? ""}
                    options={ops.map(([, l]) => l)}
                    disabled={!c.kind || ops.length < 2}
                    placeholder="Operator"
                    aria-label={`Operator ${i + 1}`}
                    onChange={(l) =>
                      setAt(i, { op: ops.find(([, x]) => x === l)![0] })
                    }
                  />
                </td>
                <td className="relative p-0">
                  <CondValue c={c} i={i} set={(p) => setAt(i, p)} />
                </td>
                <td className={BIN_TD}>
                  {conds.length > 1 && (
                    <TableRowRemove
                      aria-label={`Remove condition ${i + 1}`}
                      onRemove={() => setConds(conds.filter((_, k) => k !== i))}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SheetSection>
  );
}

/* ------------------------------------------------------------------ scope -- */

const MODES: [ScopeRow["mode"], string][] = [
  ["include", "Include"],
  ["exclude", "Exclude"],
];
const ALL_C = "All customers";
const ALL_H = "All hubs";
const ALL_S = "All ship-tos";
const ALL_G = "All categories";
const ALL_P = "All products";
const cname = (id: string) => CUSTOMERS.find((c) => c.id === id)?.name ?? "";
const sname = (id: string) => SHIPTOS.find((s) => s.id === id)?.name ?? id;
const pname = (id: string) => PRODUCTS.find((p) => p.id === id)?.name ?? id;
/** "All …" stands for an empty list — every one, including ones added later. */
const toAll = (xs: string[], all: string) => (xs.length ? xs : [all]);
const fromAll = (xs: string[], all: string) => (xs.includes(all) ? [] : xs);

/** WHO — CUSTOMERS, HUBS AND SHIP-TOS (Yash, 2026-11-24): rows of Include or
 *  Exclude, each narrowing left to right; Exclude wins. Products the same,
 *  by category. */
function ScopeSection({
  d,
  patch,
  rows,
}: {
  d: Fee;
  patch: Patch;
  rows: ConfigRow[];
}) {
  const log = useChangeLog();
  const hub = useHubMap(rows, log.entityMap);
  const setRow = (i: number, p: Partial<ScopeRow>) =>
    patch({ scope: d.scope.map((s, k) => (k === i ? { ...s, ...p } : s)) });
  const setProd = (i: number, p: Partial<ProductRow>) =>
    patch({
      products: d.products.map((s, k) => (k === i ? { ...s, ...p } : s)),
    });
  return (
    <>
      <SheetSection
        title="Scope · customers, hubs & ship-tos"
        id="fee-scope"
        flush
        hanging={
          <HangingAdd
            label="Add row"
            onClick={() =>
              patch({
                scope: [
                  ...d.scope,
                  { mode: "exclude", customer: "", hubs: [], shiptos: [] },
                ],
              })
            }
          />
        }
      >
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[120px]" />
            <col className="w-[30%]" />
            <col />
            <col />
            <col className="w-[52px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
              <th className={TH}>
                <TableRequiredLabel required>Include</TableRequiredLabel>
              </th>
              <th className={TH}>Customer</th>
              <th className={TH}>Hubs</th>
              <th className={TH}>Ship-tos</th>
              <th aria-hidden className={BIN_TH} />
            </tr>
          </thead>
          <tbody>
            {d.scope.map((s, i) => {
              const hubs = hubsIn(rows, log.entityMap, s.customer || undefined);
              const ships = SHIPTOS.filter(
                (x) =>
                  (!s.customer || x.customerId === s.customer) &&
                  (!s.hubs.length || s.hubs.includes(hub(x.id))),
              );
              return (
                <tr key={i} className={TR}>
                  <td className="relative p-0">
                    {/* ONE VALUE — a row either includes or excludes. */}
                    <TableCellSelect
                      value={MODES.find(([m]) => m === s.mode)![1]}
                      options={MODES.map(([, l]) => l)}
                      aria-label={`Include or exclude, row ${i + 1}`}
                      onChange={(l) =>
                        setRow(i, {
                          mode: l === "Exclude" ? "exclude" : "include",
                        })
                      }
                    />
                  </td>
                  <td className="relative p-0">
                    {/* ONE VALUE — a row is one customer (or all); its hubs and ship-tos narrow it. */}
                    <TableCellSelect
                      value={s.customer ? cname(s.customer) : ALL_C}
                      options={[ALL_C, ...CUSTOMERS.map((c) => c.name)]}
                      aria-label={`Customer, row ${i + 1}`}
                      onChange={(n) =>
                        setRow(i, {
                          customer:
                            n === ALL_C
                              ? ""
                              : CUSTOMERS.find((c) => c.name === n)!.id,
                          hubs: [],
                          shiptos: [],
                        })
                      }
                    />
                  </td>
                  <td className="relative p-0">
                    <TableCellMultiSelect
                      values={toAll(s.hubs, ALL_H)}
                      options={[
                        ...s.hubs,
                        ...hubs.filter((h) => !s.hubs.includes(h)),
                      ]}
                      allOption={ALL_H}
                      placeholder="Select hubs"
                      unitLabel="hub"
                      aria-label={`Hubs, row ${i + 1}`}
                      onChange={(v) =>
                        setRow(i, { hubs: fromAll(v, ALL_H), shiptos: [] })
                      }
                    />
                  </td>
                  <td className="relative p-0">
                    <TableCellMultiSelect
                      values={toAll(s.shiptos.map(sname), ALL_S)}
                      options={[
                        ...s.shiptos.map(sname),
                        ...ships
                          .filter((x) => !s.shiptos.includes(x.id))
                          .map((x) => x.name),
                      ]}
                      allOption={ALL_S}
                      placeholder="Select ship-tos"
                      unitLabel="ship-to"
                      aria-label={`Ship-tos, row ${i + 1}`}
                      onChange={(v) =>
                        setRow(i, {
                          shiptos: fromAll(v, ALL_S).map(
                            (n) => SHIPTOS.find((x) => x.name === n)!.id,
                          ),
                        })
                      }
                    />
                  </td>
                  <td className={BIN_TD}>
                    {d.scope.length > 1 && (
                      <TableRowRemove
                        aria-label={`Remove scope row ${i + 1}`}
                        onRemove={() =>
                          patch({ scope: d.scope.filter((_, k) => k !== i) })
                        }
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SheetSection>
      <SheetSection
        title="Scope · products"
        flush
        hanging={
          <HangingAdd
            label="Add row"
            onClick={() =>
              patch({
                products: [
                  ...d.products,
                  { mode: "exclude", category: "", products: [] },
                ],
              })
            }
          />
        }
      >
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[120px]" />
            <col className="w-[36%]" />
            <col />
            <col className="w-[52px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
              <th className={TH}>
                <TableRequiredLabel required>Include</TableRequiredLabel>
              </th>
              <th className={TH}>Product category</th>
              <th className={TH}>Products</th>
              <th aria-hidden className={BIN_TH} />
            </tr>
          </thead>
          <tbody>
            {d.products.map((p, i) => {
              const opts = PRODUCTS.filter(
                (x) => !p.category || x.categoryId === p.category,
              );
              return (
                <tr key={i} className={TR}>
                  <td className="relative p-0">
                    {/* ONE VALUE — a row either includes or excludes. */}
                    <TableCellSelect
                      value={MODES.find(([m]) => m === p.mode)![1]}
                      options={MODES.map(([, l]) => l)}
                      aria-label={`Include or exclude products, row ${i + 1}`}
                      onChange={(l) =>
                        setProd(i, {
                          mode: l === "Exclude" ? "exclude" : "include",
                        })
                      }
                    />
                  </td>
                  <td className="relative p-0">
                    {/* ONE VALUE — a row is one category (or all); its products are picked beside it. */}
                    <TableCellSelect
                      value={
                        p.category
                          ? CATEGORIES.find((c) => c.id === p.category)!.name
                          : ALL_G
                      }
                      options={[ALL_G, ...CATEGORIES.map((c) => c.name)]}
                      aria-label={`Product category, row ${i + 1}`}
                      onChange={(n) =>
                        setProd(i, {
                          category:
                            n === ALL_G
                              ? ""
                              : CATEGORIES.find((c) => c.name === n)!.id,
                          products: [],
                        })
                      }
                    />
                  </td>
                  <td className="relative p-0">
                    <TableCellMultiSelect
                      values={toAll(p.products.map(pname), ALL_P)}
                      options={[
                        ...p.products.map(pname),
                        ...opts
                          .filter((x) => !p.products.includes(x.id))
                          .map((x) => x.name),
                      ]}
                      allOption={ALL_P}
                      placeholder="Select products"
                      unitLabel="product"
                      aria-label={`Products, row ${i + 1}`}
                      onChange={(v) =>
                        setProd(i, {
                          products: fromAll(v, ALL_P).map(
                            (n) => PRODUCTS.find((x) => x.name === n)!.id,
                          ),
                        })
                      }
                    />
                  </td>
                  <td className={BIN_TD}>
                    {d.products.length > 1 && (
                      <TableRowRemove
                        aria-label={`Remove product row ${i + 1}`}
                        onRemove={() =>
                          patch({
                            products: d.products.filter((_, k) => k !== i),
                          })
                        }
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SheetSection>
    </>
  );
}

/* ----------------------------------------------------------------- amount -- */

const PERS = Object.keys(PER_LABEL) as ChargePer[];
const RANGES = Object.keys(RANGE_LABEL) as RangeBy[];

function AmountSection({ d, patch }: { d: Fee; patch: Patch }) {
  const a = d.amount;
  const setA = (p: Partial<Fee["amount"]>) => patch({ amount: { ...a, ...p } });
  const setBand = (i: number, p: Partial<Band>) =>
    setA({ bands: a.bands.map((b, k) => (k === i ? { ...b, ...p } : b)) });
  const unit =
    a.rangeBy === "quantity" ? "gal" : a.rangeBy === "distance" ? "mi" : "min";
  return (
    <>
      <SheetSection title="Fee amount" id="fee-amount">
        <Choice
          id="fee-kind"
          value={a.kind}
          options={[
            ["flat", "Flat"],
            ["range", "Range"],
          ]}
          onChange={(kind) =>
            setA({ kind, unit: kind === "range" ? "$" : a.unit })
          }
        />
        {a.kind === "flat" ? (
          <div className="grid grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] gap-4">
            <SheetField label="Rate" required>
              <NumField value={a.rate} onChange={(rate) => setA({ rate })} placeholder="0.00" />
            </SheetField>
            <SheetField label="Unit">
              <Combobox
                className="w-full"
                value={a.unit}
                options={["$", "%"]}
                onValueChange={(u) => setA({ unit: u as "$" | "%" })}
                aria-label="Unit"
              />
            </SheetField>
            <SheetField label="Charge per">
              <Combobox
                className="w-full"
                value={a.unit === "%" ? "Order" : PER_LABEL[a.per]}
                options={
                  a.unit === "%" ? ["Order"] : PERS.map((p) => PER_LABEL[p])
                }
                onValueChange={(v) =>
                  setA({ per: PERS.find((p) => PER_LABEL[p] === v) ?? a.per })
                }
                aria-label="Charge per"
              />
            </SheetField>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Range by">
              <Combobox
                className="w-full"
                value={RANGE_LABEL[a.rangeBy]}
                options={RANGES.map((r) => RANGE_LABEL[r])}
                onValueChange={(v) =>
                  setA({
                    rangeBy:
                      RANGES.find((r) => RANGE_LABEL[r] === v) ?? a.rangeBy,
                  })
                }
                aria-label="Range by"
              />
            </SheetField>
            <SheetField label="Charge per">
              <Combobox
                className="w-full"
                value={PER_LABEL[a.per]}
                options={PERS.map((p) => PER_LABEL[p])}
                onValueChange={(v) =>
                  setA({ per: PERS.find((p) => PER_LABEL[p] === v) ?? a.per })
                }
                aria-label="Charge per"
              />
            </SheetField>
          </div>
        )}
        {a.kind === "flat" && a.unit === "$" && (
          <SwitchRow
            label="Vendor-specific rates"
            checked={!!a.vendorSpecific}
            onChange={(on) =>
              setA({
                vendorSpecific: on,
                vendorRates: on && !(a.vendorRates ?? []).length ? [{ vendors: [], rate: null }] : a.vendorRates,
              })
            }
          />
        )}
      </SheetSection>
      {a.kind === "flat" && a.unit === "$" && a.vendorSpecific && <VendorRates a={a} setA={setA} />}
      {a.kind === "range" && (
        <SheetSection
          title="Bands"
          flush
          hanging={
            <HangingAdd
              label="Add band"
              onClick={() =>
                setA({
                  bands: [
                    ...a.bands,
                    {
                      from: (a.bands[a.bands.length - 1]?.to ?? 0) + 1,
                      to: null,
                      rate: 0,
                    },
                  ],
                })
              }
            />
          }
        >
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col />
              <col />
              <col />
              <col className="w-[52px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-fp-table-header">
                <th className={TH}>
                  <TableRequiredLabel required>
                    From ({unit})
                  </TableRequiredLabel>
                </th>
                <th className={TH}>
                  <TableRequiredLabel>To ({unit})</TableRequiredLabel>
                </th>
                <th className={TH}>
                  <TableRequiredLabel required>Rate ($)</TableRequiredLabel>
                </th>
                <th aria-hidden className={BIN_TH} />
              </tr>
            </thead>
            <tbody>
              {a.bands.map((b, i) => (
                <tr key={i} className={TR}>
                  <td className="relative p-0">
                    <NumCell value={b.from} aria-label={`From, band ${i + 1}`} onChange={(v) => setBand(i, { from: v ?? 0 })} />
                  </td>
                  <td className="relative p-0">
                    <NumCell placeholder="No end" value={b.to} aria-label={`To, band ${i + 1}`} onChange={(v) => setBand(i, { to: v })} />
                  </td>
                  <td className="relative p-0">
                    <NumCell value={b.rate} aria-label={`Rate, band ${i + 1}`} onChange={(v) => setBand(i, { rate: v ?? 0 })} />
                  </td>
                  <td className={BIN_TD}>
                    {a.bands.length > 1 && (
                      <TableRowRemove
                        aria-label={`Remove band ${i + 1}`}
                        onRemove={() =>
                          setA({ bands: a.bands.filter((_, k) => k !== i) })
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SheetSection>
      )}
    </>
  );
}

/** VENDOR-SPECIFIC RATES (Yash, 2026-11-24, the live fee form's switch) — a
 *  flat rate per vendor; vendors not named, and first-party orders, use the
 *  default rate. A vendor sits in one row only. */
function VendorRates({ a, setA }: { a: Fee["amount"]; setA: (p: Partial<Fee["amount"]>) => void }) {
  const rows = a.vendorRates ?? [];
  const setRow = (i: number, p: Partial<VendorRate>) => setA({ vendorRates: rows.map((r, k) => (k === i ? { ...r, ...p } : r)) });
  const canAdd = rows.every((r) => r.vendors.length) && rows.flatMap((r) => r.vendors).length < VENDORS.length;
  return (
    <SheetSection
      title="Vendor rates"
      flush
      hanging={canAdd ? <HangingAdd label="Add vendor rate" onClick={() => setA({ vendorRates: [...rows, { vendors: [], rate: null }] })} /> : undefined}
    >
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[180px]" />
          <col className="w-[52px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <th className={TH}>
              <TableRequiredLabel required>Vendors</TableRequiredLabel>
            </th>
            <th className={TH}>
              <TableRequiredLabel required>Rate ($)</TableRequiredLabel>
            </th>
            <th aria-hidden className={BIN_TH} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const taken = rows.filter((_, k) => k !== i).flatMap((x) => x.vendors);
            return (
              <tr key={i} className={TR}>
                <td className="relative p-0">
                  <TableCellMultiSelect
                    values={r.vendors}
                    options={[...r.vendors, ...VENDORS.filter((v) => !r.vendors.includes(v) && !taken.includes(v))]}
                    placeholder="Select vendors"
                    unitLabel="vendor"
                    aria-label={`Vendors, row ${i + 1}`}
                    onChange={(vendors) => setRow(i, { vendors })}
                  />
                </td>
                <td className="relative p-0">
                  <NumCell value={r.rate} placeholder={String(a.rate)} aria-label={`Rate, row ${i + 1}`} onChange={(rate) => setRow(i, { rate })} />
                </td>
                <td className={BIN_TD}>
                  {rows.length > 1 && <TableRowRemove aria-label={`Remove vendor rate ${i + 1}`} onRemove={() => setA({ vendorRates: rows.filter((_, k) => k !== i) })} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SheetSection>
  );
}

/* -------------------------------------------------------------- simulator -- */

const local = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const today = (h: number, m = 0) => {
  const d = new Date(NOW);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
const FIRST_PARTY = "First party";
const SIM_LINE: Record<SimResult["state"], string> = {
  charged: "Charged on this order",
  offered: "Offered for review on the order",
  pending: "Worked out once delivered",
  none: "Doesn't apply to this order",
};


/** FEE SIMULATOR (Yash, 2026-11-24 — the earlier mock's Example order): run
 *  the fee as it stands in the sheet on a sample order. The result and the
 *  order in one line first; Edit order opens only the inputs this fee reads;
 *  How it's calculated closes the card. */
function FeeSimulator({ fee }: { fee: Fee }) {
  const log = useChangeLog();
  const ents = log.entityMap;
  const hub = useHubMap(log.rows, ents);
  const rows = React.useMemo(() => log.rows.filter((r) => r.configured), [log.rows]);
  const [editing, setEditing] = React.useState(false);
  /* EMPTY UNTIL THE FEE HAS A VALUE (Yash, 2026-11-24) — the sample order is
     there from the start; the result waits for a rate (and a rule's
     condition) to work out. */
  const a0 = fee.amount;
  const ready =
    (a0.kind === "flat" ? a0.rate > 0 || (a0.vendorRates ?? []).some((r) => (r.rate ?? 0) > 0) : a0.bands.some((b) => b.rate > 0)) &&
    (fee.when !== "rule" || fee.rule.conds.some((c) => c.kind));
  const [o, setO] = React.useState(() => {
    const r = rows.find((x) => inScope(fee, x, hub(x.shiptoId)).ok) ?? rows[0];
    return {
      shiptoId: r.shiptoId,
      productId: r.productId,
      orderType: "Delivery" as "Delivery" | "Extraction",
      createdAt: today(8),
      deliveryAt: today(18, 30),
      delivered: true,
      gallons: 80 as number | null,
      assets: 2 as number | null,
      assetType: "Truck",
      miles: 64 as number | null,
      minutes: 95 as number | null,
      vendor: FIRST_PARTY,
    };
  });
  const set = (p: Partial<typeof o>) => setO((x) => ({ ...x, ...p }));
  const ship = SHIPTOS.find((x) => x.id === o.shiptoId)!;
  const row = rows.find((r) => r.shiptoId === o.shiptoId && r.productId === o.productId) ?? rows.find((r) => r.shiptoId === o.shiptoId)!;
  const products = uniq(rows.filter((r) => r.shiptoId === o.shiptoId).map((r) => r.productId));
  const gal = o.gallons ?? 0;
  /* The fuel on the sample order — the price's base and margin. */
  const perGal = row.base + readSetting(row, "margin", ents).value;
  const productTotal = perGal * gal;
  const facts = {
    orderType: o.orderType,
    createdAt: o.createdAt,
    plannedAt: o.deliveryAt,
    deliveredAt: o.delivered ? o.deliveryAt : null,
    orderedGallons: gal,
    deliveredGallons: o.delivered ? gal : null,
    assetTypes: o.assets ? [o.assetType] : [],
    assets: o.assets ?? 0,
    miles: o.miles ?? 0,
    minutesOnSite: o.delivered ? (o.minutes ?? 0) : null,
    productTotal,
    vendor: o.vendor === FIRST_PARTY ? null : o.vendor,
  };
  const res = simulate(fee, { customerId: ship.customerId, shiptoId: o.shiptoId, productId: o.productId }, hub(o.shiptoId), facts);

  /* ONLY WHAT THIS FEE READS (Yash, 2026-11-24). */
  const kinds = fee.when === "rule" ? fee.rule.conds.map((c) => c.kind) : [];
  const a = fee.amount;
  const needs = {
    created: kinds.includes("leadTime"),
    orderType: fee.applicableType !== "all" || kinds.includes("orderType"),
    vendor: a.kind === "flat" && !!a.vendorSpecific,
    assets: a.per === "asset" || kinds.includes("assets") || kinds.includes("assetType"),
    assetType: kinds.includes("assetType"),
    miles: a.per === "mile" || (a.kind === "range" && a.rangeBy === "distance"),
    minutes: a.per === "hour" || (a.kind === "range" && a.rangeBy === "time"),
  };
  const when = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(o.deliveryAt);

  const pick = (label: string, value: string, options: string[], on: (v: string) => void) => (
    <SheetField label={label}>
      <Combobox className="w-full" value={value} options={options} onValueChange={on} aria-label={label} />
    </SheetField>
  );
  const numIn = (label: string, value: number | null, on: (v: number | null) => void) => (
    <SheetField label={label}>
      <NumField value={value ?? 0} onChange={(v) => on(v)} />
    </SheetField>
  );
  const failed = res.checks.filter((c) => c.ok !== true);
  const money2 = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const feeValue = res.state === "none" ? 0 : (res.amount ?? 0);
  const feeAmount = res.state === "none" ? "$0.00" : res.amount === null ? "On delivery" : money2(res.amount);

  return (
    <RailCard title="Simulator" icon={<FlaskConical />}>
      {!ready && !editing ? (
        <div className="flex flex-col items-center gap-1 px-4 py-6 text-center">
          <span className="text-sm text-foreground">Configure the fee to see its value</span>
          <span className="text-xs text-muted-foreground">
            {ship.name} · {PRODUCTS.find((p) => p.id === o.productId)?.name} · {gal.toLocaleString()} gal
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 py-3">
          {editing ? (
            <div className="flex flex-col gap-3">
              {pick(
                "Ship-to",
                ship.name,
                SHIPTOS.map((x) => x.name),
                (n) => {
                  const s2 = SHIPTOS.find((x) => x.name === n)!;
                  const p2 = rows.find((r) => r.shiptoId === s2.id)?.productId ?? o.productId;
                  set({ shiptoId: s2.id, productId: p2 });
                }
              )}
              {pick(
                "Product",
                PRODUCTS.find((p) => p.id === o.productId)?.name ?? "",
                products.map((id) => PRODUCTS.find((p) => p.id === id)!.name),
                (n) => set({ productId: PRODUCTS.find((p) => p.name === n)!.id })
              )}
              <SwitchRow label="Delivered" checked={o.delivered} onChange={(delivered) => set({ delivered })} />
              <SheetField label={o.delivered ? "Delivered" : "Planned"}>
                <Input type="datetime-local" value={local(o.deliveryAt)} onChange={(e) => e.target.value && set({ deliveryAt: new Date(e.target.value).getTime() })} />
              </SheetField>
              {numIn(o.delivered ? "Delivered (gal)" : "Ordered (gal)", o.gallons, (gallons) => set({ gallons }))}
              {needs.created && (
                <SheetField label="Ordered">
                  <Input type="datetime-local" value={local(o.createdAt)} onChange={(e) => e.target.value && set({ createdAt: new Date(e.target.value).getTime() })} />
                </SheetField>
              )}
              {needs.orderType && pick("Order type", o.orderType, ORDER_TYPES, (v) => set({ orderType: v as "Delivery" | "Extraction" }))}
              {needs.vendor && pick("Vendor", o.vendor, [FIRST_PARTY, ...VENDORS], (v) => set({ vendor: v }))}
              {needs.assets && numIn("Assets", o.assets, (assets) => set({ assets }))}
              {needs.assetType && pick("Asset type", o.assetType, ASSET_TYPES, (assetType) => set({ assetType }))}
              {needs.miles && numIn("Distance (mi)", o.miles, (miles) => set({ miles }))}
              {needs.minutes && numIn("Time on site (min)", o.minutes, (minutes) => set({ minutes }))}
              <Button size="sm" onClick={() => setEditing(false)}>
                Calculate
              </Button>
            </div>
          ) : (
            <>
              {/* ONE QUIET BLOCK (Yash, 2026-11-24) — the fee's amount leads; the
                  order under it with its pencil; then product, fee, total in
                  one column of figures. No boxes inside the card. */}
              <div className="flex flex-col gap-0.5">
                <span className="text-2xl font-semibold tabular-nums">{feeAmount}</span>
                <span className="text-sm text-muted-foreground">{SIM_LINE[res.state]}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 flex-col text-sm">
                  <span className="truncate text-foreground">
                    {ship.name} · {PRODUCTS.find((p) => p.id === o.productId)?.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {when} · {gal.toLocaleString()} gal{o.delivered ? "" : " planned"}
                  </span>
                </span>
                <Button variant="ghost" size="icon-sm" className="shrink-0" aria-label="Edit order details" title="Edit order details" onClick={() => setEditing(true)}>
                  <Pencil />
                </Button>
              </div>
              {/* WHAT DIDN'T HOLD — read-only lines, nothing to remove here. */}
              {failed.length > 0 && (
                <ul className="flex flex-col gap-1 text-sm">
                  {failed.map((c, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-2">
                      <span className="text-foreground">{c.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{c.ok === null ? "At delivery" : "Not met"}</span>
                    </li>
                  ))}
                </ul>
              )}
              <dl className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="flex min-w-0 flex-col">
                    <span className="text-foreground">Product price</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {gal.toLocaleString()} gal × {perGalText(perGal)}
                    </span>
                  </dt>
                  <dd className="tabular-nums text-muted-foreground">{money2(productTotal)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="flex min-w-0 flex-col">
                    <span className="truncate text-foreground">{fee.name || "This fee"}</span>
                    <span className="truncate text-xs text-muted-foreground">{res.state === "none" ? "Not charged" : calcText(fee, facts)}</span>
                  </dt>
                  <dd className="font-medium tabular-nums">{feeAmount}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-1">
                  <dt className="font-medium">Total</dt>
                  <dd className="font-semibold tabular-nums">{money2(productTotal + feeValue)}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      )}
    </RailCard>
  );
}
