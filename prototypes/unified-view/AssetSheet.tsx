import * as React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelectList } from "@/components/ui/multi-select-list";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { RecordSheet } from "./RecordSheet";
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

  React.useEffect(() => {
    if (!open) return;
    setDraft(creating ? emptyDraft() : asset ? draftFrom(asset) : null);
  }, [open, creating, asset]);

  if (!draft || (!creating && !asset)) return null;

  const set = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <RecordSheet
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={asset?.displayName ?? ""}
      createTitle="Create New Asset"
      createAction="Create New Asset"
      headerAside={
        <StatusChip tone={ASSET_STATUS_TONE[draft.status]} variant="soft">
          {draft.status}
        </StatusChip>
      }
      onSubmit={() => {
        if (creating) onCreate?.(draft);
        else if (asset) onSave(asset, draft);
      }}
    >
      <SheetSection title="Identity">
        <SheetField label="Display Name">
          <Input
            value={draft.displayName}
            placeholder="e.g. Northgate Tank 4"
            onChange={(e) => set("displayName", e.target.value)}
          />
        </SheetField>

        <div className="grid grid-cols-2 gap-4">
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
          label="Created On"
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
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Hub">
            <Combobox
              className="w-full"
              value={draft.hub}
              onValueChange={(v) => set("hub", v)}
              options={HUBS}
              placeholder="Select hub"
            />
          </SheetField>
          <SheetField label="LOS">
            <Combobox
              className="w-full"
              value={draft.los}
              onValueChange={(v) => set("los", v)}
              options={ASSET_LOS}
              placeholder="Select line of service"
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

      <SheetSection title="Capacity & Compatibility">
        <SheetField
          label="Size (Gal)"
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
          label="Product Compatibility"
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
            <span className="text-sm font-medium">Tank Monitor</span>
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
            aria-label="Tank Monitor"
          />
        </div>

        {draft.tankMonitor && (
          <SheetField
            label="Tank Monitor ID"
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
