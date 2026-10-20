import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetSection, SheetSectionRemove } from "@/components/side-sheet/parts";
import { RuleFrequencyPicker, blankFrequency, type RuleFrequency } from "./threepl/RuleFrequency";

/*
  RECURRING ORDER, AS THE 3PL LOAD ORDER (Pavan, 2026-10-20) — an optional
  section on every order sheet that can repeat: a dashed "Add" row until it's
  asked for, then the recurring rule's own frequency unit in a box, removed
  with the section's minus. One unit for every module, so a repeat is set the
  same way wherever it's set.
*/
export function RecurringOrderSection({
  on,
  schedule,
  plannedDay,
  onChange,
  onRemove,
  locked,
  title = "Recurring order",
  id,
}: {
  on: boolean;
  schedule?: RuleFrequency | null;
  /** The planned date's weekday — a new repeat starts on it, weekly. */
  plannedDay?: number;
  /** Turned on, or changed — the unit as it now stands. */
  onChange: (f: RuleFrequency) => void;
  onRemove: () => void;
  locked?: boolean;
  title?: string;
  id?: string;
}) {
  if (locked && !on) return null;
  return (
    <SheetSection
      id={id}
      title={title}
      action={on && !locked ? <SheetSectionRemove label={`Remove ${title.toLowerCase()}`} onClick={onRemove} /> : undefined}
    >
      {!on ? (
        <div className="flex items-center justify-between gap-4 rounded-md border border-dashed border-fp-outline-1 px-4 py-3">
          <span className="text-sm text-foreground">Add Recurring Order</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(schedule ?? { ...blankFrequency(), days: [plannedDay ?? new Date().getDay()] })}
          >
            <Plus /> Add
          </Button>
        </div>
      ) : (
        <fieldset disabled={locked} className="min-w-0 rounded-md border border-fp-outline-1 p-4">
          <RuleFrequencyPicker value={schedule ?? blankFrequency()} onChange={onChange} />
        </fieldset>
      )}
    </SheetSection>
  );
}
