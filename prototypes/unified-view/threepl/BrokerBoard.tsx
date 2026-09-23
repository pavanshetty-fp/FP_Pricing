import * as React from "react";
import {
  ArrowDownUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CodeDisc, type CodeDiscTone } from "@/components/ui/code-disc";
import { Button } from "@/components/ui/button";

/**
 * Kanban board, generic over its lanes and cards.
 *
 * ANATOMY, SPACING AND COLOUR TAXONOMY ARE THE DS's, copied verbatim from
 * `kanban-board/KanbanBoard.tsx` (Figma "Kan-ban in Content Layer",
 * 27631:11154): 340px lanes on `bg-accent`, a 4px coloured top strip, a header
 * carrying title + count pill + sort, a scrollable card stack at `gap-3 px-3
 * pb-3`, and cards on `bg-fp-surface-1b` with the full default → hover → focus →
 * active state set. The `--fp-lane-*` fills and the `--fp-banner-accent-*` alert
 * semantics are the DS's tokens, unchanged.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DS FOLLOW-UP — this is the fifth documented fork in this prototype, and it
 * exists for exactly the same reason as the other four: the DS component cannot
 * be pointed at another dataset. `KanbanBoard` takes NO props at all. Its lanes,
 * its lane colours, its card fields and even the card title ("Card Title") are
 * module-level constants, so a real board cannot use it.
 *
 * What to parameterise, precisely:
 *   1. `lanes: Lane[]` as a prop instead of the `LANES` constant.
 *   2. A card TITLE and an optional title-row aside (this board puts a status
 *      or urgency badge there); today the title is a hardcoded string.
 *   3. `onCardClick` — the DS card is already `role="button" tabIndex={0}` with
 *      a full focus ring, i.e. it is dressed as interactive but does nothing.
 *      Keyboard activation (Enter/Space) is missing too and is added here.
 *   4. Lane sort as a controlled pair (`sortDir`, `onToggleSort`) rather than a
 *      dead icon button.
 *   5. An empty-lane state. A Kanban lane is empty routinely, not exceptionally.
 *   6. Alert TEXT as a prop — the DS hardcodes "Make more happen".
 *   7. A BUG, not a missing prop: the card needs `shrink-0`. The DS card is a
 *      shrinkable flex child of the lane's `overflow-y-auto` stack, so once a
 *      lane holds more cards than fit, the cards COMPRESS instead of the lane
 *      scrolling — and `overflow-hidden` on the card then hides the evidence.
 *      MEASURED here: 8 cards in a 373px lane produced a 34.4px card box around
 *      188px of content, with the lane's scrollHeight equal to its height. The
 *      DS demo hides this because its lanes hold 1–3 cards and never overflow.
 *      Fix it in `kanban-board/KanbanBoard.tsx` too, independently of the props.
 *   8. A SECOND BUG: the lane count pill is `text-white` on the lane fill, which
 *      fails WCAG AA on five of the ten lane colours. Measured at 11px — yellow
 *      1.92, green 2.28, cyan 2.43, rose 3.67, blue 3.68, indigo 4.47, slate
 *      4.76 — and identical in both themes, since `--fp-lane-*` does not change
 *      with the theme. The DS demo already ships the yellow one. Either give the
 *      pill a neutral fill (what this file does) or pair each lane colour with a
 *      measured on-colour foreground token; `text-white` for all ten cannot work.
 * When those eight land, delete this file; do not maintain it in parallel.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** The DS's lane palette, verbatim. */
export type LaneColor =
  | "grey"
  | "blue"
  | "yellow"
  | "green"
  | "cyan"
  | "purple"
  | "violet"
  | "pink"
  | "orange"
  | "red";

const LANE_BG: Record<LaneColor, string> = {
  grey: "bg-fp-lane-grey",
  blue: "bg-fp-lane-blue",
  yellow: "bg-fp-lane-yellow",
  green: "bg-fp-lane-green",
  cyan: "bg-fp-lane-cyan",
  purple: "bg-fp-lane-purple",
  violet: "bg-fp-lane-violet",
  pink: "bg-fp-lane-pink",
  orange: "bg-fp-lane-orange",
  red: "bg-fp-lane-red",
};

/** The DS's alert accents, verbatim. */
export type AlertStatus = "default" | "caution" | "warning" | "success";

const ALERT_ACCENT: Record<AlertStatus, string> = {
  default: "text-foreground",
  caution: "text-fp-banner-accent-caution",
  warning: "text-fp-banner-accent-warning",
  success: "text-fp-banner-accent-success",
};

/**
 * A LINE IN A STACK. Level is hierarchy, not size for its own sake: 1 is what
 * the unit is about, 2 what qualifies it, 3 the fine print. Three levels is
 * what lets a unit hold three facts without three labels — the customer block
 * reads name / site / address off weight alone.
 */
export interface BoardCardLine {
  text: string;
  level?: 1 | 2 | 3;
}

/** One row of the delivery-product unit: the asset, what goes in it, how much. */
export interface BoardCardRow {
  /** The row's SUBJECT — the tank being filled, or the asset being moved. */
  asset: string;
  /** What is going in. A tank in transit is empty, so a movement puts its TYPE here. */
  product?: string;
  qty?: string;
  /** For a quantity that is not a number — "Top-off" is a decision, not an amount. */
  qtySoft?: boolean;
  /**
   * The unit's own identifier, set under its name. NO "SERIAL" LABEL — a code
   * shaped like `FP-TK-0207` under an asset name is not mistakable for anything
   * else, and the word would cost as much width as the number it introduces.
   */
  assetId?: string;
}

/*
  A CARD IS RULED UNITS.

  Each unit is one heading and one shape, divided from the next by a rule. The
  heading is the ONLY label left on the card: inside a unit, hierarchy is
  carried by weight and size, because "Customer / Bray, Raymond and Marks" spends
  a whole line saying what the reader already knows from where it sits.

  Three shapes cover every unit:

    stack   lines at three levels        customer details · delivery partner
    inline  short values, hairline-split schedule — window | cadence
    rows    asset · product · quantity   delivery product details

  `rows` is the one that swaps by kind. A delivery lists its tanks and what goes
  in each; a movement lists the one asset, its type and its capacity. Same three
  columns, so the eye lands in the same place either way.
*/
export type BoardCardUnit =
  | {
      kind: "stack";
      key: string;
      heading: string;
      lines: BoardCardLine[];
      /**
       * A figure that belongs to the unit rather than to one of its lines —
       * what the awarded partner is charging, beside the partner's name. Set
       * in the same size as a quote's price, because on a finished card it is
       * the same fact arriving one stage later.
       */
      figure?: string;
    }
  | { kind: "inline"; key: string; heading: string; parts: string[] }
  | {
      kind: "rows";
      key: string;
      heading: string;
      rows: BoardCardRow[];
      /** Only when more than one row states a number — see `CardRows`. */
      total?: string;
    }
  | {
      kind: "quotes";
      key: string;
      heading: string;
      /** CHEAPEST FIRST — the order is the ranking. See `CardQuotes`. */
      quotes: BoardCardQuote[];
      /** Hide the carrier's name, when the reader has switched it off. */
      nameOff?: boolean;
      /**
       * WHAT THE PRICE IS FOR, folded behind the price itself.
       *
       * Once a partner has been picked the product list has stopped being a
       * question — it is the receipt for a figure, not something the reader is
       * weighing. Set it here and the unit above disappears from the card: the
       * price gains an underline and gives the rows back on a press.
       */
      breakdown?: { rows: BoardCardRow[]; total?: string };
    };

/** One partner's price for the order: who, how much, and where that places them. */
export interface BoardCardQuote {
  vendor: string;
  /** The total landed cost, already formatted. */
  total: string;
  /** 1 is the cheapest. */
  rank: number;
}

export interface BoardCardBadge {
  label: string;
  /**
   * `critical` for a state that changes what someone does next.
   *
   * `caution` and `success` are for a state the reader is WAITING ON and one
   * that has ARRIVED — waiting on a partner's price, and having it (Pavan,
   * 2026-09-22). Both take the DS's soft recipe: a `/10` tint of the tone's
   * own hue with the tone's text. A badge on a card is read at a glance from
   * three columns away, so the colour has to carry the difference without
   * becoming the loudest thing on the lane.
   */
  tone?: "critical" | "neutral" | "caution" | "success";
}

/** The soft tints, one per tone — the `/10` fill the DS's `StatusChip` uses. */
const BADGE_TONE: Record<string, string> = {
  caution:
    "border-transparent bg-fp-banner-accent-caution/10 text-fp-banner-accent-caution",
  success: "border-transparent bg-status-success/10 text-status-success",
};

export interface BoardCard {
  id: string;
  title: string;
  /**
   * The order's TYPE, as a coloured initial beside its number — the DS's
   * `CodeDisc`, the same one the Sales table uses, so D and E mean the same
   * thing in both modules.
   *
   * It sits next to the number because that is where the association is made:
   * `M-104620` and a violet M are one identity, read in one glance. As a line
   * of its own under the title it was a second label for something the reader
   * had already been told.
   */
  code?: { text: string; label: string; tone: CodeDiscTone };
  /**
   * Stacked, not one-of. Priority and recurrence are independent facts and a
   * single slot made them compete — an urgent recurring order lost one.
   *
   * Delivery vs Movement is NOT a badge: the order number's prefix already
   * carries it (`D-` / `M-`), so spending a badge on it says nothing new.
   */
  badges?: BoardCardBadge[];
  /**
   * Under the title: the one fact that makes THIS order what it is, where it
   * has one. A movement puts its route here — where the asset is going IS the
   * order. The category is not a subtitle; it is the code disc.
   */
  subtitle?: string[];
  units: BoardCardUnit[];
  alert?: {
    status: AlertStatus;
    text: string;
    /** Renders a button and splits the footer left/right, per the DS variant. */
    actionLabel?: string;
    onAction?: () => void;
  };
  /**
   * The bottom-most row: where one piece of business on this card has got to,
   * named on the left, with whatever moves it on at the right.
   *
   * ONE STATE AT A TIME. It is a single row with a single label, not a stack —
   * "Request invoice" and "Invoice received" are two points on one line, not
   * two things to do. Omit `actionLabel` for the state that is waiting on
   * somebody else: there is nothing to press, so there is no button.
   *
   * NOT AN ALERT. An alert reports a condition that has arisen — a credit
   * hold, a missing acknowledgement. This is a step the stage always has.
   */
  footerAction?: {
    label: string;
    /** Absent = the row is a status line, waiting on the other side. */
    /**
     * A NODE, NOT A STRING (2026-09-23). The act sometimes wants an icon
     * beside its word — "Assign" with a person is read before it is read —
     * and a `string` forced every such control to be a bare word or a
     * bespoke footer.
     */
    actionLabel?: React.ReactNode;
    actionVariant?: "success" | "outline";
    onAction?: () => void;
    /** Quiet, with a tick — the ball is not in our court. */
    waiting?: boolean;
  };
}

export interface BoardLane {
  key: string;
  title: string;
  color: LaneColor;
  cards: BoardCard[];
  /** Shown in place of the card stack when the lane is empty. */
  emptyLabel?: string;
  /**
   * Starts a new group: a rule is drawn before this lane.
   *
   * A BOARD IS READ LEFT TO RIGHT, and that reading is a claim — that each
   * lane follows from the one before it. Where that stops being true the board
   * has to say so, or the lanes after the break are read as the end of the
   * line rather than as somewhere else entirely. A gap alone does not do it:
   * lanes are already separated by one, so a wider one reads as a mistake.
   */
  apart?: boolean;
}

/** One named way to order a lane — see `BrokerBoardProps.laneSortOptions`. */
export interface LaneSortOption {
  key: string;
  label: string;
}

export interface BrokerBoardProps {
  lanes: BoardLane[];
  onOpenCard?: (id: string) => void;
  /**
   * THE WAYS THIS LANE CAN BE ORDERED, NAMED.
   *
   * The control was a three-state icon that cycled earliest / latest / off on
   * one hidden key, planned time — a button that changed the order of the work
   * without ever saying by what, and whose third press was a state nobody
   * could see they had reached. A lane is a queue, and which end of a queue you
   * work from is a decision with a reason: earliest first while you are
   * dispatching, largest first while you are pricing. The reason is the label.
   *
   * The options are the CALLER'S, because they belong to the lane: what you
   * would sort Draft by is not what you would sort Assigned by.
   */
  laneSortOptions?: (laneKey: string) => LaneSortOption[];
  /** Chosen option per lane key. Absent = the lane's own order. */
  laneSort?: Record<string, string | undefined>;
  onLaneSortChange?: (laneKey: string, option: string | null) => void;
}

/** The unit heading — the only label left on the card. */
function UnitHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </span>
  );
}

const LEVEL_CLASS: Record<1 | 2 | 3, string> = {
  1: "text-sm font-semibold text-foreground",
  2: "text-[13px] font-medium text-muted-foreground",
  3: "text-xs text-muted-foreground",
};

/** Lines at three levels. Hierarchy does the work a field label used to. */
function CardStack({ lines, figure }: { lines: BoardCardLine[]; figure?: string }) {
  const stack = (
    <div className="flex min-w-0 flex-col">
      {/* KEYED BY POSITION, NOT BY TEXT. Two lines in a unit can legitimately
          read the same — an asset called "Lube Skid" whose type is "Lube Skid"
          — and React then drops one of them and warns about it. Position is
          what a stack's identity actually is: these lines never reorder. */}
      {lines.map((l, i) => (
        <span key={i} className={cn("truncate", LEVEL_CLASS[l.level ?? 1])} title={l.text}>
          {l.text}
        </span>
      ))}
    </div>
  );
  if (!figure) return stack;
  /* THE NAME AND THE FIGURE AT THE TWO EDGES, exactly as the quote unit sets
     them — a finished order's price is the same fact as a quote's, one stage
     on, and it would be strange for it to sit somewhere else on the card. */
  return (
    <div className="flex min-w-0 items-start justify-between gap-2.5">
      {stack}
      <span className="text-lg font-semibold tabular-nums whitespace-nowrap text-foreground">
        {figure}
      </span>
    </div>
  );
}

/**
 * Short values on one line, split by a hairline.
 *
 * A rule rather than a middot because these are two DIFFERENT facts — a window
 * and a cadence — not one list. The hairline reads as a boundary; a dot reads
 * as punctuation inside a single value.
 */
function CardInline({ parts }: { parts: string[] }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {parts.map((p, i) => (
        <React.Fragment key={p}>
          {i > 0 && <span aria-hidden className="h-3.5 w-px shrink-0 bg-fp-outline-2" />}
          <span
            className={cn(
              "truncate",
              i === 0
                ? "text-[13px] font-medium whitespace-nowrap text-foreground"
                : "text-[13px] text-muted-foreground"
            )}
            title={p}
          >
            {p}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Asset · product · quantity, one row each. NO COLUMN HEADINGS — the weights
 * separate them: the asset is the row's subject and takes the ink, the product
 * sits back a step, the quantity is the figure and is set to line up.
 *
 * The total appears only when the per-row figures have stopped answering "how
 * much is coming" — with one row the quantity IS the total, and with every row
 * a top-off there is nothing to add.
 */
function CardRows({ rows, total }: { rows: BoardCardRow[]; total?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {rows.map((r, i) => (
        <div
          key={`${r.asset}-${i}`}
          className="grid min-w-0 items-baseline gap-2.5"
          style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.05fr) auto" }}
        >
          {/* NAME OVER ID. The id is the thing you read second — when you are
              already at the right row and need to know which unit it is. */}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[13px] font-medium text-foreground" title={r.asset}>
              {r.asset}
            </span>
            {r.assetId && (
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {r.assetId}
              </span>
            )}
          </span>
          <span className="truncate text-xs text-muted-foreground" title={r.product}>
            {r.product}
          </span>
          <span
            className={cn(
              "text-right text-[13px] tabular-nums whitespace-nowrap",
              r.qtySoft ? "font-medium text-muted-foreground" : "font-semibold text-foreground"
            )}
          >
            {r.qty}
          </span>
        </div>
      ))}
      {total && (
        <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-fp-outline-1 pt-1.5">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-[13px] font-semibold tabular-nums text-foreground">{total}</span>
        </div>
      )}
    </div>
  );
}

/**
 * WHAT THE PARTNERS HAVE QUOTED, one at a time.
 *
 * A card that said "2 accepted — no quote taken yet" while two prices were
 * sitting in the order was not summarising the order, it was contradicting it.
 * The prices are the reason anyone opens these cards, so they go ON the card.
 *
 * ONE AT A TIME, CHEAPEST FIRST. Every quote stacked would be three rows of
 * money on a card whose other four units get one apiece, and the answer to
 * "what will this cost" is a single figure — the best one. The others are a
 * step away rather than a scroll away, so the reader chooses to compare rather
 * than being made to.
 *
 * THE PLACE IS SPELLED OUT, not left to the order of a list nobody can see the
 * whole of: on the second card the figure alone cannot say whether it is the
 * cheap one or the dear one, and "2nd best" can.
 */
function rankLabel(rank: number): string {
  if (rank === 1) return "Best price";
  const n = rank % 100;
  const suffix =
    n >= 11 && n <= 13
      ? "th"
      : rank % 10 === 1
        ? "st"
        : rank % 10 === 2
          ? "nd"
          : rank % 10 === 3
            ? "rd"
            : "th";
  return `${rank}${suffix} best`;
}

function CardQuotes({
  heading,
  quotes,
  nameOff,
  breakdown,
}: {
  heading: string;
  quotes: BoardCardQuote[];
  nameOff?: boolean;
  breakdown?: { rows: BoardCardRow[]; total?: string };
}) {
  const [i, setI] = React.useState(0);
  const at = Math.min(i, quotes.length - 1);
  const q = quotes[at];
  /* THE CARD IS THE BUTTON, so every control on it has to say so and stop.
     Without this, stepping to the next quote opens the order. */
  const step = (e: React.SyntheticEvent, d: number) => {
    e.stopPropagation();
    setI((v) => Math.max(0, Math.min(quotes.length - 1, v + d)));
  };
  const chevron =
    "rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30";

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <UnitHeading>{heading}</UnitHeading>
        {quotes.length > 1 && (
          <span
            className="flex items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Previous quote"
              disabled={at === 0}
              onClick={(e) => step(e, -1)}
              onKeyDown={(e) => e.stopPropagation()}
              className={chevron}
            >
              <ChevronLeft className="size-3" />
            </button>
            {at + 1}/{quotes.length}
            <button
              type="button"
              aria-label="Next quote"
              disabled={at === quotes.length - 1}
              onClick={(e) => step(e, 1)}
              onKeyDown={(e) => e.stopPropagation()}
              className={chevron}
            >
              <ChevronRight className="size-3" />
            </button>
          </span>
        )}
      </div>
      {/* THE NAME AND THE FIGURE ON ONE LINE, the placing under the name —
          the two things being compared sit at the two edges, and the label
          that qualifies the name hangs off it rather than off the money. */}
      <div className="flex min-w-0 items-start justify-between gap-2.5">
        <span className="flex min-w-0 flex-col gap-0.5">
          {!nameOff && (
            <span className="truncate text-sm font-semibold text-foreground" title={q.vendor}>
              {q.vendor}
            </span>
          )}
          {/* THE PLACING IS A CHIP, not a caption. It is a verdict on the
              figure beside it — the one thing on the unit that says whether
              this price is the one to take — and as loose text under the
              carrier's name it read as a second line of the name. Green for
              the cheapest, because that is the only placing anyone acts on;
              the rest are neutral, so a board of chips does not turn into a
              ranking nobody asked to see. */}
          <Badge
            variant={q.rank === 1 ? "pastel-green" : "secondary"}
            className="max-w-full truncate text-[11px]"
          >
            {rankLabel(q.rank)}
          </Badge>
        </span>
        {/* BIGGER THAN ANYTHING ELSE ON THE CARD. The figure is the reason
            these cards get opened, and at 13px it was the same size as an
            asset name. `text-lg` is the nearest step on the scale. */}
        {breakdown ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                /* THE CARD IS THE BUTTON, so this one has to say so and stop —
                   without it, asking what the price is for opens the order. */
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                aria-label={`${q.total} — what this is for`}
                className="rounded-sm text-lg font-semibold tabular-nums whitespace-nowrap text-foreground underline decoration-fp-outline-1 decoration-dotted underline-offset-4 outline-none transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {q.total}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* THE UNIT'S OWN HEADING COMES WITH IT. Opened from a figure
                  with no name on it, a bare list of tanks is three numbers
                  belonging to nothing. */}
              <UnitHeading>Delivery Product Details</UnitHeading>
              <div className="mt-2">
                <CardRows rows={breakdown.rows} total={breakdown.total} />
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-lg font-semibold tabular-nums whitespace-nowrap text-foreground">
            {q.total}
          </span>
        )}
      </div>
    </>
  );
}

function CardAlert({
  status,
  text,
  actionLabel,
  onAction,
}: NonNullable<BoardCard["alert"]>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-fp-outline-1 px-3 py-2",
        actionLabel ? "justify-between" : "justify-center"
      )}
    >
      <span className={cn("flex min-w-0 items-center gap-2 text-xs", ALERT_ACCENT[status])}>
        <Info className="size-4 shrink-0" />
        <span className="truncate">{text}</span>
      </span>
      {actionLabel && (
        <Button
          variant="outline"
          size="xs"
          onClick={(e) => {
            // The card itself is clickable; a footer action must not also open it.
            e.stopPropagation();
            onAction?.();
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function Card({ card, onOpen }: { card: BoardCard; onOpen?: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${card.title}`}
      onClick={onOpen}
      // The DS card is already dressed as a button but has no activation. A
      // focus ring that leads nowhere on Enter is worse than no ring at all.
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className={cn(
        // `shrink-0` is NOT cosmetic — see the DS FOLLOW-UP note (7) at the top
        // of this file. Without it the card is a shrinkable flex child inside the
        // lane's scroll container, so a full lane compresses every card to its
        // title row and clips the rest under `overflow-hidden` instead of
        // scrolling. MEASURED: 8 cards in a 373px lane gave a 34.4px box around
        // 188px of content, and the lane's scrollHeight equalled its height, so
        // nothing scrolled and nothing hinted that content was missing.
        "shrink-0",
        "cursor-pointer overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1b outline-none transition-[color,border-color,box-shadow]",
        "hover:border-fp-outline-2 hover:shadow-fp-surface",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        "active:border-fp-outline-2 active:bg-fp-card-1"
      )}
    >
      {/* UNITS ARE RULED. A rule per unit is affordable here because there are
          five of them and each holds ONE shape — the rules are what let the
          headings shrink to 10px and the field labels disappear entirely. */}
      <div className="flex flex-col gap-1 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <h4 className="min-w-0 truncate font-mono text-sm font-semibold text-foreground">
              {card.title}
            </h4>
            {card.code && (
              <CodeDisc
                code={card.code.text}
                label={card.code.label}
                tone={card.code.tone}
                className="shrink-0"
              />
            )}
          </div>
          {card.badges && card.badges.length > 0 && (
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {card.badges.map((b) => (
                <Badge
                  key={b.label}
                  variant={b.tone === "critical" ? "destructive" : "secondary"}
                  className={b.tone ? BADGE_TONE[b.tone] : undefined}
                >
                  {b.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {card.subtitle?.map((line) => (
          <span key={line} className="truncate text-xs text-muted-foreground" title={line}>
            {line}
          </span>
        ))}
      </div>

      {card.units.map((u) => (
        <div
          key={u.key}
          className="flex flex-col gap-1.5 border-t border-fp-outline-1 p-3.5"
        >
          {/* The quotes unit draws its own heading row — the stepper sits
              on the line with the label, where a unit's controls belong. */}
          {u.kind === "quotes" ? (
            <CardQuotes
              heading={u.heading}
              quotes={u.quotes}
              nameOff={u.nameOff}
              breakdown={u.breakdown}
            />
          ) : (
            <>
              <UnitHeading>{u.heading}</UnitHeading>
              {u.kind === "stack" && <CardStack lines={u.lines} figure={u.figure} />}
              {u.kind === "inline" && <CardInline parts={u.parts} />}
              {u.kind === "rows" && <CardRows rows={u.rows} total={u.total} />}
            </>
          )}
        </div>
      ))}

      {/* NO "VIEW DETAILS" ROW. The whole card opens the order — it is the
          button — so a strip at the bottom naming that was a label for a thing
          the reader was already standing on, and it cost every card a rule and
          25px to say it. What is left in this footer is what the card is
          waiting on: an alert, or the invoice row. */}
      {card.alert && <CardAlert {...card.alert} />}

      {card.footerAction && (
        <div className="flex items-center justify-between gap-2 border-t border-fp-outline-1 px-3.5 py-2.5">
          {card.footerAction.waiting ? (
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3.5 shrink-0" />
              <span className="truncate">{card.footerAction.label}</span>
            </span>
          ) : (
            <span className="truncate text-xs text-foreground">
              {card.footerAction.label}
            </span>
          )}
          {card.footerAction.actionLabel && (
            /* FILLED, NOT OUTLINED, for the step that moves the order on. Every
               other control on a card is an outline or a plain word, so an
               outline here read as one more thing to look at rather than the
               thing to press. */
            <Button
              variant={card.footerAction.actionVariant ?? "success"}
              size="xs"
              onClick={(e) => {
                /* The card itself opens the order; this must not. */
                e.stopPropagation();
                card.footerAction?.onAction?.();
              }}
            >
              {card.footerAction.actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Lane({
  lane,
  onOpenCard,
  sortOptions,
  sortKey,
  onSortChange,
}: {
  lane: BoardLane;
  onOpenCard?: (id: string) => void;
  sortOptions?: LaneSortOption[];
  sortKey?: string;
  onSortChange?: (option: string | null) => void;
}) {
  const chosen = sortOptions?.find((o) => o.key === sortKey);
  return (
    /* 400px, not the DS's 340. The card's product unit is three columns —
       asset, product, quantity — and at 340 the first two truncated on any
       real pair of names. The lane widened to fit the content rather than the
       content being cut to fit the lane. */
    <div className="flex h-full w-[400px] shrink-0 flex-col overflow-hidden rounded-md bg-fp-board-lane">
      <div className={cn("h-1 w-full shrink-0", LANE_BG[lane.color])} aria-hidden />
      <div className="flex shrink-0 items-center gap-2 px-4 py-3">
        <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
          {lane.title}
        </h3>
        {/* COUNT PILL — see DS FOLLOW-UP (8). The DS Kanban fills this pill with
            the lane colour and sets the label `text-white`, which is unreadable
            on the lighter half of the lane palette. MEASURED, 11px text:
            yellow 1.92 · green 2.28 · cyan 2.43 · rose 3.67 · blue 3.68 ·
            indigo 4.47 · slate 4.76 — five of the seven lanes used here fail
            WCAG AA, and the numbers are identical in both themes because the
            lane fills do not change with the theme.

            This uses the count-pill recipe the rest of the system already has —
            `bg-fp-card-1` + a neutral label, exactly as `ListToolbar`'s column
            counter and `ColumnSearchChip` do — rather than inventing a colour.
            The lane's identity still reads from its 4px top strip, which is
            where the lane colour is load-bearing. It is `aria-hidden` because
            the `sr-only` count below already says it. */}
        <span
          aria-hidden
          className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-fp-card-1 px-1 text-[11px] font-medium tabular-nums text-foreground"
        >
          {lane.cards.length}
        </span>
        <span className="sr-only">{lane.cards.length} orders</span>
        {sortOptions && sortOptions.length > 0 && onSortChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Sort ${lane.title}${chosen ? ` — ${chosen.label}` : ""}`}
                className={cn(
                  "ml-auto shrink-0 rounded-sm p-1 outline-none transition-colors hover:bg-fp-card-1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:text-foreground",
                  chosen ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <ArrowDownUp className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                Sort {lane.title.toLowerCase()} by
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sortKey ?? ""}
                onValueChange={(v) => onSortChange(v === "" ? null : v)}
              >
                {/* THE LANE'S OWN ORDER IS ONE OF THE CHOICES, not the absence
                    of one. A sort you can turn on and cannot name your way out
                    of is a sort you are stuck with. */}
                <DropdownMenuRadioItem value="">
                  Lane order
                </DropdownMenuRadioItem>
                {sortOptions.map((o) => (
                  <DropdownMenuRadioItem key={o.key} value={o.key}>
                    {o.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        {lane.cards.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            {lane.emptyLabel ?? "Nothing here"}
          </p>
        ) : (
          lane.cards.map((card) => (
            <Card key={card.id} card={card} onOpen={() => onOpenCard?.(card.id)} />
          ))
        )}
      </div>
    </div>
  );
}

export function BrokerBoard({
  lanes,
  onOpenCard,
  laneSortOptions,
  laneSort,
  onLaneSortChange,
}: BrokerBoardProps) {
  return (
    <div className="flex h-full min-h-0 gap-4 overflow-x-auto pb-1">
      {lanes.map((lane) => (
        <React.Fragment key={lane.key}>
          {/* THE RULE IS THE BREAK, and the air around it is what makes it one:
              8px either side on top of the row's own 16px gap, so the two
              groups are 49px apart where lanes within a group are 16. It runs
              the full height of the board rather than the height of a lane,
              because it divides the BOARD — a rule that stopped where the
              tallest lane did would read as a border on the lane beside it. */}
          {lane.apart && (
            /* 3px AND THE STRONGER OUTLINE. A hairline is what separates two
               things of the same kind — a column from a column, a row from a
               row — and this separates two KINDS, so at 1px it read as a lane
               border somebody had left on. It is the only vertical rule on the
               board, so it can afford to be the heaviest thing on it. */
            <div
              className="mx-3 w-[3px] shrink-0 self-stretch rounded-full bg-fp-outline-2"
              aria-hidden
            />
          )}
          <Lane
            lane={lane}
            onOpenCard={onOpenCard}
            sortOptions={laneSortOptions?.(lane.key)}
            sortKey={laneSort?.[lane.key]}
            onSortChange={
              onLaneSortChange ? (o) => onLaneSortChange(lane.key, o) : undefined
            }
          />
        </React.Fragment>
      ))}
    </div>
  );
}
