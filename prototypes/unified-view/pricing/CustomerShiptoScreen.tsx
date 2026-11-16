import * as React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { dateWindowOf } from "@/components/ui/date-picker";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FilterChips } from "../ListToolbar";
import { ListFilters, type ListFacet } from "../ListFilters";
import { SummaryCard } from "../SheetCards";
import { kindTone } from "../statusKind";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { dateKeyOf, startOfDay } from "../data";
import { RecordViews, type ViewRow, type ViewTab } from "../masterdata/RecordViews";
import { FIGURE_STRIP, Figure, WORK_AREA_FIT } from "../masterdata/sheetParts";
import {
  DAY,
  NOW,
  SETTING_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  changeSummary,
  fmtDate,
  fmtWhen,
  money,
  plural,
  shiptoOf,
  uniq,
  type ChangeRecord,
  type ChangeStatus,
} from "./changeLog";
import { CUSTOMERS, SHIPTOS } from "./seed";
import { useChangeLog } from "./changeLogStore";
import { STATUS_KIND, actionOf } from "./activityFeed";
import { ChangeSheet } from "./ChangeSheet";
import { fitColumns } from "./fitColumns";
import { insightsOf, kindOf, scopeOf, thenNowOf, whereOf, whoOf } from "./customerShipto";

/*
  CHANGE LOG › CUSTOMER & SHIP-TO (Yash, 2026-11-16) — one customer's pricing
  story, after the "Customer & ShipTo" tab of pricing-change-log-prototype.html,
  on the 360 layout (Master Data › Ship-to 360): Filters (customer, ship-tos
  cascading from it) and the date window on top, the figures, then the work
  area — Timeline · Where changes happened · Who made the changes · Then vs
  now as full lists — with the insights in a summary card on the right.

  Every figure opens the rows it counts. A timeline row opens the change; a
  ship-to in Where narrows the page to it.
*/

const STATUS_BY_LABEL = Object.fromEntries(
  (Object.keys(STATUS_LABEL) as ChangeStatus[]).map((s) => [STATUS_LABEL[s], s])
) as Record<string, ChangeStatus>;

const lastQuarter = (): DateRange => ({ from: startOfDay(new Date(NOW - 89 * DAY)), to: startOfDay(new Date(NOW)) });
const inRange = (r: DateRange) => (c: ChangeRecord) =>
  c.status === "scheduled" || (c.effectiveAt >= r.from.getTime() && c.effectiveAt < r.to.getTime() + DAY);

const custByName = new Map(CUSTOMERS.map((c) => [c.name, c.id]));
const shipByName = new Map(SHIPTOS.map((s) => [s.name, s.id]));

/** A tab's columns, sized to what they print (UX-45). */
const fit = (tab: ViewTab): ViewTab => ({
  ...tab,
  columns: fitColumns(tab.columns, tab.rows, (r, key) => [key === "status" ? r.status : (r.text[key] ?? "")], ["status", "action", "kind"]),
});

export function CustomerShiptoScreen() {
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
  const thenNow = React.useMemo(() => thenNowOf(scope, log.rows, ents), [scope, log.rows, ents]);
  const insights = React.useMemo(() => insightsOf(scope, ents), [scope, ents]);

  const tabs = React.useMemo<ViewTab[]>(() => {
    const n = scope.shiptos.length;
    const timeline: ViewTab = {
      key: "timeline",
      label: "Timeline",
      noun: "changes",
      one: "change",
      columns: [
        { key: "when", label: "Date & time", width: 180, sortable: true },
        { key: "change", label: "Change", width: 300, sortable: true },
        { key: "setting", label: "Entity", width: 120, sortable: true },
        { key: "action", label: "Action", width: 120, sortable: true },
        { key: "kind", label: "Kind", width: 120, sortable: true },
        { key: "applies", label: "Applies to", width: 200, sortable: true },
        { key: "by", label: "Made by", width: 140, sortable: true },
        { key: "source", label: "Made via", width: 180, sortable: true },
        { key: "status", label: "Status", width: 120, sortable: true },
      ],
      rows: scope.changes.map(({ c, lines }): ViewRow => {
        const hits = uniq(lines.map((l) => l.shiptoId));
        const entities = uniq(lines.map((l) => SETTING_LABEL[l.setting])).join(", ");
        return {
          id: c.id,
          text: {
            when: fmtWhen(c.effectiveAt),
            change: `${changeSummary(c, ents)} · ${c.id}`,
            setting: entities,
            action: actionOf(c),
            kind: kindOf(c),
            applies: hits.length === 1 ? shiptoOf(hits[0]).name : `${hits.length} of ${plural(n, "ship-to")}`,
            by: c.by,
            source: SOURCE_LABEL[c.source],
          },
          sort: { when: c.effectiveAt, applies: hits.length },
          status: STATUS_LABEL[c.status],
          values: { kind: kindOf(c), setting: entities, action: actionOf(c), by: c.by },
        };
      }),
      facets: [
        { key: "kind", label: "Kind" },
        { key: "setting", label: "Entity" },
        { key: "action", label: "Action" },
        { key: "by", label: "Made by" },
        { key: "status", label: "Status" },
      ],
      renderCell: (r, key) =>
        key === "status" ? (
          <StatusChip tone={kindTone(STATUS_KIND[STATUS_BY_LABEL[r.status]] ?? "neutral")} variant="text">
            {r.status}
          </StatusChip>
        ) : key === "action" || key === "kind" ? (
          <Pill>{r.text[key]}</Pill>
        ) : undefined,
      onOpen: (r) => setOpenId(r.id),
      nameOf: (r) => r.id,
    };
    const whereTab: ViewTab = {
      key: "where",
      label: where.by === "shipto" ? "Where changes happened" : "What changed",
      noun: where.by === "shipto" ? "ship-tos" : "entities",
      one: where.by === "shipto" ? "ship-to" : "entity",
      columns: [
        { key: "name", label: where.by === "shipto" ? "Ship-to" : "Entity", width: 220, sortable: true },
        ...(where.by === "shipto" ? [{ key: "sub", label: "Customer", width: 200, sortable: true }] : []),
        { key: "changes", label: "Changes", width: 110, sortable: true },
        { key: "assignment", label: "Assignment", width: 120, sortable: true },
        { key: "inherited", label: "Inherited", width: 110, sortable: true },
        { key: "last", label: "Last change", width: 220, sortable: true },
      ],
      rows: where.rows.map(
        (w): ViewRow => ({
          id: w.key,
          text: {
            name: w.name,
            sub: w.sub,
            changes: w.changes.toLocaleString(),
            assignment: w.assignment.toLocaleString(),
            inherited: w.inherited.toLocaleString(),
            last: w.last ? `${fmtDate(w.last)} · ${w.lastBy}` : "—",
          },
          sort: { changes: w.changes, assignment: w.assignment, inherited: w.inherited, last: w.last ?? 0 },
          status: "",
        })
      ),
      facets: [],
      /* A SHIP-TO NARROWS THE PAGE TO IT — the prototype's "View only this". */
      onOpen:
        where.by === "shipto"
          ? (r) => {
              const s = shiptoOf(r.id);
              applySel(new Set([`customer:${CUSTOMERS.find((c) => c.id === s.customerId)!.name}`, `shipto:${s.name}`]));
            }
          : undefined,
      nameOf: (r) => r.text.name,
    };
    const whoTab: ViewTab = {
      key: "who",
      label: "Who made the changes",
      noun: "people",
      one: "person",
      columns: [
        { key: "name", label: "Person", width: 160, sortable: true },
        { key: "changes", label: "Changes", width: 110, sortable: true },
        { key: "mostly", label: "Mostly", width: 180, sortable: true },
        { key: "via", label: "Made via", width: 260, sortable: true },
        { key: "last", label: "Last change", width: 140, sortable: true },
      ],
      rows: who.map(
        (p): ViewRow => ({
          id: p.name,
          text: { name: p.name, changes: p.changes.toLocaleString(), mostly: p.mostly, via: p.via, last: fmtDate(p.last) },
          sort: { changes: p.changes, last: p.last },
          status: "",
        })
      ),
      facets: [],
      nameOf: (r) => r.text.name,
    };
    const thenNowTab: ViewTab = {
      key: "then-now",
      label: "Then vs now",
      noun: "prices",
      one: "price",
      columns: [
        { key: "shipto", label: "Ship-to", width: 200, sortable: true },
        { key: "product", label: "Product", width: 180, sortable: true },
        { key: "then", label: `Price on ${fmtDate(range.from.getTime())} ($/gal)`, width: 180, sortable: true },
        { key: "now", label: "Price now ($/gal)", width: 150, sortable: true },
        { key: "delta", label: "Change ($/gal)", width: 140, sortable: true },
        { key: "why", label: "What moved it", width: 200, sortable: true },
      ],
      rows: thenNow.map(
        (p): ViewRow => ({
          id: p.id,
          text: {
            shipto: p.shipto,
            product: p.product,
            then: money(p.then),
            now: money(p.now),
            delta: p.delta === 0 ? "—" : `${p.delta > 0 ? "+" : "−"}${money(Math.abs(p.delta))}`,
            why: p.why || "No changes",
          },
          sort: { then: p.then, now: p.now, delta: Math.abs(p.delta) },
          status: "",
          values: { moved: p.delta === 0 ? "No change" : p.delta > 0 ? "Up" : "Down" },
        })
      ),
      facets: [{ key: "moved", label: "Moved" }],
      nameOf: (r) => `${r.text.shipto} · ${r.text.product}`,
    };
    return [timeline, whereTab, whoTab, thenNowTab].map(fit);
  }, [scope, where, who, thenNow, ents, range]); // eslint-disable-line react-hooks/exhaustive-deps

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
              <SummaryCard title="Insights">
                {insights.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No insights for these dates.</span>
                ) : (
                  insights.map((i) => (
                    <section key={i.key} className="flex flex-col gap-1.5 border-b border-border pb-3 last:border-b-0 last:pb-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{i.title}</span>
                        <Pill>{i.count.toLocaleString()}</Pill>
                      </span>
                      {i.why && <span className="text-xs text-muted-foreground">{i.why}</span>}
                      <ul className="flex flex-col gap-1">
                        {i.items.map((t) => (
                          <li key={t} className="text-xs text-foreground">
                            {t}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))
                )}
              </SummaryCard>
            </div>
          </div>
        </div>
      )}

      <ChangeSheet id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />
    </div>
  );
}
