import * as React from "react";
import { Pill } from "@/components/ui/pill";
import { type CodeDiscTone } from "@/components/ui/code-disc";
import { type StatusTone } from "@/components/ui/status-chip";
import { BreakdownPopover, OverflowChip } from "./BreakdownCard";
import type {
  FuelOrderStatus,
  OrderTypeCode,
  ProductQty,
  PlannedAt,
} from "./types";
import { statusTones } from "./statusKind";
import { useUnitShort } from "./salesSettings";

/*
  THE FUEL ORDER CELLS (Pavan, 2026-10-07). The Fuel Orders table went when
  Fuel and Asset Orders became one Orders page (`SalesOrdersScreen`); its
  fuel cells and its type and status mappings live on here, and that page's
  table renders a fuel row with them.
*/

const QTY_FMT = new Intl.NumberFormat("en-US");

/*
  The two mappings below are ALL this screen owns about type and status. The
  rendering lives in the DS (`CodeDisc`, `StatusChip`); the DS ships hues and
  channels and binds no meaning to them, so declaring the meaning is the
  application's job. This is the same split the DS's own table uses via
  `statusTone` in tables-layout/data.ts.
*/

/** Order type → pastel hue. */
export const TYPE_TONE: Record<OrderTypeCode, CodeDiscTone> = {
  D: "pastel-blue",
  E: "pastel-amber",
};

/** Order status → colour channel. Exported so the map view reads a status the
 *  same way the table does rather than keeping a second copy of the mapping. */
export const STATUS_TONE: Record<FuelOrderStatus, StatusTone> = statusTones({
  /* Waiting on a dispatcher to schedule it. */
  Requested: "caution",
  /* True, and asks nothing — not finished. */
  Scheduled: "info",
  Dispatched: "info",
  Delivered: "success",
  /* Not a warning — grey, never red. */
  Cancelled: "neutral",
});

/** Planned date over planned time. Em-dash when nothing is planned yet. */
export function PlannedCell({ planned }: { planned: PlannedAt | null }) {
  if (!planned) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm text-foreground">{planned.date}</span>
      <span className="truncate text-xs tabular-nums text-muted-foreground">
        {planned.time}
      </span>
    </div>
  );
}

/**
 * Product cell — comma-separated names, truncated to whatever the column can
 * actually hold, with the remainder collapsed into a "+N" chip that reveals the
 * full list on hover.
 *
 * Width-driven rather than a fixed count: the column is a fixed 220px but names
 * run from "123" to "200* Diesel Onroad clear", so any fixed count either wastes
 * the cell or overflows it. An invisible sibling measures the real joined string
 * (and the real chip) so the fit is exact rather than estimated, and the count is
 * recomputed whenever the cell resizes. `truncate` on the visible span is the
 * safety net if a measurement is ever momentarily stale.
 */
export function ProductCell({ products }: { products: ProductQty[] }) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = React.useState(products.length);

  React.useLayoutEffect(() => {
    const row = rowRef.current;
    const probe = textRef.current;
    const measure = measureRef.current;
    if (!row || !probe || !measure) return;

    const names = products.map((p) => p.name);

    const compute = () => {
      const avail = row.clientWidth;
      if (!avail) return;
      // The chip is only present when something is actually hidden; measure the
      // real element (its width changes with the digit count) plus the flex gap.
      const chip = measure.lastElementChild as HTMLElement | null;
      const chipW = chip ? chip.offsetWidth + 4 : 0;

      // Walk down from "all of them" to the largest prefix that fits.
      let fit = 1;
      for (let k = names.length; k >= 1; k--) {
        probe.textContent = names.slice(0, k).join(", ");
        const needed = probe.offsetWidth + (k < names.length ? chipW : 0);
        if (needed <= avail) {
          fit = k;
          break;
        }
      }
      setVisible(fit);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(row);
    return () => ro.disconnect();
  }, [products]);

  const hidden = products.length - visible;

  return (
    <div
      ref={rowRef}
      className="relative flex min-w-0 items-center gap-1 overflow-hidden"
    >
      <span className="truncate text-sm text-foreground">
        {products
          .slice(0, visible)
          .map((p) => p.name)
          .join(", ")}
      </span>

      {hidden > 0 && (
        /* ON CLICK, the shared way (Pavan, 2026-10-14). */
        <OverflowChip
          count={hidden}
          label={`Show all ${products.length} products`}
          width={260}
          card={{ title: `All products (${products.length})`, rows: products.map((p) => ({ label: p.name })) }}
        />
      )}

      {/* Measurement only — never painted, never hit-tested, out of the a11y tree. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 flex items-center gap-1 whitespace-nowrap"
      >
        <span ref={textRef} className="text-sm" />
        <Pill className="tabular-nums">
          +{Math.max(1, products.length - 1)}
        </Pill>
      </div>
    </div>
  );
}

/**
 * Tags cell — badges, as many as genuinely fit, remainder behind a "+N" chip.
 *
 * Same measured approach as ProductCell but measuring BADGES rather than a
 * joined string, and capped at two even when more would fit: a row of tags is
 * scannable at two and becomes noise past that.
 */
const TAGS_MAX = 2;

export function TagsCell({ tags }: { tags: string[] }) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(Math.min(tags.length, TAGS_MAX));

  React.useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure || tags.length === 0) return;

    const compute = () => {
      const avail = row.clientWidth;
      if (!avail) return;
      const kids = [...measure.children] as HTMLElement[];
      const badges = kids.slice(0, tags.length);
      const chip = kids[tags.length];
      const chipW = chip ? chip.offsetWidth + 4 : 0;

      let fit = 0;
      let used = 0;
      for (let i = 0; i < Math.min(badges.length, TAGS_MAX); i++) {
        const w = badges[i].offsetWidth + (i > 0 ? 4 : 0);
        const remains = i < tags.length - 1;
        if (used + w + (remains ? chipW : 0) > avail) break;
        used += w;
        fit = i + 1;
      }
      // Always show at least one tag; it truncates rather than vanishing.
      setVisible(Math.max(1, fit));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(row);
    return () => ro.disconnect();
  }, [tags]);

  if (tags.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const hidden = tags.length - visible;

  return (
    <div
      ref={rowRef}
      className="relative flex min-w-0 items-center gap-1 overflow-hidden"
    >
      {tags.slice(0, visible).map((t) => (
        <Pill key={t} className="min-w-0 truncate">
          {t}
        </Pill>
      ))}

      {hidden > 0 && (
        <OverflowChip
          count={hidden}
          label={`Show all ${tags.length} tags`}
          width={220}
          card={{ title: `All tags (${tags.length})`, rows: tags.map((t) => ({ label: t })) }}
        />
      )}

      {/* Measurement only — never painted, never hit-tested. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 flex items-center gap-1 whitespace-nowrap"
      >
        {tags.map((t) => (
          <Pill key={t}>
            {t}
          </Pill>
        ))}
        <Pill className="tabular-nums">
          +{Math.max(1, tags.length - 1)}
        </Pill>
      </div>
    </div>
  );
}

/**
 * Qty cell — the row total, with a per-product gallon breakdown on hover when
 * the order has more than one product line. Single-line orders have nothing to
 * break down, so they stay plain text rather than offering a dead trigger.
 */
export function QtyCell({ products, total }: { products: ProductQty[]; total: number }) {
  const amount = QTY_FMT.format(total);
  /* THE PRIMARY UNIT'S LABEL — Sales Settings › Preferences (2026-10-07). */
  const unit = useUnitShort();

  if (products.length < 2) {
    return (
      <span className="text-sm text-foreground">
        <span className="font-medium tabular-nums">{amount}</span>{" "}
        <span className="text-xs text-muted-foreground">{unit}</span>
      </span>
    );
  }

  /* THE WHOLE CELL IS THE FIGURE, so the figure is what opens it — on
     click, the shared way (Pavan, 2026-10-14). The underline stays on the
     number alone. */
  return (
    <BreakdownPopover
      className="group/qty rounded-sm text-sm text-foreground"
      label={`${amount} ${unit} across ${products.length} products`}
      card={{
        title: "Quantity by product",
        rows: products.map((p) => ({ label: p.name, value: QTY_FMT.format(p.gal) })),
        total: { label: "Total", value: QTY_FMT.format(total) },
      }}
      trigger={
        <>
          <span className="font-medium tabular-nums underline-offset-4 group-hover/qty:underline group-focus-visible/qty:underline">
            {amount}
          </span>{" "}
          <span className="text-xs text-muted-foreground">{unit}</span>
        </>
      }
    />
  );
}
