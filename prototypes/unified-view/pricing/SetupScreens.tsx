import * as React from "react";
import { toast } from "sonner";
import { Building2, Copy, History, MoreHorizontal, Pencil, Percent, Power, Tag } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { HangingAdd } from "../HangingAdd";
import { TwoLineCell, type ListColumn } from "../ListTable";
import { RecordViews, type ViewRow, type ViewTab } from "../masterdata/RecordViews";
import type { ListFacet } from "../ListFilters";
import { RecordSheet, useDraftSaveState, DraftStatusChip } from "../RecordSheet";
import { ActivityCard, SheetRail, type TimelineEntry } from "../SheetCards";
import { StandardList } from "../StandardList";
import { TokenMultiSelect } from "../TokenMultiSelect";
import { changeSummary, fmtWhen, type ChangeRecord, type Entity, type EntityMap, type SetupField } from "./changeLog";
import { fitTab } from "./customerShiptoViews";
import { ChangeSheet } from "./ChangeSheet";
import {
  createSetup,
  logSetup,
  metaOf,
  saveSetupChange,
  setSetupActive,
  updateSetup,
  useChangeLog,
  type MarginProductRow,
  type SetupAudit,
  type SetupMeta,
  type VolumeTier,
} from "./changeLogStore";
import { fitColumns } from "./fitColumns";
import { HUBS, perGal } from "./pricingConfig";
import { CATEGORIES, PRODUCTS } from "./seed";

/*
  PRICING SETUP — RATE TYPE, MARKET, MARGIN (Yash, 2026-11-17). The dev
  site's three setup pages, on the standard list and the record sheet:

  · Rate type — name, description, shown on Today's pricing, status.
  · Market — name, market address, hubs, status.
  · Margin — name, description, applied to all products or to specific ones
    (category · products · type · rate per row), fixed or volume-based
    (start · end · rate per tier), status.

  Row ⋯: Edit, Duplicate, Deactivate / Activate. Add opens a create sheet
  (its footer creates it); an existing record's sheet autosaves (UV
  interactions §1). EVERY RECORD HAS ITS ACTIVITY — the sheet's right column:
  its price changes from the change log, and every other edit made on it.
*/

type Kind = "rateType" | "market" | "margin";
const KIND: Record<Kind, { noun: string; many: string; title: string; icon: React.ReactNode }> = {
  rateType: { noun: "rate type", many: "rate types", title: "Rate type", icon: <Tag /> },
  market: { noun: "market", many: "markets", title: "Market", icon: <Building2 /> },
  margin: { noun: "margin", many: "margins", title: "Margin", icon: <Percent /> },
};

type K = "name" | "desc" | "todays" | "address" | "hubs" | "applies" | "type" | "rate" | "status" | "actions";

const COLUMNS: Record<Kind, ListColumn<K>[]> = {
  rateType: [
    { key: "name", label: "Rate type", width: 200, sortable: true },
    { key: "desc", label: "Description", width: 260, sortable: true },
    { key: "todays", label: "Today's pricing", width: 140, sortable: true },
    { key: "status", label: "Status", width: 120, sortable: true },
    { key: "actions", label: "", width: 44 },
  ],
  market: [
    { key: "name", label: "Market", width: 180, sortable: true },
    { key: "address", label: "Market address", width: 240, sortable: true },
    { key: "hubs", label: "Hubs", width: 200, sortable: true },
    { key: "status", label: "Status", width: 120, sortable: true },
    { key: "actions", label: "", width: 44 },
  ],
  margin: [
    { key: "name", label: "Name", width: 220, sortable: true },
    { key: "desc", label: "Description", width: 240, sortable: true },
    { key: "applies", label: "Applied to products", width: 170, sortable: true },
    { key: "type", label: "Type", width: 120, sortable: true },
    { key: "rate", label: "Rate", width: 120, sortable: true },
    { key: "status", label: "Status", width: 120, sortable: true },
    { key: "actions", label: "", width: 44 },
  ],
};

const statusText = (m: SetupMeta) => (m.active ? "Active" : "Deactivated");
const rateText = (e: Entity, m: SetupMeta) =>
  m.rateKind === "volume"
    ? `${m.tiers?.length ?? 0} tiers`
    : m.appliesTo === "specific"
      ? `${m.productRows?.length ?? 0} rates`
      : m.unit === "%"
        ? `${e.value ?? 0}%`
        : perGal(e.value ?? 0);

function cellText(e: Entity, m: SetupMeta, key: K): string {
  switch (key) {
    case "name":
      return e.name;
    case "desc":
      return e.desc || "—";
    case "todays":
      return m.showInTodays ? "Shown" : "Hidden";
    case "address":
      return m.address || "—";
    case "hubs":
      return m.hubs?.join(", ") || "—";
    case "applies":
      return m.appliesTo === "specific" ? `${new Set((m.productRows ?? []).flatMap((r) => r.products)).size} products` : "All products";
    case "type":
      return m.rateKind === "volume" ? "Volume based" : "Fixed";
    case "rate":
      return rateText(e, m);
    case "status":
      return statusText(m);
    default:
      return "";
  }
}

export const RateTypeSetupScreen = () => <SetupScreen kind="rateType" />;
export const MarketSetupScreen = () => <SetupScreen kind="market" />;
export const MarginSetupScreen = () => <SetupScreen kind="margin" />;

function SetupScreen({ kind }: { kind: Kind }) {
  const log = useChangeLog();
  const k = KIND[kind];
  const rows = React.useMemo(() => log.entities.filter((e) => e.setting === kind), [log.entities, kind]);
  const [open, setOpen] = React.useState<{ id: string | null; from?: string } | null>(null);
  const [activity, setActivity] = React.useState<string | null>(null);
  const [deactivating, setDeactivating] = React.useState<Entity | null>(null);
  const meta = (e: Entity) => metaOf(e, log.meta);
  const columns = React.useMemo(
    () => fitColumns(COLUMNS[kind], rows.slice(0, 25), (e, key) => [cellText(e, metaOf(e, log.meta), key)], ["status"]),
    [rows, log.meta, kind]
  );
  const facetKeys: K[] = kind === "margin" ? ["status", "type", "applies"] : kind === "rateType" ? ["status", "todays"] : ["status"];
  const facets: ListFacet[] = facetKeys.map((key) => ({
    key,
    label: COLUMNS[kind].find((c) => c.key === key)!.label,
    options: [...new Set(rows.map((e) => cellText(e, meta(e), key)))].sort(),
  }));

  return (
    <>
      <StandardList<Entity, K>
        rows={rows}
        columns={columns}
        rowId={(e) => e.id}
        text={(e, key) => cellText(e, meta(e), key)}
        renderCell={(e, key) => {
          const m = meta(e);
          if (key === "status") return m.active ? <Pill kind="success">Active</Pill> : <Pill>Deactivated</Pill>;
          const t = cellText(e, m, key);
          return t === "—" ? <span className="text-muted-foreground">—</span> : t;
        }}
        rowMenu={(e) => {
          const m = meta(e);
          return (
            <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${e.name}`} onClick={(ev) => ev.stopPropagation()}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => setOpen({ id: e.id })}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setActivity(e.id)}>
                      <History />
                      History
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setOpen({ id: null, from: e.id })}>
                      <Copy />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant={m.active ? "destructive" : "default"}
                      onSelect={() => {
                        if (m.active) return setDeactivating(e);
                        setSetupActive(e.id, true);
                        toast.success(`${e.name} activated`);
                      }}
                    >
                      <Power />
                      {m.active ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
          );
        }}
        facets={facets}
        facetValues={(e, f) => [cellText(e, meta(e), f as K)]}
        storageKey={`pricing-setup-${kind}`}
        noun={k.many}
        nounOne={k.noun}
        searchPlaceholder={`Search ${k.many}…`}
        ctaLabel={`Add ${k.noun}`}
        onCreate={() => setOpen({ id: null })}
        onOpen={(e) => setOpen({ id: e.id })}
        openLabel={(e) => `Open ${e.name}`}
        emptyIcon={k.icon}
      />
      {open && (
        <SetupSheet
          key={`${open.id ?? "new"}:${open.from ?? ""}`}
          kind={kind}
          id={open.id}
          from={open.from}
          onClose={() => setOpen(null)}
          onActivity={(id) => {
            setOpen(null);
            setActivity(id);
          }}
        />
      )}
      {activity && <SetupActivitySheet kind={kind} id={activity} onClose={() => setActivity(null)} />}
      <DeactivateDialog
        kind={kind}
        name={deactivating?.name ?? ""}
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={() => {
          if (!deactivating) return;
          setSetupActive(deactivating.id, false);
          toast.success(`${deactivating.name} deactivated`);
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------- the sheet -- */

interface Draft {
  name: string;
  desc: string;
  value: string;
  meta: SetupMeta;
}

const blankMeta = (kind: Kind): SetupMeta =>
  kind === "rateType"
    ? { active: true, showInTodays: true }
    : kind === "market"
      ? { active: true, address: "", hubs: [] }
      : { active: true, appliesTo: "all", rateKind: "fixed", unit: "$/gal", tiers: [{ from: 0, to: null, rate: 0 }], productRows: [] };

const list = (xs: string[] | undefined) => (xs?.length ? xs.join(", ") : "none");

/** What an open sheet changed, as the record's activity says it. The rate of a
 *  fixed margin is left out — the change log carries it. */
function diffOf(a: Draft, b: Draft): string[] {
  const out: string[] = [];
  if (a.name !== b.name) out.push(`Name: ${a.name} → ${b.name}`);
  if (a.desc !== b.desc) out.push("Description changed");
  const m0 = a.meta;
  const m1 = b.meta;
  if (m0.active !== m1.active) out.push(m1.active ? "Activated" : "Deactivated");
  if (m0.showInTodays !== m1.showInTodays) out.push(`Today's pricing: ${m1.showInTodays ? "shown" : "hidden"}`);
  if ((m0.address ?? "") !== (m1.address ?? "")) out.push(`Market address: ${m1.address || "none"}`);
  if (list(m0.hubs) !== list(m1.hubs)) out.push(`Hubs: ${list(m1.hubs)}`);
  if (m0.appliesTo !== m1.appliesTo) out.push(`Applied to: ${m1.appliesTo === "specific" ? "specific products" : "all products"}`);
  if (m0.rateKind !== m1.rateKind) out.push(`Type: ${m1.rateKind === "volume" ? "volume based" : "fixed"}`);
  if (m0.unit !== m1.unit) out.push(`Unit: ${m1.unit}`);
  if (JSON.stringify(m0.tiers) !== JSON.stringify(m1.tiers) && m1.rateKind === "volume") out.push("Volume tiers changed");
  if (JSON.stringify(m0.productRows) !== JSON.stringify(m1.productRows) && m1.appliesTo === "specific") out.push("Product rates changed");
  return out;
}

/** A margin's one rate, as the sheet reads it: the first product row's, the
 *  first tier's, or the fixed rate. */
const rateOf = (d: Draft) =>
  d.meta.appliesTo === "specific"
    ? (d.meta.productRows?.[0]?.rate ?? 0)
    : d.meta.rateKind === "volume"
      ? (d.meta.tiers?.[0]?.rate ?? 0)
      : Number(d.value) || 0;

/** The record's own fields that moved, old → new, for the Activity feed. */
function fieldsOf(a: Draft, b: Draft): { field: SetupField; from: string; to: string }[] {
  const out: { field: SetupField; from: string; to: string }[] = [];
  if (a.name.trim() !== b.name.trim()) out.push({ field: "name", from: a.name.trim(), to: b.name.trim() });
  if (a.desc !== b.desc) out.push({ field: "desc", from: a.desc, to: b.desc });
  if ((a.meta.address ?? "") !== (b.meta.address ?? "")) out.push({ field: "address", from: a.meta.address ?? "", to: b.meta.address ?? "" });
  if (list(a.meta.hubs) !== list(b.meta.hubs)) out.push({ field: "hubs", from: list(a.meta.hubs), to: list(b.meta.hubs) });
  if (!!a.meta.showInTodays !== !!b.meta.showInTodays)
    out.push({ field: "todays", from: a.meta.showInTodays ? "Shown" : "Hidden", to: b.meta.showInTodays ? "Shown" : "Hidden" });
  if (a.meta.active !== b.meta.active) out.push({ field: "active", from: a.meta.active ? "Active" : "Inactive", to: b.meta.active ? "Active" : "Inactive" });
  return out;
}

const ISO = (t: number) => new Date(t).toISOString();

function SetupSheet({
  kind,
  id,
  from,
  onClose,
  onActivity,
}: {
  kind: Kind;
  id: string | null;
  from?: string;
  onClose: () => void;
  onActivity: (id: string) => void;
}) {
  const log = useChangeLog();
  const k = KIND[kind];
  const creating = id === null;
  /* WHAT THE SHEET OPENED ON — read once; its own saves must not rebuild it. */
  const [start] = React.useState<Draft>(() => {
    const src = log.entities.find((e) => e.id === (id ?? from));
    if (!src) return { name: "", desc: "", value: "", meta: blankMeta(kind) };
    return {
      name: id ? src.name : `${src.name} (copy)`,
      desc: src.desc ?? "",
      value: src.value !== undefined ? String(src.value) : "",
      meta: { ...blankMeta(kind), ...metaOf(src, log.meta) },
    };
  });
  const [d, setD] = React.useState<Draft>(start);
  const setMeta = (patch: Partial<SetupMeta>) => setD((x) => ({ ...x, meta: { ...x.meta, ...patch } }));
  const saveState = useDraftSaveState(d);
  const session = React.useRef(`sheet-${Date.now()}`);
  const changeId = React.useRef<string | null>(null);

  /* AUTOSAVE — an existing record, 600ms after an edit settles. */
  React.useEffect(() => {
    if (creating) return;
    const t = window.setTimeout(() => {
      if (!d.name.trim()) return;
      updateSetup(id!, { name: d.name.trim(), desc: d.desc, meta: d.meta });
      logSetup(id!, session.current, diffOf(start, d), {
        before: { name: start.name, desc: start.desc, value: start.value === "" ? undefined : Number(start.value), meta: start.meta },
        action: "Updated",
      });
      /* EVERY EDIT IS A CHANGE IN THE ACTIVITY FEED (Yash, 2026-11-18) —
         the rate (any margin rate kind) with its price impact, and each
         field, reaching the ship-tos that use this record. */
      const amount = rateOf(d);
      changeId.current = saveSetupChange({
        changeId: changeId.current,
        id: id!,
        fields: fieldsOf(start, d),
        value:
          kind === "margin" && Number.isFinite(amount)
            ? { base: rateOf(start), amount, products: d.meta.appliesTo === "specific" ? d.meta.productRows?.[0]?.products : undefined }
            : undefined,
      });
    }, 600);
    return () => window.clearTimeout(t);
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = [
    !d.name.trim() && { key: "name", label: "Enter a name", target: "setup-details" },
    kind === "margin" &&
      d.meta.appliesTo === "all" &&
      d.meta.rateKind === "fixed" &&
      (d.value.trim() === "" || !Number.isFinite(Number(d.value))) && { key: "rate", label: "Enter a rate", target: "setup-rate" },
    kind === "margin" && d.meta.appliesTo === "specific" && !(d.meta.productRows ?? []).some((r) => r.products.length) && { key: "rows", label: "Add a product", target: "setup-rate" },
  ].filter(Boolean) as { key: string; label: string; target: string }[];

  const create = () => {
    if (missing.length) return;
    const value = kind === "margin" ? (d.meta.appliesTo === "specific" ? (d.meta.productRows?.[0]?.rate ?? 0) : d.meta.rateKind === "volume" ? (d.meta.tiers?.[0]?.rate ?? 0) : Number(d.value)) : undefined;
    createSetup(kind, d.name.trim(), d.desc.trim() || undefined, value, d.meta);
    toast.success(`${d.name.trim()} created`);
    onClose();
  };

  /* ITS ACTIVITY — price changes from the change log, and every other edit. */
  const entries: TimelineEntry[] = creating
    ? []
    : activityOf(id!, log.changes, log.audit[id!], log.entityMap)
        .map((x) => ({ at: ISO(x.at), by: x.by, changes: [x.change] }))
        .reverse();
  const [confirmOff, setConfirmOff] = React.useState(false);

  const body = (
    <div className="flex min-w-0 flex-col gap-10">
      <SheetSection title="Details" id="setup-details">
        <SheetField label="Name" required>
          <Input value={d.name} onChange={(e) => setD((x) => ({ ...x, name: e.target.value }))} placeholder={`Enter ${k.noun} name`} />
        </SheetField>
        {kind !== "market" && (
          <SheetField label="Description">
            <Textarea value={d.desc} onChange={(e) => setD((x) => ({ ...x, desc: e.target.value }))} placeholder="Enter description" rows={3} />
          </SheetField>
        )}
        {kind === "market" && (
          <>
            <SheetField label="Market address">
              <Input value={d.meta.address ?? ""} onChange={(e) => setMeta({ address: e.target.value })} placeholder="Start typing an address" />
            </SheetField>
            <SheetField label="Hubs">
              <TokenMultiSelect options={HUBS} value={d.meta.hubs ?? []} onChange={(hubs) => setMeta({ hubs })} addLabel="Add hubs" searchPlaceholder="Search hubs…" />
            </SheetField>
          </>
        )}
        {kind === "rateType" && (
          <SwitchRow label="Show in today's pricing" checked={!!d.meta.showInTodays} onChange={(v) => setMeta({ showInTodays: v })} />
        )}
        <SwitchRow label="Active" checked={d.meta.active} onChange={(v) => (!v && !creating ? setConfirmOff(true) : setMeta({ active: v }))} />
      </SheetSection>
      {kind === "margin" && <MarginRate d={d} setD={setD} setMeta={setMeta} />}
    </div>
  );

  return (
    <RecordSheet
      open
      onOpenChange={(v) => !v && onClose()}
      mode={creating ? "create" : "edit"}
      size={creating ? "form" : "data"}
      fit={kind === "margin" ? { tables: [[200, 220, 140, 140, 52]], rail: !creating } : undefined}
      createTitle={`Add ${k.noun}`}
      editTitle={d.name || k.title}
      createAction={`Create ${k.noun}`}
      editAction=""
      showCancel={false}
      noFooter={!creating}
      pending={creating ? missing : undefined}
      headerAside={
        creating ? undefined : (
          <span className="flex items-center gap-1.5">
            {d.meta.active ? <Pill kind="success">Active</Pill> : <Pill>Deactivated</Pill>}
            <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} showStatus={false} />
          </span>
        )
      }
      headerSubtitle={<span className="text-sm text-muted-foreground">{creating ? "Pricing setup" : k.title}</span>}
      onSubmit={create}
    >
      {creating ? (
        body
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]">
          {body}
          <SheetRail>
            <ActivityCard
              title="History"
              entries={entries}
              action={
                <Button variant="ghost" size="xs" onClick={() => onActivity(id!)}>
                  View all
                </Button>
              }
            />
          </SheetRail>
        </div>
      )}
      <DeactivateDialog kind={kind} name={d.name} open={confirmOff} onClose={() => setConfirmOff(false)} onConfirm={() => setMeta({ active: false })} />
    </RecordSheet>
  );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

/* ------------------------------------------------------------ margin rate -- */

function Choice<T extends string>({ id, value, options, onChange }: { id: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as T)} className="flex gap-6">
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

const TH = "px-3 py-2.5 text-left";

function MarginRate({
  d,
  setD,
  setMeta,
}: {
  d: Draft;
  setD: React.Dispatch<React.SetStateAction<Draft>>;
  setMeta: (p: Partial<SetupMeta>) => void;
}) {
  const m = d.meta;
  const rows = m.productRows ?? [];
  const tiers = m.tiers ?? [];
  const setRow = (i: number, patch: Partial<MarginProductRow>) => setMeta({ productRows: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const setTier = (i: number, patch: Partial<VolumeTier>) => setMeta({ tiers: tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const num = (v: string) => (v.trim() === "" ? 0 : Number(v) || 0);
  /* THE ROW JUST ADDED takes focus (DS ui §10f "Rows"). */
  const [added, setAdded] = React.useState<{ table: "rows" | "tiers"; i: number } | null>(null);

  return (
    <>
      <SheetSection title="Apply margin to">
        <Choice
          id="applies"
          value={m.appliesTo ?? "all"}
          options={[
            ["all", "All products"],
            ["specific", "Specific products"],
          ]}
          onChange={(appliesTo) => setMeta({ appliesTo, productRows: appliesTo === "specific" && !rows.length ? [{ category: "", products: [], kind: "Fixed", rate: 0 }] : rows })}
        />
      </SheetSection>

      {m.appliesTo === "specific" ? (
        <SheetSection
          title="Rates by product"
          id="setup-rate"
          flush
          hanging={
            <HangingAdd
              label="Add products"
              onClick={() => {
                setAdded({ table: "rows", i: rows.length });
                setMeta({ productRows: [...rows, { category: "", products: [], kind: "Fixed", rate: 0 }] });
              }}
            />
          }
        >
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[30%]" />
              <col className="w-[20%]" />
              <col />
              <col className="w-[52px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-fp-table-header">
                <th className={TH}>
                  <TableRequiredLabel required>Product category</TableRequiredLabel>
                </th>
                <th className={TH}>
                  <TableRequiredLabel required>Products</TableRequiredLabel>
                </th>
                <th className={TH}>
                  <TableRequiredLabel required>Type</TableRequiredLabel>
                </th>
                <th className={TH}>
                  <TableRequiredLabel required>Rate ($/gal)</TableRequiredLabel>
                </th>
                <th aria-hidden className="sticky right-0 z-10 border-l border-border bg-fp-table-header" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const cat = CATEGORIES.find((c) => c.name === r.category);
                const opts = PRODUCTS.filter((p) => !cat || p.categoryId === cat.id).map((p) => p.name);
                return (
                  <tr key={i} className="group/row h-11 border-b border-border last:border-b-0">
                    <td className="relative p-0">
                      {/* ONE VALUE — a row is one category; its several products are picked in the next cell. */}
                      <TableCellSelect
                        value={r.category}
                        options={CATEGORIES.map((c) => c.name)}
                        placeholder="Select category"
                        autoFocus={added?.table === "rows" && added.i === i}
                        aria-label={`Category, row ${i + 1}`}
                        onChange={(category) => setRow(i, { category, products: [] })}
                      />
                    </td>
                    <td className="relative p-0">
                      <TableCellMultiSelect
                        values={r.products}
                        options={opts}
                        placeholder="Select products"
                        unitLabel="product"
                        aria-label={`Products, row ${i + 1}`}
                        onChange={(products) => setRow(i, { products })}
                      />
                    </td>
                    <td className="relative p-0">
                      {/* ONE VALUE — a row's rate is either fixed or volume based. */}
                      <TableCellSelect
                        value={r.kind}
                        options={["Fixed", "Volume based"]}
                        aria-label={`Type, row ${i + 1}`}
                        onChange={(kind) => setRow(i, { kind: kind as MarginProductRow["kind"] })}
                      />
                    </td>
                    <td className="relative p-0">
                      <TableCellInput numeric value={String(r.rate)} aria-label={`Rate, row ${i + 1}`} onChange={(v) => setRow(i, { rate: num(v) })} />
                    </td>
                    <td className="sticky right-0 z-10 border-l border-border bg-popover p-0 text-center">
                      {rows.length > 1 && <TableRowRemove aria-label={`Remove ${r.category || `product rate ${i + 1}`}`} onRemove={() => setMeta({ productRows: rows.filter((_, j) => j !== i) })} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SheetSection>
      ) : (
        <>
          <SheetSection title="Rate details" id="setup-rate">
            <Choice
              id="rate-kind"
              value={m.rateKind ?? "fixed"}
              options={[
                ["fixed", "Fixed"],
                ["volume", "Volume based"],
              ]}
              onChange={(rateKind) => setMeta({ rateKind, tiers: rateKind === "volume" && !tiers.length ? [{ from: 0, to: null, rate: 0 }] : tiers })}
            />
            {m.rateKind !== "volume" && (
              <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-4">
                <SheetField label="Rate" required>
                  <Input inputMode="decimal" value={d.value} onChange={(e) => setD((x) => ({ ...x, value: e.target.value }))} placeholder="0.0000" />
                </SheetField>
                <SheetField label="Unit">
                  <Combobox className="w-full" value={m.unit ?? "$/gal"} options={["$/gal", "%"]} onValueChange={(u) => setMeta({ unit: u as SetupMeta["unit"] })} aria-label="Unit" />
                </SheetField>
              </div>
            )}
          </SheetSection>
          {m.rateKind === "volume" && (
            <SheetSection
              title="Volume tiers"
              flush
              hanging={
                <HangingAdd
                  label="Add tier"
                  onClick={() => {
                    setAdded({ table: "tiers", i: tiers.length });
                    setMeta({ tiers: [...tiers, { from: (tiers[tiers.length - 1]?.to ?? 0) + 1, to: null, rate: 0 }] });
                  }}
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
                      <TableRequiredLabel required>Start volume (gal)</TableRequiredLabel>
                    </th>
                    <th className={TH}>
                      <TableRequiredLabel>End volume (gal)</TableRequiredLabel>
                    </th>
                    <th className={TH}>
                      <TableRequiredLabel required>Rate ($/gal)</TableRequiredLabel>
                    </th>
                    <th aria-hidden className="sticky right-0 z-10 border-l border-border bg-fp-table-header" />
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((t, i) => (
                    <tr key={i} className="group/row h-11 border-b border-border last:border-b-0">
                      <td className="relative p-0">
                        <TableCellInput numeric autoFocus={added?.table === "tiers" && added.i === i} value={String(t.from)} aria-label={`Start volume, tier ${i + 1}`} onChange={(v) => setTier(i, { from: num(v) })} />
                      </td>
                      <td className="relative p-0">
                        <TableCellInput
                          numeric
                          placeholder="No end"
                          value={t.to === null ? "" : String(t.to)}
                          aria-label={`End volume, tier ${i + 1}`}
                          onChange={(v) => setTier(i, { to: v.trim() === "" ? null : num(v) })}
                        />
                      </td>
                      <td className="relative p-0">
                        <TableCellInput numeric value={String(t.rate)} aria-label={`Rate, tier ${i + 1}`} onChange={(v) => setTier(i, { rate: num(v) })} />
                      </td>
                      <td className="sticky right-0 z-10 border-l border-border bg-popover p-0 text-center">
                        {tiers.length > 1 && <TableRowRemove aria-label={`Remove tier ${i + 1}`} onRemove={() => setMeta({ tiers: tiers.filter((_, j) => j !== i) })} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SheetSection>
          )}
        </>
      )}
    </>
  );
}

/* --------------------------------------------------------- the activity -- */

interface ActivityItem {
  key: string;
  at: number;
  by: string;
  change: string;
  action: string;
  changeId?: string;
}

/** A record's whole activity, newest first: its price changes from the change
 *  log (created, rate changed) and every other edit on it. */
/** The four action words (Yash, 2026-11-17); Activated is Deactivated's pair. */
const AUDIT_ACTION: Record<string, string> = { Created: "Added", Edited: "Updated", "Rolled back": "Updated" };

function activityOf(id: string, changes: ChangeRecord[], audit: SetupAudit[] | undefined, ents: EntityMap): ActivityItem[] {
  return [
    ...changes
      .filter((c) => c.status !== "canceled" && c.edits.some((e) => e.entityIds.includes(id) && (e.operation === "create" || e.operation === "edit")))
      .map((c) => {
        const created = c.edits.some((e) => e.operation === "create");
        return { key: c.id, at: c.effectiveAt, by: c.by, change: created ? "Created" : changeSummary(c, ents), action: created ? "Added" : "Updated", changeId: c.id };
      }),
    ...(audit ?? []).map((a) => ({ key: a.session, at: a.at, by: a.by, change: a.changes.join(" · "), action: AUDIT_ACTION[a.action] ?? a.action })),
  ].sort((a, b) => b.at - a.at);
}


/** DEACTIVATE ASKS FIRST — a margin, rate type or market in use stops being
 *  offered for new pricing. Activate does not ask. */
function DeactivateDialog({ kind, name, open, onClose, onConfirm }: { kind: Kind; name: string; open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            It can no longer be picked for new pricing. Prices that use it keep it until they are changed. You can activate the {KIND[kind].noun} again at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep active</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * THE FULL HISTORY — every change on the record, searchable, filterable by
 * action and person. Read-only, so no footer (rule 28).
 */
function SetupActivitySheet({ kind, id, onClose }: { kind: Kind; id: string; onClose: () => void }) {
  const log = useChangeLog();
  const [changeId, setChangeId] = React.useState<string | null>(null);
  const e = log.entities.find((x) => x.id === id);
  const items = activityOf(id, log.changes, log.audit[id], log.entityMap);
  const tab: ViewTab = fitTab({
    key: "history",
    label: "History",
    noun: "changes",
    one: "change",
    columns: [
      { key: "when", label: "Date & time", width: 180, sortable: true },
      { key: "action", label: "Action", width: 130, sortable: true },
      { key: "change", label: "Change", width: 320, sortable: true },
    ],
    rows: items.map(
      (x): ViewRow => ({
        id: x.key,
        text: { when: fmtWhen(x.at), change: x.change, action: x.action, by: x.by },
        sort: { when: x.at },
        status: x.action,
        values: { action: x.action, by: x.by },
      })
    ),
    facets: [
      { key: "action", label: "Action" },
      { key: "by", label: "Made by" },
    ],
    renderCell: (r, key) =>
      key === "when" ? <TwoLineCell title={r.text.when} description={r.text.by} /> : key === "action" ? <Pill>{r.text.action}</Pill> : undefined,
    /* A price change opens the change itself, as on Customer and Ship-to. */
    onOpen: (r) => {
      const cid = items.find((x) => x.key === r.id)?.changeId;
      if (cid) setChangeId(cid);
    },
    nameOf: (r) => r.text.change,
  });
  const tab2: ViewTab = { ...tab, columns: tab.columns.map((c) => (c.key === "change" ? { ...c, width: Math.min(c.width ?? 320, 360) } : c)) };
  return (
    <RecordSheet
      size="full"
      open
      onOpenChange={(v) => !v && onClose()}
      mode="edit"
      editTitle={`${e?.name ?? ""} history`}
      createTitle=""
      createAction=""
      showCancel={false}
      stepNav={false}
      noFooter
      headerSubtitle={<span className="text-sm text-muted-foreground">{KIND[kind].title}</span>}
      onSubmit={onClose}
    >
      <RecordViews hideSingleTab resetKey={id} tabs={[tab2]} searchPlaceholder="Search this history" historyKey={`pricing-setup-activity-${kind}`} />
      <ChangeSheet id={changeId} onClose={() => setChangeId(null)} onOpen={setChangeId} level={2} />
    </RecordSheet>
  );
}
