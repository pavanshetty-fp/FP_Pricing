import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Panel } from "../DashboardParts";
import { RecordSheet } from "../RecordSheet";
import { SummaryCard } from "../SheetCards";
import { Figure } from "../masterdata/sheetParts";
import { kindTone } from "../statusKind";
import { STATUS_LABEL, customerOf, fmtTime, isSameDay, plural, shiptoOf, uniq, type ChangeRecord, type EntityMap, type ImpactLine } from "./changeLog";
import { NOW } from "./changeLog";
import { STATUS_KIND } from "./activityFeed";
import { ChangeText } from "./ChangeText";
import { METHOD_LABEL, THEME_LABEL, type DrillBar, type InsightTheme, type RichInsight } from "./customerShipto";

/*
  CUSTOMER & SHIP-TO, ROUND 5 (Yash, 2026-11-17 — team feedback):
  - INSIGHTS IN THREE VERSIONS, switched on the card so the PMs can pick:
    Compact (three figures; View all opens a side sheet), Descriptive (a line
    each; the card grows to show all), Grouped (Needs a look · Activity ·
    Patterns, all ten at once). Read-only in every version.
  - WHERE AND WHO DRILL INSIDE THEIR CARD. A press goes one level down in
    that card only — never the page's scope or the Timeline's filters — and
    a breadcrumb walks back. A bar that goes further shows a chevron.
  - THE TIMELINE IS A TIMELINE: days down the page, each change with its
    time, what changed, who, how it was made, and how many ship-tos it
    reached (pressing that lists them). No row opens; "Show more" instead of
    pages, so the order of changes stays in one run.
*/

// ---------------------------------------------------------------- insights --

export type InsightsVersion = "compact" | "descriptive" | "grouped";
const VERSION_LABEL: Record<InsightsVersion, string> = { compact: "Compact", descriptive: "Descriptive", grouped: "Grouped" };
const THEMES: InsightTheme[] = ["attention", "activity", "pattern"];
const THEME_DOT: Record<InsightTheme, string> = {
  attention: "bg-fp-banner-accent-caution",
  activity: "bg-fp-banner-accent-info",
  pattern: "bg-muted-foreground",
};
const COMPACT = 3;
const DESCRIPTIVE = 4;

function InsightLine({ i }: { i: RichInsight }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", THEME_DOT[i.theme])} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{i.label}</span>
        <span className="text-sm text-muted-foreground">{i.sentence}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{i.value}</span>
    </li>
  );
}

export function InsightsPanel({ insights }: { insights: RichInsight[] }) {
  const [version, setVersion] = React.useState<InsightsVersion>("compact");
  const [all, setAll] = React.useState(false);
  const [sheet, setSheet] = React.useState(false);
  const extra = version === "compact" ? insights.length - COMPACT : insights.length - DESCRIPTIVE;

  return (
    <SummaryCard title="Insights">
      <div className="-mt-1 flex items-center justify-between gap-3">
        {/* THE DEMO SWITCH — three versions, for the PMs to choose one. */}
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={version}
          onValueChange={(v) => {
            if (!v) return;
            setVersion(v as InsightsVersion);
            setAll(false);
          }}
          aria-label="Insights version"
        >
          {(Object.keys(VERSION_LABEL) as InsightsVersion[]).map((v) => (
            <ToggleGroupItem key={v} value={v} className="px-3 text-xs">
              {VERSION_LABEL[v]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {version !== "grouped" && extra > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-medium text-foreground hover:bg-foreground/5"
            onClick={() => (version === "compact" ? setSheet(true) : setAll((o) => !o))}
          >
            <span className="underline decoration-current/50 decoration-dotted underline-offset-4">
              {version === "descriptive" && all ? "Show fewer" : `View all ${insights.length}`}
            </span>
          </Button>
        )}
      </div>

      {version === "compact" && (
        <div className="-mx-3 -mb-3 grid grid-cols-1 divide-border border-t border-border sm:grid-cols-3 sm:divide-x">
          {insights.slice(0, COMPACT).map((i) => (
            <Figure key={i.key} label={i.label} value={i.value} note={i.note} />
          ))}
        </div>
      )}

      {version === "descriptive" && (
        <ul className="-mb-1 flex flex-col divide-y divide-border border-t border-border">
          {(all ? insights : insights.slice(0, DESCRIPTIVE)).map((i) => (
            <InsightLine key={i.key} i={i} />
          ))}
        </ul>
      )}

      {version === "grouped" && (
        <div className="-mx-3 -mb-3 grid grid-cols-1 divide-border border-t border-border md:grid-cols-3 md:divide-x">
          {THEMES.map((t) => (
            <section key={t} className="flex min-w-0 flex-col gap-3 p-4">
              <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span aria-hidden className={cn("size-2 rounded-full", THEME_DOT[t])} />
                {THEME_LABEL[t]}
              </h4>
              <dl className="flex flex-col gap-3">
                {insights
                  .filter((i) => i.theme === t)
                  .map((i) => (
                    <div key={i.key} className="flex min-w-0 items-baseline justify-between gap-3">
                      <span className="flex min-w-0 flex-col">
                        <dt className="text-sm text-foreground">{i.label}</dt>
                        <dd className="truncate text-xs text-muted-foreground">{i.note}</dd>
                      </span>
                      <dd className="shrink-0 truncate text-sm font-semibold tabular-nums text-foreground">{i.value}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      {/* COMPACT'S "VIEW ALL" — every insight in a side sheet, read-only. */}
      {sheet && (
        <RecordSheet
          open
          onOpenChange={(v) => !v && setSheet(false)}
          mode="edit"
          editTitle="Insights"
          createTitle=""
          createAction=""
          showCancel={false}
          stepNav={false}
          noFooter
          presentation="sheet"
          headerSubtitle={<span className="text-sm text-muted-foreground">{plural(insights.length, "insight")}</span>}
          onSubmit={() => setSheet(false)}
        >
          <div className="flex flex-col gap-8">
            {THEMES.map((t) => (
              <section key={t} className="flex flex-col">
                <h4 className="text-sm font-medium text-muted-foreground">{THEME_LABEL[t]}</h4>
                <ul className="flex flex-col divide-y divide-border">
                  {insights
                    .filter((i) => i.theme === t)
                    .map((i) => (
                      <InsightLine key={i.key} i={i} />
                    ))}
                </ul>
              </section>
            ))}
          </div>
        </RecordSheet>
      )}
    </SummaryCard>
  );
}

// ------------------------------------------------------------- drill card --

export interface DrillStep {
  key: string;
  label: string;
}

/**
 * A BAR CARD THAT DRILLS IN PLACE (Yash, 2026-11-17). `path` is where the
 * card stands ("All customers" first); a bar with `canOpen` goes one level
 * down. The page's scope and the Timeline are never touched.
 */
export function DrillCard({
  title,
  path,
  onBack,
  bars,
  canOpen,
  onOpen,
  one,
  many,
  top = 5,
}: {
  title: string;
  path: DrillStep[];
  /** Back to step `i` of the path. */
  onBack: (i: number) => void;
  bars: DrillBar[];
  canOpen: boolean;
  onOpen: (key: string, label: string) => void;
  one: string;
  many: string;
  top?: number;
}) {
  const [all, setAll] = React.useState(false);
  React.useEffect(() => setAll(false), [path.map((p) => p.key).join("/")]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorted = bars.filter((b) => b.value > 0).sort((a, b) => b.value - a.value);
  const shown = all ? sorted : sorted.slice(0, top);
  const total = sorted.reduce((t, b) => t + b.value, 0) || 1;
  const max = Math.max(1, ...sorted.map((b) => b.value));
  return (
    <Panel className="flex-1" title={title} aside={sorted.length > top && !all ? `Top ${top} of ${plural(sorted.length, one, many)}` : plural(sorted.length, one, many)}>
      {/* WHERE THE CARD STANDS — each step walks back to it. */}
      <nav aria-label={`${title} level`} className="-mt-1 mb-2 flex min-h-7 flex-wrap items-center gap-1 text-sm">
        {path.length > 1 && (
          <Button variant="ghost" size="icon-sm" aria-label="Back" className="-ml-1.5 size-7" onClick={() => onBack(path.length - 2)}>
            <ChevronLeft />
          </Button>
        )}
        {path.map((p, i) => (
          <React.Fragment key={p.key}>
            {i > 0 && <ChevronRight aria-hidden className="size-3.5 text-muted-foreground" />}
            {i < path.length - 1 ? (
              <button type="button" onClick={() => onBack(i)} className="rounded-sm text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50">
                {p.label}
              </button>
            ) : (
              <span className="font-medium text-foreground">{p.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing in this range.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {shown.map((b) => {
            const body = (
              <>
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className={cn("truncate text-foreground", canOpen && "group-hover/bar:underline")}>{b.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{b.detail}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 tabular-nums text-foreground">
                    {b.value.toLocaleString()}
                    <span className="inline-block w-10 text-right text-xs text-muted-foreground">{Math.round((b.value / total) * 100)}%</span>
                    {canOpen && <ChevronRight aria-hidden className="size-4 text-muted-foreground group-hover/bar:text-foreground" />}
                  </span>
                </span>
                <span className="h-2 w-full rounded-full bg-fp-viz-1/12 dark:bg-fp-viz-1/20">
                  <span className="block h-full rounded-full bg-fp-viz-1" style={{ width: `${(b.value / max) * 100}%` }} />
                </span>
              </>
            );
            return (
              <li key={b.key}>
                {canOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(b.key, b.label)}
                    aria-label={`${b.label}, ${plural(b.value, "change")} — show what is under it`}
                    className="group/bar flex w-full cursor-pointer flex-col gap-1 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex w-full flex-col gap-1 px-2 py-1.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {sorted.length > top && (
        <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs font-medium text-foreground hover:bg-foreground/5" onClick={() => setAll((o) => !o)}>
          <span className="underline decoration-current/50 decoration-dotted underline-offset-4">
            {all ? `Show top ${top}` : `View ${sorted.length - top} ${sorted.length - top === 1 ? "other" : "others"}`}
          </span>
        </Button>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- timeline --

const DAY_FMT = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const dayLabel = (t: number) => (isSameDay(t, NOW) ? "Today" : isSameDay(t, NOW - 86_400_000) ? "Yesterday" : DAY_FMT.format(t));
const PAGE = 20;

/** "N ship-tos" — pressing lists them by customer, with a search. */
function ShiptoCount({ lines }: { lines: ImpactLine[] }) {
  const ids = uniq(lines.map((l) => l.shiptoId));
  const byCustomer = uniq(ids.map((id) => shiptoOf(id).customerId));
  if (ids.length === 0) return <span>No ship-tos</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-pointer rounded-sm font-medium text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {plural(ids.length, "ship-to")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search ship-tos…" />
          <CommandList className="max-h-72">
            <CommandEmpty>No matches.</CommandEmpty>
            {byCustomer.map((cid) => (
              <CommandGroup key={cid} heading={`${customerOf(cid).name} · ${ids.filter((id) => shiptoOf(id).customerId === cid).length}`}>
                {ids
                  .filter((id) => shiptoOf(id).customerId === cid)
                  .map((id) => (
                    <CommandItem key={id} value={`${shiptoOf(id).name} ${customerOf(cid).name}`} className="flex flex-col items-start gap-0">
                      <span>{shiptoOf(id).name}</span>
                      <span className="text-xs text-muted-foreground">{shiptoOf(id).address}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ChangeTimeline({
  items,
  ents,
  tools,
  chips,
}: {
  items: { c: ChangeRecord; lines: ImpactLine[] }[];
  ents: EntityMap;
  /** Search and Filters, beside the title. */
  tools?: React.ReactNode;
  /** The filter chips, under it. */
  chips?: React.ReactNode;
}) {
  const [limit, setLimit] = React.useState(PAGE);
  React.useEffect(() => setLimit(PAGE), [items]);
  const shown = items.slice(0, limit);
  const days: { day: string; list: typeof items }[] = [];
  for (const x of shown) {
    const d = dayLabel(x.c.effectiveAt);
    const last = days[days.length - 1];
    if (last && last.day === d) last.list.push(x);
    else days.push({ day: d, list: [x] });
  }
  return (
    <Panel title="Timeline" aside={tools}>
      {chips}
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No changes match.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((d) => (
            <section key={d.day} className="flex flex-col">
              <h4 className="sticky top-0 z-10 bg-card pb-2 text-xs font-medium text-muted-foreground">{d.day}</h4>
              <ol className="flex flex-col">
                {d.list.map((x, i) => (
                  <li key={x.c.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < d.list.length - 1 && <span aria-hidden className="absolute top-5 bottom-0 left-[69px] w-px bg-border" />}
                    <span className="w-14 shrink-0 pt-0.5 text-right text-xs tabular-nums text-muted-foreground">{fmtTime(x.c.effectiveAt)}</span>
                    <span aria-hidden className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-fp-viz-1 bg-card" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-foreground">
                        <ChangeText c={x.c} ents={ents} />
                        {x.c.status !== "applied" && (
                          <StatusChip tone={kindTone(STATUS_KIND[x.c.status])} variant="text" className="ml-1">
                            {STATUS_LABEL[x.c.status]}
                          </StatusChip>
                        )}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <Pill>{METHOD_LABEL[x.c.source]}</Pill>
                        <span>{x.c.by}</span>
                        <span aria-hidden>·</span>
                        <ShiptoCount lines={x.lines} />
                        <span aria-hidden>·</span>
                        <span>{x.c.id}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {items.length > limit && (
            <Button variant="outline" size="sm" className="self-center" onClick={() => setLimit((n) => n + PAGE)}>
              Show {Math.min(PAGE, items.length - limit)} more
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}
