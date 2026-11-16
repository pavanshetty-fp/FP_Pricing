import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { Combobox } from "@/components/ui/combobox";
import { dateWindowOf } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarList, DASHBOARD_GROUND, Panel, StatTile, type BarDatum } from "../DashboardParts";
import { RecordSheet } from "../RecordSheet";
import { HeaderAside } from "../headerSlot";
import { kindTone } from "../statusKind";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { dateKeyOf, startOfDay } from "../data";
import { RecordViews } from "../masterdata/RecordViews";
import { DAY, NOW, SETTING_LABEL, STATUS_LABEL, changeSummary, customerOf, fmtDate, fmtWhen, money, plural, shiptoOf, uniq, type ChangeRecord } from "./changeLog";
import { CUSTOMERS, SHIPTOS } from "./seed";
import { useChangeLog } from "./changeLogStore";
import { STATUS_KIND } from "./activityFeed";
import { ChangeSheet } from "./ChangeSheet";
import { flagsOf, insightsOf, kindOf, scopeOf, thenNowOf, whereOf, whoOf } from "./customerShipto";
import { InsightsCard, thenNowTab, timelineTab } from "./customerShiptoViews";

/*
  CHANGE LOG › CUSTOMER & SHIP-TO, DASHBOARD (Yash, 2026-11-16).
  - SCOPE: Customer and Ship-to pickers on the scope row (the dashboard's left
    slot), "All customers" / "All ship-tos" by default; a bar in Where also
    narrows them. The date window sits level with the page title (header
    slot — to raise with Pavan; the dashboard unit puts it on the scope row).
  - The dashboard's own parts only: stat tiles, the Insights summary card,
    ranked bars, and SHORT TABLES as Sales › Dashboard has them (a plain DS
    table on the card, ten rows). The ↗ on a table's card opens the full list
    in a sheet — the Customer Portal dashboard's Schedule card pattern — with
    search, Filters and pages. Every number opens what it counts.
  The 360 version is kept in CustomerShipto360.tsx.
*/

const lastQuarter = (): DateRange => ({ from: startOfDay(new Date(NOW - 89 * DAY)), to: startOfDay(new Date(NOW)) });
const inRange = (r: DateRange) => (c: ChangeRecord) =>
  c.status === "scheduled" || (c.effectiveAt >= r.from.getTime() && c.effectiveAt < r.to.getTime() + DAY);
const TOP = 10;
const HEAD = "px-2 text-xs";

/** The card corner's ↗ — the stat tile's arrow, as its own button. */
function OpenAll({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onOpen}
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-input bg-transparent text-foreground outline-none transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-fp-field-fill [&_svg]:size-4"
    >
      <ArrowUpRight />
    </button>
  );
}

export function CustomerShiptoDashboard() {
  const log = useChangeLog();
  const ents = log.entityMap;
  const [range, setRange] = React.useState<DateRange>(lastQuarter);
  const inWindow = React.useMemo(() => inRange(range), [range]);
  const [cust, setCust] = React.useState("");
  const [ship, setShip] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  /* THE FULL LIST IN A SHEET — which one, and the facets it opens with. */
  const [full, setFull] = React.useState<{ tab: "timeline" | "then-now"; picked: string[]; n: number } | null>(null);
  const whereRef = React.useRef<HTMLDivElement>(null);
  const whoRef = React.useRef<HTMLDivElement>(null);
  const goto = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: "smooth", block: "start" });
  const openTimeline = (picked: string[] = []) => setFull({ tab: "timeline", picked, n: Date.now() });

  const scope = React.useMemo(
    () => scopeOf(log.changes, cust ? [cust] : CUSTOMERS.map((c) => c.id), ship ? [ship] : [], inWindow),
    [log.changes, cust, ship, inWindow]
  );
  const flags = React.useMemo(() => flagsOf(scope), [scope]);
  const insights = React.useMemo(() => insightsOf(scope, flags), [scope, flags]);
  const who = React.useMemo(() => whoOf(scope), [scope]);
  const thenNow = React.useMemo(() => thenNowOf(scope, log.rows, ents), [scope, log.rows, ents]);

  /* WHERE — customers across the book, a customer's ship-tos, or one
     ship-to's entities. A customer or ship-to sets the picker; an entity
     opens the timeline on it. */
  const where = React.useMemo((): { title: string; one: string; many: string; bars: BarDatum[] } => {
    if (!cust && !ship) {
      const bars = CUSTOMERS.map((c) => {
        const list = scope.changes.filter((x) => x.lines.some((l) => l.customerId === c.id));
        return { key: c.id, label: c.name, value: list.length, detail: `${plural(list.length, "change")} · last ${list[0] ? fmtDate(list[0].c.effectiveAt) : "—"}`, onOpen: () => setCust(c.id) };
      });
      return { title: "Where changes happened", one: "customer", many: "customers", bars };
    }
    const w = whereOf(scope);
    if (w.by === "shipto")
      return {
        title: "Where changes happened",
        one: "ship-to",
        many: "ship-tos",
        bars: w.rows.map((r) => ({ key: r.key, label: r.name, value: r.changes, detail: `${r.assignment} assignment · ${r.inherited} inherited`, onOpen: () => setShip(r.key) })),
      };
    return {
      title: "What changed",
      one: "entity",
      many: "entities",
      bars: w.rows.map((r) => ({ key: r.key, label: r.name, value: r.changes, detail: `Last ${r.last ? fmtDate(r.last) : "—"} · ${r.lastBy}`, onOpen: () => openTimeline([`setting:${r.name}`]) })),
    };
  }, [scope, cust, ship]); // eslint-disable-line react-hooks/exhaustive-deps
  const whereBars = where.bars.filter((b) => b.value > 0).sort((a, b) => b.value - a.value);

  const fullTab = React.useMemo(
    () => (full?.tab === "then-now" ? thenNowTab(thenNow, range.from) : timelineTab(scope, ents, flags, setOpenId)),
    [full?.tab, scope, ents, flags, thenNow, range]
  );

  const dateWindow = React.useMemo(() => dateWindowOf(log.changes.map((c) => dateKeyOf(new Date(c.effectiveAt)))), [log.changes]);
  const people = uniq(scope.changes.map((x) => x.c.by));
  const inherited = scope.changes.filter((x) => kindOf(x.c) === "Inherited").length;
  const touched = uniq(scope.changes.flatMap((x) => x.lines.map((l) => l.shiptoId)));
  const last = scope.changes.find((x) => x.c.status !== "scheduled" && x.c.status !== "canceled");
  const scopeLabel = ship ? shiptoOf(ship).name : cust ? customerOf(cust).name : "All customers";
  const shipOptions = (cust ? SHIPTOS.filter((s) => s.customerId === cust) : SHIPTOS).map((s) => ({
    value: s.id,
    label: s.name,
    description: cust ? undefined : customerOf(s.customerId).name,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <HeaderAside>
        <DateRangeFilter {...dateWindow} noun="changes" value={range} onChange={setRange} />
      </HeaderAside>

      {/* THE SCOPE ROW — the dashboard's left slot. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Combobox
          className="w-64"
          size="sm"
          value={cust}
          onValueChange={(v) => {
            setCust(v);
            if (v && ship && shiptoOf(ship).customerId !== v) setShip("");
          }}
          options={CUSTOMERS.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="All customers"
          searchPlaceholder="Search customers"
          clearLabel="All customers"
        />
        <Combobox
          className="w-72"
          size="sm"
          value={ship}
          onValueChange={(v) => {
            setShip(v);
            if (v) setCust(shiptoOf(v).customerId);
          }}
          options={shipOptions}
          placeholder="All ship-tos"
          searchPlaceholder="Search ship-tos"
          clearLabel="All ship-tos"
        />
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
              aside={whereBars.length > TOP ? `Top ${TOP} of ${plural(whereBars.length, where.one, where.many)}` : plural(whereBars.length, where.one, where.many)}
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

        {/* THE LATEST CHANGES — a short table, as Sales › Dashboard; ↗ opens all. */}
        <Panel
          title="Timeline"
          aside={
            <span className="flex items-center gap-3">
              {plural(scope.changes.length, "change")}
              {scope.changes.length > 0 && <OpenAll label="Open the whole timeline" onOpen={() => openTimeline()} />}
            </span>
          }
        >
          {scope.changes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No changes in these dates.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={HEAD}>Date & time</TableHead>
                  <TableHead className={HEAD}>Change</TableHead>
                  <TableHead className={HEAD}>Entity</TableHead>
                  <TableHead className={HEAD}>Applies to</TableHead>
                  <TableHead className={HEAD}>Made by</TableHead>
                  <TableHead className={HEAD}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scope.changes.slice(0, TOP).map(({ c, lines }) => {
                  const hits = uniq(lines.map((l) => l.shiptoId));
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpenId(c.id)}>
                      <TableCell className="px-2 tabular-nums">{fmtWhen(c.effectiveAt)}</TableCell>
                      <TableCell className="max-w-96 truncate px-2">
                        {changeSummary(c, ents)} <span className="text-muted-foreground">· {c.id}</span>
                      </TableCell>
                      <TableCell className="px-2">{uniq(lines.map((l) => SETTING_LABEL[l.setting])).join(", ")}</TableCell>
                      <TableCell className="px-2">{hits.length === 1 ? shiptoOf(hits[0]).name : `${hits.length} of ${plural(scope.shiptos.length, "ship-to")}`}</TableCell>
                      <TableCell className="px-2">{c.by}</TableCell>
                      <TableCell className="px-2">
                        <StatusChip tone={kindTone(STATUS_KIND[c.status])} variant="text">
                          {STATUS_LABEL[c.status]}
                        </StatusChip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>

        {/* THE BIGGEST PRICE MOVES — the same short table; ↗ opens every price. */}
        <Panel
          title="Then vs now"
          aside={
            <span className="flex items-center gap-3">
              {plural(thenNow.length, "price")}
              {thenNow.length > 0 && <OpenAll label="Open every price" onOpen={() => setFull({ tab: "then-now", picked: [], n: Date.now() })} />}
            </span>
          }
        >
          {thenNow.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No prices in this scope.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={HEAD}>Ship-to</TableHead>
                  <TableHead className={HEAD}>Product</TableHead>
                  <TableHead className={HEAD}>Price on {fmtDate(range.from.getTime())} ($/gal)</TableHead>
                  <TableHead className={HEAD}>Price now ($/gal)</TableHead>
                  <TableHead className={HEAD}>Change ($/gal)</TableHead>
                  <TableHead className={HEAD}>What moved it</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thenNow.slice(0, TOP).map((p) => (
                  <TableRow key={p.id} className="hover:bg-transparent">
                    <TableCell className="max-w-56 truncate px-2">{p.shipto}</TableCell>
                    <TableCell className="max-w-48 truncate px-2">{p.product}</TableCell>
                    <TableCell className="px-2 tabular-nums">{money(p.then)}</TableCell>
                    <TableCell className="px-2 tabular-nums">{money(p.now)}</TableCell>
                    <TableCell className="px-2 tabular-nums">{p.delta === 0 ? "—" : `${p.delta > 0 ? "+" : "−"}${money(Math.abs(p.delta))}`}</TableCell>
                    <TableCell className="px-2 text-muted-foreground">{p.why || "No changes"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>

      {/* THE WHOLE LIST — search, Filters, pages — over the dashboard. */}
      <RecordSheet
        size="full"
        open={full !== null}
        onOpenChange={(o) => !o && setFull(null)}
        mode="edit"
        editTitle={full?.tab === "then-now" ? "Then vs now" : "Timeline"}
        createTitle=""
        createAction=""
        showCancel={false}
        stepNav={false}
        noFooter
        headerSubtitle={
          <span className="text-sm text-muted-foreground">
            {scopeLabel} · {fmtDate(range.from.getTime())} – {fmtDate(range.to.getTime())}
          </span>
        }
        onSubmit={() => setFull(null)}
      >
        <div className="flex h-[calc(var(--fp-vh,100vh)-180px)] min-h-[480px] flex-col">
          <RecordViews
            resetKey={`${full?.tab}-${full?.n}`}
            tabs={[fullTab]}
            searchPlaceholder={full?.tab === "then-now" ? "Search these prices" : "Search these changes"}
            historyKey="pricing-cs-full"
            initialPicked={full?.picked}
          />
        </div>
      </RecordSheet>

      <ChangeSheet id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />
    </div>
  );
}
