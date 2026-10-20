import * as React from "react";
import { MapPin, Truck } from "lucide-react";

/*
  ONE ICON PER TERM, EVERY MODULE (Pavan, 2026-10-20). Wherever the app says
  deliveries, products, gallons or ship-tos — a figure, a menu item, a card
  heading — it draws this icon and no other, so the word and its picture stay
  one thing. Drawn in the accent (violet) on cards; inherits elsewhere.

  ONE STYLE FOR ALL FOUR: Lucide's grid and line (24, round caps and joins,
  current colour), each with a SOFT FILL of its own colour inside. The two
  that hold fluid — the drum (gallons) and the drop (products) — fill only to
  their level, and the level is a WAVE, not a straight line (Pavan's glass
  reference), so it reads as liquid.
*/

type IconProps = { className?: string; strokeWidth?: number };
const SOFT = 0.22;

/** A wavy liquid surface across x 3–21 at height `y`. */
const wave = (y: number) => `M3 ${y}c2 -1.3 4 -1.3 6 0s4 1.3 6 0s4 -1.3 6 0`;

function Liquid({
  body,
  level,
  className,
  strokeWidth = 2,
  extra,
}: IconProps & { body: string; level: number; extra?: React.ReactNode }) {
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <defs>
        <clipPath id={id}>
          <path d={body} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {/* THE FLUID — a soft fill under a wavy surface. */}
        <path d={`${wave(level)}V24H3Z`} fill="currentColor" fillOpacity={SOFT} stroke="none" />
        <path d={wave(level)} strokeWidth={strokeWidth * 0.8} />
      </g>
      {extra}
      <path d={body} />
    </svg>
  );
}

/*
  GALLONS — A METAL FUEL DRUM about 70% full (Pavan, 2026-10-20): a
  cylinder — an oval lid, straight sides, a rounded base — and nothing
  inside but its fluid.
*/
const DRUM = "M5 5.5v13a7 2.6 0 0 0 14 0v-13a7 2.6 0 0 0-14 0z";
export function DrumIcon(p: IconProps) {
  return (
    <Liquid
      {...p}
      body={DRUM}
      level={10.2}
      /* THE LID'S FRONT EDGE — the oval's near half, over the body. */
      extra={<path d="M5 5.5a7 2.6 0 0 0 14 0" />}
    />
  );
}

/* PRODUCTS — the drop, holding its fluid to about 60%. */
const DROP = "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z";
export function DropIcon(p: IconProps) {
  return <Liquid {...p} body={DROP} level={11.2} />;
}

/* DELIVERIES AND SHIP-TOS — Lucide's truck and pin, with the soft fill. */
export function TruckIcon({ className, strokeWidth }: IconProps) {
  return <Truck className={className} strokeWidth={strokeWidth} fill="currentColor" fillOpacity={SOFT} />;
}
export function PinIcon({ className, strokeWidth }: IconProps) {
  return <MapPin className={className} strokeWidth={strokeWidth} fill="currentColor" fillOpacity={SOFT} />;
}

export const TERM_ICONS: Record<"deliveries" | "products" | "gallons" | "shipTos", React.ComponentType<IconProps>> = {
  deliveries: TruckIcon,
  products: DropIcon,
  gallons: DrumIcon,
  shipTos: PinIcon,
};

/*
  METRIC ICON — THE TILE A FIGURE CARD WEARS (Pavan, 2026-10-20; DS ui §10k).
  For metric / figure cards on dashboards and overviews: a 48px rounded-lg
  tile in a very soft wash of the accent (violet at 6%), the term's icon at
  28px in the accent, a 1.75 line. It sits beside the figure, centred on the
  figure-and-change unit. A new metric that needs an icon draws one in the
  same style (Lucide's grid and line, a soft fill of its own colour, a wavy
  level for anything that holds liquid) and is added to `TERM_ICONS`.
*/
export function MetricIcon({ icon: Icon, className }: { icon: React.ComponentType<IconProps>; className?: string }) {
  return (
    <span
      aria-hidden
      className={[
        "flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent-violet/6 text-accent-violet",
        className ?? "",
      ].join(" ")}
    >
      <Icon className="size-7" strokeWidth={1.75} />
    </span>
  );
}
