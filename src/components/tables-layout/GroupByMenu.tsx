import * as React from "react";
import { Group, Rows3, Check, Layers, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/*
  Group By menu — Figma "Action Bar Unit · Group by" (28025:1274).

  Two modes, so one component serves both the showcase and a real list:

  • UNCONTROLLED (no `value`) — the original demo behaviour, single-select,
    state kept privately. Every existing caller lands here unchanged.
  • CONTROLLED (`value` + `onChange`) — an ORDERED, multi-select stack. The
    order is the design: the first dimension is the outer grouping, and picking
    Status before Customer splits every customer in two, which destroys the
    per-customer total that was the reason to group at all.

  `max` caps the depth (2 by default). Past two levels the indent eats the
  first column and the headers outnumber what they organise.

  Dimensions are supplied by the caller because they are a property of the
  DATA, not of the control. The default list below is illustrative only — a
  real list passes its own, since a dimension with no backing field can never
  group anything.
*/

export interface GroupByDimension {
  key: string;
  label: string;
  /**
   * A record belongs to every value it carries — three products, three groups —
   * so group counts deliberately sum past the list total. Marked in the menu.
   */
  multi?: boolean;
}

/** Illustrative default. Real lists pass `dimensions`. */
const DEMO_DIMENSIONS: GroupByDimension[] = [
  { key: "Status", label: "Status" },
  { key: "Customer", label: "Customer" },
  { key: "ShipTo", label: "Ship To" },
  { key: "Created At", label: "Created At" },
  { key: "Type", label: "Type" },
  { key: "Planned At", label: "Planned At" },
  { key: "Driver", label: "Driver" },
  { key: "Truck", label: "Truck" },
];

export interface GroupByMenuProps {
  compact?: boolean;
  /** Groupable dimensions for THIS list. */
  dimensions?: GroupByDimension[];
  /** Active dimension keys, outermost first. Supply to control the menu. */
  value?: string[];
  onChange?: (next: string[]) => void;
  /** Maximum nesting depth. */
  max?: number;
}

export function GroupByMenu({
  compact = false,
  dimensions = DEMO_DIMENSIONS,
  value,
  onChange,
  max = 2,
}: GroupByMenuProps) {
  const controlled = value !== undefined;
  const [own, setOwn] = React.useState<string[]>([]);
  const active = controlled ? value : own;
  const setActive = (next: string[]) => {
    if (!controlled) setOwn(next);
    onChange?.(next);
  };

  const toggle = (key: string) => {
    if (active.includes(key)) {
      setActive(active.filter((k) => k !== key));
      return;
    }
    // Uncontrolled keeps the original single-select behaviour.
    if (!controlled) {
      setActive([key]);
      return;
    }
    // At the cap the newest choice replaces the innermost, so the menu always
    // responds — a dead click with no explanation is worse than a swap.
    setActive(
      active.length >= max ? [...active.slice(0, max - 1), key] : [...active, key]
    );
  };

  const activeDims = active
    .map((k) => dimensions.find((d) => d.key === k))
    .filter((d): d is GroupByDimension => Boolean(d));
  const summary = activeDims.map((d) => d.label).join(" › ");
  const label = summary ? `Group by: ${summary}` : "Group By";

  return (
    <DropdownMenu>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={label}
                className={active.length > 0 ? "bg-accent text-foreground" : undefined}
              >
                <Group />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ) : (
        /* A plain JS comment, not `{/* … *\/}`: this is a ternary branch, an
           EXPRESSION slot, so a JSX comment plus an element would be two things
           where one is allowed. `bg-transparent` makes the button outline-only —
           the `outline` variant fills with `bg-background`, the APP background,
           which is right when the control sits on it and wrong on the white
           content layer where every toolbar puts this menu. The stroke moves to
           `--input` to match the search field beside it — the variant already
           uses `--input` in dark, so light was the odd one out. */
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={active.length > 0 ? "text-foreground" : undefined}
          >
            <Group />
            {label}
          </Button>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="start" className="max-h-[360px] w-56 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 text-xs font-normal text-muted-foreground">
          <span>Group rows by</span>
          {controlled && max > 1 && (
            <span className="tabular-nums">
              {active.length}/{max}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {dimensions.map((d) => {
          const rank = active.indexOf(d.key);
          return (
            <DropdownMenuItem
              key={d.key}
              /* Keeps the menu open so a two-level stack is one visit. */
              onSelect={(e) => {
                e.preventDefault();
                toggle(d.key);
              }}
            >
              <Rows3 />
              <span className="truncate">{d.label}</span>
              {d.multi && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Layers className="size-3.5 shrink-0 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    A record appears in every group it matches, so the counts add
                    up to more than the list total.
                  </TooltipContent>
                </Tooltip>
              )}
              {rank !== -1 &&
                (controlled && max > 1 ? (
                  <span
                    className={cn(
                      "ml-auto flex size-4 shrink-0 items-center justify-center rounded-full",
                      "bg-brand text-[10px] font-medium text-brand-foreground tabular-nums"
                    )}
                    aria-label={`Level ${rank + 1}`}
                  >
                    {rank + 1}
                  </span>
                ) : (
                  <Check className="ml-auto size-4 shrink-0" />
                ))}
            </DropdownMenuItem>
          );
        })}
        {controlled && active.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setActive([])}>
              <X />
              Clear grouping
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
