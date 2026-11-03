import * as React from "react";
import { ArrowRightLeft, FileSignature, Flag, MapPin, PackageCheck, Wrench } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { DASH, dateOffset, daysFromToday, formatDate } from "../threepl/directoryCore";
import type { MdAsset } from "./assets";
import type { Milestone, MilestoneKind } from "./story";

/*
  ASSET JOURNEY AS A TIMELINE (Pavan, 2026-11-03 — "a journey of an asset
  from the time it was ordered, installed, the current status … expected
  contract end … more like a timeline: on this date this happened").

  Two parts, one story:

    · THE LIFELINE — one bar from the day the asset joined the fleet to the
      day its contract is expected to end. Each stretch is a placement,
      sized by how long it lasted (at the yard, in the workshop, on lease);
      the part still to come is a thin dashed line; TODAY is the violet
      mark (the accent is for the current stage only). Over it, the three
      dates people ask about: in the fleet since, on the current placement
      since, contract ends.

    · THE MILESTONES — a vertical timeline, oldest at the top so it reads as
      a story, dated on the left. Done milestones are solid; the current one
      is the highlighted card; what is expected next (a scheduled move, the
      contract end, a renewal) is dashed. It opens scrolled to today.

  The marks are the Activity card's (28px ring, 14px icon, a 1px line
  between) — the same picture for the same idea: things that happened, in
  order.
*/

const ICON: Record<MilestoneKind, React.ReactNode> = {
  received: <PackageCheck />,
  placed: <MapPin />,
  moved: <ArrowRightLeft />,
  lease: <FileSignature />,
  workshop: <Wrench />,
  end: <Flag />,
};

/* ─────────────────────────────────────────────────────────── lifeline ── */

const SEGMENT: Record<string, string> = {
  lease: "bg-fp-lane-blue",
  yard: "bg-muted-foreground/30",
  workshop: "bg-fp-lane-yellow",
};
const LEGEND = [
  { key: "lease", label: "On lease" },
  { key: "yard", label: "At a yard or site" },
  { key: "workshop", label: "In the workshop" },
];

function Lifeline({ a }: { a: MdAsset }) {
  const today = dateOffset(0);
  const first = a.journey[0]?.from ?? today;
  const contract = a.leases.find((l) => l.status === "Active")?.to ?? null;
  const last = [today, contract, ...a.leases.map((l) => l.to), ...a.movements.map((m) => m.scheduled)]
    .filter((x): x is string => Boolean(x))
    .sort()
    .pop()!;
  const t0 = Date.parse(first);
  const span = Math.max(Date.parse(last) - t0, 1);
  const at = (iso: string) => `${((Date.parse(iso) - t0) / span) * 100}%`;
  const width = (from: string, to: string) => `${((Date.parse(to) - Date.parse(from)) / span) * 100}%`;
  const current = a.journey.find((p) => !p.to);
  const left = contract ? daysFromToday(contract) : null;

  return (
    <section className="flex flex-col gap-4 border-b border-border p-4">
      <dl className="grid grid-cols-3 gap-6">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">{a.ownership === "Rental" ? "In the fleet since" : "Registered since"}</dt>
          <dd className="mt-0.5 text-sm text-foreground">{formatDate(first)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">At its current place since</dt>
          <dd className="mt-0.5 text-sm text-foreground">{current ? `${formatDate(current.from)} · ${current.location.split(" — ")[0]}` : DASH}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Contract ends</dt>
          <dd className="mt-0.5 text-sm text-foreground">
            {contract ? `${formatDate(contract)} · in ${left} days` : <span className="text-muted-foreground">No contract</span>}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1.5">
        <div className="relative h-3 w-full">
          {a.journey.map((p, i) => {
            const end = p.to ?? today;
            const kind = /workshop|refurb/i.test(`${p.location} ${p.note}`) ? "workshop" : p.lease ? "lease" : "yard";
            return (
              <span
                key={i}
                title={`${p.location} · ${formatDate(p.from)} – ${p.to ? formatDate(p.to) : "today"}`}
                className={cn("absolute inset-y-0 rounded-full", SEGMENT[kind])}
                style={{ left: at(p.from), width: width(p.from, end) }}
              />
            );
          })}
          {/* WHAT IS STILL TO COME — a thin dashed line, not a bar. */}
          {last > today && (
            <span
              className="absolute top-1/2 -translate-y-1/2 border-t-2 border-dashed border-muted-foreground/60"
              style={{ left: at(today), width: width(today, last) }}
            />
          )}
          {/* TODAY — the accent, for the current stage only. */}
          <span aria-hidden className="absolute -top-1.5 -bottom-1.5 w-0.5 -translate-x-1/2 rounded-full bg-accent-violet" style={{ left: at(today) }} />
        </div>
        <div className="relative h-4 text-xs text-muted-foreground">
          <span className="absolute left-0">{formatDate(first)}</span>
          <span className="absolute -translate-x-1/2 font-medium text-accent-violet-ink" style={{ left: at(today) }}>
            Today
          </span>
          <span className="absolute right-0">{formatDate(last)}</span>
        </div>
      </div>

      <ul className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {LEGEND.map((l) => (
          <li key={l.key} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("h-2 w-4 rounded-full", SEGMENT[l.key])} />
            {l.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-4 border-t-2 border-dashed border-muted-foreground/60" />
          Expected
        </li>
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── milestones ── */

export function AssetJourney({ asset: a, milestones }: { asset: MdAsset; milestones: Milestone[] }) {
  const now = React.useRef<HTMLLIElement>(null);
  React.useEffect(() => {
    now.current?.scrollIntoView({ block: "center" });
  }, [a.uid]);
  const firstUpcoming = milestones.findIndex((m) => m.state === "Upcoming");

  return (
    <div data-view-box="" className="flex h-full flex-col overflow-hidden rounded-md border border-border">
      <Lifeline a={a} />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {milestones.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No milestones match these filters.</p>
        ) : (
          <ol className="flex flex-col">
            {milestones.map((m, i) => {
              const next = milestones[i + 1];
              const upcoming = m.state === "Upcoming";
              const current = m.state === "Current";
              return (
                <React.Fragment key={m.id}>
                  {/* THE LINE BETWEEN WHAT HAS HAPPENED AND WHAT IS EXPECTED. */}
                  {i === firstUpcoming && (
                    <li className="flex items-center gap-3 py-3 pl-31">
                      <span className="h-px flex-1 bg-accent-violet/40" />
                      <span className="text-xs font-medium text-accent-violet-ink">Today · {formatDate(dateOffset(0))}</span>
                      <span className="h-px flex-1 bg-accent-violet/40" />
                    </li>
                  )}
                  <li ref={current ? now : undefined} className="relative flex gap-3 pb-5 last:pb-0">
                    <span className={cn("w-28 shrink-0 pt-1 text-right text-sm tabular-nums", upcoming ? "text-muted-foreground" : "text-foreground")}>
                      {formatDate(m.date)}
                    </span>
                    {next && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-8 bottom-0 left-34.5 w-px",
                          next.state === "Upcoming" ? "border-l border-dashed border-muted-foreground/50" : "bg-border",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border [&_svg]:size-3.5",
                        current
                          ? "border-accent-violet bg-accent-violet-soft text-accent-violet-ink"
                          : upcoming
                            ? "border-dashed border-muted-foreground/60 bg-card text-muted-foreground"
                            : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {ICON[m.kind]}
                    </span>
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 flex-col gap-1",
                        current && "rounded-lg border border-accent-violet/40 bg-accent-violet-soft/40 p-3 -mt-2",
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn("text-sm font-medium", upcoming ? "text-muted-foreground" : "text-foreground")}>{m.title}</span>
                        {current && <Pill color="violet">Current</Pill>}
                        {upcoming && m.date >= dateOffset(0) && (
                          <span className="text-xs text-muted-foreground">in {daysFromToday(m.date)} days</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">{m.detail}</span>
                      {m.refs.length > 0 && (
                        <span className="flex flex-wrap gap-1.5 pt-0.5">
                          {m.refs.map((r) => (
                            <Pill key={r}>{r}</Pill>
                          ))}
                        </span>
                      )}
                    </div>
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

