import { allRequests, assetById, lineQty, type ShipTo } from "./orders";

/*
  ACTIVITY LOG ENTRIES (Pavan, 2026-10-13) — what the activity log sheet
  lists, newest first: changes to the record, and every order request that
  touched it, with each step the request took.
*/
export interface LogEntry {
  at: string;
  by: string;
  text: string;
  kind: "record" | "order";
}

const newestFirst = (xs: LogEntry[]) => xs.sort((a, b) => b.at.localeCompare(a.at));

/** One asset: its own changes and every request that named it. */
export function assetLog(assetId: string | undefined): LogEntry[] {
  const out: LogEntry[] = [];
  if (!assetId) return out;
  for (const e of assetById(assetId)?.audit ?? [])
    for (const c of e.changes) out.push({ at: e.at, by: e.by, text: c, kind: "record" });
  for (const r of allRequests()) {
    const line = r.lines.find((l) => l.assetId === assetId);
    if (!line) continue;
    for (const e of r.audit ?? [])
      for (const c of e.changes)
        out.push({
          at: e.at,
          by: e.by,
          text: `${r.requestNo} · ${c} · ${line.product || "—"}, ${lineQty(line)}`,
          kind: "order",
        });
  }
  return newestFirst(out);
}

/** A ship-to: its own changes, its assets' changes, and every request to it. */
export function shipToLog(s: ShipTo): LogEntry[] {
  const out: LogEntry[] = [];
  for (const e of s.audit ?? [])
    for (const c of e.changes) out.push({ at: e.at, by: e.by, text: c, kind: "record" });
  for (const a of s.assets)
    for (const e of a.audit ?? [])
      for (const c of e.changes) out.push({ at: e.at, by: e.by, text: `${a.name} · ${c}`, kind: "record" });
  for (const r of allRequests()) {
    if (r.shipTo !== s.name) continue;
    for (const e of r.audit ?? [])
      for (const c of e.changes) out.push({ at: e.at, by: e.by, text: `${r.requestNo} · ${c}`, kind: "order" });
  }
  return newestFirst(out);
}

/** The log in the shared Activity card's shape — oldest first, one change
 *  per entry (the card shows the latest six, newest on top). */
export function toTimeline(log: LogEntry[]): { at: string; by: string; changes: string[] }[] {
  return [...log].sort((a, b) => a.at.localeCompare(b.at)).map((e) => ({ at: e.at, by: e.by, changes: [e.text] }));
}
