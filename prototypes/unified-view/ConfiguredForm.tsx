import * as React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import type { PendingItem } from "./PendingStrip";
import { dateKeyOf, formatFullDate } from "./data";
import { useSalesSettings, type FormField, type SalesFormKind } from "./salesSettings";

/*
  A SALES SHEET'S BODY, AS SALES SETTINGS LAY IT OUT (Pavan, 2026-10-07 —
  "fix it all", C). The order of the rows on Form customization is the order
  the sheet draws its fields; a section is drawn where its first field sits;
  every label is the configured one; a hidden field is not drawn; a required
  one is marked, and the sheet's commit lists it until it is filled.

  The sheet hands over HOW to draw each of its own fields. Everything else — a
  field added from the library, a custom one, or a built-in one whose type was
  changed — is drawn here from its type, and its value lives in the record's
  `extra`.
*/

export type ExtraValue = string | boolean;
export type ExtraValues = Record<string, ExtraValue>;

export interface BuiltInField {
  /** The control, under the configured label. */
  control?: React.ReactNode;
  /** Draws its own label — a switch row. Given the configured label. */
  bare?: (label: string) => React.ReactNode;
  /** Sits beside the next half field, two to a row. */
  half?: boolean;
  className?: string;
  /* A FIELD THAT IS A TABLE. Its section goes flush round it (ui §10f); a
     field before it in the section sits in the box above the table, one
     after it sits under the box — the notes rule (ux §Record sheets). */
  table?: {
    node: React.ReactNode;
    hanging?: React.ReactNode;
    action?: React.ReactNode;
  };
}

export const sectionId = (kind: SalesFormKind, section: string) =>
  `${kind}-sec-${section.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/** Is this field drawn by the sheet's own control, or from its type? */
export const isNative = (f: FormField, renderers: Record<string, unknown>) =>
  f.source === "built-in" && (!f.nativeType || f.type === f.nativeType) && f.key in renderers;

export const extraFilled = (v: ExtraValue | undefined) =>
  typeof v === "boolean" ? true : typeof v === "string" && v.trim() !== "";

/**
 * WHAT THE COMMIT IS STILL WAITING ON — every field marked required and drawn
 * that has nothing in it, in the form's order, as an instruction. A switch is
 * always answered, so it never waits.
 */
export function missingRequired(
  kind: SalesFormKind,
  fields: FormField[],
  filled: (f: FormField) => boolean
): PendingItem[] {
  return fields
    .filter((f) => f.visible && f.required && f.type !== "Toggle" && !filled(f))
    .map((f) => {
      const name = f.label.trim() || "the custom field";
      const verb =
        f.type === "Select" || f.type === "Date" ? "Choose" : f.type === "File" ? "Attach" : "Enter";
      return { key: `req-${f.key}`, label: `${verb} ${name}`, target: sectionId(kind, f.section) };
    });
}

/** The visible fields, grouped into sections in the order their first field sits. */
function sectionsOf(fields: FormField[]): { title: string; fields: FormField[] }[] {
  const out: { title: string; fields: FormField[] }[] = [];
  for (const f of fields) {
    if (!f.visible) continue;
    const title = f.section.trim() || "Other";
    const at = out.find((s) => s.title === title);
    if (at) at.fields.push(f);
    else out.push({ title, fields: [f] });
  }
  return out;
}

const SwitchRow = ({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  /* The order sheet's "Mark as Urgent" row: label left, switch right. */
  <div className="flex items-center justify-between gap-4">
    <span className="text-sm font-medium">{label}</span>
    <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
  </div>
);

/** A field the sheet does not draw itself — drawn from its type. */
function ExtraControl({
  f,
  value,
  onChange,
}: {
  f: FormField;
  value: ExtraValue | undefined;
  onChange: (v: ExtraValue) => void;
}) {
  const label = f.label.trim() || "Custom field";
  const text = typeof value === "string" ? value : "";
  switch (f.type) {
    case "Number":
      return (
        <Input
          inputMode="decimal"
          value={text}
          placeholder="0"
          aria-label={label}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.-]/g, ""))}
        />
      );
    case "Select": {
      const options = Array.from(new Set([...(f.options ?? []), ...(text ? [text] : [])]));
      return (
        <Combobox
          className="w-full"
          value={text}
          onValueChange={onChange}
          options={options}
          placeholder="Select"
          aria-label={label}
          allowCreate
          createLabel={(q) => `Add “${q}”`}
          /* AN OPTIONAL PICKER OFFERS ITS EMPTY CHOICE; a required one
             does not (ux §Forms). */
          clearLabel={f.required ? undefined : `No ${label.toLowerCase()}`}
        />
      );
    }
    case "Date": {
      const [y, m, d] = text.split("-").map(Number);
      const day = text ? new Date(y, m - 1, d) : null;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal" aria-label={label}>
              <CalendarDays />
              {day ? (
                formatFullDate(day)
              ) : (
                <span className="text-muted-foreground">Select date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={day ?? undefined}
              defaultMonth={day ?? undefined}
              onSelect={(next) => next && onChange(dateKeyOf(next))}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      );
    }
    case "File":
      return (
        <div className="flex flex-col gap-1">
          <Input
            type="file"
            multiple
            aria-label={label}
            onChange={(e) =>
              onChange(
                Array.from(e.target.files ?? [])
                  .map((x) => x.name)
                  .join(", ")
              )
            }
          />
          {text && <span className="truncate text-xs text-muted-foreground">{text}</span>}
        </div>
      );
    default:
      return (
        <Input value={text} aria-label={label} onChange={(e) => onChange(e.target.value)} />
      );
  }
}

/**
 * THE SHEET'S BODY. `renderers` draws each built-in field the sheet owns;
 * `together` names fields that are one control (a table's columns) — the
 * first of them in the order draws it, the rest are skipped.
 */
export function ConfiguredForm({
  kind,
  renderers,
  together = [],
  extra,
  onExtraChange,
  className,
}: {
  kind: SalesFormKind;
  renderers: Record<string, (f: FormField) => BuiltInField>;
  together?: string[][];
  extra: ExtraValues;
  onExtraChange: (key: string, value: ExtraValue) => void;
  className?: string;
}) {
  const fields = useSalesSettings().forms[kind];
  const sections = sectionsOf(fields);
  const drawn = new Set<string>();

  /** One field, as the pieces a section lays out. */
  const piece = (f: FormField): (BuiltInField & { key: string; label: string; required: boolean }) | null => {
    if (drawn.has(f.key)) return null;
    for (const g of together) if (g.includes(f.key)) g.forEach((k) => drawn.add(k));
    drawn.add(f.key);
    const label = f.label.trim() || "Custom field";
    const base = { key: f.key, label, required: f.required };
    if (isNative(f, renderers)) return { ...base, ...renderers[f.key](f) };
    if (f.type === "Toggle")
      return {
        ...base,
        bare: (l) => (
          <SwitchRow
            label={l}
            checked={extra[f.key] === true}
            onChange={(v) => onExtraChange(f.key, v)}
          />
        ),
      };
    return {
      ...base,
      control: (
        <ExtraControl f={f} value={extra[f.key]} onChange={(v) => onExtraChange(f.key, v)} />
      ),
    };
  };

  /* Half fields run two to a row; anything else takes the row. */
  const layFields = (
    ps: NonNullable<ReturnType<typeof piece>>[],
    sectionTitle: string
  ): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    let row: React.ReactNode[] = [];
    const flush = () => {
      if (row.length) out.push(<div key={`row-${out.length}`} className="grid grid-cols-2 gap-4">{row}</div>);
      row = [];
    };
    /* A SECTION THAT IS ONE FIELD OF ITS OWN NAME IS THAT FIELD — the Tags
       section: the heading carries the name, and the mark. */
    const sole = ps.length === 1 && ps[0].label.toLowerCase() === sectionTitle.toLowerCase();
    for (const p of ps) {
      const node = p.bare ? (
        <React.Fragment key={p.key}>{p.bare(p.label)}</React.Fragment>
      ) : sole ? (
        <React.Fragment key={p.key}>{p.control}</React.Fragment>
      ) : (
        <SheetField key={p.key} label={p.label} required={p.required} className={p.className}>
          {p.control}
        </SheetField>
      );
      if (p.half) {
        row.push(node);
        if (row.length === 2) flush();
      } else {
        flush();
        out.push(node);
      }
    }
    flush();
    return out;
  };

  return (
    <div className={cn("contents", className)}>
      {sections.map((s) => {
        const ps = s.fields.map(piece).filter((p): p is NonNullable<typeof p> => p !== null);
        if (ps.length === 0) return null;
        const id = sectionId(kind, s.title);
        const at = ps.findIndex((p) => p.table);
        if (at === -1) {
          const sole =
            ps.length === 1 && !ps[0].bare && ps[0].label.toLowerCase() === s.title.toLowerCase();
          return (
            <SheetSection
              key={s.title}
              id={id}
              title={s.title}
              note={
                sole && ps[0].required ? <span className="text-sm text-destructive">*</span> : undefined
              }
            >
              {layFields(ps, s.title)}
            </SheetSection>
          );
        }
        /* ONE TABLE PER BOX. A second table in the same section gets a box of
           its own under the same name. */
        const before = ps.slice(0, at);
        const tbl = ps[at];
        const rest = ps.slice(at + 1);
        const nextTable = rest.findIndex((p) => p.table);
        const after = nextTable === -1 ? rest : rest.slice(0, nextTable);
        const more = nextTable === -1 ? [] : rest.slice(nextTable);
        return (
          <div key={s.title} className="flex flex-col gap-4">
            <SheetSection
              id={id}
              title={s.title}
              flush
              hanging={tbl.table!.hanging}
              action={tbl.table!.action}
            >
              {before.length > 0 && (
                <div className="flex flex-col gap-5 border-b border-border p-4">
                  {layFields(before, s.title)}
                </div>
              )}
              {tbl.table!.node}
            </SheetSection>
            {after.length > 0 && layFields(after, s.title)}
            {more.map((p) =>
              p.table ? (
                <SheetSection
                  key={p.key}
                  title={s.title}
                  flush
                  hanging={p.table.hanging}
                  action={p.table.action}
                >
                  {p.table.node}
                </SheetSection>
              ) : (
                layFields([p], s.title)
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
