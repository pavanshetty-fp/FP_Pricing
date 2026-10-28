import * as React from "react";
import { Check, Handshake, Info, MapPin, Truck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { CodeDisc } from "@/components/ui/code-disc";
import {
  CardDelivery,
  ShipToLine,
  CARD_HOVER_PILL,
  type BoardCard,
  type BoardCardUnit,
  type BoardLane,
  type BrokerBoardProps,
} from "./BrokerBoard";
import { shortLabel } from "./unitLabels";

/*
  BOARD — VERSION 2, AFTER HUBSPOT'S DEAL BOARD (Pavan, 2026-10-27).

  A trial beside the V4 board (Version 1), switched on the 3PL board's
  Version tabs. The same lanes and cards, drawn the HubSpot way:

    · columns are light-grey trays with a gap between them, no outer box;
    · the column head is the stage name in bold with its count beside it,
      no coloured pill;
    · cards are white, rimmed and rounded, lifting on hover; the record's
      name leads in the link colour, and every fact under it is a
      line of its own — values only, no labels (2026-10-27);
    · the column foot carries the stage's total amount.

  Tokens only: the tray is the inner-panel surface, the link is the info
  accent, the rims are the hairline.
*/


const moneyOf = (s?: string) => {
  const n = s ? Number(s.replace(/[^0-9.-]/g, "")) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** The card's one amount — the best quote, or the awarded partner's figure. */
function amountOf(card: BoardCard): string | undefined {
  for (const u of card.units) {
    if (u.kind === "quotes" && u.quotes[0]) return u.quotes[0].total;
    if (u.kind === "stack" && u.figure) return u.figure;
  }
  return undefined;
}

/* VERSIONS 2 AND 3 — VERSION 4'S ICONS (Pavan, 2026-10-28; what was
   Version 2.1 became Version 2, the old Version 2 removed): a pin, a truck,
   a person and a handshake lead the ship-to, delivery, driver and vendor,
   no labels; the schedule hangs under the ship-to name; the vendor's
   handshake holds its address, its price beside the name. */
/* VERSION 2 TRUNCATES NOTHING (Pavan, 2026-10-28) — every line on the card
   wraps to the next instead. Version 3's card still truncates. */
const Wrap = React.createContext(false);

/* NO LABELS (Pavan, 2026-10-27) — each fact is its value alone; `label`
   stays for screen readers. */
function Property({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  const wrap = React.useContext(Wrap);
  return (
    <div className={cn("flex min-w-0 items-baseline text-xs", className)}>
      <span className="sr-only">{label}: </span>
      <span className={cn("min-w-0 text-foreground", wrap ? "break-words" : "truncate")}>{children}</span>
    </div>
  );
}

/* ONE UNIT, ONE GROUP — its own lines 4px apart; the gap between groups
   is the card's to set. */
function UnitGroup({ u, ruled }: { u: BoardCardUnit; ruled?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", ruled && "mt-0.5 border-t border-border pt-2")}>
      <UnitProperties u={u} />
    </div>
  );
}

function UnitProperties({ u }: { u: BoardCardUnit }) {
  const label = shortLabel(u);
  const wrap = React.useContext(Wrap);
  /* THE SHIP-TO: its name and an info icon; the rest on hover. */
  /* …and the driver the same way (Pavan, 2026-10-27). */
  if (u.kind === "stack" && (u.key === "customer" || u.key === "driver"))
    return (
      <ShipToLine
        iconFirst
        icon={u.key === "driver" ? UserRound : MapPin}
        wrap={wrap}
        heading={u.heading}
        lines={u.lines}
        className="text-xs text-foreground"
      />
    );
  /* THE VENDOR (Pavan, 2026-10-28) — a handshake leads the name and holds
     the address on hover; the price beside it. */
  if (u.kind === "stack" && u.key === "partner" && u.lines[0]) {
    return (
      <div className="flex min-w-0 items-baseline justify-between gap-2.5 text-xs">
        <span className="sr-only">{label}: </span>
        <ShipToLine
          iconFirst
          icon={Handshake}
          wrap={wrap}
          hoverLabel="address"
          heading={u.heading}
          lines={[u.lines[0], ...(u.hover ?? [])]}
          className="text-xs text-foreground"
        />
        {u.figure && (
          <span className="shrink-0 tabular-nums whitespace-nowrap text-foreground">
            <span className="sr-only">Amount: </span>
            {u.figure}
          </span>
        )}
      </div>
    );
  }
  if (u.kind === "stack") {
    const [first, ...rest] = u.lines;
    return (
      <>
        {first && (
          <Property label={label}>
            {first.text}
            {rest[0] && <span className="text-muted-foreground"> · {rest[0].text}</span>}
          </Property>
        )}
        {u.figure && <Property label="Amount">{u.figure}</Property>}
      </>
    );
  }
  /* Version 3: the schedule starts where the ship-to name starts, past the pin. */
  if (u.kind === "inline")
    return (
      <Property label={label} className="pl-4.5">
        {u.parts.join(" · ")}
      </Property>
    );
  if (u.kind === "rows")
    return <Property label={label}>{u.rows.map((r) => r.asset).join(", ")}</Property>;
  if (u.kind === "delivery")
    return (
      <div className="flex min-w-0 items-baseline text-xs">
        <span className="sr-only">{label}: </span>
        <span className="min-w-0 text-foreground">
          <CardDelivery
            iconTrigger
            icon={Truck}
            heading={u.heading}
            summary={u.summary}
            rows={u.rows}
            total={u.total}
            site={u.site}
            points={u.points}
          />
        </span>
      </div>
    );
  /* QUOTES: the cheapest leads, as HubSpot shows one amount per deal. */
  const q = u.quotes[0];
  if (!q) return null;
  return (
    <>
      {!u.nameOff && <Property label={label}>{q.vendor}</Property>}
      <Property label="Amount">
        {q.total}
        {u.quotes.length > 1 && (
          <span className="text-muted-foreground"> · best of {u.quotes.length}</span>
        )}
      </Property>
    </>
  );
}

export function CardV2({
  card,
  onOpen,
  flat,
}: {
  card: BoardCard;
  onOpen?: () => void;
  /** Version 3 (Pavan, 2026-10-27): Version 1's flat shell — its rim and
   *  hover, no shadow — around this card's arrangement. */
  flat?: boolean;
}) {
  const wrap = React.useContext(Wrap);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${card.title}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className={cn(
        /* 10px INSIDE (Pavan, 2026-10-27 — was 12). */
        "group/card flex shrink-0 cursor-pointer flex-col gap-2 rounded-md border bg-fp-surface-1b p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        /* Dark hover fills one card step, --muted (Pavan, 2026-10-27). */
        "dark:hover:bg-muted",
        flat
          ? /* Dark: Version 4's brighter rim, halfway to the strong one
               (Pavan, 2026-10-28); hover still goes to the strong rim. */
            "border-fp-outline-1 transition-[background-color,border-color,box-shadow] hover:border-fp-outline-2 hover:shadow-fp-surface active:border-fp-outline-2 active:bg-fp-card-1 dark:border-[color-mix(in_srgb,var(--fp-outline-1)_50%,var(--fp-outline-2))] dark:hover:border-fp-outline-2"
          : "border-border shadow-xs transition-[background-color,box-shadow] hover:shadow-md"
      )}
    >
      {/* NARROW LANES WRAP, NOT CLIP (Pavan, 2026-10-27) — the number never
          truncates and neither does a chip: chips that do not fit beside the
          number drop under it, one under another, and the card grows. */}
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-sm font-semibold whitespace-nowrap text-fp-banner-accent-info hover:underline">
            {card.title}
          </span>
          {card.code && (
            <CodeDisc code={card.code.text} label={card.code.label} tone={card.code.tone} className="shrink-0" />
          )}
        </div>
        {card.badges && card.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.badges.map((b) => (
              /* SMALLER PILLS ON VERSION 2 (Pavan, 2026-10-28) — 2px
                 above and below the text, not the 28px height. */
              <Pill
                key={b.label}
                kind={b.tone ?? "neutral"}
                className={cn(CARD_HOVER_PILL(b.tone), !flat && "h-auto py-0.5", wrap && "whitespace-normal [&>span]:whitespace-normal")}
              >
                {b.label}
              </Pill>
            ))}
          </div>
        )}
      </div>
      {card.subtitle?.map((line) => (
        <span key={line} className={cn("-mt-1 text-xs text-muted-foreground", wrap ? "break-words" : "truncate")}>
          {line}
        </span>
      ))}
      {/* 6px BETWEEN GROUPS (Pavan, 2026-10-27) — tried 4, 6, 8, 12, 16. */}
      <div className="flex min-w-0 flex-col gap-1.5">
        {card.units.map((u, i) => (
          /* Versions 2 and 3 (Pavan, 2026-10-27): a rule sets the vendor apart
             from the ship-to and delivery above it — 8px each side. */
          <UnitGroup key={u.key} u={u} ruled={u.key === "partner" && i > 0} />
        ))}
      </div>
      {card.alert && (
        /* THE CTA RUNS END TO END (Pavan, 2026-10-27) — the words above it. */
        <div className="flex flex-col gap-1.5 border-t border-border pt-2">
          <span className="flex min-w-0 items-start gap-1 text-xs text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" />
            <span>{card.alert.text}</span>
          </span>
          {card.alert.actionLabel && (
            <Button
              variant="outline"
              size="xs"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                card.alert?.onAction?.();
              }}
            >
              {card.alert.actionLabel}
            </Button>
          )}
        </div>
      )}
      {card.footerAction?.waiting ? (
        /* A done ask in a subtle green box, how long ago on the right
           (Pavan, 2026-10-28). */
        <div className="flex items-center justify-between gap-2 rounded-sm bg-fp-alert-pill-success px-2 py-1.5 text-xs">
          <span className="flex min-w-0 items-center gap-1 text-fp-alert-pill-success-ink">
            <Check className="size-3.5 shrink-0" />
            <span className={wrap ? "break-words" : "truncate"}>{card.footerAction.label}</span>
          </span>
          {card.footerAction.meta && (
            <span className="shrink-0 whitespace-nowrap text-muted-foreground">{card.footerAction.meta}</span>
          )}
        </div>
      ) : card.footerAction && (
        /* THE CTA RUNS END TO END (Pavan, 2026-10-27) — the words above it. */
        <div className="flex flex-col gap-1.5 border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">{card.footerAction.label}</span>
          {card.footerAction.actionLabel && (
            <Button
              variant={card.footerAction.actionVariant ?? "success"}
              size="xs"
              className="w-full"
              onClick={(e) => {
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

function LaneV2({
  lane,
  onOpenCard,
  width,
}: {
  lane: BoardLane;
  onOpenCard?: (id: string) => void;
  width?: number;
}) {
  const total = lane.cards.reduce((sum, c) => sum + moneyOf(amountOf(c)), 0);
  return (
    <div
      data-fp-unit="lane"
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden rounded-md bg-fp-surface-1a",
        !width && "w-(--fp-board-lane-width)",
        lane.apart && "ml-3"
      )}
      style={width ? { width } : undefined}
    >
      <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
        <h3 className="truncate text-sm font-semibold text-foreground">{lane.title}</h3>
        <span className="text-sm tabular-nums text-muted-foreground">{lane.cards.length}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {lane.cards.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            {lane.emptyLabel ?? "Nothing here"}
          </p>
        ) : (
          lane.cards.map((c) => <CardV2 key={c.id} card={c} onOpen={() => onOpenCard?.(c.id)} />)
        )}
      </div>
      {/* THE STAGE'S TOTAL, at the foot of the column, as HubSpot sets it. */}
      <div className="shrink-0 border-t border-border px-3 py-2 text-xs">
        <span className="text-muted-foreground">Total amount: </span>
        <span className="font-semibold tabular-nums text-foreground">
          {total > 0 ? MONEY.format(total) : "—"}
        </span>
      </div>
    </div>
  );
}

/* FIVE AND A HALF LANES AT A GLANCE (Pavan, 2026-10-28; was 7.5, 6.5, 4.5) — the lane width
   is the board's width over 5.5, gaps and padding taken out first, so the
   half lane says the board scrolls on. Never under 160px. */
const LANES_IN_VIEW = 5.5;
const GAP = 8;
const PAD = 12;

export function BoardV2({
  lanes,
  onOpenCard,
}: Pick<BrokerBoardProps, "lanes" | "onOpenCard">) {
  const box = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>();
  React.useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () =>
      setWidth(
        Math.max(160, Math.floor((el.clientWidth - PAD * 2 - GAP * Math.floor(LANES_IN_VIEW)) / LANES_IN_VIEW))
      );
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <Wrap.Provider value>
    <div ref={box} className="flex h-full min-h-0 gap-2 overflow-x-auto bg-fp-surface-1b p-3">
      {lanes.map((lane) => (
        <LaneV2 key={lane.key} lane={lane} onOpenCard={onOpenCard} width={width} />
      ))}
    </div>
    </Wrap.Provider>
  );
}
