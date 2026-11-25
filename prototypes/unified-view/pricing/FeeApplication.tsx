import * as React from "react";
import { toast } from "sonner";
import { ExternalLink, MinusCircle, MoreHorizontal, Undo2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pill } from "@/components/ui/pill";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordSheet } from "../RecordSheet";
import {
  customerOf,
  plural,
  productOf,
  shiptoOf,
  type ConfigRow,
} from "./changeLog";
import { useChangeLog } from "./changeLogStore";
import {
  matchText,
  scopeText,
  feeCell,
  feesOnCustomer,
  feesOnRow,
  modeOf,
  perGalText,
  rateText,
  ruleText,
  setCustomerFee,
  setRowFee,
  syncOwn,
  useFees,
  useHubMap,
  type Fee,
} from "./fees";
import { APPLIED_LABEL } from "./pricingConfig";
import { ShiptoCount } from "./customerShiptoParts";
import { openFeeInNewTab } from "./pricingNav";

/*
  THE APPLICATION LAYER (Yash, 2026-11-24) — what a price or a customer gets
  from the fees whose scope reaches it. Remove takes a fee off here until it
  is put back; nothing is edited here. Edit fee opens the fee's own page in
  a new tab. Groups: Always applied · By rule · Offered on orders · Removed.
*/

export type FeeTarget =
  { kind: "row"; rowId: string } | { kind: "customer"; customerId: string };

/** Every price's fees, kept in step with the store and the rows. */
export function useRowFees() {
  const log = useChangeLog();
  /* Snapshots first, so the store read below already has them. */
  syncOwn(log.rows);
  const fees = useFees();
  const hub = useHubMap(log.rows, log.entityMap);
  return React.useCallback(
    (r: ConfigRow) => feesOnRow(r, hub(r.shiptoId), fees),
    [fees, hub, log.rows],
  ); // eslint-disable-line react-hooks/exhaustive-deps
}

interface Line {
  fee: Fee;
  removed: boolean;
  /** The scope combination that reaches it: "All customers · Heating Fuels". */
  note: string;
  /** On a customer: the ship-tos it reaches, of those following the customer. */
  reach?: { shiptoIds: string[]; of: number };
  /** Removed on the customer, seen from a ship-to that follows it. */
  fromCustomer?: boolean;
}

/** The four groups, in reading order. */
const GROUPS: { key: string; title: string; has: (l: Line) => boolean }[] = [
  {
    key: "always",
    title: "Always applied",
    has: (l) => !l.removed && modeOf(l.fee) === "always",
  },
  {
    key: "review",
    title: "Offered on orders",
    has: (l) => !l.removed && l.fee.review,
  },
  {
    key: "rule",
    title: "By rule",
    has: (l) => !l.removed && modeOf(l.fee) === "rule",
  },
  { key: "removed", title: "Removed", has: (l) => l.removed },
];

/** The lines for a target. */
export function useFeeLines(target: FeeTarget | null): Line[] {
  const log = useChangeLog();
  const fees = useFees();
  const rowFees = useRowFees();
  const hub = useHubMap(log.rows, log.entityMap);
  if (!target) return [];
  if (target.kind === "row") {
    const row = log.rows.find((r) => r.id === target.rowId);
    if (!row) return [];
    return rowFees(row).map((x) => ({
      fee: x.fee,
      removed: x.state === "removed",
      note: matchText(x.fee, row, hub(row.shiptoId)),
      fromCustomer: x.removedAt === "customer",
    }));
  }
  return feesOnCustomer(
    target.customerId,
    log.rows,
    (r) => hub(r.shiptoId),
    fees,
  ).map((x) => ({
    fee: x.fee,
    removed: x.state === "removed",
    note: scopeText(x.fee),
    reach: { shiptoIds: x.shiptoIds, of: x.ofShiptos },
  }));
}

/* TWO VERSIONS TO COMPARE (Yash, 2026-11-24) — the groups as underline tabs,
   or as a segment filter; either way the control sits above the table, not
   inside it. A switch picks one, kept for every sheet. */
export type GroupsView = "tabs" | "filter";
const VIEW_LABEL: Record<GroupsView, string> = { tabs: "Tabs", filter: "Filter" };
const VIEW_KEY = "fp-fee-groups-view";
let view: GroupsView = (() => {
  try {
    const v = window.localStorage.getItem(VIEW_KEY) as GroupsView | null;
    return v && v in VIEW_LABEL ? v : "tabs";
  } catch {
    return "tabs";
  }
})();
const viewListeners = new Set<() => void>();
function useGroupsView() {
  const v = React.useSyncExternalStore(
    (l) => {
      viewListeners.add(l);
      return () => viewListeners.delete(l);
    },
    () => view
  );
  const set = (next: GroupsView) => {
    view = next;
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* this tab keeps it */
    }
    viewListeners.forEach((l) => l());
  };
  return [v, set] as const;
}

const TH = "px-3 py-2.5 text-left font-medium";
const TAB_LINE = "flex-none px-2 after:bg-foreground group-data-[variant=line]/tabs-list:data-[state=active]:text-foreground";

/** The groups — the fees' side sheet and the pricing sheet's Fee block. */
export function FeeGroups({
  target,
  lines,
  title,
}: {
  target: FeeTarget;
  lines: Line[];
  /** The section's title on a sheet with other settings ("Fee"); none on the
   *  fees' own sheet, which is already about fees. */
  title?: string;
}) {
  const log = useChangeLog();
  const hubOf = useHubMap(log.rows, log.entityMap);
  const [mode, setMode] = useGroupsView();
  const [asking, setAsking] = React.useState<Fee | null>(null);
  const row = target.kind === "row" ? (log.rows.find((r) => r.id === target.rowId) ?? null) : null;
  const where = row ? `${shiptoOf(row.shiptoId).name} · ${productOf(row.productId).name}` : customerOf((target as { customerId: string }).customerId).name;
  const set = (f: Fee, on: boolean) => {
    if (target.kind === "row") setRowFee(row!, f.id, on);
    else setCustomerFee(target.customerId, f.id, on);
    toast.success(`${f.name} ${on ? "put back" : "removed"}`);
  };
  const groups = GROUPS.map((g) => ({ ...g, lines: lines.filter(g.has) }));
  const [tab, setTab] = React.useState(() => groups.find((g) => g.lines.length)?.key ?? "always");
  const g = groups.find((x) => x.key === tab) ?? groups[0];
  const reachHead = target.kind === "row" ? "Reaches through" : "Reaches";

  const control =
    mode === "tabs" ? (
      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <div className="overflow-x-auto border-b border-border">
          <TabsList variant="line" className="h-10 w-max justify-start">
            {groups.map((x) => (
              <TabsTrigger key={x.key} value={x.key} className={TAB_LINE}>
                {x.title}
                <span className="text-muted-foreground tabular-nums">{x.lines.length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    ) : (
      /* THE DS SEGMENT CONTROL (atom.toggle-group) — greyscale, one always on. */
      <ToggleGroup type="single" size="sm" variant="outline" value={tab} onValueChange={(v) => v && setTab(v)} aria-label="Fees by application">
        {groups.map((x) => (
          <ToggleGroupItem key={x.key} value={x.key} className="px-3">
            {x.title}
            <span className="text-muted-foreground tabular-nums">{x.lines.length}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );

  const table = !g.lines.length ? (
    <p className="px-3 py-6 text-center text-sm text-muted-foreground">No fees</p>
  ) : (
    <table className="w-full table-fixed border-collapse text-sm">
      <colgroup>
        <col />
        <col className="w-[220px]" />
        <col className="w-[240px]" />
        <col className="w-[52px]" />
      </colgroup>
      <thead>
        <tr className="border-b border-border bg-fp-table-header">
          <th className={TH}>Fee</th>
          <th className={TH}>Rate</th>
          <th className={TH}>{reachHead}</th>
          <th aria-hidden />
        </tr>
      </thead>
      <tbody>
        {g.lines.map((l) => (
          <tr key={l.fee.id} className="h-12 border-b border-border last:border-b-0">
            <td className="px-3 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-foreground">{l.fee.name}</span>
                <span className="truncate text-xs text-muted-foreground">{l.fee.when === "rule" ? ruleText(l.fee.rule) : l.fee.code}</span>
              </span>
            </td>
            <td className="truncate px-3 tabular-nums">{rateText(l.fee.amount)}</td>
            <td className="px-3 py-2">
              {l.removed && l.fromCustomer ? (
                <Pill>Removed on customer</Pill>
              ) : (
                /* WHERE IT REACHES AND THROUGH WHAT (Yash, 2026-11-24) — on a
                   customer, the ship-tos (press for the list) over the scope;
                   on a price, the scope combination that brought it in. */
                <span className="flex min-w-0 flex-col">
                  {l.reach && (
                    <span onClick={(e) => e.stopPropagation()} className="w-fit">
                      <ShiptoCount
                        inCell
                        shiptoIds={l.reach.shiptoIds}
                        label={`${l.reach.shiptoIds.length} of ${l.reach.of} ship-tos`}
                        hubOf={hubOf}
                        title={`${l.fee.name} · ship-tos`}
                        subtitle={l.note}
                      />
                    </span>
                  )}
                  <span className="truncate text-xs text-muted-foreground" title={l.note}>
                    {l.note}
                  </span>
                </span>
              )}
            </td>
            <td className="p-0 text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${l.fee.name}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {l.removed ? (
                    <DropdownMenuItem onSelect={() => set(l.fee, true)}>
                      <Undo2 />
                      Put back
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem variant="destructive" onSelect={() => setAsking(l.fee)}>
                      <MinusCircle />
                      Remove
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => openFeeInNewTab(l.fee.id)}>
                    <ExternalLink />
                    Edit fee
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const switcher = (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      Version
      <ToggleGroup type="single" size="sm" variant="outline" value={mode} onValueChange={(v) => v && setMode(v as GroupsView)} aria-label="Version">
        {(Object.keys(VIEW_LABEL) as GroupsView[]).map((v) => (
          <ToggleGroupItem key={v} value={v} className="px-3">
            {VIEW_LABEL[v]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </span>
  );

  if (!lines.length) return <p className="text-sm text-muted-foreground">No fees reach {where}.</p>;
  const block = (
    <div className="flex flex-col gap-3">
      {!title && <div className="flex justify-end">{switcher}</div>}
      {control}
      {/* THE TABLE IS ITS OWN UNIT — the groups' control sits above it. */}
      <div data-table-variant="T2" className="overflow-hidden rounded-lg border border-border">
        {table}
      </div>
    </div>
  );
  return (
    <>
      {title ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-medium text-muted-foreground">{title}</h3>
            {switcher}
          </div>
          {block}
        </section>
      ) : (
        block
      )}
      <AlertDialog open={!!asking} onOpenChange={(o) => !o && setAsking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {/* SAID PLAINLY (Yash, 2026-11-24) — which fee, where, what happens to
                orders, and that it can come back. */}
            <AlertDialogTitle>
              Remove {asking?.name} from {target.kind === "row" ? shiptoOf(row!.shiptoId).name : where}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target.kind === "row"
                ? `${asking?.name} won't be charged on ${productOf(row!.productId).name} orders at ${shiptoOf(row!.shiptoId).name}.`
                : `${asking?.name} won't be charged on orders for ${where}. Ship-tos with their own pricing still pay it.`}{" "}
              Orders not yet delivered lose the fee; delivered orders keep it. You can put it back any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep fee</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (asking) set(asking, false);
                setAsking(null);
              }}
            >
              Remove fee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** A price's or customer's fees, on a side sheet of their own — the Fee cell
 *  opens it. Read and remove only, so no footer. */
export function FeeApplicationSheet({
  target,
  onClose,
}: {
  target: FeeTarget | null;
  onClose: () => void;
}) {
  const log = useChangeLog();
  const lines = useFeeLines(target);
  if (!target) return null;
  const row =
    target.kind === "row"
      ? log.rows.find((r) => r.id === target.rowId)
      : undefined;
  const title = row
    ? shiptoOf(row.shiptoId).name
    : customerOf((target as { customerId: string }).customerId).name;
  const subtitle = row
    ? `${customerOf(row.customerId).name} · ${productOf(row.productId).name}`
    : "Customer pricing";
  const on = lines.filter((l) => !l.removed);
  return (
    <RecordSheet
      open
      onOpenChange={(v) => !v && onClose()}
      mode="edit"
      size="data"
      fit={{ tables: [[320, 170, 120, 52]] }}
      editTitle={`Fees · ${title}`}
      createTitle=""
      createAction=""
      showCancel={false}
      stepNav={false}
      noFooter
      headerAside={<Pill>{row ? APPLIED_LABEL[row.applied] : "Customer"}</Pill>}
      headerSubtitle={
        <span className="text-sm text-muted-foreground">
          {subtitle} · {plural(on.length, "fee")}
        </span>
      }
      onSubmit={onClose}
    >
      <div className="flex min-w-0 flex-col gap-10">
        <FeeGroups target={target} lines={lines} />
      </div>
    </RecordSheet>
  );
}

/** THE FEE CELL — the charged $/gal over how many fees apply; pressing it
 *  opens the price's fees (Yash, 2026-11-24). */
export function FeeCellButton({
  perGal,
  count,
  groups,
  label,
  onOpen,
}: {
  perGal: number;
  count: number;
  /** Group counts in place of "N fees" (demo, Yash 2026-11-25). */
  groups?: string;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={`Fees for ${label}`}
      className="flex min-w-0 flex-col items-start rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="truncate text-sm text-foreground tabular-nums">
        {perGalText(perGal)}
      </span>
      <span className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2">
        {groups ?? plural(count, "fee")}
      </span>
    </button>
  );
}

export { feeCell };
