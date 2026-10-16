import * as React from "react";
import { toast } from "sonner";
import { Ban, MoreHorizontal, Pause, Pencil, Play, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { CELL, RecordSheet } from "../unified-view/RecordSheet";
import { DATE_FMT } from "../unified-view/data";
import { kindTone, statusTones } from "../unified-view/statusKind";
import { TwoLineCell, type ListColumn } from "../unified-view/ListTable";
import { OverflowChip } from "../unified-view/BreakdownCard";
import { ScheduleCell } from "../unified-view/threepl/ScheduleCell";
import {
  FREQUENCIES,
  LINE_SCOPES,
  REQUEST_STATUS_TONE,
  SHIP_TOS,
  allRequests,
  assetById,
  createRequest,
  inLine,
  lastProductFor,
  updateRequest,
  useRequests,
  type LineScope,
  type OrderRequest,
} from "./orders";
import { PortalList } from "./PortalList";
import { OrderRequestSheet } from "./OrderRequestSheet";
import { RecurringRecommendations, nextRun, type PortalRecommendation } from "./RecurringRecommendations";
import { usePortalNav } from "./nav";
import { SERIES_STATUSES, buildSeries, endSeries, setPaused, toggleSkip, useSeriesOverrides, type Series, type SeriesStatus } from "./recurring";

/*
  RECURRING ORDERS (Pavan, 2026-10-15 — "the same format as 3PL recurring
  orders"): one row per series — request, ship-to, products, schedule as
  day letters, next delivery, how many are coming, the series' state — and
  THE 3PL LIST'S CONTROLS TOO (Pavan, 2026-10-16): saved views, the line-of-
  service segment, Create Rule, Recommendations beside Filters, search,
  filters, search by column, column settings — the portal's own list
  (`PortalList`). A row opens the series in a sheet: its deliveries (the
  first is the request itself, the rest the dates coming in the next month,
  each skippable) and, from ⋯, pause, resume, end, or open the request.
*/

const SERIES_TONE = statusTones<SeriesStatus>({ Active: "info", Paused: "caution", Ended: "neutral" });

const galOf = (r: OrderRequest) => r.lines.reduce((t, l) => t + (l.gal || 0), 0);

function Products({ r }: { r: OrderRequest }) {
  const first = r.lines[0];
  const more = r.lines.length - 1;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-sm">
      <span className="truncate">{first ? `${first.product}` : "—"}</span>
      {more > 0 && (
        <OverflowChip
          count={more}
          label={`Show all ${r.lines.length} lines`}
          card={{
            title: `All products (${r.lines.length})`,
            rows: r.lines.map((l) => ({
              label: l.product,
              sub: assetById(l.assetId)?.name,
              value: l.topOff ? "Top off" : `${l.gal.toLocaleString()} gal`,
            })),
          }}
        />
      )}
    </span>
  );
}

type RK = "request" | "shipTo" | "products" | "qty" | "schedule" | "next" | "upcoming" | "status";
const LIST_COLUMNS: ListColumn<RK>[] = [
  { key: "request", label: "Request # / Created", width: 170, sortable: true },
  { key: "shipTo", label: "Ship-to", width: 170, sortable: true },
  { key: "products", label: "Products", width: 220, sortable: true },
  { key: "qty", label: "Qty (gal)", width: 110, sortable: true, align: "right" },
  { key: "schedule", label: "Schedule", width: 190, sortable: true },
  { key: "next", label: "Next Delivery", width: 160, sortable: true },
  { key: "upcoming", label: "Upcoming", width: 110, sortable: true, align: "right" },
  { key: "status", label: "Series", width: 120, sortable: true },
];

const createdOn = (r: OrderRequest) => (r.audit?.at(-1) ? DATE_FMT.format(new Date(r.audit.at(-1)!.at)) : "");
const upcomingOf = (s: Series) => (s.status === "Active" ? s.deliveries.filter((d) => !d.request && !d.skipped).length : 0);

/* THE SERIES, OPENED — its schedule, its deliveries, and from ⋯ what can be
   done to it. */
function SeriesSheet({ s, open, onOpenChange }: { s: Series | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const nav = usePortalNav();
  const [ending, setEnding] = React.useState(false);
  if (!s) return null;
  const r = s.request;
  const next = s.deliveries.find((x) => x.dateKey === s.nextKey);
  return (
    <>
      <RecordSheet
        /* WIDTH FROM ITS TABLE — request, date, products, qty, status, act. */
        fit={{ tables: [[CELL.name, CELL.date, CELL.name, CELL.number, CELL.status, CELL.number]] }}
        open={open}
        onOpenChange={onOpenChange}
        mode="edit"
        editTitle={`Recurring · ${r.requestNo}`}
        createTitle=""
        createAction=""
        showCancel={false}
        onSubmit={() => {}}
        footerPrimary={null}
        headerAside={
          <StatusChip tone={SERIES_TONE[s.status]} variant="text">
            {s.status}
          </StatusChip>
        }
        headerMenu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${r.requestNo}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => nav.openOrder(r.requestNo)}>
                <Pencil />
                Open request
              </DropdownMenuItem>
              {s.status !== "Ended" && (
                <DropdownMenuItem
                  onSelect={() => {
                    setPaused(s.id, s.status === "Active");
                    toast.success(`${r.requestNo} ${s.status === "Active" ? "paused" : "resumed"}`);
                  }}
                >
                  {s.status === "Active" ? <Pause /> : <Play />}
                  {s.status === "Active" ? "Pause series" : "Resume series"}
                </DropdownMenuItem>
              )}
              {s.status !== "Ended" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setEnding(true)}>
                    <Ban />
                    End series
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        <div className="flex min-w-0 flex-col gap-10">
          <SheetSection title="Schedule">
            <div className="grid grid-cols-3 gap-6">
              <SheetField label="Ship-to">
                <span className="flex min-h-9 items-center text-sm text-foreground">{r.shipTo}</span>
              </SheetField>
              <SheetField label="Runs on">
                <ScheduleCell schedule={s.schedule} roomy />
              </SheetField>
              <SheetField label="Next delivery">
                <span className="flex min-h-9 flex-col justify-center text-sm text-foreground">
                  {next ? next.date.title : "—"}
                  {next && <span className="text-xs text-muted-foreground">{next.date.description}</span>}
                </span>
              </SheetField>
            </div>
          </SheetSection>
          <SheetSection title="Deliveries" flush>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-fp-table-header">
                  {["Request #", "Planned Date", "Products", "Qty (gal)", "Status", ""].map((h, i) => (
                    <th
                      key={i}
                      className={cn("whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground", i === 3 && "text-right")}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.deliveries.map((d) => (
                  <tr key={d.key} className="h-12 border-b border-border last:border-b-0">
                    <td className="whitespace-nowrap px-3">
                      <span className="flex items-center gap-2">
                        {d.request ? (
                          <button
                            type="button"
                            className="tabular-nums text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 hover:decoration-solid"
                            onClick={() => nav.openOrder(d.request!.requestNo)}
                          >
                            {d.request.requestNo}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">Not made yet</span>
                        )}
                        {d.request && <Pill className="shrink-0">First delivery</Pill>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3">
                      <span className={cn("flex flex-col leading-tight", d.skipped && "line-through decoration-muted-foreground/60")}>
                        <span className="text-foreground">{d.date.title}</span>
                        <span className="text-xs text-muted-foreground">{d.date.description}</span>
                      </span>
                    </td>
                    <td className="px-3 text-muted-foreground">
                      <Products r={r} />
                    </td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums text-foreground">
                      {galOf(r) ? galOf(r).toLocaleString() : "Top off"}
                    </td>
                    <td className="whitespace-nowrap px-3">
                      {d.request ? (
                        <StatusChip tone={REQUEST_STATUS_TONE[d.request.status]} variant="soft">
                          {d.request.status}
                        </StatusChip>
                      ) : (
                        <StatusChip tone={kindTone(d.skipped || s.status !== "Active" ? "neutral" : "info")} variant="soft">
                          {d.skipped ? "Skipped" : s.status === "Paused" ? "Paused" : "Upcoming"}
                        </StatusChip>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 text-right">
                      {!d.request && s.status === "Active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toggleSkip(s.id, d.dateKey);
                            toast.success(d.skipped ? `${d.date.title} back on` : `${d.date.title} skipped`);
                          }}
                        >
                          {d.skipped ? "Undo skip" : "Skip"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SheetSection>
        </div>
      </RecordSheet>
      <AlertDialog open={ending} onOpenChange={setEnding}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End {r.requestNo}'s series?</AlertDialogTitle>
            <AlertDialogDescription>No more orders are made from it. Orders already made stay.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                endSeries(s.id);
                toast.success(`${r.requestNo} series ended`);
                setEnding(false);
              }}
            >
              End series
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RecurringScreen() {
  const all = useRequests();
  const ov = useSeriesOverrides();
  const [line, setLine] = React.useState<LineScope>("All");
  const [openId, setOpenId] = React.useState<string | null>(null);
  /* A NEW RULE IS A RECURRING ORDER REQUEST — the order sheet, recurring on. */
  const [draftId, setDraftId] = React.useState<string | null>(null);

  const series = React.useMemo(
    () =>
      all
        .filter((r) => r.recurring && r.status !== "Draft" && inLine(r, line))
        .map((r) => buildSeries(r, ov[r.id])),
    [all, ov, line]
  );
  const createRule = (rec?: PortalRecommendation) => {
    const r = createRequest(true);
    if (rec)
      updateRequest(r.id, {
        shipTo: rec.shipTo,
        frequency: rec.frequency,
        date: nextRun(rec),
        lines: rec.lines.map((l) => ({
          assetId: l.assetId,
          product: lastProductFor(l.assetId, allRequests()) ?? assetById(l.assetId)?.product ?? "",
          topOff: false,
          gal: l.gal,
        })),
      });
    setDraftId(r.id);
  };

  const text = (s: Series, k: RK): string => {
    const r = s.request;
    switch (k) {
      case "request":
        return `${r.requestNo} ${createdOn(r)}`;
      case "shipTo":
        return r.shipTo;
      case "products":
        return r.lines.map((l) => l.product).join(", ");
      case "qty":
        return String(galOf(r));
      case "schedule":
        return s.schedule.label;
      case "next":
        return s.deliveries.find((d) => d.dateKey === s.nextKey)?.date.title ?? "";
      case "upcoming":
        return String(upcomingOf(s));
      case "status":
        return s.status;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PortalList<Series, RK>
        rows={series}
        columns={LIST_COLUMNS}
        rowId={(s) => s.id}
        text={text}
        sortValue={(s, k) =>
          k === "qty" ? galOf(s.request) : k === "upcoming" ? upcomingOf(s) : k === "next" ? (s.nextKey ?? "9999") : undefined
        }
        renderCell={(s, k) => {
          const r = s.request;
          switch (k) {
            case "request":
              return <TwoLineCell title={r.requestNo} description={createdOn(r)} />;
            case "shipTo":
              return <span className="truncate text-sm">{r.shipTo}</span>;
            case "products":
              return <Products r={r} />;
            case "qty":
              return <span className="text-sm tabular-nums">{galOf(r) ? galOf(r).toLocaleString() : "Top off"}</span>;
            case "schedule":
              return <ScheduleCell schedule={s.schedule} roomy />;
            case "next": {
              const d = s.deliveries.find((x) => x.dateKey === s.nextKey);
              return d ? <TwoLineCell title={d.date.title} description={d.date.description} /> : <span className="text-sm text-muted-foreground">—</span>;
            }
            case "upcoming":
              return <span className="text-sm tabular-nums">{upcomingOf(s)}</span>;
            case "status":
              return (
                <StatusChip tone={SERIES_TONE[s.status]} variant="text">
                  {s.status}
                </StatusChip>
              );
          }
        }}
        facets={[
          { key: "status", label: "Series", options: [...SERIES_STATUSES] },
          { key: "shipTo", label: "Ship-to", options: SHIP_TOS.map((x) => x.name) },
          { key: "frequency", label: "Frequency", options: [...FREQUENCIES] },
        ]}
        facetValues={(s, f) =>
          f === "status" ? [s.status] : f === "shipTo" ? [s.request.shipTo] : f === "frequency" ? [s.request.frequency] : []
        }
        storageKey="portal-recurring"
        noun="recurring orders"
        nounOne="recurring order"
        searchPlaceholder="Search requests, ship-tos, products…"
        ctaLabel="Create Rule"
        onCreate={() => createRule()}
        afterFilters={<RecurringRecommendations onCreate={createRule} />}
        segments={LINE_SCOPES.map((l) => ({ key: l, label: l }))}
        segmentValue={line}
        onSegmentChange={(v) => setLine(v as LineScope)}
        onOpen={(s) => setOpenId(s.id)}
        openLabel={(s) => `Open the series ${s.request.requestNo}`}
        emptyIcon={<Repeat />}
      />
      <SeriesSheet
        s={series.find((x) => x.id === openId) ?? null}
        open={openId !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
      <OrderRequestSheet
        request={all.find((r) => r.id === draftId) ?? null}
        open={draftId !== null}
        creating
        onOpenChange={(o) => !o && setDraftId(null)}
        onDuplicate={(id) => setDraftId(id)}
      />
    </div>
  );
}
