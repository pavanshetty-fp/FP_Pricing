import * as React from "react";
import { DetailViewMenuItem } from "../RecordSheet";
import { toast } from "sonner";
import { Archive, CheckCircle2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordSheet } from "../RecordSheet";
import { BarColumns } from "../DashboardParts";
import { DirectoryRecordSheet } from "../threepl/DirectoryRecordSheet";
import { customerHeaderAside } from "../threepl/CustomerRecord";
import type { FormSectionDef } from "../threepl/directoryFormTypes";
import { formatDate } from "../threepl/directoryCore";
import { currentAssets } from "./AssetsScreen";
import { figuresOf, gal, monthsOf, ordersOf, regionOf, type MdCustomer } from "./customers";
import { CustomerViews } from "./CustomerViews";
import { CustomerCards } from "./CustomerDetails";
import { FIGURE_STRIP, Figure, Trend, WORK_AREA, useDockedWorkArea, wholeMoney } from "./sheetParts";

/*
  CUSTOMER 360 (Pavan, 2026-11-03 — the Lovable reference's Customer 360,
  on Asset 360's sheet):
    · header — the customer, its main contact and region, its status and
      credit pills (the 3PL customer sheet's — same fact, same form);
    · four figures across — revenue, gross margin, gallons delivered, open
      orders — then the two trends: volume and margin by month;
    · left, the views — every list the reference stacks down its page, as
      tabs under one search and filter bar (CustomerViews.tsx);
    · right, as the rail, a card per subject (CustomerDetails.tsx), each
      with Edit details opening the customer form over the sheet (autosaves).
  The figures and trends scroll away; the work area then docks.
*/

export function CustomerSheet({
  customer: c,
  form,
  onClose,
  onChange,
}: {
  customer: MdCustomer;
  /** The customer's form — Edit details opens it over this sheet. */
  form: FormSectionDef<MdCustomer>[];
  onClose: () => void;
  onChange: (next: MdCustomer) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const work = useDockedWorkArea();
  const assets = currentAssets();
  const orders = React.useMemo(() => ordersOf(c, assets), [c, assets]);
  const f = figuresOf(c, orders);
  const months = monthsOf(orders);
  const archived = c.status === "archived";

  const setArchived = (on: boolean) => {
    onChange({ ...c, status: on ? "archived" : "active" });
    toast.success(on ? "Customer archived" : "Customer restored");
    if (on) onClose();
  };

  return (
    <>
      <RecordSheet
        size="full"
        open
        onOpenChange={(o) => !o && onClose()}
        mode="edit"
        editTitle={`${c.name} · Customer 360`}
        createTitle=""
        createAction=""
        showCancel={false}
        stepNav={false}
        /* NO FOOTER — nothing here to confirm; Edit details autosaves. */
        noFooter
        headerSubtitle={
          <span className="text-sm text-muted-foreground">{[c.mainContactName, regionOf(c)].filter(Boolean).join(" · ")}</span>
        }
        headerAside={customerHeaderAside(c)}
        headerMenu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More customer actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DetailViewMenuItem />
              {archived ? (
                <DropdownMenuItem onSelect={() => setArchived(false)}>
                  <CheckCircle2 />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onSelect={() => setArchived(true)}>
                  <Archive />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        onSubmit={onClose}
      >
        <div className={FIGURE_STRIP}>
          <Figure label="Revenue (all modules)" value={wholeMoney(f.revenue)} note={`${f.orders} orders`} />
          <Figure label="Gross margin" value={wholeMoney(f.margin)} note={`${f.marginPct.toFixed(1)}% blended`} />
          <Figure label="Gallons delivered" value={f.gallons.toLocaleString()} note={`${f.deliveries} deliveries`} />
          <Figure label="Open orders" value={f.open} note={f.nextOpen ? `Next on ${formatDate(f.nextOpen)}` : "None scheduled"} />
        </div>

        <div className="grid shrink-0 gap-4 lg:grid-cols-2">
          <Trend title="Volume delivered by month" aside="Thousand gallons">
            <BarColumns
              height={96}
              data={months.map((m) => ({
                key: m.key,
                label: m.label,
                value: Math.round(m.gallons / 100) / 10,
                detail: `${gal(m.gallons)} · ${m.orders} orders`,
              }))}
            />
          </Trend>
          <Trend title="Margin by month" aside="Percent of revenue">
            <BarColumns
              height={96}
              data={months.map((m) => ({
                key: m.key,
                label: m.label,
                value: Math.round(m.marginPct * 10) / 10,
                detail: wholeMoney(m.margin),
              }))}
            />
          </Trend>
        </div>

        <div ref={work} className={WORK_AREA}>
          {/* LEFT — the views, under one filter bar. */}
          <CustomerViews customer={c} orders={orders} assets={assets} />
          {/* RIGHT, AS THE RAIL — a card per subject. */}
          <div className="flex min-h-0 flex-col gap-3 overflow-auto">
            <CustomerCards c={c} onEdit={() => setEditing(true)} />
          </div>
        </div>
      </RecordSheet>

      {/* EDIT DETAILS — the customer form, over the sheet; it autosaves. */}
      {editing && (
        <DirectoryRecordSheet<MdCustomer>
          level={2}
          open
          onOpenChange={(o) => !o && setEditing(false)}
          mode="edit"
          noun="Customer"
          title={`Edit ${c.name}`}
          recordKey={`${c.uid}-edit`}
          initial={c}
          sections={form}
          onAutosave={onChange}
          onClose={(latest) => latest && onChange(latest)}
          onSubmit={(draft) => {
            onChange(draft);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}
