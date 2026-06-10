import * as React from "react";
import { Search, ListFilter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DataTable } from "@/components/tables-layout/DataTable";
import { SAMPLE_ROWS, sortRows, paginationRange } from "@/components/tables-layout/data";
import type { ColumnKey, SortState } from "@/components/tables-layout/types";
import { InfoAlert } from "./parts";

/** Compact numeric pager (Figma wide variant shows just page numbers). */
function MiniPagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1 p-3">
      {paginationRange(page, total).map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e${i}`} className="px-2 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              item === page
                ? "border border-fp-outline-2 bg-fp-surface-1a text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {item}
          </button>
        )
      )}
    </div>
  );
}

/** Side sheet wide (1200) — Figma 27610:70923. Table-focused content. */
export function SheetWide({
  title = "FleetPanda HQ - Tank List (103)",
}: {
  title?: string;
}) {
  const [sort, setSort] = React.useState<SortState | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const pageSize = 5;

  const sorted = React.useMemo(() => sortRows(SAMPLE_ROWS, sort), [sort]);
  const rows = sorted.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  const onSort = (key: ColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of rows) {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div className="flex flex-col gap-0.5">
          <SheetTitle className="text-base">{title}</SheetTitle>
          <SheetDescription>This is a sheet description.</SheetDescription>
        </div>
        <SheetClose className="rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        <InfoAlert />

        {/* Action bar: search + filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="h-9 pl-8" />
          </div>
          <Button variant="outline" size="sm">
            <ListFilter />
            Filters
          </Button>
        </div>

        <DataTable
          rows={rows}
          selectedIds={selected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          sort={sort}
          onSort={onSort}
        />

        <MiniPagination page={page} total={totalPages} onChange={setPage} />
      </div>
    </>
  );
}
