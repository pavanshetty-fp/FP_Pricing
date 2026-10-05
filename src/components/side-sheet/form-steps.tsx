import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FORM_STEP_CLASS,
  FormStepsContext,
  InsideFormStepContext,
  formStepAttrs,
} from "./form-steps-context";

/*
  FORM STEPS — a side-sheet form read as one long scroll, with a list of its
  steps in a column on the left (Pavan, 2026-10-05; tried on Create Delivery
  Order, then made the default for every form).

  HOW A STEP COMES TO EXIST. Inside a stepped sheet every top-level
  `SheetSection` is a step, named by its title — so a form gets the list
  without being rewritten. A form that wants several sections under one name
  wraps them in `FormStep`; the sections inside then stop being steps of their
  own.

  THE LIST IS READ FROM THE PAGE, not declared. Sections come and go with the
  record's state (a locked order shows facts, a movement shows its asset), and
  a list kept beside the form would drift from it. `FormStepsNav` watches the
  form and lists what is actually there, in the order it is drawn.

  THE LOOK FOLLOWS. Group headings lose their band and dim, tables keep their
  rim and nothing else — see `SheetSection`.
*/

/** Several sections under one step name. Outside a stepped sheet, nothing. */
export function FormStep({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const stepped = React.useContext(FormStepsContext);
  if (!stepped) return <>{children}</>;
  return (
    <section
      {...formStepAttrs(label)}
      className={cn("flex shrink-0 flex-col gap-10", FORM_STEP_CLASS, className)}
    >
      <InsideFormStepContext.Provider value>{children}</InsideFormStepContext.Provider>
    </section>
  );
}

const SPY_OFFSET = 96;

/** Height of whatever the form pins over its own top (`data-form-sticky`). */
function pinnedHeight(port: HTMLElement) {
  let h = 0;
  port.querySelectorAll<HTMLElement>("[data-form-sticky]").forEach((el) => {
    h += el.getBoundingClientRect().height;
  });
  return h;
}

/**
 * The step list. `formRef` is the form's own scroll column — the list reads
 * the steps from it, follows its scroll, and scrolls it when a step is
 * pressed. `onCount` reports how many steps there are, so the sheet can drop
 * the column when there is nothing to list.
 */
export function FormStepsNav({
  formRef,
  onCount,
  footer,
}: {
  formRef: React.RefObject<HTMLDivElement | null>;
  onCount?: (n: number) => void;
  /** Pinned to the foot of the column — the sheet's pending strip. */
  footer?: React.ReactNode;
}) {
  const [labels, setLabels] = React.useState<string[]>([]);
  const [at, setAt] = React.useState(0);
  const travelling = React.useRef(false);

  const stepEls = React.useCallback(
    () =>
      Array.from(
        formRef.current?.querySelectorAll<HTMLElement>("[data-form-step]") ?? []
      ),
    [formRef]
  );

  /* WHAT IS ON THE PAGE, re-read whenever the form changes shape. A passive
     effect, not a layout one: the form column is a later sibling, and its ref
     is not attached yet when this column's layout effects run. */
  React.useEffect(() => {
    const port = formRef.current;
    if (!port) return;
    let last = "";
    const read = () => {
      const next = stepEls().map((el) => el.dataset.formStep ?? "");
      const key = next.join("\u0000");
      if (key === last) return;
      last = key;
      setLabels(next);
      onCount?.(next.length);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(port, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-form-step"],
    });
    return () => mo.disconnect();
  }, [formRef, stepEls, onCount]);

  /* THE LIST FOLLOWS THE SCROLL: the current step is the last one whose top
     has reached the top of the form. At the very bottom, it is the last. */
  React.useEffect(() => {
    const port = formRef.current;
    if (!port) return;
    const onScroll = () => {
      if (travelling.current) return;
      const top = port.getBoundingClientRect().top;
      const pin = pinnedHeight(port);
      const els = stepEls();
      let i = 0;
      els.forEach((el, n) => {
        if (el.getBoundingClientRect().top - top <= SPY_OFFSET + pin) i = n;
      });
      if (port.scrollTop + port.clientHeight >= port.scrollHeight - 4)
        i = els.length - 1;
      setAt(Math.max(0, i));
    };
    onScroll();
    port.addEventListener("scroll", onScroll, { passive: true });
    return () => port.removeEventListener("scroll", onScroll);
  }, [formRef, stepEls, labels]);

  /* A PRESS SCROLLS TO THE STEP, up or down, then marks it with a quiet grey
     fill, once. Driven frame by frame because the sheet's scroll lock cancels
     the browser's smooth scroll (see `attend` in PendingStrip). */
  const go = (i: number) => {
    const port = formRef.current;
    const el = stepEls()[i];
    if (!port || !el) return;
    setAt(i);
    travelling.current = true;
    const from = port.scrollTop;
    const target = Math.max(
      0,
      Math.min(
        from +
          el.getBoundingClientRect().top -
          port.getBoundingClientRect().top -
          16 -
          pinnedHeight(port),
        port.scrollHeight - port.clientHeight
      )
    );
    const started = performance.now();
    const frame = (now: number) => {
      const t = Math.min((now - started) / 320, 1);
      port.scrollTop = from + (target - from) * (1 - Math.pow(1 - t, 3));
      if (t < 1) {
        requestAnimationFrame(frame);
        return;
      }
      travelling.current = false;
      el.classList.remove("fp-attention-fill-subtle");
      void el.offsetWidth;
      el.classList.add("fp-attention-fill-subtle");
      window.setTimeout(() => el.classList.remove("fp-attention-fill-subtle"), 800);
    };
    requestAnimationFrame(frame);
  };

  const current = Math.min(at, Math.max(labels.length - 1, 0));

  return (
    <nav
      aria-label="Form steps"
      className="flex min-h-0 w-56 shrink-0 flex-col gap-4 overflow-auto border-r border-border p-4"
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          Step {current + 1} of {labels.length}
        </span>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-[width]"
            style={{ width: `${((current + 1) / Math.max(labels.length, 1)) * 100}%` }}
          />
        </div>
      </div>
      <ol className="flex flex-col gap-1">
        {labels.map((label, i) => {
          const on = i === current;
          return (
            <li key={`${label}-${i}`}>
              <button
                type="button"
                aria-current={on ? "step" : undefined}
                onClick={() => go(i)}
                className={cn(
                  "group/step flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                  on
                    ? "bg-selected font-medium text-selected-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {/* THE DS STEPS DISC — filled where you are, hollow ahead. */}
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums transition-colors",
                    on
                      ? "border-foreground bg-foreground text-background"
                      : "border-fp-outline-2 text-muted-foreground group-hover/step:border-foreground/50 group-hover/step:text-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {/* THE PENDING STRIP, at the foot of the column it steers. */}
      {footer && (
        <div className="@container mt-auto border-t border-border pt-3">{footer}</div>
      )}
    </nav>
  );
}

/**
 * A sheet's body as a stepped form: the step column, then the form's own
 * scroll. Drop-in for the body `div` of any side sheet. `onShownChange` says
 * whether the column is showing — a sheet takes the full width while it is.
 * `footer` (the pending strip) sits at the foot of the column while it shows;
 * while it does not, the sheet keeps the strip wherever it had it.
 */
export function SteppedFormBody({
  children,
  footer,
  top,
  onShownChange,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * A band over the FORM column only — the stage track. It starts where the
   * form starts, not over the step column, and stays put while the form
   * scrolls.
   */
  top?: React.ReactNode;
  onShownChange?: (shown: boolean) => void;
}) {
  const formRef = React.useRef<HTMLDivElement>(null);
  const [count, setCount] = React.useState(0);
  const shown = count >= 2;
  React.useEffect(() => {
    onShownChange?.(shown);
  }, [shown, onShownChange]);
  return (
    <FormStepsContext.Provider value>
      <div className="flex min-h-0 flex-1">
        {/* MOUNTED WHILE HIDDEN so it can count the steps; the form column
            keeps its place in the tree either way. */}
        <div className={cn("flex min-h-0", !shown && "hidden")}>
          <FormStepsNav
            formRef={formRef}
            onCount={setCount}
            footer={shown ? footer : undefined}
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {top && (
            <div className="shrink-0 border-b border-border px-4">{top}</div>
          )}
          <div
            ref={formRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-10 overflow-auto p-4"
          >
            {children}
          </div>
        </div>
      </div>
    </FormStepsContext.Provider>
  );
}
