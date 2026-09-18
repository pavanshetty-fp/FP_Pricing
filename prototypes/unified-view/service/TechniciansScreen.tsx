import * as React from "react";
import { HardHat, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
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
import { TECHNICIANS, WORK_ORDERS, type Technician } from "./work";

/**
 * TECHNICIANS — who can take the work.
 *
 * A LIST, NOT A BOARD. A technician has no lifecycle; the questions asked of
 * this screen are "who covers meters", "who works out of Kern" and "how full
 * is somebody" — which are a filter, a filter and a number, all of them
 * columns.
 *
 * OPEN JOBS IS THE COLUMN THAT MAKES IT USEFUL. A roster with skills and a
 * phone number is a contact list; the count of work still on somebody is what
 * turns it into the thing you read before assigning the next job. It is
 * counted off the work orders rather than stored, because a stored count is a
 * number that goes stale the moment a job moves.
 *
 * NOT BUILT YET, named rather than faked: the technician's own day (their
 * jobs, in order, with travel between them), and adding or editing one.
 */

type TechColumnKey =
  | "name"
  | "base"
  | "skills"
  | "open"
  | "capacity"
  | "phone"
  | "status"
  | "actions";

const TECH_COLUMNS: ListColumn<TechColumnKey>[] = [
  { key: "name", label: "Technician", width: 200, sortable: true },
  { key: "base", label: "Base", width: 180, sortable: true },
  { key: "skills", label: "Skills", width: 260, sortable: true },
  /* COMPARED DOWN THE COLUMN, so right-aligned — these two are read against
     each other and against the rows above. */
  { key: "open", label: "Open Jobs", width: 120, sortable: true, align: "right" },
  { key: "capacity", label: "Jobs / Day", width: 120, sortable: true, align: "right" },
  { key: "phone", label: "Phone", width: 170, sortable: true },
  { key: "status", label: "Status", width: 130, sortable: true },
  { key: "actions", label: "", width: 44 },
];

const TECH_SEARCH_FIELDS = [
  { key: "name", label: "Technician" },
  { key: "base", label: "Base" },
  { key: "skills", label: "Skills" },
];

/** Work still on somebody — anything not finished, cancelled or on hold. */
function openJobsFor(id: string): number {
  return WORK_ORDERS.filter(
    (r) =>
      r.technicianId === id &&
      (r.status === "Scheduled" || r.status === "In Progress")
  ).length;
}

export function TechniciansScreen() {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<ListSort<TechColumnKey> | null>(null);
  const [hidden, setHidden] = React.useState<Set<TechColumnKey>>(new Set());
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [colScope, setColScope] = React.useState("name");
  const [colQuery, setColQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const open = React.useMemo(
    () => Object.fromEntries(TECHNICIANS.map((t) => [t.id, openJobsFor(t.id)])),
    []
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TECHNICIANS;
    return TECHNICIANS.filter((t) =>
      [t.name, t.base, t.skills.join(" ")].join(" ").toLowerCase().includes(q)
    );
  }, [search]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const value = (t: Technician): string | number => {
      switch (sort.key) {
        case "name":
          return t.name;
        case "base":
          return t.base;
        case "skills":
          return t.skills.join(", ");
        case "open":
          return open[t.id] ?? 0;
        case "capacity":
          return t.dailyCapacity;
        case "phone":
          return t.phone;
        case "status":
          return t.active ? 0 : 1;
        default:
          return "";
      }
    };
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort, open]);

  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const renderCell = (t: Technician, key: TechColumnKey): React.ReactNode => {
    switch (key) {
      case "name":
        return <span className="font-medium text-foreground">{t.name}</span>;
      case "base":
        return t.base;
      case "skills":
        /* CHIPS, BECAUSE THE QUESTION IS "CAN THEY DO X". A comma-joined
           sentence is read; a row of chips is scanned, which is what somebody
           picking a technician is doing. */
        return (
          <span className="flex flex-wrap items-center gap-1">
            {t.skills.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </span>
        );
      case "open":
        return <span className="tabular-nums">{open[t.id] ?? 0}</span>;
      case "capacity":
        return <span className="tabular-nums">{t.dailyCapacity}</span>;
      case "phone":
        return <span className="tabular-nums text-muted-foreground">{t.phone}</span>;
      case "status":
        return (
          <StatusChip tone={t.active ? "success" : "neutral"}>
            {t.active ? "Active" : "Inactive"}
          </StatusChip>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search technicians, bases, skills…"
          showGroupBy={false}
          filters={null}
          columns={TECH_COLUMNS.filter((c) => c.label).map((c) => ({
            key: c.key,
            label: c.label,
          }))}
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
          searchFields={TECH_SEARCH_FIELDS}
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
                <EmptyMedia variant="icon">
                  {search ? <SearchX /> : <HardHat />}
                </EmptyMedia>
                <EmptyTitle>No technicians match</EmptyTitle>
                <EmptyDescription>
                  {TECHNICIANS.length} on the roster, none of them matching what
                  you have typed.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ListTable
              rows={pageRows}
              columns={TECH_COLUMNS}
              hidden={hidden}
              sort={sort}
              onSort={(key) =>
                setSort((prev) => {
                  if (prev?.key !== key) return { key, dir: "asc" };
                  if (prev.dir === "asc") return { key, dir: "desc" };
                  return null;
                })
              }
              rowId={(t) => t.id}
              renderCell={renderCell}
              actionsKey="actions"
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(t) => `Open ${t.name}`}
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
