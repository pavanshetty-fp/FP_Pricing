import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatMeasure } from "./grouping";

/*
  One group header row, shared by every table shell so grouping looks identical
  wherever it is turned on.

  It spans every column rather than sitting in one, because a group header is
  not a record — it belongs to the table, not to the columns. What it carries is
  fixed by the rule the engine encodes: label · count · the one summed measure
  for this list. A list picks that measure; nothing else on it adds up to
  something true.

  The depth-0 header sticks under the column header while its rows scroll, so
  you never lose track of which group you are reading. Nested headers do not
  stick: two stacked sticky bands eat the top of a short group.

  HEADERS INDENT, ROWS DO NOT. Indenting the rows too would push the checkbox
  column out from under its own header and break column alignment across groups
  — and column alignment is the thing a data grid is for. The header bands carry
  the nesting on their own.

  THE BAND FILL IS `--fp-lane`, MEASURED. The obvious pick, `--fp-surface-1a`,
  is #ffffff in light — identical to the table's own ground — so the band simply
  vanished there while looking correct in dark. `--muted` fails the same test the
  other way round (#1b2028 in dark, the content layer exactly). `--fp-lane` is
  #f4f5f8 / #2a2f37: distinct from the body in BOTH themes, and it already means
  "the band a group of rows lives in" in the DS's board view. `--fp-row-hover`
  would also have worked but is spoken for.
*/

export interface GroupHeaderRowProps {
  colSpan: number;
  depth: number;
  label: string;
  /** The dimension that produced the group — shown when nested, for context. */
  dimLabel: string;
  count: number;
  /** Summed measure, already totalled by the engine. */
  measure: number;
  /** Unit for that measure, e.g. `gal`. Empty renders the bare number. */
  unit: string;
  /** What one record is called here — "order", "asset", "account". */
  noun: string;
  collapsed: boolean;
  onToggle: () => void;
  /** Omitted on lists without row selection. */
  selection?: {
    state: boolean | "indeterminate";
    onChange: (checked: boolean) => void;
  };
}

/** 20px per level — enough to read as nesting, cheap enough to afford twice. */
const INDENT = 20;

export function GroupHeaderRow({
  colSpan,
  depth,
  label,
  dimLabel,
  count,
  measure,
  unit,
  noun,
  collapsed,
  onToggle,
  selection,
}: GroupHeaderRowProps) {
  return (
    <TableRow
      className={cn(
        "h-10 border-b border-fp-outline-1 hover:bg-transparent",
        // z-10 keeps it under the column header (z-20) and over the body rows.
        depth === 0 && "sticky top-10 z-10"
      )}
    >
      <TableCell colSpan={colSpan} className="bg-fp-lane p-0">
        {/* The header spans every column, so on a wide table it is far wider
            than the content layer on screen. Pinning the content block
            to the left edge of the horizontal scroll keeps the label, the count
            and the total on screen at any scroll position — right-aligning the
            total instead parked it off the right edge, visible only to someone
            who scrolled looking for it. */}
        <div
          className="sticky left-0 flex h-10 w-fit max-w-full items-center gap-2.5 pr-4"
          style={{ paddingLeft: 12 + depth * INDENT }}
        >
          {selection && (
            <Checkbox
              checked={selection.state}
              onCheckedChange={(c) => selection.onChange(c === true)}
              aria-label={`Select all ${count} ${noun}${count === 1 ? "" : "s"} in ${label}`}
            />
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="flex min-w-0 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </span>
            {depth > 0 && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {dimLabel}
              </span>
            )}
            <span className="truncate text-sm font-medium text-foreground">
              {label}
            </span>
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {count}
            </span>
          </button>
          {/* Sits beside the count, not at the far right — see above. */}
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatMeasure(measure, unit)}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}
