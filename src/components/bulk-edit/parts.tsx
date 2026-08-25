import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** One record as the summary tables render it: an identity plus its cells. */
export interface RecordRef {
  /** Stable identity, rendered in the first column. */
  id: string;
  /** Remaining cells, in column order. */
  cells?: string[];
}

/**
 * Plain identity table — the records being acted on. Deliberately unstyled
 * beyond the DS table: its job is to let the operator confirm *which* rows the
 * mutation lands on, not to re-present their data.
 */
export function RecordMiniTable({
  records,
  headers,
}: {
  records: RecordRef[];
  /** Column headers; `headers[0]` labels the identity column. */
  headers: string[];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium tabular-nums">{r.id}</TableCell>
              {(r.cells ?? []).map((c, i) => (
                <TableCell
                  key={i}
                  className={i === (r.cells ?? []).length - 1 ? "text-muted-foreground" : undefined}
                >
                  {c}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export interface BeforeAfterRow {
  id: string;
  before: string;
  after: string;
}

/**
 * Per-row before/after — the step-2 preview.
 *
 * `before` renders muted with a line through it so the row reads as a
 * **replacement** rather than an addition. An empty `before` falls back to an
 * em-dash, so "had nothing" and "had something" stay visually distinct — without
 * it, a blank cell reads as a rendering failure rather than as a fact.
 */
export function BeforeAfterTable({
  rows,
  valueHeader,
  idHeader = "ID",
}: {
  rows: BeforeAfterRow[];
  /** Name of the attribute changing; used for both value columns. */
  valueHeader: string;
  idHeader?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{idHeader}</TableHead>
            <TableHead>Current {valueHeader}</TableHead>
            <TableHead>New {valueHeader}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium tabular-nums">{r.id}</TableCell>
              <TableCell className="text-muted-foreground line-through">
                {r.before || "—"}
              </TableCell>
              <TableCell className="font-medium">{r.after || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * What the target already holds, collapsed by default.
 *
 * This is the "surface what already exists" half of the flow — the reason the
 * pattern is two steps at all. The count stays visible; the records behind it
 * are one click away.
 *
 * Inner surface is `bg-fp-surface-1b`, NOT `bg-fp-card-1`: measured against the
 * dialog's own `bg-background`, card-1 is only [6,3,10] away in light (#e9ecf1
 * on #efefeb — near-invisible), while surface-1b is [16,16,20] light and
 * [19,24,32] dark. Same collision family as the bulk bar's fill.
 */
export function StandingItems({
  label,
  records,
  headers,
  itemNoun = "item",
  summary,
  className,
}: {
  label: string;
  records: RecordRef[];
  headers: string[];
  /** Noun used by the default count phrasing. */
  itemNoun?: string;
  /** Override the count phrasing entirely. */
  summary?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const n = records.length;
  const plural = n === 1 ? itemNoun : `${itemNoun}s`;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("rounded-md border border-border bg-fp-surface-1b", className)}
    >
      <CollapsibleTrigger
        disabled={n === 0}
        className="flex w-full items-center justify-between gap-2 p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default"
      >
        <span className="text-sm font-medium">{label}</span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {summary ?? (n === 0 ? `No ${itemNoun}s yet` : `${n} existing ${plural}`)}
          {n > 0 && (
            <ChevronDown
              className={cn("size-4 transition-transform", open && "rotate-180")}
            />
          )}
        </span>
      </CollapsibleTrigger>
      {n > 0 && (
        <CollapsibleContent className="px-3 pb-3">
          {/* Bounded on purpose. A heavily loaded target can hold 20+ records,
              and letting that list run full height pushes the section the
              operator is actually deciding on several screens down the dialog's
              own scroll. It scrolls within itself instead. */}
          <div className="max-h-56 overflow-y-auto">
            <RecordMiniTable records={records} headers={headers} />
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
