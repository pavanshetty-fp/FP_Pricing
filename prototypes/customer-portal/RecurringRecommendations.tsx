import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BannerCallout } from "@/components/ui/banner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TableRequiredLabel } from "@/components/form-layout/table-cells";
import { CELL, fitWidth } from "../unified-view/RecordSheet";
import { ScheduleCell } from "../unified-view/threepl/ScheduleCell";
import { parseSchedule } from "../unified-view/threepl/recurring";
import { dateKeyOf, startOfDay } from "../unified-view/data";
import { AiSparkle } from "../unified-view/threepl/RuleRecommendations";
import { assetById } from "./orders";

/*
  RECOMMENDATIONS, THE CUSTOMER'S (Pavan, 2026-10-16 — the 3PL Recurring
  Orders list has them; the portal's should). From the last six months of
  the account's own deliveries: a ship-to whose tanks keep being filled on
  the same weekday is offered as a standing order. The card says how often
  and how sure, which tanks and how much; "Review and Create Rule" opens a
  new recurring request with all of it filled in. Same card as 3PL's: the
  schedule leads, a soft banner says why, a table says what. INVENTED.
*/

export interface PortalRecommendation {
  id: string;
  shipTo: string;
  /** `Weekly On Tuesday` — the 3PL schedule phrasing, read by `parseSchedule`. */
  raw: string;
  /** The portal frequency it becomes. */
  frequency: "Weekly" | "Every 2 weeks";
  weekday: number;
  match: string;
  history: string;
  lines: { assetId: string; gal: number }[];
}

export const PORTAL_RECOMMENDATIONS: PortalRecommendation[] = [
  {
    id: "pr-1",
    shipTo: "Cardinal Hub A",
    raw: "Weekly On Tuesday",
    frequency: "Weekly",
    weekday: 2,
    match: "92% on Tuesday",
    history: "24 deliveries since April · about 5,100 gal a drop",
    lines: [
      { assetId: "a-1", gal: 4800 },
      { assetId: "a-3", gal: 300 },
    ],
  },
  {
    id: "pr-2",
    shipTo: "Cardinal Hub B",
    raw: "Weekly On Friday",
    frequency: "Weekly",
    weekday: 5,
    match: "88% on Friday",
    history: "21 deliveries since April · about 4,600 gal a drop",
    lines: [{ assetId: "b-1", gal: 4600 }],
  },
  {
    id: "pr-3",
    shipTo: "Cardinal Overflow",
    raw: "Custom",
    frequency: "Every 2 weeks",
    weekday: 1,
    match: "85% every second Monday",
    history: "12 deliveries since April · about 2,900 gal a drop",
    lines: [{ assetId: "c-1", gal: 2900 }],
  },
];

/** The next date this recommendation would run — its weekday, from tomorrow. */
export function nextRun(r: PortalRecommendation): string {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== r.weekday) d.setDate(d.getDate() + 1);
  return dateKeyOf(d);
}

const scheduleOf = (r: PortalRecommendation) => parseSchedule(r.raw, nextRun(r));

export function RecurringRecommendations({ onCreate }: { onCreate: (r: PortalRecommendation) => void }) {
  const [open, setOpen] = React.useState(false);
  /* SNUG — as wide as a card's tank table, as on 3PL (2026-10-16). */
  const width = fitWidth({ tables: [[CELL.name, CELL.name, CELL.number]] }) + 24;
  return (
    <>
      {/* 3PL'S BUTTON, AS IS — the sparkle, the violet rim, the count. */}
      <Button variant="outline" size="sm" className="border-accent-violet" onClick={() => setOpen(true)}>
        <AiSparkle className="size-[18px]" />
        Recommendations
        <span className="rounded-sm bg-accent-violet-soft px-1.5 text-xs font-medium tabular-nums text-foreground">
          {PORTAL_RECOMMENDATIONS.length}
        </span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="gap-0 p-0"
          style={{ width: `min(${width}px, calc(100vw - 56px))`, maxWidth: `min(${width}px, calc(100vw - 56px))` }}
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
            {PORTAL_RECOMMENDATIONS.map((r) => (
              <li key={r.id} className="flex flex-col gap-4 rounded-md border border-fp-outline-1 p-3">
                <div className="flex items-start justify-between gap-3">
                  <ScheduleCell schedule={scheduleOf(r)} emphasis />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      onCreate(r);
                    }}
                  >
                    Review and Create Rule
                  </Button>
                </div>
                <BannerCallout variant="soft" status="info" title={r.match}>
                  {r.history}
                </BannerCallout>
                <div data-table-variant="T2" className="overflow-hidden rounded-md border border-fp-outline-1">
                  <table className="w-full table-fixed border-collapse text-xs">
                    <colgroup>
                      <col />
                      <col className="w-[40%]" />
                      <col className="w-[110px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-fp-outline-1 bg-fp-table-header">
                        <th className="px-2.5 py-2 text-left">
                          <TableRequiredLabel>Tank / asset</TableRequiredLabel>
                        </th>
                        <th className="px-2.5 py-2 text-left">
                          <TableRequiredLabel>Product</TableRequiredLabel>
                        </th>
                        <th className="px-2.5 py-2 text-right">
                          <TableRequiredLabel>Qty (gal)</TableRequiredLabel>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.lines.map((l) => {
                        const a = assetById(l.assetId);
                        return (
                          <tr key={l.assetId} className="border-b border-fp-outline-1 last:border-b-0">
                            <td className="px-2.5 py-2 text-foreground">
                              {a?.name ?? l.assetId} · {r.shipTo}
                            </td>
                            <td className="px-2.5 py-2 text-foreground">{a?.product ?? "—"}</td>
                            <td className="px-2.5 py-2 text-right tabular-nums text-foreground">
                              {l.gal.toLocaleString("en-US")}
                            </td>
                          </tr>
                        );
                      })}
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
