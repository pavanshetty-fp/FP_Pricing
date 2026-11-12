import * as React from "react";
import { X } from "lucide-react";
import { MetricIcon, type IconProps } from "@/components/ui/term-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetSection } from "@/components/side-sheet/parts";
import { formatDateRange, type DateRange } from "@/components/ui/date-picker";
import { DateRangeFilter } from "./threepl/DateRangeFilter";
import { RecordSheet } from "./RecordSheet";


/**
 * Export, as a side sheet that shows what is about to leave the building.
 *
 * THE EXPORT IS THE LIST, and that is the whole idea: the file you get is the
 * rows you are looking at, narrowed by the same questions the toolbar asked.
 * Pressing Export straight from the toolbar exported that set silently, which
 * meant the one moment a reader needs to check their narrowing — the moment
 * the data goes somewhere it can no longer be corrected — was the one moment
 * the narrowing was invisible.
 *
 * THE FORMAT IS A FOOTER DECISION, beside the count and the button. It is the
 * last thing you choose and the only one that does not change what is in the
 * file, so it has no business among the narrowings above.
 *
 * SHOWS, DOES NOT ASK (Pavan, 2026-11-12). Narrowing happens on the page —
 * Filters and the date control there. This sheet shows what is on: the date
 * window as From → To (editable, starting from the page's), and every applied
 * filter as a chip under its category, removable. Adding a filter means going
 * back to the page.
 *
 * It edits the LIST'S OWN state rather than keeping a private copy: two filter
 * models that can disagree is how a reader ends up exporting one thing while
 * looking at another.
 */

export type ExportFormat = "csv" | "pdf" | "doc";

/** The tone of a status, as the list's status pills carry it. */
export type SplitTone = "success" | "caution" | "processing" | "critical" | "failed" | "info" | "neutral";

/** What a list adds to the Export data card. */
export interface ExportSummary {
  /** Up to three figures as metric tiles — ship-tos, customers, gallons. */
  tiles?: { label: string; value: string; icon?: React.ComponentType<IconProps> }[];
  /** The records split by status, drawn as one bar. */
  breakdown?: { title: string; parts: { label: string; count: number; tone: SplitTone }[] };
  /** Everything else — the label ABOVE its value, the app's field style;
   *  `wide` spans both columns (a list such as gallons by product). */
  facts?: { label: string; value: React.ReactNode; wide?: boolean }[];
  /** Section headings for the tiles and the short facts. */
  tilesTitle?: string;
  factsTitle?: string;
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "csv", label: ".csv" },
  { value: "pdf", label: ".pdf" },
  { value: "doc", label: ".doc" },
];

/** A narrowing that can be taken off here, one chip per applied value. */
export interface ExportFilterRow {
  key: string;
  label: string;
  values: { value: string; onRemove: () => void }[];
  /** Takes the whole row off at once. Shown only when the row holds several. */
  onRemoveAll?: () => void;
}

/** The shelf's chip, again — same shape, because it is the same fact. */
function ValueChip({
  value,
  label,
  onRemove,
}: {
  value: string;
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-muted pr-1 pl-3 text-xs text-foreground">
      <span className="truncate">{value}</span>
      <button
        type="button"
        aria-label={`Remove filter ${label}: ${value}`}
        onClick={onRemove}
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

export function ExportSheet({
  open,
  onOpenChange,
  title = "Export",
  /** Plural noun for the count — "orders", "vendors". */
  noun,
  /** Its singular, for a count of one. Defaults to `noun` minus a trailing s. */
  nounOne,
  /** How many rows the current narrowing leaves. */
  count,
  /** The page's date window — shown in the summary; the calendar icon on
   *  the header opens its own sheet to change it (written to the page). */
  range,
  /** The screen's own `ListFilters` with `fullWidth` — a filter icon on the
   *  header that opens its own Filters sheet. */
  filtersControl,
  /** What the list adds about the file — see `ExportSummary`. */
  summary,
  /** Columns the file carries: the table's shown columns, of all. */
  columns,
  filters,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  noun: string;
  nounOne?: string;
  count: number;
  range?: {
    value: DateRange;
    onChange: (next: DateRange) => void;
    all?: DateRange;
    count?: (r: DateRange) => number;
  };
  filtersControl?: React.ReactNode;
  summary?: ExportSummary;
  columns?: { shown: number; total: number };
  /** The applied narrowings, listed under the panel. */
  filters: ExportFilterRow[];
  onExport: (format: ExportFormat) => void;
}) {
  const on = filters.filter((f) => f.values.length > 0);
  const applied = on.reduce((n, f) => n + f.values.length, 0);
  const wideFacts = (summary?.facts ?? []).filter((d) => d.wide);
  const shortFacts = (summary?.facts ?? []).filter((d) => !d.wide);
  const [format, setFormat] = React.useState<ExportFormat>("csv");

  return (
    <RecordSheet
      /* Controls, not a form — no step column. */
      stepNav={false}
      /* 640 — the tiles three across and the product box; the date and
         filter pickers are popovers now, so they set no width here. */
      width={640}
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle={title}
      createTitle={title}
      createAction="Export"
      /* NO CANCEL. This sheet commits nothing on its way through — the
         narrowings it edits are the list's own and are already visible behind
         it — so there is nothing for Cancel to undo that Close does not do, and
         a button promising to undo what it cannot is worse than no button. */
      showCancel={false}
      /* THE COUNT KEEPS THE LEFT. It is the number the reader is deciding
         about, and in the body it scrolled away from the decision. */
      footerAside={
        <span className="text-sm text-foreground">
          <span className="font-medium tabular-nums">{count}</span>{" "}
          <span className="text-muted-foreground">
            {count === 1 ? (nounOne ?? noun.replace(/s$/, "")) : noun}
          </span>
        </span>
      }
      /* THE FORMAT TRAVELS WITH THE BUTTON, 12px off it. It is part of the act
         — "export, as this" — not a fact about the list, and out on the left
         beside the count it read as one, half a sheet away from the control it
         qualifies. */
      footerPrimary={
        <div className="flex items-center gap-3">
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as ExportFormat)}
          >
            <SelectTrigger size="sm" className="w-[92px]" aria-label="File format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={count === 0} onClick={() => onExport(format)}>
            Export
          </Button>
        </div>
      }
      /* `footerPrimary` carries its own disabled state, so `canSubmit` has
         nothing to gate. `onSubmit` stays wired for the Enter key. */
      onSubmit={() => count > 0 && onExport(format)}
    >
      {/* EXPORT DATA (Pavan, 2026-11-12) — on the sheet itself, no card.
          The count and what the file is (dates · format · columns) lead;
          below it, SHEET SECTIONS — a heading over each part, 40px between
          parts and 16px under a heading, no dividers (Pavan, 2026-11-12). */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-foreground">{count.toLocaleString()}</span>
            <span className="text-base text-muted-foreground">{count === 1 ? (nounOne ?? noun.replace(/s$/, "")) : noun}</span>
          </p>
          {(range || filtersControl) && (
          /* THE CALENDAR AND THE FILTER ICONS, beside the count (Pavan,
             2026-11-12; were on the title line) — each opens the same
             popover as on the page. */
          <div className="flex shrink-0 items-center gap-2">
            {range && (
              <DateRangeFilter
                fullWidth
                value={range.value}
                onChange={range.onChange}
                all={range.all}
                count={range.count}
                noun={noun}
              />
            )}
            {filtersControl}
          </div>
        )}
        </div>
        <p className="text-sm text-muted-foreground">
          {[
            range && formatDateRange(range.value),
            `${FORMATS.find((f) => f.value === format)?.label} file`,
            columns && `${columns.shown} of ${columns.total} columns`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {summary?.tiles && summary.tiles.length > 0 && (
        <SheetSection variant="plain" title={summary.tilesTitle ?? "Overview"}>
          <div className="grid grid-cols-3 gap-3">
            {summary.tiles.map((t) => (
              <div key={t.label} className="flex min-w-0 items-center gap-3">
                {t.icon && <MetricIcon icon={t.icon} />}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-lg font-semibold tabular-nums text-foreground">{t.value}</span>
                  <span className="truncate text-xs text-muted-foreground">{t.label}</span>
                </div>
              </div>
            ))}
          </div>
        </SheetSection>
      )}

      {/* ORDER (Pavan, 2026-11-12): the wide facts (Gallons by product),
          then By status, then the short facts (order value, one-time,
          recurring). Each wide fact is its own section, named by its label. */}
      {wideFacts.map((d) => (
        <SheetSection key={d.label} variant="plain" title={d.label}>
          <div className="min-w-0 text-sm font-medium tabular-nums text-foreground">{d.value}</div>
        </SheetSection>
      ))}

      {summary?.breakdown && summary.breakdown.parts.length > 0 && (
        <SheetSection variant="plain" title={summary.breakdown.title}>
          <StatusSplit parts={summary.breakdown.parts} />
        </SheetSection>
      )}

      {shortFacts.length > 0 && (
        <SheetSection variant="plain" title={summary?.factsTitle ?? "Details"}>
          <dl className="grid grid-cols-3 gap-x-6 gap-y-4 text-sm">
            {shortFacts.map((d) => (
              <div key={d.label} className="flex min-w-0 flex-col gap-1.5">
                <dt className="text-xs text-muted-foreground">{d.label}</dt>
                <dd className="min-w-0 font-medium tabular-nums text-foreground">{d.value}</dd>
              </div>
            ))}
          </dl>
        </SheetSection>
      )}

      {/* FILTERS, ONLY WHEN SOME ARE ON (Pavan, 2026-11-12) — nothing
          shows when none are. */}
      {on.length > 0 && (
      <SheetSection
        variant="plain"
        title="Filters applied"
        action={
          applied > 0 ? (
            <span className="rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">{applied}</span>
          ) : undefined
        }
      >
          {/* ONE ROW PER CATEGORY — Line of Service, Business, Status… — its
              values as chips, each removable. 12px between rows, no rule. */}
          <div className="flex flex-col gap-3">
            {on.map((f) => (
              <div
                key={f.key}
                className="flex items-start gap-3"
              >
                <span className="w-[140px] shrink-0 pt-1.5 text-xs text-muted-foreground">
                  {f.label}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {f.values.map((v) => (
                    <ValueChip key={v.value} value={v.value} label={f.label} onRemove={v.onRemove} />
                  ))}
                  {f.values.length > 1 && f.onRemoveAll && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-5 px-1 text-[11px] text-muted-foreground"
                      onClick={f.onRemoveAll}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
      </SheetSection>
      )}
    </RecordSheet>
  );
}

/* THE STATUS COLOURS, as the status pills' dots carry them. */
const SPLIT_FILL: Record<SplitTone, string> = {
  success: "bg-status-success",
  caution: "bg-status-processing",
  processing: "bg-status-processing",
  critical: "bg-status-failed",
  failed: "bg-status-failed",
  info: "bg-fp-banner-accent-info",
  neutral: "bg-muted-foreground",
};

/** ONE BAR, SPLIT BY STATUS, with a legend — the shape of the file's rows at
 *  a glance, where nine pills had to be read one by one. */
function StatusSplit({ parts }: { parts: { label: string; count: number; tone: SplitTone }[] }) {
  const total = parts.reduce((n, p) => n + p.count, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label} ${p.count}`).join(", ")}>
        {parts.map((p) => (
          <span key={p.label} className={cn("h-full", SPLIT_FILL[p.tone])} style={{ flexGrow: p.count, flexBasis: 0 }} title={`${p.label} ${p.count}`} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2 rounded-full", SPLIT_FILL[p.tone])} />
            <span className="text-muted-foreground">{p.label}</span>
            <span className="font-medium tabular-nums text-foreground">{p.count}</span>
            <span className="tabular-nums text-muted-foreground">({Math.round((p.count / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
