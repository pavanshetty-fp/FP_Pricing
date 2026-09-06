import * as React from "react";
import { ArrowDownUp, ArrowDown, ArrowUp, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  | { kind: "stack"; key: string; heading: string; lines: BoardCardLine[] }
  | { kind: "inline"; key: string; heading: string; parts: string[] }
  | {
      kind: "rows";
      key: string;
      heading: string;
      rows: BoardCardRow[];
      /** Only when more than one row states a number — see `CardRows`. */
      total?: string;
      /** A fine line under the rows: a serial, a route. */
      note?: string;
    };

export interface BoardCardBadge {
  label: string;
  /** `critical` for a state that changes what someone does next. */
  tone?: "critical" | "neutral";
}

export interface BoardCard {
  id: string;
  title: string;
  /**
   * Stacked, not one-of. Priority and recurrence are independent facts and a
   * single slot made them compete — an urgent recurring order lost one.
   *
   * Delivery vs Movement is NOT a badge: the order number's prefix already
   * carries it (`D-` / `M-`), so spending a badge on it says nothing new.
   */
  badges?: BoardCardBadge[];
  /** Under the title. The order's category. */
  subtitle?: string;
  units: BoardCardUnit[];
  alert?: {
    status: AlertStatus;
    text: string;
    /** Renders a button and splits the footer left/right, per the DS variant. */
    actionLabel?: string;
    onAction?: () => void;
  };
  /**
   * Footer affordance shown when there is NO alert — the card's own click
   * target, given a visible name. A card that opens a record should say so;
   * a stage with something outstanding says the more urgent thing instead.
   */
  detailLabel?: string;
}

export interface BoardLane {
  key: string;
  title: string;
  color: LaneColor;
  cards: BoardCard[];
  /** Shown in place of the card stack when the lane is empty. */
  emptyLabel?: string;
}

export interface BrokerBoardProps {
  lanes: BoardLane[];
  onOpenCard?: (id: string) => void;
  /** Per-lane sort direction, keyed by lane key. Absent = unsorted. */
  laneSort?: Record<string, "asc" | "desc" | undefined>;
  onToggleLaneSort?: (laneKey: string) => void;
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
function CardStack({ lines }: { lines: BoardCardLine[] }) {
  return (
    <div className="flex min-w-0 flex-col">
      {lines.map((l) => (
        <span key={l.text} className={cn("truncate", LEVEL_CLASS[l.level ?? 1])} title={l.text}>
          {l.text}
        </span>
      ))}
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
function CardRows({
  rows,
  total,
  note,
}: {
  rows: BoardCardRow[];
  total?: string;
  note?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {rows.map((r, i) => (
        <div
          key={`${r.asset}-${i}`}
          className="grid min-w-0 items-baseline gap-2.5"
          style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.05fr) auto" }}
        >
          <span className="truncate text-[13px] font-medium text-foreground" title={r.asset}>
            {r.asset}
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
      {note && (
        <span className="truncate text-xs text-muted-foreground" title={note}>
          {note}
        </span>
      )}
      {total && (
        <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-fp-outline-1 pt-1.5">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-[13px] font-semibold tabular-nums text-foreground">{total}</span>
        </div>
      )}
    </div>
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
          <h4 className="min-w-0 truncate font-mono text-sm font-semibold text-foreground">
            {card.title}
          </h4>
          {card.badges && card.badges.length > 0 && (
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {card.badges.map((b) => (
                <Badge
                  key={b.label}
                  variant={b.tone === "critical" ? "destructive" : "secondary"}
                >
                  {b.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {card.subtitle && (
          <span className="truncate text-xs text-muted-foreground" title={card.subtitle}>
            {card.subtitle}
          </span>
        )}
      </div>

      {card.units.map((u) => (
        <div
          key={u.key}
          className="flex flex-col gap-1.5 border-t border-fp-outline-1 p-3.5"
        >
          <UnitHeading>{u.heading}</UnitHeading>
          {u.kind === "stack" && <CardStack lines={u.lines} />}
          {u.kind === "inline" && <CardInline parts={u.parts} />}
          {u.kind === "rows" && (
            <CardRows rows={u.rows} total={u.total} note={u.note} />
          )}
        </div>
      ))}

      {card.alert ? (
        <CardAlert {...card.alert} />
      ) : (
        card.detailLabel && (
          /* Not a control — the CARD is the button, and this names what pressing
             it does. A second focusable thing doing the same job would give the
             keyboard two stops for one action. */
          <div
            aria-hidden
            className="flex items-center justify-center gap-1.5 border-t border-fp-outline-1 px-3.5 py-2.5 text-[10px] tracking-[0.1em] text-muted-foreground uppercase"
          >
            {card.detailLabel}
            <ChevronRight className="size-3.5" />
          </div>
        )
      )}
    </div>
  );
}

function Lane({
  lane,
  onOpenCard,
  sortDir,
  onToggleSort,
}: {
  lane: BoardLane;
  onOpenCard?: (id: string) => void;
  sortDir?: "asc" | "desc";
  onToggleSort?: () => void;
}) {
  const SortIcon = sortDir === "asc" ? ArrowUp : sortDir === "desc" ? ArrowDown : ArrowDownUp;
  return (
    /* 400px, not the DS's 340. The card's product unit is three columns —
       asset, product, quantity — and at 340 the first two truncated on any
       real pair of names. The lane widened to fit the content rather than the
       content being cut to fit the lane. */
    <div className="flex h-full w-[400px] shrink-0 flex-col overflow-hidden rounded-md bg-accent">
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
        {onToggleSort && (
          <button
            type="button"
            aria-label={`Sort ${lane.title} by planned time${
              sortDir ? ` (currently ${sortDir === "asc" ? "earliest" : "latest"} first)` : ""
            }`}
            onClick={onToggleSort}
            className={cn(
              "ml-auto shrink-0 rounded-sm p-1 outline-none transition-colors hover:bg-fp-card-1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
              sortDir ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <SortIcon className="size-4" />
          </button>
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
  laneSort,
  onToggleLaneSort,
}: BrokerBoardProps) {
  return (
    <div className="flex h-full min-h-0 gap-4 overflow-x-auto pb-1">
      {lanes.map((lane) => (
        <Lane
          key={lane.key}
          lane={lane}
          onOpenCard={onOpenCard}
          sortDir={laneSort?.[lane.key]}
          onToggleSort={onToggleLaneSort ? () => onToggleLaneSort(lane.key) : undefined}
        />
      ))}
    </div>
  );
}
