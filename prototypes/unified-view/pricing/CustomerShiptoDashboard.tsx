import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { dateWindowOf } from "@/components/ui/date-picker";
import { DASHBOARD_GROUND, StatTile } from "../DashboardParts";
import { HeaderAside } from "../headerSlot";
import { attend } from "../PendingStrip";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { dateKeyOf, startOfDay } from "../data";
import { FilterChips } from "../ListToolbar";
import { ListFilters, type ListFacet } from "../ListFilters";
import {
  DAY,
  NOW,
  SETTING_LABEL,
  STATUS_LABEL,
  changeSummary,
  customerOf,
  fmtDate,
  plural,
  productOf,
  shiptoOf,
  uniq,
  type ChangeRecord,
  type ImpactLine,
} from "./changeLog";
import { CUSTOMERS, SHIPTOS } from "./seed";
import { useChangeLog } from "./changeLogStore";
import { ChangeSheet } from "./ChangeSheet";
import { ScopePicker } from "./ScopePicker";
import { METHOD_LABEL, insightsAll, kindOf, scopeOf, whereLevel, whoLevel } from "./customerShipto";
import { ChangeTimeline, DrillCard, InsightsPanel, type DrillStep } from "./customerShiptoParts";

/*
  CHANGE LOG › CUSTOMER & SHIP-TO, DASHBOARD (Yash, 2026-11-16; round 5
  2026-11-17 after team feedback).
  - SCOPE OUTSIDE: Customer and Ship-to pickers (search, several at a time,
    "All" alone) with the date window, level with the title. Ship-tos follow
    the customers picked. Nothing on the page sets them but the pickers.
  - INSIGHTS: three versions on a switch for the PMs (customerShiptoParts).
  - WHERE AND WHO DRILL INSIDE THEIR OWN CARD — customers → ship-tos →
    named items; people → customers → ship-tos — with a breadcrumb back.
  - THE TIMELINE IS A TIMELINE: what happened and when, how it was made,
    and the ship-tos it reached. Search and Filters narrow it; nothing opens.
  The 360 version is kept in CustomerShipto360.tsx.
*/

const lastQuarter = (): DateRange => ({ from: startOfDay(new Date(NOW - 89 * DAY)), to: startOfDay(new Date(NOW)) });
const inRange = (r: DateRange) => (c: ChangeRecord) =>
  c.status === "scheduled" || (c.effectiveAt >= r.from.getTime() && c.effectiveAt < r.to.getTime() + DAY);
const SECTION = "scroll-mt-4 rounded-xl";

type Item = { c: ChangeRecord; lines: ImpactLine[] };

export function CustomerShiptoDashboard() {
  const log = useChangeLog();
  const ents = log.entityMap;
  const [range, setRange] = React.useState<DateRange>(lastQuarter);
  const inWindow = React.useMemo(() => inRange(range), [range]);
  /* THE SCOPE AS FACETS — the Filters panel and chip shelf (Yash,
     2026-11-17: back from the pickers), ids `customer:Name` / `shipto:Name`. */
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
  const [openId, setOpenId] = React.useState<string | null>(null);

  const scope = React.useMemo(
    () => scopeOf(log.changes, custs.length ? custs : CUSTOMERS.map((c) => c.id), ships, inWindow),
    [log.changes, custs.join(), ships.join(), inWindow] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const scheduled = React.useMemo(() => log.changes.filter((c) => c.status === "scheduled"), [log.changes]);
  const insights = React.useMemo(() => insightsAll(scope, ents, scheduled), [scope, ents, scheduled]);

  /* WHERE — its own path. It starts where the scope leaves it: one customer
     opens on its ship-tos, one ship-to on its items. */
  const scopeKey = `${custs.join()}|${ships.join()}`;
  const rootWhere = (): DrillStep[] => {
    if (ships.length === 1) return [{ key: `s:${ships[0]}`, label: shiptoOf(ships[0]).name }];
    if (ships.length > 1) return [{ key: "ships", label: plural(ships.length, "ship-to") }];
    if (custs.length === 1) return [{ key: `c:${custs[0]}`, label: customerOf(custs[0]).name }];
    return [{ key: "all", label: custs.length ? plural(custs.length, "customer") : "All customers" }];
  };
  const [wherePath, setWherePath] = React.useState<DrillStep[]>(rootWhere);
  const [whoPath, setWhoPath] = React.useState<DrillStep[]>([{ key: "all", label: "Everyone" }]);
  React.useEffect(() => {
    setWherePath(rootWhere());
    setWhoPath([{ key: "all", label: "Everyone" }]);
  }, [scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const whereAt = wherePath[wherePath.length - 1].key;
  const whereLevelKind = whereAt.startsWith("s:") ? "items" : whereAt.startsWith("c:") || whereAt === "ships" ? "shiptos" : "customers";
  const whereBars = React.useMemo(
    () =>
      whereLevel(
        whereAt === "ships" ? { ...scope } : scope,
        ents,
        whereAt.startsWith("s:") ? { shipto: whereAt.slice(2) } : whereAt.startsWith("c:") ? { customer: whereAt.slice(2) } : {}
      ),
    [scope, ents, whereAt]
  );
  /* "Several ship-tos" lists them all, not by customer. */
  const whereShown =
    whereAt === "ships"
      ? scope.shiptos.map((id) => {
          const list = scope.changes.filter((x) => x.lines.some((l) => l.shiptoId === id));
          return { key: id, label: shiptoOf(id).name, value: list.length, detail: `${customerOf(shiptoOf(id).customerId).name} · ${plural(list.length, "change")}` };
        })
      : whereBars;
  const openWhere = (key: string, label: string) => {
    const next = whereLevelKind === "customers" ? `c:${key}` : `s:${key}`;
    setWherePath((p) => [...p, { key: next, label }]);
  };

  const person = whoPath.find((p) => p.key.startsWith("p:"))?.key.slice(2);
  const whoCustomer = whoPath.find((p) => p.key.startsWith("c:"))?.key.slice(2);
  const whoBars = React.useMemo(() => whoLevel(scope, { person, customer: whoCustomer }), [scope, person, whoCustomer]);
  const openWho = (key: string, label: string) => setWhoPath((p) => [...p, { key: person ? `c:${key}` : `p:${key}`, label }]);

  /* THE TIMELINE'S OWN SEARCH AND FILTERS. */
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState<ReadonlySet<string>>(new Set());
  const names = (x: Item, of: (l: ImpactLine) => string) => uniq(x.lines.map(of));
  const facetValues: Record<string, (x: Item) => string[]> = {
    product: (x) => names(x, (l) => productOf(l.productId).name),
    entity: (x) => names(x, (l) => SETTING_LABEL[l.setting]),
    method: (x) => [METHOD_LABEL[x.c.source]],
    kind: (x) => [kindOf(x.c)],
    by: (x) => [x.c.by],
    status: (x) => [STATUS_LABEL[x.c.status]],
  };
  const facets: ListFacet[] = [
    { key: "product", label: "Product", options: uniq(scope.changes.flatMap(facetValues.product)).sort(), searchable: true },
    { key: "entity", label: "Entity", options: uniq(scope.changes.flatMap(facetValues.entity)).sort() },
    { key: "method", label: "Made how", options: uniq(scope.changes.flatMap(facetValues.method)).sort() },
    { key: "kind", label: "Kind", options: ["Assignment", "Inherited"] },
    { key: "by", label: "Made by", options: uniq(scope.changes.flatMap(facetValues.by)).sort(), searchable: true },
    { key: "status", label: "Status", options: uniq(scope.changes.flatMap(facetValues.status)).sort() },
  ];
  const narrow = React.useCallback(
    (next: ReadonlySet<string>) => {
      const needle = q.trim().toLowerCase();
      const by = new Map<string, string[]>();
      for (const id of next) {
        const i = id.indexOf(":");
        by.set(id.slice(0, i), [...(by.get(id.slice(0, i)) ?? []), id.slice(i + 1)]);
      }
      return scope.changes.filter(
        (x) =>
          (!needle ||
            `${x.c.id} ${changeSummary(x.c, ents)} ${x.c.by} ${names(x, (l) => shiptoOf(l.shiptoId).name).join(" ")} ${names(x, (l) => customerOf(l.customerId).name).join(" ")}`
              .toLowerCase()
              .includes(needle)) &&
          [...by].every(([k, vs]) => facetValues[k](x).some((v) => vs.includes(v)))
      );
    },
    [scope, q, ents] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const timeline = React.useMemo(() => narrow(sel), [narrow, sel]);

  const dateWindow = React.useMemo(() => dateWindowOf(log.changes.map((c) => dateKeyOf(new Date(c.effectiveAt)))), [log.changes]);
  const people = uniq(scope.changes.map((x) => x.c.by));
  const inherited = scope.changes.filter((x) => kindOf(x.c) === "Inherited").length;
  const touched = uniq(scope.changes.flatMap((x) => x.lines.map((l) => l.shiptoId)));
  const last = scope.changes.find((x) => x.c.status !== "scheduled" && x.c.status !== "canceled");
  const scopeFacets: ListFacet[] = [
    { key: "customer", label: "Customer", options: CUSTOMERS.map((c) => c.name), searchable: true },
    { key: "shipto", label: "Ship-to", options: (custs.length ? SHIPTOS.filter((st) => custs.includes(st.customerId)) : SHIPTOS).map((st) => st.name), searchable: true },
  ];

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-auto${scopeSel.size ? " -mt-4" : ""}`}>
      {/* THE SCOPE AND THE WINDOW — outside the cards, level with the title. */}
      <HeaderAside>
        <ScopePicker
          all="All customers"
          noun="customers"
          options={CUSTOMERS.map((c) => c.name)}
          value={custs.map((id) => customerOf(id).name)}
          onChange={(names) => applyScope(new Set([...names.map((n) => `customer:${n}`), ...[...scopeSel].filter((id) => id.startsWith("shipto:"))]))}
        />
        <ScopePicker
          all="All ship-tos"
          noun="ship-tos"
          options={(custs.length ? SHIPTOS.filter((st) => custs.includes(st.customerId)) : SHIPTOS).map((st) => st.name)}
          value={ships.map((id) => shiptoOf(id).name)}
          onChange={(names) => applyScope(new Set([...[...scopeSel].filter((id) => id.startsWith("customer:")), ...names.map((n) => `shipto:${n}`)]))}
        />
        <DateRangeFilter {...dateWindow} noun="changes" value={range} onChange={setRange} />
      </HeaderAside>
      {/* THE SCOPE'S CHIPS — stay in view while the page scrolls. */}
      {scopeSel.size > 0 && (
        <div className="sticky top-0 z-20 bg-fp-surface-1b pb-2">
          <FilterChips className="mt-0" facets={scopeFacets} selected={scopeSel} onChange={applyScope} />
        </div>
      )}

      <div className={`${DASHBOARD_GROUND} flex flex-col gap-3`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Changes"
            value={scope.changes.length.toLocaleString()}
            note={`${(scope.changes.length - inherited).toLocaleString()} assignment · ${inherited.toLocaleString()} inherited`}
            onOpen={scope.changes.length ? () => attend("cs-timeline") : undefined}
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

        <InsightsPanel insights={insights} />

        <div className="grid gap-3 lg:grid-cols-2">
          <div id="cs-where" className={`flex min-w-0 ${SECTION}`}>
            <DrillCard
              title="Where changes happened"
              path={wherePath}
              onBack={(i) => setWherePath((p) => p.slice(0, i + 1))}
              bars={whereShown}
              canOpen={whereLevelKind !== "items"}
              onOpen={openWhere}
              one={whereLevelKind === "customers" ? "customer" : whereLevelKind === "shiptos" ? "ship-to" : "item"}
              many={whereLevelKind === "customers" ? "customers" : whereLevelKind === "shiptos" ? "ship-tos" : "items"}
            />
          </div>
          <div id="cs-who" className={`flex min-w-0 ${SECTION}`}>
            <DrillCard
              title="Who made the changes"
              path={whoPath}
              onBack={(i) => setWhoPath((p) => p.slice(0, i + 1))}
              bars={whoBars}
              canOpen={!whoCustomer}
              onOpen={openWho}
              one={!person ? "person" : whoCustomer ? "ship-to" : "customer"}
              many={!person ? "people" : whoCustomer ? "ship-tos" : "customers"}
            />
          </div>
        </div>

        <div id="cs-timeline" className={SECTION}>
          <ChangeTimeline
            items={timeline}
            ents={ents}
            tools={
              <span className="flex items-center gap-3">
                {/* FIXED WIDTH — the DS list search box, 320px. */}
                <span className="relative w-[320px]">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search changes" aria-label="Search changes" className="pl-8" />
                </span>
                <ListFilters facets={facets} value={sel} countFor={(next) => narrow(next).length} onApply={setSel} />
              </span>
            }
            chips={<FilterChips className="mt-0 mb-3" facets={facets} selected={sel} onChange={setSel} />}
          />
        </div>
      </div>

      <ChangeSheet id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />
    </div>
  );
}
