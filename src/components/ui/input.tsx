import * as React from "react"

import { cn } from "@/lib/utils"

/*
  A FIELD STARTS WITH A CAPITAL — except where a capital would be wrong.

  `autoCapitalize` is the standards mechanism for it, and it is honest in a way
  a CSS transform is not: it changes what the SOFT KEYBOARD offers, so the
  value that gets stored is the value the reader saw. `text-transform:
  capitalize` would show one thing and save another, and `::first-letter` does
  not apply to an `<input>` at all.

  IT DOES NOTHING ON A DESKTOP KEYBOARD, deliberately — nothing here rewrites
  what somebody typed. A form that wants the first letter normalised on the way
  out does it at the form layer, where the rule can see the FIELD's meaning;
  see `DirectoryRecordSheet`.

  THE EXCEPTIONS ARE THE POINT. An email, a URL and a password are
  case-carrying strings where a capitalised first letter is either wrong or a
  failed login, and a numeric field has no letters to capitalise. Those get
  `none`, and a caller can still override any of it.
*/
const NEVER_CAPITALISE = ["email", "url", "password", "number", "tel"];

function Input({
  className,
  type,
  autoCapitalize,
  inputMode,
  ...props
}: React.ComponentProps<"input">) {
  const numeric = inputMode === "numeric" || inputMode === "decimal";
  return (
    <input
      type={type}
      inputMode={inputMode}
      autoCapitalize={
        autoCapitalize ??
        (numeric || (type && NEVER_CAPITALISE.includes(type)) ? "none" : "sentences")
      }
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-fp-surface-1b px-3 py-1 text-base transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-fp-field-fill",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
