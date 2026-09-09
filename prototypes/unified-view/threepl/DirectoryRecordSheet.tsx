import * as React from "react";
import { Download, FileText, History, Image as ImageIcon, Sheet as SheetIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { RecordSheet } from "../RecordSheet";
import { DASH, formatDate, formatStamp, type Attachment, type AuditEvent } from "./directoryCore";
import type { FieldKind, FormFieldDef, FormSectionDef } from "./directoryFormTypes";

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

  /* A sheet is reused across records, so the draft resets when the record it
     is showing changes — not when the component happens to remount. */
  React.useEffect(() => {
    setDraft(initial);
    setTouched(new Set());
    setSubmitted(false);
  }, [initial]);

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

  return (
    <RecordSheet
      /* TABLES, so `wide`. The DS's own rule: at 560 a related-records table
         has to be scrolled sideways to be read. */
      size="wide"
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={title}
      createTitle={`Create New ${noun}`}
      createAction={`Create ${noun}`}
      headerAside={headerAside}
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
      onSubmit={() => {
        setSubmitted(true);
        if (errorCount > 0) return;
        onSubmit(draft);
      }}
    >
      {visibleSections.map((s) => (
        <SheetSection
          key={s.key}
          title={s.title}
          note={s.description ? <SheetSectionNote>{s.description}</SheetSectionNote> : undefined}
        >
          {/* Two up. A sheet at `wide` fits a pair of fields comfortably and
              three would put a metre between a label and its control. */}
          <div className="grid grid-cols-2 gap-4">
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
                  className="col-span-2 flex items-start justify-between gap-4"
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
                  className={f.wide ? "col-span-2" : undefined}
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

      {readSections.map((s) => (
        <SheetSection
          key={s.key}
          title={s.title}
          note={
            s.note || s.count !== undefined ? (
              <SheetSectionNote>
                {s.note ?? `${s.count} ${s.count === 1 ? "entry" : "entries"}`}
              </SheetSectionNote>
            ) : undefined
          }
        >
          {s.render()}
        </SheetSection>
      ))}
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
    <div className={cn(wide && "col-span-2")}>
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
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</dl>;
}

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
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-fp-outline-1 px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyBody}
      </p>
    );
  }
  const shown = rows.slice(0, max);
  return (
    <div className="overflow-hidden rounded-md border border-fp-outline-1">
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
            return (
              <StatusChip tone={gone ? "failed" : "success"} variant="text">
                {gone ? `Expired ${formatDate(f.expiresOn)}` : formatDate(f.expiresOn)}
              </StatusChip>
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="z-[60] w-[min(420px,calc(100vw-60px))] gap-0 p-0 sm:max-w-[min(420px,calc(100vw-60px))]"
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
        <Badge key={t} variant="secondary" className="font-normal">
          {t}
        </Badge>
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
