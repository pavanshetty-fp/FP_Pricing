import * as React from "react";
import { DateKeyField } from "@/components/ui/date-picker";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCellInput } from "@/components/form-layout";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/ui/status-chip";
import { CELL, RecordSheet } from "../RecordSheet";
import { DATE_FMT, dateKeyOf, startOfDay } from "../data";
import { BROKER_STATUS_TONE, type OrderLine } from "./orders";
import { VENDORS } from "./vendors";
import {
  deliveryLines,
  type DeliveryPatch,
  type DeliveryState,
  type RecurringRule,
  type RuleDelivery,
} from "./recurringRules";
import { statusTones } from "../statusKind";

/*
  ONE DELIVERY, OPENED FROM THE CALENDAR.

  THE SECOND SHEET, DELIBERATELY. It stacks over the rule sheet rather than
  replacing it, because the reader got here from a date on a calendar and the
  calendar is the context for everything they are about to change. Closing this
  puts them back where they were, not back on the list.

  WHAT IS EDITABLE HERE IS WHAT BELONGS TO ONE DAY. The date, the quantities,
  a note, and whether it happens at all. Not the customer, not the partner, not
  the price — those are the rule's, and a field that silently changed the whole
  arrangement from inside one Tuesday is the worst thing this screen could do.
  They are shown, read-only, with where to change them said once.

  NOTHING WRITTEN HERE REACHES THE RULE OR ITS SIBLINGS. Changes flow downward
  only; there is no "apply to the rest of the series" and there is no way for a
  delivery to write back to the schedule. That is what makes a series usable —
  a customer wants 500 extra gallons this Thursday, and Thursday is all that
  changes.

  MOVING A DATE CARRIES A WARNING, and the warning is the doc's own: a
  hand-moved date is not part of the schedule, so the next time the RULE is
  edited, a delivery sitting on a date the rule does not produce is treated as
  unwanted and removed. That is reachable from this sheet, so it is said on
  this sheet — at the point of the edit, not afterwards.

  NO SAVE, NO CANCEL. Side sheets autosave.
*/

const STATE_LABEL: Record<DeliveryState, string> = {
  delivered: "Delivered",
  created: "Order created",
  scheduled: "Not created yet",
  skipped: "Skipped",
};

const STATE_TONE = statusTones<DeliveryState>({
  delivered: "success",
  /* The order exists and is on its way through. */
  created: "info",
  /* "Not created yet" — a date on a plan, not yet a state. */
  scheduled: "neutral",
  /* Skipped by decision. An absence, not a fault. */
  skipped: "neutral",
});

const DASH = "—";

function Card({
  title,
  aside,
  flush,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  /**
   * DROPS THE BODY'S PADDING so the content runs to the card's own edges.
   *
   * For content that is ITSELF a bordered grid — a table. Nesting one bordered
   * box 16px inside another draws two lines to say one thing, and the gap
   * between them belongs to neither.
   */
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="shrink-0 overflow-hidden rounded-md border border-fp-outline-1">
      <header className="flex items-center justify-between gap-3 border-b border-fp-outline-1 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {aside}
      </header>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function RecurringDeliverySheet({
  rule,
  delivery,
  open,
  onOpenChange,
  onPatch,
}: {
  rule: RecurringRule;
  delivery: RuleDelivery | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPatch: (dateKey: string, patch: DeliveryPatch) => void;
}) {
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const todayKey = dateKeyOf(today);

  if (!delivery) return null;

  const lines = deliveryLines(rule, delivery);
  const vendor = VENDORS.find((v) => v.id === rule.vendorId) ?? null;
  const date = new Date(`${delivery.dateKey}T00:00:00`);

  /* THREE THINGS CLOSE THE DOOR ON EDITING, and they are not the same thing.
     A delivered order is history and the doc says completed work is never
     re-dated. A date with no order behind it has nothing to edit YET. A past
     date cannot be moved to, because an order dated last Tuesday reads to a
     partner as a missed delivery. */
  const settled = delivery.state === "delivered";
  const notCut = delivery.orderNo === null;
  const editable = !settled && !notCut;

  const setLine = (i: number, patch: Partial<OrderLine>) => {
    const next = lines.map((l, k) => (k === i ? { ...l, ...patch } : l));
    onPatch(delivery.dateKey, { lines: next });
  };

  return (
    <RecordSheet
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15): lines table = product pick,
         asset name, quantity, Top off. */
      fit={{ tables: [[CELL.pick, CELL.name, CELL.topOff, CELL.number]] }}
      /* IT OPENS OVER THE RULE SHEET, so it takes the gap twice. At level 1 it
         covered the rule sheet exactly and read as the SAME sheet having
         changed its contents — the 56px strip of the sheet underneath is the
         only language the stack has for "there is one of these behind this
         one". (DS ux rules, side-sheet anatomy.) */
      level={2}
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      /* THE TITLE IS THE ORDER, OR THE DATE. It used to append "not created
         yet", which went stale the moment the date was skipped — the state is
         the chip's job and the chip is right beside it. */
      editTitle={
        delivery.orderNo ? `Order ${delivery.orderNo}` : DATE_FMT.format(date)
      }
      createTitle="New delivery"
      createAction="Create"
      onSubmit={() => undefined}
      showCancel={false}
      footerPrimary={null}
      headerAside={
        <span className="flex items-center gap-2">
          <StatusChip tone={STATE_TONE[delivery.state]} variant="soft">
            {STATE_LABEL[delivery.state]}
          </StatusChip>
          {delivery.status && (
            <StatusChip
              tone={BROKER_STATUS_TONE[delivery.status]}
              variant="text"
            >
              {delivery.status}
            </StatusChip>
          )}
        </span>
      }
      headerSubtitle={
        <span className="text-sm text-muted-foreground">
          {/* WHICH RULE MADE THIS, SAID IN THE HEADER. A delivery opened from a
              calendar is two clicks from its own context, and the one fact it
              must not lose is which standing arrangement it belongs to. */}
          From rule {rule.ruleNo} · {rule.schedule.label}
        </span>
      }
      footerAside={
        <span className="text-sm text-muted-foreground">
          {/* The reasons are already sentences with their own capitals and
              their own separator, so they are joined to the lead rather than
              folded into it — lowercasing them turned "Sep 22" into
              "sep 22". */}
          {delivery.tweak
            ? `Differs from the rule · ${delivery.tweak}`
            : "Matches the rule"}
        </span>
      }
    >
      {notCut && (
        <div className="flex items-start gap-2 rounded-md border border-fp-outline-1 bg-fp-surface-1b px-3 py-2.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            The rule wants this date, but no order has been cut for it yet.
            There is nothing to edit until there is an order — you can still
            take the date out of the schedule below.
          </span>
        </div>
      )}

      {settled && (
        <div className="flex items-start gap-2 rounded-md border border-fp-outline-1 bg-fp-surface-1b px-3 py-2.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            This delivery has run. Completed work is never re-dated, moved or
            removed by anything the rule does.
          </span>
        </div>
      )}

      <Card
        title="This delivery"
        aside={
          delivery.tweak ? (
            <Pill>Tweaked</Pill>
          ) : undefined
        }
      >
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          <div className="flex min-w-0 flex-col gap-1">
            <label
              htmlFor="delivery-date"
              className="text-xs font-medium text-muted-foreground"
            >
              Delivery date
            </label>
            {editable ? (
              <DateKeyField
                id="delivery-date"
                value={delivery.dateKey}
                min={todayKey}
                onChange={(key) => onPatch(delivery.dateKey, { dateKey: key })}
              />
            ) : (
              <span className="text-sm text-foreground">
                {DATE_FMT.format(date)}
              </span>
            )}
          </div>

          <Field label="Order #">
            {delivery.orderNo ?? (
              <span className="text-muted-foreground">Not created yet</span>
            )}
          </Field>

          <Field label="On the schedule?">
            {delivery.movedFromKey ? (
              <span className="text-foreground">
                Moved — the rule wants{" "}
                {DATE_FMT.format(
                  new Date(`${delivery.movedFromKey}T00:00:00`)
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Yes — {rule.schedule.label.toLowerCase()}
              </span>
            )}
          </Field>
        </div>

        {/* THE WARNING BELONGS AT THE EDIT, NOT AFTER IT. A hand-moved date
            survives on its own and does not survive the next edit to the rule,
            and the only useful moment to say so is while the broker is looking
            at the date they moved. */}
        {delivery.movedFromKey && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-status-failed/40 bg-status-failed/5 px-3 py-2.5 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-failed" />
            <span>
              A moved date is not part of the schedule. The next time the rule
              itself is edited, this order sits on a date the rule does not
              produce and will be removed.
            </span>
          </div>
        )}
      </Card>

      <Card
        title="Products and quantity"
        aside={
          <span className="text-xs text-muted-foreground">
            {editable ? "This delivery only" : "Read-only"}
          </span>
        }
        flush
      >
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fp-outline-1 bg-fp-table-header">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Product
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Asset
                </th>
                <th className="w-[104px] px-3 py-2 text-xs font-medium text-muted-foreground text-left">
                  {/* TOP OFF, THEN ITS SELECT-ALL; ticks right-aligned under it (DS ui §10i). */}
                  <span className="flex items-center justify-between gap-2">
                    Top off
                    {editable && (
                      <Checkbox
                        checked={lines.length > 0 && lines.every((l) => l.topOff) ? true : lines.some((l) => l.topOff) ? "indeterminate" : false}
                        aria-label="Top off every line"
                        onCheckedChange={(v) => onPatch(delivery.dateKey, { lines: lines.map((l) => ({ ...l, topOff: v === true })) })}
                      />
                    )}
                  </span>
                </th>
                <th className="w-[150px] px-3 py-2 text-xs font-medium text-muted-foreground text-left">
                  Quantity (gal)
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr
                  key={`${l.asset}-${i}`}
                  className="border-b border-fp-outline-1 last:border-0"
                >
                  <td className="px-3 py-2.5 text-foreground">{l.product}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {l.asset}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex ">
                      {editable ? (
                        <Checkbox
                          checked={l.topOff}
                          aria-label={`Top off ${l.product}`}
                          onCheckedChange={(v) =>
                            setLine(i, { topOff: v === true })
                          }
                        />
                      ) : l.topOff ? (
                        <Pill>Yes</Pill>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </span>
                  </td>
                  {/* THE CELL IS THE FIELD — DS ui §10f. A boxed input inside
                      a padded cell drew a second grid over the table's. */}
                  <td className="relative p-0">
                    {editable && !l.topOff ? (
                      <TableCellInput
                        numeric
                        placeholder="0"
                        value={l.gal == null ? "" : String(l.gal)}
                        aria-label={`Quantity for ${l.product}`}
                        onChange={(v) => {
                          const clean = v.replace(/[^0-9.]/g, "");
                          setLine(i, {
                            gal: clean === "" ? null : Number(clean),
                          });
                        }}
                      />
                    ) : l.topOff ? (
                      <span className="block px-3 py-2.5 text-muted-foreground">
                        {DASH}
                      </span>
                    ) : (
                      <span className="block px-3 py-2.5 tabular-nums text-foreground">
                        {(l.gal ?? 0).toLocaleString()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {delivery.lines && (
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            These quantities belong to this delivery alone. The rule still says{" "}
            {rule.lines
              .map((l) =>
                l.topOff ? `${l.product} (top off)` : `${l.product} ${(l.gal ?? 0).toLocaleString()} gal`
              )
              .join(", ")}
            .
          </p>
        )}
      </Card>

      <Card title="Note for this delivery">
        {editable ? (
          <Textarea
            value={delivery.note}
            rows={3}
            placeholder="Anything true of this drop only — a gate code, a short window, a contact who is away."
            onChange={(e) =>
              onPatch(delivery.dateKey, { note: e.target.value })
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {delivery.note.trim() || "No note."}
          </p>
        )}
      </Card>

      {/* THE RULE'S TERMS, SHOWN AND NOT EDITABLE. They are here because a
          broker looking at one delivery asks who is hauling it and what it
          costs; they are read-only because changing them here would change
          every delivery, which is not what "edit this Tuesday" means. */}
      <Card
        title="From the rule"
        aside={
          <span className="text-xs text-muted-foreground">
            Change these on {rule.ruleNo}
          </span>
        }
      >
        <dl className="grid grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Customer">{rule.customer.title}</Field>
          <Field label="Ship to">{rule.shipTo}</Field>
          <Field label="Partner">
            {vendor?.name ?? (
              <span className="text-muted-foreground">Not assigned</span>
            )}
          </Field>
          <Field label="Point of contact">
            {rule.vendorPoc ?? <span className="text-muted-foreground">{DASH}</span>}
          </Field>
          <Field label="Load order">
            {rule.loadOrder?.length
              ? "Yes — we buy the product"
              : "No — partner supplies"}
          </Field>
          <Field label="Frequency">{rule.schedule.label}</Field>
        </dl>
      </Card>

      {/* THE ONE DESTRUCTIVE ACT, AT THE BOTTOM, WITH ITS CONSEQUENCE NAMED.
          Skipping one date is not cancelling the rule, and the sentence says
          so — that distinction is the commonest way people break a series by
          reaching for the wrong control. */}
      <Card title={delivery.state === "skipped" ? "Skipped" : "Skip this delivery"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-lg text-sm text-muted-foreground">
            {delivery.state === "skipped"
              ? "This date is out of the schedule. The rule keeps running and every other delivery is unaffected."
              : settled
                ? "This delivery has already run, so it cannot be skipped."
                : "Takes this one date out. The rule keeps running and every other delivery is unaffected."}
          </p>
          {delivery.state === "skipped" ? (
            <Button
              variant="outline"
              onClick={() =>
                onPatch(delivery.dateKey, { skipped: false })
              }
            >
              Put it back
            </Button>
          ) : (
            <Button
              variant="outline"
              className={cn(
                "text-status-failed",
                settled && "pointer-events-none opacity-50"
              )}
              /* A DEAD CONTROL SAYS WHY on the press, per the DS rule. */
              title={
                settled ? "A delivery that has run cannot be skipped" : undefined
              }
              disabled={settled}
              onClick={() => onPatch(delivery.dateKey, { skipped: true })}
            >
              Skip this delivery
            </Button>
          )}
        </div>
      </Card>
    </RecordSheet>
  );
}
