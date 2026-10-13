import * as React from "react";
import { toast } from "sonner";
import { Ban, ClipboardPlus, MoreHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import {
  TableCellInput,
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
import { cn } from "@/lib/utils";
import { kindTone, ACTIVE_KIND } from "../unified-view/statusKind";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "../unified-view/RecordSheet";
import { HangingAdd } from "../unified-view/HangingAdd";
import { ActivityCard, RailRow, SummaryCard } from "../unified-view/SheetCards";
import { type PendingItem } from "../unified-view/PendingStrip";
import { ASSET_TYPES, PRODUCTS, type ShipTo } from "./orders";
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
}: {
  rows: AssetDraft[];
  focusRow?: number;
  onChange: (next: AssetDraft[]) => void;
}) {
  const update = (i: number, p: Partial<AssetDraft>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  if (rows.length === 0)
    return <p className="px-4 py-3 text-sm text-muted-foreground">No assets at this ship-to yet.</p>;
  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        <col className="w-[22%]" />
        <col className="w-[15%]" />
        <col className="w-[17%]" />
        <col className="w-[11%]" />
        <col className="w-[12%]" />
        <col className="w-[12%]" />
        <col className="w-[72px]" />
        <col className="w-[52px]" />
      </colgroup>
      <thead>
        <tr className="border-b border-border bg-fp-table-header">
          <th className="px-3 py-2.5 text-left"><TableRequiredLabel required>Asset</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-left"><TableRequiredLabel required>Type</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-left"><TableRequiredLabel required>Product</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-right"><TableRequiredLabel required>Size (gal)</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-right"><TableRequiredLabel required>Latitude</TableRequiredLabel></th>
          <th className="px-3 py-2.5 text-right"><TableRequiredLabel required>Longitude</TableRequiredLabel></th>
          {/* A NAMED CHECKBOX COLUMN — interactions T5. */}
          <th className="px-3 py-2.5 text-left"><TableRequiredLabel>Rented</TableRequiredLabel></th>
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
                <TableCellSelect
                  value={r.product}
                  options={PRODUCTS}
                  placeholder="Select product"
                  aria-label={`Product of ${name}`}
                  onChange={(v) => update(i, { product: v })}
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
              <td className="px-3">
                <Checkbox
                  checked={r.rented}
                  onCheckedChange={(c) => update(i, { rented: c === true })}
                  aria-label={`${name} is rented`}
                />
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
  const lastSaved = React.useRef<string | null>(null);
  const key = creating ? "new" : (shipTo?.id ?? null);
  React.useEffect(() => {
    if (!open) return;
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

  if (!draft) return null;
  const set = <K extends keyof ShipToDraft>(k: K, v: ShipToDraft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const pending: PendingItem[] = [
    !draft.name.trim() && { key: "name", label: "Enter the ship-to's name", target: "st-details" },
    (!draft.street.trim() || !draft.city.trim() || !draft.state.trim() || !draft.zip.trim()) && {
      key: "addr",
      label: "Complete the address",
      target: "st-address",
    },
    (!Number.isFinite(draft.lat) || !Number.isFinite(draft.lng)) && {
      key: "geo",
      label: "Enter its latitude and longitude",
      target: "st-address",
    },
    draft.assets.some((a) => !a.name.trim() || !a.type || !a.product || a.capacity <= 0) && {
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
      <div className={cn("grid items-start gap-6", !creating && "lg:grid-cols-[minmax(0,1fr)_340px]")}>
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

          <SheetSection id="st-address" title="Address">
            <div className="grid grid-cols-2 gap-4">
              <SheetField label="Street" required className="col-span-2">
                <Input value={draft.street} onChange={(e) => set("street", e.target.value)} />
              </SheetField>
              <SheetField label="City" required>
                <Input value={draft.city} onChange={(e) => set("city", e.target.value)} />
              </SheetField>
              <div className="grid grid-cols-2 gap-4">
                <SheetField label="State" required>
                  <Input value={draft.state} onChange={(e) => set("state", e.target.value)} />
                </SheetField>
                <SheetField label="ZIP" required>
                  <Input inputMode="numeric" value={draft.zip} onChange={(e) => set("zip", e.target.value)} />
                </SheetField>
              </div>
              <SheetField label="Latitude" required>
                <Input
                  inputMode="decimal"
                  value={Number.isFinite(draft.lat) ? String(draft.lat) : ""}
                  placeholder="e.g. 29.7800"
                  onChange={(e) => set("lat", num(e.target.value) ?? NaN)}
                />
              </SheetField>
              <SheetField label="Longitude" required>
                <Input
                  inputMode="decimal"
                  value={Number.isFinite(draft.lng) ? String(draft.lng) : ""}
                  placeholder="e.g. -95.3800"
                  onChange={(e) => set("lng", num(e.target.value) ?? NaN)}
                />
              </SheetField>
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
            <AssetsTable rows={draft.assets} focusRow={focusRow} onChange={(rows) => set("assets", rows)} />
          </SheetSection>
        </div>

        {!creating && shipTo && (
          <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
            <SummaryCard title="Ship-to summary">
              <dl className="flex flex-col">
                <RailRow variant="line" label="Assets" value={shipTo.assets.length} />
                <RailRow variant="line" label="Rented" value={shipTo.assets.filter((a) => a.rented).length} />
                <RailRow variant="line" label="Monitored" value={shipTo.assets.filter((a) => a.monitor).length} />
                <RailRow variant="line" label="Open orders" value={openOrdersForShipTo(shipTo.name)} />
              </dl>
            </SummaryCard>
            <ActivityCard entries={shipTo.audit} />
          </aside>
        )}
      </div>
    </RecordSheet>
  );
}
