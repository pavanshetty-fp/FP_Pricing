import { Pill } from "@/components/ui/pill";
import { TwoLineCell, type ListColumn } from "../ListTable";
import { formatDate } from "../threepl/directoryCore";
import type { MdAsset } from "./assets";
import { stamp } from "./assetParts";
import { AssetJourney } from "./AssetJourney";
import { EVENT_TYPES, activityEvents, journeyMilestones } from "./story";
import { TypeTiles, type LogItem } from "./AssetActivity";
import { RecordViews, type ViewRow, type ViewTab } from "./RecordViews";
import { AssetOverview, overviewRows } from "./AssetOverview";

/*
  ASSET 360 — THE THREE VIEWS (Pavan, 2026-11-02), on the shared 360 views
  (RecordViews.tsx). Overview (since 2026-11-13: movement orders, deliveries,
  service, equipment, billing — AssetOverview.tsx; was Asset movement orders) ·
  Asset journey (a timeline, not a table — AssetJourney.tsx) · Asset
  activity log (type tiles over the table — Pavan chose V3, 2026-11-03; the
  other versions are archived in docs/archive/asset-360-versions-2026-11-03.md).
  Status is every tab's facet; Type is the log's.
*/

/* ─────────────────────────────────────────────────────────── rows ── */

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

const OVERVIEW_COLS: ListColumn<string>[] = [
  { key: "name", label: "Record", width: 160, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
];

const STATUS = { key: "status", label: "Status" };

export function AssetViews({ asset: a, onTabChange }: { asset: MdAsset; onTabChange?: (key: string) => void }) {
  const tabs: ViewTab[] = [
    /* OVERVIEW FIRST (Pavan, 2026-11-13, after Lovable) — movement orders,
       deliveries, service, equipment and billing, each a table
       (AssetOverview.tsx); the shared bar narrows them all. */
    {
      key: "overview",
      label: "Overview",
      noun: "records",
      one: "record",
      columns: OVERVIEW_COLS,
      rows: overviewRows(a),
      facets: [STATUS],
      custom: (rows) => <AssetOverview asset={a} rows={rows} />,
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
  return <RecordViews resetKey={a.uid} tabs={tabs} searchPlaceholder="Search this asset" historyKey="md-asset-360" onTabChange={onTabChange} />;
}
