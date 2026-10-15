import * as React from "react";
import { X } from "lucide-react";
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
 * THE SHEET'S CONTROLS ARE THE SCREEN'S CONTROLS. The date stepper and the
 * Filters button are the same two the toolbar carries, behaving the same way —
 * a reader who has narrowed the board has already learnt this sheet. The one
 * thing the sheet adds is the LIST OF WHAT IS ON, under them: the panel shows
 * one facet at a time and cannot answer "what am I exporting" on its own, and
 * the answer includes narrowings that are not facets at all.
 *
 * It edits the LIST'S OWN state rather than keeping a private copy: two filter
 * models that can disagree is how a reader ends up exporting one thing while
 * looking at another.
 */

export type ExportFormat = "csv" | "pdf" | "doc";

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
  /** The date control — the screen's own, the one the toolbar carries. */
  date,
  filtersControl,
  filters,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  noun: string;
  nounOne?: string;
  count: number;
  date?: React.ReactNode;
  /** The facet panel's trigger — the screen's own `ListFilters`. */
  filtersControl?: React.ReactNode;
  /** The applied narrowings, listed under the panel. */
  filters: ExportFilterRow[];
  onExport: (format: ExportFormat) => void;
}) {
  const on = filters.filter((f) => f.values.length > 0);
  const [format, setFormat] = React.useState<ExportFormat>("csv");

  return (
    <RecordSheet
      /* Controls, not a form — no step column. */
      stepNav={false}
      /* 510. Wider than the 392 the flattened calendar was squeezed into, and
         still short of the DS narrow's 560: this sheet holds controls, not a
         two-column form. */
      size="compact"
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
      {/* PLAIN SECTIONS, NOT CARDS. A card draws an edge to say where a block
          starts and ends; each of these is one control under one heading, and a
          box around it was a third edge inside a sheet that is itself a
          bordered surface. The heading and the 40px between sections carry
          it. */}
      {/* THE DATE IS ONE LINE, UNDER ITS HEADING. The control prints the window
          it is on and opens the rest on click, so there is nothing for a second
          row to hold — and the sheet's subject is the filters below, which a
          laid-out calendar was burying. It takes the full width like every
          other block here rather than perching on the heading's right. */}
      {date && (
        <SheetSection variant="plain" title="Date">
          {date}
        </SheetSection>
      )}

      <SheetSection variant="plain" title="Filters">
        {/* THE CONTROL AND WHAT IT PRODUCED ARE ONE UNIT, 12px apart. The
            section's 16px belongs to heading→content; inside the content the
            button and the list it filled are the same thought, and the 48 that
            used to sit here read as a second section with no heading. */}
        <div className="flex flex-col gap-3">
          {filtersControl}

          {/* 24px BETWEEN GROUPS, now spent as 12 / rule / 12 rather than as
              one gap. Several rows wrap onto two lines of chips, and a gap
              alone could not say whether a second line belonged to the row
              above it or the one below — the rule says it. */}
          {on.length > 0 && (
            <div className="flex flex-col gap-3">
              {on.map((f, i) => (
                /* THE RULE RUNS THE WHOLE WIDTH, label column included: the
                   row is one thing — a question and its answer — and a line
                   that started at the chips cut the row in half rather than
                   separating it from the next. Not after the last row: there is
                   nothing below to separate it from. */
                <div
                  key={f.key}
                  className={cn(
                    "flex items-start gap-3",
                    i < on.length - 1 && "border-b border-border pb-3"
                  )}
                >
                  <span className="w-[140px] shrink-0 pt-0.5 text-xs text-muted-foreground">
                    {f.label}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    {f.values.map((v) => (
                      <ValueChip
                        key={v.value}
                        value={v.value}
                        label={f.label}
                        onRemove={v.onRemove}
                      />
                    ))}
                    {/* CLEAR THE ROW, only where there is a row to clear. On a
                        single value it would be a second control doing what the
                        chip's own X already does. */}
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
          )}
        </div>
      </SheetSection>
    </RecordSheet>
  );
}
