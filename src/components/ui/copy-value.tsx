import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/*
  A read-only value with its own copy button.

  WHY THE BUTTON IS PER VALUE, not per card: a phone number and an email address
  sitting in the same block are two separate things someone needs elsewhere —
  pasted into a dialler, pasted into a mail client. One copy control over the
  pair would hand over both and make the person edit the result, which is the
  work the button was supposed to save.

  It confirms in place. A copy that looks identical before and after leaves you
  pressing it twice to be sure; the icon becomes a tick for a moment, which is
  the whole receipt anyone needs.

  The value is TEXT, not an input. A disabled field is the DS's way of saying a
  control is unavailable; these were never controls. Rendering them as text also
  keeps them at full contrast, which matters because a number you are copying is
  a number you are also reading.
*/

async function writeAsync(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Off-screen, not `display:none` — a hidden node cannot be selected. */
function writeLegacy(text: string): boolean {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
  document.body.appendChild(el);
  const previous = document.getSelection()?.rangeCount
    ? document.getSelection()!.getRangeAt(0)
    : null;
  el.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(el);
  // Put back whatever the person had selected before pressing the button.
  if (previous) {
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(previous);
  }
  return ok;
}

export interface CopyValueProps {
  /** Shown, and what lands on the clipboard. */
  value: string;
  /** Names the value for assistive tech — "POC email", not "copy". */
  label: string;
  /** Rendered instead when there is no value yet. Not copyable. */
  placeholder?: string;
  className?: string;
  /** Digits align in a column when several are stacked. */
  tabular?: boolean;
}

export function CopyValue({
  value,
  label,
  placeholder = "—",
  className,
  tabular,
}: CopyValueProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    /* TWO PATHS, because the async Clipboard API is not always there to be
       used: an iframe without `clipboard-write` in its permissions policy
       rejects it outright, and that is exactly where a prototype gets viewed —
       inside a preview pane, or a page someone embedded. Failing silently in
       the common case would make the button a decoration. The legacy
       selection-and-execCommand path still works there, so it is the fallback
       rather than nothing. */
    const ok = (await writeAsync(value)) || writeLegacy(value);
    if (!ok) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  if (!value) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {placeholder}
      </span>
    );
  }

  return (
    <span className={cn("group/copy flex min-w-0 items-center gap-1", className)}>
      <span
        className={cn(
          "truncate text-sm text-foreground",
          tabular && "tabular-nums"
        )}
      >
        {value}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy ${label}`}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground",
              "opacity-0 transition-[opacity,color] outline-none",
              "group-hover/copy:opacity-100 focus-visible:opacity-100",
              "hover:bg-accent hover:text-foreground",
              "focus-visible:ring-2 focus-visible:ring-ring/50",
              // Stays visible while it is confirming, or the receipt is missed.
              copied && "opacity-100 text-status-success"
            )}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied" : `Copy ${label}`}</TooltipContent>
      </Tooltip>
    </span>
  );
}
