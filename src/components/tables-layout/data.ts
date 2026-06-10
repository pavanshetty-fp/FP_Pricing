import type { ColumnDef, RowStatus, TableRow } from "./types";

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

const AMOUNTS = [
  630.44, 0, 0, 475.22, 275.43, 275.43, 275.43, 275.43, 275.43, 275.43, 275.43,
  275.43, 275.43,
];

/** 13 visible rows, mirroring the patterns in the Figma frame. */
export const SAMPLE_ROWS: TableRow[] = STATUS_CYCLE.map((status, i) => ({
  id: `row-${i + 1}`,
  status,
  dropdown: { title: "Table Cell Text", description: "Description Text" },
  descriptive: { title: "Table Cell Text", description: "Description Text" },
  badge: "Badge",
  statusBadge: status,
  switchOn: i % 3 === 0,
  progress: 35 + ((i * 7) % 60),
  toggle: "bold",
  amount: AMOUNTS[i] || 275.43,
}));
