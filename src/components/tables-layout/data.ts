import type {
  ColumnDef,
  ColumnKey,
  RowStatus,
  SortState,
  TableRow,
} from "./types";

/*
  Column order + widths taken verbatim from the Figma column frames:
  select=40, status(Static)=145.9, dropdown=172, descriptive=145.9, badge=85,
  statusBadge=145.9, switch..amount=145.9 each, actions=44.
  `sortable` flags reflect the ↕ glyphs read from the screenshot (ASSUMPTION —
  the exact set is a component variant prop not exposed by the Figma metadata).
*/
export const COLUMNS: ColumnDef[] = [
  { key: "select", label: "", width: 40 },
  { key: "status", label: "Static", width: 145.9, sortable: true },
  { key: "dropdown", label: "Dropdown", width: 172 },
  { key: "descriptive", label: "Descriptive Text", width: 145.9 },
  { key: "badge", label: "Badge", width: 85 },
  { key: "statusBadge", label: "Badge", width: 145.9 },
  { key: "switch", label: "Switch", width: 145.9, sortable: true },
  { key: "button", label: "Button", width: 145.9 },
  { key: "iconDropdown", label: "Dropdown", width: 145.9 },
  { key: "progress", label: "Progress", width: 145.9, sortable: true },
  { key: "image", label: "Image", width: 145.9 },
  { key: "toggle", label: "Toggle Group", width: 145.9 },
  { key: "amount", label: "Amount", width: 145.9, sortable: true, align: "right" },
  { key: "actions", label: "", width: 44 },
];

const STATUS_CYCLE: RowStatus[] = [
  "Success",
  "Success",
  "Processing",
  "Success",
  "Failed",
  "Failed",
  "Failed",
  "Failed",
  "Failed",
  "Failed",
  "Failed",
  "Failed",
  "Failed",
];

const AMOUNTS = [630.44, 812.1, 199.99, 475.22, 275.43, 1040.0, 56.75, 920.18];

/** 1,000 sample rows so pagination is exercised against a realistic dataset. */
export const SAMPLE_ROWS: TableRow[] = Array.from({ length: 1000 }, (_, i) => {
  const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
  return {
    id: `row-${i + 1}`,
    status,
    dropdown: { title: "Table Cell Text", description: "Description Text" },
    descriptive: { title: "Table Cell Text", description: "Description Text" },
    badge: "Badge",
    statusBadge: status,
    switchOn: i % 3 === 0,
    progress: 5 + ((i * 7) % 95),
    toggle: "bold",
    amount: AMOUNTS[i % AMOUNTS.length] + (i % 13),
  };
});

/** Value a column sorts on. Columns without per-row data sort as a no-op. */
function sortValue(row: TableRow, key: ColumnKey): string | number {
  switch (key) {
    case "status":
      return row.status;
    case "switch":
      return row.switchOn ? 1 : 0;
    case "progress":
      return row.progress;
    case "amount":
      return row.amount;
    default:
      return 0;
  }
}

/** Pure sort — returns a new array; `null` leaves the order untouched. */
export function sortRows(rows: TableRow[], sort: SortState | null): TableRow[] {
  if (!sort) return rows;
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av < bv) return -1 * factor;
    if (av > bv) return 1 * factor;
    return 0;
  });
}

/**
 * Page-number windowing — Figma "FP Pagination" rules (27631:11152):
 * anchor first + last, show `siblings` either side of the current page, and
 * collapse the gaps into "ellipsis". Fixed slot count keeps the bar from
 * reflowing as you navigate.
 */
export function paginationRange(
  current: number,
  total: number,
  siblings = 1
): (number | "ellipsis")[] {
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  // first + last + current + 2 siblings + 2 ellipsis slots
  const totalSlots = siblings * 2 + 5;
  if (totalSlots >= total) return range(1, total);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showLeftDots = left > 2;
  const showRightDots = right < total - 1;
  const edgeCount = 3 + 2 * siblings;

  if (!showLeftDots && showRightDots) {
    return [...range(1, edgeCount), "ellipsis", total];
  }
  if (showLeftDots && !showRightDots) {
    return [1, "ellipsis", ...range(total - edgeCount + 1, total)];
  }
  return [1, "ellipsis", ...range(left, right), "ellipsis", total];
}
