import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { statusBadgeVariant } from "@/components/tables-layout/data";
import type { TableRow } from "@/components/tables-layout/types";
import { toBoardLanes } from "./helpers";

/** Cap cards per lane so the board stays snappy on large datasets. */
const LANE_CAP = 25;

const money = (n: number) => `$${n.toFixed(2)}`;

function Card({ row }: { row: TableRow }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        // shrink-0: cards keep their natural height in the scrolling lane stack
        // (overflow-hidden would otherwise let flex shrink them to a sliver).
        "shrink-0 cursor-pointer overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1b p-3 outline-none transition-[color,border-color,box-shadow]",
        "hover:border-fp-outline-2 hover:shadow-fp-surface",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        "active:border-fp-outline-2 active:bg-fp-card-1"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="truncate text-sm font-semibold text-foreground">{row.dropdown.title}</h4>
        <Badge variant={statusBadgeVariant(row.statusBadge)}>{row.statusBadge}</Badge>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{row.descriptive.title}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded bg-fp-card-1 px-1.5 py-0.5 text-[11px] text-muted-foreground">{row.badge}</span>
        <span className="font-mono text-sm tabular-nums text-foreground">{money(row.amount)}</span>
      </div>
    </div>
  );
}

export interface BoardViewProps {
  rows: TableRow[];
}

/**
 * Board view — the current filtered rows grouped into fixed status lanes
 * (Success / Processing / Failed), styled with the DS Kanban conventions
 * (recessed `bg-accent` track, colored top strip, count pill, card stack).
 */
export function BoardView({ rows }: BoardViewProps) {
  const lanes = toBoardLanes(rows);

  return (
    <div className="fp-scrollbar flex h-full min-h-0 gap-4 overflow-x-auto pb-1">
      {lanes.map((lane) => {
        const shown = lane.rows.slice(0, LANE_CAP);
        const overflow = lane.rows.length - shown.length;
        return (
          <div
            key={lane.status}
            className="flex h-full w-[320px] shrink-0 flex-col overflow-hidden rounded-md bg-accent"
          >
            <div className={cn("h-1 w-full shrink-0", lane.accent)} />
            <div className="flex shrink-0 items-center gap-2 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">{lane.status}</h3>
              <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium text-white", lane.accent)}>
                {lane.rows.length}
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
              {shown.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">No records</p>
              ) : (
                shown.map((row) => <Card key={row.id} row={row} />)
              )}
              {overflow > 0 && (
                <p className="py-1 text-center text-xs text-muted-foreground">+{overflow.toLocaleString()} more</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
