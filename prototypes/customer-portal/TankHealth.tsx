import * as React from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CELL, RecordSheet } from "../unified-view/RecordSheet";
import {
  SHIP_TOS,
  daysToEmpty,
  daysUntil,
  levelBand,
  orderListRows,
  printKey,
  todayKey,
  NOT_DELIVERED,
  YET_TO_DELIVER,
  type Asset,
  type LevelBand,
  type OrderRequest,
} from "./orders";
import { BatteryCell, DaysToEmpty, LevelReading } from "./TankLevel";

/*
  TANK HEALTH (Pavan, 2026-10-20) — the dashboard's tank unit, in the
  Schedule card's shape: three boxes, the corner arrow opens the table.

    Tank levels      every monitored tank by the monitor's own bands
                     (≤10 urgent · 10–49 low · 50–79 moderate · 80+ fine),
                     one coloured bar and a count per band
    Days to empty    tanks running dry in 1, 2 and 3 days — and how many
                     will run dry before their next delivery (none planned
                     in time): the ones to order for now
    Monitor battery  monitors below 40%, 20%, 10% and 5% (Pavan, 2026-10-20),
                     in the Days-to-empty box's shape

  Every count is a button: it opens the table showing just those tanks.
  Each row can start an order for its tank.
*/

const BANDS: { band: LevelBand; label: string; fill: string }[] = [
  { band: "Urgent", label: "Urgent", fill: "bg-fp-lane-red" },
  { band: "Low", label: "Low", fill: "bg-fp-lane-red/55" },
  { band: "Moderate", label: "Moderate", fill: "bg-fp-lane-yellow" },
  { band: "Sufficient", label: "Fine", fill: "bg-fp-lane-green" },
];
const BATTERY_STEPS = [40, 20, 10, 5] as const;
type BatteryStep = (typeof BATTERY_STEPS)[number];

interface Tank {
  a: Asset;
  shipTo: string;
  /** Days to empty at today's usage — null without usage. */
  empty: number | null;
  /** The next delivery planned for it, `YYYY-MM-DD`. */
  next: string | null;
  /** Runs dry before its next delivery — or has none. */
  dry: boolean;
}

type Filter =
  | { kind: "all" }
  | { kind: "band"; band: LevelBand }
  | { kind: "days"; days: 1 | 2 | 3 }
  | { kind: "dry" }
  | { kind: "battery"; below: BatteryStep };

const FILTER_TITLE = (f: Filter) =>
  f.kind === "band"
    ? `${BANDS.find((b) => b.band === f.band)!.label} tanks`
    : f.kind === "days"
      ? `Empty in ${f.days} ${f.days === 1 ? "day" : "days"}`
      : f.kind === "dry"
        ? "Running dry before the next delivery"
        : f.kind === "battery"
          ? `Monitor battery below ${f.below}%`
          : "Monitored tanks";

function tanksOf(rows: OrderRequest[]): Tank[] {
  const t = todayKey();
  const coming = orderListRows(rows).filter(
    (r) => r.date >= t && (NOT_DELIVERED.includes(r.status) || YET_TO_DELIVER.includes(r.status))
  );
  return SHIP_TOS.flatMap((s) =>
    s.assets
      .filter((a) => a.monitor && a.status === "Active")
      .map((a) => {
        const empty = daysToEmpty(a);
        const next =
          coming
            .filter((r) => r.lines.some((l) => l.assetId === a.id))
            .map((r) => r.date)
            .sort()[0] ?? null;
        const dry = empty !== null && (next === null || daysUntil(next) > empty);
        return { a, shipTo: s.name, empty, next, dry };
      })
  ).sort((x, y) => x.a.level - y.a.level);
}

const matches = (f: Filter, t: Tank) =>
  f.kind === "all"
    ? true
    : f.kind === "band"
      ? levelBand(t.a.level) === f.band
      : f.kind === "days"
        ? t.empty !== null && (f.days === 1 ? t.empty <= 1 : t.empty === f.days)
        : f.kind === "dry"
          ? t.dry
          : t.a.battery < f.below;

/** A count that opens the table at its tanks. */
function CountButton({
  children,
  onClick,
  label,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col items-start gap-0.5 rounded-md px-1.5 py-1 text-left outline-none -mx-1.5 transition-colors hover:bg-fp-row-hover focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    >
      {children}
    </button>
  );
}

function Box({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-1 flex-col gap-2 px-4 py-3", className)}>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function TankHealthCard({
  rows,
  onCreateOrder,
}: {
  rows: OrderRequest[];
  /** Start an order for one tank — its ship-to and asset. */
  onCreateOrder: (shipTo: string, assetId: string) => void;
}) {
  const tanks = React.useMemo(() => tanksOf(rows), [rows]);
  const [filter, setFilter] = React.useState<Filter | null>(null);
  const open = (f: Filter) => setFilter(f);
  const count = (f: Filter) => tanks.filter((t) => matches(f, t)).length;
  const dry = count({ kind: "dry" });
  const shown = filter ? tanks.filter((t) => matches(filter, t)) : [];

  return (
    <>
      <div className="relative shrink-0 rounded-xl border border-border bg-fp-surface-1b">
        <div className="flex flex-col divide-y divide-border md:flex-row md:divide-x md:divide-y-0">
          <Box title="Tank levels">
            <p className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums text-foreground">{tanks.length}</span>
              <span className="text-sm text-muted-foreground">monitored tanks</span>
            </p>
            {/* ONE BAR, A SEGMENT PER BAND — the monitors' own colours. */}
            <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Tanks by level">
              {BANDS.map((b) => {
                const n = count({ kind: "band", band: b.band });
                return n ? <span key={b.band} className={cn("h-full", b.fill)} style={{ flex: n }} /> : null;
              })}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BANDS.map((b) => (
                <CountButton key={b.band} label={`Show ${b.label.toLowerCase()} tanks`} onClick={() => open({ kind: "band", band: b.band })}>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span aria-hidden className={cn("size-2 rounded-[2px]", b.fill)} />
                    {b.label}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-foreground">{count({ kind: "band", band: b.band })}</span>
                </CountButton>
              ))}
            </div>
          </Box>

          <Box title="Days to empty">
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((d) => (
                <CountButton key={d} label={`Show tanks empty in ${d} ${d === 1 ? "day" : "days"}`} onClick={() => open({ kind: "days", days: d })}>
                  <span className="text-xs text-muted-foreground">
                    {d} {d === 1 ? "day" : "days"}
                  </span>
                  <span className="text-2xl font-semibold tabular-nums text-foreground">{count({ kind: "days", days: d })}</span>
                </CountButton>
              ))}
            </div>
            <CountButton label="Show tanks running dry before their next delivery" onClick={() => open({ kind: "dry" })}>
              <span className={cn("text-sm", dry ? "font-medium text-status-failed" : "text-muted-foreground")}>
                {dry} will run dry before their next delivery
              </span>
            </CountButton>
          </Box>

          {/* Room for the corner button. */}
          <Box title="Monitor battery" className="pr-12">
            <div className="grid grid-cols-4 gap-2">
              {BATTERY_STEPS.map((p) => (
                <CountButton key={p} label={`Show monitors with battery below ${p}%`} onClick={() => open({ kind: "battery", below: p })}>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">Below {p}%</span>
                  <span className="text-2xl font-semibold tabular-nums text-foreground">{count({ kind: "battery", below: p })}</span>
                </CountButton>
              ))}
            </div>
          </Box>
        </div>
        {/* THE ONE CONTROL, IN THE CARD'S CORNER — every tank. */}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="View every monitored tank"
          title="View details"
          onClick={() => open({ kind: "all" })}
          className="absolute top-2.5 right-2.5 rounded-full"
        >
          <ArrowUpRight />
        </Button>
      </div>

      <RecordSheet
        fit={{ tables: [[CELL.name, CELL.pick, CELL.level, CELL.number, CELL.date, CELL.battery, CELL.pick]] }}
        open={filter !== null}
        onOpenChange={(o) => !o && setFilter(null)}
        mode="edit"
        editTitle={filter ? FILTER_TITLE(filter) : ""}
        createTitle=""
        createAction=""
        showCancel={false}
        onSubmit={() => {}}
        footerPrimary={null}
      >
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tanks.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-fp-table-header hover:bg-fp-table-header">
                  <TableHead className="pl-4">Asset</TableHead>
                  <TableHead>Ship-to</TableHead>
                  <TableHead>Current level</TableHead>
                  <TableHead>Days to empty</TableHead>
                  <TableHead>Next delivery</TableHead>
                  <TableHead>Battery</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((t) => (
                  <TableRow key={t.a.id}>
                    <TableCell className="pl-4 text-foreground">{t.a.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.shipTo}</TableCell>
                    <TableCell>
                      <LevelReading asset={t.a} />
                    </TableCell>
                    <TableCell>
                      <DaysToEmpty asset={t.a} days={t.next ? daysUntil(t.next) : undefined} />
                    </TableCell>
                    <TableCell className={cn(t.dry ? "text-status-failed" : "text-foreground")}>
                      {t.next ? printKey(t.next) : "None planned"}
                    </TableCell>
                    <TableCell>
                      <BatteryCell asset={t.a} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilter(null);
                          onCreateOrder(t.shipTo, t.a.id);
                        }}
                      >
                        <Plus />
                        Create order
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </RecordSheet>
    </>
  );
}
