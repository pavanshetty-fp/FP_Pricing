import * as React from "react";
import { Link2, Link2Off, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RailCard, RailRow } from "../SheetCards";
import { LevelGauge } from "../../customer-portal/TankLevel";
import { DASH, daysFromToday, formatDate, money } from "../threepl/directoryCore";
import { activeLease, contractUse, levelPct, monitorState, type MdAsset } from "./assets";
import { Status, UsageBar, gal, stamp } from "./assetParts";

/*
  ASSET DETAILS — A CARD PER SUBJECT (Pavan chose V3 of three, 2026-11-03;
  the long list and the grouped card are archived in
  docs/archive/asset-360-versions-2026-11-03.md). Placement, Contract, Tank
  and monitor as their own rail cards, each with Edit, in the rail's own row
  (`RailRow`, label left, value right). The contract card leads with the
  active lease, its end date and how much of its volume is used; the tank
  card leads with the level gauge. ID and type are in the header already.
*/

const Edit = ({ onEdit }: { onEdit: () => void }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon-sm" aria-label="Edit details" onClick={onEdit}>
        <Pencil />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Edit details</TooltipContent>
  </Tooltip>
);

/** A value too long for one line — the label over it, as a rail row would wrap. */
const Stacked = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1 px-4 py-2.5">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground">{children}</dd>
  </div>
);

const Leases = ({ a }: { a: MdAsset }) => (
  <span className="flex flex-wrap gap-1.5">
    {[...a.leases]
      .sort((x, y) => (y.from ?? "").localeCompare(x.from ?? ""))
      .map((l) => (
        <span key={l.id} className="flex items-center gap-1.5">
          <span className="tabular-nums">{l.id}</span>
          <Status value={l.status} />
        </span>
      ))}
  </span>
);

const MonitorButton = ({ a, onToggle }: { a: MdAsset; onToggle: () => void }) =>
  a.monitor ? (
    <div className="px-4 pt-1 pb-3">
      <Button variant="outline" size="sm" onClick={onToggle}>
        {a.monitor.linked ? <Link2Off /> : <Link2 />}
        {a.monitor.linked ? "Unlink monitor" : "Link monitor"}
      </Button>
    </div>
  ) : null;


/* ───────────────────────────────────────────────────────── V3 ── */

export function DetailsCards({ a, onEdit, onToggleMonitor }: { a: MdAsset; onEdit: () => void; onToggleMonitor: () => void }) {
  const lease = activeLease(a);
  const use = contractUse(a);
  const left = lease?.to ? daysFromToday(lease.to) : null;
  const pct = levelPct(a);
  return (
    <div className="flex flex-col gap-4">
      <RailCard title="Placement" action={<Edit onEdit={onEdit} />}>
        <dl className="flex flex-col py-1">
          <RailRow label="Customer" value={a.customer ?? DASH} />
          <RailRow label="Site" value={a.site} />
          <Stacked label="Address">{a.address}</Stacked>
          <RailRow label="Placed on" value={a.placedOn ? formatDate(a.placedOn) : DASH} />
        </dl>
      </RailCard>

      {a.ownership === "Rental" && (
        <RailCard title="Contract" action={<Edit onEdit={onEdit} />}>
          <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
            {lease ? (
              <>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums text-foreground">{lease.id}</span>
                  <Status value={lease.status} />
                </span>
                <span className="text-xs text-muted-foreground">
                  {lease.to ? `Ends ${formatDate(lease.to)} · in ${left} days` : "Open ended"}
                </span>
                {use && (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UsageBar pct={Math.round((use.used / use.committed) * 100)} />
                    <span className="tabular-nums">
                      {use.used.toLocaleString()} of {gal(use.committed)} used
                    </span>
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No active lease</span>
            )}
          </div>
          <dl className="flex flex-col py-1">
            <RailRow label="On rent since" value={a.onRentSince ? formatDate(a.onRentSince) : DASH} />
            <RailRow label="Rate" value={a.rate === null ? DASH : `${money(a.rate)} / mo`} />
            <Stacked label="All leases">
              {a.leases.length ? <Leases a={a} /> : DASH}
            </Stacked>
          </dl>
        </RailCard>
      )}

      <RailCard title="Tank and monitor" action={<Edit onEdit={onEdit} />}>
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          <span className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold tabular-nums text-foreground">{pct === null ? DASH : `${pct}%`}</span>
            <span className="text-xs text-muted-foreground">
              {pct === null ? "Not monitored" : `${gal(a.monitor?.levelGal ?? 0)} of ${gal(a.capacityGal)}`}
            </span>
          </span>
          {pct !== null && <LevelGauge pct={pct} className="w-full" />}
        </div>
        <dl className="flex flex-col py-1">
          <RailRow label="Product" value={a.product ?? DASH} />
          <RailRow label="Monitor" value={a.monitor ? `${a.monitor.model} · ${a.monitor.id}` : "No monitor"} />
          {a.monitor && <RailRow label="Status" value={<Status value={monitorState(a)} />} />}
          <RailRow label="Last ping" value={a.monitor?.lastPing ? stamp(a.monitor.lastPing) : DASH} />
        </dl>
        <MonitorButton a={a} onToggle={onToggleMonitor} />
      </RailCard>
    </div>
  );
}
