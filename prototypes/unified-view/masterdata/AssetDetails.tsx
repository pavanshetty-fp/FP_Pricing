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
  ASSET DETAILS — VERSIONS (Pavan, 2026-11-03). V1 is the long list as it
  was (in AssetSheet). These two use the rail's own row — label left, value
  right (`RailRow`) — so the card reads like the other rail cards:

    V2  ONE CARD, GROUPED — Asset · Placement · Contract · Tank and monitor,
        each under a small heading, a rule between. Same facts as V1, a
        third of the height.
    V3  A CARD PER SUBJECT — Placement, Contract, Tank and monitor as their
        own rail cards, each with Edit. The contract card leads with the
        active lease, its end date and how much of its volume is used; the
        tank card leads with the level gauge. ID and type are in the header
        already, so they are not repeated.
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

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-b border-border py-1 last:border-b-0">
    <h4 className="px-4 pt-2.5 pb-0.5 text-xs font-medium text-muted-foreground">{title}</h4>
    <dl className="flex flex-col">{children}</dl>
  </div>
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

const Level = ({ a }: { a: MdAsset }) => {
  const pct = levelPct(a);
  return pct === null ? (
    <span className="text-muted-foreground">Not monitored</span>
  ) : (
    <span className="flex items-center gap-2">
      <LevelGauge pct={pct} />
      <span className="tabular-nums">{pct}% · {gal(a.monitor?.levelGal ?? 0)}</span>
    </span>
  );
};

/* ───────────────────────────────────────────────────────── V2 ── */

export function DetailsGrouped({ a, onEdit, onToggleMonitor }: { a: MdAsset; onEdit: () => void; onToggleMonitor: () => void }) {
  const rental = a.ownership === "Rental";
  return (
    <RailCard title="Asset details" action={<Edit onEdit={onEdit} />}>
      <Group title="Asset">
        <RailRow label="Asset ID" value={a.id} />
        <RailRow label="Type" value={a.type} />
        <RailRow label="Ownership" value={`${a.ownership} · ${a.condition}`} />
        <RailRow label="Placed on" value={a.placedOn ? formatDate(a.placedOn) : DASH} />
      </Group>
      <Group title="Placement">
        <RailRow label="Customer" value={a.customer ?? DASH} />
        <RailRow label="Site" value={a.site} />
        <Stacked label="Address">{a.address}</Stacked>
      </Group>
      {rental && (
        <Group title="Contract">
          <Stacked label="Leases">{a.leases.length ? <Leases a={a} /> : DASH}</Stacked>
          <RailRow label="On rent since" value={a.onRentSince ? formatDate(a.onRentSince) : DASH} />
          <RailRow label="Rate" value={a.rate === null ? DASH : `${money(a.rate)} / mo`} />
        </Group>
      )}
      <Group title="Tank and monitor">
        <RailRow label="Product" value={a.product ?? DASH} />
        <RailRow label="Capacity" value={gal(a.capacityGal)} />
        <RailRow label="Level" value={<Level a={a} />} />
        <RailRow label="Monitor" value={a.monitor ? `${a.monitor.model} · ${a.monitor.id}` : "No monitor"} />
        {a.monitor && <RailRow label="Status" value={<Status value={monitorState(a)} />} />}
        <RailRow label="Last ping" value={a.monitor?.lastPing ? stamp(a.monitor.lastPing) : DASH} />
        <MonitorButton a={a} onToggle={onToggleMonitor} />
      </Group>
    </RailCard>
  );
}

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
