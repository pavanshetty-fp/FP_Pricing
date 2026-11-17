import type { ListColumn } from "../ListTable";

/*
  COLUMN WIDTH FROM THE WIDEST RENDERED CELL (UX-45; Yash, 2026-11-16). A
  declared width is a guess, and a guess too small lets a long value ("Ultra
  Low Sulfur #2 Fuel Oil Dyed") run over the next column. Every Pricing table
  measures what it will print — the header with its sort arrow, each cell's
  lines (a second line in the small size), a pill's padding — and takes the
  widest, plus the cell padding, rounded up to 10px. The table then fills or
  scrolls as UX-45 says.

  Measured in the current text size (User view configuration scales the root
  font), so a bigger text size gets wider columns.
*/

let ctx: CanvasRenderingContext2D | null = null;
const FAMILY = () => (typeof document === "undefined" ? "sans-serif" : getComputedStyle(document.body).fontFamily);
const SCALE = () =>
  typeof document === "undefined" ? 1 : (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;

function textWidth(s: string, px: number, weight: number) {
  if (typeof document === "undefined") return s.length * px * 0.55;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return s.length * px * 0.55;
  ctx.font = `${weight} ${px}px ${FAMILY()}`;
  return ctx.measureText(s).width;
}

/** Cell padding (px-3 both sides). */
const PAD = 24;
/** The header's sort arrow and its gap. */
const SORT = 24;
/** A pill's own padding around its label. */
const PILL = 24;
const MAX_ROWS = 600;
const FIXED: Record<string, number> = { Customer: 250, "Ship-to": 170, "Ship-tos": 170 };

export function fitColumns<K extends string, R>(
  columns: ListColumn<K>[],
  rows: R[],
  /** What a cell prints, line by line — the first in the body size, the rest small. */
  linesOf: (row: R, key: K) => string[],
  /** Columns whose first line is a pill or status chip. */
  pills: readonly K[] = []
): ListColumn<K>[] {
  const k = SCALE();
  const body = 14 * k;
  const small = 12 * k;
  const sample = rows.slice(0, MAX_ROWS);
  return columns.map((c) => {
    if (!c.label) return c;
    /* THE TWO FIXED WIDTHS (ui §column widths — "Customer is 250 everywhere;
       Ship-to / Ship-Tos 170"). Longer names truncate. */
    const fixed = FIXED[c.label];
    if (fixed) return { ...c, width: fixed };
    let w = textWidth(c.label, body, 500) + PAD + SORT;
    for (const r of sample) {
      const lines = linesOf(r, c.key);
      lines.forEach((line, i) => {
        if (!line) return;
        const lw = textWidth(line, i === 0 ? body : small, 400) + PAD + (i === 0 && pills.includes(c.key) ? PILL : 0);
        if (lw > w) w = lw;
      });
    }
    return { ...c, width: Math.max(64, Math.ceil(w / 10) * 10) };
  });
}
