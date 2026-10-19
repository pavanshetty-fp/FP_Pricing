import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetField } from "@/components/side-sheet/parts";
import { TableCellSelect, TableRequiredLabel, TableRowRemove } from "@/components/form-layout/table-cells";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";
import { HangingAdd } from "../unified-view/HangingAdd";
import type { TimeSpan } from "./orders";

/*
  PREFERRED WINDOWS (Pavan, 2026-10-17) — on top of the delivery window, the
  times the customer would rather have it: window 8 AM – 2 PM, preferred
  10 – 12. None, one or several, each inside the delivery window (half-hour
  steps). A table, as every repeated input is; the add hangs off it. Set on
  an order, on a ship-to (new orders there start with it) and on a recurring
  rule (its orders inherit it).
*/

const STEP = 30;
const times = (from: number, to: number) => {
  const out: number[] = [];
  for (let t = from; t <= to; t += STEP) out.push(t);
  return out;
};

export function PreferredWindows({
  windowStart,
  windowEnd,
  value,
  onChange,
  disabled,
}: {
  /** The delivery window they sit inside, minutes from midnight. */
  windowStart: number;
  windowEnd: number;
  value: TimeSpan[];
  onChange: (next: TimeSpan[]) => void;
  disabled?: boolean;
}) {
  const [focusRow, setFocusRow] = React.useState<number | undefined>();
  const span = windowEnd - windowStart;
  const add = () => {
    /* THE NEXT FREE HOUR AFTER THE LAST ONE, else the window's first. */
    const from = value.length ? Math.min(value[value.length - 1].end, windowEnd - STEP) : windowStart;
    setFocusRow(value.length);
    onChange([...value, { start: from, end: Math.min(windowEnd, from + Math.min(120, span)) }]);
  };
  const set = (i: number, p: Partial<TimeSpan>) => onChange(value.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <SheetField label="Preferred windows">
      {value.length === 0 ? (
        <Button variant="outline" size="sm" className="w-fit" disabled={disabled || span < STEP} onClick={add}>
          <Plus />
          Add preferred window
        </Button>
      ) : (
        <div className="flex flex-col">
          <div className="overflow-hidden rounded-md rounded-bl-none border border-fp-outline-1">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col />
                <col />
                <col className="w-[52px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-fp-table-header">
                  <th className="px-3 py-2.5 text-left">
                    <TableRequiredLabel>From</TableRequiredLabel>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <TableRequiredLabel>To</TableRequiredLabel>
                  </th>
                  <th aria-hidden />
                </tr>
              </thead>
              <tbody>
                {value.map((p, i) => (
                  <tr key={i} className="group/row h-11 border-b border-border last:border-b-0">
                    <td className="relative p-0">
                      {/* ONE VALUE — a time inside this row's window, not a row of its own. */}
                      <TableCellSelect
                        value={formatMinutes(p.start)}
                        options={times(windowStart, windowEnd - STEP).map(formatMinutes)}
                        disabled={disabled}
                        autoFocus={i === focusRow}
                        aria-label={`Preferred window ${i + 1} from`}
                        onChange={(v) => {
                          const t = times(windowStart, windowEnd).find((x) => formatMinutes(x) === v);
                          if (t !== undefined) set(i, { start: t, end: Math.max(p.end, t + STEP) });
                        }}
                      />
                    </td>
                    <td className="relative p-0">
                      {/* ONE VALUE — a time inside this row's window, not a row of its own. */}
                      <TableCellSelect
                        value={formatMinutes(p.end)}
                        options={times(p.start + STEP, windowEnd).map(formatMinutes)}
                        disabled={disabled}
                        aria-label={`Preferred window ${i + 1} to`}
                        onChange={(v) => {
                          const t = times(windowStart, windowEnd).find((x) => formatMinutes(x) === v);
                          if (t !== undefined) set(i, { end: t });
                        }}
                      />
                    </td>
                    <td className="relative p-0 text-center">
                      <TableRowRemove
                        aria-label={`Remove preferred window ${formatMinutes(p.start)} – ${formatMinutes(p.end)}`}
                        disabled={disabled}
                        onRemove={() => onChange(value.filter((_, j) => j !== i))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!disabled && <HangingAdd label="Add preferred window" onClick={add} />}
        </div>
      )}
    </SheetField>
  );
}
