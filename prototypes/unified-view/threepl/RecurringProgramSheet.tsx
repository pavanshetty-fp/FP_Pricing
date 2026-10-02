import * as React from "react";
import { AlertTriangle, Info, MapPinOff, Pencil, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecordSheet } from "../RecordSheet";

import { ScheduleCell } from "./ScheduleCell";
import type { SeriesStatus } from "./recurring";
import {
  MONEY,
  clashFor,
  fmtKey,
  liveTargets,
  nextDates,
  programGallons,
  programMoney,
  programPartnerLabel,
  programTitle,
  programVendors,
  reachableTargets,
  waitingTargets,
  type LaneState,
  type ProgramTarget,
  type RecurringProgram,
} from "./recurringPrograms";
import { defaultLineCharges } from "./orders";
import { statusTones } from "../statusKind";
import { kindTone } from "../statusKind";

/*
  THE PROGRAMME SHEET — V1.1's record.

  THE TARGET GRID IS THE SCREEN. Everything else here is a header for it. A
  programme is a book of lanes, and the question anybody opens one with is
  about the book: which lanes are away, which are still being argued over, and
  what the whole thing earns. A stack of field cards answers none of that.

  BOTH PRICES ON THE ROW MEANS THE ROW CARRIES THE MARGIN, and the grid totals
  it. That is the thing this version can show that neither of the others can —
  twelve lanes and their economics in one place.

  ONLY ACCEPTED LANES COUNT. A quoted lane has a number against it and earns
  nothing, because nobody has agreed to run it. The totals say "live lanes" for
  that reason, and the waiting ones are listed under their own heading rather
  than mixed in — a reader adding up a column must not be adding up work that
  is not happening.

  THE RULE'S OWN TERMS ARE READ-ONLY HERE, and the frequency is not editable at
  all: it is what the programme IS. A site that wants another day belongs to
  another programme, which is the decision that makes this whole version
  legible.
*/

const DASH = "—";

const LANE_TONE = statusTones<LaneState>({
  Accepted: "success",
  /* A price is in: waiting on us to accept it. */
  Quoted: "caution",
  /* Waiting on the partner to answer. */
  Invited: "caution",
  /* The plan has to change — this lane needs somebody else. */
  Declined: "critical",
  Draft: "neutral",
});

const SERIES_TONE = statusTones<SeriesStatus>({
  /* Set up, not yet running. True, and asks nothing. */
  Upcoming: "info",
  /* Running. Asks nothing — a series being live is not an achievement. */
  Active: "info",
  /* Waiting on somebody to resume it. NOT red: pausing is a decision. */
  Paused: "caution",
  Cancelled: "neutral",
  Ended: "neutral",
  Expired: "neutral",
});

function Card({
  title,
  aside,
  flush,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="shrink-0 overflow-hidden rounded-md border border-fp-outline-1">
      <header className="flex items-center justify-between gap-3 border-b border-fp-outline-1 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {aside}
      </header>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * The grid
 * ------------------------------------------------------------------------ */

const GRID_COLS = [
  { key: "customer", label: "Customer", w: "220px" },
  { key: "shipTo", label: "Ship to", w: "190px" },
  { key: "tanks", label: "Tanks", w: "170px" },
  { key: "window", label: "Window", w: "150px" },
  { key: "vendorPrice", label: "Partner", w: "110px", right: true },
  { key: "customerPrice", label: "Customer", w: "110px", right: true },
  { key: "margin", label: "Margin", w: "110px", right: true },
  { key: "lane", label: "Lane", w: "130px" },
];

function TargetRow({
  t,
  onOpen,
}: {
  t: ProgramTarget;
  onOpen: () => void;
}) {
  const margin =
    t.vendorPrice !== null && t.customerPrice !== null
      ? t.customerPrice - t.vendorPrice
      : null;

  return (
    <tr
      className={cn(
        "cursor-pointer border-b border-fp-outline-1 last:border-0 hover:bg-fp-row-hover",
        !t.serviceable && "opacity-60"
      )}
      onClick={onOpen}
    >
      <td className="px-3 py-2.5">
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm text-foreground">
            {t.customer.title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {t.customer.description}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="flex items-center gap-1.5 truncate text-sm text-foreground">
            {/* COVERAGE CAN LAPSE AFTER THE FACT. The site did not move; the
                partner's area did. It is said on the row it happened to. */}
            {!t.serviceable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <MapPinOff className="size-3.5 shrink-0 text-status-failed" />
                </TooltipTrigger>
                <TooltipContent>
                  Outside this partner&rsquo;s service area now. Nothing is
                  being generated for this lane.
                </TooltipContent>
              </Tooltip>
            )}
            {t.shipTo}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {t.city}, {t.state}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex min-w-0 flex-col leading-tight">
          {t.lines.map((l, i) => (
            <span key={i} className="truncate text-xs text-muted-foreground">
              {l.asset} ·{" "}
              {l.topOff ? "top off" : `${(l.gal ?? 0).toLocaleString()} gal`}
            </span>
          ))}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
        {t.window.start} – {t.window.end}
      </td>
      <td className="px-3 py-2.5 text-right text-sm tabular-nums text-foreground">
        {t.vendorPrice !== null ? MONEY(t.vendorPrice) : <span className="text-muted-foreground">{DASH}</span>}
      </td>
      <td className="px-3 py-2.5 text-right text-sm tabular-nums text-foreground">
        {t.customerPrice !== null ? MONEY(t.customerPrice) : <span className="text-muted-foreground">{DASH}</span>}
      </td>
      <td
        className={cn(
          "px-3 py-2.5 text-right text-sm tabular-nums",
          margin !== null && margin < 0 ? "text-status-failed" : "text-foreground"
        )}
      >
        {margin !== null ? MONEY(margin) : <span className="text-muted-foreground">{DASH}</span>}
      </td>
      <td className="px-3 py-2.5">
        {/* OUT OF AREA BEATS ACCEPTED. A lane the partner agreed to and can no
            longer reach is not running, and a chip still reading "Accepted"
            under a Waiting heading is the row arguing with itself. The newer
            fact wins the chip; the older one is still on the record. */}
        {!t.serviceable ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <StatusChip tone={kindTone("critical")} variant="soft">
                  Out of area
                </StatusChip>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Was {t.state_.toLowerCase()} — the partner&rsquo;s service area
              changed since.
            </TooltipContent>
          </Tooltip>
        ) : (
          <StatusChip tone={LANE_TONE[t.state_]} variant="soft">
            {t.state_}
          </StatusChip>
        )}
      </td>
    </tr>
  );
}

function TargetGrid({
  title,
  targets,
  onOpen,
  totals,
}: {
  title: string;
  targets: ProgramTarget[];
  onOpen: (t: ProgramTarget) => void;
  totals?: { cost: number; revenue: number; margin: number };
}) {
  if (targets.length === 0) return null;
  return (
    <div>
      <p className="border-b border-fp-outline-1 bg-fp-card-1 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {title}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-fp-outline-1">
            {GRID_COLS.map((c) => (
              <th
                key={c.key}
                style={{ width: c.w }}
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground",
                  c.right && "text-right"
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {targets.map((t) => (
            <TargetRow key={t.id} t={t} onOpen={() => onOpen(t)} />
          ))}
          {totals && (
            /* THE TOTAL IS OF THE LIVE LANES AND SAYS SO. A column somebody
               adds up must not include work that is not happening. */
            <tr className="border-t border-fp-outline-1 bg-fp-card-1">
              <td colSpan={4} className="px-3 py-2.5 text-xs text-muted-foreground">
                Per run, live lanes only
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">
                {MONEY(totals.cost)}
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">
                {MONEY(totals.revenue)}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-right text-sm font-semibold tabular-nums",
                  totals.margin < 0 ? "text-status-failed" : "text-foreground"
                )}
              >
                {MONEY(totals.margin)}
              </td>
              <td />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Adding a ship-to — the gate, made visible
 * ------------------------------------------------------------------------ */

function AddTargetDialog({
  program,
  all,
  open,
  onOpenChange,
  onAdd,
}: {
  program: RecurringProgram;
  all: RecurringProgram[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (shipTo: string) => void;
}) {
  const [q, setQ] = React.useState("");
  const vendors = programVendors(program);

  const options = React.useMemo(() => {
    if (vendors.length === 0) return [];
    const already = new Set(program.targets.map((t) => t.shipTo));
    const needle = q.trim().toLowerCase();
    /* THE UNION OF EVERY PARTNER ON THE PROGRAMME — a site one of them can
       reach is a site the programme can cover. */
    const seen = new Set<string>();
    return vendors
      .flatMap((v) => reachableTargets(v))
      .filter((r) => (seen.has(r.shipTo) ? false : (seen.add(r.shipTo), true)))
      .filter((r) => !already.has(r.shipTo))
      .filter(
        (r) =>
          !needle ||
          `${r.customer.title} ${r.shipTo} ${r.site.city}`
            .toLowerCase()
            .includes(needle)
      )
      .map((r) => ({
        ...r,
        clash: clashFor(r.shipTo, program.products, program.id, all),
      }));
  }, [vendors, program, all, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a ship-to</DialogTitle>
          {/* THE GATE, SAID OUT LOUD. A shorter list than somebody expects is
              alarming unless the screen says why it is short. */}
          <DialogDescription>
            Only sites {programPartnerLabel(program)} can reach are listed —
            their service area decides, not the customer list.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customers and sites…"
            className="pl-8"
          />
        </div>

        <div className="max-h-[46vh] overflow-y-auto rounded-md border border-fp-outline-1">
          {options.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {q
                ? "Nothing matches inside this partner's area."
                : "Every site this partner can reach is already on the programme."}
            </p>
          ) : (
            options.map((o) => (
              <div
                key={o.shipTo}
                className="flex items-center justify-between gap-3 border-b border-fp-outline-1 px-3 py-2.5 last:border-0"
              >
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm text-foreground">
                    {o.shipTo}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {o.customer.title} · {o.site.city}, {o.site.state}
                  </span>
                  {/* THE COLLISION. Two programmes, one site, one product —
                      two trucks. The only cheap moment to say so is now. */}
                  {o.clash && (
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-status-failed">
                      <AlertTriangle className="size-3" />
                      Already on {o.clash.programNo} for {program.products.join(" + ")}
                    </span>
                  )}
                </div>
                <Button
                  variant={o.clash ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    onAdd(o.shipTo);
                    onOpenChange(false);
                  }}
                >
                  Add
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <span className="mr-auto text-xs text-muted-foreground">
            {options.length} available
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------------------
 * The sheet
 * ------------------------------------------------------------------------ */

export function RecurringProgramSheet({
  program,
  all,
  open,
  onOpenChange,
  onChange,
  onEdit,
}: {
  program: RecurringProgram | null;
  all: RecurringProgram[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChange: (next: RecurringProgram) => void;
  /** Reopen the rule in its form. Offered only while it has made no order. */
  onEdit?: (p: RecurringProgram) => void;
}) {
  const [adding, setAdding] = React.useState(false);

  if (!program) return null;

  const live = liveTargets(program);
  const waiting = waitingTargets(program);
  const totals = programMoney(program);
  const dates = nextDates(program);

  return (
    <RecordSheet
      size="xxwide"
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      editTitle={program.programNo}
      createTitle="New programme"
      createAction="Create programme"
      onSubmit={() => undefined}
      showCancel={false}
      footerPrimary={null}
      headerAside={
        <span className="flex items-center gap-2">
          <StatusChip tone={SERIES_TONE[program.status]} variant="soft">
            {program.status}
          </StatusChip>
          {/* EDITABLE UNTIL IT HAS MADE AN ORDER (Pavan, 2026-10-01). No live
              lane means nothing has been generated, so nothing downstream can
              be rewritten by changing the rule. */}
          {onEdit && live.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => onEdit(program)}>
              <Pencil />
              Edit rule
            </Button>
          )}
        </span>
      }
      headerSubtitle={
        <span className="text-sm text-muted-foreground">
          {programTitle(program)}
        </span>
      }
      footerAside={
        <span className="text-sm text-muted-foreground">
          {live.length} of {program.targets.length} lanes live ·{" "}
          {MONEY(totals.margin)} margin per run
        </span>
      }
    >
      {waiting.length > 0 && (
        /* PARTLY LIVE IS THE ORDINARY CASE, not an exception, so it is stated
           at the top rather than discovered at the bottom of a grid. */
        <div className="flex shrink-0 items-start gap-2 rounded-md border border-fp-outline-1 bg-fp-surface-1b px-3 py-2.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            {live.length} of {program.targets.length} lanes are away and
            generating. The other {waiting.length}{" "}
            {waiting.length === 1 ? "is" : "are"} listed below and produce
            nothing until the partner has priced and accepted them.
          </span>
        </div>
      )}

      <Card
        title="Lanes"
        flush
        aside={
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus />
            Add ship-to
          </Button>
        }
      >
        <TargetGrid
          title={`Live — ${live.length} ${live.length === 1 ? "lane" : "lanes"}`}
          targets={live}
          onOpen={() => undefined}
          totals={totals}
        />
        <TargetGrid
          title={`Waiting — ${waiting.length}`}
          targets={waiting}
          onOpen={() => undefined}
        />
      </Card>

      <Card
        title="What every lane has in common"
        aside={
          <span className="text-xs text-muted-foreground">
            Changing these changes every lane
          </span>
        }
      >
        <dl className="grid grid-cols-4 gap-x-6 gap-y-4">
          <Field label="Partner">
            {programPartnerLabel(program)}
            {/* THE GATE, RESTATED WHERE IT WAS SET. The partner is not one
                field among many here — it is what decided the lane list. */}
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Decides which sites can be on this programme
            </span>
          </Field>
          <Field label="Product">{program.products.join(" + ")}</Field>
          <Field label="Frequency">
            <ScheduleCell schedule={program.schedule} />
          </Field>
          <Field label="Order type">{program.orderType}</Field>

          <Field label="Load order">
            {program.loadOrder ? "Yes — we buy the product" : "No — partner supplies"}
          </Field>
          <Field label="Terminal">
            {program.loadRows.length
              ? [...new Set(program.loadRows.map((l) => l.terminal))].join(" / ")
              : DASH}
          </Field>
          <Field label="Supplier">
            {program.loadRows.length
              ? [...new Set(program.loadRows.map((l) => l.supplier))].join(" / ")
              : DASH}
          </Field>
          <Field label="Loading account">
            {program.loadRows.length
              ? [...new Set(program.loadRows.map((l) => l.loadingAccount))].join(
                  " / "
                )
              : DASH}
          </Field>

          <Field label="Runs from">{fmtKey(program.startKey)}</Field>
          <Field label="Gallons per run">
            {programGallons(program) > 0
              ? `${programGallons(program).toLocaleString()} + top-offs`
              : "Top-offs only"}
          </Field>
          <Field label="Winter blend">
            {program.winterProducts.length
              ? program.winterProducts.join(" + ")
              : "None"}
          </Field>
          <Field label="Signature on delivery">
            {program.signatureOnDelivery ? "Required" : "Not required"}
          </Field>
        </dl>

        {/* THE ONE THING THAT CANNOT BE EDITED, AND WHY. It is the decision
            that makes a programme readable from its title. */}
        <p className="mt-4 rounded-md bg-fp-card-1 px-3 py-2.5 text-xs text-muted-foreground">
          The frequency is part of what this programme <em>is</em> and cannot be
          changed for one site. A ship-to that needs a different day belongs to
          a different programme.
        </p>
      </Card>

      <Card
        title="Next runs"
        aside={
          <span className="text-xs text-muted-foreground">
            {live.length} {live.length === 1 ? "order" : "orders"} per run
          </span>
        }
      >
        <div className="flex flex-wrap gap-2">
          {dates.map((k) => (
            <Badge key={k} variant="secondary" className="tabular-nums">
              {fmtKey(k)}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          One order per live lane per date — {live.length} on each of these
          days, and nothing at all for the lanes still waiting.
        </p>
      </Card>

      <AddTargetDialog
        program={program}
        all={all}
        open={adding}
        onOpenChange={setAdding}
        onAdd={(shipTo) => {
          const r = programVendors(program)
            .flatMap((v) => reachableTargets(v))
            .find((x) => x.shipTo === shipTo);
          if (!r) return;
          onChange({
            ...program,
            targets: [
              ...program.targets,
              {
                id: `${program.id}-new-${shipTo}`,
                customer: r.customer,
                shipTo,
                city: r.site.city,
                state: r.site.state,
                lines: [
                  {
                    asset: "Bulk tank",
                    product: program.products[0] ?? "",
                    gal: null,
                    topOff: true,
                    charges: defaultLineCharges(),
                  },
                ],
                window: { start: "8:00 AM", end: "12:00 PM" },
                poc: "",
                instructions: "",
                poNumber: "",
                /* A NEW LANE IS NOT PRICED AND NOT AWAY. Adding a site does
                   not start a truck — the partner has to price it first, and
                   the grid puts it under Waiting until they do. */
                vendorPrice: null,
                customerPrice: null,
                state_: "Draft",
                serviceable: true,
              },
            ],
          });
        }}
      />
    </RecordSheet>
  );
}
