import * as React from "react";
import { FileText } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DATE_FMT } from "../unified-view/data";
import {
  assetById,
  lineQty,
  quantityOf,
  quantityText,
  type FlagLevel,
  type OrderRequest,
  type RequestLine,
} from "./orders";

/*
  THE LINE BREAKDOWN, FROM ANY OF ITS COLUMNS (Pavan, 2026-10-13). A request
  with two tanks prints one total; pressing the Tanks & assets, Product or
  Quantity cell opens the same facts — which tank, which product, how many
  gallons — ordered by the column it was opened from:

    Tanks & assets  each tank → its product and quantity
    Product         each product → its total, then its tanks
    Quantity        the total → each line's quantity, tank and product

  ON PRESS, not hover — touch cannot hover (interactions §3b).
*/

const TRIGGER =
  "flex min-w-0 max-w-full items-center gap-1.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const assetName = (l: RequestLine) => assetById(l.assetId)?.name ?? "No tank";

function Breakdown({
  trigger,
  label,
  align = "start",
  children,
}: {
  trigger: React.ReactNode;
  label: string;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className={TRIGGER}>
          {trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-0">
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** One row of a breakdown: what leads, what follows, a figure at the end. */
function Row({ lead, sub, value }: { lead: string; sub?: string; value?: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 px-3 py-2">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-foreground">{lead}</span>
        {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
      {value && <span className="shrink-0 text-sm tabular-nums text-foreground">{value}</span>}
    </li>
  );
}

const Head = ({ title, value }: { title: string; value?: string }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-border bg-fp-table-header px-3 py-2">
    <span className="text-xs font-medium text-muted-foreground">{title}</span>
    {value && <span className="text-xs font-medium tabular-nums text-foreground">{value}</span>}
  </div>
);

/** First value, then "+N" as a pill — the OverflowList's face. */
function Face({ values }: { values: string[] }) {
  const [first, ...rest] = values;
  return (
    <>
      <span className="truncate text-sm text-foreground">{first}</span>
      {rest.length > 0 && <Pill className="shrink-0 tabular-nums">+{rest.length}</Pill>}
    </>
  );
}

export function AssetsCell({ r }: { r: OrderRequest }) {
  const lines = r.lines.filter((l) => l.assetId || l.product);
  if (lines.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <Breakdown
      label={`Show tanks and assets of ${r.requestNo}`}
      trigger={<Face values={lines.map(assetName)} />}
    >
      <Head title="Tank / asset" value="Quantity" />
      <ul className="divide-y divide-border">
        {lines.map((l, i) => (
          <Row key={i} lead={assetName(l)} sub={l.product || "No product"} value={lineQty(l)} />
        ))}
      </ul>
    </Breakdown>
  );
}

export function ProductsCell({ r }: { r: OrderRequest }) {
  const groups = new Map<string, RequestLine[]>();
  for (const l of r.lines) {
    if (!l.product) continue;
    groups.set(l.product, [...(groups.get(l.product) ?? []), l]);
  }
  if (groups.size === 0) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <Breakdown
      label={`Show products of ${r.requestNo}`}
      trigger={<Face values={[...groups.keys()]} />}
    >
      {[...groups].map(([product, lines]) => (
        <div key={product}>
          <Head title={product} value={quantityText(lines) ? `${quantityText(lines)} gal` : undefined} />
          <ul className="divide-y divide-border">
            {lines.map((l, i) => (
              <Row key={i} lead={assetName(l)} value={lineQty(l)} />
            ))}
          </ul>
        </div>
      ))}
    </Breakdown>
  );
}

export function QuantityCell({ r }: { r: OrderRequest }) {
  const text = quantityText(r.lines);
  if (!text) return <span className="text-sm text-muted-foreground">—</span>;
  const { gal } = quantityOf(r.lines);
  return (
    <div className="flex justify-end">
      <Breakdown
        align="end"
        label={`Show quantity breakdown of ${r.requestNo}`}
        trigger={<span className="truncate text-sm tabular-nums text-foreground">{text}</span>}
      >
        <Head title="Total" value={gal > 0 ? `${gal.toLocaleString()} gal` : "Top off"} />
        <ul className="divide-y divide-border">
          {r.lines.map((l, i) => (
            <Row
              key={i}
              lead={lineQty(l)}
              sub={`${assetName(l)} · ${l.product || "No product"}`}
            />
          ))}
        </ul>
      </Breakdown>
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
  return (
    <Breakdown
      label={`Show flags of ${r.requestNo}`}
      trigger={
        <>
          <span className={cn("truncate text-sm", FLAG_TEXT[first.level])}>{first.kind}</span>
          {rest.length > 0 && (
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">+{rest.length}</span>
          )}
        </>
      }
    >
      <Head title="Flags" />
      <ul className="divide-y divide-border">
        {flags.map((f, i) => (
          <li key={i} className="flex flex-col gap-0.5 px-3 py-2">
            <span className={cn("text-sm font-medium", FLAG_TEXT[f.level])}>{f.kind}</span>
            <span className="text-sm text-foreground">{f.detail}</span>
          </li>
        ))}
      </ul>
    </Breakdown>
  );
}

export function DocumentsCell({ r }: { r: OrderRequest }) {
  const n = r.documents.length;
  if (n === 0) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <Breakdown
      label={`Show documents of ${r.requestNo}`}
      trigger={
        <>
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm text-foreground">{n === 1 ? "1 document" : `${n} documents`}</span>
        </>
      }
    >
      <Head title="Documents" />
      <ul className="divide-y divide-border">
        {r.documents.map((d) => (
          <Row
            key={d.id}
            lead={d.name}
            sub={`${d.kind} · ${d.by} · ${DATE_FMT.format(new Date(d.at))}`}
          />
        ))}
      </ul>
    </Breakdown>
  );
}
