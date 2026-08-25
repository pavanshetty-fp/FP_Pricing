/**
 * Fuel-Orders adapter over the DS's bulk-edit primitives.
 *
 * The shell, the identity table, the before/after preview and the standing-load
 * card all moved into `src/components/bulk-edit/` — they were never
 * Fuel-Orders-specific. This file now only maps this screen's vocabulary onto
 * the generic ones.
 */
import {
  BulkEditDialog as DsBulkEditDialog,
  BeforeAfterTable as DsBeforeAfterTable,
  RecordMiniTable,
  StandingItems,
  type BulkEditDialogProps as DsBulkEditDialogProps,
  type RecordRef,
} from "@/components/bulk-edit";

/** Order identity as every summary table renders it. */
export interface OrderRef {
  orderNo: string;
  typeLabel: string;
  shipTo: string;
}

const toRecord = (o: OrderRef): RecordRef => ({
  id: o.orderNo,
  cells: [o.typeLabel, o.shipTo],
});

const ORDER_HEADERS = ["Order No", "Order Type", "ShipTo/Terminal"];

export function OrderMiniTable({ orders }: { orders: OrderRef[] }) {
  return <RecordMiniTable records={orders.map(toRecord)} headers={ORDER_HEADERS} />;
}

export function BeforeAfterTable({
  rows,
  valueHeader,
}: {
  rows: { orderNo: string; before: string; after: string }[];
  valueHeader: string;
}) {
  return (
    <DsBeforeAfterTable
      rows={rows.map((r) => ({ id: r.orderNo, before: r.before, after: r.after }))}
      valueHeader={valueHeader}
      idHeader="Order No"
    />
  );
}

export function StandingLoad({ name, orders }: { name: string; orders: OrderRef[] }) {
  const n = orders.length;
  return (
    <StandingItems
      label={name}
      records={orders.map(toRecord)}
      headers={ORDER_HEADERS}
      itemNoun="order"
      summary={
        n === 0
          ? "No orders assigned"
          : `${n} ${n === 1 ? "order" : "orders"} already assigned`
      }
    />
  );
}

export type BulkEditDialogProps = Omit<DsBulkEditDialogProps, "itemNoun">;

export function BulkEditDialog(props: BulkEditDialogProps) {
  return <DsBulkEditDialog {...props} itemNoun="order" />;
}
