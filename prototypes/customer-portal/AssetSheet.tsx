import { cn } from "@/lib/utils";
import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Ban, ClipboardPlus, History, MoreHorizontal, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/ui/pill";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StatusChip } from "@/components/ui/status-chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SheetField, SheetSection, SheetSteps } from "@/components/side-sheet/parts";
import { MultiSelect } from "@/components/form-layout/MultiSelect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DATE_FMT } from "../unified-view/data";
import { kindTone, ACTIVE_KIND } from "../unified-view/statusKind";
import { CELL, DraftStatusChip, RecordSheet, useDraftSaveState } from "../unified-view/RecordSheet";
import { PendingStrip, type PendingItem } from "../unified-view/PendingStrip";
import {
  ASSET_TYPES,
  sizeRequired,
  PRODUCT_CATEGORIES,
  printKey,
  productsIn,
  REQUEST_STATUS_TONE,
  useRequests,
  type Asset,
  type ShipTo,
} from "./orders";
import { BatteryCell, LevelReading, LineLevel } from "./TankLevel";
import { usePortalNav } from "./nav";
import {
  blankAsset,
  createAsset,
  createdOf,
  lastDeliveryFor,
  openOrdersForAsset,
  setAssetStatus,
  updateAsset,
  useShipTos,
  type AssetDraft,
} from "./sites";
import { LocationMap } from "./LocationMap";
import { ActivityLogSheet } from "./ActivityLogSheet";
import { ShipToSheet } from "./ShipToSheet";
import { assetLog } from "./activityLog";

/*
  THE ASSET SHEET (Pavan, 2026-10-13). The customer's own record of a tank or
  asset — no approval. Creating takes the act (Create asset), then every
  edit autosaves (the Unified View master-data sheets).

  ONE COLUMN, NO SUMMARY CARD — the ship-to sheet's shape: its history is the
  activity icon in the header (activity · ⋯ · ✕).

  OWNED OR RENTED IS DECIDED WHEN THE ASSET IS CREATED; after that it is
  shown, not edited. Created by and Last filled are facts, shown the same way.

  LOCATION = the ship-to sheet's address-and-map template, with a ship-to
  picker where the address was: pick the ship-to, then press the map (or drag
  the orange pin) to set where this asset stands inside it.

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

/** A fact on the sheet — label over value, nothing to edit. */
function ReadOnly({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <SheetField label={label}>
      <div className="flex min-h-9 flex-col justify-center text-sm text-foreground">{children}</div>
    </SheetField>
  );
}

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
  const [showLog, setShowLog] = React.useState(false);
  /* THE TWO STEPS (Pavan, 2026-10-14) — the asset, then the ship-to it is
     mapped to and where it stands there. A new ship-to can be made from step
     2 without leaving. */
  const [step, setStep] = React.useState<"details" | "location">("details");
  const [raised, setRaised] = React.useState(false);
  const [newShipTo, setNewShipTo] = React.useState(false);
  const lastSaved = React.useRef<string | null>(null);
  const key = creating ? "new" : (asset?.id ?? null);
  React.useEffect(() => {
    /* CLOSED, THE DRAFT GOES — the next record must not start from the
       last one's, or opening it reads as an edit ("Draft saved"). */
    if (!open) {
      setDraft(null);
      setShowLog(false);
      return;
    }
    const d = creating ? blankAsset() : asset ? draftOf(asset) : null;
    const sid = creating ? (presetShipTo ?? "") : (shipTo?.id ?? "");
    lastSaved.current = JSON.stringify([d, sid]);
    setDraft(d);
    setSiteId(sid);
    setStep("details");
    setRaised(false);
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

  const detailsPending: PendingItem[] = [
    !draft.name.trim() && { key: "name", label: "Enter the display name", target: "asset-details" },
    !draft.code.trim() && { key: "code", label: "Enter the unique ID", target: "asset-details" },
    !draft.type && { key: "type", label: "Choose a type", target: "asset-details" },
    sizeRequired(draft.type) && draft.capacity <= 0 && { key: "cap", label: "Enter its size in gallons", target: "asset-details" },
    draft.categories.length === 0 && {
      key: "cats",
      label: "Choose its product categories",
      target: "asset-details",
    },
    draft.products.length === 0 && { key: "products", label: "Choose its products", target: "asset-details" },
    draft.monitor && !draft.monitorId.trim() && {
      key: "mon",
      label: "Enter the tank monitor ID",
      target: "asset-monitor",
    },
  ].filter(Boolean) as PendingItem[];
  const locationPending: PendingItem[] = [
    !siteId && { key: "site", label: "Choose a ship-to", target: "asset-location" },
    (draft.lat === null || draft.lng === null) && {
      key: "geo",
      label: "Place it on the map",
      target: "asset-location",
    },
  ].filter(Boolean) as PendingItem[];
  const toLocation = () => {
    if (creating && detailsPending.length > 0) {
      setRaised(true);
      return;
    }
    setRaised(false);
    setStep("location");
  };

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

  /* CATEGORIES NARROW THE PRODUCTS — one taken away takes its products. */
  const productOptions = productsIn(draft.categories);
  const setCategories = (cats: string[]) =>
    setDraft((d) => {
      if (!d) return d;
      const ok = productsIn(cats);
      return { ...d, categories: cats, products: d.products.filter((p) => ok.includes(p)) };
    });

  const created = asset ? createdOf(asset) : null;
  const lastFilled = asset ? lastDeliveryFor(asset.id) : null;
  const others = (site?.assets ?? []).filter((a) => a.id !== asset?.id);

  return (
    <>
      <RecordSheet
        /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15): no table. Asset details =
           fields, so the form's 600. Ship-to & location = fields and the map
           in two EQUAL halves; the map needs ~420, so each half is 420. */
        {...(step === "location" ? { fit: { tables: [[420, 420]] } } : { size: "form" as const })}
        /* AN EXISTING ASSET IS DATA-INTENSIVE — 1200, fields three across
           (Pavan, 2026-10-15). Creating keeps the widths above. */
        {...(!creating
          ? /* …and at least as wide as its order history (Pavan, 2026-10-17). */
            { size: "data" as const, fit: { tables: [[CELL.name, CELL.date, CELL.name, CELL.number, CELL.level, CELL.status]] } }
          : {})}
        open={open}
        onOpenChange={onOpenChange}
        mode={creating ? "create" : "edit"}
        editTitle={asset?.name || "Asset"}
        createTitle="Create Asset"
        createAction="Create asset"
        showCancel={false}
        pending={creating && step === "location" ? locationPending : undefined}
        footerPrimary={
          !creating ? null : step === "details" ? (
            <Button onClick={toLocation}>
              Next: ship-to
              <ArrowRight />
            </Button>
          ) : undefined
        }
        footerAside={
          creating && step === "location" ? (
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
              { value: "details", label: "Asset details" },
              {
                value: "location",
                label: "Ship-to & location",
                disabledReason: creating && detailsPending.length > 0 ? "Finish the asset details first" : undefined,
              },
            ]}
            value={step}
            onValueChange={(v) => (v === "location" ? toLocation() : setStep("details"))}
          />
        }
        headerAside={
          <span className="flex items-center gap-2">
            {!creating && (
              <StatusChip tone={kindTone(ACTIVE_KIND(active))} variant="text">
                {draft.status}
              </StatusChip>
            )}
            {!creating && draft.rented && <Pill>Rented</Pill>}
            {saveState !== "idle" && <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />}
          </span>
        }
        headerActions={
          creating || !asset ? undefined : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Activity log" onClick={() => setShowLog(true)}>
                  <History />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Activity log</TooltipContent>
            </Tooltip>
          )
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
        {step === "details" ? (
        <div className="flex min-w-0 flex-col gap-10">
          <SheetSection id="asset-details" title="Details">
            <div className={cn("grid gap-4", creating ? "grid-cols-2" : "grid-cols-3")}>
              <SheetField label="Display name" required>
                <Input value={draft.name} placeholder="e.g. Tank A3" onChange={(e) => set("name", e.target.value)} />
              </SheetField>
              <SheetField label="Unique ID" required>
                <Input value={draft.code} placeholder="e.g. CL-A3" onChange={(e) => set("code", e.target.value)} />
              </SheetField>
              <SheetField label="RFID code">
                <Input
                  value={draft.rfid}
                  placeholder="e.g. E2801160600002"
                  onChange={(e) => set("rfid", e.target.value.toUpperCase())}
                />
              </SheetField>
              <SheetField label="ERP ID">
                <Input value={draft.erpId} placeholder="e.g. ERP-40211" onChange={(e) => set("erpId", e.target.value)} />
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
              <SheetField label="Size (gal)" required={sizeRequired(draft.type)}>
                <Input
                  inputMode="numeric"
                  value={draft.capacity ? String(draft.capacity) : ""}
                  placeholder="0"
                  onChange={(e) => set("capacity", num(e.target.value) ?? 0)}
                />
              </SheetField>
              <SheetField label="Compatible product categories" required>
                <MultiSelect
                  options={PRODUCT_CATEGORIES}
                  value={draft.categories}
                  onChange={setCategories}
                  addLabel="Add categories"
                  searchPlaceholder="Search categories…"
                  emptyText="No category found."
                />
              </SheetField>
              <SheetField label="Products" required>
                <MultiSelect
                  options={productOptions}
                  value={draft.products}
                  onChange={(v) => set("products", v)}
                  addLabel="Add products"
                  searchPlaceholder="Search products…"
                  emptyText="No product found."
                />
              </SheetField>
              {creating ? (
                <SheetField label="Ownership" required>
                  <RadioGroup
                    className="flex h-9 items-center gap-6"
                    value={draft.rented ? "rented" : "owned"}
                    onValueChange={(v) => set("rented", v === "rented")}
                  >
                    {(["owned", "rented"] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 text-sm text-foreground">
                        <RadioGroupItem value={v} />
                        {v === "owned" ? "Owned" : "Rented"}
                      </label>
                    ))}
                  </RadioGroup>
                </SheetField>
              ) : (
                <ReadOnly label="Ownership">
                  {draft.rented ? <Pill className="w-fit">Rented</Pill> : "Owned"}
                </ReadOnly>
              )}
              {!creating && asset && (
                <>
                  <ReadOnly label="Created by">
                    {created ? (
                      <>
                        <span>{created.by}</span>
                        <span className="text-xs text-muted-foreground">{DATE_FMT.format(new Date(created.at))}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </ReadOnly>
                  <ReadOnly label="Last filled">
                    {lastFilled ? printKey(lastFilled) : <span className="text-muted-foreground">Not filled yet</span>}
                  </ReadOnly>
                </>
              )}
            </div>
          </SheetSection>

          <SheetSection id="asset-monitor" title="Tank monitor">
            <div className="grid grid-cols-2 items-end gap-4">
              <SheetField>
                <label className="flex h-9 w-fit items-center gap-2.5 text-sm font-medium text-foreground">
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
            {/* THE MONITOR'S READING NOW (Pavan, 2026-10-17). */}
            {!creating && asset?.monitor && (
              <div className="grid grid-cols-2 gap-4">
                <SheetField label="Current level">
                  <LevelReading asset={asset} className="min-h-9" />
                </SheetField>
                <SheetField label="Monitor battery">
                  <span className="flex min-h-9 items-center">
                    <BatteryCell asset={asset} />
                  </span>
                </SheetField>
              </div>
            )}
          </SheetSection>

          {!creating && asset && <AssetOrderHistory asset={asset} />}

          <SheetSection title="Notes">
            <Textarea
              aria-label="Notes"
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="min-h-24"
            />
          </SheetSection>
        </div>
        ) : (
        <div className="flex min-w-0 flex-col gap-10">
          {/* THE SHIP-TO AND ITS MAP, side by side — the ship-to sheet's
              address template, with a ship-to picker for the address. */}
          <SheetSection id="asset-location" title="Location">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                {/* A NEW SHIP-TO WITHOUT LEAVING (Pavan, 2026-10-14) — it
                    opens over this sheet and comes back chosen. */}
                <SheetField
                  label={
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>
                        Ship-to<span className="text-destructive"> *</span>
                      </span>
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setNewShipTo(true)}>
                        <Plus />
                        New ship-to
                      </Button>
                    </span>
                  }
                >
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
                <div className="grid grid-cols-2 gap-4">
                  <SheetField label="Latitude" required>
                    <Input
                      inputMode="decimal"
                      value={draft.lat ?? ""}
                      placeholder="e.g. 29.7803"
                      onChange={(e) => set("lat", num(e.target.value))}
                    />
                  </SheetField>
                  <SheetField label="Longitude" required>
                    <Input
                      inputMode="decimal"
                      value={draft.lng ?? ""}
                      placeholder="e.g. -95.3806"
                      onChange={(e) => set("lng", num(e.target.value))}
                    />
                  </SheetField>
                </div>
              </div>
              <LocationMap
                className="h-80 lg:h-auto lg:min-h-80"
                location={site ? { lat: site.lat, lng: site.lng } : null}
                geofence={site?.geofence ? site.geofence * 1609.34 : null}
                assets={[
                  ...others.map((a) => ({ key: a.id, name: a.name, lat: a.lat, lng: a.lng, fixed: true })),
                  { key: "self", name: draft.name || "This asset", lat: draft.lat, lng: draft.lng, active: true },
                ]}
                onPress={(lat, lng) => setDraft((d) => (d ? { ...d, lat, lng } : d))}
                onAssetMove={(k, lat, lng) => k === "self" && setDraft((d) => (d ? { ...d, lat, lng } : d))}
              />
            </div>
          </SheetSection>

        </div>
        )}
      </RecordSheet>
      <ShipToSheet
        level={2}
        shipTo={null}
        open={newShipTo}
        creating
        onOpenChange={setNewShipTo}
        onCreated={(st) => setSiteId(st.id)}
      />
      <ActivityLogSheet
        open={showLog && Boolean(asset)}
        onOpenChange={setShowLog}
        title={asset?.name ?? "Asset"}
        subtitle={site?.name}
        entries={asset ? assetLog(asset.id) : []}
      />
    </>
  );
}

/*
  ORDER HISTORY (Pavan, 2026-10-17) — this tank's last orders: when, what,
  how much, and the level it was ordered at and refilled to.
*/
function AssetOrderHistory({ asset }: { asset: Asset }) {
  const nav = usePortalNav();
  const rows = useRequests()
    .filter((r) => r.status !== "Draft")
    .flatMap((r) => r.lines.filter((l) => l.assetId === asset.id).map((l) => ({ r, l })))
    .sort((x, y) => (y.r.date || "").localeCompare(x.r.date || ""))
    .slice(0, 10);
  return (
    <SheetSection title="Order history" flush>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
              {["Order #", "Date", "Product", "Qty (gal)", "Ordered at → refilled to", "Status"].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, l }, i) => (
              <tr key={`${r.id}-${i}`} className="h-12 border-b border-border last:border-b-0">
                <td className="whitespace-nowrap px-3">
                  <button
                    type="button"
                    className="tabular-nums text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 hover:decoration-solid"
                    onClick={() => nav.openOrder(r.requestNo)}
                  >
                    {r.requestNo}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 text-foreground">{r.date ? printKey(r.date) : "—"}</td>
                <td className="whitespace-nowrap px-3 text-foreground">{l.product || "—"}</td>
                <td className="whitespace-nowrap px-3 tabular-nums text-foreground">
                  {l.topOff ? "Top off" : l.gal.toLocaleString()}
                </td>
                <td className="px-3">
                  {l.levelAtOrder === undefined ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <LineLevel line={l} />
                  )}
                </td>
                <td className="whitespace-nowrap px-3">
                  <StatusChip tone={REQUEST_STATUS_TONE[r.status]} variant="text">
                    {r.status}
                  </StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SheetSection>
  );
}
