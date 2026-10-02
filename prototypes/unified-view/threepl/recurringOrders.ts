import { DATE_FMT, dateKeyOf, relativeLabel, startOfDay } from "../data";
import { HUBS, SHIP_TO_SITES, type BrokerOrder } from "./orders";
import {
  liveTargets,
  programRunsOn,
  targetSkips,
  type RecurringProgram,
} from "./recurringPrograms";

/*
  A RULE CUTS REAL ORDERS (Pavan, 2026-09-24).

  On every date the rule's frequency hits, each live ship-to on it gets its
  own Delivery Order — daily means one a day, per site. The order lands in the
  Orders lane as a Draft with the Recurring badge, carrying what the rule and
  the ship-to row say. From there it is an ordinary order: the broker edits
  it, invites, finalizes, and it moves on like any other.

  CUT AHEAD, NOT FOREVER. Orders exist from today up to LEAD_DAYS ahead, so
  a broker can see and prepare the coming week; later dates are cut as the
  days arrive. Nothing is cut for the past — those days were either run or
  missed, and a fresh Draft dated yesterday would be neither.

  ONCE PER RULE · SHIP-TO · DATE. The id is built from those three, so an
  order already cut is never cut again, and the broker's edits to it stand.
*/

export const LEAD_DAYS = 7;

export const recurringOrderId = (programId: string, targetId: string, dateKey: string) =>
  `rec-${programId}-${targetId}-${dateKey}`;

/** The days in [from, to] that orders may be cut for — today to LEAD_DAYS on. */
export function cuttableDays(from: Date, to: Date): Date[] {
  const today = startOfDay(new Date());
  const last = new Date(today);
  last.setDate(last.getDate() + LEAD_DAYS);
  const start = from > today ? startOfDay(from) : today;
  const end = to < last ? startOfDay(to) : last;
  const out: Date[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d));
  return out;
}

/**
 * The orders the rules owe for these days that do not exist yet. Numbers
 * start at `firstNo` and go up by one.
 */
export function ordersFromPrograms(
  programs: RecurringProgram[],
  days: Date[],
  existing: ReadonlySet<string>,
  firstNo: number
): BrokerOrder[] {
  const out: BrokerOrder[] = [];
  let no = firstNo;
  const today = startOfDay(new Date());
  for (const day of days) {
    const dateKey = dateKeyOf(day);
    const offset = Math.round((day.getTime() - today.getTime()) / 86_400_000);
    for (const p of programs) {
      if (!programRunsOn(p, day)) continue;
      for (const t of liveTargets(p)) {
        /* A ship-to that sits this day out — a resolved clash. */
        if (targetSkips(t, day)) continue;
        const id = recurringOrderId(p.id, t.id, dateKey);
        if (existing.has(id)) continue;
        const site = SHIP_TO_SITES.find((s) => s.name === t.shipTo);
        out.push({
          id,
          orderNo: `D-${no++}`,
          kind: "Recurring",
          orderType: p.orderType,
          customer: t.customer,
          shipTo: t.shipTo,
          date: { title: DATE_FMT.format(day), description: relativeLabel(offset, day) },
          dateKey,
          window: t.window,
          lines: t.lines.map((l) => ({ ...l })),
          status: "Draft",
          vendorId: null,
          /* The rule's partners are listed on the order, not yet asked —
             inviting is still the broker's act. */
          invitedVendorIds: [...p.vendorIds],
          sentVendorIds: [],
          acceptedVendorIds: [],
          quoteRequested: false,
          quotes: [],
          orderFees: [],
          invoiceState: "none",
          serviceLine: p.serviceLine,
          business: p.business,
          audit: [
            {
              at: new Date().toISOString(),
              by: "System — Recurring",
              changes: [`Order created from rule ${p.programNo}`],
            },
          ],
          urgent: false,
          signatureOnDelivery: p.signatureOnDelivery,
          poNumber: t.poNumber,
          zip: site?.zip ?? "",
          state: site?.state ?? t.state,
          createdBy: "System — Recurring",
          tags: [...p.tags],
          loadOrder: p.loadOrder
            ? p.loadRows.flatMap((r) =>
                r.products.map((product) => ({
                  product,
                  terminal: r.terminal,
                  supplier: r.supplier,
                  loadingAccount: r.loadingAccount,
                }))
              )
            : null,
          recurrence: { fromDateKey: p.startKey, frequency: p.schedule.label },
          hub: HUBS[0],
          jobType: p.jobType,
          primaryPoc: t.poc,
          secondaryPocs: [],
          salesperson: "",
          instructions: t.instructions,
          internalNote: p.internalNote,
          winterAdditive: t.lines.some((l) => p.winterProducts.includes(l.product)),
          notifyVendor: false,
          completedAt: null,
          blockedReason: null,
          movement: null,
        });
      }
    }
  }
  return out;
}
