import * as React from "react";
import { toast } from "sonner";
import { Ban, ChevronDown, ChevronRight, MoreHorizontal, Pause, Pencil, Play, Repeat, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { DATE_FMT } from "../unified-view/data";
import { kindTone, statusTones } from "../unified-view/statusKind";
import { TwoLineCell } from "../unified-view/ListTable";
import { OverflowChip } from "../unified-view/BreakdownCard";
import { ScheduleCell } from "../unified-view/threepl/ScheduleCell";
import { REQUEST_STATUS_TONE, assetById, useRequests, type OrderRequest } from "./orders";
import { usePortalNav } from "./nav";
import { buildSeries, endSeries, setPaused, toggleSkip, useSeriesOverrides, type Series, type SeriesStatus } from "./recurring";

/*
  RECURRING ORDERS (Pavan, 2026-10-15 — "the same format as 3PL recurring
  orders"): one row per series — request, ship-to, products, schedule as
  day letters, next delivery, how many are coming, the series' state — and
  a row opens onto its deliveries in the nested sub-table (recessed, left
  accent). The first is the request itself, badged "First delivery"; the
  rest are the dates coming in the next month, each skippable. ⋯ pauses,
  resumes, ends, or opens the request to edit. A recurring order is made
  from "Create Order" (Recurring order), not here.
*/

const SERIES_TONE = statusTones<SeriesStatus>({ Active: "info", Paused: "caution", Ended: "neutral" });

const COLS = [
  { key: "request", label: "Request # / Created", width: 150 },
  { key: "shipTo", label: "Ship-to", width: 150 },
  /* No width — the products take what is left. */
  { key: "products", label: "Products", width: undefined },
  { key: "qty", label: "Qty (gal)", width: 100, right: true },
  { key: "schedule", label: "Schedule", width: 180 },
  { key: "next", label: "Next Delivery", width: 140 },
  { key: "upcoming", label: "Upcoming", width: 96, right: true },
  { key: "status", label: "Series", width: 100 },
  { key: "actions", label: "", width: 52 },
] as const;

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

function Deliveries({ s }: { s: Series }) {
  const nav = usePortalNav();
  const r = s.request;
  return (
    <div className="border-l-2 border-status-processing/70 bg-background">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {["Request #", "Planned Date", "Products", "Qty (gal)", "Status", ""].map((h, i) => (
              <th
                key={i}
                className={cn("whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground", i === 3 && "text-right")}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.deliveries.map((d) => (
            <tr key={d.key} className="border-t border-border/60">
              <td className="whitespace-nowrap px-4 py-3">
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
              <td className="whitespace-nowrap px-4 py-3">
                <span className={cn("flex flex-col leading-tight", d.skipped && "line-through decoration-muted-foreground/60")}>
                  <span className="text-foreground">{d.date.title}</span>
                  <span className="text-xs text-muted-foreground">{d.date.description}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <Products r={r} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-foreground">{galOf(r) ? galOf(r).toLocaleString() : "Top off"}</td>
              <td className="whitespace-nowrap px-4 py-3">
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
              <td className="whitespace-nowrap px-4 py-3 text-right">
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
    </div>
  );
}

export function RecurringScreen() {
  const all = useRequests();
  const ov = useSeriesOverrides();
  const nav = usePortalNav();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<ReadonlySet<string>>(new Set());
  const [ending, setEnding] = React.useState<Series | null>(null);

  const series = React.useMemo(
    () => all.filter((r) => r.recurring && r.status !== "Draft").map((r) => buildSeries(r, ov[r.id])),
    [all, ov]
  );
  const rows = series.filter((s) =>
    `${s.request.requestNo} ${s.request.shipTo} ${s.request.lines.map((l) => l.product).join(" ")} ${s.schedule.label}`
      .toLowerCase()
      .includes(q.trim().toLowerCase())
  );
  const toggle = (id: string) =>
    setOpen((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const cell = (s: Series, k: (typeof COLS)[number]["key"]) => {
    const r = s.request;
    switch (k) {
      case "request":
        return <TwoLineCell title={r.requestNo} description={r.audit?.at(-1) ? DATE_FMT.format(new Date(r.audit.at(-1)!.at)) : ""} />;
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
        return (
          <span className="text-sm tabular-nums">
            {s.status === "Active" ? s.deliveries.filter((d) => !d.request && !d.skipped).length : 0}
          </span>
        );
      case "status":
        return (
          <StatusChip tone={SERIES_TONE[s.status]} variant="text">
            {s.status}
          </StatusChip>
        );
      case "actions":
        return (
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
                  <DropdownMenuItem onSelect={() => setEnding(s)}>
                    <Ban />
                    End series
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="relative w-80">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests, ship-tos, products…" className="pl-8" />
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-border">
        {rows.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Repeat />
              </EmptyMedia>
              <EmptyTitle>No recurring orders</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 44 }} />
              {COLS.map((c) => (
                <col key={c.key} style={{ width: c.width }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="h-10 bg-fp-table-header">
                <th className="border-b border-fp-outline-1" />
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className={cn("whitespace-nowrap border-b border-fp-outline-1 px-3 text-left text-xs font-medium text-muted-foreground", "right" in c && c.right && "text-right")}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const isOpen = open.has(s.id);
                return (
                  <React.Fragment key={s.id}>
                    <tr
                      className="group/row h-14 cursor-pointer hover:bg-fp-row-hover [&>td]:border-b [&>td]:border-fp-outline-1"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button,a,[role='menuitem']")) return;
                        toggle(s.id);
                      }}
                    >
                      <td className="px-3">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-expanded={isOpen}
                          aria-label={isOpen ? `Hide deliveries for ${s.request.requestNo}` : `Show deliveries for ${s.request.requestNo}`}
                          onClick={() => toggle(s.id)}
                        >
                          {isOpen ? <ChevronDown /> : <ChevronRight />}
                        </Button>
                      </td>
                      {COLS.map((c) => (
                        <td key={c.key} className={cn("overflow-hidden px-3", "right" in c && c.right && "text-right")}>
                          {cell(s, c.key)}
                        </td>
                      ))}
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={COLS.length + 1} className="border-b border-fp-outline-1 bg-background p-0">
                          <Deliveries s={s} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 shrink-0">
        <span className="text-sm text-muted-foreground">Showing deliveries from today through one month out</span>
      </div>

      <AlertDialog open={ending !== null} onOpenChange={(o) => !o && setEnding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End {ending?.request.requestNo}'s series?</AlertDialogTitle>
            <AlertDialogDescription>
              No more orders are made from it. Orders already made stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!ending) return;
                endSeries(ending.id);
                toast.success(`${ending.request.requestNo} series ended`);
                setEnding(null);
              }}
            >
              End series
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
