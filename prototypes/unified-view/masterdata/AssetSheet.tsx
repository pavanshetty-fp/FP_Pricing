import * as React from "react";
import { toast } from "sonner";
import { Archive, ArrowRightLeft, CheckCircle2, ChevronDown, Link2, Link2Off, MoreHorizontal, Pencil, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RecordSheet } from "../RecordSheet";
import { RailCard } from "../SheetCards";
import { kindTone } from "../statusKind";
import { LevelGauge } from "../../customer-portal/TankLevel";
import { DirectoryRecordSheet, ReadField } from "../threepl/DirectoryRecordSheet";
import type { FormSectionDef } from "../threepl/directoryFormTypes";
import { DASH, formatDate, money } from "../threepl/directoryCore";
import { deliveryStats, levelPct, monitorState, type MdAsset } from "./assets";
import { STATUS_KIND, Status, assetActions, gal, stamp } from "./assetParts";
import { AssetViews } from "./AssetViews";
import { AssetOrderSheet } from "./AssetOrderForms";

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
    · right, as the rail, Asset details — every fact the reference lists,
      read-only, with Edit details opening the asset form over the sheet
      (autosaves). Swapped from the reference's sides (Pavan, 2026-11-02).
*/

/** One of the four figures across the top. */
function Figure({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: React.ReactNode;
  note: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 p-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="truncate text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="truncate text-xs text-muted-foreground">{note}</span>
      {children}
    </div>
  );
}

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

  const { createMovement, createService, toggleMonitor } = assetActions(a, update);
  /* CREATE ORDER (Pavan, 2026-11-02) — one button, two orders, each its own sheet. */
  const [creating, setCreating] = React.useState<"movement" | "service" | null>(null);
  const pct = levelPct(a);
  const stats = deliveryStats(a);
  const leases = [...a.leases].sort((x, y) => (y.from ?? "").localeCompare(x.from ?? ""));
  const archived = a.recordStatus === "archived";

  const setArchived = (on: boolean) => {
    onChange({ ...a, recordStatus: on ? "archived" : "active" });
    toast.success(on ? "Asset archived" : "Asset restored");
    if (on) onClose();
  };

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
        headerMenu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More asset actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {archived ? (
                <DropdownMenuItem onSelect={() => setArchived(false)}>
                  <CheckCircle2 />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onSelect={() => setArchived(true)}>
                  <Archive />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        onSubmit={onClose}
      >
        {/* THE FOUR FIGURES — one bordered strip, as the reference. */}
        <div className="grid shrink-0 grid-cols-2 divide-border overflow-hidden rounded-lg border border-border lg:grid-cols-4 lg:divide-x">
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

        <div className="grid min-h-[560px] flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]">
          {/* LEFT — the three views, under one filter bar. */}
          <AssetViews asset={a} />

          {/* RIGHT, AS THE RAIL (Pavan, 2026-11-02) — every fact the reference lists, read-only. */}
          <div className="min-h-0 overflow-auto">
          <RailCard
            title="Asset details"
            action={
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Edit details" onClick={() => setEditing(true)}>
                    <Pencil />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit details</TooltipContent>
              </Tooltip>
            }
          >
            <dl className="flex flex-col gap-4 px-4 py-4">
              <ReadField label="Asset ID" value={a.id} />
              <ReadField label="Asset type" value={a.type} />
              <ReadField label="Placed on" value={a.placedOn ? formatDate(a.placedOn) : null} />
              {a.ownership === "Rental" && <ReadField
                label="Lease contract"
                value={
                  leases.length ? (
                    <span className="flex flex-col gap-1.5 pt-0.5">
                      {leases.map((l) => (
                        <span key={l.id} className="flex items-center gap-2">
                          <span className="tabular-nums">{l.id}</span>
                          <Status value={l.status} />
                        </span>
                      ))}
                    </span>
                  ) : null
                }
              />}
              <ReadField label="Customer" value={a.customer} />
              <ReadField label="Site" value={a.site} />
              <ReadField label="Address" value={a.address} />
              {/* A customer's own tank has no rental terms — as its form. */}
              {a.ownership === "Rental" && (
                <>
                  <ReadField label="On rent since" value={a.onRentSince ? formatDate(a.onRentSince) : null} />
                  <ReadField label="Rental rate" value={a.rate === null ? null : `${money(a.rate)} / mo`} />
                </>
              )}
              <ReadField label="Fuel product" value={a.product} />
              <ReadField label="Capacity" value={gal(a.capacityGal)} />
              <ReadField
                label="Current level"
                value={pct === null ? "Not monitored" : `${gal(a.monitor?.levelGal ?? 0)} · ${pct}%`}
              />
              <ReadField
                label="Monitor"
                value={a.monitor ? `${a.monitor.model} · ${a.monitor.id} · ${monitorState(a)}` : "No monitor"}
              />
              <ReadField
                label="Last ping"
                value={a.monitor?.lastPing ? stamp(a.monitor.lastPing) : null}
              />
              {a.monitor && (
                <Button variant="outline" size="sm" className="self-start" onClick={toggleMonitor}>
                  {a.monitor.linked ? <Link2Off /> : <Link2 />}
                  {a.monitor.linked ? "Unlink monitor" : "Link monitor"}
                </Button>
              )}
            </dl>
          </RailCard>
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
