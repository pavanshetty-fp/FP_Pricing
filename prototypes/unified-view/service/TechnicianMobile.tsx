import * as React from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  MapPin,
  Package,
  Phone,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/ui/status-chip";
import {
  SERVICE_ORDERS,
  TECHNICIANS,
  WORK_STATUS_TONE,
  computedLabor,
  formatHours,
  syncVisits,
  money,
  partsTotal,
  feesTotal,
  quoteableTotal,
  type ServiceOrder,
  type WorkStatus,
} from "./work";
import { useServiceSettings } from "./settings";
import { useElapsedHours } from "./sheet-parts";

/*
  ═══════════════════════════════════════════════════════════════════════════
  THE TECHNICIAN'S APP — a separate product, on a phone.
  ═══════════════════════════════════════════════════════════════════════════

  SEPARATE, AND THAT IS THE POINT (Pavan, 2026-09-23). It used to be a 400px
  panel that dispatch opened over the order sheet, which made it a feature of
  the dispatch screen. It is not: it is where a different person, holding a
  different device, standing in front of the asset, does their whole day. So
  it gets its own destination, its own shell, and its own list — the
  technician's jobs, not the one job dispatch happened to be looking at.

  ── THE FIVE RULES THIS APP IS BUILT ON ───────────────────────────────────

  The DS has no mobile section yet; these are what this screen settled, and
  they are candidates for one.

  1. ONE THING PER SCREEN. A phone has no room for a form and its context at
     once, so a screen asks one question and the answer moves you on. The
     desktop sheet's stack of sections would be a scroll nobody reaches the
     end of.
  2. THE ACT IS PINNED TO THE BOTTOM, FULL WIDTH. It is the one place a thumb
     reaches without regripping, and it is where the eye ends up anyway. The
     desktop rule — the primary is the next act and there is one — holds; what
     changes is where it sits.
  3. NOTHING DEPENDS ON HOVER. There is no hover on a phone. Every state a
     control has must be reachable by press, and anything the desktop app
     reveals on hover must be permanent here.
  4. TARGETS ARE 44px. Gloved hands, a truck cab, sunlight. `h-11` on
     everything pressable, and that is a floor rather than a preference.
  5. BACK IS IN THE HEADER, AND IT IS THE ONLY WAY BACK. A phone user does
     not have a browser chrome to escape with, so every screen past the list
     carries one.

  ── WHY A DEVICE FRAME ────────────────────────────────────────────────────

  It renders in a phone-shaped box in the middle of a desktop screen, because
  that is where it is being REVIEWED. Stretched to a monitor it would stop
  being the thing it is and start being a bad desktop page, and the first
  question anybody asked would be about the layout rather than the flow.
*/

/* ───────────────────────────────────────────────────────────── the flow ── */

/**
 * WHERE THE TECHNICIAN IS IN THE JOB.
 *
 * NOT THE SAME AS THE ORDER'S STATUS, and deliberately. The order has one
 * status the whole business reads; this is the technician's position inside
 * the part of it they own, and it has steps the business does not care about
 * — looking at the thing before deciding what it costs.
 */
type Stage =
  | "travel"
  | "assess"
  | "quote"
  | "waiting"
  | "ready"
  | "work"
  | "wrapup";

const stageOf = (o: ServiceOrder, fieldQuote: boolean): Stage => {
  if (!o.arrivedAt) return "travel";
  if (!o.assessment) return "assess";
  if (fieldQuote && !o.quote) return "quote";
  if (fieldQuote && o.quote && !o.quote.approvedAt) return "waiting";
  if (o.status === "Parts pending" || o.completedAt) return "wrapup";
  /* STARTING THE CLOCK IS ITS OWN PRESS (Pavan, 2026-09-23). It used to
     happen as a side effect of skipping or of the customer approving — so
     the billable hours began while the technician was still putting their
     phone away and walking to the asset. It is also the moment DISPATCH
     starts watching: the elapsed timer on the order sheet is this press. */
  if (!o.startedAt) return "ready";
  return "work";
};

const nowIso = () => new Date().toISOString();
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/* ──────────────────────────────────────────────────────────── the parts ── */

/**
 * The app's own header. Title, and a back chevron on every screen but the
 * list — see rule 5.
 */
function TopBar({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-fp-outline-1 bg-fp-surface-1a px-3 py-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </button>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-base font-semibold text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
    </header>
  );
}

/**
 * THE ACT, PINNED. Rule 2.
 *
 * `secondary` sits ABOVE the primary rather than beside it — two half-width
 * buttons on a phone are two targets neither of which is comfortable, and the
 * one that matters should be the one nearest the thumb.
 */
function ActionBar({
  label,
  onPress,
  disabled,
  secondary,
  onSecondary,
  note,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: string;
  onSecondary?: () => void;
  note?: string;
}) {
  return (
    <div className="shrink-0 border-t border-fp-outline-1 bg-fp-surface-1a p-3">
      {note && (
        <p className="mb-2 text-center text-xs text-muted-foreground">{note}</p>
      )}
      <div className="flex flex-col gap-2">
        {secondary && (
          <Button
            variant="outline"
            className="h-11 w-full text-base"
            onClick={onSecondary}
          >
            {secondary}
          </Button>
        )}
        <Button
          className="h-11 w-full text-base"
          disabled={disabled}
          onClick={onPress}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

/** A labelled block of the job's facts. No card chrome — a phone has no room. */
function Facts({
  items,
}: {
  items: { icon: React.ReactNode; label: string; value: React.ReactNode }[];
}) {
  return (
    <div className="flex flex-col divide-y divide-fp-outline-1">
      {items.map((f) => (
        <div key={f.label} className="flex items-start gap-3 py-3">
          <span className="mt-0.5 shrink-0 text-muted-foreground">{f.icon}</span>
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="text-sm text-foreground">{f.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The body scroller — every screen past the header uses it. */
const Body = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {children}
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-sm font-semibold text-foreground">{children}</h2>
);

/* ───────────────────────────────────────────────────────────── the list ── */

function JobList({
  jobs,
  technicianName,
  onOpen,
}: {
  jobs: ServiceOrder[];
  technicianName: string;
  onOpen: (id: string) => void;
}) {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const done = jobs.filter((j) => j.completedAt).length;

  return (
    <>
      <TopBar title={technicianName.split(" ")[0] + "'s day"} subtitle={today} />
      <Body>
        {/* THE ONE NUMBER THAT MATTERS AT 7AM — how much is left. Not a
            progress bar: a bar says how far along you are, which is a
            different question from how many more sites you are driving to. */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums text-foreground">
            {jobs.length - done}
          </span>
          <span className="text-sm text-muted-foreground">
            {jobs.length - done === 1 ? "job left" : "jobs left"}
            {done > 0 && ` · ${done} done`}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {jobs.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => onOpen(j.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-3 text-left active:bg-accent",
                j.completedAt && "opacity-60"
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {j.scheduledAt
                      ? timeFmt.format(new Date(j.scheduledAt))
                      : "Any time"}
                  </span>
                  <StatusChip tone={WORK_STATUS_TONE[j.status]} variant="soft">
                    {j.status}
                  </StatusChip>
                </div>
                <span className="truncate text-sm text-foreground">
                  {j.shipTo}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {j.assetName} · {j.fault}
                </span>
              </div>
              <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
          {jobs.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nothing booked. Dispatch will send work through as it comes in.
            </p>
          )}
        </div>
      </Body>
    </>
  );
}

/* ────────────────────────────────────────────────────────────── the job ── */

function Job({
  job,
  onBack,
  onPatch,
}: {
  job: ServiceOrder;
  onBack: () => void;
  onPatch: (patch: Partial<ServiceOrder>) => void;
}) {
  const cfg = useServiceSettings();
  /* THE CLOCK, WHILE IT RUNS. Hooks cannot sit inside the stage branches, so
     it is read here and only the work screen uses it. */
  const elapsed = useElapsedHours(
    job.startedAt && !job.completedAt ? job.startedAt : null
  );

  const [assessment, setAssessment] = React.useState(job.assessment ?? "");
  const [notes, setNotes] = React.useState(job.techNotes ?? "");
  const [part, setPart] = React.useState(job.partNeeded ?? "");
  const [ending, setEnding] = React.useState<"done" | "parts" | null>(
    job.status === "Parts pending" ? "parts" : job.completedAt ? "done" : null
  );
  /* WHEN THEY PRESSED COMPLETED — held here and not written to the record
     until they submit. Writing `completedAt` on the press made the job look
     settled to the wrap-up screen, which then offered "Back to my day" and
     **walked straight past the notes step**. The clock stops when you say the
     work is done; the record changes when you hand it in. */
  const [endedAt, setEndedAt] = React.useState<string | null>(job.completedAt);

  /* THE LOCAL ENDING WINS OVER THE RECORD. `stageOf` reads the order, which
     is right for everything the record knows about — but "I have decided this
     job is finished" is true a moment BEFORE the record says so, because the
     notes step sits between the decision and the submit. Deriving the screen
     purely from the record left Completed doing nothing you could see. */
  const stage: Stage = ending ? "wrapup" : stageOf(job, cfg.fieldQuote);

  const sub = `${job.orderNo} · ${job.shipTo}`;

  /* ── TRAVEL ── the one screen that is about getting there, not about the
     work. Everything on it is something you use in a truck: an address, a
     phone number, the time you said you would arrive. */
  if (stage === "travel") {
    return (
      <>
        <TopBar title={job.assetName} subtitle={sub} onBack={onBack} />
        <Body>
          <Facts
            items={[
              {
                icon: <MapPin className="size-4" />,
                label: "Site",
                value: (
                  <>
                    {job.shipTo}
                    <br />
                    {job.city}, {job.state}
                  </>
                ),
              },
              {
                icon: <Clock className="size-4" />,
                label: "Booked for",
                value: job.scheduledAt
                  ? timeFmt.format(new Date(job.scheduledAt))
                  : "Any time today",
              },
              {
                icon: <Wrench className="size-4" />,
                label: "Reported",
                value: job.fault,
              },
              {
                icon: <Phone className="size-4" />,
                label: "Site contact",
                value: "+1 559-555-0104",
              },
            ]}
          />
        </Body>
        <ActionBar
          label="I'm on site"
          onPress={() => {
            onPatch({ arrivedAt: nowIso() });
            toast.success("Arrival recorded");
          }}
        />
      </>
    );
  }

  /* ── ASSESS ── added 2026-09-23. WHAT YOU FOUND, which is not what was
     reported. It comes before the quote because a price given before anybody
     has looked at the thing is a guess, and it comes before the work because
     what you found is what decides what the work is. */
  if (stage === "assess") {
    return (
      <>
        <TopBar title="What did you find?" subtitle={sub} onBack={onBack} />
        <Body>
          <div className="rounded-lg border border-fp-outline-1 bg-fp-card-1 p-3">
            <p className="text-xs text-muted-foreground">Reported as</p>
            <p className="mt-0.5 text-sm text-foreground">{job.fault}</p>
          </div>
          <div className="flex flex-col gap-2">
            <SectionTitle>Your assessment</SectionTitle>
            <Textarea
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              rows={6}
              placeholder="What is actually wrong with it?"
              className="text-base"
            />
          </div>
        </Body>
        <ActionBar
          label="Save and carry on"
          disabled={assessment.trim().length === 0}
          onPress={() => onPatch({ assessment: assessment.trim() })}
        />
      </>
    );
  }

  /* ── QUOTE ── with a SKIP beside it (Pavan, 2026-09-23). Not every job is
     quoted, and until now the only way to say so was to turn a setting off
     for the whole company. Skipping is a decision one technician makes about
     one job, in front of a customer who has just said "no need". */
  if (stage === "quote") {
    const total = quoteableTotal(job.parts, job.fees);
    return (
      <>
        <TopBar title="Quote the customer" subtitle={sub} onBack={onBack} />
        <Body>
          <div className="flex flex-col gap-2">
            <SectionTitle>Parts</SectionTitle>
            <div className="flex flex-col divide-y divide-fp-outline-1">
              {job.parts.map((p) => (
                <div key={p.name} className="flex items-baseline gap-3 py-2">
                  <span className="flex-1 text-sm text-foreground">
                    {p.name}
                    {p.qty > 1 && (
                      <span className="text-muted-foreground"> ×{p.qty}</span>
                    )}
                  </span>
                  <span className="text-sm tabular-nums text-foreground">
                    {money(p.cost * p.qty)}
                  </span>
                </div>
              ))}
              {job.parts.length === 0 && (
                <p className="py-2 text-sm text-muted-foreground">
                  No parts on this job.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <SectionTitle>Fees</SectionTitle>
            <div className="flex flex-col divide-y divide-fp-outline-1">
              {job.fees.map((f) => (
                <div key={f.name} className="flex items-baseline gap-3 py-2">
                  <span className="flex-1 text-sm text-foreground">
                    {f.name}
                  </span>
                  <span className="text-sm tabular-nums text-foreground">
                    {money(f.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-foreground">Quote</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {money(total)}
            </span>
          </div>

          {/* SAID BEFORE THE PRESS, not after. Labour and mileage are not on a
              quote because nobody knows them yet, and a customer who learns
              that from the invoice learns it too late. */}
          <p className="text-xs text-muted-foreground">
            Labour and mileage are not on this — they are not known until the
            job has happened, and the invoice will carry them.
          </p>
        </Body>
        <ActionBar
          label="Send quote to customer"
          onPress={() => {
            onPatch({
              quote: {
                parts: job.parts.map((p) => ({ ...p })),
                fees: job.fees.map((f) => ({ ...f })),
                total,
                sentAt: nowIso(),
                approvedAt: null,
              },
            });
            toast.success("Quote sent");
          }}
          secondary="Skip — no quote needed"
          onSecondary={() => {
            /* SKIPPING STARTS THE WORK. The quote step existed to gate it, so
               declining the gate means going through it — not landing on a
               screen that asks again. */
            onPatch({
              quote: {
                parts: [],
                fees: [],
                total: 0,
                sentAt: nowIso(),
                approvedAt: nowIso(),
              },
            });
            toast.success("Quote skipped");
          }}
        />
      </>
    );
  }

  /* ── WAITING ── the customer has the quote and has not answered. A screen
     with only a yes on it has never met a customer, so the change is here
     too. */
  if (stage === "waiting") {
    return (
      <>
        <TopBar title="Waiting on the customer" subtitle={sub} onBack={onBack} />
        <Body>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Clock className="size-8 text-muted-foreground" />
            <p className="text-sm text-foreground">
              Quote for {money(job.quote?.total ?? 0)} sent.
            </p>
            <p className="text-sm text-muted-foreground">
              Work does not start until they say yes.
            </p>
          </div>
        </Body>
        <ActionBar
          label="They approved it"
          onPress={() => {
            onPatch({
              quote: job.quote ? { ...job.quote, approvedAt: nowIso() } : null,
            });
            toast.success("Quote approved");
          }}
          secondary="They want it changed"
          onSecondary={() => {
            onPatch({ quote: null });
            toast("Back to the quote");
          }}
        />
      </>
    );
  }

  /* ── READY ── the clock has not started and everything before it has.
     ONE SCREEN, ONE PRESS. It exists so that "I am about to work on this" is
     a thing the technician SAYS rather than something the app infers from
     them having skipped a quote — and so the elapsed timer a dispatcher
     watches begins when the spanner does. */
  if (stage === "ready") {
    return (
      <>
        <TopBar title="Ready to start" subtitle={sub} onBack={onBack} />
        <Body>
          <div className="rounded-lg border border-fp-outline-1 bg-fp-card-1 p-3">
            <p className="text-xs text-muted-foreground">You found</p>
            <p className="mt-0.5 text-sm text-foreground">{job.assessment}</p>
          </div>
          <Facts
            items={[
              {
                icon: <Wrench className="size-4" />,
                label: "Asset",
                value: job.assetName,
              },
              {
                icon: <Package className="size-4" />,
                label: "Parts",
                value: job.parts.length
                  ? job.parts.map((p) => `${p.qty} × ${p.name}`).join(", ")
                  : "None on this job",
              },
            ]}
          />
        </Body>
        <ActionBar
          label="Start labour"
          onPress={() => {
            /* A PRESS OPENS A VISIT. The dispatcher's timer counts from it,
               and the order's total is the sum of every one of them. */
            onPatch({
              ...syncVisits({
                visits: [
                  ...job.visits,
                  {
                    startedAt: nowIso(),
                    endedAt: null,
                    technicianId: job.technicianId,
                    override: null,
                  },
                ],
              }),
              status: "Ongoing" as WorkStatus,
            });
            toast.success("Labour started");
          }}
          note="Dispatch sees the clock from this press."
        />
      </>
    );
  }

  /* ── WORK ── two endings, not one button with a caveat. */
  if (stage === "work") {

    return (
      <>
        <TopBar title="Work in progress" subtitle={sub} onBack={onBack} />
        <Body>
          <div className="flex items-baseline gap-2">
            {/* LIVE, because a number that does not move on a screen you
                keep glancing at is a number you stop believing. */}
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {formatHours(elapsed)}
            </span>
            <span className="text-sm text-muted-foreground">so far</span>
          </div>

          <div className="rounded-lg border border-fp-outline-1 bg-fp-card-1 p-3">
            <p className="text-xs text-muted-foreground">You found</p>
            <p className="mt-0.5 text-sm text-foreground">{job.assessment}</p>
          </div>

          <div className="flex flex-col gap-2">
            <SectionTitle>On the job</SectionTitle>
            <Facts
              items={[
                {
                  icon: <Package className="size-4" />,
                  label: "Parts",
                  value: `${job.parts.length} line${job.parts.length === 1 ? "" : "s"} · ${money(partsTotal(job.parts))}`,
                },
                {
                  icon: <ClipboardList className="size-4" />,
                  label: "Fees",
                  value: money(feesTotal(job.fees)),
                },
              ]}
            />
          </div>
        </Body>
        <ActionBar
          label="Completed"
          onPress={() => {
            setEnding("done");
            setEndedAt(nowIso());
          }}
          secondary="Stalled — waiting on a part"
          onSecondary={() => setEnding("parts")}
        />
      </>
    );
  }

  /* ── WRAP-UP ── the notes step (Pavan, 2026-09-23). Both endings land here,
     because "what I want to say about finishing this" and "what I want to say
     about not finishing it" are the same act at two different endings. */
  const partsEnding = ending === "parts";
  /* SETTLED MEANS HANDED IN, not finished. A job whose work is over but whose
     notes have not been submitted is still the technician's. */
  const settled = partsEnding
    ? job.status === "Parts pending"
    : Boolean(job.completedAt);

  return (
    <>
      <TopBar
        title={partsEnding ? "Waiting on a part" : "Job done"}
        subtitle={sub}
        onBack={onBack}
      />
      <Body>
        {partsEnding ? (
          <div className="flex flex-col gap-2">
            <SectionTitle>What is missing?</SectionTitle>
            <Input
              value={part}
              onChange={(e) => setPart(e.target.value)}
              placeholder="Part or reason"
              className="h-11 text-base"
            />
            {/* WHAT HAPPENS NEXT, SAID BEFORE THE PRESS — a technician who
                finds out afterwards has been told too late. */}
            <p className="text-xs text-muted-foreground">
              {cfg.returnMode === "continue"
                ? "This order stays open with what is left on it."
                : "What is left becomes a new order; this one is done."}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-status-success/40 bg-status-success/10 p-3">
            <Check className="size-4 shrink-0 text-status-success" />
            <span className="text-sm text-foreground">
              {job.startedAt && endedAt
                ? `${computedLabor(job.startedAt, endedAt)} hours recorded.`
                : "Recorded."}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <SectionTitle>Anything worth saying?</SectionTitle>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Optional"
            className="text-base"
          />
        </div>
      </Body>
      {settled ? (
        <ActionBar label="Back to my day" onPress={onBack} />
      ) : (
        <ActionBar
          label={partsEnding ? "Submit — waiting on a part" : "Submit"}
          disabled={partsEnding && part.trim().length === 0}
          onPress={() => {
            const patch: Partial<ServiceOrder> = {
              techNotes: notes.trim() || null,
            };
            if (partsEnding) {
              onPatch({
                ...patch,
                status: "Parts pending",
                partNeeded: part.trim(),
                completedAt: null,
              });
              toast.success(`${job.orderNo} — waiting on a part`);
            } else {
              const at = endedAt ?? nowIso();
              /* THE VISIT CLOSES; THE TOTAL FOLLOWS. `completedAt` and
                 `labor` are mirrors of the visit list and are written by
                 `syncVisits`, never by hand. */
              onPatch({
                ...patch,
                ...syncVisits({
                  visits: job.visits.map((v, i) =>
                    i === job.visits.length - 1 && v.endedAt === null
                      ? { ...v, endedAt: at }
                      : v
                  ),
                }),
                signed: true,
                status: cfg.managerApproval ? "Needs approval" : "Completed",
              });
              toast.success(
                cfg.managerApproval
                  ? `${job.orderNo} sent for approval`
                  : `${job.orderNo} completed`
              );
            }
          }}
        />
      )}
    </>
  );
}

/* ───────────────────────────────────────────────────────────── the shell ── */

export function TechnicianMobile() {
  /* ITS OWN COPY OF THE JOBS. This app is a separate product and, in the real
     one, a separate client talking to the same API — so it keeps its own
     state rather than reaching into the dispatch screen's. What that costs is
     that changes here do not show up there, which is honest about what it is
     rather than pretending at a sync nothing behind this prototype does. */
  const [tech, setTech] = React.useState(TECHNICIANS[0].id);
  const [orders, setOrders] = React.useState<ServiceOrder[]>(() =>
    SERVICE_ORDERS.map((o) => ({ ...o }))
  );
  const [openId, setOpenId] = React.useState<string | null>(null);

  const jobs = React.useMemo(
    () =>
      orders
        .filter((o) => o.technicianId === tech && o.status !== "Cancelled")
        .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))
        .slice(0, 8),
    [orders, tech]
  );

  const open = jobs.find((j) => j.id === openId) ?? null;
  const technician = TECHNICIANS.find((t) => t.id === tech)!;

  const patch = (id: string, p: Partial<ServiceOrder>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...p } : o)));

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
      {/* WHOSE PHONE THIS IS — a prototype affordance, not part of the app.
          It sits OUTSIDE the device frame so nobody mistakes it for a screen
          the technician would ever see. */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Signed in as</span>
        {TECHNICIANS.filter((t) => t.active).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTech(t.id);
              setOpenId(null);
            }}
            className={cn(
              "rounded-md px-2 py-1 text-xs transition-colors",
              t.id === tech
                ? "bg-chip text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* THE DEVICE. 390×844 — an iPhone's points, which is the narrowest
          screen this has to work on and therefore the one to design at. */}
      <div className="flex h-[844px] max-h-[calc(100vh-180px)] w-[390px] shrink-0 flex-col overflow-hidden rounded-[2.25rem] border-[10px] border-fp-outline-2 bg-fp-surface-1b shadow-2xl">
        {open ? (
          <Job
            job={open}
            onBack={() => setOpenId(null)}
            onPatch={(p) => patch(open.id, p)}
          />
        ) : (
          <JobList
            jobs={jobs}
            technicianName={technician.name}
            onOpen={setOpenId}
          />
        )}
      </div>
    </div>
  );
}
