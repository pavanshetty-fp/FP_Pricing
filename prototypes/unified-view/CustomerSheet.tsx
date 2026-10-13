import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelectList } from "@/components/ui/multi-select-list";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "./RecordSheet";
import {
  BILLING_TERMS,
  LINES_OF_SERVICE,
  type Customer,
  type CustomerStatus,
  type LineOfService,
} from "./customers";
import { ACTIVE_KIND, kindTone } from "./statusKind";

/**
 * Customer side sheet — same shell and rhythm as the two order sheets.
 *
 * TWO CHOICES WORTH KNOWING:
 *
 * 1. STATUS IS A SWITCH, not a picker. The rulebook (§6) says active/inactive is
 *    controlled by a "labelled toggle row (label + helper + switch)" and
 *    "reflected as a status value in lists" — so the list column is a projection
 *    of this switch, which is exactly the pattern §6 describes.
 *
 * 2. LOS uses the DS `MultiSelectList` with `searchable={false}`. Three options
 *    can be taken in at once, and that component's own rule is that a filter
 *    field is opt-in for exactly this reason.
 *
 * Ship-tos are edited as removable chips plus an add field. A customer's ship-to
 * list is the one thing here that is a collection of free text rather than a pick
 * from a fixed set, so it cannot be a select.
 */

export interface CustomerDraft {
  name: string;
  erpId: string;
  shipTos: string[];
  los: LineOfService[];
  status: CustomerStatus;
  billingTerms: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  note: string;
}

function draftFrom(c: Customer): CustomerDraft {
  return {
    name: c.name,
    erpId: c.erpId,
    shipTos: [...c.shipTos],
    los: [...c.los],
    status: c.status,
    billingTerms: c.billingTerms,
    contactName: c.contactName,
    contactEmail: c.contactEmail,
    contactPhone: c.contactPhone,
    note: c.note,
  };
}

/** A blank customer. `status: "Active"` — a switch has no empty state. */
function emptyDraft(): CustomerDraft {
  return {
    name: "",
    erpId: "",
    shipTos: [],
    los: [],
    status: "Active",
    billingTerms: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    note: "",
  };
}

export interface CustomerSheetProps {
  customer: Customer | null;
  mode?: "edit" | "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Customer, draft: CustomerDraft) => void;
  onCreate?: (draft: CustomerDraft) => void;
}

export function CustomerSheet({
  customer,
  mode = "edit",
  open,
  onOpenChange,
  onSave,
  onCreate,
}: CustomerSheetProps) {
  const [draft, setDraft] = React.useState<CustomerDraft | null>(null);
  const [newShipTo, setNewShipTo] = React.useState("");
  const creating = mode === "create";
  const saveState = useDraftSaveState(draft, open);
  /* WHAT WENT OUT LAST. The row comes back changed by our own save, so
     without this the sheet would answer its own write with a rebuild. */
  const lastSaved = React.useRef<string | null>(null);

  /* THE DRAFT IS BUILT ONCE PER RECORD, keyed on the id rather than the row.
     Keyed on the row, every autosave would rebuild the form under the
     cursor. */
  const customerId = customer?.id ?? null;
  React.useEffect(() => {
    if (!open) return;
    const next = creating ? emptyDraft() : customer ? draftFrom(customer) : null;
    lastSaved.current = next ? JSON.stringify(next) : null;
    setDraft(next);
    setNewShipTo("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, creating, customerId]);

  /* AUTOSAVED, DEBOUNCED — 600ms, the same everywhere. */
  React.useEffect(() => {
    if (creating || !customer || !draft) return;
    const serialised = JSON.stringify(draft);
    if (serialised === lastSaved.current) return;
    const t = window.setTimeout(() => {
      lastSaved.current = serialised;
      onSave(customer, draft);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, customer, creating, onSave]);

  if (!draft || (!creating && !customer)) return null;

  const set = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const addShipTo = () => {
    const v = newShipTo.trim();
    if (!v || draft.shipTos.includes(v)) return;
    set("shipTos", [...draft.shipTos, v]);
    setNewShipTo("");
  };

  return (
    <RecordSheet
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={customer?.name ?? ""}
      createTitle="Create New Customer"
      // Matches the header and the rail CTA verbatim; Asset Orders does the same.
      createAction="Create New Customer"
      /* IT AUTOSAVES, SO THERE IS NOTHING TO CANCEL AND NOTHING TO SAVE.
         Creating still takes an act. */
      showCancel={false}
      footerPrimary={creating ? undefined : null}
      headerAside={
        <span className="flex items-center gap-2">
          <StatusChip
            tone={kindTone(ACTIVE_KIND(draft.status === "Active"))}
            variant="soft"
          >
            {draft.status}
          </StatusChip>
          {saveState !== "idle" && (
            <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />
          )}
        </span>
      }
      onSubmit={() => {
        if (creating) onCreate?.(draft);
      }}
    >
      <SheetSection title="Customer Details">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer Name">
            <Input
              value={draft.name}
              placeholder="e.g. Morris Group"
              onChange={(e) => set("name", e.target.value)}
            />
          </SheetField>
          <SheetField label="ERP ID">
            <Input
              value={draft.erpId}
              placeholder="e.g. ERP 505112"
              onChange={(e) => set("erpId", e.target.value)}
            />
          </SheetField>
        </div>

        {/* §6's labelled toggle row: label + helper + switch. The list's Status
            column is a projection of this control. */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Active</span>
            <span className="text-xs text-muted-foreground">
              Inactive customers stay on record but are excluded from new orders.
            </span>
          </div>
          <Switch
            checked={draft.status === "Active"}
            onCheckedChange={(on) => set("status", on ? "Active" : "Inactive")}
            aria-label="Active"
          />
        </div>
      </SheetSection>

      <SheetSection title="Line of Service">
        <SheetField
          label="LOS"
        >
          <MultiSelectList
            options={LINES_OF_SERVICE}
            value={draft.los}
            onChange={(next) => set("los", next as LineOfService[])}
            searchable={false}
          />
        </SheetField>
      </SheetSection>

      <SheetSection title="Ship-Tos">
        <SheetField
          label={`Ship-Tos (${draft.shipTos.length})`}
        >
          <div className="flex flex-col gap-2">
            {draft.shipTos.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {draft.shipTos.map((s) => (
                  <span
                    key={s}
                    className="inline-flex h-7 items-center gap-1 rounded-full bg-muted pr-1 pl-3 text-xs text-foreground"
                  >
                    {s}
                    <button
                      type="button"
                      aria-label={`Remove ${s}`}
                      onClick={() =>
                        set(
                          "shipTos",
                          draft.shipTos.filter((x) => x !== s)
                        )
                      }
                      className="flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={newShipTo}
                placeholder="Add a ship-to…"
                onChange={(e) => setNewShipTo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addShipTo();
                  }
                }}
              />
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Add ship-to"
                disabled={!newShipTo.trim()}
                onClick={addShipTo}
              >
                <Plus />
              </Button>
            </div>
          </div>
        </SheetField>
      </SheetSection>

      <SheetSection title="Billing & Contact">
        <SheetField label="Billing Terms">
          <Combobox
            className="w-full"
            value={draft.billingTerms}
            onValueChange={(v) => set("billingTerms", v)}
            options={BILLING_TERMS}
            placeholder="Select terms"
            /* OPTIONAL, SO THE EMPTY CHOICE FIRST (G46, Pavan, 2026-10-07). */
            clearLabel="No billing terms"
          />
        </SheetField>

        <SheetField label="Contact Name">
          <Input
            value={draft.contactName}
            placeholder="e.g. Dev Morris"
            onChange={(e) => set("contactName", e.target.value)}
          />
        </SheetField>

        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Email">
            <Input
              type="email"
              value={draft.contactEmail}
              placeholder="name@company.com"
              onChange={(e) => set("contactEmail", e.target.value)}
            />
          </SheetField>
          <SheetField label="Phone">
            <Input
              value={draft.contactPhone}
              placeholder="(555) 555-0100"
              onChange={(e) => set("contactPhone", e.target.value)}
            />
          </SheetField>
        </div>

        <SheetField label="Note">
          <Textarea
            value={draft.note}
            placeholder="Account notes, billing exceptions…"
            onChange={(e) => set("note", e.target.value)}
            className="min-h-24"
          />
        </SheetField>
      </SheetSection>
    </RecordSheet>
  );
}
