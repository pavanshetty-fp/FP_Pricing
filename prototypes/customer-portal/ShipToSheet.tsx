import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Ban, ClipboardPlus, History, Link2, MoreHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetField, SheetSection, SheetSteps } from "@/components/side-sheet/parts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MultiSelectList } from "@/components/ui/multi-select-list";
import {
  TableCellInput,
  TableCellMultiSelect,
  TableCellSelect,
  TableRequiredLabel,
  TableRowRemove,
} from "@/components/form-layout/table-cells";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { kindTone, ACTIVE_KIND } from "../unified-view/statusKind";
import { CELL, DraftStatusChip, RecordSheet, useDraftSaveState } from "../unified-view/RecordSheet";
import { HangingAdd } from "../unified-view/HangingAdd";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LocationMap } from "./LocationMap";
import { searchPlaces } from "./geo";
import { ActivityLogSheet } from "./ActivityLogSheet";
import { assetLog, shipToLog } from "./activityLog";
import { PendingStrip, type PendingItem } from "../unified-view/PendingStrip";
import { ASSET_TYPES, PRODUCT_CATEGORIES, assetById, clampPreferred, productsIn, sizeRequired, type Asset, type ShipTo } from "./orders";
import { BatteryCell, LevelReading } from "./TankLevel";
import { DeliveryWindowTimeline } from "../unified-view/DeliveryWindowTimeline";
import {
  blankAsset,
  blankShipTo,
  createShipTo,
  openOrdersForAsset,
  openOrdersForShipTo,
  setShipToStatus,
  updateShipTo,
  type AssetDraft,
  type ShipToDraft,
  useShipTos,
} from "./sites";

/*
  THE SHIP-TO SHEET (Pavan, 2026-10-13). The customer's own record of a
  delivery site — no approval. Creating takes the act (Create ship-to), then
  edits autosave.

  ITS ASSETS ARE A TABLE IN IT (ux §Forms — like inputs are a table): adding
  a ship-to is where its tanks are usually added too, each with its own
  coordinates inside the site and whether it is rented. The rest of an
  asset — its monitor, notes — is on the asset's own sheet.
*/

const num = (v: string): number | null => {
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
};

const draftOf = (s: ShipTo): ShipToDraft => {
  const { id: _i, audit: _a, assets, ...rest } = s;
  void _i;
  void _a;
  return {
    ...rest,
    assets: assets.map((a) => {
      const { audit: _x, level: _l, ...r } = a;
      void _x;
      void _l;
      return r;
    }),
  };
};

/*
  THE SHIP-TO'S ASSETS, editable in place — a new row IS a new asset, so the
  table carries every field the asset sheet creates (Pavan, 2026-10-14: the
  same data on every screen that makes or shows it — eval "field reach").
  Too many columns for the sheet, so it scrolls sideways with the Asset
  column held. Created by and Last filled are facts, not inputs: they are on
  the asset's own sheet. Notes and status are there too.
*/
function AssetsTable({
  rows: real,
  blank,
  focusRow,
  onChange,
  onLog,
}: {
  rows: AssetDraft[];
  /**
   * ONE ROW IS ALWAYS THERE (Pavan, 2026-10-14) — with no assets the table
   * shows this blank row; typing in it makes it the first asset. It is not
   * an asset until then, so it is not checked or saved.
   */
  blank: AssetDraft;
  focusRow?: number;
  onChange: (next: AssetDraft[]) => void;
  /** Opens a row's activity log (Pavan, 2026-10-13). */
  onLog: (i: number) => void;
}) {
  const ghost = real.length === 0;
  const rows = ghost ? [blank] : real;
  const update = (i: number, p: Partial<AssetDraft>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const head = (label: string, required = false, align: "left" | "right" | "center" = "left") => (
    <th className={cn("px-3 py-2.5 whitespace-nowrap", align === "right" ? "" : align === "center" ? "text-center" : "text-left")}>
      <TableRequiredLabel required={required}>{label}</TableRequiredLabel>
    </th>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1930px] table-fixed border-collapse">
        <colgroup>
          <col className="w-[180px]" />
          <col className="w-[120px]" />
          <col className="w-[150px]" />
          <col className="w-[120px]" />
          <col className="w-[120px]" />
          <col className="w-[150px]" />
          <col className="w-[150px]" />
          <col className="w-[100px]" />
          <col className="w-[100px]" />
          <col className="w-[130px]" />
          <col className="w-[150px]" />
          <col className="w-[100px]" />
          <col className="w-[110px]" />
          <col className="w-[110px]" />
          <col className="w-[92px]" />
          <col className="w-[104px]" />
          <col className="w-[52px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            {head("Asset", true)}
            {head("Unique ID", true)}
            {head("RFID code")}
            {head("ERP ID")}
            {head("Type", true)}
            {head("Categories", true)}
            {head("Products", true)}
            {head("Size (gal)", true, "right")}
            {/* A NAMED CHECKBOX COLUMN — interactions T5. */}
            {head("Monitor", false, "center")}
            {head("Monitor ID")}
            {head("Current level")}
            {head("Battery")}
            {head("Latitude", true, "right")}
            {head("Longitude", true, "right")}
            {head("Rented")}
            {head("Activity log")}
            <th aria-hidden className="sticky right-0 z-10 border-l border-border bg-fp-table-header" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const name = r.name || `asset ${i + 1}`;
            return (
              <tr key={r.id ?? `new-${i}`} className="group/row h-11 border-b border-border last:border-b-0">
                <td className="relative sticky left-0 z-10 bg-fp-surface-1b p-0">
                  <TableCellInput
                    value={r.name}
                    placeholder="Enter name"
                    autoFocus={i === focusRow}
                    aria-label={`Name of ${name}`}
                    onChange={(v) => update(i, { name: v })}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellInput value={r.code} placeholder="e.g. CL-A3" aria-label={`Unique ID of ${name}`} onChange={(v) => update(i, { code: v })} />
                </td>
                <td className="relative p-0">
                  <TableCellInput value={r.rfid} placeholder="—" aria-label={`RFID code of ${name}`} onChange={(v) => update(i, { rfid: v.toUpperCase() })} />
                </td>
                <td className="relative p-0">
                  <TableCellInput value={r.erpId} placeholder="—" aria-label={`ERP ID of ${name}`} onChange={(v) => update(i, { erpId: v })} />
                </td>
                <td className="relative p-0">
                  {/* ONE VALUE — the asset's type, not a row of its own (DS ui §10f). */}
                  <TableCellSelect
                    value={r.type}
                    options={ASSET_TYPES}
                    placeholder="Select type"
                    aria-label={`Type of ${name}`}
                    onChange={(v) => update(i, { type: v })}
                  />
                </td>
                <td className="relative p-0">
                  {/* CATEGORIES NARROW THE PRODUCTS — as on the asset sheet. */}
                  <TableCellMultiSelect
                    values={r.categories}
                    options={[...PRODUCT_CATEGORIES]}
                    placeholder="Select"
                    unitLabel="category"
                    aria-label={`Product categories of ${name}`}
                    onChange={(v) => {
                      const ok = productsIn(v);
                      update(i, { categories: v, products: r.products.filter((p) => ok.includes(p)) });
                    }}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellMultiSelect
                    values={r.products}
                    options={productsIn(r.categories)}
                    placeholder="Select"
                    unitLabel="product"
                    aria-label={`Products of ${name}`}
                    onChange={(v) => update(i, { products: v })}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellInput
                    numeric
                    value={r.capacity ? String(r.capacity) : ""}
                    placeholder="0"
                    aria-label={`Size of ${name}`}
                    onChange={(v) => update(i, { capacity: num(v) ?? 0 })}
                  />
                </td>
                <td className="px-3 text-center">
                  <Checkbox
                    checked={r.monitor}
                    onCheckedChange={(c) => update(i, { monitor: c === true, monitorId: c === true ? r.monitorId : "" })}
                    aria-label={`${name} has a tank monitor`}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellInput
                    value={r.monitorId}
                    placeholder={r.monitor ? "Enter ID" : "—"}
                    disabled={!r.monitor}
                    aria-label={`Tank monitor ID of ${name}`}
                    onChange={(v) => update(i, { monitorId: v.toUpperCase() })}
                  />
                </td>
                {/* THE MONITOR'S READING — read-only, from the saved asset. */}
                <td className="px-3">
                  {r.id && r.monitor ? <LevelReading asset={assetById(r.id)} /> : <span className="text-sm text-muted-foreground">—</span>}
                </td>
                <td className="px-3">
                  {r.id && r.monitor ? <BatteryCell asset={assetById(r.id)} /> : <span className="text-sm text-muted-foreground">—</span>}
                </td>
                <td className="relative p-0">
                  <TableCellInput
                    numeric
                    value={r.lat === null ? "" : String(r.lat)}
                    placeholder="—"
                    aria-label={`Latitude of ${name}`}
                    onChange={(v) => update(i, { lat: num(v) })}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellInput
                    numeric
                    value={r.lng === null ? "" : String(r.lng)}
                    placeholder="—"
                    aria-label={`Longitude of ${name}`}
                    onChange={(v) => update(i, { lng: num(v) })}
                  />
                </td>
                {/* RENTED IS SET WHEN THE ASSET IS ADDED (Pavan, 2026-10-13) —
                    a saved asset shows it, read-only, as the Assets list does. */}
                <td className="px-3">
                  {r.id ? (
                    r.rented ? <Pill>Rented</Pill> : <span className="text-sm">Owned</span>
                  ) : (
                    <Checkbox
                      checked={r.rented}
                      onCheckedChange={(c) => update(i, { rented: c === true })}
                      aria-label={`${name} is rented`}
                    />
                  )}
                </td>
                {/* THE ROW'S HISTORY, on its own sheet over this one. */}
                <td className="px-1.5">
                  {!ghost && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    aria-label={`Activity log of ${name}`}
                    onClick={() => onLog(i)}
                  >
                    <History />
                    Log
                  </Button>
                  )}
                </td>
                <td className="sticky right-0 z-10 border-l border-border bg-popover p-0 text-center">
                  {!ghost && <TableRowRemove
                    aria-label={`Remove ${name}`}
                    /* AN ASSET WITH AN ORDER ON ITS WAY STAYS. */
                    disabled={Boolean(r.id && openOrdersForAsset(r.id) > 0)}
                    onRemove={() => onChange(rows.filter((_, j) => j !== i))}
                  />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/*
  MAP EXISTING ASSETS (Pavan, 2026-10-14) — tick assets that stand at other
  ship-tos and add them here; saving moves them. Ticks are a draft until Add.
*/
function MapExisting({
  options,
  onAdd,
}: {
  options: { a: Asset; from: ShipTo }[];
  onAdd: (rows: AssetDraft[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<string[]>([]);
  const label = (o: { a: Asset; from: ShipTo }) => `${o.a.name} · ${o.from.name}`;
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPicked([]);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={options.length === 0}>
          <Link2 />
          Map existing assets
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <MultiSelectList
          options={options.map(label)}
          value={picked}
          onChange={setPicked}
          placeholder="Search assets…"
          empty="No asset found."
          searchable
        />
        <div className="flex justify-end gap-2 border-t border-border p-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={picked.length === 0}
            onClick={() => {
              onAdd(
                options
                  .filter((o) => picked.includes(label(o)))
                  .map((o) => {
                    const { audit: _a, level: _l, ...rest } = o.a;
                    void _a;
                    void _l;
                    return rest;
                  })
              );
              setOpen(false);
              setPicked([]);
            }}
          >
            Add {picked.length || ""}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* THE TWO STEPS (Pavan, 2026-10-14) — the ship-to itself, then the assets
   mapped to it. Create walks them in order; an existing ship-to opens on
   step 1 and either step is a press away. */
type Step = "details" | "assets";

export function ShipToSheet({
  shipTo,
  open,
  creating,
  onOpenChange,
  onCreateOrder,
  onCreated,
  level,
}: {
  shipTo: ShipTo | null;
  open: boolean;
  creating: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateOrder?: (shipTo: string, assetIds: string[]) => void;
  /** Hands the new ship-to back — the asset sheet's "New ship-to" picks it. */
  onCreated?: (s: ShipTo) => void;
  /** 2 when opened over another sheet. */
  level?: 1 | 2;
}) {
  const shipTos = useShipTos();
  const [step, setStep] = React.useState<Step>("details");
  const [raised, setRaised] = React.useState(false);
  const [draft, setDraft] = React.useState<ShipToDraft | null>(null);
  const [focusRow, setFocusRow] = React.useState<number | undefined>();
  const typed = React.useRef(false);
  const [logFor, setLogFor] = React.useState<number | null>(null);
  const [shipLog, setShipLog] = React.useState(false);
  const lastSaved = React.useRef<string | null>(null);
  const key = creating ? "new" : (shipTo?.id ?? null);
  React.useEffect(() => {
    /* CLOSED, THE DRAFT GOES — the next record must not start from the
       last one's, or opening it reads as an edit ("Draft saved"). */
    if (!open) {
      setDraft(null);
      return;
    }
    const d = creating ? blankShipTo() : shipTo ? draftOf(shipTo) : null;
    lastSaved.current = JSON.stringify(d);
    setDraft(d);
    setFocusRow(undefined);
    setStep("details");
    setRaised(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  React.useEffect(() => {
    if (creating || !shipTo || !draft) return;
    const shape = JSON.stringify(draft);
    if (shape === lastSaved.current) return;
    const t = window.setTimeout(() => {
      const before = draftOf(shipTo).assets.length;
      lastSaved.current = shape;
      updateShipTo(
        shipTo.id,
        draft,
        draft.assets.length > before
          ? `${draft.assets.length - before} asset${draft.assets.length - before === 1 ? "" : "s"} added`
          : draft.assets.length < before
            ? "Asset removed"
            : undefined
      );
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, shipTo, creating]);
  const saveState = useDraftSaveState(draft, open && !creating);

  const addressLine = draft ? [draft.street, draft.city, draft.state, draft.zip].filter((x) => x.trim()).join(", ") : "";
  React.useEffect(() => {
    if (!typed.current || addressLine.length < 8) return;
    const ctl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const [hit] = await searchPlaces(addressLine, ctl.signal);
        if (hit && typed.current)
          setDraft((d) => (d ? { ...d, lat: Number(Number(hit.lat).toFixed(6)), lng: Number(Number(hit.lon).toFixed(6)) } : d));
      } catch {
        /* Offline — the pin stays where it was; the map says search is unavailable. */
      }
    }, 900);
    return () => {
      window.clearTimeout(t);
      ctl.abort();
    };
  }, [addressLine]);

  if (!draft) return null;
  const set = <K extends keyof ShipToDraft>(k: K, v: ShipToDraft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  /* A TYPED ADDRESS IS LOOKED UP once the typing pauses, and moves the pin. */
  const typeAddress = (k: "street" | "city" | "state" | "zip", v: string) => {
    typed.current = true;
    set(k, v);
  };

  const detailsPending: PendingItem[] = [
    !draft.name.trim() && { key: "name", label: "Enter the ship-to's name", target: "st-details" },
    /* THE STREET MAY BE EMPTY ONCE THE PIN IS PLACED (Pavan, 2026-10-15) —
       some real sites have no street; the pin is where the driver goes. */
    ((!draft.street.trim() && !(Number.isFinite(draft.lat) && Number.isFinite(draft.lng))) ||
      !draft.city.trim() ||
      !draft.state.trim() ||
      !draft.zip.trim()) && {
      key: "addr",
      label: "Complete the address",
      target: "st-address",
    },
    (!Number.isFinite(draft.lat) || !Number.isFinite(draft.lng)) && {
      key: "geo",
      label: "Find the ship-to on the map",
      target: "st-address",
    },
  ].filter(Boolean) as PendingItem[];
  const assetsPending: PendingItem[] = [
    draft.assets.some(
      (a) => !a.name.trim() || !a.code.trim() || !a.type || a.categories.length === 0 || a.products.length === 0 || (sizeRequired(a.type) && a.capacity <= 0)
    ) && {
      key: "assets",
      label: "Complete each asset's name, unique ID, type, categories, products and size",
      target: "st-assets",
    },
    draft.assets.some((a) => a.monitor && !a.monitorId.trim()) && {
      key: "assetMon",
      label: "Enter each fitted tank monitor's ID",
      target: "st-assets",
    },
    draft.assets.some((a) => a.lat === null || a.lng === null) && {
      key: "assetGeo",
      label: "Enter each asset's latitude and longitude",
      target: "st-assets",
    },
  ].filter(Boolean) as PendingItem[];

  /* STEP 2 OPENS ONCE STEP 1 IS DONE — on create; an existing ship-to has
     both. */
  const toAssets = () => {
    if (creating && detailsPending.length > 0) {
      setRaised(true);
      return;
    }
    setRaised(false);
    setStep("assets");
  };
  const located = Number.isFinite(draft.lat) && Number.isFinite(draft.lng);
  /* ASSETS AT OTHER SHIP-TOS — what "Map existing assets" offers. */
  const here = new Set(draft.assets.map((a) => a.id).filter(Boolean));
  const elsewhere = shipTos
    .filter((x) => x.id !== shipTo?.id)
    .flatMap((x) => x.assets.filter((a) => a.status === "Active" && !here.has(a.id)).map((a) => ({ a, from: x })));

  const active = draft.status === "Active";
  const toggleStatus = () => {
    if (!shipTo) return;
    if (active) {
      const n = openOrdersForShipTo(shipTo.name);
      if (n > 0) {
        toast(`${shipTo.name} has ${n} open ${n === 1 ? "order" : "orders"}; deactivate it once ${n === 1 ? "it is" : "they are"} delivered`);
        return;
      }
    }
    const next = active ? "Inactive" : "Active";
    setShipToStatus(shipTo.id, next);
    set("status", next);
    lastSaved.current = JSON.stringify({ ...draft, status: next });
    toast.success(`${shipTo.name} ${next === "Active" ? "reactivated" : "deactivated"}`);
  };

  return (
    <>
    <RecordSheet
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15), per step. Ship-to details =
         no table; the address fields and the map sit in two EQUAL halves and
         the map needs ~420, so each half is 420. Assets = fifteen columns —
         the sheet shows the first seven (asset, unique ID, RFID, ERP ID,
         type, categories, size) and THE REST SCROLLS SIDEWAYS, the asset
         pinned (Pavan: "keep it sideways scroll"). */
      fit={
        step === "details"
          ? { tables: [[420, 420]] }
          : { tables: [[CELL.name, CELL.pick, CELL.pick, CELL.pick, CELL.pick, CELL.pick, CELL.number]] }
      }
      /* AN EXISTING SHIP-TO IS DATA-INTENSIVE — 1200 at least (Pavan,
         2026-10-15); creating keeps the widths above. */
      {...(!creating ? { size: "data" as const } : {})}
      open={open}
      onOpenChange={onOpenChange}
      mode={creating ? "create" : "edit"}
      editTitle={shipTo?.name || "Ship-to"}
      createTitle="Create Ship-to"
      createAction="Create ship-to"
      showCancel={false}
      level={level}
      pending={creating && step === "assets" ? assetsPending : undefined}
      footerPrimary={
        !creating ? null : step === "details" ? (
          <Button onClick={toAssets}>
            Next: assets
            <ArrowRight />
          </Button>
        ) : undefined
      }
      footerAside={
        creating && step === "assets" ? (
          <Button variant="ghost" onClick={() => setStep("details")}>
            <ArrowLeft />
            Back
          </Button>
        ) : undefined
      }
      footerBanner={
        creating && step === "details" && raised ? <PendingStrip tone="caution" pending={detailsPending} /> : undefined
      }
      steps={
        <SheetSteps
          steps={[
            { value: "details", label: "Ship-to details" },
            {
              value: "assets",
              label: "Assets",
              disabledReason: creating && detailsPending.length > 0 ? "Finish the ship-to details first" : undefined,
            },
          ]}
          value={step}
          onValueChange={(v) => (v === "assets" ? toAssets() : setStep("details"))}
        />
      }
      headerAside={
        <span className="flex items-center gap-2">
          {!creating && (
            <StatusChip tone={kindTone(ACTIVE_KIND(active))} variant="text">
              {draft.status}
            </StatusChip>
          )}
          {saveState !== "idle" && <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />}
        </span>
      }
      headerActions={
        creating || !shipTo ? undefined : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Activity log" onClick={() => setShipLog(true)}>
                <History />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Activity log</TooltipContent>
          </Tooltip>
        )
      }
      headerMenu={
        creating || !shipTo ? undefined : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More ship-to actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {active && onCreateOrder && (
                <DropdownMenuItem onSelect={() => onCreateOrder?.(shipTo.name, [])}>
                  <ClipboardPlus />
                  Create order
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={toggleStatus}>
                {active ? <Ban /> : <RotateCcw />}
                {active ? "Deactivate ship-to" : "Reactivate ship-to"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
      onSubmit={() => {
        const s = createShipTo(draft);
        toast.success(`${s.name} created`);
        onCreated?.(s);
      }}
    >
      {/* ONE COLUMN — no summary card for a ship-to (Pavan, 2026-10-13); its
          history is the activity icon in the header. */}
      <div className="grid items-start gap-6">
        {step === "details" ? (
        <div className="flex min-w-0 flex-col gap-10">
          <SheetSection id="st-details" title="Details">
            <div className="grid grid-cols-2 gap-4">
              <SheetField label="Name" required className="col-span-2">
                <Input value={draft.name} placeholder="e.g. Cardinal Hub C" onChange={(e) => set("name", e.target.value)} />
              </SheetField>
              <SheetField label="Default PO #">
                <Input value={draft.poNumber} placeholder="e.g. PO-77000" onChange={(e) => set("poNumber", e.target.value)} />
              </SheetField>
              <SheetField label="Contact name">
                <Input value={draft.contactName} onChange={(e) => set("contactName", e.target.value)} />
              </SheetField>
              <SheetField label="Contact phone">
                <Input
                  type="tel"
                  value={draft.contactPhone}
                  placeholder="(713) 555-0100"
                  onChange={(e) => set("contactPhone", e.target.value)}
                />
              </SheetField>
            </div>
          </SheetSection>

          {/* THE ADDRESS AND ITS MAP, side by side (Pavan, 2026-10-13): the
              fields on the left, the map on the right with its own search.
              A confirmed pin fills the fields; a typed address moves the pin. */}
          <SheetSection id="st-address" title="Address">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <SheetField label="Street" required={!(Number.isFinite(draft.lat) && Number.isFinite(draft.lng))}>
                  <Input value={draft.street} onChange={(e) => typeAddress("street", e.target.value)} />
                </SheetField>
                <SheetField label="City" required>
                  <Input value={draft.city} onChange={(e) => typeAddress("city", e.target.value)} />
                </SheetField>
                <div className="grid grid-cols-2 gap-4">
                  <SheetField label="State" required>
                    <Input value={draft.state} onChange={(e) => typeAddress("state", e.target.value)} />
                  </SheetField>
                  <SheetField label="ZIP" required>
                    <Input inputMode="numeric" value={draft.zip} onChange={(e) => typeAddress("zip", e.target.value)} />
                  </SheetField>
                </div>
                {/* THE GEOFENCE — a labelled toggle row (Pavan, 2026-10-13:
                    a switch on the right, not a checkbox); on, a slider for
                    its radius in miles right under it, drawn as a ring. */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="st-geofence" className="text-sm font-medium text-foreground">
                      Geofence
                    </label>
                    <Switch
                      id="st-geofence"
                      checked={draft.geofence !== null}
                      onCheckedChange={(on) => set("geofence", on ? (draft.geofence ?? 0.25) : null)}
                    />
                  </div>
                  {draft.geofence !== null && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Radius</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {draft.geofence.toFixed(2)} mi
                        </span>
                      </div>
                      <Slider
                        aria-label="Geofence radius in miles"
                        min={0.05}
                        max={5}
                        step={0.05}
                        value={[draft.geofence]}
                        onValueChange={([v]) => set("geofence", Number(v.toFixed(2)))}
                      />
                    </div>
                  )}
                </div>
              </div>
              <LocationMap
                className="h-80 lg:h-auto lg:min-h-80"
                location={Number.isFinite(draft.lat) && Number.isFinite(draft.lng) ? { lat: draft.lat, lng: draft.lng } : null}
                geofence={draft.geofence ? draft.geofence * 1609.34 : null}
                assets={draft.assets.map((x, i) => ({ key: String(i), name: x.name, lat: x.lat, lng: x.lng, fixed: true }))}
                onConfirm={(p) => {
                  typed.current = false;
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          lat: Number(p.lat.toFixed(6)),
                          lng: Number(p.lng.toFixed(6)),
                          street: p.street || d.street,
                          city: p.city || d.city,
                          state: p.state || d.state,
                          zip: p.zip || d.zip,
                        }
                      : d
                  );
                }}
                onAssetMove={() => {}}
              />
            </div>
          </SheetSection>

          <SheetSection title="Delivery">
            {/* THE ORDER SHEET'S TIMELINE (Pavan, 2026-10-20) — new orders
                here start with these hours and preferred times. */}
            <DeliveryWindowTimeline
              label="Delivery hours & preferred time"
              start={draft.hoursStart}
              end={draft.hoursEnd}
              onWindowChange={(a, b) =>
                setDraft((d) => (d ? { ...d, hoursStart: a, hoursEnd: b, preferred: clampPreferred(d.preferred ?? [], a, b) } : d))
              }
              preferred={draft.preferred ?? []}
              onPreferredChange={(p) => set("preferred", p)}
            />
            <SheetField label="Delivery instructions">
              <Textarea
                value={draft.accessNotes}
                onChange={(e) => set("accessNotes", e.target.value)}
                className="min-h-20"
              />
            </SheetField>
          </SheetSection>

        </div>
        ) : (
        /* STEP 2 — THE ASSETS MAPPED TO THIS SHIP-TO. A new row is a new
           asset, mapped here as it is made; "Map existing assets" brings
           assets from other ship-tos (they move here). The map below places
           each one inside the site. */
        <div className="flex min-w-0 flex-col gap-10">
          <SheetSection
            id="st-assets"
            title="Assets"
            flush
            action={<MapExisting options={elsewhere} onAdd={(picked) => set("assets", [...draft.assets, ...picked])} />}
            hanging={
              <HangingAdd
                label="New asset"
                onClick={() => {
                  setFocusRow(draft.assets.length);
                  set("assets", [
                    ...draft.assets,
                    { ...blankAsset(), lat: located ? draft.lat : null, lng: located ? draft.lng : null },
                  ]);
                }}
              />
            }
          >
            <AssetsTable
              rows={draft.assets}
              blank={{ ...blankAsset(), lat: located ? draft.lat : null, lng: located ? draft.lng : null }}
              focusRow={focusRow}
              onChange={(rows) => set("assets", rows)}
              onLog={setLogFor}
            />
          </SheetSection>

          <SheetSection id="st-asset-map" title="Asset locations">
            <LocationMap
              className="h-96"
              location={located ? { lat: draft.lat, lng: draft.lng } : null}
              geofence={draft.geofence ? draft.geofence * 1609.34 : null}
              assets={draft.assets.map((x, i) => ({ key: String(i), name: x.name, lat: x.lat, lng: x.lng }))}
              onPress={() => {}}
              onAssetMove={(key, lat, lng) =>
                set(
                  "assets",
                  draft.assets.map((x, i) => (String(i) === key ? { ...x, lat, lng } : x))
                )
              }
            />
          </SheetSection>
        </div>
        )}
      </div>
    </RecordSheet>
    <ActivityLogSheet
      open={logFor !== null}
      onOpenChange={(o) => !o && setLogFor(null)}
      title={(logFor !== null && draft.assets[logFor]?.name) || "Asset"}
      subtitle={draft.name}
      entries={logFor !== null ? assetLog(draft.assets[logFor]?.id) : []}
    />
    <ActivityLogSheet
      open={shipLog && Boolean(shipTo)}
      onOpenChange={setShipLog}
      title={shipTo?.name ?? "Ship-to"}
      entries={shipTo ? shipToLog(shipTo) : []}
    />
    </>
  );
}
