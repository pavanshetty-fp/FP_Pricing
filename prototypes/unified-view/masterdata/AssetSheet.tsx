import * as React from "react";
import { ArrowRightLeft, ChevronDown, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordSheet } from "../RecordSheet";
import { kindTone } from "../statusKind";
import { LevelGauge } from "../../customer-portal/TankLevel";
import { DirectoryRecordSheet } from "../threepl/DirectoryRecordSheet";
import type { FormSectionDef } from "../threepl/directoryFormTypes";
import { DASH } from "../threepl/directoryCore";
import { deliveryStats, levelPct, monitorState, type MdAsset } from "./assets";
import { STATUS_KIND, assetActions, gal, stamp } from "./assetParts";
import { AssetViews } from "./AssetViews";
import { AssetOrderSheet } from "./AssetOrderForms";
import { DetailsCards } from "./AssetDetails";
import { FIGURE_STRIP, Figure, WORK_AREA, useDockedWorkArea } from "./sheetParts";

/*
  ASSET 360 (Pavan, 2026-11-02 — "keep the format similar to the Lovable
  prototype … a full side sheet and add all the details").

  The reference's page, as a FULL side sheet over the list:
    · header — the asset, what it is and where, its pills, and Create
      order (a movement order or a service order, each its own create sheet
      — AssetOrderForms.tsx);
    · four figures across — tank level, capacity and product, fuel
      deliveries, monitor;
    · left, three views — movement orders, journey, activity log — under
      one search and filter bar (AssetViews.tsx);
    · right, as the rail, the asset's details as a card per subject —
      Placement, Contract, Tank and monitor (AssetDetails.tsx) — each with
      Edit details opening the asset form over the sheet (autosaves).
*/

export function AssetSheet({
  asset: a,
  form,
  onClose,
  onChange,
  update,
}: {
  asset: MdAsset;
  /** The asset's form — Edit details opens it over this sheet. */
  form: FormSectionDef<MdAsset>[];
  onClose: () => void;
  onChange: (next: MdAsset) => void;
  update: (uid: string, fn: (a: MdAsset) => MdAsset) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const work = useDockedWorkArea();

  const { createMovement, createService, toggleMonitor } = assetActions(a, update);
  /* CREATE ORDER (Pavan, 2026-11-02) — one button, two orders, each its own sheet. */
  const [creating, setCreating] = React.useState<"movement" | "service" | null>(null);
  const pct = levelPct(a);
  const stats = deliveryStats(a);


  return (
    <>
      <RecordSheet
        size="full"
        open
        onOpenChange={(o) => !o && onClose()}
        mode="edit"
        editTitle={`${a.id} · Asset 360`}
        createTitle=""
        createAction=""
        showCancel={false}
        stepNav={false}
        /* NO FOOTER (Pavan, 2026-11-02) — nothing here to confirm; edits
           autosave in Edit details, and Close is the exit. */
        noFooter
        headerSubtitle={
          <span className="text-sm text-muted-foreground">
            {[a.type, a.customer ?? "No customer", a.site].join(" · ")}
          </span>
        }
        headerAside={
          <span className="flex items-center gap-1.5">
            <StatusChip tone={kindTone(STATUS_KIND[a.status])}>{a.status}</StatusChip>
            <Pill>{a.ownership}</Pill>
            <Pill>{a.condition}</Pill>
          </span>
        }
        headerActions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus />
                Create order
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => setCreating("movement")}>
                <ArrowRightLeft />
                Movement order
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCreating("service")}>
                <Wrench />
                Service order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        onSubmit={onClose}
      >
        {/* THE FOUR FIGURES — one bordered strip, as the reference. */}
        <div className={FIGURE_STRIP}>
          <Figure
            label="Tank level"
            value={pct === null ? "Not monitored" : `${pct}%`}
            note={pct === null ? "No connected reading" : `${gal((a.monitor?.levelGal ?? 0))} of ${gal(a.capacityGal)}`}
          >
            {pct !== null && <LevelGauge pct={pct} className="mt-1 w-full" />}
          </Figure>
          <Figure label="Capacity and product" value={gal(a.capacityGal)} note={a.product ?? "No product"} />
          <Figure
            label="Fuel deliveries"
            value={a.deliveries.length}
            note={`${gal(stats.totalGal)} in recorded history`}
          />
          <Figure
            label="Monitor"
            value={a.monitor ? monitorState(a) : "No monitor"}
            note={a.monitor ? `${a.monitor.id} · ${a.monitor.lastPing ? stamp(a.monitor.lastPing) : "No ping yet"}` : DASH}
          />
        </div>

        <div ref={work} className={WORK_AREA}>
          {/* LEFT — the three views, under one filter bar. */}
          <AssetViews asset={a} />

          {/* RIGHT, AS THE RAIL (Pavan, 2026-11-02) — every fact the reference lists, read-only. */}
          <div className="flex min-h-0 flex-col gap-3 overflow-auto">
          {/* A CARD PER SUBJECT (Pavan chose V3, 2026-11-03; the long list
              and the grouped card are archived). */}
          <DetailsCards a={a} onEdit={() => setEditing(true)} onToggleMonitor={toggleMonitor} />
          </div>
        </div>
      </RecordSheet>

      {creating && (
        <AssetOrderSheet
          kind={creating}
          asset={a}
          onClose={() => setCreating(null)}
          onCreateMovement={createMovement}
          onCreateService={createService}
        />
      )}

      {/* EDIT DETAILS — the asset's form, over the sheet; it autosaves. */}
      {editing && (
        <DirectoryRecordSheet<MdAsset>
          level={2}
          open
          onOpenChange={(o) => !o && setEditing(false)}
          mode="edit"
          noun="Asset"
          title={`Edit ${a.id}`}
          recordKey={`${a.uid}-edit`}
          initial={a}
          sections={form}
          onAutosave={onChange}
          onClose={(latest) => latest && onChange(latest)}
          onSubmit={(draft) => {
            onChange(draft);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}
