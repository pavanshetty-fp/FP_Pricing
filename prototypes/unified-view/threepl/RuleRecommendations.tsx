import * as React from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { blankFrequency, toSchedule, type RuleFrequency } from "./RuleFrequency";
import { ScheduleCell } from "./ScheduleCell";

/**
 * RECOMMENDATIONS (Pavan, 2026-10-06) — frequencies suggested from the last
 * six months of deliveries, offered as a label in the Frequency unit. Pressing
 * it opens the list with what each one is based on; Apply fills the picker.
 * Nothing is ever applied on its own.
 *
 * INVENTED, and flagged: the history behind these is a fixture until the
 * prototype has six months of real orders to read.
 */
interface Recommendation {
  id: string;
  site: string;
  product: string;
  basis: string;
  quantity: string;
  frequency: RuleFrequency;
}

const today = new Date();
const sundayKey = () => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "bray-tue-fri",
    site: "Bray North Yard",
    product: "Clear Diesel #2",
    basis: "48 deliveries since April · 94% on a Tuesday or Friday",
    quantity: "About 480 gal a drop",
    frequency: { ...blankFrequency(), days: [2, 5], repeat: "weekly" },
  },
  {
    id: "morris-cycle",
    site: "Morris Yard 4",
    product: "Hydraulic Oil AW-46",
    basis: "26 deliveries since April · alternates every other week",
    quantity: "About 1,150 gal a drop",
    frequency: {
      ...blankFrequency(),
      repeat: "cycle",
      cycleWeeks: [[1, 4], [3]],
      cycleStartKey: sundayKey(),
    },
  },
  {
    id: "gpm-first-week",
    site: "GPM Southside",
    product: "Unleaded 87",
    basis: "6 deliveries since April · always in the first week of the month",
    quantity: "About 1,250 gal a drop",
    frequency: { ...blankFrequency(), days: [1], repeat: "monthly", monthWeeks: [1] },
  },
];

/** A four-point sparkle centred on (cx, cy), `r` from centre to tip. */
const spark = (cx: number, cy: number, r: number) => {
  const k = r * 0.32;
  return `M${cx} ${cy - r}C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy}C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r}C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy}C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
};

/**
 * THE AI MARK (Pavan, 2026-10-06, after an "AI Insights" reference): a filled
 * sparkle with two small ones off its shoulder, in a violet gradient — light
 * at the top left, deep at the bottom right. Colours are the board's violet
 * lane and the violet data-viz step.
 */
function AiSparkle({ className }: { className?: string }) {
  /* Colons from useId would need escaping inside url(). */
  const id = `ai-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        <linearGradient id={id} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="color-mix(in oklab, var(--color-fp-lane-violet) 55%, white)" />
          <stop offset="0.5" stopColor="var(--color-fp-lane-violet)" />
          <stop offset="1" stopColor="var(--fp-viz-7)" />
        </linearGradient>
      </defs>
      <path d={spark(10, 13.5, 8.5)} fill={`url(#${id})`} />
      <path d={spark(18.5, 4.5, 3)} fill={`url(#${id})`} />
      <path d={spark(21.5, 10, 1.8)} fill={`url(#${id})`} />
    </svg>
  );
}

export function RuleRecommendations({
  onApply,
}: {
  onApply: (f: RuleFrequency) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" className="-my-1 text-muted-foreground" onClick={() => setOpen(true)}>
        <AiSparkle className="size-[18px]" />
        Recommendations
        <span className="rounded-sm bg-foreground/10 px-1.5 text-xs tabular-nums text-foreground">
          {RECOMMENDATIONS.length}
        </span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="z-[60] w-[min(460px,calc(100vw-56px))] gap-0 p-0 sm:max-w-[min(460px,calc(100vw-56px))]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border p-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <SheetTitle className="text-base">Recommendations</SheetTitle>
              <span className="text-xs text-muted-foreground">From the last 6 months of deliveries</span>
            </div>
            <button
              type="button"
              aria-label="Close recommendations"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </button>
          </div>
          <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
            {RECOMMENDATIONS.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-md border border-fp-outline-1 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{r.site}</span>
                    <span className="truncate text-xs text-muted-foreground">{r.product}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onApply(r.frequency);
                      setOpen(false);
                      toast.success("Recommendation applied", { description: r.site });
                    }}
                  >
                    Apply
                  </Button>
                </div>
                <ScheduleCell schedule={toSchedule(r.frequency)} />
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span>{r.basis}</span>
                  <span>{r.quantity}</span>
                </div>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
