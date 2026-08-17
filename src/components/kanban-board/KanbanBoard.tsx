import { ArrowDownUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/*
  Kanban board — Figma "Kan-ban in Content Layer" (27631:11154). A horizontal
  row of fixed-width lanes (Kanban_slot) on the content layer; each lane has a
  colored top strip, a header (title + count pill + sort), and a scrollable
  stack of cards. Cards carry key/value detail rows and an optional alert footer
  (the BannerInline accent semantics, reused via the --fp-banner-accent tokens).

  A generic, static layout template (no drag-and-drop) — its job is to constrain
  prompt-built boards to the right anatomy, spacing, and color taxonomy.
*/

type LaneColor =
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

type AlertStatus = "default" | "caution" | "warning" | "success";

const ALERT_ACCENT: Record<AlertStatus, string> = {
  default: "text-foreground",
  caution: "text-fp-banner-accent-caution",
  warning: "text-fp-banner-accent-warning",
  success: "text-fp-banner-accent-success",
};

interface CardField {
  value: string;
  label: string;
}

interface KanbanCard {
  fields: CardField[];
  /** Optional alert footer. With `button` it splits left/right; without, it centers. */
  alert?: { status: AlertStatus; button?: boolean };
}

interface Lane {
  color: LaneColor;
  title: string;
  cards: KanbanCard[];
}

/** Generic placeholder data — the template, not a domain board. */
const FIELDS: CardField[] = [
  { value: "Details", label: "Data Label" },
  { value: "Details", label: "Data Label" },
  { value: "Details", label: "Data Label" },
];

const LANES: Lane[] = [
  {
    color: "grey",
    title: "Header Title Lane 1",
    cards: [
      { fields: FIELDS },
      { fields: FIELDS, alert: { status: "success" } },
      { fields: FIELDS },
    ],
  },
  {
    color: "blue",
    title: "Header Title Lane 2",
    cards: [{ fields: FIELDS, alert: { status: "caution", button: true } }, { fields: FIELDS }],
  },
  {
    color: "yellow",
    title: "Header Title Lane 3",
    cards: [{ fields: FIELDS }, { fields: FIELDS, alert: { status: "warning", button: true } }],
  },
  {
    color: "green",
    title: "Header Title Lane 4",
    cards: [{ fields: FIELDS, alert: { status: "default" } }],
  },
];

/** A card's key/value detail rows — value (foreground) over label (muted). */
function CardFields({ fields }: { fields: CardField[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {fields.map((f, i) => (
        <div key={i} className="flex flex-col">
          <span className="text-sm text-foreground">{f.value}</span>
          <span className="text-xs text-muted-foreground">{f.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Card alert footer — Info icon + accent text, split by a divider. Two
 * variants: with a Button (left/right split) or without (centered).
 */
function CardAlert({ status, button }: { status: AlertStatus; button?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-fp-outline-1 px-3 py-2",
        button ? "justify-between" : "justify-center"
      )}
    >
      <span className={cn("flex items-center gap-2 text-xs", ALERT_ACCENT[status])}>
        <Info className="size-4 shrink-0" />
        Make more happen
      </span>
      {button && (
        <Button variant="outline" size="xs">
          Button
        </Button>
      )}
    </div>
  );
}

function Card({ card }: { card: KanbanCard }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        // A card is a clickable surface; the full state set:
        // default → hover (brighter outline + lift) → focus → active.
        "cursor-pointer overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a outline-none transition-[color,border-color,box-shadow]",
        "hover:border-fp-outline-2 hover:shadow-fp-surface",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        "active:border-fp-outline-2 active:bg-fp-card-1"
      )}
    >
      <div className="space-y-3 p-3">
        <h4 className="text-sm font-semibold text-foreground">Card Title</h4>
        <CardFields fields={card.fields} />
      </div>
      {card.alert && <CardAlert status={card.alert.status} button={card.alert.button} />}
    </div>
  );
}

function KanbanLane({ lane }: { lane: Lane }) {
  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col overflow-hidden rounded-md bg-fp-lane">
      {/* Colored top strip */}
      <div className={cn("h-1 w-full shrink-0", LANE_BG[lane.color])} />
      {/* Lane header */}
      <div className="flex shrink-0 items-center gap-2 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{lane.title}</h3>
        <span
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-full text-[11px] font-medium text-white",
            LANE_BG[lane.color]
          )}
        >
          {lane.cards.length}
        </span>
        <button
          type="button"
          aria-label="Sort lane"
          className="ml-auto rounded-sm p-1 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowDownUp className="size-4" />
        </button>
      </div>
      {/* Card stack */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        {lane.cards.map((card, i) => (
          <Card key={i} card={card} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  return (
    <div className="flex h-full min-h-0 gap-4 overflow-x-auto pb-1">
      {LANES.map((lane) => (
        <KanbanLane key={lane.title} lane={lane} />
      ))}
    </div>
  );
}
