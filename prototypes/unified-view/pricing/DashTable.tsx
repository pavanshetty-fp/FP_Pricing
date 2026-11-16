import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { FilterChips } from "../ListToolbar";
import { ListFilters, type ListFacet } from "../ListFilters";

/*
  A DASHBOARD TABLE THAT CAN BE NARROWED (Yash, 2026-11-16) — the Sales ›
  Dashboard table (a plain DS table on the card, no frame of its own) under
  the list's search and Filters, with the chip shelf and pages. Composed from
  the toolbar's parts; no new look. A press elsewhere on the page can set its
  facets (`apply`) — an insight, a person, an entity.
*/

export interface DashColumn<R> {
  key: string;
  label: string;
  cell: (r: R) => React.ReactNode;
  className?: string;
}

export interface DashFacet<R> {
  key: string;
  label: string;
  /** A row's values for the facet — several where one row touches several. */
  values: (r: R) => string[];
  order?: string[];
  searchable?: boolean;
}

const HEAD = "px-2 text-xs";

export function DashTable<R>({
  rows,
  rowKey,
  columns,
  facets,
  searchText,
  searchPlaceholder,
  onRowClick,
  apply,
  empty,
  pageSize: initialSize = 10,
}: {
  rows: R[];
  rowKey: (r: R) => string;
  columns: DashColumn<R>[];
  facets: DashFacet<R>[];
  searchText: (r: R) => string;
  searchPlaceholder: string;
  onRowClick?: (r: R) => void;
  apply?: { picked: string[]; n: number } | null;
  empty: string;
  pageSize?: number;
}) {
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState<ReadonlySet<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialSize);
  React.useEffect(() => {
    if (!apply) return;
    setSel(new Set(apply.picked));
    setQ("");
    setPage(1);
  }, [apply?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const listFacets = React.useMemo<ListFacet[]>(
    () =>
      facets.map((f) => {
        const present = new Set(rows.flatMap(f.values).filter(Boolean));
        return {
          key: f.key,
          label: f.label,
          options: f.order ? f.order.filter((o) => present.has(o)) : [...present].sort(),
          searchable: f.searchable,
        };
      }),
    [facets, rows]
  );
  const narrow = React.useCallback(
    (picked: ReadonlySet<string>) => {
      const needle = q.trim().toLowerCase();
      return rows.filter((r) => {
        if (needle && !searchText(r).toLowerCase().includes(needle)) return false;
        return facets.every((f) => {
          const mine = [...picked].filter((id) => id.startsWith(`${f.key}:`)).map((id) => id.slice(f.key.length + 1));
          return !mine.length || f.values(r).some((v) => mine.includes(v));
        });
      });
    },
    [rows, q, facets, searchText]
  );
  const shown = React.useMemo(() => narrow(sel), [narrow, sel]);
  const p = Math.min(page, Math.max(1, Math.ceil(shown.length / pageSize)));

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3">
        {/* FIXED WIDTH — the list search box is the DS's 320px, the same on
            every list (ListToolbar); it is not a row of fields. */}
        <div className="relative w-[320px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-8"
          />
        </div>
        <ListFilters
          facets={listFacets}
          value={sel}
          countFor={(next) => narrow(next).length}
          onApply={(next) => {
            setSel(next);
            setPage(1);
          }}
        />
      </div>
      <FilterChips
        facets={listFacets}
        selected={sel}
        onChange={(next) => {
          setSel(next);
          setPage(1);
        }}
      />
      <div className="mt-3">
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead key={c.key} className={HEAD}>
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.slice((p - 1) * pageSize, p * pageSize).map((r) => (
                <TableRow
                  key={rowKey(r)}
                  className={cn(onRowClick ? "cursor-pointer" : "hover:bg-transparent")}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn("px-2", c.className)}>
                      {c.cell(r)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {shown.length > 0 && (
        <div className="mt-3">
          <TablePagination
            page={p}
            pageSize={pageSize}
            total={shown.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
