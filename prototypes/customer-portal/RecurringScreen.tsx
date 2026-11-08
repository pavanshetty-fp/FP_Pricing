import * as React from "react";
import { DetailViewMenuItem } from "../unified-view/RecordSheet";
import { toast } from "sonner";
import { Ban, MoreHorizontal, Pause, Pencil, Play, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { CELL, RecordSheet } from "../unified-view/RecordSheet";
import { ActivityCard } from "../unified-view/SheetCards";
import { DATE_FMT } from "../unified-view/data";
import { kindTone, statusTones } from "../unified-view/statusKind";
import { TwoLineCell, type ListColumn } from "../unified-view/ListTable";
import { OverflowChip } from "../unified-view/BreakdownCard";
import { ScheduleCell } from "../unified-view/threepl/ScheduleCell";
import {
  LINE_SCOPES,
  REQUEST_STATUS_TONE,
  SHIP_TOS,
  allRequests,
  assetById,
  inLine,
  lastProductFor,
  useRequests,
  windowText,
  type OrderRequest,
  type RequestLine,
} from "./orders";
import { usePortalNav } from "./nav";
import { PortalList } from "./PortalList";
import { RuleSheet } from "./RuleSheet";
import { RecurringRecommendations, nextRun, type PortalRecommendation } from "./RecurringRecommendations";
import {
  RULE_STATUSES,
  blankRule,
  ruleDayLabel,
  runDates,
  scheduleOfRule,
  setRuleStatus,
  toggleRuleSkip,
  useRules,
  type PortalRule,
  type RuleStatus,
} from "./portalRules";

/*
  RECURRING ORDERS — THE CUSTOMER'S RULES (Pavan, 2026-10-16). One row per
  rule, with the 3PL list's whole toolkit (saved views, line of service,
  Create Rule, Recommendations beside Filters, search, filters, search by
  column, column settings). A rule makes its orders itself — each a Draft in
  Order Requests that the customer sends on. A row opens the rule: what it
  is, the orders it has made, the dates coming (skippable), its history;
  ⋯ edits (future orders only), pauses, resumes, ends.
*/

const RULE_TONE = statusTones<RuleStatus>({ Active: "info", Paused: "caution", Ended: "neutral" });

const galOf = (lines: RequestLine[]) => lines.reduce((t, l) => t + (l.gal || 0), 0);
const qtyText = (lines: RequestLine[]) => (galOf(lines) ? galOf(lines).toLocaleString() : "Top off");

function Products({ lines }: { lines: RequestLine[] }) {
  const named = lines.filter((l) => l.product);
  const more = named.length - 1;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-sm">
      <span className="truncate">{named[0]?.product ?? "—"}</span>
      {more > 0 && (
        <OverflowChip
          count={more}
          label={`Show all ${named.length} lines`}
          card={{
            title: `All products (${named.length})`,
            rows: named.map((l) => ({
              label: l.product,
              sub: assetById(l.assetId)?.name,
              value: l.topOff ? "Top off" : `${l.gal.toLocaleString()} gal`,
            })),
          }}
        />
      )}
    </span>
  );
}

type RK = "rule" | "shipTo" | "products" | "qty" | "schedule" | "next" | "made" | "status";
/* TUNED BY HAND TO FILL THE TABLE (Pavan, 2026-10-21). Each starts from its
   widest cell (DS ui §10p) and gets 10–15% more; Ship-to and Schedule get
   more again, Qty extra room on its right so it stands off the Schedule
   grid. Numbers sit left. Spare width goes to the wide columns (DS ui §10p). */
const LIST_COLUMNS: ListColumn<RK>[] = [
  { key: "rule", label: "Rule", width: 90, sortable: true },
  { key: "shipTo", label: "Ship-to", width: 220, sortable: true },
  { key: "products", label: "Products", width: 125, sortable: true },
  { key: "qty", label: "Qty (gal)", width: 150, sortable: true },
  { key: "schedule", label: "Schedule", width: 380, sortable: true },
  { key: "next", label: "Next Delivery", width: 140, sortable: true },
  { key: "made", label: "Orders Made", width: 135, sortable: true },
  { key: "status", label: "Status", width: 105, sortable: true },
];

const nextOf = (r: PortalRule) => (r.status === "Active" ? runDates(r, 120).find((d) => !d.skipped) : undefined);

const Fact = ({ children }: { children: React.ReactNode }) => (
  <span className="flex min-h-9 items-center text-sm text-foreground">{children}</span>
);

/* THE RULE, OPENED. */
function RuleDetail({
  rule,
  made,
  open,
  onOpenChange,
  onEdit,
}: {
  rule: PortalRule | null;
  made: OrderRequest[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: () => void;
}) {
  const nav = usePortalNav();
  const [ending, setEnding] = React.useState(false);
  if (!rule) return null;
  const madeDates = new Set(made.map((m) => m.date));
  const coming = rule.status === "Ended" ? [] : runDates(rule, 31).filter((d) => !madeDates.has(d.key));
  const ends = rule.frequency.endKey ? DATE_FMT.format(new Date(`${rule.frequency.endKey}T00:00`)) : "No end";
  return (
    <>
      <RecordSheet
        /* WIDTH FROM ITS TABLE — request, date, products, qty, status, act — and the history rail. */
        fit={{ tables: [[CELL.name, CELL.date, CELL.name, CELL.number, CELL.status, CELL.number]], rail: true }}
        open={open}
        onOpenChange={onOpenChange}
        mode="edit"
        editTitle={rule.name === rule.ruleNo ? rule.ruleNo : `${rule.ruleNo} · ${rule.name}`}
        createTitle=""
        createAction=""
        showCancel={false}
        onSubmit={() => {}}
        footerPrimary={null}
        headerAside={
          <StatusChip tone={RULE_TONE[rule.status]} variant="text">
            {rule.status}
          </StatusChip>
        }
        headerMenu={
          rule.status === "Ended" ? undefined : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${rule.ruleNo}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DetailViewMenuItem />
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil />
                  Edit rule
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setRuleStatus(rule.id, rule.status === "Active" ? "Paused" : "Active");
                    toast.success(`${rule.ruleNo} ${rule.status === "Active" ? "paused" : "resumed"}`);
                  }}
                >
                  {rule.status === "Active" ? <Pause /> : <Play />}
                  {rule.status === "Active" ? "Pause rule" : "Resume rule"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setEnding(true)}>
                  <Ban />
                  End rule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-10">
            <SheetSection title="Rule">
              <div className="grid grid-cols-3 gap-6">
                <SheetField label="Ship-to">
                  <Fact>{rule.shipTo}</Fact>
                </SheetField>
                <SheetField label="Runs on">
                  <ScheduleCell schedule={scheduleOfRule(rule)} roomy />
                </SheetField>
                <SheetField label="Delivery window">
                  <Fact>{windowText(rule)}</Fact>
                </SheetField>
                <SheetField label="Starts">
                  <Fact>{DATE_FMT.format(new Date(`${rule.startKey}T00:00`))}</Fact>
                </SheetField>
                <SheetField label="Ends">
                  <Fact>{ends}</Fact>
                </SheetField>
                <SheetField label="Make each order">
                  <Fact>{rule.leadDays} days before</Fact>
                </SheetField>
                <SheetField label="PO">
                  <Fact>{rule.po.mode === "standing" ? rule.po.number || "—" : "Each order asks"}</Fact>
                </SheetField>
                <SheetField label="Reminders">
                  <Fact>{rule.remind ? "On" : "Off"}</Fact>
                </SheetField>
              </div>
            </SheetSection>

            <SheetSection title="Orders" flush>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-fp-table-header">
                    {["Order #", "Planned Date", "Products", "Qty (gal)", "Status", ""].map((h, i) => (
                      <th
                        key={i}
                        className={cn("whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground", i === 3 && "text-right")}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...made]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((m) => {
                      const l = ruleDayLabel(m.date);
                      return (
                        <tr key={m.id} className="h-12 border-b border-border last:border-b-0">
                          <td className="whitespace-nowrap px-3">
                            <button
                              type="button"
                              className="tabular-nums text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 hover:decoration-solid"
                              onClick={() => nav.openOrder(m.requestNo)}
                            >
                              {m.requestNo}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-3">
                            <TwoLineCell title={l.title} description={l.description} />
                          </td>
                          <td className="px-3 text-muted-foreground">
                            <Products lines={m.lines} />
                          </td>
                          <td className="whitespace-nowrap px-3 tabular-nums text-foreground">{qtyText(m.lines)}</td>
                          <td className="whitespace-nowrap px-3">
                            <StatusChip tone={REQUEST_STATUS_TONE[m.status]} variant="soft">
                              {m.status}
                            </StatusChip>
                          </td>
                          <td />
                        </tr>
                      );
                    })}
                  {coming.map((d) => {
                    const l = ruleDayLabel(d.key);
                    return (
                      <tr key={d.key} className="h-12 border-b border-border last:border-b-0">
                        <td className="whitespace-nowrap px-3 text-muted-foreground">Not made yet</td>
                        <td className="whitespace-nowrap px-3">
                          <span className={cn("flex flex-col leading-tight", d.skipped && "line-through decoration-muted-foreground/60")}>
                            <span className="text-foreground">{l.title}</span>
                            <span className="text-xs text-muted-foreground">{l.description}</span>
                          </span>
                        </td>
                        <td className="px-3 text-muted-foreground">
                          <Products lines={rule.lines} />
                        </td>
                        <td className="whitespace-nowrap px-3 tabular-nums text-foreground">{qtyText(rule.lines)}</td>
                        <td className="whitespace-nowrap px-3">
                          <StatusChip tone={kindTone(d.skipped || rule.status !== "Active" ? "neutral" : "info")} variant="soft">
                            {d.skipped ? "Skipped" : rule.status === "Paused" ? "Paused" : "Upcoming"}
                          </StatusChip>
                        </td>
                        <td className="whitespace-nowrap px-3 text-right">
                          {rule.status === "Active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toggleRuleSkip(rule.id, d.key);
                                toast.success(d.skipped ? `${l.title} back on` : `${l.title} skipped`);
                              }}
                            >
                              {d.skipped ? "Undo skip" : "Skip"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SheetSection>
          </div>
          <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
            <ActivityCard entries={rule.audit} />
          </aside>
        </div>
      </RecordSheet>
      <AlertDialog open={ending} onOpenChange={setEnding}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End {rule.ruleNo}?</AlertDialogTitle>
            <AlertDialogDescription>No more orders are made from it. Orders already made stay.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRuleStatus(rule.id, "Ended");
                toast.success(`${rule.ruleNo} ended`);
                setEnding(false);
              }}
            >
              End rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RecurringScreen() {
  const rules = useRules();
  const requests = useRequests();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ rule: PortalRule | null; seed?: Partial<PortalRule> } | null>(null);

  const rows = rules;
  const madeBy = (id: string) => requests.filter((q) => q.ruleId === id);
  const opened = rules.find((r) => r.id === openId) ?? null;

  /* A RECOMMENDATION, AS A NEW RULE — filled in, for the customer to check. */
  const fromRecommendation = (rec: PortalRecommendation) => {
    const base = blankRule();
    const start = nextRun(rec);
    const lines = rec.lines.map((l) => ({
      assetId: l.assetId,
      product: lastProductFor(l.assetId, allRequests()) ?? assetById(l.assetId)?.product ?? "",
      topOff: false,
      gal: l.gal,
    }));
    setForm({
      rule: null,
      seed: {
        shipTo: rec.shipTo,
        frequency:
          rec.frequency === "Every 2 weeks"
            ? { ...base.frequency, days: [rec.weekday], repeat: "cycle", cycleWeeks: [[rec.weekday], []], cycleStartKey: start }
            : { ...base.frequency, days: [rec.weekday], repeat: "weekly" },
        lines,
      },
    });
  };

  const text = (r: PortalRule, k: RK): string => {
    switch (k) {
      case "rule":
        return `${r.name} ${r.ruleNo}`;
      case "shipTo":
        return r.shipTo;
      case "products":
        return r.lines.map((l) => l.product).join(", ");
      case "qty":
        return String(galOf(r.lines));
      case "schedule":
        return scheduleOfRule(r).label;
      case "next": {
        const n = nextOf(r);
        return n ? ruleDayLabel(n.key).title : "";
      }
      case "made":
        return String(madeBy(r.id).length);
      case "status":
        return r.status;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PortalList<PortalRule, RK>
        rows={rows}
        columns={LIST_COLUMNS}
        rowId={(r) => r.id}
        text={text}
        sortValue={(r, k) =>
          k === "qty" ? galOf(r.lines) : k === "made" ? madeBy(r.id).length : k === "next" ? (nextOf(r)?.key ?? "9999") : undefined
        }
        renderCell={(r, k) => {
          switch (k) {
            case "rule":
              return r.name === r.ruleNo ? (
                <span className="truncate text-sm">{r.ruleNo}</span>
              ) : (
                <TwoLineCell title={r.name} description={r.ruleNo} />
              );
            case "shipTo":
              return <span className="truncate text-sm">{r.shipTo}</span>;
            case "products":
              return <Products lines={r.lines} />;
            case "qty":
              return <span className="text-sm tabular-nums">{qtyText(r.lines)}</span>;
            case "schedule":
              return <ScheduleCell schedule={scheduleOfRule(r)} roomy />;
            case "next": {
              const n = nextOf(r);
              if (!n) return <span className="text-sm text-muted-foreground">—</span>;
              const l = ruleDayLabel(n.key);
              return <TwoLineCell title={l.title} description={l.description} />;
            }
            case "made":
              return <span className="text-sm tabular-nums">{madeBy(r.id).length}</span>;
            case "status":
              return (
                <StatusChip tone={RULE_TONE[r.status]} variant="text">
                  {r.status}
                </StatusChip>
              );
          }
        }}
        facets={[
          /* LINE OF SERVICE IS A FILTER (Pavan, 2026-10-21). */
          { key: "line", label: "Line of Service", options: LINE_SCOPES.filter((l) => l !== "All") },
          { key: "status", label: "Status", options: [...RULE_STATUSES] },
          { key: "shipTo", label: "Ship-to", options: SHIP_TOS.map((x) => x.name) },
        ]}
        facetValues={(r, f) =>
          f === "line"
            ? LINE_SCOPES.filter((l) => l !== "All" && inLine(r, l))
            : f === "status"
              ? [r.status]
              : f === "shipTo"
                ? [r.shipTo]
                : []
        }
        storageKey="portal-recurring-rules"
        noun="rules"
        nounOne="rule"
        searchPlaceholder="Search rules, ship-tos, products…"
        ctaLabel="Create Rule"
        onCreate={() => setForm({ rule: null })}
        afterFilters={<RecurringRecommendations onCreate={fromRecommendation} />}
        onOpen={(r) => setOpenId(r.id)}
        openLabel={(r) => `Open rule ${r.ruleNo}`}
        emptyIcon={<Repeat />}
      />
      <RuleDetail
        rule={opened}
        made={openId ? madeBy(openId) : []}
        open={opened !== null && form === null}
        onOpenChange={(o) => !o && setOpenId(null)}
        onEdit={() => setForm({ rule: opened })}
      />
      <RuleSheet
        rule={form?.rule ?? null}
        seed={form?.seed ?? null}
        open={form !== null}
        onOpenChange={(o) => !o && setForm(null)}
      />
    </div>
  );
}
