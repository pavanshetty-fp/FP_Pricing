import * as React from "react";
import type { ListFacet } from "../ListFilters";
import type { ListColumn } from "../ListTable";
import { StandardList } from "../StandardList";

/**
 * WHAT A CELL PRINTS, as plain text — the strings and numbers anywhere under
 * the node `renderCell` returned. A column-filter box matches this rather than
 * the sort value, because a date sorts by `2026-09-24` and reads as
 * "Sep 24, 2026", and the reader types what they read.
 */
export function printedText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(printedText).join(" ");
  if (React.isValidElement<{ children?: React.ReactNode }>(node))
    return printedText(node.props.children);
  return "";
}

/**
 * ONE LIST SCREEN FOR THE SERVICE REFERENCE PAGES (2026-09-24) — price book,
 * parts, agreements, maintenance, compliance, the scorecard, technicians.
 *
 * THE STANDARD LIST, LIKE EVERY TABLE PAGE (Pavan, 2026-10-22): the view row
 * (All, saved views, Export), the toolbar with search and Filters, the chip
 * shelf, the view bar, the table, pagination. Each page supplies its
 * columns, cells, what search reads and what a column sorts by; the FILTERS
 * come from its own columns — any column with a short list of values (a
 * status, a category, a vendor) is a facet, so no page is left without one.
 */
export function ServiceListScreen<Row, K extends string>({
  rows,
  columns,
  rowId,
  renderCell,
  sortValue,
  searchPlaceholder,
  noun,
  icon,
  above,
  valuesOf,
}: {
  rows: Row[];
  columns: ListColumn<K>[];
  rowId: (r: Row) => string;
  renderCell: (r: Row, key: K) => React.ReactNode;
  sortValue: (r: Row, key: K) => string | number;
  /** Kept for the pages that pass it; the standard list searches what every
      column prints, which covers it. */
  searchText?: (r: Row) => string;
  searchPlaceholder: string;
  /** Plural, for the empty state — "parts". */
  noun: string;
  icon: React.ReactNode;
  /** Anything above the list — the performance figures. */
  above?: React.ReactNode;
  /** A column's values for its filter, where one cell holds several (skills). */
  valuesOf?: (r: Row, key: K) => string[] | undefined;
}) {
  const printed = React.useCallback((r: Row, key: K) => printedText(renderCell(r, key)).trim(), [renderCell]);
  const values = React.useCallback(
    (r: Row, key: K) => valuesOf?.(r, key) ?? [printed(r, key)].filter(Boolean),
    [valuesOf, printed]
  );
  /* A FACET PER CATEGORY COLUMN — a status, a category, a vendor, a skill:
     2 to 12 values, some shared by several rows. Not the first column (the
     record's own name or number), and not a number, an amount or a date —
     those are what search and the column boxes are for. */
  const facets = React.useMemo<ListFacet[]>(() => {
    const looksMeasured = (v: string) =>
      /^[\d$.,\s%+-]+$/.test(v) || /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d/.test(v);
    return columns
      .filter((c, i) => c.label && i > 0)
      .map((c) => {
        const all = rows.flatMap((r) => values(r, c.key));
        return { c, all, opts: Array.from(new Set(all)).sort() };
      })
      .filter(
        ({ all, opts }) =>
          opts.length >= 2 && opts.length <= 12 && opts.length < all.length && !opts.every(looksMeasured)
      )
      .map(({ c, opts }) => ({ key: c.key, label: c.label, options: opts }));
  }, [columns, rows, values]);
  const one = noun.endsWith("ies") ? `${noun.slice(0, -3)}y` : noun.replace(/s$/, "");
  return (
    <StandardList<Row, K>
      rows={rows}
      columns={columns}
      rowId={rowId}
      text={(r, key) => printed(r, key)}
      sortValue={(r, key) => sortValue(r, key)}
      renderCell={renderCell}
      facets={facets}
      facetValues={(r, facet) => values(r, facet as K)}
      storageKey={`service-${noun}`}
      noun={noun}
      nounOne={one}
      searchPlaceholder={searchPlaceholder}
      above={above}
      openLabel={(r) => `Open ${rowId(r)}`}
      emptyIcon={icon}
    />
  );
}
