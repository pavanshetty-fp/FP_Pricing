import * as React from "react";
import {
  ArrowDownUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
  UserRound,
  Truck,
  CalendarDays,
  Handshake,
  type LucideIcon,
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
import { Pill } from "@/components/ui/pill";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CodeDisc, type CodeDiscTone } from "@/components/ui/code-disc";
import { Button } from "@/components/ui/button";
import { type MiniMapPoint } from "./SiteMiniMap";

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

/** The lane-title pill — the lane colour, softened to a fill. */

/* LANE TITLES (Pavan, 2026-10-27). LIGHT keeps the DS soft tint — the lane
   colour 16% over the surface, dark text. DARK takes the vivid fills, after a
   ClickUp board: a saturated fill per lane, white text (dark on yellow),
   deeper at the WCAG end. */
const LANE_TITLE: Record<LaneColor, string> = {
  grey: "bg-fp-lane-grey-soft text-foreground dark:bg-fp-lane-grey-vivid dark:text-fp-lane-grey-vivid-ink",
  blue: "bg-fp-lane-blue-soft text-foreground dark:bg-fp-lane-blue-vivid dark:text-fp-lane-blue-vivid-ink",
  yellow: "bg-fp-lane-yellow-soft text-foreground dark:bg-fp-lane-yellow-vivid dark:text-fp-lane-yellow-vivid-ink",
  green: "bg-fp-lane-green-soft text-foreground dark:bg-fp-lane-green-vivid dark:text-fp-lane-green-vivid-ink",
  cyan: "bg-fp-lane-cyan-soft text-foreground dark:bg-fp-lane-cyan-vivid dark:text-fp-lane-cyan-vivid-ink",
  purple: "bg-fp-lane-purple-soft text-foreground dark:bg-fp-lane-purple-vivid dark:text-fp-lane-purple-vivid-ink",
  violet: "bg-fp-lane-violet-soft text-foreground dark:bg-fp-lane-violet-vivid dark:text-fp-lane-violet-vivid-ink",
  pink: "bg-fp-lane-pink-soft text-foreground dark:bg-fp-lane-pink-vivid dark:text-fp-lane-pink-vivid-ink",
  orange: "bg-fp-lane-orange-soft text-foreground dark:bg-fp-lane-orange-vivid dark:text-fp-lane-orange-vivid-ink",
  red: "bg-fp-lane-red-soft text-foreground dark:bg-fp-lane-red-vivid dark:text-fp-lane-red-vivid-ink",
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
    rows    asset · product · quantity   a movement's asset
    delivery  "6 assets · 4 products"   delivery details, hover → table + map

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
      /** Version 4: what the icon before the first line holds on hover — the
       *  vendor's address (Pavan, 2026-10-28). */
      hover?: BoardCardLine[];
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
      /**
       * DELIVERY DETAILS (Pavan, 2026-10-27) — the order in one line, "6
       * assets · 4 products · 8,000 gal", one dotted underline under all of
       * it; hover it for the asset · product · quantity table and the
       * ship-to's map — its radius, a dot per asset inside it.
       */
      kind: "delivery";
      key: string;
      heading: string;
      /** The parts of the one line, already worded. */
      summary: string[];
      rows: BoardCardRow[];
      total?: string;
      site?: { lat: number; lng: number };
      points: MiniMapPoint[];
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
  /** 1 is the cheapest. Left out where nothing is being compared — no chip. */
  rank?: number;
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
   *
   * `info` is the fourth: a state that is simply TRUE of the order and asks
   * nothing of anybody — assigned, under way. It is blue because blue is the
   * one channel in this system that carries no verdict; grey would say the
   * state is unremarkable, and half of these are the states a dispatcher
   * scans for. (Added 2026-09-23.)
   */
  tone?: "critical" | "neutral" | "caution" | "success" | "info";
}

/* THE BADGE IS THE DS PILL (Pavan, 2026-10-09) — the tone is a kind, and
   the pill draws every kind the same way it does in a table cell. */

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
    /** Right-hand note on a waiting row — "2 days ago". */
    meta?: string;
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
   * line rather than as somewhere else entirely. The board breaks there: a
   * 20px white strip between two rules, and the lanes after it read as a second
   * board (Pavan, 2026-10-27 — it was a 3px line).
   */
  apart?: boolean;
}

/** One named way to order a lane — see `BrokerBoardProps.laneSortOptions`. */
export interface LaneSortOption {
  key: string;
  label: string;
}

/* THE BOARD (Pavan, 2026-10-25 — chosen from four versions; the others are
   in docs/archive/board-versions-2026-10-25.md). ONE bordered box like a
   table, its view bar the top strip: the lanes sit edge to edge as its
   columns, one line between each; white lanes 340px with 20px either side
   of the cards; outlined cards, sections grouped by spacing with no rules
   inside; no colour strip — the lane title is a pill in the lane's colour,
   and a line under the heading parts it from the cards. The quote sits in a
   light green band, edge to edge, its placing as text, the stepper centred
   under the price. */
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
  /** Version 3: smaller text, no unit headings on the cards. */
  compact?: boolean;
  /** Version 4: Version 1 with no labels; the ship-to and delivery lines lead
   *  with a pin and a truck whose hover holds the details. */
  bare?: boolean;
  /** Version 1.1: Version 1 with an icon in place of each unit label. */
  iconed?: boolean;
  /** Version 3 (Pavan, 2026-10-27): the lanes stay this board's, the card
   *  inside is drawn by the caller — Version 2's arrangement. */
  renderCard?: (card: BoardCard, onOpen: () => void) => React.ReactNode;
}

/* VERSION 3 — COMPACT (Pavan, 2026-10-27): the V1 board with smaller text
   and no unit headings on the card. Popovers keep their headings. */
const Compact = React.createContext(false);
const useCompact = () => React.useContext(Compact);
/* VERSION 4 — BARE (Pavan, 2026-10-27): Version 1's sizes, widths and
   spacing, with every unit label gone and the ship-to and delivery cut to
   one line each behind a meaningful icon — a pin, a truck. */
const Bare = React.createContext(false);
const useBare = () => React.useContext(Bare);
/* VERSION 1.1 — ICONS FOR LABELS (Pavan, 2026-10-28): Version 1 as it is,
   the ship-to, schedule, delivery and driver headings each swapped for an
   icon leading the unit. */
const Iconed = React.createContext(false);
const useIconed = () => React.useContext(Iconed);
const UNIT_ICON: Record<string, LucideIcon> = {
  customer: MapPin,
  schedule: CalendarDays,
  completed: CalendarDays,
  product: Truck,
  driver: UserRound,
};

/* THE SENTENCE-CASE LABEL (Pavan, 2026-10-28) — "Vendor", not "VENDOR": the
   vendor's label on Versions 1 and 1.1. */
export function UnitLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) {
  if (!Icon) return <span className="text-xs font-medium text-muted-foreground">{children}</span>;
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}
/* THE VENDOR'S LABEL, EVERY VERSION (Pavan, 2026-10-28) — a building icon
   and "Vendor". */
export function VendorUnitLabel() {
  return <UnitLabel icon={Handshake}>Vendor</UnitLabel>;
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
/* TWO SIZES ON A COMPACT CARD (Pavan, 2026-10-27): 13px for what a line is
   about ("Bray North Yard", the vendor, the price), 12px for everything
   else ("6:00 AM – 10:00 AM"); weight carries the rest of the hierarchy. */
const LEVEL_CLASS_COMPACT: Record<1 | 2 | 3, string> = {
  1: "text-[13px] font-semibold text-foreground",
  2: "text-xs font-medium text-muted-foreground",
  3: "text-xs text-muted-foreground",
};

/* VERSION 4 READS AT ONE WEIGHT — the ship-to, the driver, the delivery
   line, the vendor and the price share one style, so no line on the card
   shouts over another; only the order number stays bold. 14px REGULAR
   (Pavan, 2026-10-29 — tried on one card first; was 13px medium). */
const BARE_LINE = "text-sm font-normal text-foreground";
/* THE ORDER NUMBER IN BLUE, AS VERSION 2 HAS IT (Pavan, 2026-10-29) — the
   link colour, on every board card (3PL, Sales, Service) and the list view's
   rows (UX-166). */
const ORDER_NO = "text-fp-banner-accent-info";
const LEVEL_CLASS_BARE: Record<1 | 2 | 3, string> = {
  ...LEVEL_CLASS,
  1: BARE_LINE,
};

/** Lines at three levels. Hierarchy does the work a field label used to. */
function CardStack({
  lines,
  figure,
  lead,
}: {
  lines: BoardCardLine[];
  figure?: string;
  /** Version 4: the first line holds the rest of the unit on hover. */
  lead?: { heading: string; hover: BoardCardLine[] };
}) {
  const compact = useCompact();
  const bare = useBare();
  const levels = compact ? LEVEL_CLASS_COMPACT : bare ? LEVEL_CLASS_BARE : LEVEL_CLASS;
  const stack = lead ? (
    /* VERSION 4'S VENDOR (Pavan, 2026-10-28) — a handshake leads the name,
       no label; the icon holds the address on hover, like the pin. */
    <div className="flex min-w-0 flex-col">
      <ShipToLine
        iconFirst
        icon={Handshake}
        hoverLabel="address"
        heading={lead.heading}
        lines={[lines[0], ...lead.hover]}
        className={levels[1]}
      />
      {lines.slice(1).map((l, i) => (
        <span key={i} className={cn("truncate", levels[l.level ?? 1])} title={l.text}>
          {l.text}
        </span>
      ))}
    </div>
  ) : (
    <div className="flex min-w-0 flex-col">
      {/* KEYED BY POSITION, NOT BY TEXT. Two lines in a unit can legitimately
          read the same — an asset called "Lube Skid" whose type is "Lube Skid"
          — and React then drops one of them and warns about it. Position is
          what a stack's identity actually is: these lines never reorder. */}
      {lines.map((l, i) => (
        <span key={i} className={cn("truncate", levels[l.level ?? 1])} title={l.text}>
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
    /* Compact: the figure sits under the name — a narrow lane has no room
       for both on one line. */
    <div className={cn("flex min-w-0 gap-2.5", compact ? "flex-col gap-0.5" : "items-start justify-between")}>
      {stack}
      <span className={cn(compact ? "text-[13px] font-bold" : bare ? "text-sm font-normal" : "text-sm font-semibold", " tabular-nums whitespace-nowrap text-foreground")}>
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
function CardInline({ parts, quiet }: { parts: string[]; quiet?: boolean }) {
  const t = useCompact() ? "text-xs" : "text-[13px]";
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {parts.map((p, i) => (
        <React.Fragment key={p}>
          {i > 0 && <span aria-hidden className="h-3.5 w-px shrink-0 bg-fp-outline-2" />}
          <span
            className={cn(
              "truncate",
              /* Quiet (Version 4): one size, one colour — secondary to the
                 ship-to name above it. */
              quiet
                ? cn("text-xs text-muted-foreground", i === 0 && "whitespace-nowrap")
                : i === 0
                  ? cn(t, "font-medium whitespace-nowrap text-foreground")
                  : cn(t, "text-muted-foreground")
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
  const compact = useCompact();
  /* Version 4: the asset and its quantity at the card's 14px regular. */
  const bare = useBare();
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
            <span className={cn("truncate text-foreground", bare ? "text-sm font-normal" : "text-[13px] font-medium")} title={r.asset}>
              {r.asset}
            </span>
            {r.assetId && (
              <span className={cn("truncate text-muted-foreground", compact ? "text-xs" : "text-[11px]")}>
                {r.assetId}
              </span>
            )}
          </span>
          <span className="truncate text-xs text-muted-foreground" title={r.product}>
            {r.product}
          </span>
          <span
            className={cn(
              "text-right tabular-nums whitespace-nowrap",
              bare ? "text-sm font-normal" : "text-[13px]",
              r.qtySoft ? cn(!bare && "font-medium", "text-muted-foreground") : cn(!bare && "font-semibold", "text-foreground")
            )}
          >
            {r.qty}
          </span>
        </div>
      ))}
      {total && (
        <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-fp-outline-1 pt-1.5">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className={cn("tabular-nums text-foreground", bare ? "text-sm font-normal" : "text-[13px] font-semibold")}>{total}</span>
        </div>
      )}
    </div>
  );
}

/**
 * THE SHIP-TO IN ONE LINE (Pavan, 2026-10-27 — Versions 2 and 3): its name
 * and an info icon; hover the icon for the rest of the unit — the address,
 * the customer — in the same white hover card as Delivery Details.
 */

/* THE GREY PILL ON A HOVERED DARK CARD — its fill is the card's hover step,
   so it would vanish; it goes one step further (Pavan, 2026-10-27). */
export const CARD_HOVER_PILL = (tone?: string) =>
  (tone ?? "neutral") === "neutral" ? "dark:group-hover/card:bg-fp-card-1" : undefined;
export function ShipToLine({
  heading,
  lines,
  className,
  iconFirst,
  icon: Icon = Info,
  hoverLabel = "address and customer",
  wrap,
}: {
  /** Version 2 (Pavan, 2026-10-28): the name wraps, never truncates. */
  wrap?: boolean;
  /** What the icon's hover holds, for its accessible name. */
  hoverLabel?: string;
  heading: string;
  lines: BoardCardLine[];
  className?: string;
  /** Version 4: a pin instead of the info icon. */
  icon?: LucideIcon;
  /** Versions 2 and 3 (Pavan, 2026-10-27): the info icon leads the name. */
  iconFirst?: boolean;
}) {
  const [name, ...rest] = lines;
  if (!name) return null;
  const details = (
    <HoverCardContent
      align="start"
      className="fp-surface-light w-72 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <UnitHeading>{heading}</UnitHeading>
      <div className="mt-2 flex flex-col gap-0.5">
        {lines.map((l, i) => (
          <span key={i} className={LEVEL_CLASS[l.level ?? 1]}>
            {l.text}
          </span>
        ))}
      </div>
    </HoverCardContent>
  );
  return (
    <div className={cn("flex min-w-0 gap-1", wrap ? "items-start" : "items-center", iconFirst && "flex-row-reverse justify-end")}>
      <span className={cn(wrap ? "min-w-0 break-words" : "truncate", className)} title={name.text}>
        {name.text}
      </span>
      {rest.length > 0 && (
        <HoverCard openDelay={150} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              aria-label={`${name.text} — ${hoverLabel}`}
              /* THE CARD IS THE BUTTON — this one only explains itself. */
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className={cn("shrink-0 rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50", wrap && "mt-px")}
            >
              <Icon className="size-3.5" />
            </button>
          </HoverCardTrigger>
          {details}
        </HoverCard>
      )}
    </div>
  );
}

/** The breakdown as a table: asset · product · quantity, the total last. */
function RowsTable({ rows, total }: { rows: BoardCardRow[]; total?: string }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="sticky top-0 bg-fp-table-header text-muted-foreground">
          <th className="px-2 py-1 text-left font-medium">Asset</th>
          <th className="px-2 py-1 text-left font-medium">Product</th>
          <th className="px-2 py-1 text-left font-medium">Quantity</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.asset}-${i}`} className="border-t border-border">
            <td className="px-2 py-1 font-medium text-foreground">{r.asset}</td>
            <td className="px-2 py-1 text-muted-foreground">{r.product}</td>
            <td
              className={cn(
                "px-2 py-1 tabular-nums whitespace-nowrap",
                r.qtySoft ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {r.qty}
            </td>
          </tr>
        ))}
        {total && (
          <tr className="border-t border-border">
            <td colSpan={2} className="px-2 py-1 font-medium text-foreground">Total</td>
            <td className="px-2 py-1 font-semibold tabular-nums whitespace-nowrap text-foreground">{total}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ONE TABLE ROW IS 25px, ITS HEADING 24.5px, ITS RIM 2px. */
const ROW_PX = 25;
const deliveryHeight = (bodyRows: number) =>
  24.5 + 2 + ROW_PX * Math.min(Math.max(bodyRows, 2), 4.5);

export function CardDelivery({
  heading,
  summary,
  rows,
  total,
  iconTrigger,
  icon: Icon = Info,
  summaryClassName,
}: Omit<Extract<BoardCardUnit, { kind: "delivery" }>, "kind" | "key"> & {
  /** Overrides the summary's size and weight (Version 4's one line style). */
  summaryClassName?: string;
  /** Version 4: a truck instead of the info icon. */
  icon?: LucideIcon;
  /** Versions 2 and 3 (Pavan, 2026-10-27): an info icon, then the summary as
   *  plain text that wraps — no underline; hover the icon. */
  iconTrigger?: boolean;
}) {
  const compact = useCompact();
  return (
    <div className="flex min-w-0">
      <HoverCard openDelay={150} closeDelay={100}>
        <HoverCardTrigger asChild>
          {iconTrigger ? (
            <button
              type="button"
              aria-label={`${heading} — assets and quantities`}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="mt-px mr-1 shrink-0 self-start rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Icon className="size-3.5" />
            </button>
          ) : (
          <button
            type="button"
            /* THE CARD IS THE BUTTON — this one only explains itself. */
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className={cn(compact ? "text-xs" : "text-[13px]", "min-w-0 rounded-sm text-left font-medium text-foreground underline decoration-fp-outline-1 decoration-dotted underline-offset-4 outline-none transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring/50")}
          >
            {summary.join(" · ")}
          </button>
          )}
        </HoverCardTrigger>
        {/* ICON FIRST, THE LINE WRAPS (Pavan, 2026-10-27) — never cut. */}
        {iconTrigger && (
          <span className={cn("min-w-0 text-foreground", summaryClassName ?? (compact ? "text-xs" : "text-[13px] font-medium"))}>
            {summary.join(" · ")}
          </span>
        )}
        <HoverCardContent
          align="start"
          className="fp-surface-light w-md p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <UnitHeading>{heading}</UnitHeading>
          {/* THE TABLE ALONE (Pavan, 2026-10-28; the map beside it is gone).
              Every row shows, total included, from two rows tall up to four
              and a half; past that it scrolls, the half row saying there is
              more. */}
          <div
            className="mt-2 overflow-y-auto rounded-md border border-border"
            style={{ height: deliveryHeight(rows.length + (total ? 1 : 0)) }}
          >
            <RowsTable rows={rows} total={total} />
          </div>
        </HoverCardContent>
      </HoverCard>
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
  const compact = useCompact();
  const bare = useBare();
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

  /* V4's STEPPER IS ROOMY (Pavan, 2026-10-25; right-aligned 2026-10-27): 24px targets,
     4px from the count — big enough to hit, close enough to read as one. */
  const stepper = quotes.length > 1 && (
    <span
      className={cn("flex items-center gap-0.5 tabular-nums text-muted-foreground", compact ? "text-xs" : "text-[11px]")}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Previous quote"
        disabled={at === 0}
        onClick={(e) => step(e, -1)}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(chevron, "p-1")}
      >
        <ChevronLeft className="size-3.5" />
      </button>
      {at + 1}/{quotes.length}
      <button
        type="button"
        aria-label="Next quote"
        disabled={at === quotes.length - 1}
        onClick={(e) => step(e, 1)}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(chevron, "p-1")}
      >
        <ChevronRight className="size-3.5" />
      </button>
    </span>
  );

  return (
    <>
      {/* THE NAME AND THE FIGURE ON ONE LINE, the placing under the name —
          the two things being compared sit at the two edges, and the label
          that qualifies the name hangs off it rather than off the money. */}
      {/* V4's QUOTE BAND runs edge to edge across the card (the unit's own
          12px inset pulled back), its text on the card's text line; as the
          card's last unit it runs to the bottom edge too. */}
      {/* NO BAND (Pavan, 2026-10-27) — the unit sits on the white card like
          the others; the grey and the greens before it were tried. */}
      <div className="flex flex-col gap-1.5 py-1">
      {/* …and the unit's heading comes inside it (2026-10-25). */}
      {!compact && !bare && <UnitHeading>{heading}</UnitHeading>}
      {/* Compact: name, placing, then the price under them. */}
      <div className={cn("flex min-w-0 gap-2.5", compact ? "flex-col items-start gap-0.5" : "items-start justify-between")}>
        <span className="flex min-w-0 flex-col gap-0.5">
          {!nameOff && (
            <span className={cn("truncate font-semibold text-foreground", compact ? "text-[13px]" : "text-sm")} title={q.vendor}>
              {q.vendor}
            </span>
          )}
          {/* THE PLACING, RIGHT UNDER THE NAME — green for the cheapest, the
              only placing anyone acts on; the rest neutral. */}
          {q.rank !== undefined && (
            <span className={cn("text-xs", q.rank === 1 ? "font-medium text-status-success" : "text-muted-foreground")}>
              {rankLabel(q.rank)}
            </span>
          )}
        </span>
        {/* THE PRICE AT THE VENDOR NAME'S SIZE (Pavan, 2026-10-27) — 14px
            semibold, the same as the name it belongs to; it was text-lg. */}
        {/* Compact: THE STEPPER ON THE PRICE'S LINE, in the card's right
            corner (Pavan, 2026-10-27) — there is room beside the figure. */}
        <div className={cn(compact && "-mr-1 flex items-center justify-between self-stretch")}>
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
                className={cn(compact ? "text-[13px] font-bold" : "text-sm font-semibold", "rounded-sm tabular-nums whitespace-nowrap text-foreground underline decoration-fp-outline-1 decoration-dotted underline-offset-4 outline-none transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring/50")}
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
              <UnitHeading>Delivery Details</UnitHeading>
              <div className="mt-2 overflow-hidden rounded-md border border-border">
                <RowsTable rows={breakdown.rows} total={breakdown.total} />
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span className={cn(compact ? "text-[13px] font-bold" : "text-sm font-semibold", " tabular-nums whitespace-nowrap text-foreground")}>
            {q.total}
          </span>
        )}
        {compact && stepper}
        </div>
      </div>
      {/* THE STEPPER, A LITTLE BELOW, AT THE RIGHT (Pavan, 2026-10-27) —
          the chevron's own 4px pulled back so its glyph meets the figure's
          edge. */}
      {stepper && !compact && <div className="-mr-1 mt-1 flex justify-end">{stepper}</div>}
      </div>
    </>
  );
}

function CardAlert({
  status,
  text,
  actionLabel,
  onAction,
  topClass,
}: NonNullable<BoardCard["alert"]> & { topClass?: string }) {
  const compact = useCompact();
  const top = topClass ?? (compact ? "pt-2.5" : "pt-4");
  /* A WAIT IN A GREY BOX (Pavan, 2026-10-27) — "Awaiting accounting" and the
     like: nothing to press, so it sits in the quote band's grey, tucked 4px
     inside the card, its text left on the card's 12px line. */
  if (status === "default" && !actionLabel)
    return (
      <div className={cn("px-1", top)}>
        <div className="flex items-center justify-start rounded-sm bg-fp-wait-box px-2 py-1.5">
          <span className={cn("flex min-w-0 items-center gap-1 text-xs", ALERT_ACCENT[status])}>
            <Info className="size-4 shrink-0" />
            <span className="truncate">{text}</span>
          </span>
        </div>
      </div>
    );
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        "px-3",
        top,
        actionLabel ? "justify-between" : "justify-center"
      )}
    >
      {/* THE WORDS SIT ON THE ICON (Pavan, 2026-10-27) — 4px, not 8. */}
      <span className={cn("flex min-w-0 items-center gap-1 text-xs", ALERT_ACCENT[status])}>
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

/* The units Version 4 hangs under the ship-to name as one grey line. */
const WHEN_KEYS = new Set(["schedule", "completed"]);
/** "Oct 27, 2026" → "Oct 27 2026" — the comma is kept for between the parts. */
const shortDate = (p: string) => p.replace(/^(\w{3} \d{1,2}),( \d{4})/, "$1$2");

/* VERSION 4 SETS ITS UNITS 8px APART (Pavan, 2026-10-28) — picked after
   a 12 / 10 / 16 trial; Version 1 keeps 16. */
function Card({ card, onOpen }: { card: BoardCard; onOpen?: () => void }) {
  const compact = useCompact();
  const bare = useBare();
  /* Compact cards pull their units closer — there is no heading to clear. */
  const gapTop = compact ? "pt-2.5" : bare ? "pt-2" : "pt-4";
  const ruleTop = bare ? "mt-2" : "mt-4";
  const iconed = useIconed();
  /* One unit's content — beside its icon on Version 1.1, alone elsewhere. */
  const unitBody = (u: BoardCardUnit) => (
    <>

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
              {/* VERSION 4 KEEPS ITS ICONS; ONLY THE VENDOR TAKES A LABEL
                  (Pavan, 2026-10-28) — sentence case, "Vendor" not "VENDOR". */}
              {bare ? (
                null
              ) : !compact && !(iconed && UNIT_ICON[u.key]) && (
                u.key === "partner" ? <VendorUnitLabel /> : <UnitHeading>{u.heading}</UnitHeading>
              )}
              {u.kind === "stack" &&
                ((compact || bare) && (u.key === "customer" || u.key === "driver") ? (
                  /* The driver reads like the ship-to: the name, the rest on
                     hover (Pavan, 2026-10-27). */
                  <ShipToLine
                    iconFirst
                    icon={bare ? (u.key === "driver" ? UserRound : MapPin) : undefined}
                    heading={u.heading}
                    lines={u.lines}
                    className={bare ? LEVEL_CLASS_BARE[1] : LEVEL_CLASS_COMPACT[1]}
                  />
                ) : (
                  <CardStack
                    lines={u.lines}
                    figure={u.figure}
                    lead={
                      bare && u.key === "partner" && u.hover?.length && u.lines.length
                        ? { heading: u.heading, hover: u.hover }
                        : undefined
                    }
                  />
                ))}
              {u.kind === "inline" &&
                (bare && WHEN_KEYS.has(u.key) ? (
                  /* VERSION 4'S SCHEDULE (Pavan, 2026-10-27) — under the
                     ship-to name, starting where the name starts (past the
                     pin and its 4px), 2px smaller, all in the secondary grey;
                     the date first, then the window. One phrase:
                     "Oct 27 2026, 6:00 AM – 10:00 AM".
                     COMPLETED ON READS THE SAME (Pavan, 2026-10-28):
                     "Oct 28 2026, 3:28 PM · Weekly on Thursday". Never
                     truncated — a long line wraps.
                     */
                  <span className="pl-4.5 text-xs text-muted-foreground">
                    {u.key === "schedule"
                      ? [...u.parts].reverse().map(shortDate).join(", ")
                      : u.parts.map((p, i) => (i === 0 ? p.replace(" · ", ", ") : p)).map(shortDate).join(" · ")}
                  </span>
                ) : (
                  <CardInline parts={u.parts} />
                ))}
              {u.kind === "rows" && <CardRows rows={u.rows} total={u.total} />}
              {u.kind === "delivery" && (
                <CardDelivery
                  heading={u.heading}
                  summary={u.summary}
                  rows={u.rows}
                  total={u.total}
                  site={u.site}
                  points={u.points}
                  iconTrigger={compact || bare}
                  icon={bare ? Truck : undefined}
                  summaryClassName={bare ? BARE_LINE : undefined}
                />
              )}
            </>
          )}
    </>
  );
  /* THE QUOTE BAND CLOSES THE CARD (Pavan, 2026-10-25): when quotes are
     the last unit, the band meets the card's bottom edge and the alert row
     ("2 of 2 quotes — review pricing") goes, its Review with it — the
     order opens from the card itself. */
  const bandLast = card.units.at(-1)?.kind === "quotes" && !card.footerAction;
  /* …and so does a wait's grey box. */
  const manyChips = bare && (card.badges?.length ?? 0) > 1;
  const waitLast =
    (!bandLast && card.alert?.status === "default" && !card.alert.actionLabel && !card.footerAction) ||
    !!card.footerAction?.waiting;
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
        waitLast ? "pb-1" : bandLast ? "pb-2" : "pb-3",
        "group/card cursor-pointer overflow-hidden rounded-md bg-fp-surface-1b outline-none transition-[color,background-color,border-color,box-shadow]",
        "border border-fp-outline-1 hover:border-fp-outline-2 hover:shadow-fp-surface",
        /* DARK HOVER FILLS (Pavan, 2026-10-27) — the rim alone was too quiet;
           one card step up (--muted is --fp-card-2 in dark). The grey pills step up with it (CARD_HOVER_PILL). */
        "dark:hover:bg-muted",
        /* VERSION 4, DARK: THE CARD RIM CLEARS THE LANE'S STROKES (Pavan,
           2026-10-28) — halfway from the quiet rim to the strong one; hover
           still goes to the strong rim. */
        bare &&
          "dark:border-[color-mix(in_srgb,var(--fp-outline-1)_50%,var(--fp-outline-2))] dark:hover:border-fp-outline-2",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        "active:border-fp-outline-2 active:bg-fp-card-1"
      )}
    >
      {/* UNITS ARE RULED. A rule per unit is affordable here because there are
          five of them and each holds ONE shape — the rules are what let the
          headings shrink to 10px and the field labels disappear entirely. */}
      <div className="flex flex-col gap-1 px-3 pt-3">
        {/* Compact: the chips drop under the number rather than squeeze it. */}
        {/* Version 4: the number and its chips centred on one line. */}
        {/* VERSION 4, TWO CHIPS OR MORE (Pavan, 2026-10-28) — the number is
            never cut at rest: it and the first two chips run on one line and
            what does not fit is clipped at the card's edge. On hover the
            number gives way (truncates) and both chips show whole. A third
            chip and on go to the next line. */}
        <div className={cn("flex justify-between gap-2", bare ? "items-center" : "items-start", compact && "flex-wrap gap-y-1")}>
          <div
            className={cn(
              "flex items-center gap-1.5",
              compact ? "shrink-0" : "min-w-0",
              manyChips && "shrink-0 group-hover/card:shrink"
            )}
          >
            <h4 className={cn("min-w-0 truncate font-semibold", ORDER_NO, compact ? "text-[13px]" : "text-sm")}>
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
            <div
              className={cn(
                "flex gap-1",
                manyChips
                  ? /* Clipped at the card's stroke, not its 12px padding
                       (Pavan, 2026-10-28) — the row runs into the padding at
                       rest and steps back out of it on hover. */
                    "-mr-3 min-w-0 flex-nowrap overflow-hidden group-hover/card:mr-0 group-hover/card:shrink-0"
                  : cn("flex-wrap", compact ? "min-w-0" : "shrink-0 justify-end")
              )}
            >
              {(manyChips ? card.badges.slice(0, 2) : card.badges).map((b) => (
                <Pill key={b.label} kind={b.tone ?? "neutral"} className={CARD_HOVER_PILL(b.tone)}>
                  {b.label}
                </Pill>
              ))}
            </div>
          )}
        </div>
        {manyChips && card.badges!.length > 2 && (
          <div className="flex flex-wrap justify-end gap-1">
            {card.badges!.slice(2).map((b) => (
              <Pill key={b.label} kind={b.tone ?? "neutral"} className={CARD_HOVER_PILL(b.tone)}>
                {b.label}
              </Pill>
            ))}
          </div>
        )}
        {card.subtitle?.map((line) => (
          <span key={line} className="truncate text-xs text-muted-foreground" title={line}>
            {line}
          </span>
        ))}
      </div>

      {card.units.map((u, ui) => (
        <React.Fragment key={u.key}>
        {/* VERSION 4: A RULE OVER THE VENDOR (Pavan, 2026-10-27) — between
            what is going where (and who drives it) and who is taking it, on
            Version 1's 16px rhythm. */}
        {bare && ui > 0 && u.key === "partner" && (
          <div aria-hidden className={cn("mx-3 border-t border-border", ruleTop)} />
        )}
        <div
          /* Version 4: the schedule hangs 4px under the ship-to name. */
          className={cn("flex flex-col gap-1.5 px-3", bare && WHEN_KEYS.has(u.key) ? "pt-1" : gapTop)}
        >
          {iconed && UNIT_ICON[u.key] ? (
            /* Version 1.1: the icon in the heading's place, the unit beside it. */
            <div className="flex min-w-0 gap-2">
              {React.createElement(UNIT_ICON[u.key], {
                "aria-label": u.heading,
                className: "mt-0.5 size-4 shrink-0 text-muted-foreground",
              })}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">{unitBody(u)}</div>
            </div>
          ) : unitBody(u)}
        </div>
        </React.Fragment>
      ))}
      {/* …and with no vendor unit, the rule comes before the footer —
          "Vendor not selected · Select Vendor" and the like. */}
      {bare &&
        card.units.length > 0 &&
        card.units.at(-1)?.key !== "partner" &&
        ((card.alert && !bandLast) || card.footerAction) && (
          <div aria-hidden className={cn("mx-3 border-t border-border", ruleTop)} />
        )}

      {/* NO "VIEW DETAILS" ROW. The whole card opens the order — it is the
          button — so a strip at the bottom naming that was a label for a thing
          the reader was already standing on, and it cost every card a rule and
          25px to say it. What is left in this footer is what the card is
          waiting on: an alert, or the invoice row. */}
      {card.alert && !bandLast && <CardAlert {...card.alert} topClass={bare ? gapTop : undefined} />}

      {card.footerAction?.waiting ? (
        /* A DONE ASK IN A SUBTLE GREEN BOX (Pavan, 2026-10-28) — tucked 4px
           inside the card like the grey wait box, the words on the left, how
           long ago on the right. EVERY VERSION TAKES THE GREY WAIT BOX,
           both themes (Pavan, 2026-10-28). */
        <div className={cn("px-1", gapTop)}>
          <div className={cn("flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-xs", "bg-fp-wait-box")}>
            <span className={cn("flex min-w-0 items-center gap-1", ALERT_ACCENT.default)}>
              <Check className="size-4 shrink-0" />
              <span className="truncate">{card.footerAction.label}</span>
            </span>
            {card.footerAction.meta && (
              <span className="shrink-0 whitespace-nowrap text-muted-foreground">{card.footerAction.meta}</span>
            )}
          </div>
        </div>
      ) : card.footerAction && (
        <div className={cn("flex items-center justify-between gap-2 px-3", gapTop)}>
          {(
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
  renderCard,
}: {
  lane: BoardLane;
  onOpenCard?: (id: string) => void;
  renderCard?: BrokerBoardProps["renderCard"];
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
    <div
      data-fp-unit="lane"
      className={cn(
        "flex h-full w-(--fp-board-lane-width) shrink-0 flex-col overflow-hidden bg-fp-surface-1b",
        /* A column of the board's box: one line before it. */
        "border-l border-border first:border-l-0"
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-3">
        <h3
          className={cn(
            "min-w-0 truncate rounded-full px-2.5 py-0.5 text-sm font-semibold",
            LANE_TITLE[lane.color]
          )}
        >
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
          className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-fp-lane-count px-1 text-[11px] font-medium tabular-nums text-foreground"
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
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {lane.cards.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            {lane.emptyLabel ?? "Nothing here"}
          </p>
        ) : (
          lane.cards.map((card) =>
            renderCard ? (
              <React.Fragment key={card.id}>{renderCard(card, () => onOpenCard?.(card.id))}</React.Fragment>
            ) : (
              <Card key={card.id} card={card} onOpen={() => onOpenCard?.(card.id)} />
            )
          )
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
  compact = false,
  bare = false,
  iconed = false,
  renderCard,
}: BrokerBoardProps) {
  /* COMPACT LANE WIDTH (Pavan, 2026-10-27; 5.5 since 2026-10-28) — the
     board's width over 5.5, so five lanes and half of the sixth show; never
     under 160px (240px before, which held a 1440px screen to 4.7 lanes). The lane's
     gutters and the gaps between cards are Version 1's. */
  const box = React.useRef<HTMLDivElement>(null);
  const [laneW, setLaneW] = React.useState<number>();
  React.useLayoutEffect(() => {
    const el = box.current;
    if (!compact || !el) return setLaneW(undefined);
    const fit = () => setLaneW(Math.max(160, Math.floor(el.clientWidth / 5.5)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);
  return (
    <Compact.Provider value={compact}>
    <Bare.Provider value={bare}>
    <Iconed.Provider value={iconed}>
    {/* THE BOX IS BoardWithBar's — the lanes fill it edge to edge. */}
    <div
      ref={box}
      className="flex h-full min-h-0 overflow-x-auto"
      style={laneW ? ({ "--fp-board-lane-width": `${laneW}px` } as React.CSSProperties) : undefined}
    >
      {lanes.map((lane) => (
        <React.Fragment key={lane.key}>
        {/* THE BOARD BREAKS BETWEEN LANE GROUPS (Pavan, 2026-10-27) — not a
            heavier line: a 20px white strip between two rules, so Canceled
            and Blocked read as a second board beside the first. */}
        {lane.apart && (
          <div aria-hidden className="w-5 shrink-0 border-l border-border bg-fp-surface-1b" />
        )}
        <Lane
          lane={lane}
          onOpenCard={onOpenCard}
          sortOptions={laneSortOptions?.(lane.key)}
          sortKey={laneSort?.[lane.key]}
          renderCard={renderCard}
          onSortChange={
            onLaneSortChange ? (o) => onLaneSortChange(lane.key, o) : undefined
          }
        />
        </React.Fragment>
      ))}
    </div>
    </Iconed.Provider>
    </Bare.Provider>
    </Compact.Provider>
  );
}

/**
 * LIST VIEW'S LEFT PANE (Pavan, 2026-10-29) — rows, not cards. Each row says
 * what a Version 3 card says, minus its buttons: the number and status, the
 * ship-to, the planned window, the delivery line, and the pending step. The
 * step is pressable when the screen names where it lives (`onPending`). The
 * picked row takes the lightest grey — the table header's, also the picked
 * pagination page (bg-muted read too heavy, Pavan 2026-10-29); ↑ ↓ step
 * through.
 */
export function BoardRowList({
  items,
  selectedId,
  onSelect,
  onPending,
  whatIcon: WhatIcon = Truck,
  hideStatus,
}: {
  /** A status pill is picked — every row has that status, so the chip goes. */
  hideStatus?: boolean;
  /** The icon before the "what goes" line — a truck for a delivery. */
  whatIcon?: LucideIcon;
  /** `when` / `what` override the line read off the card's units, for a
   *  module whose units are shaped differently. */
  items: { card: BoardCard; status: string; tone: StatusTone; when?: string; what?: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Absent for a card = its step is not pressable. */
  onPending?: (card: BoardCard) => (() => void) | undefined;
}) {
  const refs = React.useRef(new Map<string, HTMLDivElement>());
  React.useEffect(() => {
    if (selectedId) refs.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);
  const step = (by: number) => {
    const at = items.findIndex((i) => i.card.id === selectedId);
    const next = items[Math.min(items.length - 1, Math.max(0, at + by))];
    if (next) {
      onSelect(next.card.id);
      refs.current.get(next.card.id)?.focus();
    }
  };
  return (
    <div
      role="listbox"
      aria-label="Orders"
      className="h-full overflow-y-auto"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          step(e.key === "ArrowDown" ? 1 : -1);
        }
      }}
    >
      {items.map(({ card, status, tone, when: whenText, what: whatText }) => {
        const on = card.id === selectedId;
        const shipTo = card.units.find((u) => u.kind === "stack" && u.key === "customer");
        const when = card.units.find((u) => u.kind === "inline" && WHEN_KEYS.has(u.key));
        /* WHAT GOES — the delivery line, else the product / asset rows,
           else the asset named on the card. */
        const what =
          whatText ??
          card.units.flatMap((u) =>
            u.kind === "delivery"
              ? [u.summary.join(" · ")]
              : u.kind === "rows" && u.rows.length
                ? [u.rows.map((r) => [r.asset, r.qty].filter(Boolean).join(" ")).join(" · ")]
                : u.kind === "stack" && u.key === "asset" && u.lines[0]
                  ? [u.lines[0].text]
                  : []
          )[0];
        const whenLine =
          whenText ??
          (when?.kind === "inline"
            ? when.key === "schedule"
              ? [...when.parts].reverse().map(shortDate).join(", ")
              : when.parts.map((p, i) => (i === 0 ? p.replace(" · ", ", ") : p)).map(shortDate).join(" · ")
            : undefined);
        const pending = card.alert;
        const goPending = pending ? onPending?.(card) : undefined;
        return (
          <div
            key={card.id}
            ref={(el) => {
              if (el) refs.current.set(card.id, el);
              else refs.current.delete(card.id);
            }}
            role="option"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(card.id)}
            className={cn(
              "flex cursor-pointer flex-col gap-1 border-b border-fp-outline-1 px-3 py-2.5 outline-none transition-colors hover:bg-fp-row-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
              on && "bg-fp-table-header hover:bg-fp-table-header"
            )}
          >
            {/* THE NUMBER AND ITS TYPE AS THE V3 CARD DRAWS THEM (Pavan,
                2026-10-29) — the blue number, the coloured initial (the
                type's word on hover); never a different form of the same
                fact. */}
            <span className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={cn("truncate text-sm font-semibold", ORDER_NO)}>{card.title}</span>
                {card.code && (
                  <CodeDisc code={card.code.text} label={card.code.label} tone={card.code.tone} className="shrink-0" />
                )}
              </span>
              {!hideStatus && (
                <StatusChip tone={tone} variant="soft">
                  {status}
                </StatusChip>
              )}
            </span>
            {shipTo?.kind === "stack" && shipTo.lines[0] && (
              <span className="flex min-w-0 items-center gap-1 text-sm font-normal text-foreground">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{shipTo.lines[0].text}</span>
              </span>
            )}
            {whenLine && <span className="pl-4.5 text-xs text-muted-foreground">{whenLine}</span>}
            {what && (
              <span className="flex min-w-0 items-center gap-1 text-sm font-normal text-foreground">
                <WhatIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{what}</span>
              </span>
            )}
            {pending &&
              (goPending ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPending();
                  }}
                  className={cn(
                    "flex w-fit min-w-0 items-center gap-1 rounded-sm text-xs underline decoration-dotted underline-offset-4 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring/50",
                    ALERT_ACCENT[pending.status]
                  )}
                >
                  <Info className="size-4 shrink-0" />
                  <span className="truncate">{pending.text}</span>
                </button>
              ) : (
                <span className={cn("flex min-w-0 items-center gap-1 text-xs", ALERT_ACCENT[pending.status])}>
                  <Info className="size-4 shrink-0" />
                  <span className="truncate">{pending.text}</span>
                </span>
              ))}
          </div>
        );
      })}
    </div>
  );
}
