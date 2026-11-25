import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { TwoLineCell, type ListColumn } from "../ListTable";
import type { ListFacet } from "../ListFilters";
import { StandardList } from "../StandardList";
import { fitColumns } from "./fitColumns";
import { kindTone } from "../statusKind";
import { fmtWhen, uniq } from "./changeLog";
import { useChangeLog } from "./changeLogStore";
import { feesOnOrder, useFees, useHubMap } from "./fees";
import { OrderDetailsSheet, useFeeOrders } from "./OrderDetails";
import { ORDER_STATUS_KIND, money2, orderFactsOf, orderLabel, type PricedOrder } from "./orderTrace";

/*
  ORDER WELL, FOR THE FEE DEMO (Yash, 2026-11-24) — a few orders to open:
  every one still to deliver today, and the latest delivered. A row opens the
  order's details, where review fees are applied.
*/

type K = "order" | "customer" | "shipto" | "product" | "status" | "when" | "gallons" | "fees" | "total";
const COLUMNS: ListColumn<K>[] = [
  { key: "order", label: "Order", width: 140, sortable: true },
  { key: "customer", label: "Customer · ship-to", width: 240, sortable: true },
  { key: "product", label: "Product", width: 180, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
  { key: "when", label: "Planned / delivered", width: 170, sortable: true },
  { key: "gallons", label: "Gallons", width: 110, sortable: true },
  { key: "fees", label: "Fees", width: 170, sortable: true },
  { key: "total", label: "Total", width: 130, sortable: true },
];

export function OrderWellScreen() {
  const all = useFeeOrders();
  const log = useChangeLog();
  const store = useFees();
  const hub = useHubMap(log.rows, log.entityMap);
  /* A FEW OF EACH (Yash, 2026-11-24) — today's scheduled, and the latest
     delivered and invoiced; a segment picks one status. */
  const [segment, setSegment] = React.useState("all");
  const picked = React.useMemo(() => {
    const ids = new Set([
      ...all.filter((o) => o.status === "Scheduled").slice(0, 12),
      ...all.filter((o) => o.status === "Delivered").slice(0, 12),
      ...all.filter((o) => o.status === "Invoiced").slice(0, 12),
    ].map((o) => o.id));
    return ids;
  }, [all.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = React.useMemo(() => all.filter((o) => picked.has(o.id)), [all, picked]);
  const orders = React.useMemo(() => (segment === "all" ? shown : shown.filter((o) => o.status === segment)), [shown, segment]);
  const [openId, setOpenId] = React.useState<string | null>(null);
  /* Fees on each order: how many, and how many wait for review. */
  const feeCount = React.useCallback(
    (o: PricedOrder) => {
      const row = log.rows.find((r) => r.id === o.rowId);
      const fs = row ? feesOnOrder(o.id, row, hub(row.shiptoId), orderFactsOf(o), store) : [];
      return { all: fs.filter((x) => x.state !== "offered").length, review: fs.filter((x) => x.state === "offered").length };
    },
    [log.rows, hub, store]
  );
  const text = (o: PricedOrder, key: K): string => {
    const n = orderLabel(o);
    switch (key) {
      case "order":
        return o.id;
      case "customer":
        return n.customer;
      case "shipto":
        return n.shipto;
      case "product":
        return n.product;
      case "status":
        return o.status;
      case "when":
        return fmtWhen(o.deliveredAt);
      case "gallons":
        return o.gallons.toLocaleString();
      case "fees": {
        const c = feeCount(o);
        return `${c.all} fees${c.review ? ` · ${c.review} to review` : ""}`;
      }
      case "total":
        return money2(o.total);
    }
  };
  const columns = React.useMemo(() => fitColumns(COLUMNS, orders.slice(0, 25), (o, key) => [text(o, key)], ["status", "fees"]), [orders, feeCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const facets: ListFacet[] = [
    ...(["customer", "product"] as K[]).map((key) => ({
      key,
      label: key === "customer" ? "Customer" : "Product",
      options: uniq(shown.map((o) => text(o, key))).sort(),
      searchable: true,
    })),
    { key: "review", label: "Fees to review", options: ["Yes", "No"] },
    { key: "orderType", label: "Order type", options: ["Delivery", "Extraction"] },
  ];
  return (
    <>
      <StandardList<PricedOrder, K>
        rows={orders}
        columns={columns}
        rowId={(o) => o.id}
        text={text}
        sortValue={(o, key) => (key === "when" ? o.deliveredAt : key === "gallons" ? o.gallons : key === "total" ? o.total : undefined)}
        renderCell={(o, key) => {
          if (key === "status")
            return (
              <StatusChip tone={kindTone(ORDER_STATUS_KIND[o.status])} variant="text">
                {o.status}
              </StatusChip>
            );
          if (key === "fees") {
            const c = feeCount(o);
            return (
              <span className="flex items-center gap-1.5">
                {c.all} fees
                {c.review > 0 && <Pill kind="caution">{c.review} to review</Pill>}
              </span>
            );
          }
          if (key === "customer") return <TwoLineCell title={text(o, "customer")} description={text(o, "shipto")} />;
          return <span className="block min-w-0 truncate">{text(o, key)}</span>;
        }}
        facets={facets}
        facetValues={(o, f) => (f === "review" ? [feeCount(o).review ? "Yes" : "No"] : f === "orderType" ? [o.orderType] : [text(o, f as K)])}
        segments={[
          { key: "all", label: "All" },
          { key: "Scheduled", label: "Scheduled" },
          { key: "Delivered", label: "Delivered" },
          { key: "Invoiced", label: "Invoiced" },
        ]}
        segmentValue={segment}
        onSegmentChange={setSegment}
        storageKey="pricing-order-well"
        noun="orders"
        nounOne="order"
        searchPlaceholder="Search orders…"
        onOpen={(o) => setOpenId(o.id)}
        openLabel={(o) => `Open ${o.id}`}
        emptyIcon={<ClipboardList />}
      />
      <OrderDetailsSheet order={orders.find((o) => o.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </>
  );
}
