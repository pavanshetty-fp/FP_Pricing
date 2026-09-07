import * as React from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/*
  The Directory's create / edit form — one component, four entities.

  A FORM IS A LIST OF FIELDS AND A CONTRACT ABOUT WHEN IT COMPLAINS. The fields
  differ per entity and are declared by the screen; the contract is identical
  everywhere and lives here:

    · NOTHING IS RED UNTIL YOU HAVE LEFT IT. Validating a required field while
      it is still empty and still focused tells somebody they have made a
      mistake before they have had a chance to make one. A field validates on
      blur, and after the first failed save it validates as you type — because
      by then you know it is wrong and want to see it go green.

    · A FAILED SAVE NEVER LOSES ANYTHING. The form keeps every character,
      scrolls to the first bad field and focuses it. The one thing worse than
      an error is an error that also empties the form.

    · CANCEL WITH CHANGES ASKS FIRST. Without changes it just leaves — a
      confirmation nobody needs is a confirmation everybody learns to dismiss
      without reading, which is how the ones that matter stop working.

  REQUIRED IS MARKED, OPTIONAL IS MARKED. Marking only one of the two makes the
  reader infer the other, and on a form this long with this many genuinely
  optional fields the inference is wrong often enough to matter.
*/

export type FieldKind =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "money"
  | "date"
  | "select"
  | "switch"
  | "checkbox"
  | "textarea";

export interface FormFieldDef<T> {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  /** Helper text under the control. */
  description?: string;
  placeholder?: string;
  options?: readonly string[];
  /** Full width in the section grid — instructions, notes, addresses. */
  wide?: boolean;
  /** Reads the value out of the draft. */
  get: (draft: T) => string | number | boolean | null;
  /** Writes it back. Returns the next draft; never mutates. */
  set: (draft: T, value: string | number | boolean | null) => T;
  /** Field-level rule. Return the message, or null when it is fine. */
  validate?: (draft: T) => string | null;
  /** Hidden when this returns false — dependent fields, e.g. a limit that only
   *  applies to approved accounts. */
  visible?: (draft: T) => boolean;
}

export interface FormSectionDef<T> {
  key: string;
  title: string;
  description?: string;
  fields: FormFieldDef<T>[];
}

export interface DirectoryFormProps<T> {
  mode: "create" | "edit";
  /** "Customer", "Vendor" — used in every heading, toast and confirm. */
  noun: string;
  /** The record's name, for the edit heading. */
  title?: string;
  parentLabel: string;
  initial: T;
  sections: FormSectionDef<T>[];
  onCancel: () => void;
  onSave: (draft: T) => void;
  /** Save and stay, for a record somebody is filling in over several passes. */
  onSaveAndClose?: (draft: T) => void;
  onArchive?: () => void;
  archived?: boolean;
}

function isBlank(v: string | number | boolean | null): boolean {
  return v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));
}

export function DirectoryForm<T>({
  mode,
  noun,
  title,
  parentLabel,
  initial,
  sections,
  onCancel,
  onSave,
  onSaveAndClose,
  onArchive,
  archived = false,
}: DirectoryFormProps<T>) {
  const [draft, setDraft] = React.useState<T>(initial);
  const [touched, setTouched] = React.useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const [confirmLeave, setConfirmLeave] = React.useState(false);
  const refs = React.useRef<Record<string, HTMLElement | null>>({});

  const dirty = React.useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial]
  );

  /* THE BROWSER'S OWN GUARD, for the one exit this component cannot see. */
  React.useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const visibleFields = React.useMemo(
    () =>
      sections.map((s) => ({
        ...s,
        fields: s.fields.filter((f) => f.visible?.(draft) ?? true),
      })),
    [sections, draft]
  );

  const errorFor = React.useCallback(
    (f: FormFieldDef<T>): string | null => {
      if (f.required && isBlank(f.get(draft))) return `${f.label} is required`;
      return f.validate?.(draft) ?? null;
    },
    [draft]
  );

  const errors = React.useMemo(() => {
    const out: Record<string, string> = {};
    visibleFields.forEach((s) =>
      s.fields.forEach((f) => {
        const e = errorFor(f);
        if (e) out[f.key] = e;
      })
    );
    return out;
  }, [visibleFields, errorFor]);

  const showError = (key: string) => Boolean(errors[key]) && (submitted || touched.has(key));
  const errorCount = Object.keys(errors).length;

  const commit = (close: boolean) => {
    setSubmitted(true);
    if (errorCount > 0) {
      const first = visibleFields.flatMap((s) => s.fields).find((f) => errors[f.key]);
      if (first) {
        const el = refs.current[first.key];
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus({ preventScroll: true });
      }
      toast.error(
        `${errorCount} ${errorCount === 1 ? "field needs" : "fields need"} attention`,
        { description: "Nothing you typed has been lost — the first one is highlighted." }
      );
      return;
    }
    if (close && onSaveAndClose) onSaveAndClose(draft);
    else onSave(draft);
  };

  const leave = () => {
    if (dirty) setConfirmLeave(true);
    else onCancel();
  };

  const set = (f: FormFieldDef<T>, v: string | number | boolean | null) =>
    setDraft((d) => f.set(d, v));

  const control = (f: FormFieldDef<T>) => {
    const v = f.get(draft);
    const bad = showError(f.key);
    const common = {
      id: f.key,
      "aria-invalid": bad || undefined,
      "aria-describedby": bad ? `${f.key}-error` : f.description ? `${f.key}-hint` : undefined,
      onBlur: () => setTouched((t) => new Set(t).add(f.key)),
    };

    switch (f.kind) {
      case "select":
        return (
          <Select
            value={typeof v === "string" && v !== "" ? v : undefined}
            onValueChange={(next) => {
              set(f, next);
              setTouched((t) => new Set(t).add(f.key));
            }}
          >
            <SelectTrigger
              ref={(el) => {
                refs.current[f.key] = el;
              }}
              id={f.key}
              aria-invalid={bad || undefined}
              className={cn("w-full", bad && "border-destructive")}
            >
              <SelectValue placeholder={f.placeholder ?? "Select…"} />
            </SelectTrigger>
            <SelectContent>
              {(f.options ?? []).map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "switch":
        return (
          <div className="flex h-9 items-center">
            <Switch
              id={f.key}
              checked={Boolean(v)}
              onCheckedChange={(on) => set(f, on)}
              ref={(el) => {
                refs.current[f.key] = el;
              }}
            />
          </div>
        );
      case "checkbox":
        return (
          <div className="flex h-9 items-center">
            <Checkbox
              id={f.key}
              checked={Boolean(v)}
              onCheckedChange={(on) => set(f, on === true)}
            />
          </div>
        );
      case "textarea":
        return (
          <Textarea
            {...common}
            ref={(el) => {
              refs.current[f.key] = el;
            }}
            rows={3}
            value={typeof v === "string" ? v : ""}
            placeholder={f.placeholder}
            className={cn(bad && "border-destructive")}
            onChange={(e) => set(f, e.target.value)}
          />
        );
      default: {
        const numeric = f.kind === "number" || f.kind === "money";
        return (
          <Input
            {...common}
            ref={(el) => {
              refs.current[f.key] = el;
            }}
            type={f.kind === "date" ? "date" : numeric ? "text" : f.kind}
            inputMode={numeric ? "decimal" : undefined}
            value={v === null || v === false ? "" : String(v)}
            placeholder={f.placeholder}
            className={cn(bad && "border-destructive")}
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <Button variant="ghost" size="xs" className="-ml-2 mb-2 text-muted-foreground" onClick={leave}>
          <ArrowLeft />
          {parentLabel}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {mode === "create" ? `New ${noun.toLowerCase()}` : `Edit ${title ?? noun.toLowerCase()}`}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Fields marked <span className="text-destructive">*</span> are required. Everything
              else can be filled in later.
            </p>
          </div>
          {dirty && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
        </div>
      </div>

      {submitted && errorCount > 0 && (
        <div className="mt-4 flex shrink-0 items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3.5 py-2.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              {errorCount} {errorCount === 1 ? "field needs" : "fields need"} attention
            </p>
            <p className="text-muted-foreground">
              {Object.values(errors).slice(0, 3).join(" · ")}
              {errorCount > 3 && ` · and ${errorCount - 3} more`}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 min-h-0 flex-1 overflow-auto">
        <div className="flex max-w-5xl flex-col gap-4 pb-6">
          {visibleFields.map((s) => (
            <section key={s.key} className="rounded-md border border-fp-outline-1 bg-fp-surface-1a">
              <header className="border-b border-fp-outline-1 px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">{s.title}</h2>
                {s.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                )}
              </header>
              <div className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {s.fields.map((f) => (
                  <div key={f.key} className={cn(f.wide && "sm:col-span-2 lg:col-span-3")}>
                    <label
                      htmlFor={f.key}
                      className="mb-1.5 flex items-center gap-1 text-xs font-medium text-foreground"
                    >
                      {f.label}
                      {f.required ? (
                        <span className="text-destructive" aria-hidden>
                          *
                        </span>
                      ) : (
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      )}
                    </label>
                    {control(f)}
                    {showError(f.key) ? (
                      <p id={`${f.key}-error`} className="mt-1 text-xs text-destructive">
                        {errors[f.key]}
                      </p>
                    ) : f.description ? (
                      <p id={`${f.key}-hint`} className="mt-1 text-xs text-muted-foreground">
                        {f.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* The footer is pinned: on a form this long, a Save that scrolls away is
          a Save nobody can find without going back to the top. */}
      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-fp-outline-1 pt-4">
        <div>
          {onArchive && mode === "edit" && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(!archived && "text-destructive hover:text-destructive")}
              onClick={onArchive}
            >
              {archived ? "Restore record" : `Archive ${noun.toLowerCase()}`}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={leave}>
            Cancel
          </Button>
          {onSaveAndClose && (
            <Button variant="outline" size="sm" onClick={() => commit(false)}>
              Save
            </Button>
          )}
          <Button size="sm" onClick={() => commit(true)}>
            {onSaveAndClose ? "Save and close" : "Save"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              This {noun.toLowerCase()} has changes that have not been saved. Leaving now
              discards them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
