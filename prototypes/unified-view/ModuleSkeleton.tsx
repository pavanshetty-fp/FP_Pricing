import { Skeleton } from "@/components/ui/skeleton";

/*
  A MODULE'S PAGE WHILE ITS DATA LOADS (Pavan, 2026-10-10). Each part of the
  page — the view tabs, the toolbar, the table's header and rows — is a
  shimmering block in its own place, so the page arrives in the shape it is
  about to take rather than as a blank.
*/
const CELL_WIDTHS = ["w-20", "w-10", "w-40", "w-28", "w-16", "w-24"];

export function ModuleSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading data for this module."
      className="flex min-h-0 flex-1 flex-col gap-4 pt-1"
    >
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-14" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-28" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="ml-auto h-9 w-36" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
        <div className="flex h-11 items-center gap-6 border-b border-border bg-fp-table-header px-4">
          {CELL_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>
        {Array.from({ length: 9 }, (_, r) => (
          <div key={r} className="flex h-14 items-center gap-6 border-b border-border px-4 last:border-b-0">
            {CELL_WIDTHS.map((w, i) => (
              <Skeleton key={i} className={`h-4 ${i === 4 ? "w-20 rounded-full" : w}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
