import * as React from "react";
import { Search } from "lucide-react";
import { dateWindowOf } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { ListFilters, type ListFacet } from "../ListFilters";
import { FilterChips } from "../ListToolbar";
import { RecordSheet } from "../RecordSheet";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { dateKeyOf, startOfDay } from "../data";
import { DAY, NOW, fmtStamp, uniq } from "./changeLog";
import { ChangeSheet } from "./ChangeSheet";

/*
  A RECORD'S HISTORY AS A TIMELINE (Yash, 2026-11-27) — an artifact (rate
  type, market, margin, fee …), a customer or a ship-to. The dev site's
  artifact history is a timeline, and so is Customer & ship-to's (UX-84:
  history is a timeline). Newest first: the date and time to the second, a
  dot, the tag and the change, then who made it and what it reached.
  Search, Filters (Action, Change by) and dates — one day or a range — on
  top. A change that is in the log opens it.
*/

export interface HistoryItem {
  key: string;
  at: number;
  action: string;
  /** The change as it reads on the line. */
  change: React.ReactNode;
  /** The same, as text — what the search reads. */
  text: string;
  by: string;
  /** After who: how it was made, what it reached. */
  note?: string;
  /** Opens the change, when it is in the log. */
  changeId?: string;
}

const PAGE = 20;
const inWindow = (t: number, r: DateRange) => t >= r.from.getTime() && t < r.to.getTime() + DAY;

export function HistorySheet({
  title,
  subtitle,
  items,
  onClose,
  level,
  historyKey,
}: {
  title: string;
  subtitle?: string;
  items: HistoryItem[];
  onClose: () => void;
  level?: 1 | 2;
  /** Which history's recent filters these are. */
  historyKey: string;
}) {
  const [changeId, setChangeId] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState<ReadonlySet<string>>(new Set());
  const dateWindow = React.useMemo(() => dateWindowOf(items.map((x) => dateKeyOf(new Date(x.at)))), [items]);
  const everything = dateWindow.all ?? { from: startOfDay(new Date(NOW)), to: startOfDay(new Date(NOW)) };
  /* ALL DATES TO START — a record's history is short enough to read whole. */
  const [range, setRange] = React.useState<DateRange>(everything);

  const facets: ListFacet[] = React.useMemo(
    () => [
      { key: "action", label: "Action", options: uniq(items.map((x) => x.action)).sort() },
      { key: "by", label: "Change by", options: uniq(items.map((x) => x.by)).sort(), searchable: true },
    ],
    [items]
  );
  const ql = q.trim().toLowerCase();
  const narrow = React.useCallback(
    (f: ReadonlySet<string>) => {
      const by = new Map<string, string[]>();
      for (const id of f) {
        const i = id.indexOf(":");
        by.set(id.slice(0, i), [...(by.get(id.slice(0, i)) ?? []), id.slice(i + 1)]);
      }
      return items.filter(
        (x) =>
          inWindow(x.at, range) &&
          (!ql || `${x.action} ${x.text} ${x.by} ${x.note ?? ""}`.toLowerCase().includes(ql)) &&
          (!by.has("action") || by.get("action")!.includes(x.action)) &&
          (!by.has("by") || by.get("by")!.includes(x.by))
      );
    },
    [items, range, ql]
  );
  const shown = React.useMemo(() => narrow(sel), [narrow, sel]);
  const [limit, setLimit] = React.useState(PAGE);
  React.useEffect(() => setLimit(PAGE), [shown]);
  const page = shown.slice(0, limit);
  const narrowed = ql !== "" || sel.size > 0 || range !== everything;

  return (
    <RecordSheet
      size="form"
      level={level}
      open
      onOpenChange={(v) => !v && onClose()}
      mode="edit"
      editTitle={title}
      createTitle=""
      createAction=""
      showCancel={false}
      stepNav={false}
      noFooter
      headerSubtitle={subtitle ? <span className="text-sm text-muted-foreground">{subtitle}</span> : undefined}
      onSubmit={onClose}
    >
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this history" aria-label="Search this history" className="h-8 pl-8" />
          </div>
          {/* A CALENDAR ICON, NO STEPPER (Yash, 2026-11-27) — the Export sheet's
              date control (IX-17): the same picker, one day or a range. */}
          <DateRangeFilter fullWidth {...dateWindow} noun="changes" value={range} onChange={setRange} />
          <ListFilters align="end" historyKey={historyKey} facets={facets} value={sel} countFor={(f) => narrow(f).length} onApply={setSel} />
        </div>
        <FilterChips className="mt-0" facets={facets} selected={sel} onChange={setSel} />

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-sm text-muted-foreground">{items.length ? "No changes match." : "No changes yet."}</p>
            {narrowed && items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQ("");
                  setSel(new Set());
                  setRange(everything);
                }}
              >
                Clear all
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ol className="flex flex-col">
              {page.map((x, i) => {
                const opens = Boolean(x.changeId);
                return (
                  <li
                    key={x.key}
                    tabIndex={opens ? 0 : undefined}
                    aria-label={opens ? `Open the change made ${fmtStamp(x.at)}` : undefined}
                    onClick={opens ? () => setChangeId(x.changeId!) : undefined}
                    onKeyDown={
                      opens
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setChangeId(x.changeId!);
                            }
                          }
                        : undefined
                    }
                    className={
                      "relative -mx-2 grid grid-cols-[196px_20px_minmax(0,1fr)] gap-x-3 rounded-md px-2 pt-2 pb-4 outline-none" +
                      (opens ? " cursor-pointer hover:bg-fp-row-hover focus-visible:ring-2 focus-visible:ring-ring/50" : "")
                    }
                  >
                    <span className="pt-0.5 text-sm whitespace-nowrap tabular-nums text-muted-foreground">{fmtStamp(x.at)}</span>
                    <span className="relative flex justify-center">
                      {i < page.length - 1 && <span aria-hidden className="absolute top-4 -bottom-6 w-px bg-border" />}
                      <span aria-hidden className="relative mt-2 size-2.5 rounded-full bg-fp-viz-1" />
                    </span>
                    {/* THE DEV SITE'S ORDER: the tag and who on the dot's
                        line, the change under it, wrapping whole. */}
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        <Pill>{x.action}</Pill>
                        <span>{x.note ? `${x.by} · ${x.note}` : x.by}</span>
                      </span>
                      <span className="min-w-0 text-sm break-words text-foreground">{x.change}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
            {shown.length > limit && (
              <Button variant="outline" size="sm" className="self-start" onClick={() => setLimit((n) => n + PAGE)}>
                Show {Math.min(PAGE, shown.length - limit)} more
              </Button>
            )}
          </div>
        )}
      </div>
      <ChangeSheet id={changeId} onClose={() => setChangeId(null)} onOpen={setChangeId} level={2} />
    </RecordSheet>
  );
}
