import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { SERVICE_LINES, type ScopeKey } from "./scope";

/** Segment order: every line, then one segment per line of service. */
const SEGMENTS: { key: ScopeKey; label: string }[] = [
  { key: "all", label: "All" },
  ...SERVICE_LINES,
];

/**
 * Line-of-service scope selector — a segmented control seated at the head of the
 * preset-view row, ahead of the saved views. Filters the row set; the columns,
 * toolbar and footer are identical for every line.
 *
 * Every count is visible without opening anything, which is the point of the
 * control: the counts are how you tell where the work is. Sized `h-7` so it sits
 * inside the tab strip without out-weighing the preset tabs beside it.
 */
export function ScopeSelector({
  value,
  counts,
  onChange,
}: {
  value: ScopeKey;
  counts: Record<ScopeKey, number>;
  onChange: (next: ScopeKey) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      // Radix emits "" when the active item is pressed again. A scope is never
      // empty — ignore the deselect so one segment always stays chosen.
      onValueChange={(next) => next && onChange(next as ScopeKey)}
      aria-label="Line of service"
      className="h-7"
    >
      {SEGMENTS.map((segment) => (
        <ToggleGroupItem
          key={segment.key}
          value={segment.key}
          className="h-7 gap-1.5 px-2.5 text-xs font-normal data-[state=on]:font-medium"
        >
          {segment.label}
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {counts[segment.key].toLocaleString()}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
