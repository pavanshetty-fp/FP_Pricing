import * as React from "react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { dateWindowOf } from "@/components/ui/date-picker";
import { BarList, DASHBOARD_GROUND, Panel, StatTile, type BarDatum } from "../DashboardParts";
import { HeaderAside } from "../headerSlot";
import { attend } from "../PendingStrip";
import { kindTone } from "../statusKind";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { dateKeyOf, startOfDay } from "../data";
import {
  DAY,
  NOW,
  SETTING_LABEL,
  STATUS_LABEL,
  changeSummary,
  customerOf,
  fmtDate,
  fmtWhen,
  money,
  plural,
  productOf,
  shiptoOf,
  uniq,
  type ChangeRecord,
  type ImpactLine,
} from "./changeLog";
import { CUSTOMERS, SHIPTOS } from "./seed";
import { useChangeLog } from "./changeLogStore";
import { STATUS_KIND } from "./activityFeed";
import { ChangeSheet } from "./ChangeSheet";
import { ChangeText } from "./ChangeText";
import { DashTable, type DashColumn, type DashFacet } from "./DashTable";
import { FilterChips } from "../ListToolbar";
import { ListFilters, type ListFacet } from "../ListFilters";
import { insightsOf, kindOf, scopeOf, thenNowOf, whereOf, whoOf, type ThenNowRow } from "./customerShipto";
import { InsightsCard } from "./customerShiptoViews";

/*
  CHANGE LOG › CUSTOMER & SHIP-TO, DASHBOARD (Yash, 2026-11-16).
  - SCOPE, top right with the date window: Customer and Ship-to, several at a
    time; "All" stands alone. Ship-tos follow the customers picked. A bar in
    Where also sets them. (Level with the title through the header slot — to
    raise with Pavan.)
  - ONE TIMELINE, ON THE PAGE. Every press lands on what is already here:
    Changes → the Timeline; Ship-tos changed → Where; Changed by → Who; an
    insight, a person or an entity → the Timeline with that filter on. The
    section is scrolled to and blinks once (`attend`, the DS's "this one");
    the filter shows as a chip. Last change opens that change.
  - Timeline and Then vs now are the Sales › Dashboard table on the card,
    under search and Filters (Customer · Ship-to · Product first), with pages.
  The 360 version is kept in CustomerShipto360.tsx.
*/

const lastQuarter = (): DateRange => ({ from: startOfDay(new Date(NOW - 89 * DAY)), to: startOfDay(new Date(NOW)) });
const inRange = (r: DateRange) => (c: ChangeRecord) =>
  c.status === "scheduled" || (c.effectiveAt >= r.from.getTime() && c.effectiveAt < r.to.getTime() + DAY);
/** Bars per panel (Yash, 2026-11-16: "keep this to top 5 as of now"). */
const TOP = 5;
const SECTION = "scroll-mt-4 rounded-xl";

type Item = { c: ChangeRecord; lines: ImpactLine[] };

/** "View N others" under a top five; the card grows to hold every bar, and
 *  "Show top 5" folds it back — the banner's dotted-underline voice. */
function MoreToggle({ open, others, onToggle }: { open: boolean; others: number; onToggle: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs font-medium text-foreground hover:bg-foreground/5" onClick={onToggle}>
      <span className="underline decoration-current/50 decoration-dotted underline-offset-4">{open ? `Show top ${TOP}` : `View ${others} ${others === 1 ? "other" : "others"}`}</span>
    </Button>
  );
}

export function CustomerShiptoDashboard() {
  const log = useChangeLog();
  const ents = log.entityMap;
  const [range, setRange] = React.useState<DateRange>(lastQuarter);
  const inWindow = React.useMemo(() => inRange(range), [range]);
  /* THE SCOPE AS FACETS — the Filters panel and chip shelf Activity feed has
     (Yash, 2026-11-16), ids `customer:Name` / `shipto:Name`. */
  const [scopeSel, setScopeSel] = React.useState<ReadonlySet<string>>(new Set());
  const custByName = React.useMemo(() => new Map(CUSTOMERS.map((c) => [c.name, c.id])), []);
  const shipByName = React.useMemo(() => new Map(SHIPTOS.map((st) => [st.name, st.id])), []);
  const idsOf = (sel: ReadonlySet<string>, facet: string, by: Map<string, string>) =>
    [...sel].filter((id) => id.startsWith(`${facet}:`)).map((id) => by.get(id.slice(facet.length + 1))!).filter(Boolean);
  const custs = idsOf(scopeSel, "customer", custByName);
  const ships = idsOf(scopeSel, "shipto", shipByName);
  /* SHIP-TOS FOLLOW THE CUSTOMERS: one of a customer taken off goes too. */
  const applyScope = (next: ReadonlySet<string>) => {
    const keep = idsOf(next, "customer", custByName);
    setScopeSel(new Set([...next].filter((id) => !id.startsWith("shipto:") || !keep.length || keep.includes(shiptoOf(shipByName.get(id.slice(7))!).customerId))));
  };
  const setCusts = (ids: string[]) => applyScope(new Set(ids.map((id) => `customer:${customerOf(id).name}`)));
  const setShips = (ids: string[]) =>
    setScopeSel(new Set([...uniq(ids.map((id) => shiptoOf(id).customerId)).map((id) => `customer:${customerOf(id).name}`), ...ids.map((id) => `shipto:${shiptoOf(id).name}`)]));
  const [whereAll, setWhereAll] = React.useState(false);
  const [whoAll, setWhoAll] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [timelineApply, setTimelineApply] = React.useState<{ picked: string[]; n: number } | null>(null);

  const showTimeline = (picked: string[] = []) => {
    setTimelineApply({ picked, n: Date.now() });
    attend("cs-timeline");
  };
  const pickCustomers = (ids: string[]) => setCusts(ids);

  const scope = React.useMemo(
    () => scopeOf(log.changes, custs.length ? custs : CUSTOMERS.map((c) => c.id), ships, inWindow),
    [log.changes, custs.join(), ships.join(), inWindow] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const insights = React.useMemo(() => insightsOf(scope, ents), [scope, ents]);
  const who = React.useMemo(() => whoOf(scope), [scope]);
  const thenNow = React.useMemo(() => thenNowOf(scope, log.rows, ents), [scope, log.rows, ents]);

  /* WHERE — customers, then a customer's ship-tos, then one ship-to's
     entities. A customer or ship-to bar sets the scope; an entity bar shows
     the Timeline on it. */
  const where = React.useMemo((): { title: string; one: string; many: string; bars: BarDatum[] } => {
    if (ships.length === 0 && custs.length !== 1) {
      const pool = custs.length ? CUSTOMERS.filter((c) => custs.includes(c.id)) : CUSTOMERS;
      const bars = pool.map((c) => {
        const list = scope.changes.filter((x) => x.lines.some((l) => l.customerId === c.id));
        return {
          key: c.id,
          label: c.name,
          value: list.length,
          detail: `${plural(list.length, "change")} · last ${list[0] ? fmtDate(list[0].c.effectiveAt) : "—"}`,
          onOpen: () => pickCustomers([c.id]),
        };
      });
      return { title: "Where changes happened", one: "customer", many: "customers", bars };
    }
    const w = whereOf(scope);
    if (w.by === "shipto")
      return {
        title: "Where changes happened",
        one: "ship-to",
        many: "ship-tos",
        bars: w.rows.map((r) => ({
          key: r.key,
          label: r.name,
          value: r.changes,
          detail: `${r.assignment} assignment · ${r.inherited} inherited`,
          onOpen: () => setShips([r.key]),
        })),
      };
    return {
      title: "What changed",
      one: "entity",
      many: "entities",
      bars: w.rows.map((r) => ({ key: r.key, label: r.name, value: r.changes, detail: `Last ${r.last ? fmtDate(r.last) : "—"} · ${r.lastBy}`, onOpen: () => showTimeline([`entity:${r.name}`]) })),
    };
  }, [scope, custs.join(), ships.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const whereBars = where.bars.filter((b) => b.value > 0).sort((a, b) => b.value - a.value);

  /* THE TIMELINE — columns, and filters with Product first. Customer and
     ship-to are the page's own scope, set once at the top (Yash, 2026-11-16). */
  const names = (x: Item, of: (l: ImpactLine) => string) => uniq(x.lines.map(of));
  const timelineColumns: DashColumn<Item>[] = [
    { key: "when", label: "Date & time", cell: (x) => fmtWhen(x.c.effectiveAt), className: "whitespace-nowrap tabular-nums" },
    {
      key: "change",
      label: "Change",
      cell: (x) => (
        <span className="flex min-w-0 flex-wrap items-center gap-1">
          <ChangeText c={x.c} ents={ents} />
          <span className="text-muted-foreground">· {x.c.id}</span>
        </span>
      ),
    },
    { key: "entity", label: "Entity", cell: (x) => names(x, (l) => SETTING_LABEL[l.setting]).join(", ") },
    {
      key: "applies",
      label: "Applies to",
      cell: (x) => {
        const hits = names(x, (l) => l.shiptoId);
        return hits.length === 1 ? shiptoOf(hits[0]).name : `${hits.length} of ${plural(scope.shiptos.length, "ship-to")}`;
      },
    },
    { key: "by", label: "Made by", cell: (x) => x.c.by, className: "whitespace-nowrap" },
    {
      key: "status",
      label: "Status",
      cell: (x) => (
        <StatusChip tone={kindTone(STATUS_KIND[x.c.status])} variant="text">
          {STATUS_LABEL[x.c.status]}
        </StatusChip>
      ),
    },
  ];
  const timelineFacets: DashFacet<Item>[] = [
    { key: "product", label: "Product", values: (x) => names(x, (l) => productOf(l.productId).name), searchable: true },
    { key: "entity", label: "Entity", values: (x) => names(x, (l) => SETTING_LABEL[l.setting]) },
    { key: "kind", label: "Kind", values: (x) => [kindOf(x.c)] },
    { key: "by", label: "Made by", values: (x) => [x.c.by] },
    { key: "status", label: "Status", values: (x) => [STATUS_LABEL[x.c.status]] },
  ];

  const thenNowColumns: DashColumn<ThenNowRow>[] = [
    { key: "shipto", label: "Ship-to", cell: (p) => p.shipto },
    { key: "product", label: "Product", cell: (p) => p.product },
    { key: "then", label: `Price on ${fmtDate(range.from.getTime())} ($/gal)`, cell: (p) => money(p.then), className: "tabular-nums" },
    { key: "now", label: "Price now ($/gal)", cell: (p) => money(p.now), className: "tabular-nums" },
    { key: "delta", label: "Change ($/gal)", cell: (p) => (p.delta === 0 ? "—" : `${p.delta > 0 ? "+" : "−"}${money(Math.abs(p.delta))}`), className: "tabular-nums" },
    { key: "why", label: "What moved it", cell: (p) => <span className="text-muted-foreground">{p.why || "No changes"}</span> },
  ];
  const thenNowFacets: DashFacet<ThenNowRow>[] = [
    { key: "product", label: "Product", values: (p) => [p.product], searchable: true },
    { key: "moved", label: "Moved", values: (p) => [p.delta === 0 ? "No change" : p.delta > 0 ? "Up" : "Down"], order: ["Up", "Down", "No change"] },
  ];

  const dateWindow = React.useMemo(() => dateWindowOf(log.changes.map((c) => dateKeyOf(new Date(c.effectiveAt)))), [log.changes]);
  const people = uniq(scope.changes.map((x) => x.c.by));
  const inherited = scope.changes.filter((x) => kindOf(x.c) === "Inherited").length;
  const touched = uniq(scope.changes.flatMap((x) => x.lines.map((l) => l.shiptoId)));
  const last = scope.changes.find((x) => x.c.status !== "scheduled" && x.c.status !== "canceled");
  const scopeFacets: ListFacet[] = [
    { key: "customer", label: "Customer", options: CUSTOMERS.map((c) => c.name), searchable: true },
    { key: "shipto", label: "Ship-to", options: (custs.length ? SHIPTOS.filter((st) => custs.includes(st.customerId)) : SHIPTOS).map((st) => st.name), searchable: true },
  ];
  const scopeCount = (next: ReadonlySet<string>) => {
    const c = idsOf(next, "customer", custByName);
    return scopeOf(log.changes, c.length ? c : CUSTOMERS.map((x) => x.id), idsOf(next, "shipto", shipByName), inWindow).changes.length;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      {/* THE SCOPE AND THE WINDOW — level with the title, on the right. */}
      <HeaderAside>
        <ListFilters facets={scopeFacets} value={scopeSel} countFor={(next) => scopeCount(next)} onApply={applyScope} />
        <DateRangeFilter {...dateWindow} noun="changes" value={range} onChange={setRange} />
      </HeaderAside>
      {/* THE SCOPE'S CHIPS — Activity feed's shelf ("Customer 4 ×"). */}
      <FilterChips className="mt-0 mb-3" facets={scopeFacets} selected={scopeSel} onChange={applyScope} />

      <div className={`${DASHBOARD_GROUND} flex flex-col gap-3`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Changes"
            value={scope.changes.length.toLocaleString()}
            note={`${(scope.changes.length - inherited).toLocaleString()} assignment · ${inherited.toLocaleString()} inherited`}
            onOpen={scope.changes.length ? () => showTimeline() : undefined}
          />
          <StatTile
            label="Ship-tos changed"
            value={touched.length.toLocaleString()}
            note={`of ${plural(scope.shiptos.length, "ship-to")}`}
            onOpen={touched.length ? () => attend("cs-where") : undefined}
          />
          <StatTile
            label="Changed by"
            value={plural(people.length, "person", "people")}
            note={people.length ? `${people.slice(0, 2).join(", ")}${people.length > 2 ? ` +${people.length - 2}` : ""}` : "—"}
            onOpen={people.length ? () => attend("cs-who") : undefined}
          />
          <StatTile
            label="Last change"
            value={last ? fmtDate(last.c.effectiveAt).replace(/, \d{4}$/, "") : "—"}
            note={last ? `${changeSummary(last.c, ents)} · ${last.c.by}` : undefined}
            onOpen={last ? () => setOpenId(last.c.id) : undefined}
          />
        </div>

        <InsightsCard across insights={insights} />

        <div className="grid gap-3 lg:grid-cols-2">
          <div id="cs-where" className={`flex min-w-0 ${SECTION}`}>
            <Panel
              className="flex-1"
              title={where.title}
              aside={whereBars.length > TOP && !whereAll ? `Top ${TOP} of ${plural(whereBars.length, where.one, where.many)}` : undefined}
            >
              <BarList data={whereAll ? whereBars : whereBars.slice(0, TOP)} total={whereBars.reduce((t, b) => t + b.value, 0)} />
              {whereBars.length > TOP && (
                <MoreToggle open={whereAll} others={whereBars.length - TOP} onToggle={() => setWhereAll((o) => !o)} />
              )}
            </Panel>
          </div>
          <div id="cs-who" className={`flex min-w-0 ${SECTION}`}>
            <Panel className="flex-1" title="Who made the changes" aside={who.length > TOP && !whoAll ? `Top ${TOP} of ${who.length} people` : undefined}>
              <BarList
                total={who.reduce((t, p) => t + p.changes, 0)}
                data={(whoAll ? who : who.slice(0, TOP)).map((p) => ({
                  key: p.name,
                  label: p.name,
                  value: p.changes,
                  detail: `Mostly ${p.mostly} · ${p.via}`,
                  onOpen: () => showTimeline([`by:${p.name}`]),
                }))}
              />
              {who.length > TOP && <MoreToggle open={whoAll} others={who.length - TOP} onToggle={() => setWhoAll((o) => !o)} />}
            </Panel>
          </div>
        </div>

        <div id="cs-timeline" className={SECTION}>
            <DashTable
              title="Timeline"
              rows={scope.changes}
              rowKey={(x) => x.c.id}
              columns={timelineColumns}
              facets={timelineFacets}
              searchText={(x) => `${x.c.id} ${changeSummary(x.c, ents)} ${x.c.by} ${names(x, (l) => shiptoOf(l.shiptoId).name).join(" ")} ${names(x, (l) => customerOf(l.customerId).name).join(" ")}`}
              searchPlaceholder="Search changes"
              onRowClick={(x) => setOpenId(x.c.id)}
              apply={timelineApply}
              empty="No changes match."
            />
        </div>

        <div id="cs-then-now" className={SECTION}>
            <DashTable
              title="Then vs now"
              rows={thenNow}
              rowKey={(p) => p.id}
              columns={thenNowColumns}
              facets={thenNowFacets}
              searchText={(p) => `${p.customer} ${p.shipto} ${p.product} ${p.why}`}
              searchPlaceholder="Search prices"
              empty="No prices match."
            />
        </div>
      </div>

      <ChangeSheet id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />
    </div>
  );
}
