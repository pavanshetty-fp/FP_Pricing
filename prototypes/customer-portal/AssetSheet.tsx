import * as React from "react";
import { toast } from "sonner";
import { Ban, ClipboardPlus, MoreHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { kindTone, ACTIVE_KIND } from "../unified-view/statusKind";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "../unified-view/RecordSheet";
import { ActivityCard, RailRow, SummaryCard } from "../unified-view/SheetCards";
import { type PendingItem } from "../unified-view/PendingStrip";
import { ASSET_TYPES, LOW_LEVEL, PRODUCTS, printKey, type Asset, type ShipTo } from "./orders";
import {
  blankAsset,
  createAsset,
  lastDeliveryFor,
  openOrdersForAsset,
  setAssetStatus,
  updateAsset,
  useShipTos,
  type AssetDraft,
} from "./sites";

/*
  THE ASSET SHEET (Pavan, 2026-10-13). The customer's own record of a tank or
  asset — no approval. Creating takes the act (Create asset), then every
  edit autosaves (the Unified View master-data sheets: Sales Assets, the 3PL
  Directory).

  Where it stands is a ship-to AND its own coordinates. Rented is a yes/no,
  so a checkbox (ux §Tables — booleans are checkboxes). The monitor ID only
  exists once a monitor is ticked (progressive, as Sales Assets); the level
  is a READING, so it is in the summary, never a field.

  Deactivating waits until no order is on its way to it.
*/

const num = (v: string): number | null => {
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
};

const draftOf = (a: Asset): AssetDraft => {
  const { audit: _a, level: _l, ...rest } = a;
  void _a;
  void _l;
  return rest;
};

export function AssetSheet({
  asset,
  shipTo,
  open,
  creating,
  presetShipTo,
  onOpenChange,
  onCreateOrder,
}: {
  asset: Asset | null;
  shipTo: ShipTo | null;
  open: boolean;
  creating: boolean;
  /** Creating from a ship-to: that ship-to, chosen already. */
  presetShipTo?: string;
  onOpenChange: (open: boolean) => void;
  onCreateOrder: (shipTo: string, assetIds: string[]) => void;
}) {
  const shipTos = useShipTos();
  const [draft, setDraft] = React.useState<AssetDraft | null>(null);
  const [siteId, setSiteId] = React.useState("");
  const lastSaved = React.useRef<string | null>(null);
  const key = creating ? "new" : (asset?.id ?? null);
  React.useEffect(() => {
    if (!open) return;
    const d = creating ? blankAsset() : asset ? draftOf(asset) : null;
    const sid = creating ? (presetShipTo ?? "") : (shipTo?.id ?? "");
    lastSaved.current = JSON.stringify([d, sid]);
    setDraft(d);
    setSiteId(sid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  /* AUTOSAVE, DEBOUNCED — an existing asset only. */
  React.useEffect(() => {
    if (creating || !asset || !draft) return;
    const shape = JSON.stringify([draft, siteId]);
    if (shape === lastSaved.current) return;
    const t = window.setTimeout(() => {
      const moved = siteId !== shipTo?.id;
      lastSaved.current = shape;
      updateAsset(
        asset.id,
        siteId,
        draft,
        moved ? `Moved to ${shipTos.find((s) => s.id === siteId)?.name ?? "another ship-to"}` : undefined
      );
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, siteId, asset, creating, shipTo, shipTos]);
  const saveState = useDraftSaveState(draft, open && !creating);

  if (!draft) return null;
  const set = <K extends keyof AssetDraft>(k: K, v: AssetDraft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  const site = shipTos.find((s) => s.id === siteId);

  const pending: PendingItem[] = [
    !draft.name.trim() && { key: "name", label: "Enter the asset's name", target: "asset-details" },
    !draft.type && { key: "type", label: "Choose a type", target: "asset-details" },
    !draft.product && { key: "product", label: "Choose a product", target: "asset-details" },
    draft.capacity <= 0 && { key: "cap", label: "Enter its size in gallons", target: "asset-details" },
    !siteId && { key: "site", label: "Choose a ship-to", target: "asset-location" },
    (draft.lat === null || draft.lng === null) && {
      key: "geo",
      label: "Enter its latitude and longitude",
      target: "asset-location",
    },
    draft.monitor && !draft.monitorId.trim() && {
      key: "mon",
      label: "Enter the tank monitor ID",
      target: "asset-monitor",
    },
  ].filter(Boolean) as PendingItem[];

  const active = draft.status === "Active";
  const toggleStatus = () => {
    if (!asset) return;
    if (active) {
      const n = openOrdersForAsset(asset.id);
      if (n > 0) {
        /* SAID ON THE PRESS — ui §8 "a rung that cannot be taken says why". */
        toast(`${asset.name} has ${n} open ${n === 1 ? "order" : "orders"}; deactivate it once ${n === 1 ? "it is" : "they are"} delivered`);
        return;
      }
    }
    const next = active ? "Inactive" : "Active";
    setAssetStatus(asset.id, next);
    set("status", next);
    lastSaved.current = JSON.stringify([{ ...draft, status: next }, siteId]);
    toast.success(`${asset.name} ${next === "Active" ? "reactivated" : "deactivated"}`);
  };

  const lastDelivery = asset ? lastDeliveryFor(asset.id) : null;
  const openOrders = asset ? openOrdersForAsset(asset.id) : 0;

  return (
    <RecordSheet
      size={creating ? "wide" : "xxwide"}
      open={open}
      onOpenChange={onOpenChange}
      mode={creating ? "create" : "edit"}
      editTitle={asset?.name || "Asset"}
      createTitle="Create Asset"
      createAction="Create asset"
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
          {draft.rented && <Pill>Rented</Pill>}
          {saveState !== "idle" && <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />}
        </span>
      }
      headerMenu={
        creating || !asset ? undefined : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More asset actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {active && site && (
                <DropdownMenuItem onSelect={() => onCreateOrder(site.name, [asset.id])}>
                  <ClipboardPlus />
                  Create order
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={toggleStatus}>
                {active ? <Ban /> : <RotateCcw />}
                {active ? "Deactivate asset" : "Reactivate asset"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
      onSubmit={() => {
        const a = createAsset(siteId, draft);
        toast.success(`${a.name} created`);
      }}
    >
      <div className={cn("grid items-start gap-6", !creating && "lg:grid-cols-[minmax(0,1fr)_340px]")}>
        <div className="flex min-w-0 flex-col gap-10">
          <SheetSection id="asset-details" title="Details">
            <div className="grid grid-cols-2 gap-4">
              <SheetField label="Name" required>
                <Input value={draft.name} placeholder="e.g. Tank A3" onChange={(e) => set("name", e.target.value)} />
              </SheetField>
              <SheetField label="Asset ID">
                <Input value={draft.code} placeholder="e.g. CL-A3" onChange={(e) => set("code", e.target.value)} />
              </SheetField>
              <SheetField label="Type" required>
                <Combobox
                  className="w-full"
                  value={draft.type}
                  onValueChange={(v) => set("type", v)}
                  options={ASSET_TYPES}
                  placeholder="Select type"
                />
              </SheetField>
              <SheetField label="Product" required>
                <Combobox
                  className="w-full"
                  value={draft.product}
                  onValueChange={(v) => set("product", v)}
                  options={PRODUCTS}
                  placeholder="Select product"
                />
              </SheetField>
              <SheetField label="Size (gal)" required>
                <Input
                  inputMode="numeric"
                  value={draft.capacity ? String(draft.capacity) : ""}
                  placeholder="0"
                  onChange={(e) => set("capacity", num(e.target.value) ?? 0)}
                />
              </SheetField>
              <SheetField className="justify-end">
                <label className="flex h-9 w-fit cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
                  <Checkbox checked={draft.rented} onCheckedChange={(v) => set("rented", v === true)} />
                  Rented
                </label>
              </SheetField>
            </div>
          </SheetSection>

          <SheetSection id="asset-location" title="Location">
            <div className="grid grid-cols-2 gap-4">
              <SheetField label="Ship-to" required className="col-span-2">
                <Combobox
                  className="w-full"
                  value={site?.name ?? ""}
                  onValueChange={(v) => setSiteId(shipTos.find((s) => s.name === v)?.id ?? "")}
                  options={shipTos.filter((s) => s.status === "Active" || s.id === siteId).map((s) => s.name)}
                  placeholder="Select ship-to"
                  searchPlaceholder="Search ship-tos…"
                  emptyText="No ship-to found."
                />
              </SheetField>
              <SheetField label="Latitude" required>
                <Input
                  inputMode="decimal"
                  value={draft.lat ?? ""}
                  placeholder={site ? String(site.lat) : "e.g. 29.7803"}
                  onChange={(e) => set("lat", num(e.target.value))}
                />
              </SheetField>
              <SheetField label="Longitude" required>
                <Input
                  inputMode="decimal"
                  value={draft.lng ?? ""}
                  placeholder={site ? String(site.lng) : "e.g. -95.3806"}
                  onChange={(e) => set("lng", num(e.target.value))}
                />
              </SheetField>
            </div>
          </SheetSection>

          <SheetSection id="asset-monitor" title="Tank monitor">
            <div className="grid grid-cols-2 items-end gap-4">
              <SheetField>
                <label className="flex h-9 w-fit cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
                  <Checkbox
                    checked={draft.monitor}
                    onCheckedChange={(v) => {
                      const on = v === true;
                      setDraft((d) => (d ? { ...d, monitor: on, monitorId: on ? d.monitorId : "" } : d));
                    }}
                  />
                  Tank monitor fitted
                </label>
              </SheetField>
              {draft.monitor && (
                <SheetField label="Monitor ID" required>
                  <Input
                    value={draft.monitorId}
                    placeholder="e.g. TM8K2A93"
                    onChange={(e) => set("monitorId", e.target.value.toUpperCase())}
                  />
                </SheetField>
              )}
            </div>
          </SheetSection>

          <SheetSection title="Notes">
            <Textarea
              aria-label="Notes"
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="min-h-24"
            />
          </SheetSection>
        </div>

        {!creating && asset && (
          <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
            <SummaryCard title="Asset summary">
              <dl className="flex flex-col">
                <RailRow
                  variant="line"
                  label="Level"
                  value={
                    asset.monitor ? (
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              asset.level <= LOW_LEVEL ? "bg-status-failed" : "bg-fp-lane-green"
                            )}
                            style={{ width: `${asset.level}%` }}
                          />
                        </span>
                        <span className={cn("tabular-nums", asset.level <= LOW_LEVEL && "text-status-failed")}>
                          {asset.level}%
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No monitor</span>
                    )
                  }
                />
                <RailRow variant="line" label="Open orders" value={openOrders} />
                <RailRow
                  variant="line"
                  label="Last delivered"
                  value={lastDelivery ? printKey(lastDelivery) : <span className="text-muted-foreground">—</span>}
                />
              </dl>
            </SummaryCard>
            <ActivityCard entries={asset.audit} />
          </aside>
        )}
      </div>
    </RecordSheet>
  );
}
