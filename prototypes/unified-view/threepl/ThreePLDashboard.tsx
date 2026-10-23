import { cn } from "@/lib/utils";
import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusChip } from "@/components/ui/status-chip";
import { dateKeyOf, startOfDay } from "../data";
import { BarColumns, BarList, Panel, StatTile, DASHBOARD_GROUND } from "../DashboardParts";
import { DateRangeFilter, type DateRange } from "./DateRangeFilter";
import {
  BROKER_ORDERS,
  BROKER_STATUSES,
  BROKER_STATUS_TONE,
  ORDER_TYPE_FILTERS,
  customerTotal,
  quoteTotal,
  type BrokerOrder,
  type BrokerStatus,
  LINE_SCOPES,
  inLineScope,
  type LineScope,
} from "./orders";
import { vendorName } from "./vendors";
import { cuttableDays, ordersFromPrograms } from "./recurringOrders";
import { usePrograms } from "./recurringPrograms";

/*
  3PL DASHBOARD (Pavan, 2026-10-05) — the module's overview and its landing
  page. Read from the same orders the board shows (the seed plus what the
  recurring rules cut for the range), in the same line and date range, so
  every number here is the number the list opens on.

  WHAT IT ASKS, top to bottom: how much is live and what it is worth · where
  the work is sitting · when it lands · what kind it is · who it is for and
  who carries it · what needs somebody now.
*/

export interface ThreePLDrill {
  line: LineScope;
  range: DateRange;
  facets: string[];
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** The status filter's word for a lane — Draft is "Created / Draft" there. */
const statusFacet = (s: BrokerStatus) =>
  `status:${s === "Draft" ? "Created / Draft" : s}`;

/** Live = still being worked: not settled, not canceled. */
const LIVE: BrokerStatus[] = BROKER_STATUSES.filter(
  (s) => s !== "Synced" && s !== "Canceled"
);
/** Needs somebody now: not yet out, stuck, held, or a failed sync. */
const NEEDS_ACTION: BrokerStatus[] = ["Draft", "Blocked", "Review", "Partially Synced"];

/** What the held partner charges, when one holds it — the board's own sum. */
function costOf(r: BrokerOrder): number | null {
  if (!r.vendorId) return null;
  const q = r.quotes.find((x) => x.vendorId === r.vendorId);
  return q ? quoteTotal(q, r.lines, !r.loadOrder) : null;
}

export function ThreePLDashboard({
  onDrill,
  onOpenOrder,
}: {
  /** Open Delivery Orders narrowed to these rows. */
  onDrill: (d: ThreePLDrill) => void;
  /** Open one order's sheet. */
  onOpenOrder: (id: string) => void;
}) {
  const [line, setLine] = React.useState<LineScope>("All");
  const [range, setRange] = React.useState<DateRange>(() => {
    const today = startOfDay(new Date());
    const to = new Date(today);
    to.setDate(to.getDate() + 6);
    return { from: today, to };
  });
  const [programs] = usePrograms();

  const rows = React.useMemo(() => {
    const cut = ordersFromPrograms(
      programs,
      cuttableDays(range.from, range.to),
      new Set(BROKER_ORDERS.map((r) => r.id)),
      Math.max(...BROKER_ORDERS.map((r) => Number(r.orderNo.slice(2)) || 0)) + 1
    );
    const from = dateKeyOf(range.from);
    const to = dateKeyOf(range.to);
    return [...cut, ...BROKER_ORDERS].filter(
      (r) => inLineScope(line, r.serviceLine) && r.dateKey >= from && r.dateKey <= to
    );
  }, [programs, range, line]);

  const drill = (facets: string[], at: DateRange = range) =>
    onDrill({ line, range: at, facets });

  const live = rows.filter((r) => LIVE.includes(r.status));
  const priced = live
    .map((r) => ({ r, cost: costOf(r) }))
    .filter((x): x is { r: BrokerOrder; cost: number } => x.cost !== null);
  const cost = priced.reduce((s, x) => s + x.cost, 0);
  const revenue = priced.reduce((s, x) => s + customerTotal(x.r.lines, x.r.orderFees), 0);
  const margin = revenue - cost;
  const needs = rows.filter((r) => NEEDS_ACTION.includes(r.status));

  /* Where the work is sitting — the board's lanes, in its order. */
  const byLane = BROKER_STATUSES.filter((s) => s !== "Canceled").map((s) => {
    const n = rows.filter((r) => r.status === s).length;
    return {
      key: s,
      label: s === "Draft" ? "Orders" : s,
      value: n,
      detail: `${n} ${n === 1 ? "order" : "orders"}`,
      onOpen: n ? () => drill([statusFacet(s)]) : undefined,
    };
  });

  /* When it lands — one bar per day of the range. */
  const days: Date[] = [];
  for (let d = new Date(range.from); d <= range.to; d.setDate(d.getDate() + 1))
    days.push(new Date(d));
  const byDay = days.map((d) => {
    const key = dateKeyOf(d);
    const n = rows.filter((r) => r.dateKey === key).length;
    return {
      key,
      label: DAY_FMT.format(d),
      value: n,
      detail: `${n} ${n === 1 ? "order" : "orders"}`,
      onOpen: n ? () => drill([], { from: d, to: d }) : undefined,
    };
  });

  /* What kind of work — the Order Types facet's own words. */
  const typeOf = (r: BrokerOrder) =>
    r.orderType === "Asset Movement" ? "Movement" : r.orderType;
  const byType = [...new Set(rows.map(typeOf))]
    .map((t) => {
      const n = rows.filter((r) => typeOf(r) === t).length;
      const facet = (ORDER_TYPE_FILTERS as readonly string[]).includes(t);
      return {
        key: t,
        label: t,
        value: n,
        detail: `${n} ${n === 1 ? "order" : "orders"}`,
        onOpen: facet ? () => drill([`orderTypes:${t}`]) : undefined,
      };
    })
    .sort((a, b) => b.value - a.value);

  /* Who it is for — billed to the customer, priced orders only. */
  const byCustomer = [...new Set(priced.map((x) => x.r.customer.title))]
    .map((c) => {
      const mine = priced.filter((x) => x.r.customer.title === c);
      const v = mine.reduce((s, x) => s + customerTotal(x.r.lines, x.r.orderFees), 0);
      return {
        key: c,
        label: c,
        value: v,
        detail: `${MONEY.format(v)} · ${mine.length} priced ${mine.length === 1 ? "order" : "orders"}`,
        onOpen: () => drill([`customer:${c}`]),
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  /* Who carries it — what each partner is paid, on the orders they hold. */
  const byPartner = [...new Set(priced.map((x) => x.r.vendorId as string))]
    .map((id) => {
      const mine = priced.filter((x) => x.r.vendorId === id);
      const v = mine.reduce((s, x) => s + x.cost, 0);
      return { id, name: vendorName(id), loads: mine.length, cost: v };
    })
    .sort((a, b) => b.cost - a.cost);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      {/* THE SCOPE, THE BOARD'S OWN — the line and the date range. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={line}
          onValueChange={(v) => v && setLine(v as LineScope)}
        >
          {LINE_SCOPES.map((l) => (
            <ToggleGroupItem key={l} value={l} className="px-3">
              {l}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {/* WHITE CARDS ON THEIR GROUND — see DashboardParts. */}
      <div className={cn("flex shrink-0 flex-col gap-3", DASHBOARD_GROUND)}>
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Live orders"
          value={live.length.toLocaleString()}
          note={`${priced.length} priced · ${live.length - priced.length} unpriced`}
          onOpen={() => drill(LIVE.map(statusFacet))}
        />
        <StatTile
          label="Estimated partner cost"
          value={MONEY.format(cost)}
          note={`${priced.length} orders a partner holds`}
          onOpen={() =>
            drill([...new Set(priced.map((x) => x.r.status))].map(statusFacet))
          }
        />
        <StatTile
          label="Estimated margin"
          value={MONEY.format(margin)}
          note={revenue ? `${((margin / revenue) * 100).toFixed(1)}% of revenue` : "Nothing priced yet"}
        />
        <StatTile
          label="Needs action"
          value={needs.length.toLocaleString()}
          note="Draft · Blocked · Review · Partially Synced"
          onOpen={() => drill(NEEDS_ACTION.map(statusFacet))}
        />
      </div>

      <div className="grid shrink-0 gap-3 lg:grid-cols-2">
        <Panel title="Orders by lane" aside={`${rows.length} orders`}>
          <BarColumns data={byLane} />
        </Panel>
        <Panel title="Orders by delivery date" aside={`${days.length} days`}>
          <BarColumns data={byDay} />
        </Panel>
      </div>

      <div className="grid shrink-0 gap-3 lg:grid-cols-2">
        <Panel title="Order types" aside="share of orders">
          <BarList data={byType} share />
        </Panel>
        <Panel title="Top customers" aside="estimated customer price">
          <BarList data={byCustomer} format={(n) => MONEY.format(n)} />
        </Panel>
      </div>

      <div className="grid shrink-0 gap-3 lg:grid-cols-2">
        <Panel title="Partner spend" aside={`${byPartner.length} partners holding orders`}>
          {byPartner.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No partner holds an order in this range.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-2 text-xs">Partner</TableHead>
                  <TableHead className="px-2 text-xs">Loads</TableHead>
                  <TableHead className="px-2 text-xs">Cost</TableHead>
                  <TableHead className="px-2 text-xs">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPartner.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => drill([`vendor:${p.name}`])}
                  >
                    <TableCell className="px-2">{p.name}</TableCell>
                    <TableCell className="px-2 tabular-nums">{p.loads}</TableCell>
                    <TableCell className="px-2 tabular-nums">{MONEY.format(p.cost)}</TableCell>
                    <TableCell className="px-2 tabular-nums text-muted-foreground">
                      {cost ? `${Math.round((p.cost / cost) * 100)}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        <Panel title="Needs attention" aside={`${needs.length} orders`}>
          {needs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing waiting on anybody.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-2 text-xs">Order</TableHead>
                  <TableHead className="px-2 text-xs">Customer</TableHead>
                  <TableHead className="px-2 text-xs">Status</TableHead>
                  <TableHead className="px-2 text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {needs.slice(0, 8).map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => {
                      /* ON ITS OWN DAY, so the board has it loaded. */
                      const [y, m, d] = r.dateKey.split("-").map(Number);
                      const day = new Date(y, m - 1, d);
                      drill([], { from: day, to: day });
                      onOpenOrder(r.id);
                    }}
                  >
                    <TableCell className="px-2 tabular-nums">{r.orderNo}</TableCell>
                    <TableCell className="max-w-40 truncate px-2">{r.customer.title}</TableCell>
                    <TableCell className="px-2">
                      <StatusChip tone={BROKER_STATUS_TONE[r.status]} variant="soft">
                        {r.status}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="px-2 tabular-nums text-muted-foreground">
                      {r.date.title}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
      </div>
    </div>
  );
}
