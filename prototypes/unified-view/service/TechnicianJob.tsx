import * as React from "react";
import {
  Camera,
  Check,
  Clock,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  WORK_TYPE_NAMES,
  computedLabor,
  formatHours,
  money,
  quoteableTotal,
  shortfallLabel,
  syncVisits,
  type AssessmentLine,
  type AssessmentVerdict,
  type PartLine,
  type ServiceOrder,
  type WorkStatus,
} from "./work";
import { useServiceSettings } from "./settings";
import { useElapsedHours } from "./sheet-parts";
import { ActionBar, Body, Facts, SectionTitle, TopBar } from "./TechnicianMobile";

/*
  ═══════════════════════════════════════════════════════════════════════════
  INSIDE ONE JOB, ON THE PHONE (Pavan, 2026-09-24).
  ═══════════════════════════════════════════════════════════════════════════

  The order of things a technician actually does on site:

    ON SITE    arrival — the address, the time, the contact
    ASSESS     the ORDER against what is in front of them, LINE BY LINE:
               right as ordered · different · not needed — plus anything
               found that the order never mentioned. A note and photos on
               every line.
    QUOTE      built from the assessment, shared with the customer, and
               their acknowledgement taken on site
    WORK       the clock, from one press
    COMPLETE   everything done — or partly done, parts missing, and then
               what happens to the rest: a LINKED order (this one carries
               on) or a NEW order (this one closes, the rest is its own job)

  The quote steps follow the company's field-quoting switch; everything else
  is every job.
*/

type Stage = "travel" | "assess" | "quote" | "ack" | "ready" | "work" | "complete" | "done";

const nowIso = () => new Date().toISOString();
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/** The assessment is settled when every line has a verdict and says what it needs where it must. */
const assessmentComplete = (lines: AssessmentLine[]) =>
  lines.length > 0 &&
  lines.every(
    (l) =>
      l.verdict !== null &&
      ((l.verdict !== "different" && l.verdict !== "added") || l.actual.trim().length > 0)
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

const VERDICTS: { key: Exclude<AssessmentVerdict, "added">; label: string }[] = [
  { key: "accurate", label: "As ordered" },
  { key: "different", label: "Different" },
  { key: "skip", label: "Not needed" },
];

/** A job's order line or site finding, as the customer will see it on the quote. */
const lineTitle = (l: AssessmentLine) => [l.assetName, l.workType].filter(Boolean).join(" · ");

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
}: {
  job: ServiceOrder;
  onBack: () => void;
  onPatch: (patch: Partial<ServiceOrder>) => void;
  /** A partial completion — the screen owns it, because one outcome creates an order. */
  onSplit: (req: SplitRequest) => void;
}) {
  const cfg = useServiceSettings();
  const elapsed = useElapsedHours(job.startedAt && !job.completedAt ? job.startedAt : null);

  const [lines, setLines] = React.useState<AssessmentLine[]>(
    () => job.assessmentLines ?? linesFromOrder(job)
  );
  const [ackBy, setAckBy] = React.useState(job.quote?.acknowledgedBy ?? "");
  const [ending, setEnding] = React.useState<"full" | "partial" | null>(null);
  const [endedAt, setEndedAt] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState(job.techNotes ?? "");
  const [parts, setParts] = React.useState<PartLine[]>(() =>
    job.parts.map((p) => ({ ...p, fittedQty: p.fittedQty ?? p.qty }))
  );
  const [mode, setMode] = React.useState<"continue" | "neworder">(cfg.returnMode);

  const assessed = Boolean(job.assessmentLines && assessmentComplete(job.assessmentLines));
  const handedIn = Boolean(job.completedAt) || job.status === "Parts pending" || job.status === "Completed — linked";

  const stage: Stage = handedIn
    ? "done"
    : ending
      ? "complete"
      : !job.arrivedAt
        ? "travel"
        : !assessed
          ? "assess"
          : cfg.fieldQuote && !job.quote
            ? "quote"
            : cfg.fieldQuote && job.quote && !job.quote.approvedAt
              ? "ack"
              : !job.startedAt
                ? "ready"
                : "work";

  const sub = `${job.orderNo} · ${job.shipTo}`;
  const toDo = (job.assessmentLines ?? lines).filter((l) => l.verdict !== "skip");
  const skipped = (job.assessmentLines ?? lines).filter((l) => l.verdict === "skip");

  /* ── ON SITE ── */
  if (stage === "travel") {
    return (
      <>
        <TopBar title={job.customer} subtitle={sub} onBack={onBack} />
        <Body>
          <Facts
            items={[
              { icon: <MapPin className="size-4" />, label: "Site", value: <>{job.shipTo}<br />{job.city}{job.city && ", "}{job.state}</> },
              { icon: <Clock className="size-4" />, label: "Booked for", value: job.scheduledAt ? timeFmt.format(new Date(job.scheduledAt)) : "Any time" },
              { icon: <Wrench className="size-4" />, label: "On the order", value: linesFromOrder(job).map((l) => [lineTitle(l), l.reported].filter(Boolean).join(" — ")).join("; ") },
              { icon: <Phone className="size-4" />, label: "Site contact", value: "+1 559-555-0104" },
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

  /* ── ASSESS ── the order against the site, line by line. */
  if (stage === "assess") {
    const set = (key: string, patch: Partial<AssessmentLine>) =>
      setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    const ready = assessmentComplete(lines);
    const open = lines.filter((l) => l.verdict === null).length;
    return (
      <>
        <TopBar title="Assessment" subtitle={sub} onBack={onBack} />
        <Body>
          {lines.map((l, i) => (
            <AssessmentCard
              key={l.key}
              index={i}
              line={l}
              onChange={(p) => set(l.key, p)}
              onRemove={l.source === "added" ? () => setLines((ls) => ls.filter((x) => x.key !== l.key)) : undefined}
            />
          ))}
          <Button
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
          </Button>
        </Body>
        <ActionBar
          label="Save assessment"
          disabled={!ready}
          note={
            ready
              ? undefined
              : open > 0
                ? `${open} line${open === 1 ? "" : "s"} still to assess`
                : "Say what each different or added line needs"
          }
          onPress={() => {
            const count = (v: AssessmentVerdict) => lines.filter((l) => l.verdict === v).length;
            onPatch({
              assessmentLines: lines,
              /* THE ONE-LINE SUMMARY the dispatcher's sheet already reads. */
              assessment: [
                count("accurate") && `${count("accurate")} as ordered`,
                count("different") && `${count("different")} different`,
                count("added") && `${count("added")} added`,
                count("skip") && `${count("skip")} not needed`,
              ]
                .filter(Boolean)
                .join(" · "),
            });
            toast.success("Assessment saved");
          }}
        />
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
                    {l.verdict === "accurate" ? l.reported : l.actual}
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
          secondary="Skip — no quote needed"
          onSecondary={() => {
            onPatch({ quote: { parts: [], fees: [], total: 0, sentAt: nowIso(), approvedAt: nowIso() } });
            toast.success("Quote skipped");
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

  /* ── READY ── */
  if (stage === "ready") {
    return (
      <>
        <TopBar title="Ready to start" subtitle={sub} onBack={onBack} />
        <Body>
          <AssessedWork lines={toDo} />
          <Facts
            items={[
              { icon: <Package className="size-4" />, label: "Parts", value: job.parts.length ? job.parts.map((p) => `${p.qty} × ${p.name}`).join(", ") : "None on this job" },
            ]}
          />
        </Body>
        <ActionBar
          label="Start labour"
          note="Dispatch sees the clock from this press."
          onPress={() => {
            onPatch({
              ...syncVisits({ visits: [...job.visits, { startedAt: nowIso(), endedAt: null, technicianId: job.technicianId, override: null }] }),
              status: "Ongoing" as WorkStatus,
            });
            toast.success("Labour started");
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

/** One line to assess: the verdict, what it needs, a note, photos. */
function AssessmentCard({
  index,
  line,
  onChange,
  onRemove,
}: {
  index: number;
  line: AssessmentLine;
  onChange: (p: Partial<AssessmentLine>) => void;
  onRemove?: () => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const added = line.source === "added";
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted-foreground">
            {added ? "Found on site" : `Line ${index + 1} on the order`}
          </span>
          {!added && <span className="text-sm font-medium text-foreground">{lineTitle(line)}</span>}
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label="Remove this line" className="flex size-11 items-center justify-center rounded-md text-muted-foreground active:bg-accent">
            <X className="size-4" />
          </button>
        )}
      </div>

      {added ? (
        <>
          <Input value={line.assetName} onChange={(e) => onChange({ assetName: e.target.value })} placeholder="Asset" className="h-11" />
          {/* THE PHONE'S OWN PICKER — a native select is the mobile control
              for one choice from a fixed list. */}
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
        </>
      ) : (
        <>
          <div className="rounded-md bg-fp-card-1 px-3 py-2">
            <p className="text-xs text-muted-foreground">The order says</p>
            <p className="text-sm text-foreground">{line.reported || "—"}</p>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-md bg-chip p-1">
            {VERDICTS.map((v) => (
              <button
                key={v.key}
                type="button"
                aria-pressed={line.verdict === v.key}
                onClick={() => onChange({ verdict: v.key })}
                className={cn(
                  "h-10 rounded text-sm",
                  line.verdict === v.key ? "bg-fp-surface-1a font-medium text-foreground shadow-xs" : "text-muted-foreground"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </>
      )}

      {(line.verdict === "different" || added) && (
        <Textarea
          value={line.actual}
          onChange={(e) => onChange({ actual: e.target.value })}
          rows={2}
          placeholder={added ? "What it needs" : "What it actually needs"}
          className="text-base"
        />
      )}

      <Textarea value={line.note} onChange={(e) => onChange({ note: e.target.value })} rows={2} placeholder="Note" className="text-base" />

      <div className="flex flex-wrap gap-2">
        {line.photos.map((src, i) => (
          <div key={src} className="relative size-16 overflow-hidden rounded-md border border-fp-outline-1">
            <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => onChange({ photos: line.photos.filter((p) => p !== src) })}
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
        {/* `capture` opens the camera on a phone; on a desktop it is a file picker. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onChange({ photos: [...line.photos, ...files.map((f) => URL.createObjectURL(f))] });
            e.target.value = "";
          }}
        />
      </div>
    </section>
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
            <span className="text-xs text-muted-foreground">{l.verdict === "accurate" ? l.reported : l.actual}</span>
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
