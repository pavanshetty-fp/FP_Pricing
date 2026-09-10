import { ArrowRight, Plus, Download, Loader2 } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";

/*
  Button showcase — shadcn Button (Figma 34:6). Documents every variant, size,
  and state (default → hover → focus → disabled → loading) as a labeled matrix,
  the way the shadcn doc page does. Hover/focus cells force the state's classes
  so they read statically; disabled/loading are real.
*/

type Variant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

const VARIANTS: Variant[] = ["default", "secondary", "destructive", "outline", "ghost", "link"];

/** The hover treatment per variant (the `hover:` classes, forced on). */
const HOVER: Record<Variant, string> = {
  default: "bg-primary/90",
  secondary: "bg-secondary/80",
  destructive: "bg-destructive/90",
  outline: "bg-accent text-accent-foreground",
  ghost: "bg-accent text-accent-foreground",
  link: "underline",
};

/** The focus-visible ring, forced on. */
const FOCUS = "border-ring ring-2 ring-ring/50";

const STATE_COLS = ["Default", "Hover", "Focus", "Disabled", "Loading"] as const;

function Cell({ variant, state }: { variant: Variant; state: (typeof STATE_COLS)[number] }) {
  if (state === "Hover") return <Button variant={variant} className={HOVER[variant]}>Button</Button>;
  if (state === "Focus") return <Button variant={variant} className={FOCUS}>Button</Button>;
  if (state === "Disabled") return <Button variant={variant} disabled>Button</Button>;
  if (state === "Loading")
    return (
      <Button variant={variant} disabled>
        <Loader2 className="animate-spin" />
        Loading
      </Button>
    );
  return <Button variant={variant}>Button</Button>;
}

export function ButtonDemo() {
  return (
    <Stack space="section" className="max-w-3xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Button</code> — six variants, five
        sizes (+ icon sizes), and the full state set. Drive intent by variant;
        the primary action on a view is a single <code>default</code> button —
        the neutral <code>bg-primary</code> (near-white in FP, near-black in
        Light). Use <code>bg-brand</code> (orange) only where a brand emphasis
        is specifically called for.
      </p>

      {/* Variants */}
      <Stack space="title">
        <SectionHeading as="h3" title="Variants" />
        <div className="flex flex-wrap items-center gap-3">
          {VARIANTS.map((v) => (
            <Button key={v} variant={v}>
              {v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </Stack>

      {/* Sizes */}
      <Stack space="title">
        <SectionHeading as="h3" title="Sizes" />
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="icon-xs" aria-label="Add"><Plus /></Button>
          <Button size="icon-sm" aria-label="Add"><Plus /></Button>
          <Button size="icon" aria-label="Add"><Plus /></Button>
          <Button size="icon-lg" aria-label="Add"><Plus /></Button>
        </div>
      </Stack>

      {/* With icon */}
      <Stack space="title">
        <SectionHeading as="h3" title="With icon" />
        <div className="flex flex-wrap items-center gap-3">
          <Button><Plus />Add item</Button>
          <Button variant="outline">Continue<ArrowRight /></Button>
          <Button variant="secondary"><Download />Export</Button>
          <Button disabled><Loader2 className="animate-spin" />Saving…</Button>
        </div>
      </Stack>

      {/* States matrix */}
      <Stack space="title">
        <SectionHeading as="h3" title="States" />
        <p className="-mt-1 text-xs text-muted-foreground">
          Every variant across states. Hover/focus are shown statically here;
          on a real button they trigger on interaction. Disabled ={" "}
          <code>opacity-50</code>; focus = <code>ring-2 ring-ring/50</code>.
        </p>
        <div className="overflow-x-auto rounded-lg border border-fp-outline-1">
          <div className="min-w-[640px]">
            {/* Header */}
            <div className="grid grid-cols-[110px_repeat(5,1fr)] border-b border-fp-outline-1 bg-fp-surface-1a">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Variant</div>
              {STATE_COLS.map((s) => (
                <div key={s} className="px-3 py-2 text-xs font-medium text-muted-foreground">{s}</div>
              ))}
            </div>
            {/* Rows */}
            {VARIANTS.map((v, i) => (
              <div
                key={v}
                className={`grid grid-cols-[110px_repeat(5,1fr)] items-center ${i > 0 ? "border-t border-fp-outline-1" : ""}`}
              >
                <div className="px-3 py-3 text-xs text-foreground">{v}</div>
                {STATE_COLS.map((s) => (
                  <div key={s} className="px-3 py-3">
                    <Cell variant={v} state={s} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Stack>
    </Stack>
  );
}
