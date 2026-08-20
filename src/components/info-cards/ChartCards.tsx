import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  The chart-style information cards from the "Information Card & tooltip" canvas
  (27597:62089): a bar-chart breakdown, an earnings donut, and a payback-period
  calculation row. Rendered with CSS/SVG (no chart library) for the Info Cards
  tab.
*/

function Card({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-lg border border-border bg-fp-surface-1b p-5",
        className
      )}
    >
      <h4 className="text-base font-semibold">{title}</h4>
      {children}
    </div>
  );
}

/* ── Bar chart — "Price Breakdown per gal" ─────────────────────────────────── */
/* Series colours come from the categorical chart palette (--chart-1..5, 449:6176)
   so these bars match the Recharts cards on the Dashboard. */
const BARS = [
  { label: "Base Price", value: 8065, color: "bg-chart-2" },
  { label: "Fee", value: 4000, color: "bg-chart-4" },
  { label: "Tax", value: 2000, color: "bg-chart-1" },
  { label: "Discount", value: 2000, color: "bg-chart-5" },
  { label: "Margin", value: 4000, color: "bg-chart-3" },
];
const Y_TICKS = [8000, 6000, 4000, 2000, 0];
const Y_MAX = 8500;

export function BarChartCard({ className }: { className?: string }) {
  return (
    <Card title="Price Breakdown per gal" className={className}>
      <div className="flex gap-3">
        {/* Y axis */}
        <div className="flex w-12 flex-col justify-between py-1 text-right text-xs text-muted-foreground">
          {Y_TICKS.map((t) => (
            <span key={t}>{t === 0 ? "0" : `$${t.toLocaleString()}`}</span>
          ))}
        </div>
        {/* Plot */}
        <div className="flex-1">
          <div className="flex h-48 gap-4 border-l border-b border-border pl-4">
            {BARS.map((b) => (
              <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end">
                <div
                  className={cn("w-full max-w-12 rounded-t-sm", b.color)}
                  style={{ height: `${(b.value / Y_MAX) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 pl-4 pt-2">
            {BARS.map((b) => (
              <span key={b.label} className="flex-1 text-center text-xs text-muted-foreground">
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Donut — "Amount you Earned" ───────────────────────────────────────────── */
/* Conic-gradient stops need a resolvable colour value, so the chart tokens are
   referenced as CSS vars rather than hexes. */
const DONUT = [
  { label: "Base price", value: 8065, amount: "+$8,065.00", color: "var(--color-chart-4)" },
  { label: "Margin", value: 4000, amount: "+$4,000.00", color: "var(--color-chart-3)" },
];

export function DonutCard({ className }: { className?: string }) {
  const total = DONUT.reduce((s, d) => s + d.value, 0);
  // Build conic-gradient stops.
  let acc = 0;
  const stops = DONUT.map((d) => {
    const start = (acc / total) * 360;
    acc += d.value;
    const end = (acc / total) * 360;
    return `${d.color} ${start}deg ${end}deg`;
  }).join(", ");

  return (
    <Card title="Amount you Earned" className={className}>
      <div className="flex items-center gap-6">
        <div
          className="size-44 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(${stops})`,
            // donut hole
            mask: "radial-gradient(circle, transparent 56px, black 57px)",
            WebkitMask: "radial-gradient(circle, transparent 56px, black 57px)",
          }}
        />
        <div className="flex flex-col gap-3">
          {DONUT.map((d) => (
            <div key={d.label} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-foreground">{d.label}:</span>
              <span className="tabular-nums text-muted-foreground">{d.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ── Payback period — calculation breakdown ────────────────────────────────── */
export function PaybackCard({ className }: { className?: string }) {
  return (
    <Card title="Calculation Breakdown:" className={className}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm">
          <span className="font-medium text-foreground">Payback Period: </span>
          <span className="text-muted-foreground">
            (Amount to Recover / Gross Margin per Month)
          </span>
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-status-success">
          ~ 7.87 months
          <ChevronUp className="size-4" />
        </span>
      </div>
    </Card>
  );
}
