import * as React from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CELL, fitWidth } from "../RecordSheet";
import { TableRequiredLabel } from "@/components/form-layout";
import { BannerCallout } from "@/components/ui/banner";
import { blankFrequency, toSchedule, type RuleFrequency } from "./RuleFrequency";
import { ScheduleCell } from "./ScheduleCell";
import { canServe, siteByName } from "./recurringPrograms";
import { VENDORS, type Vendor } from "./vendors";
import { LOADING_ACCOUNTS, suppliersOf } from "./orders";

/**
 * RECOMMENDATIONS (Pavan, 2026-10-06) — RULES suggested from the last six
 * months of deliveries: a product and a frequency, and every ship-to the
 * pattern turns up at. A recommendation is rule-level, not customer-level
 * (Pavan, 2026-10-07): its ship-tos can belong to several customers, or be
 * several ship-tos of one. Offered in two places: as a label in the Create
 * rule form's Frequency unit (Apply fills the frequency), and on the
 * Recurring Orders list (Create rule opens the form with the frequency AND
 * one tab per ship-to filled in). Nothing is ever applied on its own.
 *
 * INVENTED, and flagged: the history behind these is a fixture until the
 * prototype has six months of real orders to read. Only ship-tos with a site
 * record are used, so every one can be reached in step 2.
 */
export interface RecommendedTarget {
  customer: { name: string; erpId: string };
  shipTo: string;
  /** Every product delivered here in the six months. */
  products: string[];
  /** Total gallons delivered here in the six months. */
  gallons: number;
}

export interface Recommendation {
  id: string;
  product: string;
  /** Every ship-to the pattern fits — across customers, or several of one. */
  targets: RecommendedTarget[];
  /** How closely the deliveries kept to THIS frequency — every day of it,
   *  never "one or the other" (an "or" is a separate rule; Pavan, 2026-10-07). */
  match: string;
  deliveries: string;
  quantity: string;
  frequency: RuleFrequency;
  /** Whether the supplier needed a load order, and the loading accounts the
   *  loads were drawn on — the suppliers shown are those accounts' (Pavan,
   *  2026-10-07). With no load order, the suppliers are named directly. The
   *  vendors are worked out below. */
  loadOrder: boolean;
  loadingAccounts: string[];
  suppliers: string[];
}

const today = new Date();
const sundayKey = () => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const BRAY = { name: "Bray, Raymond and Marks", erpId: "ERP 418223" };
const MORRIS = { name: "Morris Group", erpId: "ERP 505112" };
const GPM = { name: "Gonzalez, Palmer and Miller", erpId: "ERP 331904" };
const HALVORSEN = { name: "Halvorsen Fuel Co.", erpId: "ERP 227740" };
const CARDINAL = { name: "Cardinal Logistics", erpId: "ERP 610882" };
const WESTBROOK = { name: "Westbrook Agriculture", erpId: "ERP 884001" };
const IRONLINE = { name: "Ironline Transit", erpId: "ERP 990233" };

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "clear-tue-fri",
    loadOrder: true,
    loadingAccounts: ["Liberty Standard"],
    suppliers: [],
    product: "Clear Diesel #2",
    targets: [
      { customer: BRAY, shipTo: "Bray North Yard", products: ["Clear Diesel #2", "Dyed Diesel"], gallons: 24_960 },
      { customer: BRAY, shipTo: "Bray Depot 2", products: ["Clear Diesel #2"], gallons: 19_680 },
      { customer: MORRIS, shipTo: "Morris Yard 4", products: ["Clear Diesel #2", "Hydraulic Oil AW-46"], gallons: 18_240 },
    ],
    match: "94% on Tuesday and Friday",
    deliveries: "131 deliveries since April",
    quantity: "About 480 gal a drop",
    frequency: { ...blankFrequency(), days: [2, 5], repeat: "weekly" },
  },
  {
    id: "hydraulic-cycle",
    loadOrder: false,
    loadingAccounts: [],
    suppliers: ["Pioneer Distributing"],
    product: "Hydraulic Oil AW-46",
    targets: [
      { customer: BRAY, shipTo: "Bray Depot 2", products: ["Hydraulic Oil AW-46"], gallons: 26_450 },
      { customer: MORRIS, shipTo: "Morris Yard 4", products: ["Hydraulic Oil AW-46", "Clear Diesel #2"], gallons: 25_300 },
      { customer: IRONLINE, shipTo: "Ironline Depot", products: ["Hydraulic Oil AW-46"], gallons: 21_850 },
    ],
    match: "91% on this 2-week cycle",
    deliveries: "64 deliveries since April",
    quantity: "About 1,150 gal a drop",
    frequency: {
      ...blankFrequency(),
      repeat: "cycle",
      cycleWeeks: [[1, 4], [3]],
      cycleStartKey: sundayKey(),
    },
  },
  {
    id: "unleaded-first-week",
    loadOrder: true,
    loadingAccounts: ["Washington Contract"],
    suppliers: [],
    product: "Unleaded 87",
    targets: [
      { customer: GPM, shipTo: "GPM Southside", products: ["Unleaded 87", "Unleaded 91"], gallons: 7_500 },
      { customer: CARDINAL, shipTo: "Cardinal Hub A", products: ["Unleaded 87"], gallons: 8_750 },
      { customer: IRONLINE, shipTo: "Ironline Depot", products: ["Unleaded 87"], gallons: 7_500 },
    ],
    match: "100% on Monday of the first week",
    deliveries: "19 deliveries since April",
    quantity: "About 1,250 gal a drop",
    frequency: { ...blankFrequency(), days: [1], repeat: "monthly", monthWeeks: [1] },
  },
  {
    id: "dyed-mwf",
    loadOrder: true,
    loadingAccounts: ["Greensbro Premium"],
    suppliers: [],
    product: "Dyed Diesel",
    targets: [
      { customer: BRAY, shipTo: "Bray North Yard", products: ["Dyed Diesel", "Clear Diesel #2"], gallons: 46_800 },
      { customer: HALVORSEN, shipTo: "Halvorsen Main", products: ["Dyed Diesel"], gallons: 45_900 },
      { customer: CARDINAL, shipTo: "Cardinal Hub A", products: ["Dyed Diesel", "Unleaded 87"], gallons: 49_500 },
      { customer: WESTBROOK, shipTo: "Westbrook Farm 1", products: ["Dyed Diesel", "DEF Bulk"], gallons: 45_000 },
    ],
    match: "88% on Monday, Wednesday and Friday",
    deliveries: "208 deliveries since April",
    quantity: "About 900 gal a drop",
    frequency: { ...blankFrequency(), days: [1, 3, 5], repeat: "weekly" },
  },
];

/**
 * THE VENDORS WHO HAULED IT — INVENTED, but never impossible: the fewest
 * partners who between them reach every ship-to on the recommendation, so a
 * rule started from it opens on step 2 with every tab reachable. The real
 * thing reads who actually delivered.
 */
function vendorsFor(targets: RecommendedTarget[]): Vendor[] {
  const sites = targets.map((t) => siteByName(t.shipTo)).filter((x) => x !== undefined);
  let left = sites;
  const picked: Vendor[] = [];
  while (left.length > 0) {
    let best: Vendor | null = null;
    let bestHits = 0;
    for (const v of VENDORS) {
      if (picked.includes(v)) continue;
      const hits = left.filter((site) => canServe(v, site)).length;
      if (hits > bestHits) {
        best = v;
        bestHits = hits;
      }
    }
    if (!best) break;
    const chosen = best;
    picked.push(chosen);
    left = left.filter((site) => !canServe(chosen, site));
  }
  return picked;
}

const VENDORS_BY_RECOMMENDATION = new Map(
  RECOMMENDATIONS.map((r) => [r.id, vendorsFor(r.targets)])
);
export const recommendedVendors = (r: Recommendation) => VENDORS_BY_RECOMMENDATION.get(r.id) ?? [];

/** The suppliers on the card: the loading accounts', or the named ones. */
const recommendedSuppliers = (r: Recommendation) =>
  r.loadOrder
    ? [
        ...new Set(
          LOADING_ACCOUNTS.filter((a) => r.loadingAccounts.includes(a.name)).flatMap(suppliersOf)
        ),
      ]
    : r.suppliers;

/**
 * WHAT A RECOMMENDATION COVERS — counted from its ship-tos. Assets are the
 * tanks at those sites that hold the rule's product; gallons are the six
 * months' total. INVENTED through the fixture, like the history.
 */
function coverage(r: Recommendation) {
  const customers = new Set(r.targets.map((t) => t.customer.name)).size;
  const products = new Set(r.targets.flatMap((t) => t.products)).size;
  const assets = r.targets.reduce(
    (n, t) => n + (siteByName(t.shipTo)?.assets.filter((a) => a.product === r.product).length ?? 0),
    0
  );
  const gallons = r.targets.reduce((n, t) => n + t.gallons, 0);
  return { customers, products, assets, gallons, perAsset: assets > 0 ? Math.round(gallons / assets) : 0 };
}

/** The ship-tos grouped under their customer, in first-seen order. */
const byCustomer = (targets: RecommendedTarget[]) => {
  const groups = new Map<string, RecommendedTarget[]>();
  for (const t of targets) groups.set(t.customer.name, [...(groups.get(t.customer.name) ?? []), t]);
  return [...groups.entries()];
};

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
          <stop offset="0" stopColor="color-mix(in oklab, var(--color-accent-violet) 55%, white)" />
          <stop offset="0.5" stopColor="var(--color-accent-violet)" />
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
  applyLabel = "Apply",
  buttonVariant = "ghost",
}: {
  onApply: (r: Recommendation) => void;
  /** "Apply" in the form; "Review and Create Rule" on the list. */
  applyLabel?: string;
  /** Ghost inside a unit's heading; outline on a toolbar beside other buttons. */
  buttonVariant?: "ghost" | "outline";
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant={buttonVariant}
        size="sm"
        className={
          buttonVariant === "ghost"
            ? "-my-1 text-muted-foreground"
            : /* THE OUTLINE IN THE SPARKLE'S VIOLET (Pavan, 2026-10-06). */
              "border-accent-violet"
        }
        onClick={() => setOpen(true)}
      >
        <AiSparkle className="size-[18px]" />
        Recommendations
        {/* A LIGHT WASH OF THE SPARKLE'S VIOLET; the count in the body ink
            (Pavan, 2026-10-07). */}
        <span className="rounded-sm bg-accent-violet-soft px-1.5 text-xs font-medium tabular-nums text-foreground">
          {RECOMMENDATIONS.length}
        </span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          /* SNUG, NOT FULL (Pavan, 2026-10-16): as wide as a card's ship-to
             table at comfortable widths — customer, ship-to, products,
             total — plus the card's and the list's padding; a sheet over a
             sheet, so never wider than the screen less two gaps. */
          className="z-[60] w-[min(var(--fp-rec-w),calc(100vw-112px))] gap-0 p-0 sm:max-w-[min(var(--fp-rec-w),calc(100vw-112px))]"
          style={{ "--fp-rec-w": `${fitWidth({ tables: [[CELL.name, CELL.name, CELL.name, CELL.number]] }) + 24}px` } as React.CSSProperties}
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
              <li key={r.id} className="flex flex-col gap-5 rounded-md border border-fp-outline-1 p-3">
                {/* THE FREQUENCY LEADS THE CARD, with why it is suggested as a
                    banner right under it; the ship-tos behind it below, set
                    apart (Pavan, 2026-10-07). No product title, no section
                    titles. */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <ScheduleCell schedule={toSchedule(r.frequency)} emphasis />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onApply(r);
                        setOpen(false);
                        if (applyLabel === "Apply") toast.success("Recommendation applied");
                      }}
                    >
                      {applyLabel}
                    </Button>
                  </div>
                  {/* Soft banners sit on one line; this one may need two, so the
                      count line wraps whole instead of squeezing. */}
                  <BannerCallout
                    variant="soft"
                    status="info"
                    title={r.match}
                    className="[&>p]:flex-wrap [&>p]:items-baseline [&>p]:gap-y-1 [&>p]:leading-snug"
                  >
                    {/* WHAT THE RULE WOULD COVER (Pavan, 2026-10-07): customers,
                        products, assets and gallons, beside the history. */}
                    {(() => {
                      const c = coverage(r);
                      return [
                        r.deliveries,
                        r.quantity,
                        `${c.customers} ${c.customers === 1 ? "customer" : "customers"}`,
                        `${c.products} ${c.products === 1 ? "product" : "products"}`,
                        `${c.assets} ${c.assets === 1 ? "asset" : "assets"}`,
                        `${c.gallons.toLocaleString("en-US")} gal total`,
                        `${c.perAsset.toLocaleString("en-US")} gal per asset`,
                      ].join(" · ");
                    })()}
                  </BannerCallout>
                  {/* VENDORS, SUPPLIERS, LOAD ORDER (Pavan, 2026-10-07). */}
                  <dl className="grid grid-cols-3 gap-3">
                    {[
                      ["Vendors", recommendedVendors(r).map((v) => v.name).join(", ") || "—"],
                      ["Suppliers", recommendedSuppliers(r).join(", ")],
                      ["Load order", r.loadOrder ? "Required" : "Not required"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex min-w-0 flex-col gap-0.5">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="text-sm text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                    <div data-table-variant="T2" className="overflow-hidden rounded-md border border-fp-outline-1">
                      <table className="w-full table-fixed border-collapse text-xs">
                        <colgroup>
                          <col className="w-[26%]" />
                          <col className="w-[24%]" />
                          <col />
                          <col className="w-[84px]" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-fp-outline-1 bg-fp-table-header">
                            <th className="px-2.5 py-2 text-left">
                              <TableRequiredLabel>Customer</TableRequiredLabel>
                            </th>
                            <th className="px-2.5 py-2 text-left">
                              <TableRequiredLabel>Ship-to</TableRequiredLabel>
                            </th>
                            <th className="px-2.5 py-2 text-left">
                              <TableRequiredLabel>Products</TableRequiredLabel>
                            </th>
                            <th className="px-2.5 py-2 text-right">
                              <TableRequiredLabel>Total (gal)</TableRequiredLabel>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {byCustomer(r.targets).flatMap(([customer, sites]) =>
                            sites.map((t, i) => (
                              <tr key={t.shipTo} className="border-b border-fp-outline-1 align-top last:border-b-0">
                                {i === 0 && (
                                  <td rowSpan={sites.length} className="px-2.5 py-2 text-foreground">
                                    {customer}
                                  </td>
                                )}
                                <td className="px-2.5 py-2 text-foreground">{t.shipTo}</td>
                                <td className="px-2.5 py-2 text-foreground">{t.products.join(", ")}</td>
                                <td className="px-2.5 py-2 text-right tabular-nums text-foreground">
                                  {t.gallons.toLocaleString("en-US")}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
