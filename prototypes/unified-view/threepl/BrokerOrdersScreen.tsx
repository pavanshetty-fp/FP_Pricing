import * as React from "react";
import { CalendarOff, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StatusChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import {
  ListToolbar,
  ColumnSearchChip,
  FilterChips,
  type ListView,
} from "../ListToolbar";
import { ListFilters, type ListFacet } from "../ListFilters";
import { ExportSheet, type ExportFilterRow } from "../ExportSheet";
import { Hit, ListTable, TwoLineCell } from "../ListTable";
import { useSavedViews } from "../useSavedViews";
import {
  DATE_FMT,
  dateKeyOf,
  formatFullDate,
  relativeLabel,
  startOfDay,
} from "../data";
import {
  BrokerBoard,
  type BoardCardBadge,
  type BoardCardUnit,
  type BoardLane,
} from "./BrokerBoard";
import { OrderMapView } from "../OrderMapView";
import { CodeDisc, type CodeDiscTone } from "@/components/ui/code-disc";
import { BrokerOrderSheet, type BrokerOrderDraft } from "./BrokerOrderSheet";
import {
  AssetMovementSheet,
  type AssetMovementDraft,
} from "./AssetMovementSheet";
import { toast } from "sonner";
import { DateRangeFilter, type DateRange } from "./DateRangeFilter";
import { VENDORS, vendorById, vendorName } from "./vendors";
import {
  BROKER_COLUMNS,
  BROKER_HIDDEN_BY_DEFAULT,
  BROKER_LANE_COLOR,
  businessOf,
  LINE_BUSINESSES,
  type BrokerStatus,
  SERVICE_LINES,
  lineOfProduct,
  type ServiceLine,
  BROKER_ORDERS,
  BROKER_SEARCH_FIELDS,
  BROKER_STATUS_FILTERS,
  BROKER_STATUS_TONE,
  brokerColumnText,
  CREATED_BY,
  ORDER_TAGS,
  PRODUCTS,
  SALESPEOPLE,
  SHIP_TO_SITES,
  HUBS,
  ORDER_TYPE_FILTERS,
  siteAddress,
  diffOrder,
  isAllTopOff,
  isDelivered,
  isOrderReady,
  defaultLineCharges,
  matchesBrokerOrder,
  matchesBrokerOrderIn,
  sortBrokerOrders,
  quoteTotal,
  timeToMinutes,
  totalGal,
  type BrokerColumnKey,
  type BrokerOrder,
  type BrokerOrderType,
  type BrokerSortState,
  MOVEMENT_DETAIL,
  MOVEMENT_DIRECTIONS,
  MOVEMENT_LABEL,
  MOVEMENT_ROUTE,
  type MovementDirection,
} from "./orders";
import { cuttableDays, ordersFromPrograms } from "./recurringOrders";
import { usePrograms } from "./recurringPrograms";
import { RENTAL_ASSETS } from "./directory";
import { money } from "./directoryCore";

/**
 * 3PL Order Dashboard — the broker's main screen.
 *
 * Same skeleton as the three Sales lists (preset-view row, action bar, body,
 * pagination) so the two modules read as one product, with three differences
 * that are the spec's, not preferences:
 *
 *  1. THE BOARD IS THE DEFAULT VIEW. §5.2 calls the dashboard "a Kanban-style
 *     board", with List as the alternate and the preferred default settable. Every
 *     Sales list opens as a table; this one opens as a board, because the thing a
 *     broker does all day is watch orders move between stages. The table is the
 *     alternate, not an afterthought — it has the full column set and pagination.
 *  2. THE ORDER-KIND TABS. All / Regular / Recurring / Movement (§5.2), present
 *     in both views. They sit BELOW the action bar per the content-layer law in
 *     `docs/content-layer.md` §4 ("accordions sit below the action bar and the
 *     tabs"), which fixes the vertical order as header -> action bar -> tabs.
 *  3. LANES ARE THE LIFECYCLE, and sorting by Status sorts by lifecycle position
 *     rather than A-Z — see `sortValue` in `orders.ts`.
 *
 * NOT BUILT, named rather than faked: drag-and-drop between lanes (the DS Kanban
 * has none and a status change here is a workflow action with side effects, not
 * a drag); and the map view of nearby vendors (§5.5).
 */

/** Board cards show six fields — §5.2 says the set is user-customisable; this is
 *  the default. Six fills the DS card's 2-column grid exactly. */
/**
 * The card's units, in reading order.
 *
 * NO FIELD LABELS INSIDE A UNIT. The heading names the unit and the levels do
 * the rest: "Customer / Bray, Raymond and Marks" spends a whole line saying
 * what the reader already knows from where it sits. Three lines at three
 * weights carry account, site and address without one label between them.
 *
 * WHAT THE KIND CHANGES is the product unit and nothing else. A delivery lists
 * the tanks and what goes in each; a movement lists the one asset, its type and
 * its capacity — same three columns, so the eye lands in the same place.
 */
/**
 * "Sep 17, 2026 · 9:07 AM" — the date and the time, in that order.
 *
 * THE TIME IS THE HALF THAT IS NEW. The board is already scoped to a day, so
 * on most cards the date is a confirmation and the clock is the answer; the
 * date stays because a delivery that ran the day after it was planned is
 * exactly the case this unit exists to show.
 */
const COMPLETED_TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function completedLabel(iso: string): string {
  const at = new Date(iso);
  return `${DATE_FMT.format(at)} · ${COMPLETED_TIME_FMT.format(at)}`;
}

function laneCardUnits(r: BrokerOrder, off: ReadonlySet<string>): BoardCardUnit[] {
  const site = SHIP_TO_SITES.find((x) => x.name === r.shipTo);
  const vendor = r.vendorId ? vendorById(r.vendorId) : undefined;

  /* THE TOTAL EARNS ITS ROW or is not drawn. With one line the quantity IS the
     total; with every line a top-off there is nothing to add. It appears only
     once the per-row figures have stopped answering "how much is coming". */
  const numbered = r.lines.filter((l) => !l.topOff && l.gal != null);
  const showTotal = !r.movement && r.lines.length > 1 && numbered.length > 1;

  const productUnit: BoardCardUnit = r.movement
    ? (() => {
        const asset = RENTAL_ASSETS.find((a) => a.name === r.lines[0]?.asset);
        const cap = asset?.capacityGal ?? r.movement.capacityGal;
        return {
          kind: "rows",
          key: "product",
          heading: "Delivery Product Details",
          rows: [
            {
              asset: r.lines[0]?.asset || "Asset not chosen",
              /* A tank in transit is EMPTY, so this column carries its type
                 rather than a product it is not holding. */
              product: asset?.assetType ?? r.movement.tankType,
              qty: cap > 0 ? `${cap.toLocaleString()} gal` : "—",
              qtySoft: cap === 0,
              /* WHICH unit, under its name. The route left this row for the
                 card header: it describes the ORDER, not the tank. */
              assetId: asset?.serialNumber ?? undefined,
            },
          ],
        };
      })()
    : {
        kind: "rows",
        key: "product",
        heading: "Delivery Product Details",
        rows: r.lines.map((l) => ({
          asset: l.asset || "No asset",
          /* THE ASSET NAME IS THE ROW, so it is not a switch. Turn off the
             product and the quantity and you still have a list of what is
             being filled; turn off the name and the columns beside it have
             nothing to belong to. */
          product: off.has("product.product") ? "" : l.product,
          qty: off.has("product.qty")
            ? ""
            : l.topOff
              ? "Top-off"
              : `${(l.gal ?? 0).toLocaleString()} gal`,
          qtySoft: l.topOff,
        })),
        total:
          showTotal && !off.has("product.total")
            ? `${totalGal(r.lines).toLocaleString()} gal`
            : undefined,
      };

  /* CHEAPEST FIRST, and the total is the SAME arithmetic the sheet's Carrier
     cost column does — including the load-order rule, which strikes the
     product from what the partner may charge. Two figures for one quote is
     how a card comes to disagree with the order it stands for. */
  const heldQuote = vendor
    ? r.quotes.find((q) => q.vendorId === vendor.id)
    : undefined;
  const ranked = vendor
    ? []
    : r.quotes
        .map((q) => ({
          vendorId: q.vendorId,
          total: quoteTotal(q, r.lines, !r.loadOrder),
        }))
        .sort((a, b) => a.total - b.total);

  /*
    ONCE A PARTNER IS ON THE ORDER, THE PRODUCT LIST IS A RECEIPT.

    While the order is out for pricing the tanks and the gallons are what the
    quotes are being read against, so they stay on the face of the card. The
    moment one partner holds it the comparison is over: the list has stopped
    being a question and become the thing the figure is FOR. It goes behind the
    figure — the price gains an underline and gives the rows back on a press —
    and the card comes back to five units from six.

    Honouring the reader's own switch: a product unit they have turned off is
    not offered behind the price either.
  */
  const foldProduct =
    r.status === "Assigned" &&
    !off.has("product") &&
    /* AND ONLY WHEN THERE IS A PRICE TO FOLD IT BEHIND. An Assigned order
       whose partner has not priced shows the fallback partner line instead of
       the quote stepper — folding there would take the tanks off the card and
       leave nothing to press for them. */
    ranked.length > 0;

  const units: BoardCardUnit[] = [
    {
      kind: "stack",
      key: "customer",
      heading: "Customer Details",
      lines: [
        ...(off.has("customer.account")
          ? []
          : [{ text: r.customer.title, level: 1 as const }]),
        ...(off.has("customer.site") ? [] : [{ text: r.shipTo, level: 2 as const }]),
        ...(site && !off.has("customer.address")
          ? [{ text: siteAddress(site), level: 3 as const }]
          : []),
      ],
    },
    {
      kind: "inline",
      key: "schedule",
      heading: "Schedule",
      parts: [
        ...(off.has("schedule.window")
          ? []
          : [`${r.window.start} – ${r.window.end}`]),
        /* A recurring order's cadence beats its date: the board is already
           scoped to one day, so the date says nothing the column has not. */
        ...(off.has("schedule.when")
          ? []
          : [r.recurrence ? r.recurrence.frequency : r.date.title]),
      ],
    },
    /* WHAT A FINISHED ORDER IS ASKED IS WHEN IT WAS DONE, not when it was
       meant to be. The plan and the fact are two different questions, so this
       is its own unit rather than the Schedule wearing a second name — on a
       card where the run went out late, both being readable at once is the
       whole point. Empty before the delivery, so the "a heading with nothing
       under it is not a unit" filter takes it off every earlier card. */
    {
      kind: "inline" as const,
      key: "completed",
      heading: "Completed on",
      parts: r.completedAt
        ? [
            ...(off.has("completed.when") ? [] : [completedLabel(r.completedAt)]),
            ...(off.has("completed.cadence") || !r.recurrence
              ? []
              : [r.recurrence.frequency]),
          ]
        : [],
    },
    ...(foldProduct ? [] : [productUnit]),
    /* WHAT THE PARTNERS HAVE QUOTED beats what they have agreed to. Until one
       of them holds the order, the card's Vendor unit is about the PRICES that
       have come back: it said "2 accepted — no quote taken yet" while two
       priced quotes sat in the order, which is the card contradicting the
       sheet. With prices in, the unit becomes the quote stepper; with none, it
       falls back to saying where the invitations have got to. */
    ranked.length > 0
      ? {
          kind: "quotes" as const,
          key: "partner",
          heading: "Vendor",
          nameOff: off.has("partner.name"),
          quotes: ranked.map((q, i) => ({
            vendor: vendorName(q.vendorId),
            total: money(q.total),
            rank: i + 1,
          })),
          breakdown:
            foldProduct && productUnit.kind === "rows"
              ? { rows: productUnit.rows, total: productUnit.total }
              : undefined,
        }
      : {
      kind: "stack",
      key: "partner",
      heading: "Vendor",
      /* WHAT THE ORDER COST, once one partner holds it. The quote stepper
         carries a figure per partner while the round is open; after the award
         there is one, and a finished card that shows who ran the job and not
         what it came to is half an answer. */
      figure:
        vendor && !off.has("partner.price") && heldQuote
          ? money(quoteTotal(heldQuote, r.lines, !r.loadOrder))
          : undefined,
      lines: vendor
        ? [
            ...(off.has("partner.name")
              ? []
              : [{ text: vendor.name, level: 1 as const }]),
            ...(off.has("partner.detail")
              ? []
              : [
                  {
                    text: `${vendor.base} · Safety ${vendor.safetyScore} · ${vendor.distanceMi} mi`,
                    level: 3 as const,
                  },
                ]),
          ]
        : [
            {
              /* OUT MEANS SENT, NOT SELECTED (Pavan, 2026-09-22). This read
                 "Out for acknowledgement" off `invitedVendorIds`, which is the
                 broker's shortlist and not a thing anybody outside the
                 building has seen — so a card could say it was waiting on
                 partners who had never been written to, directly under a badge
                 saying Draft. Sending is the act; `sentVendorIds` is its
                 record. */
              text:
                r.acceptedVendorIds.length > 0
                  ? `${r.acceptedVendorIds.length} accepted — no quote taken yet`
                  : r.sentVendorIds.filter(Boolean).length > 0
                    ? "Out for acknowledgement"
                    : r.invitedVendorIds.length > 0
                      ? `${r.invitedVendorIds.length} selected, not sent`
                      : "Not assigned",
              level: 3 as const,
            },
          ],
    },
  ];
  /* A HEADING WITH NOTHING UNDER IT IS NOT A UNIT. Switching off every line
     inside one leaves the label sitting on a rule, which reads as a failure to
     load rather than as a choice somebody made. */
  return units.filter((u) => {
    if (off.has(u.key)) return false;
    if (u.kind === "stack") return u.lines.length > 0;
    if (u.kind === "inline") return u.parts.length > 0;
    return true;
  });
}

/**
 * ORDER TYPE -> INITIAL AND HUE. The DS ships the disc and the hues and binds
 * no meaning to them; declaring the meaning is the application's job — the same
 * split `TYPE_TONE` in `FuelOrdersTable` makes. D and E keep the Sales module's
 * hues on purpose, so a delivery disc means the same thing in both modules.
 *
 * Emergency is the one two-character code. Extraction has the E — it is the
 * letter the Sales table already spends on it — and a second E would make the
 * one thing the disc exists to do, telling two types apart, impossible.
 */
const TYPE_CODE: Record<
  BrokerOrderType,
  { text: string; tone: CodeDiscTone }
> = {
  Core: { text: "C", tone: "pastel-slate" },
  Emergency: { text: "EM", tone: "pastel-rose" },
  "Asset Movement": { text: "M", tone: "pastel-violet" },
  Delivery: { text: "D", tone: "pastel-blue" },
  Extraction: { text: "E", tone: "pastel-amber" },
  "Pump Out": { text: "P", tone: "pastel-teal" },
  Transport: { text: "T", tone: "pastel-green" },
};

function laneCardCode(r: BrokerOrder) {
  const c = TYPE_CODE[r.orderType];
  /* The full word is not optional — `CodeDisc` makes it the tooltip AND the
     aria-label, so the letter is never the only thing carrying the meaning. */
  return { text: c.text, label: r.orderType, tone: c.tone };
}

/**
 * The badges, STACKED, and now only for facts that change what someone does:
 * priority and recurrence. Type went to the code disc; a movement's direction
 * went into the route, where it reads as a gloss on the route rather than as a
 * third chip competing with Urgent for the same row.
 */
function laneCardBadges(r: BrokerOrder): BoardCardBadge[] {
  const out: BoardCardBadge[] = [];
  /* URGENT IS ABOUT GETTING IT DONE, so it stops meaning anything once it is.
     On a delivered card it is a red chip asking for a hurry nobody can supply,
     competing with the chips that still matter. Recurrence is not like that —
     it says what KIND of order this is, and a finished one is still one. */
  if (r.urgent && !isDelivered(r.status)) out.push({ label: "Urgent", tone: "critical" });
  if (r.kind === "Recurring") out.push({ label: "Recurring" });
  /* THREE STATES IN THE ORDERS LANE, AND THEY ARE ABOUT THE PARTNER (Pavan,
     2026-09-22). The reader of this lane is not waiting on the form, they are
     waiting on a price:

       Draft                  nothing has been sent
       Awaiting Quotation     sent, and nobody has priced it — CAUTION
       N Quotations Received  at least one price is in — CAUTION: now the
                              dispatcher's turn (was SUCCESS until 2026-09-23)

     `sentVendorIds` is the record of the asking (invited is a selection, sent
     is the act) and `quotes` is the record of the answer. THE COUNT IS ON THE
     BADGE because on an order out to five partners, one price back and four
     are different situations and the lane should not make you open the order
     to find out which. Both tones take the DS's soft recipe — a /10 tint of
     the tone's own hue — because a lane of eight cards should read as a lane
     and not as a set of traffic lights. */
  if (r.status === "Draft") {
    const quotes = r.quotes.length;
    out.push(
      quotes > 0
        ? {
            label: `${quotes} Quotation${quotes === 1 ? "" : "s"} Received`,
            /* CAUTION, NOT SUCCESS (2026-09-23, the status-kind rule). A price
               in is not a thing done — it is the dispatcher's turn to award. */
            tone: "caution",
          }
        : r.sentVendorIds.filter(Boolean).length > 0
          ? { label: "Awaiting Quotation", tone: "caution" }
          : { label: "Draft" }
    );
  }
  /* WHERE IN SYNCED. The Synced lane is the one that still holds two statuses
     — fully and partly — so the card is what says which. Only the partial one
     gets a badge: on a lane called Synced, a card saying "Synced" is a label
     repeating its own heading, and what the reader is looking for is the
     exception. */
  if (r.status === "Partially Synced") out.push({ label: "Partially Synced", tone: "critical" });
  return out;
}

/**
 * Under the title: the ROUTE, and only a movement has one.
 *
 * Where the asset is coming from and going to is not a detail of a movement
 * order, it IS the order. The DIRECTION follows it in brackets — "Back to yard"
 * says which end of that route is the yard, which is a gloss on the route and
 * belongs beside it, not in the chip row.
 *
 * A delivery gets no subtitle at all. Its type is the disc and its site is the
 * first thing in Customer Details; a category line under the number repeated
 * one and pre-empted the other.
 */
function laneCardSubtitle(r: BrokerOrder): string[] | undefined {
  if (!r.movement) return undefined;
  /* THE ROUTE IS STORED, so the card reads it rather than reconstructing it
     from a direction and one yard — which only worked while there were two
     routes and one of the ends was always the same kind of place. */
  return [
    `${r.movement.from} → ${r.movement.to} (${r.movement.direction})`,
  ];
}

/**
 * A card's footer alert, or nothing.
 *
 * Only stages with something OUTSTANDING get one. An alert on every card is not
 * an alert, it is a border — so Draft, Assigned, Completed and Synced carry none.
 */
/**
 * The invoice row: where the vendor's bill has got to, in one line.
 *
 * THREE STATES, ONE AT A TIME. Ask for it, wait for it, read it — points on
 * one line rather than three things that could all be true. The middle one has
 * no button because the ball is with the vendor.
 *
 * NOT WHILE THE ORDER STILL HAS A QUESTION OPEN. A card that is still asking
 * which partner and at what price has no vendor to invoice and no agreed
 * amount, so the row would offer to chase a bill from nobody — which is
 * exactly what it did. Where the card carries an alert, the alert is the one
 * thing to act on.
 */
function laneCardInvoice(
  r: BrokerOrder,
  onRequest: () => void,
  onOpen: () => void
): BoardLane["cards"][number]["footerAction"] {
  if (!INVOICE_LANES.has(r.status)) return undefined;
  if (!r.vendorId) return undefined;
  /* An alert already owns the footer; the invoice row is what is left. */
  if (laneCardAlert(r, onOpen)) return undefined;

  if (r.invoiceState === "requested") {
    return { label: "Invoice requested", waiting: true };
  }
  if (r.invoiceState === "received") {
    return {
      label: "Invoice received",
      actionLabel: "Review",
      /* An outline, not the green one: reading a bill is not the same kind of
         act as sending a request, and two filled greens on one board would
         stop either meaning "this is the one to press". */
      actionVariant: "outline",
      /* Reviewing means reading the order, which is what the card already
         opens — the button is a named way in, not a second destination. */
      onAction: onOpen,
    };
  }
  return { label: "Request invoice", actionLabel: "Send request", onAction: onRequest };
}

/** Where a bill is worth chasing: the partner is committed and the price is
 *  settled, so there is somebody to ask and an amount to expect. */
const INVOICE_LANES = new Set<BrokerStatus>(["Assigned"]);

/**
 * THE LANES, AND WHICH STATUSES EACH ONE HOLDS.
 *
 * A LANE IS A BUCKET, NOT A STATUS. The two were the same list until the
 * accounting end of the board grew three of them — sync ready, partially
 * synced, synced — which is one piece of work reported three ways. Three lanes
 * for it made the last third of the board wider than the part where anything
 * is decided, and every card in it was in the right lane and still needed
 * reading to find out what was actually true. One `Synced` lane, and the card
 * says where in that it stands.
 *
 * A LANE IS CALLED WHAT IT HOLDS, which is not always the status's own name.
 * "Completed" answers "completed what?" — an order is completed several times
 * over on its way through this board, and the one that lane means is the
 * delivery. The statuses themselves are unchanged: they are what the record,
 * the filter and the chip all say.
 *
 * THE LAST TWO ARE NOT THE LIFECYCLE. Cancelled is a way out of it and Blocked
 * is a condition that holds an order wherever it already stands — neither is
 * somewhere the work moves THROUGH, and reading left to right past them tells
 * you nothing. `apart` puts a rule before Cancelled so the eye stops at the end
 * of the line rather than carrying on into two lanes that are not on it. It is
 * also why Blocked is here and not second, where it used to sit: it put a lane
 * nobody can act on between the two that are touched most.
 *
 * A LANE TAKES THE COLOUR OF THE STATUS IT ENDS ON, so a bucket of several is
 * the colour of the one that finishes it.
 */
const BOARD_LANES: {
  key: string;
  title?: string;
  statuses: BrokerStatus[];
  apart?: boolean;
}[] = [
  /* THE FIRST LANE IS CALLED ORDERS (Pavan, 2026-09-22). It holds two states,
     not one — an order still being typed, and one whose invitations are out
     and whose partners have not priced it — so "Draft" named half of what was
     in it and the card's badge had to contradict the heading to say so. The
     STATUS is still Draft; this is the lane's name, and the badge below is
     what tells the two apart. */
  { key: "Draft", title: "Orders", statuses: ["Draft"] },
  { key: "Quoting", statuses: ["Quoting"] },
  { key: "Assigned", statuses: ["Assigned"] },
  { key: "Completed", statuses: ["Completed"] },
  /* THE OPTIONAL HOLD between delivery and accounting (Pavan, 2026-09-24). */
  { key: "Review", statuses: ["Review"] },
  { key: "Verified", statuses: ["Verified"] },
  /* PARTIALLY SYNCED RIDES WITH SYNCED, and it is the one place a lane still
     holds two statuses. It is not a stage of its own — the sync was tried and
     failed, an error on the hand-off rather than a place in the lifecycle —
     and the card's red badge and alert are what say so. */
  { key: "Synced", statuses: ["Partially Synced", "Synced"] },
  { key: "Cancelled", statuses: ["Cancelled"], apart: true },
  { key: "Blocked", statuses: ["Blocked"] },
];

function laneCardAlert(
  r: BrokerOrder,
  onOpen: () => void
): BoardLane["cards"][number]["alert"] {
  if (r.status === "Blocked") {
    return {
      status: "warning",
      text: r.blockedReason ?? "Credit hold",
      actionLabel: "Review",
    };
  }
  if (r.status === "Quoting") {
    const n = r.invitedVendorIds.length;
    /* PRICES BEAT SILENCE. An order with two quotes in it was still being
       announced as awaiting acknowledgement, because this branch only ever
       counted invitations — so the footer denied what the card above it was
       showing. Once anything has been priced, the count that matters is how
       many of the invitations have come back with a figure. */
    const priced = r.quotes.length;
    if (priced > 0) {
      return {
        status: "caution",
        text: `${priced} of ${n} ${priced === 1 ? "quote" : "quotes"} in — review pricing`,
        actionLabel: "Review",
        onAction: onOpen,
      };
    }
    return {
      status: "caution",
      text: `Awaiting acknowledgement — ${n} invited`,
    };
  }
  /* THE TWO NOTIFICATIONS, in the order they arrive. A partner accepting the
     invitation is the first and moves the order into this lane; the quote is
     the second, and it is the one that has something to be done about — so it
     is the one that carries the action. */
  if (r.status === "Assigned" && !r.vendorId) {
    const priced = r.quotes.length;
    if (priced > 0) {
      return {
        status: "caution",
        text: `${priced} ${priced === 1 ? "quote" : "quotes"} in — review pricing`,
        actionLabel: "Review",
        /* THE BUTTON OPENS THE ORDER. It carried no handler at all, so the one
           thing on the card asking to be pressed did nothing when it was. */
        onAction: onOpen,
      };
    }
    const n = r.acceptedVendorIds.length;
    return {
      status: "default",
      text: r.quoteRequested
        ? `${n === 1 ? "A partner" : `${n} partners`} accepted — awaiting pricing`
        : `${n === 1 ? "A partner" : `${n} partners`} accepted`,
    };
  }
  /* A QUEUE, NOT AN ACT. Nobody pushes it; the accounting system pulls it. */
  if (r.status === "Verified") {
    return { status: "default", text: "Awaiting accounting" };
  }
  /* THE ERROR MESSAGE IS THE USEFUL PART, so it is on the card, not buried. */
  if (r.status === "Partially Synced") {
    return {
      status: "warning",
      text: r.syncError ?? "Sync failed",
      actionLabel: "Review",
      onAction: onOpen,
    };
  }
  return undefined;
}

const TOGGLE_COLUMNS = BROKER_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

/**
 * WHAT A BOARD CARD CAN SHOW, and therefore what the column control offers
 * while the board is up.
 *
 * The control was handing the board the TABLE's columns, which is the right
 * control pointed at the wrong thing: a card has no columns, it has units, and
 * turning off "Qty (Gal)" did nothing to a card that never had a Qty row. §5.2
 * says the card's field set is the reader's to choose — these are the choices.
 *
 * The heading and the number are not in the list, because a card with no
 * number is not a card you can act on.
 */
const CARD_UNITS: { key: string; label: string; group?: string }[] = [
  { key: "customer", label: "Customer Details" },
  { key: "customer.account", label: "Account", group: "customer" },
  { key: "customer.site", label: "Ship-to site", group: "customer" },
  { key: "customer.address", label: "Address", group: "customer" },
  { key: "schedule", label: "Schedule" },
  { key: "schedule.window", label: "Delivery window", group: "schedule" },
  { key: "schedule.when", label: "Date or cadence", group: "schedule" },
  /* WHEN IT ACTUALLY RAN, which only a delivered order has. A field of its own
     rather than a second face for Schedule, so the two can be read together on
     a card where the difference between planned and actual is the point. */
  { key: "completed", label: "Completed on" },
  { key: "completed.when", label: "Date and time", group: "completed" },
  { key: "completed.cadence", label: "Cadence", group: "completed" },
  { key: "product", label: "Delivery Product Details" },
  { key: "product.product", label: "Product", group: "product" },
  { key: "product.qty", label: "Quantity", group: "product" },
  { key: "product.total", label: "Total", group: "product" },
  { key: "partner", label: "Vendor" },
  { key: "partner.name", label: "Partner name", group: "partner" },
  { key: "partner.detail", label: "Base · safety · distance", group: "partner" },
  /* What the partner holding the order is charging. Before the award there is
     no single figure — the quote stepper carries one per partner — so this is
     a delivered order's line. */
  { key: "partner.price", label: "Price", group: "partner" },
];

/**
 * WHICH FIELDS A LANE CAN ACTUALLY SHOW.
 *
 * A card in Quoting has no completion time and no settled price, so offering
 * those two in that lane's field list would be two switches that do nothing —
 * and a menu whose ticks do not describe the card is worse than a shorter
 * menu. With the scope on All lanes the full list is offered, because that
 * setting is about the board rather than about one card.
 */
function fieldsForLane(laneKey: string | null) {
  if (!laneKey) return CARD_UNITS;
  const delivered = DELIVERED_LANE_KEYS.has(laneKey);
  return CARD_UNITS.filter((u) =>
    delivered
      ? true
      : !u.key.startsWith("completed") && u.key !== "partner.price"
  );
}

const DELIVERED_LANE_KEYS = new Set(["Completed", "Review", "Verified", "Synced"]);

/** One shared empty set, so a lane with nothing hidden does not allocate. */
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/** Which lanes one press in the menu writes to. */
function lanesInScope(scope: string | null): string[] {
  return scope ? [scope] : BOARD_LANES.map((l) => l.key);
}

/**
 * One field on or off in one lane's set, with the parent/child rule applied.
 *
 * `turningOff` is passed in rather than read off this set, because on All
 * lanes the press has ONE meaning for every lane — see the caller.
 */
function toggleField(
  current: ReadonlySet<string>,
  key: string,
  turningOff: boolean
): Set<string> {
  const next = new Set(current);
  const kids = CARD_UNITS.filter((c) => c.group === key).map((c) => c.key);
  const entry = CARD_UNITS.find((c) => c.key === key);
  if (!turningOff) {
    next.delete(key);
    for (const c of kids) next.delete(c);
    /* Switching a child back on switches its heading back on too — otherwise
       the line you just asked for is still not drawn. */
    if (entry?.group) next.delete(entry.group);
    return next;
  }
  next.add(key);
  for (const c of kids) next.add(c);
  /* The last child going off takes the parent, since a heading with nothing
     under it is not a unit. */
  if (entry?.group) {
    const siblings = CARD_UNITS.filter((c) => c.group === entry.group).map(
      (c) => c.key
    );
    if (siblings.every((sib) => next.has(sib))) next.add(entry.group);
  }
  return next;
}

/**
 * WHAT EACH LANE STARTS WITH.
 *
 * A card is not one design repeated eight times — the question it answers
 * changes as the order moves, and the default set has to move with it.
 *
 *  - **From Quoting on, the schedule goes.** The board is already scoped to a
 *    day and the window is on the order; what the reader is doing in these
 *    lanes is comparing partners and prices, and a delivery window between the
 *    customer and the quotes is a line they read past every time.
 *  - **Past the delivery, "Completed on" takes its place.** A finished order is
 *    asked when it RAN, not when it was meant to.
 *
 * These are defaults, not rules. Every one of them is a tick in the Card
 * fields menu, per lane, and turning the schedule back on in Quoting is one
 * click.
 */
const SCHEDULE_FIELDS = ["schedule", "schedule.window", "schedule.when"];

const LANE_FIELD_DEFAULTS: Record<string, string[]> = {
  Quoting: SCHEDULE_FIELDS,
  Assigned: SCHEDULE_FIELDS,
  Completed: SCHEDULE_FIELDS,
  Review: SCHEDULE_FIELDS,
  Verified: SCHEDULE_FIELDS,
  Synced: SCHEDULE_FIELDS,
};

function initialCardOff(): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const lane of BOARD_LANES) {
    out[lane.key] = new Set(LANE_FIELD_DEFAULTS[lane.key] ?? []);
  }
  return out;
}

/**
 * THE WAYS A LANE CAN BE ORDERED, NAMED — see `BrokerBoardProps.laneSortOptions`.
 *
 * FOUR THAT APPLY EVERYWHERE, because a queue is a queue: when it is happening,
 * how big it is, who it is for, and which order it is. Each is offered in BOTH
 * directions, written as what you would get rather than as "ascending" —
 * "Earliest first" is a sentence about the work; "asc" is a sentence about the
 * sort.
 *
 * AND ONE THAT BELONGS TO THE LANE. What is worth ordering Draft by is not
 * what is worth ordering Assigned by: a draft is waiting on somebody here to
 * finish it, and an accepted order is waiting on a price. Those are in
 * `LANE_EXTRA_SORTS`, and a lane with nothing of its own gets the four.
 */
const LANE_SORTS: Record<
  string,
  { label: string; compare: (a: BrokerOrder, b: BrokerOrder) => number }
> = {
  "time-asc": {
    label: "Schedule time — earliest first",
    compare: (a, b) => timeToMinutes(a.window.start) - timeToMinutes(b.window.start),
  },
  "time-desc": {
    label: "Schedule time — latest first",
    compare: (a, b) => timeToMinutes(b.window.start) - timeToMinutes(a.window.start),
  },
  "qty-desc": {
    label: "Quantity — largest first",
    compare: (a, b) => totalGal(b.lines) - totalGal(a.lines),
  },
  "qty-asc": {
    label: "Quantity — smallest first",
    compare: (a, b) => totalGal(a.lines) - totalGal(b.lines),
  },
  "customer-asc": {
    label: "Customer — A to Z",
    compare: (a, b) => a.customer.title.localeCompare(b.customer.title),
  },
  "order-desc": {
    label: "Order # — newest first",
    compare: (a, b) => Number(b.orderNo.slice(2)) - Number(a.orderNo.slice(2)),
  },
  "ready-first": {
    label: "Ready to send first",
    compare: (a, b) => Number(isOrderReady(b)) - Number(isOrderReady(a)),
  },
  "invited-desc": {
    label: "Most partners invited first",
    compare: (a, b) => b.invitedVendorIds.length - a.invitedVendorIds.length,
  },
  "quotes-desc": {
    label: "Most quotes in first",
    compare: (a, b) => b.quotes.length - a.quotes.length,
  },
  "urgent-first": {
    label: "Urgent first",
    compare: (a, b) => Number(b.urgent) - Number(a.urgent),
  },
};

const COMMON_LANE_SORTS = [
  "time-asc",
  "time-desc",
  "qty-desc",
  "qty-asc",
  "customer-asc",
  "order-desc",
];

/** The one extra each lane earns from the thing it is waiting on. */
const LANE_EXTRA_SORTS: Record<string, string> = {
  Draft: "ready-first",
  Quoting: "invited-desc",
  Assigned: "quotes-desc",
  Completed: "urgent-first",
  Blocked: "urgent-first",
};

function laneSortOptions(laneKey: string) {
  const extra = LANE_EXTRA_SORTS[laneKey];
  return [...(extra ? [extra] : []), ...COMMON_LANE_SORTS].map((k) => ({
    key: k,
    label: LANE_SORTS[k].label,
  }));
}

/** What a saved view captures. `kind` is here because the tab IS part of the
 *  view a broker builds — a view that forgot it was the Movement tab would
 *  restore the wrong list. */
interface ViewState {
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  /** Column order as keys. Which two columns sit side by side IS the view for
   *  anyone comparing them, so it is captured like the filters are. */
  columnOrder: string[];
  /** Reader-set column widths in px, by key. Empty means "as declared". */
  columnWidths: Record<string, number>;
  pageSize: number;
  dateKey: string;
  /** The other end of the window. Absent on views saved before ranges. */
  dateKeyTo?: string;
  colScope: string;
  colQuery: string;
  /** Selected filter facets, as `facetKey:option`. Was `kind` when the order
   *  kinds were a tab row; a view still captures the same narrowing, plus every
   *  other facet it now sits beside. */
  facets: string[];
  /* WHAT THE SCREEN WAS LEFT SHOWING (Pavan, 2026-09-24) — a view retains
     every change made on the screen, not just the table's. Optional so a
     view saved before them still applies. */
  /** The filter row's boxes, by column key. */
  colFilters?: Record<string, string>;
  /** Card fields switched off, per lane, as sorted keys. */
  cardOff?: Record<string, string[]>;
  /** Board, table or map. */
  mode?: ListView;
  /** Each lane's own sort. */
  laneSort?: Record<string, string | undefined>;
}

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    hidden: [...s.hidden].sort(),
    /* Empty boxes are no filter — typing then clearing one is not a change. */
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters ?? {}).filter(([, v]) => v.trim() !== "").sort(([a], [b]) => a.localeCompare(b))
    ),
    laneSort: Object.fromEntries(
      Object.entries(s.laneSort ?? {}).filter(([, v]) => v).sort(([a], [b]) => a.localeCompare(b))
    ),
  });

/** Card fields as plain sorted arrays, so a view can hold and compare them. */
const cardOffToArrays = (c: Record<string, Set<string>>) =>
  Object.fromEntries(
    Object.keys(c)
      .sort()
      .map((k) => [k, [...c[k]].sort()])
  );

export function BrokerOrdersScreen({
  focus,
  startCreate,
  onCreateClose,
}: {
  focus?: { id: string; n: number } | null;
  /**
   * OPEN THE CREATE SHEET ON ARRIVAL. A nonce, not a boolean: the Recurring
   * Orders screens send the reader here to make one, and a boolean would fire
   * once and then be stuck on, reopening the sheet every time the screen
   * re-rendered.
   */
  startCreate?: number | null;
  /**
   * THE WAY BACK. A reader sent here by another screen's Create CTA came to
   * make ONE order; closing that form should put them back where they were,
   * not strand them on a list they never asked for.
   */
  onCreateClose?: () => void;
} = {}) {
  const [rows, setRows] = React.useState<BrokerOrder[]>(BROKER_ORDERS);
  const [openId, setOpenId] = React.useState<string | null>(null);
  /* WHICH PART OF THE SHEET THE READER ASKED FOR. A card's "review pricing"
     names the vendor table; opening at the top and leaving them to scroll is
     answering a different request. Cleared when the sheet closes. */
  const [sheetFocus, setSheetFocus] = React.useState<"vendor" | null>(null);
  /* Arrived here from another screen's Create CTA — see `startCreate`. */
  React.useEffect(() => {
    if (startCreate) setCreating(true);
  }, [startCreate]);
  const [creating, setCreating] = React.useState(false);
  /* §5.20 — Create means three DIFFERENT records, so the choice is made before
     a form opens rather than by a Type field inside one. `null` is "no movement
     sheet open"; the value is which direction it runs. */
  const [movement, setMovement] = React.useState<MovementDirection | null>(null);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<BrokerSortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<BrokerColumnKey>>(
    () => new Set(BROKER_HIDDEN_BY_DEFAULT)
  );
  /* THE BOARD KEEPS ITS OWN SET, because the two controls narrow different
     things and share one button. Folding them together would mean turning
     Vendor off on a card also took the Vendor column out of the table. */
  /* A SET PER LANE, not one for the board. What a Quoting card should say is
     not what a Completed one should, so a single switch list could only ever
     be right for one lane at a time. The menu's scope control is what picks
     which set is being edited; "All lanes" writes to every one of them. */
  const [cardOff, setCardOff] = React.useState<Record<string, Set<string>>>(
    initialCardOff
  );
  /** `null` = the menu is speaking for every lane at once. */
  const [cardScope, setCardScope] = React.useState<string | null>(null);

  /* WHAT THE MENU'S TICKS SAY, for whichever scope it is speaking for. On one
     lane it is that lane's set; on All lanes a field counts as hidden unless
     it is showing in every lane, so a tick always describes every card the
     scope covers. */
  const scopedHidden = React.useMemo<ReadonlySet<string>>(() => {
    if (cardScope) return cardOff[cardScope] ?? EMPTY_SET;
    const out = new Set<string>();
    for (const u of CARD_UNITS) {
      if (BOARD_LANES.some((l) => (cardOff[l.key] ?? EMPTY_SET).has(u.key)))
        out.add(u.key);
    }
    return out;
  }, [cardOff, cardScope]);
  /* Empty = the table's declared order; the table fills in anything a saved
     order does not mention, so a stale view never costs a column. */
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  /* A RANGE, not a day — see `DateRangeFilter`. It opens on today, so nothing
     changes for someone who only ever works one day at a time. */
  const [range, setRange] = React.useState<DateRange>(() => {
    const today = startOfDay(new Date());
    return { from: today, to: today };
  });
  const [colScope, setColScope] = React.useState("customer");
  const [colQuery, setColQuery] = React.useState("");
  // Board-first, per §5.2. This is the one list in the prototype that does not
  // open as a table.
  const [view, setView] = React.useState<ListView>("board");
  /** Which view the column control is speaking for. */
  const board = view === "board";
  /* The filter panel's selection, as `facetKey:option` ids. This is what the
     order-kind tab row turned into — plus every other facet, which used to be
     decorative. */
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [laneSort, setLaneSort] = React.useState<Record<string, string | undefined>>(
    {}
  );
  /** One box per column, under the headers — see `ListTableProps.columnFilters`. */
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const activeColFilters = React.useMemo(
    () => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""),
    [colFilters]
  );

  const current: ViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hidden],
    columnOrder,
    columnWidths,
    pageSize,
    dateKey: dateKeyOf(range.from),
    dateKeyTo: dateKeyOf(range.to),
    colScope,
    colQuery,
    facets: [...facetSel].sort(),
    colFilters,
    cardOff: cardOffToArrays(cardOff),
    mode: view,
    laneSort,
  };
  const defaultState: ViewState = React.useMemo(
    () => ({
      search: "",
      sortKey: null,
      sortDir: null,
      /* THE SCREEN'S OWN DEFAULT HIDDEN SET — it was `[]`, so Default read
         as changed the moment the screen opened. */
      hidden: [...BROKER_HIDDEN_BY_DEFAULT],
      columnOrder: [],
      columnWidths: {},
      pageSize: 25,
      dateKey: dateKeyOf(startOfDay(new Date())),
      dateKeyTo: dateKeyOf(startOfDay(new Date())),
      colScope: "customer",
      colQuery: "",
      facets: [],
      colFilters: {},
      cardOff: cardOffToArrays(initialCardOff()),
      mode: "board",
      laneSort: {},
    }),
    []
  );

  const applyState = (s: ViewState) => {
    setSearch(s.search);
    setSort(
      s.sortKey && s.sortDir
        ? { key: s.sortKey as BrokerColumnKey, dir: s.sortDir }
        : null
    );
    setHidden(new Set(s.hidden as BrokerColumnKey[]));
    setColumnOrder(s.columnOrder ?? []);
    setColumnWidths(s.columnWidths ?? {});
    setPageSize(s.pageSize);
    const [y, m, d] = s.dateKey.split("-").map(Number);
    const from = new Date(y, m - 1, d);
    /* A view saved before ranges existed has one date; one date is a range. */
    const [ty, tm, td] = (s.dateKeyTo ?? s.dateKey).split("-").map(Number);
    setRange({ from, to: new Date(ty, tm - 1, td) });
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    setFacetSel(new Set(s.facets ?? []));
    const filters = s.colFilters ?? {};
    setColFilters(filters);
    /* The row opens when the view has something typed in it. */
    setColFiltersOpen(Object.values(filters).some((v) => v.trim() !== ""));
    if (s.cardOff) {
      setCardOff(
        Object.fromEntries(Object.entries(s.cardOff).map(([k, v]) => [k, new Set(v)]))
      );
    } else setCardOff(initialCardOff());
    if (s.mode) setView(s.mode);
    setLaneSort(s.laneSort ?? {});
    setPage(1);
  };

  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState });

  /* RECURRING RULES CUT THEIR ORDERS HERE (Pavan, 2026-09-24) — for every
     day the board is looking at, today to a week ahead. Each order is cut
     once; see `recurringOrders.ts`. */
  const [programs] = usePrograms();
  React.useEffect(() => {
    const days = cuttableDays(range.from, range.to);
    if (days.length === 0) return;
    setRows((prev) => {
      const fresh = ordersFromPrograms(
        programs,
        days,
        new Set(prev.map((r) => r.id)),
        Math.max(...prev.map((r) => Number(r.orderNo.slice(2)) || 0)) + 1
      );
      return fresh.length ? [...fresh, ...prev] : prev;
    });
  }, [programs, range]);

  // A global-search hit lands here: open that order's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreating(false);
    setOpenId(focus.id);
  }, [focus]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();

  /*
    WHICH LINE THIS IS. Fuel, lubricants and propane are three kinds of work
    that happen to share a screen — different trucks, different certificates,
    different customers — not three filters of one list. The scope therefore
    sits ABOVE every other control on the page: the search, the facets, the
    lanes and the counts all apply within the line you have chosen.
  */
  const [line, setLine] = React.useState<ServiceLine>("Fuel");

  const onDate = React.useMemo(
    () => {
      const from = dateKeyOf(range.from);
      const to = dateKeyOf(range.to);
      return rows.filter(
        (r) => r.dateKey >= from && r.dateKey <= to && r.serviceLine === line
      );
    },
    [rows, range, line]
  );
  /** Tab counts are computed BEFORE the kind filter, so each tab can show how
   *  many rows it holds rather than only the active one being non-zero. */
  const searched = React.useMemo(
    () =>
      onDate.filter(
        (r) =>
          (!q || matchesBrokerOrder(r, q)) &&
          (!cq || matchesBrokerOrderIn(r, cq, colScope)) &&
          /* AND, because that is what typing in two boxes looks like it should
             do. Each box matches the text its own column PRINTS — see
             `brokerColumnText`. */
          activeColFilters.every(([key, value]) =>
            brokerColumnText(r, key as BrokerColumnKey)
              .toLowerCase()
              .includes(value.trim().toLowerCase())
          )
      ),
    [onDate, q, cq, colScope, activeColFilters]
  );

  /*
    Facet application. Every facet is AND-ed with the others and OR-ed within
    itself, which is what a checkbox list means.

    Three Status options — Overdue, Cancelled, Partially Synced — are
    filterable states the seed data has no rows for, so selecting one correctly
    empties the list rather than being quietly ignored. "Created / Draft" is the
    filter's label for the `Draft` lane.
  */
  /** Which business inside the line, or none — see `LINE_BUSINESSES`. */
  const [business, setBusiness] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    if (facetSel.size === 0) return searched;
    const on = (facet: string, value: string) => facetSel.has(`${facet}:${value}`);
    const picked = (facet: string) =>
      [...facetSel].some((id) => id.startsWith(`${facet}:`));
    const pass = (facet: string, values: string[]) =>
      !picked(facet) || values.some((v) => on(facet, v));

    return searched.filter((r) =>
      [
        /* Order Types is a MIXED facet, matching the reference: Urgent is a
           flag, Movement is the order kind, the rest are the Order Type field.
           A row therefore matches on every one of those it satisfies, and an
           Asset Movement order answers to "Movement" rather than to a type
           nobody picked from the list. */
        pass("orderTypes", [
          ...(r.urgent ? ["Urgent Orders"] : []),
          /* RECURRING came back as a filter when the tabs folded into this
             facet — it had been dropped. */
          ...(r.kind === "Recurring" ? ["Recurring"] : []),
          r.orderType === "Asset Movement" ? "Movement" : r.orderType,
        ]),
        pass("status", [r.status === "Draft" ? "Created / Draft" : r.status]),
        pass("customer", [r.customer.title]),
        pass("shipToAddress", [r.shipTo, r.zip, r.state]),
        pass("product", r.lines.map((l) => l.product)),
        pass("vendor", [
          ...(r.vendorId ? [vendorName(r.vendorId)] : []),
          ...r.invitedVendorIds.map(vendorName),
        ]),
        pass("salesperson", [r.salesperson]),
        pass("createdBy", [r.createdBy]),
        pass("tags", r.tags),
      ].every(Boolean)
    );
  }, [searched, facetSel]);
  /* THE PRESET NARROWS AFTER THE FACETS AND BEFORE THE SORT, because it is not
     one of them: the facets are questions asked of a list, and the business is
     which list you are looking at. */
  const inBusiness = React.useMemo(
    () =>
      business === null
        ? filtered
        : filtered.filter((r) => businessOf(r) === business),
    [filtered, business]
  );
  const sorted = React.useMemo(
    () => sortBrokerOrders(inBusiness, sort),
    [inBusiness, sort]
  );
  const pageRows = React.useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  /** Sending the request moves the order's own `invoiceState` on. The lane does
   *  not change: chasing a bill is not a step in the delivery. */
  const requestInvoice = React.useCallback(
    (id: string) =>
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, invoiceState: "requested" } : r))
      ),
    []
  );

  const lanes: BoardLane[] = React.useMemo(
    () =>
      BOARD_LANES.map((lane) => {
        const held = new Set<BrokerStatus>(lane.statuses);
        let cards = filtered.filter((r) => held.has(r.status));
        const cmp = LANE_SORTS[laneSort[lane.key] ?? ""]?.compare;
        if (cmp) cards = [...cards].sort(cmp);
        const title = lane.title ?? lane.key;
        return {
          key: lane.key,
          title,
          color: BROKER_LANE_COLOR[lane.statuses[lane.statuses.length - 1]],
          apart: lane.apart,
          emptyLabel: `No orders in ${title.toLowerCase()}`,
          cards: cards.map((r) => ({
            id: r.id,
            title: r.orderNo,
            badges: laneCardBadges(r),
            code: laneCardCode(r),
            subtitle: laneCardSubtitle(r),
            units: laneCardUnits(r, cardOff[lane.key] ?? EMPTY_SET),
            /* REVIEW PRICING OPENS AT THE PRICING. */
            alert: laneCardAlert(r, () => {
              setSheetFocus("vendor");
              setOpenId(r.id);
            }),
            footerAction: laneCardInvoice(
              r,
              () => requestInvoice(r.id),
              () => setOpenId(r.id)
            ),
          })),
        };
      }),
    [filtered, laneSort, requestInvoice, setOpenId, cardOff]
  );


  const onSort = (key: BrokerColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const setLaneSortKey = (laneKey: string, option: string | null) =>
    setLaneSort((prev) => ({ ...prev, [laneKey]: option ?? undefined }));

  const customers = React.useMemo(
    () => Array.from(new Set(BROKER_ORDERS.map((r) => r.customer.title))),
    []
  );
  /* Every site, not only the ones an order already uses — a new order must be
     able to reach a site nobody has ordered to yet. */
  const shipTos = React.useMemo(() => SHIP_TO_SITES.map((x) => x.name), []);

  /* ONE LIST, READ TWICE — the panel builds its facet menu from it and the
     chip shelf looks up what a `facetKey:option` id is CALLED. Inline in the
     panel's props it could only be read by the panel, and the shelf would have
     carried a second copy of every label. */
  const ORDER_FACETS: ListFacet[] = React.useMemo(
    () => [

              {
                key: "status",
                label: "Status",
                // The filter's status list is longer than the board's lanes —
                // see BROKER_STATUS_FILTERS for why the two are kept apart.
                options: [...BROKER_STATUS_FILTERS],
              },
              {
                key: "customer",
                label: "Customer",
                options: customers,
                searchable: true,
              },
              {
                key: "shipToAddress",
                label: "Ship-To Address",
                /* One facet, three questions. Ship-to name, ZIP and state are
                   the same address asked at three grains, so they share a
                   pane instead of eating three rows of the facet menu. Each
                   site carries its full address, because two sites can share
                   a name and only the street tells them apart. */
                sections: [
                  {
                    title: "Ship-To Name",
                    options: SHIP_TO_SITES.map((x) => ({
                      value: x.name,
                      description: siteAddress(x),
                    })),
                  },
                  {
                    title: "Zip Code",
                    options: [...new Set(SHIP_TO_SITES.map((x) => x.zip))],
                  },
                  {
                    title: "State",
                    options: [...new Set(SHIP_TO_SITES.map((x) => x.state))],
                  },
                ],
                searchable: true,
              },
              {
                key: "orderTypes",
                label: "Order Types",
                options: [...ORDER_TYPE_FILTERS],
              },
              {
                key: "product",
                label: "Product",
                options: [...PRODUCTS],
                searchable: true,
              },
              {
                key: "vendor",
                label: "Vendors / Common Carriers",
                options: VENDORS.map((v) => v.name),
                searchable: true,
              },
              {
                key: "salesperson",
                label: "Sales Person",
                options: [...SALESPEOPLE],
              },
              { key: "createdBy", label: "Created By", options: [...CREATED_BY] },
              { key: "tags", label: "Tags", options: [...ORDER_TAGS] },
                ],
    [customers]
  );

  /** The draft's fields, folded onto the stored order. Pure, so the save can
   *  diff the before and after without running the mapping twice. */
  const applyDraft = (r: BrokerOrder, draft: BrokerOrderDraft): BrokerOrder => ({
              ...r,
              customer: { title: draft.customer, description: draft.erpId },
              shipTo: draft.shipTo,
              window: { start: draft.windowStart, end: draft.windowEnd },
              poNumber: draft.poNumber,
              orderType: draft.orderType,
              hub: draft.hub,
              urgent: draft.urgent,
              signatureOnDelivery: draft.signatureOnDelivery,
              lines: draft.lines,
              /* THE LINE FOLLOWS THE PRODUCT, ALWAYS. It was set once at
                 creation and never again, so a draft that started on the
                 default fuel and ended up a lubricants order stayed on the
                 Fuel board with lubricants written on its own sheet. */
              ...(() => {
                const sl = lineOfProduct(draft.lines[0]?.product ?? "");
                if (sl === r.serviceLine) return {};
                const options = LINE_BUSINESSES[sl];
                return {
                  serviceLine: sl,
                  /* A business belongs to ONE line, so the old one cannot
                     survive the move. Propane declares none, hence null. */
                  business:
                    r.business && options.includes(r.business)
                      ? r.business
                      : (options[0] ?? null),
                };
              })(),
              status: draft.status,
              vendorId: draft.vendorId,
              invitedVendorIds: draft.invitedVendorIds,
              sentVendorIds: draft.sentVendorIds,
              quoteRequested: draft.quoteRequested,
              jobType: draft.jobType,
              primaryPoc: draft.primaryPoc,
              /* THE FIVE THAT HAD NO HOME. Job type, the second contact, the
                 internal note, the winter blend and the email switch were
                 collected by the sheet and modelled nowhere, so every one of
                 them was thrown away on save and read back as its default.
                 The rest of the secondary list is kept — this sheet edits the
                 first, the movement sheet writes several. */
              secondaryPocs: draft.secondaryPoc
                ? [draft.secondaryPoc, ...r.secondaryPocs.slice(1)]
                : r.secondaryPocs.slice(1),
              salesperson: draft.salesperson,
              instructions: draft.instructions,
              internalNote: draft.internalNote,
              winterAdditive: draft.winterAdditive,
              syncError: draft.status === "Partially Synced" ? draft.syncError ?? null : null,
              notifyVendor: draft.notifyVendor,
              /* EVERYTHING THE SHEET COLLECTS AND THE ORDER MODELS. These six
                 were missing, so a save kept the customer and the lines and
                 quietly dropped the acceptances, the prices, the delivery fee,
                 the recurrence and the load order — the whole right-hand half
                 of the work. */
              acceptedVendorIds: draft.acceptedVendorIds,
              quotes: draft.quotes,
              orderFees: draft.orderFees,
              tags: draft.tags,
              /* A MOVEMENT STAYS A MOVEMENT. Its kind is a fact about what the
                 record IS — one asset, no quantity, an M prefix `orders.ts`
                 asserts on — and the recurring switch is not on its sheet. */
              kind:
                r.kind === "Movement"
                  ? r.kind
                  : draft.recurring
                    ? "Recurring"
                    : "Regular",
              recurrence: draft.recurring
                ? {
                    fromDateKey: dateKeyOf(
                      draft.recurrenceFrom ?? draft.plannedDate ?? new Date()
                    ),
                    frequency: draft.recurrenceFrequency,
                  }
                : null,
              /* Only rows anyone actually completed — a half-filled load row
                 would read as a loading plan that does not exist. */
              loadOrder:
                draft.loadRows
                  ?.filter((x) => x.terminal && x.supplier && x.loadingAccount)
                  .map((x) => ({
                    product: x.product,
                    terminal: x.terminal!,
                    supplier: x.supplier!,
                    loadingAccount: x.loadingAccount!,
                    ...(x.excluded ? { excluded: true } : {}),
                  })) ?? null,
              /* STAMPED ONCE, WHEN THE RUN IS FIRST CALLED DONE. Re-stamping
                 on every later save would make Verified and Synced rewrite the
                 delivery's own time; going backwards out of the delivered
                 stages clears it, because an order being worked on again has
                 not been delivered. */
              completedAt: isDelivered(draft.status)
                ? (r.completedAt ?? new Date().toISOString())
                : null,
              // Leaving Blocked clears the reason, so the two can never disagree
              // — the same invariant `assertConsistent` checks on the seeds.
              blockedReason: draft.status === "Blocked" ? r.blockedReason : null,
              ...(draft.plannedDate
                ? {
                    date: {
                      title: DATE_FMT.format(draft.plannedDate),
                      description: relativeLabel(
                        Math.round(
                          (draft.plannedDate.getTime() -
                            startOfDay(new Date()).getTime()) /
                            86_400_000
                        ),
                        draft.plannedDate
                      ),
                    },
                    dateKey: dateKeyOf(draft.plannedDate),
                  }
                : {}),
});

  /**
   * THE SHEET'S SAVE, AND IT IS QUIET.
   *
   * It is called by the sheet's autosave — every change, debounced — so it
   * cannot announce itself: a toast per pause while somebody fills in a form
   * is the app narrating typing. The ACTS announce themselves (invitations
   * sent, partner awarded, order confirmed), which is what a reader needs
   * told, and each of those is a change this then keeps.
   *
   * A DRAFT BEING FILLED IN WRITES NO HISTORY. The audit trail is a record of
   * what happened to a live order; on a draft nobody has sent anywhere, every
   * field is "being typed for the first time" and an entry per pause would
   * bury the entries that matter under the making of the thing. Past Draft,
   * every save that changed something earns its line.
   */
  const saveOrder = (order: BrokerOrder, draft: BrokerOrderDraft) => {
    /* AN ORDER BEING EDITED DOES NOT SLIP OUT FROM BEHIND ITS OWN SHEET.
       Changing the product to a lubricant, or the planned date to next week,
       moves the row off a board scoped to Fuel and to today — the sheet stays
       open over a list the row has left, and closing it looks like the edit
       was lost. Same widening as a new order gets. */
    if (draft.plannedDate) {
      revealOn(draft.plannedDate, lineOfProduct(draft.lines[0]?.product ?? ""));
    }
    setRows((prev) => {
      const saved = prev.map((r) => (r.id === order.id ? applyDraft(r, draft) : r));
      const before = prev.find((r) => r.id === order.id);
      const after = saved.find((r) => r.id === order.id);
      if (!before || !after) return saved;
      if (after.status === "Draft" && before.status === "Draft") return saved;
      const changes = diffOrder(before, after);
      if (changes.length === 0) return saved;
      return saved.map((r) =>
        r.id === order.id
          ? {
              ...r,
              audit: [
                ...r.audit,
                { at: new Date().toISOString(), by: "Dana Whitfield", changes },
              ],
            }
          : r
      );
    });
  };

  /**
   * A NEW ORDER HAS TO BE WHERE THE READER IS LOOKING.
   *
   * The board is scoped to a date range and to one service line, and a new
   * order defaults to TOMORROW — so the commonest thing anyone could do here
   * was create an order and watch it not appear. The same happened to a
   * lubricants order booked from the Fuel tab.
   *
   * The window is WIDENED rather than moved. Jumping the board to the new
   * order's day would take away whatever the reader was watching to make room
   * for the thing they just made; today–tomorrow shows both, and the date
   * label says so.
   *
   * Search and the filter panel are left alone: those are narrowings the
   * reader typed, and undoing them is a bigger liberty than widening a window
   * that was never chosen.
   */
  const revealOn = (when: Date, serviceLine: ServiceLine) => {
    setRange((r) => {
      const day = startOfDay(when);
      if (day >= startOfDay(r.from) && day <= startOfDay(r.to)) return r;
      return {
        from: day < startOfDay(r.from) ? day : r.from,
        to: day > startOfDay(r.to) ? day : r.to,
      };
    });
    setLine(serviceLine);
  };

  /** New orders continue the D- series in steps of 7, as the seeds do. */
  /**
   * A DRAFT IS A REAL ORDER FROM THE FIRST THING TYPED INTO IT.
   *
   * Pavan, 2026-09-17: "in the draft they are adding all the required details,
   * but it is created when vendors are added and invitations are sent — that
   * is when it will move to Quoting. Till then, everything is in draft mode."
   * So this is not the commit at the end of a form; it is the moment the
   * record starts existing, in the Draft lane, where it can be left and come
   * back to. What USED to be here — a Create button nobody could reach,
   * because the footer's ladder replaced it — kept nothing at all.
   *
   * The sheet is handed over to the saved order as it returns: same sheet,
   * same scroll, but now with a number, a stage bar and somewhere for the
   * next keystroke to go.
   */
  const createOrder = (draft: BrokerOrderDraft) => {
    const when = draft.plannedDate ?? range.from;
    const chosenSite = SHIP_TO_SITES.find((x) => x.name === draft.shipTo);
    const nextNo =
      Math.max(...rows.map((r) => Number(r.orderNo.slice(2)))) + 7;
    const offset = Math.round(
      (when.getTime() - startOfDay(new Date()).getTime()) / 86_400_000
    );
    setRows((prev) => [
      {
        id: `bo-new-${nextNo}`,
        /* The prefix follows the KIND, and the kind now follows the sheet's
           recurring checkbox — a recurring order created here has to read as
           one everywhere, or the badge and the filter disagree. */
        orderNo: `D-${nextNo}`,
        kind: draft.recurring ? "Recurring" : "Regular",
        orderType: draft.orderType === "Asset Movement" ? "Core" : draft.orderType,
        customer: { title: draft.customer, description: draft.erpId },
        shipTo: draft.shipTo,
        date: { title: DATE_FMT.format(when), description: relativeLabel(offset, when) },
        dateKey: dateKeyOf(when),
        window: { start: draft.windowStart, end: draft.windowEnd },
        lines: draft.lines,
        status: draft.status,
        vendorId: draft.vendorId,
        invitedVendorIds: draft.invitedVendorIds,
        sentVendorIds: draft.sentVendorIds,
        acceptedVendorIds: draft.acceptedVendorIds,
        quoteRequested: draft.quoteRequested,
        quotes: [],
        orderFees: [],
        /* A new order has not been delivered, let alone billed. */
        invoiceState: "none",
        serviceLine: lineOfProduct(draft.lines[0]?.product ?? ""),
        /* A NEW ORDER TAKES THE BUSINESS THE READER IS STANDING IN. They
           picked Transport before pressing Create; landing the order in Tank
           Wagon would hide it behind the tab they are looking at. On Default
           it is the line's first business, which is the one the form's
           defaults describe. */
        business:
          business ??
          LINE_BUSINESSES[lineOfProduct(draft.lines[0]?.product ?? "")][0] ??
          null,
        audit: [
          {
            at: new Date().toISOString(),
            by: "Dana Whitfield",
            changes: ["Order created"],
          },
        ],
        urgent: draft.urgent,
        signatureOnDelivery: draft.signatureOnDelivery,
        poNumber: draft.poNumber,
        /* The create sheet has no geography fields, so a new order takes the
           first site rather than leaving the ship-to facets blank for it. */
        /* The site carries its own geography, so a new order reads it from the
           chosen ship-to rather than being handed a default that disagrees. */
        zip: chosenSite?.zip ?? SHIP_TO_SITES[0].zip,
        state: chosenSite?.state ?? SHIP_TO_SITES[0].state,
        createdBy: "Dana Whitfield",
        tags: [],
        /* Only rows that were actually completed survive — a half-filled load
           row would read as a loading plan that does not exist. */
        loadOrder:
          draft.loadRows
            ?.filter((r) => r.terminal && r.supplier && r.loadingAccount)
            .map((r) => ({
              product: r.product,
              terminal: r.terminal!,
              supplier: r.supplier!,
              loadingAccount: r.loadingAccount!,
            })) ?? null,
        recurrence: draft.recurring
          ? {
              fromDateKey: dateKeyOf(draft.recurrenceFrom ?? when),
              frequency: draft.recurrenceFrequency,
            }
          : null,
        hub: draft.hub,
        jobType: draft.jobType,
        primaryPoc: draft.primaryPoc,
        secondaryPocs: draft.secondaryPoc ? [draft.secondaryPoc] : [],
        salesperson: draft.salesperson,
        instructions: draft.instructions,
        internalNote: draft.internalNote,
        winterAdditive: draft.winterAdditive,
        notifyVendor: draft.notifyVendor,
        /* A new order has not run yet, whatever stage it is created into. */
        completedAt: null,
        blockedReason: null,
        movement: null,
      },
      ...prev,
    ]);
    revealOn(when, lineOfProduct(draft.lines[0]?.product ?? ""));
    setPage(1);
    setCreating(false);
    setOpenId(`bo-new-${nextNo}`);
  };

  /* A MOVEMENT ORDER IS A DIFFERENT RECORD, not a delivery with a flag: it
     carries exactly one asset, no quantity, and an M prefix that `orders.ts`
     asserts on. `assertConsistent` fails the build if any of that drifts. */
  const createMovement = (draft: AssetMovementDraft) => {
    const when = draft.plannedDate ?? range.from;
    /* THE ROUTE SAYS WHICH END IS WHICH PLACE. The order's own customer and
       ship-to are the CUSTOMER end of it — the destination when there is a
       choice, because that is where the asset ends up and where the board's
       Ship-to facets should find it. A relocate has neither, and says so. */
    const route = MOVEMENT_ROUTE[draft.direction];
    const custPoint =
      route.to === "site" ? draft.to : route.from === "site" ? draft.from : null;
    const chosenSite = SHIP_TO_SITES.find((x) => x.name === custPoint?.shipTo);
    const endName = (step: "from" | "to") =>
      route[step] === "yard" ? draft[step].yard : draft[step].shipTo;
    const nextNo = Math.max(...rows.map((r) => Number(r.orderNo.slice(2)))) + 7;
    const offset = Math.round(
      (when.getTime() - startOfDay(new Date()).getTime()) / 86_400_000
    );
    const asset = RENTAL_ASSETS.find((a) => a.id === draft.assetId);
    setRows((prev) => [
      {
        id: `bo-mv-${nextNo}`,
        orderNo: `M-${nextNo}`,
        kind: "Movement",
        orderType: "Asset Movement",
        customer: { title: custPoint?.customer ?? "", description: "" },
        shipTo: custPoint?.shipTo ?? "",
        date: { title: DATE_FMT.format(when), description: relativeLabel(offset, when) },
        dateKey: dateKeyOf(when),
        window: { start: "8:00 AM", end: "12:00 PM" },
        /* Exactly one line, no gallons — there is nothing to deliver, only
           something to move. */
        lines: [
          {
            asset: asset?.name ?? "",
            /* The products are the tank's cargo list; the card's one product
               column shows the single one, or says how many. */
            product:
              draft.products.length === 1
                ? draft.products[0]
                : draft.products.length > 1
                  ? `${draft.products.length} products`
                  : asset
                    ? "—"
                    : "",
            gal: null,
            topOff: false,
            charges: defaultLineCharges(),
            rental: true,
          },
        ],
        status: "Draft",
        vendorId: null,
        invitedVendorIds: [],
        sentVendorIds: [],
        acceptedVendorIds: [],
        quoteRequested: false,
        quotes: [],
        orderFees: [],
        invoiceState: "none",
        serviceLine: lineOfProduct(""),
        business: null,
        audit: [
          {
            at: new Date().toISOString(),
            by: "Dana Whitfield",
            changes: ["Order created"],
          },
        ],
        urgent: draft.urgent,
        signatureOnDelivery: draft.signature,
        poNumber: draft.poNumber,
        zip: chosenSite?.zip ?? SHIP_TO_SITES[0].zip,
        state: chosenSite?.state ?? SHIP_TO_SITES[0].state,
        createdBy: "Dana Whitfield",
        tags: draft.tags,
        loadOrder: null,
        recurrence: null,
        hub: HUBS[0],
        /* A MOVEMENT RUNS ON OUR OWN FLEET. This sheet has no partner table
           and no quotes, so there is nobody to buy the haul from. */
        jobType: "Transportation",
        primaryPoc: draft.primaryPoc,
        /* The movement sheet collects SEVERAL second contacts, which is why
           the order stores a list. Blanks are dropped — an unfilled row is
           not a person. */
        secondaryPocs: draft.secondaryPocs.filter((p) => p !== ""),
        salesperson: draft.salesperson,
        instructions: draft.instructions,
        internalNote: draft.internalNote,
        /* No fuel on a movement, so no blend to specify. */
        winterAdditive: false,
        notifyVendor: draft.notifyVendor,
        completedAt: null,
        blockedReason: null,
        movement: {
          direction: draft.direction,
          from: endName("from"),
          to: endName("to"),
          /* Both are the ASSET's facts now — the sheet no longer asks for
             them, it shows the ones that arrived with the tank. */
          tankType: asset?.assetType ?? "",
          capacityGal: asset?.capacityGal ?? 0,
        },
      },
      ...prev,
    ]);
    revealOn(when, lineOfProduct(""));
    setPage(1);
  };

  const renderCell = (row: BrokerOrder, key: BrokerColumnKey) => {
    /* WHAT NARROWED THIS ROW, so the cell can mark the run that answered it.
       Two sources, both live at once: the column's own filter box, and the
       list search — which is the one that reaches every column, and the one
       that was doing its work invisibly. Typing "dyed diesel" cut 44 rows to
       22 and left the reader to take the count's word for it. */
    const f = [colFilters[key], search];
    switch (key) {
      case "order":
        return (
          <span className="truncate text-sm tabular-nums text-foreground">
            <Hit text={row.orderNo} q={f} />
          </span>
        );
      /* The disc carries its own tooltip and aria-label — the letter is never
         the only thing holding the meaning. Urgency used to ride here as a
         second red "!" disc; it is a row-level fact, not a kind of order, and
         two discs in one cell made the type harder to read than having no
         column at all. It stays on the board card badge and in the sheet. */
      case "type": {
        const c = laneCardCode(row);
        return <CodeDisc code={c.text} label={c.label} tone={c.tone} />;
      }
      case "customer":
        return <TwoLineCell {...row.customer} q={f} />;
      case "shipTo":
        return (
          <span className="truncate text-sm text-foreground">
            <Hit text={row.shipTo} q={f} />
          </span>
        );
      case "date":
        return <TwoLineCell {...row.date} q={f} />;
      case "window":
        return (
          <span className="truncate text-sm text-foreground">
            <Hit text={`${row.window.start} – ${row.window.end}`} q={f} />
          </span>
        );
      case "qty":
        return (
          <span className="text-sm tabular-nums text-foreground">
            <Hit
              text={
                isAllTopOff(row.lines)
                  ? "Top-off"
                  : totalGal(row.lines).toLocaleString()
              }
              q={f}
            />
          </span>
        );
      /* PRODUCTS, NOT PRODUCT. An order carries several and the list is what
         someone scans to find the one they are thinking of; the count carries
         the rest rather than a name that happens to be first. */
      case "products": {
        let names = [...new Set(row.lines.map((l) => l.product))];
        /* THE CELL SHOWS THE ONE THAT MATCHED.
           An order carries several products and the column has room for one,
           so it prints the first and counts the rest. Filter the column on
           "dyed" and half the rows came back reading "Clear Diesel #2 +1" —
           every one of them a true match, and every one of them looking like a
           mistake, because the word that fetched the row was inside the +1.
           Matching only the printed name would have been the other way to make
           them agree, and the wrong one: an order whose second line is dyed
           diesel really does have dyed diesel on it. So the row stays and the
           cell leads with the line that earned it. */
        const needles = [colFilters.products, search]
          .map((n) => n?.trim().toLowerCase())
          .filter((n): n is string => Boolean(n));
        if (needles.length) {
          const hit = names.filter((n) =>
            needles.some((needle) => n.toLowerCase().includes(needle))
          );
          names = [...hit, ...names.filter((n) => !hit.includes(n))];
        }
        return (
          <span className="truncate text-sm text-foreground" title={names.join(", ")}>
            {names[0] ? <Hit text={names[0]} q={f} /> : "—"}
            {names.length > 1 && (
              <span className="text-muted-foreground"> +{names.length - 1}</span>
            )}
          </span>
        );
      }
      case "createdBy":
        return (
          <span className="truncate text-sm text-muted-foreground">
            <Hit text={row.createdBy} q={f} />
          </span>
        );
      case "vendor":
        // Three genuinely different states, and collapsing them would hide the
        // one a broker acts on: nobody invited, invited but unaccepted, accepted.
        return row.vendorId ? (
          <span className="truncate text-sm text-foreground">
            <Hit text={vendorName(row.vendorId)} q={f} />
          </span>
        ) : row.invitedVendorIds.length > 0 ? (
          <span className="truncate text-sm text-muted-foreground">
            {row.invitedVendorIds.length} invited
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      case "status":
        /* A BADGE, NOT A DOT AND A WORD. Down a column of twenty, a coloured
           dot beside plain text is a bullet list that happens to be tinted —
           the eye reads the words in order to find the one it wants. A filled
           pill has an edge, so the column becomes a set of shapes you can
           scan past without reading, which is the whole reason a status is a
           chip rather than a sentence. */
        return (
          <StatusChip tone={BROKER_STATUS_TONE[row.status]} variant="soft">
            <Hit text={row.status} q={f} />
          </StatusChip>
        );
      case "business": {
        const b = businessOf(row);
        return b ? (
          <span className="truncate text-sm text-foreground">
            <Hit text={b} q={f} />
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      }
      case "orderType":
        return (
          <span className="truncate text-sm text-foreground">
            <Hit text={row.orderType} q={f} />
          </span>
        );
      case "poNumber":
        return row.poNumber ? (
          <span className="truncate text-sm tabular-nums text-foreground">
            <Hit text={row.poNumber} q={f} />
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      case "hub":
        return (
          <span className="truncate text-sm text-foreground">
            <Hit text={row.hub} q={f} />
          </span>
        );
      case "salesperson":
        return (
          <span className="truncate text-sm text-foreground">
            <Hit text={row.salesperson} q={f} />
          </span>
        );
      case "tags": {
        /* Same rule as Products: the matched tag comes first, so a row never
           reads as an answer to a word it does not appear to contain. */
        const needles = [colFilters.tags, search]
          .map((n) => n?.trim().toLowerCase())
          .filter((n): n is string => Boolean(n));
        const matched = (t: string) =>
          needles.some((needle) => t.toLowerCase().includes(needle));
        const tags = needles.length
          ? [...row.tags.filter(matched), ...row.tags.filter((t) => !matched(t))]
          : row.tags;
        return tags.length ? (
          <span className="truncate text-sm text-foreground">
            <Hit text={tags.join(", ")} q={f} />
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      }
      default:
        return null;
    }
  };

  /* THE WINDOW, IN WORDS. One day reads as a date; a range reads as a range. */
  const rangeLabel =
    dateKeyOf(range.from) === dateKeyOf(range.to)
      ? formatFullDate(range.from)
      : `${formatFullDate(range.from)} – ${formatFullDate(range.to)}`;

  /* EVERY NARROWING THAT IS ON, for the export sheet to list. Each one drops
     the same narrowing the toolbar's own chip drops — they write to the
     screen's state, so taking one off in the sheet is visibly the same act as
     taking it off out there.

     THE SERVICE LINE IS NOT IN HERE. It is not a question asked of a list, it
     is WHICH LIST this is, and a Remove on it would have to mean "export fuel,
     lubricants and propane together" — a different export, not a filter being
     cleared. The line stays where it is chosen, above everything. */
  const dropFacets = (gone: string[]) => {
    const next = new Set(facetSel);
    for (const id of gone) next.delete(id);
    setFacetSel(next);
    setPage(1);
  };

  const exportFilters: ExportFilterRow[] = [
    {
      key: "business",
      label: "Business",
      values: business
        ? [
            {
              value: business,
              onRemove: () => {
                setBusiness(null);
                setPage(1);
              },
            },
          ]
        : [],
    },
    {
      key: "search",
      label: "Search",
      values: search.trim()
        ? [
            {
              value: search.trim(),
              onRemove: () => {
                setSearch("");
                setPage(1);
              },
            },
          ]
        : [],
    },
    {
      /* The column search reads as the COLUMN it is scoped to, not as
         "column search" — that is what the chip on the shelf says too. */
      key: "colSearch",
      label:
        BROKER_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim()
        ? [
            {
              value: colQuery.trim(),
              onRemove: () => {
                setColQuery("");
                setPage(1);
              },
            },
          ]
        : [],
    },
    /* One row per header box that has something typed in it. */
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: BROKER_COLUMNS.find((c) => c.key === key)?.label ?? key,
      values: [
        {
          value: value.trim(),
          onRemove: () => {
            setColFilters((prev) => ({ ...prev, [key]: "" }));
            setPage(1);
          },
        },
      ],
    })),
    /* The facets, in the panel's own order so the sheet and the facet menu
       read the same way round — the rule `FilterChips` already follows. */
    ...ORDER_FACETS.map((f) => {
      const mine = [...facetSel].filter((id) => id.startsWith(`${f.key}:`));
      return {
        key: f.key,
        label: f.label,
        values: mine.map((id) => ({
          value: id.slice(id.indexOf(":") + 1),
          onRemove: () => dropFacets([id]),
        })),
        onRemoveAll: () => dropFacets(mine),
      };
    }),
  ];

  const emptyBody = (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">{q ? <SearchX /> : <CalendarOff />}</EmptyMedia>
        <EmptyTitle>{q ? "No matching orders" : "Nothing planned"}</EmptyTitle>
        <EmptyDescription>
          {q
            ? `No 3PL orders in ${rangeLabel} match “${search.trim()}”.`
            : `No 3PL orders are planned for ${rangeLabel}.`}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (q) setSearch("");
            else {
              const today = startOfDay(new Date());
              setRange({ from: today, to: today });
            }
            setPage(1);
          }}
        >
          {q ? "Clear search" : "Go to today"}
        </Button>
      </EmptyContent>
    </Empty>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FuelOrdersViewBar
        {...savedViews}
        /* DEFAULT MEANS NOTHING IS APPLIED, and that has to include the
           business. `useSavedViews` restores the saved state — search, sort,
           columns, facets — and knows nothing about the preset row, so
           pressing Default while Transport was underlined cleared everything
           the reader could see and left the one narrowing they could not.
           Default is the tab that says "all of it", so it has to mean it. */
        onResetToDefault={() => {
          setBusiness(null);
          savedViews.onResetToDefault();
        }}
        ctaLabel="Create Order"
        segments={SERVICE_LINES.map((l) => ({ key: l, label: l }))}
        segmentValue={line}
        onSegmentChange={(l) => {
          setLine(l as ServiceLine);
          /* THE BUSINESS BELONGS TO THE LINE. Tank Wagon is a fuel word;
             carrying it across to Propane would leave a tab underlined that
             narrows by something the new line has never heard of. */
          setBusiness(null);
          setPage(1);
        }}
        /* THE BUSINESSES INSIDE THE LINE, as tabs beside Default. Fuel has two
           and the other lines have none yet, so the row shows what is true
           rather than placeholders. */
        presets={LINE_BUSINESSES[line].map((b) => ({ key: b, label: b }))}
        presetKey={business}
        onPresetChange={(b) => {
          setBusiness((prev) => (prev === b ? null : b));
          setPage(1);
        }}
        /* TWO FORMS, SO TWO ENTRIES. A delivery has lines and a partner; an
           asset order has one asset and a route — different forms, so the
           choice comes before the form rather than as a Type field inside it.

           THE ROUTE IS NOT A THIRD FORM, so the four are not four sibling
           items. They are radios UNDER "Asset Orders": they read as variants
           of one thing rather than as four more kinds of order, and the
           selected one says where the asset is going before you commit to a
           form. Each is labelled by its ROUTE with the verb in brackets —
           "Delivery" and "Pickup" are one word apart and opposite, and
           "Transfer" and "Relocate" say nothing at all on their own about
           which two places are involved. */
        createMenu={[
          {
            key: "delivery-order",
            label: "Delivery Order",
            detail: "Standard fuel delivery to a customer site",
          },
          {
            key: "movement-order",
            label: "Asset Orders",
            detail: "Move a tank or asset between yards and customer sites",
            defaultChoice: MOVEMENT_DIRECTIONS[0],
            choices: MOVEMENT_DIRECTIONS.map((d) => ({
              key: d,
              label: MOVEMENT_LABEL[d],
              detail: MOVEMENT_DETAIL[d],
            })),
          },
        ]}
        onCreateSelect={(key) => {
          if (key === "delivery-order") setCreating(true);
          else setMovement(key as MovementDirection);
        }}
        onExport={() => setExporting(true)}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          boardView
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search orders, customers, partners…"
          /* NOT ON THE BOARD, which is already grouped — by lane. See
             `showGroupBy`. */
          showGroupBy={!board}
          filters={
            <ListFilters
              value={facetSel}
              onApply={(sel) => {
                setFacetSel(sel);
                setPage(1);
              }}
              facets={ORDER_FACETS}
            />
          }
          /* THE TABLE'S COLUMNS, AND ONLY THE TABLE'S. This used to be one
             control with two subjects — the card's units on the board, the
             table's columns in the table — which is one icon meaning two
             things with nothing on screen to say which. The card's units now
             have their own control (`cardFields` below), so each of the two
             menus has one subject and says which (`docs/ds/ui/2-rules.md`
             §10). */
          columns={TOGGLE_COLUMNS}
          hiddenColumns={hidden}
          columnOrder={columnOrder}
          onReorderColumns={setColumnOrder}
          onToggleColumn={(k) => {
            const col = k as BrokerColumnKey;
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(col)) next.delete(col);
              else next.add(col);
              return next;
            });
          }}
          onShowAllColumns={() => setHidden(new Set())}
          /* WHAT IS ON THE CARD, PER LANE. `ListToolbar` shows this on the
             board only. */
          cardFields={{
            units: fieldsForLane(cardScope),
            /* With the scope on All lanes a field reads as ON only when it is
               on in EVERY lane — a tick that means "on somewhere" would be a
               tick the reader cannot act on. */
            hidden: scopedHidden,
            scope: cardScope,
            scopes: BOARD_LANES.map((l) => ({
              key: l.key,
              label: l.title ?? l.key,
            })),
            onScopeChange: setCardScope,
            onShowAll: () =>
              setCardOff((prev) => {
                const next = { ...prev };
                for (const lane of lanesInScope(cardScope))
                  next[lane] = new Set();
                return next;
              }),
            /* A PARENT CARRIES ITS CHILDREN. Turning the heading off takes the
               lines with it, because the heading is what holds them together;
               turning it back on brings them all back, which is what "show me
               Customer Details" means. The last child going off takes the
               parent, since a heading with nothing under it is not a unit. */
            onToggle: (k) =>
              setCardOff((prev) => {
                /* WHAT ONE PRESS MEANS ON "ALL LANES": the field ends up the
                   same everywhere. Toggling each lane against its own state
                   would leave it on in some and off in others, which is the
                   one outcome the scope exists to avoid. */
                const turningOff = !scopedHidden.has(k);
                const next = { ...prev };
                for (const lane of lanesInScope(cardScope)) {
                  next[lane] = toggleField(prev[lane] ?? EMPTY_SET, k, turningOff);
                }
                return next;
              }),
          }}
          searchFields={BROKER_SEARCH_FIELDS}
          colScope={colScope}
          onColScopeChange={(v) => {
            setColScope(v);
            setPage(1);
          }}
          colQuery={colQuery}
          onColQueryChange={(v) => {
            setColQuery(v);
            setPage(1);
          }}
          /* THE ROW, NOT THE POPOVER. It only makes sense over a table, so the
             board keeps the button pointed at nothing rather than opening a
             row of boxes above cards that have no columns. */
          columnFiltersOpen={!board && colFiltersOpen}
          onToggleColumnFilters={
            board
              ? undefined
              : () =>
                  setColFiltersOpen((open) => {
                    /* CLOSING THE ROW PUTS THE TABLE BACK. The boxes go away
                       when you close it, so leaving what was typed in them
                       applying would be a narrowing with nothing on screen
                       saying so — the reader would be looking at 33 of 44
                       orders with no way to find out why. Hiding the control
                       is the same act as being finished with it. */
                    if (open) {
                      setColFilters({});
                      setPage(1);
                    }
                    return !open;
                  })
          }
          columnFilterCount={activeColFilters.length}
          view={view}
          onViewChange={setView}
          mapView
          dateControl={
            <DateRangeFilter
              value={range}
              onChange={(next) => {
                setRange(next);
                setPage(1);
              }}
            />
          }
        />
        {/* ONE SHELF FOR EVERY NARROWING THAT IS ON, facets and column search
            together — they do the same thing to the list, and two rows of
            chips saying so would cost twice the height to say it less
            clearly. */}
        <FilterChips
          facets={ORDER_FACETS}
          selected={facetSel}
          onChange={(next) => {
            setFacetSel(next);
            setPage(1);
          }}
        >
          <ColumnSearchChip
            className=""
            searchFields={BROKER_SEARCH_FIELDS}
            colScope={colScope}
            colQuery={colQuery}
            onClear={() => {
              setColQuery("");
              setPage(1);
            }}
          />
        </FilterChips>
      </div>

      {/* The order-kind tab row used to sit here. It is gone: All / Regular /
          Recurring / Movement is one question about the data, which is what a
          FILTER FACET is — and the same three values now live under "Order
          Types" in the filter panel. Keeping both would have been two controls
          answering one question, in two places, that could disagree. */}

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {/* THE ROW STAYS WHEN NOTHING MATCHES — the boxes are what the
              reader has to change to get the rows back (§10g). */}
          {sorted.length === 0 && !(view === "table" && colFiltersOpen) ? (
            emptyBody
          ) : view === "board" ? (
            <BrokerBoard
              lanes={lanes}
              onOpenCard={setOpenId}
              laneSortOptions={laneSortOptions}
              laneSort={laneSort}
              onLaneSortChange={setLaneSortKey}
            />
          ) : view === "map" ? (
            /* THE MAP TAKES THE SORTED SET, NOT THE PAGE. A page boundary is a
               property of a table; half the day's work missing from a map
               because it fell on page two is a map that lies. */
            <OrderMapView
              orders={sorted.map((r) => ({
                id: r.id,
                orderNo: r.orderNo,
                site: r.shipTo,
                subtitle: r.customer.title,
                status: r.status,
                tone: BROKER_STATUS_TONE[r.status],
              }))}
              onOpenOrder={setOpenId}
            />
          ) : (
            <ListTable
              rows={pageRows}
              columns={BROKER_COLUMNS}
              hidden={hidden}
              sort={sort}
              onSort={onSort}
              rowId={(r) => r.id}
              renderCell={renderCell}
              actionsKey="actions"
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(r) => `Open order ${r.orderNo}`}
              onOpenRow={(r) => setOpenId(r.id)}
              showColumnFilters={colFiltersOpen}
              columnFilters={colFilters}
              onColumnFilterChange={(key, value) => {
                setColFilters((prev) => ({ ...prev, [key]: value }));
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* EXPORT ASKS BEFORE IT ACTS. What leaves is `sorted` — the whole
          narrowed set, not the page: a page boundary is a property of a table
          and has no business deciding what ends up in a file. */}
      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        title="Export Orders"
        noun="orders"
        nounOne="order"
        count={sorted.length}
        /* THE SAME CONTROL AS THE TOOLBAR'S, not a second way of asking. The
           sheet used to lay the whole picker out flat — toggle, calendar,
           presets — which made the date the biggest thing on a sheet that is
           mostly about filters, and taught a different interaction from the one
           the reader already knows from the board. Arrows to step, the date to
           open; everything else is behind the click, exactly as it is outside. */
        date={
          <DateRangeFilter
            value={range}
            onChange={(next) => {
              setRange(next);
              setPage(1);
            }}
            fullWidth
          />
        }
        /* THE SCREEN'S OWN FILTER PANEL, staging until Apply exactly as it
           does on the toolbar. The sheet laid it out flat for a while; behind
           the button it matches the date control beside it and the board
           behind it, which is one interaction to learn instead of three. */
        filtersControl={
          <ListFilters
            value={facetSel}
            onApply={(sel) => {
              setFacetSel(sel);
              setPage(1);
            }}
            facets={ORDER_FACETS}
            fullWidth
          />
        }
        filters={exportFilters}
        onExport={(format) => {
          setExporting(false);
          toast.success(
            `Exporting ${sorted.length} order${sorted.length === 1 ? "" : "s"} as .${format}`
          );
        }}
      />

      <BrokerOrderSheet
        order={rows.find((r) => r.id === openId) ?? null}
        mode={creating ? "create" : "edit"}
        open={creating || openId !== null}
        onOpenChange={(o) => {
          if (o) return;
          /* Saved or abandoned, the form is finished with — either way the
             reader goes back to the screen that sent them. */
          if (creating) onCreateClose?.();
          setCreating(false);
          setOpenId(null);
          setSheetFocus(null);
        }}
        onSave={saveOrder}
        onCreate={createOrder}
        customers={customers}
        shipTos={shipTos}
        focus={sheetFocus}
      />

      {/* ONE SHEET, TWO DIRECTIONS — see `AssetMovementSheet`. Mounted only
          while open so it starts from a clean draft each time. The direction is
          settled in the menu, before the sheet exists. */}
      {movement && (
        <AssetMovementSheet
          direction={movement}
          open
          onOpenChange={(o) => !o && setMovement(null)}
          onCreate={(draft) => {
            createMovement(draft);
            setMovement(null);
          }}
          customers={customers}
        />
      )}

      {/* THE BOARD GETS A TOTAL INSTEAD OF PAGINATION. It is not a paged list,
          so "Showing 1–25 of 54" would describe something that is not on screen
          — but the lane counts have to add up to something, and until now there
          was nothing to add them up to. It states the window as well, because a
          total with no scope is a number you cannot check. */}
      {view !== "table" && sorted.length > 0 && (
        <div className="mt-4 flex shrink-0 items-baseline gap-2 text-sm">
          <span className="font-medium text-foreground">
            {sorted.length.toLocaleString()}{" "}
            {sorted.length === 1 ? "order" : "orders"}
          </span>
          <span className="text-muted-foreground">
            across {lanes.filter((l) => l.cards.length > 0).length} of{" "}
            {lanes.length} lanes · {rangeLabel}
          </span>
        </div>
      )}

      <div className={cn("mt-4 shrink-0", view !== "table" && "hidden")}>
        <TablePagination
          className="h-9"
          page={page}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
