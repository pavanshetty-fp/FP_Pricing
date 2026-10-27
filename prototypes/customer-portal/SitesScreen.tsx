import * as React from "react";
import { Camera, Database, History, ListChecks, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";
import { TwoLineCell, type ListColumn } from "../unified-view/ListTable";
import { kindTone, ACTIVE_KIND } from "../unified-view/statusKind";
import { DATE_FMT } from "../unified-view/data";
import { ASSET_TYPES, PRODUCTS, daysToEmpty, PRODUCT_CATEGORIES, TENANT, printKey, type Asset, type ShipTo } from "./orders";
import { createdOf, lastDeliveryFor, lastDeliveryToShipTo, nextDeliveryToShipTo, useShipTos } from "./sites";
import { ActivityLogSheet } from "./ActivityLogSheet";
import { assetLog } from "./activityLog";
import { BatteryCell, DaysToEmpty, LevelReading } from "./TankLevel";
import { PortalList } from "./PortalList";
import { ShipToAssetsCell, ShipToProductsCell, ValuesCell } from "./cells";
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

type SK = "name" | "address" | "assets" | "products" | "contact" | "hours" | "preferred" | "lastDelivery" | "nextDelivery" | "po" | "access" | "geofence" | "location" | "status" | "actions";
const SHIP_TO_COLUMNS: ListColumn<SK>[] = [
  { key: "name", label: "Ship-to", width: 170, sortable: true },
  { key: "address", label: "Address", width: 170, sortable: true },
  { key: "assets", label: "Assets", width: 120, sortable: true },
  { key: "products", label: "Products", width: 150, sortable: true },
  { key: "contact", label: "Contact", width: 120, sortable: true },
  { key: "hours", label: "Delivery hours", width: 160, sortable: true },
  { key: "preferred", label: "Preferred windows", width: 160 },
  { key: "lastDelivery", label: "Last Delivery", width: 120, sortable: true },
  { key: "nextDelivery", label: "Next Delivery", width: 120, sortable: true },
  { key: "po", label: "Default PO #", width: 130, sortable: true },
  { key: "access", label: "Delivery Instructions", width: 260, sortable: true },
  { key: "geofence", label: "Geofence", width: 120, sortable: true },
  { key: "location", label: "Location", width: 170, sortable: true },
  { key: "status", label: "Status", width: 90, sortable: true },
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
    case "products":
      return Array.from(new Set(s.assets.flatMap((a) => a.products))).join(", ");
    case "contact":
      return `${s.contactName} ${s.contactPhone}`.trim();
    case "hours":
      return `${formatMinutes(s.hoursStart)} – ${formatMinutes(s.hoursEnd)}`;
    case "preferred":
      return (s.preferred ?? []).map((p) => `${formatMinutes(p.start)} – ${formatMinutes(p.end)}`).join(", ");
    case "lastDelivery": {
      const d = lastDeliveryToShipTo(s.name);
      return d ? printKey(d) : "";
    }
    case "nextDelivery": {
      const d = nextDeliveryToShipTo(s.name);
      return d ? printKey(d) : "";
    }
    case "po":
      return s.poNumber;
    case "access":
      return s.accessNotes;
    case "geofence":
      return s.geofence === null ? "" : `${s.geofence.toFixed(2)} mi`;
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
  | "battery"
  | "empty"
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
  { key: "shipTo", label: "Ship-to", width: 170, sortable: true },
  { key: "categories", label: "Product Categories", width: 160, sortable: true },
  { key: "product", label: "Products", width: 190, sortable: true },
  { key: "capacity", label: "Size (Gal)", width: 100, sortable: true },
  { key: "ownership", label: "Ownership", width: 110, sortable: true },
  { key: "monitor", label: "Tank Monitor", width: 130, sortable: true },
  { key: "level", label: "Current Level", width: 150, sortable: true },
  { key: "empty", label: "Days to Empty", width: 130, sortable: true },
  { key: "battery", label: "Battery", width: 100, sortable: true },
  { key: "created", label: "Created By", width: 150, sortable: true },
  { key: "lastFilled", label: "Last Filled", width: 120, sortable: true },
  { key: "log", label: "Activity Log", width: 110 },
  { key: "location", label: "Location", width: 170, sortable: true },
  { key: "status", label: "Status", width: 180, sortable: true },
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
    case "battery":
      return a.monitor ? `${a.battery}%` : "";
    case "empty": {
      const d = daysToEmpty(a);
      return d === null ? "" : `${d} days`;
    }
    case "location":
      return coords(a.lat, a.lng);
    case "status":
      return a.status;
    default:
      return "";
  }
};

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
          defaultHidden={["po", "access", "geofence", "location"]}
          rowId={(s) => s.id}
          text={shipToText}
          sortValue={(s, k) => (k === "assets" ? s.assets.length : k === "hours" ? s.hoursStart : undefined)}
          renderCell={(s, k) => {
            switch (k) {
              case "name":
                return <span className="text-sm font-medium text-foreground">{s.name}</span>;
              case "address":
                return <TwoLineCell title={s.street} description={`${s.city}, ${s.state} ${s.zip}`} />;
              /* THE ORDERS BREAKDOWN, on press (Pavan, 2026-10-14). */
              case "assets":
                return <ShipToAssetsCell s={s} />;
              case "products":
                return <ShipToProductsCell s={s} />;
              case "contact":
                return s.contactName ? <TwoLineCell title={s.contactName} description={s.contactPhone} /> : muted;
              case "hours":
                return <span className="text-sm">{shipToText(s, "hours")}</span>;
              case "preferred":
                return s.preferred?.length ? <span className="truncate text-sm">{shipToText(s, "preferred")}</span> : muted;
              case "lastDelivery": {
                const d = lastDeliveryToShipTo(s.name);
                return d ? <span className="text-sm">{printKey(d)}</span> : muted;
              }
              case "nextDelivery": {
                const d = nextDeliveryToShipTo(s.name);
                return d ? <span className="text-sm">{printKey(d)}</span> : muted;
              }
              case "po":
                return s.poNumber ? <span className="text-sm tabular-nums">{s.poNumber}</span> : muted;
              case "access":
                return s.accessNotes ? <span className="truncate text-sm" title={s.accessNotes}>{s.accessNotes}</span> : muted;
              case "geofence":
                return s.geofence === null ? muted : <span className="text-sm tabular-nums">{s.geofence.toFixed(2)} mi</span>;
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
              : k === "empty"
                ? (daysToEmpty(r.asset) ?? 9999)
              : k === "level" || k === "battery"
                ? r.asset.monitor
                  ? r.asset[k]
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
                return <ValuesCell values={a.categories} label="product categories" />;
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
                return <ValuesCell values={a.products} label="products" />;
              case "capacity":
                /* NO TANK, NO SIZE — a pump or equipment shows a dash. */
                return a.capacity > 0 ? <span className="text-sm tabular-nums">{a.capacity.toLocaleString()}</span> : muted;
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
                return <LevelReading asset={a} />;
              case "battery":
                return <BatteryCell asset={a} />;
              case "empty":
                return <DaysToEmpty asset={a} />;
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

/*
  SERVICE REQUESTS — COMING SOON (Pavan, 2026-10-13): no views, no toolbar,
  just an illustration and "Coming soon". The tab switch stays, in its own
  place, so the reader can step back to Ship-tos or Assets.
*/
function ServiceRequestsTab({
  segment,
}: {
  segment: { segments: typeof TABS; segmentValue: string; onSegmentChange: (k: string) => void };
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-end justify-end border-b border-border">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={segment.segmentValue}
          onValueChange={(next) => next && segment.onSegmentChange(next)}
          aria-label="Sites and assets"
          className="mb-2.5 h-7"
        >
          {segment.segments.map((seg) => (
            <ToggleGroupItem key={seg.key} value={seg.key} className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
              {seg.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <ServiceIllustration />
          {/* BIG AND SERIF (Pavan, 2026-10-13) — the DS has no serif face,
              so the system's (New York / Georgia). */}
          <h2 className="text-5xl font-medium tracking-tight text-foreground">Coming soon</h2>
        </div>
        <section aria-label="What to expect" className="flex w-full max-w-3xl flex-col items-center gap-4">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">What to expect</h3>
          <ul className="grid w-full gap-3 sm:grid-cols-3">
            {SERVICE_PREVIEW.map((it) => (
              <li key={it.title} className="flex flex-col gap-2 rounded-xl border border-border bg-fp-surface-1b p-4">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-brand [&_svg]:size-4">
                  {it.icon}
                </span>
                <span className="text-sm font-semibold text-foreground">{it.title}</span>
                <span className="text-sm text-muted-foreground">{it.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* WHAT SERVICE REQUESTS WILL DO — three points (Pavan, 2026-10-13). */
const SERVICE_PREVIEW = [
  {
    icon: <Camera />,
    title: "Report an issue in a few taps",
    text: "Leaks, water in a tank, damaged parts — pick the asset, describe it, add photos.",
  },
  {
    icon: <ListChecks />,
    title: "Follow it to the fix",
    text: `See when ${TENANT} picks it up, schedules the visit and closes it.`,
  },
  {
    icon: <Truck />,
    title: "Driver reports, ready to raise",
    text: "What drivers note at delivery turns into a request with one press.",
  },
];

/* A TANK ON ITS STAND, a wrench crossing it and a spark — DS tokens only,
   so it follows the theme. Decorative. */
function ServiceIllustration() {
  const jaw = React.useId();
  return (
    <svg viewBox="0 0 240 180" className="h-44 w-60" aria-hidden>
      <ellipse cx="120" cy="160" rx="92" ry="9" className="fill-muted" />
      <circle cx="120" cy="88" r="70" className="fill-brand/8" />
      {/* the stand */}
      <path d="M74 140 L82 118 M166 140 L158 118" strokeWidth="5" strokeLinecap="round" className="stroke-muted-foreground/60" />
      <path d="M66 142 H174" strokeWidth="5" strokeLinecap="round" className="stroke-muted-foreground/60" />
      {/* the tank */}
      <rect x="60" y="62" width="120" height="60" rx="30" className="fill-fp-surface-1b stroke-foreground/70" strokeWidth="3" />
      <path d="M90 62 V122 M150 62 V122" strokeWidth="2" className="stroke-foreground/20" />
      <rect x="112" y="50" width="16" height="12" rx="3" className="fill-fp-surface-1b stroke-foreground/70" strokeWidth="3" />
      {/* its level */}
      <rect x="98" y="80" width="44" height="24" rx="5" className="fill-muted" />
      <rect x="98" y="92" width="44" height="12" rx="5" className="fill-brand/70" />
      {/* the wrench — an open jaw cut from its round head (a mask), the
          handle running down and left across the tank's end */}
      <defs>
        <mask id={jaw}>
          <rect x="-30" y="-30" width="140" height="60" fill="white" />
          <rect x="-24" y="-5" width="16" height="10" fill="black" />
        </mask>
      </defs>
      <g transform="translate(204 52) rotate(135)" mask={`url(#${jaw})`}>
        <circle cx="0" cy="0" r="14" className="fill-foreground/80" />
        <rect x="6" y="-5.5" width="66" height="11" rx="5.5" className="fill-foreground/80" />
        <circle cx="64" cy="0" r="2.5" className="fill-fp-surface-1b" />
      </g>
      {/* the spark */}
      <path d="M44 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" className="fill-brand" />
      <circle cx="202" cy="120" r="4" className="fill-brand/60" />
      <circle cx="34" cy="104" r="3" className="fill-muted-foreground/40" />
    </svg>
  );
}
