import { Pill } from "@/components/ui/pill";
import { TwoLineCell, type ListColumn } from "../ListTable";
import { DASH, formatDate } from "../threepl/directoryCore";
import type { MdAsset } from "./assets";
import { DocumentsCell, stamp } from "./assetParts";
import { AssetJourney } from "./AssetJourney";
import { EVENT_TYPES, activityEvents, journeyMilestones } from "./story";
import { TypeTiles, type LogItem } from "./AssetActivity";
import { RecordViews, type ViewRow, type ViewTab } from "./RecordViews";

/*
  ASSET 360 — THE THREE VIEWS (Pavan, 2026-11-02), on the shared 360 views
  (RecordViews.tsx). Asset movement orders (a table, or a board by status) ·
  Asset journey (a timeline, not a table — AssetJourney.tsx) · Asset
  activity log (type tiles over the table — Pavan chose V3, 2026-11-03; the
  other versions are archived in docs/archive/asset-360-versions-2026-11-03.md).
  Status is every tab's facet; Type is the log's.
*/

/* ─────────────────────────────────────────────────────────── rows ── */

function movementRows(a: MdAsset): ViewRow[] {
  return a.movements.map((m) => ({
    id: m.id,
    text: { id: m.id, source: m.source, from: m.from, to: m.to, scheduled: formatDate(m.scheduled), status: m.status, documents: m.documents === "Attached" ? "1 document" : DASH },
    sort: { scheduled: m.scheduled },
    status: m.status,
  }));
}

/** The journey's milestones as rows — so the shared search and Status filter
 *  narrow the timeline exactly as they narrow a table. */
function journeyRows(a: MdAsset): ViewRow[] {
  return journeyMilestones(a).map((m) => ({
    id: m.id,
    text: { date: formatDate(m.date), title: m.title, detail: m.detail, refs: m.refs.join(" "), status: m.state },
    status: m.state,
  }));
}

function activityRows(a: MdAsset): ViewRow[] {
  return activityEvents(a).map((r) => ({
    id: r.id,
    text: { when: stamp(r.at), type: r.type, source: r.source, event: `${r.event} ${r.detail}`, eventTitle: r.event, detail: r.detail, status: r.status },
    sort: { when: r.at },
    status: r.status,
    values: { type: r.type },
  }));
}

/* ─────────────────────────────────────────────────────────── views ── */

const MOVEMENT_COLS: ListColumn<string>[] = [
  { key: "id", label: "Movement order", width: 140, sortable: true },
  { key: "source", label: "Source", width: 150, sortable: true },
  { key: "from", label: "From", width: 150, sortable: true },
  { key: "to", label: "To", width: 150, sortable: true },
  { key: "scheduled", label: "Scheduled", width: 120, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
  { key: "documents", label: "Documents", width: 130, sortable: true },
];
/* The timeline draws these; they name what search and Filters read. */
const JOURNEY_COLS: ListColumn<string>[] = [
  { key: "date", label: "Date", width: 130, sortable: true },
  { key: "title", label: "Milestone", width: 260, sortable: true },
  { key: "detail", label: "Detail", width: 220, sortable: true },
  { key: "refs", label: "Records", width: 160, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
];
const LOG_COLS: ListColumn<string>[] = [
  { key: "when", label: "When", width: 200, sortable: true },
  { key: "type", label: "Type", width: 130, sortable: true },
  { key: "source", label: "Source", width: 180, sortable: true },
  { key: "event", label: "Event", width: 300, sortable: true },
  { key: "status", label: "Status", width: 130, sortable: true },
];

const STATUS = { key: "status", label: "Status" };

export function AssetViews({ asset: a }: { asset: MdAsset }) {
  const tabs: ViewTab[] = [
    {
      key: "movements",
      label: "Asset movement orders",
      noun: "movement orders",
      one: "movement order",
      columns: MOVEMENT_COLS,
      rows: movementRows(a),
      facets: [STATUS],
      board: {
        lanes: [
          { key: "Draft", color: "grey" },
          { key: "Scheduled", color: "yellow" },
          { key: "In transit", color: "blue" },
          { key: "Completed", color: "green" },
        ],
        card: (r) => ({
          id: r.id,
          title: r.id,
          badges: [{ label: r.text.source, tone: "neutral" as const }],
          units: [
            { kind: "stack" as const, key: "route", heading: "Route", lines: [{ text: r.text.from, level: 1 as const }, { text: `to ${r.text.to}`, level: 2 as const }] },
            { kind: "inline" as const, key: "when", heading: "Schedule", parts: [], planned: { date: r.text.scheduled } },
            { kind: "rows" as const, key: "asset", heading: "Asset", rows: [{ asset: a.id, product: a.type }] },
          ],
        }),
      },
      renderCell: (r, key) =>
        key === "documents" ? (
          <DocumentsCell owner={r.id} files={r.text.documents === DASH ? [] : [{ name: `${r.id} bill of lading.pdf`, kind: `Bill of lading · ${r.text.source}` }]} />
        ) : undefined,
    },
    {
      key: "journey",
      label: "Asset journey",
      noun: "placements",
      one: "placement",
      columns: JOURNEY_COLS,
      rows: journeyRows(a),
      facets: [STATUS],
      /* THE JOURNEY IS A TIMELINE, not a table (Pavan, 2026-11-03). */
      custom: (rows) => <AssetJourney asset={a} milestones={journeyMilestones(a).filter((m) => rows.some((r) => r.id === m.id))} />,
    },
    {
      key: "log",
      label: "Asset activity log",
      noun: "events",
      one: "event",
      columns: LOG_COLS,
      rows: activityRows(a),
      facets: [{ key: "type", label: "Type", order: EVENT_TYPES }, STATUS],
      above: ({ all, picked, toggle }) => (
        <TypeTiles
          asset={a}
          items={all.map(
            (r): LogItem => ({
              id: r.id,
              at: String(r.sort?.when ?? ""),
              type: r.values?.type ?? "Asset",
              source: r.text.source,
              title: r.text.eventTitle,
              detail: r.text.detail,
              status: r.status,
            }),
          )}
          picked={picked("type")}
          onPick={(type) => toggle("type", type)}
        />
      ),
      renderCell: (r, key) =>
        key === "type" ? <Pill>{r.text.type}</Pill> : key === "event" ? <TwoLineCell title={r.text.eventTitle} description={r.text.detail} /> : undefined,
      readValue: (r, key) => (key === "event" ? `${r.text.eventTitle} · ${r.text.detail}` : undefined),
      nameOf: (r) => r.text.eventTitle,
    },
  ];
  return <RecordViews resetKey={a.uid} tabs={tabs} searchPlaceholder="Search this asset" historyKey="md-asset-360" />;
}
