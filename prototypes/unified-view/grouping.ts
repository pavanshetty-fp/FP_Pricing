/*
  Grouping engine — screen-agnostic, and the single source of grouping
  behaviour for all four lists.

  It produces DATA, not markup: `groupRows` returns a flat render list of
  group-header and row nodes with a depth on each, so the two table shells
  (`ListTable` and `FuelOrdersTable`) can render grouping without either of them
  owning the logic.

  Three rules are enforced here rather than left to each screen:

  1. GROUP BY WHAT YOU WANT TOTALS FOR. Every group header carries a count and
     one summed measure — the only column on each list that adds up to something
     true (gallons, units, ship-tos, capacity). `measureOf` supplies it.

  2. DEGENERATE LEVELS ARE SKIPPED. A second dimension that yields exactly one
     child covering its whole parent tells the reader nothing and costs a row
     plus an indent. Fuel Orders grouped Customer › Ship To does this for every
     customer in the seed data, because ship-to is 1:1 with customer there. The
     header is dropped and the rows rise to the parent.

  3. MULTI-VALUE DIMENSIONS DUPLICATE. A record with three products belongs to
     three product groups. `multi` marks those dimensions so the menu can flag
     them and the footer can say the counts deliberately over-sum.

  Two levels is the cap. It is enforced by the menu, not here.
*/

/** The label a row gets when it has no value for the dimension. Sorts last. */
export const NO_VALUE = "—";

export interface GroupDim<Row> {
  key: string;
  label: string;
  /**
   * A row can land in several groups, so group counts sum past the list total.
   * Marked in the menu and stated in the footer.
   */
  multi?: boolean;
  /** Every group this row belongs to. Empty ⇒ the `NO_VALUE` group. */
  valuesOf: (row: Row) => string[];
  /**
   * The column this dimension is rendered in. While grouped by it, that column
   * repeats its own header on every row, so the table hides it and gives the
   * width back.
   */
  hides?: string;
  /**
   * Group order, for dimensions with a meaningful sequence (a status
   * lifecycle). Anything not listed falls after, alphabetically.
   */
  order?: string[];
}

export type GroupNode<Row> =
  | {
      kind: "group";
      /** Path-unique — `status:Assigned/customer:Morris Group`. */
      id: string;
      depth: number;
      label: string;
      /** The dimension that produced it, for the header's eyebrow. */
      dimLabel: string;
      /** Rows beneath, including those inside a collapsed child. */
      count: number;
      /** Summed measure for those rows. */
      measure: number;
      /**
       * The rows this header owns, collapsed or not — so the header checkbox
       * selects the whole group rather than the part that happens to be drawn.
       */
      rowIds: string[];
    }
  | { kind: "row"; id: string; depth: number; row: Row };

interface Bucket<Row> {
  id: string;
  label: string;
  dimLabel: string;
  rows: Row[];
  children: Bucket<Row>[] | null;
}

function compareLabels(a: string, b: string, order?: string[]): number {
  // The empty group is always last: it is the exception, not the first case.
  if (a === NO_VALUE) return b === NO_VALUE ? 0 : 1;
  if (b === NO_VALUE) return -1;
  if (order) {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function bucketize<Row>(
  rows: Row[],
  dim: GroupDim<Row>,
  parentId: string
): Bucket<Row>[] {
  const byLabel = new Map<string, Row[]>();
  for (const row of rows) {
    const values = dim.valuesOf(row);
    const labels = values.length > 0 ? values : [NO_VALUE];
    for (const label of labels) {
      const bucket = byLabel.get(label);
      if (bucket) bucket.push(row);
      else byLabel.set(label, [row]);
    }
  }
  return [...byLabel.entries()]
    .sort((a, b) => compareLabels(a[0], b[0], dim.order))
    .map(([label, bucketRows]) => ({
      id: `${parentId}${parentId ? "/" : ""}${dim.key}:${label}`,
      label,
      dimLabel: dim.label,
      rows: bucketRows,
      children: null,
    }));
}

export interface GroupResult<Row> {
  nodes: GroupNode<Row>[];
  /** Every group id in the tree, so "collapse all" needs no second walk. */
  groupIds: string[];
  /** Headers actually rendered — the footer's "N groups". */
  groupCount: number;
  /** Distinct rows, which is NOT the sum of group counts on a multi dimension. */
  rowCount: number;
  /** True when any active dimension duplicates rows across groups. */
  overCounts: boolean;
}

/**
 * Build the render list.
 *
 * `collapsed` holds the ids of collapsed groups; their descendants are omitted
 * from `nodes` but still counted in every ancestor header, which is the whole
 * point of collapsing — the totals stay true while the rows go away.
 */
export function groupRows<Row>(
  rows: Row[],
  dims: GroupDim<Row>[],
  options: {
    rowId: (row: Row) => string;
    /** The one column that sums to something true. Defaults to a plain count. */
    measureOf?: (row: Row) => number;
    collapsed?: ReadonlySet<string>;
  }
): GroupResult<Row> {
  const { rowId, measureOf, collapsed } = options;
  const measure = (bucketRows: Row[]) =>
    measureOf ? bucketRows.reduce((n, r) => n + measureOf(r), 0) : 0;

  if (dims.length === 0) {
    return {
      nodes: rows.map((row) => ({
        kind: "row" as const,
        id: rowId(row),
        depth: 0,
        row,
      })),
      groupIds: [],
      groupCount: 0,
      rowCount: rows.length,
      overCounts: false,
    };
  }

  const nodes: GroupNode<Row>[] = [];
  const groupIds: string[] = [];
  let groupCount = 0;

  const walk = (bucketRows: Row[], depth: number, parentId: string) => {
    const dim = dims[depth];
    if (!dim) {
      for (const row of bucketRows) {
        nodes.push({
          kind: "row",
          // Path-scoped: on a multi dimension the same row appears under
          // several groups, and a bare row id would collide as a React key.
          id: `${parentId}#${rowId(row)}`,
          depth,
          row,
        });
      }
      return;
    }

    const buckets = bucketize(bucketRows, dim, parentId);

    // Rule 2 — a level with one child covering the whole parent adds an indent
    // and no information. Drop the header, keep descending.
    if (depth > 0 && buckets.length === 1 && buckets[0].rows.length === bucketRows.length) {
      walk(bucketRows, depth + 1, parentId);
      return;
    }

    for (const bucket of buckets) {
      groupIds.push(bucket.id);
      groupCount += 1;
      nodes.push({
        kind: "group",
        id: bucket.id,
        depth,
        label: bucket.label,
        dimLabel: bucket.dimLabel,
        count: bucket.rows.length,
        measure: measure(bucket.rows),
        rowIds: bucket.rows.map(rowId),
      });
      if (!collapsed?.has(bucket.id)) {
        walk(bucket.rows, depth + 1, bucket.id);
      }
    }
  };

  walk(rows, 0, "");

  return {
    nodes,
    groupIds,
    groupCount,
    rowCount: rows.length,
    overCounts: dims.some((d) => d.multi),
  };
}

/** The columns to hide while these dimensions are active (rule: no column repeats its own group header). */
export function columnsHiddenByGrouping<Row>(dims: GroupDim<Row>[]): string[] {
  return dims.map((d) => d.hides).filter((k): k is string => Boolean(k));
}

/** `24,132 gal` — group headers, and the footer, read the same formatting. */
export function formatMeasure(value: number, unit: string): string {
  return `${value.toLocaleString("en-US")}${unit ? ` ${unit}` : ""}`;
}

/**
 * Tri-state for a group's header checkbox. Reads the group's WHOLE membership,
 * so a collapsed group still reports honestly instead of describing the rows
 * that happen to be drawn.
 */
export function groupSelectionState(
  rowIds: string[],
  selected: ReadonlySet<string>
): boolean | "indeterminate" {
  if (rowIds.length === 0) return false;
  let hit = 0;
  for (const id of rowIds) if (selected.has(id)) hit += 1;
  if (hit === 0) return false;
  return hit === rowIds.length ? true : "indeterminate";
}
