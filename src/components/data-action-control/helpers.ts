import type { ColumnKey, RowStatus, SortState, TableRow } from "@/components/tables-layout/types";

/* ---- Scoped search ---- */

export interface SearchField {
  key: string; // "all" | ColumnKey
  label: string;
  text: (r: TableRow) => string;
}

/** Columns a keyword can be scoped to. `all` (below) searches every field. */
export const SEARCH_FIELDS: SearchField[] = [
  { key: "status", label: "Static", text: (r) => r.status },
  { key: "dropdown", label: "Dropdown", text: (r) => `${r.dropdown.title} ${r.dropdown.description}` },
  { key: "descriptive", label: "Descriptive Text", text: (r) => `${r.descriptive.title} ${r.descriptive.description}` },
  { key: "badge", label: "Badge", text: (r) => r.badge },
  { key: "statusBadge", label: "Status", text: (r) => r.statusBadge },
  { key: "toggle", label: "Toggle Group", text: (r) => r.toggle },
  { key: "amount", label: "Amount", text: (r) => String(r.amount) },
];

/** Match a row against a lowercased query, scoped to one field or all fields. */
export function matchesScoped(row: TableRow, q: string, scope: string): boolean {
  if (!q) return true;
  const fields = scope === "all" ? SEARCH_FIELDS : SEARCH_FIELDS.filter((f) => f.key === scope);
  return fields.some((f) => f.text(row).toLowerCase().includes(q));
}

/* ---- CSV export (current filtered + visible columns) ---- */

interface ExportField {
  key: ColumnKey;
  label: string;
  value: (r: TableRow) => string | number;
}

const EXPORT_FIELDS: ExportField[] = [
  { key: "status", label: "Static", value: (r) => r.status },
  { key: "dropdown", label: "Dropdown", value: (r) => r.dropdown.title },
  { key: "descriptive", label: "Descriptive Text", value: (r) => r.descriptive.title },
  { key: "badge", label: "Badge", value: (r) => r.badge },
  { key: "statusBadge", label: "Status", value: (r) => r.statusBadge },
  { key: "switch", label: "Switch", value: (r) => (r.switchOn ? "On" : "Off") },
  { key: "progress", label: "Progress", value: (r) => r.progress },
  { key: "toggle", label: "Toggle Group", value: (r) => r.toggle },
  { key: "amount", label: "Amount", value: (r) => r.amount },
];

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV of `rows` over the currently-visible export columns and download it. */
export function exportRowsToCsv(rows: TableRow[], hidden: Set<ColumnKey>, filename = "data-export.csv"): number {
  const fields = EXPORT_FIELDS.filter((f) => !hidden.has(f.key));
  const header = fields.map((f) => f.label).join(",");
  const body = rows.map((r) => fields.map((f) => csvCell(f.value(r))).join(",")).join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return rows.length;
}

/* ---- Board grouping (rows → status lanes) ---- */

export interface BoardLane {
  status: RowStatus;
  accent: string; // fp-lane-* utility
  rows: TableRow[];
}

const LANE_ORDER: { status: RowStatus; accent: string }[] = [
  { status: "Success", accent: "bg-fp-lane-green" },
  { status: "Processing", accent: "bg-fp-lane-yellow" },
  { status: "Failed", accent: "bg-fp-lane-red" },
];

/** Group rows into fixed status lanes for the Board view. */
export function toBoardLanes(rows: TableRow[]): BoardLane[] {
  return LANE_ORDER.map(({ status, accent }) => ({
    status,
    accent,
    rows: rows.filter((r) => r.status === status),
  }));
}

/* ---- Preset views ---- */

/** A saved view — a named snapshot of the data-control state. */
export interface PresetView {
  id: string;
  name: string;
  state: PresetState;
}

export interface PresetState {
  search: string; // global search (all columns)
  colScope: string; // "search by column" — target column
  colQuery: string; // "search by column" — term
  sort: SortState | null;
  hidden: ColumnKey[];
  view: "table" | "board";
  pageSize: number;
}
