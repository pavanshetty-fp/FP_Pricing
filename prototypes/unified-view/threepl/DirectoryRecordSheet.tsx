import * as React from "react";
import { FormStepsContext } from "@/components/side-sheet/form-steps-context";
import { Download, FileText, History, Image as ImageIcon, Sheet as SheetIcon, X } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SheetField, SheetSection, SheetSectionNote } from "@/components/side-sheet/parts";
import { cn } from "@/lib/utils";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "../RecordSheet";
import type { PendingItem } from "../PendingStrip";
import { DASH, formatDate, formatStamp, type Attachment, type AuditEvent } from "./directoryCore";
import type { FieldKind, FormFieldDef, FormSectionDef } from "./directoryFormTypes";
import { kindTone } from "../statusKind";

/*
  The Directory's record sheet.

  ONE SHEET, NOT A PAGE AND A FORM. The DS's rule for a record is the side
  sheet — `CustomerSheet` is the precedent, and `RecordSheet` is the component:
  the record IS the form, `mode` decides whether the header says Edit or
  Create, and the footer carries Save Changes. A full-page detail with a
  separate edit screen was a second interaction pattern for the same job, and
  the sheet keeps the list behind it, which is the point of a sheet.

  READ-ONLY CONTENT LIVES IN THE SAME SCROLL. A record's related lists —
  orders against an account, a vendor's rate card, an asset's billing history —
  are `SheetSection`s like any other, below the editable ones. Section rhythm
  is the DS's 40 / 16 throughout, owned by the sheet body.

  WIDTH IS `wide`, not `narrow`. 560px is right for stacked fields and wrong
  for the tables these records carry: at 560 their columns have to be scrolled
  sideways, and a table you scroll to read is a table you cannot compare rows
  in. That is the DS's own reason for the size, quoted in `RecordSheet`.

  VALIDATION KEEPS THE FORM'S CONTRACT. Nothing is red until you have left the
  field; after a failed submit everything validates live; a failed submit keeps
  every character. `canSubmit` gates the footer, so an incomplete record cannot
  be saved from a sheet any more than from a page.
*/

export interface RecordReadSection {
  key: string;
  title: string;
  /** Count on the heading note — "6 locations". Omit where none applies. */
  count?: number;
  note?: string;
  /** Its table's columns as `CELL` widths — the sheet is as wide as the
      widest section's table (Pavan, 2026-10-15: each record its own width). */
  columns?: number[];
  render: () => React.ReactNode;
}

export interface DirectoryRecordSheetProps<T> {
  /**
   * The record's edit history.
   *
   * NOT A SECTION. It is the longest block on the record and the one people
   * read least often, and at the bottom of the body it pushed everything
   * anyone opens the sheet FOR — the related records — behind a wall of "field
   * changed" lines. It gets an icon in the header instead, which also makes it
   * reachable without scrolling at all.
   */
  audit?: AuditEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit" | "create";
  /** "Customer", "Vendor" — the sheet's own noun. */
  noun: string;
  /** The record's name, for the edit header. */
  title: string;
  /** The record's identity — the draft resets only when this changes, so an
   *  autosaved edit coming back as `initial` does not reset the form. */
  recordKey: string;
  /* AUTOSAVE (Pavan, 2026-10-07). An existing record writes each valid change
     as it settles; Confirm and Close finish the visit. */
  onAutosave?: (draft: T) => void;
  /** Closing hands back the latest draft (null while it is invalid), so a
   *  change still settling is not lost. */
  onClose?: (latest: T | null) => void;
  /** The ⋯ menu — acts on the record that are not part of filling it in. */
  headerMenu?: React.ReactNode;
  headerAside?: React.ReactNode;
  initial: T;
  sections: FormSectionDef<T>[];
  /** Everything the record shows but does not edit, under the editable blocks. */
  readSections?: RecordReadSection[];
  onSubmit: (draft: T) => void;
}

/*
  A FIELD STARTS WITH A CAPITAL, and this is the layer that can safely say so.

  `Input` sets `autoCapitalize`, which only reaches a soft keyboard; on a
  desktop nothing capitalises anything. So the form normalises the first
  character on BLUR — after the reader has finished the word, never while they
  are typing it, because a field that rewrites itself mid-keystroke is a field
  people fight.

  WHAT IS EXEMPT, and why each one:
    · email, url  — case-carrying. "Ray.obuya@…" is a different string, and
      capitalising it is the kind of silent edit that produces a bounced
      invoice.
    · number, money, date — no letters to capitalise.
    · select, combobox, switch, checkbox — the value is chosen, not typed.

  AND IT ONLY TOUCHES THE FIRST CHARACTER. `text-transform: capitalize`
  uppercases every word, which turns "Bray, Raymond and Marks" into "Bray,
  Raymond And Marks" and a street into title case. One character, once.
*/
const TYPED_TEXT: FieldKind[] = ["text", "tel", "textarea"];

const sentenceCase = (v: string): string =>
  v.length === 0 ? v : v[0].toUpperCase() + v.slice(1);

/**
 * The label an option shows. The VALUE is untouched — a record status stays
 * the lowercase `active` the model stores, and only the word on screen is
 * capitalised. Values that already start with a capital ("Net 30") pass
 * straight through.
 */
const optionLabel = (v: string): string => sentenceCase(v);

function isBlank(v: string | number | boolean | null): boolean {
  return v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));
}

export function DirectoryRecordSheet<T>({
  open,
  onOpenChange,
  mode,
  noun,
  title,
  recordKey,
  onAutosave,
  onClose,
  headerMenu,
  headerAside,
  initial,
  sections,
  readSections = [],
  audit,
  onSubmit,
}: DirectoryRecordSheetProps<T>) {
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<T>(initial);
  const [touched, setTouched] = React.useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = React.useState(false);
  /* The same header feedback the order sheets give. A record sheet holds a
     draft exactly as they do, and silence about it reads the same way. */
  const saveState = useDraftSaveState(draft, open);

  /* A sheet is reused across records, so the draft resets when the record it
     is showing changes — not when the component happens to remount. */
  React.useEffect(() => {
    setDraft(initial);
    setTouched(new Set());
    setSubmitted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordKey, mode]);

  const visibleSections = React.useMemo(
    () =>
      sections.map((s) => ({ ...s, fields: s.fields.filter((f) => f.visible?.(draft) ?? true) })),
    [sections, draft]
  );

  const errors = React.useMemo(() => {
    const out: Record<string, string> = {};
    visibleSections.forEach((s) =>
      s.fields.forEach((f) => {
        if (f.required && isBlank(f.get(draft))) out[f.key] = `${f.label} is required`;
        else {
          const e = f.validate?.(draft);
          if (e) out[f.key] = e;
        }
      })
    );
    return out;
  }, [visibleSections, draft]);

  const errorCount = Object.keys(errors).length;

  /* AUTOSAVE (Pavan, 2026-10-07) — the draft chip's promise kept: a valid
     change on an existing record is written once typing settles. */
  const latestInitial = React.useRef(initial);
  latestInitial.current = initial;
  React.useEffect(() => {
    if (mode !== "edit" || !onAutosave || !open) return undefined;
    if (draft === latestInitial.current || errorCount > 0) return undefined;
    const t = window.setTimeout(() => onAutosave(draft), 600);
    return () => window.clearTimeout(t);
  }, [draft, errorCount, mode, onAutosave, open]);

  /* WHAT THE PRIMARY IS WAITING ON (Pavan, 2026-10-07 — G25). The button stays
     pressable; a press names the gap and goes to its section. */
  const pending: PendingItem[] = visibleSections.flatMap((s) =>
    s.fields
      .filter((f) => errors[f.key])
      .map((f) => ({
        key: f.key,
        label: f.required && isBlank(f.get(draft)) ? `Add ${f.label.toLowerCase()}` : errors[f.key],
        target: `dir-sec-${s.key}`,
      }))
  );
  const showError = (key: string) => Boolean(errors[key]) && (submitted || touched.has(key));

  const set = (f: FormFieldDef<T>, v: string | number | boolean | null) =>
    setDraft((d) => f.set(d, v));

  const control = (f: FormFieldDef<T>) => {
    const v = f.get(draft);
    const bad = showError(f.key);
    const blur = () => {
      setTouched((t) => new Set(t).add(f.key));
      if (!TYPED_TEXT.includes(f.kind)) return;
      const current = f.get(draft);
      if (typeof current !== "string" || current.length === 0) return;
      const next = sentenceCase(current);
      if (next !== current) setDraft((d) => f.set(d, next));
    };

    switch (f.kind) {
      case "select":
        return (
          <Select
            value={typeof v === "string" && v !== "" ? v : undefined}
            onValueChange={(next) => {
              set(f, next);
              blur();
            }}
          >
            <SelectTrigger
              id={f.key}
              aria-invalid={bad || undefined}
              /* `capitalize` on the TRIGGER only. Radix renders the chosen
                 item's raw text here and there is no slot to relabel it, so
                 the CSS does what `optionLabel` does in the list — and a
                 value like "Net 30" is unaffected either way. */
              className={cn("w-full capitalize", bad && "border-destructive")}
            >
              <SelectValue placeholder={f.placeholder ?? "Select…"} />
            </SelectTrigger>
            <SelectContent>
              {(f.options ?? []).map((o) => (
                <SelectItem key={o} value={o}>
                  {optionLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "combobox":
        return (
          <Combobox
            id={f.key}
            value={typeof v === "string" ? v : ""}
            options={(f.options ?? []).map((o) => ({ value: o, label: optionLabel(o) }))}
            placeholder={f.placeholder ?? "Select…"}
            allowCreate={f.allowCreate}
            aria-label={f.label}
            className={cn("w-full", bad && "border-destructive")}
            onValueChange={(next) => {
              set(f, next);
              blur();
            }}
          />
        );

      case "textarea":
        return (
          <Textarea
            id={f.key}
            rows={3}
            value={typeof v === "string" ? v : ""}
            placeholder={f.placeholder}
            aria-invalid={bad || undefined}
            className={cn(bad && "border-destructive")}
            onBlur={blur}
            onChange={(e) => set(f, e.target.value)}
          />
        );
      default: {
        const numeric = f.kind === "number" || f.kind === "money";
        return (
          <Input
            id={f.key}
            type={f.kind === "date" ? "date" : numeric ? "text" : f.kind}
            inputMode={numeric ? "decimal" : undefined}
            value={v === null || v === false ? "" : String(v)}
            placeholder={f.placeholder}
            aria-invalid={bad || undefined}
            className={cn(bad && "border-destructive")}
            onBlur={blur}
            onChange={(e) => {
              const raw = e.target.value;
              if (!numeric) return set(f, raw);
              /* Money accepts what people type — commas, a dollar sign — and
                 stores a number. Rejecting keystrokes is how a field ends up
                 impossible to correct once it is wrong. */
              const cleaned = raw.replace(/[^0-9.-]/g, "");
              return set(f, cleaned === "" ? null : Number(cleaned));
            }}
          />
        );
      }
    }
  };

  const data = readSections.length > 0;
  return (
    <RecordSheet
      /* WIDTH FROM ITS TABLES, PER RECORD (Pavan, 2026-10-15): each read
         section names its table's columns; the widest decides. A create (no
         read sections) is a form, 600. */
      /* AN EXISTING RECORD IS DATA-INTENSIVE (Pavan, 2026-10-15 — "cramped"):
         1200 at least, fields three across. A create stays a 600 form. */
      {...(readSections.length > 0 ? { size: "data" as const } : {})}
      fit={{ tables: readSections.map((r) => r.columns ?? []) }}
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose?.(errorCount === 0 ? draft : null);
        onOpenChange(o);
      }}
      mode={mode}
      editTitle={title}
      createTitle={`Create New ${noun}`}
      createAction={`Create ${noun}`}
      /* NO CANCEL — this sheet autosaves its draft (`useDraftSaveState`
         above), and "Cancel" promises to undo something that has already been
         kept. Close is the honest exit. (DS ux rules, side-sheet anatomy.) */
      showCancel={false}
      headerMenu={headerMenu}
      headerAside={
        <span className="flex items-center gap-2">
          {headerAside}
          {saveState !== "idle" && (
            <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />
          )}
        </span>
      }
      headerActions={
        audit && audit.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Audit history (${audit.length} ${audit.length === 1 ? "entry" : "entries"})`}
                onClick={() => setHistoryOpen(true)}
              >
                <History />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Audit history · {audit.length} {audit.length === 1 ? "entry" : "entries"}
            </TooltipContent>
          </Tooltip>
        ) : undefined
      }
      canSubmit={errorCount === 0}
      pending={pending}
      onSubmit={() => {
        setSubmitted(true);
        if (errorCount > 0) return;
        onSubmit(draft);
      }}
    >
      {visibleSections.map((s) => (
        <SheetSection
          key={s.key}
          id={`dir-sec-${s.key}`}
          title={s.title}
          note={s.note ? <SheetSectionNote>{s.note}</SheetSectionNote> : undefined}
        >
          {/* THREE UP ON A RECORD (the data width, 1200 — Pavan, 2026-10-15),
              two up while creating (600). */}
          <div className={cn("grid gap-4", data ? "grid-cols-3" : "grid-cols-2")}>
            {s.fields.map((f) =>
              /*
                A TOGGLE IS NOT A FIELD WITH A CONTROL UNDER IT.

                Stacked like every other field, a switch put its label on one
                line and a 20px control alone on the next, leaving a hole
                beside it and reading as if something were missing. A toggle is
                a statement and an answer: the statement goes on the left,
                aligned with every other label, the answer sits at the far
                right of the row, and the helper text runs under the statement
                where it explains what turning it on does. That is the row
                `CustomerSheet` already uses for Active.

                Always full width, so the two edges the reader's eye follows —
                the left edge of the labels and the right edge of the sheet —
                are the two things the row is pinned to.
              */
              f.kind === "switch" || f.kind === "checkbox" ? (
                <div
                  key={f.key}
                  className="col-span-full flex items-start justify-between gap-4"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <label
                      htmlFor={f.key}
                      className="text-sm font-medium text-foreground"
                    >
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </label>
                    {(showError(f.key) || f.description) && (
                      <span
                        className={cn(
                          "text-xs",
                          showError(f.key) ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {showError(f.key) ? errors[f.key] : f.description}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {f.kind === "switch" ? (
                      <Switch
                        id={f.key}
                        checked={Boolean(f.get(draft))}
                        onCheckedChange={(on) => set(f, on)}
                      />
                    ) : (
                      <Checkbox
                        id={f.key}
                        checked={Boolean(f.get(draft))}
                        onCheckedChange={(on) => set(f, on === true)}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <SheetField
                  key={f.key}
                  label={f.label}
                  required={f.required}
                  description={showError(f.key) ? undefined : f.description}
                  className={f.wide ? "col-span-full" : undefined}
                >
                  {control(f)}
                  {showError(f.key) && (
                    <p className="text-xs text-destructive">{errors[f.key]}</p>
                  )}
                </SheetField>
              )
            )}
          </div>
        </SheetSection>
      ))}

      {audit && (
        <AuditDrawer
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          title={title}
          events={audit}
        />
      )}

      {readSections.map((s) => {
        /* A TABLE TAKES THE CARD'S OWN EDGES. Decided here from what the
           section actually renders rather than from a flag on every section,
           so a new table cannot be added with the gap left in by accident. */
        const body = s.render();
        return (
          <SheetSection
            key={s.key}
            title={s.title}
            flush={fillsSection(body)}
            note={
              s.note || s.count !== undefined ? (
                <SheetSectionNote>
                  {s.note ?? `${s.count} ${s.count === 1 ? "entry" : "entries"}`}
                </SheetSectionNote>
              ) : undefined
            }
          >
            {body}
          </SheetSection>
        );
      })}
    </RecordSheet>
  );
}

/* ═══════════════════════════════════════════════ read-only building blocks ═ */

/**
 * A labelled fact.
 *
 * `-` and `N/A` are both real values, printed muted, never suppressed. A field
 * that vanishes when it is empty makes an incomplete record look complete, and
 * the reason to open a record is to find out what is missing from it.
 */
export function ReadField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  const empty =
    value === null || value === undefined || value === "" || value === DASH || value === "N/A";
  return (
    <div className={cn(wide && "col-span-full")}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-sm break-words",
          empty ? "text-muted-foreground/70" : "text-foreground"
        )}
      >
        {empty ? DASH : value}
      </dd>
    </div>
  );
}

export function ReadGrid({ children }: { children: React.ReactNode }) {
  /* Three across — the record's data width (Pavan, 2026-10-15). */
  return <dl className="grid grid-cols-3 gap-x-6 gap-y-4">{children}</dl>;
}

/** The widest related-records table any directory record shows (a customer's
 *  assets) — what `DirectoryRecordSheet` sizes itself by. */

/** A related-records table that says something useful when it is empty. */
export function SheetTable<T>({
  rows,
  columns,
  emptyBody,
  onOpenRow,
  rowKey,
  max = 25,
}: {
  rows: T[];
  columns: { key: string; label: string; align?: "right"; render: (row: T) => React.ReactNode }[];
  emptyBody: string;
  onOpenRow?: (row: T) => void;
  rowKey: (row: T) => string;
  max?: number;
}) {
  /* THE CARD IS THE BOX. A table in a boxed unit runs to the unit's edges and
     borrows its border — so the empty state is padded text, not a second
     dashed box inside the first. */
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyBody}
      </p>
    );
  }
  const shown = rows.slice(0, max);
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-fp-outline-1 bg-fp-table-header">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "h-9 whitespace-nowrap px-3 text-left text-xs font-medium text-muted-foreground",
                    c.align === "right" && "text-right"
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "border-b border-fp-outline-1 last:border-0",
                  onOpenRow && "cursor-pointer hover:bg-fp-row-hover"
                )}
                onClick={onOpenRow ? () => onOpenRow(row) : undefined}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "h-10 whitespace-nowrap px-3 align-middle text-foreground",
                      c.align === "right" && "text-right tabular-nums"
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown.length && (
        <p className="border-t border-fp-outline-1 px-3 py-2 text-xs text-muted-foreground">
          Showing {shown.length} of {rows.length}. Open the list to see them all.
        </p>
      )}
    </div>
  );
}

/**
 * IT FILLS ITS SECTION. A section whose body is one of these is rendered
 * flush, so the table's edges are the card's edges and there is one border
 * where there used to be two. The flag is on the component rather than on
 * every call site, because a rule nobody has to remember is a rule that holds.
 */
SheetTable.fillsSection = true;

/** Whether a section's body is a table that wants the card's own edges. */
function fillsSection(body: React.ReactNode): boolean {
  return (
    React.isValidElement(body) &&
    (body.type as { fillsSection?: boolean })?.fillsSection === true
  );
}

const FILE_ICON: Record<string, React.ReactNode> = {
  pdf: <FileText className="size-4" />,
  png: <ImageIcon className="size-4" />,
  xlsx: <SheetIcon className="size-4" />,
  csv: <SheetIcon className="size-4" />,
};

/**
 * Files on a record.
 *
 * EXPIRY IS THE POINT for half of these. A certificate that lapsed in June is
 * the most consequential fact a vendor record holds, so it is stated on the
 * row and coloured, not left for somebody to work out from a date.
 */
export function AttachmentTable({ files }: { files: Attachment[] }) {
  const today = new Date();
  return (
    <SheetTable
      rows={files}
      rowKey={(f) => f.id}
      emptyBody="Nothing attached yet."
      columns={[
        {
          key: "name",
          label: "File",
          render: (f) => (
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {FILE_ICON[f.kind] ?? <FileText className="size-4" />}
              </span>
              {f.name}
            </span>
          ),
        },
        {
          key: "expires",
          label: "Expires",
          render: (f) => {
            if (!f.expiresOn) return <span className="text-muted-foreground/70">{DASH}</span>;
            const gone = new Date(`${f.expiresOn}T00:00:00Z`) < today;
            /* A DATE IS NOT A STATUS (Pavan, 2026-10-09). Now that a status is
               a pill, a grey pill round every date would read as one; only the
               expired date — the warning — takes the pill. */
            return gone ? (
              <StatusChip tone={kindTone("critical")}>Expired {formatDate(f.expiresOn)}</StatusChip>
            ) : (
              <span className="text-sm tabular-nums">{formatDate(f.expiresOn)}</span>
            );
          },
        },
        { key: "size", label: "Size", align: "right", render: (f) => `${f.sizeKb.toLocaleString()} KB` },
        { key: "by", label: "Uploaded by", render: (f) => f.uploadedBy },
        {
          key: "dl",
          label: "",
          align: "right",
          render: () => (
            <Button variant="ghost" size="icon-sm" aria-label="Download file">
              <Download />
            </Button>
          ),
        },
      ]}
    />
  );
}

/** It is a `SheetTable`, so it fills its section for the same reason. */
AttachmentTable.fillsSection = true;

/**
 * The record's history — the same treatment the order sheet's Activity uses.
 *
 * NEWEST FIRST, and every entry names its fields. "Updated" tells you somebody
 * was here; "Credit limit: 120000 → 200000" tells you what to look at.
 */
export function AuditList({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-fp-outline-1 px-4 py-6 text-center text-sm text-muted-foreground">
        Edits to this record will be listed here with who made them and when.
      </p>
    );
  }
  const sorted = [...events].sort((a, b) => (a.at < b.at ? 1 : -1));
  return (
    <ol className="flex flex-col gap-4">
      {sorted.map((e) => (
        <li key={e.id} className="border-l-2 border-fp-outline-1 pl-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-foreground">{e.action}</span>
            <span className="text-sm text-muted-foreground">by {e.by}</span>
            <span className="text-xs tabular-nums text-muted-foreground/80">
              {formatStamp(e.at)}
            </span>
          </div>
          {e.changes.length > 0 && (
            <ul className="mt-0.5 flex flex-col gap-0.5">
              {e.changes.map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {c}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * A READ-ONLY DRAWER — one thing, looked at, closed.
 *
 * NARROW AND OVER THE TOP. What goes in here is a column of short content —
 * 420px is as wide as it ever needs — and it opens ON whatever is behind it
 * rather than replacing it, so closing puts the reader back exactly where they
 * were with nothing re-rendered underneath.
 *
 * NO FOOTER, deliberately. There is nothing to save: reading is not editing.
 * The moment something in here needs a Save it belongs in the record sheet
 * instead, which is the form.
 *
 * It stacks a layer above the record sheet so the two coexist rather than
 * fighting for the same one — and it opens straight off a LIST row too, where
 * there is no record sheet underneath at all.
 */
export function ReadDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    /* A picker over a stepped form is not part of it. */
    <FormStepsContext.Provider value={false}>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="z-[60] w-[min(420px,calc(100vw-56px))] gap-0 p-0 sm:max-w-[min(420px,calc(100vw-56px))]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <SheetTitle className="text-base">{title}</SheetTitle>
            {subtitle && (
              <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
          <button
            type="button"
            aria-label={`Close ${title.toLowerCase()}`}
            onClick={() => onOpenChange(false)}
            className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
    </FormStepsContext.Provider>
  );
}

/**
 * `ReadDrawer` with a footer — for a small edit that belongs to a record you
 * reached from somewhere else.
 *
 * IT IS NOT THE RECORD SHEET, and must not grow into one. This is for the two
 * or three fields somebody noticed were wrong while doing something else — a
 * stale phone number found halfway through raising an order. The full record
 * still lives in its own sheet; this is the shortcut that stops a wrong number
 * costing somebody their draft.
 */
export function EditDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  onSave,
  canSave = true,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  onSave: () => void;
  canSave?: boolean;
  children: React.ReactNode;
}) {
  /* ON RECORDSHEET (Pavan, 2026-10-07 — G21/G23). A second-level sheet over
     the one it was opened from: no Cancel (Close is the exit), and the
     primary is the sheet's own edit word, not Save Changes. */
  return (
    <RecordSheet
      level={2}
      size="form"
      stepNav={false}
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      editTitle={title}
      createTitle={title}
      createAction="Confirm"
      headerSubtitle={
        subtitle ? (
          <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : undefined
      }
      showCancel={false}
      canSubmit={canSave}
      onSubmit={onSave}
    >
      <div className="flex flex-col gap-4">{children}</div>
    </RecordSheet>
  );
}

/** The record's history, in a `ReadDrawer`. */
export function AuditDrawer({
  open,
  onOpenChange,
  title,
  events,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  events: AuditEvent[];
}) {
  return (
    <ReadDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Audit history"
      subtitle={`${title} · ${events.length} ${events.length === 1 ? "entry" : "entries"}`}
    >
      <AuditList events={events} />
    </ReadDrawer>
  );
}

/** Tag pills, or an honest blank. */
export function TagRow({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-muted-foreground/70">{DASH}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <Pill key={t}>
          {t}
        </Pill>
      ))}
    </span>
  );
}

/** Free text a record carries — dispatch instructions, internal notes. */
export function NoteBlock({ body, hint }: { body: string | null; hint: string }) {
  return body ? (
    <p className="text-sm whitespace-pre-wrap text-foreground">{body}</p>
  ) : (
    <p className="text-sm text-muted-foreground/70">{hint}</p>
  );
}

export type { StatusTone };
