import type * as React from "react";

/*
  The Directory's form VOCABULARY — the field and section shapes the four
  entities declare, and the contract about when a form complains.

  THE FORM ITSELF IS THE RECORD SHEET. The DS's interaction for a record is the
  side sheet (`RecordSheet`, as `CustomerSheet` uses it): the record IS the
  form, and there is no separate full-page editor. This module therefore
  describes the fields; `DirectoryRecordSheet` renders them.

  The contract is identical on all four entities:

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
  /**
   * A select you can type into, and — with `allowCreate` — extend. For a field
   * whose set is known but not closed: a contact's role, a tag, a category
   * somebody invented this morning. A fixed list there pushes the real answer
   * into a notes field where nothing can filter on it.
   */
  | "combobox"
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
  /** `combobox` only — offer what was typed when it matches no option. */
  allowCreate?: boolean;
  /** `combobox` only — the empty choice an OPTIONAL picker offers first ("No customer"). */
  clearLabel?: string;
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
  /**
   * A SHARED CONTROL IN PLACE OF THE STANDARD ONE (2026-11-03) — the delivery
   * window timeline, which brings its own label. Drawn full width; `get`
   * still answers "is it filled" for required and pending.
   */
  render?: (draft: T, setDraft: (next: T) => void) => React.ReactNode;
}

export interface FormSectionDef<T> {
  key: string;
  title: string;
  /**
   * The section's "why", shown ON DEMAND behind the ⓘ by its title
   * (`SheetSectionNote`) — never as a paragraph under it. Named `note`, not
   * `description`, so the difference from a field's always-visible helper
   * text is in the code and the microcopy check can tell them apart.
   */
  note?: string;
  fields: FormFieldDef<T>[];
}
