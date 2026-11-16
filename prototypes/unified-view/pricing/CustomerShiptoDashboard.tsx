import * as React from "react";
import { dateWindowOf } from "@/components/ui/date-picker";
import { FilterChips } from "../ListToolbar";
import type { ListFacet } from "../ListFilters";
import { BarList, DASHBOARD_GROUND, Panel, StatTile, type BarDatum } from "../DashboardParts";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { dateKeyOf, startOfDay } from "../data";
import { RecordViews, type ViewTab } from "../masterdata/RecordViews";
import { DAY, NOW, changeSummary, customerOf, fmtDate, plural, shiptoOf, uniq, type ChangeRecord } from "./changeLog";
import { CUSTOMERS, SHIPTOS } from "./seed";
import { useChangeLog } from "./changeLogStore";
import { ChangeSheet } from "./ChangeSheet";
import { flagsOf, insightsOf, kindOf, scopeOf, thenNowOf, whereOf, whoOf } from "./customerShipto";
import { InsightsCard, thenNowTab, timelineTab } from "./customerShiptoViews";

/*
  CHANGE LOG › CUSTOMER & SHIP-TO, DASHBOARD (Yash, 2026-11-16: "try the
  dashboard approach, with the timeline and then vs now"). No pickers on top:
  it opens on every customer, and the reader narrows by pressing — a customer
  in "Where changes happened" narrows the page to it, then a ship-to, the
  scope showing as chips that take it back off. The dashboard template's
  parts (DashboardParts): stat tiles, the Insights summary card, panels with
  ranked bars, and the Timeline and Then vs now as full lists in a panel.
  Every number opens the rows it counts (dashboard rule 1). The 360 version
  is kept in CustomerShipto360.tsx.
*/

const lastQuarter = (): DateRange => ({ from: startOfDay(new Date(NOW - 89 * DAY)), to: startOfDay(new Date(NOW)) });
const inRange = (r: DateRange) => (c: ChangeRecord) =>
  c.status === "scheduled" || (c.effectiveAt >= r.from.getTime() && c.effectiveAt < r.to.getTime() + DAY);
const TOP = 10;

export function CustomerShiptoDashboard() {
  const log = useChangeLog();
  const ents = log.entityMap;
  const [range, setRange] = React.useState<DateRange>(lastQuarter);
  const inWindow = React.useMemo(() => inRange(range), [range]);
  const [cust, setCust] = React.useState<string | null>(null);
  const [ship, setShip] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [apply, setApply] = React.useState<{ tab: string; picked: string[]; n: number } | null>(null);
  const lists = React.useRef<HTMLDivElement>(null);
  const whereRef = React.useRef<HTMLDivElement>(null);
  const whoRef = React.useRef<HTMLDivElement>(null);
  const goto = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: "smooth", block: "start" });
  const openTimeline = (picked: string[] = []) => {
    setApply({ tab: "timeline", picked, n: Date.now() });
    goto(lists.current);
  };

  const custIds = cust ? [cust] : CUSTOMERS.map((c) => c.id);
  const scope = React.useMemo(
    () => scopeOf(log.changes, custIds, ship ? [ship] : [], inWindow),
    [log.changes, cust, ship, inWindow] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const flags = React.useMemo(() => flagsOf(scope), [scope]);
  const insights = React.useMemo(() => insightsOf(scope, flags), [scope, flags]);
  const who = React.useMemo(() => whoOf(scope), [scope]);
  const thenNow = React.useMemo(() => thenNowOf(scope, log.rows, ents), [scope, log.rows, ents]);

  /* WHERE — customers across the book, a customer's ship-tos, or one
     ship-to's entities. A customer or ship-to narrows the page; an entity
     opens the Timeline on it. */
  const where = React.useMemo((): { title: string; unit: string; bars: BarDatum[] } => {
    if (!cust) {
      const bars = CUSTOMERS.map((c) => {
        const list = scope.changes.filter((x) => x.lines.some((l) => l.customerId === c.id));
        return { key: c.id, label: c.name, value: list.length, detail: `${plural(list.length, "change")} · last ${list[0] ? fmtDate(list[0].c.effectiveAt) : "—"}`, onOpen: () => setCust(c.id) };
      });
      return { title: "Where changes happened", unit: "customers", bars };
    }
    const w = whereOf(scope);
    if (w.by === "shipto")
      return {
        title: "Where changes happened",
        unit: "ship-tos",
        bars: w.rows.map((r) => ({ key: r.key, label: r.name, value: r.changes, detail: `${r.assignment} assignment · ${r.inherited} inherited`, onOpen: () => setShip(r.key) })),
      };
    return {
      title: "What changed",
      unit: "entities",
      bars: w.rows.map((r) => ({ key: r.key, label: r.name, value: r.changes, detail: `Last ${r.last ? fmtDate(r.last) : "—"} · ${r.lastBy}`, onOpen: () => openTimeline([`setting:${r.name}`]) })),
    };
  }, [scope, cust]); // eslint-disable-line react-hooks/exhaustive-deps
  const whereBars = where.bars.filter((b) => b.value > 0).sort((a, b) => b.value - a.value);

  const tabs = React.useMemo<ViewTab[]>(
    () => [timelineTab(scope, ents, flags, setOpenId), thenNowTab(thenNow, range.from)],
    [scope, ents, flags, thenNow, range]
  );

  /* THE SCOPE AS CHIPS — what a press narrowed to, and the way back. */
  const scopeFacets: ListFacet[] = [
    { key: "customer", label: "Customer", options: CUSTOMERS.map((c) => c.name) },
    { key: "shipto", label: "Ship-to", options: SHIPTOS.map((s) => s.name) },
  ];
  const chips = new Set([...(cust ? [`customer:${customerOf(cust).name}`] : []), ...(ship ? [`shipto:${shiptoOf(ship).name}`] : [])]);

  const dateWindow = React.useMemo(() => dateWindowOf(log.changes.map((c) => dateKeyOf(new Date(c.effectiveAt)))), [log.changes]);
  const people = uniq(scope.changes.map((x) => x.c.by));
  const inherited = scope.changes.filter((x) => kindOf(x.c) === "Inherited").length;
  const touched = uniq(scope.changes.flatMap((x) => x.lines.map((l) => l.shiptoId)));
  const last = scope.changes.find((x) => x.c.status !== "scheduled" && x.c.status !== "canceled");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="flex shrink-0 items-center gap-2">
        <FilterChips
          className="mt-0"
          facets={scopeFacets}
          selected={chips}
          onChange={(next) => {
            if (![...next].some((id) => id.startsWith("customer:"))) {
              setCust(null);
              setShip(null);
            } else if (![...next].some((id) => id.startsWith("shipto:"))) setShip(null);
          }}
        />
        <div className="ml-auto">
          <DateRangeFilter {...dateWindow} noun="changes" value={range} onChange={setRange} />
        </div>
      </div>

      <div className={`${DASHBOARD_GROUND} mt-4 flex flex-col gap-3`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Changes"
            value={scope.changes.length.toLocaleString()}
            note={`${(scope.changes.length - inherited).toLocaleString()} assignment · ${inherited.toLocaleString()} inherited`}
            onOpen={scope.changes.length ? () => openTimeline() : undefined}
          />
          <StatTile
            label="Ship-tos changed"
            value={touched.length.toLocaleString()}
            note={`of ${plural(scope.shiptos.length, "ship-to")}`}
            onOpen={touched.length ? () => goto(whereRef.current) : undefined}
          />
          <StatTile
            label="Changed by"
            value={plural(people.length, "person", "people")}
            note={people.length ? `${people.slice(0, 2).join(", ")}${people.length > 2 ? ` +${people.length - 2}` : ""}` : "—"}
            onOpen={people.length ? () => goto(whoRef.current) : undefined}
          />
          <StatTile
            label="Last change"
            value={last ? fmtDate(last.c.effectiveAt).replace(/, \d{4}$/, "") : "—"}
            note={last ? `${changeSummary(last.c, ents)} · ${last.c.by}` : undefined}
            onOpen={last ? () => setOpenId(last.c.id) : undefined}
          />
        </div>

        <InsightsCard across insights={insights} onOpen={(f) => openTimeline([`${f}:Yes`])} />

        <div className="grid gap-3 lg:grid-cols-2">
          <div ref={whereRef} className="flex min-w-0 scroll-mt-4">
            <Panel
              className="flex-1"
              title={where.title}
              aside={whereBars.length > TOP ? `Top ${TOP} of ${plural(whereBars.length, where.unit.replace(/s$/, ""), where.unit)}` : plural(whereBars.length, where.unit.replace(/s$/, ""), where.unit)}
            >
              <BarList data={whereBars.slice(0, TOP)} />
            </Panel>
          </div>
          <div ref={whoRef} className="flex min-w-0 scroll-mt-4">
            <Panel className="flex-1" title="Who made the changes" aside={plural(who.length, "person", "people")}>
              <BarList
                data={who.slice(0, TOP).map((p) => ({
                  key: p.name,
                  label: p.name,
                  value: p.changes,
                  detail: `Mostly ${p.mostly} · ${p.via}`,
                  onOpen: () => openTimeline([`by:${p.name}`]),
                }))}
              />
            </Panel>
          </div>
        </div>

        {/* THE TIMELINE AND THEN VS NOW — full lists, in one panel. */}
        <div ref={lists} className="scroll-mt-4">
          <Panel title="Changes and prices" aside={plural(scope.changes.length, "change")}>
            <div className="flex h-[640px] min-h-0 flex-col">
              <RecordViews resetKey="pricing-cs-dashboard" tabs={tabs} searchPlaceholder="Search these changes" historyKey="pricing-cs-dashboard" apply={apply} />
            </div>
          </Panel>
        </div>
      </div>

      <ChangeSheet id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />
    </div>
  );
}
