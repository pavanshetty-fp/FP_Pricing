import { FileText, Repeat } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { DATE_FMT } from "../unified-view/data";
import { BreakdownPopover, OverflowChip } from "../unified-view/BreakdownCard";
import { OverflowList } from "../unified-view/ListTable";
import {
  type Asset,
  type ShipTo,
  assetById,
  lineQty,
  quantityOf,
  quantityText,
  type FlagLevel,
  type OrderRequest,
  type RequestLine,
} from "./orders";

/*
  THE LINE BREAKDOWN — the Unified View's way, which is the source of truth
  (Pavan, 2026-10-14): the "+N" CHIP opens the shared BreakdownCard on CLICK,
  above the cell; where the whole cell is the figure (a quantity, a count),
  the figure opens it. Rows carry a sub-line where there is more to say.

    Tanks & assets  each tank → its product, and the quantity
    Product         each product → its tanks, and the quantity
    Quantity        each line → its tank and product, and the total
*/

const assetName = (l: RequestLine) => assetById(l.assetId)?.name ?? "No tank";
const dash = <span className="text-sm text-muted-foreground">—</span>;

export function AssetsCell({ r }: { r: OrderRequest }) {
  const lines = r.lines.filter((l) => l.assetId || l.product);
  if (lines.length === 0) return dash;
  return (
    <OverflowList
      values={lines.map(assetName)}
      label="tanks and assets"
      rows={lines.map((l) => ({ label: assetName(l), sub: l.product || "No product", value: lineQty(l) }))}
    />
  );
}

export function ProductsCell({ r }: { r: OrderRequest }) {
  const groups = new Map<string, RequestLine[]>();
  for (const l of r.lines) {
    if (!l.product) continue;
    groups.set(l.product, [...(groups.get(l.product) ?? []), l]);
  }
  if (groups.size === 0) return dash;
  return (
    <OverflowList
      values={[...groups.keys()]}
      label="products"
      rows={[...groups].map(([product, lines]) => ({
        label: product,
        sub: lines.map(assetName).join(", "),
        value: quantityText(lines) || undefined,
      }))}
    />
  );
}

export function QuantityCell({ r }: { r: OrderRequest }) {
  const text = quantityText(r.lines);
  if (!text) return dash;
  const { gal } = quantityOf(r.lines);
  const face = <span className="truncate text-sm tabular-nums text-foreground">{text}</span>;
  /* ONE LINE HAS NOTHING TO BREAK DOWN — plain text, no dead trigger. */
  if (r.lines.length < 2) return <div className="flex justify-end">{face}</div>;
  return (
    <div className="flex justify-end">
      <BreakdownPopover
        align="end"
        className="rounded-sm"
        label={`Show quantity breakdown of ${r.requestNo}`}
        trigger={face}
        card={{
          title: "Quantity by tank",
          rows: r.lines.map((l) => ({ label: assetName(l), sub: l.product || "No product", value: lineQty(l) })),
          total: { label: "Total", value: gal > 0 ? `${gal.toLocaleString()} gal` : "Top off" },
        }}
      />
    </div>
  );
}

/*
  FLAGS ARE PLAIN TEXT, coloured by how much they matter (Pavan,
  2026-10-13): red critical · amber warning · plain for a note.
*/
const FLAG_TEXT: Record<FlagLevel, string> = {
  critical: "text-status-failed",
  warning: "text-status-processing",
  info: "text-foreground",
};

export function FlagsCell({ r }: { r: OrderRequest }) {
  if (r.flags.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
  /* The most serious leads. */
  const order: FlagLevel[] = ["critical", "warning", "info"];
  const flags = [...r.flags].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
  const [first, ...rest] = flags;
  /* THE FLAG IS THE CELL, so the flag opens it — its detail lives in the card. */
  return (
    <BreakdownPopover
      className="flex min-w-0 max-w-full items-center gap-1.5 rounded-md text-left"
      label={`Show flags of ${r.requestNo}`}
      trigger={
        <>
          <span className={cn("truncate text-sm", FLAG_TEXT[first.level])}>{first.kind}</span>
          {rest.length > 0 && <Pill className="shrink-0 tabular-nums">+{rest.length}</Pill>}
        </>
      }
      card={{ title: `Flags (${flags.length})`, rows: flags.map((f) => ({ label: f.kind, sub: f.detail })) }}
    />
  );
}

export function DocumentsCell({ r }: { r: OrderRequest }) {
  const n = r.documents.length;
  if (n === 0) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <BreakdownPopover
      className="flex items-center gap-1.5 rounded-md"
      label={`Show documents of ${r.requestNo}`}
      width={320}
      trigger={
        <>
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm text-foreground">{n === 1 ? "1 document" : `${n} documents`}</span>
        </>
      }
      card={{
        title: `Documents (${n})`,
        rows: r.documents.map((d) => ({ label: d.name, sub: `${d.kind} · ${d.by} · ${DATE_FMT.format(new Date(d.at))}` })),
      }}
    />
  );
}

/* ------------------------------------------------- sites & assets --- */

/*
  THE SAME BREAKDOWN ON SITES & ASSETS (Pavan, 2026-10-14) — the "+N" chip
  opens the shared card on click. CAPACITY, not quantity: how much ONE asset
  holds — always an asset's, never summed for a ship-to or a product. Orders
  keep Quantity: that is what was requested.

    Assets     each asset → its products, and its capacity
    Products   each product → the assets that take it, each with its capacity
*/
const gal = (n: number) => `${n.toLocaleString()} gal`;

export function ShipToAssetsCell({ s }: { s: ShipTo }) {
  if (s.assets.length === 0) return dash;
  /* A TABLE, as the Products box (Pavan, 2026-10-14): Asset · Type ·
     Products · Capacity. */
  const [first, ...rest] = s.assets;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-sm text-foreground">{first.name}</span>
      {rest.length > 0 && (
        <OverflowChip
          count={rest.length}
          label={`Show all ${s.assets.length} assets`}
          width={500}
          card={{
            title: `All assets (${s.assets.length})`,
            rows: [],
            table: {
              columns: [{ label: "Asset" }, { label: "Type" }, { label: "Products" }, { label: "Capacity", align: "right" }],
              groups: [
                {
                  label: "",
                  rows: s.assets.map((a) => [
                    a.name,
                    a.type,
                    a.products.join(", ") || "No product",
                    a.capacity > 0 ? gal(a.capacity) : "No tank",
                  ]),
                },
              ],
            },
          }}
        />
      )}
    </div>
  );
}

export function ShipToProductsCell({ s }: { s: ShipTo }) {
  const groups = new Map<string, Asset[]>();
  for (const a of s.assets) for (const p of a.products) groups.set(p, [...(groups.get(p) ?? []), a]);
  if (groups.size === 0) return dash;
  /* GROUPED BY PRODUCT, AS A TABLE (Pavan, 2026-10-14): under each product,
     its assets — type and capacity. */
  const [first, ...rest] = [...groups.keys()];
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-sm text-foreground">{first}</span>
      {rest.length > 0 && (
        <OverflowChip
          count={rest.length}
          label={`Show all ${groups.size} products`}
          width={420}
          card={{
            title: `All products (${groups.size})`,
            rows: [],
            table: {
              columns: [{ label: "Asset" }, { label: "Type" }, { label: "Capacity", align: "right" }],
              groups: [...groups].map(([product, assets]) => ({
                label: product,
                rows: assets.map((a) => [a.name, a.type, a.capacity > 0 ? gal(a.capacity) : "No tank"]),
              })),
            },
          }}
        />
      )}
    </div>
  );
}

/** A list of values behind "+N" — the asset's products or categories. */
export function ValuesCell({ values, label }: { values: string[]; label: string }) {
  return <OverflowList values={values} label={label} />;
}

/** MADE BY A RULE (Pavan, 2026-10-16) — the rule's number, on the order it
    made, in the Repeats column and the order sheet's header. */
export function RulePill({ ruleNo }: { ruleNo: string }) {
  return (
    <Pill color="purple" className="shrink-0">
      <Repeat className="size-3" />
      {ruleNo}
    </Pill>
  );
}
