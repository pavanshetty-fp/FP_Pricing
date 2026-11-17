import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { SummaryCard } from "../SheetCards";
import { kindTone } from "../statusKind";
import { Figure } from "../masterdata/sheetParts";
import type { ViewRow, ViewTab } from "../masterdata/RecordViews";
import {
  SETTING_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  changeSummary,
  fmtDate,
  fmtWhen,
  plural,
  shiptoOf,
  uniq,
  type ChangeStatus,
  type EntityMap,
} from "./changeLog";
import { STATUS_KIND, actionOf } from "./activityFeed";
import { fitColumns } from "./fitColumns";
import { kindOf, type Insight, type Scope, type WhereRow, type WhoRow } from "./customerShipto";

/*
  THE CUSTOMER & SHIP-TO VIEWS, shared by its two layouts (Yash, 2026-11-16):
  the dashboard (routed) and the 360 page (kept, unrouted, to compare).
*/

const STATUS_BY_LABEL = Object.fromEntries(
  (Object.keys(STATUS_LABEL) as ChangeStatus[]).map((s) => [STATUS_LABEL[s], s])
) as Record<string, ChangeStatus>;

/** A tab's columns, sized to what they print (UX-45). */
export const fitTab = (tab: ViewTab): ViewTab => ({
  ...tab,
  columns: fitColumns(tab.columns, tab.rows, (r, key) => [key === "status" ? r.status : (r.text[key] ?? "")], ["status", "action", "kind"]),
});

export function timelineTab(scope: Scope, ents: EntityMap, onOpen: (id: string) => void): ViewTab {
  const n = scope.shiptos.length;
  return fitTab({
    key: "timeline",
    label: "Timeline",
    noun: "changes",
    one: "change",
    columns: [
      { key: "when", label: "Date & time", width: 180, sortable: true },
      { key: "setting", label: "Entity", width: 120, sortable: true },
      { key: "action", label: "Action", width: 120, sortable: true },
      { key: "change", label: "Change", width: 300, sortable: true },
      { key: "kind", label: "Kind", width: 120, sortable: true },
      { key: "applies", label: "Applies to", width: 200, sortable: true },
      { key: "by", label: "Made by", width: 140, sortable: true },
      { key: "source", label: "Made via", width: 180, sortable: true },
      { key: "status", label: "Status", width: 120, sortable: true },
    ],
    rows: scope.changes.map(({ c, lines }): ViewRow => {
      const hits = uniq(lines.map((l) => l.shiptoId));
      const entities = uniq(lines.map((l) => SETTING_LABEL[l.setting])).join(", ");
      return {
        id: c.id,
        text: {
          when: fmtWhen(c.effectiveAt),
          change: changeSummary(c, ents),
          setting: entities,
          action: actionOf(c),
          kind: kindOf(c),
          applies: hits.length === 1 ? shiptoOf(hits[0]).name : `${hits.length} of ${plural(n, "ship-to")}`,
          by: c.by,
          source: SOURCE_LABEL[c.source],
        },
        sort: { when: c.effectiveAt, applies: hits.length },
        status: STATUS_LABEL[c.status],
        values: {
          kind: kindOf(c),
          setting: entities,
          action: actionOf(c),
          by: c.by,
        },
      };
    }),
    facets: [
      { key: "kind", label: "Kind" },
      { key: "setting", label: "Entity" },
      { key: "action", label: "Action" },
      { key: "by", label: "Made by" },
      { key: "status", label: "Status" },
    ],
    renderCell: (r, key) =>
      key === "status" ? (
        <StatusChip tone={kindTone(STATUS_KIND[STATUS_BY_LABEL[r.status]] ?? "neutral")} variant="text">
          {r.status}
        </StatusChip>
      ) : key === "action" || key === "kind" ? (
        <Pill>{r.text[key]}</Pill>
      ) : undefined,
    onOpen: (r) => onOpen(r.id),
    nameOf: (r) => r.id,
  });
}

export function whereTab(where: { by: "shipto" | "entity"; rows: WhereRow[] }, onShipto?: (id: string) => void): ViewTab {
  const ship = where.by === "shipto";
  return fitTab({
    key: "where",
    label: ship ? "Where changes happened" : "What changed",
    noun: ship ? "ship-tos" : "entities",
    one: ship ? "ship-to" : "entity",
    columns: [
      { key: "name", label: ship ? "Ship-to" : "Entity", width: 220, sortable: true },
      ...(ship ? [{ key: "sub", label: "Customer", width: 200, sortable: true }] : []),
      { key: "changes", label: "Changes", width: 110, sortable: true },
      { key: "assignment", label: "Assignment", width: 120, sortable: true },
      { key: "inherited", label: "Inherited", width: 110, sortable: true },
      { key: "last", label: "Last change", width: 220, sortable: true },
    ],
    rows: where.rows.map(
      (w): ViewRow => ({
        id: w.key,
        text: {
          name: w.name,
          sub: w.sub,
          changes: w.changes.toLocaleString(),
          assignment: w.assignment.toLocaleString(),
          inherited: w.inherited.toLocaleString(),
          last: w.last ? `${fmtDate(w.last)} · ${w.lastBy}` : "—",
        },
        sort: { changes: w.changes, assignment: w.assignment, inherited: w.inherited, last: w.last ?? 0 },
        status: "",
      })
    ),
    facets: [],
    onOpen: ship && onShipto ? (r) => onShipto(r.id) : undefined,
    nameOf: (r) => r.text.name,
  });
}

export function whoTab(who: WhoRow[]): ViewTab {
  return fitTab({
    key: "who",
    label: "Who made the changes",
    noun: "people",
    one: "person",
    columns: [
      { key: "name", label: "Person", width: 160, sortable: true },
      { key: "changes", label: "Changes", width: 110, sortable: true },
      { key: "mostly", label: "Mostly", width: 180, sortable: true },
      { key: "via", label: "Made via", width: 260, sortable: true },
      { key: "last", label: "Last change", width: 140, sortable: true },
    ],
    rows: who.map(
      (p): ViewRow => ({
        id: p.name,
        text: { name: p.name, changes: p.changes.toLocaleString(), mostly: p.mostly, via: p.via, last: fmtDate(p.last) },
        sort: { changes: p.changes, last: p.last },
        status: "",
      })
    ),
    facets: [],
    nameOf: (r) => r.text.name,
  });
}


/**
 * INSIGHTS — the summary card (3PL Quotation summary shell) as the highlight,
 * three figures in the prototype's words. Read-only (Yash, 2026-11-16).
 */
export function InsightsCard({ insights, across = false }: { insights: Insight[]; across?: boolean }) {
  return (
    <SummaryCard title="Insights">
      <div className={across ? "-m-3 grid grid-cols-1 divide-border sm:grid-cols-3 sm:divide-x" : "-m-3 flex flex-col divide-y divide-border"}>
        {insights.map((i) => (
          /* An insight's sentence wraps — it is the point, not a caption. */
          <Figure key={i.key} label={i.label} value={i.value} note={<span className="whitespace-normal">{i.note}</span>} />
        ))}
      </div>
    </SummaryCard>
  );
}
