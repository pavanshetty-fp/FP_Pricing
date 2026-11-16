import * as React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateWindowOf } from "@/components/ui/date-picker";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FilterChips } from "../ListToolbar";
import { ListFilters, type ListFacet } from "../ListFilters";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { dateKeyOf, startOfDay } from "../data";
import { RecordViews, type ViewTab } from "../masterdata/RecordViews";
import { FIGURE_STRIP, Figure, WORK_AREA_FIT } from "../masterdata/sheetParts";
import {
  DAY,
  NOW,
  changeSummary,
  fmtDate,
  plural,
  shiptoOf,
  uniq,
  type ChangeRecord,
} from "./changeLog";
import { CUSTOMERS, SHIPTOS } from "./seed";
import { useChangeLog } from "./changeLogStore";
import { ChangeSheet } from "./ChangeSheet";
import { insightsOf, kindOf, scopeOf, whereOf, whoOf } from "./customerShipto";
import { InsightsCard, timelineTab, whereTab, whoTab } from "./customerShiptoViews";

/*
  KEPT, NOT ROUTED (Yash, 2026-11-16: "don't discard this … keep this in
  backend, we will try dashboard"). The routed page is CustomerShiptoDashboard.

  CHANGE LOG › CUSTOMER & SHIP-TO, 360 LAYOUT (Yash, 2026-11-16) — one customer's pricing
  story, after the "Customer & ShipTo" tab of pricing-change-log-prototype.html,
  on the 360 layout (Master Data › Ship-to 360): Filters (customer, ship-tos
  cascading from it) and the date window on top, the figures, then the work
  area — Timeline · Where changes happened · Who made the changes · Then vs
  now as full lists — with the insights in a summary card on the right.

  Every figure opens the rows it counts. A timeline row opens the change; a
  ship-to in Where narrows the page to it.
*/


const lastQuarter = (): DateRange => ({ from: startOfDay(new Date(NOW - 89 * DAY)), to: startOfDay(new Date(NOW)) });
const inRange = (r: DateRange) => (c: ChangeRecord) =>
  c.status === "scheduled" || (c.effectiveAt >= r.from.getTime() && c.effectiveAt < r.to.getTime() + DAY);

const custByName = new Map(CUSTOMERS.map((c) => [c.name, c.id]));
const shipByName = new Map(SHIPTOS.map((s) => [s.name, s.id]));


export function CustomerShipto360Screen() {
  const log = useChangeLog();
  const ents = log.entityMap;
  const [range, setRange] = React.useState<DateRange>(lastQuarter);
  const inWindow = React.useMemo(() => inRange(range), [range]);

  /* THE FIRST VIEW IS THE BUSIEST CUSTOMER — the prototype opened on one. */
  const busiest = React.useMemo(() => {
    const count: Record<string, number> = {};
    log.changes.filter(inRange(lastQuarter())).forEach((c) => uniq(c.lines.map((l) => l.customerId)).forEach((id) => (count[id] = (count[id] ?? 0) + 1)));
    return CUSTOMERS.slice().sort((a, b) => (count[b.id] ?? 0) - (count[a.id] ?? 0))[0];
  }, [log.changes]);
  const [sel, setSel] = React.useState<ReadonlySet<string>>(() => new Set([`customer:${busiest.name}`]));
  const custIds = [...sel].filter((id) => id.startsWith("customer:")).map((id) => custByName.get(id.slice(9))!).filter(Boolean);
  const shipIds = [...sel].filter((id) => id.startsWith("shipto:")).map((id) => shipByName.get(id.slice(7))!).filter(Boolean);

  /* SHIP-TOS CASCADE FROM THE CUSTOMER: a ship-to of a customer taken off
     goes with it. */
  const applySel = (next: ReadonlySet<string>) => {
    const cust = new Set([...next].filter((id) => id.startsWith("customer:")).map((id) => custByName.get(id.slice(9))));
    setSel(new Set([...next].filter((id) => !id.startsWith("shipto:") || !cust.size || cust.has(shiptoOf(shipByName.get(id.slice(7))!).customerId))));
  };

  const facets = React.useMemo<ListFacet[]>(() => {
    const ships = custIds.length ? SHIPTOS.filter((s) => custIds.includes(s.customerId)) : SHIPTOS;
    return [
      { key: "customer", label: "Customer", options: CUSTOMERS.map((c) => c.name), searchable: true },
      { key: "shipto", label: "Ship-to", options: ships.map((s) => s.name), searchable: true },
    ];
  }, [custIds.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const scope = React.useMemo(
    () => scopeOf(log.changes, custIds, shipIds, inWindow),
    [log.changes, custIds.join(), shipIds.join(), inWindow] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const countFor = (next: ReadonlySet<string>) => {
    const c = [...next].filter((id) => id.startsWith("customer:")).map((id) => custByName.get(id.slice(9))!);
    const s = [...next].filter((id) => id.startsWith("shipto:")).map((id) => shipByName.get(id.slice(7))!);
    return c.length || s.length ? scopeOf(log.changes, c, s, inWindow).changes.length : 0;
  };

  const [openId, setOpenId] = React.useState<string | null>(null);
  const [apply, setApply] = React.useState<{ tab: string; picked: string[]; n: number } | null>(null);
  const openTab = (tab: string) => setApply({ tab, picked: [], n: Date.now() });

  const where = React.useMemo(() => whereOf(scope), [scope]);
  const who = React.useMemo(() => whoOf(scope), [scope]);
  const insights = React.useMemo(() => insightsOf(scope, ents), [scope, ents]);

  const tabs = React.useMemo<ViewTab[]>(
    () => [
      timelineTab(scope, ents, setOpenId),
      whereTab(where, (id) => {
        const st = shiptoOf(id);
        applySel(new Set([`customer:${CUSTOMERS.find((c) => c.id === st.customerId)!.name}`, `shipto:${st.name}`]));
      }),
      whoTab(who),
    ],
    [scope, where, who, ents, range] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const dateWindow = React.useMemo(
    () => dateWindowOf(log.changes.map((c) => dateKeyOf(new Date(c.effectiveAt)))),
    [log.changes]
  );
  const people = uniq(scope.changes.map((x) => x.c.by));
  const inherited = scope.changes.filter((x) => kindOf(x.c) === "Inherited").length;
  const touched = uniq(scope.changes.flatMap((x) => x.lines.map((l) => l.shiptoId)));
  const lastTook = scope.changes.find((x) => x.c.status !== "scheduled" && x.c.status !== "canceled");
  const none = custIds.length === 0 && shipIds.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* THE SCOPE — the list toolbar's Filters and date window, nothing else. */}
      <div className="flex shrink-0 items-center gap-2">
        <ListFilters facets={facets} value={sel} countFor={countFor} onApply={applySel} />
        <div className="ml-auto">
          <DateRangeFilter {...dateWindow} noun="changes" value={range} onChange={setRange} />
        </div>
      </div>
      <FilterChips facets={facets} selected={sel} onChange={applySel} />

      {none ? (
        <Empty className="mt-4 flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>Choose a customer</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={() => setSel(new Set([`customer:${busiest.name}`]))}>
              Show {busiest.name}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
          <div className={FIGURE_STRIP}>
            <Figure
              label="Changes"
              value={scope.changes.length.toLocaleString()}
              note={`${(scope.changes.length - inherited).toLocaleString()} assignment · ${inherited.toLocaleString()} inherited`}
              onOpen={() => openTab("timeline")}
              openLabel="View changes"
            />
            <Figure
              label="Ship-tos changed"
              value={touched.length.toLocaleString()}
              note={`of ${plural(scope.shiptos.length, "ship-to")}`}
              onOpen={() => openTab("where")}
              openLabel="View ship-tos"
            />
            <Figure
              label="Changed by"
              value={plural(people.length, "person", "people")}
              note={people.length ? `${people.slice(0, 2).join(", ")}${people.length > 2 ? ` +${people.length - 2}` : ""}` : "—"}
              onOpen={() => openTab("who")}
              openLabel="View people"
            />
            <Figure
              label="Last change"
              value={lastTook ? fmtDate(lastTook.c.effectiveAt).replace(/, \d{4}$/, "") : "—"}
              note={lastTook ? `${changeSummary(lastTook.c, ents)} · ${lastTook.c.by}` : "—"}
              onOpen={lastTook ? () => setOpenId(lastTook.c.id) : undefined}
              openLabel="View change"
            />
          </div>

          <div className={WORK_AREA_FIT}>
            <RecordViews resetKey="pricing-customer-shipto" tabs={tabs} searchPlaceholder="Search these changes" historyKey="pricing-customer-shipto" apply={apply} />
            {/* THE INSIGHTS — a summary card, the highlight on the right (PRD §6). */}
            <div className="flex min-h-0 flex-col gap-3 overflow-auto">
              <InsightsCard insights={insights} />
            </div>
          </div>
        </div>
      )}

      <ChangeSheet id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />
    </div>
  );
}
