import * as React from "react";
import { FormStepsContext } from "@/components/side-sheet/form-steps-context";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ListFilter,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Pill } from "@/components/ui/pill";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import { CopyValue } from "@/components/ui/copy-value";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/form-layout/MultiSelect";
import { FileUpload } from "@/components/form-layout/FileUpload";
import {
  TableCellCombobox,
  TableCellInput,
  TableCellSelect,
  TableRequiredLabel,
} from "@/components/form-layout";
import {
  SheetField,
  SheetSection,
  SheetSectionRemove,
} from "@/components/side-sheet/parts";
import { HangingAdd } from "../HangingAdd";
import { CELL, RecordSheet } from "../RecordSheet";
import type { PendingItem } from "../PendingStrip";
import { useOrderFormFields } from "./orderFormFields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DATE_FMT } from "../data";
import { RENTAL_ASSETS, TANK_TYPES, type RentalAsset } from "./directory";
import {
  ORDER_TAGS,
  POCS,
  POC_DIRECTORY,
  PRODUCTS,
  SALESPEOPLE,
  SALES_CONTACTS,
  SHIP_TO_SITES,
  YARDS,
  YARD_SITES,
  siteAddress,
  MOVEMENT_LABEL,
  MOVEMENT_ROUTE,
  type MovementDirection,
  type MovementEnd,
} from "./orders";
import { TableRowRemove } from "@/components/form-layout/table-cells";

/**
 * A column's own filter, on the column. Several values at once.
 *
 * ON THE HEADER, NOT ABOVE THE TABLE. A filter bar names the column it acts on
 * in words — "Tank type" — and then the reader has to find that column to see
 * what the filter did. Sitting on the header there is nothing to match up: the
 * control and the values it narrows are in the same line of sight, and two
 * filters cannot be confused for each other.
 *
 * CHECKBOXES, NOT A RADIO. "Show me the double-walled ones" and "show me the
 * double-walled AND the fire-guarded ones" are the same question asked twice,
 * and a radio could only answer the first — you had to pick, look, go back and
 * pick again. NOTHING TICKED MEANS EVERYTHING, which is why the list is not
 * pre-filled with all of them: an all-ticked list and an empty one would show
 * the same rows while looking like opposite states.
 *
 * THE MENU STAYS OPEN while values are ticked. Closing after each one turns
 * choosing three types into three round trips.
 *
 * TINTED WHEN IT IS DOING SOMETHING. A filter that looks identical whether or
 * not it is on is how a table ends up quietly hiding rows.
 */
function HeaderFilter({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  /** The column's name, for the menu's heading and the trigger's label. */
  label: string;
  /** The "no filter" row, e.g. "All tank types". Ticked when nothing is. */
  allLabel: string;
  /** Chosen values. Empty means no filter. */
  value: string[];
  /** Values worth offering — the caller passes only the ones present. */
  options: readonly string[];
  onChange: (value: string[]) => void;
}) {
  const active = value.length > 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by ${label.toLowerCase()}`}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
            active ? "text-primary" : "text-muted-foreground"
          )}
        >
          <ListFilter className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      {/* ABOVE THE SHEET IT LIVES IN. The sheet is z-60 and a portaled menu is
          z-50, so the menu opened and rendered underneath — a filter that
          looked like it did nothing at all. */}
      <DropdownMenuContent align="start" className="z-[70] min-w-44">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {/* CLEARING IS A TICK, not a separate Clear button: "all of them" is
            one of the answers, and it lives with the others. */}
        <DropdownMenuCheckboxItem
          checked={!active}
          onCheckedChange={() => onChange([])}
          onSelect={(e) => e.preventDefault()}
        >
          {allLabel}
        </DropdownMenuCheckboxItem>
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o}
            checked={value.includes(o)}
            onCheckedChange={(on) =>
              onChange(on ? [...value, o] : value.filter((v) => v !== o))
            }
            onSelect={(e) => e.preventDefault()}
          >
            {o}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A range on a column, on the column.
 *
 * A CAPACITY IS A NUMBER, NOT A CATEGORY. Bands — "under 500", "1,000 to
 * 2,499" — are somebody's guess at where the useful cuts are, and the guess is
 * wrong as soon as a job needs at least 800. Two numbers ask the question
 * people actually have: no smaller than this, no bigger than that. Either half
 * on its own is a real filter, which is why neither is required.
 *
 * A POPOVER, NOT A MENU. A menu's items DO things and its keys are arrow keys;
 * this holds two fields that have to be typed into.
 *
 * AN ASSET WITH NO CAPACITY IS OUT the moment either bound is set. A pump cart
 * is not a 0-gallon tank — it is not a tank — and letting it satisfy "up to
 * 500 gal" would answer a question about tanks with something that is not one.
 */
const digits = (v: string) => v.replace(/[^\d]/g, "");

function HeaderRangeFilter({
  label,
  unit,
  min,
  max,
  onChange,
}: {
  label: string;
  /** Printed after each field, e.g. `gal`. */
  unit: string;
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
}) {
  const active = min !== "" || max !== "";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by ${label.toLowerCase()}`}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
            active ? "text-primary" : "text-muted-foreground"
          )}
        >
          <ListFilter className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="z-[70] w-60 p-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {/* Only offered when there is something to clear. */}
            {active && (
              <button
                type="button"
                onClick={() => onChange("", "")}
                className="text-xs text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* TEXT WITH A NUMERIC INTENT, the house style for a number field —
                `type="number"` puts a spinner in a 90px box and lets "e" and
                "-" through. Digits only, taken as typed. */}
            <Input
              inputMode="numeric"
              value={min}
              onChange={(e) => onChange(digits(e.target.value), max)}
              placeholder="Min"
              aria-label={`Minimum ${label.toLowerCase()}`}
              className="h-8 tabular-nums"
            />
            <span aria-hidden className="text-sm text-muted-foreground">
              –
            </span>
            <Input
              inputMode="numeric"
              value={max}
              onChange={(e) => onChange(min, digits(e.target.value))}
              placeholder="Max"
              aria-label={`Maximum ${label.toLowerCase()}`}
              className="h-8 tabular-nums"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            In {unit}. Leave either side empty for no limit.
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** `vendor_owned` → `Vendor owned`. The directory stores ownership as a key;
 *  a form is not the place to read one. */
const humanise = (v: string) =>
  v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** One label-over-value fact on the chosen asset's card. */
function AssetFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm text-foreground">{value}</dd>
    </div>
  );
}

/**
 * The asset picker — a table of what can be moved, on top of the form.
 *
 * WHY A SHEET AND NOT A DROPDOWN. Choosing an asset is not choosing a word: a
 * yard holds twenty-nine of them and the answer depends on the tank's type,
 * its capacity and whether it is free — three facts a one-line option cannot
 * carry. A dropdown made people pick a NAME and then check afterwards whether
 * it was the right thing; a table lets them compare before committing.
 *
 * SEARCH AND ONE FILTER. Name or serial covers "I know which one"; tank type
 * covers "I know what kind I need". Everything else the table already shows,
 * so a filter for it would only be a second way to read the same column.
 *
 * ADD ON THE ROW, not a footer button over a selected row. The row is the
 * thing being chosen, so the affordance belongs on it — and there is no
 * confirm step because there is nothing to confirm: one asset, chosen, done.
 */
function AssetPickerSheet({
  open,
  onOpenChange,
  assets,
  selectedId,
  onSelect,
  sourceLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: RentalAsset[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Where this list comes from, e.g. "Turlock Yard". Names the subtitle. */
  sourceLabel: string;
}) {
  const [query, setQuery] = React.useState("");
  /** Chosen tank types. Empty means no filter — see `HeaderFilter`. */
  const [chosenTypes, setTypes] = React.useState<string[]>([]);
  /* Held as typed, not as numbers: a half-entered "1" is a real state of the
     field, and a filter that reinterprets it while you type is one that fights
     you. Parsed only where it is applied. */
  const [minGal, setMinGal] = React.useState("");
  const [maxGal, setMaxGal] = React.useState("");

  /* BOTH FILTERS OFFER ONLY WHAT IS THERE. A tank type — or a capacity band —
     with nothing in this yard is a choice that can only empty the table. */
  const tankTypes = React.useMemo(
    /* IN THE ORDER THE BUSINESS LISTS THEM, not alphabetically. Tank types are
       a fixed set with a conventional order — sorting them by first letter
       makes a familiar list read as a new one. */
    () => TANK_TYPES.filter((t) => assets.some((a) => a.tankType === t)),
    [assets]
  );
  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const lo = minGal === "" ? null : Number(minGal);
    const hi = maxGal === "" ? null : Number(maxGal);
    const bounded = lo !== null || hi !== null;
    return assets.filter((a) => {
      if (chosenTypes.length > 0 && !chosenTypes.includes(a.tankType ?? "")) return false;
      if (bounded) {
        /* Not a tank, so not an answer to a question about tank sizes. */
        if (a.capacityGal <= 0) return false;
        if (lo !== null && a.capacityGal < lo) return false;
        if (hi !== null && a.capacityGal > hi) return false;
      }
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.serialNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [assets, query, chosenTypes, minGal, maxGal]);

  /* A filter left set from last time is a table lying about what it holds. */
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setTypes([]);
      setMinGal("");
      setMaxGal("");
    }
  }, [open]);

  /* THE COUNT TELLS ON THE FILTERS. Two small icons on two headers are easy to
     miss; a subtitle that has stopped saying "29 assets" is not. */
  const narrowed = rows.length !== assets.length;

  return (
    /* A picker over a stepped form is not part of it. */
    <FormStepsContext.Provider value={false}>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="z-[60] w-[min(620px,calc(var(--fp-vw)-56px))] gap-0 p-0 sm:max-w-[min(620px,calc(var(--fp-vw)-56px))]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <SheetTitle className="text-base">Select asset</SheetTitle>
            <span className="truncate text-xs text-muted-foreground">
              {narrowed
                ? `${rows.length} of ${assets.length} assets ${sourceLabel}`
                : `${assets.length} ${assets.length === 1 ? "asset" : "assets"} ${sourceLabel}`}
            </span>
          </div>
          <button
            type="button"
            aria-label="Close select asset"
            onClick={() => onOpenChange(false)}
            className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* SEARCH STAYS ABOVE, FILTERS WENT TO THEIR COLUMNS. Search is the
            only control here that acts on more than one column — it reads a
            name and a serial — so it is the only one with nothing to sit next
            to. It does not scroll with the results: a search box that scrolls
            away is one people scroll back up to find. */}
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or serial…"
              aria-label="Search assets"
              className="h-8 pl-8"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {/* THE HEADER STAYS WHEN THE TABLE EMPTIES. The filters live on it,
              so hiding it hid the only way out of the state it caused. */}
          <table className="w-full table-fixed border-collapse">
              {/* FIXED, so the Add column cannot be squeezed off the edge by a
                  long asset name — the one column that must always be reachable
                  is the one that does the choosing. */}
              <colgroup>
                <col />
                <col className="w-[26%]" />
                <col className="w-[100px]" />
                <col className="w-[92px]" />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-fp-table-header">
                  <th className="px-4 py-2.5 text-left">
                    <TableRequiredLabel>Asset</TableRequiredLabel>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <span className="flex items-center gap-1">
                      <TableRequiredLabel>Tank Type</TableRequiredLabel>
                      <HeaderFilter
                        label="Tank type"
                        allLabel={ALL_TYPES}
                        value={chosenTypes}
                        options={tankTypes}
                        onChange={setTypes}
                      />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <span className="flex items-center justify-end gap-1">
                      <TableRequiredLabel>Capacity</TableRequiredLabel>
                      <HeaderRangeFilter
                        label="Capacity"
                        unit="gallons"
                        min={minGal}
                        max={maxGal}
                        onChange={(lo, hi) => {
                          setMinGal(lo);
                          setMaxGal(hi);
                        }}
                      />
                    </span>
                  </th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-sm text-muted-foreground">
                      No asset matches that. Clear the search, or the filters on
                      Tank Type and Capacity.
                    </td>
                  </tr>
                )}
                {rows.map((a) => {
                  const chosen = a.id === selectedId;
                  return (
                    <tr
                      key={a.id}
                      className="group/row border-b border-border last:border-b-0 hover:bg-accent/40"
                    >
                      <td className="px-4 py-2.5">
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm text-foreground">{a.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {a.serialNumber ?? "No serial"}
                          </span>
                        </span>
                      </td>
                      <td className="truncate px-3 py-2.5 text-sm text-muted-foreground">
                        {a.tankType ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm tabular-nums text-muted-foreground">
                        {a.capacityGal > 0 ? `${a.capacityGal.toLocaleString()} gal` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {/* THE ONE ALREADY ON THE ORDER SAYS SO rather than
                            offering to be added again. */}
                        {chosen ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Check className="size-3.5" /> Added
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onSelect(a.id);
                              onOpenChange(false);
                            }}
                          >
                            <Plus /> Add
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
    </FormStepsContext.Provider>
  );
}

/**
 * Asset Delivery and Asset Pickup — §5.20's other two create flows.
 *
 * ONE SHEET, TWO DIRECTIONS. A delivery takes an asset from a yard to a
 * customer; a pickup brings one back. Everything else about them is identical,
 * so the difference is a field on the draft and not a second file: two files
 * would have drifted, and the drift would be in the half nobody opens as often.
 *
 * THE DIRECTION IS SETTLED BEFORE THE SHEET OPENS. Both were once sibling items
 * on the Create menu, where a one-word difference between two opposite things
 * was the whole distinction; they are now a radio under one "Movement Order"
 * entry, which reads as two variants of one thing and shows which way you are
 * going before you commit to a form.
 *
 * THE DIRECTION DECIDES THREE THINGS, all of them derived rather than written
 * twice:
 *
 *  • WHICH SECTION COMES FIRST. Pickup Location is always the top one, because
 *    a route is read from where it starts. On a delivery that is the yard; on a
 *    pickup it is the customer.
 *
 *  • WHERE THE ASSETS COME FROM. A delivery can only send what is sitting in
 *    the chosen yard; a pickup can only collect what is on rent at the chosen
 *    ship-to. The picker reads one list or the other.
 *
 *  • WHAT THE GATE SAYS. "Choose a yard first" and "choose a ship-to first" are
 *    the same rule seen from two ends, so the message is composed from the
 *    direction rather than hardcoded in two places.
 *
 * WHY IT IS NOT THE DELIVERY ORDER SHEET. A movement order carries exactly ONE
 * asset and no quantity — there is nothing to top off and nothing to sum, so
 * the Delivery Order table, the Load Order and the Delivery Partner section all
 * have nothing to say. Forcing them in would have meant three empty sections on
 * every movement order.
 */

const PERIPHERALS = [
  "Fill hose",
  "Nozzle",
  "Transfer pump",
  "Containment tray",
  "Meter",
  "Grounding reel",
  "Spill kit",
  "Lockbox",
  "Sight gauge",
];

/** A peripheral is a rented thing in its own right, so it carries the same
 *  facts an asset does: which one, its serial, what state it left in, and who
 *  owns it. Those four are the columns. */
const CONDITIONS = ["Fresh", "Old"];
const OWNERSHIP = ["Leased", "Purchased"];

export interface PeripheralRow {
  name: string;
  serial: string;
  condition: string;
  ownership: string;
}

const blankPeripheral = (): PeripheralRow => ({
  name: "",
  serial: "",
  condition: "",
  ownership: "",
});

/** The tank-type filter's "no filter" row. A word, so it can sit in the same
 *  list as the types themselves rather than being an empty option. */
const ALL_TYPES = "All tank types";

const DOC_ACCESS = ["Internal only", "Visible to vendor", "Visible to customer"];

export interface CustomItem {
  name: string;
  qty: number | null;
  unit: string;
}

const UNITS = ["ea", "ft", "gal", "kit"];

/**
 * ONE END OF THE ROUTE. A yard end uses `yard`; a customer end uses `customer`
 * and `shipTo`. Both sets are on the record so switching a route does not have
 * to throw away what was already typed at the other kind of end.
 */
export interface MovementPoint {
  yard: string;
  customer: string;
  shipTo: string;
}

export interface AssetMovementDraft {
  direction: MovementDirection;
  /* THE FORM IS A FROM AND A TO, whatever kind of place each turns out to be.
     A single `yard` + `shipTo` pair could describe the two routes with one of
     each; a transfer has two customer sites and a relocate has two yards. */
  from: MovementPoint;
  to: MovementPoint;
  primaryPoc: string;
  secondaryPocs: string[];
  salesperson: string;
  plannedDate: Date | null;
  poNumber: string;
  bolNumber: string;
  tags: string[];
  notifyVendor: boolean;
  urgent: boolean;
  signature: boolean;
  /* ONE ASSET, stated as a table row. Its type and capacity are the asset's own
     facts and arrive with it; the products are what it is to carry, which is a
     decision and so the only editable cell beside the asset itself. */
  assetId: string;
  products: string[];
  peripheralsOn: boolean;
  peripherals: PeripheralRow[];
  customOn: boolean;
  customItems: CustomItem[];
  instructions: string;
  internalNote: string;
}

const blankPoint = (): MovementPoint => ({ yard: "", customer: "", shipTo: "" });

function emptyDraft(direction: MovementDirection): AssetMovementDraft {
  return {
    direction,
    from: blankPoint(),
    to: blankPoint(),
    primaryPoc: "",
    secondaryPocs: [],
    salesperson: "",
    /* TOMORROW, NOT BLANK — the same default the delivery order takes, and
       for the same reason: it is the answer the form would have got anyway. */
    plannedDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    })(),
    poNumber: "",
    bolNumber: "",
    tags: [],
    // §6: on by default — suppressing every email is the deliberate act.
    notifyVendor: true,
    urgent: false,
    signature: false,
    assetId: "",
    products: [],
    peripheralsOn: false,
    peripherals: [blankPeripheral()],
    customOn: false,
    customItems: [{ name: "", qty: null, unit: UNITS[0] }],
    instructions: "",
    internalNote: "",
  };
}

/**
 * ONE ROUTE, DRAWN AS ONE. The two location sections are a from and a to, and
 * as two headings 40px apart they read as two unrelated questions — which is
 * how someone fills in a yard and a ship-to that make no journey.
 *
 * A dot on the first heading, a line down the margin, an arrowhead on the
 * second. The sections indent by 28px to give the rail its own column rather
 * than having it hang in the sheet's padding.
 *
 * THE LINE'S LENGTH IS STATIC, not measured: it starts on the first heading's
 * line (10px into the section, half of the 20px line box) and has to reach the
 * arrowhead on the second heading's line — its own section's remaining height,
 * plus the body's 40px section gap, plus that same 10px, less the 6px the
 * arrowhead occupies. `-bottom-[44px]` is that sum, and it holds because both
 * numbers it depends on are DS rules rather than this sheet's choices.
 */
function RouteStep({
  step,
  children,
}: {
  step: "from" | "to";
  children: React.ReactNode;
}) {
  return (
    <div id={`mv-${step}`} className="relative pl-7">
      {step === "from" ? (
        <>
          <span
            aria-hidden
            className="absolute top-1 left-0 size-3 rounded-full border-2 border-fp-outline-2"
          />
          <span
            aria-hidden
            className="absolute top-2.5 -bottom-[44px] left-[5.5px] w-px bg-fp-outline-2"
          />
        </>
      ) : (
        <ChevronDown
          aria-hidden
          className="absolute top-1 left-0 size-3 text-fp-outline-2"
          strokeWidth={3}
        />
      )}
      {children}
    </div>
  );
}

/** Flags that ride in the footer — decisions about the ACT of committing. */
function FlagRow({
  flags,
}: {
  flags: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
      {flags.map((f) => (
        <label key={f.id} htmlFor={f.id} className="flex cursor-pointer items-center gap-2.5">
          <Checkbox
            id={f.id}
            checked={f.checked}
            onCheckedChange={(v) => f.onChange(v === true)}
          />
          <span className="text-sm text-foreground">{f.label}</span>
        </label>
      ))}
    </div>
  );
}

export interface AssetMovementSheetProps {
  direction: MovementDirection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: AssetMovementDraft) => void;
  customers: string[];
}

export function AssetMovementSheet({
  direction,
  open,
  onOpenChange,
  onCreate,
  customers,
}: AssetMovementSheetProps) {
  const [draft, setDraft] = React.useState<AssetMovementDraft>(() =>
    emptyDraft(direction)
  );

  React.useEffect(() => {
    if (open) setDraft(emptyDraft(direction));
  }, [open, direction]);

  const set = <K extends keyof AssetMovementDraft>(
    key: K,
    value: AssetMovementDraft[K]
  ) => setDraft((d) => ({ ...d, [key]: value }));

  /* THE ROUTE IS THE ONLY THING THAT DIFFERS between the four, so everything
     below is read off it rather than written out four times. */
  const route = MOVEMENT_ROUTE[direction];
  const poc = POC_DIRECTORY[draft.primaryPoc];
  const shipTos = SHIP_TO_SITES.map((s) => s.name);

  /** What a given end resolves to, once it has been chosen. */
  const nameOf = (p: MovementPoint, kind: MovementEnd) =>
    kind === "yard" ? p.yard : p.shipTo;

  /* WHERE THE ASSETS COME FROM IS ALWAYS THE ORIGIN. From a yard, what is
     sitting in it; from a customer site, what is on rent there. One rule, and
     it happens to answer all four routes. */
  const fromName = nameOf(draft.from, route.from);
  const available: RentalAsset[] = !fromName
    ? []
    : route.from === "yard"
      ? RENTAL_ASSETS.filter((a) => a.availabilityStatus === "Available")
      : RENTAL_ASSETS.filter((a) => a.shipTo === draft.from.shipTo);

  const asset = RENTAL_ASSETS.find((a) => a.id === draft.assetId);

  const gate =
    route.from === "yard"
      ? "Choose a yard first — the assets offered are the ones sitting in it."
      : "Choose a ship-to first — the assets offered are the ones on rent there.";

  /* Where the list came from, said once — the empty state's count and the
     picker's subtitle are the same sentence about the same set. */
  const sourceLabel =
    route.from === "yard" ? `in ${fromName}` : `on rent at ${fromName}`;

  /* WHOSE NOTES THE FORM SHOWS: the customer end of the route, preferring the
     destination when both ends are customer sites — a transfer's notes are
     read before the drop, not after the collection. */
  const notePoint =
    route.to === "site" ? draft.to : route.from === "site" ? draft.from : null;
  const noteSite = notePoint
    ? SHIP_TO_SITES.find((x) => x.name === notePoint.shipTo)
    : undefined;

  /** The asset table, on top of the form. Closed until asked for. */
  const [pickerOpen, setPickerOpen] = React.useState(false);
  /* THE ROW JUST ADDED, per table. Its first cell takes focus when it mounts —
     DS ui §10f — so the add is followed by the answer, not a hunt for the row. */
  const [focusPeripheral, setFocusPeripheral] = React.useState<number | null>(null);
  const [focusItem, setFocusItem] = React.useState<number | null>(null);

  const setPeripheral = (i: number, patch: Partial<PeripheralRow>) =>
    setDraft((d) => ({
      ...d,
      peripherals: d.peripherals.map((p, k) => (k === i ? { ...p, ...patch } : p)),
    }));

  const setItem = (i: number, patch: Partial<CustomItem>) =>
    setDraft((d) => ({
      ...d,
      customItems: d.customItems.map((it, k) => (k === i ? { ...it, ...patch } : it)),
    }));

  const canSubmit =
    Boolean(fromName) &&
    Boolean(nameOf(draft.to, route.to)) &&
    /* A customer end needs the account as well as the site. */
    (route.from !== "site" || Boolean(draft.from.customer)) &&
    (route.to !== "site" || Boolean(draft.to.customer)) &&
    Boolean(draft.assetId) &&
    draft.plannedDate !== null;

  /* WHAT CREATE IS WAITING ON (Pavan, 2026-10-07 — G25). Create stays
     pressable; a press names the gap and goes to its section. */
  const pending: PendingItem[] = [
    ...(["from", "to"] as const).flatMap((step) => {
      const place = step === "from" ? "pickup" : "drop-off";
      const needsCustomer = route[step] === "site" && !draft[step].customer;
      const named = step === "from" ? Boolean(fromName) : Boolean(nameOf(draft.to, route.to));
      return needsCustomer
        ? [{ key: `${step}-customer`, label: `Choose the ${place} customer`, target: `mv-${step}` }]
        : !named
          ? [{ key: `${step}-place`, label: `Choose the ${place} location`, target: `mv-${step}` }]
          : [];
    }),
    ...(draft.assetId ? [] : [{ key: "asset", label: "Choose an asset", target: "mv-asset" }]),
    ...(draft.plannedDate !== null
      ? []
      : [{ key: "date", label: "Choose a planned date", target: "mv-order" }]),
  ];

  /* ── One block per end, written once and pointed at either end. ────────── */

  const setPoint = (step: "from" | "to", patch: Partial<MovementPoint>) =>
    setDraft((d) => ({ ...d, [step]: { ...d[step], ...patch } }));

  const yardBlock = (step: "from" | "to") => {
    const point = draft[step];
    const yard = YARD_SITES.find((y) => y.name === point.yard);
    return (
    <SheetSection
      key={step}
      title={step === "from" ? "Pickup Location" : "Drop-off Location"}
    >
      {/* THE SAME GRID AS THE CUSTOMER BLOCK. A yard and a customer are the two
          ends of one journey and are asked for in the same way, so a select
          that is a third as wide as the one it pairs with reads as a lesser
          question. Its address sits BESIDE it rather than under, because there
          is only one select on this row and the second column was empty. */}
      <div className="grid grid-cols-2 items-end gap-4">
        <SheetField label="Yard" required>
          <Combobox
            className="w-full"
            value={point.yard}
            onValueChange={(v) => {
              setPoint(step, { yard: v });
              // The asset came from the old origin; it cannot come from this one.
              if (step === "from") set("assetId", "");
            }}
            /* A ROUTE CANNOT END WHERE IT STARTED. On a relocate both ends are
               yards, so the far end drops whichever one this end has taken. */
            options={YARDS.filter(
              (y) =>
                route.from !== route.to ||
                y !== draft[step === "from" ? "to" : "from"].yard
            )}
            placeholder="Select Yard"
            searchPlaceholder="Search yards…"
          />
        </SheetField>
        {/* Derived from the select, so a read-out — the same card the ship-to
            gets, because it answers the same question about the other end. */}
        <div className="flex h-9 items-center overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
          {/* ADDRESS ONLY — no coordinates. The ship-to card carries them
              because a customer site is somewhere a driver has to be told how
              to find; a yard is the broker's own, and at half the width the
              pair truncated the address, which is the half that answers
              "where". */}
          {yard ? (
            <span className="truncate text-sm text-foreground">
              {siteAddress(yard)}
            </span>
          ) : (
            <span className="truncate text-sm text-muted-foreground">
              Select a Yard to see its address.
            </span>
          )}
        </div>
      </div>
    </SheetSection>
    );
  };

  const customerBlock = (step: "from" | "to") => {
    const point = draft[step];
    const site = SHIP_TO_SITES.find((x) => x.name === point.shipTo);
    return (
    <SheetSection
      key={step}
      title={step === "from" ? "Pickup Location" : "Drop-off Location"}
    >
      {/* THE CARD IS THE ROW'S THIRD UNIT, not a note under it. Customer, Ship
          To and the address they resolve to are three parts of one answer, so
          the gap below the selects is the same 16px as the gap between them —
          at 4px the card welded to the row above and read as its helper text. */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer" required>
            <Combobox
              className="w-full"
              value={point.customer}
              onValueChange={(v) => setPoint(step, { customer: v })}
              options={customers}
              placeholder="Select Customer"
              searchPlaceholder="Search customers…"
              emptyText="No customer found."
            />
          </SheetField>
          <SheetField label="Ship To" required>
            <Combobox
              className="w-full"
              value={point.shipTo}
              onValueChange={(v) => {
                setPoint(step, { shipTo: v });
                if (step === "from") set("assetId", "");
              }}
              /* A transfer's two ends are both customer sites, so the far end
                 drops whichever site this end has taken. */
              options={shipTos.filter(
                (x) =>
                  route.from !== route.to ||
                  x !== draft[step === "from" ? "to" : "from"].shipTo
              )}
              placeholder="Select Ship To"
              searchPlaceholder="Search ship-tos…"
              emptyText="No ship-to found."
            />
          </SheetField>
        </div>
        {/* The ship-to's own facts, as a read-out — the consequence of the two
            selects above, never typed. Same card as the Delivery Order sheet. */}
        <div className="rounded-md border border-fp-outline-1 bg-fp-surface-1a px-4 py-2.5">
          {site ? (
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
              <span className="tabular-nums text-foreground">{site.latLng}</span>
              <span aria-hidden className="text-fp-outline-1">
                |
              </span>
              <span className="text-muted-foreground">
                {site.street}, {site.city}, {site.state} {site.zip}
              </span>
            </p>
          ) : (
            <span className="text-sm text-muted-foreground">
              Select a Ship To to see its coordinates and address.
            </span>
          )}
        </div>
      </div>
    </SheetSection>
    );
  };

  const blockFor = (step: "from" | "to") =>
    route[step] === "yard" ? yardBlock(step) : customerBlock(step);

  /* NOTHING IS KEPT BEFORE CREATE ORDER (Pavan, 2026-10-06), so closing a
     form with anything in it asks first — the same as a delivery order. */
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  /* THE FORM'S OPTIONAL STEPS — the same gear and setting as a delivery order. */
  const { fields, gear, drawer } = useOrderFormFields("new-asset", open, "New asset order");
  const requestClose = (o: boolean) => {
    if (!o && JSON.stringify(draft) !== JSON.stringify(emptyDraft(direction))) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(o);
  };

  return (
    <RecordSheet
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15): peripherals = peripheral
         name, serial, condition, ownership (picks), bin; custom items = item
         name, qty, unit pick, bin. Peripherals is the wider. Sized for both
         whether or not they are switched on, so the sheet does not jump. */
      fit={{
        tables: [
          [CELL.name, CELL.pick, CELL.pick, CELL.pick, CELL.bin],
          [CELL.name, CELL.number, CELL.pick, CELL.bin],
        ],
      }}
      open={open}
      onOpenChange={requestClose}
      /* No step column — see the order sheet. The gear goes to the header. */
      headerActions={gear}
      mode="create"
      showCancel={false}
      editTitle="Asset Order"
      createTitle="Asset Order"
      createAction="Create Order"
      /* THE CHIP CARRIES THE ROUTE, not the type — the title already says
         "Asset Order", and the route is the one thing settled in the menu that
         the form itself never states. Without it the only evidence of which
         way this order runs is which end happens to ask for a yard, and on two
         of the four routes both ends ask for the same kind of place. Violet on
         all four: on the board, every one of them is an M. */
      headerAside={
        <span className="flex items-center gap-2">
          <Pill color="violet">{MOVEMENT_LABEL[direction]}</Pill>
        </span>
      }
      canSubmit={canSubmit}
      pending={pending}
      onSubmit={() => onCreate(draft)}
      /* Decisions about the ACT of committing ride in the footer, in view at
         the moment of pressing Create however far the body has scrolled. */
      footerAside={
        <FlagRow
          flags={[
            {
              id: "mv-urgent",
              label: "Mark as an Urgent Order",
              checked: draft.urgent,
              onChange: (v) => set("urgent", v),
            },
            {
              id: "mv-signature",
              label: "Get signature on Delivery",
              checked: draft.signature,
              onChange: (v) => set("signature", v),
            },
          ]}
        />
      }
    >
      {/* A ROUTE IS READ FROM WHERE IT STARTS, so the origin is always the top
          section — and what KIND of place each end is comes off the route. */}
      <RouteStep key="from" step="from">
        {blockFor("from")}
      </RouteStep>
      <RouteStep key="to" step="to">
        {blockFor("to")}
      </RouteStep>

      {/* OFF EVERYWHERE UNLESS TURNED ON (Pavan, 2026-10-06). */}
      {fields.poc && (
      <SheetSection
        title="POC details"
        /* ADDING A PERSON ACTS ON THE SECTION, not on a field, so it sits on
           the heading row.

           IT ADDS A FIELD, NOT A CHIP. As a token picker in the heading, "Add
           POC" collected names into a box that was nowhere near the Primary POC
           it sat above, and a second person ended up looking nothing like the
           first — no label, no contact read-out, no way to see whose number was
           whose. It now appends a Secondary POC row of exactly the same shape
           as Primary, under it, where a second person belongs. */
        action={
          <button
            type="button"
            onClick={() => set("secondaryPocs", [...draft.secondaryPocs, ""])}
            className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Plus className="size-4" /> Add POC
          </button>
        }
      >
        <div className="grid grid-cols-9 items-end gap-4">
          <SheetField label="Primary POC" className="col-span-4">
            <Combobox
              className="w-full"
              value={draft.primaryPoc}
              onValueChange={(v) => set("primaryPoc", v)}
              options={[...POCS]}
              placeholder="Select Primary POC"
              searchPlaceholder="Search contacts…"
            />
          </SheetField>
          {/* Derived, so a read-out with its own copy buttons — not a pair of
              disabled fields pretending to be editable. */}
          <div className="col-span-5 flex h-9 items-center overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
            {poc ? (
              <>
                <CopyValue value={poc.phone} label="POC contact" tabular />
                <span aria-hidden className="mr-6 text-fp-outline-1">
                  |
                </span>
                <CopyValue value={poc.email} label="POC email" />
              </>
            ) : (
              <span className="truncate text-sm text-muted-foreground">
                Select a POC to see their contact and email.
              </span>
            )}
          </div>
        </div>

        {/* SAME ROW, SAME SHAPE. A second person is another of the first kind
            of thing, so it gets the first kind of row — and its own Remove,
            because a row that was added by a click has to be removable by
            one. */}
        {draft.secondaryPocs.map((name, i) => {
          const contact = POC_DIRECTORY[name];
          return (
            <div key={i} className="grid grid-cols-9 items-end gap-4">
              <SheetField
                label={
                  <span className="flex w-full items-center justify-between gap-2">
                    <span>Secondary POC</span>
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "secondaryPocs",
                          draft.secondaryPocs.filter((_, k) => k !== i)
                        )
                      }
                      className="text-xs font-normal text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-destructive hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      Remove
                    </button>
                  </span>
                }
                className="col-span-4"
              >
                <Combobox
                  className="w-full"
                  value={name}
                  onValueChange={(v) =>
                    set(
                      "secondaryPocs",
                      draft.secondaryPocs.map((p, k) => (k === i ? v : p))
                    )
                  }
                  /* Nobody is offered twice: a person already on the order is
                     not a second person to add to it. */
                  options={POCS.filter(
                    (p) =>
                      p === name ||
                      (p !== draft.primaryPoc && !draft.secondaryPocs.includes(p))
                  )}
                  placeholder="Select Secondary POC"
                  searchPlaceholder="Search contacts…"
                />
              </SheetField>
              <div className="col-span-5 flex h-9 items-center overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
                {contact ? (
                  <>
                    <CopyValue value={contact.phone} label="POC contact" tabular />
                    <span aria-hidden className="mr-6 text-fp-outline-1">
                      |
                    </span>
                    <CopyValue value={contact.email} label="POC email" />
                  </>
                ) : (
                  <span className="truncate text-sm text-muted-foreground">
                    Select a POC to see their contact and email.
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-9 items-end gap-4">
          <SheetField label="Sales Person" className="col-span-4">
            <Combobox
              className="w-full"
              value={draft.salesperson}
              onValueChange={(v) => set("salesperson", v)}
              options={[...SALESPEOPLE]}
              placeholder="Select Sales Person"
              searchPlaceholder="Search people…"
            />
          </SheetField>
          {/* SAME SHAPE AND SAME GRID as the POC row above — two read-out cards
              that differ in width read as two different kinds of card. */}
          <div className="col-span-5 flex h-9 items-center overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
            {SALES_CONTACTS[draft.salesperson] ? (
              <CopyValue
                value={SALES_CONTACTS[draft.salesperson]}
                label="sales contact"
                tabular
              />
            ) : (
              <span className="truncate text-sm text-muted-foreground">
                Select a sales person to see their contact.
              </span>
            )}
          </div>
        </div>
      </SheetSection>
      )}

      <SheetSection id="mv-order" title="Order Details">
        {/* THREE REFERENCE NUMBERS AND A DATE, one row. With the type gone to
            the header there is room for BOL beside the PO it sits next to on
            every paper version of this order. */}
        <div className="grid grid-cols-3 gap-4">
          <SheetField label="Planned Delivery Date" required>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                  <CalendarIcon />
                  {draft.plannedDate ? DATE_FMT.format(draft.plannedDate) : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={draft.plannedDate ?? undefined}
                  onSelect={(d) => set("plannedDate", d ?? null)}
                />
              </PopoverContent>
            </Popover>
          </SheetField>
          <SheetField label="Customer PO Number">
            <Input
              value={draft.poNumber}
              placeholder="Enter Customer PO Number"
              onChange={(e) => set("poNumber", e.target.value)}
            />
          </SheetField>
          <SheetField label="BOL Number">
            <Input
              value={draft.bolNumber}
              placeholder="Enter BOL Number"
              onChange={(e) => set("bolNumber", e.target.value)}
            />
          </SheetField>
        </div>

        {/* TAGS GET THEIR OWN LINE. Every other control in this section is a
            single value in a fixed box; tags are a growing list, so sharing a
            row meant the row's height was decided by how many tags were on the
            order and the field beside it moved every time one was added. */}
        <SheetField label="Tags">
          <MultiSelect
            options={[...ORDER_TAGS]}
            value={draft.tags}
            onChange={(v) => set("tags", v)}
            addLabel="Add tags"
            searchPlaceholder="Search tags…"
            emptyText="No tag found."
          />
        </SheetField>

        {/* §6's per-order kill switch. ON by default — suppressing every email
            is the deliberate act, so it is the one that costs a click. */}
        {/* EVEN ON BOTH SIDES. This is not a field, it is a decision about the
            order as a whole, so it stands clear of the fields above it by the
            same 40px the next section stands clear of it. */}
        <label
          htmlFor="mv-notify"
          className="mt-6 flex cursor-pointer items-center justify-between gap-4"
        >
          <span className="text-sm font-medium text-foreground">
                Send email notifications to vendor
              </span>
          <Switch
            id="mv-notify"
            checked={draft.notifyVendor}
            onCheckedChange={(v) => set("notifyVendor", v)}
          />
        </label>
      </SheetSection>

      {/* THREE TABLES, NOT THREE SHAPES. The asset, its peripherals and any
          custom items are all "things going on this order", and the Delivery
          Order sheet already answers that with one idiom: fixed layout, a
          Surface-1a header naming every column, cells with no chrome of their
          own, and an Add chip on the squared bottom-left corner. Reading three
          different layouts for three lists of things was the cost of not using
          it here. */}
      <SheetSection id="mv-asset" title="Asset Details">
        {/* ONE ASSET, CHOSEN FROM A TABLE, THEN READ AS A CARD. §5.20: a
            movement order carries exactly one asset — `assertConsistent`
            enforces it — so this section never grows a second row, and the
            table it used to be was a table of one.

            THE PICK AND THE READ ARE DIFFERENT JOBS. Picking needs every
            asset's type, capacity and serial side by side to compare, which is
            a table and does not fit in a form; reading back the one you chose
            needs those same facts laid out plainly, which is a card. Doing
            both in a four-column row of a table meant the choosing was done
            blind — a name in a dropdown — and the reading was three cells wide.

            PRODUCTS COME AFTER, not beside. What the tank carries is the only
            decision on this section that is not the asset itself, and it
            cannot be answered before there is an asset to answer it about. */}
        {!asset ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4 rounded-md border border-dashed border-fp-outline-1 px-4 py-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm text-foreground">Select asset</span>
                <span className="text-xs text-muted-foreground">
                  One asset per movement order. Search, filter by tank type, and
                  add it from the list.
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!fromName}
                onClick={() => setPickerOpen(true)}
              >
                <Plus /> Select asset
              </Button>
            </div>
            {/* RED ONLY WHEN IT BLOCKS. Until a source is chosen this line is
                the reason the button above is dead, which is a different kind
                of sentence from "29 assets in Turlock Yard" — and if both were
                red the colour would stop meaning anything. */}
            <p
              className={cn(
                "text-xs",
                fromName ? "text-muted-foreground" : "text-destructive"
              )}
            >
              {fromName
                ? `${available.length} ${available.length === 1 ? "asset" : "assets"} ${sourceLabel}.`
                : gate}
            </p>
          </div>
        ) : (
          <>
            {/* THE CARD IS THE ASSET AS IT ARRIVED. Every fact on it is the
                asset's own and none of it is editable here — changing a tank's
                capacity on an order would be editing the tank. The one control
                is Edit, and it reopens the list.

                EDIT ON HOVER, the rule the read-out cards already follow: a
                pencil sitting on every card at rest reads as an invitation to
                change facts that are not this form's to change. */}
            <div className="group/asset relative overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a">
              <div className="flex items-start justify-between gap-4 border-b border-fp-outline-1 px-4 py-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {asset.name}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{asset.serialNumber ?? "No serial"}</span>
                    <span aria-hidden className="text-fp-outline-1">
                      |
                    </span>
                    {/* WHAT IT IS, beside its serial. The fact grid below says
                        how the tank is BUILT; what kind of asset it is belongs
                        with its identity, not with its specification. */}
                    <span>{asset.assetType}</span>
                    <span aria-hidden className="text-fp-outline-1">
                      |
                    </span>
                    <span>
                      {asset.customer ? `On rent to ${asset.customer}` : "In the yard"}
                    </span>
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Change asset"
                  onClick={() => setPickerOpen(true)}
                  className="shrink-0 opacity-0 transition-opacity group-hover/asset:opacity-100 group-focus-within/asset:opacity-100"
                >
                  <Pencil />
                </Button>
              </div>
              <dl className="grid grid-cols-3 gap-x-4 gap-y-3 px-4 py-3">
                <AssetFact label="Tank Type" value={asset.tankType ?? "—"} />
                <AssetFact
                  label="Capacity"
                  value={
                    asset.capacityGal > 0
                      ? `${asset.capacityGal.toLocaleString()} ${asset.unit}`
                      : "—"
                  }
                />
                <AssetFact label="Ownership" value={humanise(asset.ownershipType)} />
                <AssetFact label="Availability" value={asset.availabilityStatus} />
                <AssetFact label="Asset ID" value={asset.externalAssetId ?? asset.id} />
                <AssetFact label="Compliance" value={asset.complianceStatus} />
              </dl>
            </div>

            {/* THE NEXT QUESTION, and only now answerable. */}
            <SheetField
              label="Products"
            >
              <MultiSelect
                options={[...PRODUCTS]}
                value={draft.products}
                onChange={(v) => set("products", v)}
                addLabel="Add product"
                searchPlaceholder="Search products…"
                emptyText="No product found."
              />
            </SheetField>
          </>
        )}

        <AssetPickerSheet
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          assets={available}
          selectedId={draft.assetId}
          onSelect={(id) => set("assetId", id)}
          sourceLabel={sourceLabel}
        />
      </SheetSection>

      {/* Two OPTIONAL manifests, each hidden until asked for — the same rule
          the Load Order follows. A list nobody fills is a section people learn
          to scroll past. The switch rides the SECTION HEADING now that each is
          a section of its own, which is also what stops it being mistaken for
          a row of the table beneath it. */}
      <SheetSection
        flush
        /* THE ADD HANGS OFF THE CARD — DS ui §10f. Only while the table is
           there to add to; the empty state has its own CTA. */
        hanging={
          draft.peripheralsOn ? (
            <HangingAdd
              label="Add peripheral"
              onClick={() => {
                setFocusPeripheral(draft.peripherals.length);
                setDraft((d) => ({
                  ...d,
                  peripherals: [...d.peripherals, blankPeripheral()],
                }));
              }}
            />
          ) : undefined
        }
        title="Add Peripheral"
        /* QUIET UNTIL REACHED FOR — the same removal affordance the Load Order
           carries, and for the same reason: emptying an optional list is
           destructive, so it does not compete with the table, and it keeps its
           label because "Remove" beside a table of rows reads as though it
           might remove a row. */
        action={
          draft.peripheralsOn && (
            <SheetSectionRemove
              label="Remove peripherals"
              /* A row counts as filled the moment ANY of its four cells has a
                 value. The blank starter row the table opens with is not
                 content — asking about it would be asking about nothing. */
              hasContent={draft.peripherals.some(
                (x) => x.name || x.serial || x.condition || x.ownership
              )}
              onClick={() => {
                set("peripheralsOn", false);
                set("peripherals", [blankPeripheral()]);
              }}
            />
          )
        }
      >
        {draft.peripheralsOn ? (
          <div>
            {/* NO RIM OF ITS OWN — the card supplies it (DS ui §10f). */}
            <div className="overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col />
                  <col className="w-[26%]" />
                  <col className="w-[20%]" />
                  <col className="w-[22%]" />
                  <col className="w-[52px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-fp-table-header">
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel required>Peripheral</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Serial no.</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Condition</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Ownership status</TableRequiredLabel>
                    </th>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {draft.peripherals.map((p, i) => (
                    <tr
                      key={i}
                      className="group/row h-11 border-b border-border last:border-b-0"
                    >
                      <td className="relative p-0">
                        <TableCellCombobox
                          value={p.name}
                          options={PERIPHERALS}
                          /* One peripheral, one row — the same rule the
                             Delivery Order's asset column follows. */
                          taken={draft.peripherals.map((x) => x.name)}
                          creatable
                          placeholder="Select"
                          autoFocus={i === focusPeripheral}
                          aria-label={`Peripheral ${i + 1}`}
                          onChange={(v) => setPeripheral(i, { name: v })}
                          /* SEVERAL AT ONCE MAKES ROWS (DS ui §10f). */
                          multiple={
                            p.name
                              ? undefined
                              : {
                                  onApply: (names) =>
                                    setDraft((d) => {
                                      const peripherals = [...d.peripherals];
                                      peripherals.splice(i, 1, ...names.map((name) => ({ ...blankPeripheral(), name })));
                                      return { ...d, peripherals };
                                    }),
                                }
                          }
                        />
                      </td>
                      <td className="relative p-0">
                        <TableCellInput
                          value={p.serial}
                          placeholder="Enter serial no."
                          aria-label={`Serial number for peripheral ${i + 1}`}
                          onChange={(v) => setPeripheral(i, { serial: v })}
                        />
                      </td>
                      <td className="relative p-0">
                        {/* ONE VALUE — the peripheral's condition, not a row of its own (DS ui §10f). */}
                        <TableCellSelect
                          value={p.condition}
                          options={CONDITIONS}
                          placeholder="Select"
                          aria-label={`Condition of peripheral ${i + 1}`}
                          onChange={(v) => setPeripheral(i, { condition: v })}
                        />
                      </td>
                      <td className="relative p-0">
                        {/* ONE VALUE — the peripheral's ownership, not a row of its own (DS ui §10f). */}
                        <TableCellSelect
                          value={p.ownership}
                          options={OWNERSHIP}
                          placeholder="Select"
                          aria-label={`Ownership status of peripheral ${i + 1}`}
                          onChange={(v) => setPeripheral(i, { ownership: v })}
                        />
                      </td>
                      <td className="relative p-0 text-center">
                        <TableRowRemove
                          aria-label={`Remove ${p.name || `peripheral ${i + 1}`}`}
                          disabled={draft.peripherals.length === 1}
                          onRemove={() =>
                            setDraft((d) => ({
                              ...d,
                              peripherals: d.peripherals.filter((_, k) => k !== i),
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* THE EMPTY STATE IS THE TABLE'S OWN BOX, dashed, with the CTA inside
             it — the Load Order's shape. A switch floating on the heading said
             the section could be turned on but not what turning it on would
             give you; a box the size of the table, naming the thing it will
             hold, does both. */
          <div className="m-4 flex items-center justify-between gap-4 rounded-md border border-dashed border-fp-outline-1 px-4 py-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm text-foreground">Add Peripheral</span>
              <span className="text-xs text-muted-foreground">
                List peripherals to include with the asset's movement order.
              </span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => set("peripheralsOn", true)}
            >
              <Plus /> Add
            </Button>
          </div>
        )}
      </SheetSection>

      <SheetSection
        flush
        /* THE ADD HANGS OFF THE CARD — DS ui §10f. */
        hanging={
          draft.customOn ? (
            <HangingAdd
              label="Add item"
              onClick={() => {
                setFocusItem(draft.customItems.length);
                setDraft((d) => ({
                  ...d,
                  customItems: [
                    ...d.customItems,
                    { name: "", qty: null, unit: UNITS[0] },
                  ],
                }));
              }}
            />
          ) : undefined
        }
        title="Custom Items"
        action={
          draft.customOn && (
            <SheetSectionRemove
              label="Remove custom items"
              /* The unit is prefilled with the first option, so it says nothing
                 about whether anyone has been here — only a name or a quantity
                 does. */
              hasContent={draft.customItems.some((x) => x.name || x.qty != null)}
              onClick={() => {
                set("customOn", false);
                set("customItems", [{ name: "", qty: null, unit: UNITS[0] }]);
              }}
            />
          )
        }
      >
        {draft.customOn ? (
          <div>
            {/* NO RIM OF ITS OWN — the card supplies it (DS ui §10f). */}
            <div className="overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col />
                  <col className="w-[120px]" />
                  <col className="w-[120px]" />
                  <col className="w-[52px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-fp-table-header">
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel required>Item</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-right">
                      <TableRequiredLabel>Qty</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Unit</TableRequiredLabel>
                    </th>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {draft.customItems.map((it, i) => (
                    <tr
                      key={i}
                      className="group/row h-11 border-b border-border last:border-b-0"
                    >
                      <td className="relative p-0">
                        <TableCellInput
                          value={it.name}
                          placeholder="Describe the item"
                          autoFocus={i === focusItem}
                          aria-label={`Custom item ${i + 1}`}
                          onChange={(v) => setItem(i, { name: v })}
                        />
                      </td>
                      <td className="relative p-0">
                        <TableCellInput
                          value={it.qty == null ? "" : String(it.qty)}
                          placeholder="0"
                          numeric
                          aria-label={`Quantity for item ${i + 1}`}
                          onChange={(v) =>
                            setItem(i, { qty: Number(v.replace(/[^0-9]/g, "")) || null })
                          }
                        />
                      </td>
                      <td className="relative p-0">
                        {/* ONE VALUE — the item's unit, not a row of its own (DS ui §10f). */}
                        <TableCellSelect
                          value={it.unit}
                          options={UNITS}
                          aria-label={`Unit for item ${i + 1}`}
                          onChange={(v) => setItem(i, { unit: v })}
                        />
                      </td>
                      <td className="relative p-0 text-center">
                        <TableRowRemove
                          aria-label={`Remove ${it.name || `item ${i + 1}`}`}
                          disabled={draft.customItems.length === 1}
                          onRemove={() =>
                            setDraft((d) => ({
                              ...d,
                              customItems: d.customItems.filter((_, k) => k !== i),
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="m-4 flex items-center justify-between gap-4 rounded-md border border-dashed border-fp-outline-1 px-4 py-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm text-foreground">Add Custom Items</span>
              <span className="text-xs text-muted-foreground">
                Anything to include with the asset's Lease Equipment Order.
              </span>
            </span>
            <Button variant="outline" size="sm" onClick={() => set("customOn", true)}>
              <Plus /> Add
            </Button>
          </div>
        )}
      </SheetSection>

      <SheetSection title="Additional Details">
        <SheetField
          label="Upload Supporting Documents"
        >
          <FileUpload variant="field" label="Choose a file to upload" note="" />
        </SheetField>
        <SheetField label="Document access">
          <Combobox
            className="w-full"
            value=""
            onValueChange={() => {}}
            options={DOC_ACCESS}
            placeholder="Select Document access type"
          />
        </SheetField>
        <SheetField label="Delivery Instructions">
          <Textarea
            value={draft.instructions}
            placeholder="Anything the driver needs at the gate…"
            onChange={(e) => set("instructions", e.target.value)}
            className="min-h-24"
          />
        </SheetField>
        <SheetField
          label="Internal Note"
        >
          <Textarea
            value={draft.internalNote}
            placeholder="Add an internal note"
            onChange={(e) => set("internalNote", e.target.value)}
            className="min-h-24"
          />
        </SheetField>
        {/* CUSTOMER AND SHIP-TO NOTES ARE READ-OUTS. They belong to the records
            above, not to this order — editing them here would change something
            the person did not come to change. Text, not a disabled field. */}
        <div className="grid grid-cols-2 gap-4">
          {/* THE NOTES BELONG TO THE CUSTOMER END. A relocate has no customer
              at either end, so there is no account whose note this could be —
              the pair is absent rather than sitting there saying "select a
              customer" next to a form that will never ask for one. */}
          <SheetField label="Customer Note">
            <div className="min-h-9 rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3 py-2 text-sm text-muted-foreground">
              {notePoint?.customer ? "No note on this account." : "Select a customer."}
            </div>
          </SheetField>
          <SheetField label="ShipTo Note">
            <div className={cn(
              "min-h-9 rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3 py-2 text-sm",
              noteSite ? "text-foreground" : "text-muted-foreground"
            )}>
              {noteSite
                ? "Gate code 4417. Tanks are behind the shop, back in from the north side."
                : "Select a ship-to."}
            </div>
          </SheetField>
        </div>
      </SheetSection>
      {drawer}
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this order?</AlertDialogTitle>
            <AlertDialogDescription>
              All the details you've added will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => onOpenChange(false)}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RecordSheet>
  );
}
