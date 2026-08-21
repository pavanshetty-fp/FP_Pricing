import type { TableRow } from "@/components/tables-layout/types";

/**
 * Line-of-service scope — the dimension the scope selector filters on.
 *
 * A scope is NOT navigation: every line of service renders the same columns,
 * toolbar and footer, and only the row set changes (ux/2-rules L5). Labels stay
 * generic per the constitution — this is a template, not a domain feature.
 */

export type ServiceLineKey = "a" | "b" | "c";

export interface ServiceLine {
  key: ServiceLineKey;
  label: string;
}

export const SERVICE_LINES: ServiceLine[] = [
  { key: "a", label: "Service A" },
  { key: "b", label: "Service B" },
  { key: "c", label: "Service C" },
];

/** The selector's value: one line of service, or every line. */
export type ScopeKey = "all" | ServiceLineKey;

/**
 * Deterministic line-of-service assignment, derived from the row id so the
 * sample set needs no extra column. Deliberately uneven — 571 / 143 / 286 over
 * 1,000 rows — so the counts read like real data rather than a clean split.
 *
 * The cycle length is 7 on purpose: it must stay coprime with the sample data's
 * own cycles (`switchOn: i % 3`, `amount: i % 8`), or scoping to one line lands
 * on a single residue class and whole columns render degenerate — every Switch
 * on, every Switch off. 7 is coprime with 3, 8, and the 13-long status cycle.
 */
const CYCLE: ServiceLineKey[] = ["a", "a", "a", "b", "c", "c", "a"];

export function serviceOf(row: TableRow): ServiceLineKey {
  const n = Number(row.id.replace(/^\D+/, "")) || 1;
  return CYCLE[(n - 1) % CYCLE.length];
}

export function inScope(row: TableRow, scope: ScopeKey): boolean {
  return scope === "all" || serviceOf(row) === scope;
}

/**
 * Rows per scope. Called with the rows the *other* filters already allow, so
 * each count answers "how many would I see if I picked this line" rather than
 * quoting a stale total.
 */
export function scopeCounts(rows: TableRow[]): Record<ScopeKey, number> {
  const out: Record<ScopeKey, number> = { all: rows.length, a: 0, b: 0, c: 0 };
  for (const row of rows) out[serviceOf(row)] += 1;
  return out;
}

export function scopeLabel(scope: ScopeKey): string {
  return scope === "all"
    ? "All"
    : (SERVICE_LINES.find((s) => s.key === scope)?.label ?? scope);
}
