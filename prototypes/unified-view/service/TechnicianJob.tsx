import * as React from "react";
import {
  Building2,
  CalendarDays,
  Camera,
  Check,
  Clock,
  MapPin,
  Minus,
  Navigation,
  Plus,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  TASK_KIND_LABEL,
  WORK_TYPE_CATEGORY,
  type TaskKind,
  WORK_TYPE_NAMES,
  WORK_TYPES,
  assetsAt,
  technicianById,
  computedLabor,
  formatHours,
  money,
  quoteableTotal,
  shortfallLabel,
  syncVisits,
  type AssessmentLine,
  type AssessmentVerdict,
  type FeeLine,
  type PartLine,
  type ServiceOrder,
  type WorkStatus,
} from "./work";
import { useServiceSettings } from "./settings";
import { useElapsedHours } from "./sheet-parts";
import { ActionBar, Body, Facts, SectionTitle, TopBar } from "./TechnicianMobile";
import { BottomSheet } from "./TechnicianHome";

/*
  ═══════════════════════════════════════════════════════════════════════════
  INSIDE ONE JOB, ON THE PHONE (Pavan, 2026-09-24).
  ═══════════════════════════════════════════════════════════════════════════

  The order of things a technician actually does on site:

    ORDER      number, customer, ship-to — "Arrived at location", or navigate
    START      the order's details on site, and "Start work" starts the clock
    ASSESS     the ORDER against what is in front of them, LINE BY LINE:
               right as ordered · different · not needed — plus anything
               found that the order never mentioned. A note and photos on
               every line.
    QUOTE      built from the assessment, shared with the customer, and
               their acknowledgement taken on site
    WORK       the clock keeps running from "Start work"
    COMPLETE   everything done — or partly done, parts missing, and then
               what happens to the rest: a LINKED order (this one carries
               on) or a NEW order (this one closes, the rest is its own job)

  The quote steps follow the company's field-quoting switch; everything else
  is every job.
*/

/* AN UNSAVED ASSESSMENT SURVIVES LEAVING THE SCREEN (Pavan, 2026-09-24) —
   a task answered and then left still shows its tick on the way back. Held
   per order for the session; "Save assessment" is still what records it. */
const draftLines = new Map<string, AssessmentLine[]>();

/** A task is done once it has its answer — and, when added on site, what it needs. */
const taskDone = (l: AssessmentLine) =>
  l.verdict !== null &&
  (l.verdict !== "added" || l.actual.trim().length > 0) &&
  (l.verdict !== "different" || Boolean(l.found?.description.trim()));

/** The price book's parts for a work type — where a task's parts list starts. */
const bookParts = (workType: string): PartLine[] => (WORK_TYPES[workType]?.parts ?? []).map((p) => ({ ...p }));

/** Every answered task's fees, each tagged with its task. */
const feesOfTasks = (lines: AssessmentLine[]): FeeLine[] =>
  lines.flatMap((l) =>
    l.verdict === null ? [] : (l.fees ?? []).filter((f) => f.name.trim()).map((f) => ({ name: f.name, amount: f.amount, task: l.key }))
  );

/** The order's own fees — what the dispatcher put on, not what a task added. */
const orderFeesOf = (fees: FeeLine[]) => fees.filter((f) => !f.task);

/** Every answered task's parts, as one list — the same part at the same price adds up. */
function partsOfTasks(lines: AssessmentLine[]): PartLine[] {
  const out: PartLine[] = [];
  for (const l of lines) {
    if (l.verdict === null) continue;
    for (const p of l.parts ?? []) {
      if (!p.name.trim()) continue;
      const hit = out.find((x) => x.name === p.name && x.cost === p.cost);
      if (hit) hit.qty += p.qty;
      else out.push({ name: p.name, qty: p.qty, cost: p.cost });
    }
  }
  return out;
}

/** A running clock, to the second. */
function useClock(startedAt: string | null): string {
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    if (!startedAt) return undefined;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return "00:00:00";
  const secs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
}

type Stage = "travel" | "assess" | "quote" | "ack" | "ready" | "work" | "complete" | "done";

const nowIso = () => new Date().toISOString();

/** The assessment is settled when every line has a verdict and says what it needs where it must. */
const assessmentComplete = (lines: AssessmentLine[]) =>
  lines.length > 0 &&
  lines.every(
    (l) =>
      l.verdict !== null &&
      (l.verdict !== "added" || l.actual.trim().length > 0) &&
      (l.verdict !== "different" || Boolean(l.found?.description.trim()))
  );

/** The order's own requirements, as the lines to assess. */
function linesFromOrder(job: ServiceOrder): AssessmentLine[] {
  const rows = job.assets.filter((a) => a.assetName || a.fault || a.workType);
  const src = rows.length
    ? rows
    : [{ assetName: job.assetName, workType: job.workType, fault: job.fault }];
  return src.map((a, i) => ({
    key: `o-${i}`,
    source: "order",
    assetName: a.assetName || "Asset",
    workType: a.workType,
    reported: a.fault,
    verdict: null,
    actual: "",
    note: "",
    photos: [],
  }));
}

/* THE THREE ANSWERS PER TASK (Pavan, 2026-09-24). */
const VERDICTS: { key: Exclude<AssessmentVerdict, "added">; label: string }[] = [
  { key: "accurate", label: "Faulty as described" },
  { key: "different", label: "Different issue than described" },
  { key: "skip", label: "No fault detected" },
];

/** What a task comes to, in words — the fault confirmed, or what was found instead. */
const lineWhat = (l: AssessmentLine) =>
  l.verdict === "accurate"
    ? l.reported
    : l.verdict === "different"
      ? [l.found?.workType, l.found?.description || l.note].filter(Boolean).join(" — ") || "Different issue"
      : l.actual;

/** A job's order line or site finding, as the customer will see it on the quote. */
const lineTitle = (l: AssessmentLine) => [l.assetName, l.workType].filter(Boolean).join(" · ");

/** A new ticket raised from site — only what the technician adds. */
export interface TicketRequest {
  assets: { assetId: string; assetName: string; assetType: string; workType: string; fault: string }[];
  fees: { name: string; amount: number }[];
}

export interface SplitRequest {
  mode: "continue" | "neworder";
  parts: PartLine[];
  note: string | null;
}

export function TechnicianJob({
  job,
  onBack,
  onPatch,
  onSplit,
  busyWith,
  onCreateTicket,
}: {
  /** A new ticket for the same customer and site — returns its number. */
  onCreateTicket?: (req: TicketRequest) => string;
  job: ServiceOrder;
  /** Another order this technician already has Ongoing — only one at a time. */
  busyWith?: string;
  onBack: () => void;
  onPatch: (patch: Partial<ServiceOrder>) => void;
  /** A partial completion — the screen owns it, because one outcome creates an order. */
  onSplit: (req: SplitRequest) => void;
}) {
  const cfg = useServiceSettings();
  const elapsed = useElapsedHours(job.startedAt && !job.completedAt ? job.startedAt : null);

  const [lines, setLinesRaw] = React.useState<AssessmentLine[]>(
    () => job.assessmentLines ?? draftLines.get(job.id) ?? linesFromOrder(job)
  );
  const setLines = (next: React.SetStateAction<AssessmentLine[]>) =>
    setLinesRaw((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      draftLines.set(job.id, v);
      return v;
    });
  const clock = useClock(job.startedAt && !job.completedAt ? job.startedAt : null);
  const [ackBy, setAckBy] = React.useState(job.quote?.acknowledgedBy ?? "");
  const [ending, setEnding] = React.useState<"full" | "partial" | null>(null);
  const [endedAt, setEndedAt] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState(job.techNotes ?? "");
  const [parts, setParts] = React.useState<PartLine[]>(() =>
    job.parts.map((p) => ({ ...p, fittedQty: p.fittedQty ?? p.qty }))
  );
  const [mode, setMode] = React.useState<"continue" | "neworder">(cfg.returnMode);
  const [mapOpen, setMapOpen] = React.useState(false);
  const [ticketOpen, setTicketOpen] = React.useState(false);
  const [breakupOpen, setBreakupOpen] = React.useState(false);

  const assessed = Boolean(job.assessmentLines && assessmentComplete(job.assessmentLines));
  const handedIn = Boolean(job.completedAt) || job.status === "Parts pending" || job.status === "Completed — linked";

  const stage: Stage = handedIn
    ? "done"
    : ending
      ? "complete"
      : !job.arrivedAt
        ? "travel"
        : /* THE CLOCK STARTS BEFORE THE ASSESSMENT (Pavan, 2026-09-24):
             looking at the job is part of the job. */
          !assessed
          ? "assess"
          : cfg.fieldQuote && !job.quote
            ? "quote"
            : cfg.fieldQuote && job.quote && !job.quote.approvedAt
              ? "ack"
              : "work";

  const sub = `${job.orderNo} · ${job.shipTo}`;
  const toDo = (job.assessmentLines ?? lines).filter((l) => l.verdict !== "skip");
  const skipped = (job.assessmentLines ?? lines).filter((l) => l.verdict === "skip");

  /* ── THE ORDER, BEFORE ARRIVAL ── who it is for and where it is, with the
     two things a technician does from here: go there, or say they are
     there (Pavan, 2026-09-24). */
  /* NAVIGATION IS A PLACEHOLDER (Pavan, 2026-09-24) — an empty map with the
     site on it. Routing is the phone's maps app's job, not this one's. */
  if (mapOpen) {
    return (
      <>
        <header className="flex shrink-0 items-center gap-2 border-b border-fp-outline-1 bg-fp-surface-1a px-3 py-3">
          <button type="button" onClick={() => setMapOpen(false)} aria-label="Back" className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-accent">
            <ArrowLeft className="size-5" />
          </button>
          <span className="truncate text-base font-semibold text-foreground">{job.shipTo}</span>
        </header>
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center bg-fp-card-1"
          style={{
            backgroundImage:
              "linear-gradient(var(--fp-outline-1) 1px, transparent 1px), linear-gradient(90deg, var(--fp-outline-1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        >
          <MapPin className="size-10 fill-primary text-primary-foreground" />
        </div>
      </>
    );
  }

  /* A NEW TICKET FROM SITE (Pavan, 2026-09-24) — the web's create form
     without the customer or the schedule: those are this order's. */
  if (ticketOpen && onCreateTicket) {
    return (
      <NewTicket
        job={job}
        onBack={() => setTicketOpen(false)}
        onCreate={(req) => {
          const no = onCreateTicket(req);
          toast.success(`Ticket ${no} created`, { description: `${job.customer} · ${job.shipTo}` });
          setTicketOpen(false);
        }}
      />
    );
  }

  if (stage === "travel") {
    return (
      <>
        {/* THE ORDER NUMBER IS THE TITLE (Pavan, 2026-09-24) — never
            "Order details". */}
        <TopBar title={job.orderNo} onBack={onBack} />
        <Body>
          {/* OPEN, NOT CARDED (Pavan, 2026-09-24): customer, ship-to, and
              when it is booked for — date and window. */}
          <OrderHeading job={job} />
        </Body>
        <ActionBar
          note={arrivalTiming(job) ?? undefined}
          label="Arrived at site"
          onPress={() => {
            onPatch({ arrivedAt: nowIso() });
            toast.success("Arrival recorded");
          }}
          iconAction={{
            icon: <Navigation />,
            label: `Navigate to ${job.shipTo}`,
            onPress: () => setMapOpen(true),
          }}
        />
      </>
    );
  }

  /* ── ASSESS ── the order against the site, line by line. */
  if (stage === "assess") {
    const set = (key: string, patch: Partial<AssessmentLine>) =>
      setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    const ready = assessmentComplete(lines);
    const open = lines.filter((l) => l.verdict === null).length;
    return (
      <>
        {/* THE PAGE IS THE ORDER — its number, nothing else (Pavan,
            2026-09-24). The customer and site were the screen before. */}
        <TopBar
          title={job.orderNo}
          onBack={onBack}
          aside={
            <>
              {/* THE TIMER, IN THE BAR (Pavan, 2026-09-24) — visible for as
                  long as the clock runs. */}
              {job.startedAt && (
                <span className="flex items-center gap-1.5 rounded-full bg-fp-card-1 px-2.5 py-1 text-sm font-medium tabular-nums text-foreground" aria-label="Time on this job">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {clock}
                </span>
              )}
              {/* A NEW TICKET IS THE ONE THING HERE — a plus, not a ···
                  menu (Pavan, 2026-09-24). */}
              {onCreateTicket && (
                <button
                  type="button"
                  aria-label="Create new ticket"
                  onClick={() => setTicketOpen(true)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-foreground active:bg-accent"
                >
                  <Plus className="size-5" />
                </button>
              )}
            </>
          }
        />
        <Body>
          <TaskOverview lines={lines.filter((l) => l.source === "order")} />
          {lines.map((l, i) => (
            <AssessmentCard
              key={l.key}
              index={i}
              line={l}
              active={Boolean(job.startedAt)}
              siteAssets={assetsAt(job.shipTo).map((a) => a.name)}
              onChange={(p) => set(l.key, p)}
              onRemove={l.source === "added" ? () => setLines((ls) => ls.filter((x) => x.key !== l.key)) : undefined}
            />
          ))}
          {job.startedAt && <Button
            variant="outline"
            className="h-11 w-full"
            onClick={() =>
              setLines((ls) => [
                ...ls,
                {
                  key: `a-${Date.now()}`,
                  source: "added",
                  assetName: "",
                  workType: WORK_TYPE_NAMES[0],
                  reported: "",
                  verdict: "added",
                  actual: "",
                  note: "",
                  photos: [],
                },
              ])
            }
          >
            <Plus className="size-4" /> Add something not on the order
          </Button>}
        </Body>
        {/* START WORK FIRST — it starts the clock; the task cards take their
            answers once it runs (Pavan, 2026-09-24). */}
        {!job.startedAt ? (
          <ActionBar
            label="Start the timer"
            disabled={Boolean(busyWith)}
            note={busyWith ? `${busyWith} is ongoing — complete it first` : undefined}
            onPress={() => {
              onPatch({
                ...syncVisits({ visits: [...job.visits, { startedAt: nowIso(), endedAt: null, technicianId: job.technicianId, override: null }] }),
                status: "Ongoing" as WorkStatus,
              });
              toast.success("Timer started");
            }}
          />
        ) : (
        <>
        {/* THE TOTAL, ABOVE THE CTA (Pavan, 2026-09-24) — every task's
            parts plus the order's fees; tap for the breakup. */}
        <button
          type="button"
          onClick={() => setBreakupOpen(true)}
          className="flex shrink-0 items-center justify-between gap-2 border-t border-fp-outline-1 bg-fp-card-1 px-4 py-3 text-left active:bg-accent"
        >
          <span className="text-sm text-muted-foreground">Quote total</span>
          <span className="flex items-center gap-1 text-base font-semibold tabular-nums text-foreground">
            {money(quoteableTotal(partsOfTasks(lines), [...orderFeesOf(job.fees), ...feesOfTasks(lines)]))}
            <ChevronRight className="size-4 text-muted-foreground" />
          </span>
        </button>
        <ActionBar
          label="Generate quote"
          disabled={!ready}
          note={
            ready
              ? undefined
              : open > 0
                ? `${open} task${open === 1 ? "" : "s"} still to assess`
                : "Describe the issue on each task"
          }
          onPress={() => {
            const count = (v: AssessmentVerdict) => lines.filter((l) => l.verdict === v).length;
            /* THE TASKS' PARTS ARE THE ORDER'S PARTS from here — the
               technician has cross-checked every one against the site. */
            onPatch({
              parts: partsOfTasks(lines),
              /* The order's own fees, then each task's — replaced, never
                 appended, so generating twice cannot count a fee twice. */
              fees: [...orderFeesOf(job.fees), ...feesOfTasks(lines)],
              assessmentLines: lines,
              /* THE ONE-LINE SUMMARY the dispatcher's sheet already reads. */
              assessment: [
                count("accurate") && `${count("accurate")} faulty as described`,
                count("different") && `${count("different")} different issue`,
                count("added") && `${count("added")} added`,
                count("skip") && `${count("skip")} no fault`,
              ]
                .filter(Boolean)
                .join(" · "),
            });
            draftLines.delete(job.id);
            toast.success("Quote generated");
          }}
        />
        <BreakupSheet open={breakupOpen} onClose={() => setBreakupOpen(false)} lines={lines} fees={orderFeesOf(job.fees)} />
        </>
        )}
      </>
    );
  }

  /* ── QUOTE ── built from the assessment. */
  if (stage === "quote") {
    const total = quoteableTotal(job.parts, job.fees);
    return (
      <>
        <TopBar title="Quote" subtitle={sub} onBack={onBack} />
        <Body>
          <div className="flex flex-col gap-2">
            <SectionTitle>The work</SectionTitle>
            <div className="flex flex-col divide-y divide-fp-outline-1">
              {toDo.map((l) => (
                <div key={l.key} className="flex flex-col gap-0.5 py-2">
                  <span className="text-sm text-foreground">
                    {lineTitle(l)}
                    {l.verdict === "added" && <span className="text-muted-foreground"> · found on site</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lineWhat(l)}
                  </span>
                </div>
              ))}
            </div>
            {skipped.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Not needed: {skipped.map(lineTitle).join(", ")}
              </p>
            )}
          </div>
          <PriceLines title="Parts" rows={job.parts.map((p) => ({ label: `${p.name}${p.qty > 1 ? ` ×${p.qty}` : ""}`, value: p.cost * p.qty }))} empty="No parts on this job." />
          <PriceLines title="Fees" rows={job.fees.map((f) => ({ label: f.name, value: f.amount }))} empty="No fees." />
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-foreground">Quote</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">{money(total)}</span>
          </div>
        </Body>
        <ActionBar
          label="Share quote with customer"
          onPress={() => {
            onPatch({
              quote: { parts: job.parts.map((p) => ({ ...p })), fees: job.fees.map((f) => ({ ...f })), total, sentAt: nowIso(), approvedAt: null },
            });
            toast.success("Quote shared");
          }}
          /* ACKNOWLEDGED ON THE CUSTOMER'S BEHALF (Pavan, 2026-09-24) — for a
             customer who agreed but is not there to confirm. The quote is
             still recorded in full; the acknowledgement says who gave it. */
          secondary="Acknowledge on behalf of the customer"
          onSecondary={() => {
            const at = nowIso();
            const tech = technicianById(job.technicianId)?.name ?? "Technician";
            onPatch({
              quote: {
                parts: job.parts.map((p) => ({ ...p })),
                fees: job.fees.map((f) => ({ ...f })),
                total,
                sentAt: at,
                approvedAt: at,
                acknowledgedBy: `${tech}, on behalf of the customer`,
              },
            });
            toast.success("Acknowledged on behalf of the customer");
          }}
        />
      </>
    );
  }

  /* ── ACKNOWLEDGEMENT ── taken on site, with a name against it. */
  if (stage === "ack") {
    return (
      <>
        <TopBar title="Customer acknowledgement" subtitle={sub} onBack={onBack} />
        <Body>
          <div className="flex items-baseline justify-between rounded-lg border border-fp-outline-1 bg-fp-card-1 p-3">
            <span className="text-sm text-muted-foreground">Quote shared</span>
            <span className="text-base font-semibold tabular-nums text-foreground">{money(job.quote?.total ?? 0)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <SectionTitle>Acknowledged by</SectionTitle>
            <Input value={ackBy} onChange={(e) => setAckBy(e.target.value)} placeholder="Customer's name" className="h-11 text-base" />
          </div>
        </Body>
        <ActionBar
          label="Customer acknowledged"
          disabled={ackBy.trim().length === 0}
          onPress={() => {
            onPatch({ quote: job.quote ? { ...job.quote, approvedAt: nowIso(), acknowledgedBy: ackBy.trim() } : null });
            toast.success("Acknowledged");
          }}
          secondary="They want changes"
          onSecondary={() => {
            /* BACK TO THE ASSESSMENT — a change to the price is a change to
               what is being done. */
            onPatch({ quote: null, assessmentLines: undefined });
            toast("Back to the assessment");
          }}
        />
      </>
    );
  }

  /* ── WORK ── */
  if (stage === "work") {
    return (
      <>
        <TopBar title="Work in progress" subtitle={sub} onBack={onBack} />
        <Body>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-foreground">{formatHours(elapsed)}</span>
            <span className="text-sm text-muted-foreground">so far</span>
          </div>
          <AssessedWork lines={toDo} />
        </Body>
        <ActionBar
          label="Mark as complete"
          onPress={() => {
            setEndedAt(nowIso());
            setEnding("full");
          }}
        />
      </>
    );
  }

  /* ── COMPLETE ── fully, or partly with parts missing. */
  if (stage === "complete") {
    const owed = parts.reduce((n, p) => n + (p.qty - (p.fittedQty ?? p.qty)), 0);
    const hours = job.startedAt && endedAt ? computedLabor(job.startedAt, endedAt) : 0;
    return (
      <>
        <TopBar title="Mark as complete" subtitle={sub} onBack={() => setEnding(null)} />
        <Body>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["full", "Everything done"],
                ["partial", "Partly done — parts missing"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={ending === k}
                onClick={() => setEnding(k)}
                className={cn(
                  "flex min-h-14 items-center justify-center rounded-lg border px-3 text-center text-sm",
                  ending === k ? "border-foreground bg-foreground text-background" : "border-fp-outline-1 text-foreground active:bg-accent"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-fp-outline-1 bg-fp-card-1 p-3">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            {/* FORMATTED, never the raw number — it printed 1.8333333333 h. */}
            <span className="text-sm text-foreground">{formatHours(hours)} of labour on this visit</span>
          </div>

          {ending === "partial" && (
            <>
              <div className="flex flex-col gap-2">
                <SectionTitle>What went on</SectionTitle>
                {parts.length === 0 && <p className="text-sm text-muted-foreground">No parts on this job — add what is missing.</p>}
                {parts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-fp-outline-1 p-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      {p.name ? (
                        <span className="truncate text-sm text-foreground">{p.name}</span>
                      ) : (
                        <Input
                          value={p.name}
                          placeholder="Part"
                          onChange={(e) => setParts((ps) => ps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                          className="h-10"
                        />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {p.qty - (p.fittedQty ?? p.qty) > 0 ? `${p.qty - (p.fittedQty ?? p.qty)} still owed` : "All fitted"}
                      </span>
                    </div>
                    <Stepper
                      value={p.fittedQty ?? p.qty}
                      max={p.qty}
                      label={`Fitted of ${p.name || `part ${i + 1}`}`}
                      suffix={`of ${p.qty}`}
                      onChange={(v) => setParts((ps) => ps.map((x, j) => (j === i ? { ...x, fittedQty: v } : x)))}
                    />
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="h-11 self-start"
                  onClick={() => setParts((ps) => [...ps, { name: "", qty: 1, cost: 0, fittedQty: 0 }])}
                >
                  <Plus className="size-4" /> Add a missing part
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <SectionTitle>What happens to the rest</SectionTitle>
                {(
                  [
                    ["continue", "Linked order", "This order stays open for the next visit, with what is still owed on it."],
                    ["neworder", "New order", "This order is completed; what is still owed becomes a new order."],
                  ] as const
                ).map(([k, title, desc]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={mode === k}
                    onClick={() => setMode(k)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left",
                      mode === k ? "border-foreground" : "border-fp-outline-1 active:bg-accent"
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border", mode === k ? "border-foreground bg-foreground text-background" : "border-fp-outline-2")}>
                      {mode === k && <Check className="size-3" />}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">{title}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <SectionTitle>Notes</SectionTitle>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Optional" className="text-base" />
          </div>
        </Body>
        <ActionBar
          label={ending === "partial" ? (mode === "continue" ? "Complete — keep order open" : "Complete — create new order") : "Complete job"}
          disabled={ending === "partial" && (owed === 0 || parts.some((p) => !p.name.trim()))}
          note={ending === "partial" && owed === 0 ? "Nothing is owed — lower what was fitted, or choose Everything done" : undefined}
          onPress={() => {
            const at = endedAt ?? nowIso();
            const closed = job.visits.map((v, i) => (i === job.visits.length - 1 && v.endedAt === null ? { ...v, endedAt: at } : v));
            if (ending === "partial") {
              onPatch({ ...syncVisits({ visits: closed }) });
              onSplit({ mode, parts, note: notes.trim() || null });
              return;
            }
            onPatch({
              techNotes: notes.trim() || null,
              ...syncVisits({ visits: closed }),
              signed: true,
              status: cfg.managerApproval ? "Needs approval" : "Completed",
            });
            toast.success(cfg.managerApproval ? `${job.orderNo} sent for approval` : `${job.orderNo} completed`);
          }}
        />
      </>
    );
  }

  /* ── DONE ── handed in. */
  const linked = job.status === "Completed — linked";
  return (
    <>
      <TopBar title={job.status === "Parts pending" ? "Waiting on parts" : "Job done"} subtitle={sub} onBack={onBack} />
      <Body>
        <div className="flex items-start gap-2 rounded-lg border border-status-success/40 bg-status-success/10 p-3">
          <Check className="mt-0.5 size-4 shrink-0 text-status-success" />
          <span className="text-sm text-foreground">
            {job.status === "Parts pending"
              ? `Handed in. ${shortfallLabel(job.parts)} still owed — this order stays open.`
              : linked
                ? `Completed. What is still owed is order ${job.spawnedReturn}.`
                : `${formatHours(job.labor)} recorded.`}
          </span>
        </div>
        {job.assessmentLines && <AssessedWork lines={job.assessmentLines.filter((l) => l.verdict !== "skip")} />}
      </Body>
      <ActionBar label="Back to my jobs" onPress={onBack} />
    </>
  );
}

/* ───────────────────────────────────────────────────────────── parts ── */

/**
 * THE DAY'S TASKS AT A GLANCE (Pavan, 2026-09-24) — the dispatcher's lines,
 * counted by the two kinds of job: servicing equipment, or adding and
 * replacing parts.
 */
function TaskOverview({ lines }: { lines: AssessmentLine[] }) {
  const kinds: TaskKind[] = ["Servicing", "Parts"];
  const count = (k: TaskKind) =>
    lines.filter((l) => (WORK_TYPE_CATEGORY[l.workType] ?? "Parts") === k).length;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-fp-banner-accent-info/30 bg-fp-banner-accent-info/10 p-3">
      <span className="flex items-baseline justify-between text-sm font-medium text-foreground">
        Today's tasks
        <span className="tabular-nums">{lines.length}</span>
      </span>
      <div className="flex flex-col gap-1">
        {kinds.map((k) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{TASK_KIND_LABEL[k]}</span>
            <span className="tabular-nums text-foreground">{count(k)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Order number, customer and ship-to address — the first thing on an order. */
const dateFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/** The booked window as two Dates — the end shares the start's day. */
function windowOf(job: ServiceOrder): { start: Date; end: Date } | null {
  if (!job.scheduledAt) return null;
  const start = new Date(job.scheduledAt);
  const end = new Date(start);
  if (job.windowEndMin != null) end.setHours(Math.floor(job.windowEndMin / 60), job.windowEndMin % 60, 0, 0);
  return { start, end };
}

/**
 * EARLY OR LATE, ABOVE THE CTA (Pavan, 2026-09-24) — only when the
 * technician is outside the booked window; inside it, nothing.
 */
function arrivalTiming(job: ServiceOrder, now = new Date()): string | null {
  const w = windowOf(job);
  if (!w) return null;
  const sameDay = w.start.toDateString() === now.toDateString();
  if (now < w.start) {
    return sameDay
      ? `You're ${formatHours((w.start.getTime() - now.getTime()) / 3_600_000)} early · window opens at ${timeFmt.format(w.start)}`
      : `You're early · this order is booked for ${dateFmt.format(w.start)}`;
  }
  if (now > w.end) {
    return sameDay
      ? `You're ${formatHours((now.getTime() - w.end.getTime()) / 3_600_000)} late · window closed at ${timeFmt.format(w.end)}`
      : `You're late · this order was booked for ${dateFmt.format(w.start)}`;
  }
  return null;
}

function OrderHeading({ job }: { job: ServiceOrder }) {
  const w = windowOf(job);
  const address = [job.city, job.state].filter(Boolean).join(", ");
  return (
    <Facts
      items={[
        { icon: <Building2 className="size-4" />, label: "Customer", value: job.customer },
        {
          icon: <MapPin className="size-4" />,
          label: "Ship-to",
          value: (
            <>
              {job.shipTo}
              {address && <span className="block text-muted-foreground">{address}</span>}
            </>
          ),
        },
        { icon: <CalendarDays className="size-4" />, label: "Scheduled date", value: w ? dateFmt.format(w.start) : "Any day" },
        {
          icon: <Clock className="size-4" />,
          label: "Scheduled window",
          value: w ? (job.windowEndMin != null ? `${timeFmt.format(w.start)} – ${timeFmt.format(w.end)}` : timeFmt.format(w.start)) : "Any time",
        },
      ]}
    />
  );
}

/**
 * ONE TASK TO ASSESS (Pavan, 2026-09-24):
 *   asset · work type on the left, the kind of job as a chip on the right,
 *   the reported fault under it, then an "Assessment" dropdown with the three
 *   answers, and "Add assessment notes" — optional — which opens a bottom
 *   sheet for a note and photos, kept on Submit and reopened from the same
 *   button.
 */
function AssessmentCard({
  index,
  line,
  active,
  siteAssets,
  onChange,
  onRemove,
}: {
  index: number;
  line: AssessmentLine;
  siteAssets: string[];
  /** Work has started — the task takes its answer. Before that it is read-only. */
  active: boolean;
  onChange: (p: Partial<AssessmentLine>) => void;
  onRemove?: () => void;
}) {
  const added = line.source === "added";
  const [pickOpen, setPickOpen] = React.useState(false);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const chosen = VERDICTS.find((v) => v.key === line.verdict);
  const hasNotes = Boolean(line.subject?.trim()) || line.note.trim().length > 0 || line.photos.length > 0;

  const done = taskDone(line);
  return (
    <div className="flex items-start gap-3">
    {/* NUMBERED, THEN TICKED (Pavan, 2026-09-24) — each task's number on
        its left, replaced by a tick once the task has its answer. */}
    <span
      aria-label={done ? `Task ${index + 1} done` : `Task ${index + 1}`}
      className={cn(
        "mt-3 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        done ? "bg-status-success text-background" : "border border-fp-outline-2 text-muted-foreground"
      )}
    >
      {done ? <Check className="size-3.5" /> : index + 1}
    </span>
    <section className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-3">
      {added ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Found on site</span>
            <span className="flex items-center gap-1">
              <KindChip workType={line.workType} />
              {onRemove && (
                <button type="button" onClick={onRemove} aria-label="Remove this task" className="flex size-11 items-center justify-center rounded-md text-muted-foreground active:bg-accent">
                  <X className="size-4" />
                </button>
              )}
            </span>
          </div>
          <Input value={line.assetName} onChange={(e) => onChange({ assetName: e.target.value })} placeholder="Asset" className="h-11" />
          {/* THE PHONE'S OWN PICKER — a native select for one choice from a
              fixed list. */}
          <select
            value={line.workType}
            onChange={(e) => onChange({ workType: e.target.value })}
            aria-label="Work type"
            className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground dark:bg-input/30"
          >
            {WORK_TYPE_NAMES.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          <Textarea value={line.actual} onChange={(e) => onChange({ actual: e.target.value })} rows={2} placeholder="What it needs" className="text-base" />
        </>
      ) : (
        /* THE TASK IN ONE BLOCK (Pavan, 2026-09-24): the asset, its work
           type, and under them the reported fault — with the kind of job as
           a chip. */
        <div className="flex flex-col gap-2 rounded-md bg-fp-card-1 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-medium text-foreground">{line.assetName || `Task ${index + 1}`}</span>
              <span className="text-xs text-muted-foreground">{line.workType}</span>
            </div>
            <KindChip workType={line.workType} />
          </div>
          <div className="flex flex-col border-t border-fp-outline-1 pt-2">
            <span className="text-xs text-muted-foreground">Reported fault</span>
            <span className="text-sm text-foreground">{line.reported || "—"}</span>
          </div>
        </div>
      )}

      {active && (
        <>
          {!added && (
            <button
              type="button"
              onClick={() => setPickOpen(true)}
              aria-label={`Assessment for ${line.assetName}`}
              className="flex h-11 items-center justify-between rounded-md border border-input bg-transparent px-3 text-left text-sm active:bg-accent dark:bg-input/30"
            >
              <span className={chosen ? "text-foreground" : "text-muted-foreground"}>
                {chosen?.label ?? "Assessment"}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          )}
          {line.verdict === "different" && !added && (
            <FoundIssue
              value={
                line.found ?? { assetName: line.assetName, workType: line.workType, description: "" }
              }
              siteAssets={siteAssets}
              onChange={(found) => onChange({ found })}
            />
          )}
          {line.verdict !== null && (
            <TaskParts
              parts={line.parts ?? []}
              workType={line.found?.workType ?? line.workType}
              onChange={(parts) => onChange({ parts })}
            />
          )}
          {line.verdict !== null && <TaskFees fees={line.fees ?? []} onChange={(fees) => onChange({ fees })} />}
          <Button variant="ghost" className="h-11 justify-start px-2" onClick={() => setNotesOpen(true)}>
            {hasNotes ? <StickyNote className="size-4" /> : <Plus className="size-4" />}
            {hasNotes
              ? `${line.subject?.trim() || "Assessment notes"}${line.photos.length ? ` · ${line.photos.length} photo${line.photos.length === 1 ? "" : "s"}` : ""}`
              : "Add assessment notes"}
          </Button>
        </>
      )}

      <BottomSheet open={pickOpen} onClose={() => setPickOpen(false)} title="Assessment">
        <div className="flex flex-col">
          {VERDICTS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => {
                onChange({ verdict: v.key, parts: line.parts ?? bookParts(line.workType) });
                setPickOpen(false);
              }}
              className="flex h-11 items-center justify-between rounded-md px-2 text-left text-sm text-foreground active:bg-accent"
            >
              {v.label}
              {line.verdict === v.key && <Check className="size-4" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      <NotesSheet
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title={line.assetName || "Assessment notes"}
        subject={line.subject ?? ""}
        note={line.note}
        photos={line.photos}
        onSubmit={(subject, note, photos) => {
          onChange({ subject, note, photos });
          setNotesOpen(false);
          toast.success("Assessment notes saved");
        }}
      />
    </section>
    </div>
  );
}

/**
 * THE NEW TICKET — services (asset, work type, reported fault) and any
 * additional fees. Customer, site and technician come from the order it was
 * raised on.
 */
function NewTicket({
  job,
  onBack,
  onCreate,
}: {
  job: ServiceOrder;
  onBack: () => void;
  onCreate: (req: TicketRequest) => void;
}) {
  const siteAssets = assetsAt(job.shipTo);
  const blankService = () => ({ assetId: "", assetName: "", assetType: "", workType: WORK_TYPE_NAMES[0], fault: "" });
  const [services, setServices] = React.useState([blankService()]);
  const [fees, setFees] = React.useState<{ name: string; amount: number }[]>([]);
  const setService = (i: number, p: Partial<ReturnType<typeof blankService>>) =>
    setServices((xs) => xs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const field = "h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground dark:bg-input/30";
  return (
    <>
      <TopBar title="New ticket" subtitle={`${job.customer} · ${job.shipTo}`} onBack={onBack} />
      <Body>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Type of service</SectionTitle>
            <Button variant="ghost" size="sm" className="h-9" onClick={() => setServices((xs) => [...xs, blankService()])}>
              <Plus className="size-4" /> Add service
            </Button>
          </div>
          {services.map((sv, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-fp-outline-1 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Service {i + 1}</span>
                {services.length > 1 && (
                  <button type="button" aria-label={`Remove service ${i + 1}`} onClick={() => setServices((xs) => xs.filter((_, j) => j !== i))} className="flex size-11 items-center justify-center rounded-md text-muted-foreground active:bg-accent">
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <select
                value={sv.workType}
                onChange={(e) => setService(i, { workType: e.target.value })}
                aria-label={`Work type for service ${i + 1}`}
                className={field}
              >
                {WORK_TYPE_NAMES.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              {siteAssets.length > 0 ? (
                <select
                  value={sv.assetId}
                  onChange={(e) => {
                    const a = siteAssets.find((x) => x.id === e.target.value);
                    setService(i, { assetId: a?.id ?? "", assetName: a?.name ?? "", assetType: a?.type ?? "" });
                  }}
                  aria-label={`Asset for service ${i + 1}`}
                  className={field}
                >
                  <option value="">Asset</option>
                  {siteAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              ) : (
                <Input value={sv.assetName} onChange={(e) => setService(i, { assetName: e.target.value })} placeholder="Asset" className="h-11" />
              )}
              <Textarea value={sv.fault} onChange={(e) => setService(i, { fault: e.target.value })} rows={2} placeholder="Reported fault" className="text-base" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Additional fees</SectionTitle>
            <Button variant="ghost" size="sm" className="h-9" onClick={() => setFees((xs) => [...xs, { name: "", amount: 0 }])}>
              <Plus className="size-4" /> Add fee
            </Button>
          </div>
          {fees.length === 0 && <p className="text-sm text-muted-foreground">No additional fees.</p>}
          {fees.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={f.name} onChange={(e) => setFees((xs) => xs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Fee" aria-label={`Fee ${i + 1}`} className="h-11 flex-1" />
              <Input
                inputMode="decimal"
                value={f.amount ? String(f.amount) : ""}
                onChange={(e) => setFees((xs) => xs.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 } : x)))}
                placeholder="0.00"
                aria-label={`Amount of ${f.name || `fee ${i + 1}`}`}
                className="h-11 w-24 tabular-nums"
              />
              <button type="button" aria-label={`Remove ${f.name || `fee ${i + 1}`}`} onClick={() => setFees((xs) => xs.filter((_, j) => j !== i))} className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-accent">
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </Body>
      <ActionBar
        label="Create ticket"
        onPress={() =>
          onCreate({
            assets: services,
            fees: fees.filter((f) => f.name.trim() || f.amount > 0),
          })
        }
      />
    </>
  );
}

/**
 * WHAT WAS ACTUALLY FOUND, when it is a different issue (Pavan, 2026-09-24):
 * the asset, the type of issue, a description, and the parts it needs.
 */
function FoundIssue({
  value,
  siteAssets,
  onChange,
}: {
  value: NonNullable<AssessmentLine["found"]>;
  siteAssets: string[];
  onChange: (v: NonNullable<AssessmentLine["found"]>) => void;
}) {
  const field = "h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground dark:bg-input/30";
  const set = (p: Partial<typeof value>) => onChange({ ...value, ...p });
  return (
    <div className="flex flex-col gap-2 rounded-md border border-fp-outline-1 p-3">
      <span className="text-xs font-medium text-muted-foreground">What you found</span>
      {siteAssets.length > 0 ? (
        <select value={value.assetName} onChange={(e) => set({ assetName: e.target.value })} aria-label="Asset" className={field}>
          <option value="">Asset</option>
          {siteAssets.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      ) : (
        <Input value={value.assetName} onChange={(e) => set({ assetName: e.target.value })} placeholder="Asset" className="h-11" />
      )}
      <select value={value.workType} onChange={(e) => set({ workType: e.target.value })} aria-label="Type of issue" className={field}>
        {WORK_TYPE_NAMES.map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </select>
      <Textarea value={value.description} onChange={(e) => set({ description: e.target.value })} rows={3} placeholder="Description" className="text-base" />
    </div>
  );
}

/**
 * A TASK'S PARTS, EACH WITH ITS COST (Pavan, 2026-09-24) — one or many.
 * Name and remove on top; quantity and unit cost under. The amounts are in
 * the breakup behind the total — the row has no room for a third figure.
 */
function TaskParts({
  parts,
  workType,
  onChange,
}: {
  parts: PartLine[];
  workType: string;
  onChange: (parts: PartLine[]) => void;
}) {
  const setPart = (i: number, p: Partial<PartLine>) => onChange(parts.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="flex flex-col gap-2 rounded-md border border-fp-outline-1 p-3">
      <span className="text-xs font-medium text-muted-foreground">Parts</span>
      {parts.length === 0 && <p className="text-sm text-muted-foreground">No parts.</p>}
      {parts.map((p, i) => (
        <div key={i} className="flex flex-col gap-2 border-b border-fp-outline-1 pb-3 last:border-b-0 last:pb-0">
          <div className="flex items-center gap-2">
            <Input value={p.name} onChange={(e) => setPart(i, { name: e.target.value })} placeholder="Part" aria-label={`Part ${i + 1}`} className="h-11 flex-1" autoFocus={!p.name} />
            <button type="button" aria-label={`Remove ${p.name || `part ${i + 1}`}`} onClick={() => onChange(parts.filter((_, j) => j !== i))} className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-accent">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Stepper value={p.qty} max={99} label={`Quantity of ${p.name || `part ${i + 1}`}`} onChange={(v) => setPart(i, { qty: Math.max(1, v) })} />
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={p.cost === 0 ? "" : p.cost}
                onChange={(e) => setPart(i, { cost: Math.max(0, Number(e.target.value) || 0) })}
                placeholder="0"
                aria-label={`Cost of ${p.name || `part ${i + 1}`}, each`}
                className="h-11 pl-6 tabular-nums"
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        variant="ghost"
        className="h-11 self-start px-2"
        onClick={() => {
          /* THE PRICE BOOK'S NEXT PART FOR THIS WORK TYPE, when there is one
             not yet listed; a blank line otherwise. */
          const book = WORK_TYPES[workType]?.parts.find((b) => !parts.some((p) => p.name === b.name));
          onChange([...parts, book ? { ...book } : { name: "", qty: 1, cost: 0 }]);
        }}
      >
        <Plus className="size-4" /> Add part
      </Button>
    </div>
  );
}

/** A TASK'S FEES (Pavan, 2026-09-24) — one or many; a name and an amount each. */
function TaskFees({ fees, onChange }: { fees: FeeLine[]; onChange: (fees: FeeLine[]) => void }) {
  const setFee = (i: number, p: Partial<FeeLine>) => onChange(fees.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="flex flex-col gap-2 rounded-md border border-fp-outline-1 p-3">
      <span className="text-xs font-medium text-muted-foreground">Fees</span>
      {fees.length === 0 && <p className="text-sm text-muted-foreground">No fees.</p>}
      {fees.map((f, i) => (
        <div key={i} className="flex flex-col gap-2 border-b border-fp-outline-1 pb-3 last:border-b-0 last:pb-0">
          <div className="flex items-center gap-2">
            <Input value={f.name} onChange={(e) => setFee(i, { name: e.target.value })} placeholder="Fee" aria-label={`Fee ${i + 1}`} className="h-11 flex-1" autoFocus={!f.name} />
            <button type="button" aria-label={`Remove ${f.name || `fee ${i + 1}`}`} onClick={() => onChange(fees.filter((_, j) => j !== i))} className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-accent">
              <X className="size-4" />
            </button>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={f.amount === 0 ? "" : f.amount}
              onChange={(e) => setFee(i, { amount: Math.max(0, Number(e.target.value) || 0) })}
              placeholder="0"
              aria-label={`Amount of ${f.name || `fee ${i + 1}`}`}
              className="h-11 pl-6 tabular-nums"
            />
          </div>
        </div>
      ))}
      <Button variant="ghost" className="h-11 self-start px-2" onClick={() => onChange([...fees, { name: "", amount: 0 }])}>
        <Plus className="size-4" /> Add fee
      </Button>
    </div>
  );
}

/** THE BREAKUP behind the quote total — task by task, then the fees. */
function BreakupSheet({
  open,
  onClose,
  lines,
  fees,
}: {
  open: boolean;
  onClose: () => void;
  lines: AssessmentLine[];
  fees: { name: string; amount: number }[];
}) {
  const tasks = lines
    .map((l, i) => ({
      l,
      n: i + 1,
      parts: (l.parts ?? []).filter((p) => p.name.trim()),
      taskFees: (l.fees ?? []).filter((f) => f.name.trim()),
    }))
    .filter((t) => t.l.verdict !== null && t.parts.length + t.taskFees.length > 0);
  const total = quoteableTotal(partsOfTasks(lines), [...fees, ...feesOfTasks(lines)]);
  return (
    <BottomSheet open={open} onClose={onClose} title="Quote total">
      <div className="flex flex-col gap-4">
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">No parts or fees on the tasks yet.</p>}
        {tasks.map(({ l, n, parts, taskFees }) => (
          <div key={l.key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              {n}. {lineTitle(l) || `Task ${n}`}
            </span>
            {parts.map((p, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {p.name} · {p.qty} × {money(p.cost)}
                </span>
                <span className="tabular-nums text-foreground">{money(p.qty * p.cost)}</span>
              </div>
            ))}
            {taskFees.map((f, i) => (
              <div key={`f-${i}`} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{f.name}</span>
                <span className="tabular-nums text-foreground">{money(f.amount)}</span>
              </div>
            ))}
          </div>
        ))}
        {fees.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Order fees</span>
            {fees.map((f, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{f.name}</span>
                <span className="tabular-nums text-foreground">{money(f.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="text-lg font-semibold tabular-nums text-foreground">{money(total)}</span>
        </div>
      </div>
    </BottomSheet>
  );
}

/** Servicing or Replacement — the kind of job, from the work type. */
/* THE KIND, IN COLOUR (Pavan, 2026-09-24) — the DS's pastel badges:
   Servicing purple (violet), Replacement orange (amber). Categorical, so
   the colour tells the two apart and says nothing about state. */
function KindChip({ workType }: { workType: string }) {
  const servicing = WORK_TYPE_CATEGORY[workType] === "Servicing";
  return (
    <Badge variant={servicing ? "pastel-violet" : "pastel-amber"} className="shrink-0">
      {servicing ? "Servicing" : "Replacement"}
    </Badge>
  );
}

/**
 * ASSESSMENT NOTES, IN A FULL BOTTOM SHEET (Pavan, 2026-09-24) — room to
 * write: a Subject, a Description that takes the rest of the screen, and
 * photos. Edited as a draft and kept only on Submit, so closing the sheet
 * changes nothing.
 */
function NotesSheet({
  open,
  onClose,
  title,
  subject,
  note,
  photos,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subject: string;
  note: string;
  photos: string[];
  onSubmit: (subject: string, note: string, photos: string[]) => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [draftSubject, setDraftSubject] = React.useState(subject);
  const [draftNote, setDraftNote] = React.useState(note);
  const [draftPhotos, setDraftPhotos] = React.useState(photos);
  React.useEffect(() => {
    if (open) {
      setDraftSubject(subject);
      setDraftNote(note);
      setDraftPhotos(photos);
    }
  }, [open, subject, note, photos]);
  return (
    <BottomSheet
      open={open}
      full
      onClose={onClose}
      title={title}
      footer={
        <Button
          className="h-11 w-full text-base"
          onClick={() => onSubmit(draftSubject.trim(), draftNote.trim(), draftPhotos)}
        >
          Submit
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Subject</span>
          <Input value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} placeholder="Subject" className="h-11 text-base" />
        </div>
        <div className="flex min-h-40 flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Description</span>
          <Textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="Description"
            className="min-h-0 flex-1 resize-none text-base"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {draftPhotos.map((src, i) => (
            <div key={src} className="relative size-16 overflow-hidden rounded-md border border-fp-outline-1">
              <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setDraftPhotos((ps) => ps.filter((p) => p !== src))}
                className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex size-16 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-fp-outline-2 text-[11px] text-muted-foreground active:bg-accent"
          >
            <Camera className="size-4" />
            Photo
          </button>
          {/* `capture` opens the camera on a phone; a file picker on desktop. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) setDraftPhotos((ps) => [...ps, ...files.map((f) => URL.createObjectURL(f))]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </BottomSheet>
  );
}

/** The work as assessed — what the technician is actually there to do. */
function AssessedWork({ lines }: { lines: AssessmentLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>The work</SectionTitle>
      <div className="flex flex-col divide-y divide-fp-outline-1 rounded-lg border border-fp-outline-1 px-3">
        {lines.map((l) => (
          <div key={l.key} className="flex flex-col gap-0.5 py-2">
            <span className="text-sm text-foreground">{lineTitle(l)}</span>
            <span className="text-xs text-muted-foreground">{lineWhat(l)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceLines({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty: string }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>{title}</SectionTitle>
      <div className="flex flex-col divide-y divide-fp-outline-1">
        {rows.map((r, i) => (
          <div key={`${r.label}-${i}`} className="flex items-baseline gap-3 py-2">
            <span className="flex-1 text-sm text-foreground">{r.label}</span>
            <span className="text-sm tabular-nums text-foreground">{money(r.value)}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="py-2 text-sm text-muted-foreground">{empty}</p>}
      </div>
    </div>
  );
}

/** − n + at 44px — a number typed with a glove on is a number typed wrong. */
function Stepper({
  value,
  max,
  onChange,
  label,
  suffix,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={label}>
      <button type="button" aria-label="One fewer" disabled={value <= 0} onClick={() => onChange(value - 1)} className="flex size-11 items-center justify-center rounded-md border border-fp-outline-1 active:bg-accent disabled:opacity-40">
        <Minus className="size-4" />
      </button>
      <span className="min-w-12 text-center text-sm tabular-nums text-foreground">
        {value}
        {suffix && <span className="block text-[11px] text-muted-foreground">{suffix}</span>}
      </span>
      <button type="button" aria-label="One more" disabled={value >= max} onClick={() => onChange(value + 1)} className="flex size-11 items-center justify-center rounded-md border border-fp-outline-1 active:bg-accent disabled:opacity-40">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
