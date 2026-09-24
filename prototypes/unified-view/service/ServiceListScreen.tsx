import * as React from "react";
import { SearchX } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TablePagination } from "@/components/tables-layout";
import { ListToolbar } from "../ListToolbar";
import { ListTable, type ListColumn, type ListSort } from "../ListTable";

/**
 * ONE LIST SCREEN FOR THE SERVICE REFERENCE PAGES (2026-09-24) — price book,
 * parts, agreements, maintenance, compliance, the scorecard. The same toolbar,
 * table and pagination the Technicians roster uses (T3, the page's own list),
 * so six screens cannot drift into six shapes. Each page supplies its
 * columns, cells, what search reads and what a column sorts by.
 */
export function ServiceListScreen<Row, K extends string>({
  rows,
  columns,
  rowId,
  renderCell,
  sortValue,
  searchText,
  searchPlaceholder,
  noun,
  icon,
  above,
}: {
  rows: Row[];
  columns: ListColumn<K>[];
  rowId: (r: Row) => string;
  renderCell: (r: Row, key: K) => React.ReactNode;
  sortValue: (r: Row, key: K) => string | number;
  searchText: (r: Row) => string;
  searchPlaceholder: string;
  /** Plural, for the empty state — "parts". */
  noun: string;
  icon: React.ReactNode;
  /** Anything above the list — the performance figures. */
  above?: React.ReactNode;
}) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<ListSort<K> | null>(null);
  const [hidden, setHidden] = React.useState<Set<K>>(new Set());
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [colScope, setColScope] = React.useState<string>(columns[0].key);
  const [colQuery, setColQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const cq = colQuery.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || searchText(r).toLowerCase().includes(q)) &&
        (!cq || String(sortValue(r, colScope as K)).toLowerCase().includes(cq))
    );
  }, [rows, search, searchText, colQuery, colScope, sortValue]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort, sortValue]);

  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);
  const actionsKey = columns[columns.length - 1].key;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {above && <div className="mb-4 shrink-0">{above}</div>}
      <div className="shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder={searchPlaceholder}
          showGroupBy={false}
          filters={null}
          columns={columns.filter((c) => c.label).map((c) => ({ key: c.key, label: c.label }))}
          hiddenColumns={hidden}
          columnOrder={columnOrder}
          onReorderColumns={setColumnOrder}
          onToggleColumn={(k) =>
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
          onShowAllColumns={() => setHidden(new Set())}
          searchFields={columns.filter((c) => c.label).map((c) => ({ key: c.key, label: c.label }))}
          colScope={colScope}
          onColScopeChange={setColScope}
          colQuery={colQuery}
          onColQueryChange={setColQuery}
          view="table"
          onViewChange={() => {}}
        />
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {sorted.length === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">{search ? <SearchX /> : icon}</EmptyMedia>
                <EmptyTitle>No {noun} match</EmptyTitle>
                <EmptyDescription>
                  {rows.length} {noun}, none of them matching what you have typed.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ListTable
              rows={pageRows}
              columns={columns}
              hidden={hidden}
              sort={sort}
              onSort={(key) =>
                setSort((prev) => {
                  if (prev?.key !== key) return { key, dir: "asc" };
                  if (prev.dir === "asc") return { key, dir: "desc" };
                  return null;
                })
              }
              rowId={rowId}
              renderCell={renderCell}
              actionsKey={actionsKey}
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(r) => `Open ${rowId(r)}`}
            />
          )}
        </div>
      </div>

      <div className="mt-4 shrink-0">
        <TablePagination
          className="h-9"
          page={page}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
