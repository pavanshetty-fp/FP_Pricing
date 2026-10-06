import * as React from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SheetField } from "@/components/side-sheet/parts";
import { EditDrawer } from "./DirectoryRecordSheet";

/**
 * WHICH OPTIONAL STEPS AN ORDER FORM SHOWS (Pavan, 2026-10-06). Set from the
 * gear at the end of the step column's progress bar, for one order or for all
 * of them — delivery and asset orders alike. POC details are off everywhere
 * unless turned on. Module-level: it is a setting, not part of an order, and
 * outlives any one sheet (a refresh resets it — fine for the prototype).
 */
export type OrderFormFields = { poc: boolean };
let ALL_ORDER_FIELDS: OrderFormFields = { poc: false };
/** Per-order overrides; keys starting "new" are orders being created. */
const ORDER_FIELDS = new Map<string, OrderFormFields>();

/**
 * The form's optional steps for one sheet, plus the gear that opens the
 * settings and the settings drawer itself. `key` is the order's id, or a
 * "new…" key while it is being created; when a "new" key turns into an id,
 * what was set for it moves with it.
 */
export function useOrderFormFields(key: string, open: boolean, subtitle: string) {
  const [, setRev] = React.useState(0);
  const [from, setFrom] = React.useState<string | null>(null);
  if (open && from !== key) {
    if (key.startsWith("new")) ORDER_FIELDS.delete(key);
    else if (from?.startsWith("new") && ORDER_FIELDS.has(from)) {
      ORDER_FIELDS.set(key, ORDER_FIELDS.get(from)!);
      ORDER_FIELDS.delete(from);
    }
    setFrom(key);
  }
  if (!open && from !== null) setFrom(null);
  const fields = ORDER_FIELDS.get(key) ?? ALL_ORDER_FIELDS;

  const [editing, setEditing] = React.useState(false);
  const [edit, setEdit] = React.useState<{ scope: "order" | "all"; poc: boolean }>({
    scope: "order",
    poc: false,
  });

  const gear = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Configure order form"
          /* QUIET — grey, small, not a call to act. */
          className="size-6 text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
          onClick={() => {
            setEdit({ scope: "order", poc: fields.poc });
            setEditing(true);
          }}
        >
          <Settings />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Configure order form</TooltipContent>
    </Tooltip>
  );

  const drawer = (
    <EditDrawer
      open={editing}
      onOpenChange={setEditing}
      title="Configure order form"
      subtitle={subtitle}
      onSave={() => {
        const next = { poc: edit.poc };
        if (edit.scope === "all") {
          ALL_ORDER_FIELDS = next;
          ORDER_FIELDS.clear();
        } else {
          ORDER_FIELDS.set(key, next);
        }
        setRev((n) => n + 1);
        toast.success("Order form updated", {
          description: edit.scope === "all" ? "All orders" : "This order",
        });
      }}
    >
      <SheetField label="Additional Steps">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-fp-outline-1 px-3 py-2.5">
          <span className="text-sm">POC details</span>
          <Switch
            checked={edit.poc}
            onCheckedChange={(v) => setEdit((f) => ({ ...f, poc: v }))}
          />
        </label>
      </SheetField>
      <SheetField label="Apply to">
        <RadioGroup
          value={edit.scope}
          onValueChange={(v) => setEdit((f) => ({ ...f, scope: v as "order" | "all" }))}
          className="gap-3"
        >
          <label htmlFor="fields-order" className="flex cursor-pointer items-center gap-2.5">
            <RadioGroupItem id="fields-order" value="order" />
            <span className="text-sm">This order</span>
          </label>
          <label htmlFor="fields-all" className="flex cursor-pointer items-center gap-2.5">
            <RadioGroupItem id="fields-all" value="all" />
            <span className="text-sm">All orders</span>
          </label>
        </RadioGroup>
      </SheetField>
    </EditDrawer>
  );

  return { fields, gear, drawer };
}
