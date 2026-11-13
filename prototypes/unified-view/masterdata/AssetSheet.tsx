import * as React from "react";
import { ArrowRightLeft, ChevronDown, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { FIGURE_STRIP, Figure, WORK_AREA, WORK_AREA_FIT, useDockedWorkArea } from "./sheetParts";
import { cn } from "@/lib/utils";

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
  /* OVERVIEW KEEPS THE FIGURES (Pavan, 2026-11-13): on Overview the four
     figures stay while the tables scroll under them; a wheel down over the
     figures folds them away, a wheel up at the top of the tables (or the
     rail) brings them back. The other tabs keep the docking scroll. */
  const [tab, setTab] = React.useState("overview");
  const overview = tab === "overview";
  const [figuresHidden, setFiguresHidden] = React.useState(false);
  const work = useDockedWorkArea(!overview);
  React.useEffect(() => setFiguresHidden(false), [tab, a.uid]);
  /** Wheel up with nothing above to scroll back to → the figures return. */
  const onWorkWheel = (e: React.WheelEvent) => {
    if (!overview || !figuresHidden || e.deltaY >= 0) return;
    for (let n = e.target as HTMLElement | null; n && n !== e.currentTarget; n = n.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(n).overflowY) && n.scrollTop > 0) return;
    }
    setFiguresHidden(false);
  };

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
        /* ONE CHIP, THEN TWO GROUPS (Pavan, 2026-11-13): the status alone
           beside the name; under it, what and where · a rule · whose and in
           what shape. Ownership and condition were two more chips. */
        headerSubtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{[a.type, a.customer ?? "No customer", a.site].join(" · ")}</span>
            <Separator orientation="vertical" className="data-[orientation=vertical]:h-3.5" />
            <span>{[a.ownership, a.condition].join(" · ")}</span>
          </span>
        }
        headerAside={<StatusChip tone={kindTone(STATUS_KIND[a.status])}>{a.status}</StatusChip>}
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
        {/* THE FOUR FIGURES — one bordered strip, as the reference. On
            Overview they fold away only when wheeled down over. */}
        <div
          className="-mb-10 grid shrink-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
          style={{ gridTemplateRows: overview && figuresHidden ? "0fr" : "1fr" }}
          aria-hidden={(overview && figuresHidden) || undefined}
          inert={(overview && figuresHidden) || undefined}
          onWheel={(e) => overview && e.deltaY > 0 && setFiguresHidden(true)}
        >
        <div className={cn("min-h-0 overflow-hidden", !(overview && figuresHidden) && "pb-10")}>
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
        </div>
        </div>

        <div ref={work} className={overview ? WORK_AREA_FIT : WORK_AREA} onWheel={onWorkWheel}>
          {/* LEFT — the three views, under one filter bar. */}
          <AssetViews asset={a} onTabChange={setTab} />

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
