import { cn } from "@/lib/utils";
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pill } from "@/components/ui/pill";
import { DateFilter } from "./DateFilter";
import { FUEL_ORDERS, dateKeyOf, startOfDay } from "./data";
import { BarColumns, BarList, Panel, StatTile, DASHBOARD_GROUND } from "./DashboardParts";
import type { FuelOrder } from "./types";
import { useUnitShort } from "./salesSettings";

/*
  SALES DASHBOARD (Pavan, 2026-10-05) — the module's overview and its landing
  page. ONE DAY AT A TIME, because Fuel Orders is: a dispatcher works a day
  and steps through days, and a dashboard over a week would open on a list
  that can only show one of them. Every press opens Orders on its Fuel Orders
  line (Pavan, 2026-10-07), on that day, narrowed with its own column boxes.

  WHAT IT ASKS: how much is going out and how much of it has a driver · who
  is carrying it · what kind of work · what product · for whom · what is
  still waiting.
*/

export interface SalesDrill {
  date: Date;
  /** Orders' column boxes — column key → text. */
  colFilters: Record<string, string>;
}

const GAL = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function SalesDashboard({
  onDrill,
  onOpenOrder,
}: {
  onDrill: (d: SalesDrill) => void;
  onOpenOrder: (id: string, date: Date) => void;
}) {
  const [date, setDate] = React.useState(() => startOfDay(new Date()));
  /* THE PRIMARY UNIT'S LABEL — Sales Settings › Preferences (2026-10-07). */
  const unit = useUnitShort();
  const gal = (n: number) => `${GAL.format(n)} ${unit}`;
  const key = dateKeyOf(date);
  const rows = React.useMemo(() => FUEL_ORDERS.filter((r) => r.dateKey === key), [key]);
  const drill = (colFilters: Record<string, string> = {}) => onDrill({ date, colFilters });

  const unassigned = rows.filter((r) => !r.driver);
  const rush = rows.filter((r) => r.tags.includes("Rush"));
  const volume = rows.reduce((s, r) => s + r.qtyGal, 0);
  const extraction = rows.filter((r) => r.type.label === "Extraction").length;

  const count = (n: number) => `${n} ${n === 1 ? "order" : "orders"}`;
  const group = <K extends string>(
    keyOf: (r: FuelOrder) => K[],
    value: (mine: FuelOrder[]) => number
  ) => {
    const keys = [...new Set(rows.flatMap(keyOf))];
    return keys
      .map((k) => {
        const mine = rows.filter((r) => keyOf(r).includes(k));
        return { k, mine, value: value(mine) };
      })
      .sort((a, b) => b.value - a.value);
  };

  /* Who is carrying it — gallons per driver, the unassigned last. */
  const byDriver = group((r) => [r.driver?.name ?? "Unassigned"], (m) =>
    m.reduce((s, r) => s + r.qtyGal, 0)
  ).map((g) => ({
    key: g.k,
    label: g.k,
    value: g.value,
    detail: `${gal(g.value)} · ${count(g.mine.length)}`,
    onOpen: () => drill({ driver: g.k }),
  }));

  /* What kind of work — delivery or extraction. */
  const byType = group((r) => [r.type.label], (m) => m.length).map((g) => ({
    key: g.k,
    label: g.k,
    value: g.value,
    detail: count(g.value),
    onOpen: () => drill({ type: g.k }),
  }));

  /* What product — orders carrying each. */
  const byProduct = group((r) => r.products.map((p) => p.name), (m) => m.length)
    .slice(0, 8)
    .map((g) => ({
      key: g.k,
      label: g.k,
      value: g.value,
      detail: count(g.value),
      onOpen: () => drill({ products: g.k }),
    }));

  /* For whom — gallons ordered. */
  const byCustomer = group((r) => [r.customer.title], (m) =>
    m.reduce((s, r) => s + r.qtyGal, 0)
  )
    .slice(0, 6)
    .map((g) => ({
      key: g.k,
      label: g.k,
      value: g.value,
      detail: `${gal(g.value)} · ${count(g.mine.length)}`,
      onOpen: () => drill({ customer: g.k }),
    }));

  /* When in the day — orders per planned hour. */
  const hourOf = (r: FuelOrder) => {
    const m = r.planned?.time.match(/^(\d{1,2}):\d{2}\s*(AM|PM)$/i);
    if (!m) return null;
    return (Number(m[1]) % 12) + (m[2].toUpperCase() === "PM" ? 12 : 0);
  };
  const buckets = [
    { key: "early", label: "Before 6a", from: 0, to: 6 },
    { key: "morning", label: "6a–12p", from: 6, to: 12 },
    { key: "afternoon", label: "12p–6p", from: 12, to: 18 },
    { key: "evening", label: "After 6p", from: 18, to: 24 },
    { key: "none", label: "Not planned", from: -1, to: -1 },
  ].map((b) => {
    const n = rows.filter((r) => {
      const h = hourOf(r);
      return b.from < 0 ? h === null : h !== null && h >= b.from && h < b.to;
    }).length;
    return { key: b.key, label: b.label, value: n, detail: count(n) };
  });

  const waiting = [...rush, ...unassigned.filter((r) => !rush.includes(r))];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div className="flex shrink-0 items-center justify-end">
        <DateFilter value={date} onChange={setDate} />
      </div>

      {/* WHITE CARDS ON THEIR GROUND — see DashboardParts. */}
      <div className={cn("flex shrink-0 flex-col gap-3", DASHBOARD_GROUND)}>
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Fuel orders"
          value={rows.length.toLocaleString()}
          note={`${rows.length - unassigned.length} with a driver`}
          onOpen={() => drill()}
        />
        <StatTile
          label="Volume ordered"
          value={gal(volume)}
          note={`${extraction} extraction ${extraction === 1 ? "job" : "jobs"}`}
          onOpen={() => drill()}
        />
        <StatTile
          label="Waiting on a driver"
          value={unassigned.length.toLocaleString()}
          note={rows.length ? `${Math.round((unassigned.length / rows.length) * 100)}% of the day` : "Nothing today"}
          onOpen={() => drill({ driver: "Unassigned" })}
        />
        <StatTile
          label="Rush"
          value={rush.length.toLocaleString()}
          note="tagged Rush"
          onOpen={() => drill({ tags: "Rush" })}
        />
      </div>

      <div className="grid shrink-0 gap-3 lg:grid-cols-2">
        <Panel title="Driver load" aside="gallons per driver">
          <BarList data={byDriver} format={gal} />
        </Panel>
        <Panel title="Orders by planned time" aside={`${rows.length} orders`}>
          <BarColumns data={buckets} />
        </Panel>
      </div>

      <div className="grid shrink-0 gap-3 lg:grid-cols-3">
        <Panel title="Delivery vs extraction" aside="share of orders">
          <BarList data={byType} share />
        </Panel>
        <Panel title="Product demand" aside="orders carrying each">
          <BarList data={byProduct} />
        </Panel>
        <Panel title="Top customers" aside="gallons ordered">
          <BarList data={byCustomer} format={gal} />
        </Panel>
      </div>

      <Panel title="Rush and unassigned" aside={count(waiting.length)}>
        {waiting.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Every order has a driver.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-2 text-xs">Order</TableHead>
                <TableHead className="px-2 text-xs">Customer</TableHead>
                <TableHead className="px-2 text-xs">Type</TableHead>
                <TableHead className="px-2 text-xs">Driver</TableHead>
                <TableHead className="px-2 text-right text-xs">Qty</TableHead>
                <TableHead className="px-2 text-right text-xs">Planned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waiting.slice(0, 10).map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => onOpenOrder(r.id, date)}
                >
                  <TableCell className="px-2 tabular-nums">{r.orderNo}</TableCell>
                  <TableCell className="max-w-48 truncate px-2">{r.customer.title}</TableCell>
                  <TableCell className="px-2">{r.type.label}</TableCell>
                  <TableCell className="px-2">
                    {r.driver ? (
                      r.driver.name
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                    {r.tags.includes("Rush") && (
                      <Pill className="ml-2">
                        Rush
                      </Pill>
                    )}
                  </TableCell>
                  <TableCell className="px-2 text-right tabular-nums">{gal(r.qtyGal)}</TableCell>
                  <TableCell className="px-2 text-right tabular-nums text-muted-foreground">
                    {r.planned?.time ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      </div>
    </div>
  );
}
