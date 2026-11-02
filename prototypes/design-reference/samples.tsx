import * as React from "react";
import { Truck } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import {
  BannersDemo,
  BadgeDemo,
  ButtonDemo,
  BulkEditDemo,
  CalendarDemo,
  CheckboxDemo,
  ComboboxDemo,
  DatePickerDemo,
  DropdownMenuDemo,
  EmptyDemo,
  KbdDemo,
  LabelDemo,
  MetricIconsDemo,
  PopoverDemo,
  ProgressDemo,
  RadioGroupDemo,
  ScrollAreaDemo,
  SelectDemo,
  SeparatorDemo,
  SkeletonDemo,
  SliderDemo,
  SonnerDemo,
  SpinnerDemo,
  StatusChipDemo,
  StepsDemo,
  SwitchDemo,
  TabsDemo,
  TextareaDemo,
  ToggleDemo,
  ToggleGroupDemo,
  TooltipDemo,
  AvatarDemo,
  InputGroupDemo,
} from "@/components/component-demos";
import { StandardList } from "../unified-view/StandardList";
import type { ListColumn } from "../unified-view/ListTable";
import { type BoardLane } from "../unified-view/threepl/BrokerBoard";
import { BoardV2 } from "../unified-view/threepl/BoardV2";
import { ACTIVE_KIND, kindTone } from "../unified-view/statusKind";

/*
  LIVE EXAMPLES — the real FPDS code, with sample data. Every unit a list page
  is made of shows in one Standard list; the board shows a board; atoms and
  molecules reuse the DS gallery's demos. INVENTED data.
*/

type Vendor = { id: string; name: string; area: string; lines: string; status: "Active" | "Inactive"; orders: number };
type VK = "name" | "area" | "lines" | "orders" | "status" | "actions";
const VENDORS: Vendor[] = [
  ["V-3001", "Blue Mesa Hauling", "Arizona", "Transport", "Active", 30],
  ["V-3002", "Redline Carrier", "California", "Tank Wagon", "Active", 18],
  ["V-3003", "Pacific Freight", "California", "Transport", "Active", 42],
  ["V-3004", "Golden State Carriers", "California", "Packaged Goods", "Inactive", 0],
  ["V-3005", "Ironwood Logistics", "Nevada", "Transport", "Active", 11],
  ["V-3006", "Cypress Dispatch", "Arizona", "Lubes", "Active", 7],
  ["V-3007", "High Desert Fuel Logistics", "Nevada", "Tank Wagon", "Active", 24],
  ["V-3008", "Delta Hauling", "Texas", "Transport", "Inactive", 3],
].map(([id, name, area, lines, status, orders]) => ({ id, name, area, lines, status, orders }) as Vendor);

const VCOLS: ListColumn<VK>[] = [
  { key: "name", label: "Vendor", width: 220, sortable: true },
  { key: "area", label: "Service Area", width: 140, sortable: true },
  { key: "lines", label: "Business", width: 150, sortable: true },
  { key: "orders", label: "Assigned Orders", width: 140, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
  { key: "actions", label: "", width: 44 },
];

export function ListSample() {
  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-lg border border-border bg-fp-surface-1b p-4">
      <StandardList<Vendor, VK>
        rows={VENDORS}
        columns={VCOLS}
        rowId={(r) => r.id}
        text={(r, k) => (k === "orders" ? String(r.orders) : k === "actions" ? "" : String(r[k]))}
        sortValue={(r, k) => (k === "orders" ? r.orders : k === "actions" ? "" : String(r[k]))}
        renderCell={(r, k) =>
          k === "status" ? (
            <StatusChip tone={kindTone(ACTIVE_KIND(r.status === "Active"))}>{r.status}</StatusChip>
          ) : k === "name" ? (
            <span className="font-medium text-foreground">{r.name}</span>
          ) : k === "actions" ? null : (
            <span className="text-sm">{String(r[k])}</span>
          )
        }
        facets={[
          { key: "area", label: "Service Area", options: ["Arizona", "California", "Nevada", "Texas"] },
          { key: "lines", label: "Business", options: ["Transport", "Tank Wagon", "Packaged Goods", "Lubes"] },
          { key: "status", label: "Status", options: ["Active", "Inactive"] },
        ]}
        facetValues={(r, f) => [String(r[f as keyof Vendor])]}
        storageKey="fpds-reference-vendors"
        noun="vendors"
        nounOne="vendor"
        searchPlaceholder="Search vendors…"
        ctaLabel="Add Vendor"
        onCreate={() => {}}
        openLabel={(r) => `Open ${r.name}`}
        emptyIcon={<Truck />}
      />
    </div>
  );
}

const card = (id: string, customer: string, site: string, when: string, product: string, qty: string) => ({
  id,
  title: id,
  units: [
    { kind: "stack" as const, key: "c", heading: "Customer details", lines: [{ text: customer, level: 1 as const }, { text: site, level: 2 as const }] },
    { kind: "inline" as const, key: "s", heading: "Schedule", parts: [when] },
    { kind: "rows" as const, key: "p", heading: "Delivery product details", rows: [{ asset: product, qty }] },
  ],
});
const LANES: BoardLane[] = [
  { key: "orders", title: "Orders", color: "grey", cards: [card("D-105370", "Bray, Raymond and Marks", "Bray North Yard", "8:00 AM – 12:00 PM", "Dyed Diesel", "500 gal"), card("D-105371", "Morris Group", "Cardinal Hub A", "10:00 AM – 2:00 PM", "Unleaded 87", "1,200 gal")] },
  { key: "quoting", title: "Quoting", color: "blue", cards: [card("D-104634", "Gonzalez, Palmer and Miller", "Morris Yard 4", "1:00 PM – 5:00 PM", "Lube Skid", "1,200 gal")] },
  { key: "assigned", title: "Assigned", color: "yellow", cards: [card("D-104641", "Halvorsen Fuel Co.", "GPM Southside", "6:00 AM – 10:00 AM", "DEF Tote 2", "2,600 gal")] },
  { key: "completed", title: "Completed", color: "green", cards: [card("D-104648", "Cardinal Logistics", "Halvorsen Main", "Oct 22, 2026", "Main Bulk", "1,450 gal")] },
];

export function BoardSample() {
  return (
    <div className="flex h-[520px] flex-col gap-3 rounded-lg border border-border bg-fp-surface-1b p-4">
      {/* The view bar as the board wears it: the statement on the left. */}
      <div className="flex h-11 shrink-0 items-center rounded-md border border-border bg-fp-surface-1b px-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">5 orders</span>&nbsp;across 4 of 4 lanes · Thu, Oct 22, 2026
      </div>
      <div className="min-h-0 flex-1">
        <BoardV2 lanes={LANES} />
      </div>
    </div>
  );
}

/** Which live example a card shows — by id. */
export const LIVE: Record<string, () => React.ReactNode> = {
  "template.list-page": ListSample,
  "unit.standard-list": ListSample,
  "unit.view-row": ListSample,
  "unit.toolbar": ListSample,
  "unit.filter-panel": ListSample,
  "unit.chip-shelf": ListSample,
  "unit.view-bar": ListSample,
  "unit.data-table": ListSample,
  "unit.pagination": ListSample,
  "unit.board": BoardSample,
  "unit.date-picker": DatePickerDemo,
  "unit.alert-banner": BannersDemo,
  "unit.bulk-bar": BulkEditDemo,
  "unit.dashboard": MetricIconsDemo,
  "unit.status-and-awaiting": StatusChipDemo,
};

/** Atoms and molecules: the gallery demo whose name is in the id. */
const BY_WORD: [RegExp, () => React.ReactNode][] = [
  [/button/, ButtonDemo],
  [/badge/, BadgeDemo],
  [/pill/, BadgeDemo],
  [/status-chip|status/, StatusChipDemo],
  [/checkbox/, CheckboxDemo],
  [/radio/, RadioGroupDemo],
  [/switch/, SwitchDemo],
  [/slider/, SliderDemo],
  [/toggle-group/, ToggleGroupDemo],
  [/toggle/, ToggleDemo],
  [/select/, SelectDemo],
  [/textarea/, TextareaDemo],
  [/input|search-field/, InputGroupDemo],
  [/label/, LabelDemo],
  [/avatar/, AvatarDemo],
  [/tooltip|icon-tool/, TooltipDemo],
  [/popover|breakdown/, PopoverDemo],
  [/dropdown|menu/, DropdownMenuDemo],
  [/separator|divider/, SeparatorDemo],
  [/skeleton/, SkeletonDemo],
  [/spinner/, SpinnerDemo],
  [/kbd/, KbdDemo],
  [/progress/, ProgressDemo],
  [/calendar/, CalendarDemo],
  [/date/, DatePickerDemo],
  [/scroll/, ScrollAreaDemo],
  [/tabs/, TabsDemo],
  [/term-icon|metric|stat-tile/, MetricIconsDemo],
  [/empty/, EmptyDemo],
  [/combobox/, ComboboxDemo],
  [/steps|stage/, StepsDemo],
  [/toast|sonner/, SonnerDemo],
];

export function liveFor(id: string): (() => React.ReactNode) | undefined {
  if (LIVE[id]) return LIVE[id];
  if (!/^(atom|molecule)\./.test(id)) return undefined;
  return BY_WORD.find(([re]) => re.test(id))?.[1];
}
