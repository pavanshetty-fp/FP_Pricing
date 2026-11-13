import { cn } from "@/lib/utils";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelectList } from "@/components/ui/multi-select-list";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "./RecordSheet";
import {
  ASSET_LOS,
  ASSET_STATUSES,
  ASSET_STATUS_TONE,
  HUBS,
  PRODUCT_COMPATIBILITY,
  type Asset,
  type AssetStatus,
} from "./assets";

/**
 * Asset side sheet — same shell and rhythm as the other three.
 *
 * TANK MONITOR IS PROGRESSIVE: the ID field only exists when the switch is on,
 * which is §3's "progressive disclosure — start minimal, reveal detail on
 * action; don't render empty complex UI up front". Turning the switch off clears
 * the ID rather than leaving an orphaned value that would be saved but never
 * shown.
 *
 * CREATED ON IS NOT EDITABLE. It is the date of record — the moment the asset
 * entered the system — so it is displayed, not offered as a control. On a new
 * asset it reads "Set on creation" because there is nothing to show yet.
 */
export interface AssetDraft {
  displayName: string;
  uniqueId: string;
  erpId: string;
  hub: string;
  los: string;
  products: string[];
  capacityGal: number;
  tankMonitor: boolean;
  tankMonitorId: string;
  status: AssetStatus;
  note: string;
}

function draftFrom(a: Asset): AssetDraft {
  return {
    displayName: a.displayName,
    uniqueId: a.uniqueId,
    erpId: a.erpId,
    hub: a.hub,
    los: a.los,
    products: [...a.products],
    capacityGal: a.capacityGal,
    tankMonitor: a.tankMonitor,
    tankMonitorId: a.tankMonitorId,
    status: a.status,
    note: a.note,
  };
}

/** A blank asset. `status: "Active"` and `tankMonitor: false` — neither control
 *  has an empty state, and a new asset is the common case for both. */
function emptyDraft(): AssetDraft {
  return {
    displayName: "",
    uniqueId: "",
    erpId: "",
    hub: "",
    los: "",
    products: [],
    capacityGal: 0,
    tankMonitor: false,
    tankMonitorId: "",
    status: "Active",
    note: "",
  };
}

export interface AssetSheetProps {
  asset: Asset | null;
  mode?: "edit" | "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (asset: Asset, draft: AssetDraft) => void;
  onCreate?: (draft: AssetDraft) => void;
}

export function AssetSheet({
  asset,
  mode = "edit",
  open,
  onOpenChange,
  onSave,
  onCreate,
}: AssetSheetProps) {
  const [draft, setDraft] = React.useState<AssetDraft | null>(null);
  const creating = mode === "create";
  const saveState = useDraftSaveState(draft, open);
  /* WHAT WENT OUT LAST. The row comes back changed by our own save, so
     without this the sheet would answer its own write with a rebuild. */
  const lastSaved = React.useRef<string | null>(null);

  /* THE DRAFT IS BUILT ONCE PER RECORD, keyed on the id rather than the row.
     Keyed on the row, every autosave would hand the form a new object and
     rebuild it under the cursor. */
  const assetId = asset?.id ?? null;
  React.useEffect(() => {
    if (!open) return;
    const next = creating ? emptyDraft() : asset ? draftFrom(asset) : null;
    lastSaved.current = next ? JSON.stringify(next) : null;
    setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, creating, assetId]);

  /* AUTOSAVED, DEBOUNCED — the DS rule for every side sheet with editable
     fields in it. 600ms, the same everywhere. */
  React.useEffect(() => {
    if (creating || !asset || !draft) return;
    const serialised = JSON.stringify(draft);
    if (serialised === lastSaved.current) return;
    const t = window.setTimeout(() => {
      lastSaved.current = serialised;
      onSave(asset, draft);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, asset, creating, onSave]);

  if (!draft || (!creating && !asset)) return null;

  const set = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <RecordSheet
      /* A RECORD IS DATA-INTENSIVE — 1200, fields three across; creating is
         a 600 form (Pavan, 2026-10-15). */
      size={creating ? "form" : "data"}
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={asset?.displayName ?? ""}
      createTitle="Create asset"
      createAction="Create asset"
      /* IT AUTOSAVES, SO THERE IS NOTHING TO CANCEL AND NOTHING TO SAVE. An
         edit is already written by the time the reader looks up; creating
         still takes an act, because the record does not exist until somebody
         says so. */
      showCancel={false}
      footerPrimary={creating ? undefined : null}
      headerAside={
        <span className="flex items-center gap-2">
          <StatusChip tone={ASSET_STATUS_TONE[draft.status]} variant="soft">
            {draft.status}
          </StatusChip>
          {saveState !== "idle" && (
            <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />
          )}
        </span>
      }
      onSubmit={() => {
        if (creating) onCreate?.(draft);
      }}
    >
      <SheetSection title="Identity">
        <SheetField label="Display name">
          <Input
            value={draft.displayName}
            placeholder="e.g. Northgate Tank 4"
            onChange={(e) => set("displayName", e.target.value)}
          />
        </SheetField>

        <div className={cn("grid gap-4", creating ? "grid-cols-2" : "grid-cols-3")}>
          <SheetField label="Unique ID">
            <Input
              value={draft.uniqueId}
              placeholder="e.g. AX7K2M91"
              maxLength={8}
              onChange={(e) =>
                set("uniqueId", e.target.value.toUpperCase().slice(0, 8))
              }
            />
          </SheetField>
          <SheetField label="ERP ID">
            <Input
              inputMode="numeric"
              value={draft.erpId}
              placeholder="e.g. 4182230000114772"
              maxLength={16}
              onChange={(e) =>
                set("erpId", e.target.value.replace(/[^0-9]/g, "").slice(0, 16))
              }
            />
          </SheetField>
        </div>

        <SheetField
          label="Created on"
        >
          <Input
            readOnly
            value={creating ? "" : (asset?.createdOn ?? "")}
            placeholder="Set on creation"
            className="text-muted-foreground"
          />
        </SheetField>
      </SheetSection>

      <SheetSection title="Placement">
        <div className={cn("grid gap-4", creating ? "grid-cols-2" : "grid-cols-3")}>
          <SheetField label="Hub">
            <Combobox
              className="w-full"
              value={draft.hub}
              onValueChange={(v) => set("hub", v)}
              options={HUBS}
              placeholder="Select hub"
              /* OPTIONAL, SO THE EMPTY CHOICE FIRST (G46, Pavan, 2026-10-07). */
              clearLabel="No hub"
            />
          </SheetField>
          <SheetField label="LOS">
            <Combobox
              className="w-full"
              value={draft.los}
              onValueChange={(v) => set("los", v)}
              options={ASSET_LOS}
              placeholder="Select line of service"
              clearLabel="No line of service"
            />
          </SheetField>
        </div>

        <SheetField label="Status">
          <Combobox
            className="w-full"
            value={draft.status}
            onValueChange={(v) => set("status", v as AssetStatus)}
            options={ASSET_STATUSES}
            placeholder="Select status"
          />
        </SheetField>
      </SheetSection>

      <SheetSection title="Capacity & compatibility">
        <SheetField
          label="Size (gal)"
        >
          <Input
            inputMode="numeric"
            value={draft.capacityGal ? String(draft.capacityGal) : ""}
            placeholder="0"
            onChange={(e) =>
              set(
                "capacityGal",
                Number(e.target.value.replace(/[^0-9]/g, "")) || 0
              )
            }
          />
        </SheetField>

        <SheetField
          label="Product compatibility"
        >
          <MultiSelectList
            options={PRODUCT_COMPATIBILITY}
            value={draft.products}
            onChange={(next) => set("products", next)}
            placeholder="Search products…"
          />
        </SheetField>
      </SheetSection>

      <SheetSection title="Monitoring">
        {/* §3's progressive disclosure: the ID appears only once there is a
            monitor to identify. */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Tank monitor</span>
            <span className="text-xs text-muted-foreground">
              Whether this asset reports its level automatically.
            </span>
          </div>
          <Switch
            checked={draft.tankMonitor}
            onCheckedChange={(on) => {
              set("tankMonitor", on);
              // Clearing on the way off, so a stale id is never saved against
              // an asset that has no monitor.
              if (!on) set("tankMonitorId", "");
            }}
            aria-label="Tank monitor"
          />
        </div>

        {draft.tankMonitor && (
          <SheetField
            label="Tank monitor ID"
          >
            <Input
              value={draft.tankMonitorId}
              placeholder="e.g. TM4K9P2Q"
              maxLength={8}
              onChange={(e) =>
                set("tankMonitorId", e.target.value.toUpperCase().slice(0, 8))
              }
            />
          </SheetField>
        )}
      </SheetSection>

      <SheetSection title="Notes">
        <SheetField label="Note">
          <Textarea
            value={draft.note}
            placeholder="Service history, siting notes…"
            onChange={(e) => set("note", e.target.value)}
            className="min-h-24"
          />
        </SheetField>
      </SheetSection>
    </RecordSheet>
  );
}
