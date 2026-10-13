import * as React from "react";
import { toast } from "sonner";
import { Ban, ClipboardPlus, History, MoreHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import {
  TableCellInput,
  TableCellMultiSelect,
  TableCellSelect,
  TableRequiredLabel,
  TableRowRemove,
} from "@/components/form-layout/table-cells";
import { TimeWindowSlider } from "@/components/form-layout/TimeWindowSlider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { kindTone, ACTIVE_KIND } from "../unified-view/statusKind";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "../unified-view/RecordSheet";
import { HangingAdd } from "../unified-view/HangingAdd";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LocationMap } from "./LocationMap";
import { searchPlaces } from "./geo";
import { ActivityLogSheet } from "./ActivityLogSheet";
import { assetLog, shipToLog } from "./activityLog";
import { type PendingItem } from "../unified-view/PendingStrip";
import { ASSET_TYPES, productsIn, type ShipTo } from "./orders";
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

/** The ship-to's assets, editable in place. */
function AssetsTable({
  rows,
  focusRow,
  onChange,
  onLog,
}: {
  rows: AssetDraft[];
  focusRow?: number;
  onChange: (next: AssetDraft[]) => void;
  /** Opens a row's activity log (Pavan, 2026-10-13). */
  onLog: (i: number) => void;
}) {
  const update = (i: number, p: Partial<AssetDraft>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  if (rows.length === 0)
    return <p className="px-4 py-3 text-sm text-muted-foreground">No assets at this ship-to yet.</p>;
  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        <col className="w-[19%]" />
        <col className="w-[13%]" />
        <col className="w-[15%]" />
        <col className="w-[10%]" />
        <col className="w-[11%]" />
        <col className="w-[11%]" />
        <col className="w-[92px]" />
        <col className="w-[104px]" />
        <col className="w-[52px]" />
      </colgroup>
      <thead>
        <tr className="border-b border-border bg-fp-table-header">
          <th className="px-3 py-2.5 text-left"><TableRequiredLabel required>Asset</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-left"><TableRequiredLabel required>Type</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-left"><TableRequiredLabel required>Products</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-right"><TableRequiredLabel required>Size (gal)</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-right"><TableRequiredLabel required>Latitude</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-right"><TableRequiredLabel required>Longitude</TableRequiredLabel></th>
          {/* A NAMED CHECKBOX COLUMN — interactions T5. */}
          <th className="px-3 py-2.5 text-left"><TableRequiredLabel>Rented</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-left"><TableRequiredLabel>Activity log</TableRequiredLabel></th>
          <th aria-hidden />
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const name = r.name || `asset ${i + 1}`;
          return (
            <tr key={r.id ?? `new-${i}`} className="group/row h-11 border-b border-border last:border-b-0">
              <td className="relative p-0">
                <TableCellInput
                  value={r.name}
                  placeholder="Enter name"
                  autoFocus={i === focusRow}
                  aria-label={`Name of ${name}`}
                  onChange={(v) => update(i, { name: v })}
                />
              </td>
              <td className="relative p-0">
                <TableCellSelect
                  value={r.type}
                  options={ASSET_TYPES}
                  placeholder="Select type"
                  aria-label={`Type of ${name}`}
                  onChange={(v) => update(i, { type: v })}
                />
              </td>
              <td className="relative p-0">
                {/* SEVERAL PRODUCTS, as on the asset sheet — same data, same
                    control; its categories follow the products picked here. */}
                <TableCellMultiSelect
                  values={r.products}
                  options={productsIn(r.categories)}
                  placeholder="Select products"
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
              </td>
              <td className="relative p-0 text-center">
                <TableRowRemove
                  aria-label={`Remove ${name}`}
                  /* AN ASSET WITH AN ORDER ON ITS WAY STAYS. */
                  disabled={Boolean(r.id && openOrdersForAsset(r.id) > 0)}
                  onRemove={() => onChange(rows.filter((_, j) => j !== i))}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ShipToSheet({
  shipTo,
  open,
  creating,
  onOpenChange,
  onCreateOrder,
}: {
  shipTo: ShipTo | null;
  open: boolean;
  creating: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateOrder: (shipTo: string, assetIds: string[]) => void;
}) {
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

  const pending: PendingItem[] = [
    !draft.name.trim() && { key: "name", label: "Enter the ship-to's name", target: "st-details" },
    (!draft.street.trim() || !draft.city.trim() || !draft.state.trim() || !draft.zip.trim()) && {
      key: "addr",
      label: "Complete the address",
      target: "st-address",
    },
    (!Number.isFinite(draft.lat) || !Number.isFinite(draft.lng)) && {
      key: "geo",
      label: "Find the ship-to on the map",
      target: "st-address",
    },

    draft.assets.some((a) => !a.name.trim() || !a.type || a.products.length === 0 || a.capacity <= 0) && {
      key: "assets",
      label: "Complete each asset's name, type, product and size",
      target: "st-assets",
    },
    draft.assets.some((a) => a.lat === null || a.lng === null) && {
      key: "assetGeo",
      label: "Enter each asset's latitude and longitude",
      target: "st-assets",
    },
  ].filter(Boolean) as PendingItem[];

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
      size="xxwide"
      open={open}
      onOpenChange={onOpenChange}
      mode={creating ? "create" : "edit"}
      editTitle={shipTo?.name || "Ship-to"}
      createTitle="Create Ship-to"
      createAction="Create ship-to"
      showCancel={false}
      pending={creating ? pending : undefined}
      footerPrimary={creating ? undefined : null}
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
              {active && (
                <DropdownMenuItem onSelect={() => onCreateOrder(shipTo.name, [])}>
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
      }}
    >
      {/* ONE COLUMN — no summary card for a ship-to (Pavan, 2026-10-13); its
          history is the activity icon in the header. */}
      <div className="grid items-start gap-6">
        <div className="flex min-w-0 flex-col gap-10">
          <SheetSection id="st-details" title="Details">
            <div className="grid grid-cols-2 gap-4">
              <SheetField label="Name" required className="col-span-2">
                <Input value={draft.name} placeholder="e.g. Cardinal Hub C" onChange={(e) => set("name", e.target.value)} />
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
                <SheetField label="Street" required>
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
                assets={draft.assets.map((x, i) => ({ key: String(i), name: x.name, lat: x.lat, lng: x.lng }))}
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
                onAssetMove={(key, lat, lng) =>
                  set(
                    "assets",
                    draft.assets.map((x, i) => (String(i) === key ? { ...x, lat, lng } : x))
                  )
                }
              />
            </div>
          </SheetSection>

          <SheetSection title="Delivery">
            <TimeWindowSlider
              label="Delivery hours"
              start={draft.hoursStart}
              end={draft.hoursEnd}
              onChange={(a, b) => setDraft((d) => (d ? { ...d, hoursStart: a, hoursEnd: b } : d))}
              aria-label="Delivery hours"
            />
            <SheetField label="Access notes">
              <Textarea
                value={draft.accessNotes}
                onChange={(e) => set("accessNotes", e.target.value)}
                className="min-h-20"
              />
            </SheetField>
          </SheetSection>

          <SheetSection
            id="st-assets"
            title="Assets"
            flush
            hanging={
              <HangingAdd
                label="Add asset"
                onClick={() => {
                  setFocusRow(draft.assets.length);
                  set("assets", [
                    ...draft.assets,
                    { ...blankAsset(), lat: Number.isFinite(draft.lat) ? draft.lat : null, lng: Number.isFinite(draft.lng) ? draft.lng : null },
                  ]);
                }}
              />
            }
          >
            <AssetsTable
              rows={draft.assets}
              focusRow={focusRow}
              onChange={(rows) => set("assets", rows)}
              onLog={setLogFor}
            />
          </SheetSection>
        </div>

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
