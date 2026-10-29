import * as React from "react";
import { Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { CopyValue } from "@/components/ui/copy-value";
import { Input } from "@/components/ui/input";
import { SheetField } from "@/components/side-sheet/parts";
import { EditDrawer } from "./threepl/DirectoryRecordSheet";
import { RailCard } from "./SheetCards";
import { POC_DIRECTORY, addPoc, pocsAt } from "./pocs";

/*
  POC DETAILS — ONE UNIT, EVERY MODULE (Pavan, 2026-10-29). The picked
  ship-to's people in one optional picker ("No POC" clears it), the chosen
  one's phone and email under it, and Add POC opening a side sheet that puts a
  new person on the ship-to and selects them. A rail card once the record
  exists (`PocCard`); the bare unit (`PocUnit`) in a form section while it is
  being created and there is no rail.
*/

export function PocUnit({
  shipTo,
  value,
  onChange,
  disabled,
}: {
  shipTo: string;
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", phone: "", email: "" });
  const people = pocsAt(shipTo);
  const picked = people.includes(value) ? value : "";
  const card = picked ? POC_DIRECTORY[picked] : undefined;

  return (
    <div className="flex flex-col gap-3">
      <SheetField label="POC">
        <Combobox
          className="w-full"
          value={picked}
          onValueChange={onChange}
          options={people}
          clearLabel="No POC"
          disabled={disabled || !shipTo}
          placeholder={shipTo ? "Select POC" : "Select a ship-to first"}
          searchPlaceholder="Search POCs…"
          emptyText="No POC found."
        />
      </SheetField>
      {card && (card.phone || card.email) && (
        <div className="flex flex-col gap-0.5 text-sm">
          {card.phone && <CopyValue value={card.phone} label="POC phone" tabular />}
          {card.email && <CopyValue value={card.email} label="POC email" />}
        </div>
      )}
      {shipTo && !disabled && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setDraft({ name: "", phone: "", email: "" });
            setAdding(true);
          }}
        >
          <Plus className="size-4" />
          Add POC
        </Button>
      )}

      <EditDrawer
        open={adding}
        onOpenChange={setAdding}
        title="Add POC"
        subtitle={shipTo}
        canSave={draft.name.trim() !== "" && !people.includes(draft.name.trim())}
        onSave={() => {
          const name = draft.name.trim();
          addPoc(shipTo, name, draft.phone.trim(), draft.email.trim());
          onChange(name);
          toast.success("POC added");
        }}
      >
        <SheetField label="Name" required>
          <Input
            value={draft.name}
            placeholder="Enter name"
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          />
        </SheetField>
        <SheetField label="Phone">
          <Input
            type="tel"
            value={draft.phone}
            placeholder="Enter phone"
            onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
          />
        </SheetField>
        <SheetField label="Email">
          <Input
            type="email"
            value={draft.email}
            placeholder="Enter email"
            onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
          />
        </SheetField>
      </EditDrawer>
    </div>
  );
}

/** The unit as a rail card — the record's detail page. */
export function PocCard(props: React.ComponentProps<typeof PocUnit>) {
  return (
    <RailCard title="POC details" icon={<UserRound />}>
      <div className="p-4">
        <PocUnit {...props} />
      </div>
    </RailCard>
  );
}
