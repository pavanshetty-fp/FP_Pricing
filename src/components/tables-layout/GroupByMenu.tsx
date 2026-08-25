import * as React from "react";
import { Group, Rows3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/*
  Group By menu — Figma "Action Bar Unit · Group by" (28025:1274). The Group By
  button opens a dropdown of groupable dimensions; single-select (re-selecting
  the active dimension clears grouping). The button reflects the active choice.
*/
const DIMENSIONS = [
  "Status",
  "Customer",
  "ShipTo",
  "Created At",
  "Type",
  "Planned At",
  "State",
  "City",
  "ZIP",
  "Source",
  "Driver",
  "Truck",
  "Created By",
  "Assigned By",
];

export function GroupByMenu({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = React.useState<string | null>(null);

  return (
    <DropdownMenu>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={active ? `Group by: ${active}` : "Group by"}
                className={active ? "text-foreground" : undefined}
              >
                <Group />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{active ? `Group by: ${active}` : "Group by"}</TooltipContent>
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
          <Button variant="outline" size="sm" className="border-input bg-transparent">
            <Group />
            {active ? `Group by: ${active}` : "Group By"}
          </Button>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="start" className="max-h-[360px] w-40 overflow-y-auto">
        {DIMENSIONS.map((d) => (
          <DropdownMenuItem
            key={d}
            onSelect={() => setActive((prev) => (prev === d ? null : d))}
          >
            <Rows3 />
            {d}
            {active === d && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
