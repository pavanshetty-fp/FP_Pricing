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
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
 * THREE DELIBERATE DIFFERENCES FROM THE DS BAR:
 *
 * 1. FILL. The DS bar uses `bg-popover`, and in BOTH themes `--popover` is the
 *    same value as `--fp-surface-1b` (#1b2028 dark, #ffffff light) — the content
 *    layer this bar floats over. So the fill was byte-identical to the surface
 *    behind it and only the hairline and shadow separated them, which is why it
 *    read as low contrast. This uses `bg-fp-card-1` (#2a2f37 dark, #e9ecf1
 *    light): the DS's card surface, i.e. one step of elevation above the content
 *    layer, in both themes. Same collision as the row-hover bug — worth fixing
 *    on the DS bar too, since it is not specific to this screen.
 *
 * 2. ACTION SET. The DS bar's verbs (Assign / Unassign / Unblock / Verify /
 *    Unverify) plus Copy and a ··· More menu are not this screen's actions, and
 *    the component takes no way to change them. This screen's set is the five
 *    fields a dispatcher edits across orders, plus Delete. No Copy, no More.
 *
 * 3. ELEVATION. `interaction-and-behavior.md` §4b specifies `--shadow-md` for
 *    this bar. Measured, that is WEAKER than the `shadow-lg` this file used to
 *    carry (Tailwind's md is 10% black at 4px; lg is 10% black at 10px), and
 *    both are effectively invisible here — because of difference 1's root
 *    cause. The bar only ever appears WHEN ROWS ARE SELECTED, so its real
 *    backdrop on three sides is selected rows, and the selected-row fill is
 *    `--accent` = #2a2f37 in FP-dark, byte-identical to this bar's own
 *    `--fp-card-1`. Measured delta against its own backdrop: [0,0,0]. With no
 *    fill contrast available the shadow carries the whole separation, so this
 *    uses `shadow-fp-overlay` — a new overlay elevation tier, theme-aware
 *    because 10% black does not register on #2a2f37. See src/index.css.
 *
 * DS FOLLOW-UP: parameterise `tables-layout/BulkActionBar` so the verb set is a
 * prop, and move the fill off `bg-popover`. Then this file deletes itself.
 * Fourth component in this prototype copied for want of a prop — see also
 * TokenMultiSelect and ProductTable.
 */

export interface FuelOrdersBulkBarProps {
  count: number;
  onClear: () => void;
  /** Replace every selected order's product lines with one product. */
  onSetProduct: (product: string) => void;
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
}

/** Field action — a labelled trigger opening a small editor. */
function FieldAction({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          {icon}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" sideOffset={8} className="w-auto p-0">
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** Single-select list used by Products and Driver. */
function PickList({
  placeholder,
  options,
  extra,
  onPick,
}: {
  placeholder: string;
  options: string[];
  /** An option that maps to `null`, e.g. "— Unassigned". */
  extra?: { label: string; value: null };
  onPick: (value: string | null) => void;
}) {
  return (
    <Command className="w-64">
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>No options found.</CommandEmpty>
        <CommandGroup>
          {extra && (
            <CommandItem value={extra.label} onSelect={() => onPick(null)}>
              {extra.label}
            </CommandItem>
          )}
          {options.map((o) => (
            <CommandItem key={o} value={o} onSelect={() => onPick(o)}>
              {o}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function FuelOrdersBulkBar({
  count,
  onClear,
  onSetProduct,
  onSetDriver,
  onSetPlannedDate,
  onSetPlannedTime,
  onAddTags,
  onDelete,
  productOptions,
  driverOptions,
  tagOptions,
}: FuelOrdersBulkBarProps) {
  const [time, setTime] = React.useState("");
  const [pendingTags, setPendingTags] = React.useState<string[]>([]);

  if (count <= 0) return null;

  return (
    <div className="bulk-bar-in flex items-center gap-1 rounded-lg border border-border bg-fp-card-1 p-1.5 shadow-fp-overlay">
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

      <FieldAction icon={<Package />} label="Products">
        <PickList
          placeholder="Search products..."
          options={productOptions}
          onPick={(v) => v && onSetProduct(v)}
        />
      </FieldAction>

      <FieldAction icon={<User />} label="Driver">
        <PickList
          placeholder="Search drivers..."
          options={driverOptions}
          extra={{ label: "— Unassigned", value: null }}
          onPick={(v) => onSetDriver(v)}
        />
      </FieldAction>

      <FieldAction icon={<CalendarIcon />} label="Planned date">
        <Calendar mode="single" onSelect={(d) => d && onSetPlannedDate(d)} autoFocus />
      </FieldAction>

      <FieldAction icon={<Clock />} label="Planned time">
        <div className="flex w-56 flex-col gap-2 p-3">
          <label className="text-xs font-medium text-muted-foreground">
            Planned time
          </label>
          <Input
            autoFocus
            value={time}
            placeholder="e.g. 1:35 AM"
            onChange={(e) => setTime(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && time.trim()) onSetPlannedTime(time.trim());
            }}
          />
          <Button
            size="sm"
            disabled={!time.trim()}
            onClick={() => onSetPlannedTime(time.trim())}
          >
            Apply to {count}
          </Button>
        </div>
      </FieldAction>

      <FieldAction icon={<Tag />} label="Add tags">
        <div className="w-64">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {tagOptions.map((t) => (
                  <CommandItem
                    key={t}
                    value={t}
                    selected={pendingTags.includes(t)}
                    onSelect={() =>
                      setPendingTags((prev) =>
                        prev.includes(t)
                          ? prev.filter((x) => x !== t)
                          : [...prev, t]
                      )
                    }
                  >
                    {t}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="border-t border-border p-2">
            <Button
              size="sm"
              className="w-full"
              disabled={pendingTags.length === 0}
              onClick={() => {
                onAddTags(pendingTags);
                setPendingTags([]);
              }}
            >
              Add to {count}
            </Button>
          </div>
        </div>
      </FieldAction>

      <div className="mx-1 h-5 w-px bg-border" aria-hidden />

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
  );
}
