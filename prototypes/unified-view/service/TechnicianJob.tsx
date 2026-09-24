import * as React from "react";
import {
  SkipForward,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Bold,
  Building2,
  ClipboardList,
  Pause,
  Play,
  Send,
  List,
  ListOrdered,
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
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  WORK_TYPE_CATEGORY,
  WORK_TYPE_NAMES,
  WORK_TYPES,
  assetsAt,
  formatHours,
  money,
  quoteableTotal,
  shortfallLabel,
  syncVisits,
  type AssessmentLine,
  type FeeLine,
  type PartLine,
  type ServiceVisit,
  jobsOf,
  FEE_BOOK,
  pausedHours,
  pausedNow,
  visitHours,
  type ServiceOrder,
  type WorkStatus,
} from "./work";
import { useServiceSettings, type ReturnMode } from "./settings";
import { INVENTORY } from "./catalog";

/** The shelf, for part-name suggestions. */
const PART_OPTIONS = INVENTORY.map((p) => ({ name: p.part, cost: p.cost }));
import { ActionBar, Body, Facts, SectionTitle, TopBar } from "./TechnicianMobile";
import { BottomSheet } from "./TechnicianHome";
import { PendingStrip, type PendingItem } from "../PendingStrip";

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

/** The price book's parts for a work type — where a task's parts list starts. */
const bookParts = (workType: string): PartLine[] => (WORK_TYPES[workType]?.parts ?? []).map((p) => ({ ...p }));

/** Every answered task's parts, as one list — the same part at the same price adds up. */
function partsOfTasks(lines: AssessmentLine[]): PartLine[] {
  const out: PartLine[] = [];
  for (const l of lines) {
    if (l.verdict === "skip") continue;
    for (const p of l.parts ?? []) {
      if (!p.name.trim()) continue;
      const hit = out.find((x) => x.name === p.name && x.cost === p.cost);
      if (hit) hit.qty += p.qty;
      else out.push({ name: p.name, qty: p.qty, cost: p.cost });
    }
  }
  return out;
}

/**
 * THE VISIT'S CLOCK, to the second — worked time only: paused time is left
 * out (Pavan, 2026-09-24). Ticks while the visit runs and is not paused.
 */
function useVisitClock(visit: ServiceVisit | undefined): { label: string; hours: number } {
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  const live = Boolean(visit && visit.endedAt === null);
  React.useEffect(() => {
    if (!live) return undefined;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [live]);
  if (!visit) return { label: "00:00:00", hours: 0 };
  const end = visit.endedAt ? new Date(visit.endedAt).getTime() : Date.now();
  const ms = end - new Date(visit.startedAt).getTime() - pausedHours(visit) * 3_600_000;
  const secs = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    label: `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`,
    hours: secs / 3600,
  };
}

/* WHY A PAUSE (Pavan, 2026-09-24). */
const PAUSE_REASONS = ["Break", "Waiting on customer", "Fetching a part", "Other"];

/* COMMON SKIP REASONS (Pavan, 2026-09-24) — pick one, type one, or both. */
const SKIP_REASONS = ["Not needed", "Customer declined", "No access", "Parts unavailable"];

type Stage = "travel" | "assess" | "quote" | "ack" | "ready" | "work" | "complete" | "done";

const nowIso = () => new Date().toISOString();

/** The order's own requirements, as the lines to assess. */
function linesFromOrder(job: ServiceOrder): AssessmentLine[] {
  const rows = job.assets.filter((a) => a.assetName || a.fault || a.workType);
  const src = rows.length
    ? rows
    : [{ assetName: job.assetName, workType: job.workType, fault: job.fault }];
  /* ONE JOB PER WORK TYPE (Pavan, 2026-09-24, option A) — an asset with a
     pump replace and a leak check is two jobs, each priced, confirmed or
     skipped on its own. The asset name repeats. */
  return src.flatMap((a, i) =>
    /* THE MAIN ROW AND ITS SUB-ROWS — each with its own description. */
    jobsOf({ workType: a.workType, fault: a.fault, subJobs: "subJobs" in a ? a.subJobs : undefined })
      /* A sub-row not yet given a work type is not a job yet. */
      .filter((j, k) => k === 0 || j.workType)
      .map((j, k) => ({ a, i, j, k }))
  ).map(({ a, i, j, k }) => ({
    key: `o-${i}-${k}`,
    source: "order",
    assetName: a.assetName || "Asset",
    workType: j.workType,
    reported: j.fault,
    verdict: null,
    actual: "",
    note: "",
    photos: [],
    parts: bookParts(j.workType),
  }));
}

/** What a task comes to, in words — the fault confirmed, or what was found instead. */
const lineWhat = (l: AssessmentLine) =>
  l.verdict === "accurate"
    ? l.reported
    : l.verdict === "different"
      ? [l.found?.workType, l.found?.description || l.note].filter(Boolean).join(" — ") || "Different issue"
      : l.source === "added"
        ? l.actual
        : l.reported;

/** A job's order line or site finding, as the customer will see it on the quote. */
const lineTitle = (l: AssessmentLine) => [l.assetName, l.workType].filter(Boolean).join(" · ");

/** A new ticket raised from site — only what the technician adds. */
export interface TicketRequest {
  assets: { assetId: string; assetName: string; assetType: string; workType: string; fault: string }[];
  fees: { name: string; amount: number }[];
  /** PARTS ON A TICKET FROM SITE (Pavan, 2026-09-24). */
  parts: PartLine[];
}

export interface SplitRequest {
  mode: ReturnMode;
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
  /* THE CURRENT VISIT — its clock, and whether it is paused. */
  const visit = job.visits[job.visits.length - 1];
  const { label: clock, hours: elapsed } = useVisitClock(job.completedAt ? undefined : visit);
  const paused = pausedNow(visit);
  const setVisit = (v: ServiceVisit) =>
    onPatch(syncVisits({ visits: job.visits.map((x, i) => (i === job.visits.length - 1 ? v : x)) }));
  const pauseWork = (reason: string) => {
    if (!visit) return;
    setVisit({ ...visit, pauses: [...(visit.pauses ?? []), { at: nowIso(), until: null, reason }] });
    toast(`Paused · ${reason}`);
  };
  const resumeWork = () => {
    if (!visit) return;
    setVisit({ ...visit, pauses: (visit.pauses ?? []).map((p) => (p.until === null ? { ...p, until: nowIso() } : p)) });
    toast.success("Work resumed");
  };
  const [pauseOpen, setPauseOpen] = React.useState(false);
  /** The timer in the bar — tap to pause; tap again, or Resume, to carry on. */
  const timer = job.startedAt && !job.completedAt && (
    <button
      type="button"
      onClick={() => (paused ? resumeWork() : setPauseOpen(true))}
      aria-label={paused ? "Resume work" : "Pause work"}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium tabular-nums active:bg-accent",
        paused ? "bg-fp-banner-accent-caution/15 text-fp-banner-accent-caution" : "bg-fp-card-1 text-foreground"
      )}
    >
      {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5 text-muted-foreground" />}
      {clock}
    </button>
  );
  /** While paused, the one act is Resume. */
  const pausedBar = paused && (
    <ActionBar
      note={`Paused · ${(visit?.pauses ?? []).find((p) => p.until === null)?.reason ?? ""}`}
      label="Resume work"
      onPress={resumeWork}
    />
  );
  /* THE ASSESSMENT SHEET — on the job screen and, after approval, the work
     screen, where editing becomes a request. */
  const [assessOpen, setAssessOpen] = React.useState(false);
  const assessmentSheet = (
    <SiteAssessmentSheet
      open={assessOpen}
      onClose={() => setAssessOpen(false)}
      value={job.siteAssessment}
      approved={Boolean(job.quote?.approvedAt)}
      onSave={(html, photos) => {
        const was = job.siteAssessment;
        onPatch({
          siteAssessment: {
            html,
            photos,
            submittedAt: was?.submittedAt ?? null,
            /* A granted edit is one session: closing the sheet uses it up. */
            editRequestedAt: null,
            editAllowed: false,
          },
          ...(was?.submittedAt ? { assessment: plainText(html).slice(0, 140) || null } : {}),
        });
      }}
      onSubmit={(html, photos) => {
        onPatch({ siteAssessment: { html, photos, submittedAt: nowIso() } });
        setAssessOpen(false);
        toast.success("Assessment submitted");
      }}
      onRequestEdit={() => {
        if (job.siteAssessment) onPatch({ siteAssessment: { ...job.siteAssessment, editRequestedAt: nowIso() } });
        toast("Edit requested", { description: "The dispatcher can allow it on the order." });
      }}
    />
  );
  const pauseSheet = <PauseSheet open={pauseOpen} onClose={() => setPauseOpen(false)} onPause={(r) => { pauseWork(r); setPauseOpen(false); }} />;

  const [lines, setLinesRaw] = React.useState<AssessmentLine[]>(
    () => job.assessmentLines ?? draftLines.get(job.id) ?? linesFromOrder(job)
  );
  const setLines = (next: React.SetStateAction<AssessmentLine[]>) =>
    setLinesRaw((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      draftLines.set(job.id, v);
      return v;
    });
  const [ending, setEnding] = React.useState<"full" | "partial" | null>(null);
  const [endedAt, setEndedAt] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState(job.techNotes ?? "");
  const [parts, setParts] = React.useState<PartLine[]>(() =>
    job.parts.map((p) => ({ ...p, fittedQty: p.fittedQty ?? p.qty }))
  );
  const [mode, setMode] = React.useState<ReturnMode>(cfg.returnMode);
  const [mapOpen, setMapOpen] = React.useState(false);
  const [ticketOpen, setTicketOpen] = React.useState(false);
  const [breakupOpen, setBreakupOpen] = React.useState(false);

  /* THE ASSESSMENT IS THE FIRST STEP (Pavan, 2026-09-24): the quote waits on
     a SUBMITTED site assessment, not on a verdict per task. */
  const handedIn = Boolean(job.completedAt) || job.status === "Parts pending" || job.status === "Completed — linked";

  const stage: Stage = handedIn
    ? "done"
    : ending
      ? "complete"
      : !job.arrivedAt
        ? "travel"
        : /* THE CLOCK STARTS BEFORE THE ASSESSMENT (Pavan, 2026-09-24):
             looking at the job is part of the job. */
          /* ONE ON-SITE SCREEN until the quote is approved (Pavan,
             2026-09-24): assessment, jobs, fees, then Send quote → Quote
             approved. Approval is what moves it on to the work. */
          !job.assessmentLines || (cfg.fieldQuote && !job.quote?.approvedAt)
          ? "assess"
          : "work";

  const sub = `${job.orderNo} · ${job.shipTo}`;
  const toDo = (job.assessmentLines ?? lines).filter((l) => l.verdict !== "skip");

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
          {/* A RETURN VISIT SAYS SO (2026-09-24) — rolled over for parts. */}
          {job.partNeeded && (
            <div className="rounded-lg border border-fp-banner-accent-caution/30 bg-fp-banner-accent-caution/10 px-3 py-2.5 text-sm text-foreground">
              <span className="font-medium">Parts pending</span> · {job.partNeeded}
            </div>
          )}
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
    const submitted = Boolean(job.siteAssessment?.submittedAt);
    const unnamed = lines.filter((l) => l.source === "added" && !l.assetName.trim()).length;
    const ready = submitted && unnamed === 0;
    /* THE PENDING STEPS, IN ORDER (Pavan, 2026-09-24). The first three hold
       the quote back; the last two only remind. */
    const pending: PendingItem[] = [
      !submitted && { key: "assess", label: "Submit the assessment" },
      unnamed > 0 && { key: "name", label: `Name the ${unnamed === 1 ? "job" : `${unnamed} jobs`} you added` },
      job.fees.length === 0 && { key: "fees", label: "Add fees" },
      (job.siteAssessment?.photos.length ?? 0) === 0 && { key: "photo", label: "Add a photo to the assessment" },
    ].filter((x): x is PendingItem => Boolean(x));
    /* SENT AND WAITING — the customer is deciding offline, so what they were
       sent is what stays on screen: jobs and money lock until it is approved
       or rejected. */
    const sent = Boolean(job.quote?.sentAt) && !job.quote?.approvedAt;
    const editable = Boolean(job.startedAt) && !sent;
    const total = quoteableTotal(partsOfTasks(lines), job.fees);
    const setFees = (fees: FeeLine[]) => onPatch({ fees });
    /** SEND THE QUOTE — the primary act, and the breakup sheet's too. A quote
        already out goes again with the same figures. */
    const sendQuote = () => {
      if (sent && job.quote) {
        onPatch({ quote: { ...job.quote, sentAt: nowIso() } });
        toast.success("Quote sent again");
        return;
      }
      /* THE JOBS' PARTS ARE THE ORDER'S PARTS from here — the technician
         has confirmed every one against the site. */
      const parts = partsOfTasks(lines);
      onPatch({
        parts,
        assessmentLines: lines,
        /* THE ONE-LINE SUMMARY the dispatcher's sheet already reads — the
           start of the technician's own notes. */
        assessment: plainText(job.siteAssessment?.html ?? "").slice(0, 140) || null,
        /* A QUOTE IS A STORED SNAPSHOT, never recomputed. */
        quote: cfg.fieldQuote
          ? { parts: parts.map((p) => ({ ...p })), fees: job.fees.map((f) => ({ ...f })), total, sentAt: nowIso(), approvedAt: null }
          : job.quote,
      });
      draftLines.delete(job.id);
      toast.success(cfg.fieldQuote ? "Quote sent to customer" : "Saved");
    };
    return (
      <>
        {/* THE PAGE IS THE ORDER — its number, nothing else (Pavan,
            2026-09-24). The customer and site were the screen before. */}
        <TopBar
          title={job.orderNo}
          onBack={onBack}
          aside={
            <>
              {/* THE TIMER, IN THE BAR (Pavan, 2026-09-24) — tap to pause. */}
              {timer}
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
          {/* 1 · THE ASSESSMENT FIRST — one for the visit (option B). */}
          {job.startedAt && (
            <SiteAssessmentRow
              value={job.siteAssessment}
              onOpen={() => setAssessOpen(true)}
            />
          )}
          {/* 2 · THE JOBS — the dispatcher's and any added on site, each with
              its own parts. */}
          {lines.map((l, i) => (
            <AssessmentCard
              key={l.key}
              index={i}
              line={l}
              active={Boolean(job.startedAt)}
              locked={!editable}
              onChange={(p) => set(l.key, p)}
              onRemove={l.source === "added" ? () => setLines((ls) => ls.filter((x) => x.key !== l.key)) : undefined}
            />
          ))}
          {editable && <Button
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
                  parts: [],
                },
              ])
            }
          >
            <Plus className="size-4" /> Add a job
          </Button>}
          {/* 3 · FEES — ONE section for the order, not one per job (Deepika,
              2026-09-24). The dispatcher's fees are already in it. */}
          {job.startedAt && (
            /* THE FEES UNIT, SHAPED LIKE A SERVICE CARD (Pavan, 2026-09-24) —
               the main box, each fee a card inside it. */
            <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-3">
              <span className="text-sm font-semibold text-foreground">Fees</span>
              <TaskFees fees={job.fees} onChange={setFees} locked={!editable} />
            </section>
          )}
        </Body>
        {/* START WORK FIRST — it starts the clock; the jobs take their parts
            once it runs (Pavan, 2026-09-24). */}
        {!job.startedAt ? (
          <ActionBar
            label="Start work"
            disabled={Boolean(busyWith)}
            note={busyWith ? `${busyWith} is ongoing — complete it first` : undefined}
            onPress={() => {
              onPatch({
                ...syncVisits({ visits: [...job.visits, { startedAt: nowIso(), endedAt: null, technicianId: job.technicianId, override: null }] }),
                status: "Ongoing" as WorkStatus,
              });
              toast.success("Work started");
            }}
          />
        ) : paused ? (
          pausedBar
        ) : (
        <>
        {!sent && pending.length > 0 && (
          <div className="shrink-0 border-t border-fp-outline-1 bg-fp-surface-1a px-4 py-2.5">
            <PendingStrip pending={pending} />
          </div>
        )}
        {/* THE TOTAL, ABOVE THE CTA (Pavan, 2026-09-24) — the jobs' parts
            plus the order's fees; tap for the breakup. */}
        <button
          type="button"
          onClick={() => setBreakupOpen(true)}
          className="flex shrink-0 items-center justify-between gap-2 border-t border-fp-outline-1 bg-fp-card-1 px-4 py-3 text-left active:bg-accent"
        >
          <span className="text-sm text-muted-foreground">Quote total</span>
          <span className="flex items-center gap-1 text-base font-semibold tabular-nums text-foreground">
            {money(total)}
            <ChevronRight className="size-4 text-muted-foreground" />
          </span>
        </button>
        {sent ? (
          /* THE CUSTOMER DECIDES OFFLINE (Pavan, 2026-09-24); the technician
             records the answer. Approved is what makes the quote done. */
          <ActionBar
            note="Quote sent · waiting on the customer"
            label="Quote approved"
            onPress={() => {
              onPatch({ quote: job.quote ? { ...job.quote, approvedAt: nowIso() } : null });
              toast.success("Quote approved");
            }}
            secondary="Quote rejected"
            onSecondary={() => {
              /* BACK TO THE JOBS, unlocked — a new price is a change to what
                 is being done. The assessment stays submitted. */
              onPatch({ quote: null, assessmentLines: undefined });
              toast("Quote rejected", { description: "Change the jobs or fees and send it again." });
            }}
          />
        ) : (
          <ActionBar
            label={cfg.fieldQuote ? "Send quote to customer" : "Continue to work"}
            disabled={!ready}
            onPress={() => sendQuote()}
          />
        )}
        <BreakupSheet
          open={breakupOpen}
          onClose={() => setBreakupOpen(false)}
          lines={lines}
          fees={job.fees}
          /* SENDING FROM HERE TOO (Pavan, 2026-09-24) — not the primary, but
             always to hand once the quote can go. */
          onSend={cfg.fieldQuote && (sent || ready) ? () => { sendQuote(); setBreakupOpen(false); } : undefined}
          sent={sent}
        />
        {pauseSheet}
        {assessmentSheet}
        </>
        )}
      </>
    );
  }

  /* ── WORK ── */
  if (stage === "work") {
    return (
      <>
        <TopBar title="Work in progress" subtitle={sub} onBack={onBack} aside={timer} />
        <Body>
          {job.siteAssessment?.submittedAt && (
            <SiteAssessmentRow value={job.siteAssessment} onOpen={() => setAssessOpen(true)} />
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-foreground">{formatHours(elapsed)}</span>
            <span className="text-sm text-muted-foreground">{paused ? "paused" : "so far"}</span>
          </div>
          <AssessedWork lines={toDo} />
        </Body>
        {paused ? (
          pausedBar
        ) : !visit || visit.endedAt !== null ? (
          /* A ROLLED-OVER JOB, BACK ON SITE (2026-09-24) — the last visit
             closed yesterday, so today's work starts a visit of its own. */
          <ActionBar
            label="Start work"
            disabled={Boolean(busyWith)}
            note={busyWith ? `${busyWith} is ongoing — complete it first` : job.partNeeded ? `Parts pending · ${job.partNeeded}` : undefined}
            onPress={() => {
              onPatch({
                ...syncVisits({ visits: [...job.visits, { startedAt: nowIso(), endedAt: null, technicianId: job.technicianId, override: null }] }),
                status: "Ongoing" as WorkStatus,
              });
              toast.success("Work started");
            }}
          />
        ) : (
          <ActionBar
            label="Mark as complete"
            onPress={() => {
              setEndedAt(nowIso());
              setEnding("full");
            }}
          />
        )}
        {pauseSheet}
        {assessmentSheet}
      </>
    );
  }

  /* ── COMPLETE ── fully, or partly with parts missing. */
  if (stage === "complete") {
    const owed = parts.reduce((n, p) => n + (p.qty - (p.fittedQty ?? p.qty)), 0);
    /* WORKED HOURS — paused time is not labour. */
    const hours = visit && endedAt ? visitHours({ ...visit, endedAt }) : 0;
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
                    /* THE THREE OUTCOMES (Deepika and Pavan, 2026-09-24). */
                    ["rollover", "Roll over", "Same order tomorrow, with you on it."],
                    ["neworder", "New linked order", "This one is completed; the rest is a new order for the dispatcher."],
                    ["queue", "Complete and queue", "This one is completed; the rest waits as Parts pending."],
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
          label={ending === "partial" ? (mode === "rollover" ? "Complete — roll over" : mode === "neworder" ? "Complete — create linked order" : "Complete — queue the rest") : "Complete job"}
          disabled={ending === "partial" && (owed === 0 || parts.some((p) => !p.name.trim()))}
          note={ending === "partial" && owed === 0 ? "Nothing is owed — lower what was fitted, or choose Everything done" : undefined}
          onPress={() => {
            const at = endedAt ?? nowIso();
            const closed = job.visits.map((v, i) =>
              i === job.visits.length - 1 && v.endedAt === null
                ? { ...v, endedAt: at, pauses: (v.pauses ?? []).map((p) => (p.until === null ? { ...p, until: at } : p)) }
                : v
            );
            if (ending === "partial") {
              onPatch({ ...syncVisits({ visits: closed }) });
              onSplit({ mode, parts, note: notes.trim() || null });
              /* LEAVE THE COMPLETION SCREEN. A rolled-over job is tomorrow's
                 job again, so the technician goes back to the list; the other
                 two close this order and land on its done screen. */
              setEnding(null);
              if (mode === "rollover") onBack();
              return;
            }
            onPatch({
              techNotes: notes.trim() || null,
              ...syncVisits({ visits: closed }),
              signed: true,
              partNeeded: null,
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
 * ONE JOB (Pavan, 2026-09-24): asset · work type, the kind of job as a chip,
 * the reported fault — then, once work has started, its parts and fees.
 * NO VERDICT AND NO NOTES PER JOB any more: the assessment is one for the
 * whole visit (`SiteAssessmentSheet`).
 */
function AssessmentCard({
  index,
  line,
  active,
  locked,
  onChange,
  onRemove,
}: {
  /** The quote is out with the customer — the job reads, it does not edit. */
  locked: boolean;
  index: number;
  line: AssessmentLine;
  /** Work has started — the task takes its answer. Before that it is read-only. */
  active: boolean;
  onChange: (p: Partial<AssessmentLine>) => void;
  onRemove?: () => void;
}) {
  const added = line.source === "added";
  const skipped = line.verdict === "skip";
  const [skipOpen, setSkipOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [reasonPick, setReasonPick] = React.useState<string | null>(null);
  const skipReason = [reasonPick, reason.trim()].filter(Boolean).join(" — ");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const canMenu = active && !locked && (added ? Boolean(onRemove) : !skipped);
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-3">
      {/* A TITLE PER JOB, NOT A NUMBER IN THE GUTTER (Pavan, 2026-09-24) —
          "Service 1, Service 2…", the card end to end, and its acts behind
          ··· (Skip job, or Delete job for one added on site). */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Service {index + 1}</span>
          {skipped && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Skipped</span>
          )}
        </span>
        {canMenu && (
          <button
            type="button"
            aria-label={`Service ${index + 1} actions`}
            onClick={() => setMenuOpen(true)}
            className="-my-2 -mr-2 flex size-11 items-center justify-center rounded-md text-muted-foreground active:bg-accent"
          >
            <MoreHorizontal className="size-5" />
          </button>
        )}
      </div>
      {added ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Found on site</span>
            <KindChip workType={line.workType} />
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
            <span className="text-xs text-muted-foreground">Description</span>
            <span className="text-sm text-foreground">{line.reported || "—"}</span>
          </div>
        </div>
      )}

      {/* SKIPPED, NEVER DELETED (Pavan and Deepika, 2026-09-24) — the job
          stays on the order with its label and the reason. */}
      {skipped && (
        <div className="flex flex-col gap-1 rounded-md border border-fp-outline-1 p-3">
          <span className="text-xs text-muted-foreground">Reason</span>
          <span className="text-sm text-foreground">{line.note}</span>
          {!locked && (
            <Button variant="ghost" className="h-11 self-start px-2" onClick={() => onChange({ verdict: null, note: "" })}>
              Undo skip
            </Button>
          )}
        </div>
      )}

      {active && !skipped && (
        <>
          {/* NO CONFIRM (Pavan, 2026-09-24) — a part on the card is a part
              the job needs; a second yes adds nothing. */}
          <TaskParts
            parts={line.parts ?? []}
            workType={line.workType}
            locked={locked}
            onChange={(parts) => onChange({ parts })}
          />
        </>
      )}

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={`Service ${index + 1}`}>
        {added ? (
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onRemove?.();
              toast("Job deleted");
            }}
            className="flex h-11 items-center gap-2 rounded-md px-2 text-left text-sm text-destructive active:bg-accent"
          >
            <X className="size-4" /> Delete job
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setSkipOpen(true);
            }}
            className="flex h-11 items-center gap-2 rounded-md px-2 text-left text-sm text-foreground active:bg-accent"
          >
            <SkipForward className="size-4 text-muted-foreground" /> Skip job
          </button>
        )}
      </BottomSheet>

      <BottomSheet
        open={skipOpen}
        onClose={() => setSkipOpen(false)}
        title="Skip this job?"
        footer={
          <Button
            className="h-11 w-full text-base"
            disabled={!skipReason}
            onClick={() => {
              onChange({ verdict: "skip", note: skipReason });
              setSkipOpen(false);
              setReason("");
              setReasonPick(null);
              toast("Job skipped");
            }}
          >
            Skip job
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-foreground">Reason</span>
          <div className="flex flex-wrap gap-2">
            {SKIP_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reasonPick === r}
                onClick={() => setReasonPick(reasonPick === r ? null : r)}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm",
                  reasonPick === r ? "border-foreground bg-foreground text-background" : "border-fp-outline-1 text-foreground active:bg-accent"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Add details" className="text-base" />
        </div>
      </BottomSheet>
    </section>
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
  const [ticketParts, setTicketParts] = React.useState<PartLine[]>([]);
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
              <Textarea value={sv.fault} onChange={(e) => setService(i, { fault: e.target.value })} rows={2} placeholder="Description (optional)" className="text-base" />
            </div>
          ))}
        </div>

        {/* PARTS AND FEES, THE SAME UNITS AS THE JOB SCREEN (Pavan,
            2026-09-24) — a main box each, every item its own card. */}
        <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-3">
          <span className="text-sm font-semibold text-foreground">Parts</span>
          <TaskParts parts={ticketParts} workType={services[0]?.workType ?? ""} onChange={setTicketParts} titled={false} />
        </section>
        <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-3">
          <span className="text-sm font-semibold text-foreground">Fees</span>
          <TaskFees fees={fees} onChange={setFees} />
        </section>
      </Body>
      <ActionBar
        label="Create ticket"
        onPress={() =>
          onCreate({
            assets: services,
            fees: fees.filter((f) => f.name.trim() || f.amount > 0),
            parts: ticketParts.filter((p) => p.name.trim()),
          })
        }
      />
    </>
  );
}

/**
 * A JOB'S PARTS (Pavan, 2026-09-24). Each part is titled "Part 1, Part 2…"
 * with its remove on the title line; under it the name, then quantity (1 by
 * default, arrows inside the field) and the price — the line's amount, which
 * follows the quantity. Editing the price sets the unit cost.
 */
function TaskParts({
  parts,
  workType,
  locked,
  onChange,
  titled = true,
}: {
  /** False where the section already has its own "Parts" title. */
  titled?: boolean;
  locked?: boolean;
  parts: PartLine[];
  workType: string;
  onChange: (parts: PartLine[]) => void;
}) {
  const setPart = (i: number, p: Partial<PartLine>) => onChange(parts.map((x, j) => (j === i ? { ...x, ...p } : x)));
  if (locked) {
    return (
      <div className="flex flex-col gap-1 rounded-md border border-fp-outline-1 p-3">
        <span className="text-xs font-medium text-muted-foreground">Parts</span>
        {parts.filter((p) => p.name.trim()).length === 0 && <p className="text-sm text-muted-foreground">No parts.</p>}
        {parts.filter((p) => p.name.trim()).map((p, i) => (
          <div key={i} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-foreground">{p.name} · {p.qty} × {money(p.cost)}</span>
            <span className="tabular-nums text-foreground">{money(p.qty * p.cost)}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <datalist id="tech-part-options">
        {PART_OPTIONS.map((x) => (
          <option key={x.name} value={x.name} />
        ))}
      </datalist>
      {titled && <span className="text-xs font-medium text-muted-foreground">Parts</span>}
      {parts.length === 0 && <p className="text-sm text-muted-foreground">No parts.</p>}
      {parts.map((p, i) => (
        /* EACH PART ITS OWN CARD, like each fee (Pavan, 2026-09-24). */
        <div key={i} className="flex flex-col gap-2 rounded-md bg-fp-card-1 p-3">
          <div className="-my-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Part {i + 1}</span>
            <button type="button" aria-label={`Remove ${p.name || `part ${i + 1}`}`} onClick={() => onChange(parts.filter((_, j) => j !== i))} className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-accent">
              <X className="size-4" />
            </button>
          </div>
          {/* SUGGESTS FROM THE SHELF; a listed part brings its cost. */}
          <Input
            value={p.name}
            list="tech-part-options"
            onChange={(e) => {
              const listed = PART_OPTIONS.find((x) => x.name === e.target.value);
              setPart(i, listed && !p.cost ? { name: e.target.value, cost: listed.cost } : { name: e.target.value });
            }}
            placeholder="Part"
            aria-label={`Part ${i + 1}`}
            className="h-11"
            autoFocus={!p.name}
          />
          <div className="grid grid-cols-2 gap-2">
            <QtyInput
              value={p.qty}
              label={`Quantity of ${p.name || `part ${i + 1}`}`}
              onChange={(q) => setPart(i, { qty: q })}
            />
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                inputMode="decimal"
                value={p.cost * p.qty === 0 ? "" : String(Math.round(p.cost * p.qty * 100) / 100)}
                onChange={(e) => {
                  const total = Math.max(0, Number(e.target.value.replace(/[^0-9.]/g, "")) || 0);
                  setPart(i, { cost: p.qty > 0 ? total / p.qty : total });
                }}
                placeholder="Price"
                aria-label={`Price of ${p.name || `part ${i + 1}`}`}
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

/** QUANTITY — a plain field, 1 by default, with up and down inside it. */
function QtyInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="relative">
      <Input
        inputMode="numeric"
        value={value ? String(value) : ""}
        onChange={(e) => onChange(Math.max(1, Math.min(999, Number(e.target.value.replace(/[^0-9]/g, "")) || 1)))}
        placeholder="Quantity"
        aria-label={label}
        className="h-11 pr-11 tabular-nums"
      />
      <div className="absolute inset-y-0 right-0 flex w-10 flex-col border-l border-input">
        <button type="button" aria-label="One more" onClick={() => onChange(Math.min(999, value + 1))} className="flex flex-1 items-center justify-center text-muted-foreground active:bg-accent">
          <ChevronUp className="size-3.5" />
        </button>
        <button type="button" aria-label="One fewer" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))} className="flex flex-1 items-center justify-center border-t border-input text-muted-foreground active:bg-accent disabled:opacity-40">
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * THE ORDER'S FEES (Pavan, 2026-09-24) — the same shape as the parts: each
 * fee its own card, "Fee 1…" with its remove on that line, a dropdown of the
 * standard fees or "Other fee" to type one, and the amount. "Add fee" adds a
 * card; it does not open a picker.
 */
function TaskFees({ fees, onChange, locked }: { fees: FeeLine[]; onChange: (fees: FeeLine[]) => void; locked?: boolean }) {
  const setFee = (i: number, p: Partial<FeeLine>) => onChange(fees.map((x, j) => (j === i ? { ...x, ...p } : x)));
  /* "OTHER FEE" NAMES IT IN A SHEET (Pavan, 2026-09-24) — the name typed
     there becomes the fee's own option in its dropdown. */
  const [naming, setNaming] = React.useState<number | null>(null);
  const [draftName, setDraftName] = React.useState("");
  const custom = (f: FeeLine) => Boolean(f.name) && !FEE_BOOK.some((b) => b.name === f.name);
  const field = "h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground dark:bg-input/30";
  if (locked) {
    return (
      <div className="flex flex-col gap-1">
        {fees.length === 0 && <p className="text-sm text-muted-foreground">No fees.</p>}
        {fees.map((f, i) => (
          <div key={i} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-foreground">{f.name}</span>
            <span className="tabular-nums text-foreground">{money(f.amount)}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {fees.length === 0 && <p className="text-sm text-muted-foreground">No fees.</p>}
      {fees.map((f, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md bg-fp-card-1 p-3">
          <div className="-my-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Fee {i + 1}</span>
            <button
              type="button"
              aria-label={`Remove ${f.name || `fee ${i + 1}`}`}
              onClick={() => onChange(fees.filter((_, j) => j !== i))}
              className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-accent"
            >
              <X className="size-4" />
            </button>
          </div>
          <select
            value={f.name}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__other") {
                setDraftName(custom(f) ? f.name : "");
                setNaming(i);
                return;
              }
              const listed = FEE_BOOK.find((b) => b.name === v);
              setFee(i, listed ? { name: listed.name, amount: listed.amount } : { name: v });
            }}
            aria-label={`Fee ${i + 1}`}
            className={field}
          >
            <option value="">Select fee</option>
            {FEE_BOOK.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
            {custom(f) && <option value={f.name}>{f.name}</option>}
            <option value="__other">Other fee</option>
          </select>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              inputMode="decimal"
              value={f.amount === 0 ? "" : String(f.amount)}
              onChange={(e) => setFee(i, { amount: Math.max(0, Number(e.target.value.replace(/[^0-9.]/g, "")) || 0) })}
              placeholder="Amount"
              aria-label={`Amount of ${f.name || `fee ${i + 1}`}`}
              className="h-11 pl-6 tabular-nums"
            />
          </div>
        </div>
      ))}
      <Button variant="ghost" className="h-11 self-start px-2" onClick={() => onChange([...fees, { name: "", amount: 0 }])}>
        <Plus className="size-4" /> Add fee
      </Button>
      <BottomSheet
        open={naming !== null}
        onClose={() => setNaming(null)}
        title="Other fee"
        footer={
          <Button
            className="h-11 w-full text-base"
            disabled={!draftName.trim()}
            onClick={() => {
              if (naming !== null) setFee(naming, { name: draftName.trim() });
              setNaming(null);
            }}
          >
            Apply
          </Button>
        }
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Fee name</span>
          <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Parking" className="h-11 text-base" autoFocus />
        </div>
      </BottomSheet>
    </div>
  );
}

/** THE BREAKUP behind the quote total — task by task, then the fees. */
function BreakupSheet({
  open,
  onClose,
  lines,
  fees,
  onSend,
  sent,
}: {
  open: boolean;
  onClose: () => void;
  lines: AssessmentLine[];
  fees: { name: string; amount: number }[];
  /** Send (or send again) the quote from here. Absent when it cannot go yet. */
  onSend?: () => void;
  sent?: boolean;
}) {
  const tasks = lines
    .map((l, i) => ({
      l,
      n: i + 1,
      parts: (l.parts ?? []).filter((p) => p.name.trim()),
    }))
    .filter((t) => t.l.verdict !== "skip" && t.parts.length > 0);
  const total = quoteableTotal(partsOfTasks(lines), fees);
  return (
    <BottomSheet
      open={open}
      full
      onClose={onClose}
      title="Quote total"
      footer={
        onSend && (
          <Button variant="outline" className="h-11 w-full text-base" onClick={onSend}>
            <Send className="size-4" /> {sent ? "Send quote again" : "Send quote to customer"}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">No parts yet.</p>}
        {tasks.map(({ l, n, parts }) => (
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
          </div>
        ))}
        {fees.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Fees</span>
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

/** PAUSE, WITH A REASON (Pavan, 2026-09-24). Paused time is not labour. */
function PauseSheet({
  open,
  onClose,
  onPause,
}: {
  open: boolean;
  onClose: () => void;
  onPause: (reason: string) => void;
}) {
  const [pick, setPick] = React.useState<string | null>(null);
  const [other, setOther] = React.useState("");
  React.useEffect(() => {
    if (open) {
      setPick(null);
      setOther("");
    }
  }, [open]);
  const reason = pick === "Other" ? other.trim() || "Other" : pick;
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Pause work"
      footer={
        <Button className="h-11 w-full text-base" disabled={!reason} onClick={() => reason && onPause(reason)}>
          <Pause className="size-4" /> Pause
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {PAUSE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={pick === r}
              onClick={() => setPick(r)}
              className={cn(
                "h-9 rounded-full border px-3 text-sm",
                pick === r ? "border-foreground bg-foreground text-background" : "border-fp-outline-1 text-foreground active:bg-accent"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        {pick === "Other" && (
          <Input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Reason" className="h-11 text-base" autoFocus />
        )}
      </div>
    </BottomSheet>
  );
}

/** The words in a piece of rich text, without its markup. */
function plainText(html: string): string {
  if (!html) return "";
  /* Each line or bullet ends with "; ", so two points never run together. */
  const marked = html.replace(/<\/(li|p|div)>|<br\s*\/?>/gi, "; ");
  const doc = new DOMParser().parseFromString(marked, "text/html");
  return (doc.body.textContent ?? "")
    .replace(/\s+/g, " ")
    .replace(/(;\s*)+/g, "; ")
    .replace(/^[;\s]+|[;\s]+$/g, "");
}

/**
 * THE ASSESSMENT ROW (Pavan, 2026-09-24, option B) — one compact row above
 * the jobs that opens the full sheet. It says where the assessment stands:
 * not started, a draft, or submitted.
 */
function SiteAssessmentRow({
  value,
  onOpen,
}: {
  value: ServiceOrder["siteAssessment"];
  onOpen: () => void;
}) {
  const text = plainText(value?.html ?? "");
  const photos = value?.photos.length ?? 0;
  const submitted = Boolean(value?.submittedAt);
  const summary = [text && (text.length > 48 ? `${text.slice(0, 48)}…` : text), photos && `${photos} photo${photos === 1 ? "" : "s"}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 text-left active:bg-accent",
        submitted ? "border-fp-outline-1 bg-fp-surface-1a" : "border-foreground bg-fp-surface-1a"
      )}
    >
      {submitted ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-success text-background">
          <Check className="size-3.5" />
        </span>
      ) : (
        <ClipboardList className="size-5 shrink-0 text-foreground" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-foreground">
          Assessment{submitted ? " · Submitted" : text || photos ? " · Draft" : ""}
        </span>
        <span className="truncate text-xs text-muted-foreground">{summary || "Add what you found on site"}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/**
 * A SMALL RICH-TEXT FIELD — bold, bullets, a numbered list (Pavan,
 * 2026-09-24). Uncontrolled: the markup is read back on every input, and only
 * seeded when it opens, so the caret never jumps.
 */
function RichText({
  initial,
  onChange,
  placeholder,
}: {
  initial: string;
  onChange: (html: string) => void;
  placeholder: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.innerHTML = initial;
    // Seeded once per opening — see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const act = (command: string) => {
    ref.current?.focus();
    document.execCommand(command);
    onChange(ref.current?.innerHTML ?? "");
  };
  const tools: { command: string; label: string; icon: React.ReactNode }[] = [
    { command: "bold", label: "Bold", icon: <Bold className="size-4" /> },
    { command: "insertUnorderedList", label: "Bullet list", icon: <List className="size-4" /> },
    { command: "insertOrderedList", label: "Numbered list", icon: <ListOrdered className="size-4" /> },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-input dark:bg-input/30">
      <div className="flex shrink-0 gap-1 border-b border-fp-outline-1 p-1">
        {tools.map((t) => (
          <button
            key={t.command}
            type="button"
            aria-label={t.label}
            /* mousedown, so the text keeps its selection */
            onMouseDown={(e) => {
              e.preventDefault();
              act(t.command);
            }}
            className="flex size-11 items-center justify-center rounded-md text-foreground active:bg-accent"
          >
            {t.icon}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className="min-h-40 flex-1 overflow-y-auto px-3 py-2 text-base text-foreground outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}

/**
 * THE SITE ASSESSMENT, IN A FULL SHEET (Pavan, 2026-09-24). Rich-text notes
 * and photos, saved as they are written. "Submit assessment" is the first
 * step before a quote — and NOT final: it can be reopened and changed until
 * the customer approves the quote. After that the sheet reads, and editing
 * is a request the dispatcher allows.
 */
function SiteAssessmentSheet({
  open,
  onClose,
  value,
  approved,
  onSave,
  onSubmit,
  onRequestEdit,
}: {
  open: boolean;
  onClose: () => void;
  value: ServiceOrder["siteAssessment"];
  /** The customer has approved the quote — edits now need permission. */
  approved: boolean;
  /** Keep what is written — a draft, or changes to a submitted one. */
  onSave: (html: string, photos: string[]) => void;
  onSubmit: (html: string, photos: string[]) => void;
  onRequestEdit: () => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [html, setHtml] = React.useState(value?.html ?? "");
  const [photos, setPhotos] = React.useState(value?.photos ?? []);
  const submitted = Boolean(value?.submittedAt);
  const editable = !approved || Boolean(value?.editAllowed);
  React.useEffect(() => {
    if (open) {
      setHtml(value?.html ?? "");
      setPhotos(value?.photos ?? []);
    }
    // Re-read only on opening; while open this sheet owns the text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const empty = plainText(html).length === 0;
  const close = () => {
    if (editable) onSave(html, photos);
    onClose();
  };
  return (
    <BottomSheet
      open={open}
      full
      onClose={close}
      title="Assessment"
      footer={
        !submitted ? (
          <Button className="h-11 w-full text-base" disabled={empty} onClick={() => onSubmit(html, photos)}>
            Submit assessment
          </Button>
        ) : !editable ? (
          <Button variant="outline" className="h-11 w-full text-base" disabled={Boolean(value?.editRequestedAt)} onClick={onRequestEdit}>
            {value?.editRequestedAt ? "Edit requested" : "Request to edit"}
          </Button>
        ) : undefined
      }
    >
      {!editable ? (
        <div className="flex flex-col gap-4">
          <span className="text-xs text-muted-foreground">
            Submitted {timeFmt.format(new Date(value!.submittedAt!))}
          </span>
          <div
            className="text-base text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: value!.html }}
          />
          {value!.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {value!.photos.map((src, i) => (
                <img key={src} src={src} alt={`Photo ${i + 1}`} className="size-16 rounded-md border border-fp-outline-1 object-cover" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <RichText initial={value?.html ?? ""} onChange={setHtml} placeholder="What you found on site" />
          <div className="flex flex-wrap gap-2">
            {photos.map((src, i) => (
              <div key={src} className="relative size-16 overflow-hidden rounded-md border border-fp-outline-1">
                <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => setPhotos((ps) => ps.filter((p) => p !== src))}
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
                if (files.length) setPhotos((ps) => [...ps, ...files.map((f) => URL.createObjectURL(f))]);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}
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
