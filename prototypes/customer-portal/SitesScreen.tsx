import * as React from "react";
import { Database, History, MapPin, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";
import { cn } from "@/lib/utils";
import { FuelOrdersViewBar } from "../unified-view/FuelOrdersViewBar";
import { OverflowList, TwoLineCell, type ListColumn } from "../unified-view/ListTable";
import { kindTone, ACTIVE_KIND } from "../unified-view/statusKind";
import { useSavedViews } from "../unified-view/useSavedViews";
import { DATE_FMT } from "../unified-view/data";
import { ASSET_TYPES, LOW_LEVEL, PRODUCTS, PRODUCT_CATEGORIES, printKey, type Asset, type ShipTo } from "./orders";
import { createdOf, lastDeliveryFor, useShipTos } from "./sites";
import { ActivityLogSheet } from "./ActivityLogSheet";
import { assetLog } from "./activityLog";
import { PortalList } from "./PortalList";
import { ShipToSheet } from "./ShipToSheet";
import { AssetSheet } from "./AssetSheet";

/*
  SITES & ASSETS (Pavan, 2026-10-13) — the customer's own ship-tos and the
  tanks and assets at them, kept by the customer with no tenant approval:
  the tenant reads them to take orders, so they must be right.

  THREE TABS, on the view row's switch (the Sales Orders way of putting two
  kinds of record on one page): Ship-tos · Assets · Service requests.
  Service requests is a placeholder (Pavan: "add it as a tab now") — leaks,
  damage, replacing parts — built later.

  A TANK LEVEL EXISTS ONLY WHERE A MONITOR IS FITTED. Without one the
  column says so; estimating from usage is for later (Pavan, 2026-10-13).
*/

const TABS = [
  { key: "shipTos", label: "Ship-tos" },
  { key: "assets", label: "Assets" },
  { key: "service", label: "Service requests" },
];

const muted = <span className="text-sm text-muted-foreground">—</span>;
const coords = (lat: number | null, lng: number | null) =>
  lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)
    ? ""
    : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

/* ------------------------------------------------------------ ship-tos --- */

type SK = "name" | "address" | "assets" | "contact" | "hours" | "location" | "status" | "actions";
const SHIP_TO_COLUMNS: ListColumn<SK>[] = [
  { key: "name", label: "Ship-to", width: 180, sortable: true },
  { key: "address", label: "Address", width: 240, sortable: true },
  { key: "assets", label: "Assets", width: 220, sortable: true },
  { key: "contact", label: "Contact", width: 180, sortable: true },
  { key: "hours", label: "Delivery hours", width: 170, sortable: true },
  { key: "location", label: "Location", width: 170, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
  { key: "actions", label: "", width: 44 },
];
const shipToText = (s: ShipTo, k: SK): string => {
  switch (k) {
    case "name":
      return s.name;
    case "address":
      return `${s.street}, ${s.city}, ${s.state} ${s.zip}`;
    case "assets":
      return s.assets.map((a) => a.name).join(", ");
    case "contact":
      return `${s.contactName} ${s.contactPhone}`.trim();
    case "hours":
      return `${formatMinutes(s.hoursStart)} – ${formatMinutes(s.hoursEnd)}`;
    case "location":
      return coords(s.lat, s.lng);
    case "status":
      return s.status;
    default:
      return "";
  }
};

/* -------------------------------------------------------------- assets --- */

interface AssetRow {
  asset: Asset;
  shipTo: ShipTo;
}
type AK =
  | "asset"
  | "rfid"
  | "erpId"
  | "type"
  | "shipTo"
  | "categories"
  | "product"
  | "capacity"
  | "ownership"
  | "monitor"
  | "level"
  | "created"
  | "lastFilled"
  | "log"
  | "location"
  | "status"
  | "actions";
/* THE ASSET SHEET'S DETAILS, column for column (Pavan, 2026-10-13). */
const ASSET_COLUMNS: ListColumn<AK>[] = [
  { key: "asset", label: "Asset", width: 180, sortable: true },
  { key: "rfid", label: "RFID Code", width: 150, sortable: true },
  { key: "erpId", label: "ERP ID", width: 120, sortable: true },
  { key: "type", label: "Type", width: 110, sortable: true },
  { key: "shipTo", label: "Ship-to", width: 150, sortable: true },
  { key: "categories", label: "Product Categories", width: 160, sortable: true },
  { key: "product", label: "Products", width: 160, sortable: true },
  { key: "capacity", label: "Size (Gal)", width: 100, sortable: true, align: "right" },
  { key: "ownership", label: "Ownership", width: 110, sortable: true },
  { key: "monitor", label: "Tank Monitor", width: 130, sortable: true },
  { key: "level", label: "Level", width: 130, sortable: true },
  { key: "created", label: "Created By", width: 150, sortable: true },
  { key: "lastFilled", label: "Last Filled", width: 120, sortable: true },
  { key: "log", label: "Activity Log", width: 110 },
  { key: "location", label: "Location", width: 170, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
  { key: "actions", label: "", width: 44 },
];
const assetText = ({ asset: a, shipTo: s }: AssetRow, k: AK): string => {
  switch (k) {
    case "asset":
      return `${a.name} ${a.code}`;
    case "rfid":
      return a.rfid;
    case "erpId":
      return a.erpId;
    case "categories":
      return a.categories.join(", ");
    case "created": {
      const c = createdOf(a);
      return c ? `${c.by} ${DATE_FMT.format(new Date(c.at))}` : "";
    }
    case "lastFilled": {
      const d = lastDeliveryFor(a.id);
      return d ? printKey(d) : "";
    }
    case "type":
      return a.type;
    case "shipTo":
      return s.name;
    case "product":
      return a.products.join(", ");
    case "capacity":
      return a.capacity ? a.capacity.toLocaleString() : "";
    case "ownership":
      return a.rented ? "Rented" : "Owned";
    case "monitor":
      return a.monitor ? a.monitorId : "No monitor";
    case "level":
      return a.monitor ? `${a.level}%` : "";
    case "location":
      return coords(a.lat, a.lng);
    case "status":
      return a.status;
    default:
      return "";
  }
};

function LevelCell({ a }: { a: Asset }) {
  if (!a.monitor) return muted;
  const low = a.level <= LOW_LEVEL;
  return (
    <span className="flex items-center gap-2" title={`${a.level}% full`}>
      <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", low ? "bg-status-failed" : "bg-fp-lane-green")}
          style={{ width: `${a.level}%` }}
        />
      </span>
      <span className={cn("text-sm tabular-nums", low ? "text-status-failed" : "text-foreground")}>
        {a.level}%
      </span>
    </span>
  );
}

/* --------------------------------------------------------------- screen --- */

export function SitesScreen({
  onCreateOrder,
}: {
  /** Hands an order to the Orders page: the ship-to and the tanks to fill. */
  onCreateOrder: (shipTo: string, assetIds: string[]) => void;
}) {
  const shipTos = useShipTos();
  const [tab, setTab] = React.useState("shipTos");
  const [openShipTo, setOpenShipTo] = React.useState<{ id: string | null } | null>(null);
  const [openAsset, setOpenAsset] = React.useState<{ id: string | null } | null>(null);
  const [logFor, setLogFor] = React.useState<AssetRow | null>(null);
  const assetRows = React.useMemo<AssetRow[]>(
    () => shipTos.flatMap((s) => s.assets.map((asset) => ({ asset, shipTo: s }))),
    [shipTos]
  );
  const segment = { segments: TABS, segmentValue: tab, onSegmentChange: setTab };
  const order = (shipTo: string, ids: string[]) => {
    setOpenShipTo(null);
    setOpenAsset(null);
    onCreateOrder(shipTo, ids);
  };

  const editingShipTo = openShipTo?.id ? (shipTos.find((s) => s.id === openShipTo.id) ?? null) : null;
  const editingAsset = openAsset?.id
    ? (assetRows.find((r) => r.asset.id === openAsset.id) ?? null)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tab === "shipTos" && (
        <PortalList<ShipTo, SK>
          key="shipTos"
          {...segment}
          rows={shipTos}
          columns={SHIP_TO_COLUMNS}
          /* HIDDEN UNTIL ASKED FOR, so Status is on screen (2-layouts §5). */
          defaultHidden={["location"]}
          rowId={(s) => s.id}
          text={shipToText}
          sortValue={(s, k) => (k === "assets" ? s.assets.length : k === "hours" ? s.hoursStart : undefined)}
          renderCell={(s, k) => {
            switch (k) {
              case "name":
                return <span className="text-sm font-medium text-foreground">{s.name}</span>;
              case "address":
                return <TwoLineCell title={s.street} description={`${s.city}, ${s.state} ${s.zip}`} />;
              case "assets":
                return <OverflowList values={s.assets.map((a) => a.name)} label="assets" />;
              case "contact":
                return s.contactName ? <TwoLineCell title={s.contactName} description={s.contactPhone} /> : muted;
              case "hours":
                return <span className="text-sm">{shipToText(s, "hours")}</span>;
              case "location":
                return coords(s.lat, s.lng) ? (
                  <span className="text-sm tabular-nums">{coords(s.lat, s.lng)}</span>
                ) : (
                  muted
                );
              case "status":
                return (
                  <StatusChip tone={kindTone(ACTIVE_KIND(s.status === "Active"))} variant="text">
                    {s.status}
                  </StatusChip>
                );
              default:
                return null;
            }
          }}
          facets={[
            { key: "status", label: "Status", options: ["Active", "Inactive"] },
            { key: "city", label: "City", options: Array.from(new Set(shipTos.map((s) => s.city))) },
          ]}
          facetValues={(s, f) => (f === "status" ? [s.status] : f === "city" ? [s.city] : [])}
          storageKey="portal-ship-tos"
          noun="ship-tos"
          nounOne="ship-to"
          searchPlaceholder="Search ship-tos, addresses, contacts…"
          ctaLabel="Create Ship-to"
          onCreate={() => setOpenShipTo({ id: null })}
          onOpen={(s) => setOpenShipTo({ id: s.id })}
          openLabel={(s) => `Open ship-to ${s.name}`}
          emptyIcon={<MapPin />}
        />
      )}

      {tab === "assets" && (
        <PortalList<AssetRow, AK>
          key="assets"
          {...segment}
          rows={assetRows}
          columns={ASSET_COLUMNS}
          defaultHidden={["location"]}
          rowId={(r) => r.asset.id}
          text={assetText}
          sortValue={(r, k) =>
            k === "capacity"
              ? r.asset.capacity
              : k === "level"
                ? r.asset.monitor
                  ? r.asset.level
                  : -1
                : k === "created"
                  ? (createdOf(r.asset)?.at ?? "")
                  : k === "lastFilled"
                    ? (lastDeliveryFor(r.asset.id) ?? "")
                    : undefined
          }
          renderCell={(r, k) => {
            const a = r.asset;
            switch (k) {
              case "asset":
                return <TwoLineCell title={a.name} description={a.code || "—"} />;
              case "rfid":
                return a.rfid ? <span className="text-sm tabular-nums">{a.rfid}</span> : muted;
              case "erpId":
                return a.erpId ? <span className="text-sm tabular-nums">{a.erpId}</span> : muted;
              case "categories":
                return <OverflowList values={a.categories} label="categories" />;
              case "created": {
                const c = createdOf(a);
                return c ? <TwoLineCell title={c.by} description={DATE_FMT.format(new Date(c.at))} /> : muted;
              }
              case "lastFilled": {
                const d = lastDeliveryFor(a.id);
                return d ? <span className="text-sm">{printKey(d)}</span> : muted;
              }
              case "log":
                /* THE ROW'S HISTORY, on its own sheet — not the row's open. */
                return (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 text-muted-foreground"
                    aria-label={`Activity log of ${a.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLogFor(r);
                    }}
                  >
                    <History />
                    Log
                  </Button>
                );
              case "type":
                return <span className="text-sm">{a.type}</span>;
              case "shipTo":
                return <span className="truncate text-sm">{r.shipTo.name}</span>;
              case "product":
                return <OverflowList values={a.products} label="products" />;
              case "capacity":
                return <span className="text-sm tabular-nums">{a.capacity.toLocaleString()}</span>;
              case "ownership":
                /* RENTED IS LABELLED (Pavan, 2026-10-13). */
                return a.rented ? <Pill>Rented</Pill> : <span className="text-sm">Owned</span>;
              case "monitor":
                return a.monitor ? (
                  <span className="text-sm tabular-nums">{a.monitorId}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">No monitor</span>
                );
              case "level":
                return <LevelCell a={a} />;
              case "location":
                return coords(a.lat, a.lng) ? (
                  <span className="text-sm tabular-nums">{coords(a.lat, a.lng)}</span>
                ) : (
                  muted
                );
              case "status":
                return (
                  <StatusChip tone={kindTone(ACTIVE_KIND(a.status === "Active"))} variant="text">
                    {a.status}
                  </StatusChip>
                );
              default:
                return null;
            }
          }}
          facets={[
            { key: "type", label: "Type", options: ASSET_TYPES },
            { key: "shipTo", label: "Ship-to", options: shipTos.map((s) => s.name) },
            { key: "categories", label: "Product category", options: [...PRODUCT_CATEGORIES] },
            { key: "product", label: "Product", options: PRODUCTS },
            { key: "ownership", label: "Ownership", options: ["Owned", "Rented"] },
            { key: "monitor", label: "Tank monitor", options: ["Monitored", "No monitor"] },
            { key: "status", label: "Status", options: ["Active", "Inactive"] },
          ]}
          facetValues={(r, f) => {
            const a = r.asset;
            switch (f) {
              case "type":
                return [a.type];
              case "shipTo":
                return [r.shipTo.name];
              case "categories":
                return a.categories;
              case "product":
                return a.products;
              case "ownership":
                return [a.rented ? "Rented" : "Owned"];
              case "monitor":
                return [a.monitor ? "Monitored" : "No monitor"];
              case "status":
                return [a.status];
              default:
                return [];
            }
          }}
          storageKey="portal-assets"
          noun="assets"
          nounOne="asset"
          searchPlaceholder="Search assets, ship-tos, monitors…"
          ctaLabel="Create Asset"
          onCreate={() => setOpenAsset({ id: null })}
          onOpen={(r) => setOpenAsset({ id: r.asset.id })}
          openLabel={(r) => `Open asset ${r.asset.name}`}
          emptyIcon={<Database />}
        />
      )}

      {tab === "service" && <ServiceRequestsTab segment={segment} />}

      <ShipToSheet
        shipTo={editingShipTo}
        open={openShipTo !== null}
        creating={openShipTo !== null && openShipTo.id === null}
        onOpenChange={(o) => !o && setOpenShipTo(null)}
        onCreateOrder={order}
      />
      <AssetSheet
        asset={editingAsset?.asset ?? null}
        shipTo={editingAsset?.shipTo ?? null}
        open={openAsset !== null}
        creating={openAsset !== null && openAsset.id === null}
        onOpenChange={(o) => !o && setOpenAsset(null)}
        onCreateOrder={order}
      />
      <ActivityLogSheet
        open={logFor !== null}
        onOpenChange={(o) => !o && setLogFor(null)}
        title={logFor?.asset.name ?? "Asset"}
        subtitle={logFor?.shipTo.name}
        entries={logFor ? assetLog(logFor.asset.id) : []}
      />
    </div>
  );
}

/** SERVICE REQUESTS — the tab exists; the list comes later (Pavan, 2026-10-13). */
function ServiceRequestsTab({
  segment,
}: {
  segment: { segments: typeof TABS; segmentValue: string; onSegmentChange: (k: string) => void };
}) {
  const views = useSavedViews({
    current: {},
    defaultState: {},
    keyOf: () => "",
    apply: () => {},
  });
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FuelOrdersViewBar {...views} {...segment} />
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Wrench />
          </EmptyMedia>
          <EmptyTitle>Service requests</EmptyTitle>
          <EmptyDescription>Not built yet.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
