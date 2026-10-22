import * as React from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Package,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePanel } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  BeforeAfterTable,
  BulkEditDialog,
  OrderMiniTable,
  StandingLoad,
  type OrderRef,
} from "./BulkEditDialog";
import { MultiSelectList } from "@/components/ui/multi-select-list";
import { DATE_FMT, splitGallons } from "./data";
import type { FuelOrder } from "./types";

/**
 * Floating bulk-action bar for Fuel Orders.
 *
 * Geometry, entrance animation, count chip and delete-confirm are the DS's
 * "FAB bulk actions" (Figma 27631:11151) — `bulk-bar-in`, rounded-lg, 1px
 * border, p-1.5, a primary count chip with a clear ×, a hairline
 * before the destructive zone, and Delete always behind an AlertDialog. Labels
 * are mandatory on the field actions, per the DS's own note that these are never
 * icon-only.
 *
 * Every field action opens the two-step `BulkEditDialog` — pick, then review
 * what already exists and what changes, then commit. That is `02-rules/
 * interaction-and-behavior.md` §4b (locked decision 11), which assigns each
 * attribute an editor by CARDINALITY, and these are not all the same tier:
 *
 *   Tier 1  scalar, one value for every row      Planned date, Planned time
 *   Tier 2  one value per row                    Driver
 *   Tier 3  a collection per row                 Products, Tags
 *
 * They previously shared one flat popover that committed on click, which met
 * none of §4b: no dialog, no scope+count header, no preview, and — worst — no
 * confirmation on Products, which REPLACES an order's product lines and so
 * silently rewrites the Qty column that sums them.
 *
 * THREE DELIBERATE DIFFERENCES FROM THE DS BAR:
 *
 * 1. FILL — no longer a difference. The DS bar has since been fixed the same way
 *    and this fork now copies it verbatim: `bg-fp-surface-1a` (white) in light,
 *    `dark:bg-fp-card-1` (#2a2f37) in dark. Both themes had the same original
 *    problem for opposite reasons: `bg-popover` is byte-identical to
 *    `--fp-surface-1b` in BOTH (#ffffff light, #1b2028 dark), so the fill matched
 *    the content layer it floats over. Note white-on-white means LIGHT still has
 *    no fill contrast against the content layer — the outline and
 *    `shadow-fp-overlay` carry the separation there, which is why the border is
 *    explicit rather than inherited.
 *
 * 2. ACTION SET. The DS bar's verbs (Assign / Unassign / Unblock / Verify /
 *    Unverify) plus Copy and a ··· More menu are not this screen's actions, and
 *    the component takes no way to change them. This screen's set is the five
 *    fields a dispatcher edits across orders, plus Delete. No Copy, no More.
 *
 * 3. ELEVATION. §4b specifies `--shadow-md` for this bar. Measured, that is
 *    WEAKER than the `shadow-lg` this file used to carry (Tailwind's md is 10%
 *    black at 4px; lg is 10% black at 10px), and both are effectively invisible
 *    here — because of difference 1's root cause. The bar only ever appears
 *    WHEN ROWS ARE SELECTED, so its real backdrop on three sides is selected
 *    rows, and the selected-row fill is `--accent` = #2a2f37 in FP-dark,
 *    byte-identical to this bar's own `--fp-card-1`. Measured delta against its
 *    own backdrop: [0,0,0]. With no fill contrast available the shadow carries
 *    the whole separation, so this uses `shadow-fp-overlay` — a new overlay
 *    elevation tier, theme-aware because 10% black does not register on
 *    #2a2f37. See src/index.css.
 *
 * DS FOLLOW-UP: parameterise `tables-layout/BulkActionBar` so the verb set is a
 * prop, and move the fill off `bg-popover`. Then this file deletes itself.
 * Fourth component in this prototype copied for want of a prop — see also
 * TokenMultiSelect and ProductTable.
 */

export interface FuelOrdersBulkBarProps {
  count: number;
  /**
   * HOW MANY OF THEM THE FIELD EDITS REACH (Pavan, 2026-10-07) — Sales Orders
   * mixes fuel and asset orders, and the five edits are a fuel order's
   * fields. Defaults to `count`; at 0 only Delete is offered.
   */
  editCount?: number;
  onClear: () => void;
  /**
   * Replace every selected order's product lines with these products, splitting
   * that order's own total gallons across them.
   */
  onSetProducts: (products: string[]) => void;
  /** `null` clears the driver, which also makes the orders Unassigned. */
  onSetDriver: (driver: string | null) => void;
  onSetPlannedDate: (date: Date) => void;
  onSetPlannedTime: (time: string) => void;
  /** Adds tags to whatever each order already carries. */
  onAddTags: (tags: string[]) => void;
  onDelete: () => void;
  productOptions: string[];
  driverOptions: string[];
  tagOptions: string[];
  /** The orders being edited — what the preview step reads. */
  selectedOrders: FuelOrder[];
  /**
   * Every order NOT in the selection. A driver's standing load is derived from
   * this, so an order that is both already theirs and in the selection is
   * counted once, under "being added", rather than appearing on both sides.
   */
  unselectedOrders: FuelOrder[];
}

/** Bar trigger — a labelled button that opens that action's dialog. */
function FieldAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}

type ActionKey = "products" | "driver" | "date" | "time" | "tags";

/**
 * Order -> the identity every summary table renders. Lives here rather than
 * beside `OrderRef` so BulkEditDialog exports components only and stays inside
 * react-refresh's one-warning budget.
 */
function toOrderRef(o: FuelOrder): OrderRef {
  return {
    orderNo: o.orderNo,
    typeLabel: o.type.label,
    shipTo: o.customer.description,
  };
}

/** "Shriya Test 2" -> "ST". Matches how the Driver column builds its avatar. */
function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function FuelOrdersBulkBar({
  count,
  editCount = count,
  onClear,
  onSetProducts,
  onSetDriver,
  onSetPlannedDate,
  onSetPlannedTime,
  onAddTags,
  onDelete,
  productOptions,
  driverOptions,
  tagOptions,
  selectedOrders,
  unselectedOrders,
}: FuelOrdersBulkBarProps) {
  const [action, setAction] = React.useState<ActionKey | null>(null);

  // Pending values — nothing is committed until Confirm on step 2.
  const [products, setProducts] = React.useState<string[]>([]);
  // `undefined` = nothing picked yet; `null` = the explicit "Unassigned" option.
  const [driver, setDriver] = React.useState<string | null | undefined>(undefined);
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [time, setTime] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);

  const close = () => {
    setAction(null);
    setProducts([]);
    setDriver(undefined);
    setDate(undefined);
    setTime("");
    setTags([]);
  };

  /**
   * Every driver's standing load, keyed by name — SCOPED TO THE DELIVERY
   * DATE(S) THE SELECTION IS ON. The dataset spans four days (TOTAL 115 rows
   * over dayOffset -1..+2) while the list is date-filtered to one, so counting
   * every date answered a question nobody asked: it reported Shriya at 38 when
   * only 12 of those share the day being dispatched. A driver's load on the day
   * you are assigning is the number that decides whether to give them another
   * order. Selections cannot straddle dates today — the date filter scopes the
   * list first — but this keys off the selection rather than the filter so it
   * stays correct if that ever changes.
   */
  const scopeDateKeys = React.useMemo(
    () => new Set(selectedOrders.map((o) => o.dateKey)),
    [selectedOrders]
  );
  const standingLoad = React.useMemo(() => {
    const m = new Map<string, FuelOrder[]>();
    for (const o of unselectedOrders) {
      if (!o.driver) continue;
      if (!scopeDateKeys.has(o.dateKey)) continue;
      const list = m.get(o.driver.name);
      if (list) list.push(o);
      else m.set(o.driver.name, [o]);
    }
    return m;
  }, [unselectedOrders, scopeDateKeys]);

  const added = selectedOrders.map(toOrderRef);

  /** Before/after rows for one field. */
  const preview = (before: (o: FuelOrder) => string, after: string) =>
    selectedOrders.map((o) => ({
      orderNo: o.orderNo,
      before: before(o),
      after,
    }));

  if (count <= 0) return null;

  return (
    <>
      {/* Fill and border are copied VERBATIM from the DS bar
          (`tables-layout/BulkActionBar`) so the fork cannot drift from it again:
          white in light, the card surface in dark, with the outline stepping up a
          shade in dark. This fork had been left on `bg-fp-card-1` when the DS bar
          was moved to white, so the fix never reached this screen. */}
      <div className="bulk-bar-in flex items-center gap-1 rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-1.5 shadow-fp-overlay dark:border-fp-outline-2 dark:bg-fp-card-1">
        {/* Count chip — primary filled, with a clear ×. */}
        <span className="flex items-center gap-2 rounded-md bg-primary py-1 pr-1.5 pl-2.5 text-sm font-medium text-primary-foreground">
          {count} Selected
          <button
            type="button"
            aria-label="Clear selection"
            onClick={onClear}
            className="rounded-sm text-primary-foreground/80 outline-none transition-colors hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-3.5" />
          </button>
        </span>

        {editCount > 0 && (
          <>
            <FieldAction
              icon={<Package />}
              label="Products"
              onClick={() => setAction("products")}
            />
            <FieldAction
              icon={<User />}
              label="Driver"
              onClick={() => setAction("driver")}
            />
            <FieldAction
              icon={<CalendarIcon />}
              label="Planned date"
              onClick={() => setAction("date")}
            />
            <FieldAction
              icon={<Clock />}
              label="Planned time"
              onClick={() => setAction("time")}
            />
            <FieldAction
              icon={<Tag />}
              label="Add tags"
              onClick={() => setAction("tags")}
            />
            <div className="mx-1 h-5 w-px bg-border" aria-hidden />
          </>
        )}

        {/* Delete — icon only, and always behind a confirm. */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {count} {count === 1 ? "order" : "orders"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will affect {count} {count === 1 ? "order" : "orders"} and
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* ---- Tier 3 · Products. Replaces the product lines, so the preview is
           the only thing standing between the operator and a rewritten Qty. --- */}
      <BulkEditDialog
        open={action === "products"}
        onOpenChange={(o) => !o && close()}
        title="Products"
        scopeVerb="Set the products on"
        count={editCount}
        canProceed={products.length > 0}
        summaryDescription={
          products.length === 1
            ? "Each order's existing product lines are replaced by this one product, keeping that order's own total gallons."
            : `Each order's existing product lines are replaced by these ${products.length} products. That order's own total gallons are split evenly across them, so the Qty column does not change.`
        }
        onConfirm={() => products.length > 0 && onSetProducts(products)}
        summary={
          <BeforeAfterTable
            valueHeader="Products"
            rows={selectedOrders.map((o) => {
              const split = splitGallons(o.qtyGal, products.length);
              return {
                orderNo: o.orderNo,
                before: o.products
                  .map((pr) => `${pr.name} (${pr.gal.toLocaleString()} gal)`)
                  .join(", "),
                // Gallons are printed, not just names: the split is an
                // assumption (see splitGallons) and this is where it is visible.
                after: products
                  .map((n, i) => `${n} (${split[i].toLocaleString()} gal)`)
                  .join(", "),
              };
            })}
          />
        }
      >
        <MultiSelectList
          placeholder="Search products..."
          empty="No products found."
          options={productOptions}
          value={products}
          onChange={setProducts}
        />
      </BulkEditDialog>

      {/* ---- Tier 2 · Driver. The list surfaces each driver's standing load,
           and the summary opens it up next to what is being added. ---------- */}
      <BulkEditDialog
        open={action === "driver"}
        onOpenChange={(o) => !o && close()}
        title="Driver"
        scopeVerb="Assign driver to"
        count={editCount}
        canProceed={driver !== undefined}
        summaryDescription={
          driver
            ? "The driver will be assigned to all the selected orders."
            : "The driver will be cleared from all the selected orders, returning them to Unassigned."
        }
        onConfirm={() => driver !== undefined && onSetDriver(driver)}
        summary={
          <div className="flex flex-col gap-5">
            {driver ? (
              <StandingLoad
                name={driver}
                orders={(standingLoad.get(driver) ?? []).map(toOrderRef)}
              />
            ) : null}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">
                {driver ? "Orders being added" : "Orders being unassigned"}
              </span>
              <OrderMiniTable orders={added} />
            </div>
          </div>
        }
      >
        <Command className="rounded-md border border-border">
          <CommandInput placeholder="Search driver" />
          <CommandList>
            <CommandEmpty>No drivers found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Unassigned"
                selected={driver === null}
                onSelect={() => setDriver(null)}
              >
                <span className="text-muted-foreground italic">— Unassigned</span>
              </CommandItem>
              {driverOptions.map((d) => {
                const n = standingLoad.get(d)?.length ?? 0;
                return (
                  <CommandItem
                    key={d}
                    value={d}
                    selected={driver === d}
                    onSelect={() => setDriver(d)}
                    icon={
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px]">
                          {initialsOf(d)}
                        </AvatarFallback>
                      </Avatar>
                    }
                    shortcut={
                      n === 0
                        ? "No orders assigned"
                        : `${n} ${n === 1 ? "order" : "orders"} assigned`
                    }
                  >
                    {d}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </BulkEditDialog>

      {/* ---- Tier 1 · Planned date. Scalar, but rows differ going in — some
           carry no planned date at all, so the preview still informs. ------- */}
      <BulkEditDialog
        open={action === "date"}
        onOpenChange={(o) => !o && close()}
        title="Planned date"
        scopeVerb="Set the planned date on"
        count={editCount}
        canProceed={date !== undefined}
        summaryDescription="This planned date replaces whatever each selected order carries now. The delivery date is unaffected."
        onConfirm={() => date && onSetPlannedDate(date)}
        summary={
          <BeforeAfterTable
            valueHeader="planned date"
            rows={preview(
              (o) => o.planned?.date ?? "",
              date ? DATE_FMT.format(date) : ""
            )}
          />
        }
      >
        <div className="flex justify-center">
          <DatePanel selected={date} onSelect={setDate} />
        </div>
      </BulkEditDialog>

      {/* ---- Tier 1 · Planned time. ------------------------------------- */}
      <BulkEditDialog
        open={action === "time"}
        onOpenChange={(o) => !o && close()}
        title="Planned time"
        scopeVerb="Set the planned time on"
        count={editCount}
        canProceed={time.trim().length > 0}
        summaryDescription="This planned time replaces whatever each selected order carries now."
        onConfirm={() => time.trim() && onSetPlannedTime(time.trim())}
        summary={
          <BeforeAfterTable
            valueHeader="planned time"
            rows={preview((o) => o.planned?.time ?? "", time.trim())}
          />
        }
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="bulk-planned-time" className="text-sm font-medium">
            Planned time
          </label>
          <Input
            id="bulk-planned-time"
            autoFocus
            value={time}
            placeholder="e.g. 1:35 AM"
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </BulkEditDialog>

      {/* ---- Tier 3 · Tags. ADDITIVE — the preview shows the union, not a
           replacement, which is why "before" is never struck through here in
           spirit even though the shared table renders it that way. --------- */}
      <BulkEditDialog
        open={action === "tags"}
        onOpenChange={(o) => !o && close()}
        title="Add tags"
        scopeVerb="Add tags to"
        count={editCount}
        canProceed={tags.length > 0}
        summaryDescription="These tags are ADDED to whatever each order already carries — nothing is removed."
        onConfirm={() => tags.length > 0 && onAddTags(tags)}
        summary={
          <BeforeAfterTable
            valueHeader="tags"
            rows={selectedOrders.map((o) => ({
              orderNo: o.orderNo,
              before: o.tags.join(", "),
              after: Array.from(new Set([...o.tags, ...tags])).join(", "),
            }))}
          />
        }
      >
        <MultiSelectList
          placeholder="Search tags..."
          empty="No tags found."
          options={tagOptions}
          value={tags}
          onChange={setTags}
        />
      </BulkEditDialog>
    </>
  );
}
