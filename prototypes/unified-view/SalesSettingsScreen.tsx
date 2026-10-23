import * as React from "react";
import { ChevronDown, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SheetSection } from "@/components/side-sheet/parts";
import {
  TableCellCombobox,
  TableCellInput,
  TableCellSelect,
  TableRequiredLabel,
  TableRowRemove,
} from "@/components/form-layout/table-cells";
import { HangingAdd } from "./HangingAdd";
import { Pill, PILL_COLORS, type PillColor } from "@/components/ui/pill";
import { stageKind, type TypeTag } from "./salesSettings";
import {
  CORE_STAGES,
  DEFAULT_SALES_SETTINGS,
  FIELD_LIMIT,
  FIELD_TYPES,
  NOTIFICATION_EVENTS,
  TIME_ZONES,
  UNITS,
  libraryFor,
  resetSalesSettings,
  setFormFields,
  setSalesSettings,
  useSalesSettings,
  type FieldType,
  type FormField,
  type NotificationRule,
  type SalesFormKind,
  type SalesSettings,
  type StageRule,
} from "./salesSettings";

/*
  SALES SETTINGS (Pavan, 2026-10-07) — after Lovable's, on our Sales: our
  three forms, our stages, our events.

  THE SERVICE SETTINGS PAGE'S SHAPE: a module's own settings behind a rail
  item inside it, every change kept as it is made, no Save button.

  "FIX IT ALL" (Pavan, 2026-10-07) — every tab is a boxed table (ux §Tables —
  full width, checkboxes, delete on hover; ui §10f):
    · the tables take the page's whole width — no max-width cap;
    · every cell is edited in place, with the DS table cells;
    · a yes/no is a checkbox, never a switch;
    · a row goes from its own last column, shown on row hover or focus, with
      the ✕ / ✓ confirm; a row that cannot go shows nothing there;
    · rows are added with the hanging add, and every reorderable row has a
      handle — drag, or arrow keys on the handle;
    · Preferences is a table too: Setting · Value.
*/

const FORM_KINDS: { key: SalesFormKind; label: string }[] = [
  { key: "fuel", label: "Fuel order" },
  { key: "asset", label: "Asset order" },
  { key: "quote", label: "Quote" },
];

const TH = "px-3 py-2.5 text-left";
const ROW = "group/row h-11 border-b border-border last:border-b-0";
/* THE BIN SHOWS ON ROW HOVER, AND WHILE FOCUS IS ANYWHERE IN THE ROW — a
   keyboard reader editing a cell reaches the row's delete without first
   finding an invisible button (Pavan, 2026-10-07). */
const REMOVE_TD = "relative p-0 text-center group-focus-within/row:*:opacity-100";

function Head({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn(TH, className)}>
      {children && <TableRequiredLabel>{children}</TableRequiredLabel>}
    </th>
  );
}

/* ------------------------------------------------------------ reorder --- */

/**
 * ONE WAY TO REORDER ROWS, for the fields and the stages: drag the handle
 * onto a row, or arrow up/down on the handle. `allow` can refuse an order —
 * the stages keep the core five in theirs.
 */
function useReorder<T>(
  items: T[],
  keyOf: (t: T) => string,
  commit: (next: T[]) => void,
  allow: (next: T[]) => boolean = () => true
) {
  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const [overKey, setOverKey] = React.useState<string | null>(null);
  /* A ROW MOVED BY THE KEYBOARD IS A DOM NODE MOVED, and the browser drops
     focus from a node it moves — so the handle is handed focus back. */
  const [refocus, setRefocus] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!refocus) return;
    document.querySelector<HTMLElement>(`[data-grip="${refocus}"]`)?.focus();
    setRefocus(null);
  }, [refocus, items]);

  const moved = (from: string, to: string): T[] | null => {
    const a = items.findIndex((x) => keyOf(x) === from);
    const b = items.findIndex((x) => keyOf(x) === to);
    if (a === -1 || b === -1 || a === b) return null;
    const next = [...items];
    const [row] = next.splice(a, 1);
    next.splice(b, 0, row);
    return next;
  };
  const canMove = (from: string, to: string) => {
    const next = moved(from, to);
    return next !== null && allow(next);
  };
  const move = (from: string, to: string) => {
    const next = moved(from, to);
    if (next && allow(next)) commit(next);
  };
  const nudge = (key: string, dir: -1 | 1) => {
    const i = items.findIndex((x) => keyOf(x) === key);
    const other = items[i + dir];
    if (!other || !canMove(key, keyOf(other))) return;
    move(key, keyOf(other));
    setRefocus(key);
  };

  const rowProps = (key: string) => ({
    className: cn(
      dragKey === key && "opacity-40",
      /* WHERE IT WILL LAND, on the row it lands on — the column menu's drag,
         said the same way. */
      overKey === key && dragKey && "bg-accent"
    ),
    onDragOver: (e: React.DragEvent) => {
      if (!dragKey || !canMove(dragKey, key)) return;
      e.preventDefault();
      setOverKey(key);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragKey) move(dragKey, key);
      setDragKey(null);
      setOverKey(null);
    },
  });

  const grip = (key: string, name: string) => (
    <button
      type="button"
      draggable
      data-grip={key}
      aria-label={`Move ${name}`}
      className="flex size-7 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
      onDragStart={(e) => {
        setDragKey(key);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", key);
        const row = e.currentTarget.closest("tr");
        if (row) e.dataTransfer.setDragImage(row, 16, 22);
      }}
      onDragEnd={() => {
        setDragKey(null);
        setOverKey(null);
      }}
      /* THE KEYBOARD MOVES IT TOO — the column menu's rule. */
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          nudge(key, e.key === "ArrowUp" ? -1 : 1);
        }
      }}
    >
      <GripVertical className="size-4" />
    </button>
  );

  return { rowProps, grip };
}

/* ------------------------------------------------- form customization --- */

function FormFieldsTable({
  kind,
  onKindChange,
}: {
  kind: SalesFormKind;
  onKindChange: (k: SalesFormKind) => void;
}) {
  const fields = useSalesSettings().forms[kind];
  const [focusKey, setFocusKey] = React.useState<string | null>(null);

  const set = (fn: (prev: FormField[]) => FormField[]) => setFormFields(kind, fn);
  const patch = (key: string, p: Partial<FormField>) =>
    set((prev) => prev.map((f) => (f.key === key ? { ...f, ...p } : f)));

  /* REORDERED ACROSS THE WHOLE LIST (Pavan, 2026-10-07). A section is drawn
     where its first field sits, so moving a field among another section's
     rows is how a section is moved. */
  const { rowProps, grip } = useReorder(fields, (f) => f.key, (next) => set(() => next));

  /* THE SECTIONS ON OFFER — the form's own, in the order they are drawn. */
  const sections = Array.from(new Set(fields.map((f) => f.section).filter((s) => s.trim())));
  const library = libraryFor(fields);
  const inUse = fields.filter((f) => f.visible).length;
  const full = inUse >= FIELD_LIMIT;

  const picked = React.useRef<string | null>(null);
  const add = (pick: string) => {
    if (full) return;
    if (pick === "custom") {
      /* A BLANK ROW IS NOT ADDED TWICE — the add takes the cursor to it. */
      const blank = fields.find((f) => f.source === "custom" && !f.label.trim());
      if (blank) {
        document.querySelector<HTMLInputElement>(`[data-field-name="${blank.key}"] input`)?.focus();
        return;
      }
      const key = `custom-${Date.now()}`;
      setFocusKey(key);
      /* A NEW ROW GOES AT THE BOTTOM (ui §10f), in the last section. */
      set((prev) => [
        ...prev,
        {
          key,
          label: "",
          section: prev[prev.length - 1]?.section ?? "Custom",
          type: "Text",
          required: false,
          visible: true,
          source: "custom",
        },
      ]);
      return;
    }
    const lib = library.find((l) => l.key === pick);
    if (!lib) return;
    setFocusKey(lib.key);
    set((prev) => [
      ...prev,
      {
        key: lib.key,
        label: lib.label,
        section: lib.section,
        type: lib.type,
        options: lib.options,
        required: false,
        visible: true,
        source: "library",
      },
    ]);
  };

  return (
    <SheetSection
      title="Form fields"
      flush
      hanging={
        <>
          {/* ONE ADD, TWO KINDS OF ROW — a field of your own, or one from the
              library — so one tab with a menu, never two (ui §10f). AT THE
              LIMIT THERE IS NOTHING TO ADD, so the add is not rendered and
              the count says why. */}
          {!full && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <HangingAdd label="Add field" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-96 min-w-64"
                /* THE ROW IS ADDED ONCE THE MENU HAS CLOSED, so its cell can
                   take the cursor — an open menu holds focus. QuoteSheet's. */
                onCloseAutoFocus={(e) => {
                  const pick = picked.current;
                  if (!pick) return;
                  e.preventDefault();
                  picked.current = null;
                  add(pick);
                }}
              >
                <DropdownMenuItem onSelect={() => (picked.current = "custom")}>
                  Custom field
                </DropdownMenuItem>
                {library.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                      Field library
                    </DropdownMenuLabel>
                    {library.map((l) => (
                      <DropdownMenuItem key={l.key} onSelect={() => (picked.current = l.key)}>
                        <span className="min-w-0 flex-1 truncate">{l.label}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{l.section}</span>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* A FLAG ABOUT THE WHOLE TABLE rides the hanging row's right end
              (ui §10f.5): the fields the sheet draws, against the limit. */}
          <span
            className={cn(
              "ml-auto text-sm tabular-nums",
              full ? "text-fp-banner-accent-caution" : "text-muted-foreground"
            )}
          >
            {inUse} / {FIELD_LIMIT} fields
          </span>
        </>
      }
      action={
        /* WHICH FORM — the Orders page's line-of-service switch, sized as it
           is there. */
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={kind}
          onValueChange={(next) => next && onKindChange(next as SalesFormKind)}
          aria-label="Form"
          className="h-7"
        >
          {FORM_KINDS.map((k) => (
            <ToggleGroupItem
              key={k.key}
              value={k.key}
              className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium"
            >
              {k.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
    >
      {/* FULL WIDTH, NEVER CRUSHED (Pavan, 2026-10-07): below its minimum the
          table scrolls sideways rather than squeezing a column to nothing. */}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[22%]" />
          <col className="w-[14%]" />
          <col className="w-[104px]" />
          <col className="w-[104px]" />
          <col className="w-[80px]" />
          <col className="w-[52px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <Head>Field label</Head>
            <Head>Section</Head>
            <Head>Type</Head>
            <Head>Required</Head>
            <Head>Visible</Head>
            <Head>Order</Head>
            {/* UNNAMED, like every row remove — ui §10f. */}
            <th aria-hidden />
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => {
            const name = f.label.trim() || `custom field ${i + 1}`;
            const drag = rowProps(f.key);
            /* A SWITCH IS ALWAYS ANSWERED — on or off — so a toggle field has
               nothing to require; a hidden field cannot be required, nobody
               could fill it. */
            const requireOff = f.locked || f.type === "Toggle" || !f.visible;
            return (
              <tr
                key={f.key}
                className={cn(ROW, drag.className)}
                onDragOver={drag.onDragOver}
                onDrop={drag.onDrop}
              >
                <td className="relative p-0" data-field-name={f.key}>
                  <TableCellInput
                    value={f.label}
                    placeholder="Field label"
                    autoFocus={focusKey === f.key}
                    aria-label={`Label of ${name}`}
                    onChange={(v) => patch(f.key, { label: v })}
                  />
                </td>
                <td className="relative p-0">
                  {/* ONE VALUE — the field's section — a value of this row, not a row of its own (DS ui §10f). */}
                  <TableCellCombobox
                    value={f.section}
                    options={sections}
                    creatable
                    createLabel="New section"
                    placeholder="Section"
                    aria-label={`Section of ${name}`}
                    onChange={(v) => patch(f.key, { section: v })}
                  />
                </td>
                <td className="relative p-0">
                  {/* ONE VALUE — the field's type — a value of this row, not a row of its own (DS ui §10f). */}
                  <TableCellSelect
                    value={f.type}
                    /* A LOCKED FIELD'S TYPE IS THE RECORD'S — shown, not
                       offered. A File field keeps its own type on the list. */
                    options={FIELD_TYPES.includes(f.type) ? FIELD_TYPES : [...FIELD_TYPES, f.type]}
                    searchThreshold={99}
                    disabled={f.locked}
                    aria-label={`Type of ${name}`}
                    onChange={(v) =>
                      patch(f.key, {
                        type: v as FieldType,
                        ...(v === "Toggle" ? { required: false } : {}),
                      })
                    }
                  />
                </td>
                <td className="px-3">
                  <Checkbox
                    checked={f.type === "Toggle" ? false : f.required}
                    disabled={requireOff}
                    aria-label={`${name} required`}
                    onCheckedChange={(v) => patch(f.key, { required: v === true })}
                  />
                </td>
                <td className="px-3">
                  <Checkbox
                    checked={f.visible}
                    /* AT THE LIMIT A HIDDEN FIELD CANNOT BE SHOWN — the count
                       under the table says why. */
                    disabled={f.locked || (!f.visible && full)}
                    aria-label={`${name} visible`}
                    onCheckedChange={(v) =>
                      patch(f.key, v === true ? { visible: true } : { visible: false, required: false })
                    }
                  />
                </td>
                <td className="px-3">{grip(f.key, name)}</td>
                <td className={REMOVE_TD}>
                  {/* THE SHEET'S OWN FIELDS CAN BE HIDDEN, NOT REMOVED. */}
                  {f.source !== "built-in" && (
                    <TableRowRemove
                      aria-label={`Remove ${name}`}
                      onRemove={() => set((prev) => prev.filter((x) => x.key !== f.key))}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </SheetSection>
  );
}

/* ------------------------------------------------------------ workflow --- */

/* THE CORE FIVE KEEP THEIR ORDER (Pavan, 2026-10-07): an added stage can sit
   anywhere between Requested and Delivered, but Requested stays first and
   Delivered and Canceled last — the order model's lifecycle is not a list a
   business rearranges. */
const coreOrderKept = (next: StageRule[]) => {
  const core = next.filter((r) => CORE_STAGES.includes(r.id as (typeof CORE_STAGES)[number]));
  const ids = next.map((r) => r.id);
  return (
    core.every((r, i) => r.id === CORE_STAGES[i]) &&
    ids[0] === "Requested" &&
    ids.indexOf("Delivered") === ids.length - 2 &&
    ids[ids.length - 1] === "Canceled"
  );
};

/**
 * A TAG'S COLOUR, CHOSEN IN ITS CELL (Pavan, 2026-10-09). The cell shows the
 * tag as it will look; the menu offers every colour as that same tag. Stages
 * can go back to their kind's colour ("Default").
 */
function ColorCell({
  label,
  color,
  kind,
  allowDefault,
  onChange,
}: {
  label: string;
  color: PillColor | null;
  kind?: Parameters<typeof Pill>[0]["kind"];
  allowDefault?: boolean;
  onChange: (c: PillColor | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Color of ${label}`}
          className="absolute inset-0 flex items-center justify-between gap-2 px-3 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
        >
          <Pill kind={kind} color={color}>
            {label || "—"}
          </Pill>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {allowDefault && (
          <DropdownMenuItem onSelect={() => onChange(null)}>
            <Pill kind={kind}>Default</Pill>
          </DropdownMenuItem>
        )}
        {PILL_COLORS.map((c) => (
          <DropdownMenuItem key={c.value} onSelect={() => onChange(c.value)}>
            <Pill color={c.value}>{c.label}</Pill>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** THE ORDER TYPES AS TAGS, each with its colour (Pavan, 2026-10-09). */
function TypeTagsTable({ tags }: { tags: TypeTag[] }) {
  const patch = (label: string, color: PillColor) =>
    setSalesSettings((s) => ({
      ...s,
      typeTags: s.typeTags.map((t) => (t.label === label ? { ...t, color } : t)),
    }));
  return (
    <SheetSection title="Order types" flush>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[220px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <Head>Type</Head>
            <Head>Color</Head>
          </tr>
        </thead>
        <tbody>
          {tags.map((t) => (
            <tr key={t.label} className={ROW}>
              <td className="px-3 text-sm text-foreground">{t.label}</td>
              <td className="relative p-0">
                <ColorCell label={t.label} color={t.color} onChange={(c) => c && patch(t.label, c)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </SheetSection>
  );
}

function WorkflowTable({ stages }: { stages: StageRule[] }) {
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const setStages = (fn: (prev: StageRule[]) => StageRule[]) =>
    setSalesSettings((s) => ({ ...s, stages: fn(s.stages) }));
  const patch = (id: string, p: Partial<StageRule>) =>
    setStages((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const { rowProps, grip } = useReorder(
    stages,
    (r) => r.id,
    (next) => setStages(() => next),
    coreOrderKept
  );

  /* AN ADDED STAGE GOES IN BEFORE DELIVERED — the last place an order is
     still moving — and can be dragged from there. A blank one is not added
     twice. */
  const addStage = () => {
    const blank = stages.find((r) => !r.label.trim());
    if (blank) {
      document.querySelector<HTMLInputElement>(`[data-stage-name="${blank.id}"] input`)?.focus();
      return;
    }
    const id = `stage-${Date.now()}`;
    setFocusId(id);
    setStages((prev) => {
      const at = prev.findIndex((r) => r.id === "Delivered");
      const next = [...prev];
      next.splice(at, 0, { id, label: "", approval: false, slaHours: 24 });
      return next;
    });
  };

  return (
    <SheetSection
      title="Workflow stages"
      flush
      hanging={<HangingAdd label="Add stage" onClick={addStage} />}
    >
      {/* FULL WIDTH, NEVER CRUSHED (Pavan, 2026-10-07): below its minimum the
          table scrolls sideways rather than squeezing a column to nothing. */}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[200px]" />
          <col className="w-[180px]" />
          <col className="w-[160px]" />
          <col className="w-[80px]" />
          <col className="w-[52px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <Head>Stage</Head>
            <Head>Color</Head>
            <Head>Requires approval</Head>
            <Head>SLA (hours)</Head>
            <Head>Order</Head>
            <th aria-hidden />
          </tr>
        </thead>
        <tbody>
          {stages.map((r, i) => {
            const core = CORE_STAGES.includes(r.id as (typeof CORE_STAGES)[number]);
            const ends = r.id === "Delivered" || r.id === "Canceled";
            const name = r.label.trim() || `stage ${i + 1}`;
            const drag = rowProps(r.id);
            return (
              <tr
                key={r.id}
                className={cn(ROW, drag.className)}
                onDragOver={drag.onDragOver}
                onDrop={drag.onDrop}
              >
                <td className="relative p-0" data-stage-name={r.id}>
                  <TableCellInput
                    value={r.label}
                    placeholder="Stage name"
                    autoFocus={focusId === r.id}
                    aria-label={`Name of ${name}`}
                    onChange={(v) => patch(r.id, { label: v })}
                  />
                </td>
                <td className="relative p-0">
                  <ColorCell
                    label={r.label}
                    color={r.color ?? null}
                    kind={stageKind(r.id)}
                    allowDefault
                    onChange={(c) => patch(r.id, { color: c })}
                  />
                </td>
                <td className="px-3">
                  <Checkbox
                    checked={r.approval}
                    /* AN ORDER STARTS IN REQUESTED — nothing moves into it,
                       so there is no move to approve. */
                    disabled={r.id === "Requested"}
                    aria-label={`${name} requires approval`}
                    onCheckedChange={(v) => patch(r.id, { approval: v === true })}
                  />
                </td>
                {ends ? (
                  /* NOTHING IS LATE IN A STAGE AN ORDER ENDS IN. */
                  <td className="px-3 text-sm text-muted-foreground">—</td>
                ) : (
                  <td className="relative p-0">
                    <TableCellInput
                      value={r.slaHours === null ? "" : String(r.slaHours)}
                      numeric
                      placeholder="—"
                      aria-label={`${name} SLA in hours`}
                      onChange={(v) => {
                        const digits = v.replace(/[^0-9]/g, "");
                        patch(r.id, { slaHours: digits ? Number(digits) : null });
                      }}
                    />
                  </td>
                )}
                <td className="px-3">{grip(r.id, name)}</td>
                <td className={REMOVE_TD}>
                  {/* THE CORE FIVE ARE THE ORDER MODEL'S — they stay. */}
                  {!core && (
                    <TableRowRemove
                      aria-label={`Remove ${name}`}
                      onRemove={() => setStages((prev) => prev.filter((x) => x.id !== r.id))}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </SheetSection>
  );
}

/* ------------------------------------------------------- notifications --- */

const CHANNELS = [
  ["inApp", "In-app"],
  ["email", "Email"],
  ["sms", "SMS"],
] as const;

function NotificationsTable({ rules }: { rules: NotificationRule[] }) {
  const [focusKey, setFocusKey] = React.useState<string | null>(null);
  const setRules = (fn: (prev: NotificationRule[]) => NotificationRule[]) =>
    setSalesSettings((s) => ({ ...s, notifications: fn(s.notifications) }));
  const patch = (key: string, p: Partial<NotificationRule>) =>
    setRules((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const unused = NOTIFICATION_EVENTS.filter((e) => !rules.some((r) => r.key === e.key));
  const picked = React.useRef<string | null>(null);
  const add = (key: string) => {
    const e = NOTIFICATION_EVENTS.find((x) => x.key === key);
    if (!e) return;
    setFocusKey(key);
    setRules((prev) => [...prev, { ...e, inApp: true, email: false, sms: false }]);
  };

  return (
    <SheetSection
      title="Notification routing"
      flush
      hanging={
        /* AN ADD WITH NOTHING LEFT TO ADD IS NOT RENDERED (ui §10f). */
        unused.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <HangingAdd label="Add event" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="min-w-56"
              onCloseAutoFocus={(e) => {
                const pick = picked.current;
                if (!pick) return;
                e.preventDefault();
                picked.current = null;
                add(pick);
              }}
            >
              {unused.map((e) => (
                <DropdownMenuItem key={e.key} onSelect={() => (picked.current = e.key)}>
                  {e.event}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
    >
      {/* FULL WIDTH, NEVER CRUSHED (Pavan, 2026-10-07): below its minimum the
          table scrolls sideways rather than squeezing a column to nothing. */}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse">
        <colgroup>
          <col />
          {CHANNELS.map(([k]) => (
            <col key={k} className="w-[104px]" />
          ))}
          <col className="w-[52px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <Head>Event</Head>
            {CHANNELS.map(([k, label]) => (
              <Head key={k}>{label}</Head>
            ))}
            <th aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.key} className={ROW}>
              <td className="relative p-0">
                {/* THE EVENT IS A CHOICE — this row's, or one not yet routed. */}
                <TableCellSelect
                  value={r.event}
                  options={[r.event, ...unused.map((e) => e.event)]}
                  autoFocus={focusKey === r.key}
                  aria-label={`Event ${r.event}`}
                  /* SEVERAL AT ONCE MAKES ROWS (DS ui §10f) — the first takes
                     this row's place, each other is a row of its own with the
                     same channels. */
                  multiple={{
                    onApply: (names) =>
                      setRules((prev) => {
                        const at = prev.findIndex((x) => x.key === r.key);
                        const made = names
                          .map((n) => NOTIFICATION_EVENTS.find((e) => e.event === n))
                          .filter((e): e is (typeof NOTIFICATION_EVENTS)[number] => Boolean(e))
                          .map((e) => ({ ...r, key: e.key, event: e.event }));
                        if (made.length === 0) return prev;
                        const next = [...prev];
                        next.splice(at, 1, ...made);
                        return next;
                      }),
                  }}
                  onChange={(v) => {
                    const e = NOTIFICATION_EVENTS.find((x) => x.event === v);
                    if (e && e.key !== r.key) patch(r.key, { key: e.key, event: e.event });
                  }}
                />
              </td>
              {CHANNELS.map(([k, label]) => (
                <td key={k} className="px-3">
                  <Checkbox
                    checked={r[k]}
                    aria-label={`${r.event} by ${label}`}
                    onCheckedChange={(v) => patch(r.key, { [k]: v === true })}
                  />
                </td>
              ))}
              <td className={REMOVE_TD}>
                <TableRowRemove
                  aria-label={`Remove ${r.event}`}
                  onRemove={() => setRules((prev) => prev.filter((x) => x.key !== r.key))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {rules.length === 0 && (
        /* AN EMPTY TABLE IS PADDED TEXT (ui §10f). */
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          No events are routed.
        </p>
      )}
    </SheetSection>
  );
}

/* --------------------------------------------------------- preferences --- */

/* A LIST OF SINGLE SETTINGS IS A TABLE TOO (ux §Tables): Setting · Value,
   the value cell being the control the setting takes. Nothing is added or
   removed here, so there is no add and no delete column. */
function PreferencesTable({ cfg }: { cfg: SalesSettings }) {
  const set = <K extends keyof SalesSettings>(k: K, v: SalesSettings[K]) =>
    setSalesSettings((s) => ({ ...s, [k]: v }));
  const rows: { key: string; label: string; value: React.ReactNode; cell?: boolean }[] = [
    {
      key: "timeZone",
      label: "Time zone",
      cell: true,
      value: (
        /* ONE VALUE — a setting, not a table row (DS ui §10f). */
        <TableCellSelect
          value={cfg.timeZone}
          options={[...TIME_ZONES]}
          aria-label="Time zone"
          onChange={(v) => set("timeZone", v as SalesSettings["timeZone"])}
        />
      ),
    },
    {
      key: "unit",
      label: "Primary unit",
      cell: true,
      value: (
        /* ONE VALUE — a setting, not a table row (DS ui §10f). */
        <TableCellSelect
          value={cfg.unit}
          options={[...UNITS]}
          searchThreshold={99}
          aria-label="Primary unit"
          onChange={(v) => set("unit", v as SalesSettings["unit"])}
        />
      ),
    },
    {
      key: "autoAssignOwner",
      label: "Auto-assign owner on create",
      value: (
        <Checkbox
          checked={cfg.autoAssignOwner}
          aria-label="Auto-assign owner on create"
          onCheckedChange={(v) => set("autoAssignOwner", v === true)}
        />
      ),
    },
    {
      key: "requireAcceptedQuote",
      label: "Require an accepted quote before scheduling",
      value: (
        <Checkbox
          checked={cfg.requireAcceptedQuote}
          aria-label="Require an accepted quote before scheduling"
          onCheckedChange={(v) => set("requireAcceptedQuote", v === true)}
        />
      ),
    },
  ];
  return (
    <SheetSection title="Preferences" flush>
      {/* FULL WIDTH, NEVER CRUSHED (Pavan, 2026-10-07): below its minimum the
          table scrolls sideways rather than squeezing a column to nothing. */}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[40%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <Head>Setting</Head>
            <Head>Value</Head>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={ROW}>
              <td className="px-3 text-sm text-foreground">{r.label}</td>
              <td className={r.cell ? "relative p-0" : "px-3"}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </SheetSection>
  );
}

/* -------------------------------------------------------------- screen --- */

export function SalesSettingsScreen() {
  const cfg = useSalesSettings();
  const [tab, setTab] = React.useState("form");
  const [kind, setKind] = React.useState<SalesFormKind>("fuel");
  const [confirmReset, setConfirmReset] = React.useState(false);
  const changed = JSON.stringify(cfg) !== JSON.stringify(DEFAULT_SALES_SETTINGS);

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col gap-0">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <TabsList variant="line" className="h-9 justify-start">
          <TabsTrigger value="form" className="flex-none">
            Form customization
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex-none">
            Workflow
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-none">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex-none">
            Preferences
          </TabsTrigger>
        </TabsList>
        {/* RESET IS ALWAYS IN VIEW (Pavan, 2026-10-07), level with the tabs
            it acts on. It asks first only when there is something to lose. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (changed ? setConfirmReset(true) : resetSalesSettings())}
        >
          Reset to defaults
        </Button>
      </div>

      {/* THE FULL CONTENT WIDTH (Pavan, 2026-10-07 — ux §Tables): no cap. */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-8">
        <TabsContent value="form">
          <FormFieldsTable key={kind} kind={kind} onKindChange={setKind} />
        </TabsContent>
        <TabsContent value="workflow">
          <div className="flex flex-col gap-6">
            <WorkflowTable stages={cfg.stages} />
            <TypeTagsTable tags={cfg.typeTags} />
          </div>
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTable rules={cfg.notifications} />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesTable cfg={cfg} />
        </TabsContent>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Sales settings?</AlertDialogTitle>
            <AlertDialogDescription>
              Every tab goes back to its defaults, and added fields, stages and events are removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={resetSalesSettings}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
